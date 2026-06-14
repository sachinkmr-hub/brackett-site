import { 
  pgTable, 
  uuid, 
  varchar, 
  text, 
  timestamp, 
  integer,
  boolean,
  jsonb,
  uniqueIndex,
  index,
  check,
  foreignKey
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  authProvider: varchar('auth_provider', { length: 50 }).default('local').notNull(),
  authUserId: varchar('auth_user_id', { length: 255 }),
  name: varchar('name', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  emailVerifiedAt: timestamp('email_verified_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at')
}, (table) => {
  return {
    authProviderUserIdx: uniqueIndex('users_auth_provider_user_idx').on(table.authProvider, table.authUserId),
    authProviderCheck: check('users_auth_provider_check', sql`${table.authProvider} in ('local', 'clerk')`),
    externalAuthIdCheck: check(
      'users_external_auth_id_check',
      sql`${table.authProvider} = 'local' or ${table.authUserId} is not null`
    ),
  };
});

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  planTier: varchar('plan_tier', { length: 50 }).default('free').notNull(),
  createdByUserId: uuid('created_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const workspaceMembers = pgTable('workspace_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull(), // 'owner', 'admin', 'member', 'viewer'
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => {
  return {
    workspaceUserIdx: uniqueIndex('workspace_user_idx').on(table.workspaceId, table.userId)
  };
});

export const onboardingProfiles = pgTable('onboarding_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().unique().references(() => workspaces.id, { onDelete: 'cascade' }),
  hasWebsite: boolean('has_website').default(false).notNull(),
  websiteUrl: varchar('website_url', { length: 1024 }),
  businessName: varchar('business_name', { length: 255 }),
  industry: varchar('industry', { length: 255 }),
  targetCustomer: text('target_customer'),
  mainOffer: text('main_offer'),
  primaryPainPoints: text('primary_pain_points'),
  toneAndStyle: varchar('tone_and_style', { length: 50 }), // 'calm', 'bold', 'playful', 'serious'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const boards = pgTable('boards', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  description: text('description'),
  isArchived: boolean('is_archived').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    workspaceBoardSlugIdx: uniqueIndex('workspace_board_slug_idx').on(table.workspaceId, table.slug),
  };
});

// [MODIFIED] discussions (formerly questions)
export const discussions = pgTable('discussions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  boardId: uuid('board_id').references(() => boards.id, { onDelete: 'set null' }),
  createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  sourceType: varchar('source_type', { length: 80 }),
  sourceUrl: text('source_url'),
  sourceLabel: varchar('source_label', { length: 255 }),
  sourceExcerpt: text('source_excerpt'),
  category: varchar('category', { length: 120 }),
  priority: varchar('priority', { length: 50 }).default('medium').notNull(),
  status: varchar('status', { length: 50 }).default('active').notNull(), // 'active', 'archived'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// [NEW] discussion messages
export const discussionMessages = pgTable('discussion_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  discussionId: uuid('discussion_id').notNull().references(() => discussions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// [NEW] metrics
export const metrics = pgTable('metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 50 }).notNull(), // 'stripe', 'posthog', 'linear'
  metricName: varchar('metric_name', { length: 100 }).notNull(), // e.g. 'mrr', 'dau', 'open_bugs'
  value: integer('value').notNull(), // Using integer for simplicity, could be decimal
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
}, (table) => {
  return {
    workspaceMetricIdx: index('metrics_workspace_name_idx').on(table.workspaceId, table.metricName),
  };
});

// [NEW] ai_insights
export const aiInsights = pgTable('ai_insights', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  summary: text('summary').notNull(),
  severity: varchar('severity', { length: 50 }), // 'low', 'medium', 'high', 'critical'
  status: varchar('status', { length: 50 }).default('open').notNull(), // 'open', 'resolved', 'ignored'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// [NEW] private_ai_chats
export const privateAiChats = pgTable('private_ai_chats', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// [NEW] private_ai_messages
export const privateAiMessages = pgTable('private_ai_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  chatId: uuid('chat_id').notNull().references(() => privateAiChats.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull(), // 'user', 'ai'
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  userAgent: text('user_agent'),
  ip: varchar('ip', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  revokedAt: timestamp('revoked_at')
}, (table) => {
  return {
    tokenHashIdx: index('refresh_tokens_token_hash_idx').on(table.tokenHash),
  };
});

export const invites = pgTable('invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  invitedByUserId: uuid('invited_by_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at')
});

export const workspaceIntegrations = pgTable('workspace_integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).default('connected').notNull(),
  externalAccountEmail: varchar('external_account_email', { length: 255 }),
  metadata: jsonb('metadata'),
  config: jsonb('config'),
  scopes: jsonb('scopes'),
  accessTokenEncrypted: text('access_token_encrypted'),
  refreshTokenEncrypted: text('refresh_token_encrypted'),
  webhookUrlEncrypted: text('webhook_url_encrypted'),
  tokenExpiresAt: timestamp('token_expires_at'),
  connectedByUserId: uuid('connected_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  lastSyncAt: timestamp('last_sync_at'),
  lastError: text('last_error'),
  syncCursor: text('sync_cursor'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => {
  return {
    workspaceProviderIdx: uniqueIndex('workspace_provider_idx').on(table.workspaceId, table.provider),
    providerCheck: check('workspace_integrations_provider_check', sql`${table.provider} in ('stripe', 'linear', 'github', 'sentry', 'slack', 'notion', 'posthog', 'google', 'teams', 'git', 'website')`),
    statusCheck: check(
      'workspace_integrations_status_check',
      sql`${table.status} in ('connected', 'pending', 'ready', 'setup_required', 'failed', 'disabled')`
    ),
  };
});

export const integrationEvents = pgTable('integration_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  integrationId: uuid('integration_id').references(() => workspaceIntegrations.id, { onDelete: 'set null' }),
  provider: varchar('provider', { length: 50 }).notNull(),
  type: varchar('type', { length: 80 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  payload: jsonb('payload'),
  errorMessage: text('error_message'),
  createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    integrationEventsWorkspaceDateIdx: index('integration_events_workspace_date_idx').on(table.workspaceId, table.createdAt),
  };
});

export const workspaceActivityEvents = pgTable('workspace_activity_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  category: varchar('category', { length: 50 }).notNull(),
  type: varchar('type', { length: 80 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  summary: text('summary'),
  targetType: varchar('target_type', { length: 50 }),
  targetId: uuid('target_id'),
  payload: jsonb('payload'),
  createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    workspaceActivityEventsWorkspaceDateIdx: index('workspace_activity_events_workspace_date_idx').on(table.workspaceId, table.createdAt),
  };
});
