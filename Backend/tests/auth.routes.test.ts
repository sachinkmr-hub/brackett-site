import request from 'supertest';
import cookieParser from 'cookie-parser';
import express from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import authRoutes from '../src/modules/auth/auth.routes.js';
import { getErrorMessage } from '../src/utils/errors.js';

const authServiceMock = vi.hoisted(() => ({
  signup: vi.fn(),
  login: vi.fn(),
  listUserWorkspaces: vi.fn(),
  createSession: vi.fn(),
  refreshSession: vi.fn(),
  revokeSession: vi.fn(),
  getRefreshTokenMaxAgeMs: vi.fn(() => 7 * 24 * 60 * 60 * 1000),
}));

vi.mock('../src/modules/auth/auth.service.js', () => ({
  AuthService: authServiceMock,
}));

describe('auth routes', () => {
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'founder@brackett.test',
    name: 'Founder',
    avatarUrl: null,
    authProvider: 'local',
  };

  const workspace = {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Brackett Labs',
    slug: 'brackett-labs',
    role: 'owner',
  };

  beforeEach(() => {
    authServiceMock.signup.mockReset();
    authServiceMock.login.mockReset();
    authServiceMock.listUserWorkspaces.mockReset();
    authServiceMock.createSession.mockReset();
    authServiceMock.refreshSession.mockReset();
    authServiceMock.revokeSession.mockReset();
    authServiceMock.getRefreshTokenMaxAgeMs.mockReturnValue(7 * 24 * 60 * 60 * 1000);
  });

  const makeApp = () => {
    const app = express();
    app.use(express.json({ limit: '1mb' }));
    app.use(cookieParser());
    app.use('/auth', authRoutes);
    app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const status = typeof (err as { status?: unknown })?.status === 'number'
        ? (err as { status: number }).status
        : 500;
      res.status(status).json({
        code: 'INTERNAL_ERROR',
        message: getErrorMessage(err),
      });
    });
    return app;
  };

  it('creates a local account and sets an HttpOnly refresh cookie', async () => {
    authServiceMock.signup.mockResolvedValue({ user, workspace });
    authServiceMock.listUserWorkspaces.mockResolvedValue([workspace]);
    authServiceMock.createSession.mockResolvedValue({
      accessToken: 'access-token-1',
      rawRefreshToken: 'refresh-token-1',
    });

    const response = await request(makeApp())
      .post('/auth/signup')
      .send({
        email: 'founder@brackett.test',
        password: 'password123',
        name: 'Founder',
        workspaceName: 'Brackett Labs',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        authProvider: 'local',
      },
      workspace,
      accessToken: 'access-token-1',
    });
    expect(response.headers['set-cookie']?.[0]).toContain('refreshToken=refresh-token-1');
    expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly');
    expect(response.headers['set-cookie']?.[0]).toContain('SameSite=Lax');
    expect(authServiceMock.signup).toHaveBeenCalledWith({
      email: 'founder@brackett.test',
      password: 'password123',
      name: 'Founder',
      workspaceName: 'Brackett Labs',
    });
  });

  it('logs in and rotates app session material into a refresh cookie', async () => {
    authServiceMock.login.mockResolvedValue(user);
    authServiceMock.listUserWorkspaces.mockResolvedValue([workspace]);
    authServiceMock.createSession.mockResolvedValue({
      accessToken: 'access-token-2',
      rawRefreshToken: 'refresh-token-2',
    });

    const response = await request(makeApp())
      .post('/auth/login')
      .send({
        email: 'founder@brackett.test',
        password: 'password123',
      })
      .expect(200);

    expect(response.body.accessToken).toBe('access-token-2');
    expect(response.body.workspace).toEqual(workspace);
    expect(response.headers['set-cookie']?.[0]).toContain('refreshToken=refresh-token-2');
    expect(authServiceMock.login).toHaveBeenCalledWith({
      email: 'founder@brackett.test',
      password: 'password123',
    });
  });

  it('rejects refresh without a refresh cookie', async () => {
    const response = await request(makeApp())
      .post('/auth/refresh')
      .send({})
      .expect(401);

    expect(response.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'No refresh token provided',
    });
    expect(authServiceMock.refreshSession).not.toHaveBeenCalled();
  });

  it('rotates a refresh token and sends the replacement cookie', async () => {
    authServiceMock.refreshSession.mockResolvedValue({
      accessToken: 'access-token-3',
      rawRefreshToken: 'refresh-token-3',
    });

    const response = await request(makeApp())
      .post('/auth/refresh')
      .set('Cookie', 'refreshToken=refresh-token-2')
      .send({})
      .expect(200);

    expect(response.body).toEqual({ accessToken: 'access-token-3' });
    expect(response.headers['set-cookie']?.[0]).toContain('refreshToken=refresh-token-3');
    expect(authServiceMock.refreshSession).toHaveBeenCalledWith(
      'refresh-token-2',
      expect.any(String),
      expect.any(String)
    );
  });

  it('rejects JSON bodies above the configured limit', async () => {
    const response = await request(makeApp())
      .post('/auth/login')
      .send({
        email: 'founder@brackett.test',
        password: 'password123',
        filler: 'x'.repeat(1_100_000),
      })
      .expect(413);

    expect(response.body.code).toBe('INTERNAL_ERROR');
    expect(response.body.message).toMatch(/too large/i);
  });
});
