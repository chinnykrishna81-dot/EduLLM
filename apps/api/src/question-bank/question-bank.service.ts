import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { ForbiddenException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';
import { readSheet } from 'read-excel-file/node';
import { pool, query } from '../db/database';

const normalize = (value: string) =>
  String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/^\s*(?:q(?:uestion)?\s*)?\d+[.)\s:-]+/i, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:?])/g, '$1')
    .trim();
const hash = (value: string) => createHash('sha256').update(normalize(value)).digest('hex');
const publicQuestion = (row: any) => ({
  ...row.data,
  id: row.question_id,
  chapterId: row.chapter_id,
  question: row.question_text,
  type: row.question_type,
  format: row.format,
  marks: Number(row.marks),
  topicId: row.topic_id,
  subtopicId: row.subtopic_id,
  difficulty: row.difficulty,
  patternId: row.pattern_id,
  duplicateStatus: row.duplicate_status,
  duplicateOf: row.duplicate_of,
  duplicateGroupId: row.duplicate_group_id,
  duplicateReason: row.duplicate_reason,
  duplicateConfidence: row.duplicate_confidence === null ? null : Number(row.duplicate_confidence),
  usage: row.usage,
  status: row.status,
  sourceReferences: row.source_references || [],
  steps: (row.data?.steps || []).map((step: any) => ({ ...step, answer: step.answer ?? step.correctAnswer ?? '' }))
});
const numbered = (text: string) => {
  const lines = String(text || '')
      .replace(/\r/g, '')
      .split('\n'),
    items: any[] = [];
  let current: any;
  for (const line of lines) {
    const match = line.match(/^\s*(?:Q(?:uestion)?\s*)?(\d+)[.)\s:-]+(.+)/i);
    if (match) {
      if (current) items.push(current);
      current = { number: match[1], question: match[2].trim() };
    } else if (current && line.trim()) current.question += ` ${line.trim()}`;
  }
  if (current) items.push(current);
  if (items.length) return items;
  return text
    .split(/\n\s*\n/)
    .map((question, index) => ({
      number: String(index + 1),
      question: question.trim()
    }))
    .filter((item) => item.question);
};
const cell = (row: any, names: string[]) => {
  for (const name of names) {
    const key = Object.keys(row).find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === name);
    if (key && row[key] !== undefined) return String(row[key]).trim();
  }
  return '';
};

@Injectable()
export class QuestionBankService {
  async list(chapterId: string) {
    const r = await query(`SELECT q.*,COALESCE(json_agg(json_build_object('sourceName',s.source_name,'sourceCategory',s.source_category,'year',s.source_year,'questionNumber',s.question_number,'pageNumber',s.page_number)) FILTER(WHERE s.source_reference_id IS NOT NULL),'[]') source_references FROM question_bank q LEFT JOIN question_source_reference s ON s.question_id=q.question_id WHERE q.chapter_id=$1 GROUP BY q.question_id ORDER BY q.created_at`, [chapterId]);
    return r.rows.map(publicQuestion);
  }

  /** Canonical student/preview practice delivery from the unified bank. */
  async practice(chapterId: string) {
    const questions = await this.list(chapterId);
    return questions
      .filter((question: any) => (question.usage || []).includes('chapter_practice'))
      .sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0))
      .map((question: any) => ({
        ...question,
        steps: question.steps || question.data?.steps || [],
        finalAnswer: question.finalAnswer || question.data?.finalAnswer || question.data?.explanation || undefined,
        explanation: question.explanation || question.data?.explanation || question.data?.answer || '',
      }));
  }

  async topics(chapterId: string) {
    const r = await query('SELECT content FROM chapter_library WHERE chapter_id=$1', [chapterId]);
    if (!r.rowCount) throw new UnprocessableEntityException('Chapter not found');
    return (r.rows[0].content?.topics || []).map((topic: any) => ({ id: topic.id, title: topic.title, subtopics: topic.subtopics || [] }));
  }

  async setPractice(chapterId: string, questionIds: unknown[]) {
    if (!Array.isArray(questionIds)) throw new UnprocessableEntityException('questionIds must be an array');
    const ids = [...new Set(questionIds.map(String).filter(Boolean))];
    await query(`UPDATE question_bank SET usage=array_remove(usage,'chapter_practice'),updated_at=now() WHERE chapter_id=$1`, [chapterId]);
    if (ids.length) await query(`UPDATE question_bank SET usage=CASE WHEN 'chapter_practice'=ANY(usage) THEN usage ELSE array_append(usage,'chapter_practice') END,updated_at=now() WHERE chapter_id=$1 AND question_id=ANY($2::varchar[])`, [chapterId, ids]);
    return { success: true, count: ids.length };
  }

  async removeChapter(chapterId: string) {
    const r = await query('DELETE FROM question_bank WHERE chapter_id=$1 RETURNING question_id', [chapterId]);
    return { deleted: r.rowCount || 0 };
  }

  async patterns(chapterId: string) {
    const r = await query(`SELECT pattern_id,COUNT(*)::int count,MIN(question_text) sample,MIN(NULLIF(topic_id,'')) topic_id FROM question_bank WHERE chapter_id=$1 AND pattern_id<>'' GROUP BY pattern_id ORDER BY pattern_id`, [chapterId]);
    return r.rows.map(row => ({ patternId: row.pattern_id, count: row.count, sample: row.sample, topicId: row.topic_id }));
  }

  async assignPatterns(chapterId: string, assignments: any[]) {
    if (!Array.isArray(assignments)) throw new UnprocessableEntityException('Assignments must be an array');
    let updated = 0;
    for (const item of assignments) {
      const r = await query(`UPDATE question_bank SET topic_id=$1,updated_at=now() WHERE chapter_id=$2 AND pattern_id=$3`, [item.topicId || '', chapterId, String(item.patternId || '')]);
      updated += r.rowCount || 0;
    }
    return { updated };
  }

  async suggestPatterns(chapterId: string) {
    // Suggestions remain non-mutating; callers may review and apply them.
    return { assignments: [] };
  }
  async statistics(chapterId: string) {
    const questions = await this.list(chapterId),
      by = (key: string) =>
        questions.reduce((result: any, item: any) => {
          const value = String(item[key] || 'Unclassified');
          result[value] = (result[value] || 0) + 1;
          return result;
        }, {});
    const patterns = new Set(questions.map((q: any) => q.patternId).filter(Boolean)),
      practicePatterns = new Set(
        questions
          .filter((q: any) => q.usage.includes('chapter_practice'))
          .map((q: any) => q.patternId)
          .filter(Boolean)
      );
    return {
      generatedAt:new Date().toISOString(),
      total: questions.length,
      approved: questions.filter((q: any) => q.status === 'approved').length,
      staged: questions.filter((q: any) => q.status === 'staged').length,
      exactDuplicates: questions.filter((q: any) => q.duplicateStatus === 'exact_duplicate').length,
      nearDuplicates: questions.filter((q: any) => q.duplicateStatus === 'near_duplicate').length,
      unclassified: questions.filter((q: any) => !q.topicId || !q.patternId).length,
      unused: questions.filter((q: any) => !q.usage.length).length,
      byType: by('type'),
      byFormat: by('format'),
      byMarks: by('marks'),
      byTopic: by('topicId'),
      byDifficulty: by('difficulty'),
      patterns: patterns.size,
      practicePatterns: practicePatterns.size,
      missingPracticePatterns: [...patterns].filter((id) => !practicePatterns.has(id))
    };
  }
  private async extract(file: Express.Multer.File) {
    const ext = file.originalname.toLowerCase().split('.').pop();
    if (ext === 'json') {
      const parsed = JSON.parse(file.buffer.toString('utf8'));
      return (Array.isArray(parsed) ? parsed : parsed.questions || []).map((item: any, index: number) => ({
        number: String(item.questionNumber || index + 1),
        ...item,
        question: item.question || item.questionText || ''
      }));
    }
    if (ext === 'txt') return numbered(file.buffer.toString('utf8'));
    if (ext === 'pdf') {
      const parser = new PDFParse({ data: file.buffer });
      try {
        return numbered((await parser.getText()).text);
      } finally {
        await parser.destroy();
      }
    }
    if (ext === 'docx') return numbered((await mammoth.extractRawText({ buffer: file.buffer })).value);
    if (ext === 'xlsx') {
      const sheet = await readSheet(file.buffer),
        headers = (sheet[0] || []).map(String),
        rows: any[] = [];
      sheet.slice(1).forEach((values, index) => {
        const record: any = {};
        headers.forEach((header, i) => (record[header] = values[i] ?? ''));
        const question = cell(record, ['question', 'questiontext']);
        if (question)
          rows.push({
            number: cell(record, ['questionnumber', 'number', 'qno']) || String(index + 1),
            question,
            answer: cell(record, ['answer', 'correctanswer']),
            explanation: cell(record, ['explanation', 'solution']),
            type: cell(record, ['type', 'questiontype']),
            format: cell(record, ['format']),
            marks: Number(cell(record, ['marks']) || 1),
            topicId: cell(record, ['topic', 'topicid']),
            subtopicId: cell(record, ['subtopic', 'subtopicid']),
            difficulty: cell(record, ['difficulty']),
            patternId: cell(record, ['pattern', 'patternid']),
            options: cell(record, ['options']).split('|').filter(Boolean)
          });
      });
      return rows;
    }
    throw new UnprocessableEntityException('Supported files are PDF, DOCX, XLSX, TXT and JSON');
  }
  async previewCyk(file?: Express.Multer.File) {
    if (!file) throw new UnprocessableEntityException('Select a DOCX, XLSX, TXT or JSON file');
    const ext = file.originalname.toLowerCase().split('.').pop();
    if (!['docx', 'xlsx', 'txt', 'json'].includes(String(ext))) throw new UnprocessableEntityException('CYK supports DOCX, XLSX, TXT and JSON');
    const extracted = await this.extract(file),
      common = (item: any, index: number) => ({
        id: String(item.id || `CYK-${randomUUID().slice(0, 8)}`),
        title: String(item.title || `Question ${index + 1}`),
        mediaRefs: item.mediaRefs || [],
        reviewStatus: 'draft',
        topicId: '',
        subtopicId: '',
        usage: ['knowledge_check'],
        patternId: String(item.patternId || ''),
        difficulty: item.difficulty || 'medium',
        examEvidence: item.examEvidence || []
      }),
      type1: any[] = [],
      type2: any[] = [];
    extracted.forEach((item: any, index: number) => {
      if (Array.isArray(item.steps) && item.steps.length >= 2) {
        const steps = item.steps.map((value: any, stepIndex: number) => ({
          id: String(value.id || `step-${randomUUID().slice(0, 8)}`),
          prompt: String(value.prompt || `Step ${stepIndex + 1}`),
          answer: String(value.answer || 'Teacher review required'),
          explanation: String(value.explanation || 'Teacher explanation required'),
          hint: String(value.hint || ''),
          interactionType: value.interactionType || 'drag_point',
          options: value.options?.length ? value.options : [String(value.answer || 'Teacher review required'), 'Close distractor'],
          marks: Number(value.marks || 1),
          isCritical: Boolean(value.isCritical),
          negativeMarks: 0,
          dependsOnStepIds: [],
          answerContribution: '',
          mediaRefs: value.mediaRefs || [],
          answerMediaRefs: [],
          explanationMediaRefs: [],
          reviewStatus: 'draft'
        }));
        type2.push({
          ...common(item, index),
          question: String(item.question || 'Teacher question required'),
          totalMarks: steps.reduce((sum: number, value: any) => sum + value.marks, 0),
          steps,
          finalAnswer: String(item.finalAnswer || item.answer || 'Teacher explanation required'),
          commonMistakes: [],
          useForPractice: true
        });
      } else {
        const answer = String(item.correctAnswer || item.answer || 'Teacher review required'),
          options = Array.isArray(item.options) ? item.options.filter(Boolean) : [];
        type1.push({
          ...common(item, index),
          format: item.format || (/true|false/i.test(options.join(' ')) ? 'true_false' : options.length ? 'mcq' : 'one_line'),
          question: String(item.question || 'Teacher question required'),
          options,
          correctAnswer: answer,
          explanation: String(item.explanation || item.solution || 'Teacher explanation required'),
          distractorExplanations: {},
          marks: Number(item.marks || 1)
        });
      }
    });
    if (!type1.length && !type2.length) throw new UnprocessableEntityException('No questions could be extracted. Use numbered questions or the Excel template.');
    return {
      fileName: file.originalname,
      title: 'Check Your Knowledge',
      instructions: 'Answer every question, then submit the complete check.',
      type1Questions: type1,
      type2Questions: type2,
      warnings: ext === 'docx' || ext === 'txt' ? ['Review answers, choices, explanations and question types extracted from the plain document before saving.'] : []
    };
  }
  async import(chapterId: string, files: Express.Multer.File[], body: any, userId: string) {
    if (!files.length) throw new UnprocessableEntityException('Select a questions file');
    if (files.length > 2) throw new UnprocessableEntityException('Upload one questions file and optionally one answers file');
    const sourceName = String(body.sourceName || files[0].originalname),
      sourceCategory = String(body.sourceCategory || ''),
      sourceYear = String(body.sourceYear || ''),
      questions = await this.extract(files[0]),
      answers = files[1] ? await this.extract(files[1]) : [],
      answerMap = new Map(answers.map((item: any) => [String(item.number), item.answer || item.question]));
    if (!questions.length) throw new UnprocessableEntityException('No numbered questions could be extracted');
    const batchId = randomUUID(),
      client = await pool.connect();
    let imported = 0,
      duplicates = 0;
    const results: any[] = [];
    try {
      await client.query('BEGIN');
      await client.query(`INSERT INTO question_import_batch(batch_id,chapter_id,source_name,source_type,total_extracted,created_by) VALUES($1,$2,$3,$4,$5,$6)`, [batchId, chapterId, sourceName, files[0].originalname.split('.').pop(), questions.length, userId]);
      for (const [index, item] of questions.entries()) {
        const text = String(item.question || '').trim();
        if (!text) continue;
        const normalizedHash = hash(text),
          existing = await client.query('SELECT question_id FROM question_bank WHERE chapter_id=$1 AND normalized_hash=$2 ORDER BY created_at LIMIT 1', [chapterId, normalizedHash]);
        if (existing.rowCount) {
          duplicates++;
          const existingId = existing.rows[0].question_id;
          await client.query(`INSERT INTO question_source_reference(source_reference_id,question_id,batch_id,source_name,source_category,source_year,question_number) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`, [randomUUID(), existingId, batchId, sourceName, sourceCategory, sourceYear, item.number || String(index + 1)]);
          results.push({
            question: text,
            status: 'exact_duplicate',
            existingQuestionId: existingId
          });
          continue;
        }
        const id = String(item.id || `QB-${chapterId.slice(0, 8)}-${randomUUID().slice(0, 8)}`),
          type = item.type === 'type2' ? 'type2' : 'type1',
          data = {
            ...item,
            answer: item.answer || answerMap.get(String(item.number)) || '',
            correctAnswer: item.correctAnswer || item.answer || answerMap.get(String(item.number)) || '',
            explanation: item.explanation || answerMap.get(String(item.number)) || '',
            options: item.options || [],
            sourceReferences: undefined
          };
        await client.query(`INSERT INTO question_bank(question_id,chapter_id,question_text,normalized_hash,question_type,format,marks,topic_id,subtopic_id,difficulty,pattern_id,usage,status,data,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'staged',$13::jsonb,$14)`, [id, chapterId, text, normalizedHash, type, item.format || 'one_line', Number(item.marks || 1), item.topicId || '', item.subtopicId || '', item.difficulty || 'medium', item.patternId || '', item.usage || [], JSON.stringify(data), userId]);
        await client.query(`INSERT INTO question_source_reference(source_reference_id,question_id,batch_id,source_name,source_category,source_year,question_number) VALUES($1,$2,$3,$4,$5,$6,$7)`, [randomUUID(), id, batchId, sourceName, sourceCategory, sourceYear, item.number || String(index + 1)]);
        imported++;
        results.push({ questionId: id, question: text, status: 'staged' });
      }
      await client.query('UPDATE question_import_batch SET imported_count=$2,duplicate_count=$3 WHERE batch_id=$1', [batchId, imported, duplicates]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return {
      batchId,
      sourceName,
      extracted: questions.length,
      imported,
      duplicates,
      results
    };
  }
  async update(id: string, body: any) {
    const current = await query('SELECT * FROM question_bank WHERE question_id=$1', [id]);
    if (!current.rowCount) throw new UnprocessableEntityException('Question not found');
    const old = current.rows[0],
      text = String(body.question ?? old.question_text).trim();
    if (!text) throw new UnprocessableEntityException('Question text is required');
    const data = { ...old.data, ...body },
      status = body.status || old.status,
      topicId = body.topicId ?? old.topic_id,
      patternId = body.patternId ?? old.pattern_id,
      usage = [...new Set(body.usage || old.usage)];
    if (status === 'approved') {
      if (!topicId) throw new UnprocessableEntityException('Assign a Topic before approval');
      if (!patternId) throw new UnprocessableEntityException('Assign a Pattern ID before approval');
      if (!(data.correctAnswer || data.answer || data.finalAnswer)) throw new UnprocessableEntityException('Add the answer before approval');
      if (!(data.explanation || data.solution || data.finalAnswer)) throw new UnprocessableEntityException('Add the explanation before approval');
      if (!usage.includes('cycle_test')) usage.push('cycle_test');
    }
    const r = await query(`UPDATE question_bank SET question_text=$2,normalized_hash=$3,question_type=$4,format=$5,marks=$6,topic_id=$7,subtopic_id=$8,difficulty=$9,pattern_id=$10,duplicate_status=$11,duplicate_of=$12,duplicate_group_id=$13,duplicate_reason=$14,duplicate_confidence=$15,usage=$16,status=$17,data=$18::jsonb,updated_at=now() WHERE question_id=$1 RETURNING *`, [id, text, hash(text), body.type || old.question_type, body.format || old.format, Number(body.marks ?? old.marks), topicId, body.subtopicId ?? old.subtopic_id, body.difficulty || old.difficulty, patternId, body.duplicateStatus || old.duplicate_status, body.duplicateOf ?? old.duplicate_of, body.duplicateGroupId ?? old.duplicate_group_id, body.duplicateReason ?? old.duplicate_reason, body.duplicateConfidence ?? old.duplicate_confidence, usage, status, JSON.stringify(data)]);
    return publicQuestion(r.rows[0]);
  }
  async remove(id: string) {
    const result = await query('DELETE FROM question_bank WHERE question_id=$1 RETURNING question_id', [id]);
    if (!result.rowCount) throw new UnprocessableEntityException('Question not found');
    return { deleted: true, id };
  }
  async removeStaging(chapterId: string, questionIds?: unknown) {
    const supplied = questionIds !== undefined;
    if (supplied && !Array.isArray(questionIds)) throw new UnprocessableEntityException('questionIds must be an array');
    const ids = [...new Set(((questionIds as unknown[]) || []).map(String).filter(Boolean))];
    if (supplied && !ids.length) throw new UnprocessableEntityException('Select at least one staged question');
    if (ids.length > 5000) throw new UnprocessableEntityException('A single delete is limited to 5,000 questions');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const targets = await client.query(`SELECT question_id FROM question_bank WHERE chapter_id=$1 AND status<>'approved'${supplied ? ' AND question_id=ANY($2::varchar[])' : ''} FOR UPDATE`, supplied ? [chapterId, ids] : [chapterId]);
      const deletedIds = targets.rows.map((row) => row.question_id);
      if (deletedIds.length) {
        await client.query(`UPDATE question_bank SET duplicate_of=NULL,duplicate_status=CASE WHEN duplicate_of IS NOT NULL THEN 'not_checked' ELSE duplicate_status END,updated_at=now() WHERE duplicate_of=ANY($1::varchar[])`, [deletedIds]);
        await client.query('DELETE FROM question_bank WHERE question_id=ANY($1::varchar[])', [deletedIds]);
      }
      await client.query('COMMIT');
      return {
        deleted: deletedIds.length,
        questionIds: deletedIds,
        skipped: supplied ? ids.length - deletedIds.length : 0
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  async approveSelected(chapterId: string, questionIds: unknown) {
    if (!Array.isArray(questionIds) || !questionIds.length) throw new UnprocessableEntityException('Select at least one staged question');
    const ids = [...new Set(questionIds.map(String).filter(Boolean))];
    if (ids.length > 2000) throw new UnprocessableEntityException('A single approval is limited to 2,000 questions');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query('SELECT * FROM question_bank WHERE chapter_id=$1 AND question_id=ANY($2::varchar[]) FOR UPDATE', [chapterId, ids]);
      if (result.rowCount !== ids.length) {
        const found = new Set(result.rows.map((row) => row.question_id));
        throw new UnprocessableEntityException(`Question not found in this chapter: ${ids.filter((id) => !found.has(id)).slice(0, 10).join(', ')}`);
      }
      const invalid = result.rows.flatMap((row) => {
        const missing = [];
        if (!row.topic_id) missing.push('Topic');
        if (!row.pattern_id) missing.push('Pattern ID');
        if (!(row.data?.correctAnswer || row.data?.answer || row.data?.finalAnswer)) missing.push('answer');
        if (!(row.data?.explanation || row.data?.solution || row.data?.finalAnswer)) missing.push('explanation');
        return missing.length ? [`${row.question_id}: ${missing.join(', ')}`] : [];
      });
      if (invalid.length) throw new UnprocessableEntityException(`Cannot approve selected questions. Complete ${invalid.slice(0, 10).join('; ')}`);
      await client.query("UPDATE question_bank SET status='approved',usage=CASE WHEN usage @> ARRAY['cycle_test']::text[] THEN usage ELSE array_append(usage,'cycle_test') END,updated_at=now() WHERE chapter_id=$1 AND question_id=ANY($2::varchar[])", [chapterId, ids]);
      await client.query('COMMIT');
      return { approved: ids.length, questionIds: ids };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  async directImport(chapterId: string, items: unknown, sourceName: unknown, userId: string) {
    if (!Array.isArray(items) || !items.length) throw new UnprocessableEntityException('No questions supplied');
    if (items.length > 2000) throw new UnprocessableEntityException('A direct import is limited to 2,000 questions');
    const questions = items as any[];
    const ids = questions.map((item) => String(item.id || item.questionId || '').trim());
    if (ids.some((id) => !id) || new Set(ids).size !== ids.length) throw new UnprocessableEntityException('Every question needs one unique Question ID');
    const invalid = questions.find((item) => !String(item.question || item.questionText || '').trim());
    if (invalid) throw new UnprocessableEntityException(`${invalid.id || invalid.questionId}: question text is required`);
    const client = await pool.connect();
    const batchId = randomUUID();
    const name = String(sourceName || 'Direct AI question import').trim();
    try {
      await client.query('BEGIN');
      const conflicts = await client.query('SELECT question_id FROM question_bank WHERE question_id=ANY($1::varchar[])', [ids]);
      if (conflicts.rowCount)
        throw new UnprocessableEntityException(
          `Question ID already exists: ${conflicts.rows
            .slice(0, 10)
            .map((row) => row.question_id)
            .join(', ')}`
        );
      await client.query(`INSERT INTO question_import_batch(batch_id,chapter_id,source_name,source_type,total_extracted,imported_count,status,created_by) VALUES($1,$2,$3,'direct_ai',$4,$4,'loaded',$5)`, [batchId, chapterId, name, questions.length, userId]);
      for (const [index, item] of questions.entries()) {
        const id = ids[index];
        const text = String(item.question || item.questionText).trim();
        const type = item.type === 'type2' ? 'type2' : 'type1';
        const status = ['staged', 'approved', 'excluded', 'archived'].includes(item.status) ? item.status : 'staged';
        const usage = Array.isArray(item.usage) ? [...new Set(item.usage.map(String).filter(Boolean))] : [];
        const data = {
          ...item,
          id: undefined,
          questionId: undefined,
          chapterId: undefined,
          sourceReferences: undefined,
          question: text
        };
        await client.query(`INSERT INTO question_bank(question_id,chapter_id,question_text,normalized_hash,question_type,format,marks,topic_id,subtopic_id,difficulty,pattern_id,usage,status,data,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15)`, [id, chapterId, text, hash(text), type, String(item.format || (type === 'type2' ? 'guided' : 'one_line')), Number(item.marks || item.totalMarks || 1), String(item.topicId || ''), String(item.subtopicId || ''), String(item.difficulty || 'medium'), String(item.patternId || ''), usage, status, JSON.stringify(data), userId]);
        await client.query(`INSERT INTO question_source_reference(source_reference_id,question_id,batch_id,source_name,source_category,question_number) VALUES($1,$2,$3,$4,'AI-generated direct import',$5)`, [randomUUID(), id, batchId, name, String(index + 1)]);
      }
      await client.query('COMMIT');
      return { batchId, imported: questions.length, questionIds: ids };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  async enrich(chapterId: string, items: any[]) {
    if (!Array.isArray(items) || !items.length) throw new UnprocessableEntityException('No enriched questions supplied');
    if (items.length > 2000) throw new UnprocessableEntityException('A single enrichment upload is limited to 2,000 questions');
    const ids = items.map((item) => String(item.id || item.questionId || ''));
    if (ids.some((id) => !id) || new Set(ids).size !== ids.length) throw new UnprocessableEntityException('Every record needs one unique Question ID');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const existing = await client.query('SELECT * FROM question_bank WHERE chapter_id=$1 AND question_id=ANY($2::varchar[]) FOR UPDATE', [chapterId, ids]);
      if (existing.rowCount !== ids.length) {
        const found = new Set(existing.rows.map((row) => row.question_id));
        throw new UnprocessableEntityException(
          `Unknown Question ID(s): ${ids
            .filter((id) => !found.has(id))
            .slice(0, 10)
            .join(', ')}`
        );
      }
      const byId = new Map(existing.rows.map((row) => [row.question_id, row]));
      for (const item of items) {
        const id = String(item.id || item.questionId),
          old = byId.get(id),
          text = String(item.question ?? old.question_text).trim();
        if (!text) throw new UnprocessableEntityException(`${id}: question text is required`);
        const data = {
            ...old.data,
            ...item,
            id: undefined,
            chapterId: undefined,
            sourceReferences: undefined
          },
          type = item.type || old.question_type,
          marks = type === 'type2' && Array.isArray(data.steps) ? data.steps.reduce((sum: number, step: any) => sum + Number(step.marks || 0), 0) : Number(item.marks ?? old.marks),
          topicId = item.topicId ?? old.topic_id,
          patternId = item.patternId ?? old.pattern_id,
          usage = [...new Set(item.usage || old.usage)],
          status = item.status || old.status;
        if (type === 'type2' && (!Array.isArray(data.steps) || data.steps.length < 2)) throw new UnprocessableEntityException(`${id}: Type 2 needs at least two subquestions`);
        if (status === 'approved') {
          if (!topicId || !patternId) throw new UnprocessableEntityException(`${id}: Topic and Pattern ID are required before approval`);
          if (!(data.correctAnswer || data.answer || data.finalAnswer)) throw new UnprocessableEntityException(`${id}: correct answer is required before approval`);
          if (!(data.explanation || data.solution || data.finalAnswer)) throw new UnprocessableEntityException(`${id}: explanation is required before approval`);
          if (!usage.includes('cycle_test')) usage.push('cycle_test');
        }
        await client.query(`UPDATE question_bank SET question_text=$2,normalized_hash=$3,question_type=$4,format=$5,marks=$6,topic_id=$7,subtopic_id=$8,difficulty=$9,pattern_id=$10,usage=$11,status=$12,data=$13::jsonb,updated_at=now() WHERE question_id=$1`, [id, text, hash(text), type, item.format || old.format, marks, topicId, item.subtopicId ?? old.subtopic_id, item.difficulty || old.difficulty, patternId, usage, status, JSON.stringify(data)]);
      }
      await client.query('COMMIT');
      return { updated: items.length, questionIds: ids };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  private cryptoKey() {
    const secret = process.env.AI_KEY_ENCRYPTION_SECRET;
    if (!secret || secret.length < 24) throw new UnprocessableEntityException('Set AI_KEY_ENCRYPTION_SECRET (at least 24 characters) on the API server first');
    return createHash('sha256').update(secret).digest();
  }
  private encrypt(value: string) {
    const iv = randomBytes(12),
      cipher = createCipheriv('aes-256-gcm', this.cryptoKey(), iv),
      encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join('.');
  }
  private decrypt(value: string) {
    const [iv, tag, data] = value.split('.'),
      decipher = createDecipheriv('aes-256-gcm', this.cryptoKey(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
  }
  private admin(user: any) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin access required');
  }
  async aiSettings(user: any) {
    this.admin(user);
    const r = await query('SELECT * FROM ai_integration_setting WHERE setting_id=1'),
      x = r.rows[0];
    return {
      provider: x.provider,
      keyConfigured: Boolean(x.encrypted_api_key),
      keyLast4: x.key_last4,
      active: x.active,
      allowedPurposes: x.allowed_purposes,
      maxRequestUsd: Number(x.max_request_usd),
      dailyLimitUsd: Number(x.daily_limit_usd),
      monthlyLimitUsd: Number(x.monthly_limit_usd),
      updatedAt: x.updated_at
    };
  }
  async saveAiSettings(body: any, user: any) {
    this.admin(user);
    const current = (await query('SELECT * FROM ai_integration_setting WHERE setting_id=1')).rows[0],
      encrypted = body.apiKey ? this.encrypt(String(body.apiKey)) : current.encrypted_api_key,
      last4 = body.apiKey ? String(body.apiKey).slice(-4) : current.key_last4;
    if (body.active && !encrypted) throw new UnprocessableEntityException('Maintain an API key before activating AI');
    await query(`UPDATE ai_integration_setting SET encrypted_api_key=$1,key_last4=$2,active=$3,allowed_purposes=$4::jsonb,max_request_usd=$5,daily_limit_usd=$6,monthly_limit_usd=$7,updated_by=$8,updated_at=now() WHERE setting_id=1`, [encrypted, last4, Boolean(body.active), JSON.stringify(body.allowedPurposes || {}), Number(body.maxRequestUsd || 0.25), Number(body.dailyLimitUsd || 2), Number(body.monthlyLimitUsd || 10), user.id]);
    return this.aiSettings(user);
  }
  async aiAnalyse(chapterId: string, ids: string[], user: any) {
    this.admin(user);
    if (!ids.length || ids.length > 20) throw new UnprocessableEntityException('Select between 1 and 20 questions');
    const setting = (await query('SELECT * FROM ai_integration_setting WHERE setting_id=1')).rows[0];
    if (!setting.active || !setting.encrypted_api_key || !setting.allowed_purposes?.question_analysis) throw new UnprocessableEntityException('AI question analysis is not active in Admin settings');
    const questions = await query('SELECT question_id,question_text,data FROM question_bank WHERE chapter_id=$1 AND question_id=ANY($2::varchar[])', [chapterId, ids]),
      chapter = (await query('SELECT content FROM chapter_library WHERE chapter_id=$1', [chapterId])).rows[0],
      model = 'gpt-5-mini',
      auditId = randomUUID();
    await query(`INSERT INTO ai_usage_audit(audit_id,user_id,chapter_id,purpose,model,item_count,status) VALUES($1,$2,$3,'question_analysis',$4,$5,'started')`, [auditId, user.id, chapterId, model, questions.rowCount]);
    try {
      const key = this.decrypt(setting.encrypted_api_key),
        topics = (chapter?.content?.topics || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          subtopics: (t.subtopics || []).map((s: any) => ({
            id: s.id,
            title: s.title
          }))
        })),
        response = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${key}`,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model,
            input: [
              {
                role: 'system',
                content: 'Classify educational questions. Return JSON only: {"questions":[{"id":"","topicId":"","subtopicId":"","type":"type1|type2","format":"mcq|true_false|fill_blank|one_line|match|sequence|guided","marks":1,"difficulty":"easy|medium|hard|competency","patternId":"","duplicateStatus":"unique|near_duplicate|same_pattern|review_required","duplicateOf":null,"duplicateGroupId":null,"duplicateReason":"","duplicateConfidence":0.0}]}. Use competency only for Type 2 competency-based questions. Do not delete or merge records.'
              },
              {
                role: 'user',
                content: JSON.stringify({ topics, questions: questions.rows })
              }
            ],
            text: { format: { type: 'json_object' } }
          })
        });
      const payload: any = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || 'OpenAI request failed');
      const output =
          payload.output_text ||
          payload.output
            ?.flatMap((x: any) => x.content || [])
            .map((x: any) => x.text)
            .filter(Boolean)
            .join(''),
        parsed = JSON.parse(output);
      await query(`UPDATE ai_usage_audit SET status='completed' WHERE audit_id=$1`, [auditId]);
      return { suggestions: parsed.questions || [], auditId };
    } catch (error: any) {
      await query(`UPDATE ai_usage_audit SET status='failed',error_message=$2 WHERE audit_id=$1`, [auditId, error.message]);
      throw new UnprocessableEntityException(error.message);
    }
  }
}
