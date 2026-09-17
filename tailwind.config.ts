import type { Config } from "tailwindcss";

/**
 * Restrained palette. True-neutral greys (not blue-tinted slate), one accent,
 * and colour reserved for STATUS only — never for decoration or categories.
 */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg:      "#0b0b0c",
        surface: "#121214",
        raised:  "#17171a",
        hover:   "#1c1c20",
        line:    "#232327",
        line2:   "#2e2e34",
        txt:     { hi: "#ededf0", mid: "#9c9ca4", lo: "#6b6b74", dim: "#48484f" },
        acc:     { DEFAULT: "#3ecf8e", soft: "rgba(62,207,142,0.10)", line: "rgba(62,207,142,0.28)" },
        hold:    { DEFAULT: "#e5a94f", soft: "rgba(229,169,79,0.10)",  line: "rgba(229,169,79,0.28)" },
        ok:      "#5ec98f",
        ink:     { 700: "#2a2a30", 950: "#08080a" },
        stop:    { DEFAULT: "#e5695f", soft: "rgba(229,105,95,0.10)",  line: "rgba(229,105,95,0.28)" },
      },
      fontFamily: {
        sans: ['"Segoe UI Variable Text"','"Segoe UI"','-apple-system','BlinkMacSystemFont','Inter','system-ui','sans-serif'],
        mono: ['"Cascadia Mono"','"Cascadia Code"','ui-monospace','"SF Mono"','Menlo','Consolas','monospace'],
      },
      fontSize: {
        micro: ["11px", { lineHeight: "16px", letterSpacing: "0.02em" }],
        xs2:   ["12px", { lineHeight: "18px" }],
        sm2:   ["13px", { lineHeight: "20px" }],
        base2: ["14px", { lineHeight: "22px" }],
      },
      borderRadius: { xl2: "10px" },
    },
  },
  plugins: [],
} satisfies Config;
