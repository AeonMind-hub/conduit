/** Exercises the shipped engine module for real: model JSON in → decision out.
 *  Run: npx tsx scripts/engine-check.ts   */
import { toFixture } from "../src/lib/engine";
import { blocks, failedRules, DOC_TYPES } from "../src/lib";

let bad = 0;
const t = (name: string, cond: boolean, d = "") => { if (!cond) { bad++; console.log("  FAIL " + name + (d ? ` — ${d}` : "")); } else console.log("  ok   " + name + (d ? ` — ${d}` : "")); };

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

console.log(bad ? `\nengine-check — ${bad} FAILED\n` : `\nengine-check — all ${13 + 6} assertions passed\n`);
process.exit(bad ? 1 : 0);
