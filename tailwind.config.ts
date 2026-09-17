import type { Config } from "tailwindcss";

/**
 * Design tokens.
 *
 * The previous palette was correct in principle (neutral greys, colour only for status) and flat
 * in practice: every surface was the same weight, so nothing on the page was more important than
 * anything else, and numbers the size of body text do not read as a control room. Same restraint,
 * but with depth: a scale that puts the live counts at display size, elevation on surfaces, and
 * motion tokens for the parts that are genuinely moving.
 */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg:      "#08080a",
        surface: "#101013",
        raised:  "#16161a",
        hover:   "#1c1c21",
        line:    "#212127",
        line2:   "#2c2c34",
        txt:     { hi: "#f2f2f5", mid: "#a2a2ac", lo: "#6e6e79", dim: "#4a4a53" },
        acc:     { DEFAULT: "#3ecf8e", soft: "rgba(62,207,142,0.10)", line: "rgba(62,207,142,0.30)" },
        hold:    { DEFAULT: "#e8b25a", soft: "rgba(232,178,90,0.10)", line: "rgba(232,178,90,0.30)" },
        stop:    { DEFAULT: "#e5695f", soft: "rgba(229,105,95,0.10)", line: "rgba(229,105,95,0.30)" },
        ok:      "#5ec98f",
        cool:    { DEFAULT: "#5b8cff", soft: "rgba(91,140,255,0.10)", line: "rgba(91,140,255,0.28)" },
        ink:     { 700: "#2a2a30", 950: "#08080a" },
      },
      fontFamily: {
        sans: ['"Segoe UI Variable Text"', '"Segoe UI"', "-apple-system", "BlinkMacSystemFont",
               "Inter", "system-ui", "sans-serif"],
        mono: ['"Cascadia Mono"', '"Cascadia Code"', "ui-monospace", '"SF Mono"', "Menlo",
               "Consolas", "monospace"],
      },
      fontSize: {
        micro: ["11px", { lineHeight: "15px", letterSpacing: "0.03em" }],
        xs2:   ["12px", { lineHeight: "17px" }],
        sm2:   ["13px", { lineHeight: "20px" }],
        base2: ["14px", { lineHeight: "22px" }],
        lg2:   ["17px", { lineHeight: "24px", letterSpacing: "-0.01em" }],
        xl2:   ["22px", { lineHeight: "28px", letterSpacing: "-0.018em" }],
        num:   ["30px", { lineHeight: "32px", letterSpacing: "-0.03em" }],
        num2:  ["44px", { lineHeight: "44px", letterSpacing: "-0.035em" }],
      },
      borderRadius: { xl2: "12px", lg2: "8px" },
      boxShadow: {
        card:   "0 1px 0 rgba(255,255,255,0.035) inset, 0 14px 40px -24px rgba(0,0,0,0.85)",
        lift:   "0 1px 0 rgba(255,255,255,0.05) inset, 0 22px 60px -28px rgba(0,0,0,0.9)",
        glow:   "0 0 0 1px rgba(62,207,142,0.22), 0 10px 34px -16px rgba(62,207,142,0.28)",
        holdglow: "0 0 0 1px rgba(232,178,90,0.22), 0 10px 34px -16px rgba(232,178,90,0.22)",
      },
      keyframes: {
        travel: {
          "0%":   { left: "-6px", opacity: "0" },
          "18%":  { opacity: "1" },
          "82%":  { opacity: "1" },
          "100%": { left: "100%", opacity: "0" },
        },
        rise: {
          "0%":   { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "none" },
        },
        pulse: {
          "0%,100%": { opacity: "0.35", transform: "scale(1)" },
          "50%":     { opacity: "1", transform: "scale(1.35)" },
        },
        sheen: {
          "0%":   { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(320%)" },
        },
        flash: {
          "0%":   { backgroundColor: "rgba(62,207,142,0.16)" },
          "100%": { backgroundColor: "transparent" },
        },
      },
      animation: {
        travel: "travel 1.5s linear infinite",
        rise:   "rise 260ms cubic-bezier(.2,.7,.3,1) both",
        pulse:  "pulse 1.8s ease-in-out infinite",
        sheen:  "sheen 2.6s ease-in-out infinite",
        flash:  "flash 900ms ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
