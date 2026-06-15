import '@testing-library/jest-dom';

if (typeof window !== 'undefined') {
  window.matchMedia = window.matchMedia || function(query) {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: function() {}, // deprecated
      removeListener: function() {}, // deprecated
      addEventListener: function() {},
      removeEventListener: function() {},
      dispatchEvent: function() { return false; }
    };
  };
}

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof window !== 'undefined') {
  window.ResizeObserver = window.ResizeObserver || ResizeObserverMock;
}

class IntersectionObserverMock {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  disconnect() {}
  observe() {}
  takeRecords() { return []; }
  unobserve() {}
}

if (typeof window !== 'undefined') {
  window.IntersectionObserver = window.IntersectionObserver || IntersectionObserverMock;
}

import React from 'react';
React.lazy = (ctor: () => Promise<{ default: React.ComponentType<any> }>) => {
  return function LazyMock(props: any) {
    const [Component, setComponent] = React.useState<React.ComponentType<any> | null>(null);
    React.useEffect(() => {
      let isMounted = true;
      ctor().then((module) => {
        if (isMounted) {
          setComponent(() => module.default);
        }
      });
      return () => {
        isMounted = false;
      };
    }, []);

    if (!Component) {
      return null;
    }
    return React.createElement(Component, props);
  } as any;
};
import { MotionGlobalConfig } from 'framer-motion'; MotionGlobalConfig.skipAnimations = true;
