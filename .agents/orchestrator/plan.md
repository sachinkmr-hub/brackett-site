# Project Execution Plan - Brackett MVP Upgrade

This document outlines the strategy, milestones, and verification procedures to upgrade the Brackett web application to an elite-tier MVP.

## Strategy
We will use the **Project Pattern** with **Dual Track** architecture:
1. **E2E Testing Track**: Build an opaque-box, requirement-driven E2E test suite covering the 4 core flows (Landing, Auth, Onboarding, Dashboard).
2. **Implementation Track**: Progressively audit and upgrade styling, flow navigation, narrative positioning, and animation timings to pass the E2E test suite and forensic checks.

---

## Track 1: E2E Testing Track (E2E Testing Orchestrator)
- **Objective**: Establish `TEST_READY.md` and `TEST_INFRA.md` with a comprehensive 4-Tier test suite.
- **Features Under Test**:
  1. Landing Page Narrative (audience and product positioning check)
  2. Auth Shell (Email/Password credentials login/signup, redirects to dashboard)
  3. First-run Onboarding (Branching path based on product state, contextual data gathering)
  4. Main Dashboard (Business snapshot, tracking questions, recent signals, moves, CTAs)
- **Test Metrics**:
  - Tier 1: Feature Coverage (>=5 per feature)
  - Tier 2: Boundary & Corner Cases (>=5 per feature)
  - Tier 3: Cross-Feature Interactions
  - Tier 4: Real-world Application Scenarios

---

## Track 2: Implementation Track (Implementation Orchestrator)
Decomposed into the following sequential milestones:

### Milestone 1: Diagnostics & Theme Token Setup
- **Objective**: Conduct a codebase scan for dead code, hardcoded hex colors (`#`), and layout duplication. Setup a centralized theme token config module for colors, typography, spacing, and transition speeds.
- **Verification**: Zero hardcoded hex colors in main components; clean TypeScript builds.

### Milestone 2: Auth Shell & Onboarding Flows
- **Objective**: Build or refine the email/password login/signup shell. Set up branching onboarding flow ("live product" vs "just starting"). Ensure transition to Main Dashboard on success.
- **Verification**: Complete UI coverage of onboarding paths, passing unit tests.

### Milestone 3: Main Dashboard Upgrade
- **Objective**: Refine dashboard tabs and cards using the theme tokens. Ensure clear visual hierarchy, proper business snapshot, key questions tracking, and active moves with singular CTAs.
- **Verification**: Components are fully typed, interactive, and token-driven.

### Milestone 4: Narrative Landing Page & Motion Tuning
- **Objective**: Refine landing page copy for target audience and product definition. Tone down animations, ensuring timing constraints (100ms - 400ms) and performance.
- **Verification**: Agent-as-Judge positioning check passes, no jarring animations.

### Milestone 5: E2E Integration, Adversarial Hardening (Tier 5) & Audit
- **Objective**: Connect the implementation to the E2E test suite. Run and fix E2E tests. Execute adversarial coverage tests (Challenger) and Forensic Audits.
- **Verification**: 100% E2E test pass, Clean Forensic Audit report.
