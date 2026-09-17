import type { Action } from "./types";
import { CLIENT_NAME } from "./config";

/** What the system did on the operator's behalf, per document type. */
export function buildActions(
  type: string, ref: string, c: Record<string, string>, dest: string
): Action[] {
  switch (type) {
    case "purchase_order":
      return [
        { kind: "write", target: dest, summary: `Sales order ${ref} created`,
          detail: `${c.quantity} × ${c.sku} for ${c.customer}, required ${c.required_by}. Line value $${(Number(c.quantity||0)*Number(c.unit_price||0)).toLocaleString(undefined,{minimumFractionDigits:2})}.` },
        { kind: "email", target: c.contact || c.customer,
          summary: "Order acknowledgement sent",
          detail: `Subject: Order confirmed — ${ref}\n\nThank you for PO ${c.po_number}. We have logged ${c.quantity} units of ${c.sku} for delivery by ${c.required_by} to ${c.ship_to || "your nominated address"}.\n\nA dispatch note will follow once the order is picked.\n\n${CLIENT_NAME}` },
        { kind: "notify", target: "Warehouse — pick queue",
          summary: `Stock reserved for ${c.sku}` },
      ];
    case "supplier_invoice":
      return [
        { kind: "write", target: dest, summary: `Invoice ${c.invoice_no} posted as ${ref}`,
          detail: `Vendor ${c.vendor}, $${c.amount} against PO ${c.po_ref}. Terms ${c.terms || "as agreed"}, due ${c.due_date || "on receipt"}.` },
        { kind: "notify", target: "AP — three-way match",
          summary: `Matched to PO ${c.po_ref}`,
          detail: `Invoice, purchase order and goods receipt reconciled. Queued for the next payment run.` },
      ];
    case "delivery_booking":
      return [
        { kind: "write", target: dest, summary: `Dock slot ${c.dock_time} on ${c.dock_date}`,
          detail: `${c.carrier}, ${c.pallets} pallets inbound at ${c.site}. Reference ${c.ref || ref}.` },
        { kind: "email", target: c.carrier, summary: "Booking confirmation sent",
          detail: `Subject: Dock slot confirmed — ${c.dock_date} ${c.dock_time}\n\nYour delivery of ${c.pallets} pallets is booked into ${c.site} on ${c.dock_date}, window ${c.dock_time}.\n\nPlease report to the gatehouse with reference ${c.ref || ref}. Late arrivals may be re-slotted.\n\n${CLIENT_NAME}` },
      ];
    case "quote_request":
      return [
        { kind: "write", target: dest, summary: `Opportunity ${ref} created`,
          detail: `${c.company} — ${c.volume} × ${c.product} to ${c.delivery_to}, needed ${c.needed_by}.` },
        { kind: "email", target: c.email || c.company, summary: "Acknowledgement sent",
          detail: `Subject: Your enquiry — ${ref}\n\nThanks for your enquiry about ${c.volume} units of ${c.product}.\n\nWe are preparing pricing for delivery to ${c.delivery_to} by ${c.needed_by} and will come back to you within one working day.\n\n${CLIENT_NAME}` },
        { kind: "notify", target: "Sales — pricing desk", summary: "Assigned for pricing" },
      ];
    default: return [];
  }
}
