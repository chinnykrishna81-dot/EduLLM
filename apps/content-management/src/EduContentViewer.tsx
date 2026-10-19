import { useState, useEffect, useRef } from 'react';
import type { PackageSummary, Chapter, Section, EndMcq, McqBank, McqQuestion, Type2Bank, Type2Question } from './types';
import { api } from './contentApi';
import './teacher.css';

// ── Concept section ─────────────────────────────────────────────────────────

function ConceptSection({ section, pkgId, index }: { section: Section; pkgId: string; index: number }) {
  return (
    <section className="cs-section" id={section.id}>
      <div className="cs-band" style={{ background: `linear-gradient(135deg, ${section.colors[0]}, ${section.colors[1]})` }}>
        <span className="cs-num">{index + 1}</span>
        <h2>{section.title}</h2>
      </div>
      <div className="cs-inner">
        <p className="cs-definition">{section.definition}</p>

        {section.images.length > 0 && (
          <div className="cs-visuals">
            {section.images.map((img, i) => (
              <figure key={i} className="cs-figure">
                <img
                  src={api.chapterImageUrl(pkgId, img.src.replace('images/', ''))}
                  alt={img.alt}
                  loading="lazy"
                  onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
                />
                <figcaption>{img.caption}</figcaption>
              </figure>
            ))}
          </div>
        )}

        {section.subtopics.length > 0 && (
          <div className="cs-subtopics">
            {section.subtopics.map((st, i) => (
              <div key={i} className="cs-subtopic">
                <h3>{st.heading}</h3>
                <p>{st.explanation}</p>
              </div>
            ))}
          </div>
        )}

        <div className="cs-box">
          <strong>Key points</strong>
          <ul>{section.key_points.map((p, i) => <li key={i}>{p}</li>)}</ul>
        </div>

        {section.equations.length > 0 && (
          <>
            <h3 className="cs-eq-heading">Important equations</h3>
            <div className="cs-equations">
              {section.equations.map((eq, i) => <span key={i} className="cs-eq">{eq}</span>)}
            </div>
          </>
        )}

        <div className="cs-box cs-example">
          <strong>Worked example / application</strong>
          <p>{section.worked_example}</p>
        </div>
      </div>
    </section>
  );
}

// ── End-of-chapter MCQ quiz ──────────────────────────────────────────────────

function EndChapterQuiz({ mcqs }: { mcqs: EndMcq[] }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const choose = (qId: string, idx: number) => {
    if (submitted) return;
    setAnswers(a => ({ ...a, [qId]: idx }));
  };

  const grade = () => {
    const s = mcqs.filter(q => answers[q.id] === q.correct_index).length;
    setScore(s);
    setSubmitted(true);
  };

  const reset = () => {
    setAnswers({});
    setSubmitted(false);
    setScore(0);
  };

  return (
    <section className="tyk-section" id="assessment">
      <div className="tyk-section-header">
        <h2>Check Your Knowledge — 10 MCQs</h2>
        <p>Complete all the concepts above before attempting this chapter assessment.</p>
      </div>
      <div className="tyk-mcqs">
        {mcqs.map((q, i) => {
          const chosen = answers[q.id];
          const isCorrect = submitted && chosen === q.correct_index;
          const isWrong = submitted && chosen !== undefined && chosen !== q.correct_index;
          return (
            <div key={q.id} className={`tyk-mcq ${submitted ? 'graded' : ''}`}>
              <p className="tyk-q-text"><strong>{i + 1}.</strong> {q.question}</p>
              <div className="tyk-options">
                {q.options.map((opt, k) => {
                  const letter = String.fromCharCode(65 + k);
                  const isChosen = chosen === k;
                  const isCorrectOpt = submitted && k === q.correct_index;
                  return (
                    <label
                      key={k}
                      className={`tyk-option ${isChosen ? 'chosen' : ''} ${isCorrectOpt ? 'correct-opt' : ''} ${submitted && isChosen && !isCorrectOpt ? 'wrong-opt' : ''}`}
                      onClick={() => choose(q.id, k)}
                    >
                      <span className="tyk-letter">{letter}</span>
                      {opt}
                    </label>
                  );
                })}
              </div>
              {submitted && (
                <div className={`tyk-answer ${isCorrect ? 'right' : 'wrong'}`}>
                  <strong>Answer: {String.fromCharCode(65 + q.correct_index)}</strong> — {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="tyk-actions">
        <button className="tyk-submit" onClick={submitted ? reset : grade} disabled={Object.keys(answers).length === 0}>
          {submitted ? 'Try again' : 'Submit answers'}
        </button>
        {submitted && <strong className="tyk-score">Score: {score} / {mcqs.length}</strong>}
      </div>
    </section>
  );
}

// ── Question Bank (Type 1 MCQs) ──────────────────────────────────────────────

function McqView({ pkgId, bank }: { pkgId: string; bank: McqBank }) {
  const [filterTopic, setFilterTopic] = useState('All');
  const [showAnswers, setShowAnswers] = useState<Record<string, boolean>>({});
  const topics = ['All', ...Array.from(new Set(bank.questions.map(q => q.topic))).sort()];
  const filtered = filterTopic === 'All' ? bank.questions : bank.questions.filter(q => q.topic === filterTopic);
  const toggle = (id: string) => setShowAnswers(s => ({ ...s, [id]: !s[id] }));

  return (
    <div className="qbank-view">
      <div className="qbank-toolbar">
        <label>Filter by Topic:
          <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)}>
            {topics.map(t => <option key={t}>{t}</option>)}
          </select>
        </label>
        <span className="count-badge">{filtered.length} questions</span>
      </div>
      <div className="q-list">
        {filtered.map((q, i) => (
          <div key={q.question_id} className="q-card">
            <div className="q-meta">
              <span className="q-id">{q.question_id}</span>
              <span className={`difficulty diff-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
              <span className="q-topic">{q.topic}</span>
              {q.subtopic !== q.topic && <span className="q-subtopic">{q.subtopic}</span>}
              <span className="q-marks">{q.marks}M</span>
            </div>
            <p className="q-text"><strong>Q{i + 1}.</strong> {q.question}</p>
            <div className="options">
              {q.options.map(opt => (
                <span key={opt.id} className={`option ${showAnswers[q.question_id] && opt.id === q.correct_option ? 'correct' : ''}`}>
                  <strong>{opt.id}.</strong> {opt.text}
                </span>
              ))}
            </div>
            {showAnswers[q.question_id] && (
              <div className="answer-reveal">
                <strong>Answer: {q.correct_option}</strong> — {q.short_explanation}
              </div>
            )}
            <button className="show-btn" onClick={() => toggle(q.question_id)}>
              {showAnswers[q.question_id] ? 'Hide Answer' : 'Show Answer'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Question Bank (Type 2) ───────────────────────────────────────────────────

function Type2View({ pkgId, bank }: { pkgId: string; bank: Type2Bank }) {
  const [filterTopic, setFilterTopic] = useState('All');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const topics = ['All', ...Array.from(new Set(bank.questions.map(q => q.topic))).sort()];
  const filtered = filterTopic === 'All' ? bank.questions : bank.questions.filter(q => q.topic === filterTopic);
  const toggle = (id: string) => setExpanded(s => ({ ...s, [id]: !s[id] }));

  return (
    <div className="qbank-view">
      <div className="qbank-toolbar">
        <label>Filter by Topic:
          <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)}>
            {topics.map(t => <option key={t}>{t}</option>)}
          </select>
        </label>
        <span className="count-badge">{filtered.length} questions</span>
      </div>
      <div className="q-list">
        {filtered.map((q, i) => (
          <div key={q.id} className="q-card type2-card">
            <div className="q-meta">
              <span className="q-id">{q.id}</span>
              <span className="type2-badge">Type 2</span>
              <span className={`difficulty diff-${q.complexity.toLowerCase()}`}>{q.complexity}</span>
              <span className="q-topic">{q.topic}</span>
              {q.subtopic !== q.topic && <span className="q-subtopic">{q.subtopic}</span>}
              <span className="q-marks">{q.marks}M</span>
            </div>
            <p className="q-text"><strong>Q{i + 1}.</strong> {q.main_question}</p>
            {q.explanation_image_ref && (
              <img
                src={api.type2ImageUrl(pkgId, q.explanation_image_ref.replace('images/', ''))}
                alt={q.explanation_image_alt || `Illustration for ${q.id}`}
                className="q-illustration"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <button className="show-btn" onClick={() => toggle(q.id)}>
              {expanded[q.id] ? 'Hide Sub-questions' : `Show ${q.subquestions.length} Sub-questions`}
            </button>
            {expanded[q.id] && (
              <div className="subquestions">
                {q.subquestions.map((sq, si) => (
                  <div key={sq.id} className="subq">
                    <p><strong>Step {si + 1} ({sq.marks}M):</strong> {sq.question}</p>
                    <div className="options">
                      {sq.options.map(opt => (
                        <span key={opt.id} className={`option ${opt.is_correct ? 'correct' : ''}`}>
                          <strong>{opt.id}.</strong> {opt.text} {opt.is_correct && '✓'}
                        </span>
                      ))}
                    </div>
                    <div className="answer-reveal"><strong>Answer:</strong> {sq.answer} — {sq.feedback}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main exported component ──────────────────────────────────────────────────

type Tab = 'concepts' | 'questions';

export function EduContentViewer() {
  const [packages, setPackages] = useState<PackageSummary[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<string>('');
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [mcqBank, setMcqBank] = useState<McqBank | null>(null);
  const [type2Bank, setType2Bank] = useState<Type2Bank | null>(null);
  const [tab, setTab] = useState<Tab>('concepts');
  const [qSubTab, setQSubTab] = useState<'mcq' | 'type2'>('mcq');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.listPackages()
      .then(pkgs => { setPackages(pkgs); if (pkgs.length === 1) loadPackage(pkgs[0].id); })
      .catch(() => setError('Cannot load content packages. Is the API server running?'));
  }, []);

  const loadPackage = async (pkgId: string) => {
    setLoading(true);
    setError('');
    try {
      const [ch, mcq, t2] = await Promise.all([
        api.getChapter(pkgId),
        api.getMcq(pkgId),
        api.getType2(pkgId),
      ]);
      setChapter(ch);
      setMcqBank(mcq);
      setType2Bank(t2);
      setSelectedPkg(pkgId);
      setTab('concepts');
      contentRef.current?.scrollTo({ top: 0 });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="ecv-layout">
      {/* Left nav */}
      <aside className="ecv-nav">
        {packages.length === 0 && !error && <div className="ecv-nav-msg">Loading…</div>}

        {packages.map(pkg => (
          <div key={pkg.id} className="ecv-pkg">
            <div className="ecv-pkg-label">{pkg.subject} · Grade {pkg.grade} · {pkg.board}</div>
            <button
              className={`ecv-pkg-btn ${selectedPkg === pkg.id ? 'active' : ''}`}
              onClick={() => loadPackage(pkg.id)}
            >
              {pkg.title}
            </button>

            {selectedPkg === pkg.id && chapter && tab === 'concepts' && (
              <div className="ecv-sections">
                {chapter.sections.map((s, i) => (
                  <button key={s.id} className="ecv-sec-btn" onClick={() => scrollTo(s.id)}>
                    <span className="ecv-sec-id">{i + 1}</span>
                    <span>{s.title}</span>
                  </button>
                ))}
                <button className="ecv-sec-btn ecv-tyk-link" onClick={() => scrollTo('assessment')}>
                  <span className="ecv-sec-id">✓</span>
                  <span>Check Your Knowledge</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </aside>

      {/* Content area */}
      <div className="ecv-content">
        {error && <div className="ecv-error">{error}</div>}
        {loading && <div className="ecv-loading">Loading content…</div>}

        {!selectedPkg && !loading && !error && (
          <div className="ecv-empty">
            <h2>EDULLM Content Viewer</h2>
            <p>Select a chapter from the left panel.</p>
          </div>
        )}

        {selectedPkg && chapter && !loading && (
          <>
            <div className="ecv-topbar">
              <div>
                <span className="ecv-board">{chapter.board} · Class {chapter.grade} · {chapter.subject}</span>
                <h2>{chapter.title}</h2>
              </div>
              <div className="ecv-tabs">
                <button className={tab === 'concepts' ? 'active' : ''} onClick={() => setTab('concepts')}>
                  Concept Pages
                </button>
                <button className={tab === 'questions' ? 'active' : ''} onClick={() => setTab('questions')}>
                  Question Bank
                </button>
              </div>
            </div>

            {tab === 'concepts' && (
              <div className="ecv-scroll" ref={contentRef}>
                <div className="cs-page">
                  {/* All concept sections in sequence */}
                  {chapter.sections.map((s, i) => (
                    <ConceptSection key={s.id} section={s} pkgId={selectedPkg} index={i} />
                  ))}

                  {/* Test Your Knowledge at the very end */}
                  {chapter.end_of_chapter_mcqs?.length > 0 && (
                    <EndChapterQuiz mcqs={chapter.end_of_chapter_mcqs} />
                  )}
                </div>
              </div>
            )}

            {tab === 'questions' && (
              <div className="ecv-scroll">
                <div className="subtab-bar">
                  <button className={qSubTab === 'mcq' ? 'active' : ''} onClick={() => setQSubTab('mcq')}>
                    Type 1 — MCQs ({mcqBank?.questions.length || 0})
                  </button>
                  <button className={qSubTab === 'type2' ? 'active' : ''} onClick={() => setQSubTab('type2')}>
                    Type 2 — Illustrated ({type2Bank?.questions.length || 0})
                  </button>
                </div>
                {qSubTab === 'mcq' && mcqBank && <McqView pkgId={selectedPkg} bank={mcqBank} />}
                {qSubTab === 'type2' && type2Bank && <Type2View pkgId={selectedPkg} bank={type2Bank} />}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
