"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CLIENT_SHORT, INTAKE_ADDRESS, SYSTEMS, TAGLINE } from "@/lib/config";

/*
  The old frame was a left rail with icons — the shape of an admin tool you log into every day.
  A prospect opens this once, from a link, to read an argument. So the frame is a masthead instead:
  nameplate, who it is for, and a table of contents with section numbers, the way a report is bound.

  There is no status light here. Nothing is being watched on this deployment, and an "connected"
  indicator that lies costs every number on the page its credibility.
*/
const NAV = [
  { href: "/",           label: "Operations",   no: "01" },
  { href: "/exceptions", label: "Held",         no: "02", badge: true },
  { href: "/records",    label: "Records",      no: "03" },
  { href: "/connections", label: "Connections", no: "04" },
  { href: "/analytics",  label: "Analytics",    no: "05" },
];

export default function Shell({
  children, heldCount = 0,
}: { children: React.ReactNode; heldCount?: number }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="mast sticky top-0 z-40 border-b border-line">
        <div className="mx-auto max-w-[1180px] px-5 sm:px-7">
          <div className="h-[54px] flex items-center gap-3">
            <Link href="/" className="flex items-baseline gap-2.5 shrink-0">
              <span className="inline-block w-[11px] h-[11px] bg-acc translate-y-[1px]" aria-hidden />
              <span className="mast-name text-[21px] text-txt-hi">Conduit</span>
            </Link>
            <span className="hidden sm:block w-px h-[18px] bg-line2" />
            <span className="hidden sm:block text-micro uppercase tracking-[0.14em] text-txt-lo truncate">
              {CLIENT_SHORT} · {TAGLINE}
            </span>
            <div className="ml-auto flex items-center gap-2 shrink-0">
              <span className="hidden md:inline font-mono text-micro text-txt-lo">{INTAKE_ADDRESS}</span>
              <Link href="/#intake" className="btn btn-primary !px-3 !py-1.5 !text-xs2">Send a document</Link>
            </div>
          </div>

          {/* Wraps rather than scrolls: on a phone a row that runs off the edge hides two sections of the
        document behind a gesture nobody tries on a page they did not come to navigate. */}
          <nav className="flex flex-wrap items-center gap-x-1 gap-y-0 border-t border-line -mb-px">
            {NAV.map(n => {
              const on = pathname === n.href;
              return (
                <Link key={n.href} href={n.href} className={`toclink flex items-center gap-1.5 ${on ? "on" : ""}`}>
                  <span className="text-txt-dim">{n.no}</span>
                  <span>{n.label}</span>
                  {n.badge && heldCount > 0 && (
                    <span className="stamp stamp-hold !px-1 !py-0 ml-0.5 tnum">{heldCount}</span>
                  )}
                </Link>
              );
            })}
            <span className="ml-auto hidden lg:flex items-center gap-1.5 pl-4 text-micro font-mono text-txt-dim whitespace-nowrap">
              {Object.keys(SYSTEMS).length} destinations mapped · intake not connected here
            </span>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1180px] px-5 sm:px-7 py-8 flex-1 min-w-0">{children}</main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-[1180px] px-5 sm:px-7 py-5 flex flex-wrap items-baseline gap-x-5 gap-y-1
                        text-micro text-txt-dim font-mono">
          <span>Conduit — inbound document automation</span>
          <span>nothing is written to a live system from this page</span>
          <a href="/#console" className="ml-auto text-txt-mid hover:underline">back to the run</a>
        </div>
      </footer>
    </div>
  );
}
