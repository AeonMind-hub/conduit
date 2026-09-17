import type { Doc, DocType, Extraction, Fixture } from "./types";
import { DOC_TYPES } from "./doctypes";
import { LIVE_ENABLED, MODEL } from "./config";

/**
 * The engine. One call per document: classify + extract in a single structured
 * response, then the thresholds in types.ts decide whether it may be written.
 *
 * Two modes, and the demo is honest about which one it is in:
 *   offline — every document comes from the hand-authored corpus in corpus.ts,
 *             with pre-written extractions. Zero cost, zero keys, works on a phone.
 *   live    — a real Gemini call per document. Set GEMINI_API_KEY and clear
 *             OFFLINE_DEMO. Used for anything a prospect pastes, because for that
 *             there is no fixture to fall back to.
 *
 * The rule that matters: a document is NEVER committed on a guess. If the model is
 * unreachable, unparseable or not configured, the result is a hold with the reason
 * recorded — same behaviour the product promises, applied to the product's own
 * failure modes.
 */

const TYPES = Object.keys(DOC_TYPES).filter(k => k !== "unclassified");

function prompt(doc: Doc): string {
  const schema = TYPES.map(t => {
    const d = DOC_TYPES[t];
    const fields = d.fields
      .map(f => `"${f.key}"${f.required ? "*" : ""}: {"value": string, "confidence": 0-1, "reason": string}`)
      .join(", ");
    return `  "${t}" — ${d.label}, routed to ${d.destination}. Fields: {${fields}}`;
  }).join("\n");

  return `You are the intake station of a document pipeline for ${CLIENT_HINT}.

Classify this document, then extract ONLY the fields its type needs.

Document types and their field schemas:
${schema}
  "unclassified" — no transactional content (newsletters, signatures, meetings, security notices).

Rules:
- Never invent a value. If it is not in the document, return an empty string with confidence 0.
- confidence is how sure you are of THAT FIELD, not of the document.
- "reason" is one short line explaining low confidence; empty string when confident.
- If there is no transactional content, use "unclassified" and set relevant=false.

Respond with JSON only, exactly this shape:
{"type": string, "type_confidence": 0-1, "relevant": boolean, "reject_reason": string,
 "fields": { <field key>: {"value": string, "confidence": 0-1, "reason": string} },
 "notes": string}

DOCUMENT
From: ${doc.from}
Subject: ${doc.subject}
Received: ${doc.receivedAt}
---
${doc.body}
---`;
}

const CLIENT_HINT = "a mid-size distributor with one operations inbox";

const clamp = (n: unknown, d = 0) => {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return d;
  return x < 0 ? 0 : x > 1 ? 1 : x;
};

interface RawOut {
  type?: string; type_confidence?: number; relevant?: boolean;
  reject_reason?: string; fields?: Record<string, { value?: string; confidence?: number; reason?: string }>;
  notes?: string;
}

/** Turn a model response into the same Fixture shape the corpus uses. */
export function toFixture(raw: RawOut): Fixture {
  const type: DocType = (TYPES.includes(raw.type ?? "") ? raw.type : "unclassified") as DocType;
  const relevant = raw.relevant !== false && type !== "unclassified";
  if (!relevant) {
    return { type: "unclassified", relevant: false,
      rejectReason: raw.reject_reason?.trim() || "No transactional content — not an order, invoice, booking or quote." };
  }
  const def = DOC_TYPES[type];
  const values: Record<string, string> = {};
  const confidence: Record<string, number> = {};
  const reasons: Record<string, string> = {};
  for (const f of def.fields) {
    const got = raw.fields?.[f.key];
    values[f.key] = (got?.value ?? "").toString();
    const c = clamp(got?.confidence);
    // Empty value can never be a confident extraction.
    confidence[f.key] = values[f.key] === "" ? 0 : c;
    const r = (got?.reason ?? "").toString().trim();
    if (r && c < 0.85) reasons[f.key] = r;
  }
  return {
    type, relevant: true,
    extraction: { values, confidence, reasons, notes: (raw.notes ?? "").toString(),
      typeConfidence: clamp(raw.type_confidence, 0) },
  };
}

/** Real model call. Throws on any failure so the caller can decide to hold. */
export async function runLive(doc: Doc): Promise<Fixture> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt(doc) }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0 },
      }),
      signal: AbortSignal.timeout(25_000),
    },
  );
  if (!res.ok) throw new Error(`model returned ${res.status}`);
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "")
    .join("") ?? "";
  if (!text.trim()) throw new Error("empty model response");
  try {
    return toFixture(JSON.parse(text) as RawOut);
  } catch {
    throw new Error("model response was not valid JSON");
  }
}

export const fixtureOnly = (doc: Doc) => {
  // Import kept lazy so this module has no cycle with corpus.ts.
  void doc;
  return null as Fixture | null;
};

/** Which engine a document will actually be run through, shown in the UI. */
export const mode = (): "live" | "offline" => (LIVE_ENABLED ? "live" : "offline");
export { TYPES as LIVE_TYPES };
