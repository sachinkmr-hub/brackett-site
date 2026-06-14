# Workspace Context and Findings Index

## Initial Codebase Scan
- Frontend: Single-page application using React, TypeScript, Vite, Tailwind v4, Framer Motion, GSAP, Lenis.
- Frontend src components structure contains various components for hero, footer, product preview, problem section, etc., along with a `dashboard` directory containing overview, integrations, onboarding, overview, etc.
- Backend: Drizzle ORM, Express/Node server, TS, Vitest.

## Identified Upgrade Areas
1. Centralized Theme Tokens: Refactor color soup and hardcoded hex values to use Tailwind theme tokens or custom tokens.
2. Refined Navigation & Routing: Connect Landing page, Auth, Onboarding, and Dashboard flows seamlessly.
3. Narrative Tuning: Adjust copy in hero/landing page to state the target audience ("small startup teams / solopreneurs") and product positioning ("post-launch operating workspace").
4. Animation Timing: Align transitions to ~100-400ms range.
