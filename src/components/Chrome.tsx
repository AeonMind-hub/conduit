import Link from "next/link";
import { CLIENT_SHORT, INTAKE_ADDRESS, TAGLINE } from "@/lib/config";

/*
  The entire frame: a nameplate, one way deeper into the system, and a line at the bottom that states
  what happens to the documents. The previous frame was a report's table of contents — right for a
  document, wrong for a tool someone came to use.
*/
export function Chrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-rule">
        <div className="mx-auto flex w-full max-w-[980px] items-baseline gap-3 px-5 py-4 sm:px-7">
          <span className="mast-name text-[19px] leading-none text-ink">Conduit</span>
          <span className="hidden h-[14px] w-px bg-rule2 sm:block" aria-hidden />
          <span className="hidden text-[12.5px] text-mute sm:block">{TAGLINE.toLowerCase()} · {CLIENT_SHORT}</span>
          <Link href="/systems"
            className="ml-auto font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink2 underline decoration-rule underline-offset-4 hover:decoration-ink">
            how it writes
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[980px] flex-1 px-5 py-10 sm:px-7 sm:py-14">{children}</main>

      <footer className="border-t border-rule">
        <div className="mx-auto flex w-full max-w-[980px] flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-4 sm:px-7">
          <span className="font-mono text-[10px] uppercase tracking-[0.13em] text-mute2">
            in production, documents arrive at {INTAKE_ADDRESS}
          </span>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.13em] text-mute2">
            nothing stored · nothing sent · <Link href="/systems" className="text-ink2 hover:underline">systems map</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
