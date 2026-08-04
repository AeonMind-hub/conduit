import { NextResponse } from "next/server";
import { DOCS } from "@/lib/corpus";
import { COOKIE_NAME, decodeWire, encodeWire, rebuild } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { id, all } = await req.json().catch(() => ({}));
  const ids: number[] = all ? DOCS.map(d => d.id) : typeof id === "number" ? [id] : [];
  if (!ids.length) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const raw = req.headers.get("cookie")?.match(/conduit_s=([^;]+)/)?.[1];
  const w = decodeWire(raw);

  // Idempotent: processing a doc twice must not double-count.
  const seen = new Set(w.d);
  for (const docId of ids) if (!seen.has(docId)) { w.d.push(docId); seen.add(docId); }

  const store = rebuild(w);
  const res = NextResponse.json({ ok: true, store });
  res.cookies.set(COOKIE_NAME, encodeWire(w), {
    path: "/", httpOnly: false, sameSite: "lax", maxAge: 60 * 60 * 24,
  });
  return res;
}
