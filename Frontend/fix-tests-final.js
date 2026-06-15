import fs from 'fs';

let data = fs.readFileSync('src/tests/e2e/brackett.e2e.test.tsx', 'utf8');

// 1. Fix hero and nav button IDs that are no longer accessible by ID in MVP
data = data.replace(/document\.getElementById\('nav-signin-btn'\)!/g, "screen.getByRole('button', { name: /Sign in/i })");
data = data.replace(/const signInBtn = document\.getElementById\('nav-signin-btn'\);/g, "const signInBtn = screen.getByRole('button', { name: /Sign in/i });");

data = data.replace(/document\.getElementById\('hero-cta-primary'\)!/g, "screen.getAllByRole('button', { name: /Request access/i })[0]");
data = data.replace(/const cta = document\.getElementById\('hero-cta-primary'\);/g, "const cta = screen.getAllByRole('button', { name: /Request access/i })[0];");

data = data.replace(/document\.getElementById\('nav-getstarted-btn'\)!/g, "screen.getByRole('button', { name: /Create workspace/i })");
data = data.replace(/const getStartedBtn = document\.getElementById\('nav-getstarted-btn'\);/g, "const getStartedBtn = screen.getByRole('button', { name: /Create workspace/i });");

data = data.replace(/document\.getElementById\('hero-cta-secondary'\)/g, "screen.getAllByRole('button', { name: /Preview the flow/i })[0]");

// 2. Fix the "Pricing" link which is now "Preview" in MVP navigation
data = data.replace(/expect\(screen\.getByRole\('link', \{ name: \/Pricing\/i \}\)\)\.toBeInTheDocument\(\);/g, "expect(screen.getByRole('link', { name: /Preview/i })).toBeInTheDocument();");

// 3. Fix the "Keep every answer attached to its source" which changed in MVP Hero
data = data.replace(/const titleContainer = document\.getElementById\('hero-main-title'\);\s*expect\(titleContainer\?\.textContent\)\.toContain\('Keep every answer attached to its source\.'\);/g, "expect(screen.getByText(/Run your company after launch, not your tabs/i)).toBeInTheDocument();");

// 4. Fix Pricing section assertions
data = data.replace(/expect\(screen\.getByText\('Starter workspace'\)\)\.toBeInTheDocument\(\);/g, "expect(screen.getByText(/Execution clarity/i)).toBeInTheDocument();");
data = data.replace(/expect\(screen\.getByText\('For teams later'\)\)\.toBeInTheDocument\(\);/g, "expect(screen.getByText(/Early Access Team/i)).toBeInTheDocument();");

// 5. Fix all the getByRole('button', { name: /TabName/i }) that have duplicate mobile/desktop elements!
const tabsToFix = ['Command', 'Context', 'Decisions', 'Analyst', 'Sources', 'People', 'Sign out', 'Create workspace'];
tabsToFix.forEach(tab => {
    const regex = new RegExp(`screen\\.getByRole\\('button', \\{ name: \\/${tab}\\/i \\}\\)`, 'g');
    data = data.replace(regex, `screen.getAllByRole('button', { name: /${tab}/i })[0]`);
});

fs.writeFileSync('src/tests/e2e/brackett.e2e.test.tsx', data);
console.log('Fixed test file!');
