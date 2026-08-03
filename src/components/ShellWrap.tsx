"use client";

import { useEffect, useState } from "react";
import Shell from "./Shell";
import DemoCaptions from "./DemoCaptions";

/** Polls held count so the sidebar badge stays live across pages. */
export default function ShellWrap({ children }: { children: React.ReactNode }) {
  const [held, setHeld] = useState(0);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch("/api/records", { cache: "no-store" });
        const d = await r.json();
        if (alive) setHeld(d?.stats?.exceptions ?? 0);
      } catch { /* offline is fine */ }
    };
    tick();
    const t = setInterval(tick, 2500);
    return () => { alive = false; clearInterval(t); };
  }, []);

  return (
    <>
      <Shell heldCount={held}>{children}</Shell>
      <DemoCaptions />
    </>
  );
}
