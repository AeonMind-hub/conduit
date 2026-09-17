/** Per-prospect tuning. One deploy per prospect = one set of env vars.
 *
 *  WHY THIS EXISTS: the sales motion is "here is Conduit running YOUR documents,
 *  at YOUR volume, against YOUR systems". Editing constants in source per prospect
 *  is slow and easy to forget, and an overstated ROI loses more deals than a modest
 *  one. So every number a prospect reads is an env var with a neutral default.
 *
 *  These are NEXT_PUBLIC_* because the values appear in text a client reads; they are
 *  not secrets. Never put an API key here.
 */

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : d;
};

/** The company whose inbox the demo is pretending to be. */
export const CLIENT_NAME   = process.env.NEXT_PUBLIC_CLIENT_NAME || "Northwind Supply Co";
export const CLIENT_SHORT  = CLIENT_NAME.split(" ")[0];
export const CLIENT_INDUSTRY = process.env.NEXT_PUBLIC_CLIENT_INDUSTRY || "distribution";

/** Their inbound volume, and what the person doing it by hand costs them. */
export const DAILY_VOLUME  = num(process.env.NEXT_PUBLIC_DAILY_VOLUME, 60);
export const HOURLY        = num(process.env.NEXT_PUBLIC_HOURLY_COST, 34);

/** Your price. Shown as arithmetic, never as an offer the reader has to accept. */
export const BUILD_FEE     = num(process.env.NEXT_PUBLIC_BUILD_FEE, 450);
export const MONTHLY_FEE   = num(process.env.NEXT_PUBLIC_MONTHLY_FEE, 120);

/** Canonical demo URL — the one that goes in the README, the repo About and every email. */
export const DEMO_URL      = process.env.NEXT_PUBLIC_DEMO_URL || "https://conduit-demo-version.vercel.app";

/** Corpus is synthetic. Say so on the page, not just in the README. */
export const CORPUS_LABEL  = process.env.NEXT_PUBLIC_CORPUS_LABEL
  || "synthetic demo corpus — not a client deployment";

export const LIVE_ENABLED  = !!process.env.GEMINI_API_KEY && process.env.OFFLINE_DEMO !== "1";
export const MODEL         = process.env.GEMINI_MODEL || "gemini-2.0-flash";

/** How many pasted documents a visitor can keep before the cookie gets too big. */
export const MAX_LIVE_DOCS = num(process.env.NEXT_PUBLIC_MAX_LIVE_DOCS, 4);

export const engineLabel = () => LIVE_ENABLED ? `live · ${MODEL}` : "fixture corpus · offline";
