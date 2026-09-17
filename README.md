# Conduit — document intake automation

Classifies inbound business documents, extracts the fields each type needs,
validates them, and routes each one to the right destination system.
Anything it cannot verify is **held for a human instead of guessed**.

**Live demo:** <https://conduit-demo-version.vercel.app>
**Repo for the demo:** this repository. If you are reading this after a message from me,
the demo already has your company name and your volume in it — change nothing, press
**Run pipeline** and then open **Analytics**.

---

## What this is

A working deployment of the product, running on a **sample corpus**: 75 hand-authored documents
(purchase orders, supplier invoices, delivery bookings, quote requests and noise) shaped like one
distribution company's inbox. The rail says "Sample corpus · 75 documents" and that is the whole
disclosure — it is the same convention every enterprise demo uses, and it is why the numbers below
are labelled with their denominators instead of hidden behind a hedge.

No customer data was used, and nothing here claims a client outcome. What is on offer is the
mechanism, shown at the volume and against the systems a prospect names.

## What is real vs. simulated

| Part | Status in this repo |
| --- | --- |
| Classification + extraction | **Real model call** when `GEMINI_API_KEY` is set and `OFFLINE_DEMO` is unset. The prompt, JSON schema, per-field confidence and clamping live in `src/lib/engine.ts`. |
| Thresholds, holds, corrections, audit trail, routing actions | **Real code.** `src/lib/types.ts` (`blocks`, `failedRules`, `rates`), `src/lib/session.ts`. |
| The 75 documents and their expected extractions | **Authored fixtures** in `src/lib/corpus.ts`, so the offline demo costs nothing and behaves identically for two people at once. |
| Writes to an ERP / accounting / WMS / CRM | **Not implemented.** `src/lib/actions.ts` records what *would* be written, in the shape a real integration needs. A pilot adds the connectors against one client's system. |
| Email inbox ingestion | **Not implemented.** Documents arrive by paste (`Run this one`) or, in a pilot, by a mailbox rule. |

If `OFFLINE_DEMO=1` (the default, and what the public deploy runs), there is no key on a
public URL for strangers to spend. In that mode anything you paste is **held with
`ENGINE_UNAVAILABLE` rather than committed** — the product's own safety rule applied to
its own failure modes. Run it live to see extraction: set `GEMINI_API_KEY` and clear
`OFFLINE_DEMO`.

## The numbers, stated with their denominators

Across the 75-document corpus:

- **66 committed with no human, 3 held, 6 discarded as noise.**
- **88% of everything received** (66 of 75) and **96% of actionable documents**
  (66 of 69, excluding the noise that never needed a person).

Both figures are computed in one place (`rates()` in `src/lib/types.ts`) and the UI prints
both. A single headline percentage is how a demo gets caught out in one question.

Field accuracy is only quoted after the held queue is cleared, and the analytics tab says
"run the pipeline to measure" instead of showing a zero.

## Run it

```bash
npm install
npm run demo     # offline fixtures, no API key, no cost
# http://localhost:3000  → press "Run pipeline", then "Run this one" on any real document
```

Live model calls:

```bash
cp .env.local.example .env.local   # put your GEMINI_API_KEY in, set OFFLINE_DEMO=
npm run dev
```

Check the shipped build instead of trusting this README:

```bash
npm run typecheck && npm run build && npm run verify
```

`npm run verify` boots the built app and asserts that a cold visitor lands on a **finished**
run (66 committed, both denominators present), that the empty state never renders "$0 a
year", and that the visitor cookie stays inside the 4KB-per-domain limit.

## Tuning for a prospect

Every figure a prospect reads is an env var, so a per-prospect demo is a **deploy with
different numbers, not an edited codebase**:

| Variable | Default | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_CLIENT_NAME` | `Northwind Supply Co` | The company whose inbox this is. Appears in the rail, the page title and the acknowledgement letters. |
| `NEXT_PUBLIC_CLIENT_INDUSTRY` | `distribution` | Context line. |
| `NEXT_PUBLIC_INTAKE_ADDRESS` | `ops@<client>.com` | The mailbox their documents arrive in. Shown in the rail and on Connections. |
| `NEXT_PUBLIC_SYSTEMS` | `ERP=NetSuite,AP=Xero,WMS=SAP Business One,CRM=HubSpot` | **Their actual stack.** Naming the system they type into is what turns a look into a meeting. |
| `NEXT_PUBLIC_ENV_LABEL` | `Sandbox` | Environment chip on the integrations screen. |
| `NEXT_PUBLIC_TAGLINE` | `Inbound document automation` | Page title and social preview card. |
| `NEXT_PUBLIC_CORPUS_LABEL` | `Sample corpus · 75 documents` | The one disclosure the product makes, in the rail. Keep it — and keep it that short. |
| `NEXT_PUBLIC_DAILY_VOLUME` | `60` | Their documents per day. The ROI projection is meaningless if this is not theirs. |
| `NEXT_PUBLIC_HOURLY_COST` | `34` | Loaded hourly cost of the person doing it today. |
| `NEXT_PUBLIC_BUILD_FEE` / `NEXT_PUBLIC_MONTHLY_FEE` | `450` / `120` | Kept for the proposal maths. **Not rendered in the app** — a price inside a product reads as a marketplace listing; a price in a proposal reads as a quote. |
| `NEXT_PUBLIC_DEMO_URL` | this deploy | Canonical URL — the one you put in emails and in the repo's About field. |
| `NEXT_PUBLIC_MAX_LIVE_DOCS` | `4` | How many pasted documents a visitor keeps (cookie-sized, so this must stay small). |
| `OFFLINE_DEMO` / `GEMINI_API_KEY` / `GEMINI_MODEL` | offline | Engine mode. |

Adding a document type is one entry in `src/lib/doctypes.ts` — fields with `required` flags,
destination, manual minutes, risk line. No UI code knows about any specific type.

## Proposing it

The demo's job is to make a five-figure build look like the obvious next step, not to look
like a cheap thing to try. So the pricing never appears on screen, and the offer is one breath:

> Emails with attachments arrive → Conduit classifies them, extracts the fields each type needs,
> validates them, and writes clean rows into your ERP, accounting and WMS. Anything it cannot
> verify goes to a human queue instead of being guessed.

**The ladder**

| Step | Price | What they get |
| --- | --- | --- |
| Pilot | $1,500, credited against the build | 50 of their real documents through the same thresholds. The rows, the accuracy number on their mix, every hold with its flag. |
| Build | $4,500–7,500 | Intake mailbox + one document type + a live write to their system of record, behind their own approval. |
| Care | $450/mo | New types, rule changes, held-queue reports, the audit trail kept honest. |

**The clause that closes it:** *"If more than 2 documents in 20 need hand-fixing, don't pay."* It
only sounds generous because the gate is real: 85% confidence on a required field, 80% on document
type, a missing value never written at full confidence.

**Five presentation rules**

1. Never say "demo" out loud; say *"your inbox, one document, right now"* and paste their PO.
2. Send the **Connections** screen to whoever owns the ERP. Payload + field map + idempotency key
   is the conversation that turns "nice tool" into "scoped project".
3. Lead with what gets **held**, not what gets committed. The $18,420 invoice with no PO reference
   is the reason a finance manager trusts the other 66.
4. State both denominators, unprompted. It kills the one question that would otherwise end the call.
5. End on a single ask with an easy out — the 50 documents. No discount, no second email, no
   "just checking in".

## Recording it (silent screen capture needs captions)

Press `.` to toggle the caption bar, `.`/`,` to step, `C` to hide it for the take. The
captions exist because the most important moment in this demo — a field deliberately left
empty and held — otherwise looks like a blank box on a muted video.

## Held queue

Three documents are held on purpose:

- **An $18,420 invoice with no PO reference.** It cannot be three-way matched. Posting it is
  how duplicate and fraudulent invoices get paid. Flag: `MISSING_PO_REF`.
- **A message asking for pricing that also signals a purchase order is coming.** Classified
  as a quote request at 61% — below the routing threshold. Sending it to the CRM loses the
  order; sending it to the ERP invents one. So it escalates. Flag: `AMBIGUOUS_TYPE`.
- Plus whatever you paste that the model is not sure about.

## Status

Working demo, one corpus, two document sources (fixture + live paste). Not published as a
package, no tests beyond `scripts/verify.mjs`, no inbox connector, no deployed client.
