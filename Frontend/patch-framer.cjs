const fs = require('fs');
let code = fs.readFileSync('src/tests/e2e/brackett.e2e.test.tsx', 'utf8');

const replacementMock = `
const mockMotion = () => {
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
};

vi.mock('framer-motion', mockMotion);
vi.mock('motion/react', mockMotion);
`;

// Replace the old motion/react mock with this dual mock
code = code.replace(/\/\/ Robust mock for motion\/react[\s\S]*?animate: \(\) => \(\{ stop: \(\) => \{\} \}\)\n  };\n\}\);/, replacementMock);

fs.writeFileSync('src/tests/e2e/brackett.e2e.test.tsx', code);
console.log('Patched with dual mock!');
