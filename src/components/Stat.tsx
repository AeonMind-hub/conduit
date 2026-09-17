/**
 * One number, ruled like a column in a report. `unit` exists because "43,175" and "43,175 a year"
 * are different claims, so the qualifier is part of the figure and sits on the same line.
 *
 * No card around it: a boxed number is a dashboard, a ruled number is a result.
 */
export default function Stat({
  label, value, sub, tone = "plain", unit,
}: {
  label: string; value: string | number; sub?: string; unit?: string;
  tone?: "plain" | "acc" | "hold" | "dim" | "cool";
}) {
  const c = tone === "acc" ? "text-acc" : tone === "hold" ? "text-hold"
          : tone === "cool" ? "text-cool"
          : tone === "dim" ? "text-txt-lo" : "text-txt-hi";
  return (
    <div className="pt-2.5" style={{ borderTop: "2px solid var(--ink)" }}>
      <div className="flex items-baseline gap-2">
        <span className="label">{label}</span>
        {unit && <span className="ml-auto font-mono text-micro text-txt-dim">{unit}</span>}
      </div>
      <div className={`fig text-num2 mt-2 leading-none ${c}`}>{value}</div>
      {sub && <div className="text-micro text-txt-dim mt-2.5 leading-snug">{sub}</div>}
    </div>
  );
}
