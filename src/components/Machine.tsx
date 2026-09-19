"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SAMPLES, type Sample } from "@/lib/samples";
import { THRESHOLD } from "@/lib/types";

/*
  The whole product, on one screen: a document goes in, a row comes out.

  Three things this is built around, because everything else on the previous version of this page was
  arguing rather than showing:
  · one input, and it accepts what a person actually has — pasted text, or the file in their downloads;
  · the run is visible as it happens, so the second it takes reads as work rather than as a wait;
  · the result shows what it found *and what it refused to invent*, in the same typography, so a held
    document is as impressive as a cleared one — that is the actual claim.
*/

type Stage = "receive" | "text" | "classify" | "extract" | "gates" | "route";
const STAGE_WORD: Record<Stage, string> = {
  receive: "received", text: "reading the text", classify: "classifying",
  extract: "extracting fields", gates: "running the checks", route: "routing",
};

interface Field { key: string; label: string; value: string; confidence: number; reason?: string }
interface Verdict {
  status: "committed" | "exception" | "discarded";
  type: string; typeLabel: string; destination: string; destinationCode: string;
  flags: string[]; fields: Field[]; engine: string; note?: string | null; reject?: string | null;
  payload: Record<string, unknown> | null; ref: string | null;
}
interface Row { i: number; name: string; bytes: number; kind: string; stage: Stage | null; verdict: Verdict | null }

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** The classifier's codes, in the words the page uses. Only these two exist, so the sentence beside a
 *  discarded document is a lookup rather than a guess — anything unmapped prints its own code. */
const REJECT: Record<string, string> = {
  NO_TRANSACTIONAL_CONTENT: "there is no order, invoice or booking in it to act on",
  NO_CONTENT: "no machine-readable text could be found in it",
};

export default function Machine() {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [clock, setClock] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [drag, setDrag] = useState(false);
  const files = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);

  const run = useCallback(async (pasted: string, picked: File[], pastedAs?: string) => {
    if (!pasted.trim() && !picked.length) { setError("Paste a document, drop a file, or start from one of the four examples."); return; }
    setBusy(true); setError(""); setRows([]); setClock(null); setOpen(null);
    const fd = new FormData();
    if (pasted.trim()) { fd.append("text", pasted); fd.append("name", pastedAs ?? "pasted document"); }
    picked.forEach(f => fd.append("files", f));

    /* Events arrive as fast as the server makes them. Stage labels are held for a beat each so the
       run can be followed; the timings printed at the end are the server's, never this delay. */
    const queue: Record<string, unknown>[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;
    const paint = () => {
      const ev = queue.shift();
      if (!ev) { timer = null; return; }
      apply(ev);
      timer = setTimeout(paint, ev.t === "stage" ? 130 : 0);
    };
    const apply = (ev: Record<string, unknown>) => {
      /* The start event carries the batch as the server saw it: `id` there is the row index the later
         events key on, and nothing else about its shape is a Row. Spreading it in blindly — which is
         what this line used to do — left every row with `i: undefined`, so no stage and no verdict ever
         matched a row and the page sat at "received" forever while the run had long finished. */
      if (ev.t === "start") {
        const ds = (ev.docs ?? []) as { id: number; name: string; bytes: number; kind: string }[];
        setRows(ds.map(d => ({ i: Number(d.id), name: String(d.name), bytes: Number(d.bytes) || 0,
          kind: String(d.kind), stage: null, verdict: null })));
      }
      else if (ev.t === "stage") { const { i, stage } = ev as unknown as { i: number; stage: Stage };
        setRows(r => r.map(x => x.i === i ? { ...x, stage } : x)); }
      else if (ev.t === "doc") { const { i, verdict } = ev as unknown as { i: number; verdict: Verdict };
        setRows(r => r.map(x => x.i === i ? { ...x, verdict, stage: null } : x)); }
      else if (ev.t === "done") { setClock(Number(ev.ms) || null); setBusy(false); }
      else if (ev.t === "error") { setError(String((ev as { message?: string }).message ?? "the run stopped early")); setBusy(false); }
    };

    try {
      const res = await fetch("/api/pilot", { method: "POST", body: fd });
      if (!(res.headers.get("content-type") ?? "").includes("ndjson")) {
        const j = await res.json().catch(() => null);
        setError(j?.error ?? `The service did not start the run (HTTP ${res.status}).`);
        setBusy(false); return;
      }
      const rd = res.body!.getReader(); const dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { value, done } = await rd.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
          if (line) { queue.push(JSON.parse(line)); if (!timer) timer = setTimeout(paint, 0); }
        }
      }
      while (queue.length) { await new Promise(r => setTimeout(r, 130)); paint(); while (timer) await new Promise(r => setTimeout(r, 40)); }
    } catch (e) {
      setError(`The run did not finish: ${(e as Error).message}`);
      setBusy(false);
    }
  }, []);

  useEffect(() => { setText(""); }, []);

  const counts = useMemo(() => ({
    cleared: rows.filter(r => r.verdict?.status === "committed").length,
    held: rows.filter(r => r.verdict?.status === "exception").length,
    aside: rows.filter(r => r.verdict?.status === "discarded").length,
  }), [rows]);

  const csv = () => {
    const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = ["document,type,outcome,destination,flag,field,value,confidence,why"];
    for (const r of rows) { const v = r.verdict; if (!v) continue;
      const base = [q(r.name), q(v.typeLabel), q(v.status === "committed" ? "cleared" : v.status === "discarded" ? "set aside" : "held"), q(v.destination)];
      if (!v.fields.length) lines.push([...base, q(""), q(v.note ?? v.flags.join(" ")), q(""), q(""), q("")].join(","));
      for (const f of v.fields) lines.push([...base, q(v.flags.join(" ")), q(f.label), q(f.value || "not present"), q(pct(f.confidence)), q(f.reason ?? "")].join(","));
    }
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "conduit-field-map.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const trySample = (s: Sample) => { setText(s.body); run(s.body, [], `${s.label} · our sample`); box.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  return (
    <div ref={box}>
      {/* ── the prompt ─────────────────────────────────────────────────── */}
      <h1 className="display text-num2 sm:text-[54px]">Paste a document.<br /><i>Get a clean row.</i></h1>
      <p className="lede mt-4 max-w-[54ch]">
        An order, an invoice, a booking note — whatever lands in the inbox. Conduit reads out the fields
        each type needs, checks them the way your systems will, and routes the ones it can stand behind.
        Anything it cannot verify it holds and tells you why, instead of writing a guess.
      </p>

      <div className="mt-7 card-hero">
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); run(text, Array.from(e.dataTransfer.files)); }}
          className={`relative border-b border-rule ${drag ? "bg-paper2" : ""}`}
        >
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run(text, []); }}
            rows={9}
            spellCheck={false}
            aria-label="Document text"
            placeholder={"Paste the body of an order, an invoice, anything —\nor drop a PDF on this box.\n\nPO Number: 88241\nQuantity: 4,000 units\nUnit price: £0.18"}
            className="w-full resize-y bg-transparent px-4 py-4 font-mono text-[13px] leading-[1.65] text-ink outline-none placeholder:text-mute2 sm:px-6 sm:text-[13.5px]"
          />
          <div className="pointer-events-none absolute right-3 top-3 font-mono text-[10px] uppercase tracking-[0.14em] text-mute2">
            {text.trim() ? `${text.trim().length.toLocaleString()} characters` : ""}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6">
          <button type="button"
            onClick={() => { if (!text.trim()) { box.current?.querySelector("textarea")?.focus(); setError("Paste a document, drop a file, or start from one of the four examples."); return; } run(text, []); }}
            disabled={busy}
            className="btn btn-primary !px-4 !py-2">
            {busy ? "Reading…" : "Run it"}
          </button>
          <button type="button" onClick={() => files.current?.click()} disabled={busy}
            className="border border-rule2 bg-paper px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink2 transition-colors hover:border-ink disabled:opacity-40">
            or choose a file
          </button>
          <input ref={files} type="file" multiple accept=".pdf,.txt,text/plain,application/pdf" className="hidden"
            onChange={e => run(text, Array.from(e.target.files ?? []))} />
          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.13em] text-mute2">
            <span className="hidden sm:inline">⌘↵ to run · </span>PDF with a text layer, or text · up to 12 at once
          </span>
        </div>
      </div>

      {error ? <p className="mt-3 border-l-2 border-red pl-3 text-[13.5px] leading-[1.5] text-red">{error}</p> : null}

      {/* ── nothing to paste yet ───────────────────────────────────────── */}
      {!rows.length && !busy ? (
        <div className="mt-5">
          <p className="label">No document of yours? Run one of ours — four outcomes, four seconds.</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {SAMPLES.map(s => (
              <button key={s.key} type="button" data-sample={s.key} onClick={() => trySample(s)}
                className="group border border-rule bg-paper px-3.5 py-3 text-left transition-colors hover:border-ink/45 hover:bg-paper2">
                <span className="flex items-baseline gap-2">
                  <span className="text-[14.5px] font-medium text-ink group-hover:underline group-hover:decoration-rule2 group-hover:underline-offset-4">
                    {s.label}
                  </span>
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.12em] text-mute2">run</span>
                </span>
                <span className="mt-1 block text-[13px] leading-[1.45] text-mute">{s.promise}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── the run ────────────────────────────────────────────────────── */}
      {rows.length ? (
        <div className="mt-7">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-rule pb-2">
            <span className="label !text-[11px]">
              {rows.length} document{rows.length === 1 ? "" : "s"} · {counts.cleared} cleared
              {counts.held ? ` · ${counts.held} held` : ""}{counts.aside ? ` · ${counts.aside} set aside` : ""}
            </span>
            {clock !== null ? <span className="font-mono text-[10.5px] text-mute2">
                {clock} ms of engine time · the pacing you watched is this page, not the queue
              </span> : null}
            <span className="ml-auto flex items-center gap-2">
              <button type="button" onClick={csv}
                className="border border-rule2 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.13em] text-ink2 hover:border-ink">
                field map (.csv)
              </button>
              <button type="button" onClick={() => { setRows([]); setText(""); }}
                className="font-mono text-[10px] uppercase tracking-[0.13em] text-mute hover:text-ink">
                clear
              </button>
            </span>
          </div>

          <div className="divide-y divide-rule">
            {rows.map(r => <Result key={r.i} row={r} open={open === r.i} onOpen={() => setOpen(open === r.i ? null : r.i)} />)}
          </div>
        </div>
      ) : null}

      {/* One disclosure, at the bottom of the page where a reader arrives after the run rather than
          between the box and the answer. It states the three facts that matter and stops. */}
      <p className="mt-8 max-w-[64ch] border-t border-rule pt-3 text-[12px] leading-[1.5] text-mute2">
        Read inside the request, returned to this tab: nothing stored, nothing sent on, and the body it
        prepares is shown rather than posted. The four examples are our own test documents, not a
        client&rsquo;s paperwork.
      </p>
    </div>
  );
}

/* ── one document, start to finish ─────────────────────────────────── */
function Result({ row, open, onOpen }: { row: Row; open: boolean; onOpen: () => void }) {
  const v = row.verdict;
  const stageWord = row.stage ? STAGE_WORD[row.stage] : null;

  if (!v) {
    return (
      <div className="py-4">
        <div className="flex items-baseline gap-3">
          <span className="flex-1 truncate text-[15px] font-medium text-ink">{row.name}</span>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-mute">{stageWord ?? "received"}</span>
        </div>
        <div className="pane-wait mt-2 h-[3px] w-full bg-rule2" />
      </div>
    );
  }

  const tone = v.status === "committed" ? "text-green" : v.status === "discarded" ? "text-mute" : "text-amber";
  const stamp = v.status === "committed" ? "cleared" : v.status === "discarded" ? "set aside" : "held";
  const shown = v.fields.filter(f => f.value);
  const missing = v.fields.filter(f => !f.value);
  const worst = shown.length ? Math.min(...shown.map(f => f.confidence)) : 0;

  return (
    <div className="rowin py-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[15.5px] font-medium text-ink">{row.name}</span>
        <span className={`font-mono text-[10.5px] uppercase tracking-[0.15em] ${tone}`}>{stamp}</span>
        {v.status === "exception" ? v.flags.map(f => <span key={f} className="stamp stamp-hold">{f}</span>) : null}
        <span className="ml-auto font-mono text-[10.5px] text-mute2">{row.kind} · {bytes(row.bytes)}</span>
      </div>

      <p className="mt-1.5 max-w-[74ch] text-[14px] leading-[1.5] text-body">
        {v.status === "committed" ? (
          <>Read as <b className="font-medium text-ink">{v.typeLabel.toLowerCase()}</b> and cleared for{" "}
            <b className="font-medium text-ink">{v.destination}</b> — {shown.length} field{shown.length === 1 ? "" : "s"},
            lowest confidence {pct(worst)}.</>
        ) : v.status === "discarded" ? (
          <>Set aside by the classifier: {REJECT[v.reject ?? ""] ?? v.reject ?? "nothing in it to file"}.
            {" "}Nothing was written and nothing was queued for a person — which is what keeps the queue
            worth reading in the morning.</>
        ) : (
          <>{v.note ?? <>Went to <b className="font-medium text-ink">{v.destination}</b>, then stopped: a required field was
            missing or below the confidence threshold. It stays here for a person rather than going out half-read.</>}</>
        )}
      </p>

      {v.fields.length ? (
        <div className="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {[...shown, ...missing].map(f => (
            <div key={f.key}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">{f.label}</span>
                <span className={`font-mono text-[10.5px] ${!f.value ? "text-amber" : f.confidence >= THRESHOLD ? "text-ink2" : "text-amber"}`}>
                  {f.value ? pct(f.confidence) : "absent"}
                </span>
              </div>
              <div className={`meter mt-1${f.value ? (f.confidence >= THRESHOLD ? "" : " hold") : " hold"}`}>
                <i style={{ width: pct(f.confidence) }} />
              </div>
              <p className={`mt-1 text-[13.5px] leading-[1.4] ${f.value ? "text-ink" : "text-amber"}`}>
                {f.value || "not stated in this document"}
              </p>
              {f.reason ? <p className="mt-0.5 text-[12px] leading-[1.4] text-mute">{f.reason}</p> : null}
            </div>
          ))}
        </div>
      ) : null}

      {v.payload ? (
        <div className="mt-3">
          <button type="button" onClick={onOpen}
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink2 underline decoration-rule2 underline-offset-4 hover:decoration-ink">
            {open ? "hide the body it would write" : "the exact body it would write"}
          </button>
          {open ? (
            <>
              <pre className="mt-2 overflow-x-auto border border-rule2 bg-paper2 px-3 py-2.5 font-mono text-[11.5px] leading-[1.6] text-ink2">
                {JSON.stringify(v.payload, null, 2)}
              </pre>
              <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-mute2">
                prepared for {v.destinationCode} · idempotency key {String(v.payload.idempotency_key ?? "")} · nothing was written
              </p>
            </>
          ) : null}
        </div>
      ) : v.status === "exception" || v.flags.length ? (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-amber">
          no body prepared · the gate stopped it before anything was written
        </p>
      ) : null}
    </div>
  );
}

const bytes = (b: number) => (b < 1024 ? `${b} B` : b < 1_048_576 ? `${(b / 1024).toFixed(b < 10_240 ? 1 : 0)} KB` : `${(b / 1_048_576).toFixed(1)} MB`);
