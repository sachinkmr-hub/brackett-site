ALTER TABLE "workspace_integrations" DROP CONSTRAINT IF EXISTS "workspace_integrations_provider_check";
ALTER TABLE "workspace_integrations" ADD CONSTRAINT "workspace_integrations_provider_check"
CHECK ("provider" in ('stripe', 'linear', 'github', 'sentry', 'slack', 'notion', 'posthog', 'google', 'teams', 'git', 'website'));
