import { NextResponse } from "next/server";
import { rebuild, type Wire } from "@/lib/session";
import { requestState, respondWithWire, fitWire } from "@/lib/wire-http";

export const dynamic = "force-dynamic";

/**
 * The visitor's decisions, in and out.
 *
 * GET  → the whole store, replayed from their cookie. Returned bare (not wrapped) because
 *        ShellWrap hydrates every page from it; a wrapper here silently breaks the nav counters.
 * PATCH → approve or discard one held document. This is the only write the demo accepts from a
 *         visitor, and it writes the WIRE, not a store: the correction has to survive a reload,
 *         land in the committed record's cells, and still show in the audit trail as
 *         human-corrected. Anything else would make Approve look like a button that forgets.
 */
export async function GET(req: Request) {
  const { wire, seeded } = requestState(req);
  return NextResponse.json(rebuild(wire, { seeded }));
}

interface PatchBody {
  docId?: number;
  action?: string;
  correctedFields?: string[];
  extraction?: { values?: Record<string, string> };
}

const uniq = (n: number[]) => [...new Set(n)];

export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => null)) as PatchBody | null;
  const docId = body?.docId;
  const action = body?.action;

  if (typeof docId !== "number" || (action !== "approve" && action !== "discard")) {
    return NextResponse.json({ error: "needs { docId, action: 'approve' | 'discard' }" }, { status: 400 });
  }

  const { wire } = requestState(req);
  const next: Wire = {
    ...wire,
    d: wire.d.includes(docId) ? wire.d : [...wire.d, docId],
    a: uniq(wire.a), x: uniq(wire.x), c: wire.c.slice(),
  };

  if (action === "approve") {
    next.a = uniq([...next.a.filter(i => i !== docId), docId]);
    next.x = next.x.filter(i => i !== docId);
    const vals = body?.extraction?.values ?? {};
    // Only fields the human actually touched are recorded, and each one keeps its value so the
    // committed row is the corrected one rather than the value the model was unsure about.
    const keys = (body?.correctedFields ?? []).filter(k => typeof vals[k] === "string");
    next.c = [...next.c.filter(r => r[0] !== docId),
              ...keys.map(k => [docId, k, String(vals[k]).slice(0, 120)] as [number, string, string])];
  } else {
    next.x = uniq([...next.x.filter(i => i !== docId), docId]);
    next.a = next.a.filter(i => i !== docId);
    next.c = next.c.filter(r => r[0] !== docId);
  }

  const w = fitWire(next);          // same wire is written to the cookie AND replayed, so the
  const store = rebuild(w);         // response can never disagree with what the visitor reloads
  return respondWithWire({ ok: true, store, docId, action }, w);
}
