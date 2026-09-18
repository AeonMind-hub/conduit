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
export function payloadFor(r: CommittedRecord, store: Store) {
  const src = Object.values(store.processed).find(p => p.doc.id === r.sourceDocId)?.doc;
  return {
    object: DOC_TYPES[r.type]?.label ?? r.type,
    external_id: r.ref,
    idempotency_key: `${r.ref}:${r.sourceDocId}`,
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

