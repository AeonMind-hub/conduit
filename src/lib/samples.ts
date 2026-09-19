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
  expect: { type: string; outcome: "committed" | "held" | "discarded"; flag?: string };
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
