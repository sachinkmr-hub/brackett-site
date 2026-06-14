# Brackett Backend

Node/TypeScript Express API for Brackett.

This document is the backend runbook for the target stack:

- Frontend: static React/Vite build hosted on GitHub Pages
- Backend: Node/TypeScript Express hosted on DigitalOcean App Platform or a DigitalOcean Droplet
- Database: DigitalOcean Managed PostgreSQL
- Auth and user management: Clerk, with Google sign-in enabled
- AI: provider keys, prompt files, and resource files filled manually later

## Service Ownership

The backend owns product data and workspace workflows. Clerk owns identity, sign-in, user sessions, Google OAuth, and user lifecycle events.

Backend-owned data includes:

- workspaces and workspace membership
- boards
- onboarding profiles
- questions, assignments, history, comments, and decisions
- workspace activity feed events
- invites
- integration connection records
- backend AI extraction output

The current API still has legacy email/password JWT endpoints for local development and transition testing. Production should move traffic through Clerk-managed users and session verification before real users are invited.

## Local Development

From `Backend`:

```bash
npm install
copy .env.example .env
npm run db:migrate
npm run dev
```

Local API URL:

```text
http://localhost:4000
```

Useful checks:

```text
GET http://localhost:4000/health
GET http://localhost:4000/system/readiness
```

Automated checks:

```bash
npm test
npm run check
npm run build
```

The test suite uses Vitest and Supertest. Current coverage focuses on auth signup/login/refresh behavior, auth middleware guards, workspace membership enforcement, question create/list/read/update/decision controller paths, and request body-size rejection.

`/health` is a basic liveness probe. `/system/readiness` returns `ready` only when the database, Clerk secret, encryption key, readiness token, and real AI key checks all pass. In production it returns `404` unless `x-readiness-token` matches `READINESS_TOKEN`.

Core local UI-backed flows exposed by the current backend include:

- signup/login transition auth plus Clerk session handoff
- first-workspace provisioning
- onboarding by website import or scratch profile
- boards, questions, comments, decisions, and exports
- team invites and invite acceptance
- integration setup records, Google Docs capture support, and announcement delivery attempts
- workspace-wide recent activity feed

The workspace activity feed is available at `GET /workspaces/:workspaceId/activity`. It returns a reverse-chronological list, accepts `limit` with default `20` and maximum `50`, and merges question, integration, onboarding, board, and invite activity.

## Environment Variables

Start from `.env.example`. Do not commit real secrets.

| Variable | Required for production | Notes |
| --- | --- | --- |
| `NODE_ENV` | Yes | Use `production` on DigitalOcean. |
| `PORT` | Yes | DigitalOcean App Platform usually injects this. Local default is `4000`. |
| `DATABASE_URL` | Yes | DigitalOcean PostgreSQL connection string. Use SSL, usually `sslmode=require`. |
| `PG_POOL_MAX` | Recommended | Maximum PostgreSQL pool size. Local/default is `10`; tune for the selected DigitalOcean instance. |
| `REDIS_URL` | No | Reserved for future queues/cache/rate-limit storage. |
| `CLERK_SECRET_KEY` | Yes | Backend secret from the Clerk application. |
| `CLERK_WEBHOOK_SECRET` | Yes, once webhooks are enabled | Used to verify Clerk webhook events. |
| `JWT_ACCESS_SECRET` | Transition only | Needed by current legacy local auth endpoints. |
| `JWT_ACCESS_EXPIRES_IN` | Transition only | Current default is `15m`. |
| `JWT_REFRESH_EXPIRES_IN` | Transition only | Current default is `7d`. Refresh tokens are opaque random tokens stored as hashes, not JWTs. |
| `ENCRYPTION_KEY` | Yes for live integrations | Used to encrypt stored provider access/refresh tokens. |
| `LLM_PROVIDER` | Later | Fill when the AI provider is chosen. |
| `LLM_API_KEY` | Later | Can stay as the demo value for UI smoke tests. Real website extraction needs a real key. |
| `LLM_MODEL` | Later | Keep aligned with the chosen provider. |
| `LLM_BASE_URL` | Later | Optional for compatible/self-hosted providers. |
| `LLM_TIMEOUT_MS` | Later | Default in example is `30000`. |
| `SLACK_BOT_TOKEN` | Later | Enables Slack announcement delivery if not stored per integration. |
| `SLACK_DEFAULT_CHANNEL` | Later | Default Slack channel for announcements. |
| `TEAMS_WEBHOOK_URL` | Later | Enables Teams announcement delivery if not stored per integration. |
| `GITHUB_TOKEN` | Later | Enables Git/GitHub decision issue delivery if not stored per integration. |
| `GITHUB_REPOSITORY` | Later | Default `owner/repo` target for Git/GitHub delivery. |
| `APP_URL` | Yes | GitHub Pages frontend URL in production. |
| `API_URL` | Yes | Public backend URL in production. |
| `CORS_ORIGIN` | Yes | Exact GitHub Pages origin. Include protocol. |
| `READINESS_TOKEN` | Yes | Required as `x-readiness-token` for detailed production readiness checks. |
| `SENTRY_DSN` | Recommended | Enables Sentry exception capture from the global error handler. |
| `SENTRY_TRACES_SAMPLE_RATE` | Optional | Sentry tracing sample rate. Default example is `0.05`. |
| `LOG_LEVEL` | Recommended | Pino log level. Use `info` in production unless debugging an incident. |
| `NEW_RELIC_LICENSE_KEY` | Optional | Use if New Relic is selected. |
| `DATADOG_API_KEY` | Optional | Use later if deeper infra metrics are needed. |
| `DEMO_MODE_WARNING` | Recommended until launch | Keep true while AI/auth/resources are not production-ready. |

Manual production fill-ins:

- Backend secrets: `DATABASE_URL`, `CLERK_SECRET_KEY`, `ENCRYPTION_KEY`, `READINESS_TOKEN`, `APP_URL`, `API_URL`, and `CORS_ORIGIN`.
- Transition auth secret while legacy local auth remains available: `JWT_ACCESS_SECRET`.
- Frontend public config: `VITE_API_BASE_URL` and `VITE_CLERK_PUBLISHABLE_KEY`.
- AI config before live website extraction: `LLM_PROVIDER`, `LLM_API_KEY`, and `LLM_MODEL`.
- Delivery config only when those channels are part of launch: `SLACK_BOT_TOKEN`, `SLACK_DEFAULT_CHANNEL`, `TEAMS_WEBHOOK_URL`, `GITHUB_TOKEN`, and `GITHUB_REPOSITORY`. Teams webhook URLs are treated as secrets and are not returned through integration list responses.
- Google Docs capture needs more than Clerk sign-in if documents are private: store a Google integration token with Drive read scope, or capture from a publicly accessible Google Doc URL.

## Database

Use DigitalOcean Managed PostgreSQL for production. Keep the database separate from frontend hosting and do not expose database credentials to the GitHub Pages app.

Migration commands:

```bash
npm run db:generate
npm run db:migrate
```

Operational notes:

- Run migrations against the target database before routing production traffic.
- Keep `DATABASE_URL` only in backend local env files and DigitalOcean secrets.
- Use a least-privileged database user if the project later separates migration and runtime roles.
- The migration set is plain PostgreSQL and does not depend on provider-specific auth schemas or database auth helpers.

## DigitalOcean Deployment

Preferred production path:

1. Create a DigitalOcean project for Brackett.
2. Create a Managed PostgreSQL database.
3. Deploy `Backend` to DigitalOcean App Platform, or use a Droplet if manual server control is needed.
4. Add production environment variables in DigitalOcean.
5. Run migrations against the production `DATABASE_URL`.
6. Confirm `/health` returns `{"status":"ok"}`.
7. Confirm `/system/readiness` reports `ready` before inviting users.

Production commands:

- Build command: `npm run build`
- Start command: `npm run start`
- Type-check without emitting files: `npm run check`

Repository deploy assets:

- `Dockerfile` builds the production API image from this `Backend` directory.
- `.dockerignore` keeps local dependencies, logs, env files, and build output out of the image.
- `.do/app.yaml` is a DigitalOcean App Platform template. Replace `github.repo`, `APP_URL`, `API_URL`, `CORS_ORIGIN`, and the secret values with the real project settings before deploying.

## Clerk Setup

In Clerk:

1. Create the Brackett application.
2. Enable Google sign-in.
3. For production, turn on `Use custom credentials` for the Google social connection and copy Clerk's Authorized Redirect URI.
4. In Google Cloud Console, create a Web application OAuth client.
5. Add the frontend origin to Authorized JavaScript origins.
6. Paste Clerk's Authorized Redirect URI into Google's Authorized Redirect URIs.
7. Copy the Google Client ID and Client Secret back into the Clerk Google connection.
8. Move the Google OAuth consent screen from `Testing` to `In production` before launch.
9. Add the GitHub Pages frontend URL to allowed origins/redirects.
10. Add the backend API URL where required for callbacks or webhooks.
11. Copy `CLERK_SECRET_KEY` into DigitalOcean backend secrets.
12. Copy the frontend publishable key into the frontend environment/config owned by the frontend deploy.
13. Configure Clerk webhooks when backend user provisioning is wired to Clerk lifecycle events.

During the transition, keep legacy JWT secrets set for local development. Live Clerk sign-in should call `POST /auth/clerk/session` after the Clerk frontend session is ready; the backend then provisions or links the Brackett user, creates the first workspace if needed, and returns the normal app session payload.

The frontend Clerk UI handoff is now wired. The frontend wraps the app in `ClerkProvider`, sends the Clerk session token as `Authorization: Bearer <clerk-session-token>` to `POST /auth/clerk/session`, and completes the callback flow through `<AuthenticateWithRedirectCallback />`. The endpoint also sets the transition `refreshToken` cookie and returns the app `accessToken` used by the current dashboard.

Production notes:

- Google sign-in must be tested in a normal external browser. Google blocks OAuth sign-in inside embedded or in-app browser contexts.
- Google production OAuth expects a real homepage plus privacy and terms links on a domain you control.

## AI Resources

The backend contains an AI prompt/resource loading area under `src/ai`. The target production workflow is manual:

- choose the provider and model
- set `LLM_PROVIDER`, `LLM_API_KEY`, and `LLM_MODEL`
- replace or review prompt/resource files before using real website extraction
- keep provider keys in local env or DigitalOcean secrets only

Until those steps are done, website extraction should be considered demo-only.

## Observability

Before real users:

- connect Sentry or New Relic
- keep structured JSON request logs enabled through Pino/pino-http
- enable DigitalOcean app logs
- monitor `/system/readiness`
- verify database connection failures are visible in logs
- confirm auth failures do not leak secrets or tokens

Datadog can be added later if infrastructure-level metrics become important.

## Related Docs

- `ARCHITECTURE.md` explains the target system design and boundaries.
- `API_DOCS.md` documents the current HTTP surface and auth transition notes.
- `GO_LIVE_CHECKLIST.md` lists the launch tasks for GitHub Pages, DigitalOcean, Clerk, Postgres, and AI readiness.
