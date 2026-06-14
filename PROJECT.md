# Project: Brackett MVP Upgrade

## Architecture
Brackett is a single-page React web application written in TypeScript and styled with Tailwind CSS v4.
- **Frontend Entry Point**: `Frontend/src/main.tsx` and `Frontend/src/App.tsx`.
- **Pages**:
  - `Frontend/src/pages/LandingPage.tsx`: Narrative-driven landing page.
- **Components**:
  - `Frontend/src/components/AuthModal.tsx`: Authentication dialog.
  - `Frontend/src/components/DashboardApp.tsx`: Main dashboard entry point.
  - `Frontend/src/components/dashboard/`: Dashboard layout, context, and tab subviews.
- **Routing**: `react-router-dom` handles route routing (e.g. `/` for Landing/Auth, `/dashboard` for logged-in users).
- **Styling**: Tailwind CSS v4. Styling tokens must be centralized. No hardcoded hex values (#) in primary UI/components.
- **Animation**: framer-motion, GSAP, or CSS transitions. Timings must be between 100ms and 400ms.

---

## Milestones
| # | Name | Scope | Dependencies | Status | Conversation ID / Agent ID |
|---|------|-------|-------------|--------|----------------------------|
| 1 | E2E Testing Track | Create the full E2E test harness and opaque-box test suite for Tiers 1-4 | None | IN_PROGRESS | e320c2ac-b8b6-4365-a68c-5df6ea785b9c |
| 2 | Theme Token Setup & Styling | Centralize all styles, colors, typography, spacing into a tokens module. Replace all hex colors | None | IN_PROGRESS | aaa8a86f-35a3-445a-9df9-49fe9fb568b7 |
| 3 | Auth & Onboarding Flow | Align email/password credentials and branching onboarding flow ("live product" vs "just starting") | M2 | PLANNED | aaa8a86f-35a3-445a-9df9-49fe9fb568b7 |
| 4 | Main Dashboard Page | Redesign main dashboard tab subviews using design tokens and clear action buttons | M2 | PLANNED | aaa8a86f-35a3-445a-9df9-49fe9fb568b7 |
| 5 | Narrative Landing Page | Tune landing page positioning and copy; calibrate animations to 100ms - 400ms | M2 | PLANNED | aaa8a86f-35a3-445a-9df9-49fe9fb568b7 |
| 6 | E2E Pass & Hardening | Run E2E test suite, fix issues, execute adversarial tests (Tier 5) and Forensic Audit | M1, M3, M4, M5 | PLANNED | aaa8a86f-35a3-445a-9df9-49fe9fb568b7 |

---

## Interface Contracts
### Routing & Authentication
- Paths: `/` loads Landing Page (if unauthenticated).
- Credentials: Sign-in modal submits to `post /auth/login` and `/auth/signup`.
- Successful authentication redirects the user directly to `/dashboard`.
- Unauthenticated access to `/dashboard` redirects to `/`.

### Onboarding State
- Onboarding branches:
  - Branch A: "I already have a website / live product" -> input URL and signal sources (analytics, revenue).
  - Branch B: "I'm just starting" -> input product idea and goals.
- Submission registers initial dashboard state on the backend.

### Code Layout
- Custom tokens config file: `Frontend/src/lib/theme.ts` or `Frontend/src/theme/tokens.ts`.
- Sub-pages of core flows should reside in `Frontend/src/pages/` or `Frontend/src/components/`.
