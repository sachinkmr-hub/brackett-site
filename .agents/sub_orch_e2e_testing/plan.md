# E2E Testing Plan

## Objectives
- Implement comprehensive E2E test suite in the Frontend codebase (`Frontend/src/tests/e2e/`).
- Use Vitest and jsdom.
- Cover 4 flows: Public Landing, Auth Shell, First-run Onboarding, Main Dashboard.
- Cover 4 tiers of tests (Feature Coverage, Boundary, Cross-feature, Real-world).
- Minimum ~45-50 test cases total.
- Create `TEST_INFRA.md` and `TEST_READY.md`.
- Run verification via Reviewer, Challenger, and Auditor.

## Execution Steps
1. **Explore Frontend Codebase**: Find package.json, verify test frameworks, examine mock api conventions, understand page routes.
2. **Infra Setup**: Verify/configure Vitest for jsdom. Add packages if needed.
3. **Design Tests**: List out specific test cases for all 4 tiers across 4 flows.
4. **Implement Tests**: Delegate implementation to workers.
5. **Verify and Audit**: Spawning Reviewer, Challenger, and Auditor to ensure liveness, correctness, and integrity.
6. **Publish Results**: Write `TEST_INFRA.md` and `TEST_READY.md`.
