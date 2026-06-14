# Brackett Architecture

This document describes the target architecture for Brackett after the stack transition.

## System Shape

```text
Browser
  |
  | static assets
  v
GitHub Pages frontend
  |
  | HTTPS API calls with Clerk session context
  v
DigitalOcean backend: Node/TypeScript Express
  |
  | SQL over SSL
  v
DigitalOcean Managed PostgreSQL

Clerk owns identity, sessions, Google OAuth, and user lifecycle events.
AI provider keys and backend AI resources are filled manually when ready.
```

## Components

| Area | Target choice | Ownership |
| --- | --- | --- |
| Frontend hosting | GitHub Pages | Static React/Vite build output from `Frontend/dist`. |
| Backend runtime | Node/TypeScript Express | API, product workflows, authorization checks, AI orchestration. |
| Backend hosting | DigitalOcean App Platform or Droplet | App Platform for managed deploys; Droplet only if manual control is needed. |
| Database | DigitalOcean Managed PostgreSQL | Product data, workspace data, and app records. |
| ORM/migrations | Drizzle | Schema and migrations for PostgreSQL. |
| Auth/user management | Clerk | Identity, Google sign-in, sessions, user profile source of truth. |
| AI | Backend-managed provider integration | Provider keys and resources are manually supplied later. |
| Observability | Sentry or New Relic first | Errors, logs, uptime, readiness, and database connectivity. |

## Runtime Boundaries

### Frontend

The frontend is a static GitHub Pages site. It should not hold backend secrets, database URLs, Clerk secret keys, or AI provider keys.

Frontend responsibilities:

- render the Brackett UI
- use the Clerk frontend SDK/publishable key
- send authenticated requests to the backend API
- keep the configured API base URL pointed at the DigitalOcean backend

### Backend

The backend is the only public service allowed to talk to PostgreSQL and AI providers.

Backend responsibilities:

- validate authenticated requests
- enforce workspace membership and roles
- run onboarding, questions, boards, invites, analytics, and integrations workflows
- assemble the workspace activity feed from question, integration, onboarding, board, and invite events
- call AI providers after provider keys/resources are installed
- expose liveness and readiness checks
- log operational failures without leaking secrets

### Database

DigitalOcean Managed PostgreSQL stores Brackett product data. It should be reached only from backend runtime and migration tooling.

Database responsibilities:

- workspace and membership records
- board records
- onboarding profiles
- question records and history
- workspace activity feed records
- invite records
- integration records
- integration event records
- announcement delivery records
- refresh tokens while legacy local auth remains active

## Auth Model

Target production auth:

1. A user signs in through Clerk, including Google sign-in.
2. The frontend receives Clerk-managed session state.
3. The frontend calls the backend with authenticated context.
4. The backend verifies the request and maps the Clerk user to Brackett product data.
5. Workspace membership and role checks happen inside the backend before product data is returned or changed.

Current transition state:

- The backend still exposes legacy email/password JWT auth endpoints.
- `JWT_ACCESS_SECRET` is still required for those endpoints. Refresh tokens are opaque random tokens stored as hashes, not JWTs.
- These endpoints are useful for local development and migration testing.
- They should not be treated as the final production identity layer once Clerk is fully wired.
- The backend exposes `POST /auth/clerk/session` for live Clerk handoff after the frontend Clerk session is ready.

Clerk webhook target:

- Clerk should eventually notify the backend about user creation, updates, and deletion.
- Webhook verification should use `CLERK_WEBHOOK_SECRET`.
- Backend provisioning should create or update Brackett user records without making Clerk data secondary to local password auth.

## Data Ownership

Clerk owns:

- user identity
- email verification
- Google OAuth
- sessions
- profile data needed for sign-in/user management

Brackett owns:

- product user record mapped to Clerk identity
- workspaces
- workspace members and roles
- boards
- onboarding profiles
- questions
- question events, comments, and decisions
- invites
- workspace integrations
- AI extraction outputs

## Deployment Flow

1. Build the frontend and publish the static output to GitHub Pages.
2. Configure the production frontend URL and HTTPS in GitHub Pages.
3. Create the DigitalOcean project.
4. Create DigitalOcean Managed PostgreSQL.
5. Add `DATABASE_URL` and backend secrets to DigitalOcean.
6. Deploy the backend to DigitalOcean App Platform or a Droplet.
7. Run backend database migrations against the production database.
8. Create the Clerk application and enable Google sign-in.
9. Set Clerk frontend and backend keys in their respective environments.
10. Set `CORS_ORIGIN` to the exact GitHub Pages origin.
11. Fill AI provider settings when real extraction is ready.
12. Add Sentry or New Relic before inviting real users.
13. Confirm `/health` and `/system/readiness`.

## DigitalOcean App Platform Notes

Use App Platform unless the project needs manual server-level control.

Recommended App Platform settings:

- Source directory: `Backend`
- HTTP port: use the injected `PORT` value
- Liveness endpoint: `/health`
- Readiness/smoke endpoint: `/system/readiness` with `x-readiness-token` in production
- Environment variables: set as encrypted app secrets
- Database: attach or reference DigitalOcean Managed PostgreSQL

Production command:

- Build with `npm run build`, then start with `npm run start`.
- The current `start` script runs the compiled backend with `node dist/server.js`.

## Droplet Notes

Use a Droplet only when App Platform is too limiting.

Droplet responsibilities:

- install Node runtime
- install dependencies
- run the API under a process manager
- terminate TLS through a reverse proxy or load balancer
- configure firewall rules
- keep OS packages updated
- configure logs, restarts, and backups

App Platform avoids most of this operational work.

## Security Model

Minimum production controls:

- only the backend sees `DATABASE_URL`
- only the backend sees `CLERK_SECRET_KEY`
- only the backend sees `ENCRYPTION_KEY`
- only the backend sees AI provider keys
- only the backend sees provider delivery tokens and webhook URLs
- frontend uses only Clerk publishable keys and public API URLs
- `CORS_ORIGIN` is the exact GitHub Pages origin
- cookies, if used by transition auth, are `HttpOnly`, secure in production, and same-site appropriate
- database connections require SSL
- logs do not include access tokens, refresh tokens, Clerk secrets, AI keys, or database credentials

## Readiness Signals

The backend exposes:

- `GET /health` for liveness
- `GET /system/readiness` for launch readiness; in production it returns `404` unless `x-readiness-token` matches `READINESS_TOKEN`

Readiness should be considered blocking if:

- PostgreSQL cannot be reached
- Clerk secret is missing
- encryption key is missing
- readiness token is missing
- the backend is still using the demo AI key

## External Manual Work

These steps intentionally happen outside code:

- buy or connect the production domain
- configure GitHub Pages custom domain and HTTPS
- create the DigitalOcean project/app/database
- add DigitalOcean secrets
- create the Clerk app
- configure Google OAuth in Clerk
- add Clerk redirect/origin settings
- fill real AI provider key
- review/replace AI prompt and resource files
- add observability keys
