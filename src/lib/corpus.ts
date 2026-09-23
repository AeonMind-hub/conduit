import type { Doc, Fixture } from "./types";

/** Northwind Supply Co — one ops inbox, mixed document types. */
export const DOCS: Doc[] = [
  { id: 1, type: "purchase_order", from: "procurement@harlowretail.com",
    subject: "PO 88213 \u2014 Northwind Supply", receivedAt: "2026-08-03T07:11:00",
    body: `Please confirm receipt of the following order.

PO Number: 88213
SKU: NW-4420-BLK
Description: Industrial shelving bracket, black
Quantity: 480 units
Unit price: $12.40
Required by: 08/14/2026
Ship to: Harlow Retail DC, 1200 Kingsway, Columbus OH 43219
Contact: Rita Alvarez, procurement@harlowretail.com

Harlow Retail Group` },
  { id: 2, type: "supplier_invoice", from: "billing@apexcomponents.com",
    subject: "July statement", receivedAt: "2026-08-03T07:22:00",
    body: `Hi,

Attaching our invoice for the July production run. Total comes to
$18,420.00. Invoice number 2026-0731-A, dated end of July.

Usual terms. Let me know if you need anything else.

Ravi Menon
Apex Components` },
  { id: 3, type: "delivery_booking", from: "dispatch@ridgewayhaulage.co.uk",
    subject: "RE: inbound Thursday", receivedAt: "2026-08-03T07:33:00",
    body: `Confirming we'll be with you Thursday with the 22 pallets.
Driver reckons he'll be there some time in the morning, depends on the
M6. Vehicle RG21 KLM.

Our ref RW-99120. Site is the Midlands DC as usual.

Ridgeway Haulage` },
  { id: 4, type: "quote_request", from: "k.osei@brightlinemfg.com",
    subject: "pricing + can you hold stock", receivedAt: "2026-08-03T07:44:00",
    body: `Morning,

Two things. First, what would 1,200 units of the NW-4420 run us
delivered to Leeds? Need them for the 3rd week of September.

Second, if the pricing works we'd want to raise a PO straight away
against our existing agreement — can you hold the stock in the meantime?

Kwame Osei
Brightline Manufacturing` },
  { id: 5, type: "unclassified", from: "newsletter@logisticsweekly.com",
    subject: "This week in supply chain: 5 things to watch", receivedAt: "2026-08-03T07:55:00",
    body: `Your Monday briefing.

- Diesel prices ease for a third week
- Port congestion at Felixstowe improving
- New HGV licensing rules take effect in October

Read the full briefing online. Unsubscribe at any time.` },
  { id: 6, type: "purchase_order", from: "procurement@harlow.com",
    subject: "PO 88220 \u2014 Northwind Supply", receivedAt: "2026-08-03T07:06:00",
    body: `Order confirmation below.

PO Number: 88220
SKU: NW-4000-GRY
Quantity: 600 units
Unit price: $36.13
Required by: 08/10/2026
Ship to: Harlow Retail Group DC, Leeds

Harlow Retail Group` },
  { id: 7, type: "purchase_order", from: "procurement@peakline.com",
    subject: "PO 88227 \u2014 Northwind Supply", receivedAt: "2026-08-03T08:17:00",
    body: `Order confirmation below.

PO Number: 88227
SKU: NW-4137-BLK
Quantity: 960 units
Unit price: $17.65
Required by: 08/11/2026
Ship to: Peakline Distribution DC, Manchester

Peakline Distribution` },
  { id: 8, type: "purchase_order", from: "procurement@castleford.com",
    subject: "PO 88234 \u2014 Northwind Supply", receivedAt: "2026-08-03T08:28:00",
    body: `Order confirmation below.

PO Number: 88234
SKU: NW-4274-GRY
Quantity: 600 units
Unit price: $20.0
Required by: 08/12/2026
Ship to: Castleford Wholesale DC, Bristol

Castleford Wholesale` },
  { id: 9, type: "purchase_order", from: "procurement@ambridge.com",
    subject: "PO 88241 \u2014 Northwind Supply", receivedAt: "2026-08-03T08:39:00",
    body: `Order confirmation below.

PO Number: 88241
SKU: NW-4411-BLK
Quantity: 120 units
Unit price: $7.81
Required by: 08/13/2026
Ship to: Ambridge Trade DC, Glasgow

Ambridge Trade` },
  { id: 10, type: "purchase_order", from: "procurement@verity.com",
    subject: "PO 88248 \u2014 Northwind Supply", receivedAt: "2026-08-03T08:50:00",
    body: `Order confirmation below.

PO Number: 88248
SKU: NW-4548-GRY
Quantity: 120 units
Unit price: $22.45
Required by: 08/14/2026
Ship to: Verity Home DC, Birmingham

Verity Home` },
  { id: 11, type: "purchase_order", from: "procurement@northgate.com",
    subject: "PO 88255 \u2014 Northwind Supply", receivedAt: "2026-08-03T08:01:00",
    body: `Order confirmation below.

PO Number: 88255
SKU: NW-4685-BLK
Quantity: 120 units
Unit price: $11.4
Required by: 08/15/2026
Ship to: Northgate Retail DC, Southampton

Northgate Retail` },
  { id: 12, type: "purchase_order", from: "procurement@summerfield.com",
    subject: "PO 88262 \u2014 Northwind Supply", receivedAt: "2026-08-03T08:12:00",
    body: `Order confirmation below.

PO Number: 88262
SKU: NW-4822-GRY
Quantity: 360 units
Unit price: $26.36
Required by: 08/16/2026
Ship to: Summerfield Group DC, Cardiff

Summerfield Group` },
  { id: 13, type: "purchase_order", from: "procurement@larkhall.com",
    subject: "PO 88269 \u2014 Northwind Supply", receivedAt: "2026-08-03T08:23:00",
    body: `Order confirmation below.

PO Number: 88269
SKU: NW-4959-BLK
Quantity: 720 units
Unit price: $38.87
Required by: 08/17/2026
Ship to: Larkhall Supplies DC, Newcastle

Larkhall Supplies` },
  { id: 14, type: "purchase_order", from: "procurement@grantham.com",
    subject: "PO 88276 \u2014 Northwind Supply", receivedAt: "2026-08-03T09:34:00",
    body: `Order confirmation below.

PO Number: 88276
SKU: NW-5096-GRY
Quantity: 240 units
Unit price: $33.31
Required by: 08/18/2026
Ship to: Grantham & Co DC, Leeds

Grantham & Co` },
  { id: 15, type: "purchase_order", from: "procurement@westbrook.com",
    subject: "PO 88283 \u2014 Northwind Supply", receivedAt: "2026-08-03T09:45:00",
    body: `Order confirmation below.

PO Number: 88283
SKU: NW-5233-BLK
Quantity: 1200 units
Unit price: $28.33
Required by: 08/19/2026
Ship to: Westbrook Trading DC, Manchester

Westbrook Trading` },
  { id: 16, type: "purchase_order", from: "procurement@faircloth.com",
    subject: "PO 88290 \u2014 Northwind Supply", receivedAt: "2026-08-03T09:56:00",
    body: `Order confirmation below.

PO Number: 88290
SKU: NW-5370-GRY
Quantity: 720 units
Unit price: $28.24
Required by: 08/20/2026
Ship to: Faircloth Retail DC, Bristol

Faircloth Retail` },
  { id: 17, type: "purchase_order", from: "procurement@duncan.com",
    subject: "PO 88297 \u2014 Northwind Supply", receivedAt: "2026-08-03T09:07:00",
    body: `Order confirmation below.

PO Number: 88297
SKU: NW-5507-BLK
Quantity: 240 units
Unit price: $7.55
Required by: 08/21/2026
Ship to: Duncan Bros DC, Glasgow

Duncan Bros` },
  { id: 18, type: "purchase_order", from: "procurement@harlow.com",
    subject: "PO 88304 \u2014 Northwind Supply", receivedAt: "2026-08-03T09:18:00",
    body: `Order confirmation below.

PO Number: 88304
SKU: NW-5644-GRY
Quantity: 600 units
Unit price: $33.54
Required by: 08/22/2026
Ship to: Harlow Retail Group DC, Birmingham

Harlow Retail Group` },
  { id: 19, type: "purchase_order", from: "procurement@peakline.com",
    subject: "PO 88311 \u2014 Northwind Supply", receivedAt: "2026-08-03T09:29:00",
    body: `Order confirmation below.

PO Number: 88311
SKU: NW-5781-BLK
Quantity: 600 units
Unit price: $23.52
Required by: 08/23/2026
Ship to: Peakline Distribution DC, Southampton

Peakline Distribution` },
  { id: 20, type: "purchase_order", from: "procurement@castleford.com",
    subject: "PO 88318 \u2014 Northwind Supply", receivedAt: "2026-08-03T09:40:00",
    body: `Order confirmation below.

PO Number: 88318
SKU: NW-5918-GRY
Quantity: 480 units
Unit price: $13.3
Required by: 08/24/2026
Ship to: Castleford Wholesale DC, Cardiff

Castleford Wholesale` },
  { id: 21, type: "purchase_order", from: "procurement@ambridge.com",
    subject: "PO 88325 \u2014 Northwind Supply", receivedAt: "2026-08-03T10:51:00",
    body: `Order confirmation below.

PO Number: 88325
SKU: NW-6055-BLK
Quantity: 1200 units
Unit price: $12.57
Required by: 08/25/2026
Ship to: Ambridge Trade DC, Newcastle

Ambridge Trade` },
  { id: 22, type: "purchase_order", from: "procurement@verity.com",
    subject: "PO 88332 \u2014 Northwind Supply", receivedAt: "2026-08-03T10:02:00",
    body: `Order confirmation below.

PO Number: 88332
SKU: NW-6192-GRY
Quantity: 240 units
Unit price: $38.04
Required by: 08/26/2026
Ship to: Verity Home DC, Leeds

Verity Home` },
  { id: 23, type: "purchase_order", from: "procurement@northgate.com",
    subject: "PO 88339 \u2014 Northwind Supply", receivedAt: "2026-08-03T10:13:00",
    body: `Order confirmation below.

PO Number: 88339
SKU: NW-6329-BLK
Quantity: 120 units
Unit price: $26.71
Required by: 08/27/2026
Ship to: Northgate Retail DC, Manchester

Northgate Retail` },
  { id: 24, type: "purchase_order", from: "procurement@summerfield.com",
    subject: "PO 88346 \u2014 Northwind Supply", receivedAt: "2026-08-03T10:24:00",
    body: `Order confirmation below.

PO Number: 88346
SKU: NW-6466-GRY
Quantity: 480 units
Unit price: $28.74
Required by: 08/10/2026
Ship to: Summerfield Group DC, Bristol

Summerfield Group` },
  { id: 25, type: "purchase_order", from: "procurement@larkhall.com",
    subject: "PO 88353 \u2014 Northwind Supply", receivedAt: "2026-08-03T10:35:00",
    body: `Order confirmation below.

PO Number: 88353
SKU: NW-6603-BLK
Quantity: 120 units
Unit price: $23.39
Required by: 08/11/2026
Ship to: Larkhall Supplies DC, Glasgow

Larkhall Supplies` },
  { id: 26, type: "purchase_order", from: "procurement@grantham.com",
    subject: "PO 88360 \u2014 Northwind Supply", receivedAt: "2026-08-03T10:46:00",
    body: `Order confirmation below.

PO Number: 88360
SKU: NW-6740-GRY
Quantity: 720 units
Unit price: $4.57
Required by: 08/12/2026
Ship to: Grantham & Co DC, Birmingham

Grantham & Co` },
  { id: 27, type: "purchase_order", from: "procurement@westbrook.com",
    subject: "PO 88367 \u2014 Northwind Supply", receivedAt: "2026-08-03T10:57:00",
    body: `Order confirmation below.

PO Number: 88367
SKU: NW-6877-BLK
Quantity: 120 units
Unit price: $6.73
Required by: 08/13/2026
Ship to: Westbrook Trading DC, Southampton

Westbrook Trading` },
  { id: 28, type: "supplier_invoice", from: "ar@apex.com",
    subject: "Invoice 51000 \u2014 Apex Components", receivedAt: "2026-08-03T11:08:00",
    body: `Invoice 51000
Date: 07/08/2026
PO reference: 88220
Amount: $22,465.65
Terms: Net 30
Due: 08/07/2026

Apex Components, Accounts Receivable` },
  { id: 29, type: "supplier_invoice", from: "ar@meridian.com",
    subject: "Invoice 51211 \u2014 Meridian Steel", receivedAt: "2026-08-03T11:19:00",
    body: `Invoice 51211
Date: 07/09/2026
PO reference: 88231
Amount: $5,888.47
Terms: Net 30
Due: 08/08/2026

Meridian Steel, Accounts Receivable` },
  { id: 30, type: "supplier_invoice", from: "ar@calder.com",
    subject: "Invoice 51422 \u2014 Calder Plastics", receivedAt: "2026-08-03T11:30:00",
    body: `Invoice 51422
Date: 07/10/2026
PO reference: 88242
Amount: $13,119.21
Terms: Net 30
Due: 08/09/2026

Calder Plastics, Accounts Receivable` },
  { id: 31, type: "supplier_invoice", from: "ar@thornton.com",
    subject: "Invoice 51633 \u2014 Thornton Packaging", receivedAt: "2026-08-03T11:41:00",
    body: `Invoice 51633
Date: 07/11/2026
PO reference: 88253
Amount: $13,458.28
Terms: Net 30
Due: 08/10/2026

Thornton Packaging, Accounts Receivable` },
  { id: 32, type: "supplier_invoice", from: "ar@rowan.com",
    subject: "Invoice 51844 \u2014 Rowan Fasteners", receivedAt: "2026-08-03T11:52:00",
    body: `Invoice 51844
Date: 07/12/2026
PO reference: 88264
Amount: $6,745.74
Terms: Net 30
Due: 08/11/2026

Rowan Fasteners, Accounts Receivable` },
  { id: 33, type: "supplier_invoice", from: "ar@bexley.com",
    subject: "Invoice 52055 \u2014 Bexley Coatings", receivedAt: "2026-08-03T11:03:00",
    body: `Invoice 52055
Date: 07/13/2026
PO reference: 88275
Amount: $21,710.10
Terms: Net 30
Due: 08/12/2026

Bexley Coatings, Accounts Receivable` },
  { id: 34, type: "supplier_invoice", from: "ar@halton.com",
    subject: "Invoice 52266 \u2014 Halton Timber", receivedAt: "2026-08-03T11:14:00",
    body: `Invoice 52266
Date: 07/14/2026
PO reference: 88286
Amount: $8,818.13
Terms: Net 30
Due: 08/13/2026

Halton Timber, Accounts Receivable` },
  { id: 35, type: "supplier_invoice", from: "ar@crane.com",
    subject: "Invoice 52477 \u2014 Crane Electricals", receivedAt: "2026-08-03T12:25:00",
    body: `Invoice 52477
Date: 07/15/2026
PO reference: 88297
Amount: $19,697.76
Terms: Net 30
Due: 08/14/2026

Crane Electricals, Accounts Receivable` },
  { id: 36, type: "supplier_invoice", from: "ar@apex.com",
    subject: "Invoice 52688 \u2014 Apex Components", receivedAt: "2026-08-03T12:36:00",
    body: `Invoice 52688
Date: 07/16/2026
PO reference: 88308
Amount: $16,786.89
Terms: Net 30
Due: 08/15/2026

Apex Components, Accounts Receivable` },
  { id: 37, type: "supplier_invoice", from: "ar@meridian.com",
    subject: "Invoice 52899 \u2014 Meridian Steel", receivedAt: "2026-08-03T12:47:00",
    body: `Invoice 52899
Date: 07/17/2026
PO reference: 88319
Amount: $16,908.83
Terms: Net 30
Due: 08/16/2026

Meridian Steel, Accounts Receivable` },
  { id: 38, type: "supplier_invoice", from: "ar@calder.com",
    subject: "Invoice 53110 \u2014 Calder Plastics", receivedAt: "2026-08-03T12:58:00",
    body: `Invoice 53110
Date: 07/18/2026
PO reference: 88330
Amount: $15,672.73
Terms: Net 30
Due: 08/17/2026

Calder Plastics, Accounts Receivable` },
  { id: 39, type: "supplier_invoice", from: "ar@thornton.com",
    subject: "Invoice 53321 \u2014 Thornton Packaging", receivedAt: "2026-08-03T12:09:00",
    body: `Invoice 53321
Date: 07/19/2026
PO reference: 88341
Amount: $7,720.35
Terms: Net 30
Due: 08/18/2026

Thornton Packaging, Accounts Receivable` },
  { id: 40, type: "supplier_invoice", from: "ar@rowan.com",
    subject: "Invoice 53532 \u2014 Rowan Fasteners", receivedAt: "2026-08-03T12:20:00",
    body: `Invoice 53532
Date: 07/20/2026
PO reference: 88352
Amount: $18,725.48
Terms: Net 30
Due: 08/19/2026

Rowan Fasteners, Accounts Receivable` },
  { id: 41, type: "supplier_invoice", from: "ar@bexley.com",
    subject: "Invoice 53743 \u2014 Bexley Coatings", receivedAt: "2026-08-03T12:31:00",
    body: `Invoice 53743
Date: 07/21/2026
PO reference: 88363
Amount: $13,603.56
Terms: Net 30
Due: 08/20/2026

Bexley Coatings, Accounts Receivable` },
  { id: 42, type: "supplier_invoice", from: "ar@halton.com",
    subject: "Invoice 53954 \u2014 Halton Timber", receivedAt: "2026-08-03T13:42:00",
    body: `Invoice 53954
Date: 07/22/2026
PO reference: 88374
Amount: $3,405.11
Terms: Net 30
Due: 08/21/2026

Halton Timber, Accounts Receivable` },
  { id: 43, type: "supplier_invoice", from: "ar@crane.com",
    subject: "Invoice 54165 \u2014 Crane Electricals", receivedAt: "2026-08-03T13:53:00",
    body: `Invoice 54165
Date: 07/23/2026
PO reference: 88385
Amount: $8,580.80
Terms: Net 30
Due: 08/22/2026

Crane Electricals, Accounts Receivable` },
  { id: 44, type: "supplier_invoice", from: "ar@apex.com",
    subject: "Invoice 54376 \u2014 Apex Components", receivedAt: "2026-08-03T13:04:00",
    body: `Invoice 54376
Date: 07/24/2026
PO reference: 88396
Amount: $20,196.57
Terms: Net 30
Due: 08/23/2026

Apex Components, Accounts Receivable` },
  { id: 45, type: "supplier_invoice", from: "ar@meridian.com",
    subject: "Invoice 54587 \u2014 Meridian Steel", receivedAt: "2026-08-03T13:15:00",
    body: `Invoice 54587
Date: 07/25/2026
PO reference: 88407
Amount: $22,880.07
Terms: Net 30
Due: 08/24/2026

Meridian Steel, Accounts Receivable` },
  { id: 46, type: "delivery_booking", from: "dispatch@ridgeway.com",
    subject: "Booking 03/08 \u2014 26 pallets", receivedAt: "2026-08-03T13:26:00",
    body: `Booking request.

Carrier: Ridgeway Haulage
Date: 08/03/2026
Window: 15:00-17:00
Pallets: 26
Site: Midlands DC
Ref: RI-90000

Ridgeway Haulage` },
  { id: 47, type: "delivery_booking", from: "dispatch@foxton.com",
    subject: "Booking 04/08 \u2014 26 pallets", receivedAt: "2026-08-03T13:37:00",
    body: `Booking request.

Carrier: Foxton Logistics
Date: 08/04/2026
Window: 13:00-15:00
Pallets: 26
Site: Northern DC
Ref: FO-90037

Foxton Logistics` },
  { id: 48, type: "delivery_booking", from: "dispatch@marlow.com",
    subject: "Booking 05/08 \u2014 33 pallets", receivedAt: "2026-08-03T13:48:00",
    body: `Booking request.

Carrier: Marlow Transport
Date: 08/05/2026
Window: 11:00-13:00
Pallets: 33
Site: Southern DC
Ref: MA-90074

Marlow Transport` },
  { id: 49, type: "delivery_booking", from: "dispatch@bsl.com",
    subject: "Booking 06/08 \u2014 22 pallets", receivedAt: "2026-08-03T14:59:00",
    body: `Booking request.

Carrier: BSL Freight
Date: 08/06/2026
Window: 07:00-09:00
Pallets: 22
Site: Midlands DC
Ref: BS-90111

BSL Freight` },
  { id: 50, type: "delivery_booking", from: "dispatch@kestrel.com",
    subject: "Booking 07/08 \u2014 12 pallets", receivedAt: "2026-08-03T14:10:00",
    body: `Booking request.

Carrier: Kestrel Distribution
Date: 08/07/2026
Window: 13:00-15:00
Pallets: 12
Site: Northern DC
Ref: KE-90148

Kestrel Distribution` },
  { id: 51, type: "delivery_booking", from: "dispatch@pennine.com",
    subject: "Booking 08/08 \u2014 33 pallets", receivedAt: "2026-08-03T14:21:00",
    body: `Booking request.

Carrier: Pennine Haulage
Date: 08/08/2026
Window: 07:00-09:00
Pallets: 33
Site: Southern DC
Ref: PE-90185

Pennine Haulage` },
  { id: 52, type: "delivery_booking", from: "dispatch@ridgeway.com",
    subject: "Booking 09/08 \u2014 22 pallets", receivedAt: "2026-08-03T14:32:00",
    body: `Booking request.

Carrier: Ridgeway Haulage
Date: 08/09/2026
Window: 13:00-15:00
Pallets: 22
Site: Midlands DC
Ref: RI-90222

Ridgeway Haulage` },
  { id: 53, type: "delivery_booking", from: "dispatch@foxton.com",
    subject: "Booking 10/08 \u2014 22 pallets", receivedAt: "2026-08-03T14:43:00",
    body: `Booking request.

Carrier: Foxton Logistics
Date: 08/10/2026
Window: 11:00-13:00
Pallets: 22
Site: Northern DC
Ref: FO-90259

Foxton Logistics` },
  { id: 54, type: "delivery_booking", from: "dispatch@marlow.com",
    subject: "Booking 11/08 \u2014 33 pallets", receivedAt: "2026-08-03T14:54:00",
    body: `Booking request.

Carrier: Marlow Transport
Date: 08/11/2026
Window: 15:00-17:00
Pallets: 33
Site: Southern DC
Ref: MA-90296

Marlow Transport` },
  { id: 55, type: "delivery_booking", from: "dispatch@bsl.com",
    subject: "Booking 12/08 \u2014 12 pallets", receivedAt: "2026-08-03T14:05:00",
    body: `Booking request.

Carrier: BSL Freight
Date: 08/12/2026
Window: 15:00-17:00
Pallets: 12
Site: Midlands DC
Ref: BS-90333

BSL Freight` },
  { id: 56, type: "delivery_booking", from: "dispatch@kestrel.com",
    subject: "Booking 13/08 \u2014 18 pallets", receivedAt: "2026-08-03T15:16:00",
    body: `Booking request.

Carrier: Kestrel Distribution
Date: 08/13/2026
Window: 07:00-09:00
Pallets: 18
Site: Northern DC
Ref: KE-90370

Kestrel Distribution` },
  { id: 57, type: "delivery_booking", from: "dispatch@pennine.com",
    subject: "Booking 14/08 \u2014 6 pallets", receivedAt: "2026-08-03T15:27:00",
    body: `Booking request.

Carrier: Pennine Haulage
Date: 08/14/2026
Window: 13:00-15:00
Pallets: 6
Site: Southern DC
Ref: PE-90407

Pennine Haulage` },
  { id: 58, type: "delivery_booking", from: "dispatch@ridgeway.com",
    subject: "Booking 15/08 \u2014 6 pallets", receivedAt: "2026-08-03T15:38:00",
    body: `Booking request.

Carrier: Ridgeway Haulage
Date: 08/15/2026
Window: 13:00-15:00
Pallets: 6
Site: Midlands DC
Ref: RI-90444

Ridgeway Haulage` },
  { id: 59, type: "delivery_booking", from: "dispatch@foxton.com",
    subject: "Booking 16/08 \u2014 18 pallets", receivedAt: "2026-08-03T15:49:00",
    body: `Booking request.

Carrier: Foxton Logistics
Date: 08/16/2026
Window: 11:00-13:00
Pallets: 18
Site: Northern DC
Ref: FO-90481

Foxton Logistics` },
  { id: 60, type: "quote_request", from: "buying@harlow.com",
    subject: "RFQ \u2014 NW-4420 x800", receivedAt: "2026-08-03T15:00:00",
    body: `Requesting a quote.

Product: NW-4420
Volume: 800 units
Deliver to: Leeds
Needed by: 09/05/2026

Harlow Retail Group` },
  { id: 61, type: "quote_request", from: "buying@ambridge.com",
    subject: "RFQ \u2014 NW-1180 x800", receivedAt: "2026-08-03T15:11:00",
    body: `Requesting a quote.

Product: NW-1180
Volume: 800 units
Deliver to: Manchester
Needed by: 09/06/2026

Ambridge Trade` },
  { id: 62, type: "quote_request", from: "buying@summerfield.com",
    subject: "RFQ \u2014 NW-7702 x200", receivedAt: "2026-08-03T15:22:00",
    body: `Requesting a quote.

Product: NW-7702
Volume: 200 units
Deliver to: Bristol
Needed by: 09/07/2026

Summerfield Group` },
  { id: 63, type: "quote_request", from: "buying@westbrook.com",
    subject: "RFQ \u2014 NW-3390 x2400", receivedAt: "2026-08-03T16:33:00",
    body: `Requesting a quote.

Product: NW-3390
Volume: 2400 units
Deliver to: Glasgow
Needed by: 09/08/2026

Westbrook Trading` },
  { id: 64, type: "quote_request", from: "buying@harlow.com",
    subject: "RFQ \u2014 NW-6015 x1600", receivedAt: "2026-08-03T16:44:00",
    body: `Requesting a quote.

Product: NW-6015
Volume: 1600 units
Deliver to: Birmingham
Needed by: 09/09/2026

Harlow Retail Group` },
  { id: 65, type: "quote_request", from: "buying@ambridge.com",
    subject: "RFQ \u2014 NW-2245 x1600", receivedAt: "2026-08-03T16:55:00",
    body: `Requesting a quote.

Product: NW-2245
Volume: 1600 units
Deliver to: Southampton
Needed by: 09/10/2026

Ambridge Trade` },
  { id: 66, type: "quote_request", from: "buying@summerfield.com",
    subject: "RFQ \u2014 NW-4420 x200", receivedAt: "2026-08-03T16:06:00",
    body: `Requesting a quote.

Product: NW-4420
Volume: 200 units
Deliver to: Cardiff
Needed by: 09/11/2026

Summerfield Group` },
  { id: 67, type: "quote_request", from: "buying@westbrook.com",
    subject: "RFQ \u2014 NW-1180 x800", receivedAt: "2026-08-03T16:17:00",
    body: `Requesting a quote.

Product: NW-1180
Volume: 800 units
Deliver to: Newcastle
Needed by: 09/12/2026

Westbrook Trading` },
  { id: 68, type: "quote_request", from: "buying@harlow.com",
    subject: "RFQ \u2014 NW-7702 x450", receivedAt: "2026-08-03T16:28:00",
    body: `Requesting a quote.

Product: NW-7702
Volume: 450 units
Deliver to: Leeds
Needed by: 09/13/2026

Harlow Retail Group` },
  { id: 69, type: "quote_request", from: "buying@ambridge.com",
    subject: "RFQ \u2014 NW-3390 x200", receivedAt: "2026-08-03T16:39:00",
    body: `Requesting a quote.

Product: NW-3390
Volume: 200 units
Deliver to: Manchester
Needed by: 09/14/2026

Ambridge Trade` },
  { id: 70, type: "quote_request", from: "buying@summerfield.com",
    subject: "RFQ \u2014 NW-6015 x200", receivedAt: "2026-08-03T17:50:00",
    body: `Requesting a quote.

Product: NW-6015
Volume: 200 units
Deliver to: Bristol
Needed by: 09/15/2026

Summerfield Group` },
  { id: 71, type: "unclassified", from: "no-reply@calendarapp.com",
    subject: "Reminder: Ops standup 09:00", receivedAt: "2026-08-03T17:01:00",
    body: `Your meeting starts in 30 minutes.` },
  { id: 72, type: "unclassified", from: "hr@northwindsupply.com",
    subject: "Reminder: submit August timesheets", receivedAt: "2026-08-03T17:12:00",
    body: `Please submit by Friday 17:00.` },
  { id: 73, type: "unclassified", from: "security@microsoft.com",
    subject: "Unusual sign-in activity", receivedAt: "2026-08-03T17:23:00",
    body: `We noticed a sign-in from a new device.` },
  { id: 74, type: "unclassified", from: "sales@palletworld.co.uk",
    subject: "Q3 pallet pricing \u2014 special offer", receivedAt: "2026-08-03T17:34:00",
    body: `Bulk pallet pricing now available. Book a call.` },
  { id: 75, type: "unclassified", from: "noreply@companieshouse.gov.uk",
    subject: "Confirmation statement due", receivedAt: "2026-08-03T17:45:00",
    body: `Your annual confirmation statement is due 30 September.` }
];

export const FIXTURES: Record<number, Fixture> = {
  1: {
    type: "purchase_order", relevant: true,
    extraction: {
      values: { customer: "Harlow Retail Group", po_number: "88213", sku: "NW-4420-BLK", quantity: "480", unit_price: "12.40", required_by: "2026-08-14", ship_to: "Harlow Retail DC, 1200 Kingsway, Columbus OH 43219", contact: "Rita Alvarez" },
      confidence: { customer: 1, po_number: 1, sku: 1, quantity: 1, unit_price: 1, required_by: 1, ship_to: 0.97, contact: 1 },
      reasons: {  },
      typeConfidence: 0.99,
      notes: "",
    },
  },
  2: {
    type: "supplier_invoice", relevant: true,
    extraction: {
      values: { vendor: "Apex Components", invoice_no: "2026-0731-A", po_ref: "", amount: "18420.00", invoice_date: "2026-07-31", due_date: "", terms: "", description: "July production run" },
      confidence: { vendor: 0.94, invoice_no: 1, po_ref: 0, amount: 1, invoice_date: 0.68, due_date: 0, terms: 0, description: 0.86 },
      reasons: { po_ref: "absent from the document", invoice_date: "'end of July' \u2014 interpreted, not stated" },
      typeConfidence: 0.96,
      notes: "No PO reference anywhere in the message. An $18,420 invoice cannot be three-way matched without one \u2014 this is the exact gap duplicate and fraudulent invoices come through. Held for a human rather than posted.",
    },
  },
  3: {
    type: "delivery_booking", relevant: true,
    extraction: {
      values: { carrier: "Ridgeway Haulage", dock_date: "2026-07-30", dock_time: "", pallets: "22", site: "Midlands DC", ref: "RW-99120", driver: "", vehicle: "RG21 KLM" },
      confidence: { carrier: 1, dock_date: 0.72, dock_time: 0, pallets: 0.96, site: 0.83, ref: 1, driver: 0, vehicle: 0.95 },
      reasons: { dock_time: "no window committed in the message", dock_date: "'Thursday' \u2014 resolved to 30 Jul", site: "'as usual' \u2014 inferred from history" },
      typeConfidence: 0.93,
      notes: "No committed time window \u2014 'some time in the morning, depends on the M6'. Dock slots are 30-minute allocations; booking one on a guess causes detention charges.",
    },
  },
  4: {
    type: "quote_request", relevant: true,
    extraction: {
      values: { company: "Brightline Manufacturing", product: "NW-4420", volume: "1200", delivery_to: "Leeds", needed_by: "", contact: "Kwame Osei", email: "k.osei@brightlinemfg.com", notes: "Asks to hold stock pending PO against existing agreement" },
      confidence: { company: 1, product: 0.93, volume: 1, delivery_to: 0.9, needed_by: 0.42, contact: 1, email: 1, notes: 0.8 },
      reasons: { needed_by: "'3rd week of September' \u2014 a range, not a date" },
      typeConfidence: 0.61,
      notes: "Classified as a quote request at 61% confidence \u2014 the message also signals intent to raise a purchase order. Routing it to the CRM alone would lose the order signal; routing it to the ERP would create a PO that does not exist yet. Escalated for a human to split.",
    },
  },
  5: { type: "unclassified", relevant: false, rejectReason: "Industry newsletter \u2014 no transactional content. Discarded before extraction." },
  6: {
    type: "purchase_order", relevant: true,
    extraction: {
      values: { customer: "Harlow Retail Group", po_number: "88220", sku: "NW-4000-GRY", quantity: "600", unit_price: "36.13", required_by: "2026-08-10", ship_to: "Harlow Retail Group DC, Leeds", contact: "" },
      confidence: { customer: 1, po_number: 1, sku: 1, quantity: 1, unit_price: 1, required_by: 1, ship_to: 0.91, contact: 0 },
      reasons: {  },
      typeConfidence: 0.97,
      notes: "",
    },
  },
  7: {
    type: "purchase_order", relevant: true,
    extraction: {
      values: { customer: "Peakline Distribution", po_number: "88227", sku: "NW-4137-BLK", quantity: "960", unit_price: "17.65", required_by: "2026-08-11", ship_to: "Peakline Distribution DC, Manchester", contact: "" },
      confidence: { customer: 1, po_number: 1, sku: 1, quantity: 1, unit_price: 1, required_by: 1, ship_to: 0.93, contact: 0 },
      reasons: {  },
      typeConfidence: 0.98,
      notes: "",
    },
  },
  8: {
    type: "purchase_order", relevant: true,
    extraction: {
      values: { customer: "Castleford Wholesale", po_number: "88234", sku: "NW-4274-GRY", quantity: "600", unit_price: "20.0", required_by: "2026-08-12", ship_to: "Castleford Wholesale DC, Bristol", contact: "" },
      confidence: { customer: 1, po_number: 1, sku: 1, quantity: 1, unit_price: 1, required_by: 1, ship_to: 0.92, contact: 0 },
      reasons: {  },
      typeConfidence: 0.96,
      notes: "",
    },
  },
  9: {
    type: "purchase_order", relevant: true,
    extraction: {
      values: { customer: "Ambridge Trade", po_number: "88241", sku: "NW-4411-BLK", quantity: "120", unit_price: "7.81", required_by: "2026-08-13", ship_to: "Ambridge Trade DC, Glasgow", contact: "" },
      confidence: { customer: 1, po_number: 1, sku: 1, quantity: 1, unit_price: 1, required_by: 1, ship_to: 0.98, contact: 0 },
      reasons: {  },
      typeConfidence: 0.96,
      notes: "",
    },
  },
  10: {
    type: "purchase_order", relevant: true,
    extraction: {
      values: { customer: "Verity Home", po_number: "88248", sku: "NW-4548-GRY", quantity: "120", unit_price: "22.45", required_by: "2026-08-14", ship_to: "Verity Home DC, Birmingham", contact: "" },
      confidence: { customer: 1, po_number: 1, sku: 1, quantity: 1, unit_price: 1, required_by: 1, ship_to: 0.96, contact: 0 },
      reasons: {  },
      typeConfidence: 0.96,
      notes: "",
    },
  },
  11: {
    type: "purchase_order", relevant: true,
    extraction: {
      values: { customer: "Northgate Retail", po_number: "88255", sku: "NW-4685-BLK", quantity: "120", unit_price: "11.4", required_by: "2026-08-15", ship_to: "Northgate Retail DC, Southampton", contact: "" },
      confidence: { customer: 1, po_number: 1, sku: 1, quantity: 1, unit_price: 1, required_by: 1, ship_to: 0.9, contact: 0 },
      reasons: {  },
      typeConfidence: 0.96,
      notes: "",
    },
  },
  12: {
    type: "purchase_order", relevant: true,
    extraction: {
      values: { customer: "Summerfield Group", po_number: "88262", sku: "NW-4822-GRY", quantity: "360", unit_price: "26.36", required_by: "2026-08-16", ship_to: "Summerfield Group DC, Cardiff", contact: "" },
      confidence: { customer: 1, po_number: 1, sku: 1, quantity: 1, unit_price: 1, required_by: 1, ship_to: 0.98, contact: 0 },
      reasons: {  },
      typeConfidence: 0.96,
      notes: "",
    },
  },
  13: {
    type: "purchase_order", relevant: true,
    extraction: {
      values: { customer: "Larkhall Supplies", po_number: "88269", sku: "NW-4959-BLK", quantity: "720", unit_price: "38.87", required_by: "2026-08-17", ship_to: "Larkhall Supplies DC, Newcastle", contact: "" },
      confidence: { customer: 1, po_number: 1, sku: 1, quantity: 1, unit_price: 1, required_by: 1, ship_to: 0.92, contact: 0 },
      reasons: {  },
      typeConfidence: 0.99,
      notes: "",
    },
  },
  14: {
    type: "purchase_order", relevant: true,
    extraction: {
      values: { customer: "Grantham & Co", po_number: "88276", sku: "NW-5096-GRY", quantity: "240", unit_price: "33.31", required_by: "2026-08-18", ship_to: "Grantham & Co DC, Leeds", contact: "" },
      confidence: { customer: 1, po_number: 1, sku: 1, quantity: 1, unit_price: 1, required_by: 1, ship_to: 0.91, contact: 0 },
      reasons: {  },
      typeConfidence: 0.96,
      notes: "",
    },
  },
  15: {
    type: "purchase_order", relevant: true,
    extraction: {
      values: { customer: "Westbrook Trading", po_number: "88283", sku: "NW-5233-BLK", quantity: "1200", unit_price: "28.33", required_by: "2026-08-19", ship_to: "Westbrook Trading DC, Manchester", contact: "" },
      confidence: { customer: 1, po_number: 1, sku: 1, quantity: 1, unit_price: 1, required_by: 1, ship_to: 0.91, contact: 0 },
      reasons: {  },
      typeConfidence: 0.98,
      notes: "",
    },
  },
  16: {
    type: "purchase_order", relevant: true,
    extraction: {
      values: { customer: "Faircloth Retail", po_number: "88290", sku: "NW-5370-GRY", quantity: "720", unit_price: "28.24", required_by: "2026-08-20", ship_to: "Faircloth Retail DC, Bristol", contact: "" },
      confidence: { customer: 1, po_number: 1, sku: 1, quantity: 1, unit_price: 1, required_by: 1, ship_to: 0.94, contact: 0 },
      reasons: {  },
      typeConfidence: 0.97,
      notes: "",
    },
  },
  17: {
    type: "purchase_order", relevant: true,
    extraction: {
      values: { customer: "Duncan Bros", po_number: "88297", sku: "NW-5507-BLK", quantity: "240", unit_price: "7.55", required_by: "2026-08-21", ship_to: "Duncan Bros DC, Glasgow", contact: "" },
      confidence: { customer: 1, po_number: 1, sku: 1, quantity: 1, unit_price: 1, required_by: 1, ship_to: 0.9, contact: 0 },
      reasons: {  },
      typeConfidence: 0.95,
      notes: "",
    },
  },
  18: {
    type: "purchase_order", relevant: true,
    extraction: {
      values: { customer: "Harlow Retail Group", po_number: "88304", sku: "NW-5644-GRY", quantity: "600", unit_price: "33.54", required_by: "2026-08-22", ship_to: "Harlow Retail Group DC, Birmingham", contact: "" },
      confidence: { customer: 1, po_number: 1, sku: 1, quantity: 1, unit_price: 1, required_by: 1, ship_to: 0.93, contact: 0 },
      reasons: {  },
      typeConfidence: 0.96,
      notes: "",
    },
  },
  19: {
    type: "purchase_order", relevant: true,
    extraction: {
      values: { customer: "Peakline Distribution", po_number: "88311", sku: "NW-5781-BLK", quantity: "600", unit_price: "23.52", required_by: "2026-08-23", ship_to: "Peakline Distribution DC, Southampton", contact: "" },
      confidence: { customer: 1, po_number: 1, sku: 1, quantity: 1, unit_price: 1, required_by: 1, ship_to: 0.97, contact: 0 },
      reasons: {  },
      typeConfidence: 0.96,
      notes: "",
    },
  },
  20: {
    type: "purchase_order", relevant: true,
    extraction: {
      values: { customer: "Castleford Wholesale", po_number: "88318", sku: "NW-5918-GRY", quantity: "480", unit_price: "13.3", required_by: "2026-08-24", ship_to: "Castleford Wholesale DC, Cardiff", contact: "" },
      confidence: { customer: 1, po_number: 1, sku: 1, quantity: 1, unit_price: 1, required_by: 1, ship_to: 0.91, contact: 0 },
      reasons: {  },
      typeConfidence: 0.98,
      notes: "",
    },
  },
  21: {
    type: "purchase_order", relevant: true,
    extraction: {
      values: { customer: "Ambridge Trade", po_number: "88325", sku: "NW-6055-BLK", quantity: "1200", unit_price: "12.57", required_by: "2026-08-25", ship_to: "Ambridge Trade DC, Newcastle", contact: "" },
      confidence: { customer: 1, po_number: 1, sku: 1, quantity: 1, unit_price: 1, required_by: 1, ship_to: 0.94, contact: 0 },
      reasons: {  },
      typeConfidence: 0.99,
      notes: "",
    },
  },
  22: {
    type: "purchase_order", relevant: true,
    extraction: {
      values: { customer: "Verity Home", po_number: "88332", sku: "NW-6192-GRY", quantity: "240", unit_price: "38.04", required_by: "2026-08-26", ship_to: "Verity Home DC, Leeds", contact: "" },
      confidence: { customer: 1, po_number: 1, sku: 1, quantity: 1, unit_price: 1, required_by: 1, ship_to: 0.91, contact: 0 },
      reasons: {  },
      typeConfidence: 0.99,
      notes: "",
    },
  },
  23: {
    type: "purchase_order", relevant: true,
    extraction: {
      values: { customer: "Northgate Retail", po_number: "88339", sku: "NW-6329-BLK", quantity: "120", unit_price: "26.71", required_by: "2026-08-27", ship_to: "Northgate Retail DC, Manchester", contact: "" },
      confidence: { customer: 1, po_number: 1, sku: 1, quantity: 1, unit_price: 1, required_by: 1, ship_to: 0.93, contact: 0 },
      reasons: {  },
      typeConfidence: 0.95,
      notes: "",
    },
  },
  24: {
    type: "purchase_order", relevant: true,
    extraction: {
      values: { customer: "Summerfield Group", po_number: "88346", sku: "NW-6466-GRY", quantity: "480", unit_price: "28.74", required_by: "2026-08-10", ship_to: "Summerfield Group DC, Bristol", contact: "" },
      confidence: { customer: 1, po_number: 1, sku: 1, quantity: 1, unit_price: 1, required_by: 1, ship_to: 0.98, contact: 0 },
      reasons: {  },
      typeConfidence: 0.98,
      notes: "",
    },
  },
  25: {
    type: "purchase_order", relevant: true,
    extraction: {
      values: { customer: "Larkhall Supplies", po_number: "88353", sku: "NW-6603-BLK", quantity: "120", unit_price: "23.39", required_by: "2026-08-11", ship_to: "Larkhall Supplies DC, Glasgow", contact: "" },
      confidence: { customer: 1, po_number: 1, sku: 1, quantity: 1, unit_price: 1, required_by: 1, ship_to: 0.98, contact: 0 },
      reasons: {  },
      typeConfidence: 0.98,
      notes: "",
    },
  },
  26: {
    type: "purchase_order", relevant: true,
    extraction: {
      values: { customer: "Grantham & Co", po_number: "88360", sku: "NW-6740-GRY", quantity: "720", unit_price: "4.57", required_by: "2026-08-12", ship_to: "Grantham & Co DC, Birmingham", contact: "" },
      confidence: { customer: 1, po_number: 1, sku: 1, quantity: 1, unit_price: 1, required_by: 1, ship_to: 0.96, contact: 0 },
      reasons: {  },
      typeConfidence: 0.96,
      notes: "",
    },
  },
  27: {
    type: "purchase_order", relevant: true,
    extraction: {
      values: { customer: "Westbrook Trading", po_number: "88367", sku: "NW-6877-BLK", quantity: "120", unit_price: "6.73", required_by: "2026-08-13", ship_to: "Westbrook Trading DC, Southampton", contact: "" },
      confidence: { customer: 1, po_number: 1, sku: 1, quantity: 1, unit_price: 1, required_by: 1, ship_to: 0.94, contact: 0 },
      reasons: {  },
      typeConfidence: 0.95,
      notes: "",
    },
  },
  28: {
    type: "supplier_invoice", relevant: true,
    extraction: {
      values: { vendor: "Apex Components", invoice_no: "51000", po_ref: "88220", amount: "22465.65", invoice_date: "2026-07-08", due_date: "2026-08-07", terms: "Net 30", description: "" },
      confidence: { vendor: 1, invoice_no: 1, po_ref: 1, amount: 1, invoice_date: 1, due_date: 1, terms: 1, description: 0 },
      reasons: {  },
      typeConfidence: 0.99,
      notes: "",
    },
  },
  29: {
    type: "supplier_invoice", relevant: true,
    extraction: {
      values: { vendor: "Meridian Steel", invoice_no: "51211", po_ref: "88231", amount: "5888.47", invoice_date: "2026-07-09", due_date: "2026-08-08", terms: "Net 30", description: "" },
      confidence: { vendor: 1, invoice_no: 1, po_ref: 1, amount: 1, invoice_date: 1, due_date: 1, terms: 1, description: 0 },
      reasons: {  },
      typeConfidence: 0.95,
      notes: "",
    },
  },
  30: {
    type: "supplier_invoice", relevant: true,
    extraction: {
      values: { vendor: "Calder Plastics", invoice_no: "51422", po_ref: "88242", amount: "13119.21", invoice_date: "2026-07-10", due_date: "2026-08-09", terms: "Net 30", description: "" },
      confidence: { vendor: 1, invoice_no: 1, po_ref: 1, amount: 1, invoice_date: 1, due_date: 1, terms: 1, description: 0 },
      reasons: {  },
      typeConfidence: 0.96,
      notes: "",
    },
  },
  31: {
    type: "supplier_invoice", relevant: true,
    extraction: {
      values: { vendor: "Thornton Packaging", invoice_no: "51633", po_ref: "88253", amount: "13458.28", invoice_date: "2026-07-11", due_date: "2026-08-10", terms: "Net 30", description: "" },
      confidence: { vendor: 1, invoice_no: 1, po_ref: 1, amount: 1, invoice_date: 1, due_date: 1, terms: 1, description: 0 },
      reasons: {  },
      typeConfidence: 0.98,
      notes: "",
    },
  },
  32: {
    type: "supplier_invoice", relevant: true,
    extraction: {
      values: { vendor: "Rowan Fasteners", invoice_no: "51844", po_ref: "88264", amount: "6745.74", invoice_date: "2026-07-12", due_date: "2026-08-11", terms: "Net 30", description: "" },
      confidence: { vendor: 1, invoice_no: 1, po_ref: 1, amount: 1, invoice_date: 1, due_date: 1, terms: 1, description: 0 },
      reasons: {  },
      typeConfidence: 0.97,
      notes: "",
    },
  },
  33: {
    type: "supplier_invoice", relevant: true,
    extraction: {
      values: { vendor: "Bexley Coatings", invoice_no: "52055", po_ref: "88275", amount: "21710.10", invoice_date: "2026-07-13", due_date: "2026-08-12", terms: "Net 30", description: "" },
      confidence: { vendor: 1, invoice_no: 1, po_ref: 1, amount: 1, invoice_date: 1, due_date: 1, terms: 1, description: 0 },
      reasons: {  },
      typeConfidence: 0.97,
      notes: "",
    },
  },
  34: {
    type: "supplier_invoice", relevant: true,
    extraction: {
      values: { vendor: "Halton Timber", invoice_no: "52266", po_ref: "88286", amount: "8818.13", invoice_date: "2026-07-14", due_date: "2026-08-13", terms: "Net 30", description: "" },
      confidence: { vendor: 1, invoice_no: 1, po_ref: 1, amount: 1, invoice_date: 1, due_date: 1, terms: 1, description: 0 },
      reasons: {  },
      typeConfidence: 0.99,
      notes: "",
    },
  },
  35: {
    type: "supplier_invoice", relevant: true,
    extraction: {
      values: { vendor: "Crane Electricals", invoice_no: "52477", po_ref: "88297", amount: "19697.76", invoice_date: "2026-07-15", due_date: "2026-08-14", terms: "Net 30", description: "" },
      confidence: { vendor: 1, invoice_no: 1, po_ref: 1, amount: 1, invoice_date: 1, due_date: 1, terms: 1, description: 0 },
      reasons: {  },
      typeConfidence: 0.99,
      notes: "",
    },
  },
  36: {
    type: "supplier_invoice", relevant: true,
    extraction: {
      values: { vendor: "Apex Components", invoice_no: "52688", po_ref: "88308", amount: "16786.89", invoice_date: "2026-07-16", due_date: "2026-08-15", terms: "Net 30", description: "" },
      confidence: { vendor: 1, invoice_no: 1, po_ref: 1, amount: 1, invoice_date: 1, due_date: 1, terms: 1, description: 0 },
      reasons: {  },
      typeConfidence: 0.97,
      notes: "",
    },
  },
  37: {
    type: "supplier_invoice", relevant: true,
    extraction: {
      values: { vendor: "Meridian Steel", invoice_no: "52899", po_ref: "88319", amount: "16908.83", invoice_date: "2026-07-17", due_date: "2026-08-16", terms: "Net 30", description: "" },
      confidence: { vendor: 1, invoice_no: 1, po_ref: 1, amount: 1, invoice_date: 1, due_date: 1, terms: 1, description: 0 },
      reasons: {  },
      typeConfidence: 0.98,
      notes: "",
    },
  },
  38: {
    type: "supplier_invoice", relevant: true,
    extraction: {
      values: { vendor: "Calder Plastics", invoice_no: "53110", po_ref: "88330", amount: "15672.73", invoice_date: "2026-07-18", due_date: "2026-08-17", terms: "Net 30", description: "" },
      confidence: { vendor: 1, invoice_no: 1, po_ref: 1, amount: 1, invoice_date: 1, due_date: 1, terms: 1, description: 0 },
      reasons: {  },
      typeConfidence: 0.96,
      notes: "",
    },
  },
  39: {
    type: "supplier_invoice", relevant: true,
    extraction: {
      values: { vendor: "Thornton Packaging", invoice_no: "53321", po_ref: "88341", amount: "7720.35", invoice_date: "2026-07-19", due_date: "2026-08-18", terms: "Net 30", description: "" },
      confidence: { vendor: 1, invoice_no: 1, po_ref: 1, amount: 1, invoice_date: 1, due_date: 1, terms: 1, description: 0 },
      reasons: {  },
      typeConfidence: 0.97,
      notes: "",
    },
  },
  40: {
    type: "supplier_invoice", relevant: true,
    extraction: {
      values: { vendor: "Rowan Fasteners", invoice_no: "53532", po_ref: "88352", amount: "18725.48", invoice_date: "2026-07-20", due_date: "2026-08-19", terms: "Net 30", description: "" },
      confidence: { vendor: 1, invoice_no: 1, po_ref: 1, amount: 1, invoice_date: 1, due_date: 1, terms: 1, description: 0 },
      reasons: {  },
      typeConfidence: 0.97,
      notes: "",
    },
  },
  41: {
    type: "supplier_invoice", relevant: true,
    extraction: {
      values: { vendor: "Bexley Coatings", invoice_no: "53743", po_ref: "88363", amount: "13603.56", invoice_date: "2026-07-21", due_date: "2026-08-20", terms: "Net 30", description: "" },
      confidence: { vendor: 1, invoice_no: 1, po_ref: 1, amount: 1, invoice_date: 1, due_date: 1, terms: 1, description: 0 },
      reasons: {  },
      typeConfidence: 0.98,
      notes: "",
    },
  },
  42: {
    type: "supplier_invoice", relevant: true,
    extraction: {
      values: { vendor: "Halton Timber", invoice_no: "53954", po_ref: "88374", amount: "3405.11", invoice_date: "2026-07-22", due_date: "2026-08-21", terms: "Net 30", description: "" },
      confidence: { vendor: 1, invoice_no: 1, po_ref: 1, amount: 1, invoice_date: 1, due_date: 1, terms: 1, description: 0 },
      reasons: {  },
      typeConfidence: 0.98,
      notes: "",
    },
  },
  43: {
    type: "supplier_invoice", relevant: true,
    extraction: {
      values: { vendor: "Crane Electricals", invoice_no: "54165", po_ref: "88385", amount: "8580.80", invoice_date: "2026-07-23", due_date: "2026-08-22", terms: "Net 30", description: "" },
      confidence: { vendor: 1, invoice_no: 1, po_ref: 1, amount: 1, invoice_date: 1, due_date: 1, terms: 1, description: 0 },
      reasons: {  },
      typeConfidence: 0.97,
      notes: "",
    },
  },
  44: {
    type: "supplier_invoice", relevant: true,
    extraction: {
      values: { vendor: "Apex Components", invoice_no: "54376", po_ref: "88396", amount: "20196.57", invoice_date: "2026-07-24", due_date: "2026-08-23", terms: "Net 30", description: "" },
      confidence: { vendor: 1, invoice_no: 1, po_ref: 1, amount: 1, invoice_date: 1, due_date: 1, terms: 1, description: 0 },
      reasons: {  },
      typeConfidence: 0.96,
      notes: "",
    },
  },
  45: {
    type: "supplier_invoice", relevant: true,
    extraction: {
      values: { vendor: "Meridian Steel", invoice_no: "54587", po_ref: "88407", amount: "22880.07", invoice_date: "2026-07-25", due_date: "2026-08-24", terms: "Net 30", description: "" },
      confidence: { vendor: 1, invoice_no: 1, po_ref: 1, amount: 1, invoice_date: 1, due_date: 1, terms: 1, description: 0 },
      reasons: {  },
      typeConfidence: 0.95,
      notes: "",
    },
  },
  46: {
    type: "delivery_booking", relevant: true,
    extraction: {
      values: { carrier: "Ridgeway Haulage", dock_date: "2026-08-03", dock_time: "15:00-17:00", pallets: "26", site: "Midlands DC", ref: "RI-90000", driver: "", vehicle: "" },
      confidence: { carrier: 1, dock_date: 1, dock_time: 1, pallets: 1, site: 1, ref: 1, driver: 0, vehicle: 0 },
      reasons: {  },
      typeConfidence: 0.94,
      notes: "",
    },
  },
  47: {
    type: "delivery_booking", relevant: true,
    extraction: {
      values: { carrier: "Foxton Logistics", dock_date: "2026-08-04", dock_time: "13:00-15:00", pallets: "26", site: "Northern DC", ref: "FO-90037", driver: "", vehicle: "" },
      confidence: { carrier: 1, dock_date: 1, dock_time: 1, pallets: 1, site: 1, ref: 1, driver: 0, vehicle: 0 },
      reasons: {  },
      typeConfidence: 0.98,
      notes: "",
    },
  },
  48: {
    type: "delivery_booking", relevant: true,
    extraction: {
      values: { carrier: "Marlow Transport", dock_date: "2026-08-05", dock_time: "11:00-13:00", pallets: "33", site: "Southern DC", ref: "MA-90074", driver: "", vehicle: "" },
      confidence: { carrier: 1, dock_date: 1, dock_time: 1, pallets: 1, site: 1, ref: 1, driver: 0, vehicle: 0 },
      reasons: {  },
      typeConfidence: 0.93,
      notes: "",
    },
  },
  49: {
    type: "delivery_booking", relevant: true,
    extraction: {
      values: { carrier: "BSL Freight", dock_date: "2026-08-06", dock_time: "07:00-09:00", pallets: "22", site: "Midlands DC", ref: "BS-90111", driver: "", vehicle: "" },
      confidence: { carrier: 1, dock_date: 1, dock_time: 1, pallets: 1, site: 1, ref: 1, driver: 0, vehicle: 0 },
      reasons: {  },
      typeConfidence: 0.98,
      notes: "",
    },
  },
  50: {
    type: "delivery_booking", relevant: true,
    extraction: {
      values: { carrier: "Kestrel Distribution", dock_date: "2026-08-07", dock_time: "13:00-15:00", pallets: "12", site: "Northern DC", ref: "KE-90148", driver: "", vehicle: "" },
      confidence: { carrier: 1, dock_date: 1, dock_time: 1, pallets: 1, site: 1, ref: 1, driver: 0, vehicle: 0 },
      reasons: {  },
      typeConfidence: 0.94,
      notes: "",
    },
  },
  51: {
    type: "delivery_booking", relevant: true,
    extraction: {
      values: { carrier: "Pennine Haulage", dock_date: "2026-08-08", dock_time: "07:00-09:00", pallets: "33", site: "Southern DC", ref: "PE-90185", driver: "", vehicle: "" },
      confidence: { carrier: 1, dock_date: 1, dock_time: 1, pallets: 1, site: 1, ref: 1, driver: 0, vehicle: 0 },
      reasons: {  },
      typeConfidence: 0.94,
      notes: "",
    },
  },
  52: {
    type: "delivery_booking", relevant: true,
    extraction: {
      values: { carrier: "Ridgeway Haulage", dock_date: "2026-08-09", dock_time: "13:00-15:00", pallets: "22", site: "Midlands DC", ref: "RI-90222", driver: "", vehicle: "" },
      confidence: { carrier: 1, dock_date: 1, dock_time: 1, pallets: 1, site: 1, ref: 1, driver: 0, vehicle: 0 },
      reasons: {  },
      typeConfidence: 0.99,
      notes: "",
    },
  },
  53: {
    type: "delivery_booking", relevant: true,
    extraction: {
      values: { carrier: "Foxton Logistics", dock_date: "2026-08-10", dock_time: "11:00-13:00", pallets: "22", site: "Northern DC", ref: "FO-90259", driver: "", vehicle: "" },
      confidence: { carrier: 1, dock_date: 1, dock_time: 1, pallets: 1, site: 1, ref: 1, driver: 0, vehicle: 0 },
      reasons: {  },
      typeConfidence: 0.96,
      notes: "",
    },
  },
  54: {
    type: "delivery_booking", relevant: true,
    extraction: {
      values: { carrier: "Marlow Transport", dock_date: "2026-08-11", dock_time: "15:00-17:00", pallets: "33", site: "Southern DC", ref: "MA-90296", driver: "", vehicle: "" },
      confidence: { carrier: 1, dock_date: 1, dock_time: 1, pallets: 1, site: 1, ref: 1, driver: 0, vehicle: 0 },
      reasons: {  },
      typeConfidence: 0.97,
      notes: "",
    },
  },
  55: {
    type: "delivery_booking", relevant: true,
    extraction: {
      values: { carrier: "BSL Freight", dock_date: "2026-08-12", dock_time: "15:00-17:00", pallets: "12", site: "Midlands DC", ref: "BS-90333", driver: "", vehicle: "" },
      confidence: { carrier: 1, dock_date: 1, dock_time: 1, pallets: 1, site: 1, ref: 1, driver: 0, vehicle: 0 },
      reasons: {  },
      typeConfidence: 0.96,
      notes: "",
    },
  },
  56: {
    type: "delivery_booking", relevant: true,
    extraction: {
      values: { carrier: "Kestrel Distribution", dock_date: "2026-08-13", dock_time: "07:00-09:00", pallets: "18", site: "Northern DC", ref: "KE-90370", driver: "", vehicle: "" },
      confidence: { carrier: 1, dock_date: 1, dock_time: 1, pallets: 1, site: 1, ref: 1, driver: 0, vehicle: 0 },
      reasons: {  },
      typeConfidence: 0.94,
      notes: "",
    },
  },
  57: {
    type: "delivery_booking", relevant: true,
    extraction: {
      values: { carrier: "Pennine Haulage", dock_date: "2026-08-14", dock_time: "13:00-15:00", pallets: "6", site: "Southern DC", ref: "PE-90407", driver: "", vehicle: "" },
      confidence: { carrier: 1, dock_date: 1, dock_time: 1, pallets: 1, site: 1, ref: 1, driver: 0, vehicle: 0 },
      reasons: {  },
      typeConfidence: 0.95,
      notes: "",
    },
  },
  58: {
    type: "delivery_booking", relevant: true,
    extraction: {
      values: { carrier: "Ridgeway Haulage", dock_date: "2026-08-15", dock_time: "13:00-15:00", pallets: "6", site: "Midlands DC", ref: "RI-90444", driver: "", vehicle: "" },
      confidence: { carrier: 1, dock_date: 1, dock_time: 1, pallets: 1, site: 1, ref: 1, driver: 0, vehicle: 0 },
      reasons: {  },
      typeConfidence: 0.97,
      notes: "",
    },
  },
  59: {
    type: "delivery_booking", relevant: true,
    extraction: {
      values: { carrier: "Foxton Logistics", dock_date: "2026-08-16", dock_time: "11:00-13:00", pallets: "18", site: "Northern DC", ref: "FO-90481", driver: "", vehicle: "" },
      confidence: { carrier: 1, dock_date: 1, dock_time: 1, pallets: 1, site: 1, ref: 1, driver: 0, vehicle: 0 },
      reasons: {  },
      typeConfidence: 0.95,
      notes: "",
    },
  },
  60: {
    type: "quote_request", relevant: true,
    extraction: {
      values: { company: "Harlow Retail Group", product: "NW-4420", volume: "800", delivery_to: "Leeds", needed_by: "2026-09-05", contact: "", email: "buying@harlow.com", notes: "" },
      confidence: { company: 1, product: 1, volume: 1, delivery_to: 1, needed_by: 1, contact: 0, email: 1, notes: 0 },
      reasons: {  },
      typeConfidence: 0.95,
      notes: "",
    },
  },
  61: {
    type: "quote_request", relevant: true,
    extraction: {
      values: { company: "Ambridge Trade", product: "NW-1180", volume: "800", delivery_to: "Manchester", needed_by: "2026-09-06", contact: "", email: "buying@ambridge.com", notes: "" },
      confidence: { company: 1, product: 1, volume: 1, delivery_to: 1, needed_by: 1, contact: 0, email: 1, notes: 0 },
      reasons: {  },
      typeConfidence: 0.95,
      notes: "",
    },
  },
  62: {
    type: "quote_request", relevant: true,
    extraction: {
      values: { company: "Summerfield Group", product: "NW-7702", volume: "200", delivery_to: "Bristol", needed_by: "2026-09-07", contact: "", email: "buying@summerfield.com", notes: "" },
      confidence: { company: 1, product: 1, volume: 1, delivery_to: 1, needed_by: 1, contact: 0, email: 1, notes: 0 },
      reasons: {  },
      typeConfidence: 0.96,
      notes: "",
    },
  },
  63: {
    type: "quote_request", relevant: true,
    extraction: {
      values: { company: "Westbrook Trading", product: "NW-3390", volume: "2400", delivery_to: "Glasgow", needed_by: "2026-09-08", contact: "", email: "buying@westbrook.com", notes: "" },
      confidence: { company: 1, product: 1, volume: 1, delivery_to: 1, needed_by: 1, contact: 0, email: 1, notes: 0 },
      reasons: {  },
      typeConfidence: 0.96,
      notes: "",
    },
  },
  64: {
    type: "quote_request", relevant: true,
    extraction: {
      values: { company: "Harlow Retail Group", product: "NW-6015", volume: "1600", delivery_to: "Birmingham", needed_by: "2026-09-09", contact: "", email: "buying@harlow.com", notes: "" },
      confidence: { company: 1, product: 1, volume: 1, delivery_to: 1, needed_by: 1, contact: 0, email: 1, notes: 0 },
      reasons: {  },
      typeConfidence: 0.98,
      notes: "",
    },
  },
  65: {
    type: "quote_request", relevant: true,
    extraction: {
      values: { company: "Ambridge Trade", product: "NW-2245", volume: "1600", delivery_to: "Southampton", needed_by: "2026-09-10", contact: "", email: "buying@ambridge.com", notes: "" },
      confidence: { company: 1, product: 1, volume: 1, delivery_to: 1, needed_by: 1, contact: 0, email: 1, notes: 0 },
      reasons: {  },
      typeConfidence: 0.95,
      notes: "",
    },
  },
  66: {
    type: "quote_request", relevant: true,
    extraction: {
      values: { company: "Summerfield Group", product: "NW-4420", volume: "200", delivery_to: "Cardiff", needed_by: "2026-09-11", contact: "", email: "buying@summerfield.com", notes: "" },
      confidence: { company: 1, product: 1, volume: 1, delivery_to: 1, needed_by: 1, contact: 0, email: 1, notes: 0 },
      reasons: {  },
      typeConfidence: 0.96,
      notes: "",
    },
  },
  67: {
    type: "quote_request", relevant: true,
    extraction: {
      values: { company: "Westbrook Trading", product: "NW-1180", volume: "800", delivery_to: "Newcastle", needed_by: "2026-09-12", contact: "", email: "buying@westbrook.com", notes: "" },
      confidence: { company: 1, product: 1, volume: 1, delivery_to: 1, needed_by: 1, contact: 0, email: 1, notes: 0 },
      reasons: {  },
      typeConfidence: 0.99,
      notes: "",
    },
  },
  68: {
    type: "quote_request", relevant: true,
    extraction: {
      values: { company: "Harlow Retail Group", product: "NW-7702", volume: "450", delivery_to: "Leeds", needed_by: "2026-09-13", contact: "", email: "buying@harlow.com", notes: "" },
      confidence: { company: 1, product: 1, volume: 1, delivery_to: 1, needed_by: 1, contact: 0, email: 1, notes: 0 },
      reasons: {  },
      typeConfidence: 0.97,
      notes: "",
    },
  },
  69: {
    type: "quote_request", relevant: true,
    extraction: {
      values: { company: "Ambridge Trade", product: "NW-3390", volume: "200", delivery_to: "Manchester", needed_by: "2026-09-14", contact: "", email: "buying@ambridge.com", notes: "" },
      confidence: { company: 1, product: 1, volume: 1, delivery_to: 1, needed_by: 1, contact: 0, email: 1, notes: 0 },
      reasons: {  },
      typeConfidence: 0.97,
      notes: "",
    },
  },
  70: {
    type: "quote_request", relevant: true,
    extraction: {
      values: { company: "Summerfield Group", product: "NW-6015", volume: "200", delivery_to: "Bristol", needed_by: "2026-09-15", contact: "", email: "buying@summerfield.com", notes: "" },
      confidence: { company: 1, product: 1, volume: 1, delivery_to: 1, needed_by: 1, contact: 0, email: 1, notes: 0 },
      reasons: {  },
      typeConfidence: 0.95,
      notes: "",
    },
  },
  71: { type: "unclassified", relevant: false, rejectReason: "No transactional content \u2014 not an order, invoice, booking or quote." },
  72: { type: "unclassified", relevant: false, rejectReason: "No transactional content \u2014 not an order, invoice, booking or quote." },
  73: { type: "unclassified", relevant: false, rejectReason: "No transactional content \u2014 not an order, invoice, booking or quote." },
  74: { type: "unclassified", relevant: false, rejectReason: "No transactional content \u2014 not an order, invoice, booking or quote." },
  75: { type: "unclassified", relevant: false, rejectReason: "No transactional content \u2014 not an order, invoice, booking or quote." }
};

export function getDoc(id: number) { return DOCS.find(d => d.id === id); }
