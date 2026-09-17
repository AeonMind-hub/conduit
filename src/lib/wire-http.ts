/**
 * One place that reads and writes the visitor wire.
 *
 * Before this, the cookie regex and the `seeded` decision were typed out in six different
 * files, which is exactly how the seeded banner ended up permanently false: a page derived the
 * flag from data that another layer had just injected. Keep the derivation here.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_NAME, decodeWire, encodeWire, rebuild, wireBytes, type Wire } from "./session";
import { EMPTY_WIRE } from "./session";
import { DOCS } from "./corpus";
import type { Store } from "./types";

/** A cookie must stay well under 4KB/domain or Vercel 431s the entire app for that visitor. */
export const WIRE_LIMIT = 3800;

export const emptyWire = (): Wire => ({ ...EMPTY_WIRE, d: [], a: [], x: [], c: [], l: [], });

/** Pull our value out of a raw `Cookie:` header (routes have the header, nothing else). */
const valueFromHeader = (cookie: string | null | undefined) =>
  cookie?.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`))?.[1];

/**
 * Pages read the parsed jar, routes read the header. Those two shapes are NOT interchangeable —
 * a jar entry is already the value, so feeding it through the header matcher finds nothing and
 * every visitor then looks like a first-timer. Both are accepted here, once, on purpose.
 */
const readWire = (raw: string | undefined | null) => ({
  raw: raw && raw.length ? raw : undefined,
  w: decodeWire(raw),
});

/** Server Components: the visitor's own state, plus whether we are seeding them. */
export async function visitorState(): Promise<{ wire: Wire; store: Store; seeded: boolean }> {
  const jar = await cookies();
  const { raw, w } = readWire(jar.get(COOKIE_NAME)?.value);
  const seeded = !raw;
  const wire = seeded ? seedWire(w) : w;
  return { wire, store: rebuild(wire, { seeded }), seeded };
}

/** A first-time visitor is handed a completed run of the corpus instead of an empty screen. */
export function seedWire(w: Wire): Wire {
  if (w.d.length) return w;
  return { ...w, d: DOCS.map(d => d.id) };
}

export function requestState(req: Request): { wire: Wire; seeded: boolean } {
  const { raw, w } = readWire(valueFromHeader(req.headers.get("cookie")));
  return { wire: raw ? w : seedWire(w), seeded: !raw };
}

/**
 * Shrink the wire until the encoded cookie fits. Oldest state goes first: corrections, then
 * the pasted documents. Better a visitor loses an old paste than a 431 that makes every page on
 * the domain fail for them — which is the failure mode a demo never recovers from.
 */
export function fitWire(w: Wire): Wire {
  const c = [...w.c];
  const l = [...(w.l ?? [])];
  const out: Wire = { ...w, c, l };              // out shares the arrays, so dropping below shows
  const dropOldest = () => {
    if (c.length) { c.shift(); return true; }
    if (l.length) { l.shift(); return true; }
    return false;
  };
  while (wireBytes(out) > WIRE_LIMIT && dropOldest()) { /* bounded by the arrays emptying */ }
  return out;
}

/** Persist and return a store; refuses to write a cookie that would brick the visitor. */
export function respondWithWire(payload: Record<string, unknown>, w: Wire, status = 200) {
  const encoded = encodeWire(w);
  const len = encoded.length;
  if (len > WIRE_LIMIT) {
    return NextResponse.json({ error: `visitor state too large (${len} bytes); older documents were dropped`,
                              cookieLen: len }, { status: 413 });
  }
  const res = NextResponse.json({ ...payload, cookieLen: len }, { status });
  res.cookies.set(COOKIE_NAME, encoded, {
    path: "/", httpOnly: false, sameSite: "lax", maxAge: 60 * 60 * 24,
  });
  return res;
}
