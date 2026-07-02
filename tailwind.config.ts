import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        muted: "#667085",
        line: "#d8dee6",
        brand: {
          DEFAULT: "#2f6f73",
          dark: "#205155",
          soft: "#e7f2f1"
        },
        action: "#d95f3f",
        surface: "#f7f8f6"
      },
      boxShadow: {
        subtle: "0 10px 30px rgba(31, 41, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
