import { runRules } from "@/lib/rules";
import { readUpload, fromPaste, type Picked } from "@/lib/intake";
import { EMPTY_WIRE, pushLive, rebuild, nextLiveId, type Wire } from "@/lib/session";
import { payloadFor } from "@/lib/payload";
import { DOC_TYPES } from "@/lib/doctypes";
import { blocks, failedRules } from "@/lib/types";
import { MAX_PILOT_DOCS, MAX_PILOT_BYTES, PILOT_CHARS_PER_DOC } from "@/lib/config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The machine behind the paste box, and the only piece of this product a stranger ever touches.
 *
 * It is open — no code, no account, no cookie — because the thing worth selling takes thirty seconds,
 * and a form in front of it costs the sale. What keeps it safe is not a gate but bounds: at most
 * MAX_PILOT_DOCS documents of MAX_PILOT_BYTES bytes, PILOT_CHARS_PER_DOC characters read of each,
 * rules only, no model, nothing stored. A prospect can send the link to their whole team and the worst
 * case is a few megabytes of string matching.
 *
 * Nothing is stored. There is no database behind this route and no cookie written by it — the run
 * exists in the request and in the visitor's own tab. That is not a privacy slogan, it is the shape of
 * the code, and it is why someone can drop a real supplier invoice here without a data-processing
 * agreement first.
 *
 * `runLive` — the model, which would send document text to a third party — is imported by nothing here
 * on purpose: a free-tier key on a public page would put strangers' invoices into a training corpus.
 * It stays reachable only from a private build, so the open path is deterministic and cannot be billed.
 *
 * Events are streamed as newline-delimited JSON so the browser can show each document moving through
 * the stages. The pacing a visitor sees is done in the client — the server does not sleep to look busy.
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
function shape(picked: Picked, fx: ReturnType<typeof runRules>, store: ReturnType<typeof rebuild>, id: number,
  note?: string, text?: string) {
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
     *  from this deployment, and the page says so rather than implying otherwise. The document's own
     *  text goes into the key so that the same paperwork sent twice is recognised as one order. */
    payload: rec ? payloadFor(rec, store, { text: text ?? picked.text }) : null,
    ref: rec?.ref ?? null,
    /** When the classifier threw a document away, the code travels: the page turns it into a sentence,
     *  and the tests can then assert the refusal rather than admire it. */
    reject: !fx.relevant ? (fx.rejectReason ?? "NOT_CLASSIFIED") : null,
  } satisfies Verdict & Record<string, unknown>;
}

export async function POST(req: Request) {
  const fail = (message: string, status: number) =>
    Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } });

  const form = await req.formData().catch(() => null);
  if (!form) return fail("This endpoint takes a multipart form: files under `files` and optional pasted text under `text`.", 400);

  const uploads = form.getAll("files").filter((f): f is File =>
    typeof File !== "undefined" && f instanceof File && f.size > 0);
  const pasted = String(form.get("text") ?? "").trim();
  /* A run started from one of the four examples sends its own title, so the row on screen reads
     "a purchase order · our sample" rather than "pasted document" — the visitor should never have to
     remember which box the text came from. */
  const pasteName = String(form.get("name") ?? "").trim();

  const picked: Picked[] = [];
  for (const f of uploads) picked.push(await readUpload(f, MAX_PILOT_BYTES));
  if (pasted) picked.push(fromPaste(pasted, pasteName || "pasted document"));

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
        emit({ t: "start", engine: "rules", model: null, billed: null,
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

          const out = fx;
          const eng: "rules" = "rules";
          const note: string | undefined = undefined;
          const found = Object.values(out.extraction?.values ?? {}).filter(v => !!v).length;
          emit({ t: "stage", i, stage: "extract", ms: rulesMs,
            detail: `${found} fields read by the rules engine · no model call made` });

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
          emit({ t: "doc", i, id, name: p.name, verdict: shape(p, out, s1, id, notes[id], p.text), store: s1 });
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
      /* Named rather than generic, and phrased for the reader who is not a developer: this is the line
         that tells a prospect their paperwork is not accumulating anywhere. */
      "x-conduit-stored": "no",
    },
  });
}
