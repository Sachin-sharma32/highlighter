const tokens = require("../tokens/tailwind.tokens.js");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx,html}"],
  theme: {
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
    },
  },
  plugins: [],
};
