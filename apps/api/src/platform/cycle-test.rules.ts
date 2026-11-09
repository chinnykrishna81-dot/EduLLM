export type MasteryStatus = 'green' | 'yellow' | 'orange';

const normalized = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase().replace(/\s+/g, ' ').replace(/[.,;:]$/, '');
const rounded = (value: number) => Math.round(value * 100) / 100;

export function formIndexForAttempt(attemptNumber: number, formCount: number, repeatFromForm = 0) {
  if (!Number.isInteger(attemptNumber) || attemptNumber < 1) throw new Error('Attempt number must be a positive integer');
  if (!Number.isInteger(formCount) || formCount < 1) throw new Error('At least one Cycle Test form is required');
  const repeatAt = Number.isInteger(repeatFromForm) && repeatFromForm >= 2 ? Math.min(repeatFromForm, formCount + 1) : formCount + 1;
  return attemptNumber < repeatAt ? (attemptNumber - 1) % formCount : (attemptNumber - repeatAt) % (repeatAt - 1);
}

export const retakeUnlockAt = (submittedAt: Date | string, days: number) => new Date(new Date(submittedAt).getTime() + Number(days || 0) * 86_400_000);
export const resultAvailableAt = (submittedAt: Date | string, hours: number) => new Date(new Date(submittedAt).getTime() + Number(hours || 0) * 3_600_000);

const protectedSolutionKeys = new Set([
  'answer', 'correctanswer', 'correctoption', 'correctchoice', 'explanation', 'finalanswer',
  'modelanswer', 'solution', 'solutions', 'markingscheme', 'distractorexplanations',
  'answercontribution', 'answermediarefs', 'explanationmediarefs'
]);

export function sanitizeQuestionForAttempt(value: any): any {
  if (Array.isArray(value)) return value.map(sanitizeQuestionForAttempt);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !protectedSolutionKeys.has(key.toLocaleLowerCase().replace(/[^a-z]/g, '')))
    .map(([key, item]) => [key, sanitizeQuestionForAttempt(item)]));
}

export function evaluateCycleTest(snapshot: any, answers: Record<string, any>) {
  let score = 0, total = 0;
  const topicMap = new Map<string, {topicId: string; topicTitle: string; score: number; total: number}>();
  for (const section of snapshot?.sections || []) for (const question of section.questions || []) {
    const marks = Number(question.totalMarks || question.marks || section.marksPerQuestion || 1);
    total += marks;
    let earned = 0;
    if (question.type === 'type2' || question.steps?.length) {
      const steps = question.steps || [], explicitMarks = steps.reduce((sum: number, step: any) => sum + Number(step.marks || 0), 0);
      for (const step of steps) if (normalized(answers?.[question.id]?.[step.id]) === normalized(step.answer ?? step.correctAnswer)) earned += explicitMarks > 0 ? Number(step.marks || 0) : marks / Math.max(steps.length, 1);
      earned = Math.min(earned, marks);
    } else if (normalized(answers?.[question.id]) === normalized(question.correctAnswer)) earned = marks;
    score += earned;
    const topicId = String(question.topicId || question.patternId || 'unmapped'), topicTitle = String(question.topicTitle || topicId);
    const topic = topicMap.get(topicId) || {topicId, topicTitle, score: 0, total: 0};
    topic.score += earned; topic.total += marks; topicMap.set(topicId, topic);
  }
  const green = Number(snapshot?.mastery?.greenPercent ?? 90), yellow = Number(snapshot?.mastery?.yellowPercent ?? 60);
  const topics = [...topicMap.values()].map(topic => { const percent = topic.total ? rounded(topic.score * 100 / topic.total) : 0; const status: MasteryStatus = percent >= green ? 'green' : percent >= yellow ? 'yellow' : 'orange'; return {...topic, score: rounded(topic.score), total: rounded(topic.total), percent, status}; });
  return {score: rounded(score), total: rounded(total), topics};
}
