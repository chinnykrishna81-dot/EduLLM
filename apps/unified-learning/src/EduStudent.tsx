import { useState, useEffect, useRef } from 'react';
import './edu-student.css';

const API = `${import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:3001'}/api/content`;

// ── Inline types ──────────────────────────────────────────────────────────────

interface ChapterImage { src: string; alt: string; caption: string; }
interface Subtopic { heading: string; explanation: string; }
interface Section {
  id: string; title: string; colors: [string, string];
  definition: string; key_points: string[]; equations: string[];
  worked_example: string; images: ChapterImage[]; subtopics: Subtopic[];
}
interface EndMcq {
  id: string; question: string; options: string[];
  correct_index: number; explanation: string;
}
interface Chapter {
  chapter_id: string; subject: string; grade: number; board: string; title: string;
  sections: Section[]; end_of_chapter_mcqs: EndMcq[];
}
interface McqOption { id: string; text: string; }
interface McqQuestion {
  question_id: string; topic: string; subtopic: string;
  difficulty: string; marks: number; question: string;
  options: McqOption[]; correct_option: string; short_explanation: string;
}
interface McqBank { questions: McqQuestion[]; }
interface T2Option { id: string; text: string; is_correct: boolean; }
interface Subquestion {
  id: string; question: string; options: T2Option[];
  correct_option: string; answer: string; marks: number; feedback: string;
}
interface Type2Question {
  id: string; topic: string; subtopic: string; pattern_id: string;
  complexity: string; marks: number; main_question: string; scenario?: string;
  subquestions: Subquestion[];
  explanation_image_ref?: string; explanation_image_alt?: string;
}
interface Type2Bank { questions: Type2Question[]; }
interface Pkg { id: string; subject: string; grade: number; board: string; title: string; }

function chapterImgUrl(pkgId: string, src: string) {
  const file = src.replace('images/', '');
  return `${API}/packages/${pkgId}/images/chapter/${file}`;
}
function type2ImgUrl(pkgId: string, ref: string) {
  const file = ref.replace('images/', '');
  return `${API}/packages/${pkgId}/images/type2/${file}`;
}

// ── Learn tab: concept sections + end MCQs ──────────────────────────────────

function LearnSection({ section, pkgId, index }: { section: Section; pkgId: string; index: number }) {
  return (
    <section className="es-section" id={`sec-${section.id}`}>
      <div className="es-sec-head" style={{ background: `linear-gradient(135deg, ${section.colors[0]}, ${section.colors[1]})` }}>
        <span className="es-sec-num">{index + 1}</span>
        <h2>{section.title}</h2>
      </div>
      <div className="es-sec-body">
        <p className="es-definition">{section.definition}</p>

        {section.images.length > 0 && (
          <div className="es-visuals">
            {section.images.map((img, i) => (
              <figure key={i} className="es-figure">
                <img
                  src={chapterImgUrl(pkgId, img.src)}
                  alt={img.alt}
                  loading="lazy"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                {img.caption && <figcaption>{img.caption}</figcaption>}
              </figure>
            ))}
          </div>
        )}

        {section.subtopics.length > 0 && (
          <div className="es-subtopics">
            {section.subtopics.map((st, i) => (
              <div key={i} className="es-subtopic">
                <h3>{st.heading}</h3>
                <p>{st.explanation}</p>
              </div>
            ))}
          </div>
        )}

        {section.key_points.length > 0 && (
          <div className="es-box">
            <strong>Key Points</strong>
            <ul>{section.key_points.map((kp, i) => <li key={i}>{kp}</li>)}</ul>
          </div>
        )}

        {section.equations.length > 0 && (
          <div className="es-equations">
            {section.equations.map((eq, i) => <span key={i} className="es-eq">{eq}</span>)}
          </div>
        )}

        {section.worked_example && (
          <div className="es-box es-example">
            <strong>Worked Example</strong>
            <p>{section.worked_example}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function EndChapterMcqs({ mcqs }: { mcqs: EndMcq[] }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const score = mcqs.filter(q => answers[q.id] === q.correct_index).length;

  return (
    <section className="es-tyk">
      <div className="es-tyk-head">
        <h2>Check Your Knowledge</h2>
        <p>{mcqs.length} questions · Submit to see your score</p>
      </div>
      <div className="es-tyk-body">
        {mcqs.map((q, i) => {
          const chosen = answers[q.id];
          return (
            <div key={q.id} className={`es-mcq ${submitted ? 'graded' : ''}`}>
              <p className="es-q-text"><strong>{i + 1}.</strong> {q.question}</p>
              <div className="es-options">
                {q.options.map((opt, k) => {
                  const letter = String.fromCharCode(65 + k);
                  const isChosen = chosen === k;
                  const isCorrect = submitted && k === q.correct_index;
                  const isWrong = submitted && isChosen && k !== q.correct_index;
                  return (
                    <label key={k} className={`es-opt ${isChosen ? 'chosen' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
                      onClick={() => !submitted && setAnswers(a => ({ ...a, [q.id]: k }))}>
                      <span className="es-letter">{letter}</span>{opt}
                    </label>
                  );
                })}
              </div>
              {submitted && (
                <div className={`es-feedback ${answers[q.id] === q.correct_index ? 'ok' : 'no'}`}>
                  <strong>{String.fromCharCode(65 + q.correct_index)}</strong> — {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="es-tyk-footer">
        <button className="es-btn-primary" disabled={Object.keys(answers).length === 0}
          onClick={() => submitted ? (setAnswers({}), setSubmitted(false)) : setSubmitted(true)}>
          {submitted ? 'Try Again' : 'Submit Answers'}
        </button>
        {submitted && <strong className="es-score">Score: {score} / {mcqs.length}</strong>}
      </div>
    </section>
  );
}

function LearnTab({ chapter, pkgId }: { chapter: Chapter; pkgId: string }) {
  const navRef = useRef<HTMLDivElement>(null);
  return (
    <div className="es-learn-layout">
      <aside className="es-learn-nav" ref={navRef}>
        <p className="es-nav-label">Sections</p>
        {chapter.sections.map((s, i) => (
          <button key={s.id} className="es-nav-item"
            onClick={() => document.getElementById(`sec-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            <span className="es-nav-num">{i + 1}</span>{s.title}
          </button>
        ))}
        <button className="es-nav-item es-nav-tyk"
          onClick={() => document.getElementById('es-tyk')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <span className="es-nav-num">✓</span>Check Your Knowledge
        </button>
      </aside>
      <div className="es-learn-content">
        <div className="es-section-list">
          {chapter.sections.map((s, i) => (
            <LearnSection key={s.id} section={s} pkgId={pkgId} index={i} />
          ))}
          <div id="es-tyk">
            {chapter.end_of_chapter_mcqs?.length > 0 && <EndChapterMcqs mcqs={chapter.end_of_chapter_mcqs} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Practice tab: unique Type 2 per pattern, immediate feedback ───────────────

function PracticeQuestion({ q, pkgId, qIndex, total }: { q: Type2Question; pkgId: string; qIndex: number; total: number }) {
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  const pick = (subId: string, optId: string) => {
    if (revealed[subId]) return;
    setRevealed(r => ({ ...r, [subId]: optId }));
  };

  return (
    <div className="es-pq">
      <div className="es-pq-head">
        <span className="es-pq-num">Q{qIndex + 1}</span>
        <div>
          <p className="es-pq-topic">{q.topic}{q.subtopic !== q.topic ? ` › ${q.subtopic}` : ''}</p>
          <p className="es-pq-main">{q.main_question}</p>
          {q.scenario && <p className="es-pq-scenario">{q.scenario}</p>}
        </div>
        <span className="es-pq-marks">{q.marks}M</span>
      </div>

      {q.explanation_image_ref && (
        <div className="es-pq-img">
          <img
            src={type2ImgUrl(pkgId, q.explanation_image_ref)}
            alt={q.explanation_image_alt || `Illustration`}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}

      <div className="es-subqs">
        {q.subquestions.map((sq, si) => {
          const chosen = revealed[sq.id];
          const correct = chosen === sq.correct_option;
          return (
            <div key={sq.id} className={`es-subq ${chosen ? (correct ? 'correct' : 'wrong') : ''}`}>
              <p className="es-subq-text"><strong>Step {si + 1} ({sq.marks}M):</strong> {sq.question}</p>
              <div className="es-subq-opts">
                {sq.options.map(opt => (
                  <button key={opt.id}
                    className={`es-subq-opt ${chosen === opt.id ? (opt.is_correct ? 'correct' : 'wrong') : ''} ${!chosen ? 'clickable' : ''}`}
                    onClick={() => pick(sq.id, opt.id)}
                    disabled={!!chosen}>
                    <span className="es-opt-id">{opt.id}</span>{opt.text}
                  </button>
                ))}
              </div>
              {chosen && (
                <div className={`es-subq-reveal ${correct ? 'ok' : 'no'}`}>
                  {correct ? '✓ Correct!' : `✕ Incorrect.`} <strong>Answer: {sq.correct_option}</strong> — {sq.feedback}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PracticeTab({ type2Bank, pkgId }: { type2Bank: Type2Bank | null; pkgId: string }) {
  const [filterTopic, setFilterTopic] = useState('All');

  if (!type2Bank) return <div className="es-loading">Loading questions…</div>;

  // One question per unique pattern_id (practice = learn the pattern)
  const seenPatterns = new Set<string>();
  const uniqueQuestions = type2Bank.questions.filter(q => {
    if (seenPatterns.has(q.pattern_id)) return false;
    seenPatterns.add(q.pattern_id);
    return true;
  });

  const topics = ['All', ...Array.from(new Set(uniqueQuestions.map(q => q.topic))).sort()];
  const filtered = filterTopic === 'All' ? uniqueQuestions : uniqueQuestions.filter(q => q.topic === filterTopic);

  return (
    <div className="es-practice-layout">
      <div className="es-practice-header">
        <div>
          <h2>Practice</h2>
          <p>One unique question per concept pattern · Answers shown immediately</p>
        </div>
        <div className="es-topic-filter">
          <label>Topic:
            <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)}>
              {topics.map(t => <option key={t}>{t}</option>)}
            </select>
          </label>
          <span className="es-count">{filtered.length} questions</span>
        </div>
      </div>
      <div className="es-pq-list">
        {filtered.map((q, i) => (
          <PracticeQuestion key={q.id} q={q} pkgId={pkgId} qIndex={i} total={filtered.length} />
        ))}
      </div>
    </div>
  );
}

// ── Assess tab: MCQs + Type2 "duplicate" questions, scored ──────────────────

function AssessTab({ mcqBank, type2Bank, pkgId }: { mcqBank: McqBank | null; type2Bank: Type2Bank | null; pkgId: string }) {
  const [section, setSection] = useState<'mcq' | 'type2'>('mcq');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [filterTopic, setFilterTopic] = useState('All');

  if (!mcqBank || !type2Bank) return <div className="es-loading">Loading questions…</div>;

  // Assessment Type2 = questions NOT used in practice (not first of each pattern)
  const practicePatterns = new Set<string>();
  type2Bank.questions.forEach(q => {
    if (!practicePatterns.has(q.pattern_id)) { practicePatterns.add(q.pattern_id); }
  });
  const patternFirstSeen = new Map<string, boolean>();
  const assessType2 = type2Bank.questions.filter(q => {
    if (!patternFirstSeen.has(q.pattern_id)) { patternFirstSeen.set(q.pattern_id, true); return false; }
    return true;
  });

  const mcqTopics = ['All', ...Array.from(new Set(mcqBank.questions.map(q => q.topic))).sort()];
  const t2Topics = ['All', ...Array.from(new Set(assessType2.map(q => q.topic))).sort()];
  const topics = section === 'mcq' ? mcqTopics : t2Topics;

  const mcqFiltered = filterTopic === 'All' ? mcqBank.questions : mcqBank.questions.filter(q => q.topic === filterTopic);
  const t2Filtered = filterTopic === 'All' ? assessType2 : assessType2.filter(q => q.topic === filterTopic);

  const mcqScore = submitted ? mcqFiltered.filter(q => answers[q.question_id] === q.correct_option).length : 0;

  const resetFilter = () => setFilterTopic('All');

  return (
    <div className="es-assess-layout">
      <div className="es-assess-header">
        <div className="es-assess-tabs">
          <button className={section === 'mcq' ? 'active' : ''} onClick={() => { setSection('mcq'); resetFilter(); }}>
            Type 1 — MCQs ({mcqBank.questions.length})
          </button>
          <button className={section === 'type2' ? 'active' : ''} onClick={() => { setSection('type2'); resetFilter(); }}>
            Type 2 — Problems ({assessType2.length})
          </button>
        </div>
        <div className="es-topic-filter">
          <label>Topic:
            <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)}>
              {topics.map(t => <option key={t}>{t}</option>)}
            </select>
          </label>
          <span className="es-count">{section === 'mcq' ? mcqFiltered.length : t2Filtered.length} questions</span>
        </div>
      </div>

      {section === 'mcq' && (
        <>
          <div className="es-pq-list">
            {mcqFiltered.map((q, i) => {
              const chosen = answers[q.question_id];
              return (
                <div key={q.question_id} className={`es-assess-mcq ${submitted ? 'graded' : ''}`}>
                  <div className="es-assess-meta">
                    <span className="es-q-id">{q.question_id}</span>
                    <span className={`es-diff diff-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
                    <span className="es-topic-tag">{q.topic}</span>
                    <span className="es-marks">{q.marks}M</span>
                  </div>
                  <p className="es-q-text"><strong>Q{i + 1}.</strong> {q.question}</p>
                  <div className="es-options">
                    {q.options.map(opt => {
                      const isChosen = chosen === opt.id;
                      const isCorrect = submitted && opt.id === q.correct_option;
                      const isWrong = submitted && isChosen && opt.id !== q.correct_option;
                      return (
                        <label key={opt.id}
                          className={`es-opt ${isChosen ? 'chosen' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
                          onClick={() => !submitted && setAnswers(a => ({ ...a, [q.question_id]: opt.id }))}>
                          <span className="es-letter">{opt.id}</span>{opt.text}
                        </label>
                      );
                    })}
                  </div>
                  {submitted && (
                    <div className={`es-feedback ${chosen === q.correct_option ? 'ok' : 'no'}`}>
                      <strong>Answer: {q.correct_option}</strong> — {q.short_explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="es-assess-footer">
            <button className="es-btn-primary" disabled={Object.keys(answers).length === 0}
              onClick={() => submitted ? (setAnswers({}), setSubmitted(false)) : setSubmitted(true)}>
              {submitted ? 'Reset' : 'Submit MCQs'}
            </button>
            {submitted && <strong className="es-score">Score: {mcqScore} / {mcqFiltered.length}</strong>}
          </div>
        </>
      )}

      {section === 'type2' && (
        <div className="es-pq-list">
          {t2Filtered.map((q, i) => (
            <PracticeQuestion key={q.id} q={q} pkgId={pkgId} qIndex={i} total={t2Filtered.length} />
          ))}
          {t2Filtered.length === 0 && (
            <div className="es-empty-msg">No additional questions for this topic. All patterns have only one question.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main EduStudent app ──────────────────────────────────────────────────────

type Tab = 'learn' | 'practice' | 'assess';

export function EduStudent() {
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [pkgId, setPkgId] = useState('');
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [mcqBank, setMcqBank] = useState<McqBank | null>(null);
  const [type2Bank, setType2Bank] = useState<Type2Bank | null>(null);
  const [tab, setTab] = useState<Tab>('learn');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/packages`).then(r => r.json())
      .then((pkgs: Pkg[]) => { setPackages(pkgs); if (pkgs.length > 0) loadPackage(pkgs[0].id); })
      .catch(() => setError('Cannot connect to content server. Please start the API on port 3001.'));
  }, []);

  const loadPackage = async (id: string) => {
    setLoading(true); setError('');
    try {
      const [ch, mcq, t2] = await Promise.all([
        fetch(`${API}/packages/${id}/chapter`).then(r => r.json()),
        fetch(`${API}/packages/${id}/mcq`).then(r => r.json()),
        fetch(`${API}/packages/${id}/type2`).then(r => r.json()),
      ]);
      setChapter(ch); setMcqBank(mcq); setType2Bank(t2); setPkgId(id);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="es-app">
      <header className="es-header">
        <div className="es-brand">EDU<span>LLM</span></div>
        {chapter && (
          <div className="es-chapter-info">
            <span className="es-chapter-badge">{chapter.board} · Class {chapter.grade}</span>
            <span className="es-chapter-title">{chapter.title}</span>
          </div>
        )}
        <div className="es-header-right">
          {packages.length > 1 && (
            <select className="es-pkg-select" value={pkgId} onChange={e => loadPackage(e.target.value)}>
              {packages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          )}
        </div>
      </header>

      {error && <div className="es-error">{error}</div>}
      {loading && <div className="es-loading-bar">Loading…</div>}

      {chapter && !loading && (
        <>
          <nav className="es-tab-bar">
            <button className={tab === 'learn' ? 'active' : ''} onClick={() => setTab('learn')}>
              Learn
              <small>{chapter.sections.length} concepts</small>
            </button>
            <button className={tab === 'practice' ? 'active' : ''} onClick={() => setTab('practice')}>
              Practice
              <small>Unique questions</small>
            </button>
            <button className={tab === 'assess' ? 'active' : ''} onClick={() => setTab('assess')}>
              Assessment
              <small>MCQs &amp; Problems</small>
            </button>
          </nav>

          <div className="es-tab-content">
            {tab === 'learn' && <LearnTab chapter={chapter} pkgId={pkgId} />}
            {tab === 'practice' && <PracticeTab type2Bank={type2Bank} pkgId={pkgId} />}
            {tab === 'assess' && <AssessTab mcqBank={mcqBank} type2Bank={type2Bank} pkgId={pkgId} />}
          </div>
        </>
      )}
    </div>
  );
}
