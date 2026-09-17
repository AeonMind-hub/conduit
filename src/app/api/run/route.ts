import { NextResponse } from "next/server";
import { DOCS } from "@/lib/corpus";
import { rebuild } from "@/lib/session";
import { requestState, respondWithWire, fitWire } from "@/lib/wire-http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { id, all } = await req.json().catch(() => ({}));
  const ids: number[] = all ? DOCS.map(d => d.id) : typeof id === "number" ? [id] : [];
  if (!ids.length) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const { wire: w } = requestState(req);

  // Idempotent: processing a doc twice must not double-count.
  const seen = new Set(w.d);
  for (const docId of ids) if (!seen.has(docId)) { w.d.push(docId); seen.add(docId); }

  const fitted = fitWire(w);
  return respondWithWire({ ok: true, store: rebuild(fitted) }, fitted);
}
