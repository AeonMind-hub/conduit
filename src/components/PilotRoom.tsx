"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Store } from "@/lib/types";

/*
  The pilot room. A prospect drops their own paperwork on the page and watches it go through the same
  pipeline the sample run shows — except this time the documents are theirs, which is the only part of
  a demo that actually changes a mind.

  Three rules this component does not bend:
  · nothing is ever implied as written. The strongest line available is "prepared for <system> —
    nothing was written", because on this deployment nothing can write to their ERP.
  · every field states the confidence it carries and, when the confidence is not from a clean label,
    the reason. A number with a question mark next to it is worth more in a buyer's hand than a
    number they have to go and check.
  · the engine is named per document. Rules-only and model-backed read differently in an audit, and
    pretending otherwise is how a vendor loses a procurement.
*/

type Stage = "receive" | "text" | "classify" | "extract" | "gates" | "route";
const STAGES: { k: Stage; n: string }[] = [
  { k: "receive", n: "received" }, { k: "text", n: "text read" }, { k: "classify", n: "classified" },
  { k: "extract", n: "fields" }, { k: "gates", n: "gates" }, { k: "route", n: "routed" },
];

interface Field { key: string; label: string; value: string; confidence: number; reason?: string }
interface Verdict {
  status: "committed" | "exception" | "discarded";
  type: string; typeLabel: string; destination: string; destinationCode: string;
  flags: string[]; fields: Field[]; engine: string; note?: string;
  payload: Record<string, unknown> | null; ref: string | null;
}
interface Row {
  id: number; name: string; bytes: number; kind: string;
  at: Record<string, { detail: string; ms: number; bad?: boolean }>;
  done: boolean; verdict?: Verdict;
}

const nf = new Intl.NumberFormat("en-GB");
const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Stage events arrive as fast as the server can produce them. The reveal is paced so a person can
 *  follow which step is happening — animation that only exists because the network was slow is a
 *  different product, and one that lies about its own speed. */
const PACE = 150;

export function PilotRoom() {
  const [code, setCode] = useState(() => (typeof window === "undefined" ? "" : sessionStorage.getItem("pilot.code") ?? ""));
  const [rows, setRows] = useState<Row[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [drag, setDrag] = useState(false);
  const [text, setText] = useState("");
  const filesRef = useRef<HTMLInputElement>(null);

  const run = useCallback(async (files: File[], pasted: string) => {
    if (!files.length && !pasted.trim()) { setError("Nothing to read yet — drop a PDF or paste an order."); return; }
    setRunning(true); setError(""); setNote(""); setStore(null); setOpen(null); setText("");
    const queue: Record<string, unknown>[] = [];
    let pump: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      const ev = queue.shift();
      if (!ev) { pump = null; return; }
      apply(ev);
      pump = setTimeout(flush, ev.t === "stage" ? PACE : 0);
    };
    const apply = (ev: Record<string, unknown>) => {
      if (ev.t === "start") {
        const docs = (ev.docs ?? []) as { id: number; name: string; bytes: number; kind: string }[];
        setRows(docs.map(d => ({ ...d, at: {}, done: false })));
        if (ev.engine === "rules") setNote("Rules engine only on this deployment: every value below was read by code, no model was called, and nothing left this request.");
        else if (ev.billed === false) setNote(`Model ${ev.model} ran this batch on a key the operator has not confirmed is billed. On Google's free tier the provider may train on what is sent, so say so before you send anything you have not been given permission to send.`);
      } else if (ev.t === "stage") {
        const { i, stage, detail, ms, bad } = ev as unknown as { i: number; stage: Stage; detail: string; ms: number; bad?: boolean };
        setRows(r => r.map(x => x.id === i ? { ...x, at: { ...x.at, [stage]: { detail, ms, bad } } } : x));
      } else if (ev.t === "doc") {
        const { i, verdict } = ev as unknown as { i: number; verdict: Verdict };
        setRows(r => r.map(x => x.id === i ? { ...x, verdict, done: true } : x));
        setStore((ev.store ?? null) as Store | null);
      } else if (ev.t === "done") {
        setStore((ev.store ?? null) as Store | null);
        setRunning(false);
      } else if (ev.t === "error") {
        setError(String((ev as { message?: string }).message ?? "the run failed"));
        setRunning(false);
      }
    };

    try {
      const fd = new FormData();
      files.forEach(f => fd.append("files", f));
      if (pasted.trim()) fd.append("text", pasted);
      if (code.trim()) fd.append("code", code.trim());
      if (code.trim()) sessionStorage.setItem("pilot.code", code.trim());
      const res = await fetch("/api/pilot", { method: "POST", body: fd });
      const ctype = res.headers.get("content-type") ?? "";
      if (!ctype.includes("ndjson")) {
        const j = await res.json().catch(() => null);
        setError(j?.error ?? `The pilot room did not start (${res.status}).`);
        setRunning(false);
        return;
      }
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (line) { queue.push(JSON.parse(line)); if (!pump) pump = setTimeout(flush, 0); }
        }
      }
      // whatever is still queued must be shown before the run is called finished
      while (queue.length) { await new Promise(r => setTimeout(r, PACE)); flush(); while (pump) await new Promise(r => setTimeout(r, 40)); }
      setRunning(false);
    } catch (e) {
      setError(`The run did not finish: ${(e as Error).message}`);
      setRunning(false);
    }
  }, [code]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    run(Array.from(e.dataTransfer.files), "");
  };

  const counts = useMemo(() => {
    const auto = rows.filter(r => r.verdict?.status === "committed").length;
    const held = rows.filter(r => r.verdict?.status === "exception").length;
    const aside = rows.filter(r => r.verdict?.status === "discarded").length;
    const actionable = rows.length - aside;
    return { auto, held, aside, actionable, done: rows.filter(r => r.done).length };
  }, [rows]);

  /* Both denominators in one sentence, in the run's own numbers. Written as prose rather than as
     caps because a claim this load-bearing has to survive being read once, on a phone, by someone
     who is deciding whether to pay for it — and because the unflattering half is the part that earns
     the flattering half. */
  const summary = useMemo(() => {
    const n = rows.length, auto = counts.auto, act = counts.actionable, held = counts.held, aside = counts.aside;
    // Each branch is a whole clause with its own verb, because a count and a verb agreeing through a
    // ternary is exactly how a generated sentence ends up reading "the 1 ones that did not are".
    let t = auto === 1
      ? `1 of ${n} ${n === 1 ? "document" : "documents"} cleared every gate on its own`
      : `${auto} of ${n} documents cleared every gate on their own`;
    t += act === n
      ? "; every one of them was bookable paperwork"
      : act === 1
        ? `; ${auto} of the one bookable document, with ${aside} set aside by the classifier as nothing to act on`
        : `; ${auto} of the ${act} bookable ones, with ${aside} set aside by the classifier as nothing to act on`;
    t += held === 1
      ? "; the document that fell short is named below with its reason"
      : held > 1
        ? `; the ${held} that fell short are named below with their reasons`
        : "";
    return t + ". Nothing was written to any of your systems: what is on this page is a body prepared for your ERP, accounting and WMS, not a body posted to them.";
  }, [rows, counts]);

  const csv = useCallback(() => {
    const head = ["document", "type", "status", "destination", "engine", "field", "value", "confidence", "why"];
    const lines = [head.join(",")];
    const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    for (const r of rows) {
      const v = r.verdict;
      if (!v) continue;
      if (!v.fields.length) lines.push([q(r.name), q(v.typeLabel), q(v.status), q(v.destination), q(v.engine), q(""), q(""), q(""), q(v.note ?? v.flags.join(" "))].join(","));
      for (const f of v.fields)
        lines.push([q(r.name), q(v.typeLabel), q(v.status), q(v.destination), q(v.engine), q(f.label), q(f.value || "— not present —"), q(pct(f.confidence)), q(f.reason ?? "")].join(","));
    }
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `conduit-pilot-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }, [rows]);

  const busy = running || counts.done < rows.length;

  return (
    <section className="mt-8" id="pilot">
      <div className="card-hero overflow-hidden">
        <div className="border-b border-rule px-4 py-3.5 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="display text-[19px] leading-tight text-ink">Put your own paper through it</h3>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.13em] text-mute">
              {busy ? `reading ${counts.done} of ${rows.length}` : rows.length ? `${rows.length} document${rows.length === 1 ? "" : "s"} read · nothing kept` : "PDF with a text layer · text · pasted"}
            </p>
          </div>
          <p className="mt-1.5 max-w-[62ch] text-[14px] leading-[1.6] text-mute">
            This runs your files through the same classifier, the same field extraction and the same
            gates you have been reading about. It keeps nothing: there is no database behind it and no
            copy left on the server when the request ends.
          </p>
          {note ? <p className="mt-2 border-l-2 border-amber pl-2.5 text-[13px] leading-[1.55] text-body">{note}</p> : null}
        </div>

        {/* drop zone ------------------------------------------------------- */}
        <div className="px-4 py-4 sm:px-6">
          <div
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => !busy && filesRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-1 border px-4 py-7 text-center transition-colors ${
              drag ? "border-ink bg-paper2" : "border-rule2 bg-paper2 hover:border-line2"}`}
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink2">
              {busy ? "running" : drag ? "release to read them" : "drop files here"}
            </span>
            <span className="text-[13px] text-mute">or click to choose · one PDF, up to twelve documents a run</span>
            <input
              ref={filesRef} type="file" multiple className="hidden"
              onChange={e => run(Array.from(e.target.files ?? []), "")}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="min-w-[9rem] flex-1">
              <span className="label">Access code</span>
              <input value={code} onChange={e => setCode(e.target.value)} placeholder="issued with the link"
                className="mt-1 w-full border border-rule2 bg-paper px-2.5 py-1.5 font-mono text-[12.5px] text-ink outline-none placeholder:text-mute2 focus:border-ink" />
            </label>
            <button type="button" onClick={() => run([], text)}
              className="border border-ink bg-ink px-3.5 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-paper disabled:opacity-40">
              {busy ? "running…" : "or paste text"}
            </button>
            {rows.length ? (
              <button type="button" onClick={csv}
                className="border border-rule2 px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink2 hover:border-ink">
                download the field map (.csv)
              </button>
            ) : null}
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
            placeholder="…or paste the body of an order or an invoice here and run it."
            className="mt-2 w-full resize-y border border-rule2 bg-paper px-2.5 py-2 text-[13px] leading-[1.55] text-ink outline-none placeholder:text-mute2 focus:border-ink" />
          {error ? <p className="mt-2 text-[13px] text-red">{error}</p> : null}
        </div>

        {/* ledger ---------------------------------------------------------- */}
        {rows.length ? (
          <>
            {/* Both denominators, always, in the sentence a person actually reads rather than in
                caps that a phone wraps into a block. A percentage stated once, flattering itself, is
                how vendors get caught; this one is deliberately awkward to quote out of context. */}
            <div className="border-y border-rule bg-paper2 px-4 py-2.5 sm:px-6">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.13em] text-ink2">
                {`${rows.length} received · ${counts.auto} cleared · ${counts.held} held · ${counts.aside} set aside`}
              </p>
              <p className="mt-1 max-w-[68ch] text-[13.5px] leading-[1.55] text-body">{summary}</p>
            </div>

            <ul className="divide-y divide-rule">
              {rows.map(r => {
                const v = r.verdict;
                const stageNow = STAGES.findIndex(s => !r.at[s.k]) ;
                const tone = !v ? (busy ? "text-mute" : "text-amber")
                  : v.status === "committed" ? "text-green" : v.status === "discarded" ? "text-mute" : "text-amber";
                const stamp = !v ? (busy ? "running" : "waiting")
                  : v.status === "committed" ? "cleared for writing"
                  : v.status === "discarded" ? "set aside" : "held";
                return (
                  <li key={r.id} className={`rowin px-4 py-3.5 sm:px-6 ${v ? "" : stageNow < 0 ? "pane-wait" : ""}`}>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-mono text-[10.5px] text-mute2">{String(r.id + 1).padStart(2, "0")}</span>
                      <span className="min-w-[8rem] flex-1 truncate text-[14.5px] font-medium text-ink">{r.name}</span>
                      {v ? (
                        <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)}
                          className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink2 underline decoration-rule2 underline-offset-4 hover:decoration-ink">
                          {open === r.id ? "hide payload" : "show fields"}
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className={`font-mono text-[10.5px] uppercase tracking-[0.16em] ${tone}`}>{stamp}</span>
                      {v?.payload ? <span className="font-mono text-[10.5px] text-mute">{v.ref}</span> : null}
                      {v?.flags?.length ? v.flags.map(f => <span key={f} className="meter hold">{f}</span>) : null}
                      {v && v.status !== "discarded" ? (
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
                          {v.engine === "live" ? "model + rules" : v.engine === "rules" ? "rules engine" : "no engine answered"}
                        </span>
                      ) : null}
                    </div>

                    {/* the walk itself: one line per stage, in the order it happened */}
                    <ol className="mt-2 space-y-1">
                      {STAGES.map((s, i) => {
                        const a = r.at[s.k];
                        const reached = !!a;
                        const activeNow = !reached && i === stageNow && busy;
                        return (
                          <li key={s.k} className="flex flex-wrap items-baseline gap-x-2 font-mono text-[11px] leading-[1.4]">
                            <span className={`w-[0.6rem] shrink-0 ${a?.bad ? "text-amber" : reached ? "text-ink" : "text-mute2"}`}>{reached ? "·" : activeNow ? "▸" : "·"}</span>
                            <span className={`w-[5.6rem] shrink-0 uppercase tracking-[0.1em] ${reached ? "text-ink2" : "text-mute2"}`}>{s.n}</span>
                            <span className={`${a?.bad ? "text-amber" : "text-mute"} ${activeNow ? "pane-wait" : ""}`}>
                              {a?.detail ?? (activeNow ? "…" : reached ? "" : "—")}
                            </span>
                            {a?.ms ? <span className="text-mute2">{a.ms} ms</span> : null}
                          </li>
                        );
                      })}
                    </ol>

                    {v && open === r.id ? (
                      <div className="mt-3 space-y-3 border-t border-rule pt-3">
                        {v.fields.length ? (
                          <div className="grid gap-x-5 gap-y-1.5 sm:grid-cols-2">
                            {v.fields.map(f => (
                              <div key={f.key}>
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">{f.label}</span>
                                  <span className={`font-mono text-[10.5px] ${f.confidence >= 0.9 ? "text-ink" : f.confidence >= 0.85 ? "text-ink2" : f.confidence > 0 ? "text-amber" : "text-mute2"}`}>
                                    {f.confidence > 0 ? pct(f.confidence) : "absent"}
                                  </span>
                                </div>
                                <div className="mt-0.5 h-[3px] w-full bg-rule2">
                                  <span className="block h-full bg-ink" style={{ width: pct(f.confidence) }} />
                                </div>
                                <p className={`mt-1 text-[13.5px] leading-[1.45] ${f.value ? "text-ink" : "text-amber"}`}>
                                  {f.value || "not present in the document"}
                                </p>
                                {f.reason ? <p className="mt-0.5 text-[12px] leading-[1.45] text-mute">{f.reason}</p> : null}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[13px] leading-[1.55] text-mute">
                            {v.note ?? "No fields were read from this document, so nothing was passed to the gate."}
                          </p>
                        )}

                        {v.payload ? (
                          <div>
                            <p className="label">Prepared body · {v.destination} · never sent</p>
                            <pre className="mt-1.5 overflow-x-auto border border-rule2 bg-paper2 px-3 py-2.5 font-mono text-[11.5px] leading-[1.6] text-ink2">
                              {JSON.stringify(v.payload, null, 2)}
                            </pre>
                          </div>
                        ) : v.status === "exception" ? (
                          <p className="text-[13px] leading-[1.55] text-body">
                            No body was prepared. {v.flags.includes("UNREADABLE")
                              ? "The file could not be read, so there was nothing to gate — and nothing was invented to fill the gap."
                              : "A required field was missing or under threshold, so the gate stopped it. This is the difference between this and a script that writes whatever it extracted: an incomplete row never reaches your ERP."}
                          </p>
                        ) : (
                          <p className="text-[13px] leading-[1.55] text-mute">
                            The classifier found no transactional content, so there is no record and no write —
                            which is what keeps the exception queue for things a person actually has to decide.
                          </p>
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            {store && !busy ? (
              <div className="border-t border-rule bg-paper2 px-4 py-3 sm:px-6">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.13em] text-ink2">
                  {nf.format(store.records.reduce((n, r) => n + r.actions.length, 0))} downstream actions were queued behind {store.records.length} record{store.records.length === 1 ? "" : "s"}
                  <span className="text-mute"> · {store.stats.liveCalls} model call{store.stats.liveCalls === 1 ? "" : "s"} · {nf.format(store.stats.latencyTotal)} ms of reading</span>
                </p>
                <p className="mt-1 text-[13px] leading-[1.55] text-mute">
                  On a connected build those bodies go out with the idempotency key shown above, so a re-run of the
                  same twenty documents changes nothing twice — and a human queue exists for everything the gate held,
                  which is why the number of rows written is the number you can defend.
                </p>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
