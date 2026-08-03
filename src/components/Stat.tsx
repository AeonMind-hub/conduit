export default function Stat({
  label, value, sub, tone = "plain",
}: {
  label: string; value: string | number; sub?: string;
  tone?: "plain" | "acc" | "hold" | "dim";
}) {
  const c = tone === "acc" ? "text-acc" : tone === "hold" ? "text-hold"
          : tone === "dim" ? "text-txt-lo" : "text-txt-hi";
  return (
    <div className="card px-4 py-3.5">
      <div className="label mb-2">{label}</div>
      <div className={`text-[26px] leading-none font-semibold tnum ${c}`}>{value}</div>
      {sub && <div className="text-micro text-txt-dim mt-2 leading-snug">{sub}</div>}
    </div>
  );
}
