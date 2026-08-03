"use client";

import { useMemo, useState } from "react";
import { TypeTag } from "@/components/Pipeline";
import PageHead from "@/components/PageHead";
import { DOC_TYPES } from "@/lib/doctypes";
import { THRESHOLD } from "@/lib/types";
import type { CommittedRecord, Store } from "@/lib/types";

const KIND: Record<string, { label: string; icon: string }> = {
  write:  { label: "Wrote",    icon: "M4 5h16M4 10h16M4 15h10" },
  email:  { label: "Emailed",  icon: "M3 7l9 6 9-6M3 7v10h18V7" },
  notify: { label: "Notified", icon: "M12 5a5 5 0 0 0-5 5v4l-2 2h14l-2-2v-4a5 5 0 0 0-5-5Zm0 15a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2Z" },
};

export default function RecordsClient({ initial }: { initial: Store }) {
  const [store] = useState(initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const records = store.records;
  const rows = useMemo(
    () => filter === "all" ? records : records.filter(r => r.type === filter),
    [records, filter]
  );
  const rec = records.find(r => r.id === openId) ?? null;
  const def = rec ? DOC_TYPES[rec.type] : null;

  if (records.length === 0) {
    return (
      <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto">
        <PageHead title="Records" meta="committed to your systems" />
        <div className="card py-16 text-center">
          <p className="text-sm2 text-txt-lo">Nothing committed yet.</p>
          <p className="text-xs2 text-txt-dim mt-1">Run the pipeline from Operations.</p>
        </div>
      </div>
    );
  }

  const list = (
    <div className="card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-line flex items-center gap-1 overflow-x-auto">
        <span className="label mr-1 shrink-0">Committed</span>
        {[["all","All"],["purchase_order","PO"],["supplier_invoice","INV"],
          ["delivery_booking","BKG"],["quote_request","RFQ"]].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-2.5 py-1 rounded-md text-xs2 shrink-0 transition-colors ${
              filter === k ? "bg-hover text-txt-hi" : "text-txt-lo hover:text-txt-mid"}`}>
            {l}
          </button>
        ))}
        <span className="ml-auto text-micro font-mono text-txt-dim tnum shrink-0 pl-2">{rows.length}</span>
      </div>
      <div className="divide-y divide-line max-h-[calc(100vh-260px)] overflow-auto">
        {rows.map(r => {
          const d = DOC_TYPES[r.type];
          const on = r.id === openId;
          const primary = d.fields.filter(f => f.required).slice(0, 2)
            .map(f => r.cells[f.key]).filter(Boolean).join(" · ");
          return (
            <button key={r.id} onClick={() => setOpenId(r.id)}
              className={`w-full text-left px-4 py-3 transition-colors ${
                on ? "bg-hover" : "hover:bg-raised"}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <TypeTag code={d.code} />
                <span className="font-mono text-micro text-acc">{r.ref}</span>
                <span className={`ml-auto text-micro px-1.5 py-0.5 rounded border ${
                  r.auto ? "text-acc border-acc-line bg-acc-soft"
                         : "text-hold border-hold-line bg-hold-soft"}`}>
                  {r.auto ? "auto" : `${r.correctedFields.length} fixed`}
                </span>
              </div>
              <div className="text-sm2 text-txt-hi truncate">{primary || "—"}</div>
              <div className="text-micro text-txt-dim mt-1">
                {r.actions.length} action{r.actions.length === 1 ? "" : "s"} · {d.destination}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const detail = rec && def ? (
    <div className="card flex flex-col min-h-0 overflow-hidden h-full">
      <div className="px-4 py-2.5 border-b border-line flex items-center gap-2 shrink-0">
        <button onClick={() => setOpenId(null)}
          className="lg:hidden -ml-1 mr-1 p-1 text-txt-lo hover:text-txt-hi">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <TypeTag code={def.code} />
        <span className="font-mono text-sm2 text-acc">{rec.ref}</span>
        <span className="ml-auto text-micro text-txt-dim">
          {new Date(rec.committedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <div className="flex-1 overflow-auto min-h-0 p-4 space-y-4">
        {/* what it did — the answer to "what did it send on my behalf" */}
        <div>
          <div className="label mb-2">Actions taken</div>
          <div className="space-y-2">
            {rec.actions.map((a, i) => (
              <div key={i} className="rounded-lg border border-line bg-raised overflow-hidden">
                <div className="px-3 py-2 flex items-center gap-2.5">
                  <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 text-acc shrink-0"
                       stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d={KIND[a.kind].icon} />
                  </svg>
                  <span className="text-micro text-txt-dim shrink-0">{KIND[a.kind].label}</span>
                  <span className="text-sm2 text-txt-hi truncate">{a.summary}</span>
                </div>
                <div className="px-3 pb-2 -mt-0.5">
                  <div className="text-micro text-txt-dim mb-1.5">→ {a.target}</div>
                  {a.detail && (
                    <pre className="text-xs2 leading-relaxed text-txt-mid whitespace-pre-wrap
                                    font-mono bg-bg rounded-md p-2.5 border border-line">
{a.detail}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* the data written, with confidence at commit time */}
        <div>
          <div className="label mb-2">Data written to {def.destination}</div>
          <div className="rounded-lg border border-line overflow-hidden">
            {def.fields.map((f, i) => {
              const v = rec.cells[f.key];
              const c = rec.confidence?.[f.key] ?? 1;
              const fixed = rec.correctedFields.includes(f.key);
              return (
                <div key={f.key}
                  className={`flex items-start gap-3 px-3 py-2 ${i ? "border-t border-line" : ""}`}>
                  <span className="text-micro text-txt-dim w-24 sm:w-28 shrink-0 pt-0.5">{f.label}</span>
                  <span className="text-sm2 text-txt-hi flex-1 break-words">{v || "—"}</span>
                  {fixed ? (
                    <span className="text-micro px-1.5 py-0.5 rounded border border-hold-line
                                     bg-hold-soft text-hold shrink-0">edited</span>
                  ) : (
                    <span className={`text-micro font-mono tnum shrink-0 ${
                      c >= THRESHOLD ? "text-txt-dim" : "text-hold"}`}>
                      {Math.round(c * 100)}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* provenance */}
        <div className="rounded-lg border border-line bg-raised px-3 py-2.5 space-y-1">
          <div className="label mb-1.5">Audit</div>
          {[
            ["Source", `document #${rec.sourceDocId}`],
            ["Committed", new Date(rec.committedAt).toLocaleString()],
            ["Route", rec.auto ? "automatic — no human review" : `human review · ${rec.correctedFields.length} field(s) corrected`],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-3 text-micro">
              <span className="text-txt-dim w-20 shrink-0">{k}</span>
              <span className="text-txt-mid">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  ) : (
    <div className="card h-full grid place-items-center py-20">
      <p className="text-sm2 text-txt-lo">Select a record to see what the system did</p>
    </div>
  );

  return (
    <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto lg:h-[calc(100vh-2.5rem)] lg:flex lg:flex-col">
      <PageHead title="Records"
        meta={`${records.length} committed across 4 systems · click any record to see what it did`} />
      <div className={`lg:grid lg:grid-cols-[340px_1fr] lg:gap-4 lg:flex-1 lg:min-h-0
                       ${openId !== null ? "hidden lg:grid" : ""}`}>
        {list}
        <div className="hidden lg:block min-h-0">{detail}</div>
      </div>
      {openId !== null && <div className="lg:hidden fadein">{detail}</div>}
    </div>
  );
}
