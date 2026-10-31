import { describe, expect, it } from 'vitest';
import { selectPracticeQuestionIds } from './practiceSelection';

const question = (id: string, type: 'type1' | 'type2', patternId: string, difficulty = 'medium') => ({ id, type, patternId, difficulty });

describe('practice auto-selection', () => {
  it('gives Type 1 and Type 2 independent quotas when both are selected', () => {
    const result = selectPracticeQuestionIds([
      question('t2-a', 'type2', 'P1'), question('t2-b', 'type2', 'P1'),
      question('t1-a', 'type1', 'P1'), question('t1-b', 'type1', 'P1'),
    ], ['medium'], 1, 'both');
    expect([...result.ids]).toEqual(['t1-a', 't2-a']);
    expect(result.missing).toEqual([]);
  });

  it('reports a missing type while retaining the available type', () => {
    const result = selectPracticeQuestionIds([question('t2-a', 'type2', 'P1')], ['medium'], 2, 'both');
    expect([...result.ids]).toEqual(['t2-a']);
    expect(result.missing).toEqual([{ pattern: 'P1', type: 'type1' }]);
  });

  it('applies the selected difficulty filter', () => {
    const result = selectPracticeQuestionIds([
      question('easy', 'type1', 'P1', 'easy'), question('hard', 'type1', 'P1', 'hard'),
    ], ['hard'], 2, 'type1');
    expect([...result.ids]).toEqual(['hard']);
  });
});
