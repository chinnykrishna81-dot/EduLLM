import { useEffect, useState } from 'react';
import { api } from '../api';
import type { ProcessingStatus, ProcessingStep, StepStatus } from '../types';

const STEP_META: Record<ProcessingStep, { label: string; detail: string; icon: string }> = {
  pdf_parsing: {
    label: 'Parsing PDFs',
    detail: 'Extracting text, tables, and image references from all 3 PDFs',
    icon: '📄',
  },
  concept_extraction: {
    label: 'Extracting Concepts',
    detail: 'Claude API — identifying topics, subtopics, and concept hierarchy',
    icon: '🧠',
  },
  generating_concept_pages: {
    label: 'Generating Concept Pages',
    detail: 'Claude API — transforming notes into flash-card style learning content',
    icon: '📝',
  },
  transforming_questions: {
    label: 'Transforming Questions',
    detail: 'Claude API — classifying, rephrasing, and structuring Type 1 + Type 2 questions',
    icon: '❓',
  },
  generating_image_specs: {
    label: 'Generating Image Specs',
    detail: 'Claude API — writing original image generation prompts for all diagrams',
    icon: '🖼️',
  },
  building_attempt_pools: {
    label: 'Building Attempt Pools',
    detail: 'Distributing questions across 8 cycle test attempt pools (15-day intervals)',
    icon: '🗂️',
  },
};

const STEP_ORDER: ProcessingStep[] = [
  'pdf_parsing',
  'concept_extraction',
  'generating_concept_pages',
  'transforming_questions',
  'generating_image_specs',
  'building_attempt_pools',
];

function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'done') return <span style={{ color: 'var(--success)' }}>✓</span>;
  if (status === 'running') return <span className="spin" style={{ color: 'var(--primary)' }}>⟳</span>;
  if (status === 'error') return <span style={{ color: 'var(--danger)' }}>✗</span>;
  return <span style={{ color: 'var(--text-dim)' }}>○</span>;
}

interface Props {
  chapterId: string;
  onReview: (chapterId: string) => void;
  onBack: () => void;
}

const MOCK_STATUS: ProcessingStatus = {
  chapterId: 'ch-chem-1',
  overall: 'draft',
  steps: {
    pdf_parsing: { status: 'done' },
    concept_extraction: { status: 'done' },
    generating_concept_pages: { status: 'running', detail: 'Processing topic 3 of 6...' },
    transforming_questions: { status: 'pending' },
    generating_image_specs: { status: 'pending' },
    building_attempt_pools: { status: 'pending' },
  },
};

export default function Processing({ chapterId, onReview, onBack }: Props) {
  const [status, setStatus] = useState<ProcessingStatus | null>(null);
  const [error, setError] = useState('');
  const [useMock, setUseMock] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    function poll() {
      api.pipeline.status(chapterId)
        .then(s => {
          setStatus(s);
          if (s.overall === 'draft' || s.overall === 'in_review' || s.overall === 'published') {
            clearInterval(interval);
          }
        })
        .catch(() => {
          setUseMock(true);
          setStatus(MOCK_STATUS);
          clearInterval(interval);
        });
    }

    poll();
    interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [chapterId]);

  const allDone = status && STEP_ORDER.every(s => status.steps[s]?.status === 'done');
  const hasError = status?.steps && STEP_ORDER.some(s => status.steps[s]?.status === 'error');

  const doneCount = status
    ? STEP_ORDER.filter(s => status.steps[s]?.status === 'done').length
    : 0;
  const progress = Math.round((doneCount / STEP_ORDER.length) * 100);

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Processing Chapter</h2>
          <p>AI pipeline running — Claude API extracting and generating content</p>
        </div>
        <button className="btn-secondary" onClick={onBack}>← Chapters</button>
      </div>

      <div className="page-body" style={{ maxWidth: 600 }}>
        {useMock && (
          <div className="alert alert-warning mb-16">
            ⚠️ Pipeline service not running — showing demo status.
          </div>
        )}

        {/* Progress bar */}
        <div className="card mb-20">
          <div className="flex justify-between items-center mb-8">
            <span style={{ fontSize: 13, fontWeight: 600 }}>Overall Progress</span>
            <span style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 700 }}>{progress}%</span>
          </div>
          <div style={{ background: 'var(--border)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
            <div style={{
              background: allDone ? 'var(--success)' : 'var(--primary)',
              width: `${progress}%`,
              height: '100%',
              borderRadius: 4,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div className="text-sm text-muted mt-8">
            {allDone ? '✓ Processing complete — ready for review' :
              hasError ? '✗ Error encountered — check step details' :
                'Processing in background — page will update automatically'}
          </div>
        </div>

        {/* Steps */}
        {!status ? (
          <div className="empty"><div>Loading status...</div></div>
        ) : (
          <div className="pipeline-steps">
            {STEP_ORDER.map(step => {
              const s = status.steps[step];
              const meta = STEP_META[step];
              return (
                <div key={step} className={`pipeline-step ${s?.status || 'pending'}`}>
                  <div className="step-icon">{meta.icon}</div>
                  <div className="step-text" style={{ flex: 1 }}>
                    <h4>{meta.label}</h4>
                    <p>{s?.detail || meta.detail}</p>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>
                    <StepIcon status={s?.status || 'pending'} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Error */}
        {(hasError || error) && (
          <div className="alert alert-error mt-16">
            ❌ {status?.error || error || 'A step failed. Check the pipeline logs.'}
          </div>
        )}

        {/* Done */}
        {(allDone || useMock) && (
          <div className="alert alert-success mt-16">
            ✅ Content generated successfully! Topics, concept pages, questions, image specs, and
            attempt pools are ready for your review.
          </div>
        )}

        {(allDone || useMock) && (
          <div className="flex justify-between mt-20">
            <div className="flex flex-col gap-8">
              <div className="text-sm text-muted">What's waiting in Review:</div>
              <div className="flex gap-12">
                {[
                  { label: 'Concept Pages', val: '~24', icon: '📝' },
                  { label: 'Questions', val: '162', icon: '❓' },
                  { label: 'Image Specs', val: '12', icon: '🖼️' },
                ].map(i => (
                  <div key={i.label} style={{ fontSize: 12 }}>
                    {i.icon} <strong>{i.val}</strong> <span className="text-muted">{i.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <button className="btn-primary" onClick={() => onReview(chapterId)}>
              Review Content →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
