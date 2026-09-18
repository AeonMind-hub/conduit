import type { DocType, Fixture } from "./types";
import { DOC_TYPES } from "./doctypes";

/**
 * The rules engine: real extraction, no model call, no invented values.
 *
 * Why this exists beside the Gemini path. A prospect's documents are their supplier invoices and
 * their customers' orders. Putting those through a free-tier key means Google may train on them
 * (that is the free tier's price since 2026), and a pilot that begins by feeding a client's
 * paperwork into a third party's training set is a pilot that ends after one email. So the default
 * engine here is deterministic: anchored patterns over the document's own text, each value carrying
 * the line it came from, run through the same gates the model output goes through.
 *
 * The rule that makes the whole thing trustworthy, and that every function below obeys: a value is
 * either present in the text or it is not. If the label the value would sit next to is missing, the
 * answer is "not found" — never the document's first plausible number, which is how automation
 * quietly writes a postcode into a quantity field or copies an invoice number into a PO reference.
 *
 * Confidence bands, kept coarse because finer numbers would be theatre:
 *   0.95–0.99  explicit label, one unambiguous match, format validated
 *   0.88–0.94  label present but the line is messy
 *   0.80–0.87  found on structure rather than label (a postcode, a plate, a reference shape)
 *   below 0.85 on a required field the gate holds the document — see `blocks` in types.ts
 */

/* ── text plumbing ───────────────────────────────────────────────── */

/** Collapse runs of spaces inside a line; newlines are kept, because most of what follows is
 *  line-anchored on purpose: a value on the label's own line is evidence, a value somewhere in the
 *  document is a coincidence. */
export const flat = (t: string) =>
  t.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{2,}/g, "\n").trim();

/** Newlines as double spaces, for the few patterns that legitimately span a wrapped line. */
export const asBlob = (t: string) => t.replace(/\n/g, "  ");

/** A captured value ends at its own sentence: "Coventry CV3 4LP. What volume discount applies?" is
 *  an address plus somebody's question, and the question is not part of the address. */
export const sentence = (v: string) =>
  v.replace(/[.,;:]+$/, "")
   .replace(/\.\s+(?=[A-Z?(])/, "\n")
   .split("\n")[0]
   .trim();

/** The text around a label, so a pattern can be matched near its own words. */
function around(text: string, label: string, forward = 90): string {
  const m = new RegExp(label, "i").exec(text);
  if (!m) return "";
  return text.slice(Math.max(0, m.index - 4), m.index + m[0].length + forward);
}

type Hit = { value: string; confidence: number; evidence: string; why?: string } | null;
type Pat = { re: RegExp; c: number; group?: number; why?: string };

/** First pattern that matches, in the order given — pattern priority, not position priority. */
function first(text: string, pats: Pat[]): Hit {
  for (const p of pats) {
    const m = p.re.exec(text);
    if (!m) continue;
    const raw = (m[p.group ?? 1] ?? "").trim();
    if (!raw) continue;
    return { value: raw, confidence: p.c, evidence: m[0].trim().replace(/\s{2,}/g, " ").slice(0, 90), why: p.why };
  }
  return null;
}

/** One capture group, and order matters: a comma grouping only counts when the groups are really
 *  there, otherwise `\d{1,3}` happily matches the first three digits of 1200 and the product ships a
 *  quantity of 120 against an order for 1200. Decimals are kept at whatever length they arrive,
 *  because a unit price of 0.175 truncated to 0.17 is a reconciliation error nobody notices for a month. */
const NUM = String.raw`((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)`;
const CUR = String.raw`(?:£|\$|€|USD|GBP|EUR)`;

/* ── dates ──────────────────────────────────────────────────────── */

const MONTHS = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const MO: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
const iso = (y: string, m: string, d: string) => {
  const yy = y.length === 2 ? `20${y}` : y;
  const p = (x: string) => String(x).padStart(2, "0");
  const mo = /^\d+$/.test(m) ? p(m) : (MO[m.slice(0, 3).toLowerCase()] ?? "");
  if (!mo) return "";
  return `${yy}-${mo}-${p(d)}`;
};

/**
 * Dates are where automation corrupts data quietly: 04/05 is April the fifth or May the fourth, and
 * a machine that never says which it assumed writes the wrong promise date for a year. So the ISO and
 * spelled-out forms are trusted, a bare slashed date is not — it comes back with the ambiguity named,
 * at a confidence under the gate, which holds the document instead of guessing.
 *
 * `used` stops a second date field being filled with the first date field's value: an invoice that
 * states no due date has no due date, and copying the issue date into it is a lie with a checkmark.
 */
export function findDate(text: string, labels = "", used: string[] = []): Hit {
  const hay = labels ? around(asBlob(text), `(?:(?:${labels}))[^\\n]{0,16}`) : asBlob(text);
  if (labels && !hay) return null;
  const hit = first(hay, [
    { re: /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/, c: 0.97 },
    { re: new RegExp(String.raw`\b(\d{1,2})\s+(${MONTHS})\.?,?\s+(\d{2,4})\b`, "i"), c: 0.95 },
    { re: new RegExp(String.raw`\b(${MONTHS})\.?\s+(\d{1,2}),?\s+(\d{4})\b`, "i"), c: 0.93 },
    { re: /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/, c: 0.86 },
  ]);
  if (!hit) return null;

  const p = hit.evidence;
  let value = "", c = hit.confidence, why = hit.why;

  let m = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(p);
  if (m) value = iso(m[1], m[2], m[3]);
  else if ((m = new RegExp(String.raw`\b(\d{1,2})\s+(${MONTHS})\.?,?\s+(\d{2,4})`, "i").exec(p)))
    value = iso(m[3], m[2], m[1]);
  else if ((m = new RegExp(String.raw`\b(${MONTHS})\.?\s+(\d{1,2}),?\s+(\d{4})`, "i").exec(p)))
    value = iso(m[3], m[1], m[2]);
  else if ((m = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(p))) {
    const a = Number(m[1]), b = Number(m[2]), y = m[3];
    // One of the two numbers can only be a day if it exceeds 12, and that is the whole of what the
    // document tells us. Anything else is a guess about someone else's locale, so it is held.
    if (a > 12 && b <= 12) { value = iso(y, String(b), String(a)); c = 0.95; }
    else if (b > 12 && a <= 12) { value = iso(y, String(a), String(b)); c = 0.95; }
    else if (a === b) { value = iso(y, String(a), String(b)); c = 0.93; }
    else {
      value = iso(y, String(b), String(a));
      c = 0.78;
      why = `could be ${pretty(iso(y, String(a), String(b)))} or ${pretty(value)} — written as numbers only, so the order is not knowable from this document. It is held rather than assumed, and one confirmation for this supplier settles the next 200`;
    }
  }
  // A date that does not exist is never a candidate value, whatever produced it.
  if (value && !/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(value)) return null;
  if (!value) return null;
  if (used.includes(value)) return null;
  return { value, confidence: c, evidence: p, why };
}

/** Reads an ISO date back as words, because a hold reason that says "2026-12-09" instead of
 *  "9 Dec 2026" makes a person check a calendar to find out what you meant. */
const pretty = (isoStr: string) => {
  const [y, m, d] = (isoStr || "").split("-").map(Number);
  if (!y || !m || !d) return isoStr;
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${MON[m - 1] ?? "?"} ${y}`;
};

/* ── money, numbers ──────────────────────────────────────────────── */

/** Label-and-currency together is what makes a money value trustworthy; the label group is
 *  non-capturing and complete, so no label can silently drop out of the alternation. */
/**
 * Which label is trusted, in this order. "Subtotal" contains "total", and an alternation that does
 * not care about word boundaries or specificity will happily read a subtotal as the amount due —
 * the exact class of error that gets a supplier paid the wrong figure and is only found at
 * reconciliation. Most specific first, each with a lookbehind so a shorter label cannot match inside
 * a longer word, and only if none of them is present do we fall back to a currency amount.
 */
const MONEY_LABELS = ["amount due", "total due", "balance due", "amount payable", "grand total",
  "invoice total", "net payable", "amount", "total"];
export function findMoney(text: string, labels = MONEY_LABELS.join("|")): Hit {
  const blob = asBlob(text);
  const wanted = labels.split("|").filter(l => l.trim());
  // specific → general, so "amount due" is always considered before a bare "total"
  const ordered = [...wanted].sort((a, b) => b.length - a.length);
  for (const lab of ordered) {
    const esc = lab.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const win = around(blob, String.raw`(?<![A-Za-z])(?:${esc})\s*[:=]?\s*-?\s*(?:${CUR})?`, 70);
    if (!win) continue;
    const m = new RegExp(String.raw`(?:${CUR}\s*${NUM}|${NUM}\s*${CUR}|${NUM}(?=\s*(?:GBP|USD|EUR)))`, "i").exec(win);
    if (!m) continue;
    const val = (m[1] ?? m[2] ?? "").replace(/,/g, "");
    if (!val || Number(val) === 0) continue;
    return { value: val, confidence: 0.96, evidence: win.slice(0, 90).trim() };
  }
  const cur = first(blob, [
    { re: new RegExp(String.raw`${CUR}\s*${NUM}`, "i"), c: 0.8,
      why: "no total label in this document — the first currency amount was used, which is why it is on the confirm list" },
  ]);
  if (cur) return { ...cur, value: cur.value.replace(/,/g, "") };
  const bare = first(blob, [{ re: new RegExp(String.raw`\b\d{1,3}(?:,\d{3})*\.\d{2}\b`, "i"), c: 0.6,
    why: "no label and no currency symbol; the largest-looking decimal was taken, so this one needs an eye" }]);
  return bare ? { ...bare, value: bare.value.replace(/,/g, "") } : null;
}

/**
 * `strong` labels are searched before `weak` ones, and weak only if strong found nothing. Both
 * directions (label-then-number and number-then-label) are tried per round.
 */
export function findNumber(text: string, strong: string, weak = ""): Hit {
  const blob = asBlob(text);
  const rounds: Pat[][] = [
    [
      { re: new RegExp(String.raw`\b(?:${strong})\s*[:=]?\s*-?\s*${NUM}`, "i"), c: 0.95 },
      { re: new RegExp(String.raw`\b${NUM}\s*(?:${strong})\b`, "i"), c: 0.92 },
    ],
    weak ? [
      { re: new RegExp(String.raw`\b(?:${weak})\s*[:=]?\s*-?\s*${NUM}`, "i"), c: 0.86,
        why: "no dedicated label for this field — the number was taken from a line carrying a looser unit word, which is where a unit and a quantity get confused" },
      { re: new RegExp(String.raw`\b${NUM}\s*(?:${weak})\b`, "i"), c: 0.8,
        why: "the unit word came after the number, so this is a shape reading rather than a labelled one" },
    ] : [],
  ];
  for (const pats of rounds) {
    const hit = first(blob, pats);
    if (hit) return { ...hit, value: hit.value.replace(/,/g, "") };
  }
  return null;
}

export function findUnitPrice(text: string): Hit {
  const blob = asBlob(text);
  // A line that carries both a quantity and a "unit" token is a price column, and the number after
  // "unit" on that same line is the unit price. Line-scoped, so an address like "Unit 7" upstream
  // cannot be read as a price — which is exactly what a document-wide pattern did.
  for (const line of flat(text).split("\n")) {
    if (!/\bqty\b|\bquantity\b/i.test(line) || !/\bunit\b/i.test(line)) continue;
    const m = /\bunit\s*(?:price|rate|cost)?\s*[:=]?\s*(?:£|\$|€)?\s*(\d+(?:\.\d{1,4})?)/i.exec(line);
    if (m && Number(m[1]) > 0) {
      const qty = /\bqty\s*[:=]?\s*([\d,]+)/i.exec(line)?.[1]?.replace(/,/g, "");
      return { value: m[1], confidence: 0.94, evidence: line.trim().slice(0, 90),
        why: qty ? `read from the line's Unit column beside Qty ${qty}` : undefined };
    }
  }
  const hit = first(blob, [
    { re: new RegExp(String.raw`unit\s*(?:price|rate|cost|value)\s*[:=]?\s*-?\s*(?:${CUR})?\s*${NUM}`, "i"), c: 0.96 },
    { re: new RegExp(String.raw`(?:each|per\s*unit)\s*[:=]?\s*-?\s*(?:${CUR})?\s*${NUM}`, "i"), c: 0.9 },
    { re: new RegExp(String.raw`${NUM}\s*(?:/|per\s*)?each\b`, "i"), c: 0.9 },
    { re: new RegExp(String.raw`${CUR}\s*${NUM}\s*(?:/|per)\s*(?:unit|ea|each|pc)`, "i"), c: 0.92 },
  ]);
  return hit ? { ...hit, value: hit.value.replace(/,/g, "") } : null;
}

/* ── references ──────────────────────────────────────────────────── */

/**
 * `allowShape:false` means "only a value the document actually labels". Used for a PO reference on
 * an invoice: an unlabelled code of the right shape is just as likely to be the invoice's own
 * number, and copying it into the PO field defeats the entire three-way match the field exists for.
 */
export function findRef(text: string, kind: "po" | "invoice" | "any",
  opts: { allowShape?: boolean; exclude?: string[]; /** default true — a reference with no digit in it is a phrase, not a reference */ needDigits?: boolean } = {}): Hit {
  const blob = asBlob(text);
  const REF = String.raw`([A-Z0-9][A-Z0-9][A-Z0-9\/.\-_]{2,22})`;
  const sets = kind === "po" ? [
      new RegExp(String.raw`(?:purchase\s+order|\bpo\b|order)\s*(?:no|number|ref|reference|#)?\s*[:#=\-]?\s*${REF}`, "i"),
      new RegExp(String.raw`against\s*(?:po|order)\s*[:#=\-]?\s*${REF}`, "i"),
    ] : kind === "invoice" ? [
      new RegExp(String.raw`invoice\s*(?:no|number|#|ref|reference)?\s*[:#=\-]?\s*${REF}`, "i"),
    ] : [
      new RegExp(String.raw`(?:quote|quotation|delivery|booking|job|consignment|goods)\s*(?:no|number|ref|reference|#)?\s*[:#=\-]?\s*${REF}`, "i"),
    ];

  for (const re of sets) {
    const m = re.exec(blob);
    if (!m) continue;
    const raw = m[1].replace(/[.\-_:]+$/, "");
    // Refs carry digits by nature; a captured word ("awaiting confirmation", "per below") is a
    // sentence, not a reference, and must never be written into a key column.
    const digitless = opts.needDigits !== false && !/\d/.test(raw);
    if (raw.length < 3 || digitless || (opts.exclude ?? []).includes(raw)) continue;
    const digits = /\d/.test(raw);
    return { value: raw, confidence: digits ? 0.96 : 0.82, evidence: m[0].trim().slice(0, 90),
      why: digits ? undefined : "no digits in this reference, so it matched on position rather than on a reference pattern" };
  }

  if (opts.allowShape === false) return null;
  // Variant suffixes are part of the code, not decoration: an SKU that stops at NW-5233 while the
  // document says NW-5233-BLK books the wrong line item and looks completely clean on screen.
  const shaped = /\b([A-Z]{2,4}[-/]\d{3,8}(?:[-_][A-Z0-9]{1,6})*)\b/.exec(blob);
  if (shaped && !(opts.exclude ?? []).includes(shaped[1]))
    return { value: shaped[1], confidence: 0.84, evidence: shaped[1],
      why: "matched on reference shape with no label — confirm this supplier's format once and it stops being a guess" };
  return null;
}

/* ── text-ish fields ─────────────────────────────────────────────── */

/** Labelled value, line-scoped. Never reaches past the end of its own line. */
export function findAfterLabel(text: string, labels: string, opts: { max?: number; min?: number; blob?: boolean } = {}): Hit {
  const max = opts.max ?? 90, min = opts.min ?? 2;
  const lines = flat(text).split("\n");
  const sameLine = new RegExp(String.raw`^(?:${labels})\s*[:\-]\s*(.+)$`, "i");
  for (const l of lines) {
    const m = sameLine.exec(l.trim());
    if (m && m[1].trim().length >= min)
      return { value: sentence(m[1]).slice(0, max), confidence: 0.95, evidence: l.slice(0, 90) };
  }
  // label alone on a line, value on the next: what a PDF looks like after it loses its layout
  for (let i = 0; i < lines.length - 1; i++) {
    if (new RegExp(String.raw`^(?:${labels})\s*:?\s*$`, "i").test(lines[i].trim())) {
      const v = lines[i + 1].trim();
      if (v.length >= min && v.length <= max + 20)
        return { value: sentence(v).slice(0, max), confidence: 0.9, evidence: `${lines[i].trim()} / ${v}`.slice(0, 90) };
    }
  }
  if (!opts.blob) return null;
  const m2 = new RegExp(String.raw`\b(?:${labels})\b\s*[:\-]?\s*([^\n]{${min},${max}})`, "i").exec(asBlob(text));
  return m2 ? { value: sentence(m2[1]).slice(0, max), confidence: 0.82,
    evidence: m2[0].trim().slice(0, 90), why: "label found mid-line; the words after it were taken verbatim" } : null;
}

const SUFFIX = String.raw`(?:Ltd|Limited|Inc|Incorporated|LLC|LLP|GmbH|PLC|Co|Corp|Corporation|Group|Holdings|Supplies|Suppliers|Trading|Industrial|Logistics|Distribution|Merchants|Services|Solutions|International|Fasteners|Fixings)`;

/**
 * `notOn` names the lines this party must not be taken from. A purchase order carries two company
 * names and usually labels only one, and reading the supplier's name as the customer's is the kind
 * of error that looks fine in a demo and then books the order against the wrong legal entity.
 */
export function findCompany(text: string, labels: string, notOn = ""): Hit {
  const direct = findAfterLabel(text, labels, { max: 60 });
  if (direct && !(notOn && new RegExp(notOn, "i").test(direct.evidence))) return direct;

  // Case-insensitive: letterheads are set in capitals, and a suffix list that only matches
  // "Supplies" leaves the customer's own name unreadable in half the documents that arrive.
  const re = new RegExp(String.raw`([A-Z][A-Za-z0-9&'.\- ]{2,44}?\s+${SUFFIX})\b\.?`, "i");
  for (const line of flat(text).split("\n")) {
    const m = re.exec(line);
    if (!m) continue;
    if (notOn && new RegExp(notOn, "i").test(line)) continue;
    // If the line is nothing but the name (a letterhead, a signature block), the whole line IS the
    // name; a suffix-anchored slice would cut off "SUPPLIES" and hand the ERP half a legal entity.
    const only = !/[\d:;]/.test(line) && line.trim().split(/\s+/).length <= 6;
    const value = only ? line.trim() : m[1].trim();
    return { value: value.slice(0, 60), confidence: only ? 0.9 : 0.86, evidence: line.trim().slice(0, 90),
      why: `no ${labels.split("|")[0].trim()} label in this document — taken from the letterhead line` };
  }
  return null;
}

export function findEmail(text: string): Hit {
  const m = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/.exec(text);
  return m ? { value: m[1], confidence: 0.97, evidence: m[1] } : null;
}

export function findAddress(text: string, labels = "ship to|ship-to|deliver to|delivery address|site|address"): Hit {
  const h = findAfterLabel(text, labels, { max: 110 });
  if (h) return h;
  const lines = flat(text).split("\n");
  const STREET = String.raw`(?:street|st|road|rd|lane|ln|way|avenue|ave|drive|dr|unit|suite|ste|floor|estate|park|industrial|works|yard|dock|warehouse|dc\d?)\b`;
  const uk = lines.find(l => /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/.test(l) && new RegExp(STREET, "i").test(l));
  if (uk) return { value: sentence(uk).slice(0, 110), confidence: 0.82, evidence: uk.slice(0, 90),
    why: "matched on a postcode plus street words, not on a label" };
  const us = lines.find(l => /\b\d{5}(?:-\d{4})\b/.test(l) && new RegExp(STREET, "i").test(l));
  if (us) return { value: sentence(us).slice(0, 110), confidence: 0.8, evidence: us.slice(0, 90),
    why: "matched on a ZIP plus street words, not on a label" };
  // No label and no street shape: an address field is left blank rather than filled with the first
  // five digits in the document. Blank holds the document; wrong writes a delivery to nowhere.
  return null;
}

export function findSku(text: string): Hit {
  const all = [...flat(text).matchAll(/\b([A-Z]{2,3}[-/.]\d{3,6}[A-Z0-9]?)\b/g)].map(m => m[1]);
  const uniq = [...new Set(all)];
  if (!uniq.length) return null;
  if (uniq.length === 1) return { value: uniq[0], confidence: 0.94, evidence: uniq[0] };
  return { value: uniq[0], confidence: 0.8, evidence: uniq.slice(0, 3).join(", "),
    why: `${uniq.length} product codes on one document; only the first was taken — one line per write is a build decision, not a guess` };
}

export function findTimeWindow(text: string): Hit {
  const blob = asBlob(text);
  const m = /\b(\d{1,2}[:.]\d{2})\s*(?:-|–|to|until|till)\s*(\d{1,2}[:.]\d{2})\b/.exec(blob);
  if (m) return { value: `${m[1].replace(/\./g, ":")}–${m[2].replace(/\./g, ":")}`, confidence: 0.96, evidence: m[0] };
  const m2 = /\b(?:window|slot|time)\s*[:\-]?\s*(\d{1,2}[:.]\d{2}[^\n]{0,14})/i.exec(blob);
  return m2 ? { value: m2[1].trim().slice(0, 24), confidence: 0.86, evidence: m2[0].trim().slice(0, 90),
    why: "no start and end time on one line — taken from whatever follows the word window/slot/time" } : null;
}

export function findTerms(text: string): Hit {
  const m = /^(?:payment\s*)?terms\s*[:\-]?\s*(.+)$/im.exec(flat(text));
  if (m) return { value: sentence(m[1]).slice(0, 40), confidence: 0.94, evidence: m[0].trim().slice(0, 90) };
  const n = /\b(payment|net)\s+(\d{1,3})\s*(?:days?|n\/t)/i.exec(asBlob(text));
  if (n) return { value: `${n[2]} days`, confidence: 0.9, evidence: n[0], why: "matched on a day count phrased as terms" };
  return null;
}

const CARRIERS = ["dhl", "xpo", "kuhne", "kuehne", "schenker", "dpd", "yodel", "evri", "royal mail", "ups", "fedex", "tnt", "maersk", "geodis", "bollore", "pantower", "midland haulage", "jackson logistics", "saddle", "celtic freight", "trailer services"];
export function findCarrier(text: string): Hit {
  const direct = findAfterLabel(text, "carrier|haulier|haulage|shipping line|freight partner|logistics partner", { max: 50 });
  if (direct) return direct;
  const lower = text.toLowerCase();
  const hit = CARRIERS.find(c => lower.includes(c));
  if (!hit) return null;
  const line = flat(text).split("\n").find(l => l.toLowerCase().includes(hit)) ?? hit;
  return { value: sentence(line).slice(0, 50), confidence: 0.82, evidence: line.trim().slice(0, 90),
    why: "matched on a known carrier name; the document did not label the carrier line" };
}

/* ── classification ──────────────────────────────────────────────── */

type Sig = { re: RegExp; w: number };
const SIGNALS: Record<string, Sig[]> = {
  purchase_order: [
    { re: /purchase order/i, w: 3.4 }, { re: /\bPO\s*(?:no|number|#|:|-)?\s*[A-Z0-9-]{3,}/i, w: 2.6 },
    { re: /\bqty\b|\bquantity\b/i, w: 1.1 }, { re: /unit\s*(?:price|rate|cost)/i, w: 1.3 },
    { re: /\border (?:confirmation|form|acknowledgement|placed)\b/i, w: 1.6 },
    { re: /deliver(?:y|ed) (?:on|by|date|to)/i, w: 0.9 },
    { re: /\bwe order\b|\bplease supply\b|\bsupply the following\b/i, w: 1.4 },
  ],
  supplier_invoice: [
    { re: /\binvoice\b/i, w: 2.4 }, { re: /\binvoice\s*(?:no|number|#|date)\b/i, w: 2.4 },
    { re: /amount (?:due|payable)|total due|balance due/i, w: 2.2 },
    { re: /\bvat\b|tax\s*:|\bsales tax\b/i, w: 1.4 }, { re: /\bsubtotal\b/i, w: 1.1 },
    { re: /\bdue date\b|\bdue within\b/i, w: 1.5 }, { re: /payment terms/i, w: 1.2 },
    { re: /\bbill to\b|\bremit to\b/i, w: 1.1 }, { re: /account number|sort code|\biban\b/i, w: 1.3 },
  ],
  delivery_booking: [
    { re: /\bbooking\b|delivery note|collection (?:note|advice)|\basn\b|goods (?:in|note)|gate pass|delivery appointment/i, w: 2.4 },
    { re: /\bpallets?\b|\bpallet space\b/i, w: 2.0 }, { re: /\bcarrier\b|\bhaulier\b|\bhaulage\b|\bfreight\b/i, w: 1.6 },
    { re: /\bdock\b|\bbay\s*\d|warehouse (?:slot|hours)/i, w: 1.8 },
    { re: /\b\d{1,2}[:.]\d{2}\s*(?:-|–|to)\s*\d{1,2}[:.]\d{2}\b/, w: 1.6 },
    { re: /\bvehicle\b|\breg(?:istration)?\b|\bdriver\b|\btracker\b/i, w: 1.2 },
  ],
  quote_request: [
    { re: /\bquote\b|\bquotation\b|\brfq\b|\bprice (?:request|list)?\b|\bcost (?:of|for|it)\b/i, w: 2.4 },
    { re: /could you (?:price|quote|send)|please quote|what would .*cost|send (?:us )?a price/i, w: 2.2 },
    { re: /\bvolume\b|\bper unit\b|rate card|best price/i, w: 1.5 },
    { re: /\?\s*(?:\n|$)/m, w: 0.7 }, { re: /\blead time\b|\bavailability\?/i, w: 0.9 },
  ],
};

const NOISE: Sig[] = [
  { re: /unsubscribe|newsletter|linkedin|weekly digest|webinar|conference registration/i, w: 3.2 },
  { re: /out of office|vacation (?:responder|reply)|automatic reply|no longer with (?:us|the)/i, w: 3.0 },
  { re: /password (?:expired|reset)|security (?:alert|notice|verification)|sign[- ]?in (?:attempt|code)|phishing|CVE-\d|multi-factor/i, w: 3.2 },
  { re: /meeting (?:invite|request|confirmation)|calendar invite|teams invite|zoom host|i'?ve accepted/i, w: 2.6 },
  { re: /satisfaction survey|customer survey|rate your experience/i, w: 1.6 },
];

const score = (t: string, sigs: Sig[]) => sigs.reduce((a, s) => a + (s.re.test(t) ? s.w : 0), 0);

export interface Classified {
  type: DocType;
  /** Below the classify threshold in types.ts the document is held, not forced into a type. */
  typeConfidence: number;
  relevant: boolean;
  rejectReason?: string;
  /** Which phrases carried the decision. "The model said so" is not an audit trail; this is. */
  evidence: string[];
  /** The score of each candidate, so the UI can show how close the call was. */
  scores: Record<string, number>;
}

export function classify(text: string): Classified {
  const t = asBlob(flat(text));
  const scored = Object.entries(SIGNALS).map(([type, sigs]) => {
    const hits = sigs.filter(s => s.re.test(t));
    return { type: type as DocType, s: hits.reduce((a, h) => a + h.w, 0), hits: hits.map(h => h.re.source.slice(0, 28)) };
  }).sort((a, b) => b.s - a.s);
  const noise = score(t, NOISE);
  const top = scored[0], second = scored[1];
  const scores = Object.fromEntries(scored.map(x => [x.type, Math.round(x.s * 10) / 10]));
  scores.noise = Math.round(noise * 10) / 10;

  if (!top || top.s < 1.2)
    return { type: "unclassified", typeConfidence: 0.5, relevant: false,
      rejectReason: noise > 0 ? "NO_TRANSACTIONAL_CONTENT" : "NOT_CLASSIFIED", evidence: [], scores };

  // A newsletter that says "invoice" is still a newsletter, so noise has to lose outright, not on
  // a margin — anything else and the classifier is just ranking keywords.
  if (noise >= top.s)
    return { type: "unclassified", typeConfidence: Math.min(0.9, 0.5 + noise / 20), relevant: false,
      rejectReason: "NO_TRANSACTIONAL_CONTENT", evidence: [], scores };

  // Two levers: how much evidence there is, and how far it beats the runner-up. A document that
  // reads as both a quote and an order is precisely the one a human should see.
  const strength = Math.min(1, top.s / 6);
  const margin = second && second.s > 0 ? (top.s - second.s) / top.s : 1;
  return { type: top.type, typeConfidence: Math.min(0.98, 0.5 + 0.34 * strength + 0.3 * margin),
    relevant: true, evidence: top.hits.slice(0, 3), scores };
}

/* ── the field rules, one entry per (type, field) in doctypes.ts ──── */

const RULES: Record<string, (t: string, ctx: Ctx) => Hit> = {
  "purchase_order.customer": t => findCompany(t, "customer|bill to|client|account|ship for", "supplier|vendor|from"),
  "purchase_order.po_number": t => findRef(t, "po"),
  "purchase_order.sku": findSku,
  "purchase_order.quantity": t => findNumber(t, "qty|quantity|pcs|pieces", "units?|each"),
  "purchase_order.unit_price": findUnitPrice,
  "purchase_order.required_by": t => findDate(t, "required by|delivery date|deliver by|date required|needed by"),
  "purchase_order.ship_to": t => findAddress(t, "ship to|ship-to|deliver to|delivery address"),
  "purchase_order.contact": t => findAfterLabel(t, "contact|attn|attention|buyer", { max: 60 }),

  "supplier_invoice.vendor": t => findCompany(t, "supplier|vendor|from|issued by", "customer|bill to|ship to|to:"),
  "supplier_invoice.invoice_no": t => findRef(t, "invoice"),
  // allowShape:false, and the invoice's own number excluded: an invoice that does not name a PO must
  // be HELD for that reason. That is the case this whole product is sold on.
  "supplier_invoice.po_ref": (t, c) => findRef(t, "po", { allowShape: false, exclude: [c.invoice_no ?? ""] }),
  "supplier_invoice.amount": t => findMoney(t, "amount due|total due|grand total|invoice total|amount payable|total|amount"),
  "supplier_invoice.invoice_date": t => findDate(t, "invoice date|date of issue|issued|date"),
  "supplier_invoice.due_date": (t, c) => findDate(t, "due date|due by|payment due|due within", [c.invoice_date ?? ""]),
  "supplier_invoice.terms": findTerms,
  "supplier_invoice.description": t => findAfterLabel(t, "description|re|regarding|narration", { max: 110 }),

  "delivery_booking.carrier": findCarrier,
  "delivery_booking.dock_date": t => findDate(t, "delivery date|dock date|goods in|appointment|collect on|date"),
  "delivery_booking.dock_time": findTimeWindow,
  "delivery_booking.pallets": t => findNumber(t, "pallets|pallet space", "pls"),
  "delivery_booking.site": t => findAddress(t, "site|warehouse|destination|dock|deliver to|delivery address"),
  "delivery_booking.ref": t => findRef(t, "any", { allowShape: false }),
  "delivery_booking.driver": t => findAfterLabel(t, "driver|driver name", { max: 40 }),
  "delivery_booking.vehicle": t => {
    const lab = findAfterLabel(t, "vehicle|reg|registration|plate|tracker", { max: 20 });
    if (lab) return lab;
    const m = /\b([A-Z]{2}\d{2}\s?[A-Z]{3}|[A-Z]{3}\s?\d{3}\s?[A-Z])\b/.exec(flat(t));
    return m ? { value: m[1], confidence: 0.7, evidence: m[0], why: "matched on a number-plate shape only" } : null;
  },

  "quote_request.company": t => findCompany(t, "company|customer|client|from", "supplier|vendor"),
  "quote_request.product": t => findAfterLabel(t, "product|item|material|goods|line", { max: 80 }) ?? findSku(t),
  "quote_request.volume": t => findNumber(t, "volume|qty|quantity|pcs|pieces", "units?|pallets"),
  "quote_request.delivery_to": t => findAddress(t, "deliver to|delivery address|ship to|site"),
  "quote_request.needed_by": t => findDate(t, "needed by|required by|delivery date|date required|by"),
  "quote_request.contact": t => findAfterLabel(t, "contact|attn|name", { max: 60 }),
  "quote_request.email": findEmail,
  "quote_request.notes": t => findAfterLabel(t, "notes|comments|remark", { max: 110 }),
};

type Ctx = Record<string, string>;

/** A field that has no rule yet is a real state of this file, so the lookup says so explicitly
 *  instead of letting the type system declare the branch dead. */
const ruleFor = (type: string, key: string): ((t: string, c: Ctx) => Hit) | undefined =>
  Object.prototype.hasOwnProperty.call(RULES, `${type}.${key}`) ? RULES[`${type}.${key}`] : undefined;

/** Run the engine over one document's text. Returns the same Fixture the model path returns, so the
 *  gates, the audit trail and the payload builder never need to know which engine answered. */
export function runRules(text: string): Fixture {
  const clean = flat(text ?? "");
  const cl = classify(clean);
  const empty = { values: {}, confidence: {}, reasons: {}, notes: cl.evidence.join(" · "), typeConfidence: cl.typeConfidence };
  if (!cl.relevant)
    return { type: "unclassified", relevant: false, rejectReason: cl.rejectReason ?? "NOT_CLASSIFIED", extraction: empty };

  const def = DOC_TYPES[cl.type];
  const values: Record<string, string> = {}, confidence: Record<string, number> = {}, reasons: Record<string, string> = {};
  const ctx: Ctx = {};
  const absent: string[] = [];

  for (const f of def.fields) {
    const rule = ruleFor(def.id, f.key);
    const hit = rule ? rule(clean, ctx) : null;
    if (!hit || !hit.value) {
      absent.push(f.label.toLowerCase());
      values[f.key] = ""; confidence[f.key] = 0;
      reasons[f.key] = rule
        ? "not present in the document under any pattern for this type"
        : "no rule defined for this field yet";
      continue;
    }
    values[f.key] = hit.value;
    ctx[f.key] = hit.value;
    // floored, never rounded: a field at 0.846 must not become 0.85 and cross THRESHOLD.
    confidence[f.key] = Math.floor(hit.confidence * 100) / 100;
    if (hit.why) reasons[f.key] = hit.why;
  }

  const notes = absent.length ? `absent: ${absent.slice(0, 3).join(", ")}` : "every field for this type was found in the document";
  // floored for the same reason: the ambiguous quote-vs-order document scores 0.796 and must stay
  // under CLASSIFY_THRESHOLD rather than being rounded into a write.
  return { type: cl.type, relevant: true,
    extraction: { values, confidence, reasons, notes, typeConfidence: Math.floor(cl.typeConfidence * 100) / 100 } };
}

/** The lines worth a human's thirty seconds, phrased as what to confirm rather than as an error. */
export function confirmableFields(fx: Fixture): { key: string; label: string; reason: string }[] {
  if (!fx.extraction) return [];
  const def = DOC_TYPES[fx.type];
  return Object.entries(fx.extraction.reasons ?? {})
    .filter(([, reason]) => !!reason)
    .map(([key, reason]) => ({ key, reason: reason!,
      label: def.fields.find(f => f.key === key)?.label ?? key }));
}
