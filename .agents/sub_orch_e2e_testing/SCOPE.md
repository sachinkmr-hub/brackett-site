# Scope: E2E Testing Track

## Architecture
- Target: Frontend application under C:\Users\sachin\Downloads\brackett\Frontend
- Test framework: Vitest + jsdom + Testing Library (or React mock environment)
- Mock mechanism: MSW (Mock Service Worker) or fetch mocking to simulate backend endpoints.
- Entry points / core flows:
  1. Public Landing Page
  2. Auth Shell
  3. First-run Onboarding
  4. Main Dashboard Page

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Setup and Infra | Install test packages, configure Vitest, create mock setup and helper utils | None | IN_PROGRESS (381615cb-01fd-446c-a5b4-2b1e64607b29) |
| 2 | Landing Page Tests | Tier 1, 2, 3, 4 tests for Public Landing Page | M1 | IN_PROGRESS (381615cb-01fd-446c-a5b4-2b1e64607b29) |
| 3 | Auth Shell Tests | Tier 1, 2, 3, 4 tests for Auth Shell | M1 | IN_PROGRESS (381615cb-01fd-446c-a5b4-2b1e64607b29) |
| 4 | First-run Onboarding Tests | Tier 1, 2, 3, 4 tests for Onboarding flow | M1 | IN_PROGRESS (381615cb-01fd-446c-a5b4-2b1e64607b29) |
| 5 | Dashboard Tests | Tier 1, 2, 3, 4 tests for Main Dashboard Page | M1 | IN_PROGRESS (381615cb-01fd-446c-a5b4-2b1e64607b29) |
| 6 | E2E Integration and Tier 3/4 Verification | Verify cross-feature combinations and real-world workloads | M2, M3, M4, M5 | IN_PROGRESS (381615cb-01fd-446c-a5b4-2b1e64607b29) |
| 7 | Documentation & Publish | Create TEST_INFRA.md and TEST_READY.md | M6 | PLANNED |

## Interface Contracts
- Tests interact with the React components / router directly using standard Testing Library queries, simulating user clicks, inputs, and navigations.
- Mock API endpoints must match Frontend API calls exactly.
