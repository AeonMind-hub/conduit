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

`conduit-demo-version.vercel.app` is a working **demo over a synthetic corpus**: 75
hand-authored documents (purchase orders, supplier invoices, delivery bookings, quote
requests and noise) built to show the shape of the pipeline end to end. It is **not a
client deployment**, no live business data was used, and the numbers below are counts
from that corpus, not results from someone's production inbox.

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
| `NEXT_PUBLIC_CLIENT_NAME` | `Northwind Supply Co` | The company the demo pretends to be. Appears in the rail, page titles and the acknowledgement letters. |
| `NEXT_PUBLIC_CLIENT_INDUSTRY` | `distribution` | Context line. |
| `NEXT_PUBLIC_DAILY_VOLUME` | `60` | Their documents per day. The ROI projection is meaningless if this is not theirs. |
| `NEXT_PUBLIC_HOURLY_COST` | `34` | Loaded hourly cost of the person doing it today. |
| `NEXT_PUBLIC_BUILD_FEE` | `450` | Your pilot price. |
| `NEXT_PUBLIC_MONTHLY_FEE` | `120` | Your keeping-it-running price. |
| `NEXT_PUBLIC_DEMO_URL` | this deploy | Canonical URL — the one you put in emails and in the repo's About field. |
| `NEXT_PUBLIC_MAX_LIVE_DOCS` | `4` | How many pasted documents a visitor keeps (cookie-sized, so this must stay small). |
| `OFFLINE_DEMO` / `GEMINI_API_KEY` / `GEMINI_MODEL` | offline | Engine mode. |

Adding a document type is one entry in `src/lib/doctypes.ts` — fields with `required` flags,
destination, manual minutes, risk line. No UI code knows about any specific type.

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
