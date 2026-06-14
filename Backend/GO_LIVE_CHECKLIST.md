# Brackett Backend Go-Live Checklist

Use this checklist for the target launch stack:

- Frontend on GitHub Pages
- Backend Node/TypeScript Express on DigitalOcean
- PostgreSQL on DigitalOcean
- Clerk for auth and user management
- AI keys/resources filled manually when ready

## 1. Repository Readiness

- [ ] Confirm backend docs reflect the active deployment target.
- [ ] Confirm no real secrets are committed.
- [ ] Confirm `.env.example` includes every required backend variable.
- [ ] Confirm the production start command is `npm run start` after `npm run build`.
- [ ] Run backend type-check/build verification.
- [ ] Run database migrations locally against a disposable database.

## 2. GitHub Pages Frontend

- [ ] Build the frontend static output.
- [ ] Publish the frontend to GitHub Pages.
- [ ] Configure the production GitHub Pages URL or custom domain.
- [ ] Enable HTTPS.
- [ ] Confirm the public domain actually serves the Brackett frontend build, not a default GitHub Pages placeholder site.
- [ ] Set frontend `VITE_API_BASE_URL` to the DigitalOcean backend URL.
- [ ] Set frontend `VITE_CLERK_PUBLISHABLE_KEY` from the Clerk application.
- [ ] Confirm the frontend does not contain backend secrets, database URLs, or AI keys.

## 3. DigitalOcean Project

- [ ] Create or select the Brackett DigitalOcean project.
- [ ] Create the backend app in App Platform, or provision a Droplet if manual hosting is required.
- [ ] Configure the backend service root as `Backend`.
- [ ] Configure the app to use the injected `PORT`.
- [ ] Configure `/health` as the liveness check.
- [ ] Use `/system/readiness` as the manual readiness/smoke check.
- [ ] Enable DigitalOcean logs.

## 4. DigitalOcean PostgreSQL

- [ ] Create a Managed PostgreSQL database.
- [ ] Copy the production connection string.
- [ ] Confirm SSL is required, usually with `sslmode=require`.
- [ ] Add `DATABASE_URL` as an encrypted DigitalOcean backend secret.
- [ ] Run Drizzle migrations against the production database.
- [ ] Confirm the backend can reach the database through `/system/readiness`.
- [ ] Confirm backups are enabled.

## 5. Backend Environment

- [ ] Set `NODE_ENV=production`.
- [ ] Set `APP_URL` to the GitHub Pages frontend URL.
- [ ] Set `API_URL` to the DigitalOcean backend URL.
- [ ] Set `CORS_ORIGIN` to the exact GitHub Pages origin.
- [ ] Set `READINESS_TOKEN` and use it with `x-readiness-token` for production readiness checks. In production the route returns `404` when the token is missing or wrong.
- [ ] Set `CLERK_SECRET_KEY`.
- [ ] Set `CLERK_WEBHOOK_SECRET` when webhooks are enabled.
- [ ] Set `ENCRYPTION_KEY` before storing provider tokens.
- [ ] Replace placeholder `JWT_ACCESS_SECRET` with a long random value while transition auth remains active.
- [ ] Set Slack, Teams, and Git provider secrets only if those delivery channels are part of launch.
- [ ] Set observability keys before real users.
- [ ] Leave `DEMO_MODE_WARNING=true` until auth, AI, and readiness checks are production-complete.

## 6. Clerk

- [ ] Create the Clerk application.
- [ ] Enable Google sign-in.
- [ ] For production Clerk Google, turn on `Use custom credentials` and save Clerk's Authorized Redirect URI.
- [ ] In Google Cloud, create a Web application OAuth client, add the frontend origin as an Authorized JavaScript origin, and paste Clerk's Authorized Redirect URI into Google's Authorized Redirect URIs.
- [ ] Paste the Google Client ID and Client Secret back into the Clerk Google connection.
- [ ] Move the Google OAuth consent screen from `Testing` to `In production` before inviting real users.
- [ ] If Brackett should fetch private Google Docs, add Drive-readable Google API scopes and store a usable integration token; Clerk sign-in alone does not unlock private Docs ingestion.
- [ ] Add the GitHub Pages frontend URL to allowed origins/redirect URLs.
- [ ] Add the DigitalOcean backend URL where Clerk requires backend callback/webhook URLs.
- [ ] Copy the frontend publishable key to the frontend-owned config.
- [ ] Copy `CLERK_SECRET_KEY` to DigitalOcean backend secrets.
- [ ] Configure webhooks for user lifecycle events when backend provisioning is wired.
- [ ] Verify webhook signing with `CLERK_WEBHOOK_SECRET`.
- [ ] Wire the frontend Clerk session token to `POST /auth/clerk/session` as `Authorization: Bearer <clerk-session-token>`.
- [ ] Confirm a Clerk user maps to a Brackett product user/workspace on first sign-in.
- [ ] Do not rely on embedded/in-app browsers for production Google sign-in testing; Google blocks that flow.

## 7. AI Provider and Resources

- [ ] Choose the AI provider.
- [ ] Set `LLM_PROVIDER`.
- [ ] Set `LLM_API_KEY`.
- [ ] Set `LLM_MODEL`.
- [ ] Set `LLM_BASE_URL` if the provider requires it.
- [ ] Review or replace backend prompt/resource files before production extraction.
- [ ] Confirm `/system/readiness` reports `hasRealAiKey: true`. The current readiness contract stays `action_required` until the demo AI key is replaced.
- [ ] Run a test onboarding extraction against a safe public website.

## 8. Observability and Security

- [ ] Connect Sentry or New Relic.
- [ ] Confirm backend errors appear in the selected observability tool.
- [ ] Confirm DigitalOcean logs are available to the operator.
- [ ] Confirm tokens and secrets are not written to logs.
- [ ] Confirm CORS rejects unexpected origins.
- [ ] Confirm database credentials are not exposed to the frontend.
- [ ] Confirm AI keys are not exposed to the frontend.
- [ ] Confirm rate limiting is active.

## 9. Smoke Test

- [ ] `GET /health` returns `{"status":"ok"}`.
- [ ] `GET /system/readiness` with `x-readiness-token` returns `ready`, or every listed task is understood and accepted.
- [ ] Sign in through the intended auth flow.
- [ ] Create or access a workspace.
- [ ] Create a board.
- [ ] Create a question.
- [ ] Assign a question.
- [ ] Add a comment.
- [ ] Log a decision.
- [ ] Confirm `GET /workspaces/:workspaceId/activity` reflects onboarding, questions, invites, boards, integrations, and decision activity.
- [ ] Generate an announcement draft.
- [ ] Test announcement send behavior; accept recorded `setup_required` deliveries only if provider keys or targets are intentionally not part of launch.
- [ ] Export questions as `json`.
- [ ] Export questions as `markdown`.
- [ ] Export questions as `pdf`.
- [ ] Confirm the frontend can call the backend from the GitHub Pages origin.

## 10. Launch Decision

- [ ] All blocking readiness tasks are complete.
- [ ] Operators know where logs and errors are visible.
- [ ] Rollback path is documented.
- [ ] Database backups are enabled.
- [ ] Clerk production settings are verified.
- [ ] The public homepage includes real privacy and terms links on a domain you control, which Google expects for production OAuth apps.
- [ ] The public frontend URL is final.
- [ ] The public backend URL is final.
- [ ] The first real-user workspace has been smoke-tested.

## Rollback Notes

- GitHub Pages rollback: redeploy the last known good static frontend build.
- DigitalOcean App Platform rollback: redeploy the previous successful backend deployment.
- Droplet rollback: restart the previous release or process-manager target.
- Database rollback: prefer forward fixes. Restore backups only after confirming data-loss impact.
- Clerk rollback: disable new sign-ins or restrict allowed origins while the backend is stabilized.
