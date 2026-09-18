/** A valid one-page PDF with a real text layer, built here rather than committed as a binary, so the
 *  fixture and the assertion that reads it can be reviewed together. Used by verify.mjs to put a
 *  document through the pilot room the way a prospect's would arrive: as a file, from a browser.
 */
const esc = (s) => s.replace(/([\\()])/g, "\\$1");

export function mkPdf(lines) {
  const ops = lines.length
    ? `BT /F1 11 Tf 40 740 Td 14 TL ${lines.map((l) => `(${esc(l)}) Tj T*`).join(" ")} ET`
    : // no text operators at all — this is what a scan looks like to everything that is not OCR
      "0.9 0.9 0.9 rg 40 640 500 100 re f";
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${ops.length} >>\nstream\n${ops}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const off = [];
  objs.forEach((o, i) => { off.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` +
    off.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("") +
    `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, "binary");
}

export const PO_LINES = [
  "NORTHGATE INDUSTRIAL SUPPLIES LTD",
  "PURCHASE ORDER 88241",
  "Date: 14 Sep 2026",
  "Supplier: Meridian Fasteners Ltd",
  "Ship to: Unit 7, Greenfield Park, Coventry CV3 4LP",
  "Delivery date: 2026-09-28",
  "PO88241-1  BS-1140  Hex bolt M10x40 zinc   Qty 4,000  Unit 0.18 GBP",
  "Contact: R Adeyemi · orders@northgate.example",
  "Subtotal: 720.00 GBP",
  "VAT 20%: 176.00 GBP",
  "Total due: 1,056.00 GBP",
  "Payment terms: 30 days net",
];

/** Two line items on one sheet: nothing here is wrong, and nothing can be written as one row.
 *  This is the document that separates a gated pipeline from a script that extracts and posts. */
export const PO_TWO_LINE_LINES = [
  "NORTHGATE INDUSTRIAL SUPPLIES LTD",
  "PURCHASE ORDER 88242",
  "Date: 14 Sep 2026",
  "Supplier: Meridian Fasteners Ltd",
  "Ship to: Unit 7, Greenfield Park, Coventry CV3 4LP",
  "Delivery date: 2026-09-30",
  "PO88242-1  BS-1140      Hex bolt M10x40 zinc   Qty 4,000   Unit 0.18 GBP",
  "PO88242-2  WS-0225-BLK  Washer M10 plain       Qty 8,000   Unit 0.02 GBP",
  "Total due: 876.00 GBP",
  "Payment terms: 30 days net",
];

export const INVOICE_GOOD = [
  "MERIDIAN FASTENERS LTD",
  "Invoice number: AC-55201",
  "Invoice date: 2026-09-12",
  "Supplier: Meridian Fasteners Ltd",
  "Bill to: Northwind Supply Co",
  "Against PO 88241",
  "Subtotal 880.00 GBP",
  "Amount due: 1,056.00 GBP",
  "Payment terms: 30 days net",
  "Due date: 2026-10-12",
];

/** An invoice naming no purchase order at all — the $18,420 story. */
export const INVOICE_NO_PO_REF = [
  "MERIDIAN FASTENERS LTD",
  "Invoice number MF-9930",
  "Invoice date: 2026-09-03",
  "Bill to: Northwind Supply Co",
  "Amount due: 18,420.00 GBP",
  "Payment terms: 30 days net",
];

/** Same page as PO_LINES, nothing readable on it. */
export const BLANK_PDF_LINES = [];
