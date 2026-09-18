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

/** Your price. NOT rendered anywhere in the product — see README "Proposing it".
 *  A number inside the app reads as a listing; a number in a proposal reads as a quote. */
export const BUILD_FEE     = num(process.env.NEXT_PUBLIC_BUILD_FEE, 450);
export const MONTHLY_FEE   = num(process.env.NEXT_PUBLIC_MONTHLY_FEE, 120);

/** Canonical demo URL — the one that goes in the README, the repo About and every email. */
export const DEMO_URL      = process.env.NEXT_PUBLIC_DEMO_URL || "https://conduit-demo-version.vercel.app";

/** What the sample data is called, in the one place it needs saying — in the rail, small.
 *  "Sample data" is what every enterprise product writes; "not a client deployment" is what an
 *  anxious one writes. Same disclosure, and only one of them looks like a product.
 */
export const CORPUS_LABEL  = process.env.NEXT_PUBLIC_CORPUS_LABEL || "Sample corpus · 75 documents";

/** The mailbox their documents arrive in. In production this is a forwarding rule, not a form. */
export const INTAKE_ADDRESS = process.env.NEXT_PUBLIC_INTAKE_ADDRESS
  || `ops@${CLIENT_SHORT.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;

/** Where committed records land. Per-prospect: NEXT_PUBLIC_SYSTEMS="ERP=NetSuite,AP=Xero". */
const SYSTEM_FALLBACK: Record<string, string> = {
  ERP: "NetSuite", AP: "Xero", WMS: "SAP Business One", CRM: "HubSpot",
};
export const SYSTEMS: Record<string, string> = (() => {
  const out: Record<string, string> = { ...SYSTEM_FALLBACK };
  for (const part of (process.env.NEXT_PUBLIC_SYSTEMS ?? "").split(",")) {
    const [k, v] = part.split("=");
    if (k && v) out[k.trim().toUpperCase()] = v.trim();
  }
  return out;
})();
export const systemName = (code: string) => SYSTEMS[code] ?? code;

/** The environment label a buyer sees on the integrations screen. */
export const ENV_LABEL  = process.env.NEXT_PUBLIC_ENV_LABEL || "Sandbox";
export const TAGLINE    = process.env.NEXT_PUBLIC_TAGLINE  || "Inbound document automation";

export const LIVE_ENABLED  = !!process.env.GEMINI_API_KEY && process.env.OFFLINE_DEMO !== "1";
export const MODEL         = process.env.GEMINI_MODEL || "gemini-2.0-flash";

/** How many pasted documents a visitor can keep before the cookie gets too big. */
export const MAX_LIVE_DOCS = num(process.env.NEXT_PUBLIC_MAX_LIVE_DOCS, 4);

/* ── the pilot room: a client's own documents, run in front of them ─────────────
 * OFF by default. Without a code in PILOT_CODES the endpoint refuses everything, because an
 * unauthenticated public "upload your invoices" route is a bill you did not agree to and a data
 * request you did not answer. One code per prospect is what makes it safe to send the link.
 */
const list = (v: string | undefined) => (v ?? "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
export const PILOT_CODES  = list(process.env.PILOT_CODES);
export const PILOT_OPEN   = PILOT_CODES.length > 0;
export const MAX_PILOT_DOCS  = num(process.env.PILOT_MAX_DOCS, 12);
export const MAX_PILOT_BYTES = num(process.env.PILOT_MAX_BYTES, 1_500_000);
export const PILOT_CHARS_PER_DOC = num(process.env.PILOT_MAX_CHARS, 12_000);
/** A pilot on a free-tier key means Google may train on the client's paperwork. That is the client's
 *  call to make, never ours to make silently — so the site says which tier ran it. */
export const PILOT_MODEL_BILLED = process.env.PILOT_MODEL_BILLED === "1";

export const engineLabel = () => LIVE_ENABLED ? `live · ${MODEL}` : "fixture corpus · offline";
