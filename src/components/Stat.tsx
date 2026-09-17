/**
 * One number, sized like it matters. `unit` exists because "43,175" and "43,175 a year" are
 * different claims; the small figure is part of the number, not a caption under it.
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
    <div className="card px-4 py-3.5 group">
      <div className="flex items-center gap-2">
        <span className="label">{label}</span>
        {unit && <span className="ml-auto text-micro font-mono text-txt-dim">{unit}</span>}
      </div>
      <div className={`mt-2 text-num2 font-semibold tnum ${c}`}>{value}</div>
      {sub && <div className="text-micro text-txt-dim mt-2 leading-snug">{sub}</div>}
    </div>
  );
}
