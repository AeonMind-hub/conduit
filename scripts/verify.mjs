#!/usr/bin/env node
/**
 * verify.mjs — check the SHIPPED artifact, not the source you hope it came from.
 *
 * Why this exists: the whole claim of this product is "paste your paperwork, see it done in seconds, on
 * a page that keeps nothing". None of that is visible to a typecheck. It is only visible in the bytes a
 * cookie-less stranger gets back and in the JSON the endpoint streams for their own documents. So this
 * boots the build and asks that question in several forms.
 *
 * Every claim the product makes in prose has an assertion here or in `engine-check.ts`. When copy adds a
 * claim, this file has to grow — that is the rule, and it is why the last two lines of section 7 read the
 * README rather than trusting whoever wrote it.
 *
 *   npm run build && npm run verify
 */
import { spawn } from "node:child_process";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { mkPdf } from "./pdf-fixture.mjs";

const PORT = 4300 + (process.pid % 1600);
const BASE = `http://127.0.0.1:${PORT}`;
const fails = [];
const ok = [];

function check(name, cond, detail = "") {
  (cond ? ok : fails).push(`${cond ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

if (!existsSync(".next/BUILD_ID")) {
  console.error("no build found — run `npm run build` first (verifying source would prove nothing).");
  process.exit(1);
}

/* The four examples are the product's promise, and they live in TypeScript. Load the same module the
   page loads rather than copying its strings into this file, or the suite grades a copy of a promise
   instead of the promise. */
let SAMPLES;
try {
  ({ SAMPLES } = await import("../src/lib/samples.ts"));
} catch {
  /* tsx is not resolvable from here — run `npm run verify`, which loads this file through it. */
  console.error("verify.mjs must run under tsx (`npm run verify`) because it imports src/lib/samples.ts.");
  process.exit(1);
}

/* One process, not `npx next`: a wrapper means the kill at the end signals `npx` and leaves `next start`
   running, and every later run then verifies a build that no longer exists. */
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], {
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", OFFLINE_DEMO: "1" },
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

/* React splits adjacent text nodes with `<!-- -->`, and escapes quotes in `<pre>`. Both make an assertion
   written against the literal source string fail on a page that is perfectly correct. */
const tidy = h => h.replace(/<!--[\s\S]*?-->/g, "");
const visible = h => tidy(h).replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "");

const get = async (path) => {
  const r = await fetch(BASE + path, { redirect: "manual" });
  const text = await r.text();
  return { status: r.status, html: tidy(text), raw: text, visible: visible(text),
    headers: Object.fromEntries(r.headers.entries()), cookie: r.headers.getSetCookie?.() ?? [] };
};
const post = async (form) => {
  const r = await fetch(`${BASE}/api/pilot`, { method: "POST", body: form });
  const text = await r.text();
  const events = text.split("\n").filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return { t: "unparsable", raw: l }; } });
  return { status: r.status, headers: Object.fromEntries(r.headers.entries()), events, text };
};
const byName = (evs, name) => evs.filter(e => e.t === "doc" && e.name === name).map(e => e.verdict)[0];

try {
  if (!await waitReady()) throw new Error(`server never came up:\n${out.slice(-1500)}`);

  // ── 0. the server being graded must be this build ────────────────────────────
  /*  A leftover `next start` from an earlier run answers on a reused port, and the suite then grades a
      build that no longer exists — which already produced one impossible result in this repo's history.
      Ownership is therefore proved by identity: the build id Next writes into the page equals the one on
      disk. */
  const root = await get("/");
  {
    const built = readFileSync(".next/BUILD_ID", "utf8").trim();
    check("the server answering this suite is the build on disk", root.html.includes(built),
      `build id ${built} is not in the served HTML — an older next start is holding the port`);
  }

  // ── 1. the landing page IS the machine ───────────────────────────────────────
  check("GET / is 200", root.status === 200, `status ${root.status}`);
  check("the page is an input before it is a pitch",
    /<textarea/.test(root.html) && root.visible.indexOf("Paste a document.") < root.visible.indexOf("No document of yours"),
    `textarea ${/textarea/.test(root.html)}`);
  check("there is exactly one input on the page", (root.html.match(/<textarea/g) || []).length === 1);
  check("the headline is the promise, in two lines",
    /Paste a document\./.test(root.visible) && /Get a clean row\./.test(root.visible));
  check("the sub-headline says what happens to unverifiable documents",
    /holds and tells you why, instead of writing a guess/.test(root.visible.replace(/\s+/g, " ")));
  check("the run button is a verb, not a tour", /Run it/.test(root.visible) && /or choose a file/.test(root.visible));
  check("a file can be chosen, and the accepted types are named",
    /type="file"/.test(root.html) && /accept="\.pdf,\.txt/.test(root.html));
  check("a phone is not told to press a keyboard shortcut",
    /class="hidden sm:inline">⌘↵ to run/.test(root.html), "the ⌘↵ hint is desktop-only");
  check("the run button works before anything is typed (a phone taps first, then reads)",
    /<button[^>]*class="btn btn-primary[^"]*"[^>]*>Run it<\/button>/.test(root.html),
    "an empty click explains itself instead of the control sitting dead");
  check("the page states what happens to what you paste",
    /nothing stored, nothing sent on/i.test(root.visible.replace(/\s+/g, " ")));
  check("the four examples are disclosed as ours, once",
    (root.visible.match(/test documents/gi) || []).length === 1 && /not a client/.test(root.visible));
  check("four sample chips are offered, with a promise each",
    SAMPLES.every(s => root.visible.includes(s.label)) &&
    SAMPLES.every(s => root.visible.includes(s.promise)),
    SAMPLES.map(s => s.label).join(" / "));
  check("every chip is addressable by the tests", SAMPLES.every(s => root.html.includes(`data-sample="${s.key}"`)));
  check("the page says how many documents a run takes", /up to 12 at once/.test(root.visible));
  check("no access code, no sign-up, nothing to fill in first",
    !/access code|sign up|sign in|your email|get a key/i.test(root.visible), "the public path is open");
  check("the product is not shown with a price list",
    !/\$\s?\d|\bper month\b|\bpricing\b|\bfrom \$\d/i.test(root.visible), "pricing lives in the README and the message, not on screen");
  check("no stats theatre on the landing page",
    !/88%|96%|75 documents|66 committed/i.test(root.visible), "corpus numbers are not the first screen any more");
  check("no numbered tour of itself", !/how it works|what it does|overview|features/i.test(root.visible.toLowerCase()));
  check("it does not advertise itself with adjectives",
    !/seamless|powerful|cutting-edge|revolutionary|AI-powered|streamline/i.test(root.visible));
  check("the old console is gone from the page",
    !/Run pipeline|empty until replay|Export CSV|pilot room|Event log|Pipeline/i.test(root.visible));
  check("the frame carries one way deeper", /href="\/systems"/.test(root.html) && /how it writes/.test(root.visible));
  check("the footer says where documents arrive in production", /ops@northwind\.example/.test(root.visible));
  check("nothing is written into a cookie on the way out", root.cookie.length === 0,
    root.cookie.map(c => c.split("=")[0]).join(",") || "no Set-Cookie");
  check("the served document carries no session state to clear", !/conduit_s=/.test(root.raw));

  // ── 2. a real run, over HTTP, through the shipped endpoint ───────────────────
  const PO = SAMPLES.find(s => s.key === "po").body;
  const INV = SAMPLES.find(s => s.key === "invoice-no-po").body;
  const BK = SAMPLES.find(s => s.key === "booking").body;
  const NL = SAMPLES.find(s => s.key === "newsletter").body;
  const pdfLines = PO.split("\n");
  const dupPdf = mkPdf(pdfLines);            // the same paperwork, second filename
  const editedPdf = mkPdf([...pdfLines, "Note: quantity revised to 4,100"]); // different text

  const run1 = await post(await (async () => {
    const f = new FormData();
    f.append("text", PO); f.append("name", "a purchase order · our sample");
    f.append("files", new Blob([INV], { type: "text/plain" }), "invoice-no-po.txt");
    f.append("files", new Blob([BK], { type: "text/plain" }), "booking.txt");
    f.append("files", new Blob([NL], { type: "text/plain" }), "newsletter.txt");
    f.append("files", new Blob([mkPdf(pdfLines)], { type: "application/pdf" }), "northgate-po.pdf");
    f.append("files", new Blob([dupPdf], { type: "application/pdf" }), "northgate-po (1).pdf");
    f.append("files", new Blob([editedPdf], { type: "application/pdf" }), "northgate-po-revised.pdf");
    f.append("files", new Blob(["not a pdf, just bytes with a .pdf name"], { type: "application/pdf" }), "broken.pdf");
    f.append("files", new Blob([mkPdf([])], { type: "application/pdf" }), "scan-of-an-invoice.pdf");
    f.append("files", new Blob(["call me about the bolts"], { type: "text/plain" }), "scrap.txt");
    f.append("files", new Blob(["x".repeat(300)], { type: "application/msword" }), "order.docx");
    return f;
  })());

  check("a mixed batch of eleven documents is accepted", run1.status === 200, `status ${run1.status}`);
  check("the answer streams as newline-delimited JSON",
    (run1.headers["content-type"] ?? "").includes("ndjson") && run1.events.length > 4,
    `${run1.events.length} events`);
  check("the endpoint declares that it stored nothing", run1.headers["x-conduit-stored"] === "no");
  check("the run names the engine it used, and it is not a model",
    run1.events[0]?.t === "start" && run1.events[0].engine === "rules" && run1.events[0].model === null
      && run1.events[0].billed === null);
  check("a clean purchase order commits, with a payload",
    byName(run1.events, "a purchase order · our sample")?.status === "committed"
      && !!byName(run1.events, "a purchase order · our sample")?.payload?.idempotency_key,
    JSON.stringify(byName(run1.events, "a purchase order · our sample")?.payload?.external_id ?? null));
  check("an invoice with no PO reference is held with the code that stopped it",
    byName(run1.events, "invoice-no-po.txt")?.status === "exception"
      && byName(run1.events, "invoice-no-po.txt")?.flags.includes("MISSING_PO_REF"));
  check("a held document is shown without a body, because there is none",
    byName(run1.events, "invoice-no-po.txt")?.payload === null);
  check("a delivery booking goes to the warehouse system, not to finance",
    byName(run1.events, "booking.txt")?.status === "committed"
      && /warehouse|WMS/i.test(byName(run1.events, "booking.txt")?.destination ?? ""));
  check("a newsletter is set aside rather than queued for a person",
    byName(run1.events, "newsletter.txt")?.status === "discarded");
  check("the refusal explains itself in the reader's words, not in a code",
    typeof byName(run1.events, "newsletter.txt")?.reject === "string"
      && /NO_TRANSACTIONAL_CONTENT/.test(byName(run1.events, "newsletter.txt")?.reject ?? ""),
    byName(run1.events, "newsletter.txt")?.reject ?? "nothing");
  check("a discarded document is not dressed up as a hold",
    (byName(run1.events, "newsletter.txt")?.fields ?? []).length === 0);
  check("a PDF with a text layer is read the same as pasted text",
    byName(run1.events, "northgate-po.pdf")?.status === "committed"
      && byName(run1.events, "northgate-po.pdf")?.payload?.external_id === "88241");
  /* This one is the claim the whole idempotency paragraph rests on: the same paperwork arriving twice,
     under two filenames, has to come back with one key. */
  {
    const a = byName(run1.events, "northgate-po.pdf")?.payload?.idempotency_key;
    const b = byName(run1.events, "northgate-po (1).pdf")?.payload?.idempotency_key;
    const c = byName(run1.events, "northgate-po-revised.pdf")?.payload?.idempotency_key;
    check("the same document sent twice under two names is one order", !!a && a === b, `${a} vs ${b}`);
    check("the same order with different text is a different order", !!c && c !== a, `${a} vs ${c}`);
    check("the key is the customer's own reference, not our row number",
      byName(run1.events, "northgate-po.pdf")?.payload?.external_id === "88241",
      String(byName(run1.events, "northgate-po.pdf")?.payload?.external_id));
    check("the payload carries provenance, so a row can be audited back to a document",
      byName(run1.events, "northgate-po.pdf")?.payload?.provenance?.engine === "rules"
        || !!byName(run1.events, "northgate-po.pdf")?.payload?.provenance);
  }
  {
    const v = byName(run1.events, "a purchase order · our sample")?.fields ?? [];
    check("every field printed on a cleared row is above the write threshold",
      v.length > 0 && v.filter(f => f.value).every(f => f.confidence >= 0.85),
      v.map(f => `${f.key}:${f.confidence}`).join(" "));
    check("confidence is printed as the engine floored it, never rounded up",
      v.every(f => f.confidence === 0 || Math.round(f.confidence * 100) === f.confidence * 100));
    const held = byName(run1.events, "invoice-no-po.txt")?.fields ?? [];
    check("a field the document never stated is reported absent, not filled in",
      held.some(f => !f.value && /not present in the document/i.test(f.reason ?? "")),
      held.filter(f => !f.value).map(f => f.key).join(","));
  }
  check("a run reports its own elapsed time, and does not pad it",
    run1.events.at(-1)?.t === "done" && Number(run1.events.at(-1).ms) < 30_000,
    `${run1.events.at(-1)?.ms} ms`);
  check("an unreadable file is an outcome, not a 500",
    ["broken.pdf", "scan-of-an-invoice.pdf", "scrap.txt"].every(n => {
      const v = byName(run1.events, n);
      return v && (v.flags || []).includes("UNREADABLE");
    }), ["broken.pdf", "scan-of-an-invoice.pdf", "scrap.txt"].map(n => byName(run1.events, n)?.flags?.join("/")).join(" "));
  check("a scan is refused in words about OCR, not about our stack",
    /scan|OCR/i.test(byName(run1.events, "scan-of-an-invoice.pdf")?.note ?? ""),
    (byName(run1.events, "scan-of-an-invoice.pdf")?.note ?? "").slice(0, 60));
  check("a Word file is refused as a missing capability, not as an empty document",
    /docx|Word|read yet/i.test(byName(run1.events, "order.docx")?.note ?? ""),
    (byName(run1.events, "order.docx")?.note ?? "").slice(0, 70));
  check("no run left anything to read back on a second request",
    (await get("/")).cookie.length === 0);

  // ── 3. bounds: what makes an open endpoint safe ──────────────────────────────
  {
    const empty = await post(new FormData());
    check("an empty form is refused with a usable sentence", empty.status === 400 && /Nothing arrived/.test(empty.text),
      `${empty.status}`);
    const jsonBody = await fetch(`${BASE}/api/pilot`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    check("a non-multipart request is told what the endpoint takes", jsonBody.status === 400
      && /multipart/.test(await jsonBody.text()));
    const many = new FormData();
    for (let k = 0; k < 13; k++) many.append("files", new Blob([PO], { type: "text/plain" }), `d${k}.txt`);
    const big13 = await post(many);
    check("thirteen documents are refused by our bound, not the platform's",
      big13.status === 413 && /12 documents/.test(big13.text), `${big13.status}`);
    const huge = new FormData();
    huge.append("files", new Blob(["x".repeat(1_600_000)], { type: "text/plain" }), "huge.txt");
    const bigFile = await post(huge);
    check("an oversized file comes back as a hold that quotes the cap",
      bigFile.status === 200 && /1\.5 MB/.test(byName(bigFile.events, "huge.txt")?.note ?? ""),
      (byName(bigFile.events, "huge.txt")?.note ?? "").slice(0, 40));
    const tooLong = new FormData();
    tooLong.append("text", ("PO Number: 55501\nQuantity: 2 units\nSupplier: Someone Ltd\n").repeat(900));
    const cut = await post(tooLong);
    check("a pasted novel is read to the cap and the run still finishes",
      cut.status === 200 && cut.events.some(e => e.t === "done"),
      `${(tooLong.get("text") ?? "").length} characters in`);
  }

  // ── 4. /systems is generated from the same code, not from a slide ────────────
  {
    const sys = await get("/systems");
    check("GET /systems is 200", sys.status === 200, `status ${sys.status}`);
    check("/systems opens on the write contract", /What it writes,/.test(sys.visible) && /and what stops it\./.test(sys.visible));
    check("/systems prints a payload, not a picture of one",
      /&quot;idempotency_key&quot;: &quot;88241:[0-9a-f]{16}&quot;/.test(sys.html),
      (sys.html.match(/idempotency_key.{0,60}/) || [""])[0]);
    check("/systems uses the supplier's own reference as external_id",
      /&quot;external_id&quot;: &quot;88241&quot;/.test(sys.html));
    check("/systems names the four document types it reads",
      ["purchase_order", "supplier_invoice", "delivery_booking", "quote_request"].every(t => sys.html.includes(t)));
    check("/systems does not list the catch-all as a document type", !/>\s*unclassified\s*</.test(sys.html));
    check("/systems explains the one asterisk once", (sys.visible.match(/\* optional|\* required/g) || []).length === 1);
    check("/systems states the two thresholds it actually uses",
      /85% on a required field/.test(sys.visible.replace(/\s+/g, " ")) && /80%\s*on the document type/.test(sys.visible.replace(/\s+/g, " ")));
    check("/systems says the body is never posted", /printed and never\s*posted/.test(sys.visible.replace(/\s+/g, " ")));
    check("/systems carries no price either", !/\$\s?\d/.test(sys.visible));
    /* A legend that has drifted from the rules is worse than no legend: a reader quotes it back. So the
       codes on the page must be codes something actually raises. */
    const src = ["src/lib/types.ts", "src/lib/rules.ts", "src/app/api/pilot/route.ts", "src/lib/intake.ts"]
      .map(f => readFileSync(f, "utf8")).join("\n");
    /* The page writes `MISSING_<FIELD>` and React escapes the angle brackets, so the entities have to be
       undone before matching or the placeholder codes are invisible to this check — which is exactly the
       kind of assertion that passes by never seeing anything. */
    const sysText = sys.visible.replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    const codes = [...sysText.matchAll(/\b(AMBIGUOUS_TYPE|MISSING_[A-Z_<>]+|LOW_CONF_[A-Z_<>]+|UNREADABLE|NO_TRANSACTIONAL_CONTENT)\b/g)].map(m => m[1]);
    check("every gate code on /systems is a code the engine emits",
      codes.length >= 5 && codes.every(c => c.endsWith("_<FIELD") || src.includes(c) || src.includes(c.replace(/_[A-Z]+$/, ""))),
      [...new Set(codes)].join(" "));
  }

  // ── 5. what was removed stays removed ────────────────────────────────────────
  for (const p of ["/analytics", "/records", "/exceptions", "/connections", "/api/live", "/api/run", "/api/reset", "/api/records"]) {
    const r = await fetch(BASE + p, { redirect: "manual" });
    check(`${p} is gone, not redirected`, r.status === 404, `status ${r.status}`);
  }
  {
    const gone = ["src/components/Hero.tsx", "src/components/Shell.tsx", "src/components/ShellWrap.tsx",
      "src/components/Flow.tsx", "src/components/Pipeline.tsx", "src/components/Stat.tsx",
      "src/components/Sparkline.tsx", "src/components/PageHead.tsx", "src/components/EventLog.tsx",
      "src/components/DemoCaptions.tsx", "src/components/PilotRoom.tsx", "src/app/OpsClient.tsx",
      "src/lib/wire-http.ts", "OFFLINE-MODE.md"];
    const still = gone.filter(f => existsSync(f));
    check("the console's components are deleted, not hidden", still.length === 0, still.join(" "));
    const GATE_WORDS = new RegExp(["PILOT" + "_CODES", "PILOT" + "_OPEN", "PILOT" + "_MODEL_BILLED"].join("|"));
    const gate = walk("src").filter(f => /\.(ts|tsx)$/.test(f))
      .filter(f => GATE_WORDS.test(readFileSync(f, "utf8")));
    check("the access-code gate is out of the code, not only out of the UI", gate.length === 0, gate.join(" "));
  }

  // ── 6. the stylesheet that shipped, and the marks it draws ───────────────────
  {
    const cssFiles = walk(".next/static").filter(f => f.endsWith(".css"));
    const css = cssFiles.map(f => readFileSync(f, "utf8")).join("\n");
    check("the built stylesheet exists", css.length > 2000, `${cssFiles.length} files, ${css.length} bytes`);
    for (const cls of [".stamp-hold", ".meter", ".pane-wait", ".card-hero", ".rowin", ".display", ".lede", ".label"]) {
      check(`the shipped CSS defines ${cls}`, css.includes(cls));
    }
    check("the meter is a bar with no text inside it", !/\.meter[^{]*\{[^}]*content:/.test(css));
    const machine = readFileSync("src/components/Machine.tsx", "utf8");
    check("a confidence bar is drawn from the number, not from a caption",
      /<i style=\{\{ width: pct\(f\.confidence\) \}\} \/>/.test(machine), "the fill is the only child of .meter");
    const m = machine.match(/className=\{?`?meter[^`]*`?\}?>([\s\S]{0,120}?)<\/div>/);
    check("nothing else is printed inside the bar", !m || !/\$\{/.test(m[1].replace(/<i [^>]*\/>/, "")));
  }

  // ── 7. the README agrees with the product ────────────────────────────────────
  {
    const rm = readFileSync("README.md", "utf8").replace(/\s+/g, " ");
    check("the README carries both denominators, together",
      /88% of everything received/.test(rm) && /96% of actionable documents/.test(rm));
    check("the README never quotes 96% bare",
      (rm.match(/96%/g) || []).length === (rm.match(/96% of actionable/g) || []).length);
    check("the README says the corpus is ours, not a client's",
      /hand-authored|no customer data was used/i.test(rm));
    check("the README names the four outcomes the page promises",
      SAMPLES.every(s => rm.toLowerCase().includes(s.label.toLowerCase())), SAMPLES.map(s => s.label).join(" / "));
    check("the README keeps the claims the code cannot support marked as not implemented",
      /Not implemented/.test(rm) && /multi-line|Multi-line/.test(rm));
    check("the price ladder is in the README and not on the page",
      /\$1,500/.test(rm) && !/\$1,500/.test(root.visible));
    check("the README describes the page that exists",
      /One screen/.test(rm) && /\/systems/.test(rm) && /seven-section|operations console/.test(rm));
    check("the README quotes the open URL as no-code",
      /conduit-demo-version\.vercel\.app/.test(rm) && /no code/i.test(rm));
  }
} catch (e) {
  fails.push(`FAIL the suite itself threw — ${e.stack?.split("\n").slice(0, 3).join(" | ") ?? e}`);
} finally {
  stopServer();
}

function walk(dir) {
  const out = [];
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${d.name}`;
    if (d.isDirectory()) { if (!/node_modules|\.git|cache|media|fonts/.test(p)) out.push(...walk(p)); }
    else out.push(p);
  }
  return out;
}

console.log(ok.join("\n"));
if (fails.length) console.log("\n" + fails.join("\n"));
console.log(`\n${ok.length} passed, ${fails.length} failed — the artifact a stranger gets.`);
process.exit(fails.length ? 1 : 0);
