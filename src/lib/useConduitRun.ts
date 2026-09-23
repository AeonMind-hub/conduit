"use client";

/*
  The engine behind both pages.

  Splitting the site into an input page and a results page (rather than one page that silently
  swaps its own content) meant the run logic itself needed a home that isn't either page — this
  hook is that home. `/` calls it to start a run and hands off to `/run` the moment one finishes;
  `/run` calls the same hook to keep re-running with an edited policy, exactly as it always could.
  Nothing about the engine's own behaviour changed — only which component is allowed to hold it.
*/
import { useCallback, useMemo, useRef, useState } from "react";
import type { DocResult, MatchGroup, Policy, RunResult } from "@/lib/batch";

export const DEFAULTS: Policy = { threshold: 0.85, tolerancePct: 2, toleranceAbs: 25,
  requirePO: true, requireReceipt: false, autoApproveUnder: 0 };

export const STAGE: Record<string, string> = { receive: "received", text: "reading text", classify: "identifying",
  extract: "reading fields", gates: "checking gates", match: "reconciling" };

export type SentDoc = { name: string; text: string };

/** Everything a finished run needs to be redrawn elsewhere, with nothing that can't survive
 *  `JSON.stringify` — this is exactly what crosses from the input page to the results page. */
export type RunSnapshot = { run: RunResult; policy: Policy; sent: SentDoc[]; title: string };

export function useConduitRun(onRun?: (snap: RunSnapshot) => void) {
  const [title, setTitle] = useState("");
  const [policy, setPolicy] = useState<Policy>(DEFAULTS);
  const [run, setRun] = useState<RunResult | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [fix, setFix] = useState<{ i: number; key: string; value: string } | null>(null);
  const sent = useRef<SentDoc[]>([]);

  const post = useCallback(async (inputs: SentDoc[], pol: Policy, label?: string) => {
    if (!inputs.length) { setError("Nothing to run. Paste a document, drop files, or run the sample batch."); return; }
    setBusy(true); setError(null); setRun(null); setOpen(null); setFix(null);
    const fd = new FormData();
    inputs.forEach(d => fd.append("files", new File([d.text], d.name, { type: "text/plain" })));
    fd.append("policy", JSON.stringify(pol));
    const t0 = performance.now();
    try {
      const res = await fetch("/api/pilot", { method: "POST", body: fd });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => null))?.error ?? `the run stopped (${res.status})`);
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
      const docs: DocResult[] = []; let groups: MatchGroup[] = []; let meta: Record<string, unknown> = {};
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n"); buf = parts.pop() ?? "";
        for (const line of parts) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line) as Record<string, unknown> & { t: string };
          if (ev.t === "stage") {
            setStage(STAGE[String(ev.stage)] ?? String(ev.stage));
            await new Promise(r => setTimeout(r, inputs.length > 1 ? 200 : 280));
          } else if (ev.t === "doc") docs.push(ev.verdict as DocResult);
          else if (ev.t === "matches") groups = ev.groups as MatchGroup[];
          else if (ev.t === "done") meta = { policy: ev.policy, clamped: ev.clamped, counts: ev.counts };
          else if (ev.t === "error") throw new Error(String(ev.message));
        }
      }
      const finished: RunResult = { docs, groups, policy: (meta.policy ?? pol) as Policy, clamped: (meta.clamped ?? []) as string[],
        counts: (meta.counts ?? { total: docs.length, committed: 0, held: 0, approval: 0, discarded: 0 }) as RunResult["counts"],
        ms: Math.round(performance.now() - t0) };
      setRun(finished);
      sent.current = inputs;
      const first = docs.find(d => d.status === "exception") ?? docs.find(d => d.status !== "discarded");
      if (first) setOpen(first.i);
      onRun?.({ run: finished, policy: (meta.policy ?? pol) as Policy, sent: inputs, title: label ?? "" });
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); setStage(null); }
  }, [onRun]);

  const runText = useCallback((body: string, name: string, pol = policy) => {
    const parts = body.split(/\n[ \t]*-{3,}[ \t]*\n/).map(s => s.trim()).filter(Boolean);
    setTitle(name);
    void post((parts.length ? parts : [body]).map((t, i) => ({
      name: parts.length > 1 ? `${name} ${i + 1}` : name, text: t })), pol, name);
  }, [policy, post]);

  const runFiles = useCallback(async (list: File[], pol = policy) => {
    const inputs: SentDoc[] = [];
    for (const f of list) {
      const isText = /\.(txt|md|csv|tsv|json|eml)$/i.test(f.name) || f.type.startsWith("text/");
      inputs.push({ name: f.name, text: isText ? await f.text() : `[binary file: ${f.name} · ${f.size} bytes — its text layer is read by the pipeline, not by the free demo]` });
    }
    const label = list.length === 1 ? `your file · ${list[0].name}` : `your files · ${list.length} documents`;
    setTitle(label);
    void post(inputs, pol, label);
  }, [policy, post]);

  const applyFix = useCallback(() => {
    if (!fix || !run) return;
    const doc = run.docs.find(d => d.i === fix.i); const src = sent.current[fix.i];
    if (!doc || !src) return;
    const row = doc.fields.find(f => f.key === fix.key);
    const label = row?.label ?? fix.key;
    const body = row?.value
      ? src.text.replace(new RegExp(row.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), fix.value)
      : `${src.text}\n${label}: ${fix.value}`;
    const inputs = sent.current.map((d, i) => i === fix.i
      ? { ...d, text: `${body}\n(corrected by hand before re-run: ${label})` } : d);
    void post(inputs, policy, title);
  }, [fix, run, policy, post, title]);

  const rerun = useCallback(() => { if (sent.current.length) void post(sent.current, policy, title); }, [policy, post, title]);

  const runBatch = useCallback((label: string, inputs: SentDoc[], pol = policy) => {
    setTitle(label);
    void post(inputs, pol, label);
  }, [policy, post]);

  /** Load a snapshot handed off from another page — same shape a finished run leaves behind, so the
   *  rest of the hook (re-run, fix-and-re-run, policy edits) cannot tell the difference. */
  const hydrate = useCallback((snap: RunSnapshot) => {
    setRun(snap.run); setPolicy(snap.policy); sent.current = snap.sent; setTitle(snap.title);
    const first = snap.run.docs.find(d => d.status === "exception") ?? snap.run.docs.find(d => d.status !== "discarded");
    if (first) setOpen(first.i);
  }, []);

  const counts = run?.counts ?? { total: 0, committed: 0, held: 0, approval: 0, discarded: 0 };
  const billed = useMemo(() => run?.docs.reduce((a, d) => a + (d.totals.computed ?? d.totals.stated ?? 0), 0) ?? 0, [run]);

  return { title, setTitle, policy, setPolicy, run, setRun, stage, busy, error, open, setOpen, fix, setFix,
    sent, post, runText, runFiles, runBatch, applyFix, rerun, hydrate, counts, billed };
}
