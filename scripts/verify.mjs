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
  /* The disclosure stays, but it is the size of a product label, not the size of a warning.
     "Sample corpus" is what every enterprise demo says; "not a client deployment" is what an
     anxious one says. Same fact, one of them belongs in the chrome. */
  check("sample data is disclosed where a reader looks, and nowhere as a warning",
    (root.html.match(/Sample corpus/g) || []).length >= 1
      && !/not a client deployment/.test(root.html));
  check("the product never argues with itself",
    !/demo corpus/.test(root.html) && !/not a client deployment/.test(root.html)
      && !/synthetic/.test(root.html),
    "README carries the disclosure, the UI does not apologise");
  check("event stream explains itself instead of a bare 0", root.html.includes("empty until replay"));
  check("cold visit shows NO idle zeros", !/Pipeline[\s\S]{0,400}?>\s*0\s*</.test(root.html));
  check("there is no play button on a running system", !/Run pipeline/.test(root.html));
  check("the first thing a prospect is invited to do is send it their work",
    root.html.includes("Send it a document") && root.html.includes('id="intake"'));
  check("the landing face carries the claim, not a feature list",
    /Documents arrive/.test(root.html) && /Rows appear in your systems/.test(root.html));
  check("the hero states what happens to unverifiable documents",
    /held for a human/.test(root.html) && /never guessed/.test(root.html));
  check("hero and console are one page, linked", root.html.includes('href="#console"'));
  check("nothing on the landing face pretends to be live traffic",
    !/live-dot on/.test(root.html.split('id="console"')[0]),
    "the pulsing dot belongs to the console, where a run can actually be running");
  check("the landing face does not sell with adjectives",
    !/revolutionary|game[- ]changing|cutting[- ]edge|AI-powered|leverage|seamless|unlock/i.test(root.html));
  check("it reads as a product, not a demo", root.html.includes("Inbound document automation"));

  // ── 2. the money page must never print a $0 headline ───────────────────────
  const an = await get("/analytics");
  check("GET /analytics is 200", an.status === 200, `status ${an.status}`);
  check("analytics money line has a real number, not $0",
    /Cost of doing this by hand today[\s\S]{0,600}?\$\d{2,}/.test(an.html) && !an.html.includes("$0 a year"));
  check("analytics carries a projection", an.html.includes("a year") && an.html.includes("projected at"));
  check("analytics states the assumptions", an.html.includes("Projection only"));
  check("no price is printed inside the product",
    !an.html.includes("Pilot build") && !an.html.includes("Keeping it running") && !an.html.includes("/mo"),
    "a price in the app reads as a listing; in a proposal it reads as a quote");
  check("analytics ends on an acceptance test, not a discount", an.html.includes("How this gets verified"));

  // ── 3. the other tabs must render, not error ───────────────────────────────
  // the integrations screen is the one that makes it look worth thousands
  const cx = await get("/connections");
  check("GET /connections is 200", cx.status === 200, `status ${cx.status}`);
  check("connections names their systems", /NetSuite|Xero|SAP Business One|HubSpot/.test(cx.html));
  check("connections shows a real payload, not a screenshot", cx.html.includes("idempotency_key"));
  check("connections shows the field map", cx.html.includes("Field map") && cx.html.includes("mapping live"));
  check("connections states what a build still has to add", /Real writes\./.test(cx.html));

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
  const after = await get("/", { cookie: "conduit_s=eyJEiOiJ9" });
  check("a returning visitor still gets the same chrome (nothing invented per session)",
    after.status === 200 && /Sample corpus/.test(after.html));
  check("records page can hand over the rows", (await get("/records")).html.includes("Export CSV ("));

  // ── 6. the held queue is a real workflow, not a picture of one ─────────────
  // This is the moment a prospect judges: click Approve on a held document, reload, and the
  // decision must still be there WITH THE VALUE THEY TYPED. There was no PATCH handler on this
  // route when the first version shipped, so the demo's best screen 405'd in production.
  const cold = await fetch(`${BASE}/api/records`);
  const store0 = await cold.json();
  const heldDoc = Object.values(store0.processed).find(p => p.status === "exception" && p.type !== "unclassified");
  check("a cold visit has something in the held queue", !!heldDoc, heldDoc ? `${held.type} ${heldDoc.flags}` : "nothing held");
  if (heldDoc) {
    const key = Object.keys(heldDoc.extraction?.values ?? {})[0];
    const patched = await fetch(`${BASE}/api/records`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ docId: heldDoc.doc.id, action: "approve", correctedFields: [key],
                             extraction: { values: { ...heldDoc.extraction.values, [key]: "VERIFY-SENTINEL-99" } } }),
    });
    const pj = await patched.json();
    const after1 = pj.store?.processed?.[heldDoc.doc.id];
    check("PATCH approve commits the held document", patched.status === 200 && after1?.status === "committed",
      `http ${patched.status} → ${after1?.status}`);
    check("the approval is written to the visitor cookie", (patched.headers.getSetCookie?.() ?? []).join("").includes("conduit_s="));
    const rec = (pj.store?.records ?? []).find(r => r.sourceDocId === heldDoc.doc.id);
    check("the human's corrected value is what got written", rec?.cells?.[key] === "VERIFY-SENTINEL-99",
      `cells.${key}=${rec?.cells?.[key]}`);
    check("and the audit trail still says a person fixed that field", (rec?.correctedFields ?? []).includes(key),
      `correctedFields=${rec?.correctedFields}`);

    const jar = (patched.headers.getSetCookie?.() ?? []).map(c => c.split(";")[0]).join("; ");
    const reloaded = await get("/", { cookie: jar });
    check("the visitor's own cookie survives the reload", reloaded.status === 200);
    const st2 = await (await fetch(`${BASE}/api/records`, { headers: { cookie: jar } })).json();
    check("their approval survives the reload", st2.processed?.[heldDoc.doc.id]?.status === "committed",
      `after reload: ${st2.processed?.[heldDoc.doc.id]?.status}`);
    const rejected = await fetch(`${BASE}/api/records`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ docId: heldDoc.doc.id }),
    });
    check("a malformed approve is refused, not half-applied", rejected.status === 400);
  }

  // ── 5. the README cannot drift from the code it describes ─────────────────
  const rm = readFileSync("README.md", "utf8");
  check("README has a real demo URL (no placeholder left)",
    rm.includes("https://conduit-demo-version.vercel.app") && !rm.includes("add your Vercel URL"));
  check("README quotes both denominators", rm.includes("88%") && rm.includes("96%"));
  check("README discloses the sample corpus and disclaims client results",
    /sample corpus/i.test(rm) && /No customer data was used/i.test(rm),
    "the UI carries one short label; the README carries the full disclosure");
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
