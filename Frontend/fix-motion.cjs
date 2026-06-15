const fs = require('fs');
let code = fs.readFileSync('src/tests/e2e/brackett.e2e.test.tsx', 'utf8');

const motionReactMock = `
// Mock motion/react for jsdom environment
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className, id, style, ...props }) => {
      const safeProps = { ...props };
      delete safeProps.layoutId; delete safeProps.initial; delete safeProps.animate; delete safeProps.exit; delete safeProps.transition; delete safeProps.layout; delete safeProps.variants; delete safeProps.whileHover; delete safeProps.whileTap;
      return React.createElement('div', { className, id, style, ...safeProps }, children);
    },
    h2: ({ children, className, ...props }) => React.createElement('h2', { className, ...props }, children),
    p: ({ children, className, ...props }) => React.createElement('p', { className, ...props }, children),
    span: ({ children, className, ...props }) => React.createElement('span', { className, ...props }, children),
  },
  AnimatePresence: ({ children }) => React.createElement(React.Fragment, null, children)
}));
`;

if (!code.includes('motion/react')) {
  code = code.replace(/vi\.mock\('recharts'.*?\}\)\);/s, match => match + "\n" + motionReactMock);
}

code = code.replace(/expect\(document\.getElementById\('hero-cta-primary'\)\)\.toHaveTextContent\('Create workspace'\);/g, `expect(screen.getAllByRole('button', { name: /Request access/i })[0]).toBeInTheDocument();`);
code = code.replace(/expect\(screen\.getAllByRole\('button', \{ name: \/Preview the flow\/i \}\)\[0\]\)\.toHaveTextContent\('Preview the flow'\);/g, `expect(screen.getAllByRole('button', { name: /See how it works/i })[0]).toBeInTheDocument();`);
code = code.replace(/const signupBtn = document\.getElementById\('hero-cta-primary'\);\s*fireEvent\.click\(signupBtn!\);/g, `const signupBtn = screen.getAllByRole('button', { name: /Request access/i })[0];\n    fireEvent.click(signupBtn);`);

fs.writeFileSync('src/tests/e2e/brackett.e2e.test.tsx', code);
console.log('Done!');
