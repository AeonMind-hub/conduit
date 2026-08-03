# Conduit — document intake automation

Classifies inbound business documents, extracts the fields each type needs,
validates them, and routes each one to the right destination system.
Anything it cannot verify is held for a human instead of guessed.

**Live demo:** _(add your Vercel URL here)_

---

## What it does

Northwind Supply Co, a distributor. One operations inbox receives purchase
orders, supplier invoices, delivery bookings, quote requests — and noise.
Today one person opens every message and decides where it goes.

| Type | Routed to | Manual time |
|---|---|---|
| Purchase order | ERP — Orders | 5 min |
| Supplier invoice | Accounting — AP | 6 min |
| Delivery booking | WMS — Dock schedule | 4 min |
| Quote request | CRM — Opportunities | 4 min |
| Noise | discarded | — |

Across 75 documents: **66 committed with no human (96% first pass), 3 held,
6 discarded, 166 downstream actions logged.**

## The design decision that matters

The system does not try to be right every time. It tries to know when it
might be wrong.

- Required field below **85%** confidence → held, not written
- Document type below **80%** confidence → escalated, not routed

Two examples in the corpus:

- **An $18,420 invoice with no PO reference.** Cannot be three-way matched.
  Posting it is how duplicate and fraudulent invoices get paid. Flag:
  `MISSING_PO_REF`.
- **A message that asks for pricing *and* signals intent to raise a purchase
  order.** Classified as a quote request at 61% — below threshold. Routing to
  the CRM alone loses the order; routing to the ERP invents one that does not
  exist. So it escalates rather than choosing. Flag: `AMBIGUOUS_TYPE`.

Every committed record keeps a full audit trail: what was written, what was
emailed on the operator's behalf, field-level confidence at commit time, and
whether a human touched it.

## Run locally

```bash
npm install
npm run demo     # offline fixtures, no API key required
```

http://localhost:3000 → **Run pipeline**

`npm run dev` uses the live Gemini API instead and needs `GEMINI_API_KEY`
in `.env.local`.

## Stack

Next.js 15 · React 19 · TypeScript · Tailwind · Google Gemini structured output

## Tuning for a prospect

| Where | Constant | Purpose |
|---|---|---|
| `src/app/analytics/page.tsx` | `DAILY_VOLUME` | documents/day |
| | `HOURLY` | loaded hourly cost |
| | `BUILD_FEE`, `MONTHLY_FEE` | your pricing |
| `src/lib/types.ts` | `THRESHOLD` | field confidence floor (0.85) |
| | `CLASSIFY_THRESHOLD` | doc-type floor (0.80) |

Adding a document type is one entry in `src/lib/doctypes.ts` — fields with
`required` flags, destination, manual minutes, risk line. No UI code knows
about any specific type.
