/*
  Four documents a visitor can run in one click, chosen so that each of the four possible outcomes is
  demonstrated by something on the first screen: a clean row, a row stopped by a missing reference, a
  scheduling note that belongs to the warehouse, and a document that is not paperwork at all.

  These are ours, not a client's, and the page says so. `scripts/engine-check.ts` asserts that each one
  still produces the outcome the button promises — a sample that stops behaving is worse than no sample,
  because it is the one thing a visitor is guaranteed to try.
*/

export interface Sample {
  key: string;
  /** The text on the chip. */
  label: string;
  /** What the page promises will happen. Asserted against the real engine output. */
  promise: string;
  expect: { type: string; outcome: "committed" | "held" | "approval" | "discarded"; flag?: string };
  body: string;
}

export const SAMPLES: Sample[] = [
  {
    key: "po",
    label: "a purchase order",
    promise: "clears every gate and comes back a row",
    expect: { type: "purchase_order", outcome: "committed" },
    body: [
      "NORTHGATE INDUSTRIAL SUPPLIES LTD",
      "PURCHASE ORDER 88241",
      "Date: 14 Sep 2026",
      "Supplier: Meridian Fasteners Ltd",
      "Deliver to: Unit 7, Greenfield Park, Coventry CV3 4LP",
      "Delivery date: 2026-09-28",
      "Line 1  SKU BS-1140  Hex bolt M10x40 zinc",
      "Quantity: 4,000   Unit price: £0.18",
      "Contact: R Adeyemi, orders@northgate.example",
      "Total: £720.00",
      "Payment terms: 30 days net",
    ].join("\n"),
  },
  {
    key: "invoice-no-po",
    label: "an invoice with no PO reference",
    promise: "is held, because the three-way match has nothing to match",
    expect: { type: "supplier_invoice", outcome: "held", flag: "MISSING_PO_REF" },
    body: [
      "MERIDIAN FASTENERS LTD",
      "SUPPLIER INVOICE",
      "Invoice No: MF-9930",
      "Invoice date: 2026-09-03",
      "Bill to: Northwind Supply Co, PO Box 14, Leeds LS1 4AP",
      "Description: Fasteners, Q3 production run",
      "Amount due: £18,420.00",
      "Payment terms: 30 days net",
      "Due date: 2026-10-03",
    ].join("\n"),
  },
  {
    key: "booking",
    label: "a delivery booking",
    promise: "goes to the warehouse, not to finance",
    expect: { type: "delivery_booking", outcome: "committed" },
    body: [
      "COLLECTION NOTE — Meridian Fasteners to Northwind DC2",
      "Carrier: XPO Logistics",
      "Collection date: 2026-09-28",
      "Delivery window: 08:00-12:00",
      "Pallets: 18",
      "Site: Coventry DC2, Dock 4",
      "Driver: J Okonkwo",
      "Vehicle: AB12 CDE",
      "Booking reference: BK-77410",
    ].join("\n"),
  },
  {
    key: "newsletter",
    label: "a newsletter",
    promise: "is set aside — there is nothing to book, and it says so",
    expect: { type: "unclassified", outcome: "discarded", flag: "NO_TRANSACTIONAL_CONTENT" },
    body: [
      "The Weekly Freight Digest",
      "",
      "You are receiving this because you subscribed. Unsubscribe here.",
      "This week: twelve takes on container rates, a hiring column, and our",
      "predictably pessimistic outlook for Q4 lane capacity.",
    ].join("\n"),
  },
];

export const sampleByKey = (key: string) => SAMPLES.find(s => s.key === key);

/* ── one click, one day of paperwork ───────────────────────────────────────────────────────────────
   A batch, not a sample: an order, an invoice that bills less than it, a goods-received note that says the
   full quantity walked through the dock, the same invoice a second time under another filename, a booking
   the warehouse needs, and a newsletter. Those six produce every outcome the product has, and they only
   mean anything together — the 5% shortfall is invisible in any one of them alone, which is exactly why a
   reader who has only ever seen single-document extraction has never seen this.

   Bodies are reused from the single samples above on purpose: the chip and the batch cannot then drift
   apart and disagree about what a document says. `scripts/engine-check.ts` asserts each caption, the group
   verdict, and that a wider tolerance moves the row.
   ───────────────────────────────────────────────────────────────────────────────────────────────── */

/** The bill for 3,800 against an order for 4,000. Read on its own it is a perfect document — its arithmetic
 *  agrees, every field is labelled, the confidence is high. It is wrong only against the order. */
const INVOICE_SHORT = [
  "MERIDIAN FASTENERS LTD",
  "SUPPLIER INVOICE",
  "Invoice No: MF-9930",
  "PO Number: 88241",
  "Invoice date: 2026-09-03",
  "Line 1  SKU BS-1140  Hex bolt M10x40 zinc",
  "Quantity: 3,800   Unit price: £0.18   Line total: £684.00",
  "Amount due: £684.00",
  "Payment terms: 30 days net",
  "Due date: 2026-10-03",
].join("\n");

/** What the dock counted. This is the document that turns "the invoice is wrong" into "the invoice is wrong
 *  and here is what actually arrived", and it is the reason a receipt is worth reading at all. */
const RECEIPT = [
  "GOODS RECEIVED NOTE GRN-4410",
  "Received into store at Dock 4",
  "PO reference: 88241",
  "SKU BS-1140",
  "Quantity received: 4,000 units",
  "Received on: 2026-09-28",
  "Carrier: XPO Logistics",
  "Site: Northwind DC2",
].join("\n");

const one = (key: string) => SAMPLES.find(s => s.key === key)!;

export const BATCH: Sample[] = [
  { ...one("po"), key: "po", label: "the order", promise: "reads clean and books",
    expect: { type: "purchase_order", outcome: "committed" } },
  { key: "invoice", label: "the invoice that bills less",
    promise: "is held on the 5% variance against that order",
    expect: { type: "supplier_invoice", outcome: "held", flag: "MATCH_VARIANCE" }, body: INVOICE_SHORT },
  { key: "grn", label: "what the dock received",
    promise: "agrees with the order, and is the proof the bill is short",
    expect: { type: "goods_receipt", outcome: "committed" }, body: RECEIPT },
  { key: "invoice-dup", label: "the same invoice, forwarded twice",
    promise: "is recognised as a duplicate, not a second bill",
    expect: { type: "supplier_invoice", outcome: "held", flag: "DUPLICATE_DOCUMENT" }, body: INVOICE_SHORT },
  { ...one("booking"), key: "booking", label: "the delivery booking",
    promise: "goes to the warehouse, not to finance" },
  { ...one("newsletter"), key: "newsletter", label: "the newsletter",
    promise: "is set aside — there is nothing to book" },
];

export const batchByKey = (key: string) => BATCH.find(s => s.key === key);
