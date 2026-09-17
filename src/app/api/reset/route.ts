import { NextResponse } from "next/server";
import { rebuild } from "@/lib/session";
import { respondWithWire, emptyWire } from "@/lib/wire-http";

export const dynamic = "force-dynamic";

/** Blank slate — clears the pasted documents too, not just the corpus run. */
export async function POST() {
  // An empty wire, not a missing cookie: a visitor who clears must be told nothing about
  // "seeded demo data", because from here on the run is genuinely theirs.
  const w = emptyWire();
  return respondWithWire({ ok: true, store: rebuild(w) }, w);
}
