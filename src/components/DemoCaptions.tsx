"use client";

import { useEffect, useState } from "react";

/**
 * Caption overlay for SILENT screen recordings.
 *
 * A muted video has to carry its own narration. Without this, the most
 * important moment in the demo — a field left empty *on purpose* — just
 * looks like a blank box. The caption is what turns it into an argument.
 *
 * Controls (hidden from the recording):
 *   .  or →   next caption
 *   ,  or ←   previous caption
 *   C         hide/show the bar entirely
 *
 * Advance manually as you click through, so the text always matches
 * what is on screen.
 */

const CAPTIONS = [
  "Northwind Supply. One ops inbox. 75 documents came in this morning.",
  "Synthetic corpus, built to show the pattern — not a client deployment.",
  "Purchase orders, supplier invoices, delivery bookings, quote requests — and noise.",
  "Today one person opens every single one and decides where it goes.",
  "Watch the pipeline run.",
  "Each document is classified, extracted, validated, then routed to the right system.",
  "Orders to the ERP. Invoices to AP. Bookings to the WMS. Quotes to the CRM.",
  "75 documents. 6 were noise and never reached a person.",
  "Most were committed automatically. A handful were held.",
  "These are the held ones. This is the part that matters.",
  "This invoice is for $18,420 — and there is no PO reference anywhere in it.",
  "Without a PO it cannot be three-way matched. That is how duplicate invoices get paid.",
  "So it was held, not posted. The system flagged what it could not verify.",
  "This one is harder. It asks for a price AND says they will raise a purchase order.",
  "Classified as a quote request at 61% confidence — below the routing threshold.",
  "Routing it to the CRM alone loses the order. Routing it to the ERP invents one.",
  "So it escalated instead of choosing. A confident wrong answer is worse than a question.",
  "I confirm the fields, commit, and it lands in the right system.",
  "Across a week that is real operator time back, on documents nobody enjoys typing.",
  "Same engine handles any document type. Adding one is a schema, not a rebuild.",
  "Two-week build. Works with the systems you already run.",
  "Paste one of your own documents on the first screen and watch what it refuses to guess.",
];

export default function DemoCaptions() {
  const [on, setOn] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;

      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        setOn(v => !v);
        return;
      }
      if (!on) return;

      if (e.key === "." || e.key === "ArrowRight") {
        e.preventDefault();
        setI(n => Math.min(n + 1, CAPTIONS.length - 1));
      }
      if (e.key === "," || e.key === "ArrowLeft") {
        e.preventDefault();
        setI(n => Math.max(n - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [on]);

  if (!on) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 pointer-events-none">
      <div className="bg-gradient-to-t from-ink-950 via-ink-950/95 to-transparent pt-12 pb-6 px-6">
        <div className="max-w-4xl mx-auto">
          <p
            key={i}
            className="slide-up text-center text-[22px] leading-snug font-medium text-slate-100"
            style={{ textShadow: "0 2px 16px rgba(0,0,0,0.9)" }}
          >
            {CAPTIONS[i]}
          </p>
          <div className="flex justify-center gap-1 mt-4">
            {CAPTIONS.map((_, n) => (
              <div
                key={n}
                className={`h-0.5 rounded-full transition-all ${
                  n === i ? "w-6 bg-ok" : n < i ? "w-1.5 bg-ok/40" : "w-1.5 bg-ink-700"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
