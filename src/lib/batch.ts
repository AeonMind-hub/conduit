/*
  The company-level layer.

  Everything in `rules.ts` answers one question about one document: what does this page say, and can it be
  trusted. That is necessary and not sufficient. A dock does not receive one document; it receives an order,
  then an invoice that bills less than it, then a note saying what actually walked through the door, then the
  same invoice again forwarded by a different address. The number nobody disputes is the one that agrees on
  all three. The number that costs money is the one that doesn't.

  So this file does the four things a finance team actually needs and a single-document reader cannot do:
  reads line items and does the arithmetic per line, reconciles documents against each other under a tolerance
  the *client* sets, notices when one document has arrived twice, and records what happened in an order a
  person can audit afterwards. Nothing here invents a value: a variance is reported as a difference, never
  corrected toward agreement.
*/
import { runRules } from "./rules";
import { DOC_TYPES } from "./doctypes";
import { blocks, failedRules, THRESHOLD, CLASSIFY_THRESHOLD, type DocType } from "./types";
import { ownRef, digestibleText, textDigest } from "./payload";

/* ── policy: the client's numbers, not my opinions ────────────────────────────────────────────── */

export interface Policy {
  /** Minimum confidence for a required field before anything is written. */
  threshold: number;
  /** Quantity/price variance a finance team is prepared to post without asking, in percent. */
  tolerancePct: number;
  /** …and the same tolerance as an absolute amount, whichever is more generous. */
  toleranceAbs: number;
  /** Every invoice must name the PO it bills. Turn it off and unmatched invoices post. */
  requirePO: boolean;
  /** Nothing posts until goods are confirmed received. Off is common for small suppliers. */
  requireReceipt: boolean;
  /** Billed amounts above this wait for a person even when the machine is happy. 0 disables. */
  autoApproveUnder: number;
}

export const DEFAULT_POLICY: Policy = {
  threshold: THRESHOLD, tolerancePct: 2, toleranceAbs: 25,
  requirePO: true, requireReceipt: false, autoApproveUnder: 0,
};

/**
 * Read a policy in, and say out loud every time it had to be clamped. A control that silently accepts
 * "tolerance: 900%" is a control that teaches its user nothing about what it just did, and a client who
 * later finds out that a knob they turned was ignored stops believing the queue.
 */
export function policyFrom(raw: unknown): { policy: Policy; clamped: string[] } {
  const r = (raw ?? {}) as Record<string, unknown>;
  const out: Policy = { ...DEFAULT_POLICY };
  const clamped: string[] = [];
  const num = (key: keyof Policy, min: number, max: number, dflt: number) => {
    const n = Number(r[key]);
    if (!Number.isFinite(n)) { if (r[key] != null) clamped.push(`${key} ${String(r[key])} → not a number, left at ${dflt}`); out[key] = dflt as never; return; }
    const v = Math.min(max, Math.max(min, n));
    if (v !== n) clamped.push(`${key} ${n} → ${v}`);
    out[key] = v as never;
  };
  num("threshold", 0.6, 0.99, DEFAULT_POLICY.threshold);
  num("tolerancePct", 0, 25, DEFAULT_POLICY.tolerancePct);
  num("toleranceAbs", 0, 10000, DEFAULT_POLICY.toleranceAbs);
  num("autoApproveUnder", 0, 1000000, DEFAULT_POLICY.autoApproveUnder);
  if (typeof r.requirePO === "boolean") out.requirePO = r.requirePO;
  if (typeof r.requireReceipt === "boolean") out.requireReceipt = r.requireReceipt;
  return { policy: out, clamped };
}

/* ── the shapes a run produces ────────────────────────────────────────────────────────────────── */

export interface FieldRow { key: string; label: string; value: string; confidence: number;
  reason?: string; evidence?: string }

export interface LineRow {
  n: number; sku: string | null; desc: string | null;
  qty: number | null; unit: number | null; amount: number | null;
  /** Amount derived by arithmetic rather than stated: still printed, but marked as derived. */
  derived: boolean;
  confidence: number;
  reason?: string;
  evidence: string;
}

export interface Totals {
  stated: number | null;
  computed: number | null;
  variance: number | null;
  currency: string;
  /** True when the document states no total, so nothing was checked rather than everything passing. */
  unstated: boolean;
}

export interface DocInput { i: number; name: string; bytes: number; kind: string; text: string;
  unreadable?: string | null }

export interface DocResult {
  i: number; name: string; bytes: number; kind: string;
  type: DocType | string; typeLabel: string; typeConfidence: number;
  status: "committed" | "exception" | "approval" | "discarded";
  destination: string; destinationCode: string;
  flags: string[]; note: string | null; reject: string | null;
  fields: FieldRow[]; lines: LineRow[]; totals: Totals;
  ref: string | null; group: string | null; duplicateOf: number | null;
  currency: string;
  /** 16 hex characters of the document's normalised text. The payload key and the duplicate check both
   *  read this field, so they cannot disagree about what "the same document" means. */
  digest?: string;
  payload: Record<string, unknown> | null;
  audit: { at: number; kind: string; detail: string }[];
  ms: number;
}

export interface MatchLine {
  sku: string | null; ordered: number | null; billed: number | null; received: number | null;
  unitOrdered: number | null; unitBilled: number | null;
  qtyVariancePct: number | null; priceVariancePct: number | null; priceVarianceAbs: number | null;
  within: boolean; notes: string[];
}

export interface MatchGroup {
  key: string; title: string;
  docs: { i: number; name: string; role: string; amount: number | null }[];
  lines: MatchLine[];
  verdict: "matched" | "variance" | "incomplete" | "unreferenced";
  /** Document *amounts* — money, not counts. The card header prints money beside each role, so a unit
   *  count here would disagree with the table underneath it by a factor of a thousand. */
  billed: number | null; ordered: number | null; received: number | null;
  worstPct: number | null; sentence: string;
}

export interface RunResult {
  docs: DocResult[]; groups: MatchGroup[]; policy: Policy; clamped: string[];
  counts: { total: number; committed: number; held: number; approval: number; discarded: number };
  ms: number;
}

/* ── small readings ───────────────────────────────────────────────────────────────────────────── */

const toNum = (s: string | null | undefined): number | null => {
  if (s == null) return null;
  const t = String(s).replace(/[^\d.,-]/g, "");
  if (!t) return null;
  // `1,234.56` and `1.234,56` are both ordinary; the grouping character is whichever repeats first.
  const commas = (t.match(/,/g) ?? []).length, dots = (t.match(/\./g) ?? []).length;
  let clean = t;
  if (commas && dots) clean = t.lastIndexOf(",") > t.lastIndexOf(".") ? t.replace(/\./g, "") : t.replace(/,/g, "");
  else if (commas) clean = t.replace(/,/g, "");
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
};
const qty = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-GB"));
const money = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const CUR = /£|\$|€|USD|GBP|EUR/i;
const curOf = (t: string) => (/[$€]/.test(t) ? (/\$|USD/.test(t) ? "$" : "€") : "£");

/** The reference every document in the batch is *about*. A purchase order prints it as its own number, an
 *  invoice prints it as `PO Number`, a receipt as `PO reference` — and the invoice's own number is not a
 *  spine, it is a label for the bill. Grouping on the wrong one is how a matched invoice gets reported as
 *  unmatched while sitting three lines from the order it bills. */
const spineOf = (values: Record<string, string>) => values.po_number || values.po_ref || "";
const roleOf = (t: string) => t === "purchase_order" ? "ordered" : t === "supplier_invoice" ? "billed"
  : t === "goods_receipt" ? "received" : "other";

/* ── line items ─────────────────────────────────────────────────────────────────────────────────
   Two shapes cover the paperwork a dock actually gets: the labelled list a supplier types into a letter,
   and the table a system exports (pipes, tabs, or just two spaces between columns). Both are read; the
   arithmetic is done the same way either way, and a line whose amount nobody printed is *derived* and
   says so.
   ─────────────────────────────────────────────────────────────────────────────────────────────────── */

const QTY_RE = /\b(?:qty|quantity|no\.? of|units?)\b[:=\s]?\s*([\d,]+)/i;
const PRICE_RE = /\b(?:unit\s*price|price\s*each|each|rate)\b[:=\s]?\s*[£$€]?\s*([\d,.]+)/i;
const AMT_RE = /\b(?:line\s*total|amount|ext(?:ended)?(\s*price)?|total\s*price|net\s*amount)\b[:=\s]?\s*[£$€]?\s*([\d,.]+)/i;
const SKU_RE = /\b(?:sku|item\s*(?:no|code|#)|part(?:\s*(?:no|number|#))?|article)\b[:=\s]?\s*([A-Z0-9][A-Z0-9./_-]{2,})/i;
const BARE_SKU = /(?:^|\s)([A-Z]{2,4}[-/]?\d{3,6}[A-Z]?)\b/;

export function extractLines(text: string, baseConfidence = 0.95): LineRow[] {
  const lines = (text ?? "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const out: LineRow[] = [];

  /* 1 · the labelled list. A marker line ("Line 1 …") opens an item; the fields may follow on that line or
        the next few, because people write them both ways. */
  let cur: { n: number; sku: string | null; desc: string | null; qty: number | null; unit: number | null;
    amount: number | null; evidence: string[] } | null = null;
  const flush = () => {
    if (!cur) return;
    const derived = cur.amount == null && cur.qty != null && cur.unit != null;
    out.push({ n: cur.n, sku: cur.sku, desc: cur.desc, qty: cur.qty, unit: cur.unit,
      amount: cur.amount ?? (cur.qty != null && cur.unit != null ? Math.round(cur.qty * cur.unit * 100) / 100 : null),
      derived,
      /* A derived amount is arithmetic, not a reading of the page — so it can never claim more trust than
         the document gave it, and it is floored below the gate rather than rounded up past it. */
      confidence: derived ? Math.min(0.88, baseConfidence) : baseConfidence,
      reason: derived ? "no line amount stated — derived from quantity × unit price, which is what your ERP would do anyway" : undefined,
      evidence: cur.evidence.join(" ⏎ ") });
    cur = null;
  };
  for (const l of lines) {
    const mk = /^\s*(?:line|item|row)\s*(?:no\.?\s*)?(\d{1,3})\b/i.exec(l);
    if (mk) { flush(); cur = { n: Number(mk[1]), sku: null, desc: null, qty: null, unit: null, amount: null, evidence: [l] }; continue; }
    if (!cur) continue;
    cur.evidence.push(l);
    const s = l.match(SKU_RE)?.[1] ?? l.match(BARE_SKU)?.[1] ?? null;
    if (s && cur.sku == null) cur.sku = s.toUpperCase();
    const q = QTY_RE.exec(l); if (q && cur.qty == null) cur.qty = toNum(q[1]);
    const p = PRICE_RE.exec(l); if (p && cur.unit == null) cur.unit = toNum(p[1]);
    const a = AMT_RE.exec(l) ?? /(?:^|\s)total\b[:=\s]?\s*[£$€]?\s*([\d,.]+)/i.exec(l);
    if (a && cur.amount == null) cur.amount = toNum(a[1]);
    if (cur.qty != null && cur.unit != null && cur.amount != null) flush();
  }
  flush();

  /* 2 · the exported table. Cells may carry their own labels ("Quantity: 3,800"), so each row is read by
        label first and only then by column position — a system that writes `qty` in a header and `4,000`
        underneath is read the same as a person who types it out. */
  if (!out.length) {
    const isRow = (l: string) => /\s{2,}|\t|\|/.test(l);
    const headerOf = (l: string) => l.split(/\s*\|\s*|\t|\s{2,}/).map(c => c.trim().toLowerCase());
    let header: string[] | null = null;
    let n = 0;
    for (const l of lines) {
      if (!isRow(l)) continue;
      const cells = l.split(/\s*\|\s*|\t|\s{2,}/).map(c => c.trim()).filter(Boolean);
      if (cells.length < 2) continue;
      const numeric = cells.filter(c => toNum(c) != null).length;
      if (!header && numeric === 0) { header = headerOf(l); continue; }
      const col = (names: RegExp) => {
        const i = (header ?? []).findIndex(h => names.test(h));
        return i >= 0 ? cells[i] : undefined;
      };
      const cellFor = (names: RegExp, re: RegExp) => {
        const c = col(names);
        if (c != null) { const m = re.exec(c) ?? /^[\D]{0,14}([\d,.]+)$/.exec(c); if (m) return toNum(m[1]); }
        const own = re.exec(l);
        return own ? toNum(own[1]) : null;
      };
      const q = cellFor(/^qty|quantity|units?$/, QTY_RE);
      const u = cellFor(/unit\s*price|price|rate|each/, PRICE_RE);
      const a = cellFor(/amount|total|line\s*total|net|ext/, AMT_RE);
      const skuCell = col(/sku|item|part|article/) ?? cells.find(c => BARE_SKU.test(c) && !/£|\$|€/.test(c));
      const sku = (skuCell?.match(/([A-Z0-9][A-Z0-9./_-]{2,})/i) ?? l.match(SKU_RE) ?? l.match(BARE_SKU))?.[1] ?? null;
      if (q == null && u == null && a == null) continue;   // prose with two spaces is not a table row
      n++;
      const derived = a == null && q != null && u != null;
      out.push({ n, sku: sku ? sku.toUpperCase() : null,
        desc: cells.find(c => /[a-z]{4,}/i.test(c) && toNum(c) == null && !/line|item|sku/i.test(c)) ?? null,
        qty: q, unit: u, amount: a ?? (q != null && u != null ? Math.round(q * u * 100) / 100 : null),
        derived, confidence: derived ? Math.min(0.88, baseConfidence) : baseConfidence,
        reason: derived ? "no line amount stated — derived from quantity × unit price, which is what your ERP would do anyway"
          : a != null && q != null && u != null && Math.abs(a - q * u) > 0.01
            ? `the line says ${money(a)} and quantity × unit price says ${money(q * u)} — a farthing apart is a rounding, this is not. It is reported, never corrected`
            : undefined,
        evidence: l });
    }
  }
  return out;
}

/* ── totals ─────────────────────────────────────────────────────────────────────────────────────── */

export function readTotals(text: string, lines: LineRow[]): Totals {
  const currency = curOf(text ?? "");
  /* A colon may sit before or after the currency — `Total: £684.00` and `Total £684.00` are both ordinary —
     and `Subtotal` contains `total`, so the tail guard keeps a subtotal from being read as the document
     total and quietly turning a reconciled invoice into a variance. */
  const statedRe = /(?:amount\s+due|total\s+due|balance\s+due|grand\s+total|invoice\s+total|amount\s+payable)\s*[:=]?\s*[£$€]?\s*[:=]?\s*(-?[\d,]+(?:\.\d{1,2})?)(?![\d.])/i;
  const totalRe = /(?:^|\n)\s*total\s*[:=]?\s*[£$€]?\s*[:=]?\s*(-?[\d,]+(?:\.\d{1,2})?)(?![\d.])/i;
  const m = statedRe.exec(text ?? "") ?? totalRe.exec(text ?? "");
  const stated = m ? toNum(m[1]) : null;
  const sum = lines.reduce((a, l) => a + (l.amount ?? 0), 0);
  const computed = lines.length ? sum : null;
  return { stated, computed, variance: stated != null && computed != null ? Math.round((computed - stated) * 100) / 100 : null,
    currency, unstated: stated == null };
}

/* ── three-way match ────────────────────────────────────────────────────────────────────────────
   Ordered against billed against received, per SKU where the documents name one, and on the document
   amounts where they don't. Tolerance is the client's, in percent and in money, whichever is more generous,
   because that is how finance teams actually phrase it.
   ─────────────────────────────────────────────────────────────────────────────────────────────────── */

export function matchDocs(docs: DocResult[], policy: Policy): MatchGroup[] {
  const byGroup = new Map<string, DocResult[]>();
  for (const d of docs) {
    if (d.status === "discarded" || !d.group) continue;
    const list = byGroup.get(d.group) ?? []; list.push(d); byGroup.set(d.group, list);
  }
  const out: MatchGroup[] = [];
  for (const [key, list] of byGroup) {
    /* A duplicate is not a second bill. Two copies of the same invoice in one run are one obligation, and
       counting them twice turns a clean 5% shortfall into a phantom double-payment — which is precisely the
       kind of wrong number that would make a finance team delete this integration. */
    const once = (d: DocResult) => d.duplicateOf == null;
    const ordered = list.find(d => roleOf(d.type) === "ordered" && once(d));
    const billed = list.filter(d => roleOf(d.type) === "billed" && once(d));
    const received = list.find(d => roleOf(d.type) === "received" && once(d));
    const amountOf = (d: DocResult) => d.totals.computed ?? d.totals.stated;
    const unitOf = (d: DocResult) => d.lines.find(l => l.unit != null)?.unit ?? null;
    /* Quantity by line where the document has lines; the document-level number where it does not, under
       whichever name that type files it under (an order says `quantity`, a receipt says `quantity
       received`). Both readings are printed identically, so nobody has to guess which one ran. */
    const qtyOf = (d: DocResult) => d.lines.reduce((a, l) => a + (l.qty ?? 0), 0)
      || toNum(d.fields.find(f => f.key === "quantity" || f.key === "qty_received")?.value ?? "");

    const skus = [...new Set(list.flatMap(d => d.lines.map(l => l.sku)).filter(Boolean))] as string[];
    const lines: MatchLine[] = (skus.length ? skus : [null]).map(sku => {
      const pick = (d?: DocResult) => d ? (sku ? d.lines.find(l => l.sku === sku) ?? null : d.lines[0] ?? null) : null;
      const o = pick(ordered), b = pick(billed[0]), r = pick(received);
      const oq = o?.qty ?? (ordered ? qtyOf(ordered) : null);
      const bq = b?.qty ?? (billed[0] ? qtyOf(billed[0]) : null);
      const ou = o?.unit ?? (ordered ? unitOf(ordered) : null);
      const bu = b?.unit ?? (billed[0] ? unitOf(billed[0]) : null);
      const notes: string[] = [];
      let within = true;
      const qtyV = oq && bq != null ? ((bq - oq) / oq) * 100 : null;
      const priceV = ou && bu != null ? ((bu - ou) / ou) * 100 : null;
      const priceAbs = ou != null && bu != null ? Math.abs((bu - ou) * (bq ?? oq ?? 0)) : null;
      if (qtyV != null && Math.abs(qtyV) > policy.tolerancePct) {
        within = false;
        notes.push(`${qty(bq ?? 0)} billed against ${qty(oq ?? 0)} ordered — ${Math.abs(qtyV).toFixed(1)}% over a ${policy.tolerancePct}% tolerance`);
      } else if (qtyV != null && Math.abs(qtyV) > 0) notes.push(`${Math.abs(qtyV).toFixed(1)}% quantity variance, inside tolerance`);
      if (priceV != null && Math.abs(priceV) > policy.tolerancePct && (priceAbs ?? 0) > policy.toleranceAbs) {
        within = false;
        notes.push(`${ordered?.currency ?? ""}${money(bu ?? 0)} each against ${ordered?.currency ?? ""}${money(ou ?? 0)} ordered — ${Math.abs(priceV).toFixed(1)}% over tolerance and ${(priceAbs ?? 0) > policy.toleranceAbs ? `more than ${ordered?.currency ?? ""}${money(policy.toleranceAbs)} in money` : "outside the percent band"}`);
      } else if (priceV != null && Math.abs(priceV) > 0) notes.push(`${Math.abs(priceV).toFixed(1)}% price variance, inside tolerance`);
      if (bq != null && r?.qty != null && bq > r.qty) { within = false; notes.push(`${qty(bq - r.qty)} billed that no receipt confirms`); }
      if (billed.length > 1) { within = false; notes.push(`${billed.length} invoices bill the same order`); }
      return { sku, ordered: oq, billed: bq, received: r?.qty ?? null, unitOrdered: ou, unitBilled: bu,
        qtyVariancePct: qtyV, priceVariancePct: priceV, priceVarianceAbs: priceAbs, within, notes };
    });

    /* The document-level comparison is not a second opinion on the same fact: a batch of one-line documents
       with no SKUs reconciles *here*, and both paths feed one verdict, so a policy change moves a row the
       same way over HTTP and in a unit test. */
    const oAmt = ordered ? amountOf(ordered) : null;
    const bAmt = billed.reduce((a, d) => a + (amountOf(d) ?? 0), 0) || null;
    const amtV = oAmt && bAmt != null ? ((bAmt - oAmt) / oAmt) * 100 : null;
    const worstLine = lines.reduce((a, l) => Math.max(a, l.qtyVariancePct == null ? 0 : Math.abs(l.qtyVariancePct),
      l.priceVariancePct == null ? 0 : Math.abs(l.priceVariancePct)), 0);
    const worst = lines.some(l => !l.within) || (amtV != null && Math.abs(amtV) > policy.tolerancePct)
      ? Math.max(worstLine, amtV == null ? 0 : Math.abs(amtV)) : null;

    let verdict: MatchGroup["verdict"] = "unreferenced";
    let sentence = "no purchase order in this batch carries this reference, so nothing can be reconciled against it";
    if (ordered && billed.length) {
      verdict = worst != null ? "variance" : "matched";
      sentence = worst == null
        ? `${ordered.currency}${money(oAmt)} against ${billed.length} invoice${billed.length > 1 ? "s" : ""} totalling ${billed[0].currency}${money(bAmt)} — inside a ${policy.tolerancePct}% tolerance, so it posts`
        : (lines.find(l => !l.within)?.notes[0]
          ?? `${qty(bAmt ?? 0)} billed against ${qty(oAmt ?? 0)} ordered — ${Math.abs(amtV ?? 0).toFixed(1)}% over a ${policy.tolerancePct}% tolerance`);
    } else if (ordered) {
      verdict = "incomplete";
      sentence = "the order is on file; no invoice has arrived against it yet";
    } else if (billed.length) {
      verdict = "unreferenced";
    }
    out.push({ key, title: `${key.replace("PO:", "order ")}`,
      docs: list.map(d => ({ i: d.i, name: d.name, role: roleOf(d.type), amount: amountOf(d) })),
      lines, verdict, ordered: oAmt, billed: bAmt, received: received ? amountOf(received) : null,
      worstPct: worst, sentence });
  }
  return out;
}

/* ── the run ────────────────────────────────────────────────────────────────────────────────────── */

export function runBatch(inputs: DocInput[], rawPolicy: unknown): RunResult {
  const t0 = Date.now();
  const { policy, clamped } = policyFrom(rawPolicy);
  const docs: DocResult[] = [];
  const seen = new Map<string, number>();

  for (const inp of inputs) {
    const started = Date.now();
    const audit: { at: number; kind: string; detail: string }[] = [];
    const at = (kind: string, detail: string) => audit.push({ at: Date.now() - t0, kind, detail });
    at("received", `${inp.bytes} bytes · ${inp.kind} · ${inp.name}`);

    const base: DocResult = {
      i: inp.i, name: inp.name, bytes: inp.bytes, kind: inp.kind,
      type: "unclassified", typeLabel: "Unclassified", typeConfidence: 0, status: "exception",
      destination: "—", destinationCode: "—", flags: [], note: null, reject: null,
      fields: [], lines: [], totals: { stated: null, computed: null, variance: null, currency: "£", unstated: true },
      ref: null, group: null, duplicateOf: null, currency: "£", digest: undefined,
      evidence: {} as never, payload: null, audit, ms: 0,
    } as DocResult;

    if (inp.unreadable) {
      base.flags.push("UNREADABLE"); base.note = inp.unreadable; at("held", "UNREADABLE · nothing is claimed about what could not be read");
      base.ms = Date.now() - started; docs.push(base); continue;
    }

    const fix = runRules(inp.text);
    const values = fix.extraction?.values ?? {};
    const confs = fix.extraction?.confidence ?? {};
    const reasons = fix.extraction?.reasons ?? {};
    const type = fix.type;
    const def = DOC_TYPES[type as DocType];
    base.type = type; base.typeLabel = def?.label ?? "Unclassified";
    base.typeConfidence = fix.extraction?.typeConfidence ?? 0;
    base.destination = def?.destination ?? "—"; base.destinationCode = def?.destinationCode ?? "—";
    base.currency = curOf(inp.text);
    at("classified", `${base.typeLabel} at ${Math.floor(base.typeConfidence * 100)}%`);

    if (!fix.relevant || !def) {
      base.status = "discarded";
      base.reject = fix.rejectReason ?? (fix.extraction?.notes || "there is nothing here to book");
      /* The reason is a code, not a shrug: the page prints the code and the sentence under it, so a reader
         can tell "no transactional content" from "could not read the file" at a glance. */
      base.flags.push(fix.rejectReason ?? "NOT_CLASSIFIED");
      at("discarded", "no transactional content — it is set aside, not held, because a person cannot act on it");
      base.ms = Date.now() - started; docs.push(base); continue;
    }

    /* Fields, with the span of source each one is standing on. A value with no evidence line is a value the
       reader cannot check, which is the failure mode every other tool of this shape has. */
    const evidence: Record<string, string> = {};
    for (const f of def.fields) {
      const value = values[f.key] ?? "";
      const confidence = confs[f.key] ?? 0;
      if (value) evidence[f.key] = value;
      /* The evidence is the line of the document the value was taken from, printed under the field, so a
         reader can check the reading without opening the file again. No line, no claim: a field with nothing
         under it says so instead of looking verified. */
      const span = value ? (inp.text.split(/\r?\n/).map(l => l.trim()).find(l => l.includes(value)) ?? "") : "";
      base.fields.push({ key: f.key, label: f.label, value,
        confidence: value ? Math.floor(confidence * 100) / 100 : 0,
        reason: value ? (reasons[f.key] || undefined) : "not present in the document — nothing is filled in, and nothing is invented",
        evidence: span ? span.slice(0, 160) : undefined });
    }
    const lowest = base.fields.filter(f => f.value).reduce((a, f) => Math.min(a, f.confidence), 1);
    const read = base.fields.filter(f => f.value).length;
    at("extracted", `${read} of ${def.fields.length} fields read${read ? ` · lowest ${Math.floor(lowest * 100)}%` : ""}`);

    base.lines = extractLines(inp.text, Math.max(0.8, Math.min(0.97, lowest || 0.95)));
    base.totals = readTotals(inp.text, base.lines);
    if (base.lines.length) {
      at("lines", `${base.lines.length} line${base.lines.length > 1 ? "s" : ""} · Σ ${base.currency}${money(base.totals.computed)}`
        + (base.totals.unstated ? " · no total stated" : base.totals.variance ? ` · stated ${base.currency}${money(base.totals.stated)} differs by ${base.currency}${money(Math.abs(base.totals.variance))}` : ` · stated ${base.currency}${money(base.totals.stated)} agrees`));
    }

    const own = ownRef(values);
    const spine = spineOf(values);
    base.ref = own;
    base.group = spine ? `PO:${spine.toUpperCase()}` : null;
    /* Identity is a property of the paperwork: the digest is taken over the document's own normalised text,
       not its fields and not the filename it arrived in. Two copies of one document in two containers from
       two mailers are therefore one document — and only one row gets written. */
    base.digest = textDigest(digestibleText(inp.text));
    const key = `${spine || own || `row-${inp.i}`}:${base.digest}`;
    const first = seen.get(key);
    if (first != null) {
      base.duplicateOf = first;
      base.flags.push("DUPLICATE_DOCUMENT");
      base.note = `the same document as row ${first + 1} of this run — one row is written, this one is held so nothing is paid twice`;
      at("held", "DUPLICATE_DOCUMENT");
    }
    seen.set(key, first ?? inp.i);

    /* Gates: the document's own rules, then the policy. `requirePO` off waives the missing-reference rule,
       because that is what turning it off means. */
    const extraction = fix.extraction!;
    const failed = failedRules(extraction, def).filter(c => !(c === "MISSING_PO_REF" && !policy.requirePO));
    for (const c of failed) if (!base.flags.includes(c)) base.flags.push(c);
    if (blocks(extraction, def) && !base.flags.some(c => !c.startsWith("MATCH") && !c.startsWith("DUPLICATE"))) {
      if (!base.flags.length) base.flags.push("BELOW_GATE");
    }
    if (policy.requireReceipt && roleOf(type) === "billed") {
      const g = spine && docs.find(d => d.group === `PO:${spine.toUpperCase()}` && roleOf(d.type) === "received");
      const later = inputs.some(x => x.i !== inp.i && spineOf((runRules(x.text).extraction?.values ?? {})) === spine
        && roleOf(runRules(x.text).type) === "received");
      if (!g && !later) { base.flags.push("MISSING_GOODS_RECEIPT"); base.note = "this client posts nothing until the goods are confirmed received, and no receipt note in this batch names the order"; }
    }
    if (base.totals.variance != null && Math.abs(base.totals.variance) > 0.005 && base.duplicateOf == null) {
      base.flags.push("TOTAL_MISMATCH");
      base.note = `the lines add to ${base.currency}${money(base.totals.computed)} and the document states ${base.currency}${money(base.totals.stated)} — a difference of ${base.currency}${money(Math.abs(base.totals.variance!))}, reported rather than corrected`;
      at("held", "TOTAL_MISMATCH");
    }

    const amount = base.totals.computed ?? base.totals.stated
      ?? toNum(values.amount_due ?? values.total ?? values.value ?? "");
    if (policy.autoApproveUnder > 0 && (amount ?? 0) >= policy.autoApproveUnder && roleOf(type) === "billed") {
      base.flags.push("OVER_AUTO_APPROVE");
      base.note = `${base.currency}${money(amount)} is above this client's auto-approve limit of ${base.currency}${money(policy.autoApproveUnder)} — the machine is happy, a person still signs`;
    }

    base.ms = Date.now() - started;
    docs.push(base);
    at("prepared", null as never);   // replaced below once the verdict is final
    audit.pop();
  }

  /* Reconcile, then blame carefully: a variance holds the document that *bills*. The order was right and
     the receipt only says what walked through the dock — stamping them with the invoice's problem turns one
     error into three, and a queue full of wrongly-blamed rows is the reason people stop trusting software. */
  const groups = matchDocs(docs, policy);
  for (const g of groups) for (const d of g.docs) {
    const doc = docs.find(x => x.i === d.i); if (!doc) continue;
    doc.audit.push({ at: Date.now() - t0, kind: "matched", detail: `${g.key} · ${g.verdict}${g.worstPct != null ? ` · worst variance ${g.worstPct.toFixed(1)}%` : ""}` });
    if (g.verdict === "variance" && d.role === "billed") {
      if (!doc.flags.includes("MATCH_VARIANCE")) doc.flags.push("MATCH_VARIANCE");
      if (doc.duplicateOf == null) doc.note = g.sentence;
    }
    if (g.verdict === "incomplete") doc.audit.push({ at: Date.now() - t0, kind: "awaiting", detail: g.sentence });
  }

  for (const d of docs) {
    const real = d.flags.filter(f => f !== "MATCH_INCOMPLETE");
    if (d.status !== "discarded") {
      if (real.includes("OVER_AUTO_APPROVE") && !real.some(f => f !== "OVER_AUTO_APPROVE")) d.status = "approval";
      else d.status = real.length ? "exception" : "committed";
    }
    if (d.status === "exception") d.audit.push({ at: Date.now() - t0, kind: "held", detail: real.join(" ") });
    if (d.status === "exception" || d.status === "discarded") { d.payload = null; d.audit.push({ at: Date.now() - t0, kind: "no-write", detail: "nothing is prepared, because nothing here is verified" }); }
    else {
      d.payload = payloadOf(d, policy);
      d.audit.push({ at: Date.now() - t0, kind: "prepared",
        detail: `${d.destinationCode} body prepared · idempotency ${String(d.payload.idempotency_key).slice(0, 24)}… · nothing posted` });
      d.audit.push({ at: Date.now() - t0, kind: "routed", detail: d.destination });
    }
  }

  const counts = { total: docs.length, committed: 0, held: 0, approval: 0, discarded: 0 };
  for (const d of docs) counts[d.status === "committed" ? "committed" : d.status === "exception" ? "held"
    : d.status === "approval" ? "approval" : "discarded"]++;
  return { docs, groups, policy, clamped, counts, ms: Date.now() - t0 };
}

/** The body that would be written. It is printed in full, on the page, next to the evidence — the moment a
 *  client can read the JSON is the moment they can tell whether this is a demo or their ledger. */
function payloadOf(d: DocResult, policy: Policy) {
  const fields: Record<string, string> = {};
  for (const f of d.fields) if (f.value) fields[f.key] = f.value;
  return {
    system: d.destination,
    entity: d.destinationCode === "ERP" ? "purchase_order" : d.destinationCode === "WMS" ? "receipt" : "bill",
    external_id: d.ref,
    document: { name: d.name, bytes: d.bytes, type: d.type },
    fields,
    lines: d.lines.map(l => ({ n: l.n, sku: l.sku, qty: l.qty, unit_price: l.unit, amount: l.amount,
      derived_amount: l.derived || null, confidence: l.confidence })),
    totals: { stated: d.totals.stated, computed: d.totals.computed, variance: d.totals.variance, currency: d.totals.currency },
    policy: { threshold: policy.threshold, tolerance_pct: policy.tolerancePct, tolerance_abs: policy.toleranceAbs },
    /* The key is the customer's own reference and a digest of the document, so a retry of the same
       paperwork cannot become a second posting — and the transport is named, because a client who is
       asked to trust an idempotency key should be able to see what it was computed from. */
    idempotency_key: `${d.ref ?? `row-${d.i}`}:${d.digest ?? textDigest(digestibleText(d.name))}`,
    provenance: { engine: "rules", model: null, confidence_floor: policy.threshold,
      type_confidence: d.typeConfidence, stored: false, sent_to: null },
  };
}
