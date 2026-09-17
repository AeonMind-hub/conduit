"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CLIENT_SHORT, CORPUS_LABEL, INTAKE_ADDRESS, SYSTEMS, TAGLINE } from "@/lib/config";
import { useEffect, useState } from "react";

/* Icons kept as small inline paths — no icon library, no extra weight. */
const I = {
  ops: "M3 12h4l2-5 3 10 2-6 2 3h5",
  hold: "M12 8v5m0 3v.5M10.3 3.9 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  rec: "M4 5h16M4 10h16M4 15h10M4 20h7",
  chart: "M4 20V10m5 10V4m5 16v-7m5 7V8",
  link: "M9 15l6-6M10.5 6.5 12 5a4 4 0 0 1 6 6l-1.5 1.5M13.5 17.5 12 19a4 4 0 0 1-6-6l1.5-1.5",
};

const NAV = [
  { href: "/",           label: "Operations", icon: I.ops },
  { href: "/exceptions", label: "Held",       icon: I.hold, badge: true },
  { href: "/records",    label: "Records",    icon: I.rec },
  { href: "/connections", label: "Connections", icon: I.link },
  { href: "/analytics",  label: "Analytics",  icon: I.chart },
];

function Icon({ d, className = "" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}
         stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export default function Shell({
  children, heldCount = 0,
}: { children: React.ReactNode; heldCount?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <div className="min-h-screen flex">
      {/* ── desktop rail ─────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-[212px] shrink-0 border-r border-line bg-surface">
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-line">
          <div className="relative w-7 h-7 rounded-lg bg-acc-soft border border-acc-line grid place-items-center shrink-0">
            <div className="w-[7px] h-[7px] rounded-[2px] bg-acc" />
            <div className="absolute inset-0 rounded-lg" style={{ boxShadow: "0 0 18px -4px rgba(62,207,142,0.55)" }} />
          </div>
          <div className="leading-tight min-w-0">
            <div className="text-sm2 font-semibold text-txt-hi truncate">Conduit</div>
            <div className="text-micro text-txt-dim truncate">{TAGLINE}</div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 mt-1">
          <div className="label px-2.5 pt-1.5 pb-1.5">{CLIENT_SHORT}</div>
          {NAV.map(n => {
            const on = pathname === n.href;
            return (
              <Link key={n.href} href={n.href}
                className={`relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm2 transition-colors ${
                  on ? "bg-hover text-txt-hi" : "text-txt-mid hover:text-txt-hi hover:bg-raised"}`}>
                {on && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-[15px] rounded-full bg-acc" />}
                <Icon d={n.icon} className={`w-[17px] h-[17px] shrink-0 ${on ? "text-acc" : "text-txt-dim"}`} />
                <span className="truncate">{n.label}</span>
                {n.badge && heldCount > 0 && (
                  <span className="ml-auto text-micro tnum px-1.5 py-0.5 rounded-md bg-hold-soft text-hold border border-hold-line">
                    {heldCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-line space-y-1.5">
          <Link href="/connections" className="flex items-center gap-2 text-micro group">
            <span className="live-dot on" />
            <span className="text-txt-lo truncate group-hover:text-txt-mid">{INTAKE_ADDRESS}</span>
          </Link>
          <div className="text-micro text-txt-dim">
            {Object.keys(SYSTEMS).length} destinations configured
          </div>
          <div className="text-micro text-txt-dim/80 pt-1 mt-1 border-t border-line">{CORPUS_LABEL}</div>
        </div>
      </aside>

      {/* ── main ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* mobile top bar */}
        <header className="md:hidden h-14 shrink-0 flex items-center gap-3 px-4 border-b border-line bg-surface sticky top-0 z-20">
          <div className="w-6 h-6 rounded-md bg-acc-soft border border-acc-line grid place-items-center">
            <div className="w-[7px] h-[7px] rounded-[2px] bg-acc" />
          </div>
          <span className="text-sm2 font-semibold text-txt-hi">Conduit</span>
          <span className="ml-auto text-micro text-txt-dim">{CLIENT_SHORT}</span>
        </header>

        <div className="flex-1 min-w-0 pb-16 md:pb-0">{children}</div>
      </div>

      {/* ── mobile bottom tabs ───────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 h-16 border-t border-line bg-surface/95 backdrop-blur-md grid grid-cols-5">
        {NAV.map(n => {
          const on = pathname === n.href;
          return (
            <Link key={n.href} href={n.href}
              className="flex flex-col items-center justify-center gap-1 relative">
              <div className="relative">
                <Icon d={n.icon} className={`w-5 h-5 ${on ? "text-acc" : "text-txt-dim"}`} />
                {n.badge && heldCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-hold text-bg text-[10px] font-semibold grid place-items-center tnum">
                    {heldCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] ${on ? "text-txt-hi" : "text-txt-dim"}`}>{n.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
