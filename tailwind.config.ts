import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f7f2ff",
          100: "#eee0ff",
          200: "#dcc2ff",
          300: "#c194ff",
          400: "#a35cff",
          500: "#8b2cff",
          600: "#7a17f0",
          700: "#650fc7",
          800: "#530fa1",
          900: "#440e82",
        },
        ember: {
          50: "#fff0fa",
          100: "#ffdff4",
          200: "#ffb8e8",
          300: "#ff85d4",
          400: "#fb4fbe",
          500: "#e81ea3",
          600: "#c7128a",
          700: "#a10f70",
          800: "#800e5a",
          900: "#650c48",
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
