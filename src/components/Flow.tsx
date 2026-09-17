"use client";

/*
  The one screen a buyer needs to understand the product: documents enter on the left, pass four
  gates, and land in the systems they already pay for. Every figure here is computed from the run
  that just happened — counts, attrition, holds, writes per destination — so the diagram is a
  readout, not an illustration. The animation only runs while a run is actually running.
*/

export interface FlowStep { id: string; label: string; value: number; hint: string }
export interface FlowDest { code: string; name: string; count: number }

export default function Flow({
  total, steps, held, running, active, destinations, onOpenHeld,
}: {
  total: number;
  steps: FlowStep[];
  held: number;
  running: boolean;
  active?: string | null;
  destinations: FlowDest[];
  onOpenHeld?: () => void;
}) {
  return (
    <section className="card-hero">
      <header className="flex items-center gap-2.5 px-4 sm:px-5 py-2.5 border-b border-line">
        <span className={`live-dot ${running ? "on" : ""}`} />
        <span className="label">{running ? "processing" : "watching intake"}</span>
        {active && (
          <span className="hidden sm:block text-micro font-mono text-txt-lo truncate max-w-[38ch] rise"
                key={active}>
            {active}
          </span>
        )}
        <span className="ml-auto text-micro font-mono text-txt-dim tnum shrink-0">
          {total} documents · {destinations.length} destinations
        </span>
      </header>

      <div className="relative px-4 sm:px-5 py-6 sm:py-7"
           style={{
             backgroundImage:
               "linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px)," +
               "linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)",
             backgroundSize: "34px 34px",
           }}>
        {running && <span className="sheen" />}

        <div className="flex items-center overflow-x-auto pb-1">
          {steps.map((s, i) => {
            const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
            const isWrite = i === steps.length - 1;
            return (
              <div key={s.id} className="flex items-center shrink-0">
                <div className={`node ${running ? "node-live" : ""} ${isWrite ? "!bg-acc-soft" : ""}`}>
                  <div className="label !text-[10px]">{s.label}</div>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className={`text-num font-semibold tnum leading-none ${
                      isWrite ? "text-acc" : s.value > 0 ? "text-txt-hi" : "text-txt-dim"}`}>
                      {s.value}
                    </span>
                    {total > 0 && (
                      <span className="text-micro font-mono text-txt-dim tnum">{pct}%</span>
                    )}
                  </div>
                  <div className="meter mt-2.5"><i style={{ width: `${pct}%` }} /></div>
                  <div className="text-micro text-txt-dim mt-1.5 font-mono truncate max-w-[92px]">
                    {s.hint}
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div className="rail">
                    {running && [0, 1].map(k => (
                      <span key={k} className="token"
                            style={{ animationDelay: `${i * 0.16 + k * 0.75}s` }} />
                    ))}
                    <svg viewBox="0 0 6 8" className="absolute -right-px top-1/2 -translate-y-1/2
                               text-line2" fill="none" aria-hidden>
                      <path d="M1 1l4 3-4 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-5 pt-4 border-t border-line grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-start">
          <div className="flex flex-wrap gap-2">
            {destinations.map(d => (
              <div key={d.code}
                className={`flex items-center gap-2.5 rounded-lg border bg-raised pl-2.5 pr-3 py-2 min-w-[188px]
                            ${d.count > 0 ? "border-acc-line" : "border-line"}`}>
                <span className="w-6 h-6 grid place-items-center rounded-md bg-surface border border-line2
                                 font-mono text-[10px] text-txt-mid shrink-0">{d.code}</span>
                <div className="min-w-0">
                  <div className="text-sm2 text-txt-hi truncate leading-tight">{d.name}</div>
                  <div className="text-micro text-txt-dim font-mono">
                    {d.count > 0 ? `${d.count} record${d.count === 1 ? "" : "s"} written` : "no records yet"}
                  </div>
                </div>
                {d.count > 0 && running && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-acc animate-pulse" />}
              </div>
            ))}
          </div>

          <button onClick={onOpenHeld}
            className={`group flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors
                        ${held > 0 ? "border-hold-line bg-hold-soft hover:bg-hold-soft/70"
                                    : "border-line bg-raised"}`}>
            <span className={`text-num2 font-semibold tnum leading-none ${held > 0 ? "text-hold" : "text-txt-dim"}`}>
              {held}
            </span>
            <span className="min-w-0">
              <span className="block label !text-[10px]">held for review</span>
              <span className="block text-micro text-txt-lo leading-snug">
                {held > 0 ? "nothing below the gate is written" : "queue is clear"}
              </span>
            </span>
            {held > 0 && (
              <span className="ml-1 text-micro font-medium text-hold opacity-70 group-hover:opacity-100
                               transition-opacity shrink-0">
                open →
              </span>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
