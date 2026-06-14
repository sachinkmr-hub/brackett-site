import { Request, Response } from 'express';
import { db } from '../../db/index.js';
import { workspaces, workspaceMembers } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { getErrorMessage } from '../../utils/errors.js';

export class WorkspacesController {
  static async listUserWorkspaces(req: Request, res: Response) {
    try {
      const userId = req.user.id;
      const userWorkspaces = await db.select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        role: workspaceMembers.role
      })
      .from(workspaces)
      .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(eq(workspaceMembers.userId, userId));

      res.json(userWorkspaces);
    } catch (error: unknown) {
      res.status(500).json({ code: 'SERVER_ERROR', message: getErrorMessage(error) });
    }
  }

  static async getWorkspace(req: Request, res: Response) {
    try {
      const workspaceId = req.workspaceId!;
      const [workspace] = await db.select()
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .limit(1);

      res.json(workspace);
    } catch (error: unknown) {
      res.status(500).json({ code: 'SERVER_ERROR', message: getErrorMessage(error) });
    }
  }
}
