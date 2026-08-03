"use client";

/** Tiny throughput chart. Adds density without adding noise. */
export default function Sparkline({ data, color = "#34d399" }: { data: number[]; color?: string }) {
  if (!data.length) return <div className="h-8" />;
  const max = Math.max(...data, 1);
  const w = 100, h = 32;
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const pts = data.map((v, i) => `${i * step},${h - (v / max) * (h - 4) - 2}`).join(" ");
  const area = `0,${h} ${pts} ${(data.length - 1) * step},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-8">
      <polygon points={area} fill={color} opacity="0.12" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
                vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
