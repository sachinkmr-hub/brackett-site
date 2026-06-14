# Implementation Plan - Brackett Upgrade

## Step-by-Step Plan
1. **Initialize Workspace & Scope**: Define files, configuration, and interface boundaries. Set up heartbeat cron.
2. **Milestone 1 - Diagnostics & Theme Token Setup**:
   - Spawn Explorer to identify the location of style tokens, components using hardcoded hex colors, and dead code interface types.
   - Spawn Worker to implement tokens.ts, replace hex colors, remove dead code, and verify builds/tests.
   - Spawn Reviewer to check correctness, token centralisation, and layout consistency.
   - Spawn Challenger to run validation checks.
   - Spawn Forensic Auditor to verify no hardcoded cheats.
3. **Milestone 2 - Auth Shell & Branching Onboarding Flow**:
   - Spawn Explorer to analyze login/signup components, onboarding forms, and redirect flows.
   - Spawn Worker to refine inputs, clean errors, build branching paths, and verify state storage on submission.
   - Spawn Reviewer, Challenger, and Forensic Auditor.
4. **Milestone 3 - Main Dashboard Page**:
   - Spawn Explorer to analyze dashboard page cards, tabs (Overview, Onboarding, Decisions, Analyst, Sources, People).
   - Spawn Worker to refine style using theme tokens, design cards/tabs, set default states and CTAs.
   - Spawn Reviewer, Challenger, and Forensic Auditor.
5. **Milestone 4 - Landing Page Copy & Motion Tuning**:
   - Spawn Explorer to audit landing page copy, identify animation components, speed/durations, and potential layout thrashing.
   - Spawn Worker to update copy (target: "small startup teams / solopreneurs", "post-launch operating workspace") and calibrate animation speeds (100ms - 400ms).
   - Spawn Reviewer, Challenger, and Forensic Auditor.
6. **Milestone 5 - E2E Integration, Adversarial Hardening (Tier 5) & Audit**:
   - Wait for `TEST_READY.md` from E2E track.
   - Spawn Worker to integrate and run the E2E test suite, fixing any bugs.
   - Spawn Challenger to generate adversarial test cases (Tier 5) for white-box coverage hardening.
   - Spawn Reviewer and Forensic Auditor.
7. **Synthesis & Handoff**: Synthesize results, check E2E tests and forensic audit report. Report completion to parent.
