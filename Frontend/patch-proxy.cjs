const fs = require('fs');
let code = fs.readFileSync('src/tests/e2e/brackett.e2e.test.tsx', 'utf8');

const replacementMock = `// Mock Framer Motion and Motion React
const mockMotion = vi.hoisted(() => {
  return () => {
    const React = require('react');
    const createMotionComponent = (tag) => {
      return React.forwardRef(({ children, layoutId, initial, animate, exit, transition, layout, variants, whileHover, whileTap, whileInView, viewport, style, ...props }, ref) => {
        return React.createElement(tag, { ...props, ref }, children);
      });
    };

    const motion = new Proxy({}, {
      get: (_, tag) => {
        if (tag === 'custom') return (Component) => createMotionComponent(Component);
        if (typeof tag !== 'string' || tag === '$$typeof' || tag === 'prototype' || tag === 'constructor') return undefined;
        return createMotionComponent(tag);
      }
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
});

vi.mock('framer-motion', mockMotion);
vi.mock('motion/react', mockMotion);

// Mock matchMedia for jsdom environment`;

code = code.replace(/\/\/ Mock matchMedia for jsdom environment/, replacementMock);

const analyticsMock = `
  if (path === '/workspaces/workspace-1/activity') {
    return jsonResponse(mockActivityFeed);
  }

  if (path === '/workspaces/workspace-1/analytics/overview') {
    return jsonResponse({
      activeQuestions: mockQuestions.length,
      resolvedThisWeek: 0,
      openQuestions: mockQuestions.filter(q => q.status === 'open').length,
      recentActivity: 0
    });
  }

  if (path === '/workspaces/workspace-1/private_ai') {
`;

code = code.replace(/  if \(path === '\/workspaces\/workspace-1\/private_ai'\) \{/, analyticsMock);

fs.writeFileSync('src/tests/e2e/brackett.e2e.test.tsx', code);
console.log('Patched mock and analytics endpoint cleanly!');
