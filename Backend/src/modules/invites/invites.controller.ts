import { Request, Response } from 'express';
import { z } from 'zod';
import { InvitesService } from './invites.service.js';
import type { AuthenticatedUser } from '../../types/auth.js';
import { errorMessageIncludes, getErrorMessage } from '../../utils/errors.js';

const inviteRoleSchema = z.enum(['owner', 'admin', 'member', 'viewer']);

const createInviteSchema = z.object({
  email: z.string().email(),
  role: inviteRoleSchema.default('member'),
});

const acceptInviteSchema = z.object({
  token: z.string().min(1),
});

const routeParam = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value[0];
  return value || '';
};

const requireInviteManager = (role: string | undefined) => {
  if (role !== 'owner' && role !== 'admin') {
    throw new Error('Only workspace owners or admins can manage invites');
  }
};

const requireVerifiedInviteIdentity = (user: AuthenticatedUser) => {
  if (process.env.NODE_ENV === 'production' && !user.emailVerifiedAt) {
    throw new Error('Verify your email before accepting workspace invites');
  }
};

export class InvitesController {
  static async list(req: Request, res: Response) {
    try {
      requireInviteManager(req.workspaceRole);
      const inviteList = await InvitesService.list(req.workspaceId!);
      res.json(inviteList);
    } catch (error: unknown) {
      res.status(403).json({ code: 'FORBIDDEN', message: getErrorMessage(error) });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      requireInviteManager(req.workspaceRole);
      const data = createInviteSchema.parse(req.body);

      if (data.role === 'owner' && req.workspaceRole !== 'owner') {
        return res.status(403).json({
          code: 'FORBIDDEN',
          message: 'Only workspace owners can invite another owner',
        });
      }

      const invite = await InvitesService.create(req.workspaceId!, req.user.id, data);
      res.status(201).json(invite);
    } catch (error: unknown) {
      const statusCode = errorMessageIncludes(error, 'workspace owners or admins') ? 403 : 400;
      res.status(statusCode).json({ code: statusCode === 403 ? 'FORBIDDEN' : 'BAD_REQUEST', message: getErrorMessage(error) });
    }
  }

  static async revoke(req: Request, res: Response) {
    try {
      requireInviteManager(req.workspaceRole);
      const result = await InvitesService.revoke(req.workspaceId!, routeParam(req.params.inviteId));
      res.json(result);
    } catch (error: unknown) {
      const statusCode = errorMessageIncludes(error, 'workspace owners or admins') ? 403 : 400;
      res.status(statusCode).json({ code: statusCode === 403 ? 'FORBIDDEN' : 'BAD_REQUEST', message: getErrorMessage(error) });
    }
  }

  static async accept(req: Request, res: Response) {
    try {
      requireVerifiedInviteIdentity(req.user);
      const { token } = acceptInviteSchema.parse(req.body);
      const result = await InvitesService.accept(req.user.id, req.user.email, token);
      res.json(result);
    } catch (error: unknown) {
      res.status(400).json({ code: 'BAD_REQUEST', message: getErrorMessage(error) });
    }
  }
}
