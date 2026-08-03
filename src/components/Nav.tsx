"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Operations" },
  { href: "/exceptions", label: "Exceptions" },
  { href: "/records", label: "Records" },
  { href: "/analytics", label: "Analytics" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <header className="border-b border-ink-820 bg-ink-950/85 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-[1600px] mx-auto px-5 h-[52px] flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-ok/30 to-cyan2/20 border border-ok/30 grid place-items-center">
            <div className="w-2 h-2 rounded-[2px] bg-ok" />
          </div>
          <div className="leading-none">
            <div className="text-[13px] font-semibold tracking-tight text-slate-100">Conduit</div>
            <div className="text-2xs text-slate-600 mt-0.5">Northwind Supply Co</div>
          </div>
        </Link>

        <nav className="flex items-center gap-0.5 text-[13px]">
          {NAV.map(n => (
            <Link key={n.href} href={n.href}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                pathname === n.href
                  ? "text-slate-100 bg-ink-820"
                  : "text-slate-500 hover:text-slate-200 hover:bg-ink-860"}`}>
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4 text-2xs font-mono">
          <span className="text-slate-600">ops@northwindsupply.com</span>
          <span className="flex items-center gap-1.5 text-ok">
            <span className="w-1.5 h-1.5 rounded-full bg-ok" /> CONNECTED
          </span>
        </div>
      </div>
    </header>
  );
}
