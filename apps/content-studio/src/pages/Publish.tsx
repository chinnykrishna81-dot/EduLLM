import { useState } from 'react';
import { api } from '../api';

interface Props {
  chapterId: string;
  onDone: () => void;
  onBack: () => void;
}

export default function Publish({ chapterId, onDone, onBack }: Props) {
  const [publishing, setPublishing] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [edullmId, setEdullmId] = useState('');

  async function handlePublish() {
    setPublishing(true);
    setError('');
    try {
      const result = await api.publish.publish(chapterId);
      setEdullmId(result.edullmChapterId);
      setDone(true);
    } catch (e: any) {
      setError(e.message || 'Publish failed. Is the pipeline service running?');
    } finally {
      setPublishing(false);
    }
  }

  if (done) {
    return (
      <>
        <div className="page-header">
          <h2>Published Successfully</h2>
        </div>
        <div className="page-body" style={{ maxWidth: 560 }}>
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Chapter is Live</h3>
            <p className="text-muted mb-20">
              The chapter is now available in EduLLM for students and teachers.
            </p>
            {edullmId && (
              <div className="alert alert-success mb-20">
                EduLLM Chapter ID: <strong>{edullmId}</strong>
              </div>
            )}
            <div className="flex gap-12" style={{ justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={onBack}>Review Again</button>
              <button className="btn-primary" onClick={onDone}>← All Chapters</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Publish Chapter</h2>
          <p>Push approved content to EduLLM — it will go live immediately</p>
        </div>
        <button className="btn-secondary" onClick={onBack}>← Review</button>
      </div>

      <div className="page-body" style={{ maxWidth: 560 }}>
        {/* Stats */}
        <div className="publish-stats">
          {[
            { label: 'Concept Pages', num: 24, icon: '📝' },
            { label: 'Questions', num: 162, icon: '❓' },
            { label: 'Images', num: 12, icon: '🖼️' },
            { label: 'Attempt Pools', num: 8, icon: '🗂️' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* What happens */}
        <div className="card mb-20">
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>What happens when you publish:</h4>
          <div className="flex flex-col gap-12">
            {[
              { icon: '📝', text: 'Concept pages are pushed as topic pages in EduLLM' },
              { icon: '❓', text: 'Questions are added to the question bank, tagged by topic and section' },
              { icon: '🖼️', text: 'Approved images are uploaded to EduLLM media storage' },
              { icon: '🗂️', text: '8 attempt pools are configured with 15-day lock intervals' },
              { icon: '✅', text: 'Chapter status changes to Published — visible to students' },
            ].map(item => (
              <div key={item.icon} className="flex gap-12 items-center" style={{ fontSize: 13 }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Warnings */}
        <div className="alert alert-warning mb-20">
          ⚠️ Unapproved questions and images will be published as <strong>draft</strong> status —
          visible to admins only until approved in the CMS.
        </div>

        {error && <div className="alert alert-error mb-16">❌ {error}</div>}

        <div className="flex gap-12">
          <button className="btn-secondary" onClick={onBack} disabled={publishing}>
            ← Back to Review
          </button>
          <button className="btn-primary" onClick={handlePublish} disabled={publishing}
            style={{ flex: 1 }}>
            {publishing ? '⟳ Publishing to EduLLM...' : '🚀 Publish to EduLLM'}
          </button>
        </div>
      </div>
    </>
  );
}
