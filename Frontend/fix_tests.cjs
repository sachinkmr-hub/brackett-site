const fs = require('fs');

let content = fs.readFileSync('src/tests/e2e/brackett.e2e.test.tsx', 'utf-8');

const testsToFix = [
  '23. Manual Profile Path Success',
  '24. Active Profile Summary Card',
  '27. Empty Manual Fields Validation',
  '30. Submitting state disabled inputs',
  '45. Full User Lifecycle Workload'
];

for (const testName of testsToFix) {
  const testRegex = new RegExp(`it\\('${testName}'.*?\\);`, 's');
  content = content.replace(testRegex, (match) => {
    return match.replace(
      /fireEvent\.click\(screen\.getByRole\('button', \{ name: \/Start from the public truth\/i \}\)\);/,
      "fireEvent.click(screen.getByRole('button', { name: /Shape the workspace yourself/i }));"
    );
  });
}

// 45 is a big block, we might have multiple. Wait, let's just do an index-based replace for test 45.
const start45 = content.indexOf(`it('45. Full User Lifecycle Workload'`);
if (start45 !== -1) {
  const end45 = content.indexOf(`});`, start45 + 5000);
  const block = content.substring(start45, end45 + 3);
  const newBlock = block.replace(
    /fireEvent\.click\(screen\.getByRole\('button', \{ name: \/Start from the public truth\/i \}\)\);/,
    "fireEvent.click(screen.getByRole('button', { name: /Shape the workspace yourself/i }));"
  );
  content = content.substring(0, start45) + newBlock + content.substring(end45 + 3);
}

fs.writeFileSync('src/tests/e2e/brackett.e2e.test.tsx', content);
