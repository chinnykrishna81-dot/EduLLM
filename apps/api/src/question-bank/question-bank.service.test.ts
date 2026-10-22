import { beforeEach, describe, expect, it, vi } from 'vitest';

const clientQuery = vi.fn();
const release = vi.fn();

vi.mock('../db/database', () => ({
  pool: { connect: vi.fn(async () => ({ query: clientQuery, release })) },
  query: vi.fn()
}));

import { QuestionBankService } from './question-bank.service';

describe('QuestionBankService explanation updates', () => {
  beforeEach(() => {
    clientQuery.mockReset();
    release.mockReset();
  });

  it('updates only Type 1 and Type 2 explanation fields in one transaction', async () => {
    const rows = [
      {
        question_id: 'T1-1',
        question_type: 'type1',
        data: { question: 'Original question', correctAnswer: 'A', explanation: 'Old explanation', usage: ['cycle_test'] }
      },
      {
        question_id: 'T2-1',
        question_type: 'type2',
        data: {
          question: 'Original guided question',
          finalAnswer: 'Old consolidated answer',
          steps: [
            { id: 'step-a', prompt: 'First prompt', answer: 'First answer', explanation: 'Old first explanation' },
            { id: 'step-b', prompt: 'Second prompt', answer: 'Second answer', explanation: 'Old second explanation' }
          ]
        }
      }
    ];
    clientQuery.mockImplementation(async (sql: string) =>
      sql.startsWith('SELECT * FROM question_bank') ? { rows, rowCount: rows.length } : { rows: [], rowCount: 0 }
    );

    const result = await new QuestionBankService().updateExplanations('chapter-1', [
      { id: 'T1-1', explanation: '<p>Expanded Type 1 explanation</p>' },
      {
        id: 'T2-1',
        finalAnswer: '<p>Expanded consolidated answer</p>',
        steps: [{ explanation: 'Expanded first explanation' }, { explanation: 'Expanded second explanation' }]
      }
    ]);

    expect(result).toMatchObject({ updated: 2, type1Updated: 1, type2Updated: 1 });
    const updates = clientQuery.mock.calls.filter(([sql]) => String(sql).startsWith('UPDATE question_bank'));
    const type1 = JSON.parse(updates[0][1][1]);
    const type2 = JSON.parse(updates[1][1][1]);
    expect(type1).toMatchObject({ question: 'Original question', correctAnswer: 'A', explanation: '<p>Expanded Type 1 explanation</p>' });
    expect(type2).toMatchObject({
      question: 'Original guided question',
      finalAnswer: '<p>Expanded consolidated answer</p>',
      steps: [
        { id: 'step-a', prompt: 'First prompt', answer: 'First answer', explanation: 'Expanded first explanation' },
        { id: 'step-b', prompt: 'Second prompt', answer: 'Second answer', explanation: 'Expanded second explanation' }
      ]
    });
    expect(clientQuery).toHaveBeenCalledWith('COMMIT');
    expect(release).toHaveBeenCalledOnce();
  });

  it('rolls back without updating when any Question ID is missing', async () => {
    clientQuery.mockImplementation(async (sql: string) =>
      sql.startsWith('SELECT * FROM question_bank') ? { rows: [], rowCount: 0 } : { rows: [], rowCount: 0 }
    );

    await expect(
      new QuestionBankService().updateExplanations('chapter-1', [{ id: 'UNKNOWN', explanation: 'New explanation' }])
    ).rejects.toThrow('Question ID was not found in this chapter');

    expect(clientQuery.mock.calls.some(([sql]) => String(sql).startsWith('UPDATE question_bank'))).toBe(false);
    expect(clientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(release).toHaveBeenCalledOnce();
  });
});
