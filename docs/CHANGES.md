# Changes in this build

## Accounting rules (src/utils/accounting.ts, tested with `npm test`)
- Bill discount is a PRE-TAX discount; GST follows it. grand total = taxable - discount + GST (+ round-off).
- Profit = taxable value after discount - cost of items - extra cost (GST is never profit). Quotations are not counted.
- Stock: SGS tax invoices take stock out; quotations and Pandiyan bills never do. Each bill remembers exactly what it took
  (`appliedStock`), so cancel / edit / delete put back the right quantity even if an item was renamed.
- Cancel = stock back + refund entry in the cash book. Delete = stock back + its cash entries removed.
- Quotation -> invoice: stock goes out once, the advance is not counted as income twice.
- Vendor bill: weighted-average cost, vendor discount lowers landed cost, duplicate bill warning, delete reverses stock + cash.
- Paid amount can never exceed the bill; paid / partial / unpaid always follows the amount.
- Invoice numbers = highest number in the series + 1 (a deleted number is never reused).
- All dates use the local (India) day, not UTC.

## New in billing
- Customer GSTIN (checksum validated) -> state, inter-state (IGST) and GSTR-1 B2B picked up automatically.
- Place of supply (state list), payment due date / terms, overdue badges, payment history per bill.
- Discount as Rs or %, with the real saving shown.
- Print: correct CGST/SGST/IGST per rate, amount in words, HSN summary, UPI QR for the balance (needs `npm install` for `qrcode`).
- Reports: Customer Dues & Aging (with WhatsApp reminder), GSTR-1 JSON rebuilt (B2B, B2CS by state+rate, HSN with UQC, cancelled docs).
- Inventory: CSV import / export.
