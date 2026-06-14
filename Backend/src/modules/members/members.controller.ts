import { Request, Response } from 'express';
import { MembersService } from './members.service.js';
import { getErrorMessage } from '../../utils/errors.js';

export class MembersController {
  static async list(req: Request, res: Response) {
    try {
      const members = await MembersService.list(req.workspaceId as string);
      res.json(members);
    } catch (error: unknown) {
      res.status(500).json({ code: 'SERVER_ERROR', message: getErrorMessage(error) });
    }
  }

  static async updateRole(req: Request, res: Response) {
    try {
      const { membershipId } = req.params;
      const { role } = req.body;
      const membership = await MembersService.updateRole(req.workspaceId as string, membershipId as string, req.user!.id as string, role as string);
      res.json(membership);
    } catch (error: unknown) {
      res.status(400).json({ code: 'BAD_REQUEST', message: getErrorMessage(error) });
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      const { membershipId } = req.params;
      await MembersService.remove(req.workspaceId as string, membershipId as string, req.user!.id as string);
      res.status(204).send();
    } catch (error: unknown) {
      res.status(400).json({ code: 'BAD_REQUEST', message: getErrorMessage(error) });
    }
  }
}
