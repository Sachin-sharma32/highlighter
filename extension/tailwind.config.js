const tokens = require("../tokens/tailwind.tokens.js");

// Tailwind ships spacing/lineHeight in `rem`. Inside our shadow DOM that's
// dangerous: `rem` resolves against the host page's <html> font-size, not
// against `:host`. Host sites with `html { font-size: 14px }` (or 12, or 18)
// would silently rescale every padding/gap/width. We pin everything to `px`
// so the UI looks identical on every site.
const pxSpacing = {
  px: "1px",
  0: "0px",
  0.5: "2px",
  1: "4px",
  1.5: "6px",
  2: "8px",
  2.5: "10px",
  3: "12px",
  3.5: "14px",
  4: "16px",
  5: "20px",
  6: "24px",
  7: "28px",
  8: "32px",
  9: "36px",
  10: "40px",
  11: "44px",
  12: "48px",
  14: "56px",
  16: "64px",
  20: "80px",
  24: "96px",
  28: "112px",
  32: "128px",
  36: "144px",
  40: "160px",
  44: "176px",
  48: "192px",
  52: "208px",
  56: "224px",
  60: "240px",
  64: "256px",
  72: "288px",
  80: "320px",
  96: "384px",
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx,html}"],
  theme: {
    spacing: pxSpacing,
    extend: {
      ...tokens,
      fontSize: {
        xs: ["0.75em", { lineHeight: "1.25em" }],
        sm: ["0.875em", { lineHeight: "1.25em" }],
        base: ["1em", { lineHeight: "1.5em" }],
        lg: ["1.125em", { lineHeight: "1.5em" }],
        xl: ["1.25em", { lineHeight: "1.5em" }],
        "2xl": ["1.5em", { lineHeight: "1.5em" }],
        "3xl": ["1.875em", { lineHeight: "1.5em" }],
      },
      lineHeight: {
        3: "12px",
        4: "16px",
        5: "20px",
        6: "24px",
        7: "28px",
        8: "32px",
        9: "36px",
        10: "40px",
      },
    },
  },
  plugins: [],
};
