import { useState, useEffect } from 'react';
import type { PackageSummary, Chapter, Section, McqBank, McqQuestion, Type2Bank, Type2Question } from './types';
import { api } from './contentApi';
import './teacher.css';

type Tab = 'concepts' | 'questions';

function SectionCard({ section, pkgId, mcqs }: { section: Section; pkgId: string; mcqs: McqQuestion[] }) {
  const [showAnswers, setShowAnswers] = useState<Record<string, boolean>>({});
  const topicMcqs = mcqs.slice(0, 10);

  const toggle = (id: string) => setShowAnswers(s => ({ ...s, [id]: !s[id] }));

  return (
    <div className="section-card">
      <div className="section-header" style={{ background: `linear-gradient(135deg, ${section.colors[0]}, ${section.colors[1]})` }}>
        <span className="section-id">{section.id}</span>
        <h2>{section.title}</h2>
      </div>

      <div className="section-body">
        <div className="concept-block">
          <h4>Definition</h4>
          <p>{section.definition}</p>
        </div>

        {section.key_points.length > 0 && (
          <div className="concept-block">
            <h4>Key Points</h4>
            <ul>{section.key_points.map((p, i) => <li key={i}>{p}</li>)}</ul>
          </div>
        )}

        {section.equations.length > 0 && (
          <div className="concept-block equations">
            <h4>Equations</h4>
            {section.equations.map((eq, i) => <div key={i} className="equation">{eq}</div>)}
          </div>
        )}

        {section.worked_example && (
          <div className="concept-block worked-example">
            <h4>Worked Example</h4>
            <p>{section.worked_example}</p>
          </div>
        )}

        {section.visual_flow && (
          <div className="concept-block visual-flow">
            <h4>Visual Flow</h4>
            <div className="flow-box">{section.visual_flow}</div>
          </div>
        )}

        {section.subtopics.length > 0 && (
          <div className="concept-block">
            <h4>Subtopics</h4>
            <div className="subtopics">
              {section.subtopics.map((st, i) => (
                <div key={i} className="subtopic">
                  <strong>{st.heading}</strong>
                  <p>{st.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {section.images.length > 0 && (
          <div className="concept-block">
            <h4>Images</h4>
            <div className="image-row">
              {section.images.map((img, i) => (
                <figure key={i}>
                  <img
                    src={api.chapterImageUrl(pkgId, img.src.replace('images/', ''))}
                    alt={img.alt}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <figcaption>{img.caption}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}

        {topicMcqs.length > 0 && (
          <div className="tyk-block">
            <div className="tyk-header">
              <span>Test Your Knowledge</span>
              <span className="tyk-count">{topicMcqs.length} MCQs</span>
            </div>
            <div className="tyk-questions">
              {topicMcqs.map((q, i) => (
                <div key={q.question_id} className="tyk-q">
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
        )}
      </div>
    </div>
  );
}

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

export default function App() {
  const [packages, setPackages] = useState<PackageSummary[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<string>('');
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [mcqBank, setMcqBank] = useState<McqBank | null>(null);
  const [type2Bank, setType2Bank] = useState<Type2Bank | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [tab, setTab] = useState<Tab>('concepts');
  const [qSubTab, setQSubTab] = useState<'mcq' | 'type2'>('mcq');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listPackages()
      .then(setPackages)
      .catch(e => setError('Cannot reach API at localhost:3001. Is the server running?'));
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
      setSelectedSection(ch.sections[0]?.id || '');
      setSelectedPkg(pkgId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const currentSection = chapter?.sections.find(s => s.id === selectedSection);

  // For TYK: pick MCQs matching the current section's topic (by keyword matching)
  const sectionMcqs = (section: Section, bank: McqBank): McqQuestion[] => {
    const titleWords = section.title.toLowerCase().split(/\s+/);
    const scored = bank.questions.map(q => {
      const topic = q.topic.toLowerCase();
      const matches = titleWords.filter(w => w.length > 3 && topic.includes(w)).length;
      return { q, matches };
    });
    const topMatches = scored.filter(x => x.matches > 0).sort((a, b) => b.matches - a.matches).map(x => x.q);
    if (topMatches.length >= 10) return topMatches.slice(0, 10);
    // fill remaining from general pool
    const usedIds = new Set(topMatches.map(q => q.question_id));
    const fill = bank.questions.filter(q => !usedIds.has(q.question_id));
    return [...topMatches, ...fill].slice(0, 10);
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-edu">EDU</span><strong>LLM</strong>
          <small>Content Manager</small>
        </div>

        {packages.length === 0 && !error && (
          <div className="sidebar-msg">Loading packages…</div>
        )}

        {packages.map(pkg => (
          <div key={pkg.id} className="pkg-group">
            <div className="pkg-subject">{pkg.subject} · Grade {pkg.grade}</div>
            <button
              className={`pkg-btn ${selectedPkg === pkg.id ? 'active' : ''}`}
              onClick={() => loadPackage(pkg.id)}
            >
              {pkg.title}
            </button>

            {selectedPkg === pkg.id && chapter && (
              <div className="section-list">
                {chapter.sections.map(s => (
                  <button
                    key={s.id}
                    className={`section-btn ${selectedSection === s.id ? 'active' : ''}`}
                    onClick={() => { setSelectedSection(s.id); setTab('concepts'); }}
                  >
                    <span className="sec-id">{s.id}</span>
                    <span className="sec-title">{s.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="sidebar-footer">
          <div className="role-badge">TEACHER</div>
          <small>Feed &amp; Review Content</small>
        </div>
      </aside>

      <main className="main">
        {error && <div className="error-bar">{error}</div>}

        {!selectedPkg && !loading && (
          <div className="empty-state">
            <h1>EduLLM Content Manager</h1>
            <p>Select a content package from the sidebar to begin reviewing.</p>
            {packages.length === 0 && !error && <p className="hint">Make sure the API server is running at <code>localhost:3001</code></p>}
          </div>
        )}

        {loading && <div className="loading">Loading content…</div>}

        {selectedPkg && chapter && !loading && (
          <>
            <div className="topbar">
              <div className="topbar-info">
                <span className="board-badge">{chapter.board} · Class {chapter.grade}</span>
                <h1>{chapter.title}</h1>
              </div>
              <div className="tab-bar">
                <button className={tab === 'concepts' ? 'active' : ''} onClick={() => setTab('concepts')}>
                  Concept Pages
                </button>
                <button className={tab === 'questions' ? 'active' : ''} onClick={() => setTab('questions')}>
                  Question Bank
                </button>
              </div>
            </div>

            {tab === 'concepts' && currentSection && mcqBank && (
              <div className="content-area">
                <SectionCard
                  section={currentSection}
                  pkgId={selectedPkg}
                  mcqs={sectionMcqs(currentSection, mcqBank)}
                />
              </div>
            )}

            {tab === 'questions' && (
              <div className="content-area">
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
      </main>
    </div>
  );
}
