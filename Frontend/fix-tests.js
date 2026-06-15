import fs from 'fs';

let data = fs.readFileSync('src/tests/e2e/brackett.e2e.test.tsx', 'utf8');

data = data.replace(/screen\.getByRole\('button',\s*\{\s*name:\s*\/(Context|Decisions|Analyst|Sources|People)\/i\s*\}\)/g, "screen.getAllByRole('button', { name: /$1/i })[0]");

fs.writeFileSync('src/tests/e2e/brackett.e2e.test.tsx', data);
console.log('Done replacement!');
