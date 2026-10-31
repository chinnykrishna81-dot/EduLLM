export type PracticeQuestion = {
  id: string;
  type: string;
  difficulty: string;
  patternId?: string;
};

/** Select an independent quota per pattern and selected question type. */
export function selectPracticeQuestionIds(
  questions: PracticeQuestion[],
  difficulties: string[],
  questionsPerPattern: number,
  typeFilter: 'type1' | 'type2' | 'both',
) {
  const quota = Math.max(1, Math.floor(questionsPerPattern));
  const selectedTypes = typeFilter === 'both' ? ['type1', 'type2'] : [typeFilter];
  const groups = new Map<string, PracticeQuestion[]>();

  for (const question of questions) {
    if (!difficulties.includes(question.difficulty)) continue;
    const pattern = question.patternId || '(no pattern)';
    const key = `${pattern}\u0000${question.type}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(question);
  }

  const patterns = new Set(questions.map(question => question.patternId || '(no pattern)'));
  const ids = new Set<string>();
  const missing: Array<{ pattern: string; type: string }> = [];
  for (const pattern of patterns) {
    for (const type of selectedTypes) {
      const candidates = groups.get(`${pattern}\u0000${type}`) || [];
      if (!candidates.length) missing.push({ pattern, type });
      candidates.slice(0, quota).forEach(question => ids.add(question.id));
    }
  }
  return { ids, missing };
}
