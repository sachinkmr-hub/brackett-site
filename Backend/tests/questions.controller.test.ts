import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuestionsController } from '../src/modules/questions/questions.controller.js';
import type { AuthenticatedUser } from '../src/types/auth.js';

const questionsServiceMock = vi.hoisted(() => ({
  create: vi.fn(),
  list: vi.fn(),
  getById: vi.fn(),
  updateStatus: vi.fn(),
  logDecision: vi.fn(),
}));

vi.mock('../src/modules/questions/questions.service.js', () => ({
  QuestionsService: {
    ...questionsServiceMock,
    getHistory: vi.fn(),
    getAnnouncementDraft: vi.fn(),
    sendAnnouncement: vi.fn(),
    updateAssignees: vi.fn(),
    addComment: vi.fn(),
    autoAssign: vi.fn(),
    export: vi.fn(),
    exportPdf: vi.fn(),
  },
}));

const workspaceId = '22222222-2222-4222-8222-222222222222';
const user: AuthenticatedUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'founder@brackett.test',
  passwordHash: 'hash',
  authProvider: 'local',
  authUserId: null,
  name: 'Founder',
  avatarUrl: null,
  emailVerifiedAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  lastLoginAt: null,
};

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    req.workspaceId = workspaceId;
    next();
  });
  app.post('/questions', QuestionsController.create);
  app.get('/questions', QuestionsController.list);
  app.get('/questions/:questionId', QuestionsController.getById);
  app.patch('/questions/:questionId/status', QuestionsController.updateStatus);
  app.post('/questions/:questionId/decision', QuestionsController.logDecision);
  return app;
};

describe('questions controller', () => {
  beforeEach(() => {
    questionsServiceMock.create.mockReset();
    questionsServiceMock.list.mockReset();
    questionsServiceMock.getById.mockReset();
    questionsServiceMock.updateStatus.mockReset();
    questionsServiceMock.logDecision.mockReset();
  });

  it('creates a question with validated payload and workspace context', async () => {
    const question = {
      id: '33333333-3333-4333-8333-333333333333',
      workspaceId,
      title: 'Should we change pricing?',
      status: 'open',
      priority: 'high',
    };
    questionsServiceMock.create.mockResolvedValue(question);

    const response = await request(makeApp())
      .post('/questions')
      .send({
        title: 'Should we change pricing?',
        priority: 'high',
        sourceType: 'chat',
        sourceUrl: '',
      })
      .expect(201);

    expect(response.body).toEqual(question);
    expect(questionsServiceMock.create).toHaveBeenCalledWith(
      workspaceId,
      user.id,
      {
        title: 'Should we change pricing?',
        priority: 'high',
        sourceType: 'chat',
      }
    );
  });

  it('rejects invalid question payloads before service execution', async () => {
    const response = await request(makeApp())
      .post('/questions')
      .send({
        title: '',
        priority: 'not-a-priority',
      })
      .expect(400);

    expect(response.body.code).toBe('BAD_REQUEST');
    expect(questionsServiceMock.create).not.toHaveBeenCalled();
  });

  it('lists questions with supported filters', async () => {
    questionsServiceMock.list.mockResolvedValue([
      {
        id: '33333333-3333-4333-8333-333333333333',
        title: 'Should we change pricing?',
        status: 'open',
      },
    ]);

    const response = await request(makeApp())
      .get('/questions')
      .query({ q: 'pricing', status: 'open', priority: 'high' })
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(questionsServiceMock.list).toHaveBeenCalledWith(workspaceId, {
      q: 'pricing',
      status: 'open',
      priority: 'high',
      category: undefined,
      assigneeId: undefined,
      boardId: undefined,
    });
  });

  it('returns 404 when a question is outside the workspace', async () => {
    questionsServiceMock.getById.mockResolvedValue(null);

    const response = await request(makeApp())
      .get('/questions/33333333-3333-4333-8333-333333333333')
      .expect(404);

    expect(response.body).toEqual({
      code: 'NOT_FOUND',
      message: 'Question not found',
    });
  });

  it('updates question status through the service', async () => {
    const updated = {
      id: '33333333-3333-4333-8333-333333333333',
      status: 'in_progress',
    };
    questionsServiceMock.updateStatus.mockResolvedValue(updated);

    const response = await request(makeApp())
      .patch('/questions/33333333-3333-4333-8333-333333333333/status')
      .send({ status: 'in_progress' })
      .expect(200);

    expect(response.body).toEqual(updated);
    expect(questionsServiceMock.updateStatus).toHaveBeenCalledWith(
      workspaceId,
      '33333333-3333-4333-8333-333333333333',
      user.id,
      'in_progress'
    );
  });

  it('logs a decision with optional source fields', async () => {
    const decision = {
      id: '44444444-4444-4444-8444-444444444444',
      type: 'decision_logged',
    };
    questionsServiceMock.logDecision.mockResolvedValue(decision);

    const response = await request(makeApp())
      .post('/questions/33333333-3333-4333-8333-333333333333/decision')
      .send({
        decisionText: 'Run the $29 pricing test for two weeks.',
        sourceSummary: 'Weekly review',
        sourceUrl: '',
      })
      .expect(201);

    expect(response.body).toEqual(decision);
    expect(questionsServiceMock.logDecision).toHaveBeenCalledWith(
      workspaceId,
      '33333333-3333-4333-8333-333333333333',
      user.id,
      {
        decisionText: 'Run the $29 pricing test for two weeks.',
        sourceSummary: 'Weekly review',
      }
    );
  });
});
