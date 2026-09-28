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
          // 600/700 match the storefront purple (hp.purple), so the business
          // pages and the homepage use one brand colour, not two.
          600: "#6520B5",
          700: "#501590",
          800: "#530fa1",
          900: "#440e82",
        },
        // Storefront palette for the homepage and deal cards. Named hp-* so
        // it can't be picked up by the portal/admin pages by accident.
        hp: {
          page: "#FBFAFD",
          ink: "#211A35",
          muted: "#625C70",
          lavender: "#F5F0FC",
          line: "#E7E0EF",
          boundary: "#8D7AA8",
          purple: "#6520B5",
          "purple-dark": "#501590",
          // The one pink: a small Flash Deals cue, nothing else.
          flash: "#D62780",
          "clock-bg": "#FFF4DC",
          clock: "#855000",
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
        // Real brand faces, loaded by next/font in lib/fonts.ts and exposed
        // as CSS variables on <html> (see app/layout.tsx). The system stacks
        // stay on as fallbacks for the brief swap window. `display` used to
        // be the fallback stack alone, so headings rendered as SF Rounded on
        // macOS, Segoe UI on Windows and something else again on Android.
        sans: ["var(--font-jakarta)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-fredoka)", "ui-rounded", "Segoe UI", "system-ui", "sans-serif"],
        handwritten: ["var(--font-caveat)", "cursive"],
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
