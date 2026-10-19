import { useEffect, useMemo, useState } from 'react';
import writeXlsxFile from 'write-excel-file/browser';
import { readSheet } from 'read-excel-file/browser';
import { questionBankApi, type CmsUser, type LibraryChapter } from './api';
import { QuestionDetailEditor } from './QuestionDetailEditor';
import './question-bank-workspace.css';

const QUESTION_COLUMNS = ['questionId', 'chapterId', 'type', 'format', 'question', 'answer1', 'answer2', 'answer3', 'answer4', 'correctAnswer', 'explanationHtml', 'topicId', 'subtopicId', 'marks', 'patternId', 'difficulty', 'useForPractice', 'useForCycleTest', 'imageIds', 'status'];
const STEP_COLUMNS = ['questionId', 'stepId', 'sequence', 'subquestion', 'answer1', 'answer2', 'answer3', 'correctAnswer', 'marks', 'negativeMarks', 'criticalStep', 'explanationHtml', 'questionImageIds', 'answerImageIds'];
const heading = (values: string[]) =>
  values.map((value) => ({
    value,
    fontWeight: 'bold' as const,
    backgroundColor: '#DDEBF7'
  }));
const row = (values: any[]) =>
  values.map((value) => ({
    value: value === undefined || value === null ? '' : value
  }));
const split = (value: any, separator = '|') =>
  String(value || '')
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
const yes = (value: any) =>
  ['yes', 'true', '1', 'y'].includes(
    String(value || '')
      .trim()
      .toLowerCase()
  );

export function QuestionBankWorkspace({ chapters, user, initialChapterId }: { chapters: LibraryChapter[]; user: CmsUser; initialChapterId?: string }) {
  const [chapterId, setChapterId] = useState(initialChapterId || chapters[0]?.id || ''),
    [questions, setQuestions] = useState<any[]>([]),
    [stats, setStats] = useState<any>(),
    [selected, setSelected] = useState<string[]>([]),
    [questionFile, setQuestionFile] = useState<File>(),
    [answerFile, setAnswerFile] = useState<File>(),
    [sourceName, setSourceName] = useState(''),
    [sourceCategory, setSourceCategory] = useState('NCERT Exemplar'),
    [sourceYear, setSourceYear] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<any>(),
    [tab, setTab] = useState<'staging' | 'approved'>('staging'),
    [editing, setEditing] = useState<any>();
  const chapter = chapters.find((item) => item.id === chapterId),
    topics = chapter?.content?.topics || [],
    shown = questions.filter((item) => (tab === 'approved' ? item.status === 'approved' : item.status !== 'approved'));
  const load = async () => {
    if (!chapterId) return;
    const [items, summary] = await Promise.all([questionBankApi.list(chapterId), questionBankApi.statistics(chapterId)]);
    setQuestions(items);
    setStats(summary);
  };
  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, [chapterId]);
  useEffect(() => {
    setSelected([]);
  }, [chapterId, tab]);
  const importFiles = async () => {
    if (!questionFile) return;
    setBusy(true);
    setMessage('');
    try {
      const value = await questionBankApi.import(chapterId, questionFile, answerFile, {
        sourceName: sourceName || questionFile.name,
        sourceCategory,
        sourceYear
      });
      setResult(value);
      setMessage(`${value.imported} new question(s) staged; ${value.duplicates} exact duplicate(s) linked to existing records.`);
      await load();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  const change = async (question: any, field: string, value: any) => {
    setBusy(true);
    try {
      await questionBankApi.update(question.id, { [field]: value });
      await load();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  const saveDetail = async (value: any) => {
    setBusy(true);
    try {
      await questionBankApi.update(value.id, value);
      setEditing(undefined);
      setMessage(`${value.id} updated.`);
      await load();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (question: any) => {
    if (!window.confirm(`Delete ${question.id} permanently from the Question Bank?`)) return;
    setBusy(true);
    try {
      await questionBankApi.remove(question.id);
      setEditing(undefined);
      setMessage(`${question.id} deleted.`);
      await load();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  const removeStaging = async (all = false) => {
    const ids = selected.filter((id) => shown.some((item) => item.id === id));
    if (!all && !ids.length) return;
    const count = all ? shown.length : ids.length;
    if (!count) return;
    if (!window.confirm(`Permanently delete ${all ? 'all' : count} staged question${count === 1 ? '' : 's'}?\n\nApproved questions will not be deleted. This action cannot be undone.`)) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await questionBankApi.removeStaging(chapterId, all ? undefined : ids);
      setSelected([]);
      setEditing(undefined);
      setMessage(`${result.deleted} staged question(s) deleted${result.skipped ? `; ${result.skipped} approved or unavailable question(s) skipped.` : '.'}`);
      await load();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  const approveSelected = async () => {
    const ids = selected.filter((id) => shown.some((item) => item.id === id));
    if (!ids.length) return;
    if (!window.confirm(`Approve ${ids.length} selected question(s)?\n\nThey will move to the Approved tab and become eligible for Cycle Tests.`)) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await questionBankApi.approveSelected(chapterId, ids);
      setSelected([]);
      setMessage(`${result.approved} question(s) approved and moved to the Approved tab.`);
      await load();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  const analyse = async () => {
    if (!selected.length) return;
    const estimate = (selected.length * 0.01).toFixed(2);
    if (!window.confirm(`Analyse ${selected.length} selected question(s) with OpenAI?\n\nEstimated maximum cost: $${estimate}. Suggestions will not be applied automatically.`)) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await questionBankApi.aiAnalyse(chapterId, selected);
      for (const suggestion of response.suggestions) {
        if (window.confirm(`${suggestion.id}\n\n${suggestion.type}, ${suggestion.marks} mark(s)\nTopic: ${suggestion.topicId || 'Unclassified'}\nPattern: ${suggestion.patternId || 'Unclassified'}\n\nApply?`)) await questionBankApi.update(suggestion.id, suggestion);
      }
      setSelected([]);
      await load();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  const coverPractice = async () => {
    const chosen = new Map<string, any>();
    for (const question of questions.filter((item) => item.status === 'approved' && item.patternId)) {
      if (!chosen.has(question.patternId) || question.difficulty === 'medium') chosen.set(question.patternId, question);
    }
    if (!chosen.size) {
      setMessage('Approve and assign Pattern IDs before generating Practice coverage.');
      return;
    }
    if (!window.confirm(`Add one representative from each of ${chosen.size} approved Pattern(s) to Chapter Practice?`)) return;
    setBusy(true);
    try {
      for (const question of chosen.values())
        if (!question.usage.includes('chapter_practice'))
          await questionBankApi.update(question.id, {
            usage: [...question.usage, 'chapter_practice']
          });
      await load();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  const exportWorkbook = async (template = false) => {
    const items = template ? [templateType1(chapterId), templateType2(chapterId)] : questions.filter((item) => item.status !== 'approved'),
      questionRows = [heading(QUESTION_COLUMNS), ...items.map((item) => row(questionValues(item, chapterId)))],
      stepRows = [heading(STEP_COLUMNS), ...items.flatMap((item) => (item.steps || []).map((step: any, index: number) => row(stepValues(item.id, step, index))))],
      workbook = writeXlsxFile([
        { sheet: 'Questions', data: questionRows },
        { sheet: 'Type2 Steps', data: stepRows }
      ]),
      fileName = template ? 'EduLLM_Question_Enrichment_Template.xlsx' : `${safe(chapter?.title || 'Chapter')}_Staging_Questions.xlsx`;
    await workbook.toFile(fileName);
  };
  const uploadEnrichment = async (file: File) => {
    setBusy(true);
    setMessage('');
    try {
      const enriched = file.name.toLowerCase().endsWith('.json') ? await parseJson(file) : await parseWorkbook(file),
        byId = new Map(questions.map((item) => [item.id, item])),
        unknown = enriched.filter((item) => !byId.has(item.id));
      if (unknown.length)
        throw new Error(
          `Unknown Question ID(s): ${unknown
            .slice(0, 5)
            .map((item) => item.id)
            .join(', ')}`
        );
      if (new Set(enriched.map((item) => item.id)).size !== enriched.length) throw new Error('The upload contains duplicate Question IDs.');
      if (!window.confirm(`Preview complete. Update ${enriched.length} existing staged question(s) by immutable Question ID?\n\nQuestion text, answers, explanations and classification fields may change. Source references will be preserved.`)) return;
      const merged = enriched.map((item) => ({
        ...byId.get(item.id),
        ...item
      }));
      await questionBankApi.enrich(chapterId, merged);
      setMessage(`${enriched.length} question(s) enriched in one transaction. Review each record before approval.`);
      await load();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  const uploadDirect = async (file: File) => {
    setBusy(true);
    setMessage('');
    try {
      const imported = file.name.toLowerCase().endsWith('.json') ? await parseJson(file) : await parseWorkbook(file);
      if (!imported.length) throw new Error('The file contains no questions.');
      const approved = imported.filter((item) => item.status === 'approved').length;
      if (!window.confirm(`Directly import ${imported.length} question(s)?\n\n${approved} will be approved and ${imported.length - approved} will appear in staging, as specified in the file. Enrichment and AI quality analysis will be skipped.`)) return;
      const result = await questionBankApi.directImport(chapterId, imported, file.name);
      setMessage(`${result.imported} AI-generated question(s) imported directly into the Question Bank.`);
      setTab('staging');
      await load();
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };
  const coverage = useMemo(
    () =>
      stats
        ? [
            ['Total', stats.total],
            ['Staged', stats.staged],
            ['Approved', stats.approved],
            ['Unused', stats.unused],
            ['Unclassified', stats.unclassified],
            ['Patterns', stats.patterns],
            ['Practice patterns', stats.practicePatterns],
            ['Near duplicates', stats.nearDuplicates]
          ]
        : [],
    [stats]
  );
  const allShownSelected = shown.length > 0 && shown.every((item) => selected.includes(item.id));
  return (
    <section className="question-bank-workspace">
      {editing && <QuestionDetailEditor question={editing} topics={topics} busy={busy} close={() => setEditing(undefined)} save={saveDetail} remove={() => remove(editing)} />}
      <header>
        <div>
          <small>CANONICAL ASSESSMENT SOURCE</small>
          <h1>Question Bank</h1>
          <p>Import, enrich, review and allocate every question before generating test forms.</p>
        </div>
        <select value={chapterId} onChange={(event) => setChapterId(event.target.value)}>
          {chapters.map((item) => (
            <option value={item.id} key={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </header>
      {message && <p className="qb-message">{message}</p>}
      <section className="qb-statistics">
        {coverage.map(([label, value]) => (
          <article key={label}>
            <b>{value}</b>
            <span>{label}</span>
          </article>
        ))}
      </section>
      <section className="qb-import">
        <header>
          <div>
            <small>MULTI-FORMAT INTAKE</small>
            <h2>Stage questions</h2>
          </div>
          <span>PDF · DOCX · XLSX · TXT · JSON</span>
        </header>
        <div className="qb-import-grid">
          <label>
            Questions file
            <input type="file" accept=".pdf,.docx,.xlsx,.txt,.json" onChange={(event) => setQuestionFile(event.target.files?.[0])} />
          </label>
          <label>
            Answers file (optional)
            <input type="file" accept=".pdf,.docx,.xlsx,.txt,.json" onChange={(event) => setAnswerFile(event.target.files?.[0])} />
          </label>
          <label>
            Source name
            <input value={sourceName} placeholder={questionFile?.name || 'NCERT Exemplar'} onChange={(event) => setSourceName(event.target.value)} />
          </label>
          <label>
            Source category
            <input value={sourceCategory} onChange={(event) => setSourceCategory(event.target.value)} />
          </label>
          <label>
            Year
            <input value={sourceYear} onChange={(event) => setSourceYear(event.target.value)} />
          </label>
          <button disabled={!questionFile || busy || !chapterId} onClick={importFiles}>
            Extract and stage
          </button>
        </div>
        {result?.duplicates > 0 && (
          <details>
            <summary>{result.duplicates} exact duplicates linked to existing records</summary>
            {result.results
              .filter((item: any) => item.status === 'exact_duplicate')
              .map((item: any) => (
                <p key={`${item.existingQuestionId}-${item.question}`}>
                  <b>{item.existingQuestionId}</b> — {item.question}
                </p>
              ))}
          </details>
        )}
      </section>
      <section className="qb-enrichment">
        <header>
          <div>
            <small>OFFLINE / CHATGPT ENRICHMENT</small>
            <h2>Download, complete and update staging</h2>
            <p>The immutable Question ID controls updates. Rich explanations are stored as HTML text in Excel.</p>
          </div>
          <div>
            <button onClick={() => exportWorkbook(true)}>Download Excel template</button>
            <button disabled={!questions.some((item) => item.status !== 'approved')} onClick={() => exportWorkbook(false)}>
              Download staging Excel
            </button>
            <label>
              Upload enriched Excel or JSON
              <input type="file" accept=".xlsx,.json" onChange={(event) => event.target.files?.[0] && uploadEnrichment(event.target.files[0])} />
            </label>
          </div>
        </header>
      </section>
      <section className="qb-enrichment qb-direct-import">
        <header>
          <div>
            <small>DIRECT AI QUESTION IMPORT</small>
            <h2>Upload completed questions</h2>
            <p>Import the Questions and Type2 Steps workbook directly. Supplied answers, explanations, classifications, usage and status are preserved without enrichment or AI quality analysis.</p>
          </div>
          <div>
            <label className={busy || !chapterId ? 'disabled' : ''}>
              Upload questions directly
              <input type="file" accept=".xlsx,.json" disabled={busy || !chapterId} onChange={(event) => event.target.files?.[0] && uploadDirect(event.target.files[0])} />
            </label>
          </div>
        </header>
      </section>
      <section className="qb-list">
        <header>
          <nav>
            <button className={tab === 'staging' ? 'active' : ''} onClick={() => setTab('staging')}>
              Staging ({questions.filter((item) => item.status !== 'approved').length})
            </button>
            <button className={tab === 'approved' ? 'active' : ''} onClick={() => setTab('approved')}>
              Approved ({questions.filter((item) => item.status === 'approved').length})
            </button>
          </nav>
          <div>
            <span>{selected.length} selected</span>
            <button disabled={!shown.length || busy} onClick={() => setSelected(allShownSelected ? [] : shown.map((item) => item.id))}>
              {allShownSelected ? 'Clear selection' : 'Select all'}
            </button>
            <button disabled={busy} onClick={coverPractice}>
              Cover unique Patterns in Practice
            </button>
            {tab === 'staging' && (
              <>
                <button disabled={!selected.length || busy} onClick={approveSelected}>
                  Approve selected
                </button>
                <button className="qb-delete" disabled={!selected.length || busy} onClick={() => removeStaging(false)}>
                  Delete selected
                </button>
                <button className="qb-delete" disabled={!shown.length || busy} onClick={() => removeStaging(true)}>
                  Delete all staging
                </button>
              </>
            )}
            {user.role === 'admin' && (
              <button disabled={!selected.length || busy} onClick={analyse}>
                ✨ Analyse selected with AI
              </button>
            )}
          </div>
        </header>
        <div className="qb-column-head">
          <span>ID / Select</span>
          <span>Question and source</span>
          <span>Topic</span>
          <span>Type</span>
          <span>Marks</span>
          <span>Pattern ID</span>
          <span>Status</span>
          <span>Practice</span>
          <span>Details</span>
        </div>
        {shown.map((question) => (
          <article key={question.id}>
            <label className="qb-select">
              <input type="checkbox" checked={selected.includes(question.id)} onChange={() => setSelected((current) => (current.includes(question.id) ? current.filter((id) => id !== question.id) : [...current, question.id]))} />
              <b>{question.id}</b>
            </label>
            <div className="qb-question">
              <p>{question.question}</p>
              <small>{question.sourceReferences.map((source: any) => `${source.sourceName}${source.questionNumber ? ` Q${source.questionNumber}` : ''}${source.year ? ` (${source.year})` : ''}`).join(' · ')}</small>
            </div>
            <select value={question.topicId || ''} onChange={(event) => change(question, 'topicId', event.target.value)}>
              <option value="">Topic…</option>
              {topics.map((topic: any) => (
                <option value={topic.id} key={topic.id}>
                  {topic.title}
                </option>
              ))}
            </select>
            <select value={question.type} onChange={(event) => change(question, 'type', event.target.value)}>
              <option value="type1">Type 1</option>
              <option value="type2">Type 2</option>
            </select>
            <input className="marks" type="number" min="0.5" step="0.5" value={question.marks} readOnly={question.type === 'type2'} onChange={(event) => change(question, 'marks', Number(event.target.value))} />
            <input value={question.patternId || ''} placeholder="Pattern ID" onBlur={(event) => change(question, 'patternId', event.target.value)} onChange={(event) => setQuestions((current) => current.map((item) => (item.id === question.id ? { ...item, patternId: event.target.value } : item)))} />
            <select value={question.status} onChange={(event) => change(question, 'status', event.target.value)}>
              <option value="staged">Staged</option>
              <option value="approved">Approved</option>
              <option value="excluded">Excluded</option>
            </select>
            <label className="practice-usage">
              <input type="checkbox" checked={question.usage.includes('chapter_practice')} onChange={() => change(question, 'usage', question.usage.includes('chapter_practice') ? question.usage.filter((x: string) => x !== 'chapter_practice') : [...question.usage, 'chapter_practice'])} /> Practice
            </label>
            <button className="view-question" onClick={() => setEditing(question)}>
              View / Edit
            </button>
            {question.duplicateStatus !== 'not_checked' && (
              <span className="duplicate-tag">
                {question.duplicateStatus}
                {question.duplicateOf ? ` → ${question.duplicateOf}` : ''}
              </span>
            )}
          </article>
        ))}
        {!shown.length && <p className="empty-bank">No questions in this tab.</p>}
      </section>
    </section>
  );
}

function questionValues(item: any, chapterId: string) {
  return [item.id, item.chapterId || chapterId, item.type, item.format, item.question, ...[0, 1, 2, 3].map((index) => item.options?.[index] || ''), item.correctAnswer || item.answer || '', item.explanation || '', item.topicId || '', item.subtopicId || '', Number(item.marks || item.totalMarks || 1), item.patternId || '', item.difficulty || 'medium', (item.usage || []).includes('chapter_practice') ? 'Yes' : 'No', (item.usage || []).includes('cycle_test') || item.usage?.includes('cycle_test_bank') ? 'Yes' : 'No', (item.mediaRefs || []).join('|'), item.status || 'staged'];
}
function stepValues(id: string, item: any, index: number) {
  return [id, item.id, index + 1, item.prompt, ...[0, 1, 2].map((i) => item.options?.[i] || ''), item.answer, Number(item.marks || 0), Number(item.negativeMarks || 0), item.isCritical ? 'Yes' : 'No', item.explanation || '', (item.mediaRefs || []).join('|'), (item.answerMediaRefs || []).join('|')];
}
function templateType1(chapterId: string) {
  return {
    id: 'KEEP-QUESTION-ID-1',
    chapterId,
    type: 'type1',
    format: 'mcq',
    question: 'Which option is correct?',
    options: ['Answer A', 'Answer B', 'Answer C', 'Answer D'],
    correctAnswer: 'Answer A',
    explanation: '<p>Explain why <strong>Answer A</strong> is correct.</p>',
    topicId: '',
    subtopicId: '',
    marks: 1,
    patternId: 'PATTERN-NAME',
    difficulty: 'medium',
    usage: ['chapter_practice', 'cycle_test'],
    mediaRefs: [],
    status: 'staged'
  };
}
function templateType2(chapterId: string) {
  return {
    id: 'KEEP-QUESTION-ID-2',
    chapterId,
    type: 'type2',
    format: 'guided',
    question: 'Solve the problem step by step.',
    steps: [
      {
        id: 'STEP-1',
        prompt: 'Identify the given data.',
        options: ['Correct data', 'Close distractor'],
        answer: 'Correct data',
        marks: 1,
        negativeMarks: 0,
        isCritical: true,
        explanation: '<p>Explanation for step 1.</p>'
      },
      {
        id: 'STEP-2',
        prompt: 'Choose the formula.',
        options: ['Correct formula', 'Close formula'],
        answer: 'Correct formula',
        marks: 1,
        negativeMarks: 0,
        isCritical: false,
        explanation: '<p>Explanation for step 2.</p>'
      }
    ],
    finalAnswer: '<p>Complete consolidated solution.</p>',
    marks: 2,
    patternId: 'PATTERN-NAME',
    difficulty: 'medium',
    usage: ['chapter_practice', 'cycle_test'],
    mediaRefs: [],
    status: 'staged'
  };
}
async function parseWorkbook(file: File) {
  const questionRows = await readSheet(file, 'Questions'),
    stepRows = await readSheet(file, 'Type2 Steps'),
    questions = records(questionRows),
    steps = records(stepRows),
    grouped = new Map<string, any[]>();
  for (const item of steps) {
    if (!grouped.has(String(item.questionId))) grouped.set(String(item.questionId), []);
    grouped.get(String(item.questionId))!.push(item);
  }
  return questions
    .filter((item) => item.questionId)
    .map((item) => {
      const usage = [...(yes(item.useForPractice) ? ['chapter_practice'] : []), ...(yes(item.useForCycleTest) ? ['cycle_test'] : [])],
        base = {
          id: String(item.questionId),
          chapterId: String(item.chapterId || ''),
          type: String(item.type || 'type1').toLowerCase(),
          format: String(item.format || 'one_line'),
          question: String(item.question || ''),
          options: [item.answer1, item.answer2, item.answer3, item.answer4].map(String).filter(Boolean),
          correctAnswer: String(item.correctAnswer || ''),
          explanation: String(item.explanationHtml || ''),
          topicId: String(item.topicId || ''),
          subtopicId: String(item.subtopicId || ''),
          marks: Number(item.marks || 1),
          patternId: String(item.patternId || ''),
          difficulty: String(item.difficulty || 'medium'),
          usage,
          mediaRefs: split(item.imageIds),
          status: String(item.status || 'staged')
        };
      if (base.type !== 'type2') return base;
      const values = (grouped.get(base.id) || [])
        .sort((a, b) => Number(a.sequence) - Number(b.sequence))
        .map((item) => ({
          id: String(item.stepId || `step-${crypto.randomUUID()}`),
          prompt: String(item.subquestion || ''),
          options: [item.answer1, item.answer2, item.answer3].map(String).filter(Boolean),
          answer: String(item.correctAnswer || ''),
          marks: Number(item.marks || 0),
          negativeMarks: Number(item.negativeMarks || 0),
          isCritical: yes(item.criticalStep),
          explanation: String(item.explanationHtml || ''),
          interactionType: 'drag_point',
          mediaRefs: split(item.questionImageIds),
          answerMediaRefs: split(item.answerImageIds),
          explanationMediaRefs: []
        }));
      return {
        ...base,
        steps: values,
        marks: values.reduce((sum, item) => sum + item.marks, 0),
        totalMarks: values.reduce((sum, item) => sum + item.marks, 0),
        finalAnswer: base.explanation
      };
    });
}
async function parseJson(file: File) {
  const value = JSON.parse(await file.text()),
    items = Array.isArray(value) ? value : value.questions;
  if (!Array.isArray(items)) throw new Error('JSON must contain an array or a questions array.');
  return items.map((item) => ({
    ...item,
    id: item.id || item.questionId,
    explanation: item.explanation || item.explanationHtml,
    usage: item.usage || [...(item.useForPractice ? ['chapter_practice'] : []), ...(item.useForCycleTest ? ['cycle_test'] : [])],
    mediaRefs: item.mediaRefs || item.imageIds || []
  }));
}
function records(rows: any[][]) {
  const headers = (rows[0] || []).map(String);
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((key, index) => [key, values[index] ?? ''])));
}
function safe(value: string) {
  return value.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');
}
