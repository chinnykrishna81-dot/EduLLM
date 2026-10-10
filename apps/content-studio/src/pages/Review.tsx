import { useEffect, useState } from 'react';
import { api } from '../api';
import type { DraftContent, ConceptPage, Question, ImageSpec } from '../types';

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_DRAFT: DraftContent = {
  chapterId: 'ch-chem-1',
  chapterName: 'Chemical Reactions and Equations',
  subject: 'science',
  topics: [
    { id: 't01', title: 'Evidence of Chemical Reaction', pagesCount: 4, approvedPages: 4 },
    { id: 't02', title: 'Chemical Equation and Notation', pagesCount: 4, approvedPages: 3 },
    { id: 't03', title: 'Types of Chemical Reactions', pagesCount: 4, approvedPages: 0 },
    { id: 't04', title: 'Exothermic and Endothermic', pagesCount: 3, approvedPages: 0 },
    { id: 't05', title: 'Oxidation, Reduction and Redox', pagesCount: 3, approvedPages: 0 },
    { id: 't06', title: 'Corrosion and Rancidity', pagesCount: 4, approvedPages: 0 },
  ],
  conceptPages: [
    {
      id: 'p-t03-01', topicId: 't03', topicTitle: 'Types of Chemical Reactions',
      title: 'Combination Reactions', sequence: 1, reviewStatus: 'pending',
      blocks: [
        { id: 'b1', type: 'text', content: 'When two or more substances combine to form a single product, the reaction is called a **combination reaction**. General form: A + B → AB' },
        { id: 'b2', type: 'remember', content: 'REMEMBER: In combination reactions, always one product is formed from two or more reactants.' },
        { id: 'b3', type: 'image', imageSpec: 'Diagram showing CaO + H₂O → Ca(OH)₂ with labels' },
      ],
    },
    {
      id: 'p-t03-02', topicId: 't03', topicTitle: 'Types of Chemical Reactions',
      title: 'Decomposition Reactions', sequence: 2, reviewStatus: 'approved',
      blocks: [
        { id: 'b4', type: 'text', content: 'A decomposition reaction is the opposite of combination. A single compound breaks down into two or more simpler substances. General form: AB → A + B' },
        { id: 'b5', type: 'remember', content: 'REMEMBER: Heat, light, or electricity causes decomposition.' },
      ],
    },
  ],
  questions: [
    {
      id: 'q001', topicId: 't03', topicTitle: 'Types of Reactions', type: 1,
      section: 'A', marks: 1, difficulty: 'easy', reviewStatus: 'approved',
      question: 'Which of the following is an example of a combination reaction?',
      options: ['CaCO₃ → CaO + CO₂', 'CaO + H₂O → Ca(OH)₂', 'Fe + CuSO₄ → FeSO₄ + Cu', 'AgNO₃ + NaCl → AgCl + NaNO₃'],
      correctAnswer: 'CaO + H₂O → Ca(OH)₂',
      explanation: 'CaO + H₂O → Ca(OH)₂ is a combination reaction as two substances combine to form one product.',
      attemptPool: 1,
    },
    {
      id: 'q002', topicId: 't05', topicTitle: 'Oxidation & Reduction', type: 1,
      section: 'A', marks: 1, difficulty: 'medium', reviewStatus: 'pending',
      question: 'In the reaction CuO + H₂ → Cu + H₂O, hydrogen is:',
      options: ['Oxidised', 'Reduced', 'Neither oxidised nor reduced', 'Both oxidised and reduced'],
      correctAnswer: 'Oxidised',
      explanation: 'Hydrogen gains oxygen to form water, so it is oxidised. OIL — Oxidation Is Loss (of electrons / gain of oxygen).',
      attemptPool: 1,
    },
    {
      id: 'q003', topicId: 't04', topicTitle: 'Exo/Endothermic', type: 2,
      section: 'C', marks: 3, difficulty: 'medium', reviewStatus: 'pending',
      question: 'Explain why burning of magnesium in air is an exothermic reaction. Write the balanced equation.',
      explanation: 'Burning releases energy as heat and light. 2Mg + O₂ → 2MgO + heat (energy). Exothermic = energy released to surroundings.',
    },
  ],
  images: [
    {
      id: 'img-01', topicId: 't04', topicTitle: 'Exo/Endothermic',
      conceptMapping: 'Energy vs Time graph — Exothermic reaction',
      purpose: 'Show energy decreases over reaction progress for exothermic reactions',
      elements: 'X-axis: Reaction Progress, Y-axis: Energy, Downward curve, Reactants level above Products level, ΔH arrow pointing down',
      labels: 'Reactants, Products, Activation Energy, ΔH (negative)',
      generationPrompt: 'Clean educational diagram: energy vs reaction progress graph for exothermic reaction. Shows reactants at higher energy than products. Activation energy hump visible. Clear labels: Reactants, Products, Activation Energy, ΔH. White background, blue curve, professional chemistry textbook style.',
      reviewStatus: 'pending',
    },
    {
      id: 'img-02', topicId: 't05', topicTitle: 'Redox',
      conceptMapping: 'OIL RIG mnemonic visual',
      purpose: 'Help students remember oxidation and reduction definitions',
      elements: 'Two columns: OIL (Oxidation Is Loss) and RIG (Reduction Is Gain), electron arrows',
      labels: 'OIL, RIG, electrons lost/gained',
      generationPrompt: 'Educational mnemonic diagram OIL RIG. Left column OIL: Oxidation Is Loss (of electrons). Right column RIG: Reduction Is Gain (of electrons). Arrow showing electron transfer. Clean flat design, white background, indigo and green color scheme.',
      generatedUrl: 'https://placehold.co/400x300?text=OIL+RIG+Diagram',
      reviewStatus: 'generated',
    },
  ],
  attemptPools: {
    1: ['q001', 'q002'],
    2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [],
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConceptPagesTab({ draft, chapterId }: { draft: DraftContent; chapterId: string }) {
  const [selectedTopic, setSelectedTopic] = useState(draft.topics[0]?.id || '');
  const [updating, setUpdating] = useState<string | null>(null);

  const pages = draft.conceptPages.filter(p => p.topicId === selectedTopic);

  async function handleApprove(page: ConceptPage) {
    setUpdating(page.id);
    try { await api.draft.approvePage(chapterId, page.id); }
    catch { /* pipeline not running */ }
    finally { setUpdating(null); }
  }

  async function handleReject(page: ConceptPage) {
    setUpdating(page.id);
    try { await api.draft.rejectPage(chapterId, page.id); }
    catch { /* pipeline not running */ }
    finally { setUpdating(null); }
  }

  return (
    <div className="review-layout">
      <div className="review-sidebar">
        <h3>Topics</h3>
        {draft.topics.map(t => (
          <div
            key={t.id}
            className={`topic-item ${selectedTopic === t.id ? 'active' : ''}`}
            onClick={() => setSelectedTopic(t.id)}
          >
            <span className="truncate">{t.title}</span>
            <span className="text-sm" style={{
              color: t.approvedPages === t.pagesCount ? 'var(--success)' : 'var(--text-dim)',
            }}>
              {t.approvedPages}/{t.pagesCount}
            </span>
          </div>
        ))}
      </div>

      <div className="review-main">
        <div className="flex justify-between items-center mb-16">
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>
            {draft.topics.find(t => t.id === selectedTopic)?.title}
          </h3>
          <button className="btn-success btn-sm" onClick={() => pages.forEach(p => handleApprove(p))}>
            Approve All
          </button>
        </div>

        {pages.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📝</div>
            <h3>No pages for this topic</h3>
            <p>Select another topic or trigger reprocessing.</p>
          </div>
        ) : (
          pages.map(page => (
            <div key={page.id} className="page-card">
              <div className="page-card-header">
                <h4>{page.sequence}. {page.title}</h4>
                <span className={`badge badge-${page.reviewStatus}`}>{page.reviewStatus}</span>
              </div>
              <div className="page-card-body">
                {page.blocks.map(block => (
                  <div key={block.id} className={`block-preview ${block.type}`}>
                    {block.type === 'text' && block.content}
                    {block.type === 'remember' && `⭐ ${block.content}`}
                    {block.type === 'image' && `🖼️ [Image] ${block.imageSpec}`}
                  </div>
                ))}
                <div className="page-card-actions">
                  <button
                    className="btn-success btn-sm"
                    disabled={page.reviewStatus === 'approved' || updating === page.id}
                    onClick={() => handleApprove(page)}
                  >
                    {updating === page.id ? '...' : '✓ Approve'}
                  </button>
                  <button
                    className="btn-danger btn-sm"
                    disabled={updating === page.id}
                    onClick={() => handleReject(page)}
                  >
                    ✗ Reject
                  </button>
                  <button className="btn-ghost btn-sm">✏️ Edit</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function QuestionsTab({ draft, chapterId }: { draft: DraftContent; chapterId: string }) {
  const [typeFilter, setTypeFilter] = useState<'all' | 1 | 2>('all');
  const [sectionFilter, setSectionFilter] = useState<'all' | 'A' | 'B' | 'C' | 'D'>('all');

  const filtered = draft.questions.filter(q => {
    if (typeFilter !== 'all' && q.type !== typeFilter) return false;
    if (sectionFilter !== 'all' && q.section !== sectionFilter) return false;
    return true;
  });

  return (
    <div style={{ padding: '0 4px' }}>
      {/* Filter bar */}
      <div className="flex gap-12 items-center mb-16">
        <div className="flex gap-8">
          {(['all', 1, 2] as const).map(t => (
            <button
              key={t}
              className={typeFilter === t ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
              onClick={() => setTypeFilter(t)}
            >
              {t === 'all' ? 'All Types' : `Type ${t}`}
            </button>
          ))}
        </div>
        <div className="flex gap-8">
          {(['all', 'A', 'B', 'C', 'D'] as const).map(s => (
            <button
              key={s}
              className={sectionFilter === s ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
              onClick={() => setSectionFilter(s)}
            >
              {s === 'all' ? 'All Sections' : `Section ${s}`}
            </button>
          ))}
        </div>
        <span className="text-sm text-muted" style={{ marginLeft: 'auto' }}>
          {filtered.length} questions
        </span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {filtered.length === 0 ? (
          <div className="empty"><p>No questions match filters.</p></div>
        ) : (
          filtered.map(q => (
            <div key={q.id} className="q-row">
              <div className="q-text">{q.question}</div>
              {q.options && (
                <div className="flex flex-col gap-8 mb-8" style={{ paddingLeft: 12 }}>
                  {q.options.map((opt, i) => (
                    <div key={i} style={{
                      fontSize: 12, color: opt === q.correctAnswer ? 'var(--success)' : 'var(--text-muted)',
                      fontWeight: opt === q.correctAnswer ? 600 : 400,
                    }}>
                      {opt === q.correctAnswer ? '✓ ' : '  '}{String.fromCharCode(65 + i)}. {opt}
                    </div>
                  ))}
                </div>
              )}
              <div className="q-meta">
                <span className="q-tag q-tag-section">Section {q.section}</span>
                <span className="q-tag q-tag-marks">{q.marks}M</span>
                <span className="q-tag q-tag-diff">{q.difficulty}</span>
                <span className="q-tag q-tag-topic">Type {q.type}</span>
                <span className="q-tag q-tag-topic">{q.topicTitle}</span>
                {q.attemptPool && <span className="q-tag" style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--primary)' }}>Attempt {q.attemptPool}</span>}
                <span className={`badge badge-${q.reviewStatus}`} style={{ fontSize: 10, padding: '2px 7px' }}>{q.reviewStatus}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <button className="btn-success btn-sm" disabled={q.reviewStatus === 'approved'}
                    onClick={() => api.draft.approveQuestion(chapterId, q.id).catch(() => {})}>
                    ✓
                  </button>
                  <button className="btn-danger btn-sm"
                    onClick={() => api.draft.rejectQuestion(chapterId, q.id).catch(() => {})}>
                    ✗
                  </button>
                  <button className="btn-ghost btn-sm">✏️</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ImagesTab({ draft, chapterId }: { draft: DraftContent; chapterId: string }) {
  const [generating, setGenerating] = useState<string | null>(null);

  async function handleGenerate(img: ImageSpec) {
    setGenerating(img.id);
    try { await api.draft.generateImage(chapterId, img.id); }
    catch { /* pipeline not running */ }
    finally { setGenerating(null); }
  }

  return (
    <div>
      <div className="alert alert-info mb-16">
        🖼️ Images are spec'd by Claude API. Click "Generate" to create via DALL-E 3. Review and
        approve before publishing.
      </div>
      <div className="grid-2">
        {draft.images.map(img => (
          <div key={img.id} className="card">
            <div className="flex justify-between items-center mb-12">
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{img.conceptMapping}</div>
                <div className="text-sm text-muted mt-8">{img.topicTitle}</div>
              </div>
              <span className={`badge badge-${img.reviewStatus}`}>{img.reviewStatus}</span>
            </div>

            {img.generatedUrl ? (
              <img
                src={img.generatedUrl}
                alt={img.conceptMapping}
                style={{ width: '100%', borderRadius: 6, marginBottom: 12, border: '1px solid var(--border)' }}
              />
            ) : (
              <div style={{
                background: 'var(--bg)', border: '1px dashed var(--border)', borderRadius: 6,
                height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-dim)', fontSize: 12, marginBottom: 12,
              }}>
                Image not yet generated
              </div>
            )}

            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
              <strong>Prompt:</strong> {img.generationPrompt.slice(0, 120)}...
            </div>

            <div className="flex gap-8">
              <button
                className="btn-secondary btn-sm"
                disabled={generating === img.id}
                onClick={() => handleGenerate(img)}
                style={{ flex: 1 }}
              >
                {generating === img.id ? '⟳ Generating...' : '🎨 Generate Image'}
              </button>
              {img.reviewStatus === 'generated' && (
                <button className="btn-success btn-sm"
                  onClick={() => api.draft.approveImage(chapterId, img.id).catch(() => {})}>
                  ✓ Approve
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttemptPoolsTab({ draft }: { draft: DraftContent }) {
  const allQ = draft.questions;
  const sectionColors: Record<string, string> = {
    A: 'var(--primary)', B: 'var(--info)', C: 'var(--warning)', D: 'var(--danger)',
  };

  return (
    <div>
      <div className="alert alert-info mb-16">
        🗂️ Questions are auto-distributed across 8 attempt pools. Each attempt draws 10 MCQs
        (Section A), 5×2M (B), 5×3M (C), 3×5M (D) = 50 marks. 15-day lock between attempts.
      </div>
      <div className="attempt-grid">
        {Array.from({ length: 8 }, (_, i) => i + 1).map(attempt => {
          const qIds = draft.attemptPools[attempt] || [];
          const poolQ = allQ.filter(q => qIds.includes(q.id));
          const bySec = { A: poolQ.filter(q => q.section === 'A'), B: poolQ.filter(q => q.section === 'B'), C: poolQ.filter(q => q.section === 'C'), D: poolQ.filter(q => q.section === 'D') };
          return (
            <div key={attempt} className="attempt-col">
              <h4>
                Attempt {attempt}
                <span style={{ color: 'var(--text-dim)', fontWeight: 400, marginLeft: 6 }}>
                  Day {(attempt - 1) * 15}
                </span>
              </h4>
              {(['A', 'B', 'C', 'D'] as const).map(sec => (
                <div key={sec} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                    Section {sec} ({bySec[sec].length})
                  </div>
                  {bySec[sec].length === 0 ? (
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', fontStyle: 'italic' }}>
                      empty
                    </div>
                  ) : (
                    bySec[sec].map(q => (
                      <div key={q.id} className="attempt-chip">
                        <span className="truncate" style={{ maxWidth: 100, fontSize: 10 }}>
                          {q.question.slice(0, 30)}…
                        </span>
                        <span className="section-tag" style={{ color: sectionColors[q.section] }}>
                          {q.section}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Review Page ──────────────────────────────────────────────────────────────

type Tab = 'concept_pages' | 'questions' | 'images' | 'attempt_pools';

interface Props {
  chapterId: string;
  initialTab?: string;
  onPublish: (chapterId: string) => void;
  onBack: () => void;
}

export default function Review({ chapterId, initialTab, onPublish, onBack }: Props) {
  const [tab, setTab] = useState<Tab>((initialTab as Tab) || 'concept_pages');
  const [draft, setDraft] = useState<DraftContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [useMock, setUseMock] = useState(false);

  useEffect(() => {
    api.draft.get(chapterId)
      .then(setDraft)
      .catch(() => { setUseMock(true); setDraft(MOCK_DRAFT); })
      .finally(() => setLoading(false));
  }, [chapterId]);

  if (loading) return <div className="page-body"><div className="empty">Loading draft...</div></div>;
  if (!draft) return <div className="page-body"><div className="empty">No draft found.</div></div>;

  const approvedPages = draft.conceptPages.filter(p => p.reviewStatus === 'approved').length;
  const approvedQ = draft.questions.filter(q => q.reviewStatus === 'approved').length;
  const approvedImg = draft.images.filter(i => i.reviewStatus === 'approved').length;
  const readyToPublish = approvedPages > 0 && approvedQ > 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h2>{draft.chapterName}</h2>
          <p>Review AI-generated content before publishing to EduLLM</p>
        </div>
        <div className="flex gap-12 items-center">
          {useMock && <span className="badge badge-draft">Demo Data</span>}
          <button className="btn-secondary" onClick={onBack}>← Chapters</button>
          <button
            className="btn-primary"
            disabled={!readyToPublish}
            onClick={() => onPublish(chapterId)}
          >
            Publish →
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
      }}>
        {[
          { label: 'Concept Pages', val: `${approvedPages}/${draft.conceptPages.length}`, ok: approvedPages === draft.conceptPages.length },
          { label: 'Questions', val: `${approvedQ}/${draft.questions.length}`, ok: approvedQ === draft.questions.length },
          { label: 'Images', val: `${approvedImg}/${draft.images.length}`, ok: approvedImg === draft.images.length },
          { label: 'Attempt Pools', val: '8', ok: true },
        ].map(s => (
          <div key={s.label} style={{ padding: '10px 20px', borderRight: '1px solid var(--border)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: s.ok ? 'var(--success)' : 'var(--warning)' }}>
              {s.val}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label} approved</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '0 28px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="tabs" style={{ marginBottom: 0 }}>
          {([
            { key: 'concept_pages', label: '📝 Concept Pages' },
            { key: 'questions', label: '❓ Questions' },
            { key: 'images', label: '🖼️ Images' },
            { key: 'attempt_pools', label: '🗂️ Attempt Pools' },
          ] as const).map(t => (
            <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="page-body">
        {tab === 'concept_pages' && <ConceptPagesTab draft={draft} chapterId={chapterId} />}
        {tab === 'questions' && <QuestionsTab draft={draft} chapterId={chapterId} />}
        {tab === 'images' && <ImagesTab draft={draft} chapterId={chapterId} />}
        {tab === 'attempt_pools' && <AttemptPoolsTab draft={draft} />}
      </div>
    </>
  );
}
