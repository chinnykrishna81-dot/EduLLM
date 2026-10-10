import { useRef, useState } from 'react';
import { api } from '../api';

type Step = 'info' | 'upload' | 'confirm';

interface ChapterInfo {
  subject: string;
  name: string;
  chapterNumber: number;
}

interface UploadZoneProps {
  label: string;
  hint: string;
  file: File | null;
  onChange: (f: File) => void;
}

function UploadZone({ label, hint, file, onChange }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className={`upload-zone ${file ? 'has-file' : ''} ${dragging ? 'drag-over' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault(); setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f && f.type === 'application/pdf') onChange(f);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        onChange={e => e.target.files?.[0] && onChange(e.target.files[0])}
      />
      <div className="upload-icon">{file ? '✅' : '📄'}</div>
      <div className="upload-label">{label}</div>
      <div className="upload-hint">{hint}</div>
      {file && <div className="upload-filename">📎 {file.name}</div>}
      {!file && <div className="upload-hint" style={{ marginTop: 8 }}>Click or drag PDF here</div>}
    </div>
  );
}

interface Props {
  onProcessing: (chapterId: string) => void;
  onBack: () => void;
}

export default function Upload({ onProcessing, onBack }: Props) {
  const [step, setStep] = useState<Step>('info');
  const [info, setInfo] = useState<ChapterInfo>({ subject: 'science', name: '', chapterNumber: 1 });
  const [notesPdf, setNotesPdf] = useState<File | null>(null);
  const [qaPdf, setQaPdf] = useState<File | null>(null);
  const [mcqPdf, setMcqPdf] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const infoValid = info.name.trim().length > 0 && info.chapterNumber > 0;
  const pdfsValid = notesPdf && qaPdf && mcqPdf;

  async function handleStart() {
    if (!pdfsValid) return;
    setLoading(true);
    setError('');
    try {
      const chapter = await api.chapters.create(info);
      await api.upload.pdfs(chapter.id, notesPdf!, qaPdf!, mcqPdf!);
      await api.pipeline.process(chapter.id);
      onProcessing(chapter.id);
    } catch (e: any) {
      setError(e.message || 'Failed to start processing. Is the content pipeline running?');
      setLoading(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h2>New Chapter</h2>
          <p>Upload 3 PDFs to start AI-powered content generation</p>
        </div>
        <button className="btn-secondary" onClick={onBack}>← Back</button>
      </div>

      <div className="page-body" style={{ maxWidth: 680 }}>
        {/* Steps */}
        <div className="steps mb-24">
          {(['info', 'upload', 'confirm'] as Step[]).map((s, i) => (
            <div key={s} className={`step ${step === s ? 'active' : (
              (step === 'upload' && i === 0) || (step === 'confirm' && i <= 1) ? 'done' : ''
            )}`}>
              <div className="step-num">{
                (step === 'upload' && i === 0) || (step === 'confirm' && i <= 1) ? '✓' : i + 1
              }</div>
              <div className="step-label">
                {s === 'info' ? 'Chapter Info' : s === 'upload' ? 'Upload PDFs' : 'Start Processing'}
              </div>
            </div>
          ))}
        </div>

        {error && <div className="alert alert-error mb-16">❌ {error}</div>}

        {/* Step 1 — Info */}
        {step === 'info' && (
          <div className="card">
            <div className="mb-20">
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Chapter Details</h3>
              <div className="form-row mb-16">
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <select value={info.subject} onChange={e => setInfo({ ...info, subject: e.target.value })}>
                    <option value="science">Science (Class 10)</option>
                    <option value="maths">Maths (Class 10)</option>
                    <option value="physics">Physics</option>
                    <option value="chemistry">Chemistry</option>
                    <option value="biology">Biology</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Chapter Number</label>
                  <input
                    type="number" min={1} max={50}
                    value={info.chapterNumber}
                    onChange={e => setInfo({ ...info, chapterNumber: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Chapter Name</label>
                <input
                  type="text"
                  placeholder="e.g. Chemical Reactions and Equations"
                  value={info.name}
                  onChange={e => setInfo({ ...info, name: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-muted text-sm">CBSE Class 10 content pipeline</span>
              <button
                className="btn-primary"
                disabled={!infoValid}
                onClick={() => setStep('upload')}
              >
                Next: Upload PDFs →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Upload */}
        {step === 'upload' && (
          <div>
            <div className="alert alert-info mb-16">
              📋 Each chapter requires exactly 3 PDFs: Concept Notes, Questions & Answers, and MCQ Bank.
            </div>
            <div className="flex flex-col gap-16 mb-20">
              <UploadZone
                label="1. Concept Notes PDF"
                hint="Full chapter concepts, diagrams, examples, revision"
                file={notesPdf}
                onChange={setNotesPdf}
              />
              <UploadZone
                label="2. Questions & Answers PDF"
                hint="NCERT solutions, PYQs, important questions with answers"
                file={qaPdf}
                onChange={setQaPdf}
              />
              <UploadZone
                label="3. MCQ Bank PDF"
                hint="100 MCQs with answers (Top 100 format)"
                file={mcqPdf}
                onChange={setMcqPdf}
              />
            </div>
            <div className="flex justify-between">
              <button className="btn-secondary" onClick={() => setStep('info')}>← Back</button>
              <button
                className="btn-primary"
                disabled={!pdfsValid}
                onClick={() => setStep('confirm')}
              >
                Next: Confirm →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Confirm */}
        {step === 'confirm' && (
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Ready to Process</h3>

            <div className="flex flex-col gap-12 mb-20">
              {[
                { label: 'Subject', value: info.subject },
                { label: 'Chapter', value: `${info.chapterNumber}. ${info.name}` },
                { label: 'Notes PDF', value: notesPdf?.name },
                { label: 'Q&A PDF', value: qaPdf?.name },
                { label: 'MCQ PDF', value: mcqPdf?.name },
              ].map(row => (
                <div key={row.label} className="flex gap-16" style={{ fontSize: 13 }}>
                  <span style={{ width: 100, color: 'var(--text-muted)', flexShrink: 0 }}>{row.label}</span>
                  <span style={{ fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
            </div>

            <div className="alert alert-warning mb-20">
              ⏱️ AI processing takes 3–8 minutes depending on chapter size. The pipeline will call
              Claude API to extract concepts, generate content, transform questions, and build
              attempt pools. You can close this tab and come back.
            </div>

            <div className="flex justify-between">
              <button className="btn-secondary" onClick={() => setStep('upload')}>← Back</button>
              <button className="btn-primary" disabled={loading} onClick={handleStart}>
                {loading ? '⟳ Starting...' : '🚀 Start AI Processing'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
