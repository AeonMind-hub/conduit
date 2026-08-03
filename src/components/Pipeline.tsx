"use client";

import { STAGES } from "@/lib/types";
import type { Stage } from "@/lib/types";

/** Monochrome type tag. Categories are text, not colour — colour means status. */
export function TypeTag({ code }: { code: string }) {
  return (
    <span className="inline-block px-1.5 py-0.5 rounded border border-line2 bg-raised
                     text-micro font-mono text-txt-mid tracking-wide">
      {code}
    </span>
  );
}

export default function Pipeline({
  counts, running,
}: { counts: Partial<Record<Stage, number>>; running: boolean }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line">
        <span className="label">Pipeline</span>
        <span className={`ml-auto flex items-center gap-1.5 text-micro font-mono ${
          running ? "text-acc" : "text-txt-dim"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${running ? "bg-acc" : "bg-line2"}`} />
          {running ? "running" : "idle"}
        </span>
      </div>

      {/* horizontal scroll on mobile rather than wrapping into a mess */}
      <div className="flex items-center gap-0 px-4 py-3.5 overflow-x-auto">
        {STAGES.map((s, i) => {
          const n = counts[s.id] ?? 0;
          return (
            <div key={s.id} className="flex items-center shrink-0">
              <div className="w-[88px] sm:w-[104px]">
                <div className="text-micro text-txt-dim mb-1">{s.label}</div>
                <div className={`text-lg font-semibold tnum leading-none ${
                  n > 0 ? "text-txt-hi" : "text-txt-dim"}`}>{n}</div>
              </div>
              {i < STAGES.length - 1 && (
                <div className="w-6 h-px bg-line2 relative overflow-hidden mr-1">
                  {running && (
                    <span className="absolute top-1/2 -translate-y-1/2 left-0 w-1 h-1 rounded-full bg-acc flow"
                          style={{ animationDelay: `${i * 0.14}s` }} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
