import express from 'express';
import { clerkMiddleware } from '@clerk/express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { sql } from 'drizzle-orm';
import authRoutes from './modules/auth/auth.routes.js';
import workspacesRoutes from './modules/workspaces/workspaces.routes.js';
import { db } from './db/index.js';
import { isClerkConfigured } from './config/clerk.js';
import { httpLogger, logger } from './utils/logger.js';
import { captureException, initMonitoring } from './utils/monitoring.js';

const app = express();

initMonitoring();

if (isClerkConfigured()) {
  app.use(clerkMiddleware());
}

const getAllowedOrigins = () => {
  const configured = process.env.CORS_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000';
  return configured
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

app.use(helmet());
app.use(httpLogger);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (getAllowedOrigins().includes(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // limit each IP to 100 requests per window
});
app.use(globalLimiter);

app.get('/', (_req, res) => {
  res.json({
    name: 'Brackett API',
    status: 'ok',
    endpoints: {
      health: '/health',
      readiness: '/system/readiness',
      auth: '/auth',
      workspaces: '/workspaces',
    },
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/system/readiness', async (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const readinessToken = process.env.READINESS_TOKEN?.trim();

  if (isProduction && (!readinessToken || req.header('x-readiness-token') !== readinessToken)) {
    return res.status(404).json({ code: 'NOT_FOUND', message: 'Not found' });
  }

  let databaseReachable = false;
  let databaseMessage = 'Database connection is not ready yet.';

  try {
    await db.execute(sql`select 1`);
    databaseReachable = true;
    databaseMessage = 'Database connection is live.';
  } catch (error: unknown) {
    databaseMessage = isProduction
      ? 'Database connection failed.'
      : error instanceof Error ? error.message : 'Database connection failed.';
  }

  const hasRealAiKey = Boolean(
    process.env.LLM_API_KEY &&
    process.env.LLM_API_KEY !== 'demo_api_key_replace_me'
  );
  const hasClerkSecret = Boolean(
    isClerkConfigured()
  );
  const hasEncryptionKey = Boolean(
    process.env.ENCRYPTION_KEY &&
    process.env.ENCRYPTION_KEY !== 'replace-with-a-long-random-encryption-key'
  );
  const hasReadinessToken = Boolean(
    process.env.READINESS_TOKEN &&
    process.env.READINESS_TOKEN !== 'replace-with-a-private-readiness-token'
  );

  const tasks = [
    !databaseReachable ? 'Add the real Supabase/Postgres DATABASE_URL to Backend/.env.' : null,
    !hasClerkSecret ? 'Add CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY after creating the Clerk application.' : null,
    !hasEncryptionKey ? 'Add ENCRYPTION_KEY before storing live integration tokens.' : null,
    !hasReadinessToken ? 'Add READINESS_TOKEN before deploying production readiness checks.' : null,
    !hasRealAiKey ? 'Add your real LLM_API_KEY to enable non-demo website extraction.' : null,
  ].filter(Boolean);

  res.json({
    status: tasks.length ? 'action_required' : 'ready',
    checks: {
      databaseReachable,
      clerkConfigured: hasClerkSecret,
      encryptionConfigured: hasEncryptionKey,
      readinessTokenConfigured: hasReadinessToken,
      hasRealAiKey,
    },
    messages: {
      database: databaseMessage,
      googleAuth:
        'Google sign-in should be enabled in Clerk, then connected to the frontend publishable key and backend secret key.',
      integrations:
        'Slack, Teams, and Git delivery stay in setup-required mode until their provider tokens or webhook URLs are configured.',
    },
    tasks,
  });
});

// Routes
app.use('/auth', authRoutes);
app.use('/workspaces', workspacesRoutes);

// Error handling middleware
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const error = err instanceof Error ? err : new Error('An unexpected error occurred');
  const status = typeof (err as { status?: unknown })?.status === 'number'
    ? (err as { status: number }).status
    : 500;
  const code = typeof (err as { code?: unknown })?.code === 'string'
    ? (err as { code: string }).code
    : 'INTERNAL_ERROR';

  captureException(error, {
    code,
    status,
    path: req.originalUrl,
    method: req.method,
    requestId: req.id,
  });

  const requestLogger = req.log || logger;
  requestLogger.error({
    err: error,
    code,
    status,
    path: req.originalUrl,
    method: req.method,
    requestId: req.id,
  }, 'Unhandled request error');

  res.status(status).json({
    code,
    message: error.message || 'An unexpected error occurred'
  });
});

export default app;
