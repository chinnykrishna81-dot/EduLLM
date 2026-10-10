import asyncio
import os
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from models import Chapter, ChapterCreate, ProcessingStatus, AttemptPoolsUpdate, new_id, now_iso
from database import (
    get_all_chapters, get_chapter, save_chapter, delete_chapter,
    get_status, save_status, get_draft, save_draft,
)
from pipeline import run_pipeline, publish_chapter, UPLOAD_DIR

app = FastAPI(title="EduLLM Content Pipeline", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5176", "http://localhost:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)

EDULLM_TOKEN = os.environ.get("EDULLM_ADMIN_TOKEN", "")


# ── Chapters ──────────────────────────────────────────────────────────────────

@app.get("/chapters", response_model=list[Chapter])
def list_chapters():
    return get_all_chapters()


@app.post("/chapters", response_model=Chapter, status_code=201)
def create_chapter(body: ChapterCreate):
    chapter = {
        "id": new_id("ch-"),
        "subject": body.subject,
        "name": body.name,
        "chapterNumber": body.chapterNumber,
        "status": "not_started",
        "topicsCount": 0,
        "questionsCount": 0,
        "imagesCount": 0,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }
    save_chapter(chapter)
    return chapter


@app.get("/chapters/{chapter_id}", response_model=Chapter)
def get_chapter_endpoint(chapter_id: str):
    ch = get_chapter(chapter_id)
    if not ch:
        raise HTTPException(404, "Chapter not found")
    return ch


@app.delete("/chapters/{chapter_id}", status_code=204)
def delete_chapter_endpoint(chapter_id: str):
    delete_chapter(chapter_id)


# ── Upload ────────────────────────────────────────────────────────────────────

@app.post("/chapters/{chapter_id}/upload")
async def upload_pdfs(
    chapter_id: str,
    notes_pdf: UploadFile = File(...),
    qa_pdf: UploadFile = File(...),
    mcq_pdf: UploadFile = File(...),
):
    ch = get_chapter(chapter_id)
    if not ch:
        raise HTTPException(404, "Chapter not found")

    dest = UPLOAD_DIR / chapter_id
    dest.mkdir(parents=True, exist_ok=True)

    for name, upload in [("notes.pdf", notes_pdf), ("qa.pdf", qa_pdf), ("mcq.pdf", mcq_pdf)]:
        content = await upload.read()
        (dest / name).write_bytes(content)

    ch["status"] = "not_started"
    ch["updatedAt"] = now_iso()
    save_chapter(ch)
    return {"status": "uploaded", "chapterId": chapter_id}


# ── Pipeline ──────────────────────────────────────────────────────────────────

@app.post("/chapters/{chapter_id}/process", status_code=202)
async def start_processing(chapter_id: str, background_tasks: BackgroundTasks):
    ch = get_chapter(chapter_id)
    if not ch:
        raise HTTPException(404, "Chapter not found")
    background_tasks.add_task(run_pipeline, chapter_id)
    return {"status": "started"}


@app.get("/chapters/{chapter_id}/status", response_model=ProcessingStatus)
def get_processing_status(chapter_id: str):
    s = get_status(chapter_id)
    if not s:
        raise HTTPException(404, "No processing status found")
    return s


# ── Draft ─────────────────────────────────────────────────────────────────────

@app.get("/chapters/{chapter_id}/draft")
def get_draft_endpoint(chapter_id: str):
    d = get_draft(chapter_id)
    if not d:
        raise HTTPException(404, "No draft found")
    return d


@app.post("/chapters/{chapter_id}/pages/{page_id}/approve", status_code=204)
def approve_page(chapter_id: str, page_id: str):
    _update_review(chapter_id, "conceptPages", page_id, "approved")


@app.post("/chapters/{chapter_id}/pages/{page_id}/reject", status_code=204)
def reject_page(chapter_id: str, page_id: str):
    _update_review(chapter_id, "conceptPages", page_id, "rejected")


@app.put("/chapters/{chapter_id}/pages/{page_id}")
def update_page(chapter_id: str, page_id: str, body: dict):
    d = get_draft(chapter_id)
    if not d:
        raise HTTPException(404)
    for p in d.get("conceptPages", []):
        if p["id"] == page_id:
            p.update(body)
            save_draft(chapter_id, d)
            return p
    raise HTTPException(404, "Page not found")


@app.post("/chapters/{chapter_id}/questions/{q_id}/approve", status_code=204)
def approve_question(chapter_id: str, q_id: str):
    _update_review(chapter_id, "questions", q_id, "approved")


@app.post("/chapters/{chapter_id}/questions/{q_id}/reject", status_code=204)
def reject_question(chapter_id: str, q_id: str):
    _update_review(chapter_id, "questions", q_id, "rejected")


@app.put("/chapters/{chapter_id}/questions/{q_id}")
def update_question(chapter_id: str, q_id: str, body: dict):
    d = get_draft(chapter_id)
    if not d:
        raise HTTPException(404)
    for q in d.get("questions", []):
        if q["id"] == q_id:
            q.update(body)
            save_draft(chapter_id, d)
            return q
    raise HTTPException(404, "Question not found")


@app.post("/chapters/{chapter_id}/images/{img_id}/generate")
async def generate_image(chapter_id: str, img_id: str):
    d = get_draft(chapter_id)
    if not d:
        raise HTTPException(404)
    for img in d.get("images", []):
        if img["id"] == img_id:
            from pipeline import generate_image_dalle
            try:
                url = await generate_image_dalle(img["generationPrompt"], img_id)
                img["generatedUrl"] = url
                img["reviewStatus"] = "generated"
                save_draft(chapter_id, d)
                return img
            except Exception as e:
                raise HTTPException(500, f"Image generation failed: {e}")
    raise HTTPException(404, "Image not found")


@app.post("/chapters/{chapter_id}/images/{img_id}/approve", status_code=204)
def approve_image(chapter_id: str, img_id: str):
    _update_review(chapter_id, "images", img_id, "approved")


@app.put("/chapters/{chapter_id}/attempt-pools", status_code=204)
def update_attempt_pools(chapter_id: str, body: AttemptPoolsUpdate):
    d = get_draft(chapter_id)
    if not d:
        raise HTTPException(404)
    d["attemptPools"] = {str(k): v for k, v in body.pools.items()}
    save_draft(chapter_id, d)


# ── Publish ───────────────────────────────────────────────────────────────────

@app.post("/chapters/{chapter_id}/publish")
async def publish(chapter_id: str):
    try:
        edullm_id = await publish_chapter(chapter_id, EDULLM_TOKEN)
        return {"edullmChapterId": edullm_id}
    except Exception as e:
        raise HTTPException(500, str(e))


# ── Helpers ───────────────────────────────────────────────────────────────────

def _update_review(chapter_id: str, collection: str, item_id: str, status: str):
    d = get_draft(chapter_id)
    if not d:
        raise HTTPException(404)
    for item in d.get(collection, []):
        if item.get("id") == item_id:
            item["reviewStatus"] = status
            save_draft(chapter_id, d)
            return
    raise HTTPException(404, f"{item_id} not found in {collection}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
