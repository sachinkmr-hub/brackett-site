import { CookieOptions, Request, Response } from 'express';
import { clerkClient, getAuth } from '@clerk/express';
import { z } from 'zod';
import { isClerkConfigured } from '../../config/clerk.js';
import { AuthService } from './auth.service.js';
import type { AuthenticatedUser, PublicUser } from '../../types/auth.js';
import { getErrorMessage } from '../../utils/errors.js';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).default('Brackett User'),
  workspaceName: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const clerkSessionSchema = z.object({
  workspaceName: z.string().min(2).optional(),
});

const toPublicUser = (user: AuthenticatedUser): PublicUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  avatarUrl: user.avatarUrl,
  authProvider: user.authProvider,
});

const refreshCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
  maxAge: AuthService.getRefreshTokenMaxAgeMs(),
});

const clearRefreshCookieOptions = (): CookieOptions => {
  const { maxAge, ...options } = refreshCookieOptions();
  return options;
};

export class AuthController {
  static async signup(req: Request, res: Response) {
    try {
      const data = signupSchema.parse(req.body);
      const { user, workspace } = await AuthService.signup(data);
      const workspaces = await AuthService.listUserWorkspaces(user.id);

      const ip = req.ip || '';
      const userAgent = req.headers['user-agent'] || '';

      const { accessToken, rawRefreshToken } = await AuthService.createSession(user.id, ip, userAgent);

      res.cookie('refreshToken', rawRefreshToken, refreshCookieOptions());

      res.status(201).json({
        user: toPublicUser(user),
        workspace: workspaces.find((item) => item.id === workspace.id) || workspaces[0] || null,
        workspaces,
        accessToken,
      });
    } catch (error: unknown) {
      res.status(400).json({ code: 'BAD_REQUEST', message: getErrorMessage(error) });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const data = loginSchema.parse(req.body);
      const user = await AuthService.login(data);

      const ip = req.ip || '';
      const userAgent = req.headers['user-agent'] || '';

      const { accessToken, rawRefreshToken } = await AuthService.createSession(user.id, ip, userAgent);
      const workspaces = await AuthService.listUserWorkspaces(user.id);

      res.cookie('refreshToken', rawRefreshToken, refreshCookieOptions());

      res.json({
        user: toPublicUser(user),
        workspace: workspaces[0] || null,
        workspaces,
        accessToken
      });
    } catch (error: unknown) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: getErrorMessage(error) });
    }
  }

  static async clerkSession(req: Request, res: Response) {
    try {
      if (!isClerkConfigured()) {
        return res.status(503).json({
          code: 'CLERK_NOT_CONFIGURED',
          message: 'Add CLERK_SECRET_KEY before using hosted Clerk sign-in.',
        });
      }

      const data = clerkSessionSchema.parse(req.body || {});
      const { userId } = getAuth(req);

      if (!userId) {
        return res.status(401).json({
          code: 'UNAUTHORIZED',
          message: 'Clerk session is missing or invalid.',
        });
      }

      const clerkUser = await clerkClient.users.getUser(userId);
      const primaryEmail =
        clerkUser.emailAddresses.find((emailAddress) => emailAddress.id === clerkUser.primaryEmailAddressId) ||
        clerkUser.emailAddresses[0];

      if (!primaryEmail?.emailAddress) {
        return res.status(400).json({
          code: 'MISSING_EMAIL',
          message: 'Your Clerk account needs a primary email before Brackett can create a workspace.',
        });
      }

      const emailVerification = primaryEmail.verification as { status?: string } | null;
      if (emailVerification?.status !== 'verified') {
        return res.status(403).json({
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Verify your primary email in Clerk before opening a Brackett workspace.',
        });
      }

      const fullName = [clerkUser.firstName, clerkUser.lastName]
        .filter(Boolean)
        .join(' ')
        .trim();

      const { user, workspace } = await AuthService.provisionExternalAccount({
        provider: 'clerk',
        authUserId: userId,
        email: primaryEmail.emailAddress,
        name: fullName || clerkUser.username || primaryEmail.emailAddress.split('@')[0],
        workspaceName: data.workspaceName,
        avatarUrl: clerkUser.imageUrl,
        emailVerifiedAt: new Date(),
      });

      const ip = req.ip || '';
      const userAgent = req.headers['user-agent'] || '';

      const { accessToken, rawRefreshToken } = await AuthService.createSession(user.id, ip, userAgent);
      const workspaces = await AuthService.listUserWorkspaces(user.id);

      res.cookie('refreshToken', rawRefreshToken, refreshCookieOptions());

      res.json({
        user: toPublicUser(user),
        workspace: workspaces.find((item) => item.id === workspace.id) || workspaces[0] || null,
        workspaces,
        accessToken,
      });
    } catch (error: unknown) {
      res.status(400).json({ code: 'BAD_REQUEST', message: getErrorMessage(error) });
    }
  }

  static async me(req: Request, res: Response) {
    try {
      const workspaces = await AuthService.listUserWorkspaces(req.user.id);
      res.json({
        user: toPublicUser(req.user),
        workspace: workspaces[0] || null,
        workspaces,
      });
    } catch (error: unknown) {
      res.status(500).json({ code: 'SERVER_ERROR', message: getErrorMessage(error) });
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({ code: 'UNAUTHORIZED', message: 'No refresh token provided' });
      }

      const ip = req.ip || '';
      const userAgent = req.headers['user-agent'] || '';

      const { accessToken, rawRefreshToken } = await AuthService.refreshSession(refreshToken, ip, userAgent);

      res.cookie('refreshToken', rawRefreshToken, refreshCookieOptions());

      res.json({ accessToken });
    } catch (error: unknown) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: getErrorMessage(error) });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (refreshToken) {
        await AuthService.revokeSession(refreshToken);
      }
      res.clearCookie('refreshToken', clearRefreshCookieOptions());
      res.json({ success: true });
    } catch (error: unknown) {
      res.status(500).json({ code: 'SERVER_ERROR', message: getErrorMessage(error) });
    }
  }
}
