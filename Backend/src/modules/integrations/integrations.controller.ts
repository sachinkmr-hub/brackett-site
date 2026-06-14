import { Request, Response } from 'express';
import { z } from 'zod';
import { IntegrationsService } from './integrations.service.js';
import { errorMessageIncludes, getErrorMessage } from '../../utils/errors.js';

const optionalUrl = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().url().optional()
);

const providerSchema = z.enum(['google', 'slack', 'teams', 'git', 'website']);
const statusSchema = z.enum(['connected', 'pending', 'ready', 'setup_required', 'failed', 'disabled']);

const connectSchema = z.object({
  provider: providerSchema,
  externalAccountEmail: z.string().email().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  scopes: z.array(z.string()).optional(),
  accessToken: z.string().min(1).optional(),
  refreshToken: z.string().min(1).optional(),
  webhookUrl: optionalUrl,
  tokenExpiresAt: z.string().datetime().optional(),
  status: statusSchema.optional(),
});



const secretLikeKeys = new Set([
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'token',
  'apikey',
  'api_key',
  'secret',
  'secretkey',
  'secret_key',
  'clientsecret',
  'client_secret',
  'privatekey',
  'private_key',
  'password',
  'authorization',
  'webhookurl',
  'webhook_url',
  'bottoken',
  'bot_token',
]);

const normalizeSecretKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9_]/g, '');

const assertNoSecretsInRecord = (value: unknown, path = 'config') => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;

  for (const [key, childValue] of Object.entries(value)) {
    const normalizedKey = normalizeSecretKey(key);
    const looksSecret =
      secretLikeKeys.has(normalizedKey) ||
      normalizedKey.includes('secret') ||
      normalizedKey.includes('password') ||
      normalizedKey.includes('token') ||
      normalizedKey.includes('authorization') ||
      normalizedKey.includes('privatekey') ||
      normalizedKey.includes('webhookurl');

    if (looksSecret) {
      throw new Error(`${path}.${key} must be sent through an encrypted top-level field`);
    }

    assertNoSecretsInRecord(childValue, `${path}.${key}`);
  }
};

const requireIntegrationManager = (role: string | undefined) => {
  if (role !== 'owner' && role !== 'admin') {
    throw new Error('Only workspace owners or admins can manage integrations');
  }
};

export class IntegrationsController {
  private static routeParam(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value ?? '';
  }

  static async catalog(_req: Request, res: Response) {
    res.json(IntegrationsService.getCatalog());
  }

  static async list(req: Request, res: Response) {
    try {
      const integrations = await IntegrationsService.list(req.workspaceId!);
      res.json(integrations);
    } catch (error: unknown) {
      res.status(500).json({ code: 'SERVER_ERROR', message: getErrorMessage(error) });
    }
  }

  static async connect(req: Request, res: Response) {
    try {
      requireIntegrationManager(req.workspaceRole);
      const data = connectSchema.parse({
        provider: this.routeParam(req.params.provider),
        ...req.body,
      });
      assertNoSecretsInRecord(data.config, 'config');
      assertNoSecretsInRecord(data.metadata, 'metadata');

      const integration = await IntegrationsService.connect(req.workspaceId!, req.user.id, {
        ...data,
      });
      res.json(integration);
    } catch (error: unknown) {
      const statusCode = errorMessageIncludes(error, 'workspace owners or admins') ? 403 : 400;
      res.status(statusCode).json({ code: statusCode === 403 ? 'FORBIDDEN' : 'BAD_REQUEST', message: getErrorMessage(error) });
    }
  }


}
