import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authenticate, requireWorkspaceContext } from '../src/middlewares/auth.middleware.js';
import type { AuthenticatedUser } from '../src/types/auth.js';

const dbMock = vi.hoisted(() => ({
  select: vi.fn(),
}));

const verifyAccessTokenMock = vi.hoisted(() => vi.fn());

vi.mock('../src/db/index.js', () => ({
  db: dbMock,
}));

vi.mock('../src/utils/jwt.js', () => ({
  verifyAccessToken: verifyAccessTokenMock,
}));

vi.mock('../src/config/clerk.js', () => ({
  isClerkConfigured: () => false,
}));

vi.mock('@clerk/express', () => ({
  getAuth: () => ({ userId: null }),
}));

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

const selectRows = (rows: unknown[]) => ({
  from: vi.fn(() => ({
    where: vi.fn(() => ({
      limit: vi.fn(() => Promise.resolve(rows)),
    })),
  })),
});

describe('auth middleware', () => {
  beforeEach(() => {
    dbMock.select.mockReset();
    verifyAccessTokenMock.mockReset();
  });

  it('rejects requests without an app or Clerk token', async () => {
    const app = express();
    app.get('/private', authenticate, (_req, res) => res.status(204).send());

    const response = await request(app).get('/private').expect(401);

    expect(response.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Missing or invalid token',
    });
  });

  it('loads the authenticated user from a valid app JWT', async () => {
    verifyAccessTokenMock.mockReturnValue({ userId: user.id });
    dbMock.select.mockReturnValue(selectRows([user]));

    const app = express();
    app.get('/private', authenticate, (req, res) => {
      res.status(200).json({
        userId: req.user.id,
        authenticatedBy: req.authenticatedBy,
      });
    });

    const response = await request(app)
      .get('/private')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(response.body).toEqual({
      userId: user.id,
      authenticatedBy: 'app_jwt',
    });
  });

  it('blocks workspace routes when the user is not a member', async () => {
    dbMock.select.mockReturnValue(selectRows([]));

    const app = express();
    app.get('/workspaces/:workspaceId/probe', (req, _res, next) => {
      req.user = user;
      next();
    }, requireWorkspaceContext, (_req, res) => res.status(204).send());

    const response = await request(app)
      .get('/workspaces/22222222-2222-4222-8222-222222222222/probe')
      .expect(403);

    expect(response.body).toEqual({
      code: 'FORBIDDEN',
      message: 'Not a member of this workspace',
    });
  });

  it('adds workspace context for valid members', async () => {
    dbMock.select.mockReturnValue(selectRows([{
      workspaceId: '22222222-2222-4222-8222-222222222222',
      userId: user.id,
      role: 'admin',
    }]));

    const app = express();
    app.get('/workspaces/:workspaceId/probe', (req, _res, next) => {
      req.user = user;
      next();
    }, requireWorkspaceContext, (req, res) => {
      res.status(200).json({
        workspaceId: req.workspaceId,
        workspaceRole: req.workspaceRole,
      });
    });

    const response = await request(app)
      .get('/workspaces/22222222-2222-4222-8222-222222222222/probe')
      .expect(200);

    expect(response.body).toEqual({
      workspaceId: '22222222-2222-4222-8222-222222222222',
      workspaceRole: 'admin',
    });
  });
});
