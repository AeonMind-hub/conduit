"use client";

import { useEffect, useRef, useState } from "react";
import Flow, { type FlowDest, type FlowStep } from "./Flow";
import { CORPUS_LABEL } from "@/lib/config";

/**
 * The front page. Set like the first page of a report rather than a marketing hero, because the
 * thing being sold is paperwork that comes out clean: a claim, the mechanism, and the run that
 * proves it, all inside the fold a prospect sees before deciding whether to keep reading.
 *
 * No screenshot, no carousel, no adjective. The only number that animates is one the run produced.
 */
function useCountUp(target: number, run: boolean) {
  const [n, setN] = useState(target);
  const done = useRef(false);
  useEffect(() => {
    if (!run || done.current || target <= 0) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { done.current = true; return; }
    done.current = true;
    const t0 = performance.now(), dur = 650;
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

const STEPS_OF_IT: [string, string][] = [
  ["Classify", "four document types, plus the noise that is not one of them"],
  ["Extract", "the fields that type actually needs, each with 0–1 confidence"],
  ["Validate", "required fields at 85%, type match at 80% — under either, it stops"],
  ["Route", "ERP · accounting · WMS · CRM, one idempotency key per write"],
  ["Hold", "a queue with the reason attached, not a silent skip"],
  ["Audit", "the row, the confidence, and who corrected it"],
];

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
  const discarded = Math.max(0, rates.received - rates.auto - held);

  const figures = [
    { l: "received", v: rates.received, s: "documents in the sample inbox", tone: "text-txt-hi" },
    { l: "written", v: committed, s: `${rates.onReceived} of everything received · ${rates.onActionable} of ${rates.actionable} actionable`, tone: "text-acc" },
    { l: "held", v: held, s: "waiting on a human · nothing written", tone: "text-hold" },
    { l: "set aside", v: discarded, s: "no transactional content · nothing written", tone: "text-txt-lo" },
  ];

  return (
    <header className="pb-2">
      {/* Edition line: the heavy rule at the top says which document this is before a word is read. */}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 pb-2.5"
           style={{ borderBottom: "2px solid var(--ink)" }}>
        <span className="eyebrow text-txt-hi">Run sheet</span>
        <span className="text-micro uppercase tracking-[0.14em] text-txt-lo truncate">{client}</span>
        <span className="ml-auto font-mono text-micro text-txt-lo">{intake}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_minmax(0,0.9fr)] gap-9 lg:gap-12 items-start mt-8">
        <div className="min-w-0">
          <h1 className="display">
            Documents arrive.<br />
            Rows appear in <i>your</i> systems.
          </h1>

          <p className="dek mt-6 max-w-[52ch]">
            Conduit reads what lands in the mailbox, classifies each document, extracts the fields
            that type actually needs, validates them against your rules, and writes clean records
            into your ERP, accounting and warehouse systems. Anything it cannot verify goes to a
            human — it is held, never guessed.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 mt-8">
            <a href="#console" className="btn btn-primary">
              Open the run sheet
              <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" aria-hidden>
                <path d="M6 2v7M3 6.5 6 9.5 9 6.5" stroke="currentColor" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a href="#intake" className="btn btn-ghost">Send it one of yours</a>
          </div>

          {/* On a phone the sheet comes second, so the counts sit here instead of leaving a gap
              under the buttons. */}
          <div className="figs mt-9">
            {figures.map(f => (
              <div key={f.l}>
                <div className="label">{f.l}</div>
                <div className={`fig text-num2 mt-2.5 leading-none ${f.tone}`}>{f.v}</div>
                <div className="text-micro text-txt-dim mt-2.5 leading-snug max-w-[26ch]">{f.s}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Under lg the whole sheet moves out of the fold: §01 prints these same six rows and the
            same four destinations, and a phone visitor who meets them twice reasonably assumes the
            page has nothing else to say. The counts band below stays, because that is the proof. */}
        <div className="min-w-0 only-lg">
          <Flow steps={steps} destinations={destinations} held={held} total={rates.received}
                running={false} active={null} ambient
                onOpenHeld={() => { location.hash = "#console"; }} />

          <div className="mt-3.5">
            <div className="label pb-1.5" style={{ borderBottom: "1px solid var(--rule)" }}>
              What it does, step by step
            </div>
            {STEPS_OF_IT.map(([t, d], i) => (
              <div key={t} className="grid grid-cols-[24px_1fr] gap-x-2 py-1.5"
                   style={{ borderBottom: "1px solid var(--rule)" }}>
                <span className="sect-no pt-0.5">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-xs2 leading-snug">
                  <span className="text-txt-hi font-medium">{t}</span>
                  <span className="text-txt-lo"> — {d}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>


      <div className="mt-8 pt-3 text-txt-dim flex flex-wrap items-baseline gap-x-3 gap-y-1.5"
           style={{ borderTop: "1px solid var(--rule)" }}>
        <span className="stamp">{CORPUS_LABEL}</span>
        <span className="max-w-[74ch] leading-relaxed">
          <span className="text-xs2 text-txt-lo">
            Not on your data, and not a client result — our own fixture inbox, put through the same
            gates the console below applies to whatever you send it. {fieldsRead} fields were read
            and {committed} rows were written by the engine, not typed into a mock.
          </span>
        </span>
      </div>
    </header>
  );
}
