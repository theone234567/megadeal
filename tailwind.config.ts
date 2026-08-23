import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eafbf8",
          100: "#cdf5ed",
          200: "#9ceadc",
          300: "#63d8c6",
          400: "#33bfab",
          500: "#189e8d",
          600: "#127f73",
          700: "#12665f",
          800: "#13514c",
          900: "#134441",
        },
        ember: {
          50: "#fff3ed",
          100: "#ffe2d2",
          200: "#ffc0a3",
          300: "#ff9769",
          400: "#ff6b35",
          500: "#f8481a",
          600: "#e73310",
          700: "#c02510",
          800: "#992014",
          900: "#7c1d14",
        },
      },
      fontFamily: {
        display: ["ui-rounded", "Segoe UI", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.10)",
        "card-hover": "0 8px 16px rgba(16,24,40,0.12), 0 2px 4px rgba(16,24,40,0.08)",
      },
    },
  },
  plugins: [],
};
export default config;
