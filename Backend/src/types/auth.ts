import type { users } from '../db/schema.js';

export type AuthenticatedUser = typeof users.$inferSelect;

export type AuthenticatedBy = 'app_jwt' | 'clerk';

export type PublicUser = Pick<
  AuthenticatedUser,
  'id' | 'email' | 'name' | 'avatarUrl' | 'authProvider'
>;
