import { NextResponse } from "next/server";
import { DOC_TYPES } from "@/lib/doctypes";
import { readStore, writeStore } from "@/lib/store";
import type { CommittedRecord, Extraction } from "@/lib/types";
import { buildActions } from "@/lib/actions";

export const dynamic = "force-dynamic";

const PREFIX: Record<string, string> = {
  purchase_order: "SO", supplier_invoice: "AP",
  delivery_booking: "DK", quote_request: "OPP",
};

export async function GET() {
  return NextResponse.json(readStore());
}

export async function PATCH(req: Request) {
  const { docId, extraction, correctedFields, action } = (await req.json()) as {
    docId: number; extraction: Extraction; correctedFields: string[];
    action: "approve" | "discard";
  };
  const s = readStore();
  const p = s.processed[docId];
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });

  p.extraction = extraction;
  p.correctedFields = correctedFields;
  const t = new Date().toISOString().slice(11, 23);

  if (action === "discard") {
    p.status = "discarded"; p.stage = "classify";
    s.stats.exceptions -= 1; s.stats.discarded += 1;
    s.events.push({ t, docId, stage: "route", level: "warn", msg: "discarded by operator" });
  } else {
    const def = DOC_TYPES[p.type];
    const cells: Record<string, string> = {};
    for (const f of def.fields) cells[f.key] = extraction.values[f.key] ?? "";
    const ref = `${PREFIX[p.type]}-${24100 + s.records.length + 1}`;
    const rec: CommittedRecord = {
      id: `${docId}`, ref, type: p.type, destination: def.destinationCode,
      cells, confidence: { ...extraction.confidence },
      committedAt: new Date().toISOString(), sourceDocId: docId,
      auto: false, correctedFields,
      actions: buildActions(p.type, ref, cells, def.destination),
    };
    if (!s.records.some(r => r.id === rec.id)) s.records.push(rec);
    p.status = "committed"; p.stage = "commit";
    s.stats.exceptions -= 1; s.stats.committed += 1;
    s.stats.fieldsCorrected += correctedFields.length;
    s.stats.fieldsAuto += Math.max(0, def.fields.length - correctedFields.length);
    s.events.push({ t, docId, stage: "commit", level: "ok",
      msg: `${ref} → ${def.destinationCode} · ${correctedFields.length} corrected` });
  }
  writeStore(s);
  return NextResponse.json({ ok: true, store: s });
}
