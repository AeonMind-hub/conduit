import type { Config } from "tailwindcss";

/**
 * Design tokens — the "Record" concept.
 *
 * The old theme was a dark admin panel: near-black surfaces, a neon mint accent, glow, blur, and
 * 14px type everywhere, which is what every automation dashboard on the internet looks like. This
 * one is set like a document of record instead, because that is the thing being sold: paperwork
 * that arrives clean enough to be booked without a second look.
 *
 * Warm paper, one ink colour for type, colour only where a status is real, hairline rules instead
 * of shadows, a serif for statements, and monospaced tabular figures for every number so columns
 * line up the way they do in a ledger. Colours live as CSS custom properties in globals.css and are
 * referenced here, so there is exactly one place to retune the whole surface.
 */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--paper)",
        surface: "var(--panel)",
        raised: "var(--inset)",
        hover: "var(--hover)",
        line: "var(--rule)",
        line2: "var(--rule2)",
        txt: {
          hi: "var(--ink)",
          mid: "var(--ink-2)",
          lo: "var(--ink-3)",
          dim: "var(--ink-4)",
        },
        acc: { DEFAULT: "var(--green)", soft: "var(--green-soft)", line: "var(--green-rule)" },
        hold: { DEFAULT: "var(--amber)", soft: "var(--amber-soft)", line: "var(--amber-rule)" },
        stop: { DEFAULT: "var(--red)", soft: "var(--red-soft)", line: "var(--red-rule)" },
        ok: "var(--green)",
        cool: { DEFAULT: "var(--blue)", soft: "var(--blue-soft)", line: "var(--blue-rule)" },
        ink: { 700: "var(--ink-2)", 950: "var(--ink)" },
      },
      fontFamily: {
        /* Set in layout.tsx with next/font/local — first-party woff2, no third-party CDN standing
           between a prospect's first click and the page being legible. */
        sans: ["var(--font-text)", "ui-sans-serif", "sans-serif"],
        serif: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        micro: ["10.5px", { lineHeight: "14px", letterSpacing: "0.13em" }],
        xs2: ["12px", { lineHeight: "17px" }],
        sm2: ["13.5px", { lineHeight: "20px" }],
        base2: ["15px", { lineHeight: "23px" }],
        lg2: ["18px", { lineHeight: "26px", letterSpacing: "-0.012em" }],
        xl2: ["26px", { lineHeight: "31px", letterSpacing: "-0.021em" }],
        /* Figures are the product. Mono + tabular so 66 lines up under 66. */
        num: ["30px", { lineHeight: "30px", letterSpacing: "-0.02em" }],
        num2: ["46px", { lineHeight: "44px", letterSpacing: "-0.028em" }],
        num3: ["68px", { lineHeight: "64px", letterSpacing: "-0.032em" }],
      },
      /* Paper is squared. Every pre-existing rounded-* utility in the app resolves through here,
         which is why the whole interface could lose its pill shapes in one line. */
      borderRadius: { DEFAULT: "2px", sm: "2px", md: "2px", lg: "2px", xl: "3px", "2xl": "3px", "3xl": "3px", xl2: "3px", lg2: "2px" },
      boxShadow: {
        /* Paper does not float. Elevation here is one hairline offset, used on the one element a
           visitor is meant to press. */
        card: "none",
        lift: "none",
        press: "2px 2px 0 var(--rule2)",
        glow: "0 0 0 1px var(--green-rule)",
        holdglow: "0 0 0 1px var(--amber-rule)",
      },
      keyframes: {
        travel: {
          "0%": { left: "-4px", opacity: "0" },
          "15%": { opacity: "1" },
          "85%": { opacity: "1" },
          "100%": { left: "100%", opacity: "0" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(5px)" },
          "100%": { opacity: "1", transform: "none" },
        },
        pulse: {
          "0%,100%": { opacity: "0.35", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.3)" },
        },
        feed: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        flash: {
          "0%": { backgroundColor: "var(--green-soft)" },
          "100%": { backgroundColor: "transparent" },
        },
      },
      animation: {
        travel: "travel 1.4s linear infinite",
        rise: "rise 240ms cubic-bezier(.2,.7,.3,1) both",
        pulse: "pulse 1.7s ease-in-out infinite",
        feed: "feed 1.5s linear infinite",
        flash: "flash 900ms ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
