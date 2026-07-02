import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "dist/**",
      "next-env.d.ts",
      "tsconfig.tsbuildinfo"
    ]
  },
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        module: "readonly",
        require: "readonly",
        URL: "readonly",
        fetch: "readonly"
      }
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_"
        }
      ]
    }
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        console: "readonly",
        process: "readonly",
        module: "readonly",
        require: "readonly",
        URL: "readonly",
        FormData: "readonly",
        crypto: "readonly",
        Buffer: "readonly",
        React: "readonly"
      }
    },
    rules: {
      "no-unused-vars": "off"
    }
  }
];
