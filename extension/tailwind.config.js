const tokens = require("../tokens/tailwind.tokens.js");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      ...tokens,
    },
  },
  plugins: [],
};
