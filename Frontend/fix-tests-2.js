import fs from 'fs';

let data = fs.readFileSync('src/tests/e2e/brackett.e2e.test.tsx', 'utf8');

// Replace remaining hero-cta-primary clicks
data = data.replace(/document\.getElementById\('hero-cta-primary'\)!/g, "screen.getAllByRole('button', { name: /Request access/i })[0]");

// Replace any missing sign-in clicks if applicable
data = data.replace(/document\.getElementById\('nav-signin-btn'\)!/g, "screen.getByRole('button', { name: /Sign in/i })");

// Write back
fs.writeFileSync('src/tests/e2e/brackett.e2e.test.tsx', data);
console.log('Fixed remaining IDs!');
