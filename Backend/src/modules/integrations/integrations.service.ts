import { db } from '../../db/index.js';
import { integrationEvents, workspaceIntegrations } from '../../db/schema.js';
import { and, eq } from 'drizzle-orm';
import { decryptSecret, encryptSecret } from '../../utils/crypto.js';
import { fetchGoogleDocText } from './google-docs.js';

type ConnectIntegrationInput = {
  provider: string;
  externalAccountEmail?: string;
  metadata?: Record<string, unknown>;
  config?: Record<string, unknown>;
  scopes?: string[];
  accessToken?: string;
  refreshToken?: string;
  webhookUrl?: string;
  tokenExpiresAt?: string;
  status?: string;
};

const INTEGRATION_CATALOG = [
  {
    provider: 'google',
    label: 'Google',
    category: 'auth',
    connectionType: 'oauth',
    supportsSync: false,
    requiredExternalSetup: [
      'Clerk Google provider enabled for sign-in',
      'Optional Google Drive-scoped OAuth token for Docs ingestion',
      'Allowed redirect URLs in Clerk and Google Cloud',
    ],
  },
  {
    provider: 'slack',
    label: 'Slack',
    category: 'communication',
    connectionType: 'oauth',
    supportsSync: true,
    requiredExternalSetup: [
      'Slack app credentials',
      'Bot scopes and channel access',
      'Webhook or event subscription',
    ],
  },
  {
    provider: 'teams',
    label: 'Microsoft Teams',
    category: 'communication',
    connectionType: 'oauth',
    supportsSync: true,
    requiredExternalSetup: [
      'Azure app registration',
      'Microsoft Graph permissions',
      'Webhook or bot subscription',
    ],
  },
  {
    provider: 'git',
    label: 'Git Provider',
    category: 'engineering',
    connectionType: 'token',
    supportsSync: true,
    requiredExternalSetup: [
      'Repository access token or GitHub app',
      'Repository webhook if live sync is needed',
    ],
  },
  {
    provider: 'website',
    label: 'Website Ingestion',
    category: 'onboarding',
    connectionType: 'url',
    supportsSync: false,
    requiredExternalSetup: [
      'Public website URL reachable from the backend',
      'Optional live AI API key for non-demo extraction',
    ],
  },
] as const;

export class IntegrationsService {
  static getCatalog() {
    return INTEGRATION_CATALOG;
  }

  static async list(workspaceId: string) {
    const rows = await db.select()
      .from(workspaceIntegrations)
      .where(eq(workspaceIntegrations.workspaceId, workspaceId));

    return rows.map((row) => this.serializeIntegration(row));
  }

  static async connect(workspaceId: string, userId: string, input: ConnectIntegrationInput) {
    const accessTokenEncrypted = input.accessToken
      ? encryptSecret(input.accessToken)
      : undefined;
    const refreshTokenEncrypted = input.refreshToken
      ? encryptSecret(input.refreshToken)
      : undefined;
    const webhookUrlEncrypted = input.webhookUrl
      ? encryptSecret(input.webhookUrl)
      : undefined;
    const tokenExpiresAt = input.tokenExpiresAt
      ? new Date(input.tokenExpiresAt)
      : undefined;
    const hasBackendCredential = Boolean(accessTokenEncrypted || refreshTokenEncrypted || webhookUrlEncrypted);
    const requestedStatus = input.status || 'connected';
    const normalizedStatus = hasBackendCredential || input.provider === 'website'
      ? requestedStatus
      : requestedStatus === 'failed' || requestedStatus === 'disabled'
        ? requestedStatus
        : 'setup_required';

    const [integration] = await db.insert(workspaceIntegrations)
      .values({
        workspaceId,
        provider: input.provider,
        status: normalizedStatus,
        externalAccountEmail: input.externalAccountEmail,
        metadata: input.metadata || {},
        config: input.config || {},
        scopes: input.scopes || [],
        accessTokenEncrypted,
        refreshTokenEncrypted,
        webhookUrlEncrypted,
        tokenExpiresAt,
        connectedByUserId: userId,
      })
      .onConflictDoUpdate({
        target: [workspaceIntegrations.workspaceId, workspaceIntegrations.provider],
        set: {
          status: normalizedStatus,
          externalAccountEmail: input.externalAccountEmail,
          metadata: input.metadata || {},
          config: input.config || {},
          scopes: input.scopes || [],
          ...(accessTokenEncrypted ? { accessTokenEncrypted } : {}),
          ...(refreshTokenEncrypted ? { refreshTokenEncrypted } : {}),
          ...(webhookUrlEncrypted ? { webhookUrlEncrypted } : {}),
          ...(tokenExpiresAt ? { tokenExpiresAt } : {}),
          connectedByUserId: userId,
          updatedAt: new Date(),
        },
      })
      .returning();

    await this.recordEvent({
      workspaceId,
      integrationId: integration.id,
      provider: input.provider,
      type: 'integration_connected',
      status: integration.status,
      payload: {
        hasAccessToken: Boolean(accessTokenEncrypted || integration.accessTokenEncrypted),
        hasRefreshToken: Boolean(refreshTokenEncrypted || integration.refreshTokenEncrypted),
        hasWebhookUrl: Boolean(webhookUrlEncrypted || integration.webhookUrlEncrypted),
      },
      createdByUserId: userId,
    });

    return this.serializeIntegration(integration);
  }

  static async getByProvider(workspaceId: string, provider: string) {
    const [integration] = await db.select()
      .from(workspaceIntegrations)
      .where(and(
        eq(workspaceIntegrations.workspaceId, workspaceId),
        eq(workspaceIntegrations.provider, provider)
      ))
      .limit(1);

    return integration || null;
  }

  static async recordEvent(input: {
    workspaceId: string;
    integrationId?: string | null;
    provider: string;
    type: string;
    status: string;
    payload?: Record<string, unknown>;
    errorMessage?: string;
    createdByUserId?: string;
  }) {
    await db.insert(integrationEvents).values({
      workspaceId: input.workspaceId,
      integrationId: input.integrationId,
      provider: input.provider,
      type: input.type,
      status: input.status,
      payload: input.payload || {},
      errorMessage: input.errorMessage,
      createdByUserId: input.createdByUserId,
    });
  }



  private static serializeIntegration(integration: typeof workspaceIntegrations.$inferSelect) {
    const {
      accessTokenEncrypted,
      refreshTokenEncrypted,
      webhookUrlEncrypted,
      ...safeIntegration
    } = integration;

    return {
      ...safeIntegration,
      hasAccessToken: Boolean(accessTokenEncrypted),
      hasRefreshToken: Boolean(refreshTokenEncrypted),
      hasWebhookUrl: Boolean(webhookUrlEncrypted),
    };
  }
}
