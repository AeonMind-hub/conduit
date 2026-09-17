"use client";

import { useEffect, useRef, useState } from "react";
import Flow, { type FlowDest, type FlowStep } from "./Flow";
import { CORPUS_LABEL } from "@/lib/config";

/**
 * The face of the link.
 *
 * A prospect decides in about eight seconds whether this is a product or a project, and that
 * decision is made before they read anything in the console. So the first screen is a claim, the
 * mechanism behind it, and the live diagram running the real numbers from this session — no
 * screenshot, no carousel, no "revolutionary". The console sits directly underneath, because the
 * fastest path from "interesting" to "let's pilot it" is them pasting their own PO.
 */
function useCountUp(target: number, run: boolean) {
  const [n, setN] = useState(target);
  const done = useRef(false);
  useEffect(() => {
    if (!run || done.current || target <= 0) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { done.current = true; return; }
    done.current = true;
    const t0 = performance.now(), dur = 700;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      setN(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    setN(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return n;
}

export default function Hero({
  client, steps, destinations, held, rates, fieldsRead, intake,
}: {
  client: string;
  steps: FlowStep[];
  destinations: FlowDest[];
  held: number;
  rates: { onReceived: string; onActionable: string; actionable: number; auto: number; received: number };
  fieldsRead: number;
  intake: string;
}) {
  const committed = useCountUp(steps[steps.length - 1]?.value ?? 0, true);

  return (
    <header className="relative pt-10 sm:pt-16 pb-8 sm:pb-12">
      <div className="flex items-center gap-2.5 mb-6">
        {/* A static dot. A pulsing one claims traffic this page does not have, and one invented
            pulse is enough to make every real number on the screen look invented too. */}
        <span className="live-dot" />
        <span className="eyebrow text-txt-dim">Conduit · inbound document automation</span>
        <span className="ml-auto chip font-mono">{intake}</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-8 xl:gap-12 items-start">
        <div className="max-w-[46ch]">
          <h1 className="display">
            Documents arrive.<br />
            <span className="grad-text">Rows appear in your systems.</span>
          </h1>

          <p className="lede text-txt-mid mt-5">
            Conduit reads what lands in the mailbox, classifies each document, extracts the fields
            that type actually needs, validates them against your rules, and writes clean records
            into your ERP, accounting and warehouse systems. Anything it cannot verify goes to a
            human — it is held, never guessed.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 mt-7">
            <a href="#console" className="btn btn-primary">
              Open the live console
              <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" aria-hidden>
                <path d="M6 2v7M3 6.5 6 9.5 9 6.5" stroke="currentColor" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a href="#intake" className="btn btn-ghost">Send it one of yours</a>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-9 pt-6 border-t border-line">
            {[
              { v: `${rates.onReceived}`, l: "first pass, of everything received" },
              { v: `${rates.onActionable}`, l: `first pass, of ${rates.actionable} actionable` },
              { v: `${held}`, l: "held for a human, on purpose" },
            ].map(s => (
              <div key={s.l}>
                <div className={`text-num font-semibold tnum leading-none ${
                  s.l.includes("held") ? "text-hold" : "text-txt-hi"}`}>{s.v}</div>
                <div className="text-micro text-txt-dim mt-2 leading-snug">{s.l}</div>
              </div>
            ))}
          </div>

          <p className="text-micro text-txt-dim mt-6 leading-relaxed">
            Live below: {rates.received} documents, {fieldsRead} fields read, {committed} committed
            without a human. Running on the {CORPUS_LABEL.toLowerCase()} — not on your data, and not
            a client result. One document type and one destination go live in days; that is the pilot.
          </p>
        </div>

        <div className="min-w-0">
          <Flow steps={steps} destinations={destinations} held={held} total={rates.received}
                running={false} active={null} ambient
                onOpenHeld={() => { location.hash = "#console"; }} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
            {[
              ["Classify", "4 document types, plus noise"],
              ["Extract", "per-type field schema, 0–1 confidence"],
              ["Validate", "85% required fields · 80% type"],
              ["Route", "ERP · AP · WMS · CRM"],
              ["Hold", "the gate that stops a write"],
              ["Audit", "row, confidence, who fixed it"],
            ].map(([t, d]) => (
              <div key={t} className="card px-3 py-2.5">
                <div className="label">{t}</div>
                <div className="text-micro text-txt-lo mt-1 leading-snug">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
