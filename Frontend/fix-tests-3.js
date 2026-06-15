import fs from 'fs';

let data = fs.readFileSync('src/tests/e2e/brackett.e2e.test.tsx', 'utf8');

// Replace nav-signin-btn
data = data.replace(/document\.getElementById\('nav-signin-btn'\)!/g, "screen.getByRole('button', { name: /Sign in/i })");
data = data.replace(/const signInBtn = document\.getElementById\('nav-signin-btn'\);/g, "const signInBtn = screen.getByRole('button', { name: /Sign in/i });");

// Replace hero-cta-primary
data = data.replace(/document\.getElementById\('hero-cta-primary'\)!/g, "screen.getAllByRole('button', { name: /Request access/i })[0]");
data = data.replace(/const cta = document\.getElementById\('hero-cta-primary'\);/g, "const cta = screen.getAllByRole('button', { name: /Request access/i })[0];");

// Replace nav-getstarted-btn
data = data.replace(/document\.getElementById\('nav-getstarted-btn'\)!/g, "screen.getByRole('button', { name: /Create workspace/i })");
data = data.replace(/const getStartedBtn = document\.getElementById\('nav-getstarted-btn'\);/g, "const getStartedBtn = screen.getByRole('button', { name: /Create workspace/i });");

// Fix the dashboard Workspace Name missing error (Line 692)
// The test expects "Acme Corp" but the mock might return "Acme Corp Website" or similar depending on the test state.
// Wait, in `test-1458.log`, the error for 692 was "Workspace needs attention" - this means it was redirected to the Not Found boundary!
// Why was it redirected? Because `workspace-1` failed to load in Logout Flow test.

fs.writeFileSync('src/tests/e2e/brackett.e2e.test.tsx', data);
console.log('Fixed IDs!');
