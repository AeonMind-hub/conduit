import type { Doc, Fixture, Store, ProcessedDoc, CommittedRecord, DocType } from "./types";
import { emptyStore, blocks, failedRules } from "./types";
import { DOCS, FIXTURES } from "./corpus";
import { DOC_TYPES } from "./doctypes";
import { buildActions } from "./actions";
import { MAX_LIVE_DOCS } from "./config";

/**
 * Per-visitor state carried in a cookie.
 *
 * WHY NOT A FILE: Vercel routes each request to a potentially different lambda, so an
 * in-memory cache or /tmp file is not shared between requests. You commit 66 records,
 * navigate to Records, and the page is empty.
 *
 * The full store (75 documents with bodies) is far too big for a 4KB cookie, but
 * everything derived from the corpus is DETERMINISTIC. So we persist only the
 * irreducible facts:
 *
 *   d = doc ids that have been processed
 *   a = doc ids manually approved out of the held queue
 *   x = doc ids manually discarded
 *   c = [docId, fieldKey] pairs a human corrected
 *   l = documents a visitor pasted in, with their extraction (few hundred bytes each)
 *
 * …then rebuild the whole store on read, and two people demoing at once never collide.
 *
 * COLD VISITS: `wireOrSeed` gives a visitor with no cookie a COMPLETED run of the corpus.
 * Before this, every prospect's first second showed zeros and dashes on every page, and the
 * Analytics tab read "$0 a year" — the one number that was supposed to sell them. A demo that
 * looks empty is an empty impression; the run can always be replayed from the button.
 */

export const COOKIE_NAME = "conduit_s";
export const LIVE_ID_BASE = 1000;

export interface LiveDoc {
  id: number;
  from: string;
  subject: string;
  receivedAt: string;
  type: DocType;
  relevant: boolean;
  reject?: string;
  v: Record<string, string>;
  cf: Record<string, number>;
  tc: number;
  ms: number;
  /** live = model answered · fixture = corpus row · none = engine failed, so it is held. */
  eng: "live" | "fixture" | "none";
  err?: string;
}

export interface Wire {
  d: number[];
  a: number[];
  x: number[];
  /** [docId, fieldKey, valueTheHumanEntered] — values, so a fix survives a reload. */
  c: [number, string, string][];
  l?: LiveDoc[];
}

export const EMPTY_WIRE: Wire = { d: [], a: [], x: [], c: [], l: [] };

export function encodeWire(w: Wire): string {
  return Buffer.from(JSON.stringify(w)).toString("base64url");
}

export function wireBytes(w: Wire): number {
  return encodeWire(w).length;
}

export function decodeWire(raw: string | undefined | null): Wire {
  if (!raw) return { ...EMPTY_WIRE, l: [] };
  try {
    const w = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Wire;
    return {
      d: w.d ?? [], a: w.a ?? [], x: w.x ?? [], l: w.l ?? [],
      // tolerate a 2-tuple from an older visitor cookie rather than dropping their corrections
      c: (w.c ?? []).map(r => [r[0], r[1], r[2] ?? ""] as [number, string, string]),
    };
  } catch { return { ...EMPTY_WIRE, l: [] }; }
}

/** Read the visitor's state; a first-time visitor gets a finished demo run. */
export function wireOrSeed(raw: string | undefined | null): Wire {
  if (raw) return decodeWire(raw);
  return { ...EMPTY_WIRE, d: DOCS.map(d => d.id) };
}

const PREFIX: Record<string, string> = {
  purchase_order: "SO", supplier_invoice: "AP",
  delivery_booking: "DK", quote_request: "OPP",
};

interface Item { doc: Doc; fx: Fixture; latency: number; eng: LiveDoc["eng"]; err?: string }

function items(w: Wire): Item[] {
  const out: Item[] = [];
  for (const docId of w.d) {
    const doc = DOCS.find(d => d.id === docId);
    const fx = FIXTURES[docId];
    if (doc && fx) out.push({ doc, fx, latency: 180 + ((docId * 37) % 420), eng: "fixture" });
  }
  for (const L of w.l ?? []) {
    const doc: Doc = {
      id: L.id, from: L.from, subject: L.subject, receivedAt: L.receivedAt,
      body: "(pasted for the demo — run through the live engine)", type: L.type,
    };
    const fx: Fixture = (!L.relevant || L.type === "unclassified")
      ? { type: "unclassified", relevant: false, rejectReason: L.reject ?? "No transactional content." }
      : { type: L.type, relevant: true, extraction: {
            values: L.v, confidence: L.cf, typeConfidence: L.tc, notes: L.err ?? "" } };
    out.push({ doc, fx, latency: L.ms, eng: L.eng, err: L.err });
  }
  return out;
}

/** Deterministically rebuild the full store from the compact wire form. */
/**
 * Replay the wire into a Store.
 *
 * `seeded` has to be passed in by the caller. It means "this visitor had no cookie, so the
 * corpus was handed to them", and the wire cannot say that about itself: wireOrSeed() injects
 * the 75 documents, so any predicate derived from w.d is true for exactly the visitors we mean
 * to flag. Getting this wrong silently kills the banner that tells a prospect the run they are
 * looking at is the demo corpus.
 */
export function rebuild(w: Wire, opts: { seeded?: boolean } = {}): Store {
  const s = emptyStore();
  const approved = new Set(w.a);
  const discarded = new Set(w.x);
  const corrections = new Map<number, Record<string, string>>();
  for (const [id, key, val] of w.c) corrections.set(id, { ...(corrections.get(id) ?? {}), [key]: val });

  for (const { doc, fx, latency, eng, err } of items(w)) {
    const docId = doc.id;
    s.stats.total += 1;
    s.stats.latencyTotal += latency;
    s.stats.byType[fx.type] = (s.stats.byType[fx.type] ?? 0) + 1;
    if (eng !== "fixture") s.stats.liveDocs += 1;
    if (eng === "live") s.stats.liveCalls += 1;

    // The engine itself failed or is not configured. We do not know what the document is,
    // so we do not claim to know it was noise. Hold it, say why, move on.
    if (eng === "none") {
      s.processed[docId] = {
        doc, status: "exception", stage: "validate", type: "unclassified",
        typeConfidence: 0, latencyMs: latency, finishedAt: "", correctedFields: [],
        flags: ["ENGINE_UNAVAILABLE"], engine: "none",
        note: err ?? fx.rejectReason ?? "no model configured on this deploy",
      } as ProcessedDoc;
      s.stats.exceptions += 1;
      continue;
    }

    if (!fx.relevant || !fx.extraction) {
      s.processed[docId] = {
        doc, status: "discarded", stage: "classify", type: "unclassified",
        typeConfidence: 0, rejectReason: fx.rejectReason, latencyMs: latency,
        finishedAt: "", correctedFields: [], flags: ["NO_CONTENT"], engine: eng,
      } as ProcessedDoc;
      s.stats.discarded += 1;
      continue;
    }

    // The human's values are applied before the gate runs, and a field a person confirmed is
    // treated as certain — that is what clicking Approve means.
    const fixMap = corrections.get(docId) ?? {};
    const fixedKeys = Object.keys(fixMap);
    let fxc: Fixture = fx;
    if (fxc.extraction && fixedKeys.length) {
      fxc = { ...fxc, extraction: {
        ...fxc.extraction,
        values: { ...fxc.extraction.values, ...fixMap },
        confidence: { ...fxc.extraction.confidence,
                      ...Object.fromEntries(fixedKeys.map(k => [k, 1 as number])) },
      } };
    }

    const def = DOC_TYPES[fxc.type];
    const ex = fxc.extraction as NonNullable<Fixture["extraction"]>;
    // Thresholds alone decide from here: an engine failure already continued above.
    const held = blocks(ex, def);
    const flags = failedRules(ex, def);
    const fixed = fixedKeys;

    const commit = (auto: boolean) => {
      const cells: Record<string, string> = {};
      for (const f of def.fields) cells[f.key] = ex.values[f.key] ?? "";
      const ref = `${PREFIX[fx.type] ?? "REC"}-${24100 + s.records.length + 1}`;
      const rec: CommittedRecord = {
        id: `${docId}`, ref, type: fx.type, destination: def.destinationCode,
        cells, confidence: { ...ex.confidence }, committedAt: "",
        sourceDocId: docId, auto, correctedFields: fixed, engine: eng,
        actions: buildActions(fx.type, ref, cells, def.destination),
      };
      s.records.push(rec);
      s.processed[docId] = {
        doc, status: "committed", stage: "commit", type: fx.type,
        typeConfidence: ex.typeConfidence, extraction: ex, latencyMs: latency,
        finishedAt: "", correctedFields: fixed, flags: auto ? [] : flags, engine: eng,
      } as ProcessedDoc;
      s.stats.committed += 1;
      if (auto) {
        s.stats.autoCommitted += 1;
        s.stats.fieldsAuto += def.fields.length;
      } else {
        s.stats.fieldsCorrected += fixed.length;
        s.stats.fieldsAuto += Math.max(0, def.fields.length - fixed.length);
      }
    };

    // A document the human repaired commits as human-touched, not as "auto": the audit trail
    // must keep saying which fields a person had to confirm.
    if (!held) { commit(fixed.length === 0); continue; }
    if (discarded.has(docId)) {
      s.processed[docId] = {
        doc, status: "discarded", stage: "classify", type: fx.type,
        typeConfidence: ex.typeConfidence, extraction: ex, latencyMs: latency,
        finishedAt: "", correctedFields: fixed, flags, engine: eng,
      } as ProcessedDoc;
      s.stats.discarded += 1;
      continue;
    }
    if (approved.has(docId)) { commit(false); continue; }

    s.processed[docId] = {
      doc, status: "exception", stage: "validate", type: fx.type,
      typeConfidence: ex.typeConfidence, extraction: ex, latencyMs: latency,
      finishedAt: "", correctedFields: [], flags, engine: eng,
    } as ProcessedDoc;
    s.stats.exceptions += 1;
  }

  s.seeded = !!opts.seeded && s.stats.total > 0;
  return s;
}

/** Append a pasted document's result, keeping the cookie under the 4KB domain limit. */
export function pushLive(w: Wire, live: LiveDoc): Wire {
  const l = [...(w.l ?? []), live];
  while (l.length > MAX_LIVE_DOCS) l.shift();
  return { ...w, l };
}

/** Highest id in use + 1, so a reset-and-repaste never reuses an id. */
export function nextLiveId(w: Wire): number {
  const ids = (w.l ?? []).map(x => x.id);
  return (ids.length ? Math.max(...ids) : LIVE_ID_BASE) + 1;
}
