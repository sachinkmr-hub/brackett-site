import * as Sentry from '@sentry/node';

let isMonitoringInitialized = false;

const numberFromEnv = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

export const initMonitoring = () => {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn || isMonitoringInitialized) {
    return false;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: numberFromEnv('SENTRY_TRACES_SAMPLE_RATE', 0.05),
  });

  isMonitoringInitialized = true;
  return true;
};

export const captureException = (
  error: unknown,
  context?: Record<string, unknown>
) => {
  if (!isMonitoringInitialized) {
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
};
