import { useEffect, useRef, useState } from "react";
import { platformApi, type LibraryChapter } from "./api";
import { browserId } from "./browserId";
import "./simple-chapter-editor.css";
import "../../competency-patterns.css";

interface Subtopic {
  id: string;
  title: string;
  html: string;
  source?: any;
}
interface Topic {
  id: string;
  title: string;
  html: string;
  subtopics: Subtopic[];
  source?: any;
}
interface Selection {
  topicIndex: number;
  subtopicIndex?: number;
}

const uid = (prefix = "topic") => `${prefix}-${browserId()}`;

const escapeHtml = (value: unknown) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

function fallbackPatternHtml(pattern: any) {
  const list = (items: unknown[] = []) => `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  const recognition = pattern.what_is_this_pattern || {}, method = pattern.how_to_use_this_template || {};
  const examples = pattern.three_worked_examples || [], variations = pattern.possible_variations || [];
  const mistakes = pattern.common_mistakes_and_how_to_avoid || [], practice = pattern.try_yourself_extended || pattern.try_yourself || {};
  return `<article class="pattern-page edullm-competency-pattern" id="${escapeHtml(pattern.pattern_id)}"><header class="hero"><div class="eyebrow">EDULLM · CLASS ${escapeHtml(pattern.class_level)} ${escapeHtml(pattern.subject)} · ${escapeHtml(pattern.chapter)}</div><div class="pattern-code">Pattern ${escapeHtml(pattern.pattern_id)}</div><h1>${escapeHtml(pattern.pattern_title)}</h1><p class="subtitle">${escapeHtml(pattern.competency)}</p></header><section class="panel sky"><h2>1. What is this pattern?</h2><p>${escapeHtml(recognition.plain_language_explanation)}</p><h3>Recognise this pattern when</h3>${list(recognition.recognition_clues)}<div class="tip"><strong>Decision rule:</strong> ${escapeHtml(recognition.quick_decision_rule)}</div></section><section class="panel mint"><h2>2. How to use this solving template</h2><p>${escapeHtml(method.goal)}</p><div class="math-line"><strong>${escapeHtml(method.essential_formula || pattern.formula).replaceAll("**", "")}</strong></div>${(method.fully_explained_steps || method.step_by_step_method || []).map((step: any) => `<div class="step"><div class="step-title"><span class="step-num">${escapeHtml(step.step)}</span><strong>${escapeHtml(step.action || step.instruction)}</strong></div>${step.calculation_or_example ? `<div class="math-line">${escapeHtml(step.calculation_or_example)}</div>` : ""}${step.conceptual_reason ? `<p class="why">${escapeHtml(step.conceptual_reason)}</p>` : ""}</div>`).join("")}</section><section class="panel lavender"><h2>3. Three worked examples — different possibilities</h2>${examples.map((example: any) => `<article class="example"><h3>Example ${escapeHtml(example.example_number)}: ${escapeHtml(example.possibility)}</h3><div class="question">${escapeHtml(example.question)}</div>${(example.step_by_step_solution || []).map((step: any) => `<div class="calc-step"><strong>Step ${escapeHtml(step.step)}</strong><div class="math-line">${escapeHtml(step.explanation)}</div></div>`).join("")}<div class="answer"><strong>Final answer:</strong> ${escapeHtml(example.final_answer)}</div></article>`).join("")}</section><section class="panel sky"><h2>4. Possible variations and how to adapt</h2>${variations.map((item: any) => `<div class="variation"><h3>${escapeHtml(item.variation)}</h3><p><strong>Recognise and solve:</strong> ${escapeHtml(item.how_to_recognise_and_solve)}</p></div>`).join("")}</section><section class="panel mint"><h2>5. Key points to remember</h2>${list(pattern.key_points_to_remember)}</section><section class="panel peach"><h2>6. Common mistakes and how to avoid them</h2>${mistakes.map((item: any) => `<div class="mistake"><strong>Common mistake:</strong> ${escapeHtml(item.mistake)}<p><strong>How to avoid:</strong> ${escapeHtml(item.how_to_avoid)}</p><p><strong>Correct habit:</strong> ${escapeHtml(item.correct_habit)}</p></div>`).join("")}</section><section class="panel gold"><h2>7. Try yourself</h2><div class="question">${escapeHtml(practice.question)}</div>${list(practice.student_instructions)}<details><summary>Show answer and explanation</summary><p>${escapeHtml(practice.answer_with_reason || practice.answer)}</p></details></section><footer>Reference topic: ${escapeHtml(pattern.end_reference_topic || pattern.primary_topic)}</footer></article>`;
}

function patternArticles(html: string) {
  if (!html.trim()) return new Map<string, string>();
  const doc = new DOMParser().parseFromString(html, "text/html");
  return new Map(Array.from(doc.querySelectorAll<HTMLElement>("article.pattern-page[id]")).map((article) => { article.classList.add("edullm-competency-pattern"); return [article.id, article.outerHTML]; }));
}

function initTopics(chapter: LibraryChapter): Topic[] {
  const raw: any[] = chapter.content?.topics ?? [];
  if (!raw.length)
    return [{ id: uid(), title: "Topic 1", html: "", subtopics: [] }];
  return raw.map((t: any) => ({
    id: t.id || uid(),
    title: t.title || "Untitled Topic",
    html: t.html || extractPages(t.introductionPages || []),
    subtopics: (t.subtopics || []).map((s: any) => ({
      id: s.id || uid("subtopic"),
      title: s.title || "Untitled Subtopic",
      html: s.html || extractPages(s.pages || []),
      source: s,
    })),
    source: t,
  }));
}

function extractPages(pages: any[]): string {
  return pages
    .flatMap((p: any) => p.blocks ?? [])
    .map((b: any) => {
      if (b.type === "text") return b.content || "";
      if (b.type === "image-inline")
        return `<img src="${b.src}" alt="${b.altText || ""}" style="max-width:100%;height:auto;border-radius:6px;" />`;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function pageFor(
  id: string,
  title: string,
  html: string,
  pageType: "introduction" | "learning",
) {
  return {
    id: `${id}-page`,
    title,
    description: "",
    sequence: 1,
    pageType,
    continueRequired: true,
    mediaRefs: [],
    blocks: [{ id: `${id}-block`, type: "text", content: html || "<p></p>" }],
    concepts: [],
  };
}

function buildContent(chapter: LibraryChapter, topics: Topic[]) {
  return {
    ...chapter.content,
    topics: topics.map((t, i) => ({
      ...(t.source || {}),
      id: t.id,
      title: t.title,
      description: "",
      sequence: i + 1,
      syllabusCode: String(i + 1),
      mediaRefs: [],
      introductionPages: [pageFor(t.id, t.title, t.html, "introduction")],
      subtopics: t.subtopics.map((s, si) => ({
        ...(s.source || {}),
        id: s.id,
        title: s.title,
        description: s.source?.description || "",
        syllabusCode: s.source?.syllabusCode || `${i + 1}.${si + 1}`,
        sequence: si + 1,
        mediaRefs: s.source?.mediaRefs || [],
        pages: [pageFor(s.id, s.title, s.html, "learning")],
      })),
    })),
  };
}

// ── Rich Text Editor ────────────────────────────────────────────────────────

function RichEditor({
  initialValue,
  onChange,
}: {
  initialValue: string;
  onChange: (html: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // key={topic.id} on the parent remounts this; set content only on mount
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initialValue;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    ref.current?.focus();
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const insertImg = () => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "image/*";
    inp.onchange = () => {
      const f = inp.files?.[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        ref.current?.focus();
        document.execCommand(
          "insertHTML",
          false,
          `<img src="${rd.result}" alt="${f.name}" style="max-width:100%;height:auto;border-radius:6px;" />`,
        );
        if (ref.current) onChange(ref.current.innerHTML);
      };
      rd.readAsDataURL(f);
    };
    inp.click();
  };

  // onMouseDown + preventDefault keeps selection alive when clicking toolbar buttons
  const btn = (
    cmd: string,
    arg: string | undefined,
    title: string,
    label: React.ReactNode,
  ) => (
    <button
      key={title}
      className="rte-btn"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        exec(cmd, arg);
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="rte-wrap">
      <div className="rte-toolbar">
        {btn("bold", undefined, "Bold", <b>B</b>)}
        {btn("italic", undefined, "Italic", <i>I</i>)}
        {btn("underline", undefined, "Underline", <u>U</u>)}
        {btn("strikeThrough", undefined, "Strikethrough", <s>S</s>)}
        <span className="rte-sep" />
        {btn("formatBlock", "h1", "Heading 1", "H1")}
        {btn("formatBlock", "h2", "Heading 2", "H2")}
        {btn("formatBlock", "h3", "Heading 3", "H3")}
        {btn("formatBlock", "p", "Paragraph", "¶")}
        <span className="rte-sep" />
        {btn("insertUnorderedList", undefined, "Bullet list", "• List")}
        {btn("insertOrderedList", undefined, "Numbered list", "1. List")}
        <span className="rte-sep" />
        <button
          className="rte-btn rte-img-btn"
          title="Insert image"
          onMouseDown={(e) => {
            e.preventDefault();
            insertImg();
          }}
        >
          🖼 Image
        </button>
        <span className="rte-sep" />
        {btn("removeFormat", undefined, "Clear formatting", "✕ Fmt")}
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => {
          if (ref.current) onChange(ref.current.innerHTML);
        }}
        className="rte-content"
      />
    </div>
  );
}

// ── Main editor shell ───────────────────────────────────────────────────────

export function SimpleChapterContentEditor({
  chapter,
  exit,
}: {
  chapter: LibraryChapter;
  exit: () => void;
}) {
  const [topics, setTopics] = useState<Topic[]>(() => initTopics(chapter));
  const [selection, setSelection] = useState<Selection>({ topicIndex: 0 });
  const [expandedTopicIds, setExpandedTopicIds] = useState<Set<string>>(
    () => new Set(topics[0]?.subtopics.length ? [topics[0].id] : []),
  );
  const [tab, setTab] = useState<"edit" | "preview">("preview");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const importInput = useRef<HTMLInputElement>(null);

  const topic = topics[selection.topicIndex] ?? topics[0],
    node =
      selection.subtopicIndex === undefined
        ? topic
        : topic?.subtopics[selection.subtopicIndex];
  const updateNode = (changes: Partial<Topic> | Partial<Subtopic>) =>
    setTopics((current) =>
      current.map((item, index) => {
        if (index !== selection.topicIndex) return item;
        if (selection.subtopicIndex === undefined)
          return { ...item, ...changes } as Topic;
        return {
          ...item,
          subtopics: item.subtopics.map((sub, subIndex) =>
            subIndex === selection.subtopicIndex ? { ...sub, ...changes } : sub,
          ),
        };
      }),
    );
  const updateHtml = (html: string) => updateNode({ html });
  const updateTitle = (title: string) => updateNode({ title });

  const save = async () => {
    setBusy(true);
    setMsg("");
    try {
      await platformApi.updateChapter(chapter.id, {
        title: chapter.title,
        description: chapter.description,
        content: buildContent(chapter, topics),
      });
      setMsg("Saved successfully.");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  const addTopic = () => {
    setTopics((p) => [
      ...p,
      { id: uid(), title: `Topic ${p.length + 1}`, html: "", subtopics: [] },
    ]);
    setSelection({ topicIndex: topics.length });
  };

  const addSubtopic = (topicIndex: number) => {
    const nextIndex = topics[topicIndex].subtopics.length;
    setTopics((current) =>
      current.map((item, index) =>
        index === topicIndex
          ? {
              ...item,
              subtopics: [
                ...item.subtopics,
                {
                  id: uid("subtopic"),
                  title: `Subtopic ${nextIndex + 1}`,
                  html: "",
                },
              ],
            }
          : item,
      ),
    );
    setSelection({ topicIndex, subtopicIndex: nextIndex });
    setExpandedTopicIds((current) =>
      new Set(current).add(topics[topicIndex].id),
    );
    setTab("edit");
  };
  const deleteSubtopic = (topicIndex: number, subtopicIndex: number) => {
    const item = topics[topicIndex].subtopics[subtopicIndex];
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    setTopics((current) =>
      current.map((topic, index) =>
        index === topicIndex
          ? {
              ...topic,
              subtopics: topic.subtopics.filter((_, i) => i !== subtopicIndex),
            }
          : topic,
      ),
    );
    setSelection({ topicIndex });
  };

  const deleteTopic = (i: number) => {
    if (topics.length === 1) return;
    if (!window.confirm(`Delete "${topics[i].title}"?`)) return;
    setTopics((p) => p.filter((_, idx) => idx !== i));
    setSelection({ topicIndex: Math.max(0, i - 1) });
  };

  const importCompetencyPatterns = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true); setMsg("");
    try {
      const selected = Array.from(files);
      const jsonFile = selected.find((file) => file.name.toLowerCase().endsWith(".json"));
      if (!jsonFile) throw new Error("Select the competency-pattern JSON file.");
      const htmlFile = selected.find((file) => file.name.toLowerCase().endsWith(".html"));
      const imageFiles = selected.filter((file) => file.type.startsWith("image/") || /\.(png|jpe?g|webp|svg|gif|avif|bmp)$/i.test(file.name));
      const data = JSON.parse(await jsonFile.text());
      if (!data?.topic?.topic_id || !Array.isArray(data.patterns) || !data.patterns.length) throw new Error("This is not a supported EduLLM topic/subtopic competency JSON file.");
      const uploaded: any[] = imageFiles.length ? await platformApi.uploadChapterMedia(chapter.id, imageFiles) : [];
      const imageUrls = new Map(uploaded.map((item: any) => [String(item.fileName).toLowerCase(), item.url]));
      const articles = patternArticles(htmlFile ? await htmlFile.text() : "");
      const imported: Topic = { id: String(data.topic.topic_id), title: String(data.topic.topic_name || "Competency Patterns"), html: "", source: { syllabusCode: String(data.topic.topic_id), competencyPattern: true }, subtopics: data.patterns.map((pattern: any) => {
        let html = articles.get(String(pattern.pattern_id)) || fallbackPatternHtml(pattern);
        const uploadedUrl = imageUrls.get(String(pattern.diagram?.file_name || "").toLowerCase());
        if (uploadedUrl) { const parsed = new DOMParser().parseFromString(html, "text/html"); const image = parsed.querySelector("article.pattern-page img"); if (image) image.setAttribute("src", uploadedUrl); html = parsed.querySelector("article.pattern-page")?.outerHTML || html; }
        return { id: String(pattern.subtopic_id || pattern.pattern_id), title: String(pattern.subtopic_name || pattern.pattern_title), html, source: { syllabusCode: pattern.pattern_id, competencyPattern: true } };
      }) };
      const existingIndex = topics.findIndex((item) => item.id === imported.id);
      if (existingIndex >= 0 && !window.confirm(`Replace the existing “${imported.title}” topic?`)) return;
      const next = existingIndex >= 0 ? topics.map((item, index) => index === existingIndex ? imported : item) : [...topics.filter((item) => !(item.title === "Topic 1" && !item.html && !item.subtopics.length)), imported];
      const index = next.findIndex((item) => item.id === imported.id);
      setTopics(next); setExpandedTopicIds((current) => new Set(current).add(imported.id)); setSelection({ topicIndex: index, subtopicIndex: 0 }); setTab("preview");
      setMsg(`Imported ${imported.subtopics.length} subtopics${htmlFile ? " with the supplied HTML design" : " from JSON"}${uploaded.length ? ` and uploaded ${uploaded.length} image(s)` : ""}. Review, then select Save Draft.`);
    } catch (error: any) { setMsg(error?.message || "Import failed."); }
    finally { setBusy(false); if (importInput.current) importInput.current.value = ""; }
  };

  return (
    <section className="sce-shell">
      <header className="sce-header">
        <button className="sce-back" onClick={exit}>
          ← Chapter Library
        </button>
        <div className="sce-header-title">
          <small>BUILD CONTENT</small>
          <h1>{chapter.title}</h1>
        </div>
        <button className="sce-save-btn" disabled={busy} onClick={save}>
          {busy ? "Saving…" : "Save Draft"}
        </button>
      </header>

      {msg && <p className="sce-msg">{msg}</p>}

      <div className="sce-layout">
        <aside className="sce-sidebar">
          <p className="sce-sidebar-label">Topics</p>
          {topics.map((t, i) =>
            t.subtopics.length > 0 ? (
              <details
                className="sce-topic-folder"
                key={t.id}
                onToggle={(event) => {
                  const isOpen = event.currentTarget.open;
                  setExpandedTopicIds((current) => {
                    const next = new Set(current);
                    if (isOpen) next.add(t.id);
                    else next.delete(t.id);
                    return next;
                  });
                }}
                open={expandedTopicIds.has(t.id)}
              >
                <summary
                  className={`sce-topic-folder-summary ${selection.topicIndex === i ? "active" : ""}`}
                  onClick={() => setSelection({ topicIndex: i })}
                >
                  <span className="sce-folder-chevron" aria-hidden="true" />
                  <span className="sce-folder-icon" aria-hidden="true">
                    📁
                  </span>
                  <span className="sce-folder-title">
                    {t.title || `Topic ${i + 1}`}
                  </span>
                  <span className="sce-folder-count">{t.subtopics.length}</span>
                  {topics.length > 1 && (
                    <button
                      className="sce-del-topic"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        deleteTopic(i);
                      }}
                      title="Delete topic"
                      type="button"
                    >
                      ×
                    </button>
                  )}
                </summary>
                <div className="sce-subtopic-list">
                  {t.subtopics.map((s, si) => (
                    <div
                      className={`sce-subtopic-row ${selection.topicIndex === i && selection.subtopicIndex === si ? "active" : ""}`}
                      key={s.id}
                    >
                      <button
                        onClick={() =>
                          setSelection({ topicIndex: i, subtopicIndex: si })
                        }
                      >
                        {s.title}
                      </button>
                      <button
                        className="sce-del-topic"
                        onClick={() => deleteSubtopic(i, si)}
                        title="Delete subtopic"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    className="sce-add-subtopic"
                    onClick={() => addSubtopic(i)}
                  >
                    + Add Subtopic
                  </button>
                </div>
              </details>
            ) : (
              <div className="sce-topic-group" key={t.id}>
                <div
                  className={`sce-topic-row ${selection.topicIndex === i && selection.subtopicIndex === undefined ? "active" : ""}`}
                >
                  <button
                    className="sce-topic-btn"
                    onClick={() => setSelection({ topicIndex: i })}
                  >
                    {t.title || `Topic ${i + 1}`}
                  </button>
                  {topics.length > 1 && (
                    <button
                      className="sce-del-topic"
                      onClick={() => deleteTopic(i)}
                      title="Delete topic"
                    >
                      ×
                    </button>
                  )}
                </div>
                <button
                  className="sce-add-subtopic sce-add-subtopic-empty"
                  onClick={() => addSubtopic(i)}
                >
                  + Add Subtopic
                </button>
              </div>
            ),
          )}
          <button className="sce-add-topic" onClick={addTopic}>
            + Add Topic
          </button>
          <input ref={importInput} type="file" accept=".json,.html,image/*,.svg" multiple hidden onChange={(event) => importCompetencyPatterns(event.target.files)} />
          <button className="sce-import-patterns" disabled={busy} onClick={() => importInput.current?.click()}>Import JSON + Images</button>
          <p className="sce-import-help">Select the EduLLM JSON; optionally select its HTML and referenced images together.</p>
        </aside>

        <main className="sce-main">
          {node && (
            <>
              <small className="sce-node-kind">
                {selection.subtopicIndex === undefined ? "TOPIC" : "SUBTOPIC"}
              </small>
              <input
                className="sce-topic-title"
                value={node.title}
                onChange={(e) => updateTitle(e.target.value)}
                placeholder="Topic title"
              />

              <div className="sce-toolbar">
                <div className="sce-tabs">
                  <button
                    className={tab === "edit" ? "active" : ""}
                    onClick={() => setTab("edit")}
                  >
                    Edit
                  </button>
                  <button
                    className={tab === "preview" ? "active" : ""}
                    onClick={() => setTab("preview")}
                  >
                    Preview
                  </button>
                </div>
              </div>

              {tab === "edit" ? (
                <RichEditor
                  key={node.id}
                  initialValue={node.html}
                  onChange={updateHtml}
                />
              ) : (
                <div
                  className="sce-preview"
                  dangerouslySetInnerHTML={{
                    __html:
                      node.html ||
                      '<p style="color:#9ca3af">Nothing to preview yet.</p>',
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>
    </section>
  );
}
