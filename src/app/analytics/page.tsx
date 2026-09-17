
import { DOC_TYPES } from "@/lib/doctypes";
import { rates, pct } from "@/lib/types";
import { TypeTag } from "@/components/Pipeline";
import PageHead from "@/components/PageHead";
import {
  CLIENT_NAME, DAILY_VOLUME, HOURLY, engineLabel, INTAKE_ADDRESS,
} from "@/lib/config";

import { visitorState } from "@/lib/wire-http";

export const dynamic = "force-dynamic";

/* Every number on this page is a projection, and it says so.
   Overstated ROI loses more deals than modest ROI — set the volume to something the
   prospect recognises as their own (NEXT_PUBLIC_DAILY_VOLUME), and leave the
   assumptions visible so an ops manager can check them without a calculator. */

export default async function AnalyticsPage() {
  const { store } = await visitorState();
  const { stats } = store;
  const r = rates(stats);

  // Weighted average manual minutes across the observed document mix.
  const mixTotal = Object.entries(stats.byType)
    .filter(([k]) => k !== "unclassified")
    .reduce((a, [, n]) => a + n, 0) || 1;
  const weightedMins = Object.entries(stats.byType)
    .filter(([k]) => k !== "unclassified")
    .reduce((a, [k, n]) => a + (DOC_TYPES[k]?.minutesManual ?? 4) * n, 0) / mixTotal;

  const dailyHours = (DAILY_VOLUME * weightedMins) / 60;
  const weeklyHours = dailyHours * 5;
  const annual = Math.round(weeklyHours * 52 * HOURLY);
  const avgMs = stats.total ? Math.round(stats.latencyTotal / stats.total) : 0;
  const totalFields = stats.fieldsAuto + stats.fieldsCorrected;
  const accuracy = totalFields ? stats.fieldsAuto / totalFields : null;

  const byType = Object.entries(stats.byType)
    .filter(([k]) => k !== "unclassified")
    .sort((a, b) => b[1] - a[1]);

  const empty = stats.total === 0;

  return (
    <div className="space-y-3">
      <PageHead title="Analytics"
        meta={`${CLIENT_NAME} · measured on ${stats.total} documents · intake ${INTAKE_ADDRESS} · projected at ${DAILY_VOLUME}/day · ${engineLabel()}`} />

      {empty ? (
        <div className="rounded-xl2 border border-acc-line bg-acc-soft px-5 py-6">
          <div className="text-base2 text-txt-hi font-medium mb-1">No run recorded for this visit.</div>
          <p className="text-sm2 text-txt-mid leading-relaxed max-w-prose">
            Open the demo root and press <span className="text-txt-hi">Run pipeline</span>. This tab only
            quotes numbers it can count, so it stays blank rather than showing you a zero.
          </p>
        </div>
      ) : (
        <div className="rounded-xl2 border border-acc-line bg-gradient-to-br from-acc-soft to-transparent px-5 py-5">
          <div className="label mb-2">Cost of doing this by hand today</div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-[38px] sm:text-[44px] leading-none font-semibold text-acc tnum">
              ${annual.toLocaleString()}
            </span>
            <span className="text-txt-mid">a year</span>
            <span className="ml-auto text-sm2 text-txt-mid">
              <span className="text-txt-hi font-medium tnum">{weeklyHours.toFixed(0)}</span>{" "}
              operator hours a week at ${HOURLY}/hr loaded
            </span>
          </div>
          <p className="text-micro text-txt-dim mt-3 pt-3 border-t border-line leading-relaxed">
            This is what the work costs now — not a price and not a promise. Weighted across the observed
            mix: <span className="text-txt-mid">{weightedMins.toFixed(1)} min per document</span>{" "}
            ({byType.map(([k, n]) => `${DOC_TYPES[k].code} ${DOC_TYPES[k].minutesManual}m × ${n}`).join(" · ") || "—"}).
            Projection only: {DAILY_VOLUME} documents/day × {weightedMins.toFixed(1)} min × 5 days ×
            52 weeks × ${HOURLY}/hr. Change the volume to yours and the number moves with it.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: "First-pass rate", v: stats.total ? pct(r.onReceived) : "—",
            s: stats.total
              ? `${r.auto} of ${r.received} received with no human · ${pct(r.onActionable)} of ${r.actionable} actionable`
              : "run the pipeline to measure", c: "text-acc" },
          { l: "Avg latency", v: stats.total ? `${(avgMs / 1000).toFixed(2)}s` : "—",
            s: stats.total ? `vs ~${weightedMins.toFixed(0)} min by hand` : "—", c: "text-txt-hi" },
          { l: "Field accuracy", v: accuracy === null ? "—" : `${(accuracy * 100).toFixed(0)}%`,
            s: accuracy === null ? "clear the held queue to measure"
                : `${stats.fieldsCorrected} corrected of ${totalFields} fields`, c: "text-txt-hi" },
          { l: "Noise filtered", v: String(stats.discarded),
            s: "never reached a person", c: "text-txt-mid" },
        ].map(m => (
          <div key={m.l} className="rounded-xl2 border border-line bg-surface px-4 py-3.5">
            <div className="text-micro label mb-1.5">{m.l}</div>
            <div className={`text-2xl font-semibold tnum leading-none ${m.c}`}>{m.v}</div>
            <div className="text-micro text-txt-dim mt-1.5 leading-snug">{m.s}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded-xl2 border border-line bg-surface px-4 py-3.5">
          <div className="text-micro label mb-3">By document type</div>
          <table className="w-full text-sm2">
            <thead>
              <tr className="text-micro uppercase text-txt-dim border-b border-line">
                <th className="text-left font-medium pb-1.5">Type</th>
                <th className="text-left font-medium pb-1.5">Destination</th>
                <th className="text-right font-medium pb-1.5">Docs</th>
                <th className="text-right font-medium pb-1.5">Min/doc</th>
              </tr>
            </thead>
            <tbody>
              {byType.map(([k, n]) => (
                <tr key={k} className="border-b border-line/60 last:border-0">
                  <td className="py-1.5"><TypeTag code={DOC_TYPES[k].code} /></td>
                  <td className="py-1.5 text-txt-lo text-micro font-mono">{DOC_TYPES[k].destination}</td>
                  <td className="py-1.5 text-right text-txt-mid tnum">{n}</td>
                  <td className="py-1.5 text-right text-txt-lo tnum">{DOC_TYPES[k].minutesManual}</td>
                </tr>
              ))}
              {byType.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-txt-dim text-micro">
                  run the pipeline first
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl2 border border-line bg-surface px-4 py-3.5">
          <div className="text-micro label mb-3">How to read this</div>
          <div className="space-y-2.5 text-micro text-txt-lo leading-relaxed">
            <p>
              <span className="text-txt-mid">The system does not try to be right every time.</span>{" "}
              It tries to know when it might be wrong. Anything below 85% confidence on a required field,
              or 80% on document type, is held rather than written.
            </p>
            {stats.total > 0 && (
              <p>
                {r.auto} of {r.received} documents needed nobody ({pct(r.onReceived)}). The other{" "}
                {r.received - r.auto} took a human a few seconds each — that is the trade, stated both ways
                so nothing is hidden in a denominator.
              </p>
            )}
            <div className="pt-2 border-t border-line space-y-1.5">
              {byType.slice(0, 3).map(([k]) => (
                <p key={k} className="flex gap-2">
                  <TypeTag code={DOC_TYPES[k].code} />
                  <span className="text-txt-dim">{DOC_TYPES[k].riskLine}</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl2 border border-line bg-surface px-4 py-3.5">
        <div className="text-micro label mb-2">How this gets verified, before anyone is asked to believe it</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-micro text-txt-lo leading-relaxed">
          <p>
            <span className="text-txt-mid">Your paper, not this corpus.</span> Fifty documents out of
            your inbox go through the same thresholds. You get the rows, the accuracy number on your
            own mix, and every held item with the flag that stopped it.
          </p>
          <p>
            <span className="text-txt-mid">A bar agreed in writing.</span> First-pass counted both ways
            — of everything received, and of the actionable ones. Below the number we agreed, it stops,
            nothing is written, and nobody owes anything.
          </p>
          <p>
            <span className="text-txt-mid">A queue you own.</span> Holds route to whoever you name, with
            the field that failed and why. Every committed row exports with its confidence and its
            corrections, so this screen is a report your accountant can read, not a pitch.
          </p>
        </div>
      </div>
    </div>
  );
}
