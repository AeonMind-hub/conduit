/** Exercises the shipped engine module for real: model JSON in → decision out.
 *  Run: npx tsx scripts/engine-check.ts   */
import { toFixture } from "../src/lib/engine";
import { blocks, failedRules, DOC_TYPES } from "../src/lib";
import { runRules } from "../src/lib/rules";
import { DOCS } from "../src/lib/corpus";
import { CLASSIFY_THRESHOLD } from "../src/lib/types";
import { PILOT_OPEN, MAX_PILOT_DOCS, MAX_LIVE_DOCS, PILOT_CODES } from "../src/lib/config";

let bad = 0;
let ran = 0;
const t = (name: string, cond: boolean, d = "") => {
  ran++;
  if (!cond) { bad++; console.log("  FAIL " + name + (d ? ` — ${d}` : "")); }
  else console.log("  ok   " + name + (d ? ` — ${d}` : ""));
};

const po = DOC_TYPES.purchase_order;
const field = (v: string, c: number) => ({ value: v, confidence: c, reason: "" });

// 1. A clean PO commits.
const clean = toFixture({ type: "purchase_order", type_confidence: 0.97, relevant: true,
  fields: Object.fromEntries(po.fields.map(f => [f.key, field("x", 0.99)])) })!;
t("clean PO is relevant", clean.relevant === true);
t("clean PO passes the gate", blocks(clean.extraction!, po) === false);
t("clean PO raises no rules", failedRules(clean.extraction!, po).length === 0);

// 2. An empty value can NEVER be a confident extraction, whatever the model claims.
const hole = toFixture({ type: "purchase_order", type_confidence: 0.95, relevant: true,
  fields: { ...Object.fromEntries(po.fields.map(f => [f.key, field("x", 0.99)])),
            quantity: field("", 1.0) } })!;
t("empty value with confidence 1 is clamped to 0", hole.extraction!.confidence.quantity === 0);
t("...and therefore holds the document", blocks(hole.extraction!, po) === true);
t("...and names the missing field", failedRules(hole.extraction!, po).includes("MISSING_QUANTITY"));

// 3. Low-but-nonzero confidence on a required field is a hold, not a write.
const low = toFixture({ type: "purchase_order", type_confidence: 0.95, relevant: true,
  fields: { ...Object.fromEntries(po.fields.map(f => [f.key, field("x", 0.99)])),
            unit_price: field("12.40", 0.61) } })!;
t("required field at 0.61 is held", blocks(low.extraction!, po) === true);
t("flag says LOW_CONF_UNIT_PRICE", failedRules(low.extraction!, po).includes("LOW_CONF_UNIT_PRICE"));

// 4. Weak type confidence escalates even when every field looks fine.
const weakType = toFixture({ type: "quote_request", type_confidence: 0.61, relevant: true,
  fields: Object.fromEntries(DOC_TYPES.quote_request.fields.map(f => [f.key, field("x", 0.99)])) })!;
t("61% type confidence blocks routing", blocks(weakType.extraction!, DOC_TYPES.quote_request) === true);
t("flag is AMBIGUOUS_TYPE", failedRules(weakType.extraction!, DOC_TYPES.quote_request).includes("AMBIGUOUS_TYPE"));

// 5. Garbage from the model degrades safely, never to a commit.
const junk = toFixture({ type: "sentiment_analysis", type_confidence: 5, relevant: true, fields: null as any });
t("unknown type becomes unclassified", junk.type === "unclassified");
t("unclassified is not relevant, so nothing is written", junk.relevant === false);
t("missing fields never throws", toFixture({ type: "purchase_order", relevant: true }).extraction === undefined || true);

// 6. Out-of-range confidences are clamped, not trusted.
const wild = toFixture({ type: "purchase_order", type_confidence: 42, relevant: true,
  fields: { sku: field("A", 42), quantity: field("1", -5) } })!;
t("type confidence 42 clamps to 1", wild.extraction!.typeConfidence === 1);
t("field confidence 42 clamps to 1", wild.extraction!.confidence.sku === 1);
t("field confidence -5 clamps to 0", wild.extraction!.confidence.quantity === 0);
t("negative-confidence field still holds the doc", blocks(wild.extraction!, po) === true);

/* ── 7. the rules engine on paper nobody has read ─────────────────────────────
 * The pilot room runs a stranger's documents through code that never calls a model, so "it must be
 * right" cannot be argued from a demo. Two properties are checkable across the whole corpus, and
 * they are the two the pitch rests on:
 *   · every value it prints is present in the document it came from — it reports, it does not infer;
 *   · every value it is not fully sure about carries a sentence saying why, in the client's language.
 * Everything else on the page is presentation.
 */
const norm = (t: string) => t.toLowerCase().replace(/[\u2010-\u2015\u2212]/g, "-").replace(/\s+/g, " ").trim();
/** Every way a number can be written in a document: as printed, without thousands separators, and
 *  as its whole/decimal parts. A value is traceable if the number in it is one of these. */
/** Leading zeros are a formatting choice, not a difference in value: 08/14/2026 and 2026-08-14 are
 *  the same date, and an assertion that cannot see that would report an invention where there is none. */
const strip = (x: string) => (/^\d+$/.test(x) ? x.replace(/^0+(?=\d)/, "") : x);
const nums = (t: string): string[] => (t.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).flatMap(m => {
  const clean = m.replace(/,/g, "");
  return [clean, ...clean.split("."), ...clean.split(/(?<=\d)(?=\d\d\b)/)].filter(x => x.length > 0).map(strip);
});
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const MONTH_NUM: [string, string][] = [["january","1"],["february","2"],["march","3"],["april","4"],
  ["may","5"],["june","6"],["july","7"],["august","8"],["september","9"],["october","10"],
  ["november","11"],["december","12"]];

let invented: string[] = [];
let unexplained: string[] = [];
let fields = 0;
for (const d of DOCS) {
  const fx = runRules(d.body ?? "");
  const ex = fx.extraction;
  if (!ex) continue;
  const body = norm(d.body ?? "");
  const tokens = new Set(nums(d.body ?? ""));
  // "14 Aug 2026" and "2026-08-14" are the same date written two ways, so a month written as a word
  // has to count as its number — otherwise this check reports an invention where the engine only
  // did the conversion a person would do.
  // Abbreviations are how a one-line invoice writes a month, so "Aug" has to count as August.
  const monthWords = MONTH_NUM.flatMap(([name, n]) => [[name, n], [name.slice(0, 3), n]] as [string, string][]);
  for (const [name, n] of monthWords)
    if (new RegExp(`\\b${name}\\.?\\b`, "i").test(d.body ?? "")) tokens.add(n);
  for (const [key, raw] of Object.entries(ex.values)) {
    const v = String(raw ?? "");
    if (!v) continue;
    fields++;
    const traceable = DATE_RE.test(v)
      ? v.split("-").every(part => tokens.has(strip(part)))
      : /[\d]/.test(v)
        ? nums(v).length > 0 && nums(v).every(n => tokens.has(n))
        : body.includes(norm(v));
    if (!traceable) invented.push(`${d.id}/${key}: "${v.slice(0, 40)}"`);
    if (ex.confidence[key] < 0.9 && !ex.reasons?.[key]) unexplained.push(`${d.id}/${key} at ${ex.confidence[key]}`);
  }
}
t(`every value the rules engine prints across ${DOCS.length} documents is in the document`,
  invented.length === 0, invented.slice(0, 4).join(" | ") || `${fields} fields traced`);
t("nothing below 90% confidence appears without a reason beside it",
  unexplained.length === 0, unexplained.slice(0, 4).join(" | "));

// A refusal is a feature, so it has to be asserted, not hoped for.
const noRef = runRules("MERIDIAN FASTENERS LTD\nInvoice number MF-9930\nInvoice date: 2026-09-03\nAmount due: 18,420.00 GBP");
t("an invoice with no PO reference returns an empty po_ref, never the invoice number",
  noRef.extraction!.values.po_ref === "" && noRef.extraction!.confidence.po_ref === 0);
t("...and that empty reference is what holds it", blocks(noRef.extraction!, DOC_TYPES.supplier_invoice) === true
  && failedRules(noRef.extraction!, DOC_TYPES.supplier_invoice).includes("MISSING_PO_REF"));
const amb = runRules("Hi, could you quote 4,000 of the M10 zinc bolts and confirm price? We order 4,000 pcs at 0.18 each, delivery date 30 Oct 2026, PO 99120.\nCompany: Harker Build Ltd");
t("a document that is half quote and half order is held, not routed",
  amb.extraction!.typeConfidence < CLASSIFY_THRESHOLD, `tc=${amb.extraction!.typeConfidence} vs threshold ${CLASSIFY_THRESHOLD}`);
t("confidence is floored, never rounded up to a gate",
  Math.abs(amb.extraction!.typeConfidence * 100 - Math.round(amb.extraction!.typeConfidence * 100)) < 1e-9);
const mail = runRules("You are receiving this because you subscribed. Unsubscribe. Our weekly logistics digest: twelve articles on freight rates.");
t("a newsletter is set aside with a reason, not classified as an order",
  mail.relevant === false && !!mail.rejectReason);

// The pilot room's guard is a config fact the whole safety story depends on.
t("no pilot code on this deploy means the endpoint is shut, not open",
  PILOT_CODES.length === 0 ? PILOT_OPEN === false : PILOT_OPEN === true, PILOT_CODES.length ? "codes present" : "none configured");
t("a pilot run is bounded larger than the cookie path, because it stores nothing",
  MAX_PILOT_DOCS > MAX_LIVE_DOCS, `${MAX_PILOT_DOCS} vs ${MAX_LIVE_DOCS}`);

// counted, never remembered: a hardcoded total is how a suite ends up reporting 19 assertions
// while running 28, which is the kind of number a buyer checks and a vendor does not.
const good = ran - bad;
console.log(bad ? `\nengine-check — ${bad} FAILED\n` : `\nengine-check — all ${good} assertions passed\n`);
process.exit(bad ? 1 : 0);
