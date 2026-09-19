/** Per-prospect tuning. One deploy per prospect = one set of env vars.
 *
 *  WHY THIS EXISTS: the sales motion is "here is Conduit running YOUR documents, against YOUR systems".
 *  Editing constants in source per prospect is slow and easy to forget, so everything a visitor reads
 *  that could differ between two prospects is an env var with a neutral default. Pricing is deliberately
 *  NOT one of them: no price is rendered anywhere in the product, so there is no fee constant to keep in
 *  sync with a proposal. The ladder lives in README.md, where a person reads it, not in a page.
 *
 *  These are NEXT_PUBLIC_* because the values appear in text a client reads; they are not secrets.
 *  Never put an API key here.
 */

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : d;
};

/** The company whose inbox the sample documents are shaped like. */
export const CLIENT_NAME  = process.env.NEXT_PUBLIC_CLIENT_NAME || "Northwind Supply Co";
export const CLIENT_SHORT = CLIENT_NAME.split(" ")[0];

/** Canonical demo URL — the one that goes in the README, the repo About field and every email. */
export const DEMO_URL = process.env.NEXT_PUBLIC_DEMO_URL || "https://conduit-demo-version.vercel.app";

/** The line under the nameplate, and the social-card description's first words. */
export const TAGLINE = process.env.NEXT_PUBLIC_TAGLINE || "Inbound document automation";

/** The mailbox their documents arrive in. In production this is a forwarding rule, not a form. */
/* `.example` is reserved by RFC 6761, so the address in the footer cannot ever become a real mailbox
   that starts receiving someone's paperwork. A demo that prints a plausible domain is a demo that one day
   mails a stranger's invoices. */
export const INTAKE_ADDRESS = process.env.NEXT_PUBLIC_INTAKE_ADDRESS
  || `ops@${CLIENT_SHORT.toLowerCase().replace(/[^a-z0-9]/g, "")}.example`;

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

/** The model adapter in `src/lib/engine.ts`, kept for a private pilot build. Nothing on the public page
 *  reaches it: the machine behind the paste box runs rules only, so it cannot be billed and cannot send
 *  a stranger's invoice into a training corpus. */
export const LIVE_ENABLED = !!process.env.GEMINI_API_KEY && process.env.OFFLINE_DEMO !== "1";
export const MODEL        = process.env.GEMINI_MODEL || "gemini-2.0-flash";

/** How many pasted documents a stateful path keeps before its payload gets too big. The open endpoint
 *  keeps nothing, so it passes its own batch size to `pushLive` instead of relying on this default. */
export const MAX_LIVE_DOCS = num(process.env.NEXT_PUBLIC_MAX_LIVE_DOCS, 4);

/* ── the machine behind the paste box ─────────────────────────────────────────
 * Open to anyone with the link: no code, no sign-up, nothing stored. What makes that safe is not a
 * gate, it is bounds — this path calls no model at all (deterministic rules only), reads at most
 * PILOT_CHARS_PER_DOC characters of at most MAX_PILOT_DOCS documents of at most MAX_PILOT_BYTES
 * bytes each, and keeps nothing after responding. One prospect can send their whole team the link and
 * the worst case is a few megabytes of parsing.
 */
export const MAX_PILOT_DOCS      = num(process.env.PILOT_MAX_DOCS, 12);
export const MAX_PILOT_BYTES     = num(process.env.PILOT_MAX_BYTES, 1_500_000);
export const PILOT_CHARS_PER_DOC = num(process.env.PILOT_MAX_CHARS, 12_000);
