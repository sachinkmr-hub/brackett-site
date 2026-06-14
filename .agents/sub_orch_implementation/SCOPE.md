# Scope: Implementation Track - Brackett Upgrade

## Architecture
- React / TypeScript application located in the `Frontend/` folder.
- Styled using Tailwind CSS (and raw hex colors).
- Global theme definitions to be placed in `Frontend/src/theme/tokens.ts`.
- Routing and state managed by custom hooks and contexts (e.g., `AuthProvider.tsx`).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Diagnostics & Theme Token Setup | Create `Frontend/src/theme/tokens.ts`, replace hex colors, remove dead code | None | IN_PROGRESS |
| 2 | Auth Shell & Branching Onboarding Flow | Refine auth screens, error messages, and onboarding questionnaire paths | M1 | PLANNED |
| 3 | Main Dashboard Page | Style cards/tabs (Overview, Onboarding, Decisions, Analyst, Sources, People) with tokens | M2 | PLANNED |
| 4 | Landing Page Copy & Motion Tuning | Tune copy for target audience, calibrate animations (100ms - 400ms) | M3 | PLANNED |
| 5 | E2E integration & Hardening | Run E2E tests, generate adversarial cases (Tier 5), audit integrity | M4 | PLANNED |

## Interface Contracts
### Theme Tokens
- `tokens.ts` exports style constants for theme colors, typography scale, and spacing.
- React components import values from `tokens.ts` instead of using hardcoded color hex codes.
