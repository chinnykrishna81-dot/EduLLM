import { useEffect, useMemo, useRef, useState } from 'react';
import { QuestionDetailEditor } from './QuestionDetailEditor';
import { browserId } from './browserId';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import readXlsxFile from 'read-excel-file/browser';

const API_BASE = import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:3001';
const token = () => localStorage.getItem('edullm_cms_token') ?? '';
async function lms<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });
  const match = path.match(/^\/chapters\/([^/]+)(.*)$/);
  let unifiedPath = path;
  if (match) {
    const [, chapterId, rest] = match;
    if (rest === '/questions') unifiedPath = `/question-bank/chapters/${chapterId}${init.method === 'POST' ? '/questions' : ''}`;
    else if (rest === '/questions/stats') unifiedPath = `/question-bank/chapters/${chapterId}/statistics`;
    else if (rest === '/questions/practice') unifiedPath = `/question-bank/chapters/${chapterId}/practice`;
    else if (rest === '/topics') unifiedPath = `/question-bank/chapters/${chapterId}/topics`;
    else if (rest === '/cycle-test') unifiedPath = `/catalogue/chapters/${chapterId}/assessment`;
    else if (rest.startsWith('/patterns')) unifiedPath = `/question-bank/chapters/${chapterId}${rest}`;
  } else if (path.startsWith('/questions/')) {
    unifiedPath = `/question-bank/questions/${path.slice('/questions/'.length)}`;
  }
  const res = await fetch(`${API_BASE}/api${unifiedPath}`, { ...init, headers });
  const text = await res.text();
  const data = text.trim() ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || 'Request failed');
  return data;
}

const uid = () => browserId();

function newType1(cykMode: boolean) {
  return {
    _isNew: true,
    id: uid(),
    type: 'type1',
    format: 'mcq',
    question: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    explanation: '',
    topicId: '',
    subtopicId: '',
    difficulty: 'medium',
    patternId: '',
    marks: 1,
    usage: cykMode ? ['cyk'] : [],
    mediaRefs: [],
    status: 'staged',
  };
}

function newType2() {
  return {
    _isNew: true,
    id: uid(),
    type: 'type2',
    format: 'guided',
    question: '',
    options: [],
    correctAnswer: '',
    explanation: '',
    finalAnswer: '',
    topicId: '',
    subtopicId: '',
    difficulty: 'medium',
    patternId: '',
    marks: 2,
    totalMarks: 2,
    usage: [],
    mediaRefs: [],
    status: 'staged',
    steps: [
      { id: uid(), prompt: '', options: ['', ''], answer: '', marks: 1, negativeMarks: 0, isCritical: false, explanation: '', mediaRefs: [], answerMediaRefs: [], explanationMediaRefs: [] },
      { id: uid(), prompt: '', options: ['', ''], answer: '', marks: 1, negativeMarks: 0, isCritical: false, explanation: '', mediaRefs: [], answerMediaRefs: [], explanationMediaRefs: [] },
    ],
  };
}

const TYPE_COLORS: Record<string, string> = { type1: '#1a56db', type2: '#7c3aed' };
const TYPE_LABELS: Record<string, string> = { type1: 'Type 1', type2: 'Type 2' };
const DIFFICULTY: Record<string, string> = { Easy: 'easy', easy: 'easy', Moderate: 'medium', moderate: 'medium', Hard: 'hard', hard: 'hard', Competency: 'competency', competency: 'competency', 'Competency based': 'competency', 'competency based': 'competency' };

// ── Image upload helpers ──────────────────────────────────────────────────────

async function uploadImages(chapterId: string, files: File[]): Promise<Map<string, string>> {
  if (!files.length) return new Map();
  const form = new FormData();
  for (const f of files) form.append('files', f);
  const res = await fetch(`${API_BASE}/api/library/chapters/${chapterId}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}` },
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Image upload failed (${res.status})${detail ? `: ${detail.slice(0, 240)}` : ''}`);
  }
  const arr: { fileName?: string; originalName?: string; url: string }[] = await res.json();
  const map = new Map<string, string>();
  for (const item of arr) {
    const originalName = item.fileName || item.originalName || '';
    const { url } = item;
    if (!originalName) continue;
    map.set(originalName.toLowerCase(), `${API_BASE}${url}`);
    // also map without extension for fallback
    map.set(originalName.toLowerCase().replace(/\.[^.]+$/, ''), `${API_BASE}${url}`);
  }
  return map;
}

function buildExplanationHtml(q: any, imgUrl: string | undefined): string {
  const fe = q.final_explanation || {};
  const parts: string[] = [];
  if (fe.simple_explanation) parts.push(`<p>${fe.simple_explanation}</p>`);
  if (imgUrl) parts.push(`<figure style="margin:16px 0"><img src="${imgUrl}" alt="${(q.explanation_image_alt || '').replace(/"/g, '&quot;')}" style="max-width:100%;height:auto;border-radius:8px;" /></figure>`);
  if (Array.isArray(fe.step_by_step) && fe.step_by_step.length)
    parts.push(`<ol>${fe.step_by_step.map((s: string) => `<li>${s}</li>`).join('')}</ol>`);
  if (fe.balanced_equation_or_visual) parts.push(`<p><strong>Equation:</strong> ${fe.balanced_equation_or_visual}</p>`);
  if (fe.key_idea) parts.push(`<p><strong>Key idea:</strong> ${fe.key_idea}</p>`);
  if (fe.memory_tip) parts.push(`<p><strong>Remember:</strong> ${fe.memory_tip}</p>`);
  return parts.join('\n');
}

function resolveImageUrl(imageRef: string, urlMap: Map<string, string>): string | undefined {
  if (!imageRef) return undefined;
  // imageRef like "images/question_01.png" or "question_01.png"
  const filename = imageRef.split('/').pop() || imageRef;
  return urlMap.get(filename.toLowerCase()) || urlMap.get(filename.toLowerCase().replace(/\.[^.]+$/, ''));
}

function buildImportPayload(q: any, imgUrl: string | undefined, topicMap: Map<string, string>, cykMode: boolean) {
  const topicId = (key: string) => topicMap.get(key.toLowerCase().trim()) ?? null;

  // ── question_bank.json format ──────────────────────────────────────────────
  // Detected by: options as [{id,text}] and correct_option as a letter string
  if (q.correct_option !== undefined && Array.isArray(q.options) && q.options[0]?.id !== undefined) {
    const optTexts: string[] = q.options.map((o: any) => o.text as string);
    const correctOpt = q.options.find((o: any) => o.id === q.correct_option);
    const correctAnswer = correctOpt?.text ?? '';
    const tid = q.topic ? (topicId(q.topic) ?? (q.subtopic ? topicId(q.subtopic) : null)) : null;
    return {
      id: q.question_id || q.id || uid(),
      type: 'type1',
      format: 'mcq',
      question: q.question ?? '',
      options: optTexts,
      correctAnswer,
      explanation: q.short_explanation ? `<p>${q.short_explanation}</p>` : '',
      finalAnswer: '',
      topicId: tid,
      difficulty: DIFFICULTY[q.difficulty ?? ''] ?? 'medium',
      patternId: q.pattern_id ?? q.question_id ?? '',
      marks: Number(q.marks) || 1,
      usage: cykMode ? ['cyk'] : [],
      mediaRefs: [],
      status: 'staged',
      steps: [],
    };
  }

  // ── EduLLM 5.0 schema ────────────────────────────────────────────────────
  const steps = (q.subquestions || []).map((s: any) => ({
    id: uid(),
    prompt: s.question,
    options: s.options.map((o: any) => o.text),
    answer: s.options.find((o: any) => o.is_correct)?.text || s.answer || '',
    marks: Number(s.marks) || 1,
    negativeMarks: 0,
    isCritical: false,
    explanation: s.feedback || '',
    mediaRefs: [],
    answerMediaRefs: [],
    explanationMediaRefs: [],
  }));

  const tid2 = q.topic ? (topicId(q.topic)) : null;
  const isType1 = q.question_type === 'Type 1' || (q.subquestions || []).length === 0;

  if (isType1) {
    return {
      id: q.question_id || q.id || uid(),
      type: 'type1',
      format: 'mcq',
      question: q.main_question || q.question || '',
      options: (q.options || []).map((o: any) => typeof o === 'string' ? o : o.text),
      correctAnswer: q.correct_answer || '',
      explanation: buildExplanationHtml(q, imgUrl),
      finalAnswer: '',
      topicId: tid2,
      difficulty: DIFFICULTY[q.complexity || ''] || 'medium',
      patternId: q.pattern_id || '',
      marks: Number(q.marks) || 1,
      usage: cykMode ? ['cyk'] : [],
      mediaRefs: [],
      status: 'staged',
      steps: [],
    };
  }

  return {
    id: q.question_id || q.id || uid(),
    type: 'type2',
    format: 'guided',
    question: q.main_question || '',
    options: [],
    correctAnswer: '',
    explanation: '',
    finalAnswer: buildExplanationHtml(q, imgUrl),
    topicId: tid2,
    difficulty: DIFFICULTY[q.complexity || ''] || 'medium',
    patternId: q.pattern_id || '',
    marks: steps.reduce((acc: number, s: any) => acc + s.marks, 0) || Number(q.marks) || 2,
    usage: cykMode ? ['cyk'] : [],
    status: 'staged',
    steps,
  };
}

// ── Import modal ──────────────────────────────────────────────────────────────

function ImportJsonModal({
  chapterId, topics, cykMode, onClose, onDone,
}: {
  chapterId: string;
  topics: any[];
  cykMode: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const jsonRef = useRef<HTMLInputElement>(null);
  const imgRef  = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'importing' | 'done'>('idle');
  const [progress, setProgress] = useState('');
  const [err, setErr] = useState('');
  const [preview, setPreview] = useState<{ total: number; type1: number; type2: number; reviewRequired: number } | null>(null);

  const handleJsonChange = () => {
    const file = jsonRef.current?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const qs = data.questions || [];
        const isQBankFmt = qs.length > 0 && qs[0].correct_option !== undefined && qs[0].options?.[0]?.id !== undefined;
        if (isQBankFmt) {
          const reviewRequired = qs.filter((q: any) => q.review_required).length;
          setPreview({ total: qs.length, type1: qs.length, type2: 0, reviewRequired });
        } else {
          const t1 = qs.filter((q: any) => q.question_type === 'Type 1' || (q.subquestions || []).length === 0).length;
          setPreview({ total: qs.length, type1: t1, type2: qs.length - t1, reviewRequired: 0 });
        }
        setErr('');
      } catch { setErr('Invalid JSON file'); }
    };
    reader.readAsText(file);
  };

  const run = async () => {
    const jsonFile = jsonRef.current?.files?.[0];
    if (!jsonFile) { setErr('Select a JSON file'); return; }
    setPhase('uploading'); setErr('');

    try {
      // 1. Upload images
      const imageFiles = Array.from(imgRef.current?.files || []);
      setProgress(`Uploading ${imageFiles.length} image(s)…`);
      const urlMap = await uploadImages(chapterId, imageFiles);

      // 2. Parse JSON
      setPhase('importing');
      const jsonText = await jsonFile.text();
      const data = JSON.parse(jsonText);
      const qs: any[] = data.questions || [];

      // Build topic lookup map (lowercase title → id)
      const topicMap = new Map<string, string>(
        topics.map((t: any) => [t.title.toLowerCase().trim(), t.id])
      );

      let ok = 0, fail = 0;
      const failures: string[] = [];
      for (let i = 0; i < qs.length; i++) {
        setProgress(`Importing question ${i + 1} / ${qs.length}…`);
        const q = qs[i];
        const imgUrl = q.explanation_image_ref ? resolveImageUrl(q.explanation_image_ref, urlMap) : undefined;
        const payload = buildImportPayload(q, imgUrl, topicMap, cykMode);
        try {
          await lms(`/chapters/${chapterId}/questions`, { method: 'POST', body: JSON.stringify(payload) });
          ok++;
        } catch (error: any) { fail++; if (failures.length < 3) failures.push(`Q${i + 1}: ${error?.message || 'Request failed'}`); }
      }

      setProgress(`Done. ${ok} imported, ${fail} failed.${failures.length ? ` ${failures.join(' · ')}` : ''}`);
      setPhase('done');
      onDone();
    } catch (e: any) {
      setErr(e.message);
      setPhase('idle');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, maxWidth: 480, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>{cykMode ? 'Import CYK Questions (JSON)' : 'Import Questions (JSON)'}</h2>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>
          Accepts EduLLM <strong>question_bank.json</strong> (Type 1 MCQs with letter options) or EduLLM schema 5.0 (Type 1 + Type 2). Images uploaded to server; topics auto-assigned from the topic field.
          {cykMode ? ' All imported questions will be tagged as CYK.' : ''}
        </p>

        {err && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '8px 12px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>{err}</div>}

        {phase === 'idle' || phase === 'done' ? (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Question JSON file <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input ref={jsonRef} type="file" accept=".json" onChange={handleJsonChange}
                style={{ display: 'block', fontSize: 13, width: '100%' }} />
              {preview && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#475569' }}>
                  {preview.total} questions detected — Type 1: {preview.type1}{preview.type2 > 0 ? `, Type 2: ${preview.type2}` : ''}
                  {preview.reviewRequired > 0 && <span style={{ color: '#d97706' }}> · {preview.reviewRequired} flagged for teacher review</span>}
                </div>
              )}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Image files <span style={{ color: '#94a3b8' }}>(optional)</span>
              </label>
              <input ref={imgRef} type="file" accept="image/*" multiple
                style={{ display: 'block', fontSize: 13, width: '100%' }} />
              <small style={{ color: '#94a3b8', fontSize: 11 }}>Select all image files from the images/ folder. Cmd/Ctrl+click to multi-select.</small>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="sb-btn-ghost" onClick={onClose}>Cancel</button>
              <button className="sb-btn-primary" onClick={run} disabled={!preview}>
                Import
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 14, color: '#475569', marginBottom: 8 }}>
              {phase === 'uploading' ? '⬆ Uploading images…' : '📥 Importing questions…'}
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>{progress}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Preview cards — matches index (9).html style ─────────────────────────────

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function CardMeta({ q, index, topics, typeLabel, typeColor }: { q: any; index: number; topics: any[]; typeLabel: string; typeColor: string }) {
  const topic = topics.find((t: any) => t.id === q.topicId);
  return (
    <div style={{ fontSize: 12, color: '#56718c', display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
      <span style={{ background: typeColor + '22', color: typeColor, padding: '1px 8px', borderRadius: 4, fontWeight: 700, fontSize: 11, textTransform: 'uppercase' }}>{typeLabel}</span>
      <span>Q{index + 1}</span>
      {topic && <span style={{ background: '#f1f5f9', padding: '1px 7px', borderRadius: 4 }}>{topic.title}</span>}
      {q.patternId && <span>{q.patternId}</span>}
      <span style={{ textTransform: 'capitalize' }}>{q.difficulty} · {q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
    </div>
  );
}

function QuestionCard({ q, index, topics }: { q: any; index: number; topics: any[] }) {
  const [selected, setSelected] = useState<string | null>(q.correctAnswer || null);
  const [revealed, setRevealed] = useState(true);
  const isCorrect = revealed && selected === q.correctAnswer;

  const optionLetter = (opt: string) => {
    const i = (q.options || []).indexOf(opt);
    return i >= 0 ? LETTERS[i] : '';
  };

  return (
    <article style={{ background: '#fff', border: '1px solid #dce5f0', borderRadius: 16, padding: 23, margin: '15px 0', boxShadow: '0 4px 14px rgba(25,48,76,.04)' }}>
      <CardMeta q={q} index={index} topics={topics} typeLabel="Type 1" typeColor="#1a56db" />
      <p style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.5, margin: '0 0 15px', color: '#19304c' }}>{q.question}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {(q.options || []).map((opt: string, i: number) => {
          const picked = selected === opt;
          const isGood = opt === q.correctAnswer;
          const isBad = revealed && picked && !isGood;
          return (
            <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, border: `1px solid ${isGood ? '#86efac' : isBad ? '#fca5a5' : picked ? '#93c5fd' : '#d4dfeb'}`, borderRadius: 10, padding: 12, cursor: revealed ? 'default' : 'pointer', lineHeight: 1.4, background: isGood ? '#f0fdf4' : isBad ? '#fef2f2' : picked ? '#f0f7ff' : '#fff', transition: 'background .12s' }}>
              <input type="radio" name={`prev-${q.id}`} disabled={revealed} checked={picked} onChange={() => setSelected(opt)} style={{ marginTop: 3, flexShrink: 0 }} />
              <span><strong style={{ color: isGood ? '#16a34a' : '#56718c' }}>{LETTERS[i]}.</strong> {opt}</span>
            </label>
          );
        })}
      </div>
      <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {revealed ? (
          <button style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid #d4dfeb', fontFamily: 'inherit', fontSize: 13, background: '#edf3fb', color: '#244b77', cursor: 'pointer' }}
            onClick={() => { setSelected(null); setRevealed(false); }}>
            ↺ Try on your own
          </button>
        ) : (
          <>
            <button disabled={!selected} style={{ padding: '8px 16px', borderRadius: 9, border: 0, fontFamily: 'inherit', fontSize: 13, background: '#225ca3', color: '#fff', cursor: !selected ? 'not-allowed' : 'pointer', opacity: !selected ? 0.45 : 1 }}
              onClick={() => setRevealed(true)}>
              Check answer
            </button>
            <button style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid #d4dfeb', fontFamily: 'inherit', fontSize: 13, background: '#edf3fb', color: '#244b77', cursor: 'pointer' }}
              onClick={() => { setSelected(q.correctAnswer || null); setRevealed(true); }}>
              Show answer
            </button>
          </>
        )}
      </div>
      {revealed && (
        <div style={{ background: isCorrect ? '#f1f8f4' : '#f0fdf4', border: `1px solid ${isCorrect ? '#d0e7d8' : '#86efac'}`, padding: 16, borderRadius: 12, marginTop: 15, lineHeight: 1.6 }}>
          <strong style={{ display: 'block', marginBottom: 6, color: '#15803d' }}>
            ✓ Correct answer: {optionLetter(q.correctAnswer)}. {q.correctAnswer}
          </strong>
          {q.explanation && <div dangerouslySetInnerHTML={{ __html: q.explanation }} style={{ fontSize: 14 }} />}
        </div>
      )}
    </article>
  );
}

function Type2Card({ q, index, topics }: { q: any; index: number; topics: any[] }) {
  const steps: any[] = q.steps || [];
  const [stepStates, setStepStates] = useState<Array<{ selected: string | null; revealed: boolean }>>(() =>
    steps.map((s: any) => ({ selected: s.answer || null, revealed: true }))
  );
  const [showFinal, setShowFinal] = useState(true);

  const selectStep = (si: number, val: string) =>
    setStepStates(prev => { const n = [...prev]; if (!n[si].revealed) n[si] = { ...n[si], selected: val }; return n; });
  const revealStep = (si: number) =>
    setStepStates(prev => { const n = [...prev]; n[si] = { ...n[si], revealed: true }; return n; });
  const resetStep = (si: number) =>
    setStepStates(prev => { const n = [...prev]; n[si] = { selected: null, revealed: false }; return n; });

  return (
    <article style={{ background: '#fff', border: '1px solid #dce5f0', borderRadius: 16, padding: 23, margin: '15px 0', boxShadow: '0 4px 14px rgba(25,48,76,.04)' }}>
      <CardMeta q={q} index={index} topics={topics} typeLabel="Type 2" typeColor="#7c3aed" />
      <p style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.5, margin: '0 0 18px', color: '#19304c' }}>{q.question || <em style={{ color: '#94a3b8' }}>No main question text</em>}</p>

      {steps.map((step: any, si: number) => {
        const ss = stepStates[si] || { selected: null, revealed: true };
        const opts: string[] = (step.options || []).filter((o: string) => (o || '').trim());
        const hasOpts = opts.length > 0;
        const isCorrect = !ss.revealed || ss.selected === step.answer;
        return (
          <div key={step.id || si} style={{ border: `1px solid ${ss.revealed ? (isCorrect ? '#86efac' : '#fca5a5') : '#e2e8f0'}`, borderRadius: 12, padding: 16, marginBottom: 12, background: '#f8fafc', transition: 'border-color .2s' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 }}>
              <span style={{ background: '#225ca3', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{si + 1}</span>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1e293b', flex: 1, lineHeight: 1.5 }}>{step.prompt || <em style={{ color: '#94a3b8', fontWeight: 400 }}>No sub-question</em>}</p>
              <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0, whiteSpace: 'nowrap' }}>
                {step.marks} mk{step.isCritical ? ' · critical' : ''}
              </span>
            </div>

            {hasOpts ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                {opts.map((opt: string, oi: number) => {
                  const picked = ss.selected === opt;
                  const isGood = ss.revealed && opt === step.answer;
                  const isBad = ss.revealed && picked && !isGood;
                  return (
                    <label key={oi} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, border: `1px solid ${isGood ? '#86efac' : isBad ? '#fca5a5' : picked ? '#93c5fd' : '#d4dfeb'}`, borderRadius: 8, padding: '8px 10px', cursor: ss.revealed ? 'default' : 'pointer', background: isGood ? '#f0fdf4' : isBad ? '#fef2f2' : picked ? '#f0f7ff' : '#fff', transition: 'background .12s' }}>
                      <input type="radio" name={`step-${q.id}-${si}`} disabled={ss.revealed} checked={picked} onChange={() => selectStep(si, opt)} style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 13 }}><strong style={{ color: '#56718c' }}>{LETTERS[oi]}.</strong> {opt}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div style={{ marginBottom: 10 }}>
                {ss.revealed
                  ? <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#15803d' }}><strong>Answer: </strong>{step.answer || '—'}</div>
                  : <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#94a3b8' }}>[open answer — click Check to reveal]</div>}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ss.revealed ? (
                <button onClick={() => resetStep(si)}
                  style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #d4dfeb', fontSize: 13, background: '#edf3fb', color: '#244b77', cursor: 'pointer' }}>
                  ↺ Try on your own
                </button>
              ) : (
                <>
                  <button disabled={hasOpts && !ss.selected} onClick={() => revealStep(si)}
                    style={{ padding: '7px 14px', borderRadius: 8, border: 0, fontSize: 13, background: '#225ca3', color: '#fff', cursor: (hasOpts && !ss.selected) ? 'not-allowed' : 'pointer', opacity: (hasOpts && !ss.selected) ? 0.45 : 1 }}>
                    Check step
                  </button>
                  <button onClick={() => setStepStates(prev => { const n = [...prev]; n[si] = { selected: step.answer || null, revealed: true }; return n; })}
                    style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #d4dfeb', fontSize: 13, background: '#edf3fb', color: '#244b77', cursor: 'pointer' }}>
                    Show answer
                  </button>
                </>
              )}
            </div>

            {ss.revealed && (
              <div style={{ background: '#f1f8f4', border: '1px solid #d0e7d8', padding: 12, borderRadius: 10, marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
                <strong style={{ display: 'block', marginBottom: step.explanation ? 4 : 0, color: '#15803d' }}>
                  ✓ Answer: {step.answer || '—'}
                </strong>
                {step.explanation && <div dangerouslySetInnerHTML={{ __html: step.explanation }} />}
              </div>
            )}
          </div>
        );
      })}

      {(q.finalAnswer || q.explanation) && (
        <div style={{ marginTop: 4 }}>
          <button onClick={() => setShowFinal(v => !v)}
            style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid #d4dfeb', fontSize: 13, background: showFinal ? '#f0fdf4' : '#edf3fb', color: showFinal ? '#15803d' : '#244b77', cursor: 'pointer' }}>
            {showFinal ? '▲ Hide full explanation' : '▼ Show full explanation'}
          </button>
          {showFinal && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginTop: 10, fontSize: 14, lineHeight: 1.7 }}
              dangerouslySetInnerHTML={{ __html: q.finalAnswer || q.explanation || '' }} />
          )}
        </div>
      )}
    </article>
  );
}

// ── Statistics — types ──────────────────────────────────────────────────────────

interface StatEntry { name: string; count: number; questionNums: string[]; }
interface TypeStats {
  count: number;
  withPatternCount: number;
  patterns: StatEntry[];
  byDifficulty: StatEntry[];
  byTopic: StatEntry[];
  byStatus: StatEntry[];
  byUsage: StatEntry[];
  stepDist: StatEntry[];   // Type 2 only
}
interface StatsSnapshot {
  generatedAt: string;
  totalQuestions: number;
  questionCount: number;   // snapshot count for staleness check
  type1: TypeStats;
  type2: TypeStats;
}

function computeTypeStats(qs: any[], allQs: any[], topics: any[]): TypeStats {
  const qNum = (q: any) => `Q${allQs.findIndex(x => x.id === q.id) + 1}`;
  const group = <K extends string>(getKey: (q: any) => K) => {
    const m = new Map<K, any[]>();
    for (const q of qs) { const k = getKey(q); if (!m.has(k)) m.set(k, []); m.get(k)!.push(q); }
    return m;
  };
  const toEntries = (m: Map<string, any[]>, sortDesc = true): StatEntry[] =>
    [...m.entries()]
      .sort((a, b) => sortDesc ? b[1].length - a[1].length : 0)
      .map(([name, list]) => ({ name, count: list.length, questionNums: list.map(qNum) }));

  const patternMap = group(q => q.patternId?.trim() || '(no pattern)');
  const patterns = toEntries(patternMap);
  // put (no pattern) last
  patterns.sort((a, b) => a.name === '(no pattern)' ? 1 : b.name === '(no pattern)' ? -1 : b.count - a.count);

  const topicMap = group(q => { const t = topics.find(t => t.id === q.topicId); return t?.title || '(no topic)'; });
  const diffMap = group(q => q.difficulty || 'medium');
  const statusMap = group(q => q.status || 'staged');
  const stepsMap = group(q => `${(q.steps || []).length} step${(q.steps || []).length !== 1 ? 's' : ''}`);

  const usageTags = ['cycle_test', 'chapter_practice'];
  const usageMap = new Map<string, any[]>();
  usageMap.set('cycle_test', qs.filter(q => (q.usage||[]).includes('cycle_test')));
  usageMap.set('chapter_practice', qs.filter(q => (q.usage||[]).includes('chapter_practice')));
  usageMap.set('unused', qs.filter(q => !(q.usage||[]).some((u:string) => usageTags.includes(u))));

  return {
    count: qs.length,
    withPatternCount: qs.filter(q => q.patternId?.trim()).length,
    patterns,
    byTopic: toEntries(topicMap),
    byDifficulty: (['easy', 'medium', 'hard', 'competency'] as const)
      .map(d => ({ name: d, count: diffMap.get(d)?.length ?? 0, questionNums: diffMap.get(d)?.map(qNum) ?? [] }))
      .filter(e => e.count > 0),
    byStatus: toEntries(statusMap),
    byUsage: [...usageMap.entries()].map(([name, list]) => ({ name, count: list.length, questionNums: list.map(qNum) })),
    stepDist: toEntries(stepsMap, false),
  };
}

function computeSnapshot(questions: any[], topics: any[]): StatsSnapshot {
  const type1 = questions.filter(q => q.type === 'type1');
  const type2 = questions.filter(q => q.type === 'type2');
  return {
    generatedAt: new Date().toISOString(),
    totalQuestions: questions.length,
    questionCount: questions.length,
    type1: computeTypeStats(type1, questions, topics),
    type2: computeTypeStats(type2, questions, topics),
  };
}

// ── Statistics — rendering ──────────────────────────────────────────────────────

const TH: React.CSSProperties = { textAlign: 'left', padding: '8px 12px', background: '#f1f5f9', fontWeight: 600, color: '#374151', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' };
const TD: React.CSSProperties = { padding: '6px 12px', borderBottom: '1px solid #f1f5f9', color: '#374151', verticalAlign: 'top' };
const diffColors: Record<string, string> = { easy: '#16a34a', medium: '#d97706', hard: '#dc2626', competency: '#7c3aed' };

function StatsSection({ label, stats, typeColor }: { label: string; stats: TypeStats; typeColor: string }) {
  if (!stats.count) return (
    <div style={{ padding: '20px 0', color: '#94a3b8', fontStyle: 'italic', fontSize: 13 }}>No {label} questions.</div>
  );
  const uniquePatterns = stats.patterns.filter(p => p.name !== '(no pattern)').length;

  return (
    <section style={{ marginBottom: 36 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ background: typeColor + '18', color: typeColor, padding: '4px 12px', borderRadius: 6, fontWeight: 700, fontSize: 13 }}>{label}</span>
        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{stats.count} question{stats.count !== 1 ? 's' : ''}</span>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>·</span>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{stats.withPatternCount} with pattern · {stats.count - stats.withPatternCount} without</span>
      </div>

      {/* Summary chips — status */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        {stats.byStatus.map(({ name: s, count: n }) => (
          <div key={s} style={{ background: s === 'approved' ? '#f0fdf4' : s === 'excluded' ? '#f8fafc' : '#fffbeb', border: `1px solid ${s === 'approved' ? '#86efac' : s === 'excluded' ? '#e2e8f0' : '#fde68a'}`, borderRadius: 10, padding: '8px 18px', textAlign: 'center', minWidth: 70 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: s === 'approved' ? '#16a34a' : s === 'excluded' ? '#94a3b8' : '#d97706', lineHeight: 1.2 }}>{n}</div>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'capitalize', marginTop: 2 }}>{s}</div>
          </div>
        ))}
        <div style={{ background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '8px 18px', textAlign: 'center', minWidth: 70 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1d4ed8', lineHeight: 1.2 }}>{uniquePatterns}</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>unique patterns</div>
        </div>
      </div>

      {/* Usage chips — cycle test / practice / unused */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {(stats.byUsage||[]).map(({ name, count: n }) => {
          const cfg: Record<string, {bg:string;border:string;color:string;label:string}> = {
            cycle_test:       { bg:'#f0fdf4', border:'#86efac', color:'#15803d', label:'In cycle test' },
            chapter_practice: { bg:'#eff6ff', border:'#93c5fd', color:'#1d4ed8', label:'In practice' },
            unused:           { bg:'#f8fafc', border:'#e2e8f0', color:'#94a3b8', label:'Unused' },
          };
          const c = cfg[name] || { bg:'#f8fafc', border:'#e2e8f0', color:'#64748b', label: name };
          return (
            <div key={name} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: '8px 18px', textAlign: 'center', minWidth: 70 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: c.color, lineHeight: 1.2 }}>{n}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{c.label}</div>
            </div>
          );
        })}
      </div>

      {/* Pattern table */}
      <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8, marginTop: 0 }}>
        Pattern Analysis — {uniquePatterns} unique pattern{uniquePatterns !== 1 ? 's' : ''}
      </h4>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr>
            <th style={{ ...TH, width: 32, textAlign: 'center' }}>#</th>
            <th style={TH}>Pattern ID</th>
            <th style={TH}>Linked Questions</th>
            <th style={{ ...TH, width: 60, textAlign: 'center' }}>Count</th>
          </tr></thead>
          <tbody>
            {stats.patterns.map(({ name: pid, count, questionNums }, idx) => (
              <tr key={pid} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ ...TD, color: '#94a3b8', textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ ...TD, fontFamily: 'monospace', fontSize: 12, color: pid === '(no pattern)' ? '#94a3b8' : '#1e293b', fontStyle: pid === '(no pattern)' ? 'italic' : 'normal', fontWeight: pid !== '(no pattern)' ? 600 : 400 }}>{pid}</td>
                <td style={{ ...TD, color: '#56718c', lineHeight: 1.9, fontSize: 12 }}>{questionNums.join(' · ')}</td>
                <td style={{ ...TD, textAlign: 'center', fontWeight: 700 }}>{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Difficulty + Topic side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: label === 'Type 2' ? 20 : 0 }}>
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8, marginTop: 0 }}>By Difficulty</h4>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr><th style={TH}>Difficulty</th><th style={{ ...TH, textAlign: 'center' }}>Count</th><th style={{ ...TH, textAlign: 'center' }}>%</th></tr></thead>
              <tbody>
                {stats.byDifficulty.map(({ name: d, count }, di) => (
                  <tr key={d} style={{ background: di % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={TD}><span style={{ background: (diffColors[d] || '#64748b') + '18', color: diffColors[d] || '#64748b', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>{d}</span></td>
                    <td style={{ ...TD, textAlign: 'center', fontWeight: 700 }}>{count}</td>
                    <td style={{ ...TD, textAlign: 'center', color: '#64748b' }}>{Math.round(count / stats.count * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8, marginTop: 0 }}>By Topic — {stats.byTopic.length} topic{stats.byTopic.length !== 1 ? 's' : ''}</h4>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr><th style={TH}>Topic</th><th style={{ ...TH, textAlign: 'center' }}>Count</th></tr></thead>
              <tbody>
                {stats.byTopic.map(({ name: t, count }, ti) => (
                  <tr key={t} style={{ background: ti % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ ...TD, color: t === '(no topic)' ? '#94a3b8' : '#1e293b', fontStyle: t === '(no topic)' ? 'italic' : 'normal' }}>{t}</td>
                    <td style={{ ...TD, textAlign: 'center', fontWeight: 700 }}>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Type 2 steps distribution */}
      {label === 'Type 2' && stats.stepDist.length > 0 && (
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8, marginTop: 0 }}>Steps per Question</h4>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr><th style={{ ...TH, width: 80 }}>Steps</th><th style={TH}>Questions</th><th style={{ ...TH, width: 60, textAlign: 'center' }}>Count</th></tr></thead>
              <tbody>
                {stats.stepDist.map(({ name, count, questionNums }, si) => (
                  <tr key={name} style={{ background: si % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ ...TD, fontWeight: 600 }}>{name}</td>
                    <td style={{ ...TD, color: '#56718c', fontSize: 12 }}>{questionNums.join(' · ')}</td>
                    <td style={{ ...TD, textAlign: 'center', fontWeight: 700 }}>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function FormAnalysis({ questions, cycleConfig }: { questions: any[]; cycleConfig: any }) {
  const qIdx = (id: string) => questions.findIndex(q => q.id === id);
  const qLabel = (id: string) => { const i = qIdx(id); return i >= 0 ? `Q${i + 1}` : null; };

  const sections = Array.isArray(cycleConfig?.sections) ? cycleConfig.sections : [];
  const forms = Array.isArray(cycleConfig?.forms) ? cycleConfig.forms : [];
  const sectionById = new Map<string, any>(sections.map((s: any) => [s.id, s]));

  // All question IDs used in any form
  const usedInAnyForm = new Set<string>(
    forms.flatMap((f: any) => (Array.isArray(f.sections) ? f.sections : []).flatMap((s: any) => Array.isArray(s.questionIds) ? s.questionIds : []))
  );
  const unusedInForms = questions.filter(q => !usedInAnyForm.has(q.id));

  const statusColor: Record<string, string> = { approved: '#16a34a', draft: '#d97706' };

  return (
    <div style={{ marginTop: 36 }}>
      <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', marginBottom: 28 }} />
      <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: '0 0 16px' }}>
        Form Analysis — {forms.length} form{forms.length !== 1 ? 's' : ''} · {usedInAnyForm.size} question{usedInAnyForm.size !== 1 ? 's' : ''} distributed
      </h4>

      <div style={{ display: 'grid', gap: 12 }}>
        {forms.map((form: any) => {
          const allEmpty = form.sections.every((s: any) => !s.questionIds.length);
          return (
            <div key={form.number} style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ background: '#f8fafc', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>Form {form.number}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: form.status === 'approved' ? '#f0fdf4' : '#fffbeb', color: statusColor[form.status] || '#64748b', border: `1px solid ${form.status === 'approved' ? '#86efac' : '#fde68a'}` }}>
                  {form.status}
                </span>
                {allEmpty && <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>No questions proposed yet</span>}
              </div>
              {!allEmpty && (
                <div style={{ padding: '10px 14px', display: 'grid', gap: 8 }}>
                  {(Array.isArray(form.sections) ? form.sections : []).map((fs: any) => {
                    const sec = sectionById.get(fs.sectionId);
                    if (!fs.questionIds.length) return null;
                    const labels = fs.questionIds.map((id: string) => qLabel(id)).filter(Boolean) as string[];
                    labels.sort((a: string, b: string) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
                    return (
                      <div key={fs.sectionId} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap', paddingTop: 2, minWidth: 160 }}>
                          {sec?.title || fs.sectionId}
                          <span style={{ fontWeight: 400, color: '#94a3b8' }}> ({labels.length})</span>
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {labels.map((lbl: string) => (
                            <span key={lbl} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: sec?.questionType === 'type2' ? '#f3f0ff' : '#eff6ff', color: sec?.questionType === 'type2' ? '#6d28d9' : '#1d4ed8', fontWeight: 600 }}>
                              {lbl}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {unusedInForms.length > 0 && (
        <div style={{ marginTop: 16, border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ background: '#f8fafc', padding: '8px 14px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#64748b' }}>Unused in Cycle Test</span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>{unusedInForms.length}</span>
          </div>
          <div style={{ padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {unusedInForms
              .map(q => ({ q, label: qLabel(q.id)! }))
              .filter(x => x.label)
              .sort((a, b) => parseInt(a.label.slice(1)) - parseInt(b.label.slice(1)))
              .map(({ q, label }) => {
                const inPractice = (q.usage || []).includes('chapter_practice');
                const bg    = inPractice ? '#f0fdf4' : q.type === 'type2' ? '#f3f0ff' : '#eff6ff';
                const color = inPractice ? '#16a34a' : q.type === 'type2' ? '#6d28d9' : '#1d4ed8';
                return (
                  <span key={q.id} title={inPractice ? 'In practice' : undefined}
                    style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: bg, color, fontWeight: 600 }}>
                    {label}
                  </span>
                );
              })
            }
          </div>
        </div>
      )}
    </div>
  );
}

function StatsView({ chapterId, questions, topics, refreshKey }: { chapterId: string; questions: any[]; topics: any[]; refreshKey: number }) {
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [cycleConfig, setCycleConfig] = useState<any>(null);

  useEffect(() => {
    lms<StatsSnapshot | null>(`/question-bank/chapters/${chapterId}/statistics`)
      .then(s => setLastSaved(s?.generatedAt ?? null))
      .catch(() => {});
    lms<any>(`/catalogue/chapters/${chapterId}/assessment`)
      .then(c => setCycleConfig(c?.cycleTest || c))
      .catch(() => {});
  }, [chapterId, refreshKey]);

  const live = questions.length ? computeSnapshot(questions, topics) : null;

  const save = async () => {
    if (!live) return;
    setSaving(true); setErr('');
    try {
      const saved = await lms<StatsSnapshot>(`/chapters/${chapterId}/questions/stats`, {
        method: 'POST', body: JSON.stringify(live),
      });
      setLastSaved(saved.generatedAt);
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const totalCycleTest = (live?.type1.byUsage?.find(e => e.name === 'cycle_test')?.count ?? 0)
                       + (live?.type2.byUsage?.find(e => e.name === 'cycle_test')?.count ?? 0);
  const totalPractice  = (live?.type1.byUsage?.find(e => e.name === 'chapter_practice')?.count ?? 0)
                       + (live?.type2.byUsage?.find(e => e.name === 'chapter_practice')?.count ?? 0);
  const totalUnused    = (live?.type1.byUsage?.find(e => e.name === 'unused')?.count ?? 0)
                       + (live?.type2.byUsage?.find(e => e.name === 'unused')?.count ?? 0);

  return (
    <div>
      {/* Action bar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16, padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
        <div style={{ flex: 1, fontSize: 13, color: '#475569' }}>
          {live
            ? <><strong>{live.totalQuestions}</strong> questions · {live.type1.count} Type 1 · {live.type2.count} Type 2
                {lastSaved && <span style={{ marginLeft: 12, fontSize: 12, color: '#94a3b8' }}>Last saved: {fmt(lastSaved)}</span>}
              </>
            : <span style={{ color: '#94a3b8' }}>No questions in this chapter yet.</span>
          }
        </div>
        <button className="sb-btn-primary" disabled={saving || !live} onClick={save}
          style={{ padding: '7px 20px', fontSize: 13, background: '#0f766e' }}>
          {saving ? 'Saving…' : '↓ Save Statistics'}
        </button>
      </div>

      {/* Combined usage totals */}
      {live && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          {([
            { label: 'In cycle test', count: totalCycleTest, bg: '#f0fdf4', border: '#86efac', color: '#15803d' },
            { label: 'In practice',   count: totalPractice,  bg: '#eff6ff', border: '#93c5fd', color: '#1d4ed8' },
            { label: 'Total unused',  count: totalUnused,    bg: '#f8fafc', border: '#e2e8f0', color: '#64748b' },
          ]).map(({ label, count, bg, border, color }) => (
            <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '8px 22px', textAlign: 'center', minWidth: 90 }}>
              <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1.2 }}>{count}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {err && <div className="sb-error" style={{ marginBottom: 16 }}>{err}</div>}

      {live && (
        <>
          <StatsSection label="Type 1" stats={live.type1} typeColor="#1a56db" />
          {live.type2.count > 0 && <hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '4px 0 28px' }} />}
          <StatsSection label="Type 2" stats={live.type2} typeColor="#7c3aed" />
        </>
      )}

      {live && cycleConfig && questions.length > 0 && (
        <FormAnalysis questions={questions} cycleConfig={cycleConfig} />
      )}
    </div>
  );
}

const DIFF_COLORS: Record<string, string> = { easy: '#16a34a', medium: '#d97706', hard: '#dc2626', competency: '#7c3aed' };

function PracticeConfig({
  chapterId, questions, topics, onPublished,
}: {
  chapterId: string; questions: any[]; topics: any[]; onPublished: () => void;
}) {
  const current = questions.filter(q => (q.usage || []).includes('chapter_practice'));
  const [mode, setMode] = useState<'config' | 'preview'>('config');
  const [typeFilter, setTypeFilter] = useState<'type1' | 'type2' | 'both'>('both');
  const [selDiff, setSelDiff] = useState<string[]>(['medium', 'hard']);
  const [perPat, setPerPat] = useState(2);
  const [previewIds, setPreviewIds] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const approved = questions.filter(q =>
    q.status !== 'excluded' && (typeFilter === 'both' || q.type === typeFilter)
  );

  const patterns = useMemo(() => {
    const s = new Set<string>();
    approved.forEach(q => s.add(q.patternId || '(no pattern)'));
    return [...s].sort((a, b) => a === '(no pattern)' ? 1 : b === '(no pattern)' ? -1 : a.localeCompare(b));
  }, [approved]);

  const autoSelect = () => {
    const byPat = new Map<string, any[]>();
    for (const q of approved) {
      if (!selDiff.includes(q.difficulty)) continue;
      const p = q.patternId || '(no pattern)';
      if (!byPat.has(p)) byPat.set(p, []);
      byPat.get(p)!.push(q);
    }
    const ids = new Set<string>();
    byPat.forEach(qs => qs.slice(0, perPat).forEach((q: any) => ids.add(q.id)));
    setPreviewIds(ids);
    setMode('preview');
  };

  const publish = async () => {
    if (!window.confirm(`Tag ${previewIds.size} question(s) for practice? Existing practice tags for this chapter will be replaced.`)) return;
    setBusy(true); setMsg('');
    try {
      await lms(`/chapters/${chapterId}/questions/practice`, { method: 'POST', body: JSON.stringify({ questionIds: [...previewIds] }) });
      setMsg(`✓ Practice set published — ${previewIds.size} questions tagged.`);
      onPublished();
    } catch (e: any) { setMsg(e.message); }
    finally { setBusy(false); }
  };

  const togglePreview = (id: string) => setPreviewIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div style={{ padding: 4 }}>
      <div style={{ marginBottom: 20, padding: '12px 16px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>{current.length}</span>
        <span style={{ fontSize: 14, color: '#15803d' }}>questions currently tagged for practice</span>
        {current.length > 0 && (
          <button style={{ marginLeft: 'auto', fontSize: 12, padding: '3px 10px', borderRadius: 4, border: '1px solid #86efac', background: '#fff', color: '#16a34a', cursor: 'pointer' }}
            onClick={() => { setPreviewIds(new Set(current.map((q: any) => q.id))); setMode('preview'); }}>
            View / Edit current set
          </button>
        )}
      </div>
      {msg && <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 6, fontSize: 13, background: msg.startsWith('✓') ? '#f0fdf4' : '#fef2f2', color: msg.startsWith('✓') ? '#16a34a' : '#dc2626' }}>{msg}</div>}
      {mode === 'config' ? (
        <>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#1e293b' }}>Auto-Select Criteria</h3>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#475569' }}>Question type</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {([['both', 'Both'], ['type1', 'Type 1'], ['type2', 'Type 2']] as const).map(([v, label]) => (
                  <button key={v} onClick={() => setTypeFilter(v)}
                    style={{ padding: '4px 12px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${typeFilter === v ? '#1a56db' : '#e2e8f0'}`, background: typeFilter === v ? '#eff6ff' : '#fff', color: typeFilter === v ? '#1a56db' : '#64748b' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#475569' }}>Include difficulty</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['easy', 'medium', 'hard', 'competency'] as const).map(d => (
                  <label key={d} style={{ display: 'flex', gap: 5, alignItems: 'center', cursor: 'pointer', padding: '4px 10px', borderRadius: 4, border: `1px solid ${selDiff.includes(d) ? DIFF_COLORS[d] : '#e2e8f0'}`, background: selDiff.includes(d) ? DIFF_COLORS[d] + '15' : '#fff', fontSize: 13 }}>
                    <input type="checkbox" checked={selDiff.includes(d)} onChange={e => setSelDiff(prev => e.target.checked ? [...prev, d] : prev.filter(x => x !== d))} />
                    <span style={{ color: selDiff.includes(d) ? DIFF_COLORS[d] : '#64748b', fontWeight: 600, textTransform: 'capitalize' }}>{d}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#475569' }}>Questions per pattern</div>
              <input type="number" min={1} max={10} value={perPat}
                onChange={e => setPerPat(Math.max(1, Number(e.target.value)))}
                style={{ width: 64, border: '1px solid #e2e8f0', borderRadius: 6, padding: '5px 8px', fontSize: 14 }} />
            </div>
          </div>
          <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13, color: '#64748b' }}>
            <strong>{patterns.length}</strong> unique patterns · <strong>{approved.length}</strong> eligible {typeFilter === 'both' ? '' : typeFilter + ' '}questions.
            {selDiff.length > 0 && <span> Will pick up to <strong>{perPat}</strong> {selDiff.join('/')} question(s) per pattern.</span>}
          </div>
          <button disabled={selDiff.length === 0 || approved.length === 0}
            style={{ padding: '8px 20px', borderRadius: 8, border: 0, background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: selDiff.length === 0 ? 0.5 : 1 }}
            onClick={autoSelect}>
            Preview Auto-Selection →
          </button>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#1e293b' }}>Preview — {previewIds.size} selected</h3>
            <button style={{ fontSize: 12, padding: '3px 10px', borderRadius: 4, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', color: '#64748b' }}
              onClick={() => setMode('config')}>← Back to criteria</button>
            <button disabled={busy}
              style={{ marginLeft: 'auto', padding: '8px 20px', borderRadius: 8, border: 0, background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
              onClick={publish}>
              {busy ? 'Publishing…' : `Publish Practice Set (${previewIds.size})`}
            </button>
          </div>
          {previewIds.size === 0 && <div style={{ color: '#94a3b8', padding: '24px 0', textAlign: 'center' }}>No questions selected — go back and adjust criteria.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {approved.map((q, i) => {
              const isIn = previewIds.has(q.id);
              const topic = topics.find((t: any) => t.id === q.topicId);
              const color = TYPE_COLORS[q.type] || '#64748b';
              const dc = DIFF_COLORS[q.difficulty] || '#64748b';
              return (
                <div key={q.id}
                  style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 14px', borderRadius: 8, border: `1px solid ${isIn ? '#86efac' : '#e2e8f0'}`, background: isIn ? '#f0fdf4' : '#fff', cursor: 'pointer' }}
                  onClick={() => togglePreview(q.id)}>
                  <input type="checkbox" checked={isIn} readOnly style={{ width: 15, height: 15, marginTop: 2, accentColor: '#16a34a' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, background: color + '22', color, padding: '1px 7px', borderRadius: 4 }}>{TYPE_LABELS[q.type] || q.type}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: dc, textTransform: 'capitalize' }}>{q.difficulty}</span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{q.marks}m</span>
                      <span style={{ fontSize: 10, color: q.status === 'approved' ? '#16a34a' : '#d97706', fontWeight: 600, textTransform: 'capitalize' }}>{q.status}</span>
                      {q.patternId && <span style={{ fontSize: 11, color: '#94a3b8' }}>📌 {q.patternId}</span>}
                      {topic && <span style={{ fontSize: 11, color: '#94a3b8' }}>{topic.title}</span>}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {i + 1}. {q.question || <em style={{ color: '#94a3b8' }}>No text</em>}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}


export function LmsQuestionBank({
  chapterId, chapterTitle, subjectName, subjectGrade, subjectBoard, onBack, role, cykMode,
}: {
  chapterId: string;
  chapterTitle: string;
  subjectName: string;
  subjectGrade: string;
  subjectBoard: string;
  onBack: () => void;
  role: string;
  cykMode?: boolean;
}) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState<'all' | 'type1' | 'type2' | 'practice' | 'stats' | 'patterns'>('all');
  const [statsKey, setStatsKey] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [mode, setMode] = useState<'list' | 'preview'>('list');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = async () => {
    const [qs, ts] = await Promise.all([
      lms<any[]>(`/chapters/${chapterId}/questions`),
      lms<any[]>(`/chapters/${chapterId}/topics`),
    ]);
    setQuestions(qs);
    setTopics(ts.map((t: any) => ({ id: t.id, title: t.title, subtopics: [] })));
  };

  useEffect(() => {
    load().catch((e: any) => setMsg(e.message));
  }, [chapterId]);

  const saveEdit = async (q: any) => {
    setBusy(true);
    setMsg('');
    try {
      if (q._isNew) {
        await lms<any>(`/chapters/${chapterId}/questions`, { method: 'POST', body: JSON.stringify(q) });
      } else {
        await lms<any>(`/questions/${encodeURIComponent(q.id)}`, { method: 'PATCH', body: JSON.stringify(q) });
      }
      setEditing(null);
      await load();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (q: any) => {
    if (q._isNew) { setEditing(null); return; }
    if (!window.confirm(`Delete this question permanently?`)) return;
    setBusy(true);
    try {
      await lms(`/questions/${encodeURIComponent(q.id)}`, { method: 'DELETE' });
      setEditing(null);
      await load();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteSelected = async () => {
    if (!selected.size) return;
    if (!window.confirm(`Permanently delete ${selected.size} selected question(s)?`)) return;
    setBusy(true); setMsg('');
    try {
      await Promise.all([...selected].map(id => lms(`/questions/${encodeURIComponent(id)}`, { method: 'DELETE' })));
      setSelected(new Set());
      await load();
    } catch (e: any) { setMsg(e.message); }
    finally { setBusy(false); }
  };

  const deleteAll = async () => {
    if (!shown.length) return;
    if (!window.confirm(`Permanently delete ALL ${shown.length} question(s) in this view? This cannot be undone.`)) return;
    setBusy(true); setMsg('');
    try {
      if (tab === 'all') {
        await lms(`/chapters/${chapterId}/questions`, { method: 'DELETE' });
      } else {
        await Promise.all(shown.map((q: any) => lms(`/questions/${encodeURIComponent(q.id)}`, { method: 'DELETE' })));
      }
      setSelected(new Set());
      await load();
    } catch (e: any) { setMsg(e.message); }
    finally { setBusy(false); }
  };

  const toggleSelect = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleSelectAll = (check: boolean) =>
    setSelected(check ? new Set(shown.map((q: any) => q.id)) : new Set());

  const canEdit = ['admin', 'teacher'].includes(role);

  // In CYK mode show only questions tagged with 'cyk'; otherwise show all
  const displayQuestions = cykMode
    ? questions.filter(q => (q.usage || []).includes('cyk'))
    : questions;
  const shown = (tab === 'all' || tab === 'stats') ? displayQuestions : displayQuestions.filter((q) => q.type === tab);
  const type1Count = displayQuestions.filter((q) => q.type === 'type1').length;
  const type2Count = displayQuestions.filter((q) => q.type === 'type2').length;

  return (
    <div className="sb-view" style={{ maxWidth: 900 }}>
      {editing && (
        <QuestionDetailEditor
          question={editing}
          topics={topics}
          busy={busy}
          close={() => setEditing(null)}
          save={saveEdit}
          remove={() => remove(editing)}
        />
      )}

      {showImport && (
        <ImportJsonModal
          chapterId={chapterId}
          topics={topics}
          cykMode={cykMode || false}
          onClose={() => setShowImport(false)}
          onDone={() => { setShowImport(false); load(); }}
        />
      )}

      <div className="sb-breadcrumb">
        <button onClick={onBack}>Subjects</button>
        <span>›</span>
        <span>{subjectName}</span>
        <span>›</span>
        <button onClick={onBack}>{chapterTitle} — Topics</button>
        <span>›</span>
        <span>{cykMode ? 'CYK Questions' : 'Question Bank'}</span>
      </div>

      <div className="sb-toolbar">
        <div>
          <h1>{cykMode ? 'Check Your Knowledge — CYK Questions' : 'Question Bank'}</h1>
          <small style={{ color: '#64748b', fontSize: 12 }}>
            {subjectBoard} · Class {subjectGrade} · {chapterTitle}
            {cykMode && <span style={{ marginLeft: 8, background: '#fef3c7', color: '#92400e', padding: '1px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>CYK MODE</span>}
          </small>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button className="sb-btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setShowImport(true)}>
              ↑ Import JSON
            </button>
            <button className="sb-btn-primary" onClick={() => setEditing(newType1(cykMode || false))}>
              + Type 1 {cykMode ? '(CYK)' : '(MCQ)'}
            </button>
            {!cykMode && (
              <button className="sb-btn-primary" style={{ background: '#7c3aed' }} onClick={() => setEditing(newType2())}>
                + Type 2 (Guided)
              </button>
            )}
          </div>
        )}
      </div>

      {msg && <div className="sb-error">{msg}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['all', 'type1', 'type2'] as const).map((t) => (
            <button key={t} className={tab === t ? 'sb-btn-primary' : 'sb-btn-ghost'} style={{ padding: '4px 14px', fontSize: 12 }}
              onClick={() => { setTab(t); setSelected(new Set()); }}>
              {t === 'all' ? `All (${displayQuestions.length})` : t === 'type1' ? `Type 1 (${type1Count})` : `Type 2 (${type2Count})`}
            </button>
          ))}
          {!cykMode && canEdit && (
            <button className={tab === 'practice' ? 'sb-btn-primary' : 'sb-btn-ghost'}
              style={{ padding: '4px 14px', fontSize: 12, background: tab === 'practice' ? '#ea580c' : undefined, borderColor: tab !== 'practice' ? '#ea580c' : undefined, color: tab !== 'practice' ? '#ea580c' : undefined }}
              onClick={() => { setTab('practice'); setSelected(new Set()); }}>
              ✏ Practice
            </button>
          )}
          <button className={tab === 'stats' ? 'sb-btn-primary' : 'sb-btn-ghost'}
            style={{ padding: '4px 14px', fontSize: 12, background: tab === 'stats' ? '#0f766e' : undefined, borderColor: tab !== 'stats' ? '#0f766e' : undefined, color: tab !== 'stats' ? '#0f766e' : undefined }}
            onClick={() => { setTab('stats'); setSelected(new Set()); setStatsKey(k => k + 1); load().catch(() => {}); }}>
            ≡ Statistics
          </button>
          {!cykMode && (
            <button className={tab === 'patterns' ? 'sb-btn-primary' : 'sb-btn-ghost'}
              style={{ padding: '4px 14px', fontSize: 12, background: tab === 'patterns' ? '#7c3aed' : undefined, borderColor: tab !== 'patterns' ? '#7c3aed' : undefined, color: tab !== 'patterns' ? '#7c3aed' : undefined }}
              onClick={() => { setTab('patterns'); setSelected(new Set()); }}>
              ◈ Pattern Topics
            </button>
          )}
        </div>
        {tab !== 'stats' && tab !== 'practice' && tab !== 'patterns' && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
            <button className={mode === 'list' ? 'sb-btn-primary' : 'sb-btn-ghost'} style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setMode('list')}>☰ List</button>
            <button className={mode === 'preview' ? 'sb-btn-primary' : 'sb-btn-ghost'} style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setMode('preview')}>▶ Preview</button>
          </div>
        )}
      </div>

      {tab !== 'stats' && tab !== 'practice' && tab !== 'patterns' && shown.length === 0 && (
        <div className="sb-empty">
          <p>{cykMode ? 'No CYK questions yet.' : 'No questions yet.'}</p>
          {canEdit && (
            <p>
              {cykMode
                ? 'Import JSON or click + Type 1 (CYK) to add manually.'
                : <>Click <strong>+ Type 1</strong> for MCQ, <strong>+ Type 2</strong> for guided, or <strong>↑ Import JSON</strong> for bulk import.</>}
            </p>
          )}
        </div>
      )}

      {canEdit && tab !== 'stats' && tab !== 'practice' && tab !== 'patterns' && mode === 'list' && shown.length > 0 && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer', fontSize: 13, color: '#475569', userSelect: 'none' }}>
            <input type="checkbox"
              checked={selected.size === shown.length}
              onChange={e => toggleSelectAll(e.target.checked)}
              style={{ width: 15, height: 15, cursor: 'pointer' }}
            />
            Select all ({shown.length})
          </label>
          {selected.size > 0 && (
            <button disabled={busy} onClick={deleteSelected}
              style={{ padding: '4px 14px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
              Delete selected ({selected.size})
            </button>
          )}
          <button disabled={busy} onClick={deleteAll}
            style={{ marginLeft: 'auto', padding: '4px 14px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
            Delete all ({shown.length})
          </button>
        </div>
      )}

      {tab === 'stats' ? (
        <StatsView chapterId={chapterId} questions={questions} topics={topics} refreshKey={statsKey} />
      ) : tab === 'patterns' ? (
        <PatternTopicsPanel chapterId={chapterId} topics={topics} role={role} onSaved={load} />
      ) : tab === 'practice' ? (
        <PracticeConfig chapterId={chapterId} questions={displayQuestions} topics={topics} onPublished={load} />
      ) : mode === 'preview' ? (
        <div style={{ background: '#f3f6fb', padding: '8px 0' }}>
          {shown.length === 0 ? (
            <p style={{ padding: 24, color: '#94a3b8', textAlign: 'center' }}>No questions to preview.</p>
          ) : (
            shown.map((q: any, i: number) =>
              q.type === 'type2'
                ? <Type2Card key={q.id} q={q} index={i} topics={topics} />
                : <QuestionCard key={q.id} q={q} index={i} topics={topics} />
            )
          )}
        </div>
      ) : (
        <div className="sb-list">
          {shown.map((q, i) => {
            const topic = topics.find((t) => t.id === q.topicId);
            const color = TYPE_COLORS[q.type] || '#64748b';
            const isCyk = (q.usage || []).includes('cyk');
            const isSelected = selected.has(q.id);
            return (
              <div key={q.id} className="sb-row" style={{ cursor: canEdit ? 'pointer' : 'default', alignItems: 'flex-start', padding: '12px 16px', gap: 12, background: isSelected ? '#f0f7ff' : undefined, borderLeft: isSelected ? '3px solid #3b82f6' : undefined }}
                onClick={() => canEdit && setEditing(q)}>
                {canEdit && (
                  <input type="checkbox" checked={isSelected}
                    onClick={e => e.stopPropagation()}
                    onChange={e => { e.stopPropagation(); toggleSelect(q.id); }}
                    style={{ width: 15, height: 15, flexShrink: 0, marginTop: 2, cursor: 'pointer', accentColor: '#3b82f6' }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, background: color + '22', color, padding: '1px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
                    {TYPE_LABELS[q.type] || q.type}
                  </span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{q.format}</span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: q.status === 'approved' ? '#16a34a' : q.status === 'excluded' ? '#94a3b8' : '#d97706' }}>
                    {q.status}
                  </span>
                  {isCyk && <span style={{ fontSize: 11, fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: 4 }}>CYK</span>}
                  {topic && <span style={{ fontSize: 11, color: '#94a3b8' }}>— {topic.title}</span>}
                </div>
                <p style={{ margin: 0, fontSize: 14, color: '#1e293b' }}>
                  {i + 1}. {q.question || <em style={{ color: '#94a3b8' }}>No question text</em>}
                </p>
                {q.type === 'type1' && q.options?.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    {q.options.map((opt: string, oi: number) => (
                      <span key={oi} style={{ fontSize: 12, padding: '2px 10px', borderRadius: 4, background: opt === q.correctAnswer ? '#dcfce7' : '#f1f5f9', color: opt === q.correctAnswer ? '#16a34a' : '#475569', fontWeight: opt === q.correctAnswer ? 700 : 400, border: opt === q.correctAnswer ? '1px solid #86efac' : '1px solid #e2e8f0' }}>
                        {opt || <em style={{ opacity: 0.4 }}>empty</em>}
                      </span>
                    ))}
                  </div>
                )}
                {q.type === 'type2' && q.steps?.length > 0 && (
                  <small style={{ color: '#64748b', fontSize: 12 }}>
                    {q.steps.length} step{q.steps.length !== 1 ? 's' : ''}{' · '}total {q.marks} marks
                  </small>
                )}
              </div>
              {canEdit && <span className="sb-row-arrow">›</span>}
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
}

// ─── PatternTopicsPanel ──────────────────────────────────────────────────────

interface PatternRow {
  patternId: string;
  topicId: string | null;
  count: number;
  sample: string;
  aiSuggested?: boolean;
  dirty?: boolean;
}

function PatternTopicsPanel({ chapterId, topics, role, onSaved }: {
  chapterId: string;
  topics: { id: string; title: string }[];
  role: string;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<PatternRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [aiWorking, setAiWorking] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok');
  const fileRef = useRef<HTMLInputElement>(null);
  const canEdit = role === 'admin' || role === 'teacher';

  const notice = (text: string, type: 'ok' | 'err' = 'ok') => { setMsg(text); setMsgType(type); };

  const load = async () => {
    setBusy(true);
    try {
      const data = await lms<PatternRow[]>(`/chapters/${chapterId}/patterns`);
      setRows(data.map(r => ({ ...r, dirty: false, aiSuggested: false })));
    } catch (e: any) { notice(e.message, 'err'); }
    finally { setBusy(false); }
  };

  useEffect(() => { load(); }, [chapterId]);

  const setTopic = (patternId: string, topicId: string | null) =>
    setRows(prev => prev.map(r => r.patternId === patternId ? { ...r, topicId, dirty: true, aiSuggested: false } : r));

  const saveAll = async () => {
    const dirty = rows.filter(r => r.dirty);
    if (!dirty.length) { notice('Nothing changed.'); return; }
    setBusy(true); setMsg('');
    try {
      const res = await lms<{ updated: number }>(`/chapters/${chapterId}/patterns/assign`, {
        method: 'PATCH',
        body: JSON.stringify(dirty.map(r => ({ patternId: r.patternId, topicId: r.topicId || null }))),
      });
      setRows(prev => prev.map(r => ({ ...r, dirty: false })));
      notice(`Saved — ${res.updated} question${res.updated !== 1 ? 's' : ''} updated.`);
      onSaved();
    } catch (e: any) { notice(e.message, 'err'); }
    finally { setBusy(false); }
  };

  const aiSuggest = async () => {
    setAiWorking(true); setMsg('');
    try {
      const res = await lms<{ assignments: { patternId: string; topicId: string }[] }>(`/chapters/${chapterId}/patterns/ai-suggest`, { method: 'POST' });
      const map = new Map(res.assignments.map((a: any) => [a.patternId, a.topicId]));
      setRows(prev => prev.map(r => {
        const tid = map.get(r.patternId);
        if (!tid) return r;
        const valid = topics.find(t => t.id === tid);
        return valid ? { ...r, topicId: tid, aiSuggested: true, dirty: true } : r;
      }));
      notice(`AI suggested ${map.size} assignment${map.size !== 1 ? 's' : ''}. Review and save.`);
    } catch (e: any) { notice(e.message, 'err'); }
    finally { setAiWorking(false); }
  };

  const downloadTemplate = () => {
    const header = 'pattern_id,topic_title\n';
    const rows_csv = rows.map(r => {
      const t = topics.find(t => t.id === r.topicId);
      return `"${r.patternId}","${t?.title || ''}"`;
    }).join('\n');
    const blob = new Blob([header + rows_csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'pattern_topic_assignment.csv'; a.click();
  };

  const uploadExcel = async (file: File) => {
    setMsg('');
    try {
      let parsed: { patternId: string; topicTitle: string }[] = [];
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        const lines = text.split('\n').filter(Boolean);
        const header = lines[0].toLowerCase().split(',').map((s: string) => s.trim().replace(/"/g, ''));
        const pIdx = header.findIndex((h: string) => h.includes('pattern'));
        const tIdx = header.findIndex((h: string) => h.includes('topic'));
        if (pIdx < 0 || tIdx < 0) { notice('CSV must have columns: pattern_id, topic_title', 'err'); return; }
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((s: string) => s.trim().replace(/"/g, ''));
          if (cols[pIdx]) parsed.push({ patternId: cols[pIdx], topicTitle: cols[tIdx] || '' });
        }
      } else {
        const xlsRows = (await readXlsxFile(file)) as unknown as any[][];
        if (!xlsRows.length) { notice('Empty file', 'err'); return; }
        const headerRow = xlsRows[0].map((c: any) => String(c || '').toLowerCase());
        const pIdx = headerRow.findIndex((h: string) => h.includes('pattern'));
        const tIdx = headerRow.findIndex((h: string) => h.includes('topic'));
        if (pIdx < 0 || tIdx < 0) { notice('Sheet must have columns: pattern_id, topic_title', 'err'); return; }
        for (let i = 1; i < xlsRows.length; i++) {
          const pid = String(xlsRows[i][pIdx] || '').trim();
          if (pid) parsed.push({ patternId: pid, topicTitle: String(xlsRows[i][tIdx] || '').trim() });
        }
      }
      const topicByTitle = new Map(topics.map(t => [t.title.toLowerCase().trim(), t.id]));
      let matched = 0;
      setRows(prev => prev.map(r => {
        const entry = parsed.find(p => p.patternId === r.patternId);
        if (!entry) return r;
        const tid = topicByTitle.get(entry.topicTitle.toLowerCase().trim()) || null;
        matched++;
        return { ...r, topicId: tid, dirty: true };
      }));
      notice(`Imported ${parsed.length} rows, matched ${matched} pattern${matched !== 1 ? 's' : ''}. Review and save.`);
    } catch (e: any) { notice(e.message, 'err'); }
  };

  const dirtyCount = rows.filter(r => r.dirty).length;
  const assignedCount = rows.filter(r => r.topicId).length;

  return (
    <div style={{ padding: '0 0 32px' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', flex: 1 }}>
          {rows.length} pattern{rows.length !== 1 ? 's' : ''} · {assignedCount} assigned · {rows.length - assignedCount} unassigned
        </span>
        {canEdit && (
          <>
            <button disabled={aiWorking || busy}
              style={{ padding: '5px 14px', borderRadius: 6, border: '1.5px solid #7c3aed', background: '#f5f3ff', color: '#7c3aed', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
              onClick={aiSuggest}>
              {aiWorking ? '⏳ AI thinking…' : '✦ AI Suggest'}
            </button>
            <button disabled={busy}
              style={{ padding: '5px 14px', borderRadius: 6, border: '1.5px solid #0ea5e9', background: '#f0f9ff', color: '#0369a1', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
              onClick={() => fileRef.current?.click()}>
              ↑ Upload Excel / CSV
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadExcel(f); e.target.value = ''; }} />
            <button disabled={busy}
              style={{ padding: '5px 14px', borderRadius: 6, border: '1.5px solid #64748b', background: '#f8fafc', color: '#475569', fontSize: 12, cursor: 'pointer' }}
              onClick={downloadTemplate}>
              ↓ Template
            </button>
            <button disabled={busy || !dirtyCount} onClick={saveAll}
              style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: dirtyCount ? '#7c3aed' : '#e2e8f0', color: dirtyCount ? '#fff' : '#94a3b8', fontSize: 12, cursor: dirtyCount ? 'pointer' : 'default', fontWeight: 700 }}>
              Save {dirtyCount ? `(${dirtyCount} changed)` : 'All'}
            </button>
          </>
        )}
      </div>

      {msg && (
        <div style={{ marginBottom: 12, padding: '8px 14px', borderRadius: 6, background: msgType === 'err' ? '#fef2f2' : '#f0fdf4', color: msgType === 'err' ? '#dc2626' : '#16a34a', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
          <span>{msg}</span>
          <button onClick={() => setMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontWeight: 700 }}>×</button>
        </div>
      )}

      <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12, marginTop: 0 }}>
        Assign a topic to each pattern. Saving updates every question with that pattern ID.
        Use <strong>✦ AI Suggest</strong> to auto-fill, <strong>↑ Upload</strong> for a spreadsheet (columns: <code>pattern_id</code>, <code>topic_title</code>), or edit each row manually.
      </p>

      {rows.length === 0 && !busy && (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: 48 }}>
          No patterns found. Add questions with Pattern IDs first.
        </div>
      )}
      {busy && rows.length === 0 && (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: 48 }}>Loading patterns…</div>
      )}

      {rows.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: 600, width: '26%' }}>Pattern ID</th>
              <th style={{ textAlign: 'center', padding: '8px 12px', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: 600, width: '6%' }}>Qs</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: 600, width: '30%' }}>Assigned Topic</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: 600 }}>Sample Question</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.patternId} style={{ background: r.dirty ? '#fefce8' : i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#1e293b', verticalAlign: 'middle' }}>
                  {r.patternId}
                  {r.aiSuggested && <span title="AI suggested" style={{ marginLeft: 6, fontSize: 10, background: '#f5f3ff', color: '#7c3aed', padding: '1px 5px', borderRadius: 3, fontFamily: 'sans-serif' }}>AI</span>}
                  {r.dirty && !r.aiSuggested && <span style={{ marginLeft: 6, fontSize: 10, background: '#fef9c3', color: '#854d0e', padding: '1px 5px', borderRadius: 3, fontFamily: 'sans-serif' }}>edited</span>}
                </td>
                <td style={{ padding: '9px 12px', textAlign: 'center', color: '#64748b', verticalAlign: 'middle' }}>{r.count}</td>
                <td style={{ padding: '9px 12px', verticalAlign: 'middle' }}>
                  {canEdit ? (
                    <select value={r.topicId || ''}
                      onChange={e => setTopic(r.patternId, e.target.value || null)}
                      style={{ width: '100%', padding: '4px 8px', borderRadius: 5, border: `1.5px solid ${r.topicId ? '#a3e635' : '#e2e8f0'}`, fontSize: 12, background: r.topicId ? '#f7fee7' : '#fff', color: '#1e293b' }}>
                      <option value="">— unassigned —</option>
                      {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </select>
                  ) : (
                    <span style={{ color: r.topicId ? '#1e293b' : '#94a3b8', fontStyle: r.topicId ? 'normal' : 'italic' }}>
                      {topics.find(t => t.id === r.topicId)?.title || '— unassigned —'}
                    </span>
                  )}
                </td>
                <td style={{ padding: '9px 12px', color: '#64748b', fontSize: 12, verticalAlign: 'middle' }}>
                  <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
                    {r.sample || <em>no text</em>}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
