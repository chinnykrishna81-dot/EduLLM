import { useEffect, useRef, useState } from 'react';
import { platformApi, type LibraryChapter } from './api';
import './simple-chapter-editor.css';

interface Topic { id: string; title: string; html: string }

const uid = () => `topic-${crypto.randomUUID()}`;

function initTopics(chapter: LibraryChapter): Topic[] {
  const raw: any[] = chapter.content?.topics ?? [];
  if (!raw.length) return [{ id: uid(), title: 'Topic 1', html: '' }];
  return raw.map((t: any) => ({
    id: t.id || uid(),
    title: t.title || 'Untitled Topic',
    html: t.html || extractHtml(t),
  }));
}

function extractHtml(t: any): string {
  const pages = [
    ...(t.introductionPages ?? []),
    ...(t.subtopics ?? []).flatMap((s: any) => s.pages ?? []),
  ];
  return pages
    .flatMap((p: any) => p.blocks ?? [])
    .map((b: any) => {
      if (b.type === 'text') return b.content || '';
      if (b.type === 'image-inline') return `<img src="${b.src}" alt="${b.altText || ''}" style="max-width:100%;height:auto;border-radius:6px;" />`;
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

function buildContent(chapter: LibraryChapter, topics: Topic[]) {
  return {
    ...chapter.content,
    topics: topics.map((t, i) => ({
      id: t.id,
      title: t.title,
      description: '',
      sequence: i + 1,
      syllabusCode: String(i + 1),
      mediaRefs: [],
      introductionPages: [{
        id: `${t.id}-page`,
        title: t.title,
        description: '',
        sequence: 1,
        pageType: 'introduction',
        continueRequired: true,
        mediaRefs: [],
        blocks: [{ id: `${t.id}-block`, type: 'text', content: t.html }],
        concepts: [],
      }],
      subtopics: [],
    })),
  };
}

// ── Rich Text Editor ────────────────────────────────────────────────────────

function RichEditor({ initialValue, onChange }: { initialValue: string; onChange: (html: string) => void }) {
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
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = () => {
      const f = inp.files?.[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        ref.current?.focus();
        document.execCommand('insertHTML', false,
          `<img src="${rd.result}" alt="${f.name}" style="max-width:100%;height:auto;border-radius:6px;" />`
        );
        if (ref.current) onChange(ref.current.innerHTML);
      };
      rd.readAsDataURL(f);
    };
    inp.click();
  };

  // onMouseDown + preventDefault keeps selection alive when clicking toolbar buttons
  const btn = (cmd: string, arg: string | undefined, title: string, label: React.ReactNode) => (
    <button key={title} className="rte-btn" title={title}
      onMouseDown={e => { e.preventDefault(); exec(cmd, arg); }}>
      {label}
    </button>
  );

  return (
    <div className="rte-wrap">
      <div className="rte-toolbar">
        {btn('bold',            undefined, 'Bold',         <b>B</b>)}
        {btn('italic',          undefined, 'Italic',       <i>I</i>)}
        {btn('underline',       undefined, 'Underline',    <u>U</u>)}
        {btn('strikeThrough',   undefined, 'Strikethrough',<s>S</s>)}
        <span className="rte-sep" />
        {btn('formatBlock', 'h1', 'Heading 1', 'H1')}
        {btn('formatBlock', 'h2', 'Heading 2', 'H2')}
        {btn('formatBlock', 'h3', 'Heading 3', 'H3')}
        {btn('formatBlock', 'p',  'Paragraph', '¶')}
        <span className="rte-sep" />
        {btn('insertUnorderedList', undefined, 'Bullet list',   '• List')}
        {btn('insertOrderedList',   undefined, 'Numbered list', '1. List')}
        <span className="rte-sep" />
        <button className="rte-btn rte-img-btn" title="Insert image"
          onMouseDown={e => { e.preventDefault(); insertImg(); }}>
          🖼 Image
        </button>
        <span className="rte-sep" />
        {btn('removeFormat', undefined, 'Clear formatting', '✕ Fmt')}
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => { if (ref.current) onChange(ref.current.innerHTML); }}
        className="rte-content"
      />
    </div>
  );
}

// ── Main editor shell ───────────────────────────────────────────────────────

export function SimpleChapterContentEditor({ chapter, exit }: { chapter: LibraryChapter; exit: () => void }) {
  const [topics, setTopics] = useState<Topic[]>(() => initTopics(chapter));
  const [sel, setSel] = useState(0);
  const [tab, setTab] = useState<'edit' | 'preview'>('preview');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const topic = topics[sel] ?? topics[0];
  const updateHtml   = (html: string)  => setTopics(p => p.map((t, i) => i === sel ? { ...t, html }  : t));
  const updateTitle  = (title: string) => setTopics(p => p.map((t, i) => i === sel ? { ...t, title } : t));

  const save = async () => {
    setBusy(true); setMsg('');
    try {
      await platformApi.updateChapter(chapter.id, {
        title: chapter.title,
        description: chapter.description,
        content: buildContent(chapter, topics),
      });
      setMsg('Saved successfully.');
    } catch (e: any) { setMsg(e.message); }
    finally { setBusy(false); }
  };

  const addTopic = () => {
    setTopics(p => [...p, { id: uid(), title: `Topic ${p.length + 1}`, html: '' }]);
    setSel(topics.length);
  };

  const deleteTopic = (i: number) => {
    if (topics.length === 1) return;
    if (!window.confirm(`Delete "${topics[i].title}"?`)) return;
    setTopics(p => p.filter((_, idx) => idx !== i));
    setSel(Math.max(0, i - 1));
  };

  return (
    <section className="sce-shell">
      <header className="sce-header">
        <button className="sce-back" onClick={exit}>← Chapter Library</button>
        <div className="sce-header-title">
          <small>BUILD CONTENT</small>
          <h1>{chapter.title}</h1>
        </div>
        <button className="sce-save-btn" disabled={busy} onClick={save}>
          {busy ? 'Saving…' : 'Save Draft'}
        </button>
      </header>

      {msg && <p className="sce-msg">{msg}</p>}

      <div className="sce-layout">
        <aside className="sce-sidebar">
          <p className="sce-sidebar-label">Topics</p>
          {topics.map((t, i) => (
            <div key={t.id} className={`sce-topic-row ${sel === i ? 'active' : ''}`}>
              <button className="sce-topic-btn" onClick={() => setSel(i)}>
                {t.title || `Topic ${i + 1}`}
              </button>
              {topics.length > 1 && (
                <button className="sce-del-topic" onClick={() => deleteTopic(i)} title="Delete topic">×</button>
              )}
            </div>
          ))}
          <button className="sce-add-topic" onClick={addTopic}>+ Add Topic</button>
        </aside>

        <main className="sce-main">
          {topic && <>
            <input
              className="sce-topic-title"
              value={topic.title}
              onChange={e => updateTitle(e.target.value)}
              placeholder="Topic title"
            />

            <div className="sce-toolbar">
              <div className="sce-tabs">
                <button className={tab === 'edit' ? 'active' : ''} onClick={() => setTab('edit')}>Edit</button>
                <button className={tab === 'preview' ? 'active' : ''} onClick={() => setTab('preview')}>Preview</button>
              </div>
            </div>

            {tab === 'edit' ? (
              <RichEditor
                key={topic.id}
                initialValue={topic.html}
                onChange={updateHtml}
              />
            ) : (
              <div
                className="sce-preview"
                dangerouslySetInnerHTML={{ __html: topic.html || '<p style="color:#9ca3af">Nothing to preview yet.</p>' }}
              />
            )}
          </>}
        </main>
      </div>
    </section>
  );
}
