import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import './student-app.css';
import { ChapterLearning } from './LearningExperience';
import { shuffleForStudent } from './studentShuffle';
import { FormattedText } from './FormattedText';

// ── Types ─────────────────────────────────────────────────────────────────────

interface User     { id: string; email: string; loginId?: string; displayName: string; role: string; authProvider?: string; }

function ProfileScreen({ user, onDone, onClose }: { user: User; onDone: (u: User) => void; onClose: () => void }) {
  const [name, setName] = useState(user.displayName);
  const [loginId, setLoginId] = useState(user.loginId || '');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const save = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setErr(''); try { const u=await api<User>('/auth/profile',{method:'PATCH',body:JSON.stringify({displayName:name,loginId})}); onDone(u); window.alert('Profile saved.'); } catch(e:any){setErr(e.message)} finally{setBusy(false)} };
  const password = async (e: React.FormEvent) => { e.preventDefault(); setErr(''); if(next!==confirm){setErr('New passwords do not match.');return} setBusy(true); try { await api('/auth/change-password',{method:'POST',body:JSON.stringify({currentPassword:current,newPassword:next,provider:google?'google':'email'})}); window.alert('Password set. Please sign in again.'); onClose(); localStorage.removeItem(STORAGE_KEY); window.location.reload(); } catch(e:any){setErr(e.message)} finally{setBusy(false)} };
  const google = user.authProvider === 'google';
  return <main className="sa-profile-page"><div className="sa-profile-card"><button className="sa-btn-ghost" onClick={onClose}>← Back to learning</button><h1>My Profile</h1><p className="sa-profile-subtitle">Manage your account details and sign-in options.</p><section><h2>Personal information</h2><form onSubmit={save}><label>Name<input value={name} onChange={e=>setName(e.target.value)} required /></label><label>Login ID<input value={loginId} onChange={e=>setLoginId(e.target.value)} placeholder="e.g. arjun10" required /><small>Use this Login ID or your email address to sign in.</small></label><label>Email<input value={user.email} disabled /></label><button className="sa-btn-primary" disabled={busy}>Save profile</button></form></section><section><h2>{google?'Set a password':'Change password'}</h2>{google&&<p className="sa-profile-note">You signed in with Google, so you do not have a current password. Set one below to also sign in with your Login ID.</p>}<form onSubmit={password}>{!google&&<label>Current password<input type="password" value={current} onChange={e=>setCurrent(e.target.value)} required /></label>}<label>New password<input type="password" value={next} onChange={e=>setNext(e.target.value)} minLength={8} required /></label><label>Confirm new password<input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} minLength={8} required /></label><button className="sa-btn-primary" disabled={busy}>{google?'Set password':'Change password'}</button></form></section>{err&&<div className="sa-modal-error">{err}</div>}</div></main>;
}
interface Subject  { id: string; name: string; grade: string; board: string; }
interface Chapter  { id: string; subjectId: string; title: string; position: number; libraryChapterId?: string; topicItems?: any[]; content?: any; cycleTest?: any; }
interface Topic    { id: string; chapterId: string; title: string; htmlContent: string; position: number; status: string; }
interface Course   { id: string; title: string; description: string; price: number; listPrice?: number; discountPercent?: number; currency: string; status: string; subjects: Subject[]; searchTerms?: string[]; freeTrialDays?: number; }
interface QuestionStep { id: string; prompt: string; options: string[]; answer: string; marks: number; explanation: string; }
interface Question { id: string; type: string; format: string; question: string; options: string[]; correctAnswer: string; explanation: string; finalAnswer?: string; marks: number; usage?: string[]; steps?: QuestionStep[]; }
const portalBanners=[
  {image:'/banners/edullm-overview.jpeg',eyebrow:'LEARN BEYOND THE TEXTBOOK',title:'Big concepts. Clear thinking.',copy:'Colourful explanations, visual learning and step-by-step solutions.'},
  {image:'/banners/smart-practice.jpeg',eyebrow:'SMART PRACTICE',title:'Know what to improve next.',copy:'Practise across subjects, track mastery and build confidence with every attempt.'},
  {image:'/banners/ai-learning-tools.jpeg',eyebrow:'INTERACTIVE LEARNING',title:'Study smarter with guided tools.',copy:'Turn chapters into focused learning, practice and revision journeys.'},
  {image:'/banners/colourful-chemistry.jpeg',eyebrow:'VISUAL SCIENCE',title:'Make difficult ideas memorable.',copy:'Explore chemistry through vivid examples, clear patterns and connected concepts.'},
];

// ── API helper ────────────────────────────────────────────────────────────────

const API = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001/api';
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
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [err, setErr]         = useState('');
  const [busy, setBusy]       = useState(false);

  const submit = async () => {
    setBusy(true); setErr('');
    try {
      if (tab === 'login') {
        const res = await api<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ identifier: email, password }) }, false);
        onDone(res.user, res.token);
      } else {
        const user = await api<User>('/auth/register', { method: 'POST', body: JSON.stringify({ email, name, password, privacyConsent, privacyConsentVersion:'DPDP-2026-01' }) }, false);
        const res = await api<{ token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, false);
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
        <div className="sa-social-login"><button type="button" onClick={()=>{if(!privacyConsent){setErr('Please accept the privacy notice before continuing.');return}window.location.href=`${API}/auth/google`}}>G&nbsp; Continue with Google</button><button type="button" onClick={()=>window.alert('Facebook sign-in is not configured yet.')}>f&nbsp; Continue with Facebook</button></div><div className="sa-or"><span>or use email</span></div>
        {tab === 'register' && (
          <label className="sa-field">
            <span>Full Name</span>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </label>
        )}
        <label className="sa-field">
          <span>Email or Login ID</span>
          <input type="text" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com or student-id" />
        </label>
        <label className="sa-field">
          <span>Password</span>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" onKeyDown={e => e.key === 'Enter' && submit()} />
        </label>
        {err && <div className="sa-modal-error">{err}</div>}
        <label className="sa-consent"><input type="checkbox" checked={privacyConsent} onChange={e=>setPrivacyConsent(e.target.checked)}/><span>I agree to the <a href="/privacy.html" target="_blank">Privacy Notice</a> and consent to processing my account data for learning access and support.</span></label>
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
        {course.freeTrialDays ? <div className="sa-profile-note" style={{marginBottom:12}}>Try free for {course.freeTrialDays} days, then continue with the course subscription.</div> : null}<div className="sa-price-block">
          <span className="sa-price">₹{course.price}</span>
          <span style={{ fontSize: 13, color: '#64748b' }}>one-time access</span>
        </div>
        {err && <div className="sa-modal-error">{err}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="sa-btn-primary" disabled={busy} onClick={confirm}>
            {busy ? 'Processing…' : course.freeTrialDays ? `Start ${course.freeTrialDays}-day free trial` : `Pay ₹${course.price} & Subscribe`}
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
  const [banner,setBanner] = useState(0);
  const [bannerPaused,setBannerPaused] = useState(false);

  useEffect(() => {
    api<any[]>('/catalogue/courses', {}, false)
      .then(items => setCourses(items.map(c => ({ id:c.id, title:c.title, description:c.description, price:Number(c.salePrice ?? c.listPrice ?? 0), listPrice:Number(c.listPrice ?? 0), discountPercent:Number(c.discountPercent ?? 0), currency:c.currency, status:c.status, freeTrialDays:Number(c.freeTrialDays||0), searchTerms:c.searchTerms||[], subjects:(c.subjects||[]).map((s:any)=>({id:s.id,name:s.title||s.name,grade:s.grade,board:s.board})) }))))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(()=>{if(bannerPaused)return;const timer=window.setInterval(()=>setBanner(value=>(value+1)%portalBanners.length),5500);return()=>window.clearInterval(timer)},[bannerPaused]);

  const boards=[...new Set(courses.flatMap(c=>c.subjects.map(s=>s.board)).filter(Boolean))];
  const grades=[...new Set(courses.flatMap(c=>c.subjects.map(s=>s.grade)).filter(Boolean))];
  const visibleCourses=courses.filter(c=>{const hay=[c.title,c.description,...(c.searchTerms||[]),...c.subjects.flatMap(s=>[s.name,s.board,s.grade])].join(' ').toLowerCase();return (!search||hay.includes(search.toLowerCase()))&&(!board||c.subjects.some(s=>s.board===board))&&(!grade||c.subjects.some(s=>s.grade===grade));});

  return (
    <div className="sa-catalog">
      <section className="sa-banner-carousel" aria-roledescription="carousel" aria-label="EduLLM features" onMouseEnter={()=>setBannerPaused(true)} onMouseLeave={()=>setBannerPaused(false)}>
        <div className="sa-banner-track" style={{transform:`translateX(-${banner*100}%)`}}>{portalBanners.map((item,index)=><article className="sa-wallpaper-banner" aria-hidden={banner!==index} key={item.image} style={{backgroundImage:`linear-gradient(90deg,rgba(5,12,48,.82) 0%,rgba(8,16,55,.48) 44%,rgba(4,8,24,.08) 72%),url(${item.image})`}}><div><span>{item.eyebrow}</span><h1>{item.title}</h1><p>{item.copy}</p><button onClick={()=>document.getElementById('course-catalog')?.scrollIntoView({behavior:'smooth'})}>Explore courses →</button></div></article>)}</div>
        <button className="sa-banner-arrow previous" aria-label="Previous banner" onClick={()=>setBanner(value=>(value-1+portalBanners.length)%portalBanners.length)}>‹</button><button className="sa-banner-arrow next" aria-label="Next banner" onClick={()=>setBanner(value=>(value+1)%portalBanners.length)}>›</button>
        <div className="sa-banner-dots">{portalBanners.map((item,index)=><button aria-label={`Show banner ${index+1}`} aria-current={banner===index} className={banner===index?'active':''} onClick={()=>setBanner(index)} key={item.image}/>)}</div>
      </section>
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
  return shuffleForStudent(arr, seed);
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
            {question.explanation && <FormattedText value={question.explanation} />}
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
            {jumble(step.options || [], step.id).map(opt => (
              <button key={opt} disabled={submitted}
                className={`pv-step-choice${answers[step.id] === opt ? ' selected' : ''}${submitted && opt === step.answer ? ' correct' : submitted && answers[step.id] === opt && opt !== step.answer ? ' wrong' : ''}`}
                onClick={() => choose(step.id, opt)}>{opt}</button>
            ))}
          </div>
          {submitted && (
            <div className={`pv-step-fb ${isCorrect(step) ? 'correct' : 'wrong'}`}>
              {isCorrect(step) ? '✓ Correct' : `✕ Answer: ${step.answer}`}
              {step.explanation && <FormattedText value={step.explanation} />}
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
                <FormattedText value={question.finalAnswer} />
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
  const [conceptsOpen, setConceptsOpen] = useState(true);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [cycleOpen, setCycleOpen] = useState(false);
  const mainRef                     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api<Topic[]>(`/question-bank/chapters/${chapter.id}/topics`),
      api<Question[]>(`/question-bank/chapters/${chapter.id}/practice`),
    ])
      .then(([ts, qs]) => {
        const libraryTopics = Array.isArray((chapter as any).topicItems) ? (chapter as any).topicItems.map((t:any, i:number) => ({ id:t.id || `${chapter.id}-topic-${i+1}`, chapterId:chapter.id, title:t.title || `Topic ${i+1}`, htmlContent:t.htmlContent || t.content || t.body || (t.introductionPages || []).flatMap((p:any) => p.blocks || []).map((b:any) => b.type === 'image' ? `<img src="${b.content || b.url || ''}" alt="" />` : (b.content || '')).join(''), position:t.position || t.sequence || i+1, status:t.status || 'approved' })) : [];
        setTopics(libraryTopics.length ? libraryTopics : ts);
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
          <button className="cdv-section-toggle" onClick={() => setConceptsOpen(v => !v)}><span className="cdv-dot active">✓</span><b>Concepts</b><span>⌃</span></button>
          {conceptsOpen && topics.map((t, i) => (
            <button key={t.id}
              className={`cdv-nav-item${view.kind === 'topic' && (view as any).idx === i ? ' active' : ''}`}
              onClick={() => setViewAndScroll({ kind: 'topic', idx: i })}>
              <span className={`cdv-dot${completed.has(t.id) ? ' done' : view.kind === 'topic' && (view as any).idx === i ? ' active' : ''}`}>
                {completed.has(t.id) ? '✓' : ''}
              </span>
              <span>{t.title}</span>
            </button>
          ))}
          <button className={`cdv-section-toggle cdv-practice-item${view.kind === 'practice' ? ' active' : ''}`} onClick={() => { setPracticeOpen(v => !v); if (hasPractice) setViewAndScroll({ kind: 'practice' }); }}><span className="cdv-dot active">✎</span><b>Practice</b><span>{practiceOpen ? '⌃' : '⌄'}</span></button>
          {practiceOpen && hasPractice && <div className="cdv-question-grid">{practiceQs.map((_, i) => <button key={i} className={view.kind === 'practice' && (document.activeElement as HTMLElement)?.dataset.question === String(i) ? 'selected' : ''} data-question={i} onClick={() => setViewAndScroll({kind:'practice'})}>{i + 1}</button>)}</div>}
          <button className={`cdv-section-toggle cdv-cyt-item${view.kind === 'cyt' ? ' active' : ''}`} onClick={() => { setCycleOpen(v => !v); setViewAndScroll({kind:'cyt'}); }}><span className="cdv-dot">□</span><b>Cycle Test</b><span>{cycleOpen ? '⌃' : '⌄'}</span></button>
          {cycleOpen && <div className="cdv-cycle-note">Complete all concepts and practice questions to unlock the cycle test.</div>}
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
            <div className="cdv-cyt-placeholder"><small>CYCLE TEST</small><h1>Ready for the Cycle Test?</h1><p>Test your understanding of this chapter with a timed assessment.</p><div className="pv-card" style={{maxWidth:700,textAlign:'left',margin:'24px auto'}}><h2>Before you begin</h2><ul><li>Complete the chapter concepts and practice first.</li><li>Read each question carefully and submit your answers.</li><li>Your result will be available after the test is submitted.</li></ul><button className="sa-btn-primary" onClick={() => window.alert('Cycle Test will be available when the teacher publishes it.')}>I understand — Start Test</button></div></div>
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

// ── Course viewer ─────────────────────────────────────────────────────────────

function subjectArtwork(name: string) {
  const value = name.toLowerCase();
  if (/science|chemistry|physics|biology/.test(value)) return '/banners/colourful-chemistry.jpeg';
  if (/math|statistics|account/.test(value)) return '/banners/smart-practice.jpeg';
  if (/computer|technology|coding|informatics/.test(value)) return '/banners/ai-learning-tools.jpeg';
  return '/banners/edullm-overview.jpeg';
}

function CourseViewer({ course, userId, onBack }: { course: Course; userId: string; onBack: () => void }) {
  const [selSubject, setSelSubject] = useState<Subject | null>(course.subjects[0] ?? null);
  const [chapters, setChapters]     = useState<Chapter[]>([]);
  const [selChapter, setSelChapter] = useState<Chapter | null>(null);
  const [loadingCh, setLoadingCh]   = useState(false);
  const [err, setErr]               = useState('');

  useEffect(() => {
    if (!selSubject) return;
    setLoadingCh(true); setChapters([]); setSelChapter(null); setErr('');
    api<any>(`/catalogue/subjects/${selSubject.id}/index`)
      .then(subject => setChapters((subject.units || []).flatMap((unit:any) => (unit.chapters || []).map((ch:any) => ({ id:ch.id, subjectId:selSubject.id, title:ch.title, position:ch.position, libraryChapterId:ch.libraryChapterId || ch.id, topicItems:ch.topicItems || [], content:ch.content, cycleTest:ch.cycleTest })))))
      .catch(e => setErr(e.message))
      .finally(() => setLoadingCh(false));
  }, [selSubject?.id]);

  if (selChapter && selSubject) {
    return <ChapterLearning subject={{ title: selSubject.name, board: selSubject.board, grade: selSubject.grade }} chapter={selChapter} back={() => setSelChapter(null)} progressScope={`${userId}:${course.id}`} />;
  }

  return (
    <div className="cv-shell">
      <div className="cv-header">
        <button className="cv-back-btn" onClick={onBack}>← All Courses</button>
        <h1 className="cv-course-title">{course.title}</h1>
      </div>

      <section className="cv-subject-section">
        <div className="cv-subject-heading">
          <div><small>YOUR COURSE SUBJECTS</small><h2>Choose a subject to learn</h2></div>
          <span>{course.subjects.length} subject{course.subjects.length === 1 ? '' : 's'}</span>
        </div>
        <div className="cv-subject-tabs">
          {course.subjects.map(s => (
            <button key={s.id} className={`cv-subject-tab${selSubject?.id === s.id ? ' active' : ''}`}
              onClick={() => setSelSubject(s)}>
              <img src={subjectArtwork(s.name)} alt={`${s.name} learning`} />
              <span className="cv-subject-card-copy">
                <small>{s.board} · CLASS {s.grade}</small>
                <strong>{s.name}</strong>
                <em>{selSubject?.id === s.id ? 'Selected subject' : 'Explore chapters'} <b>→</b></em>
              </span>
            </button>
          ))}
        </div>
      </section>

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
  const [profileOpen, setProfileOpen] = useState(false);
  const [tab, setTab]                 = useState<'catalog'|'dashboard'>('catalog');
  const [viewCourse, setViewCourse]   = useState<Course | null>(null);
  const [subscribed, setSubscribed]   = useState<Set<string>>(new Set());

  useEffect(() => {
    const params=new URLSearchParams(window.location.search); const googleToken=params.get('google_token'); const googleError=params.get('google_error'); if(googleToken){localStorage.setItem(STORAGE_KEY,googleToken);localStorage.setItem('edullm_auth_provider','google');window.history.replaceState({},'',window.location.pathname)} else if(googleError){window.history.replaceState({},'',window.location.pathname);window.alert(`Google sign-in failed: ${googleError}`)}
    const t = localStorage.getItem(STORAGE_KEY);
    if (!t) { setChecking(false); return; }
    api<User>('/auth/me')
      .then(u => { const provider=localStorage.getItem('edullm_auth_provider'); setUser(provider==='google'?{...u,authProvider:'google'}:u); loadSubscriptions(); })
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

  if (profileOpen && user) return <div className="sa-profile-route"><button className="sa-profile-route-close" onClick={() => setProfileOpen(false)}>✕ Close profile</button><ProfileScreen user={user} onDone={u => setUser(u)} onClose={() => setProfileOpen(false)} /></div>;

  if (viewCourse) {
    return <CourseViewer course={viewCourse} userId={user?.id || 'guest'} onBack={() => setViewCourse(null)} />;
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
          <a className="sa-android-download" href="/downloads/EduLLM-Android.apk" download>↓ Android App</a>
          {user
            ? <>
                <span className="sa-user-name">{user.displayName}</span>
                <button className="sa-btn-ghost" onClick={() => setProfileOpen(true)}>Profile</button>
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
