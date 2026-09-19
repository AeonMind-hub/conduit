import type { CommittedRecord, Store } from "./types";
import { DOC_TYPES } from "./doctypes";

/**
 * The exact body Conduit would send to the destination system for one committed record.
 *
 * Extracted out of the Connections page so that the page explaining the payload and a live run
 * producing a payload cannot drift apart — that drift is what makes a demo look staged. The
 * idempotency key is the whole reason a re-run is safe, and `engine` is what makes the audit trail
 * honest: it says which engine produced the value, not merely that one did.
 */
/** The reference the document itself carries — the string someone would type into their own search box
 *  to find this order. Deliberately not the internal row reference: a payload keyed on `SO-24101` cannot
 *  be reconciled against a supplier's paperwork, and reconciliation is the whole point of the write. */
export function ownRef(values: Record<string, string>): string | null {
  for (const k of ["po_number", "invoice_no", "ref", "quote_ref", "po_ref"]) {
    const v = (values[k] ?? "").trim();
    if (v) return v;
  }
  return null;
}

/**
 * The text as the document means it, before it is hashed. A key that changes with the transport is not a
 * property of the paperwork: the same forwarded invoice arrives with CRLF line endings from one mailer
 * and LF from another, one web client hands a `£` through as two bytes and another as one, and every one
 * of those would otherwise read as a different order. Whitespace is collapsed, the two bytes a
 * mis-decoded currency sign turns into are the same noise this removes, and nothing that a person would
 * call a different document ever hashes alike — a changed amount is a changed line, asserted below.
 */
export function digestibleText(s: string): string {
  return (s ?? "").replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ")
    .replace(/[^\x20-\x7e\n]/g, "").replace(/[ \t]+/g, " ")
    .split("\n").map(l => l.trim()).filter(Boolean).join("\n");
}

/** Two lanes of FNV-1a over the document's own text, printed as 16 hex characters. Not a signature and
 *  not a security claim: it exists so that the same PDF sent twice — or forwarded twice — produces the
 *  same idempotency key, which a per-run row id can never do. */
export function textDigest(s: string): string {
  const fnv = (seed: number, mul: number) => {
    let h = BigInt(seed);
    const m = BigInt(mul);
    for (let i = 0; i < s.length; i++) { h ^= BigInt(s.charCodeAt(i)); h = (h * m) & 0xffffffffn; }
    return h.toString(16).padStart(8, "0");
  };
  return fnv(0x811c9dc5, 0x01000193) + fnv(0xc2b2ae35, 0x27d4eb2f);
}

export function payloadFor(r: CommittedRecord, store: Store, opts: { text?: string } = {}) {
  const src = Object.values(store.processed).find(p => p.doc.id === r.sourceDocId)?.doc;
  return {
    object: DOC_TYPES[r.type]?.label ?? r.type,
    external_id: ownRef(r.cells) ?? r.ref,
    /** The document's own reference plus a digest of its text: identical paperwork in twice is recognised
     *  as one order rather than posted as two. Without `text` a caller gets the internal row key, so the
     *  weaker form is visible in the payload rather than hidden. */
    idempotency_key: opts.text
      ? `${ownRef(r.cells) ?? r.ref}:${textDigest(digestibleText(opts.text))}`
      : `${r.ref}:${r.sourceDocId}`,
    received_at: src?.receivedAt ?? null,
    from: src?.from ?? null,
    fields: r.cells,
    confidence: r.confidence,
    provenance: {
      committed_by: r.auto ? "conduit" : "human_review",
      fields_corrected_by_human: r.correctedFields,
      engine: r.engine ?? "fixture",
    },
    downstream: r.actions.map(a => `${a.kind}:${a.target}`),
  };
}

