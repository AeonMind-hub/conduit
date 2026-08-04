import type { Store, ProcessedDoc, CommittedRecord } from "./types";
import { emptyStore, blocks, failedRules } from "./types";
import { DOCS, FIXTURES } from "./corpus";
import { DOC_TYPES } from "./doctypes";
import { buildActions } from "./actions";

/**
 * Per-visitor state carried in a cookie.
 *
 * WHY NOT A FILE: Vercel routes each request to a potentially different
 * lambda, so an in-memory cache or /tmp file is not shared between requests.
 * You commit 66 records, navigate to Records, and the page is empty.
 *
 * The full store (75 documents with bodies) is far too big for a 4KB cookie,
 * but everything in it is DETERMINISTIC — derived from the static corpus.
 * So we persist only the irreducible facts:
 *
 *   d  = doc ids that have been processed
 *   a  = doc ids manually approved out of the held queue
 *   x  = doc ids manually discarded
 *   c  = [docId, fieldKey] pairs a human corrected
 *
 * …then rebuild the whole store from the corpus on read. A few hundred bytes
 * instead of ~200KB, and two people demoing at once never collide.
 */

export const COOKIE_NAME = "conduit_s";

export interface Wire {
  d: number[];
  a: number[];
  x: number[];
  c: [number, string][];
}

export const EMPTY_WIRE: Wire = { d: [], a: [], x: [], c: [] };

export function encodeWire(w: Wire): string {
  return Buffer.from(JSON.stringify(w)).toString("base64url");
}

export function decodeWire(raw: string | undefined | null): Wire {
  if (!raw) return { ...EMPTY_WIRE };
  try {
    const w = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Wire;
    return { d: w.d ?? [], a: w.a ?? [], x: w.x ?? [], c: w.c ?? [] };
  } catch { return { ...EMPTY_WIRE }; }
}

const PREFIX: Record<string, string> = {
  purchase_order: "SO", supplier_invoice: "AP",
  delivery_booking: "DK", quote_request: "OPP",
};

/** Deterministically rebuild the full store from the compact wire form. */
export function rebuild(w: Wire): Store {
  const s = emptyStore();
  const approved = new Set(w.a);
  const discarded = new Set(w.x);
  const corrections = new Map<number, string[]>();
  for (const [id, key] of w.c) {
    corrections.set(id, [...(corrections.get(id) ?? []), key]);
  }

  for (const docId of w.d) {
    const doc = DOCS.find(d => d.id === docId);
    const fx = FIXTURES[docId];
    if (!doc || !fx) continue;

    // Latency is cosmetic; derive it so it is stable across renders.
    const latency = 180 + ((docId * 37) % 420);
    s.stats.total += 1;
    s.stats.latencyTotal += latency;
    s.stats.byType[fx.type] = (s.stats.byType[fx.type] ?? 0) + 1;

    if (!fx.relevant || !fx.extraction) {
      s.processed[docId] = {
        doc, status: "discarded", stage: "classify", type: "unclassified",
        typeConfidence: 0, rejectReason: fx.rejectReason, latencyMs: latency,
        finishedAt: "", correctedFields: [], flags: ["NO_CONTENT"],
      };
      s.stats.discarded += 1;
      continue;
    }

    const def = DOC_TYPES[fx.type];
    const ex = fx.extraction;
    const held = blocks(ex, def);
    const flags = failedRules(ex, def);
    const fixed = corrections.get(docId) ?? [];

    const commit = (auto: boolean) => {
      const cells: Record<string, string> = {};
      for (const f of def.fields) cells[f.key] = ex.values[f.key] ?? "";
      const ref = `${PREFIX[fx.type]}-${24100 + s.records.length + 1}`;
      const rec: CommittedRecord = {
        id: `${docId}`, ref, type: fx.type, destination: def.destinationCode,
        cells, confidence: { ...ex.confidence }, committedAt: "",
        sourceDocId: docId, auto, correctedFields: fixed,
        actions: buildActions(fx.type, ref, cells, def.destination),
      };
      s.records.push(rec);
      s.processed[docId] = {
        doc, status: "committed", stage: "commit", type: fx.type,
        typeConfidence: ex.typeConfidence, extraction: ex, latencyMs: latency,
        finishedAt: "", correctedFields: fixed, flags: auto ? [] : flags,
      };
      s.stats.committed += 1;
      if (auto) {
        s.stats.autoCommitted += 1;
        s.stats.fieldsAuto += def.fields.length;
      } else {
        s.stats.fieldsCorrected += fixed.length;
        s.stats.fieldsAuto += Math.max(0, def.fields.length - fixed.length);
      }
    };

    if (!held) { commit(true); continue; }
    if (discarded.has(docId)) {
      s.processed[docId] = {
        doc, status: "discarded", stage: "classify", type: fx.type,
        typeConfidence: ex.typeConfidence, extraction: ex, latencyMs: latency,
        finishedAt: "", correctedFields: fixed, flags,
      };
      s.stats.discarded += 1;
      continue;
    }
    if (approved.has(docId)) { commit(false); continue; }

    s.processed[docId] = {
      doc, status: "exception", stage: "validate", type: fx.type,
      typeConfidence: ex.typeConfidence, extraction: ex, latencyMs: latency,
      finishedAt: "", correctedFields: [], flags,
    };
    s.stats.exceptions += 1;
  }

  return s;
}
