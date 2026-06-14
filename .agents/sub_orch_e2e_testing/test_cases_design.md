# E2E Test Suite Case Design

This document lists the 48 test cases covering the 4 core flows of the Brackett application across 4 test tiers.

---

## Flow A: Public Landing Page
Checks the product positioning, target audience copy, navigation links, and pricing sections.

### Tier 1: Feature Coverage (5 tests)
1. **Verify Brand Presence**: Confirms the logo, primary wordmark "Brackett", and main layout elements are rendered.
2. **Verify Navigation Elements**: Confirms primary landing page navigation links ("Overview", "How it works", "Pricing") are present.
3. **Verify Core Product Value Proposition**: Verifies the main headline "Keep every answer attached to its source." is visible.
4. **Verify Call to Action Buttons**: Verifies that "Create workspace" and "Preview the flow" CTAs are displayed.
5. **Verify Pricing Section Elements**: Confirms that standard pricing tiers (e.g. basic, pro, team) are displayed with features.

### Tier 2: Boundary & Corner Cases (5 tests)
6. **Hero Scroll Indicator boundary**: Verifies scroll trigger does not break elements when scrolled to limits.
7. **Missing window.lenis support**: Ensures landing page does not crash if Lenis smooth scrolling fails to initialize or is missing.
8. **Navigation click when elements hidden**: Verifies clicking pricing links navigates correctly to pricing sections.
9. **Window resize boundaries**: Verifies landing page content updates properly under different viewport dimensions.
10. **CTA trigger modal state**: Verify ESC key properly closes the AuthModal opened via Landing Page CTAs.

---

## Flow B: Auth Shell
Checks credentials login/signup, validation, and redirection flow.

### Tier 1: Feature Coverage (5 tests)
11. **Login Modal Display**: Verifies clicking "Create workspace" or "Sign in" opens the auth modal.
12. **Local Login Success**: Simulates typing valid credentials, calling the `/auth/login` endpoint, and successfully logging in.
13. **Local Signup Success**: Simulates typing name, workspace name, email, password, calling `/auth/signup`, and successfully signing up.
14. **Redirect to Dashboard**: Verifies that successful login/signup triggers session persistence and redirects to `/dashboard`.
15. **Logout Flow**: Verifies clicking "Sign out" calls `/auth/logout`, clears local storage, and redirects to landing page.

### Tier 2: Boundary & Corner Cases (5 tests)
16. **Incorrect Credentials Message**: Simulates incorrect login credentials returning 401/404, validating correct user-facing message.
17. **Signup Password Too Short**: Verifies validator triggers error when typing a password with length < 8 characters.
18. **Network Timeout/Offline**: Simulates API calling timeout or failing, verifying user-facing error recovery messages.
19. **Google OAuth Unavailable Fallback**: Verifies message display when Google sign-in is disabled or unavailable.
20. **Double Submit Prevention**: Verifies submit button becomes disabled during active login/signup calls to prevent duplicate submissions.

---

## Flow C: First-run Onboarding
Checks the branching paths: website URL import vs manual definition from scratch.

### Tier 1: Feature Coverage (5 tests)
21. **Onboarding Banner Render**: Verifies first-run workspace sees the suggestion banner asking for business context.
22. **Website Import Path Success**: Checks entering a valid URL, calling `/onboarding/website`, and successfully setting up profile.
23. **Manual Profile Path Success**: Checks filling manual form fields, calling `/onboarding/scratch`, and successfully setting up profile.
24. **Active Profile Summary Card**: Verifies active profile metrics (Business, Industry, Target customer, Main offer) are displayed.
25. **Branch Switching UI**: Verifies switching between manual form inputs and website import inputs.

### Tier 2: Boundary & Corner Cases (5 tests)
26. **Invalid Website URL Format**: Verifies entering an invalid URL pattern shows validation errors.
27. **Empty Manual Fields Validation**: Verifies submitting manual profile form with empty mandatory fields is blocked.
28. **Onboarding API Failure recovery**: Verifies when onboarding API fails, friendly alerts are displayed.
29. **Already Onboarded State**: Checks that if workspace onboarding profile is already present, the onboarding form is hidden.
30. **Submitting state disabled inputs**: Verifies form inputs are disabled during active onboarding import requests.

---

## Flow D: Main Dashboard Page
Checks dashboard view: business snapshot, questions list, signals, custom moves, and CTAs.

### Tier 1: Feature Coverage (5 tests)
31. **Overview Business Snapshot**: Verifies dashboard overview displays welcome header and active workspace name.
32. **Questions List rendering**: Checks that loaded workspace questions are shown on the dashboard.
33. **Add new question**: Simulates opening add question modal, submitting question, and verifying it is appended.
34. **Log decision on question**: Verifies logging official decision on a question updates its status.
35. **Guided Tour Flow**: Verifies that new workspaces trigger the guided tour steps.

### Tier 2: Boundary & Corner Cases (5 tests)
36. **Empty Workspace state**: Verifies that when a workspace has 0 questions/boards, it displays clean empty states.
37. **Dashboard loading state**: Checks loaders are displayed during active fetch and hidden when finished.
38. **Dashboard load failure recovery**: Checks that when the dashboard load API fails, a clean error message is displayed.
39. **Toggle board archive boundary**: Checks archiving/restoring boards updates board counts.
40. **Invalid status update logic**: Verifies updating a question to an invalid status is gracefully handled.

---

## Tier 3: Cross-Feature Interactions (4 tests)
41. **Auth Session expiry triggers login modal**: Verifies that an API call returning 401 automatically signs out user and opens Auth Modal.
42. **Onboarding completion unlocks Dashboard actions**: Verifies completing onboarding triggers state update which enables dashboard widgets.
43. **Signup to Onboarding redirection sequence**: Verifies that new user signup lands user directly onto dashboard showing the onboarding tab.
44. **Invite acceptance auth transition**: Verifies that accepting an invite redirects guest to login/signup modal.

---

## Tier 4: Real-world Application Scenarios (4 tests)
45. **Full User Lifecycle Workload**: Landing page -> Signup -> Complete onboarding from scratch -> Create board -> Create question -> Log decision -> Sign out.
46. **Full Website Import & Team Invite Workload**: Login -> Open Onboarding -> Import website URL -> Navigate to Team tab -> Generate invite link -> Verify success.
47. **Analyst Assistant Query Workload**: Login -> Open Analyst Brain tab -> Submit AI query -> Verify typing loader and answer response.
48. **API Integration Setup Workload**: Login -> Open Integrations tab -> Connect Slack placeholder integration -> Verify success checkmark.
