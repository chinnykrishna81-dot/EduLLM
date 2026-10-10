import asyncio
import os
from pathlib import Path
import pdfplumber
import anthropic
import httpx
from database import get_chapter, save_chapter, save_status, save_draft, get_status

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
EDULLM_API = os.environ.get("EDULLM_API_URL", "http://localhost:3001/api")
UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "./uploads"))
IMAGE_MODEL = os.environ.get("OPENAI_IMAGE_MODEL", "dall-e-3")

sync_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None

STEPS = [
    "pdf_parsing",
    "concept_extraction",
    "generating_concept_pages",
    "transforming_questions",
    "generating_image_specs",
    "building_attempt_pools",
]


def _set_step(chapter_id: str, step: str, status: str, detail: str = ""):
    s = get_status(chapter_id) or {}
    if "steps" not in s:
        s["steps"] = {st: {"status": "pending"} for st in STEPS}
    s["steps"][step] = {"status": status, "detail": detail}
    save_status(chapter_id, s)


def _extract_text(pdf_path: Path) -> str:
    """Try text extraction first; returns empty string if PDF is image-based."""
    text = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text.append(t)
    except Exception:
        return ""
    return "\n\n".join(text)


def _pdf_to_base64_images(pdf_path: Path, max_pages: int = 8) -> list[str]:
    """Convert PDF pages to base64 images for Claude Vision (used for scanned PDFs)."""
    import base64
    from pdf2image import convert_from_path
    images = convert_from_path(str(pdf_path), dpi=150, last_page=max_pages)
    result = []
    for img in images:
        import io
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        result.append(base64.b64encode(buf.getvalue()).decode())
    return result


def _ai_vision_sync(images_b64: list[str], prompt: str) -> str:
    """Send PDF pages as images to Claude Vision — used for scanned PDFs."""
    if not sync_client:
        return '[]'
    content = []
    for img_b64 in images_b64[:6]:  # max 6 pages per call to stay within limits
        content.append({
            "type": "image",
            "source": {"type": "base64", "media_type": "image/jpeg", "data": img_b64},
        })
    content.append({"type": "text", "text": prompt})
    msg = sync_client.messages.create(
        model="claude-sonnet-5",
        max_tokens=4096,
        messages=[{"role": "user", "content": content}],
    )
    return msg.content[0].text


async def _ai_vision(images_b64: list[str], prompt: str) -> str:
    """Async wrapper for Claude Vision call."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _ai_vision_sync, images_b64, prompt)


async def _extract_content(pdf_path: Path, prompt_suffix: str, system: str = "") -> str:
    """Smart extraction: text-layer first, fall back to Claude Vision for scanned PDFs."""
    text = _extract_text(pdf_path)
    if len(text.strip()) > 200:
        # Text-based PDF — use standard Claude text API
        return await _ai(
            f"{prompt_suffix}\n\nSource content:\n{text[:5000]}",
            system=system
        )
    else:
        # Scanned/image PDF — use Claude Vision
        images = _pdf_to_base64_images(pdf_path, max_pages=8)
        if not images:
            return '[]'
        return await _ai_vision(
            images,
            f"These are pages from a CBSE Class 10 Science PDF (scanned).\n{prompt_suffix}"
        )


def _ai_sync(prompt: str, system: str = "") -> str:
    """Synchronous Claude API call — run in executor to avoid blocking the event loop."""
    if not sync_client:
        return '[]'
    msg = sync_client.messages.create(
        model="claude-sonnet-5",
        max_tokens=4096,
        system=system or "You are an expert CBSE educational content creator. Always return valid JSON only.",
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text


async def _ai(prompt: str, system: str = "") -> str:
    """Async wrapper — runs blocking Claude call in thread pool so event loop stays free."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _ai_sync, prompt, system)


async def generate_image_dalle(prompt: str, image_id: str) -> str:
    """Call OpenAI image generation and return the image URL."""
    if not OPENAI_API_KEY:
        return f"https://placehold.co/800x600?text=No+OpenAI+Key"

    async with httpx.AsyncClient(timeout=90) as http:
        resp = await http.post(
            "https://api.openai.com/v1/images/generations",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
            json={
                "model": IMAGE_MODEL,
                "prompt": (
                    f"Educational diagram for CBSE Class 10 Science textbook. "
                    f"{prompt} Clean white background. Professional, clear labels. "
                    f"Suitable for students aged 14-16."
                ),
                "n": 1,
                "size": "1024x1024",
                "quality": "standard",
                "style": "natural",
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data["data"][0]["url"]


async def run_pipeline(chapter_id: str):
    """Main AI pipeline — parses PDFs, calls Claude, builds draft content."""
    import json as _json

    chapter = get_chapter(chapter_id)
    if not chapter:
        return

    upload_dir = UPLOAD_DIR / chapter_id
    status = {
        "chapterId": chapter_id,
        "overall": "processing",
        "steps": {st: {"status": "pending"} for st in STEPS},
    }
    save_status(chapter_id, status)
    chapter["status"] = "processing"
    save_chapter(chapter)

    try:
        # ── Step 1: Parse PDFs ─────────────────────────────────────────────────
        _set_step(chapter_id, "pdf_parsing", "running", "Detecting PDF type (text or scanned)...")
        notes_text = _extract_text(upload_dir / "notes.pdf") if (upload_dir / "notes.pdf").exists() else ""
        qa_text    = _extract_text(upload_dir / "qa.pdf")    if (upload_dir / "qa.pdf").exists()    else ""
        mcq_text   = _extract_text(upload_dir / "mcq.pdf")   if (upload_dir / "mcq.pdf").exists()   else ""
        total_chars = len(notes_text) + len(qa_text) + len(mcq_text)
        scanned = total_chars < 200
        mode = "Claude Vision (scanned PDF)" if scanned else "text extraction"
        _set_step(chapter_id, "pdf_parsing", "done", f"Mode: {mode} — {total_chars:,} text chars found")

        # ── Step 2: Extract concept hierarchy ─────────────────────────────────
        _set_step(chapter_id, "concept_extraction", "running", "Identifying topics and concept hierarchy...")
        if scanned and (upload_dir / "notes.pdf").exists():
            concepts_json = await _extract_content(
                upload_dir / "notes.pdf",
                f"""Analyse this CBSE chapter and return a JSON array of topics.
Chapter: {chapter['name']}

Return JSON array only (no markdown, no explanation):
[{{"id":"t01","title":"Topic Name","subtopics":["Subtopic A","Subtopic B"]}}]""",
                system="You are a CBSE curriculum expert. Return ONLY valid JSON arrays. No markdown fences."
            )
        else:
            concepts_json = await _ai(
                f"""Analyse this CBSE chapter and return a JSON array of topics.
Chapter: {chapter['name']}

Source content:
{notes_text[:3000]}

Return JSON array only (no markdown, no explanation):
[{{"id":"t01","title":"Topic Name","subtopics":["Subtopic A","Subtopic B"]}}]""",
                system="You are a CBSE curriculum expert. Return ONLY valid JSON arrays. No markdown fences."
            )
        _set_step(chapter_id, "concept_extraction", "done", "Topics identified")

        # ── Step 3: Generate concept pages ────────────────────────────────────
        _set_step(chapter_id, "generating_concept_pages", "running", "Generating flash-card style concept pages...")
        if scanned and (upload_dir / "notes.pdf").exists():
            pages_json = await _extract_content(
                upload_dir / "notes.pdf",
                f"""Create EduLLM concept pages for chapter: {chapter['name']}

Rules:
- Flash-card style — NOT textbook paragraphs
- Each topic gets 3-4 pages
- Each page: title + 2-3 blocks (text/remember/image)
- Keep language simple, student-friendly (age 14-16)

Return JSON array only:
[{{"id":"p01","topicId":"t01","topicTitle":"Topic Title","title":"Page Title","sequence":1,"reviewStatus":"pending",
"blocks":[
  {{"id":"b01","type":"text","content":"Clear explanation here"}},
  {{"id":"b02","type":"remember","content":"KEY POINT to memorise"}}
]}}]""",
                system="You are an expert CBSE Class 10 teacher. Return ONLY valid JSON arrays. No markdown fences."
            )
        else:
            pages_json = await _ai(
                f"""Create EduLLM concept pages for this CBSE chapter.
Chapter: {chapter['name']}

Source:
{notes_text[:4000]}

Rules:
- Flash-card style — NOT textbook paragraphs
- Each topic gets 3-4 pages
- Each page: title + 2-3 blocks (text/remember/image)
- Keep language simple, student-friendly (age 14-16)

Return JSON array only:
[{{"id":"p01","topicId":"t01","topicTitle":"Topic Title","title":"Page Title","sequence":1,"reviewStatus":"pending",
"blocks":[
  {{"id":"b01","type":"text","content":"Clear explanation here"}},
  {{"id":"b02","type":"remember","content":"KEY POINT to memorise"}}
]}}]""",
                system="You are an expert CBSE Class 10 teacher. Return ONLY valid JSON arrays. No markdown fences."
            )
        _set_step(chapter_id, "generating_concept_pages", "done", "Concept pages generated")

        # ── Step 4: Transform questions ───────────────────────────────────────
        _set_step(chapter_id, "transforming_questions", "running", "Classifying and rephrasing questions...")
        q_prompt = f"""Transform these CBSE questions into EduLLM format.
Chapter: {chapter['name']}

Rules:
- Rephrase all questions (do NOT copy verbatim)
- MCQs → type=1, section="A", marks=1
- Short answer → type=1, section="B", marks=2
- Medium descriptive → type=2, section="C", marks=3
- Long/problem → type=2, section="D", marks=5
- correctAnswer = full text of correct option (not index)
- Assign attemptPool 1-8 evenly

Return JSON array only (30 questions max):
[{{"id":"q001","topicId":"t01","topicTitle":"Topic","type":1,"section":"A","marks":1,
"question":"question text","options":["option A","option B","option C","option D"],
"correctAnswer":"option A","explanation":"why correct","difficulty":"easy",
"reviewStatus":"pending","attemptPool":1}}]"""

        if scanned:
            # Use MCQ PDF via vision for questions
            mcq_path = upload_dir / "mcq.pdf"
            qa_path  = upload_dir / "qa.pdf"
            if mcq_path.exists():
                questions_json = await _extract_content(mcq_path, q_prompt,
                    system="You are creating original CBSE exam questions. Return ONLY valid JSON arrays.")
            elif qa_path.exists():
                questions_json = await _extract_content(qa_path, q_prompt,
                    system="You are creating original CBSE exam questions. Return ONLY valid JSON arrays.")
            else:
                questions_json = '[]'
        else:
            questions_json = await _ai(
                f"{q_prompt}\n\nMCQ source:\n{mcq_text[:2500]}\n\nQ&A source:\n{qa_text[:2500]}",
                system="You are creating original CBSE exam questions. Return ONLY valid JSON arrays."
            )
        _set_step(chapter_id, "transforming_questions", "done", "Questions transformed")

        # ── Step 5: Image specs ───────────────────────────────────────────────
        _set_step(chapter_id, "generating_image_specs", "running", "Writing image generation prompts...")
        img_prompt = f"""Identify all educational diagrams needed for chapter: {chapter['name']}

For each diagram write an original DALL-E generation prompt.
Do NOT reproduce source — create original educational diagrams.

Return JSON array only:
[{{"id":"img01","topicId":"t01","topicTitle":"Topic","conceptMapping":"concept this shows",
"purpose":"why students need this","elements":"what to draw","labels":"text labels",
"generationPrompt":"full DALL-E prompt","reviewStatus":"pending"}}]"""

        if scanned and (upload_dir / "notes.pdf").exists():
            images_json = await _extract_content(
                upload_dir / "notes.pdf", img_prompt,
                system="You are a science illustrator. Return ONLY valid JSON arrays."
            )
        else:
            images_json = await _ai(
                f"{img_prompt}\n\nSource:\n{notes_text[:2500]}",
                system="You are a science illustrator. Return ONLY valid JSON arrays."
            )
        _set_step(chapter_id, "generating_image_specs", "done", "Image specs written")

        # ── Step 6: Build attempt pools ───────────────────────────────────────
        _set_step(chapter_id, "building_attempt_pools", "running", "Distributing questions across 8 attempt pools...")

        try:
            questions = _json.loads(questions_json)
        except Exception:
            questions = []

        # Distribute questions across 8 pools by section
        sections: dict[str, list[str]] = {"A": [], "B": [], "C": [], "D": []}
        for q in questions:
            sec = q.get("section", "A")
            if sec in sections:
                sections[sec].append(q.get("id", ""))

        pools: dict[int, list[str]] = {i: [] for i in range(1, 9)}
        per_attempt = {"A": 10, "B": 5, "C": 5, "D": 3}
        for attempt in range(1, 9):
            for sec, limit in per_attempt.items():
                start = (attempt - 1) * limit
                pools[attempt].extend(sections[sec][start : start + limit])

        _set_step(chapter_id, "building_attempt_pools", "done", "8 attempt pools built (15-day lock intervals)")

        # ── Save draft ────────────────────────────────────────────────────────
        def safe_parse(raw: str) -> list:
            try:
                # strip markdown fences if Claude added them anyway
                cleaned = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
                result = _json.loads(cleaned)
                return result if isinstance(result, list) else []
            except Exception:
                return []

        parsed_concepts = safe_parse(concepts_json)
        parsed_pages    = safe_parse(pages_json)
        parsed_images   = safe_parse(images_json)

        draft = {
            "chapterId":   chapter_id,
            "chapterName": chapter["name"],
            "subject":     chapter["subject"],
            "topics": [
                {
                    "id": t.get("id", f"t{i:02d}"),
                    "title": t.get("title", ""),
                    "pagesCount": sum(1 for p in parsed_pages if p.get("topicId") == t.get("id")),
                    "approvedPages": 0,
                }
                for i, t in enumerate(parsed_concepts, 1)
            ],
            "conceptPages":  parsed_pages,
            "questions":     questions,
            "images":        parsed_images,
            "attemptPools":  {str(k): v for k, v in pools.items()},
        }
        save_draft(chapter_id, draft)

        chapter["status"]        = "draft"
        chapter["topicsCount"]   = len(draft["topics"])
        chapter["questionsCount"] = len(questions)
        chapter["imagesCount"]   = len(parsed_images)
        save_chapter(chapter)

        s = get_status(chapter_id)
        s["overall"] = "draft"
        save_status(chapter_id, s)

    except Exception as e:
        s = get_status(chapter_id) or {"steps": {}}
        s["overall"] = "draft"
        s["error"] = str(e)
        save_status(chapter_id, s)
        chapter["status"] = "draft"
        save_chapter(chapter)
        raise


async def publish_chapter(chapter_id: str, edullm_token: str) -> str:
    draft = get_draft(chapter_id)
    chapter = get_chapter(chapter_id)
    if not chapter:
        raise ValueError("Chapter not found")

    async with httpx.AsyncClient(timeout=30) as http:
        resp = await http.post(
            f"{EDULLM_API}/chapters/{chapter_id}/topics/batch",
            json=draft,
            headers={"Authorization": f"Bearer {edullm_token}"},
        )
        resp.raise_for_status()

    from models import now_iso
    chapter["status"] = "published"
    chapter["publishedAt"] = now_iso()
    save_chapter(chapter)
    return chapter_id
