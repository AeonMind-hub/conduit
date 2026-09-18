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

const PORT = 4300 + (process.pid % 1600);
/** The pilot room is shut unless a code exists, so the suite configures one for its own server and
 *  asserts both halves: that a run works with it, and that nothing at all works without one. */
const PILOT_CODE = "verify-northwind";
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

/* One process, not `npx next`: a wrapper means the kill at the end of this file signals `npx` and
 * leaves `next start` running, and every later run then verifies a build that no longer exists. The
 * suite that cannot tell which server it is talking to is not a suite. */
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], {
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", OFFLINE_DEMO: "1", PILOT_CODES: PILOT_CODE },
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
});
const stopServer = () => { try { process.kill(-server.pid, "SIGKILL"); } catch { try { server.kill("SIGKILL"); } catch { /* gone */ } } };
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

/** Thirteen small files: over the per-run document bound, nowhere near the platform's body limit,
 *  so a 413 here can only have come from the product's own cap rather than the host's. */
const pad = k => ("PO Number: 9" + (1000 + k) + "\nQuantity: 10 units\nSupplier: Someone Ltd\n").repeat(900);

const get = async (path, headers = {}) => {
  const r = await fetch(BASE + path, { headers, redirect: "manual" });
  return { status: r.status, html: tidy(await r.text()), cookie: r.headers.getSetCookie?.() ?? [] };
};

try {
  if (!await waitReady()) throw new Error(`server never came up:\n${out.slice(-1500)}`);

  // ── 0. the port must be ours, or every assertion below proves nothing ──────
  /*  A leftover `next start` from an earlier run answers on a reused port, and the suite then grades a
      build that no longer exists — which is exactly how one run here reported a string that had been
      deleted from the source. So an occupied port is a hard failure, not a shortcut. */
  {
    /* Every port in this sandbox looks "bound" to a probe, so ownership is proved by identity instead:
       the build id Next writes into the page must equal the build id on disk. That is the difference
       between testing this change and silently grading whatever `next start` survived from an earlier
       run — which already produced one impossible result in this repo's history. */
    const built = readFileSync(".next/BUILD_ID", "utf8").trim();
    const page = await get("/");
    check("the server answering this suite is the build on disk", page.html.includes(built),
      `disk ${built}; page ${page.html.includes(built) ? "matches" : "does not contain it — stale server, kill it and re-run"}`);
    if (!page.html.includes(built)) throw new Error(`the answer on ${BASE} is not this build (${built})`);
  }

  // ── 1. a cold visitor with no cookie must land on a FINISHED run ───────────
  const root = await get("/");
  check("GET / is 200", root.status === 200, `status ${root.status}`);
  /* Copy assertions run on the tag-stripped text. The interface is typeset now — an italic inside
     a headline is a design decision, and it must not be able to break a claim by inserting markup
     mid-sentence. DOM assertions below still look at raw HTML, where the element is the claim. */
  const txt = root.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
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
    /Documents arrive/.test(txt) && /Rows appear in your systems\./.test(txt));
  check("the hero states what happens to unverifiable documents",
    /goes to a human/.test(txt) && /it is held, never guessed/.test(txt));
  check("hero and console are one page, linked", root.html.includes('href="#console"'));
  /* The pulsing dot is the app's only "something is happening right now" signal, so it must
     appear during a run and never otherwise — not in the rail beside an unconnected mailbox, not
     on the landing face. Checked on a cold visit, where nothing is in flight. */
  check("a cold visit shows no live-traffic indicator anywhere", !/live-dot on/.test(root.html));
  check("the landing face does not sell with adjectives",
    !/revolutionary|game[- ]changing|cutting[- ]edge|AI-powered|leverage|seamless|unlock/i.test(root.html));
  check("it reads as a product, not a demo", root.html.includes("Inbound document automation"));

  // ── 1b. the Record frame: a bound document, not a dashboard ────────────────
  check("the page is framed like a document (masthead, main, footer)",
    /class="mast/.test(root.html) && root.html.includes("<main") && root.html.includes("back to the run"));
  check("the table of contents reaches every section of the product",
    (root.html.match(/class="toclink/g) || []).length === 5,
    `${(root.html.match(/class="toclink/g) || []).length} links`);
  check("the new theme actually shipped, rather than the dark one underneath it",
    root.html.includes('data-theme="record"'));
  /* Typography is the product's voice here. If the fonts came from a CDN, the page would render in
     a fallback for a second on slow warehouse wifi — which is the exact moment a prospect decides
     whether this looks like something they would pay for. */
  check("type is first-party: self-hosted woff2, no font CDN in the document",
    root.html.includes("/_next/static/media/") && !/fonts\.(googleapis|gstatic)\.com/.test(root.html));
  check("the sheet is numbered where a reader can quote it back",
    /class="sect-no">01</.test(root.html) && /class="sect-no">03</.test(root.html));
  /* The console used to say "watching intake" while nothing was connected. A label claiming an
     input the deployment does not have is worse than an empty one. */
  check("no screen claims to be watching a mailbox", !/watching intake/i.test(root.html));
  // A duplicated stat grid shipped once and was visible on every visit. Never again, by test.
  check("the counts are printed once", (root.html.match(/>Processed</g) || []).length === 1);
  /* The fill bar means something specific now: ink = walked through, amber = a gate cut, green =
     the write. One green bar per sheet, or green stops meaning anything. */
  check("exactly one write-meter on the console sheet",
    (root.html.match(/meter mt-2[^"]*write/g) || []).length === 1,
    `${(root.html.match(/meter mt-2[^"]*write/g) || []).length} found`);

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

  {
    const { mkPdf, PO_LINES, PO_TWO_LINE_LINES, BLANK_PDF_LINES, INVOICE_GOOD, INVOICE_NO_PO_REF } =
      await import("./pdf-fixture.mjs");

    /* One upload, one paste, one scan, one two-line order, one invoice with no reference: five
     * documents and three different outcomes, which is the whole product in one batch. */
    const form = new FormData();
    form.append("code", PILOT_CODE);
    form.append("files", new Blob([mkPdf(PO_LINES)], { type: "application/pdf" }), "northgate-po.pdf");
    form.append("files", new Blob([mkPdf(PO_TWO_LINE_LINES)], { type: "application/pdf" }), "two-line-order.pdf");
    form.append("files", new Blob([mkPdf(BLANK_PDF_LINES)], { type: "application/pdf" }), "scan-of-an-invoice.pdf");
    form.append("files", new Blob([INVOICE_GOOD.join("\n")], { type: "text/plain" }), "invoice.txt");
    form.append("text", INVOICE_NO_PO_REF.join("\n"));
    const t0 = Date.now();
    const res = await fetch(`${BASE}/api/pilot`, { method: "POST", body: form });
    check("the pilot room answers a code-carrying run", res.status === 200, `HTTP ${res.status}`);
    check("a pilot run streams events rather than waiting to be finished",
      (res.headers.get("content-type") ?? "").includes("x-ndjson"));
    // The "we keep nothing" line is only true if no state comes back with the run.
    check("a pilot run sets no cookie, so nothing follows the visitor anywhere",
      (res.headers.getSetCookie?.() ?? []).length === 0,
      (res.headers.getSetCookie?.() ?? []).join(",").slice(0, 40));

    const text = await res.text();
    const ev = text.split("\n").filter(Boolean).map(l => JSON.parse(l));
    const stages = ev.filter(e => e.t === "stage");
    const docs = ev.filter(e => e.t === "doc");
    const done = ev.find(e => e.t === "done");
    const start = ev.find(e => e.t === "start");
    const ORDER = ["receive", "text", "classify", "extract", "gates", "route"];
    const mine = k => stages.filter(st => st.i === k).map(st => st.stage);

    check("the run says which engine did the work", start?.engine === "rules", `engine=${start?.engine}`);
    check("five documents arrive and five documents are answered", docs.length === 5, `docs=${docs.length}`);
    check("every readable document is walked through the six stages in order",
      [0, 1, 3, 4].every(k => mine(k).join(",") === ORDER.join(",")), JSON.stringify(mine(0)));
    check("a file with nothing readable in it stops after the text step, and says so",
      mine(2).join(",") === "receive,text", JSON.stringify(mine(2)));
    check("the PDF's text layer was read by the server, not assumed",
      stages.some(st => st.stage === "text" && /pdf text layer/.test(st.detail ?? "")),
      stages.filter(st => st.stage === "text").map(st => st.detail).join(" | ").slice(0, 70));
    check("pasted text goes through the same intake as a file, so the two cannot disagree",
      stages.some(st => st.i === 4 && st.stage === "text" && /pasted/.test(st.detail ?? "")),
      stages.filter(st => st.i === 4 && st.stage === "text").map(st => st.detail).join(""));
    check("a scan is held with its reason, never filled in",
      docs.some(d => d.verdict?.status === "exception" && /OCR|text layer/i.test(d.verdict.note ?? "")),
      docs.map(d => d.verdict?.note).join(" | ").slice(0, 90));

    const clean = docs.find(d => d.verdict?.status === "committed");
    check("a complete order clears every gate and comes back with a body prepared", !!clean,
      docs.map(d => `${d.verdict?.status}:${(d.verdict?.flags ?? []).join("+")}`).join(" | "));
    check("the quantity is read whole — 4,000, never a truncated 400 or 120",
      clean?.verdict?.fields?.some(f => f.key === "quantity" && f.value === "4000"),
      JSON.stringify(clean?.verdict?.fields?.map(f => [f.key, f.value]) ?? []).slice(0, 160));
    check("every field on screen carries a confidence, and anything under 90% carries a reason",
      (clean?.verdict?.fields ?? []).every(f => typeof f.confidence === "number" &&
        (f.confidence >= 0.9 || f.value === "" || !!f.reason)));
    check("the name on the row is the name the document actually printed",
      clean?.verdict?.fields?.some(f => f.key === "customer" && /NORTHGATE/.test(f.value)),
      JSON.stringify(clean?.verdict?.fields?.find(f => f.key === "customer")?.value ?? ""));

    const twoline = docs.find(d => (d.verdict?.flags ?? []).some(f => /SKU/.test(f)));
    check("a two-line order is held instead of one line being guessed at", !!twoline,
      docs.map(d => (d.verdict?.flags ?? []).join("+")).join(" | "));
    check("and the reason says the thing a buyer needs to hear: one row per write is a build decision",
      /line|row/i.test(twoline?.verdict?.fields?.find(f => f.key === "sku")?.reason ?? ""),
      twoline?.verdict?.fields?.find(f => f.key === "sku")?.reason?.slice(0, 80) ?? "no reason given");

    const heldInvoice = docs.find(d => d.verdict?.flags?.includes("MISSING_PO_REF"));
    check("an invoice with no PO reference is stopped, and no body is prepared for it",
      heldInvoice?.verdict?.status === "exception" && heldInvoice?.verdict?.payload === null);
    // Four of the five reached routing; the scan never did, so it never gets a routing line either —
    // a stage list that pads itself out for a document that stopped early would be theatre.
    check("nothing on the page is allowed to read as a write: every row closes the same way",
      stages.filter(st => st.stage === "route").length === 4 &&
      stages.filter(st => st.stage === "route").every(st => /nothing was written/.test(st.detail ?? "")),
      stages.filter(st => st.stage === "route").map(st => st.detail).join(" | ").slice(0, 90));

    check("the batch finishes well inside the platform's 60s ceiling",
      Date.now() - t0 < 15_000, `${Date.now() - t0} ms for 5 documents`);
    check("the totals describe this batch and nothing else", done?.store?.stats?.total === 5,
      `total=${done?.store?.stats?.total}`);
    check("no model call is claimed where none was made, and nothing is claimed as stored",
      done?.store?.stats?.liveCalls === 0 && done?.stored === false);
    const prepared = docs.flatMap(d => d.verdict?.payload ? [d.verdict.payload] : []);
    check("each prepared body carries an idempotency key, so a re-run cannot double-post",
      prepared.length >= 2 && prepared.every(p => /:/.test(String(p.idempotency_key ?? ""))),
      `bodies=${prepared.length}`);
    check("each body names the engine that produced it, because an audit trail has to",
      prepared.every(p => p.provenance?.engine === "rules"),
      JSON.stringify(prepared[0]?.provenance ?? {}).slice(0, 90));
    check("a held document produces no body at all, rather than a partial one",
      docs.filter(d => d.verdict?.status === "exception").every(d => d.verdict.payload === null));

    // refusals, because an open upload endpoint is the thing this must never become
    const wrong = await fetch(`${BASE}/api/pilot`, { method: "POST", body: new FormData() });
    check("no code means no run", wrong.status === 403, `HTTP ${wrong.status}`);
    const empty = await fetch(`${BASE}/api/pilot`, { method: "POST",
      body: (() => { const f = new FormData(); f.append("code", PILOT_CODE); return f; })() });
    check("an empty submission is answered, not crashed", empty.status === 400, `HTTP ${empty.status}`);
    const big = new FormData();
    big.append("code", PILOT_CODE);
    for (let k = 0; k <= 12; k++)
      big.append("files", new Blob([pad(k)], { type: "text/plain" }), `d${k}.txt`);
    const flooded = await fetch(`${BASE}/api/pilot`, { method: "POST", body: big });
    check("a run is bounded, so one click cannot become a bill", flooded.status === 413,
      `HTTP ${flooded.status}`);
    const oversize = await fetch(`${BASE}/api/pilot`, { method: "POST", body: (() => {
      const f = new FormData(); f.append("code", PILOT_CODE);
      f.append("files", new Blob(["x".repeat(1_600_000)], { type: "text/plain" }), "huge.txt");
      return f; })() });
    check("one enormous file is named and refused rather than silently dropped",
      oversize.status === 200
        ? (await oversize.text()).includes("caps one document at")
        : oversize.status === 413, `HTTP ${oversize.status}`);

    const html = (await get("/")).html;
    check("the pilot room is on the page a buyer lands on", /Put your own paper through it/.test(html));
    check("the page says out loud what the endpoint does not keep",
      /no\s+database\s+behind\s+it/i.test(tidy(html)));
  }

  // ── 4c. the palette the components name must exist in the shipped CSS ─────
  {
    /* Tailwind drops a utility that matches no token — silently, with no build error, on a page that
       still photographs fine. Every muted caption and hairline in this app depends on those classes
       being real, so the built stylesheet is asked, not the config file. */
    const html = (await get("/")).html;
    const href = /href="(\/[^"]+\.css)"/.exec(html)?.[1];
    check("the page ships its own stylesheet", !!href, href ?? "no css link found");
    if (href) {
      const css = await fetch(BASE + href).then(r => r.text());
      for (const cls of [".text-mute", ".text-ink2", ".bg-paper2", ".border-rule2", ".text-amber"])
        check(`the built stylesheet defines ${cls}`, css.includes(cls + "{"),
          css.includes(cls + "{") ? "" : "class absent from the shipped CSS — the hierarchy would be inherited by accident");
    }
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
  stopServer();
}

console.log(`\nverify — ${ok.length} passed, ${fails.length} failed\n`);
for (const l of ok) console.log(`  ok   ${l}`);
for (const l of fails) console.log(`  FAIL ${l}`);
console.log();
process.exit(fails.length ? 1 : 0);
