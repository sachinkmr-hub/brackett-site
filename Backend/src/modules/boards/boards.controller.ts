import { Request, Response } from 'express';
import { z } from 'zod';
import { BoardsService } from './boards.service.js';
import { errorMessageEquals, errorMessageIncludes, getErrorMessage } from '../../utils/errors.js';

const createBoardSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isArchived: z.boolean().optional(),
});

const updateBoardSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isArchived: z.boolean().optional(),
});

const requireBoardManager = (role: string | undefined) => {
  if (role !== 'owner' && role !== 'admin') {
    throw new Error('Only workspace owners or admins can manage boards');
  }
};

const routeParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0];
  return value || '';
};

export class BoardsController {
  static async list(req: Request, res: Response) {
    try {
      const archivedQuery = typeof req.query.archived === 'string' ? req.query.archived : undefined;
      const archived =
        archivedQuery === 'true' ? true :
        archivedQuery === 'false' ? false :
        undefined;

      const boardList = await BoardsService.list(req.workspaceId!, {
        q: typeof req.query.q === 'string' ? req.query.q : undefined,
        archived,
      });
      res.json(boardList);
    } catch (error: unknown) {
      res.status(500).json({ code: 'SERVER_ERROR', message: getErrorMessage(error) });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const board = await BoardsService.getById(req.workspaceId!, routeParam(req.params.boardId));
      if (!board) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Board not found' });
      }

      res.json(board);
    } catch (error: unknown) {
      res.status(500).json({ code: 'SERVER_ERROR', message: getErrorMessage(error) });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      requireBoardManager(req.workspaceRole);
      const data = createBoardSchema.parse(req.body);
      const board = await BoardsService.create(req.workspaceId!, data);
      res.status(201).json(board);
    } catch (error: unknown) {
      const statusCode = errorMessageIncludes(error, 'workspace owners or admins') ? 403 : 400;
      res.status(statusCode).json({ code: statusCode === 403 ? 'FORBIDDEN' : 'BAD_REQUEST', message: getErrorMessage(error) });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      requireBoardManager(req.workspaceRole);
      const data = updateBoardSchema.parse(req.body);
      const board = await BoardsService.update(req.workspaceId!, routeParam(req.params.boardId), data);
      res.json(board);
    } catch (error: unknown) {
      if (errorMessageEquals(error, 'Board not found')) {
        return res.status(404).json({ code: 'NOT_FOUND', message: getErrorMessage(error) });
      }

      const statusCode = errorMessageIncludes(error, 'workspace owners or admins') ? 403 : 400;
      res.status(statusCode).json({ code: statusCode === 403 ? 'FORBIDDEN' : 'BAD_REQUEST', message: getErrorMessage(error) });
    }
  }
}
