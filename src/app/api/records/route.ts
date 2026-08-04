import { NextResponse } from "next/server";
import { COOKIE_NAME, decodeWire, encodeWire, rebuild } from "@/lib/session";

export const dynamic = "force-dynamic";

function wireFrom(req: Request) {
  return decodeWire(req.headers.get("cookie")?.match(/conduit_s=([^;]+)/)?.[1]);
}

export async function GET(req: Request) {
  return NextResponse.json(rebuild(wireFrom(req)));
}

export async function PATCH(req: Request) {
  const { docId, correctedFields, action } = (await req.json()) as {
    docId: number; correctedFields: string[]; action: "approve" | "discard";
  };
  const w = wireFrom(req);

  if (action === "discard") {
    if (!w.x.includes(docId)) w.x.push(docId);
    w.a = w.a.filter(i => i !== docId);
  } else {
    if (!w.a.includes(docId)) w.a.push(docId);
    w.x = w.x.filter(i => i !== docId);
    for (const k of correctedFields) {
      if (!w.c.some(([i, f]) => i === docId && f === k)) w.c.push([docId, k]);
    }
  }

  const store = rebuild(w);
  const res = NextResponse.json({ ok: true, store });
  res.cookies.set(COOKIE_NAME, encodeWire(w), {
    path: "/", httpOnly: false, sameSite: "lax", maxAge: 60 * 60 * 24,
  });
  return res;
}
