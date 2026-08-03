import { NextResponse } from "next/server";
import { DOCS, FIXTURES } from "@/lib/corpus";
import { DOC_TYPES } from "@/lib/doctypes";
import { readStore, writeStore } from "@/lib/store";
import { blocks, failedRules } from "@/lib/types";
import type { Event, Stage } from "@/lib/types";
import { buildActions } from "@/lib/actions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PREFIX: Record<string, string> = {
  purchase_order: "SO", supplier_invoice: "AP",
  delivery_booking: "DK", quote_request: "OPP",
};

function ts() { return new Date().toISOString().slice(11, 23); }

export async function POST(req: Request) {
  const { id, all } = await req.json().catch(() => ({}));
  const ids: number[] = all ? DOCS.map(d => d.id) : typeof id === "number" ? [id] : [];
  if (!ids.length) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const s = readStore();

  for (const docId of ids) {
    const doc = DOCS.find(d => d.id === docId);
    const fx = FIXTURES[docId];
    if (!doc || !fx) continue;

    // Idempotent: a second Run must not double-count. Public demo links get
    // clicked more than once.
    if (s.processed[docId]) continue;

    const ev = (stage: Stage, level: Event["level"], msg: string) =>
      s.events.push({ t: ts(), docId, stage, level, msg });

    const latency = 180 + Math.round(Math.random() * 420);
    await new Promise(r => setTimeout(r, 40 + Math.random() * 90));

    s.stats.total += 1;
    s.stats.latencyTotal += latency;
    s.stats.byType[fx.type] = (s.stats.byType[fx.type] ?? 0) + 1;

    ev("ingest", "info", `received · ${doc.from}`);

    if (!fx.relevant || !fx.extraction) {
      ev("classify", "warn", fx.rejectReason ?? "no transactional content");
      s.processed[docId] = {
        doc, status: "discarded", stage: "classify", type: "unclassified",
        typeConfidence: 0, rejectReason: fx.rejectReason, latencyMs: latency,
        finishedAt: new Date().toISOString(), correctedFields: [], flags: ["NO_CONTENT"],
      };
      s.stats.discarded += 1;
      continue;
    }

    const def = DOC_TYPES[fx.type];
    const ex = fx.extraction;
    ev("classify", "ok", `${def.code} · ${(ex.typeConfidence * 100).toFixed(0)}%`);
    ev("extract", "info", `${def.fields.length} fields`);

    const flags = failedRules(ex, def);
    const held = blocks(ex, def);

    if (held) {
      ev("validate", "error", flags.slice(0, 2).join(" · "));
      s.processed[docId] = {
        doc, status: "exception", stage: "validate", type: fx.type,
        typeConfidence: ex.typeConfidence, extraction: ex, latencyMs: latency,
        finishedAt: new Date().toISOString(), correctedFields: [], flags,
      };
      s.stats.exceptions += 1;
    } else {
      ev("validate", "ok", "all rules passed");
      const cells: Record<string, string> = {};
      for (const f of def.fields) cells[f.key] = ex.values[f.key] ?? "";
      const ref = `${PREFIX[fx.type]}-${24100 + s.records.length + 1}`;
      s.records.push({
        id: `${docId}`, ref, type: fx.type, destination: def.destinationCode,
        cells, confidence: { ...ex.confidence },
        committedAt: new Date().toISOString(), sourceDocId: docId,
        auto: true, correctedFields: [], actions: buildActions(fx.type, ref, cells, def.destination),
      });
      ev("commit", "ok", `${ref} → ${def.destinationCode}`);
      s.processed[docId] = {
        doc, status: "committed", stage: "commit", type: fx.type,
        typeConfidence: ex.typeConfidence, extraction: ex, latencyMs: latency,
        finishedAt: new Date().toISOString(), correctedFields: [], flags: [],
      };
      s.stats.committed += 1;
      s.stats.autoCommitted += 1;
      s.stats.fieldsAuto += def.fields.length;
    }
  }

  if (s.events.length > 600) s.events = s.events.slice(-600);
  writeStore(s);
  return NextResponse.json({ ok: true, store: s });
}
