"use client";

/*
  The readout: one sheet, six ruled lines, one number per line.

  Console mode is the full ledger — every stage, how many documents were still standing after it,
  the share of the batch as a ruled fill, and what changed there. Hero mode is the same rows in a
  tighter measure that sits beside a headline without turning into a horizontal scroll.

  Both are counts from the run that just happened. Nothing here animates unless a run is in flight:
  a moving element on an idle system is the detail a technical prospect notices, and it costs every
  other number on the page its credibility.
*/

import type { ReactNode } from "react";

export interface FlowStep { id: string; label: string; value: number; hint: string }
export interface FlowDest { code: string; name: string; count: number }

interface Props {
  total: number;
  steps: FlowStep[];
  held: number;
  running: boolean;
  active?: string | null;
  destinations: FlowDest[];
  onOpenHeld?: () => void;
  /** tighter measure, no fill bars — for the landing sheet */
  ambient?: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");

function Row({ s, no, pct, write, active, delay, compact, last, dropped }: {
  s: FlowStep; no: number; pct: number; write: boolean; active: boolean;
  delay: number; compact: boolean; last: boolean; dropped?: boolean;
}) {
  return (
    <div className={`grid grid-cols-[24px_1fr_auto] gap-x-3 items-center px-2.5 ${
                     compact ? "py-1.5" : "py-2.5"} ${active ? "node-live" : ""}`}
         style={{ animationDelay: `${delay}ms` }}>
      <span className="sect-no">{pad(no)}</span>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className={`text-sm2 ${last ? "text-acc font-medium" : "text-txt-hi"}`}>{s.label}</span>
          <span className="text-xs2 font-mono text-txt-lo truncate">{s.hint}</span>
        </div>
        {!compact && (
          <div className={`meter mt-2 ${dropped ? "hold" : ""} ${write ? "write" : ""}`}>
            <i style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <span className={`fig leading-none ${compact ? "text-num" : "text-num"}`}>{s.value}</span>
        <span className="ml-1.5 font-mono text-micro text-txt-dim tnum">{pct}%</span>
      </div>
    </div>
  );
}

export default function Flow({
  total, steps, held, running, active, destinations, onOpenHeld, ambient = false,
}: Props) {
  const pctOf = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  const last = steps.length - 1;

  const ledger: ReactNode = (
    <div className="ledger border-t-0 divide-y divide-line">
      {steps.map((s, i) => (
        <Row key={s.id} s={s} no={i + 1} pct={pctOf(s.value)} write={i === last}
             active={running && !ambient} delay={i * 45} compact={ambient} last={i === last}
             dropped={i > 0 && steps[i - 1].value > s.value} />
      ))}
    </div>
  );

  const destTable: ReactNode = (
    <div className={`grid grid-cols-1 sm:grid-cols-2 border-t border-line ${
      ambient ? "" : "xl:grid-cols-4"}`}>
      {destinations.map((d, i) => (
        <div key={d.code}
             className={`flex items-center gap-2.5 px-2.5 py-2 min-w-0 ${
               i < destinations.length - 1 ? "border-b border-line" : ""} ${
               !ambient && i < destinations.length - 1 ? "xl:border-b-0 xl:border-r" : ""}`}>
          <span className="w-6 h-6 grid place-items-center border border-line2 font-mono text-[10px]
                           text-txt-mid shrink-0">{d.code}</span>
          <span className="text-sm2 text-txt-hi truncate min-w-0 flex-1">{d.name}</span>
          <span className={`fig text-num ${d.count > 0 ? "text-acc" : "text-txt-dim"}`}>{d.count}</span>
        </div>
      ))}
    </div>
  );

  const heldRow: ReactNode = (
    <button onClick={onOpenHeld}
      className="w-full flex items-center gap-3 px-2.5 py-2.5 text-left bg-hold-soft border-t border-line
                 hover:bg-hover transition-colors group">
      <span className={`fig leading-none ${held > 0 ? "text-hold" : "text-txt-dim"} text-num2`}>{held}</span>
      <span className="min-w-0">
        <span className="label block">held for review</span>
        <span className="block text-xs2 text-txt-lo mt-0.5">
          {held > 0 ? "the gate is what makes the rest trustworthy" : "queue is clear"}
        </span>
      </span>
      {held > 0 && !ambient && (
        <span className="ml-auto font-mono text-micro text-hold shrink-0 group-hover:underline">open →</span>
      )}
    </button>
  );

  return (
    <section className={`card-hero ${ambient ? "" : "shadow-press"}`}>
      <header className="flex items-center gap-2.5 px-3 py-2 hairline-b bg-raised">
        <span className={`live-dot ${running ? "on" : ""}`} />
        <span className="label">{running ? "processing" : "last completed run"}</span>
        {active && (
          <span className="hidden sm:block text-micro font-mono text-txt-lo truncate max-w-[30ch] rise"
                key={active}>{active}</span>
        )}
        <span className="ml-auto text-micro font-mono text-txt-dim tnum shrink-0">
          {total} documents · {destinations.length} destinations
        </span>
      </header>

      <div className="relative">
        {running && <span className="feed" />}
        {ledger}
        {destTable}
        {heldRow}
      </div>
    </section>
  );
}
