const fs = require('fs');
let code = fs.readFileSync('src/tests/e2e/brackett.e2e.test.tsx', 'utf8');

const newMock = `
// Robust mock for motion/react
vi.mock('motion/react', () => {
  const React = require('react');
  const createMotionComponent = (tag) => {
    return React.forwardRef(({ children, layoutId, initial, animate, exit, transition, layout, variants, whileHover, whileTap, whileInView, viewport, style, ...props }, ref) => {
      return React.createElement(tag, { ...props, ref }, children);
    });
  };

  const motion = new Proxy({}, {
    get: (_, tag) => createMotionComponent(tag)
  });

  return {
    motion,
    AnimatePresence: ({ children }) => React.createElement(React.Fragment, null, children),
    useScroll: () => ({ scrollYProgress: { get: () => 0, onChange: () => () => {} } }),
    useTransform: () => 0,
    useSpring: () => 0,
    useInView: () => true,
    animate: () => ({ stop: () => {} })
  };
});
`;

// Inject mock
const insertMarker = "Tooltip: () => null,\n}));";
if (!code.includes('motion/react')) {
  code = code.replace(insertMarker, insertMarker + "\n\n" + newMock);
}

// Fix buttons
code = code.replace(/expect\(document\.getElementById\('hero-cta-primary'\)\)\.toHaveTextContent\('Create workspace'\);/g, `expect(screen.getAllByRole('button', { name: /Request access/i })[0]).toBeInTheDocument();`);
code = code.replace(/expect\(screen\.getAllByRole\('button', \{ name: \/Preview the flow\/i \}\)\[0\]\)\.toHaveTextContent\('Preview the flow'\);/g, `expect(screen.getAllByRole('button', { name: /See how it works/i })[0]).toBeInTheDocument();`);
code = code.replace(/const signupBtn = document\.getElementById\('hero-cta-primary'\);\s*fireEvent\.click\(signupBtn!\);/g, `const signupBtn = screen.getAllByRole('button', { name: /Request access/i })[0];\n    fireEvent.click(signupBtn);`);

fs.writeFileSync('src/tests/e2e/brackett.e2e.test.tsx', code);
console.log('Patched correctly!');
