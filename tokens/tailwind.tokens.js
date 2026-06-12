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
    "paper-1": "var(--shadow-1)",
    "paper-2": "var(--shadow-2)",
    "paper-3": "var(--shadow-3)",
  },
  borderRadius: {
    sm: "6px",
    DEFAULT: "10px",
    lg: "16px",
    xl: "22px",
    "2xl": "28px",
  },
  transitionTimingFunction: {
    // Soft deceleration for entrances and hovers
    out: "cubic-bezier(0.22, 1, 0.36, 1)",
    // Slight overshoot for playful pops (swatches, toggles)
    spring: "cubic-bezier(0.34, 1.4, 0.64, 1)",
  },
  keyframes: {
    "fade-up": {
      from: { opacity: "0", transform: "translateY(6px)" },
      to: { opacity: "1", transform: "translateY(0)" },
    },
    "fade-in": {
      from: { opacity: "0" },
      to: { opacity: "1" },
    },
    "scale-in": {
      from: { opacity: "0", transform: "scale(0.97)" },
      to: { opacity: "1", transform: "scale(1)" },
    },
    shimmer: {
      from: { backgroundPosition: "200% 0" },
      to: { backgroundPosition: "-200% 0" },
    },
    "draw-line": {
      from: { backgroundSize: "0% 100%" },
      to: { backgroundSize: "100% 100%" },
    },
  },
  animation: {
    "fade-up": "fade-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
    "fade-in": "fade-in 0.25s ease both",
    "scale-in": "scale-in 0.18s cubic-bezier(0.22, 1, 0.36, 1) both",
    shimmer: "shimmer 1.8s linear infinite",
  },
};

module.exports = tokens;
