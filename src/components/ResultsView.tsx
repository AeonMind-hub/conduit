"use client";

import type { DocResult, MatchGroup, Policy, RunResult } from "@/lib/batch";

export const LANES = [
  { key: "committed", label: "cleared", cls: "lane-clear" },
  { key: "held", label: "held for a person", cls: "lane-hold" },
  { key: "approval", label: "awaiting approval", cls: "lane-wait" },
  { key: "discarded", label: "set aside", cls: "lane-aside" },
] as const;

export const money = (n: number | null | undefined, cur = "£") =>
  n == null || !Number.isFinite(n) ? "—" : `${cur}${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function csv(run: RunResult) {
  const rows: string[][] = [["file", "type", "status", "destination", "ref", "field", "value", "confidence", "note"]];
  for (const d of run.docs) for (const f of d.fields) rows.push([d.name, d.typeLabel, d.status, d.destination,
    d.ref ?? "", f.label, f.value, f.value === "" ? "" : String(Math.floor(f.confidence * 100)), d.note ?? ""]);
  return `data:text/csv;charset=utf-8,${encodeURIComponent(rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n"))}`;
}

export function Match({ g, docs, cur }: { g: MatchGroup; docs: DocResult[]; cur: string }) {
  const bad = g.verdict === "variance";
  const nodes = (["ordered", "billed", "received"] as const).map(role => {
    const entry = g.docs.find(d => d.role === role);
    const doc = entry ? docs.find(x => x.i === entry.i) : undefined;
    return { role, name: entry?.name ?? null, amount: entry?.amount ?? null, status: doc?.status };
  });
  return (
    <div className={`rise border ${bad ? "border-amber-rule" : "border-line"} bg-surface`}>
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <span className="text-[13px] text-txt-hi">{g.title}</span>
        <span className={`stamp ${bad ? "stamp-hold" : g.verdict === "matched" ? "stamp-ok" : "stamp-wait"}`}>
          {g.verdict === "matched" ? "reconciled" : bad ? "variance" : g.verdict === "incomplete" ? "incomplete" : "no order"}</span>
      </div>
      <svg className="graph" viewBox="0 0 340 92" role="img" aria-label={`${g.key}: ${g.sentence}`}>
        <path className={`spine ${bad ? "spine-bad" : ""}`} pathLength={1} d="M52 50 H150 M188 50 H286" />
        {nodes.map((n, i) => (
          <g key={n.role} transform={`translate(${[14, 116, 250][i]} 30)`}>
            <rect className={`node ${n.status === "committed" ? "node-clear" : n.status ? "node-hold" : ""}`}
              width={i === 1 ? 74 : 70} height={38} rx={2} />
            <text x={6} y={-6} fill={n.name ? "var(--ink-3)" : "var(--ink-4)"} fontSize={9.5} letterSpacing="0.09em">
              {n.role.toUpperCase()}{n.amount != null ? ` ${money(n.amount, cur)}` : ""}</text>
            <text x={6} y={16} fill={n.name ? "var(--ink)" : "var(--ink-4)"} fontSize={10}>
              {n.name ? (n.name.length > 15 ? `${n.name.slice(0, 14)}…` : n.name) : "not in the batch"}</text>
          </g>))}
      </svg>
      <p className={`px-4 pb-2 text-[12.5px] leading-snug ${bad ? "text-amber" : "text-mute"}`}>{g.sentence}</p>
      <div className={`flex items-center gap-2 border-t border-line px-4 py-2.5 text-[12.5px] font-medium ${
        bad ? "text-amber" : g.verdict === "matched" ? "text-green" : "text-blue"}`}>
        <span aria-hidden className="text-[14px] leading-none">{bad ? "\u26a0" : g.verdict === "matched" ? "\u2713" : "\u25cb"}</span>
        {bad ? "sent to a person — the variance is outside policy" : g.verdict === "matched"
          ? "posted with no one touching it — every side agreed" : "on file, waiting on the rest of the paperwork"}
      </div>
      {g.lines.length > 0 && (
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full text-[12px]">
            <thead><tr className="label text-mute2">
              {["line / sku", "ordered", "billed", "received", "unit Δ", "verdict"].map(h => <th key={h} className="px-3 py-1.5 text-left font-normal">{h}</th>)}</tr></thead>
            <tbody>{g.lines.map((l, i) => (
              <tr key={i} className="border-t border-line">
                <td className="px-3 py-1.5 text-txt-hi">{l.sku ?? <span className="text-mute2">unnamed</span>}</td>
                <td className="num px-3 py-1.5">{l.ordered?.toLocaleString("en-GB") ?? "—"}</td>
                <td className={`num px-3 py-1.5 ${!l.within && l.billed != null ? "text-amber" : ""}`}>{l.billed?.toLocaleString("en-GB") ?? "—"}</td>
                <td className="num px-3 py-1.5">{l.received?.toLocaleString("en-GB") ?? "—"}</td>
                <td className="num px-3 py-1.5">{l.priceVariancePct == null ? "—" : `${l.priceVariancePct.toFixed(1)}%`}</td>
                <td className="px-3 py-1.5">{l.billed == null ? <span className="text-mute2">not billed yet</span>
                  : l.within ? <span className="text-green">inside tolerance</span>
                  : <span className="text-amber">{l.notes[0] ?? "outside tolerance"}</span>}</td>
              </tr>))}</tbody>
          </table>
        </div>)}
    </div>
  );
}

export function Row({ d, open, threshold, onToggle, fix, setFix, applyFix }: {
  d: DocResult; open: boolean; threshold: number; onToggle: () => void;
  fix: { i: number; key: string; value: string } | null; setFix: (f: { i: number; key: string; value: string } | null) => void;
  applyFix: () => void;
}) {
  const lane = d.status === "committed" ? "text-green" : d.status === "exception" ? "text-amber"
    : d.status === "approval" ? "text-blue" : "text-mute2";
  return (
    <div className={`row border-b border-line px-4 py-3 transition-colors ${open ? "open bg-panel" : "hover:bg-hover/40"}`}>
      <button onClick={onToggle} aria-expanded={open}
        className="grid w-full grid-cols-[1fr_auto] items-baseline gap-3 text-left sm:grid-cols-[64px_minmax(0,1fr)_128px_auto]">
        <span className="label text-mute2">#{d.i + 1} {d.kind === "text" ? "" : d.kind}</span>
        <span className="min-w-0 truncate text-[13px]">
          <span className="text-txt-hi">{d.typeLabel}</span>
          <span className="text-mute2"> · {d.name}</span>
          {d.ref && <span className="num text-mute"> · {d.ref}</span>}
        </span>
        <span className={`label ${lane}`}>{d.status === "committed" ? `→ ${d.destinationCode}`
          : d.status === "exception" ? "held" : d.status === "approval" ? "approval" : "set aside"}</span>
        <span className="flex items-center justify-self-end gap-2">
          {d.duplicateOf != null && <span className="stamp stamp-dup">duplicate</span>}
          {d.status === "approval" && <span className="stamp stamp-wait">approval</span>}
          <span className="num text-[12px] text-mute2">{d.ms} ms</span>
        </span>
      </button>
      {(d.note || d.reject) && (
        <p className={`mt-1.5 max-w-[86ch] text-[12.5px] leading-snug ${d.status === "committed" ? "text-mute" : "text-amber"}`}>
          {d.reject ?? d.note}</p>)}
      {open && (() => {
        const withValue = d.fields.filter(f => f.value !== "");
        const lowest = withValue.length ? Math.min(...withValue.map(f => f.confidence)) : 0;
        const passCount = withValue.filter(f => f.confidence >= threshold).length;
        return (
        <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div>
            {withValue.length > 0 && (
              <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line pb-3">
                <span className="kpi"><b className={lowest < threshold ? "text-amber" : "text-green"}>
                  {Math.floor(lowest * 100)}%</b><span>lowest field</span></span>
                <span className="text-[12px] text-mute">{passCount} of {withValue.length} fields at or above the
                  {" "}{Math.floor(threshold * 100)}% bar this policy sets</span>
              </div>)}
            <h3 className="label">Fields, and what each one is standing on</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {d.fields.map(f => {
                const low = f.value !== "" && f.confidence < threshold;
                const editing = fix?.i === d.i && fix.key === f.key;
                return (
                  <div key={f.key} className="field border-b border-line pb-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="label text-mute">{f.label}</span>
                      <span className={`num text-[11px] ${f.value === "" ? "text-mute2" : low ? "text-amber" : "text-mute2"}`}>
                        {f.value === "" ? "not read" : `${Math.floor(f.confidence * 100)}%`}</span>
                    </div>
                    {editing ? (
                      <span className="mt-1 flex items-center gap-1.5">
                        <input autoFocus className="pol" aria-label={`corrected ${f.label}`} value={fix.value}
                          onChange={e => setFix({ i: d.i, key: f.key, value: e.target.value })}
                          onKeyDown={e => { if (e.key === "Enter") applyFix(); }} />
                        <button className="btn btn-primary" onClick={applyFix}>fix &amp; re-run</button>
                        <button className="btn" onClick={() => setFix(null)}>cancel</button>
                      </span>
                    ) : (
                      <p className="mt-0.5 text-[13px] text-txt-hi">
                        {f.value === "" ? <span className="text-mute2">—</span> : f.value}
                        {f.value !== "" && (
                          <button className="ml-2 text-[11px] text-mute2 underline decoration-dotted hover:text-txt-hi"
                            onClick={() => setFix({ i: d.i, key: f.key, value: f.value })}>edit</button>)}
                      </p>)}
                    {f.evidence && <span className="evid">from the page: <mark>{f.evidence}</mark></span>}
                    {!f.evidence && f.reason && <span className="evid">{f.reason}</span>}
                    {f.value !== "" && <span className="meter mt-1.5 block"><i style={{ width: `${Math.min(100, Math.floor(f.confidence * 100))}%`, background: low ? "var(--amber)" : "var(--green)" }} /></span>}
                  </div>);
              })}
            </div>
            {d.lines.length > 0 && (
              <>
                <h3 className="label mt-4">Line items</h3>
                <table className="mt-1.5 w-full text-[12px]">
                  <thead><tr className="label text-mute2">{["#", "sku", "qty", "unit", "amount", "checked"].map(h => <th key={h} className="py-1 pr-3 text-left font-normal">{h}</th>)}</tr></thead>
                  <tbody>{d.lines.map(l => (
                    <tr key={l.n} className="border-t border-line">
                      <td className="num py-1 pr-3 text-mute2">{l.n}</td>
                      <td className="py-1 pr-3 text-txt-hi">{l.sku ?? "—"}</td>
                      <td className="num py-1 pr-3">{l.qty?.toLocaleString("en-GB") ?? "—"}</td>
                      <td className="num py-1 pr-3">{l.unit == null ? "—" : money(l.unit, d.currency)}</td>
                      <td className="num py-1 pr-3">{l.amount == null ? "—" : money(l.amount, d.currency)}
                        {l.derived && <span className="ml-1.5 text-[10.5px] text-mute2">derived</span>}</td>
                      <td className="py-1 text-mute2">{l.reason ?? (l.derived ? "no amount stated; qty × unit" : "stated, and it agrees")}</td>
                    </tr>))}</tbody>
                </table>
                <p className="mt-1.5 text-[12px] text-mute">
                  <span className="num">{money(d.totals.computed, d.currency)}</span> across {d.lines.length} line{d.lines.length > 1 ? "s" : ""} ·{" "}
                  {d.totals.unstated ? "the document states no total, so nothing was checked rather than everything passing"
                    : d.totals.variance == null ? `the document states ${money(d.totals.stated, d.currency)}, and it agrees`
                    : `the document states ${money(d.totals.stated, d.currency)} — a difference of ${money(Math.abs(d.totals.variance), d.currency)}, reported and not corrected`}
                </p>
              </>)}
          </div>
          <div>
            <h3 className="label">Audit trail</h3>
            <div className="timeline mt-2 grid gap-1.5">
              {d.audit.map((a, i) => (
                <div key={i} className={`tl ${a.kind === "held" || a.kind === "no-write" ? "tl-hold" : a.kind === "prepared" || a.kind === "routed" ? "tl-clear" : ""}`}>
                  <div className="flex items-baseline gap-2">
                    <span className="num text-[10.5px] text-mute2">+{a.at}ms</span><span className="label">{a.kind}</span>
                  </div>
                  <p className="text-[12px] leading-snug text-ink2">{a.detail}</p>
                </div>))}
            </div>
            <h3 className="label mt-4">What would be written</h3>
            <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap break-words border border-line bg-inset p-2.5 text-[11px] leading-relaxed text-ink2">
              {d.payload ? JSON.stringify(d.payload, null, 1)
                : `null — nothing is prepared while this row is ${d.status === "discarded" ? "set aside" : "held"}`}
            </pre>
          </div>
        </div>);
      })()}
    </div>
  );
}

export function ResultsSection({ run, busy, policy, open, setOpen, fix, setFix, applyFix, stamp }: {
  run: RunResult | null; busy: boolean; policy: Policy; open: number | null;
  setOpen: (i: number | null) => void; fix: { i: number; key: string; value: string } | null;
  setFix: (f: { i: number; key: string; value: string } | null) => void; applyFix: () => void; stamp: string;
}) {
  const counts = run?.counts ?? { total: 0, committed: 0, held: 0, approval: 0, discarded: 0 };
  const billed = run?.docs.reduce((a, d) => a + (d.totals.computed ?? d.totals.stated ?? 0), 0) ?? 0;
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <span className="eyebrow text-mute2">{busy ? "running" : "this run"}</span>
        <span className="h-px flex-1 bg-line" />
        {run && <span className="label text-mute2">{stamp}</span>}
      </div>
      <div className="lanes">
        {LANES.map(l => (
          <div key={l.key} className={`lane ${l.cls}`}>
            <i aria-hidden />
            <div className="kpi"><b>{counts[l.key]}</b><span>{l.label}</span></div>
          </div>))}
        <span className="absolute right-0 -top-px label text-mute2">{counts.total} {counts.total === 1 ? "document" : "documents"}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[12px] text-mute">
        <span className="num">{run?.ms ?? "—"} ms</span><span className="-ml-2">end to end · rules only, no model, no charge</span>
        {run && <span className="num">{money(billed, run.docs[0]?.currency ?? "£")}</span>}
        <span className="-ml-2">billed across the batch</span>
        <span className="ml-auto flex items-center gap-2">
          {busy && <span className="label text-amber">working…</span>}
          {!!run && !busy && <a className="btn" href={csv(run)} download="conduit-rows.csv">field map (.csv)</a>}
        </span>
      </div>

      {!!run && run.groups.length > 0 && (
        <div className="mt-7 grid gap-3 xl:grid-cols-2">
          {run.groups.map(g => <Match key={g.key} g={g} docs={run.docs} cur={run.docs[0]?.currency ?? "£"} />)}
        </div>)}

      <div className="mt-7 border-t border-line">
        {busy && <div className="pane-wait py-8 text-center label text-mute">reading…</div>}
        {!busy && run?.docs.map(d => (
          <Row key={`${d.i}:${d.digest ?? ""}`} d={d} open={open === d.i} threshold={policy.threshold}
            onToggle={() => setOpen(open === d.i ? null : d.i)} fix={fix} setFix={setFix} applyFix={applyFix} />))}
      </div>
    </section>
  );
}
