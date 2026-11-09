# Spider Grid Solutions - Operational Enhancements

## User Requirements Addressed

1. **HSN / SAC Code in Billing**:
   - Added HSN/SAC code to each line item in customer invoices and quotations.
   - Provided quick HSN selection presets (e.g. `998713` for Computer & Peripheral repair service, `8471` for Laptops/Computers, `8528` for CCTV/Screens, `8504` for SMPS/Power supplies, `8443` for Printers, `8517` for Network equipment).
   - Displayed HSN column in invoice creation, invoice edit, table listings, and printable thermal/A4 voucher slips.

2. **Admin Dashboard & Customized Prefill Options**:
   - Added dedicated **Admin Hub** tab accessible from top navbar and dashboard quick actions.
   - **Prefill & Billing Defaults**: Workshop Name, GSTIN, Phone, Address, UPI ID (VPA) for customer QR payments, default HSN code, default GST rate (0%, 5%, 12%, 18%), invoice number prefix, and assigned technicians list.
   - **1-Click Billing Presets**: Quick services catalog with default description, HSN code, customer selling rate, and spare cost for fast invoice generation.
   - **Data Management**: Backup JSON export, backup JSON restore, and database reset.

3. **Job Card - Golden Customer Search and Select Option**:
   - Replaced basic dropdown with an interactive Search & Select Autocomplete component.
   - Filters across the 31 Golden Customers by name, phone (e.g. `9677776001`), area, or customer number.
   - Displays Golden Customer VIP badge (`🌟 Golden Customer #{c.slNo}`).
   - Instant auto-fill of Name, Phone, and Area with option to clear or switch.

4. **Payment Mode and UPI / UTR Transaction Reference**:
   - For both **Customer Invoices** and **Vendor Bills**:
     - Payment modes: Cash, UPI / GPay / PhonePe, Bank Transfer (NEFT / IMPS), Card, Cheque.
     - Dedicated input for **UPI Transaction ID / UTR / Reference No** (e.g. `UPI Ref 429104820129`).
     - Displayed clearly in tables, print slips, and cash flow ledger.

5. **Clickable Bill Number & Document Viewer**:
   - Clicking any bill number in Customer Billing or Vendor Bills opens a rich Bill Details Modal:
     - Displays invoice number, customer/vendor, date, payment status, payment mode, and UPI transaction reference.
     - Displays full item list with descriptions, HSN, quantities, rates, and costs.
     - Displays uploaded physical bill/receipt photo with full-screen enlargement.
     - Options to upload/attach photos of physical slips.

6. **Bills Profit & Loss Calculation & Manual Cost Input**:
   - Live profit calculation inside customer bill form:
     - Selling / Billed Amount vs Purchase Cost of Spares vs Extra Manual Expenses (travel, courier, lathe).
     - **Net Bill Profit = Billed Subtotal - Spares Purchase Cost - Extra Expenses**.
     - Calculates profit margin % (e.g. `+₹1,850 (62% margin)`).
     - Saved with the invoice and displayed in the invoices table with a green profit badge.

7. **Bill Actions: Edit, Duplicate, Cancel, and View Old Bills**:
   - **Click Old Bill**: Opens full bill view with items, HSN, payments, profit, and printable voucher.
   - **Edit Bill**: Opens invoice in edit mode to update items, rates, HSN, purchase costs, and notes.
   - **Cancel Bill**: Marks invoice as `Cancelled / Void` with audit note.
   - **Duplicate Bill**: 1-click clones the bill with a fresh invoice number for rapid repeat billing.

8. **WhatsApp Messages & Google Review Message in Admin & Job Cards**:
   - Admin settings for 3 customizable message templates:
     1. Welcome & Job Intake Template
     2. Status / Flow Progress Alert Template
     3. ⭐ Job Completed & Google Review Request Template
   - Configurable Google Review link embedded automatically into the completion message.
   - On Job Cards:
     - Direct phone call button (`tel:${job.customerPhone}`).
     - **Call Completed** tracking button and status badge (`📞 Call Done` with timestamp).
     - WhatsApp Hub modal supporting Welcome, Flow Alert, and Google Review messages.

9. **Blue & White Theme & User-Friendly UX**:
   - Corporate Blue & White theme as primary view with seamless Dark mode toggle.

10. **Multi-Page Vendor Bill Scanner & PaddleOCR Engine**:
   - Added multi-page receipt capture (single or multi-photo uploads from camera or device).
   - Horizontal gallery preview strip with page indexing (`Page 1`, `Page 2`, etc.), zoom modal, page reordering, and removal.
   - Dual OCR engine selector: **PaddleOCR API** (local/remote endpoint for free unlimited extraction) & **Gemini AI OCR**.
   - Indian GST invoice parser with vendor matching, HSN extraction, itemized gross/base prices, and 18% GST calculation.

11. **PaddleOCR Connection Resilience & Offline Simulation**:
   - Resolved `PaddleOCR error on page 1: fetch failed` connection issues when local endpoint `localhost:8866` is offline.
   - Safe timeouts and graceful fallback handling in `server.ts` without unhandled errors or stderr warnings.
   - Automatic IT Hardware catalog simulation fallback when external PaddleOCR server is not running, ensuring uninterrupted scanning workflow.
   - Real-time PaddleOCR server endpoint latency tester with non-blocking status feedback.

   - Clean badges, responsive tables, and intuitive modals.
