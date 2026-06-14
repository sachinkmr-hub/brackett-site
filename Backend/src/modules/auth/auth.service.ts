import { db } from '../../db/index.js';
import { users, workspaces, workspaceMembers, refreshTokens, boards } from '../../db/schema.js';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { generateRefreshToken, hashPassword, hashToken, verifyPassword } from '../../utils/hash.js';
import { generateAccessToken } from '../../utils/jwt.js';

type SignupData = {
  email: string;
  password: string;
  name: string;
  workspaceName: string;
};

type LoginData = {
  email: string;
  password: string;
};

type ExternalAuthData = {
  provider: 'clerk';
  authUserId: string;
  email: string;
  name: string;
  workspaceName?: string;
  avatarUrl?: string | null;
  emailVerifiedAt?: Date | null;
};

type UserWorkspace = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

type ProvisionedAuthResult = {
  user: typeof users.$inferSelect;
  workspace: typeof workspaces.$inferSelect;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const durationToMs = (value: string | undefined, fallbackMs: number) => {
  if (!value) return fallbackMs;

  const match = value.trim().match(/^(\d+)([mhd])$/i);
  if (!match) return fallbackMs;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
};

const makeSlug = (name: string) => {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || 'workspace'}-${suffix}`;
};

const buildDefaultWorkspaceName = (name: string, email: string) => {
  const ownerName = name.trim() || email.split('@')[0] || 'Brackett';
  return `${ownerName.split(/\s+/)[0]}'s Workspace`;
};

export class AuthService {
  static getRefreshTokenMaxAgeMs() {
    return durationToMs(process.env.JWT_REFRESH_EXPIRES_IN, 30 * 24 * 60 * 60 * 1000);
  }

  static async signup(data: SignupData) {
    const email = normalizeEmail(data.email);
    const { password, name, workspaceName } = data;
    
    const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser) {
      throw new Error('Email already in use');
    }

    const passwordHash = await hashPassword(password);

    return this.provisionUserWorkspace({
      email,
      passwordHash,
      name,
      workspaceName,
    });
  }

  static async login(data: LoginData) {
    const email = normalizeEmail(data.email);
    const { password } = data;

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.passwordHash) {
      throw new Error('User password is not provisioned');
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    return user;
  }

  static async provisionExternalAccount(data: ExternalAuthData): Promise<ProvisionedAuthResult> {
    const email = normalizeEmail(data.email);
    const name = data.name.trim() || email.split('@')[0] || 'Brackett User';
    const workspaceName = data.workspaceName?.trim() || buildDefaultWorkspaceName(name, email);

    const [linkedUser] = await db.select()
      .from(users)
      .where(and(
        eq(users.authProvider, data.provider),
        eq(users.authUserId, data.authUserId)
      ))
      .limit(1);

    if (linkedUser) {
      const [updatedUser] = await db.update(users)
        .set({
          email,
          name,
          avatarUrl: data.avatarUrl ?? linkedUser.avatarUrl,
          emailVerifiedAt: data.emailVerifiedAt ?? linkedUser.emailVerifiedAt,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, linkedUser.id))
        .returning();

      const workspace = await this.ensureUserWorkspace(updatedUser, workspaceName);
      return { user: updatedUser, workspace };
    }

    const [emailMatchedUser] = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (emailMatchedUser) {
      const [updatedUser] = await db.update(users)
        .set({
          authProvider: data.provider,
          authUserId: data.authUserId,
          name,
          avatarUrl: data.avatarUrl ?? emailMatchedUser.avatarUrl,
          emailVerifiedAt: data.emailVerifiedAt ?? emailMatchedUser.emailVerifiedAt,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, emailMatchedUser.id))
        .returning();

      const workspace = await this.ensureUserWorkspace(updatedUser, workspaceName);
      return { user: updatedUser, workspace };
    }

    return this.provisionUserWorkspace({
      email,
      passwordHash: null,
      name,
      workspaceName,
      authProvider: data.provider,
      authUserId: data.authUserId,
      avatarUrl: data.avatarUrl,
      emailVerifiedAt: data.emailVerifiedAt,
    });
  }

  static async listUserWorkspaces(userId: string): Promise<UserWorkspace[]> {
    return db.select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      role: workspaceMembers.role,
    })
      .from(workspaces)
      .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(eq(workspaceMembers.userId, userId));
  }

  private static async provisionUserWorkspace(input: {
    id?: string;
    email: string;
    passwordHash?: string | null;
    name: string;
    workspaceName: string;
    authProvider?: string;
    authUserId?: string | null;
    avatarUrl?: string | null;
    emailVerifiedAt?: Date | null;
  }): Promise<ProvisionedAuthResult> {
    return db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({
        id: input.id,
        email: input.email,
        passwordHash: input.passwordHash,
        authProvider: input.authProvider || 'local',
        authUserId: input.authUserId,
        name: input.name,
        avatarUrl: input.avatarUrl,
        emailVerifiedAt: input.emailVerifiedAt,
      }).returning();

      const [workspace] = await tx.insert(workspaces).values({
        name: input.workspaceName,
        slug: makeSlug(input.workspaceName),
        createdByUserId: user.id
      }).returning();

      await tx.insert(boards).values({
        workspaceId: workspace.id,
        name: 'General',
        slug: 'general',
        description: 'Default workspace board for unresolved questions and early decisions.',
      });

      await tx.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId: user.id,
        role: 'owner'
      });

      return { user, workspace };
    });
  }

  private static async ensureUserWorkspace(
    user: typeof users.$inferSelect,
    workspaceName: string
  ): Promise<typeof workspaces.$inferSelect> {
    const existingWorkspaces = await db.select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      planTier: workspaces.planTier,
      createdByUserId: workspaces.createdByUserId,
      createdAt: workspaces.createdAt,
      updatedAt: workspaces.updatedAt,
    })
      .from(workspaces)
      .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(eq(workspaceMembers.userId, user.id))
      .limit(1);

    if (existingWorkspaces[0]) {
      return existingWorkspaces[0];
    }

    return db.transaction(async (tx) => {
      const [workspace] = await tx.insert(workspaces).values({
        name: workspaceName,
        slug: makeSlug(workspaceName),
        createdByUserId: user.id,
      }).returning();

      await tx.insert(boards).values({
        workspaceId: workspace.id,
        name: 'General',
        slug: 'general',
        description: 'Default workspace board for unresolved questions and early decisions.',
      });

      await tx.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId: user.id,
        role: 'owner',
      });

      return workspace;
    });
  }

  static async createSession(userId: string, ip: string, userAgent: string) {
    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + this.getRefreshTokenMaxAgeMs());

    await db.insert(refreshTokens).values({
      userId,
      tokenHash,
      ip,
      userAgent,
      expiresAt
    });

    const accessToken = generateAccessToken(userId);
    return { accessToken, rawRefreshToken };
  }

  static async refreshSession(rawRefreshToken: string, ip: string, userAgent: string) {
    const tokenHash = hashToken(rawRefreshToken);

    return db.transaction(async (tx) => {
      const [session] = await tx.update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(refreshTokens.tokenHash, tokenHash),
            isNull(refreshTokens.revokedAt),
            gt(refreshTokens.expiresAt, new Date())
          )
        )
        .returning();

      if (!session) {
        throw new Error('Invalid or expired refresh token');
      }

      const nextRawRefreshToken = generateRefreshToken();
      const nextTokenHash = hashToken(nextRawRefreshToken);
      const expiresAt = new Date(Date.now() + this.getRefreshTokenMaxAgeMs());

      await tx.insert(refreshTokens).values({
        userId: session.userId,
        tokenHash: nextTokenHash,
        ip,
        userAgent,
        expiresAt,
      });

      const accessToken = generateAccessToken(session.userId);
      return { accessToken, rawRefreshToken: nextRawRefreshToken };
    });
  }

  static async revokeSession(rawRefreshToken: string) {
    const tokenHash = hashToken(rawRefreshToken);
    await db.update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.tokenHash, tokenHash));
  }
}
