import { NextResponse } from "next/server";
import { COOKIE_NAME, EMPTY_WIRE, encodeWire, rebuild } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Blank slate — clears the pasted documents too, not just the corpus run. */
export async function POST() {
  const res = NextResponse.json({ ok: true, store: rebuild({ ...EMPTY_WIRE, l: [] }) });
  res.cookies.set(COOKIE_NAME, encodeWire({ ...EMPTY_WIRE, l: [] }), {
    path: "/", httpOnly: false, sameSite: "lax", maxAge: 60 * 60 * 24,
  });
  return res;
}
