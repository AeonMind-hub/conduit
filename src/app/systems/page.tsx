import Link from "next/link";
import { DOC_TYPES } from "@/lib/doctypes";
import { THRESHOLD, CLASSIFY_THRESHOLD } from "@/lib/types";
import { runRules } from "@/lib/rules";
import { payloadFor } from "@/lib/payload";
import { EMPTY_WIRE, pushLive, rebuild } from "@/lib/session";
import { SAMPLES } from "@/lib/samples";
import { SYSTEMS, INTAKE_ADDRESS } from "@/lib/config";

/*
  The gates, in the words the product uses for them. Each code here is one that the engine actually
  emits — `scripts/verify.mjs` fails the build if this table advertises a code nothing raises, because a
  legend that has drifted from the rules is worse than no legend: a reader quotes it back to you.
*/
const GATES = [
  { code: "AMBIGUOUS_TYPE", why: "nothing on the page says, strongly enough, what kind of document this is" },
  { code: "MISSING_<FIELD>", why: "a field the destination requires is not stated in the document at all" },
  { code: "LOW_CONF_<FIELD>", why: "the field was found, but under the confidence this client set for writing unattended" },
  { code: "UNREADABLE", why: "the file carries no machine-readable text — a scan, or a format this build does not open" },
  { code: "NO_TRANSACTIONAL_CONTENT", why: "there is no order, invoice or booking in it, so it is discarded rather than queued" },
];

/**
 * The page for whoever owns the integrations, and the only place in the product that shows the write
 * contract. Nothing here is hand-maintained copy: the fields come from `doctypes.ts`, the thresholds from
 * `types.ts`, and the payload is produced by running one of the four samples through the same engine the
 * paste box calls, at request time — so this page cannot drift from the product and advertise a contract
 * that no longer exists.
 */
export const dynamic = "force-dynamic";

export default function Systems() {
  const sample = SAMPLES[0];
  const fx = runRules(sample.body);
  const w = pushLive(EMPTY_WIRE, {
    id: 1, from: INTAKE_ADDRESS, subject: sample.label, receivedAt: "2026-09-18T08:12:00.000Z",
    type: fx.type, relevant: !!fx.relevant, reject: fx.rejectReason,
    v: fx.extraction?.values ?? {}, cf: fx.extraction?.confidence ?? {}, tc: fx.extraction?.typeConfidence ?? 0,
    ms: 0, eng: "rules" as const,
  }, 1);
  const store = rebuild(w);
  const rec = store.records[0];
  const payload = rec ? payloadFor(rec, store, { text: sample.body }) : null;

  return (
    <div>
      <Link href="/" className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-mute hover:text-ink">← the machine</Link>
      <h1 className="display mt-3 text-[34px] leading-[1.08] sm:text-[42px]">What it writes,<br /><i>and what stops it.</i></h1>
      <p className="lede mt-3 max-w-[58ch]">
        The definitions below are what the extraction runs against on every document, on the page you just
        used. Change a client&rsquo;s stack, not the product: they live in one file.
      </p>

      <section className="mt-9">
        <h2 className="label">Field definitions · per document type</h2>
        <div className="mt-2 divide-y divide-rule border-y border-rule">
          {Object.values(DOC_TYPES).filter(d => d.id !== "unclassified").map(d => (
            <div key={d.id} className="py-3.5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-[15px] font-medium text-ink">{d.label}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute2">{d.id}</span>
                <span className="ml-auto font-mono text-[10.5px] text-mute">→ {d.destination}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
                {d.fields.map(f => (
                  <span key={f.key} className="font-mono text-[11.5px] text-ink2">
                    {f.key}
                    <span className="text-mute2"> · {f.label}</span>
                    {f.required ? <span className="text-amber"> *</span> : null}
                  </span>
                ))}
              </div>
              <p className="mt-1.5 text-[12.5px] leading-[1.45] text-mute">{d.riskLine}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.1em] text-mute2">
          * required — a document missing it is held, not completed
        </p>
      </section>

      <section className="mt-9">
        <h2 className="label">The gates · a document must clear every one</h2>
        <div className="mt-2 divide-y divide-rule border-y border-rule">
          {GATES.map(g => (
            <div key={g.code} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5">
              <span className="stamp stamp-hold">{g.code}</span>
              <span className="text-[13.5px] leading-[1.45] text-body max-w-[52ch]">{g.why}</span>
            </div>
          ))}
        </div>
        <p className="mt-2.5 max-w-[64ch] text-[13px] leading-[1.5] text-mute">
          Confidence is floored, never rounded up: a reading of 0.799 is held rather than written. The two
          numbers are {Math.round(THRESHOLD * 100)}% on a required field and {Math.round(CLASSIFY_THRESHOLD * 100)}%
          on the document type — the same thresholds the sample corpus is scored on, in
          <code className="mr-0.5 font-mono text-[11.5px] text-ink2">src/lib/types.ts</code>.
        </p>
      </section>

      <section className="mt-9">
        <h2 className="label">The body it prepares · {SYSTEMS.ERP}, from the sample purchase order</h2>
        <pre className="mt-2 overflow-x-auto border border-rule2 bg-paper2 px-3.5 py-3 font-mono text-[11.5px] leading-[1.65] text-ink2">
          {JSON.stringify(payload, null, 2)}
        </pre>
        <p className="mt-2.5 max-w-[64ch] text-[12.5px] leading-[1.5] text-mute">
          The reference the supplier wrote on the paper is the{" "}
          <code className="font-mono text-[11.5px] text-ink2">external_id</code>, and the{" "}
          <code className="font-mono text-[11.5px] text-ink2">idempotency_key</code> is that reference plus a
          digest of the document&rsquo;s own text — so the same paperwork arriving twice, under two file
          names, is one order in the ledger rather than two. This deployment holds no credentials for
          anything, so the body is printed and never posted; in a pilot it goes behind the client&rsquo;s own
          approval.
        </p>
      </section>

      <section className="mt-9 border-t border-rule pt-4">
        <h2 className="label">What this deployment is not</h2>
        <p className="mt-1.5 max-w-[64ch] text-[13.5px] leading-[1.55] text-body">
          No account system, no storage, no inbox connector. In production documents arrive at{" "}
          <span className="font-mono text-[12.5px] text-ink">{INTAKE_ADDRESS}</span> by mailbox rule, not by a
          form; a pilot build writes to one named system behind the client&rsquo;s own approval, and that is
          a scoped build, quoted as one.
        </p>
        <Link href="/" className="mt-5 inline-block font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink underline decoration-rule2 underline-offset-4 hover:decoration-ink">
          ← back to the machine
        </Link>
      </section>
    </div>
  );
}
