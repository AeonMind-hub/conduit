"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TypeTag } from "@/components/Pipeline";
import { PilotRoom } from "@/components/PilotRoom";
import Flow, { type FlowStep, type FlowDest } from "@/components/Flow";
import Hero from "@/components/Hero";
import EventLog from "@/components/EventLog";
import PageHead from "@/components/PageHead";
import Stat from "@/components/Stat";
import { DOCS } from "@/lib/corpus";
import { DOC_TYPES } from "@/lib/doctypes";
import { LIVE_ID_BASE } from "@/lib/session";
import { rates, pct } from "@/lib/types";
import type { Store } from "@/lib/types";
import { CLIENT_NAME, INTAKE_ADDRESS, engineLabel, LIVE_ENABLED, DAILY_VOLUME, DEMO_URL,
  SYSTEMS, systemName } from "@/lib/config";

const DEMO_REPO = DEMO_URL.includes("vercel.app")
  ? "https://github.com/AeonMind-hub/conduit" : DEMO_URL;

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

  const router = useRouter();
  const typeCount = Object.keys(stats.byType).filter(k => k !== "unclassified").length;
  const readable = stats.total - stats.discarded;

  /* Every figure on the canvas is a count from this run — attrition at each gate, holds at the
     gate that made them, records per destination. No decorative numbers. */
  const flowSteps: FlowStep[] = [
    { id: "ingest",   label: "Ingest",   value: stats.total,    hint: `${DOCS.length} in today's batch` },
    { id: "classify", label: "Classify", value: stats.total,    hint: `${typeCount} doc types matched` },
    { id: "extract",  label: "Extract",  value: readable,       hint: `${stats.fieldsAuto + stats.fieldsCorrected} fields read` },
    { id: "validate", label: "Validate", value: readable,       hint: `${stats.exceptions} below the gate` },
    { id: "route",    label: "Route",    value: stats.committed + stats.exceptions, hint: `${Object.keys(SYSTEMS).length} systems mapped` },
    { id: "commit",   label: "Write",    value: stats.committed, hint: "rows in their systems" },
  ];
  const destinations: FlowDest[] = Object.keys(SYSTEMS).map(code => ({
    code, name: systemName(code),
    count: store.records.filter(x => x.destination === code).length,
  }));
  const activeLabel = activeId === null ? null
    : (processed[activeId]?.doc?.subject ?? DOCS.find(d => d.id === activeId)?.subject ?? null);

  return (
    <div>
      <Hero
        client={CLIENT_NAME}
        steps={flowSteps}
        destinations={destinations}
        held={stats.exceptions}
        fieldsRead={stats.fieldsAuto + stats.fieldsCorrected}
        intake={INTAKE_ADDRESS}
        rates={{
          onReceived: pct(r.onReceived), onActionable: pct(r.onActionable),
          actionable: r.actionable, auto: r.auto, received: r.received,
        }}
      />

      <section id="console" className="sect mt-10 scroll-mt-4">
      <PageHead
        no="01"
        eyebrow="console"
        title="The run, line by line"
        meta={`${CLIENT_NAME} · ${DOCS.length} documents today · intake ${INTAKE_ADDRESS} · ${DAILY_VOLUME}/day expected · engine ${engineLabel()}`}
        actions={
          <>
            {stats.total > 0 && (
              <button onClick={reset} disabled={running} className="btn btn-ghost !py-1.5">
                Clear
              </button>
            )}
            <button onClick={replay} disabled={running} className="btn btn-ghost !py-1.5">
              {running ? "Processing…" : "Replay this run"}
            </button>
            <a href="#intake" className="btn btn-primary !py-1.5">
              Send it a document
            </a>
          </>
        }
      />

      <div className="space-y-4">
        <Flow
          total={stats.total}
          steps={flowSteps}
          held={stats.exceptions}
          running={running}
          active={activeLabel}
          destinations={destinations}
          onOpenHeld={() => router.push("/exceptions")}
        />

        {/* ── paste one of THEIR documents ─────────────────────────────── */}
        <div id="intake" className="card px-4 sm:px-5 py-4 scroll-mt-4">
          <div className="flex items-baseline gap-2.5 mb-3 flex-wrap">
            <span className="sect-no">02</span>
            <h2 className="text-[21px] leading-[26px] text-txt-hi">Send it a document</h2>
            <span className="chip !py-0.5">{INTAKE_ADDRESS} in production</span>
            <span className="text-micro text-txt-dim">
              {LIVE_ENABLED
                ? "one model call per document · held the moment it is not sure"
                : "no model on this deployment, so pasted documents are held for a human, never guessed"}
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
          <textarea value={text} onChange={e => setText(e.target.value)} rows={5}
            placeholder={"Paste the body of a purchase order, invoice or enquiry exactly as it arrives — messy is fine.\nPO Number: 88213\nQuantity: 480 units\nUnit price: $12.40"}
            className="w-full px-2.5 py-2 rounded-lg bg-raised border border-line text-sm2 text-txt-hi
                       placeholder:text-txt-dim focus:outline-none focus:border-line2 font-mono" />
          <div className="flex items-center gap-3 mt-2">
            <button onClick={runOne} disabled={pasting || text.trim().length < 12}
              className="btn btn-primary">
              {pasting ? "Reading it…" : "Run this one"}
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

        <PilotRoom />

        <div className="flex items-baseline gap-2.5 mb-2 mt-1">
          <span className="sect-no">03</span>
          <span className="label">the counts</span>
          <span className="text-micro text-txt-dim ml-1">both denominators, always on the same line</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6">          <Stat label="Processed" value={stats.total} unit={`of ${DOCS.length}`}
                sub={`received today · ${stats.liveDocs} from this session`} />
          <Stat label="Committed" value={stats.committed} tone="acc"
                sub={stats.total
                  ? `${pct(r.onReceived)} of everything received · ${pct(r.onActionable)} of ${r.actionable} actionable`
                  : "—"} />
          <Stat label="Held" value={stats.exceptions} tone="hold" unit="in queue"
                sub="waiting on a human · nothing written" />
          <Stat label="Discarded" value={stats.discarded} tone="dim" unit="noise"
                sub="no transactional content · nothing written" />
                </div>

        {stats.exceptions > 0 && (
          <Link href="/exceptions"
            className="flex items-baseline gap-3 px-3 py-2.5 bg-hold-soft hover:bg-hover transition-colors"
            style={{ boxShadow: "inset 2px 0 0 var(--amber)" }}>
            <span className="sect-no">04</span>
            <span className="fig text-num text-hold leading-none">{stats.exceptions}</span>
            <span className="text-sm2 text-txt-hi">documents need review</span>
            <span className="ml-auto font-mono text-micro text-hold">open →</span>
          </Link>
        )}

        {/* queue */}
        <div className="card overflow-hidden">
          <div className="px-3 sm:px-4 py-2.5 border-b border-line flex items-center gap-1 overflow-x-auto">
            <span className="label mr-2 shrink-0">05 · the queue</span>
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
                        ${activeId === d.id ? "rowin" : ""}`}>
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
            <span className="label">06 · event stream</span>
            {/* A seeded run has nothing streamed yet. "0" reads as a fault; say what it is. */}
            <span className="text-micro font-mono text-txt-dim tnum">
              {events.length ? events.length : store.seeded ? "empty until replay" : "0"}
            </span>
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

      <div className="inkband mt-12 px-5 sm:px-8 py-7 flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="min-w-0">
          <div className="eyebrow mb-2.5">07 · terms</div>
          <h2 className="text-[26px] leading-[32px]" style={{ color: "var(--paper)" }}>The only number worth trusting is yours</h2>
          <p className="text-xs2 text-txt-lo mt-1.5 leading-relaxed max-w-[62ch]">
            Send 50 documents from your real inbox. They go through the same gates you just watched —
            the same 85% field gate, the same hold queue — and come back as rows, with the accuracy
            figure for your mix and every held item explained. Until that number is good, nothing is
            written anywhere.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
          <a href="#intake" className="btn btn-primary">Start with one document</a>
          <a href={DEMO_REPO} target="_blank" rel="noreferrer" className="btn btn-ghost">How it works</a>
        </div>
      </div>
      </section>
    </div>
  );
}
