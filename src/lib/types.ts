/* ── One company. One inbox. Mixed document types. ────────────────────
   Northwind Supply Co — a mid-size distributor. Their ops inbox receives
   purchase orders, supplier invoices, delivery bookings, customer quote
   requests and a lot of noise. Today a person triages all of it by hand.

   The system classifies each document, extracts the fields that document
   type needs, validates them, and routes to the right destination system.
   ──────────────────────────────────────────────────────────────────── */

export type DocType =
  | "purchase_order" | "supplier_invoice" | "delivery_booking"
  | "quote_request"  | "unclassified";

export type Stage =
  | "ingest" | "classify" | "extract" | "validate" | "route" | "commit";

export const STAGES: { id: Stage; label: string; short: string }[] = [
  { id: "ingest",   label: "Ingest",    short: "IN"  },
  { id: "classify", label: "Classify",  short: "CLS" },
  { id: "extract",  label: "Extract",   short: "EXT" },
  { id: "validate", label: "Validate",  short: "VAL" },
  { id: "route",    label: "Route",     short: "RTE" },
  { id: "commit",   label: "Commit",    short: "CMT" },
];

export interface FieldDef {
  key: string;
  label: string;
  required: boolean;
  type?: "text" | "date" | "number" | "money";
}

export interface DocTypeDef {
  id: DocType;
  label: string;
  /** Short code shown in the pipeline and tables. */
  code: string;
  /** Destination system the record is committed to. */
  destination: string;
  destinationCode: string;
  accent: "cyan" | "violet" | "amber" | "emerald" | "slate";
  fields: FieldDef[];
  minutesManual: number;
  /** What it costs the business when a machine guesses wrong here. */
  riskLine: string;
}

export interface Doc {
  id: number;
  from: string;
  subject: string;
  receivedAt: string;
  body: string;
  /** Ground truth, used by the fixture engine. */
  type: DocType;
}

export interface Extraction {
  values: Record<string, string>;
  confidence: Record<string, number>;
  /** Per-field one-line explanation of why confidence is low. */
  reasons?: Record<string, string>;
  notes: string;
  /** How sure the classifier was about the document type itself. */
  typeConfidence: number;
}

export interface Fixture {
  type: DocType;
  relevant: boolean;
  rejectReason?: string;
  extraction?: Extraction;
}

export type DocStatus =
  | "queued" | "running" | "committed" | "exception" | "discarded";

export interface ProcessedDoc {
  doc: Doc;
  status: DocStatus;
  stage: Stage;
  type: DocType;
  typeConfidence: number;
  extraction?: Extraction;
  rejectReason?: string;
  latencyMs: number;
  finishedAt: string;
  correctedFields: string[];
  /** Which validation rules fired. */
  flags: string[];
  /** Which engine produced this result. "none" means it could not answer, so it was held.
   *  "rules" is the deterministic extractor — no model call, nothing leaves the request. */
  engine?: "live" | "fixture" | "rules" | "none";
  /** One-line note when the engine itself failed or the model explained a low score. */
  note?: string;
}

export interface Action {
  kind: "write" | "email" | "notify";
  target: string;
  summary: string;
  detail?: string;
}

export interface CommittedRecord {
  id: string;
  ref: string;
  type: DocType;
  destination: string;
  cells: Record<string, string>;
  /** Confidence at the moment of commit — the audit trail. */
  confidence: Record<string, number>;
  committedAt: string;
  sourceDocId: number;
  auto: boolean;
  correctedFields: string[];
  /** Everything the system did on the operator's behalf. */
  actions: Action[];
  /** Which engine produced the value. The audit trail is a lie without this. */
  engine?: "live" | "fixture" | "rules" | "none";
}

export interface Event {
  t: string;
  docId: number;
  stage: Stage;
  level: "info" | "warn" | "error" | "ok";
  msg: string;
}

export interface Store {
  processed: Record<number, ProcessedDoc>;
  records: CommittedRecord[];
  events: Event[];
  stats: {
    total: number;
    committed: number;
    /** Committed on the first pass with no human. Never incremented by manual approval. */
    autoCommitted: number;
    exceptions: number;
    discarded: number;
    fieldsAuto: number;
    fieldsCorrected: number;
    latencyTotal: number;
    /** Per-doc-type counts, for the mix chart. */
    byType: Record<string, number>;
    /** Documents a visitor pasted in. */
    liveDocs: number;
    /** Of those, how many went through a real model call. */
    liveCalls: number;
  };
  /** True when this state was generated for a cold visitor rather than replayed. */
  seeded: boolean;
}

export const THRESHOLD = 0.85;
export const CLASSIFY_THRESHOLD = 0.80;

export function emptyStore(): Store {
  return {
    processed: {}, records: [], events: [],
    stats: {
      total: 0, committed: 0, autoCommitted: 0, exceptions: 0, discarded: 0,
      fieldsAuto: 0, fieldsCorrected: 0, latencyTotal: 0, byType: {},
      liveDocs: 0, liveCalls: 0,
    },
    seeded: false,
  };
}

export function blocks(ex: Extraction, def: DocTypeDef): boolean {
  if (ex.typeConfidence < CLASSIFY_THRESHOLD) return true;
  return def.fields.some(f => f.required && (ex.confidence[f.key] ?? 0) < THRESHOLD);
}

export function failedRules(ex: Extraction, def: DocTypeDef): string[] {
  const out: string[] = [];
  if (ex.typeConfidence < CLASSIFY_THRESHOLD) out.push("AMBIGUOUS_TYPE");
  for (const f of def.fields) {
    const c = ex.confidence[f.key] ?? 0;
    if (f.required && c === 0) out.push(`MISSING_${f.key.toUpperCase()}`);
    else if (f.required && c < THRESHOLD) out.push(`LOW_CONF_${f.key.toUpperCase()}`);
  }
  return out;
}

/* ── Honest rates ──────────────────────────────────────────────────────
   One denominator, computed here, used everywhere. The corpus is 75 documents
   of which 6 are pure noise; 66 of 69 actionable commit untouched (96%), while
   66 of 75 received is 88%. Quoting 96% without saying which denominator you
   used is the kind of number that ends a sales conversation in one question. */
export interface Rates {
  /** committed without a human ÷ everything received */
  onReceived: number;
  /** committed without a human ÷ documents that had transactional content */
  onActionable: number;
  received: number;
  actionable: number;
  auto: number;
}
export function rates(stats: Store["stats"]): Rates {
  const actionable = Math.max(0, stats.total - stats.discarded);
  const onReceived = stats.total ? stats.autoCommitted / stats.total : 0;
  const onActionable = actionable ? stats.autoCommitted / actionable : 0;
  return { onReceived, onActionable, received: stats.total, actionable, auto: stats.autoCommitted };
}
export const pct = (n: number) => `${Math.round(n * 100)}%`;
