// Marginalia design tokens — shared by both web/ and extension/
// Usage in tailwind.config.js: const tokens = require('../tokens/tailwind.tokens.js')
//   then: theme: { extend: tokens }

/** @type {import('tailwindcss').Config['theme']['extend']} */
const tokens = {
  fontFamily: {
    display: ['"Fraunces"', '"Iowan Old Style"', "Georgia", "serif"],
    ui: [
      '"Inter"',
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "sans-serif",
    ],
    mono: [
      '"JetBrains Mono"',
      "ui-monospace",
      '"SF Mono"',
      "Menlo",
      "monospace",
    ],
  },
  colors: {
    paper: {
      DEFAULT: "var(--paper)",
      2: "var(--paper-2)",
      3: "var(--paper-3)",
    },
    rule: {
      DEFAULT: "var(--rule)",
      2: "var(--rule-2)",
    },
    ink: {
      DEFAULT: "var(--ink)",
      2: "var(--ink-2)",
      3: "var(--ink-3)",
      4: "var(--ink-4)",
    },
    accent: {
      DEFAULT: "var(--accent-color)",
      2: "var(--accent-2)",
      tint: "var(--accent-tint)",
    },
    hl: {
      amber: "oklch(90% 0.10 85)",
      rose: "oklch(88% 0.08 20)",
      sage: "oklch(90% 0.07 145)",
      sky: "oklch(90% 0.06 230)",
      violet: "oklch(88% 0.07 305)",
      "amber-ink": "oklch(42% 0.10 75)",
      "rose-ink": "oklch(42% 0.12 20)",
      "sage-ink": "oklch(38% 0.08 145)",
      "sky-ink": "oklch(40% 0.09 230)",
      "violet-ink": "oklch(40% 0.10 305)",
    },
  },
  boxShadow: {
    "paper-1": "0 1px 2px rgba(50,30,10,0.04), 0 2px 6px rgba(50,30,10,0.05)",
    "paper-2": "0 2px 4px rgba(50,30,10,0.05), 0 8px 24px rgba(50,30,10,0.08)",
    "paper-3":
      "0 4px 12px rgba(50,30,10,0.08), 0 24px 60px rgba(50,30,10,0.12)",
  },
  borderRadius: {
    sm: "6px",
    DEFAULT: "10px",
    lg: "16px",
    xl: "22px",
    "2xl": "28px",
  },
};

module.exports = tokens;
