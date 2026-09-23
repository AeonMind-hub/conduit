"use client";

import type { Policy } from "@/lib/batch";

export function PolicyPanel({ policy, setPolicy, hasRun, busy, clamped, onRerun, currency }: {
  policy: Policy; setPolicy: (p: Policy) => void; hasRun: boolean; busy: boolean;
  clamped: string[]; onRerun?: () => void; currency: string;
}) {
  return (
    <aside className="lg:pt-2">
      <div className="flex items-baseline justify-between">
        <h2 className="label text-txt-hi">Policy for this run</h2>
        <span className="label text-mute2">{hasRun ? "applied on re-run" : "applies when you run"}</span>
      </div>
      <div className="policy mt-2.5">
        <div>
          <label className="label block" htmlFor="tol">Variance tolerance, percent</label>
          <p className="mt-0.5 text-[11.5px] leading-snug text-mute">Inside this, an invoice posts even when it disagrees with the order.</p>
          <input id="tol" className="pol mt-1.5" type="number" min="0" max="25" step="0.5" value={policy.tolerancePct}
            onChange={e => setPolicy({ ...policy, tolerancePct: Number(e.target.value) })} />
        </div>
        <div>
          <label className="label block" htmlFor="abs">…or in {currency}, whichever is more generous</label>
          <input id="abs" className="pol mt-1.5" type="number" min="0" step="5" value={policy.toleranceAbs}
            onChange={e => setPolicy({ ...policy, toleranceAbs: Number(e.target.value) })} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div><span className="label block">An invoice must name its order</span>
            <p className="mt-0.5 text-[11.5px] text-mute">Off: unmatched invoices post.</p></div>
          <div className="seg" role="group" aria-label="Require a purchase order reference">
            {(["On", "Off"] as const).map(o => <button key={o} aria-pressed={(o === "On") === policy.requirePO}
              onClick={() => setPolicy({ ...policy, requirePO: o === "On" })}>{o}</button>)}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div><span className="label block">Nothing posts before goods are received</span>
            <p className="mt-0.5 text-[11.5px] text-mute">On: an invoice with no receipt note is held.</p></div>
          <div className="seg" role="group" aria-label="Require a goods receipt">
            {(["On", "Off"] as const).map(o => <button key={o} aria-pressed={(o === "On") === policy.requireReceipt}
              onClick={() => setPolicy({ ...policy, requireReceipt: o === "On" })}>{o}</button>)}
          </div>
        </div>
        <div>
          <label className="label block" htmlFor="ap">Above this, a person approves even if the machine is happy</label>
          <input id="ap" className="pol mt-1.5" type="number" min="0" step="100" value={policy.autoApproveUnder}
            onChange={e => setPolicy({ ...policy, autoApproveUnder: Number(e.target.value) })} />
        </div>
      </div>
      {!!clamped.length && <p className="mt-2 text-[11.5px] leading-snug text-amber">Clamped: {clamped.join(" · ")}</p>}
      {hasRun && onRerun && (
        <button className="btn mt-2.5 w-full" disabled={busy} onClick={onRerun}>
          Re-run this batch with the policy above</button>)}
      {hasRun && (
        <p className="mt-2 text-[11.5px] leading-snug text-mute">
          Change a number, re-run, and watch rows move between the four lanes. That panel is not decoration: it is
          the setting your finance team already argues about in email.
        </p>)}
    </aside>
  );
}
