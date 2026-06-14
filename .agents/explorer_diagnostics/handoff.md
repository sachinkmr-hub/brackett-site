# Handoff Report — Brackett Frontend codebase analysis

## 1. Observation
Below are the exact observations made during the read-only investigation of the Brackett Frontend codebase located at `C:\Users\sachin\Downloads\brackett\Frontend`.

### A. Test Framework Configuration & Status
- **Framework & Config**: Confirmed in `package.json` lines 12-13, 31-34, and 41:
  ```json
  "test": "vitest run",
  "test:watch": "vitest"
  ...
  "@testing-library/dom": "^10.4.1",
  "@testing-library/jest-dom": "^6.9.1",
  "@testing-library/react": "^16.3.2",
  "@testing-library/user-event": "^14.6.1",
  ...
  "vitest": "^4.1.8"
  ```
- **Vite/Vitest Options**: Confirmed in `vite.config.ts` lines 35-39:
  ```typescript
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
  },
  ```
- **Vitest Setup**: `vitest.setup.ts` imports `@testing-library/jest-dom`:
  ```typescript
  import '@testing-library/jest-dom';
  ```
- **Test Execution Results**: Executed `npm test` synchronously. All 11 tests across 6 files passed successfully:
  ```
  ✓ src/lib/authSession.test.ts (2 tests) 37ms
  ✓ src/lib/routing.test.ts (3 tests) 125ms
  ✓ src/lib/api.test.ts (2 tests) 124ms
  ✓ src/lib/clerk.test.ts (2 tests) 88ms
  ✓ src/providers/AuthProvider.test.tsx (1 test) 240ms
  ✓ src/components/dashboard/DashboardLayout.test.tsx (1 test) 2644ms
       ✓ lands new workspaces in the dashboard with setup as the first action  2630ms

   Test Files  6 passed (6)
        Tests  11 passed (11)
  ```

---

### B. Hardcoded Hex Colors (#) in Source Code
Through exhaustive searches, 33 occurrences of hardcoded hex values were found in 7 files under `src/`:

1. **`src/index.css`** (24 lines):
   - Line 7: `--color-bg-main: #FBFCFF;`
   - Line 8: `--color-text-main: #14181F;`
   - Line 9: `--color-tile-dark: #111827;`
   - Line 10: `--color-tile-accent: #2454D6;`
   - Line 11: `--color-tile-light: #FFFFFF;`
   - Line 15: `--brackett-ink: #11151d;`
   - Line 16: `--brackett-muted: #667280;`
   - Line 19: `--brackett-blue: #2454d6;`
   - Line 20: `--brackett-cyan: #0e9ba8;`
   - Line 21: `--brackett-violet: #6757d8;`
   - Line 22: `--brackett-green: #2f7d5b;`
   - Line 23: `--brackett-amber: #b7791f;`
   - Line 24: `--brackett-red: #c2413b;`
   - Line 25: `--brackett-porcelain: #fbfcff;`
   - Line 110: `background: #ffffff;`
   - Line 113: `background: #d4d4d8;`
   - Line 115: `border: 3px solid #ffffff;`
   - Line 118: `background: #a1a1aa;`
   - Line 144: `background-color: #ffffff !important;`
   - Line 203: `linear-gradient(180deg, rgba(17, 21, 29, 0.98), #05070b),`
   - Line 210: `linear-gradient(180deg, #161b25, #05070b),`
   - Line 263: `background: linear-gradient(112deg, #11151d 0%, #11151d 58%, #2454d6 82%, #11151d 100%);`
   - Line 295: `linear-gradient(180deg, #ffffff 0%, #fbfcff 50%, #ffffff 100%);`
   - Line 304: `background-color: #ffffff !important;`
   - Line 305: `border-color: #d4d4d8 !important;`
   - Line 306: `color: #18181b !important;`
   - Line 311: `color: #a1a1aa !important;`
   - Line 315: `background: #ffffff;`
   - Line 319: `background: #d4d4d8;`
   - Line 320: `border-color: #ffffff;`
   - Line 334: `background-image: linear-gradient(#18181b0a 1px, transparent 1px), linear-gradient(90deg, #18181b0a 1px, transparent 1px);`
   - Line 377: `-webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);`

2. **`src/main.tsx`** (3 lines):
   - Line 37: `colorPrimary: '#2557d6',`
   - Line 38: `colorText: '#14181F',`
   - Line 39: `colorBackground: '#FFFFFF',`

3. **`src/components/AuthModal.tsx`** (5 lines):
   - Line 36: `<path d="..." fill="#4285F4"/>` (Google Blue)
   - Line 37: `<path d="..." fill="#34A853"/>` (Google Green)
   - Line 38: `<path d="..." fill="#FBBC05"/>` (Google Yellow)
   - Line 39: `<path d="..." fill="#EA4335"/>` (Google Red)
   - Line 251: `<BrackettLogo size={32} color="#18181B" />`

4. **`src/components/BrackettLogo.tsx`** (2 lines):
   - Line 17: `color = '#5B5755'`
   - Line 53: `color = '#0B1020',`

5. **`src/components/InviteAcceptPage.tsx`** (2 lines):
   - Line 127: `bg-[linear-gradient(180deg,#ffffff,#f6f9ff)]`
   - Line 132: `<BrackettLogo size={32} color="#18181B" />`

6. **`src/components/ProductPreview.tsx`** (1 line):
   - Line 55: `bg-[linear-gradient(180deg,#ffffff_0%,#f6f9ff_48%,#ffffff_100%)]`

7. **`src/components/dashboard/GuidedTour.tsx`** (2 lines):
   - Line 72: `bg-[linear-gradient(90deg,#2563eb,#06b6d4)] shadow-[0_0_18px_rgba(37,99,235,0.45)]`
   - Line 104: `bg-[linear-gradient(135deg,#1d4ed8,#06b6d4)]` and `shadow-[0_14px_34px_rgba(37,99,235,0.24)]`

---

### C. Structural Layout and Flow Interactions
1. **Landing Page (`src/pages/LandingPage.tsx`)**: Stacks the header (`Navigation`), landing body (`Hero`, `ProblemSection`, `HowItWorks`, `ProductPreview`, `SocialProof`, `PricingSection`, `LegalSection`), and `Footer`. It initializes Lenis smooth scrolling linked to GSAP ScrollTrigger ticker.
2. **Auth Modal (`src/components/AuthModal.tsx`)**: Triggered globally via `ModalProvider` (under `src/providers/ModalProvider.tsx`) which listens for the window CustomEvent `show-auth-modal`.
   - Offers login and signup modes.
   - Signup collects: `email`, `password`, `name`, and `workspaceName`.
   - Login collects: `email` and `password`.
   - Integrates with Clerk Google sign-in redirect flow if `VITE_CLERK_PUBLISHABLE_KEY` is configured.
   - Upon successful credentials/Google auth, persists session via `lib/authSession.ts` and redirects to `/dashboard`.
3. **Onboarding Flow (`src/components/dashboard/tabs/OnboardingTab.tsx`)**: Evaluated via a derived Boolean flag `needsOnboarding` (checks if `onboardingProfile` contains any value for `websiteUrl`, `businessName`, `industry`, `targetCustomer`, or `mainOffer`).
   - If true: Renders context alerts on `OverviewTab`, shifts priority on "Next best moves" suggested actions list to company context import, and adjusts `GuidedTour` behavior to keep the user on overview.
   - User completes onboarding by submitting a company website URL (fetches, parses, and extracts profile fields on backend) or filling out the 5-field manual business profile form.
   - Completing onboarding boosts the **Workspace readiness score** by **28%** and unlocks access to the Private Analyst tab (which stays locked if there are no live sources/grounding profile).
4. **Dashboard Layout (`src/components/dashboard/DashboardLayout.tsx`)**: Wrapped in `DashboardProvider` which coordinates API queries. Contains:
   - Sidebar containing workspace branding, readiness widget, search button (Command Palette trigger), and 6 tabs: Command (`overview`), Context (`onboarding`), Decisions (`discussions`), Analyst (`analyst`), Sources (`integrations`), and People (`team`).
   - Command Palette (`CommandPalette.tsx`) triggered via `Ctrl+K` (or `Cmd+K`) allowing quick keyboard jumps to tabs or actions.
   - Guided Tour (`GuidedTour.tsx`) using `react-joyride` which walks new users through the UI step-by-step.

---

### D. Dead Code / Unused Elements
1. **Unused types in `src/types.ts`**:
   - `QuestionTile` (lines 12-19)
   - `Testimonial` (lines 29-36)
   - `PricingPlan` (lines 38-47)
   Declared and exported but never imported or referenced in other source files.
2. **Unused custom hook function `login`**:
   - Inside `src/providers/AuthProvider.tsx` (lines 86-88), `login` is defined but never destructured or used by any consuming components.
3. **Unused custom hook state `accessToken`**:
   - Inside `src/providers/AuthProvider.tsx`, `accessToken` is returned in context. However, no application component destructures `accessToken` from `useAuth()`. The API requests rely directly on the in-memory ref in `api.ts`.
4. **Unused utility function `getCurrentAppPath`**:
   - Inside `src/lib/routing.ts` (lines 51-65), `getCurrentAppPath` is exported but only imported and used by its unit test file `src/lib/routing.test.ts`. It has zero consumption in the main application bundle.
5. **Unused alias `clearClerkCallbackRequest`**:
   - Inside `src/lib/clerk.ts` (line 59), `clearClerkCallbackRequest` is exported as an alias of `clearClerkAuthHandoffRequest` but never imported anywhere.

---

## 2. Logic Chain
- **Vitest status**: Executed the project test runner script `npm test`. Because the terminal output logged `11 passed (11)` tests across `6 passed (6)` test files with no failures and successfully returned a zero exit status, we conclude the test suite fully passes.
- **Tailwind class hex coordinates**: Tested a regex search using word boundaries (`\b`) vs an exhaustive regex. The exhaustive search found a Tailwind gradient class `#ffffff_0%` in `src/components/ProductPreview.tsx` that the word-boundary search missed. This is because underscores (`_`) and numbers (`0`) are word characters in regex, preventing a word boundary `\b` from matching between the hex digits and the trailing percentage marker/opacity suffix.
- **Unused Hook Elements**: Searched globally for imports and destructuring of elements returned by the `useAuth` hook. The search returned zero occurrences of the `login` function or `accessToken` state being consumed outside `AuthProvider.tsx` itself. This verifies they are dead code in the context of the React tree.
- **Unused Custom Types**: Searched the codebase for occurrences of type definitions `QuestionTile`, `Testimonial`, and `PricingPlan`. The only match returned was their own declarations in `src/types.ts`. Therefore, they represent dead code.

---

## 3. Caveats
- The backend API was not running during the type check or test run, but since Vitest uses mock handlers (e.g. `vi.fn()` mocks in `AuthProvider.test.tsx` and custom mock endpoints in `api.test.ts`), the tests pass independently of the actual live backend state.
- Unused hook state `accessToken` is tested in `AuthProvider.test.tsx` (line 34, asserting its value), meaning removing `accessToken` from `AuthProvider.tsx` would require updating `AuthProvider.test.tsx`.

---

## 4. Conclusion
The Brackett Frontend is a clean, modern React + Vitest application with solid unit test coverage (11/11 tests passing) and a cohesive dashboard/onboarding architecture. Hardcoded colors are confined to CSS custom variables (in `src/index.css`) and specific Tailwind gradients or SVG properties. There is small, non-critical dead code in the shape of 3 unused interfaces, 1 unused hook function, 1 unused context property, and 2 unused utility helpers that can be cleaned up without affecting runtime behavior.

---

## 5. Verification Method
1. **To run the test suite**:
   Navigate to `C:\Users\sachin\Downloads\brackett\Frontend` and run:
   ```powershell
   npm test
   ```
   Confirm that 11 tests pass successfully.
2. **To verify dead code status**:
   Run the following PowerShell command in the project root:
   ```powershell
   Get-ChildItem -Path src -Recurse -File | Select-String -Pattern "QuestionTile|Testimonial|PricingPlan"
   ```
   Confirm that they are only defined in `src/types.ts` and never imported elsewhere.
