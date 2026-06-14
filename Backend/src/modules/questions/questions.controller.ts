import { Request, Response } from 'express';
import { z } from 'zod';
import { QuestionsService } from './questions.service.js';
import { getErrorMessage } from '../../utils/errors.js';

const emptyToUndefined = (value: unknown) => value === '' ? undefined : value;

const createQuestionSchema = z.object({
  title: z.string().trim().min(1),
  longDescription: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  sourceType: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  sourceUrl: z.preprocess(emptyToUndefined, z.string().url().optional()),
  sourceLabel: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  sourceExcerpt: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  category: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  priority: z.preprocess(emptyToUndefined, z.enum(['low', 'medium', 'high', 'critical']).optional()),
  boardId: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
});

const statusSchema = z.object({
  status: z.enum(['open', 'active', 'in_progress', 'answered', 'archived']),
});

const decisionSchema = z.object({
  decisionText: z.string().trim().min(1),
  sourceSummary: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  sourceUrl: z.preprocess(emptyToUndefined, z.string().url().optional()),
});

const optionalQuery = (value: unknown) => {
  if (Array.isArray(value)) return value[0];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const routeParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0];
  return value || '';
};

const compact = (value: Record<string, unknown>) => Object.fromEntries(
  Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
);

export class QuestionsController {
  static async create(req: Request, res: Response) {
    try {
      const data = compact(createQuestionSchema.parse(req.body));
      const question = await QuestionsService.create(req.workspaceId!, req.user.id, data);
      res.status(201).json(question);
    } catch (error: unknown) {
      res.status(400).json({ code: 'BAD_REQUEST', message: getErrorMessage(error) });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const questions = await QuestionsService.list(req.workspaceId!, {
        q: optionalQuery(req.query.q),
        status: optionalQuery(req.query.status),
        priority: optionalQuery(req.query.priority),
        category: optionalQuery(req.query.category),
        assigneeId: optionalQuery(req.query.assigneeId),
        boardId: optionalQuery(req.query.boardId),
      });
      res.json(questions);
    } catch (error: unknown) {
      res.status(400).json({ code: 'BAD_REQUEST', message: getErrorMessage(error) });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const question = await QuestionsService.getById(req.workspaceId!, routeParam(req.params.questionId));
      if (!question) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Question not found' });
      }

      res.json(question);
    } catch (error: unknown) {
      res.status(400).json({ code: 'BAD_REQUEST', message: getErrorMessage(error) });
    }
  }

  static async updateStatus(req: Request, res: Response) {
    try {
      const { status } = statusSchema.parse(req.body);
      const question = await QuestionsService.updateStatus(
        req.workspaceId!,
        routeParam(req.params.questionId),
        req.user.id,
        status
      );
      res.json(question);
    } catch (error: unknown) {
      res.status(400).json({ code: 'BAD_REQUEST', message: getErrorMessage(error) });
    }
  }

  static async logDecision(req: Request, res: Response) {
    try {
      const data = compact(decisionSchema.parse(req.body));
      const decision = await QuestionsService.logDecision(
        req.workspaceId!,
        routeParam(req.params.questionId),
        req.user.id,
        data
      );
      res.status(201).json(decision);
    } catch (error: unknown) {
      res.status(400).json({ code: 'BAD_REQUEST', message: getErrorMessage(error) });
    }
  }
}
