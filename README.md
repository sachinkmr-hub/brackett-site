# Brackett

A workspace for small product teams to capture business questions, attach evidence,
review priorities, and record human decisions without losing their context.

**Product hypothesis:** keeping a question, its source material, and its final decision
together will reduce time spent reconstructing context before a review. This is a
hypothesis to validate with users; this repository does not establish customer demand
or revenue impact.

## What is implemented

- React/TypeScript dashboard with authentication, workspace onboarding, questions,
  boards, integrations setup, and activity views.
- Express/PostgreSQL API with workspace membership checks.
- Deterministic analyst: question-sensitive lexical retrieval, priority triage,
  missing-evidence detection, explicit abstention, and inspectable execution metadata.
- Optional provider-backed website extraction with validated structured output.
- Atomic decision persistence: status, decision text, and decision attribution commit
  together. Source labels and board membership do not count as evidence.

The analyst does **not** call an LLM. Its model cost is zero; hosting/database costs
still apply. Provider-backed onboarding extraction is a separate LLM feature.
No semantic RAG, autonomous decision execution, or measured customer outcomes are claimed.

## Local setup

Node.js 22+ and a PostgreSQL database are needed for the full application.

```sh
npm ci --prefix Backend
npm ci --prefix Frontend
cp Backend/.env.example Backend/.env
cp Frontend/.env.example Frontend/.env
# Fill the environment files with your own configuration.
npm run db:migrate --prefix Backend
npm run dev --prefix Backend
# In another terminal:
npm run dev --prefix Frontend
```

See Backend/README.md for authentication and deployment configuration. Never commit
credentials. A provider credential previously embedded in source must be revoked;
removing it from the current file does not invalidate it or remove git history.

## Reproducible interview demo (no database or credentials)

```sh
npm ci --prefix Backend
npm run demo
npm run eval --prefix Backend
```

The synthetic fixture demonstrates priority review, evidence gaps, a matching question,
and an unanswerable question. Demo output runs the same analyst function used by the API;
it does not exercise authentication, persistence, or the frontend.

## Verification

```sh
npm run check
npm test
npm run build --prefix Backend
npm run build --prefix Frontend
```

The analyst evaluation suite contains ten hand-authored regression scenarios. Passing
these is not a benchmark of general business reasoning or a model comparison. Database
service tests use mocks; live database rollback and deployment behavior need separate
integration testing. Existing tests named `e2e` are component tests in jsdom, not real
browser/deployed end-to-end tests.

See [the interview guide](docs/INTERVIEW_GUIDE.md) for the demo sequence, product
reasoning, contribution attribution, and limitations.
