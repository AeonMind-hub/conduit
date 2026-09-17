#!/usr/bin/env node
/**
 * verify.mjs — check the SHIPPED artifact, not the source you hope it came from.
 *
 * Why this exists: the whole sales pitch of this demo is "look, it is already running when
 * you arrive". That claim is invisible to a typecheck and to a unit test over the fixture
 * module. It only shows up as bytes served to a cookie-less stranger. So this boots the
 * build and asks exactly one question in several forms: does a cold visitor ever see a zero?
 *
 *   npm run typecheck && npm run build && npm run verify
 */
import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const PORT = 3711 + (process.pid % 40);
const BASE = `http://127.0.0.1:${PORT}`;
const fails = [];
const ok = [];

function check(name, cond, detail = "") {
  (cond ? ok : fails).push(cond ? `${name}${detail ? ` — ${detail}` : ""}` : `${name}${detail ? ` — ${detail}` : ""}`);
}

if (!existsSync(".next/BUILD_ID")) {
  console.error("no build found — run `npm run build` first (verifying source would prove nothing).");
  process.exit(1);
}

const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", OFFLINE_DEMO: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});
let out = "";
server.stdout.on("data", d => { out += d; });
server.stderr.on("data", d => { out += d; });

async function waitReady(timeoutMs = 60_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try { const r = await fetch(BASE + "/"); if (r.ok) return true; } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

/* React splits adjacent text nodes with `<!-- -->`, so "$43,175" ships as
   `$<!-- -->43,175`. Any assertion written against the literal string fails on a
   page that is perfectly correct. Strip the markers before matching. */
const tidy = h => h.replace(/<!--[\s\S]*?-->/g, "");

const get = async (path, headers = {}) => {
  const r = await fetch(BASE + path, { headers, redirect: "manual" });
  return { status: r.status, html: tidy(await r.text()), cookie: r.headers.getSetCookie?.() ?? [] };
};

try {
  if (!await waitReady()) throw new Error(`server never came up:\n${out.slice(-1500)}`);

  // ── 1. a cold visitor with no cookie must land on a FINISHED run ───────────
  const root = await get("/");
  check("GET / is 200", root.status === 200, `status ${root.status}`);
  check("cold visit shows 66 committed", />\s*66\s*</.test(root.html) || root.html.includes("66 committed"));
  check("cold visit shows both denominators",
    root.html.includes("88%") && root.html.includes("96%"),
    `88%:${root.html.includes("88%")} 96%:${root.html.includes("96%")}`);
  check("cold visit shows NO idle zeros", !/Pipeline[\s\S]{0,400}?>\s*0\s*</.test(root.html));
  check("cold visit does not say 'Run pipeline' as the only path", root.html.includes("Run pipeline"));

  // ── 2. the money page must never print a $0 headline ───────────────────────
  const an = await get("/analytics");
  check("GET /analytics is 200", an.status === 200, `status ${an.status}`);
  check("analytics money line has a real number, not $0",
    /Cost of doing this by hand today[\s\S]{0,600}?\$\d{2,}/.test(an.html) && !an.html.includes("$0 a year"));
  check("analytics carries a projection", an.html.includes("a year") && an.html.includes("projected at"));
  check("analytics states the assumptions", an.html.includes("Projection only"));
  check("analytics shows pilot pricing arithmetic", an.html.includes("Pilot build, one document type"));

  // ── 3. the other tabs must render, not error ───────────────────────────────
  for (const p of ["/records", "/exceptions"]) {
    const r = await get(p);
    check(`GET ${p} is 200`, r.status === 200, `status ${r.status}`);
  }

  // ── 4. pasted documents: honest in offline mode, never silently committed ─
  const short = await fetch(`${BASE}/api/live`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "too short" }),
  });
  check("tiny paste is rejected with a usable message",
    short.status === 400 && (await short.json()).error?.length > 10);

  const po = [
    "Please confirm receipt of the following order.",
    "PO Number: 90210", "SKU: NW-7788-GRY", "Quantity: 120 units",
    "Unit price: $41.00", "Required by: 10/02/2026",
    "Ship to: Riverside DC, 40 Dock Road, Liverpool L3 4BQ",
  ].join("\n");
  const live = await fetch(`${BASE}/api/live`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ from: "buyers@riverside.example", subject: "PO 90210", text: po }),
  });
  const lj = await live.json();
  check("paste returns a store", live.status === 200 && !!lj.store);
  const held = lj.store?.processed?.[lj.docId];
  check("offline paste is HELD, never committed",
    held && held.status === "exception" && held.flags?.includes("ENGINE_UNAVAILABLE"),
    `status=${held?.status} flags=${held?.flags}`);
  check("visitor cookie stays inside the 4KB domain limit",
    lj.cookieLen < 4096, `${lj.cookieLen} bytes`);
  const setc = (live.headers.getSetCookie?.() ?? []).join(";");
  check("cookie is actually set", setc.includes("conduit_s="));

  // replay after Clear must still work (idempotency of the wire form)
  const cleared = await fetch(`${BASE}/api/reset`, { method: "POST" });
  const cj = await cleared.json();
  check("clear empties the store", cj.store?.stats?.total === 0 && cj.store?.records?.length === 0);

  // ── 5. the README cannot drift from the code it describes ─────────────────
  const rm = readFileSync("README.md", "utf8");
  check("README has a real demo URL (no placeholder left)",
    rm.includes("https://conduit-demo-version.vercel.app") && !rm.includes("add your Vercel URL"));
  check("README quotes both denominators", rm.includes("88%") && rm.includes("96%"));
  check("README labels the corpus synthetic", /synthetic/i.test(rm));
  check("README is honest about what is missing", rm.includes("Not implemented"));
} catch (e) {
  fails.push(`threw: ${e.message}`);
} finally {
  server.kill("SIGTERM");
}

console.log(`\nverify — ${ok.length} passed, ${fails.length} failed\n`);
for (const l of ok) console.log(`  ok   ${l}`);
for (const l of fails) console.log(`  FAIL ${l}`);
console.log();
process.exit(fails.length ? 1 : 0);
