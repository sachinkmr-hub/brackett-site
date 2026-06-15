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

// Remove the old proxy mock block
code = code.replace(/\/\/ Robust mock for motion\/react.*?\}\)\);\s*/s, '');
// Re-insert
code = code.replace(/vi\.mock\('recharts'.*?\}\)\);/s, match => match + "\n" + newMock);

fs.writeFileSync('src/tests/e2e/brackett.e2e.test.tsx', code);
console.log('Fixed motion proxy with useInView and animate!');
