import { cookies } from "next/headers";
import { COOKIE_NAME, decodeWire, rebuild } from "@/lib/session";
import { DOC_TYPES } from "@/lib/doctypes";
import { DOCS } from "@/lib/corpus";
import { TypeTag } from "@/components/Pipeline";
import PageHead from "@/components/PageHead";

export const dynamic = "force-dynamic";

/* Tune these per prospect before a live demo. Overstated ROI loses more
   deals than modest ROI — pick a volume they will recognise as their own. */
const DAILY_VOLUME = 60;    // documents/day
const HOURLY = 34;          // loaded hourly cost of the person doing this today

export default async function AnalyticsPage() {
  const jar = await cookies();
  const { stats, records } = rebuild(decodeWire(jar.get(COOKIE_NAME)?.value));
  const relevant = stats.total - stats.discarded;
  const autoRate = relevant ? stats.autoCommitted / relevant : 0;

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

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5 space-y-3">
      <PageHead title="Analytics"
        meta={`measured on ${stats.total} documents · projected at ${DAILY_VOLUME}/day`} />

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
          This is what the work costs you now — not a price. Weighted across the observed mix:{" "}
          <span className="text-txt-mid">{weightedMins.toFixed(1)} min per document</span>{" "}
          ({byType.map(([k, n]) => `${DOC_TYPES[k].code} ${DOC_TYPES[k].minutesManual}m × ${n}`).join(" · ") || "—"}).
          Projected at {DAILY_VOLUME} documents/day — change that figure to match your volume.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: "First-pass rate", v: `${(autoRate * 100).toFixed(0)}%`,
            s: `${stats.autoCommitted} of ${relevant} needed no human`, c: "text-acc" },
          { l: "Avg latency", v: `${(avgMs / 1000).toFixed(2)}s`,
            s: `vs ~${weightedMins.toFixed(0)} min by hand`, c: "text-txt-hi" },
          { l: "Field accuracy", v: accuracy === null ? "—" : `${(accuracy * 100).toFixed(0)}%`,
            s: accuracy === null ? "clear the exception queue to measure"
                : `${stats.fieldsCorrected} corrected of ${totalFields}`, c: "text-txt-hi" },
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
          <div className="text-micro label mb-3">
            By document type
          </div>
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
                  <td className="py-1.5 text-txt-lo text-micro font-mono">
                    {DOC_TYPES[k].destination}
                  </td>
                  <td className="py-1.5 text-right text-txt-mid tnum">{n}</td>
                  <td className="py-1.5 text-right text-txt-lo tnum">
                    {DOC_TYPES[k].minutesManual}
                  </td>
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
          <div className="text-micro label mb-3">
            How to read this
          </div>
          <div className="space-y-2.5 text-micro text-txt-lo leading-relaxed">
            <p>
              <span className="text-txt-mid">The system does not try to be right every time.</span>{" "}
              It tries to know when it might be wrong. Anything below 85% confidence on a required
              field, or 80% on document type, is held rather than written.
            </p>
            <p>
              That is why {(autoRate * 100).toFixed(0)}% needs no attention and the rest takes
              seconds to confirm.
            </p>
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
    </div>
  );
}
