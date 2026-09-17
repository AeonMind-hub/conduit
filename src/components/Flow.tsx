"use client";

/*
  The readout, in two densities.

  Console mode is the wide left-to-right pipeline: six gates, the count that survived each, the
  percentage of the batch, and why it changed there. Hero mode is the same data in a compact grid
  that fits beside a headline without turning into a horizontal scroll.

  Both are computed from the run that just happened. Ambient mode — used on the landing face —
  animates the numbers once on arrival and then stops; nothing here pretends to be live traffic
  when nothing is arriving, because a prospect who spots a fake pulse stops trusting the counts.
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
  /** compact grid + one-shot intro animation, for the landing face */
  ambient?: boolean;
}

function Node({ s, pct, live, write, delay, compact }: {
  s: FlowStep; pct: number; live: boolean; write: boolean; delay: number; compact: boolean;
}) {
  return (
    <div className={`node ${compact ? "w-full" : ""} ${live ? "node-live" : ""} ${write ? "node-write" : ""} rise`}
         style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-num tnum leading-none font-semibold ${write ? "text-acc" : "text-txt-hi"}`}>
          {s.value}
        </span>
        <span className="text-micro font-mono text-txt-dim tnum">{pct}%</span>
      </div>
      <div className="label mt-2 !text-[10px]">{s.label}</div>
      {!compact && <div className="meter mt-2"><i style={{ width: `${pct}%` }} /></div>}
      <div className="text-micro text-txt-dim mt-1.5 font-mono truncate">{s.hint}</div>
    </div>
  );
}

export default function Flow({
  total, steps, held, running, active, destinations, onOpenHeld, ambient = false,
}: Props) {
  const pctOf = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  /* Ambient mode animates the numbers in once. It does not fake a pulse: a perpetual glow on an
     idle system is the kind of detail a technical prospect notices, and it costs every other number
     on the page their trust. */
  const live = running;
  const last = steps.length - 1;

  const flowRow: ReactNode = ambient ? (
    <div className="grid grid-cols-3 gap-2">
      {steps.map((s, i) => (
        <Node key={s.id} s={s} pct={pctOf(s.value)} live={live && i === last}
              write={i === last} delay={i * 55} compact />
      ))}
    </div>
  ) : (
    <div className="flex items-center overflow-x-auto pb-1">
      {steps.map((s, i) => (
        <div key={s.id} className="flex items-center shrink-0">
          <Node s={s} pct={pctOf(s.value)} live={live} write={i === last} delay={i * 55} compact={false} />
          {i < last && (
            <div className="rail">
              {live && [0, 1].map(k => (
                <span key={k} className="token" style={{ animationDelay: `${i * 0.16 + k * 0.75}s` }} />
              ))}
              <svg viewBox="0 0 6 8" className="absolute -right-px top-1/2 -translate-y-1/2 text-line2"
                   fill="none" aria-hidden>
                <path d="M1 1l4 3-4 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <section className={`card-hero ${ambient ? "shadow-none" : ""}`}>
      <header className="flex items-center gap-2.5 px-4 sm:px-5 py-2.5 hairline-b">
        <span className={`live-dot ${running ? "on" : ""}`} />
        <span className="label">{running ? "processing" : ambient ? "last completed run" : "watching intake"}</span>
        {active && (
          <span className="hidden sm:block text-micro font-mono text-txt-lo truncate max-w-[34ch] rise"
                key={active}>{active}</span>
        )}
        <span className="ml-auto text-micro font-mono text-txt-dim tnum shrink-0">
          {total} documents · {destinations.length} destinations
        </span>
      </header>

      <div className="relative px-4 sm:px-5 py-5 sm:py-6"
           style={{
             backgroundImage:
               "linear-gradient(rgba(255,255,255,0.021) 1px, transparent 1px)," +
               "linear-gradient(90deg, rgba(255,255,255,0.021) 1px, transparent 1px)",
             backgroundSize: "34px 34px",
           }}>
        {running && <span className="sheen" />}
        {flowRow}

        <div className={`mt-5 pt-4 border-t border-line grid gap-3 items-start ${
          ambient ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-[1fr_auto]"}`}>
          <div className={`grid gap-2 ${ambient ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"}`}>
            {destinations.map(d => (
              <div key={d.code}
                className={`flex items-center gap-2.5 rounded-xl border bg-raised pl-2.5 pr-3 py-2 min-w-0
                            ${d.count > 0 ? "border-acc-line" : "border-line"}`}>
                <span className="w-6 h-6 grid place-items-center rounded-lg bg-surface border border-line2
                                 font-mono text-[10px] text-txt-mid shrink-0">{d.code}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm2 text-txt-hi truncate leading-tight">{d.name}</div>
                  <div className="text-micro text-txt-dim font-mono truncate">
                    {d.count > 0 ? `${d.count} records` : "nothing yet"}
                  </div>
                </div>
                {d.count > 0 && (
                  <span className="ml-auto text-sm2 font-semibold tnum text-acc shrink-0">{d.count}</span>
                )}
              </div>
            ))}
          </div>

          <button onClick={onOpenHeld}
            className={`group flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors
                        ${held > 0 ? "border-hold-line bg-hold-soft hover:bg-hold-soft/70" : "border-line bg-raised"}`}>
            <span className={`text-num2 font-semibold tnum leading-none ${held > 0 ? "text-hold" : "text-txt-dim"}`}>
              {held}
            </span>
            <span className="min-w-0">
              <span className="block label !text-[10px]">held for review</span>
              <span className="block text-micro text-txt-lo leading-snug">
                {held > 0 ? "the gate is what makes the rest trustworthy" : "queue is clear"}
              </span>
            </span>
            {held > 0 && !ambient && (
              <span className="ml-1 text-micro font-medium text-hold opacity-70 group-hover:opacity-100
                               transition-opacity shrink-0">open →</span>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
