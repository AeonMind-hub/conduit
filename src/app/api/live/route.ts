import { NextResponse } from "next/server";
import type { Doc } from "@/lib/types";
import { runLive } from "@/lib/engine";
import { LIVE_ENABLED, MODEL, MAX_LIVE_DOCS } from "@/lib/config";
import { nextLiveId, pushLive, rebuild, wireBytes } from "@/lib/session";
import { requestState, respondWithWire, fitWire } from "@/lib/wire-http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * One real document, run in front of the person who owns it.
 *
 * This is the difference between a demo and a pilot. Offline it does the honest thing:
 * there is no model, so the document is HELD, never written. Live, it is one model call.
 * The result is stored compactly in the visitor cookie, capped at MAX_LIVE_DOCS so the
 * 4KB-per-domain limit can never be blown (a blown cookie 431s the whole app).
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as
    { from?: string; subject?: string; text?: string } | null;

  const text = (body?.text ?? "").trim().slice(0, 6000);
  if (text.length < 12) {
    return NextResponse.json({ error: "Paste at least a few lines of a real order, invoice or enquiry." },
      { status: 400 });
  }

  const { wire: w0 } = requestState(req);
  const doc: Doc = {
    id: nextLiveId(w0),
    from: (body?.from ?? "unknown sender").slice(0, 80),
    subject: (body?.subject ?? "(no subject)").slice(0, 120),
    receivedAt: new Date().toISOString(),
    body: text,
    type: "unclassified",
  };

  const t0 = Date.now();
  let live, err: string | undefined;
  if (!LIVE_ENABLED) {
    err = "no model configured on this deploy (offline demo) — held, not guessed";
  } else {
    try { live = await runLive(doc); }
    catch (e) { err = `${MODEL} failed: ${(e as Error).message}`; }
  }
  const ms = Date.now() - t0;

  let w = w0;
  if (live) {
    w = pushLive(w0, {
      id: doc.id, from: doc.from, subject: doc.subject, receivedAt: doc.receivedAt,
      type: live.type, relevant: !!live.relevant, reject: live.rejectReason,
      v: live.extraction?.values ?? {}, cf: live.extraction?.confidence ?? {},
      tc: live.extraction?.typeConfidence ?? 0, ms, eng: "live",
    });
  } else {
    w = pushLive(w0, {
      id: doc.id, from: doc.from, subject: doc.subject, receivedAt: doc.receivedAt,
      type: "unclassified", relevant: true, v: {}, cf: {}, tc: 0, ms, eng: "none", err,
    });
  }

  const fitted = fitWire(w);
  return respondWithWire({
    ok: true, store: rebuild(fitted), docId: doc.id,
    kept: Math.min(MAX_LIVE_DOCS, (fitted.l ?? []).length),
    cookieBytes: wireBytes(fitted),
  }, fitted);
}
