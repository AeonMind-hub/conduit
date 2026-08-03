"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TypeTag } from "@/components/Pipeline";
import PageHead from "@/components/PageHead";
import { DOC_TYPES } from "@/lib/doctypes";
import { THRESHOLD, CLASSIFY_THRESHOLD } from "@/lib/types";
import type { Extraction, ProcessedDoc, Store } from "@/lib/types";

function Bar({ v }: { v: number }) {
  const pct = Math.round(v * 100);
  const tone = v >= THRESHOLD ? "bg-acc" : v > 0 ? "bg-hold" : "bg-stop";
  const text = v >= THRESHOLD ? "text-acc" : v > 0 ? "text-hold" : "text-stop";
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <div className="w-10 h-[3px] rounded-full bg-line2 overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-micro font-mono tnum w-7 text-right ${text}`}>{pct}%</span>
    </div>
  );
}

export default function ExceptionsClient({ initial }: { initial: Store }) {
  const [store, setStore] = useState(initial);
  const [openId, setOpenId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Extraction | null>(null);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [showOk, setShowOk] = useState(false);
  const pane = useRef<HTMLDivElement>(null);

  const queue = useMemo(
    () => Object.values(store.processed)
      .filter((p): p is ProcessedDoc => p.status === "exception")
      .sort((a, b) => a.doc.id - b.doc.id),
    [store]
  );

  const cur = queue.find(q => q.doc.id === openId) ?? null;
  const ex = draft ?? cur?.extraction ?? null;
  const def = cur ? DOC_TYPES[cur.type] : null;

  useEffect(() => {
    setDraft(null); setTouched(new Set()); setShowOk(false);
    pane.current?.scrollTo({ top: 0 });
  }, [openId]);

  const blocking = useMemo(
    () => ex && def ? def.fields.filter(f => f.required && (ex.confidence[f.key] ?? 0) < THRESHOLD) : [],
    [ex, def]
  );
  const optional = useMemo(
    () => ex && def ? def.fields.filter(f => !f.required && (ex.confidence[f.key] ?? 0) < THRESHOLD) : [],
    [ex, def]
  );
  const confident = useMemo(
    () => ex && def ? def.fields.filter(f => (ex.confidence[f.key] ?? 0) >= THRESHOLD) : [],
    [ex, def]
  );

  const submit = useCallback(async (action: "approve" | "discard") => {
    if (!cur || !ex || saving) return;
    setSaving(true);
    const res = await fetch("/api/records", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ docId: cur.doc.id, extraction: ex, correctedFields: [...touched], action }),
    });
    const json = await res.json();
    if (json.store) setStore(json.store);
    setSaving(false);
    const rest = Object.values(json.store.processed)
      .filter((p) => (p as ProcessedDoc).status === "exception")
      .map(p => (p as ProcessedDoc).doc.id)
      .filter(id => id !== cur.doc.id);
    setOpenId(rest[0] ?? null);
  }, [cur, ex, touched, saving]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (!cur) return;
      if (e.key === "a" || e.key === "A") { e.preventDefault(); submit("approve"); }
      if (e.key === "Escape") setOpenId(null);
      const i = queue.findIndex(q => q.doc.id === cur.doc.id);
      if (e.key === "j" || e.key === "J") setOpenId(queue[Math.min(i + 1, queue.length - 1)]?.doc.id ?? null);
      if (e.key === "k" || e.key === "K") setOpenId(queue[Math.max(i - 1, 0)]?.doc.id ?? null);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [submit, queue, cur]);

  /* ── empty ─────────────────────────────────────────────── */
  if (queue.length === 0) {
    return (
      <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto">
        <PageHead title="Held" meta="documents the system would not commit on its own" />
        <div className="card py-16 text-center">
          <div className="w-11 h-11 rounded-xl2 bg-acc-soft border border-acc-line grid place-items-center mx-auto mb-4">
            <svg className="w-5 h-5 text-acc" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.2"
                    strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-sm2 text-txt-hi mb-1">Nothing held</p>
          <p className="text-xs2 text-txt-lo">
            {store.stats.autoCommitted} of {store.stats.autoCommitted + store.stats.exceptions} committed automatically.
          </p>
        </div>
      </div>
    );
  }

  /* ── list ──────────────────────────────────────────────── */
  const list = (
    <div className="card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-line flex items-center gap-2">
        <span className="label">Queue</span>
        <span className="ml-auto text-micro font-mono text-txt-dim tnum">{queue.length}</span>
      </div>
      <div className="divide-y divide-line max-h-[calc(100vh-260px)] overflow-auto">
        {queue.map(p => {
          const d = DOC_TYPES[p.type];
          const on = p.doc.id === openId;
          return (
            <button key={p.doc.id} onClick={() => setOpenId(p.doc.id)}
              className={`w-full text-left px-4 py-3 transition-colors ${
                on ? "bg-hover" : "hover:bg-raised"}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <TypeTag code={d.code} />
                <span className="text-micro text-txt-dim">#{p.doc.id}</span>
                {on && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-acc" />}
              </div>
              <div className="text-sm2 text-txt-hi truncate mb-1">{p.doc.subject}</div>
              <div className="text-micro text-txt-lo truncate mb-1.5">{p.doc.from}</div>
              <div className="flex flex-wrap gap-1">
                {p.flags.slice(0, 2).map(f => (
                  <span key={f} className="text-micro font-mono px-1.5 py-0.5 rounded
                                           border border-hold-line bg-hold-soft text-hold">
                    {f}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  /* ── detail ────────────────────────────────────────────── */
  const detail = cur && ex && def ? (
    <div className="card flex flex-col min-h-0 overflow-hidden h-full">
      <div className="px-4 py-2.5 border-b border-line flex items-center gap-2 shrink-0">
        <button onClick={() => setOpenId(null)}
          className="lg:hidden -ml-1 mr-1 p-1 text-txt-lo hover:text-txt-hi">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <TypeTag code={def.code} />
        <span className="text-sm2 text-txt-hi truncate">{def.label}</span>
        <span className="ml-auto text-micro font-mono text-txt-dim tnum shrink-0">
          {blocking.length} blocking
        </span>
      </div>

      <div ref={pane} className="flex-1 overflow-auto min-h-0">
        {/* source */}
        <div className="px-4 py-3 border-b border-line">
          <div className="label mb-2">Source</div>
          <div className="text-micro font-mono text-txt-lo mb-2 space-y-0.5">
            <div className="truncate">from {cur.doc.from}</div>
            <div className="truncate">subj {cur.doc.subject}</div>
          </div>
          <pre className="text-xs2 leading-relaxed text-txt-lo whitespace-pre-wrap font-mono
                          max-h-[180px] overflow-auto bg-bg rounded-lg p-3 border border-line">
            {cur.doc.body}
          </pre>
        </div>

        <div className="p-4 space-y-3">
          {ex.typeConfidence < CLASSIFY_THRESHOLD && (
            <div className="rounded-lg border border-stop-line bg-stop-soft px-3 py-2.5">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-micro font-mono text-stop">AMBIGUOUS_TYPE</span>
                <Bar v={ex.typeConfidence} />
              </div>
              <p className="text-micro text-txt-mid leading-relaxed">
                Classified as {def.label} at {(ex.typeConfidence * 100).toFixed(0)}% — below the{" "}
                {CLASSIFY_THRESHOLD * 100}% routing threshold. Escalated rather than sent to the wrong system.
              </p>
            </div>
          )}

          {ex.notes && (
            <div className="rounded-lg bg-raised border border-line px-3 py-2.5">
              <p className="text-micro text-txt-mid leading-relaxed">{ex.notes}</p>
            </div>
          )}

          {blocking.length > 0 && (
            <div className="space-y-2">
              <div className="label text-hold">Blocking — required before commit</div>
              {blocking.map((f, i) => {
                const c = ex.confidence[f.key] ?? 0;
                const missing = c === 0;
                return (
                  <div key={f.key} className={`rounded-lg border px-3 py-2.5 ${
                    missing ? "border-stop-line bg-stop-soft" : "border-hold-line bg-hold-soft"}`}>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-micro font-medium ${missing ? "text-stop" : "text-hold"}`}>
                        {f.label}
                      </span>
                      <Bar v={c} />
                      <span className="text-micro text-txt-dim italic ml-auto truncate max-w-[170px]">
                        {ex.reasons?.[f.key] ?? (missing ? "absent from document" : "low confidence")}
                      </span>
                    </div>
                    <input
                      type={f.type === "date" ? "date" : "text"}
                      value={ex.values[f.key] ?? ""}
                      autoFocus={i === 0}
                      placeholder={missing ? "not in document — enter manually" : ""}
                      onChange={e => {
                        setDraft({ ...ex, values: { ...ex.values, [f.key]: e.target.value } });
                        setTouched(t => new Set(t).add(f.key));
                      }}
                      className={`w-full bg-bg border rounded-md px-2.5 py-2 text-sm2 text-txt-hi
                        placeholder:text-txt-dim focus:outline-none focus:ring-2 ${
                        missing ? "border-stop-line focus:ring-stop/30" : "border-hold-line focus:ring-hold/30"}`}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {optional.length > 0 && (
            <div className="rounded-lg border border-line bg-raised px-3 py-2">
              <p className="text-micro text-txt-dim">
                {optional.length} optional field{optional.length > 1 ? "s" : ""} not stated — not required to commit
              </p>
            </div>
          )}

          {confident.length > 0 && (
            <div>
              <button onClick={() => setShowOk(v => !v)}
                className="w-full flex items-center gap-1.5 py-1 label hover:text-txt-mid">
                <svg className={`w-2.5 h-2.5 transition-transform ${showOk ? "rotate-90" : ""}`}
                     viewBox="0 0 12 12" fill="none">
                  <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5"
                        strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Verified ({confident.length})
              </button>
              {showOk && (
                <div className="mt-1.5 space-y-px">
                  {confident.map(f => (
                    <div key={f.key} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-raised">
                      <span className="text-micro text-txt-dim w-24 shrink-0 truncate">{f.label}</span>
                      <span className="text-xs2 text-txt-mid flex-1 truncate">
                        {ex.values[f.key] || "—"}
                      </span>
                      <Bar v={ex.confidence[f.key] ?? 0} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-3 border-t border-line flex items-center gap-2 shrink-0 bg-surface">
        <button onClick={() => submit("approve")} disabled={saving}
          className="flex-1 bg-acc text-bg font-medium text-sm2 px-4 py-2 rounded-lg
                     hover:opacity-90 disabled:opacity-50 transition-opacity">
          {saving ? "Committing…" : touched.size
            ? `Commit with ${touched.size} correction${touched.size > 1 ? "s" : ""}`
            : `Commit to ${def.destinationCode}`}
        </button>
        <button onClick={() => submit("discard")} disabled={saving}
          className="px-3 py-2 rounded-lg border border-line2 text-txt-lo text-sm2
                     hover:text-stop hover:border-stop-line transition-colors">
          Discard
        </button>
      </div>
    </div>
  ) : (
    <div className="card h-full grid place-items-center py-20">
      <p className="text-sm2 text-txt-lo">Select a document to review</p>
    </div>
  );

  return (
    <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto lg:h-[calc(100vh-2.5rem)] lg:flex lg:flex-col">
      <PageHead title="Held"
        meta={`${queue.length} waiting · ${store.stats.autoCommitted} committed automatically`}
        actions={
          <span className="hidden lg:flex items-center gap-1.5 text-micro font-mono text-txt-dim">
            <kbd className="px-1.5 py-0.5 rounded bg-raised border border-line2">A</kbd>commit
            <kbd className="px-1.5 py-0.5 rounded bg-raised border border-line2 ml-1">J</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-raised border border-line2">K</kbd>
          </span>
        } />

      {/* mobile: list OR detail. desktop: both side by side */}
      <div className={`lg:grid lg:grid-cols-[320px_1fr] lg:gap-4 lg:flex-1 lg:min-h-0
                       ${openId !== null ? "hidden lg:grid" : ""}`}>
        {list}
        <div className="hidden lg:block min-h-0">{detail}</div>
      </div>

      {openId !== null && (
        <div className="lg:hidden fadein">{detail}</div>
      )}
    </div>
  );
}
