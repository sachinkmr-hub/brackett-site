# Brackett Backend API Documentation

This document describes the current backend HTTP surface and how it should be used in the target stack.

Target production stack:

- Frontend: GitHub Pages
- Backend: Node/TypeScript Express on DigitalOcean
- Database: DigitalOcean Managed PostgreSQL
- Auth/user management: Clerk
- AI keys/resources: filled manually later

## Base URLs

Local:

```text
http://localhost:4000
```

Production:

```text
https://<digitalocean-backend-domain>
```

The GitHub Pages frontend should use the production backend URL as its API base URL.

## Health and Readiness

### `GET /health`

Basic liveness probe.

Response:

```json
{ "status": "ok" }
```

Use this for DigitalOcean liveness checks.

### `GET /system/readiness`

Operational readiness probe. In non-production it is open. In production it returns `404` unless the request includes:

```text
x-readiness-token: <READINESS_TOKEN>
```

The response contract is:

- `status: "ready"` when every built-in check passes
- `status: "action_required"` when one or more tasks still need attention

Current built-in checks:

- database connectivity
- Clerk secret configuration
- encryption key configuration
- readiness token configuration
- whether a real AI key has replaced the demo value

Typical response shape:

```json
{
  "status": "action_required",
  "checks": {
    "databaseReachable": false,
    "clerkConfigured": true,
    "encryptionConfigured": true,
    "readinessTokenConfigured": true,
    "hasRealAiKey": false
  },
  "messages": {
    "database": "Database connection failed.",
    "googleAuth": "Google sign-in should be enabled in Clerk, then connected to the frontend publishable key and backend secret key.",
    "integrations": "Slack, Teams, and Git delivery stay in setup-required mode until their provider tokens or webhook URLs are configured."
  },
  "tasks": [
    "Add the real DigitalOcean/Postgres DATABASE_URL to Backend/.env.",
    "Add your real LLM_API_KEY to enable non-demo website extraction."
  ]
}
```

If `status` is `action_required`, do not treat the environment as ready for real users.

## Auth Contract

Target production auth is Clerk.

Production clients should authenticate through Clerk in the frontend and call `POST /auth/clerk/session` with the Clerk session token attached as `Authorization: Bearer <clerk-session-token>`. The backend verifies Clerk, maps or creates the Brackett product user, provisions a first workspace when needed, sets the transition `refreshToken` cookie, and returns the app session payload the dashboard already uses.

Current transition behavior:

- The backend currently accepts `Authorization: Bearer <accessToken>` on protected routes.
- That token is issued by the legacy `/auth` endpoints.
- Legacy JWT auth is useful for local development and migration testing.
- Do not treat legacy email/password auth as the final production user-management layer.
- Once a Clerk user has been provisioned through `/auth/clerk/session`, protected routes can also resolve the user from Clerk-authenticated requests.

Protected workspace routes require:

```text
Authorization: Bearer <token>
```

Routes that include `:workspaceId` in the path use that value as workspace context. Some middleware also accepts:

```text
x-workspace-id: <workspaceId>
```

## Standard Error Shape

Most errors use:

```json
{
  "code": "BAD_REQUEST",
  "message": "Human-readable message"
}
```

Common status codes:

| Status | Meaning |
| --- | --- |
| `400` | Invalid input or unsupported operation. |
| `401` | Missing, expired, or invalid token. |
| `403` | Authenticated user lacks workspace permission. |
| `404` | Requested record was not found. |
| `429` | Rate limit exceeded. |
| `500` | Unexpected backend failure. |

## Auth (`/auth`)

This route group contains the live Clerk handoff plus legacy email/password endpoints for local development and transition smoke testing.

### `POST /auth/clerk/session`

Live Clerk handoff endpoint. Requires Clerk middleware to be active through `CLERK_SECRET_KEY` and a valid Clerk session token in the request.

Headers:

```text
Authorization: Bearer <clerk-session-token>
```

If `CLERK_SECRET_KEY` is missing or still set to the placeholder, the endpoint returns `503 CLERK_NOT_CONFIGURED`. If Clerk cannot resolve the session, it returns `401 UNAUTHORIZED`.

Body:

```json
{
  "workspaceName": "Acme"
}
```

Response:

```json
{
  "user": {},
  "workspace": {},
  "workspaces": [],
  "accessToken": "..."
}
```

Also sets `refreshToken` as an HttpOnly cookie for the current app session.

### `GET /auth/me`

Returns the current app user and workspace list for an authenticated request.

### `POST /auth/signup`

Creates a product user, initial workspace, default board, owner membership, and a legacy JWT session.

Body:

```json
{
  "email": "person@example.com",
  "password": "secret",
  "name": "Person",
  "workspaceName": "Acme"
}
```

Response:

```json
{
  "user": {},
  "workspace": {},
  "accessToken": "..."
}
```

Also sets `refreshToken` as an HttpOnly cookie.

### `POST /auth/login`

Creates a legacy JWT session.

Body:

```json
{
  "email": "person@example.com",
  "password": "secret"
}
```

Response:

```json
{
  "user": {},
  "accessToken": "..."
}
```

Also sets `refreshToken` as an HttpOnly cookie.

### `POST /auth/refresh`

Uses the `refreshToken` HttpOnly cookie to rotate the refresh token and issue a new access token.

Response:

```json
{ "accessToken": "..." }
```

### `POST /auth/logout`

Revokes the current refresh token and clears the cookie.

## Workspaces (`/workspaces`)

Requires `Authorization: Bearer <token>`.

### `GET /workspaces`

Lists workspaces for the current user.

Response:

```json
[
  {
    "id": "uuid",
    "name": "Acme",
    "slug": "acme-abc123",
    "role": "owner"
  }
]
```

### `GET /workspaces/:workspaceId`

Returns one workspace if the current user is a member.

### `POST /workspaces/invites/accept`

Accepts a workspace invite while signed in.

Body:

```json
{ "token": "invite-token" }
```

## Activity (`/workspaces/:workspaceId/activity`)

Requires `Authorization: Bearer <token>`.

### `GET /workspaces/:workspaceId/activity`

Returns the latest workspace-wide activity feed entries merged across:

- question events
- integration status events
- workspace actions such as onboarding, board changes, and invite lifecycle changes

Query parameters:

- `limit`: optional, min `1`, max `50`, default `20`

Current feed categories include `question`, `integration`, `board`, `invite`, and `onboarding`.

Typical response:

```json
[
  {
    "id": "uuid",
    "type": "website_imported",
    "category": "onboarding",
    "title": "Website context imported",
    "summary": "Brackett refreshed the workspace profile from https://example.com.",
    "createdAt": "2026-06-10T18:22:14.000Z",
    "actor": {
      "name": "Person",
      "email": "person@example.com"
    }
  }
]
```

## Onboarding (`/workspaces/:workspaceId/onboarding`)

Requires `Authorization: Bearer <token>`.

### `GET /workspaces/:workspaceId/onboarding`

Returns the onboarding profile for the workspace. If none exists, returns a message indicating no profile exists.

### `POST /workspaces/:workspaceId/onboarding/website`

Scrapes a URL and uses the backend AI layer to extract business context.

Body:

```json
{ "url": "https://example.com" }
```

Production note: this requires real AI provider settings and reviewed prompt/resource files.

### `POST /workspaces/:workspaceId/onboarding/scratch`

Creates or updates the onboarding profile manually.

Body:

```json
{
  "businessName": "Acme",
  "industry": "Manufacturing",
  "targetCustomer": "Operations teams",
  "mainOffer": "Decision tracking",
  "primaryPainPoints": "Lost decisions",
  "toneAndStyle": "Clear and direct"
}
```

## Questions (`/workspaces/:workspaceId/questions`)

Requires `Authorization: Bearer <token>`.

Question enums:

- `sourceType`: `chat`, `document`, `meeting`, `email`, `spreadsheet`, `website`, `other`
- `priority`: `low`, `medium`, `high`, `urgent`
- `status`: `open`, `in_progress`, `answered`, `archived`
- export `format`: `json`, `markdown`, `pdf`

### `POST /workspaces/:workspaceId/questions`

Creates a question.

Body:

```json
{
  "title": "What should we standardize?",
  "longDescription": "Optional details",
  "sourceType": "meeting",
  "sourceLabel": "Weekly ops sync",
  "sourceUrl": "https://example.com/source",
  "sourceExcerpt": "Optional excerpt",
  "category": "Operations",
  "priority": "medium",
  "assigneeIds": ["uuid"],
  "boardId": "uuid"
}
```

### `POST /workspaces/:workspaceId/questions/capture`

Captures a question from source material. Requires `sourceType`, `sourceLabel`, and `sourceExcerpt`.

Body:

```json
{
  "title": "Should we change the rollout plan?",
  "sourceType": "document",
  "sourceLabel": "Launch doc",
  "sourceExcerpt": "The rollout plan is unclear.",
  "priority": "high",
  "boardId": "uuid"
}
```

### `GET /workspaces/:workspaceId/questions`

Lists questions.

Query parameters:

- `q`
- `status`
- `priority`
- `category`
- `assigneeId`
- `boardId`

### `GET /workspaces/:workspaceId/questions/:questionId`

Returns detailed question data.

### `GET /workspaces/:workspaceId/questions/:questionId/history`

Returns the audit trail for the question.

### `PATCH /workspaces/:workspaceId/questions/:questionId/status`

Updates status.

Body:

```json
{ "status": "in_progress" }
```

### `PATCH /workspaces/:workspaceId/questions/:questionId/assignees`

Replaces assignees.

Body:

```json
{ "assigneeIds": ["uuid"] }
```

### `POST /workspaces/:workspaceId/questions/:questionId/auto-assign`

Assigns the question to the least-loaded eligible workspace member.

### `POST /workspaces/:workspaceId/questions/:questionId/comments`

Adds a comment or decision note.

Body:

```json
{ "content": "We need finance input before deciding." }
```

### `POST /workspaces/:workspaceId/questions/:questionId/decision`

Logs the official decision and marks the question as answered.

Body:

```json
{
  "decisionText": "We will keep the current rollout plan.",
  "sourceSummary": "Approved in launch review.",
  "sourceUrl": "https://example.com/decision",
  "announcedTo": ["Slack", "Leadership"]
}
```

### `GET /workspaces/:workspaceId/questions/:questionId/announcement`

Builds a provider-ready announcement draft from the latest official decision.

### `POST /workspaces/:workspaceId/questions/:questionId/announcement/send`

Attempts to deliver the latest decision announcement through saved provider integrations. If `providers` is omitted, the backend uses integrations currently marked `connected` or `ready`. When a selected provider is missing credentials or a target, the backend records a `setup_required` delivery instead of silently pretending it sent.

Body:

```json
{
  "providers": ["slack", "teams", "git"],
  "targets": {
    "slack": "C0123456789",
    "git": "owner/repository"
  }
}
```

Response:

```json
{
  "questionId": "uuid",
  "title": "Decision title",
  "deliveries": [
    {
      "provider": "slack",
      "target": null,
      "status": "setup_required",
      "errorMessage": "Add Slack bot token and default channel before sending announcements."
    }
  ]
}
```

### `GET /workspaces/:workspaceId/questions/export/:format`

Exports workspace questions as `json`, `markdown`, or `pdf`.

For `pdf`, the response is a PDF attachment.

## Analytics (`/workspaces/:workspaceId/analytics`)

Requires `Authorization: Bearer <token>`.

### `GET /workspaces/:workspaceId/analytics/overview`

Returns aggregate workspace question statistics, including:

- total/open/answered counts
- oldest open question
- recent weekly created/answered trends
- assigned versus unassigned split
- current user's assigned questions

## Integrations (`/workspaces/:workspaceId/integrations`)

Requires `Authorization: Bearer <token>`.

Integration records describe configured providers, capture source context, and store encrypted provider credentials when supplied. External provider app creation and real tokens/webhooks are still manual setup items.

### `GET /workspaces/:workspaceId/integrations/catalog`

Returns supported provider metadata and setup requirements.

### `GET /workspaces/:workspaceId/integrations`

Lists connected integration records for the workspace.

### `POST /workspaces/:workspaceId/integrations/:provider`

Creates or updates an integration record.

Common providers include `google`, `slack`, `teams`, and `git`.

Body:

```json
{
  "externalAccountEmail": "person@example.com",
  "status": "connected",
  "metadata": {
    "workspace": "Acme"
  },
  "config": {
    "defaultChannelId": "C0123456789",
    "repository": "owner/repository"
  },
  "scopes": ["chat:write"],
  "accessToken": "provider-access-token",
  "refreshToken": "provider-refresh-token",
  "webhookUrl": "https://example.webhook.office.com/...",
  "tokenExpiresAt": "2026-06-11T12:00:00.000Z"
}
```

`accessToken`, `refreshToken`, and `webhookUrl` are encrypted before storage and are never returned by list/connect responses. `ENCRYPTION_KEY` must be set before a request includes any encrypted provider secret. Responses include `hasAccessToken`, `hasRefreshToken`, and `hasWebhookUrl` booleans instead. Do not put secret values inside `config` or `metadata`; the backend rejects secret-looking keys there.

### `POST /workspaces/:workspaceId/integrations/:provider/capture`

Captures a question from an integration context.

For `provider = google`, the backend can now fetch the source text directly from a Google Docs URL when:

- `sourceUrl` points to a Google Docs document
- the workspace Google integration has a stored Drive-scoped access token, or the document is public

If `sourceExcerpt` is omitted for Google capture, the backend attempts that fetch automatically and stores the first 5000 characters as the captured excerpt.

Body:

```json
{
  "title": "What changed in the launch scope?",
  "longDescription": "Optional details",
  "sourceLabel": "Slack thread",
  "sourceUrl": "https://example.com/source",
  "sourceExcerpt": "The launch scope changed in the thread.",
  "category": "Launch",
  "priority": "medium",
  "boardId": "uuid"
}
```

## Members (`/workspaces/:workspaceId/members`)

Requires `Authorization: Bearer <token>`.

### `GET /workspaces/:workspaceId/members`

Lists current workspace members and roles.

## Invites (`/workspaces/:workspaceId/invites`)

Requires `Authorization: Bearer <token>`.

Invite management requires `owner` or `admin`.

Invite roles:

- `owner`
- `admin`
- `member`
- `viewer`

### `GET /workspaces/:workspaceId/invites`

Lists pending and historical invites.

### `POST /workspaces/:workspaceId/invites`

Creates an invite.

Body:

```json
{
  "email": "teammate@example.com",
  "role": "member"
}
```

### `DELETE /workspaces/:workspaceId/invites/:inviteId`

Revokes an invite before it is accepted.

## Boards (`/workspaces/:workspaceId/boards`)

Requires `Authorization: Bearer <token>`.

Board creation and updates require `owner` or `admin`.

### `GET /workspaces/:workspaceId/boards`

Lists boards.

Query parameters:

- `q`
- `archived`: `true` or `false`

### `POST /workspaces/:workspaceId/boards`

Creates a board.

Body:

```json
{
  "name": "Launch",
  "description": "Launch decisions and open questions",
  "isArchived": false
}
```

### `GET /workspaces/:workspaceId/boards/:boardId`

Returns one board.

### `PATCH /workspaces/:workspaceId/boards/:boardId`

Updates a board.

Body:

```json
{
  "name": "Launch",
  "description": "Updated description",
  "isArchived": false
}
```

## CORS and Cookies

The backend uses CORS with credentials enabled. In production:

- set `CORS_ORIGIN` to the exact GitHub Pages origin
- do not use `*`
- ensure the frontend API base URL points to the DigitalOcean backend
- keep refresh-token cookies limited to the transition auth flow

## Production Readiness Notes

Before exposing this API to real users:

- add real Clerk keys and wire the frontend Clerk button to call `/auth/clerk/session`
- set frontend `VITE_API_BASE_URL` to the DigitalOcean backend URL
- set frontend `VITE_CLERK_PUBLISHABLE_KEY` from the Clerk application
- configure Clerk Google sign-in and redirects
- set DigitalOcean PostgreSQL `DATABASE_URL`
- run migrations
- set `ENCRYPTION_KEY` before storing provider tokens
- set Slack/Teams/Git provider keys or per-integration credentials before live delivery
- replace demo AI values if website extraction is part of launch
- connect Sentry or New Relic
- confirm `/system/readiness` returns `ready`
