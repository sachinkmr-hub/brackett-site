import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ transaction: vi.fn(), select: vi.fn(), insert: vi.fn(), activity: vi.fn() }));
vi.mock('../src/db/index.js', () => ({ db: mocks }));
vi.mock('../src/modules/activity/activity.service.js', () => ({ ActivityService: { record: mocks.activity } }));
import { QuestionsService } from '../src/modules/questions/questions.service.js';
beforeEach(() => vi.resetAllMocks());
describe('decision persistence safeguards', () => {
  it('rejects another workspace board before creating a question', async () => {
    mocks.select.mockReturnValue({ from: () => ({ where: () => ({ limit: async () => [] }) }) });
    await expect(QuestionsService.create('workspace-a', 'user-a', { title: 'Pricing?', boardId: 'other-board' }))
      .rejects.toThrow('Board not found in this workspace');
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it('propagates an insert failure from inside the transaction', async () => {
    let updateAttempted = false;
    mocks.transaction.mockImplementation(async callback => callback({
      update: () => ({ set: () => ({ where: () => ({ returning: async () => { updateAttempted = true; return [{ id: 'q1', title: 'Pricing?' }]; } }) }) }),
      insert: () => ({ values: () => ({ returning: async () => { throw new Error('write failed'); } }) }),
    }));
    await expect(QuestionsService.logDecision('workspace-a', 'q1', 'user-a', { decisionText: 'Run experiment' })).rejects.toThrow('write failed');
    expect(updateAttempted).toBe(true);
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.activity).not.toHaveBeenCalled();
  });
});
