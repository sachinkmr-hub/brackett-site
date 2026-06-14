/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Theme Design Tokens for Brackett
 * Maps brand design values, standardizing colors, typography, and spacing scales.
 */

export const COLORS = {
  // Brand Colors (from index.css --brackett-* variables)
  brand: {
    blue: '#2454d6',      // --brackett-blue
    cyan: '#0e9ba8',      // --brackett-cyan
    violet: '#6757d8',    // --brackett-violet
    green: '#2f7d5b',     // --brackett-green
    amber: '#b7791f',     // --brackett-amber
    red: '#c2413b',       // --brackett-red
  },

  // Neutral Colors
  neutral: {
    ink: '#11151d',       // --brackett-ink
    muted: '#667280',     // --brackett-muted
    porcelain: '#fbfcff', // --brackett-porcelain
    white: '#ffffff',
    slate950: '#0f172a',
    slate200: '#e2e8f0',
  },

  // Semantic UI Colors (from index.css --color-* variables under @theme)
  ui: {
    bgMain: '#fbfcff',     // --color-bg-main
    textMain: '#14181f',   // --color-text-main
    tileDark: '#111827',   // --color-tile-dark
    tileAccent: '#2454d6', // --color-tile-accent
    tileLight: '#ffffff',  // --color-tile-light
  },

  // Social/OAuth Colors
  social: {
    googleBlue: '#4285F4',
    googleGreen: '#34A853',
    googleYellow: '#FBBC05',
    googleRed: '#EA4335',
  },

  // Default SVG and logo colors
  logo: {
    default: '#0B1020',
    muted: '#5B5755',
    dark: '#18181B',
  },
} as const;

export const TYPOGRAPHY = {
  fontFamily: {
    sans: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: 'SFMono-Regular, Consolas, "Liberation Mono", monospace',
  },
  // Scale matches standard Tailwind CSS font-size configurations
  fontSize: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
  },
} as const;

export const SPACING = {
  // Spacing scales mapping logical names to standard rem/pixel values
  none: '0px',
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
} as const;
