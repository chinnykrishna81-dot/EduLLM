import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Processing from './pages/Processing';
import Review from './pages/Review';
import Publish from './pages/Publish';

type Page =
  | { name: 'dashboard' }
  | { name: 'upload' }
  | { name: 'processing'; chapterId: string }
  | { name: 'review'; chapterId: string; tab?: string }
  | { name: 'publish'; chapterId: string };

export default function App() {
  const [page, setPage] = useState<Page>({ name: 'dashboard' });

  const nav = {
    dashboard: () => setPage({ name: 'dashboard' }),
    upload: () => setPage({ name: 'upload' }),
    processing: (id: string) => setPage({ name: 'processing', chapterId: id }),
    review: (id: string, tab?: string) => setPage({ name: 'review', chapterId: id, tab }),
    publish: (id: string) => setPage({ name: 'publish', chapterId: id }),
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>Content Studio</h1>
          <p>EduLLM Content Pipeline</p>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${page.name === 'dashboard' ? 'active' : ''}`}
            onClick={nav.dashboard}
          >
            <span className="icon">📚</span> Chapters
          </button>
          <button
            className={`nav-item ${page.name === 'upload' ? 'active' : ''}`}
            onClick={nav.upload}
          >
            <span className="icon">➕</span> New Chapter
          </button>
          {(page.name === 'processing' || page.name === 'review' || page.name === 'publish') && (
            <>
              <hr className="divider" style={{ margin: '8px 0' }} />
              <button
                className={`nav-item ${page.name === 'processing' ? 'active' : ''}`}
                onClick={() =>
                  page.name !== 'dashboard' && page.name !== 'upload'
                    ? nav.processing((page as any).chapterId)
                    : undefined
                }
              >
                <span className="icon">⚙️</span> Processing
              </button>
              <button
                className={`nav-item ${page.name === 'review' ? 'active' : ''}`}
                onClick={() =>
                  page.name !== 'dashboard' && page.name !== 'upload'
                    ? nav.review((page as any).chapterId)
                    : undefined
                }
              >
                <span className="icon">🔍</span> Review
              </button>
              <button
                className={`nav-item ${page.name === 'publish' ? 'active' : ''}`}
                onClick={() =>
                  page.name !== 'dashboard' && page.name !== 'upload'
                    ? nav.publish((page as any).chapterId)
                    : undefined
                }
              >
                <span className="icon">🚀</span> Publish
              </button>
            </>
          )}
        </nav>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Admin only</div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>v0.1.0</div>
        </div>
      </aside>

      <main className="main">
        {page.name === 'dashboard' && (
          <Dashboard onNewChapter={nav.upload} onOpenChapter={(id, status) => {
            if (status === 'not_started') nav.upload();
            else if (status === 'processing') nav.processing(id);
            else if (status === 'published') nav.review(id);
            else nav.review(id);
          }} />
        )}
        {page.name === 'upload' && (
          <Upload onProcessing={nav.processing} onBack={nav.dashboard} />
        )}
        {page.name === 'processing' && (
          <Processing
            chapterId={page.chapterId}
            onReview={nav.review}
            onBack={nav.dashboard}
          />
        )}
        {page.name === 'review' && (
          <Review
            chapterId={page.chapterId}
            initialTab={page.tab}
            onPublish={nav.publish}
            onBack={nav.dashboard}
          />
        )}
        {page.name === 'publish' && (
          <Publish
            chapterId={page.chapterId}
            onDone={nav.dashboard}
            onBack={() => nav.review(page.chapterId)}
          />
        )}
      </main>
    </div>
  );
}
