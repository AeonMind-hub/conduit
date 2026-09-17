"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Pipeline, { TypeTag } from "@/components/Pipeline";
import EventLog from "@/components/EventLog";
import PageHead from "@/components/PageHead";
import Stat from "@/components/Stat";
import { DOCS } from "@/lib/corpus";
import { DOC_TYPES } from "@/lib/doctypes";
import { LIVE_ID_BASE } from "@/lib/session";
import { rates, pct } from "@/lib/types";
import type { Stage, Store } from "@/lib/types";
import { CLIENT_NAME, CORPUS_LABEL, engineLabel, LIVE_ENABLED } from "@/lib/config";

const STATUS: Record<string, string> = {
  queued:    "text-txt-dim border-line2",
  running:   "text-acc border-acc-line bg-acc-soft",
  committed: "text-acc border-acc-line bg-acc-soft",
  exception: "text-hold border-hold-line bg-hold-soft",
  discarded: "text-txt-dim border-line2",
};

const FILTERS = [
  ["all", "All"], ["purchase_order", "PO"], ["supplier_invoice", "INV"],
  ["delivery_booking", "BKG"], ["quote_request", "RFQ"], ["exception", "Held"],
] as const;

export default function OpsClient({ initial }: { initial: Store }) {
  const [store, setStore] = useState(initial);
  const [running, setRunning] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [logOpen, setLogOpen] = useState(false);
  const [text, setText] = useState("");
  const [from, setFrom] = useState("");
  const [subject, setSubject] = useState("");
  const [pasting, setPasting] = useState(false);
  const [pasteMsg, setPasteMsg] = useState<string | null>(null);

  async function replay() {
    setRunning(true);
    // Reset first, so a replayed run re-animates the stages instead of sitting at a
    // completed total that looks frozen.
    const r = await fetch("/api/reset", { method: "POST" });
    setStore((await r.json()).store);
    for (const doc of DOCS) {
      setActiveId(doc.id);
      const res = await fetch("/api/run", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: doc.id }),
      });
      const json = await res.json();
      if (json.store) setStore(json.store);
    }
    setActiveId(null);
    setRunning(false);
  }

  async function reset() {
    const res = await fetch("/api/reset", { method: "POST" });
    setStore((await res.json()).store);
  }

  async function runOne() {
    setPasting(true); setPasteMsg(null);
    const res = await fetch("/api/live", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, from, subject }),
    });
    const json = await res.json();
    if (json.store) setStore(json.store);
    const p = json.store?.processed?.[json.docId];
    setPasteMsg(json.error ?? (p
      ? p.status === "committed"
        ? `committed → ${DOC_TYPES[p.type]?.destination ?? "its system"}`
        : p.status === "exception"
          ? `held for a human — ${p.flags?.join(" · ") || "low confidence"}${p.note ? ` · ${p.note}` : ""}`
          : `discarded — ${p.rejectReason ?? "no transactional content"}`
      : "no result came back"));
    setPasting(false);
  }

  const { stats, processed, events } = store;

  const counts = useMemo<Partial<Record<Stage, number>>>(() => ({
    ingest: stats.total,
    classify: stats.total,
    extract: stats.total - stats.discarded,
    validate: stats.total - stats.discarded,
    route: stats.committed + stats.exceptions,
    commit: stats.committed,
  }), [stats]);

  const rows = useMemo(() => DOCS.filter(d => {
    if (filter === "all") return true;
    if (filter === "exception") return processed[d.id]?.status === "exception";
    return (processed[d.id]?.type ?? d.type) === filter;
  }), [filter, processed]);

  // Documents the visitor pasted, newest first. They share the same thresholds as the
  // corpus, so a prospect's own PO is judged exactly like ours.
  const liveRows = useMemo(() =>
    Object.entries(processed)
      .map(([id, p]) => ({ id: Number(id), p }))
      .filter(({ id }) => id >= LIVE_ID_BASE)
      .sort((a, b) => b.id - a.id), [processed]);

  // ONE denominator source for the whole app. Manual approvals never inflate it.
  const r = rates(stats);

  return (
    <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto">
      <PageHead
        title="Operations"
        meta={`${CLIENT_NAME} · ${DOCS.length} documents · 4 destination systems · engine: ${engineLabel()}`}
        actions={
          <>
            {stats.total > 0 && (
              <button onClick={reset} disabled={running}
                className="px-3 py-1.5 rounded-lg border border-line2 text-sm2 text-txt-mid
                           hover:text-txt-hi hover:border-txt-dim disabled:opacity-40 transition-colors">
                Clear
              </button>
            )}
            <button onClick={replay} disabled={running}
              className="px-4 py-1.5 rounded-lg bg-acc text-bg font-medium text-sm2
                         hover:opacity-90 disabled:opacity-50 transition-opacity">
              {running ? "Running…" : "Run pipeline"}
            </button>
          </>
        }
      />

      {store.seeded && (
        <div className="mb-4 px-4 py-2.5 rounded-xl2 border border-line bg-surface text-micro text-txt-lo leading-relaxed">
          Showing a <span className="text-txt-mid">completed run</span> of the {DOCS.length}-document
          demo corpus ({CORPUS_LABEL}). Hit <span className="text-txt-mid">Run pipeline</span> to watch it
          process from empty.
        </div>
      )}

      <div className="space-y-4">
        <Pipeline counts={counts} running={running} />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Processed" value={stats.total} sub={`of ${DOCS.length} queued`} />
          <Stat label="Committed" value={stats.committed} tone="acc"
                sub={stats.total
                  ? `${pct(r.onReceived)} of everything received · ${pct(r.onActionable)} of ${r.actionable} actionable`
                  : "—"} />
          <Stat label="Held" value={stats.exceptions} tone="hold" sub="waiting on a human" />
          <Stat label="Discarded" value={stats.discarded} tone="dim" sub="no transactional content" />
        </div>

        {stats.exceptions > 0 && (
          <Link href="/exceptions"
            className="flex items-center gap-3 px-4 py-3 rounded-xl2 border border-hold-line bg-hold-soft
                       hover:bg-hold-soft/70 transition-colors fadein">
            <span className="text-xl font-semibold text-hold tnum leading-none">{stats.exceptions}</span>
            <span className="text-sm2 text-txt-hi">documents need review</span>
            <span className="ml-auto text-xs2 text-hold">Open →</span>
          </Link>
        )}

        {/* ── paste one of THEIR documents ─────────────────────────────── */}
        <div className="card px-4 py-3.5">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="label">Try a real document</span>
            <span className="text-micro text-txt-dim">
              {LIVE_ENABLED
                ? "one model call, held if it is not sure"
                : "this deploy has no key, so anything you paste is HELD, not guessed — that is the safety property"}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
            <input value={from} onChange={e => setFrom(e.target.value)} placeholder="sender@theircompany.com"
              className="px-2.5 py-2 rounded-lg bg-raised border border-line text-sm2 text-txt-hi
                         placeholder:text-txt-dim focus:outline-none focus:border-line2" />
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject line"
              className="px-2.5 py-2 rounded-lg bg-raised border border-line text-sm2 text-txt-hi
                         placeholder:text-txt-dim focus:outline-none focus:border-line2" />
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={4}
            placeholder={"Paste the body of a purchase order, invoice or enquiry exactly as it arrives — messy is fine.\nPO Number: 88213\nQuantity: 480 units\nUnit price: $12.40"}
            className="w-full px-2.5 py-2 rounded-lg bg-raised border border-line text-sm2 text-txt-hi
                       placeholder:text-txt-dim focus:outline-none focus:border-line2 font-mono" />
          <div className="flex items-center gap-3 mt-2">
            <button onClick={runOne} disabled={pasting || text.trim().length < 12}
              className="px-3.5 py-1.5 rounded-lg border border-acc-line bg-acc-soft text-acc text-sm2
                         font-medium hover:opacity-90 disabled:opacity-40 transition-opacity">
              {pasting ? "Running…" : "Run this one"}
            </button>
            {pasteMsg && <span className="text-micro text-txt-lo leading-snug">{pasteMsg}</span>}
            <span className="ml-auto text-micro font-mono text-txt-dim">
              {stats.liveDocs} kept{LIVE_ENABLED ? ` · ${stats.liveCalls} live calls` : ""}
            </span>
          </div>

          {liveRows.length > 0 && (
            <div className="mt-3 pt-3 border-t border-line space-y-1.5">
              {liveRows.map(({ id, p }) => {
                const def = DOC_TYPES[p?.type ?? "unclassified"];
                return (
                  <div key={id} className="flex items-center gap-2 text-sm2">
                    <span className="font-mono text-micro text-txt-dim tnum">{id}</span>
                    {p?.status === "committed" && def ? <TypeTag code={def.code} /> : null}
                    <span className="text-txt-mid truncate max-w-[280px]">{p?.doc.subject || "(no subject)"}</span>
                    <span className={`px-1.5 py-0.5 rounded border text-micro ${STATUS[p?.status ?? "queued"]}`}>
                      {p?.status}
                    </span>
                    <span className="text-micro text-txt-dim truncate">
                      {p?.status === "committed" ? `→ ${def?.destination}` :
                       p?.flags?.length ? p.flags.join(" · ") : p?.rejectReason ?? ""}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* queue */}
        <div className="card overflow-hidden">
          <div className="px-3 sm:px-4 py-2.5 border-b border-line flex items-center gap-1 overflow-x-auto">
            <span className="label mr-2 shrink-0">Queue</span>
            {FILTERS.map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`px-2.5 py-1 rounded-md text-xs2 shrink-0 transition-colors ${
                  filter === k ? "bg-hover text-txt-hi" : "text-txt-lo hover:text-txt-mid"}`}>
                {l}
              </button>
            ))}
            <span className="ml-auto text-micro font-mono text-txt-dim tnum shrink-0 pl-2">
              {rows.length}
            </span>
          </div>

          {/* desktop table */}
          <div className="hidden sm:block overflow-auto max-h-[460px]">
            <table className="w-full text-sm2">
              <thead className="sticky top-0 bg-surface z-10">
                <tr className="label border-b border-line">
                  <th className="text-left font-medium px-4 py-2 w-12">#</th>
                  <th className="text-left font-medium px-2 py-2 w-16">Type</th>
                  <th className="text-left font-medium px-2 py-2">Subject</th>
                  <th className="text-left font-medium px-2 py-2 w-20">Dest</th>
                  <th className="text-right font-medium px-2 py-2 w-16">ms</th>
                  <th className="text-left font-medium px-4 py-2 w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(d => {
                  const p = processed[d.id];
                  const st = activeId === d.id ? "running" : p?.status ?? "queued";
                  const def = DOC_TYPES[p?.type ?? "unclassified"];
                  return (
                    <tr key={d.id}
                      className={`border-b border-line/60 last:border-0 hover:bg-raised transition-colors
                        ${p?.status === "committed" ? "rowin" : ""}`}>
                      <td className="px-4 py-2 font-mono text-micro text-txt-dim tnum">{d.id}</td>
                      <td className="px-2 py-2">
                        {p ? <TypeTag code={def.code} /> : <span className="text-txt-dim">—</span>}
                      </td>
                      <td className="px-2 py-2 text-txt-mid truncate max-w-[300px] lg:max-w-[420px]">
                        {d.subject}
                        {p?.flags?.length ? (
                          <span className="ml-2 text-micro font-mono text-hold">{p.flags[0]}</span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 font-mono text-micro text-txt-lo">
                        {p?.status === "committed" ? def.destinationCode : "—"}
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-micro text-txt-dim tnum">
                        {p?.latencyMs ?? "—"}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-1.5 py-0.5 rounded border text-micro ${STATUS[st]}`}>
                          {st}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* mobile list */}
          <div className="sm:hidden divide-y divide-line max-h-[440px] overflow-auto">
            {rows.map(d => {
              const p = processed[d.id];
              const st = activeId === d.id ? "running" : p?.status ?? "queued";
              const def = DOC_TYPES[p?.type ?? "unclassified"];
              return (
                <div key={d.id} className="px-4 py-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    {p ? <TypeTag code={def.code} /> : null}
                    <span className={`ml-auto px-1.5 py-0.5 rounded border text-micro ${STATUS[st]}`}>
                      {st}
                    </span>
                  </div>
                  <div className="text-sm2 text-txt-mid leading-snug">{d.subject}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-micro text-txt-dim tnum">#{d.id}</span>
                    {p?.status === "committed" && (
                      <span className="font-mono text-micro text-txt-lo">{def.destinationCode}</span>
                    )}
                    {p?.flags?.length ? (
                      <span className="text-micro font-mono text-hold">{p.flags[0]}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* event log — collapsed by default so it stops competing for attention */}
        <div className="card overflow-hidden">
          <button onClick={() => setLogOpen(v => !v)}
            className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-raised transition-colors">
            <span className="label">Event stream</span>
            <span className="text-micro font-mono text-txt-dim tnum">{events.length}</span>
            <svg viewBox="0 0 12 12" fill="none"
                 className={`w-3 h-3 ml-auto text-txt-dim transition-transform ${logOpen ? "rotate-90" : ""}`}>
              <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {logOpen && (
            <div className="border-t border-line h-[240px]">
              <EventLog events={events} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
