import { readUpload, fromPaste, type Picked } from "@/lib/intake";
import { runBatch } from "@/lib/batch";
import { MAX_PILOT_DOCS, MAX_PILOT_BYTES, PILOT_CHARS_PER_DOC } from "@/lib/config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The machine behind the paste box, and the only piece of this product a stranger ever touches.
 *
 * One request is one batch, and the batch is the point. A dock receives a purchase order, an invoice that
 * bills less than it, a goods-received note, the same invoice again from a different address, and some noise —
 * all within minutes. Reconciling those is the job; reading one of them is a parlor trick. So the documents
 * are read here together, matched against each other, gated against the policy this client says they run, and
 * returned as one result set.
 *
 * It is open — no code, no account, no cookie — because the thing worth selling takes thirty seconds and a
 * form in front of it costs the sale. What keeps it safe is not a gate but bounds: at most MAX_PILOT_DOCS
 * documents of MAX_PILOT_BYTES bytes, PILOT_CHARS_PER_DOC characters read of each, rules only, no model,
 * nothing stored. Nothing billable is reachable, so nothing can be run up from the outside.
 */
export async function POST(req: Request) {
  const fail = (message: string, status: number) =>
    Response.json({ error: message }, { status, headers: { "cache-control": "no-store" } });

  const form = await req.formData().catch(() => null);
  if (!form) return fail("This endpoint takes a multipart form: files under `files`, optional pasted text under `text`, optional `policy` as JSON.", 400);

  const uploads = form.getAll("files").filter((f): f is File =>
    typeof File !== "undefined" && f instanceof File && f.size > 0);
  const pasted = String(form.get("text") ?? "").trim();
  /* A run started from one of the examples sends its own title, so the row reads "our sample · the order"
     rather than "pasted document": nobody should have to remember which box the text came from, and a sample
     must never be mistaken for their paperwork. */
  const pasteName = String(form.get("name") ?? "").trim();

  /* The paste leads the queue: it is what the visitor typed, and a run reads top-down in the order a person
     thinks about it — the document in front of me, then the files behind it. */
  const picked: Picked[] = [];
  if (pasted) picked.push(fromPaste(pasted, pasteName || "pasted document"));
  for (const f of uploads) picked.push(await readUpload(f, MAX_PILOT_BYTES));

  if (!picked.length) return fail("Nothing arrived. Drop a PDF, a text file, or paste the body of an order.", 400);
  if (picked.length > MAX_PILOT_DOCS)
    return fail(`Up to ${MAX_PILOT_DOCS} documents per run. That is a bound on what one click can cost, not a limit on the product.`, 413);

  let policy: unknown = {};
  const rawPolicy = form.get("policy");
  if (rawPolicy) { try { policy = JSON.parse(String(rawPolicy)); } catch { return fail("`policy` has to be JSON, e.g. {\"tolerancePct\":2}.", 400); } }

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      const t0 = Date.now();
      try {
        send({ t: "start", engine: "rules", model: null, billed: null,
          docs: picked.map((p, i) => ({ i, name: p.name, bytes: p.bytes, kind: p.kind.toUpperCase() })) });
        for (const stage of ["receive", "text", "classify", "extract", "gates", "match"])
          send({ t: "stage", stage, of: picked.length });

        const inputs = picked.map((p, i) => ({ i, name: p.name, bytes: p.bytes, kind: p.kind, text: p.text,
          /* A document the engine could not read is held with the reason printed — including the bound that
             stopped it, quoted in the reader's own units, so "too big" is actionable and not an apology. */
          unreadable: p.unreadable ?? (p.bytes > MAX_PILOT_BYTES
            ? `larger than ${(MAX_PILOT_BYTES / 1048576).toFixed(1)} MB — only the first ${PILOT_CHARS_PER_DOC.toLocaleString("en-GB")} characters were read, so nothing here is complete` : null) }));
        const run = runBatch(inputs, policy);
        /* The documents come back one at a time, in the order they arrived, because a reader should see their
           own paperwork being worked on. The groups follow: they only mean anything once every row is on the
           table. Flat fields for someone poking at the API by hand, and the whole verdict under `verdict`. */
        for (const d of run.docs) send({ t: "doc", i: d.i, name: d.name, bytes: d.bytes, kind: d.kind,
          type: d.type, status: d.status, digest: d.digest, verdict: d });
        send({ t: "matches", groups: run.groups, policy: run.policy });
        send({ t: "done", ms: Date.now() - t0, engine_ms: run.ms, counts: run.counts,
          policy: run.policy, clamped: run.clamped, stored: false });
      } catch (e) {
        send({ t: "error", message: (e as Error).message || "the run stopped partway" });
      } finally { controller.close(); }
    },
  });

  return new Response(stream, { headers: {
    "content-type": "application/x-ndjson; charset=utf-8",
    "cache-control": "no-store, max-age=0",
    /* Named rather than generic, and phrased for the reader who is not a developer: this is the line that
       tells a prospect their paperwork is not accumulating anywhere. */
    "x-conduit-stored": "no",
  } });
}
