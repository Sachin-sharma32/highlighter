// Marginalia design tokens — shared by both web/ and extension/
// Usage in tailwind.config.js: const tokens = require('../tokens/tailwind.tokens.js')
//   then: theme: { extend: tokens }

/** @type {import('tailwindcss').Config['theme']['extend']} */
const tokens = {
  fontFamily: {
    display: ['"Fraunces"', '"Iowan Old Style"', 'Georgia', 'serif'],
    ui: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
    mono: ['"JetBrains Mono"', 'ui-monospace', '"SF Mono"', 'Menlo', 'monospace'],
  },
  colors: {
    paper: {
      DEFAULT: 'oklch(98.5% 0.006 85)',
      2: 'oklch(96.5% 0.008 85)',
      3: 'oklch(93.5% 0.01 85)',
    },
    rule: {
      DEFAULT: 'oklch(88% 0.012 85)',
      2: 'oklch(82% 0.014 85)',
    },
    ink: {
      DEFAULT: 'oklch(18% 0.01 60)',
      2: 'oklch(32% 0.012 60)',
      3: 'oklch(48% 0.014 60)',
      4: 'oklch(62% 0.014 60)',
    },
    accent: {
      DEFAULT: 'oklch(62% 0.16 40)',
      2: 'oklch(52% 0.17 40)',
      tint: 'oklch(94% 0.05 70)',
    },
    hl: {
      amber: 'oklch(90% 0.10 85)',
      rose: 'oklch(88% 0.08 20)',
      sage: 'oklch(90% 0.07 145)',
      sky: 'oklch(90% 0.06 230)',
      violet: 'oklch(88% 0.07 305)',
      'amber-ink': 'oklch(42% 0.10 75)',
      'rose-ink': 'oklch(42% 0.12 20)',
      'sage-ink': 'oklch(38% 0.08 145)',
      'sky-ink': 'oklch(40% 0.09 230)',
      'violet-ink': 'oklch(40% 0.10 305)',
    },
  },
  boxShadow: {
    'paper-1': '0 1px 2px rgba(50,30,10,0.04), 0 2px 6px rgba(50,30,10,0.05)',
    'paper-2': '0 2px 4px rgba(50,30,10,0.05), 0 8px 24px rgba(50,30,10,0.08)',
    'paper-3': '0 4px 12px rgba(50,30,10,0.08), 0 24px 60px rgba(50,30,10,0.12)',
  },
  borderRadius: {
    sm: '6px',
    DEFAULT: '10px',
    lg: '16px',
    xl: '22px',
    '2xl': '28px',
  },
};

module.exports = tokens;
