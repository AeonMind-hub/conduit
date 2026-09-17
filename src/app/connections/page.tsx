import PageHead from "@/components/PageHead";
import { TypeTag } from "@/components/Pipeline";
import { DOC_TYPES } from "@/lib/doctypes";
import { CLIENT_NAME, ENV_LABEL, INTAKE_ADDRESS, SYSTEMS, systemName } from "@/lib/config";
import { visitorState } from "@/lib/wire-http";
import type { CommittedRecord, Store } from "@/lib/types";

export const dynamic = "force-dynamic";

/*
  The screen an IT manager wants and every "AI automation" pitch skips.

  It answers the only two questions that decide whether something gets bought: what EXACTLY is
  written into my system, and what stops it writing garbage. So this page shows the real payload
  Conduit just produced for a real record in this run — same cells, same audit trail — plus the
  field map and the three rules that govern the write. Nothing here is a mock-up: every payload
  is built from store.records, which is the same data the Records screen shows.
*/

const CONNECTOR: Record<string, string> = {
  ERP: "RESTlet / SuiteApp upsert on purchase order",
  AP: "create bill, then attach source document",
  WMS: "inbound appointment create, dock slot held until confirmed",
  CRM: "upsert deal by company + PO reference",
};

function payloadFor(r: CommittedRecord, store: Store) {
  const src = Object.values(store.processed).find(p => p.doc.id === r.sourceDocId)?.doc;
  return {
    object: DOC_TYPES[r.type]?.label ?? r.type,
    external_id: r.ref,
    idempotency_key: `${r.ref}:${r.sourceDocId}`,
    received_at: src?.receivedAt ?? null,
    from: src?.from ?? null,
    fields: r.cells,
    confidence: r.confidence,
    provenance: {
      committed_by: r.auto ? "conduit" : "human_review",
      fields_corrected_by_human: r.correctedFields,
      engine: r.engine ?? "fixture",
    },
    downstream: r.actions.map(a => `${a.kind}:${a.target}`),
  };
}

export default async function ConnectionsPage() {
  const { store } = await visitorState();

  const codes = Object.keys(SYSTEMS);
  const byCode = codes.map(code => {
    const types = Object.values(DOC_TYPES).filter(d => d.destinationCode === code);
    const recs = store.records.filter(r => r.destination === code);
    return { code, types, recs, last: recs[recs.length - 1] ?? null };
  });

  const mapped = Object.values(DOC_TYPES)
    .filter(d => d.destinationCode !== "—")
    .flatMap(d => d.fields.map(f => ({ dest: d.destinationCode, sys: systemName(d.destinationCode), type: d, f })));

  return (
    <div className="px-4 sm:px-6 py-5 max-w-[1400px] mx-auto">
      <PageHead
        title="Connections"
        meta={`${CLIENT_NAME} · ${ENV_LABEL} · ${codes.length} destinations · intake ${INTAKE_ADDRESS}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {byCode.map(({ code, types, recs, last }) => (
          <div key={code} className="card px-4 py-3.5 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-raised border border-line2 grid place-items-center
                              text-[10px] font-semibold text-txt-mid shrink-0">{code}</div>
              <div className="min-w-0">
                <div className="text-sm2 font-medium text-txt-hi truncate">{systemName(code)}</div>
                <div className="text-micro text-txt-dim truncate">
                  {types.map(t => t.label).join(" · ") || "no document type routed here yet"}
                </div>
              </div>
              <span className="ml-auto shrink-0 text-micro px-2 py-1 rounded-md border border-acc-line
                               bg-acc-soft text-acc">mapping live</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ["fields mapped", String(mapped.filter(m => m.dest === code).length)],
                ["written this run", String(recs.length)],
                ["blocked to a human", String(store.stats.exceptions)],
              ].map(([l, v]) => (
                <div key={l} className="rounded-lg bg-raised border border-line py-2">
                  <div className="text-base2 font-semibold text-txt-hi tnum leading-none">{v}</div>
                  <div className="text-micro text-txt-dim mt-1">{l}</div>
                </div>
              ))}
            </div>

            <div className="text-micro text-txt-lo leading-relaxed">
              <span className="text-txt-mid">Connector:</span> {CONNECTOR[code] ?? "custom write"} ·
              replay-safe on the idempotency key · never fires on a held document · one retry then
              it stops and asks.
            </div>

            {last ? (
              <div>
                <div className="text-micro text-txt-dim mb-1.5 flex items-center gap-2">
                  <span className="label">Payload written for {last.ref}</span>
                  <span className="font-mono text-txt-lo">
                    {last.auto ? "auto" : `human · ${last.correctedFields.length} field(s) corrected`}
                  </span>
                </div>
                <pre className="text-[11px] leading-relaxed font-mono bg-bg border border-line
                                rounded-lg px-3 py-2.5 overflow-auto max-h-[260px] text-txt-lo">{
                  JSON.stringify(payloadFor(last, store), null, 2)
                }</pre>
              </div>
            ) : (
              <div className="text-micro text-txt-dim">
                Nothing routed here in this run yet — documents that map to {systemName(code)} commit
                it the moment one arrives.
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card overflow-hidden mt-4">
        <div className="px-4 py-2.5 border-b border-line flex items-center gap-2">
          <span className="label">Field map</span>
          <span className="text-micro text-txt-dim">
            the only thing that changes per client · {mapped.length} fields · adding a document type
            is one entry, no UI code knows any specific type
          </span>
        </div>
        <div className="overflow-auto max-h-[420px]">
          <table className="w-full text-sm2">
            <thead className="sticky top-0 bg-surface">
              <tr className="text-micro text-txt-dim">
                {["Destination", "System", "Document", "Their field", "Read from", "Required", "If it is unsure"].map(h => (
                  <th key={h} className="text-left font-medium px-4 py-2 border-b border-line whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mapped.map((m, i) => (
                <tr key={`${m.dest}-${m.type.id}-${m.f.key}`}
                    className={i % 2 ? "bg-raised/40" : ""}>
                  <td className="px-4 py-2 font-mono text-micro text-txt-mid">{m.dest}</td>
                  <td className="px-4 py-2 text-txt-mid whitespace-nowrap">{m.sys}</td>
                  <td className="px-4 py-2 whitespace-nowrap"><TypeTag code={m.type.code} /></td>
                  <td className="px-4 py-2 text-txt-hi whitespace-nowrap">{m.f.label}</td>
                  <td className="px-4 py-2 font-mono text-micro text-txt-dim">{m.f.key}</td>
                  <td className="px-4 py-2">
                    {m.f.required
                      ? <span className="text-micro px-1.5 py-0.5 rounded border border-acc-line bg-acc-soft text-acc">yes</span>
                      : <span className="text-micro px-1.5 py-0.5 rounded border border-line2 text-txt-dim">no</span>}
                  </td>
                  <td className="px-4 py-2 text-txt-dim text-xs2 whitespace-nowrap">
                    {m.f.required ? "held for review" : "left blank, still written"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl2 border border-line bg-surface px-4 py-3.5 mt-4">
        <div className="text-micro label mb-2">What a build adds on top of this</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-micro text-txt-lo leading-relaxed">
          <p>
            <span className="text-txt-mid">The mailbox.</span> A forwarding rule into{" "}
            <span className="font-mono text-txt-mid">{INTAKE_ADDRESS}</span> replaces the paste box,
            plus attachment text (PDF and scanned pages go through the same OCR + extraction path).
          </p>
          <p>
            <span className="text-txt-mid">Your rules.</span> Vendor terms, credit limits, dock
            windows, the PO formats your customers actually send. Rules live beside the field map,
            not in someone&apos;s head.
          </p>
          <p>
            <span className="text-txt-mid">Real writes.</span> The payloads above go to a sandbox
            first. You switch each destination on separately, after you have read the accuracy
            number for your own documents.
          </p>
        </div>
      </div>
    </div>
  );
}
