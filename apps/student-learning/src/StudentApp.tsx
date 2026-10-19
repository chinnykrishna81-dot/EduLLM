import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import './student-app.css';
import { ChapterLearning } from './LearningExperience';

// ── Types ─────────────────────────────────────────────────────────────────────

interface User     { id: string; email: string; displayName: string; role: string; }
interface Subject  { id: string; name: string; grade: string; board: string; }
interface Chapter  { id: string; subjectId: string; title: string; position: number; libraryChapterId?: string; }
interface Topic    { id: string; chapterId: string; title: string; htmlContent: string; position: number; status: string; }
interface Course   { id: string; title: string; description: string; price: number; listPrice?: number; discountPercent?: number; currency: string; status: string; subjects: Subject[]; searchTerms?: string[]; }
interface QuestionStep { id: string; prompt: string; options: string[]; answer: string; marks: number; explanation: string; }
interface Question { id: string; type: string; format: string; question: string; options: string[]; correctAnswer: string; explanation: string; finalAnswer?: string; marks: number; usage?: string[]; steps?: QuestionStep[]; }

// ── API helper ────────────────────────────────────────────────────────────────

const API = 'http://localhost:3001/api';
const STORAGE_KEY = 'edullm_student_token';

async function api<T>(path: string, init: RequestInit = {}, authed = true): Promise<T> {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (authed) { const t = localStorage.getItem(STORAGE_KEY); if (t) headers.set('Authorization', `Bearer ${t}`); }
  const res = await fetch(`${API}${path}`, { ...init, headers });
  const text = await res.text();
  const data = text.trim() ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || 'Request failed');
  return data;
}

// ── Auth modal ────────────────────────────────────────────────────────────────

function AuthModal({ mode, onDone, onClose }: { mode: 'login' | 'register'; onDone: (user: User, token: string) => void; onClose: () => void }) {
  const [tab, setTab]         = useState<'login'|'register'>(mode);
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr]         = useState('');
  const [busy, setBusy]       = useState(false);

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      if (tab === 'login') {
        const res = await api<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ identifier: email, password }) }, false);
        onDone(res.user, res.token);
      } else {
        const user = await api<User>('/auth/register', { method: 'POST', body: JSON.stringify({ email, name, password, privacyConsent: true, privacyConsentVersion: 'DPDP-2026-01' }) }, false);
        const res = await api<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ identifier: email, password }) }, false);
        onDone(res.user, res.token);
      }
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="sa-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sa-modal">
        <div className="sa-modal-tabs">
          <button className={tab === 'login' ? 'active' : ''} onClick={() => setTab('login')}>Sign In</button>
          <button className={tab === 'register' ? 'active' : ''} onClick={() => setTab('register')}>Register</button>
        </div>
        <div className="sa-social-login"><button type="button" onClick={()=>window.alert('Google sign-in needs OAuth credentials in the server configuration.')}>G&nbsp; Continue with Google</button><button type="button" onClick={()=>window.alert('Facebook sign-in needs OAuth credentials in the server configuration.')}>f&nbsp; Continue with Facebook</button></div><div className="sa-or"><span>or use email</span></div>
        {tab === 'register' && (
          <label className="sa-field">
            <span>Full Name</span>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </label>
        )}
        <label className="sa-field">
          <span>Email</span>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
        </label>
        <label className="sa-field">
          <span>Password</span>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" onKeyDown={e => e.key === 'Enter' && submit()} />
        </label>
        {err && <div className="sa-modal-error">{err}</div>}
        <button className="sa-btn-primary" disabled={busy} onClick={submit}>
          {busy ? 'Please wait…' : tab === 'login' ? 'Sign In' : 'Create Account'}
        </button>
      </div>
    </div>
  );
}

// ── Subscription modal ────────────────────────────────────────────────────────

function SubscribeModal({ course, onDone, onClose }: { course: Course; onDone: () => void; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState('');

  const confirm = async () => {
    setBusy(true); setErr('');
    try {
      await api(`/catalogue/courses/${course.id}/enrol`, { method: 'POST' });
      onDone();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="sa-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sa-modal">
        <h2 style={{ marginBottom: 8 }}>Subscribe to Course</h2>
        <p style={{ fontSize: 15, marginBottom: 16 }}><strong>{course.title}</strong></p>
        <div className="sa-price-block">
          <span className="sa-price">₹{course.price}</span>
          <span style={{ fontSize: 13, color: '#64748b' }}>one-time access</span>
        </div>
        {err && <div className="sa-modal-error">{err}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="sa-btn-primary" disabled={busy} onClick={confirm}>
            {busy ? 'Processing…' : `Pay ₹${course.price} & Subscribe`}
          </button>
          <button className="sa-btn-ghost" onClick={onClose}>Cancel</button>
        </div>
        <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 10 }}>* Mock payment — no actual charge</p>
      </div>
    </div>
  );
}

// ── Course catalog ────────────────────────────────────────────────────────────

function CourseCatalog({ user, subscribed, onSubscribed, onOpen, onAuthNeeded }: {
  user: User | null;
  subscribed: Set<string>;
  onSubscribed: (courseId: string) => void;
  onOpen: (c: Course) => void;
  onAuthNeeded: () => void;
}) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState('');
  const [subCourse, setSubCourse] = useState<Course | null>(null);
  const [search,setSearch] = useState('');
  const [board,setBoard] = useState('');
  const [grade,setGrade] = useState('');

  useEffect(() => {
    api<Course[]>('/catalogue/courses', {}, false)
      .then(setCourses)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  const boards=[...new Set(courses.flatMap(c=>c.subjects.map(s=>s.board)).filter(Boolean))];
  const grades=[...new Set(courses.flatMap(c=>c.subjects.map(s=>s.grade)).filter(Boolean))];
  const visibleCourses=courses.filter(c=>{const hay=[c.title,c.description,...(c.searchTerms||[]),...c.subjects.flatMap(s=>[s.name,s.board,s.grade])].join(' ').toLowerCase();return (!search||hay.includes(search.toLowerCase()))&&(!board||c.subjects.some(s=>s.board===board))&&(!grade||c.subjects.some(s=>s.grade===grade));});

  return (
    <div className="sa-catalog">
      <section className="sa-landing-hero"><div><span className="sa-kicker">EDULLM · SMART EXAM PREPARATION</span><h1>Learn with structure.<br/><em>Score with confidence.</em></h1><p>One focused learning system for concepts, practice, revision and exam readiness—built around how students actually improve.</p><button className="sa-landing-primary" onClick={()=>document.getElementById('course-catalog')?.scrollIntoView({behavior:'smooth'})}>Explore courses ↓</button></div><div className="sa-score-orbit"><strong>90%</strong><span>mastery target</span></div></section>
      <section className="sa-feature-strip"><article><b>01 · UNDERSTAND</b><h3>Clear concept journeys</h3><p>Short explanations, visual learning cards and worked examples turn difficult chapters into manageable steps.</p></article><article><b>02 · PRACTISE</b><h3>Pattern-led questions</h3><p>Build accuracy with guided practice that reveals the method, not just the final answer.</p></article><article><b>03 · IMPROVE</b><h3>Feedback that compounds</h3><p>Cycle tests and mastery signals show what to revise next, so every study session has a purpose.</p></article></section>
      <section className="sa-score-banner"><div><span className="sa-kicker">THE EDULLM LEARNING LOOP</span><h2>From “I know this” to “I can score this.”</h2></div><div className="sa-loop"><span>Learn</span><b>→</b><span>Recall</span><b>→</b><span>Apply</span><b>→</b><span>Master</span></div></section>
      <div id="course-catalog" className="sa-section-header">
        <h2>Available Courses</h2>
        <p>Subscribe to start learning</p>
      </div>
      <div className="sa-search-panel"><input aria-label="Search courses" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search course, subject, board or class…"/><select value={board} onChange={e=>setBoard(e.target.value)}><option value="">All boards</option>{boards.map(x=><option key={x}>{x}</option>)}</select><select value={grade} onChange={e=>setGrade(e.target.value)}><option value="">All classes</option>{grades.map(x=><option key={x}>{x}</option>)}</select></div>
      {err && <div className="sa-error">{err}</div>}
      {loading && <div className="sa-loading">Loading courses…</div>}
      {!loading && courses.length === 0 && <div className="sa-empty">No courses published yet. Check back soon.</div>}
      {!loading && courses.length > 0 && visibleCourses.length === 0 && <div className="sa-empty">No matching courses found. Try another search.</div>}
      <div className="sa-course-grid">
        {visibleCourses.map(c => (
          <div key={c.id} className="sa-course-card" onClick={() => subscribed.has(c.id) && onOpen(c)}>
            <div className="sa-course-card-body">
              <h3>{c.title}</h3>
              {c.description && <p>{c.description}</p>}
              <div className="sa-subject-chips">
                {c.subjects.map(s => <span key={s.id} className="sa-chip">{s.name} · {s.grade}</span>)}
              </div>
            </div>
            <div className="sa-course-card-footer">
              <span className="sa-price">₹{c.price} {c.discountPercent ? <del className="sa-old-price">₹{c.listPrice}</del> : null}</span>
              {subscribed.has(c.id)
                ? <button className="sa-btn-enrolled" onClick={e => { e.stopPropagation(); onOpen(c); }}>Continue →</button>
                : <button className="sa-btn-primary" onClick={e => {
                    e.stopPropagation();
                    if (!user) { onAuthNeeded(); return; }
                    setSubCourse(c);
                  }}>Subscribe</button>
              }
            </div>
          </div>
        ))}
      </div>
      {subCourse && (
        <SubscribeModal
          course={subCourse}
          onDone={() => { onSubscribed(subCourse.id); setSubCourse(null); }}
          onClose={() => setSubCourse(null)}
        />
      )}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ user, onOpen }: { user: User; onOpen: (c: Course) => void }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState('');

  useEffect(() => {
      api<Course[]>('/student/enrolments')
      .then(setCourses)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="sa-catalog">
      <div className="sa-section-header">
        <h2>My Courses</h2>
        <p>Welcome back, {user.displayName}!</p>
      </div>
      {err && <div className="sa-error">{err}</div>}
      {loading && <div className="sa-loading">Loading your courses…</div>}
      {!loading && courses.length === 0 && <div className="sa-empty">You haven't subscribed to any courses yet.</div>}
      <div className="sa-course-grid">
        {courses.map(c => (
          <div key={c.id} className="sa-course-card" onClick={() => onOpen(c)}>
            <div className="sa-course-card-body">
              <h3>{c.title}</h3>
              {c.description && <p>{c.description}</p>}
              <div className="sa-subject-chips">
                {c.subjects.map(s => <span key={s.id} className="sa-chip">{s.name} · {s.grade}</span>)}
              </div>
            </div>
            <div className="sa-course-card-footer">
              <button className="sa-btn-enrolled" onClick={e => { e.stopPropagation(); onOpen(c); }}>Continue →</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Practice helpers ──────────────────────────────────────────────────────────

function jumble(arr: string[], seed: string): string[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    let hash = 0;
    for (let k = 0; k < seed.length; k++) hash = (hash * 31 + seed.charCodeAt(k)) & 0xffffffff;
    const j = Math.abs(hash + i * 2654435769) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeAns(v: string) { return String(v || '').trim().toLowerCase(); }

// ── Type 1 practice card ──────────────────────────────────────────────────────

function PracticeType1Student({ question }: { question: Question }) {
  const [choice, setChoice] = useState('');
  const [revealed, setRevealed] = useState(false);
  const opts = useMemo(() => jumble(question.options || [], question.id), [question.id, question.options]);
  const isText = question.format === 'fill_blank' || question.format === 'one_line' || opts.length === 0;
  const isOk = normalizeAns(choice) === normalizeAns(question.correctAnswer);
  const retry = () => { setChoice(''); setRevealed(false); };

  return (
    <div>
      <p className="pv-qtext">{question.question}</p>
      {isText ? (
        <label className="pv-fill">
          <span>Your answer</span>
          <input type="text" value={choice} disabled={revealed} placeholder="Type your answer" autoComplete="off"
            onChange={e => setChoice(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && choice.trim() && !revealed && setRevealed(true)} />
        </label>
      ) : (
        <div className="pv-opts">
          {opts.map(opt => (
            <label key={opt}
              className={`pv-opt${choice === opt ? ' chosen' : ''}${revealed && opt === question.correctAnswer ? ' correct' : revealed && choice === opt && opt !== question.correctAnswer ? ' wrong' : ''}`}>
              <input type="radio" name={question.id} checked={choice === opt} disabled={revealed} onChange={() => setChoice(opt)} />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )}
      {!revealed
        ? <button className="pv-check-btn" disabled={!choice.trim()} onClick={() => setRevealed(true)}>Check Answer</button>
        : (
          <div className={`pv-feedback ${isOk ? 'correct' : 'wrong'}`}>
            <strong>{isOk ? '✓ Correct!' : '✕ Not quite'}</strong>
            {!isOk && <p>Correct answer: <strong>{question.correctAnswer}</strong></p>}
            {question.explanation && <div dangerouslySetInnerHTML={{ __html: question.explanation }} />}
            <button className="pv-retry" onClick={retry}>↺ Try again</button>
          </div>
        )
      }
    </div>
  );
}

// ── Type 2 practice card (step-by-step guided) ───────────────────────────────

function PracticeType2Student({ question }: { question: Question }) {
  const steps = question.steps || [];
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const choose = (stepId: string, opt: string) => {
    if (!submitted) setAnswers(a => ({ ...a, [stepId]: opt }));
  };
  const isCorrect = (s: QuestionStep) => answers[s.id] === s.answer;
  const complete = steps.every(s => answers[s.id]);
  const retry = () => { setAnswers({}); setSubmitted(false); };

  return (
    <div>
      <p className="pv-qtext">{question.question}</p>
      <p className="pv-t2-hint">Choose one answer for each step to build the complete answer.</p>
      {steps.map((step, i) => (
        <div key={step.id} className="pv-step">
          <div className="pv-step-header"><b>{i + 1}.</b><span>{step.prompt}</span></div>
          <div className="pv-step-choices">
            {(step.options || []).map(opt => (
              <button key={opt} disabled={submitted}
                className={`pv-step-choice${answers[step.id] === opt ? ' selected' : ''}${submitted && opt === step.answer ? ' correct' : submitted && answers[step.id] === opt && opt !== step.answer ? ' wrong' : ''}`}
                onClick={() => choose(step.id, opt)}>{opt}</button>
            ))}
          </div>
          {submitted && (
            <div className={`pv-step-fb ${isCorrect(step) ? 'correct' : 'wrong'}`}>
              {isCorrect(step) ? '✓ Correct' : `✕ Answer: ${step.answer}`}
              {step.explanation && <p>{step.explanation}</p>}
            </div>
          )}
        </div>
      ))}
      <div className="pv-answer-box">
        <div className="pv-answer-box-hd">
          <b>Your constructed answer</b>
          <span>{Object.keys(answers).length}/{steps.length} steps</span>
        </div>
        {steps.map((step, i) => (
          <div key={step.id}
            className={`pv-answer-line${submitted ? (isCorrect(step) ? ' correct' : ' wrong') : ''}`}>
            <strong>{i + 1}</strong>
            <span>{answers[step.id] || '—'}</span>
            {submitted && <b>{isCorrect(step) ? '✓' : '✕'}</b>}
          </div>
        ))}
      </div>
      {!submitted
        ? <button className="pv-submit-btn" disabled={!complete} onClick={() => setSubmitted(true)}>Submit complete answer</button>
        : <>
            {question.finalAnswer && (
              <div className="pv-t2-expl">
                <b>Complete explanation</b>
                <div dangerouslySetInnerHTML={{ __html: question.finalAnswer }} />
              </div>
            )}
            <button className="pv-retry" onClick={retry}>↺ Try again</button>
          </>
      }
    </div>
  );
}

// ── Practice view (used in ChapterDetail sidebar) ─────────────────────────────

function PracticeView({ questions }: { questions: Question[] }) {
  const [idx, setIdx] = useState(0);
  const q = questions[idx];

  return (
    <div className="pv-shell">
      <div className="pv-header">
        <small>CHAPTER PRACTICE</small>
        <h1>Practice Questions</h1>
        <p>Practice only · no marks · immediate feedback</p>
      </div>
      <div className="pv-dots">
        {questions.map((_, i) => (
          <button key={i} className={`pv-dot${i === idx ? ' active' : ''}`} onClick={() => setIdx(i)}>{i + 1}</button>
        ))}
      </div>
      {q && (
        <div className="pv-card">
          <div className="pv-qmeta">
            <span>Question {idx + 1} of {questions.length}</span>
            <span>{q.type === 'type2' ? 'GUIDED TYPE 2' : (q.format || 'MCQ').replace('_', ' ').toUpperCase()}</span>
            <span>{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
          </div>
          {q.type === 'type2' && (q.steps?.length ?? 0) > 0
            ? <PracticeType2Student question={q} key={q.id} />
            : <PracticeType1Student question={q} key={q.id} />
          }
        </div>
      )}
      <div className="pv-nav">
        <button disabled={idx === 0} onClick={() => setIdx(i => i - 1)}>← Previous</button>
        <button disabled={idx === questions.length - 1} onClick={() => setIdx(i => i + 1)}>Next →</button>
      </div>
    </div>
  );
}

// ── Chapter detail — sidebar + content layout ─────────────────────────────────

type ChView = { kind: 'topic'; idx: number } | { kind: 'practice' } | { kind: 'cyt' };

function ChapterDetail({ chapter, subject, onBack }: { chapter: Chapter; subject: Subject; onBack: () => void }) {
  const [topics, setTopics]         = useState<Topic[]>([]);
  const [practiceQs, setPracticeQs] = useState<Question[]>([]);
  const [view, setView]             = useState<ChView>({ kind: 'topic', idx: 0 });
  const [completed, setCompleted]   = useState<Set<string>>(new Set());
  const [loading, setLoading]       = useState(true);
  const [err, setErr]               = useState('');
  const mainRef                     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api<Topic[]>(`/question-bank/chapters/${chapter.id}/topics`),
      api<Question[]>(`/question-bank/chapters/${chapter.id}/practice`),
    ])
      .then(([ts, qs]) => {
        setTopics(ts);
        setView({ kind: 'topic', idx: 0 });
        setPracticeQs(qs);
      })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [chapter.id]);

  const hasPractice = practiceQs.length > 0;

  const navSeq: ChView[] = [
    ...topics.map((_, i) => ({ kind: 'topic', idx: i } as ChView)),
    ...(hasPractice ? [{ kind: 'practice' } as ChView] : []),
    { kind: 'cyt' } as ChView,
  ];

  const viewIdx = navSeq.findIndex(v =>
    v.kind === view.kind && (v.kind === 'topic' ? v.idx === (view as any).idx : true)
  );

  const pct = topics.length > 0 ? Math.round(completed.size / topics.length * 100) : 0;

  const scrollTop = () => mainRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

  const setViewAndScroll = (v: ChView) => { setView(v); scrollTop(); };

  const goNext = () => {
    if (view.kind === 'topic') setCompleted(c => new Set([...c, topics[(view as any).idx].id]));
    if (viewIdx < navSeq.length - 1) setViewAndScroll(navSeq[viewIdx + 1]);
  };
  const goPrev = () => { if (viewIdx > 0) setViewAndScroll(navSeq[viewIdx - 1]); };

  const nextLabel = (() => {
    if (viewIdx >= navSeq.length - 1) return null;
    const next = navSeq[viewIdx + 1];
    if (next.kind === 'practice') return 'Continue to Practice →';
    if (next.kind === 'cyt') return 'Continue to Cycle Test →';
    return 'Next →';
  })();

  const navLabel = view.kind === 'topic'
    ? `Topic ${(view as any).idx + 1} of ${topics.length}`
    : view.kind === 'practice' ? 'Chapter Practice'
    : 'Cycle Test';

  if (loading) return <div className="sa-loading" style={{ padding: 48 }}>Loading chapter…</div>;
  if (err) return <div className="sa-error" style={{ margin: 24 }}>{err}</div>;

  return (
    <div className="cdv-shell">
      {/* ── Sidebar ── */}
      <aside className="cdv-sidebar">
        <button className="cdv-back" onClick={onBack}>← Chapters</button>
        <h2 className="cdv-chapter-title">{chapter.title}</h2>
        <div className="cdv-progress">
          <div className="cdv-progress-bar"><div style={{ width: `${pct}%` }} /></div>
          <span className="cdv-pct">{pct}% complete</span>
        </div>
        <nav className="cdv-nav">
          {topics.map((t, i) => (
            <button key={t.id}
              className={`cdv-nav-item${view.kind === 'topic' && (view as any).idx === i ? ' active' : ''}`}
              onClick={() => setViewAndScroll({ kind: 'topic', idx: i })}>
              <span className={`cdv-dot${completed.has(t.id) ? ' done' : view.kind === 'topic' && (view as any).idx === i ? ' active' : ''}`}>
                {completed.has(t.id) ? '✓' : ''}
              </span>
              <span>{t.title}</span>
            </button>
          ))}
          {hasPractice && (
            <button
              className={`cdv-nav-item cdv-practice-item${view.kind === 'practice' ? ' active' : ''}`}
              onClick={() => setViewAndScroll({ kind: 'practice' })}>
              <span className={`cdv-dot${view.kind === 'practice' ? ' active' : ''}`}>✎</span>
              <span>Chapter Practice</span>
            </button>
          )}
          <button
            className={`cdv-nav-item cdv-cyt-item${view.kind === 'cyt' ? ' active' : ''}`}
            onClick={() => setViewAndScroll({ kind: 'cyt' })}>
            <span className={`cdv-dot${view.kind === 'cyt' ? ' active' : ''}`}>☐</span>
            <span>Cycle Test</span>
          </button>
        </nav>
        <div className="cdv-breadcrumb">
          <small>{subject.board} · Class {subject.grade} · {subject.name}</small>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="cdv-main">
        <div className="cdv-content" ref={mainRef}>
          {view.kind === 'topic' && topics[(view as any).idx] && (
            <article className="cdv-topic-article">
              <div className="cdv-topic-banner">
                <small>TOPIC {(view as any).idx + 1} OF {topics.length}</small>
                <h1>{topics[(view as any).idx].title}</h1>
              </div>
              <div className="cdv-topic-body"
                dangerouslySetInnerHTML={{ __html: topics[(view as any).idx].htmlContent || '<p><em>No content yet.</em></p>' }} />
            </article>
          )}
          {view.kind === 'topic' && topics.length === 0 && (
            <div className="sa-empty" style={{ margin: 40 }}>No topics approved for this chapter yet.</div>
          )}
          {view.kind === 'practice' && (
            <PracticeView questions={practiceQs} />
          )}
          {view.kind === 'cyt' && (
            <div className="cdv-cyt-placeholder">
              <small>CYCLE TEST</small>
              <h1>Ready for the Cycle Test?</h1>
              <p>Your teacher is preparing the cycle test for this chapter. Check back soon!</p>
            </div>
          )}

          {/* Bottom navigation bar */}
          <div className="cdv-bottom-nav">
            <button className="cdv-prev-btn" disabled={viewIdx <= 0} onClick={goPrev}>← Previous</button>
            <span className="cdv-nav-label">{navLabel}</span>
            {nextLabel
              ? <button className="cdv-next-btn" onClick={goNext}>{nextLabel}</button>
              : <span />
            }
          </div>
        </div>
      </main>
    </div>
  );
}

// The student chapter experience must use the same content, practice API and
// renderer as Content Operations' "Preview as Student" mode. The older
// ChapterDetail renderer above is retained only for migration compatibility.
function StudentChapterLearning({ chapter, subject, onBack }: { chapter: Chapter; subject: Subject; onBack: () => void }) {
  const [libraryChapter, setLibraryChapter] = useState<any>();
  const [practice, setPractice] = useState<any>(undefined);
  const [error, setError] = useState('');
  const libraryId = chapter.libraryChapterId || chapter.id;

  useEffect(() => {
    setLibraryChapter(undefined);
    setPractice(undefined);
    setError('');
    Promise.all([
      api<any>(`/library/chapters/${libraryId}`),
      api<any>(`/catalogue/chapters/${libraryId}/assessment`, {}, false),
    ])
      .then(([content, assessment]) => {
        setLibraryChapter(content);
        const questions = assessment?.questions || [];
        setPractice({
          title: 'Chapter Practice',
          instructions: 'Practice questions · no marks · immediate feedback',
          type1Questions: questions.filter((q: any) => q.type !== 'type2'),
          type2Questions: questions.filter((q: any) => q.type === 'type2'),
        });
      })
      .catch((e: any) => setError(e.message || 'Unable to load chapter'));
  }, [libraryId]);

  if (error) return <div className="sa-error" style={{ margin: 24 }}>{error}</div>;
  if (!libraryChapter) return <div className="sa-loading" style={{ padding: 48 }}>Loading chapter…</div>;

  return <ChapterLearning
    subject={subject}
    chapter={libraryChapter}
    back={onBack}
    externalPractice={practice}
  />;
}

// ── Course viewer ─────────────────────────────────────────────────────────────

function CourseViewer({ course, onBack }: { course: Course; onBack: () => void }) {
  const [selSubject, setSelSubject] = useState<Subject | null>(course.subjects[0] ?? null);
  const [chapters, setChapters]     = useState<Chapter[]>([]);
  const [selChapter, setSelChapter] = useState<Chapter | null>(null);
  const [loadingCh, setLoadingCh]   = useState(false);
  const [err, setErr]               = useState('');

  useEffect(() => {
    if (!selSubject) return;
    setLoadingCh(true); setChapters([]); setSelChapter(null); setErr('');
    api<Chapter[]>(`/catalogue/subjects/${selSubject.id}/chapters`)
      .then(chs => setChapters(chs))
      .catch(e => setErr(e.message))
      .finally(() => setLoadingCh(false));
  }, [selSubject?.id]);

  if (selChapter && selSubject) {
    return <StudentChapterLearning chapter={selChapter} subject={selSubject} onBack={() => setSelChapter(null)} />;
  }

  return (
    <div className="cv-shell">
      <div className="cv-header">
        <button className="cv-back-btn" onClick={onBack}>← All Courses</button>
        <h1 className="cv-course-title">{course.title}</h1>
      </div>

      {course.subjects.length > 1 && (
        <div className="cv-subject-tabs">
          {course.subjects.map(s => (
            <button key={s.id} className={`cv-subject-tab${selSubject?.id === s.id ? ' active' : ''}`}
              onClick={() => setSelSubject(s)}>
              {s.name}
              <small>{s.board} · Class {s.grade}</small>
            </button>
          ))}
        </div>
      )}

      {selSubject && course.subjects.length === 1 && (
        <div className="cv-subject-label">
          {selSubject.name} · {selSubject.board} · Class {selSubject.grade}
        </div>
      )}

      {err && <div className="sa-error" style={{ margin: '12px 24px' }}>{err}</div>}
      {loadingCh && <div className="sa-loading" style={{ padding: 32 }}>Loading chapters…</div>}

      {!loadingCh && chapters.length === 0 && !err && (
        <div className="sa-empty" style={{ padding: '48px 24px' }}>No chapters published for this subject yet.</div>
      )}

      <div className="cv-chapter-tiles">
        {chapters.map((ch, i) => (
          <div key={ch.id} className="cv-chapter-tile" onClick={() => setSelChapter(ch)}>
            <div className="cv-tile-num">Ch {i + 1}</div>
            <div className="cv-tile-title">{ch.title}</div>
            <div className="cv-tile-arrow">→</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function StudentApp() {
  const [user, setUser]               = useState<User | null>(null);
  const [checking, setChecking]       = useState(true);
  const [authModal, setAuthModal]     = useState<'login'|'register'|null>(null);
  const [tab, setTab]                 = useState<'catalog'|'dashboard'>('catalog');
  const [viewCourse, setViewCourse]   = useState<Course | null>(null);
  const [subscribed, setSubscribed]   = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = localStorage.getItem(STORAGE_KEY);
    if (!t) { setChecking(false); return; }
    api<User>('/auth/me')
      .then(u => { setUser(u); loadSubscriptions(); })
      .catch(() => localStorage.removeItem(STORAGE_KEY))
      .finally(() => setChecking(false));
  }, []);

  const loadSubscriptions = useCallback(async () => {
    try {
      const courses = await api<Course[]>('/student/enrolments');
      setSubscribed(new Set(courses.map(c => c.id)));
    } catch { /* ignore */ }
  }, []);

  const onLogin = (u: User, token: string) => {
    localStorage.setItem(STORAGE_KEY, token);
    setUser(u); setAuthModal(null);
    loadSubscriptions();
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null); setSubscribed(new Set()); setViewCourse(null); setTab('catalog');
  };

  if (checking) return <div className="sa-loading sa-loading-full">Loading…</div>;

  if (viewCourse) {
    return <CourseViewer course={viewCourse} onBack={() => setViewCourse(null)} />;
  }

  return (
    <div className="sa-app">
      <header className="sa-header">
        <div className="sa-brand">EDU<span>LLM</span></div>
        <nav className="sa-nav">
          <button className={tab === 'catalog' ? 'active' : ''} onClick={() => setTab('catalog')}>Browse Courses</button>
          {user && <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>My Learning</button>}
        </nav>
        <div className="sa-header-right">
          {user
            ? <>
                <span className="sa-user-name">{user.displayName}</span>
                <button className="sa-btn-ghost" onClick={logout}>Sign out</button>
              </>
            : <>
                <button className="sa-btn-ghost" onClick={() => setAuthModal('login')}>Sign In</button>
                <button className="sa-btn-primary" onClick={() => setAuthModal('register')}>Register Free</button>
              </>
          }
        </div>
      </header>

      <main className="sa-main">
        {tab === 'catalog' && (
          <CourseCatalog
            user={user}
            subscribed={subscribed}
            onSubscribed={id => { setSubscribed(s => new Set([...s, id])); }}
            onOpen={setViewCourse}
            onAuthNeeded={() => setAuthModal('register')}
          />
        )}
        {tab === 'dashboard' && user && (
          <Dashboard user={user} onOpen={setViewCourse} />
        )}
      </main>

      {authModal && (
        <AuthModal mode={authModal} onDone={onLogin} onClose={() => setAuthModal(null)} />
      )}
    </div>
  );
}
