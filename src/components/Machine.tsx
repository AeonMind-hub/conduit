"use client";

/*
  The front door.

  This page's only job is to collect one thing: a document, a batch, or a policy change, and hand it
  to the results page. It used to also render the results in place — one page pretending to be two
  states — but a visitor coming in cold from a link could not tell "empty" from "about to work" from
  "finished," and the result looked like it hadn't done anything. Now submitting is a real navigation:
  the input goes into sessionStorage (never a cookie, never the server — `/run` reads it once and the
  key is gone), and `/run` is where the machine actually runs and shows its work.
*/
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SAMPLES, BATCH } from "@/lib/samples";
import { DEFAULTS, type SentDoc } from "@/lib/useConduitRun";
import { PolicyPanel } from "@/components/PolicyPanel";
import type { Policy } from "@/lib/batch";

export const PENDING_KEY = "conduit:pending";

export default function Machine() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [policy, setPolicy] = useState<Policy>(DEFAULTS);
  const [error, setError] = useState<string | null>(null);
  const [going, setGoing] = useState(false);
  const fileIn = useRef<HTMLInputElement>(null);

  const go = useCallback((inputs: SentDoc[], label: string, pol: Policy) => {
    if (!inputs.length) { setError("Nothing to run. Paste a document, drop files, or run the sample batch."); return; }
    setError(null); setGoing(true);
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ inputs, policy: pol, label }));
    router.push("/run");
  }, [router]);

  const goText = useCallback((body: string, name: string) => {
    const parts = body.split(/\n[ \t]*-{3,}[ \t]*\n/).map(s => s.trim()).filter(Boolean);
    go((parts.length ? parts : [body]).map((t, i) => ({
      name: parts.length > 1 ? `${name} ${i + 1}` : name, text: t })), name, policy);
  }, [policy, go]);

  const goFiles = useCallback(async (list: File[]) => {
    const inputs: SentDoc[] = [];
    for (const f of list) {
      const isText = /\.(txt|md|csv|tsv|json|eml)$/i.test(f.name) || f.type.startsWith("text/");
      inputs.push({ name: f.name, text: isText ? await f.text() : `[binary file: ${f.name} · ${f.size} bytes — its text layer is read by the pipeline, not by the free demo]` });
    }
    go(inputs, list.length === 1 ? `your file · ${list[0].name}` : `your files · ${list.length} documents`, policy);
  }, [policy, go]);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
      <div className="lg:col-span-2 mb-2 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="mast-name text-[16px] text-txt-hi">Nathaniel Zinsu</p>
          <p className="mt-1.5 max-w-[58ch] text-[13px] leading-relaxed text-mute">
            I build software around the way a business already works. Conduit, below, is a selected build — a
            working purchase-order, invoice and goods-received reconciliation, running end to end on real rules,
            not a mockup.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <a href="https://wa.me/2348081588359" target="_blank" rel="noopener noreferrer" className="btn btn-ghost">whatsapp</a>
          <a href="mailto:zinsunathaniel5@gmail.com" className="btn btn-ghost">get in touch</a>
        </div>
      </div>

      <section>
        <span className="kicker"><i />rules engine · no model · nothing stored</span>
        <h1 className="display mt-4 text-[38px] sm:text-[52px] leading-[0.98] tracking-[-0.025em] text-txt-hi">
          Your whole dock,<br />on your own paper.
        </h1>
        <p className="lede mt-4 max-w-[54ch]">
          Drop in the orders, invoices and goods-received notes a team chases by hand. Conduit reads each one and
          checks them against each other — what was ordered, what was billed, what walked through the door — and
          instead of writing a guess it holds the row and says what it could not verify.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { n: "1", t: "paste or drop", d: "an order, an invoice, a receipt — whatever a team is chasing by hand" },
            { n: "2", t: "it reads and checks", d: "what kind of document it is, then what it agrees or disagrees with" },
            { n: "3", t: "it decides, and says why", d: "posted, held for a person, or set aside \u2014 never a silent guess" },
          ].map(s => (
            <div key={s.n} className="border-l-2 border-line pl-3">
              <span className="num text-[11px] text-mute2">{s.n}</span>
              <p className="mt-0.5 text-[12.5px] font-medium text-txt-hi">{s.t}</p>
              <p className="mt-0.5 text-[12px] leading-snug text-mute">{s.d}</p>
            </div>))}
        </div>

        <div className="card-hero mt-7">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
            <span className="label">{text ? `${text.split(/\n[ \t]*-{3,}[ \t]*\n/).filter(Boolean).length} document(s) in the box` : "one document, or a whole batch"}</span>
            <span className="label text-mute2">{files.length ? `${files.length} file${files.length > 1 ? "s" : ""} ready` : "paste · drop · run"}</span>
          </div>
          <textarea id="doc" value={text} spellCheck={false} aria-label="Document text"
            onChange={e => setText(e.target.value)}
            onDrop={e => { e.preventDefault(); setFiles([...files, ...Array.from(e.dataTransfer.files)]); }}
            onDragOver={e => e.preventDefault()}
            onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") goText(text, "pasted document"); }}
            placeholder={"Paste an order, or paste several — put a line of --- between each one.\n\nNothing here is stored, and no key is asked for."}
            className="block h-[168px] w-full resize-y bg-transparent px-4 py-3 font-mono text-[13.5px] leading-[1.65] text-txt-hi outline-none placeholder:text-mute2" />
          <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3"
            onDrop={e => { e.preventDefault(); const l = Array.from(e.dataTransfer.files); if (l.length) void goFiles(l); }}
            onDragOver={e => e.preventDefault()}>
            <button className="btn btn-primary" onClick={() => goText(text, "pasted document")} disabled={going}>
              {going ? "opening the run\u2026" : "Run it"}</button>
            <button className="btn" onClick={() => fileIn.current?.click()}>or choose files</button>
            <input ref={fileIn} type="file" multiple accept=".pdf,.txt,.md,.csv,.eml,.json" className="sr-only"
              onChange={e => { const l = Array.from(e.target.files ?? []); if (l.length) void goFiles(l); }} />
            <button className="btn" onClick={() => go(BATCH.map(s => ({ name: `${s.key}.txt`, text: s.body })),
              "our sample batch — six documents from one dock", policy)} disabled={going}>
              Run the sample batch</button>
            <span className="ml-auto label text-mute2">up to 20 documents · 1.5 MB each · ⌘↵</span>
          </div>
          {files.length > 0 && (
            <div className="border-t border-line px-4 py-2.5">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5 font-mono text-[12px] text-ink2">
                  <span className="truncate">{f.name}</span>
                  <span className="text-mute2">{(f.size / 1024).toFixed(0)} KB</span>
                  <button className="ml-auto text-mute2 hover:text-txt-hi" onClick={() => setFiles(files.filter((_, j) => j !== i))}
                    aria-label={`remove ${f.name}`}>×</button>
                </div>))}
              <button className="btn btn-primary mt-2" disabled={going} onClick={() => void goFiles(files)}>
                Run {files.length} file{files.length > 1 ? "s" : ""}</button>
            </div>)}
        </div>

        <div className="mt-6 flex flex-wrap gap-1.5" role="group" aria-label="Sample documents">
          <span className="label mb-1 w-full">No paperwork to hand? These are our test documents, not a client&rsquo;s — run one at a time:</span>
          {SAMPLES.map(s => (
            <button key={s.key} data-sample={s.key} disabled={going} onClick={() => goText(s.body, `our sample · ${s.label}`)}
              className="min-w-[190px] flex-1 border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:border-line2 hover:bg-hover">
              <span className="block text-[12.5px] text-txt-hi">{s.label}</span>
              <span className="mt-0.5 block text-[11.5px] leading-snug text-mute">{s.promise}</span>
            </button>))}
        </div>
        {error && <p className="mt-3 text-[13px] text-amber" role="alert">{error}</p>}
      </section>

      <PolicyPanel policy={policy} setPolicy={setPolicy} hasRun={false} busy={going} clamped={[]} currency="£" />

      <div className="lg:col-span-2">
        <p className="max-w-[74ch] text-[12px] leading-relaxed text-mute">
          One disclosure, precisely: this machine uses the rules engine only. It reads text a file already
          carries — a photograph or a scan of a page is not OCR&rsquo;d here, it is priced as a build. Documents are
          not stored, sent anywhere, or used to train anything, and no key is asked for — nothing stored, nothing
          sent on our side. Separately, and never mixed with document content: this page counts an anonymous visit
          and its country, the way a shop counts footfall, so the person who built it knows anyone came.
        </p>
      </div>

      <div className="lg:col-span-2 mt-2 border-t border-line pt-8">
        <p className="eyebrow text-mute2">not the only workflow this fits</p>
        <p className="dek mt-3 max-w-[64ch]">
          Conduit is one instance of a shape that repeats: a manual, paper-and-inbox process rebuilt as software
          that checks its own work and says what it could not verify. A few of the other shapes it fits:
        </p>
        <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <div>
            <p className="label text-mute2">operations</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-mute">Internal dashboards, onboarding, approval
              chains, scheduling.</p>
          </div>
          <div>
            <p className="label text-mute2">documents</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-mute">Contract extraction, compliance checks,
              intake beyond this one.</p>
          </div>
          <div>
            <p className="label text-mute2">sales &amp; logistics</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-mute">Quotation systems, dispatch, inventory,
              delivery tracking.</p>
          </div>
          <div>
            <p className="label text-mute2">finance</p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-mute">Reconciliation beyond this one, expense
              processing, exception routing.</p>
          </div>
        </div>
        <a href="mailto:zinsunathaniel5@gmail.com" className="btn btn-primary mt-7">describe your workflow</a>
      </div>
    </div>
  );
}
