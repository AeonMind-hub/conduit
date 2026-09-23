# Conduit — paste a document, get a clean row

**Live, open, no code:** <https://conduit-demo-version.vercel.app>

One screen. Put an order, an invoice, a booking note or a whole email into it — paste or file — and it
reads out the fields each document type needs, runs them through the same gates a system of record would
run, and routes the ones it can stand behind. Anything it cannot verify is **held with the reason printed
beside it**, never filled in from a guess. A stranger on a phone gets a result in under a minute.

> Emails with attachments arrive → Conduit classifies them, extracts the fields each type needs,
> validates them, and writes clean rows into your ERP, accounting and WMS. Anything it cannot verify goes
> to a human queue instead of being guessed.

That is the product. Everything below is how this repository makes that claim checkable.

## Why the page looks like this

The previous version was a seven-section operations console: stat strips, a pipeline animation, a ledger
of 75 sample documents, an analytics tab projecting savings. All of it accurate, all of it describing the
product instead of being it. It is gone. What is left is the thing visitors were being made to read about:
an input, the run, the result.

- `/` — the machine. Nothing else above the fold.
- `/systems` — one page deeper, for whoever owns the integrations: the field definitions per document
  type, the gate codes, and a payload produced by running a sample through the real engine **at request
  time**, not a fixture.
- `POST /api/pilot` — what the page calls. Multipart in (`files`, `text`), newline-delimited JSON out.

## What is real and what is not

| Part | Status |
| --- | --- |
| Classification, extraction, per-field confidence | **Real code.** `src/lib/rules.ts` — labelled finders per document type over the field definitions in `src/lib/doctypes.ts` and the gates in `src/lib/types.ts`. Deterministic, free, and it will not fill a field whose label is not in the document. |
| The gates | **Real code.** 85% on a required field, 80% on document type, confidences floored and never rounded up. A missing value prints as missing. |
| File intake | **Real.** A PDF's text layer is read with `unpdf`; plain text and pasted text take the same path and the same caps. |
| Multi-line documents | **Not implemented.** One row per write, so a two-line order is *held* (`LOW_CONF_SKU`) rather than its first line being posted as though it were the whole order. Line-level rows are a pilot build, priced as one. |
| OCR, Word, Excel, images | **Not implemented.** Those come back as a hold naming the format — `UNREADABLE`, "that is a scan, and a scan needs OCR". Inventing text from a scan is how an ERP ends up with a quantity nobody typed. |
| The body written to your system | **Prepared, never posted.** `src/lib/payload.ts` builds it (values, confidences, provenance, idempotency key) and the page prints it. This deployment holds no credentials for anything. |
| Email ingestion | **Not implemented.** In production intake is a mailbox rule, not a form. |
| A model behind the reader | **Present and deliberately unreachable from the public page.** `src/lib/engine.ts` is a real Gemini adapter with the clamping an audit trail needs, kept for the pilot. The open machine calls no model at all, because a free-tier key would put a stranger's invoices into a training corpus. |

## What happens to what you paste

Nothing. There is no database behind the endpoint and no cookie written by it — the run exists inside the
request and in the visitor's own tab. The caps are what make an open endpoint safe rather than a gate:
A run is a **batch**, because that is what a dock receives: an order, an invoice that bills less than it, a goods-received note, the same invoice forwarded again, and a newsletter. `src/lib/batch.ts` reads line items and does the arithmetic per line (an unstated line amount is derived from quantity × unit price and marked derived), reconciles purchase order ↔ invoice ↔ receipt against a **tolerance the client sets** (`tolerancePct`, `toleranceAbs`, `requirePO`, `requireReceipt`, `autoApproveUnder` — out-of-range values are clamped and the clamp is reported, never swallowed), recognises one document sent twice under two names as one document (identity is a digest of the document's own normalised text), holds a row whose stated total disagrees with its lines **on the difference rather than correcting it**, and keeps an audit trail per document. A variance holds the document that bills; the order and the receipt are not stamped with someone else's problem, and a duplicate is excluded from the match so one obligation never becomes two.

`src/app/api/pilot/route.ts` takes at most 20 documents, 1.5 MB a file, reads 12,000 characters of each,
and calls no billable engine. The last half of that sentence is the important one: the machine cannot be
made to spend money on a stranger's curiosity.

## The corpus, and both denominators

The rules engine is measured against a **sample corpus**: 75 hand-authored documents shaped like one
distribution company's inbox (purchase orders, supplier invoices, delivery bookings, quote requests,
noise). They are **ours**; no customer data was used, and nothing on the site is presented as a client
outcome.

- **66 committed with no human, 3 held, 6 discarded as noise.**
- **88% of everything received** (66 of 75) and **96% of actionable documents** (66 of 69 — the noise that
  never needed a person is not in the second denominator).

Both figures are recomputed from the engine on every `npm run engine-check`, next to assertions that the
README's numbers are what the code produced. Quoting one denominator is how a demo gets caught out in a
single question, so neither number travels alone.

## The four examples on the page

`src/lib/samples.ts` holds them, and each one exists to demonstrate a different outcome: a purchase order
that clears, an invoice with no PO reference that is held (`MISSING_PO_REF`), a delivery booking routed to
the warehouse system rather than to finance, and a newsletter that is set aside.

Those sentences are claims about the product, so they are tested as claims: `scripts/engine-check.ts`
fails if any sample stops producing the outcome its button promises, and `scripts/verify.mjs` runs all four
through the live HTTP endpoint and checks the verdicts, the flags, the payload shapes and the refusals.

```bash
npm install
npm run check   # typecheck && build && verify (against the built server) && engine-check
npm run demo    # local server at http://localhost:3000
```

`verify.mjs` grades the shipped artifact, not the source: it boots `.next`, proves it is talking to this
build by build id, then checks the page for a price list, a gate, a numbered tour of itself and a second
disclosure — and fails on any of them.

## Tuning per prospect

Every figure a prospect reads is an env var, so a per-prospect deploy is different numbers rather than an
edited codebase. `src/lib/config.ts` holds them; `NEXT_PUBLIC_*` values are not secrets.

| Variable | Default | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_CLIENT_NAME` | `Northwind Supply Co` | Whose inbox the samples are shaped like. Masthead and page title. |
| `NEXT_PUBLIC_INTAKE_ADDRESS` | `ops@<client>.example` | Where documents arrive in production. Footer line. |
| `NEXT_PUBLIC_SYSTEMS` | `ERP=NetSuite,AP=Xero,WMS=SAP Business One,CRM=HubSpot` | **Their stack.** Naming the system someone types into is what turns a look into a meeting. |
| `NEXT_PUBLIC_TAGLINE` | `Inbound document automation` | Page title and preview card. |
| `NEXT_PUBLIC_DEMO_URL` | this deploy | The canonical URL for emails and the repo's About field. |
| `PILOT_MAX_DOCS` / `PILOT_MAX_BYTES` / `PILOT_MAX_CHARS` | `20` / `1500000` / `12000` | The cost bounds of one run. |
| `OFFLINE_DEMO` / `GEMINI_API_KEY` / `GEMINI_MODEL` | offline | Only the pilot adapter reads these. The public page never does. |

Adding a document type is one entry in `src/lib/doctypes.ts` — fields with `required` flags, destination,
manual minutes. No UI code knows about any specific type.

## Proposing it

The price never appears on screen: a number inside a product reads as a listing, a number in a proposal
reads as a quote. The ladder lives here and in the message.

| Step | Price | What they get |
| --- | --- | --- |
| Pilot | $1,500, credited against the build | 50 of their real documents through these thresholds. The rows, the accuracy number on their mix, every hold with its flag. |
| Build | $4,500–7,500 | Intake mailbox + one document type + a live write to their system of record, behind their own approval. |
| Care | $450/mo | New types, rule changes, held-queue reports, the audit trail kept honest. |

**The clause that closes it:** *"Run a dozen of your real orders and invoices through it — the ones that
give your data entry people trouble. Anything it can't verify it will refuse to write and tell you why. If
more than 2 in 20 need hand-fixing, don't pay."* It only sounds generous because the gate is real.

Five rules for the same conversation:

1. Never say "demo". The ask is *your paperwork, run now*.
2. Send `/systems` to whoever owns the ERP: payload, field definitions and idempotency key is the
   exchange that turns "nice tool" into "scoped project".
3. Lead with what gets **held**. The £18,420 invoice with no PO reference is why a finance manager trusts
   the other 66.
4. State both denominators, unprompted.
5. One ask, easy out. No discount, no second email, no "just checking in".

## Status

One page, one endpoint, one deeper page. Rules engine + gates + payload builder, measured against a
75-document sample corpus. No account system, no storage, no inbox connector, no published package, no
deployed client. The tests are `scripts/verify.mjs` and `scripts/engine-check.ts`; there is nothing else,
which is the point.
