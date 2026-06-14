import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import { verifyAccessToken } from '../utils/jwt.js';
import { db } from '../db/index.js';
import { users, workspaceMembers } from '../db/schema.js';
import { isClerkConfigured } from '../config/clerk.js';
import { eq, and } from 'drizzle-orm';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    try {
      const payload = verifyAccessToken(token);

      const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
      
      if (!user) {
        return res.status(401).json({ code: 'UNAUTHORIZED', message: 'User not found' });
      }

      req.user = user;
      req.authenticatedBy = 'app_jwt';
      return next();
    } catch {
      // If the bearer token is a Clerk token, fall through to Clerk auth below.
    }
  }

  if (isClerkConfigured()) {
    try {
      const { userId } = getAuth(req);

      if (userId) {
        const [user] = await db.select()
          .from(users)
          .where(and(
            eq(users.authProvider, 'clerk'),
            eq(users.authUserId, userId)
          ))
          .limit(1);

        if (user) {
          req.user = user;
          req.authenticatedBy = 'clerk';
          return next();
        }

        return res.status(401).json({
          code: 'BRACKETT_ACCOUNT_NOT_PROVISIONED',
          message: 'Finish Clerk sign-in by calling /auth/clerk/session first.',
        });
      }
    } catch {
      // Clerk middleware is optional during local development with placeholder keys.
    }
  }

  return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing or invalid token' });
};

export const requireWorkspaceContext = async (req: Request, res: Response, next: NextFunction) => {
  const workspaceId = req.params.workspaceId || req.headers['x-workspace-id'];
  
  if (!workspaceId || typeof workspaceId !== 'string') {
    return res.status(400).json({ code: 'BAD_REQUEST', message: 'Workspace context required' });
  }

  try {
    const [membership] = await db.select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, req.user.id)
        )
      ).limit(1);

    if (!membership) {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Not a member of this workspace' });
    }

    req.workspaceId = workspaceId;
    req.workspaceRole = membership.role;
    next();
  } catch (error) {
    next(error);
  }
};
