import type { Doc } from "@/lib/types";
import { runRules } from "@/lib/rules";
import { runLive } from "@/lib/engine";
import { readUpload, fromPaste, type Picked } from "@/lib/intake";
import { EMPTY_WIRE, pushLive, rebuild, nextLiveId, type Wire } from "@/lib/session";
import { payloadFor } from "@/lib/payload";
import { DOC_TYPES } from "@/lib/doctypes";
import { blocks, failedRules } from "@/lib/types";
import { LIVE_ENABLED, MODEL, PILOT_CODES, PILOT_OPEN, PILOT_MODEL_BILLED,
  MAX_PILOT_DOCS, MAX_PILOT_BYTES } from "@/lib/config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The pilot room: a client's own documents, run through the real pipeline, in one request.
 *
 * Nothing is stored. There is no database behind this route and no cookie written by it — the run
 * exists in the request and in the visitor's browser tab, and the server keeps neither. That is not
 * a privacy slogan, it is the shape of the code, and it is the reason a prospect can drop a real
 * supplier invoice on the page without a data-processing agreement first.
 *
 * It is also gated on a code, deliberately: an open "upload your invoices" endpoint on the public
 * internet is a bill someone else runs and a breach waiting to happen. Codes are set in PILOT_CODES.
 *
 * Events are streamed as newline-delimited JSON so the browser can show each document moving through
 * the same stages the sample run shows. The pacing the visitor sees is done in the client — the
 * server does not sleep to look busy.
 */

const enc = new TextEncoder();

/** Sizes the way a person quotes them. A small file printed as "0 KB" reads as an empty file, which
 *  is the one impression an intake screen cannot afford. */
const fmtBytes = (b: number) =>
  b < 1024 ? `${b} B` : b < 1_048_576 ? `${(b / 1024).toFixed(b < 10_240 ? 1 : 0)} KB` : `${(b / 1_048_576).toFixed(1)} MB`;

type Emit = (ev: Record<string, unknown>) => void;

interface Verdict {
  status: "committed" | "exception" | "discarded";
  type: string;
  destination: string;
  flags: string[];
  fields: { key: string; label: string; value: string; confidence: number; reason?: string }[];
  note?: string;
}

/** What the browser gets for one finished document: the values, their confidences, and either the
 *  payload that would be written or the code that stopped it. */
function shape(picked: Picked, fx: ReturnType<typeof runRules>, store: ReturnType<typeof rebuild>, id: number, note?: string) {
  const def = DOC_TYPES[fx.type];
  const proc = store.processed[id];
  const rec = store.records.find(r => r.sourceDocId === id);
  const ex = fx.extraction;

  const fields = (def?.fields ?? []).map(f => ({
    key: f.key, label: f.label,
    value: ex?.values?.[f.key] ?? "",
    confidence: ex?.confidence?.[f.key] ?? 0,
    reason: ex?.reasons?.[f.key] ?? undefined,
  }));

  const status: Verdict["status"] = proc?.status === "committed" ? "committed"
    : proc?.status === "discarded" ? "discarded" : "exception";

  return {
    status,
    type: fx.type,
    typeLabel: def?.label ?? fx.type,
    destination: def?.destination ?? "None",
    destinationCode: def?.destinationCode ?? "—",
    flags: proc?.flags ?? [],
    fields,
    engine: proc?.engine ?? "rules",
    note: note ?? proc?.note,
    /** The exact body that would be POSTed. Shown, never sent — nothing writes to a client system
     *  from this deployment, and the page says so rather than implying otherwise. */
    payload: rec ? payloadFor(rec, store) : null,
    ref: rec?.ref ?? null,
  } satisfies Verdict & Record<string, unknown>;
}

export async function POST(req: Request) {
  const fail = (message: string, status: number) =>
    Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } });

  if (!PILOT_OPEN)
    return fail("The pilot room is not open on this deployment. It runs on an access code, so a link cannot be pointed at a stranger's invoices.", 503);

  const form = await req.formData().catch(() => null);
  if (!form) return fail("This endpoint takes a multipart form: files under `files`, an access code under `code`, and optional pasted text under `text`.", 400);

  const code = String(form.get("code") ?? "").trim().toLowerCase();
  if (!code || !PILOT_CODES.includes(code))
    return fail("That access code is not valid on this deployment. Codes are issued one per company, so a run cannot be started by anyone who finds the link.", 403);

  const uploads = form.getAll("files").filter((f): f is File =>
    typeof File !== "undefined" && f instanceof File && f.size > 0);
  const pasted = String(form.get("text") ?? "").trim();
  void 0;

  const picked: Picked[] = [];
  for (const f of uploads) picked.push(await readUpload(f, MAX_PILOT_BYTES));
  if (pasted) picked.push(fromPaste(pasted));

  if (!picked.length) return fail("Nothing arrived. Drop a PDF, a text file, or paste the body of an order.", 400);
  if (picked.length > MAX_PILOT_DOCS)
    return fail(`Up to ${MAX_PILOT_DOCS} documents per run. That is a bound on what one click can cost, not a limit on the product.`, 413);

  const totalBytes = picked.reduce((a, p) => a + p.bytes, 0);
  if (totalBytes > MAX_PILOT_BYTES * 3)
    return fail(`Those files total ${(totalBytes / 1_048_576).toFixed(1)} MB. Keep a run under ${(MAX_PILOT_BYTES * 3) / 1_048_576} MB.`, 413);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit: Emit = ev => controller.enqueue(enc.encode(JSON.stringify(ev) + "\n"));
      const t0 = Date.now();

      try {
        emit({ t: "start", engine: LIVE_ENABLED ? "model+rules" : "rules",
          model: LIVE_ENABLED ? MODEL : null,
          billed: LIVE_ENABLED ? PILOT_MODEL_BILLED : null,
          docs: picked.map((p, i) => ({ id: i, name: p.name, bytes: p.bytes, kind: p.kind })) });

        // One wire per request, thrown away when the response ends. That is the whole storage design:
        // there is nothing to keep, so nothing is kept, and the 4KB cookie limit the demo lives under
        // simply does not apply here — hence maxDocs on pushLive rather than a cap of four.
        let w: Wire = EMPTY_WIRE;
        const notes: Record<number, string> = {};

        for (let i = 0; i < picked.length; i++) {
          const p = picked[i];
          // `i` keys the browser's rows, `id` keys the engine's. They are different numbers on purpose:
          // document ids continue the run's sequence, so a payload's idempotency key never collides with
          // one from a previous run the customer may still have in their system.
          const id = nextLiveId(w);
          emit({ t: "stage", i, stage: "receive", ms: 0, detail: `${fmtBytes(p.bytes)} · ${p.kind}` });

          if (p.unreadable || !p.text) {
            emit({ t: "stage", i, stage: "text", ms: 0, detail: p.unreadable ?? "no text found", bad: true });
            w = pushLive(w, { id, from: p.name, subject: p.name, receivedAt: new Date().toISOString(),
              type: "unclassified", relevant: true, v: {}, cf: {}, tc: 0, ms: 0,
              eng: "none", err: p.unreadable ?? "no machine-readable text in this file" }, picked.length);
            const s0 = rebuild(w);
            emit({ t: "doc", id, name: p.name, verdict: { status: "exception", type: "unreadable",
              typeLabel: "Could not be read", destination: "Human queue", destinationCode: "—",
              flags: ["UNREADABLE"], fields: [], engine: "none", note: p.unreadable, payload: null, ref: null },
              store: s0 });
            continue;
          }

          emit({ t: "stage", i, stage: "text", ms: 0, detail: `${p.text.length.toLocaleString()} characters · ${p.how}${p.truncated ? " (first page worth)" : ""}` });

          const tRun = Date.now();
          const fx = runRules(p.text);
          const rulesMs = Date.now() - tRun;
          emit({ t: "stage", i, stage: "classify", ms: rulesMs,
            detail: `${DOC_TYPES[fx.type]?.label ?? fx.type} at ${Math.round((fx.extraction?.typeConfidence ?? 0) * 100)}%` });

          let out = fx;
          let eng: "rules" | "live" = "rules";
          let note: string | undefined;

          if (LIVE_ENABLED) {
            const doc: Doc = { id, from: p.name, subject: p.name, receivedAt: new Date().toISOString(),
              body: p.text, type: "unclassified" };
            const tm = Date.now();
            try {
              out = await runLive(doc);
              eng = "live";
              emit({ t: "stage", id, stage: "extract", ms: Date.now() - tm,
                detail: `model answered · ${Object.values(out.extraction?.values ?? {}).filter(Boolean).length} fields` });
            } catch (e) {
              note = `model call failed (${(e as Error).message.slice(0, 70)}) — the rules result below is still gated the same way`;
              emit({ t: "stage", i, stage: "extract", ms: 0, detail: note, bad: true });
            }
          } else {
            const found = Object.values(out.extraction?.values ?? {}).filter(v => !!v).length;
            emit({ t: "stage", i, stage: "extract", ms: rulesMs,
              detail: `${found} fields read by the rules engine · no model call made` });
          }

          emit({ t: "stage", i, stage: "gates", ms: 0,
            detail: out.relevant
              ? (blocks(out.extraction!, DOC_TYPES[out.type])
                  ? `held: ${failedRules(out.extraction!, DOC_TYPES[out.type]).join(", ") || "below a threshold"}`
                  : "every required field above threshold")
              : `not transactional: ${out.rejectReason ?? "no content"}` });

          const ex = out.extraction;
          w = pushLive(w, {
            id, from: p.name, subject: p.name, receivedAt: new Date().toISOString(),
            type: out.type, relevant: !!out.relevant, reject: out.rejectReason,
            v: ex?.values ?? {}, cf: ex?.confidence ?? {}, tc: ex?.typeConfidence ?? 0,
            ms: rulesMs, eng,
          }, picked.length);
          if (note) notes[id] = note;

          const s1 = rebuild(w);
          emit({ t: "doc", i, id, name: p.name, verdict: shape(p, out, s1, id, notes[id]), store: s1 });
          emit({ t: "stage", i, stage: "route", ms: Date.now() - tRun,
            // Same ending on every row, because it is the same fact either way: this deployment has no
            // credentials for their ERP, so a cleared row is a body prepared, not a body posted.
            detail: `${s1.processed[id]?.status === "committed"
              ? `prepared for ${DOC_TYPES[out.type]?.destination ?? "its system"}`
              : s1.processed[id]?.status === "discarded" ? "set aside by the classifier" : "held for a person"} · nothing was written` });
        }

        // The final store goes back with the run so the browser can print the batch totals without a
        // second request. `stored:false` is a promise the client renders literally.
        emit({ t: "done", ms: Date.now() - t0, store: rebuild(w), stored: false });
      } catch (e) {
        emit({ t: "error", message: (e as Error).message || "the run failed partway" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-conduit-stored": "no",
    },
  });
}
