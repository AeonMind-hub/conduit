"use client";

import { useEffect, useRef } from "react";
import type { Event } from "@/lib/types";

const DOT: Record<string, string> = {
  info: "bg-line2", ok: "bg-acc", warn: "bg-hold", error: "bg-stop",
};
const TXT: Record<string, string> = {
  info: "text-txt-lo", ok: "text-acc", warn: "text-hold", error: "text-stop",
};

export default function EventLog({ events }: { events: Event[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight }); }, [events.length]);

  return (
    <div ref={ref} className="h-full overflow-auto px-4 py-2.5 space-y-1 font-mono text-micro">
      {events.length === 0 && <p className="text-txt-dim py-6 text-center">no events</p>}
      {events.slice(-140).map((e, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <span className="text-txt-dim shrink-0 tnum">{e.t.slice(0, 8)}</span>
          <span className={`w-1 h-1 rounded-full shrink-0 mt-[6px] ${DOT[e.level]}`} />
          <span className="text-txt-dim shrink-0 tnum w-6">{e.docId}</span>
          <span className="text-txt-dim shrink-0 w-[46px]">{e.stage}</span>
          <span className={`${TXT[e.level]} truncate`}>{e.msg}</span>
        </div>
      ))}
    </div>
  );
}
