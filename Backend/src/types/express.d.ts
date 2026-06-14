import type { Logger } from 'pino';
import type { AuthenticatedBy, AuthenticatedUser } from './auth.js';

declare global {
  namespace Express {
    interface Request {
      user: AuthenticatedUser;
      workspaceRole?: string;
      workspaceId?: string;
      authenticatedBy?: AuthenticatedBy;
      id?: string;
      log?: Logger;
    }
  }
}

export {};
