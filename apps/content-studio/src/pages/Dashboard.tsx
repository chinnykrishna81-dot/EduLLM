import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Chapter, ChapterStatus } from '../types';

const STATUS_LABELS: Record<ChapterStatus, string> = {
  not_started: 'Not Started',
  processing: 'Processing',
  draft: 'Draft',
  in_review: 'In Review',
  published: 'Published',
};

const SUBJECT_LABELS: Record<string, string> = {
  science: 'Science', maths: 'Maths', physics: 'Physics',
  chemistry: 'Chemistry', biology: 'Biology',
};

function StatusBadge({ status }: { status: ChapterStatus }) {
  return (
    <span className={`badge badge-${status.replace('_', '-')}`}>
      {status === 'processing' && <span className="spin">⟳</span>}
      {STATUS_LABELS[status]}
    </span>
  );
}

const MOCK_CHAPTERS: Chapter[] = [
  {
    id: 'ch-chem-1', subject: 'science', name: 'Chemical Reactions and Equations',
    chapterNumber: 1, status: 'in_review', topicsCount: 6, questionsCount: 162, imagesCount: 12,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
];

interface Props {
  onNewChapter: () => void;
  onOpenChapter: (id: string, status: ChapterStatus) => void;
}

export default function Dashboard({ onNewChapter, onOpenChapter }: Props) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.chapters.list()
      .then(setChapters)
      .catch(() => {
        setError('Content pipeline service not running — showing demo data.');
        setChapters(MOCK_CHAPTERS);
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: chapters.length,
    published: chapters.filter(c => c.status === 'published').length,
    inReview: chapters.filter(c => c.status === 'in_review' || c.status === 'draft').length,
    processing: chapters.filter(c => c.status === 'processing').length,
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h2>Chapters</h2>
          <p>Manage CBSE content pipeline — upload, process, review, publish</p>
        </div>
        <button className="btn-primary" onClick={onNewChapter}>+ New Chapter</button>
      </div>

      <div className="page-body">
        {error && <div className="alert alert-warning">⚠️ {error}</div>}

        {/* Summary stats */}
        <div className="grid-4 mb-24">
          {[
            { label: 'Total Chapters', value: stats.total, color: 'var(--primary)' },
            { label: 'Published', value: stats.published, color: 'var(--success)' },
            { label: 'In Review', value: stats.inReview, color: 'var(--warning)' },
            { label: 'Processing', value: stats.processing, color: 'var(--info)' },
          ].map(s => (
            <div className="card card-sm" key={s.label}>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div className="text-sm text-muted mt-8">{s.label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="empty"><div>Loading chapters...</div></div>
        ) : chapters.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📂</div>
            <h3>No chapters yet</h3>
            <p>Upload 3 PDFs to start processing your first chapter.</p>
            <button className="btn-primary mt-16" onClick={onNewChapter}>+ New Chapter</button>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Chapter</th>
                    <th>Subject</th>
                    <th>Topics</th>
                    <th>Questions</th>
                    <th>Images</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {chapters.map(ch => (
                    <tr key={ch.id}>
                      <td style={{ color: 'var(--text-muted)', width: 40 }}>{ch.chapterNumber}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{ch.name}</div>
                        <div className="text-sm text-muted">
                          Updated {new Date(ch.updatedAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-in-review" style={{ textTransform: 'capitalize' }}>
                          {SUBJECT_LABELS[ch.subject] || ch.subject}
                        </span>
                      </td>
                      <td>{ch.topicsCount}</td>
                      <td>{ch.questionsCount}</td>
                      <td>{ch.imagesCount}</td>
                      <td><StatusBadge status={ch.status} /></td>
                      <td>
                        <div className="flex gap-8">
                          {ch.status === 'processing' && (
                            <button className="btn-ghost btn-sm"
                              onClick={() => onOpenChapter(ch.id, ch.status)}>
                              View Progress
                            </button>
                          )}
                          {(ch.status === 'draft' || ch.status === 'in_review') && (
                            <button className="btn-secondary btn-sm"
                              onClick={() => onOpenChapter(ch.id, ch.status)}>
                              Review
                            </button>
                          )}
                          {ch.status === 'in_review' && (
                            <button className="btn-primary btn-sm"
                              onClick={() => onOpenChapter(ch.id, ch.status)}>
                              Publish
                            </button>
                          )}
                          {ch.status === 'published' && (
                            <span style={{ color: 'var(--success)', fontSize: 12 }}>✓ Live</span>
                          )}
                          {ch.status === 'not_started' && (
                            <button className="btn-ghost btn-sm"
                              onClick={() => onOpenChapter(ch.id, ch.status)}>
                              Start
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
