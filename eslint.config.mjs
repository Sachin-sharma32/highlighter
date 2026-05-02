import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

const reactFiles = ["web/**/*.{ts,tsx}", "extension/**/*.{ts,tsx}"];

export default tseslint.config(
  { ignores: ["**/dist/**", "**/build/**", "convex/_generated/**"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: process.cwd(),
      },
    },
  },
  {
    files: ["web/**/*.{ts,tsx}", "extension/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["convex/**/*.{ts,tsx}", "e2e/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.node },
  },
  {
    files: reactFiles,
    extends: [reactHooks.configs.flat.recommended],
  },
  {
    files: reactFiles,
    plugins: { "react-refresh": reactRefresh },
    rules: {
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "react-hooks/set-state-in-effect": "warn",
    },
  },
);
