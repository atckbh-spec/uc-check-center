import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextRequire = createRequire(require.resolve("eslint-config-next"));

const tsParser = nextRequire("@typescript-eslint/parser");

export default [
  {
    ignores: [".next/**", "_incoming_*/**", "node_modules/**", "out/**", "outputs/**", "uc_check_ready_*/**", "work/**"]
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: "latest",
        sourceType: "module"
      }
    },
    rules: {}
  }
];
