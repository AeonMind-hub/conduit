"use client";

/*
  The results page.

  A run belongs here, not on the input page, for the same reason a receipt is a different piece of
  paper from the order form: the two states no longer have to time-share one layout. This page owns
  exactly one session's worth of state, held in memory plus a `sessionStorage` mirror so a refresh or
  a browser-back doesn't lose the run — never a cookie, never sent to a server to persist. Arriving
  here with nothing pending and no prior run is a real, expected state (a shared link, a bookmark, a
  refresh after clearing storage), not an error, so it says so plainly and points back to the door.
*/
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useConduitRun, type RunSnapshot } from "@/lib/useConduitRun";
import { PolicyPanel } from "@/components/PolicyPanel";
import { ResultsSection } from "@/components/ResultsView";

const PENDING_KEY = "conduit:pending";
const LAST_KEY = "conduit:lastRun";

export default function RunPage() {
  const [stamp, setStamp] = useState("");
  const startedRef = useRef(false);

  const { policy, setPolicy, run, stage, busy, error, open, setOpen, fix, setFix,
    applyFix, rerun, post, hydrate } = useConduitRun(snap => {
      sessionStorage.setItem(LAST_KEY, JSON.stringify(snap));
      setStamp(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    });

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const pending = sessionStorage.getItem(PENDING_KEY);
    if (pending) {
      sessionStorage.removeItem(PENDING_KEY);
      try {
        const { inputs, policy: pol, label } = JSON.parse(pending);
        void post(inputs, pol, label);
      } catch { /* malformed handoff — fall through to last-run / empty state */ }
    } else {
      const last = sessionStorage.getItem(LAST_KEY);
      if (last) {
        try {
          const snap = JSON.parse(last) as RunSnapshot;
          hydrate(snap);
          setStamp(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        } catch { /* ignore a corrupted snapshot */ }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currency = run?.docs[0]?.currency === "$" ? "$" : "£";

  if (!busy && !run) {
    return (
      <div className="pane-wait mx-auto max-w-[46ch] py-14">
        <p className="text-[13.5px] text-txt-hi">Nothing is running, and nothing was just finished.</p>
        <p className="mt-1.5 text-[12.5px] text-mute">A run only lives here for the session that made it — refresh
          after clearing your browser storage, or a link to this page on its own, both land here empty.</p>
        <Link href="/" className="btn btn-primary mt-4">paste a document</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
      <div className="lg:col-span-2 flex items-center justify-between gap-3">
        <Link href="/" className="label text-mute2 hover:text-txt-hi">&larr; back to paste another document</Link>
        {busy && stage && <span className="label text-amber">{stage}&hellip;</span>}
      </div>
      <div className="lg:col-span-2">
        <ResultsSection run={run} busy={busy} policy={policy} open={open} setOpen={setOpen}
          fix={fix} setFix={setFix} applyFix={applyFix} stamp={stamp} />
        {error && <p className="mt-3 text-[13px] text-amber" role="alert">{error}</p>}
      </div>
      <PolicyPanel policy={policy} setPolicy={setPolicy} hasRun={!!run} busy={busy}
        clamped={run?.clamped ?? []} onRerun={rerun} currency={currency} />
    </div>
  );
}
