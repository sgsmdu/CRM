/**
 * Regression Test Suite covering all 11 SGS CRM Recovery & Bug-Fix scenarios:
 *  1. Vendor bill edit (preserves original ID, no duplicates, updates ledger & receipt images)
 *  2. GST bill increases stock & updates weighted-average cost
 *  3. Without-GST bill does NOT change stock, inventory items, or weighted-average cost
 *  4. Editing GST bill to Without-GST reverses stock safely (even after partial sales) & preserves audit history
 *  5. Job card edit preserves Job ID, original document ID, and timeline history
 *  6. Customer name/phone/area edit reflects in linked job cards, invoices, and quotations (customerId + legacy phone)
 *  7. Multiple old and new invoices calculate identical pending amount across Billing & Job Cards
 *  8. Partial payments (invoicePayments + legacy cashFlow) calculate correctly without double counting
 *  9. Cancelled bills are excluded
 * 10. Reversed payments and customer refunds are respected
 * 11. Repeated saves do not duplicate stock or payments
 */
import * as Acc from '../src/utils/accounting.ts';
import {
  calculateCustomerPendingSummary,
  getCustomerPendingSummaryForJob,
  buildCustomerPendingWhatsAppMessage,
} from '../src/utils/moneyFlow.ts';
import {
  syncCustomerDetailsAcrossRecords,
  applyJobCardEdit,
} from '../src/utils/customerSync.ts';
import type {
  CashFlowEntry,
  Customer,
  Invoice,
  InvoicePaymentRecord,
  JobCard,
  ManualQuotation,
} from '../src/types.ts';

let fails = 0;
const eq = (name: string, got: any, want: any) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : `\n     got=${JSON.stringify(got)}\n    want=${JSON.stringify(want)}`);
};

// ============================================================================
// 1, 2, 3, 4, 11: Vendor Bill Edit, GST vs Without-GST, Safe Reversal & Idempotency
// ============================================================================
{
  let st: Acc.LedgerState = { ...Acc.EMPTY_LEDGER };

  // 2. GST bill increases stock
  const gstAdd = Acc.addVendorBillTx(
    st,
    {
      vendorName: 'Sri Murugan Distributors',
      invoiceNumber: 'SMD-101',
      invoiceDate: '2026-11-10',
      isGstBill: true,
      billImage: 'data:image/jpeg;base64,RECEIPT_ORIG',
      billImages: ['data:image/jpeg;base64,RECEIPT_ORIG'],
      items: [
        {
          itemName: 'Hikvision 2MP Bullet Camera',
          quantity: 5,
          unitCost: 1000,
          gstPercent: 18,
          gstAmount: 900,
          total: 5000,
          totalWithGst: 5900,
        },
      ],
      subtotal: 5000,
      taxAmount: 900,
      discount: 0,
      totalAmount: 5900,
      paidAmount: 3000,
      paymentStatus: 'partial',
      paymentMode: 'upi',
      notes: 'Initial GST stock purchase',
    },
    true,
    { accountType: 'bank', bankAccountId: 'bank-1', paymentModeChoice: 'upi' }
  );
  st = gstAdd.state;
  const gstBillId = gstAdd.bill.id;
  eq('2. GST bill increases inventory stock to 5', st.inventory[0].currentStock, 5);
  eq('2. GST bill sets unitCost = 1000', st.inventory[0].unitCost, 1000);
  eq('2. GST bill creates 1 stockTx', st.stockTx.length, 1);
  eq('2. GST bill records 1 cashFlow expense of 3000', [st.cashFlow.length, st.cashFlow[0].amount], [1, 3000]);

  // 3. Without-GST bill does NOT change stock, inventory items, or weighted-average cost
  // Even if items carry default gstPercent: 18, explicit isGstBill: false MUST prevent stock changes!
  const nonGstAdd = Acc.addVendorBillTx(
    st,
    {
      vendorName: 'Local Bazaar Spares',
      invoiceNumber: 'LBS-09',
      invoiceDate: '2026-11-11',
      isGstBill: false,
      items: [
        {
          itemName: 'Hikvision 2MP Bullet Camera',
          quantity: 10,
          unitCost: 700,
          gstPercent: 18, // intentionally left as default to prove gstPercent never overrides explicit isGstBill: false
          gstAmount: 0,
          total: 7000,
          totalWithGst: 7000,
        },
        {
          itemName: 'Loose DC Pin Pack',
          quantity: 20,
          unitCost: 50,
          gstPercent: 0,
          gstAmount: 0,
          total: 1000,
          totalWithGst: 1000,
        },
      ],
      subtotal: 8000,
      taxAmount: 0,
      totalAmount: 8000,
      paidAmount: 8000,
      paymentStatus: 'paid',
      paymentMode: 'cash',
    },
    true,
    { accountType: 'cash', paymentModeChoice: 'cash' }
  );
  st = nonGstAdd.state;
  eq('3. Without-GST bill does not create new inventory items', st.inventory.length, 1);
  eq('3. Without-GST bill does not change existing stock qty', st.inventory[0].currentStock, 5);
  eq('3. Without-GST bill does not change weighted-average unitCost', st.inventory[0].unitCost, 1000);
  eq('3. Without-GST bill does not create stock transactions', st.stockTx.length, 1);
  eq('3. Without-GST bill IS saved in vendorBills & cashFlow', [st.vendorBills.length, st.cashFlow.length], [2, 2]);
  eq('3. isVendorBillGst ignores default gstPercent when taxAmount=0 and isGstBill undefined',
    Acc.isVendorBillGst({ taxAmount: 0, items: [{ itemName: 'X', quantity: 1, unitCost: 100, total: 100, gstPercent: 18, gstAmount: 0 }] }),
    false
  );

  // 1. Vendor bill edit preserves original ID, no duplicate bill, preserves receipt image, reconciles stock & payment
  const edited = Acc.updateVendorBillTx(
    st,
    gstBillId,
    {
      invoiceNumber: 'SMD-101-REV',
      items: [
        {
          itemName: 'Hikvision 2MP Bullet Camera',
          quantity: 8,
          unitCost: 1000,
          gstPercent: 18,
          gstAmount: 1440,
          total: 8000,
          totalWithGst: 9440,
        },
      ],
      subtotal: 8000,
      taxAmount: 1440,
      totalAmount: 9440,
      paidAmount: 5000,
      notes: 'Edited quantity 5 -> 8',
    },
    true,
    { accountType: 'bank', bankAccountId: 'bank-1', paymentModeChoice: 'upi' }
  );
  st = edited.state;
  eq('1. Vendor bill edit preserves original ID & does not create duplicate', [st.vendorBills.length, edited.bill?.id], [2, gstBillId]);
  eq('1. Vendor bill edit preserves receipt image', edited.bill?.billImage, 'data:image/jpeg;base64,RECEIPT_ORIG');
  eq('1. Vendor bill edit reconciles stock delta (5 -> 8)', st.inventory[0].currentStock, 8);
  eq('1. Vendor bill edit updates cashFlow in-place to 5000 without duplicating',
    st.cashFlow.filter(c => c.referenceId === gstBillId).map(c => c.amount),
    [5000]
  );

  // 11. Repeated identical saves do NOT duplicate stock or payments
  const txCountBeforeRepeat = st.stockTx.length;
  const cfCountBeforeRepeat = st.cashFlow.length;
  const repeat1 = Acc.updateVendorBillTx(st, gstBillId, { notes: 'Saved again' }, true);
  const repeat2 = Acc.updateVendorBillTx(repeat1.state, gstBillId, { notes: 'Saved third time' }, true);
  st = repeat2.state;
  eq('11. Repeated saves do not duplicate stock qty', st.inventory[0].currentStock, 8);
  eq('11. Repeated saves do not duplicate stockTx rows', st.stockTx.length, txCountBeforeRepeat);
  eq('11. Repeated saves do not duplicate cashFlow rows', st.cashFlow.length, cfCountBeforeRepeat);

  // 4. Simulate 6 cameras sold (currentStock drops from 8 -> 2), then convert GST bill -> Without-GST
  st = Acc.recordStockMovementTx(st, st.inventory[0].id, 'out', 6, 'Customer CCTV Install Sale');
  eq('4. Pre-conversion stock after selling 6 of 8 is 2', st.inventory[0].currentStock, 2);
  const txCountBeforeConvert = st.stockTx.length;

  const converted = Acc.updateVendorBillTx(
    st,
    gstBillId,
    {
      isGstBill: false,
      taxAmount: 0,
      items: [
        {
          itemName: 'Hikvision 2MP Bullet Camera',
          quantity: 8,
          unitCost: 1000,
          gstPercent: 0,
          gstAmount: 0,
          total: 8000,
          totalWithGst: 8000,
        },
      ],
      totalAmount: 8000,
      paidAmount: 5000,
    },
    false
  );
  st = converted.state;
  eq('4. Converting GST -> Without-GST safely clamps stock to 0 (never negative, protects sold stock)', st.inventory[0].currentStock, 0);
  eq('4. Converting GST -> Without-GST preserves stockTx audit history (appends reversal entry)', st.stockTx.length, txCountBeforeConvert + 1);
  eq('4. Reversal audit entry records exact safe reversal qty (2 of 8)', [st.stockTx[0].type, st.stockTx[0].quantity], ['out', 2]);
  eq('4. Converting Without-GST -> GST without confirmation (updateStock=false) does not add stock',
    Acc.updateVendorBillTx(st, nonGstAdd.bill.id, { isGstBill: true, taxAmount: 1440 }, false).state.inventory[0].currentStock,
    0
  );
}

// ============================================================================
// 5 & 6: Job Card Edit Preserves Job ID + Customer Sync Across Linked Records
// ============================================================================
{
  const customers: Customer[] = [
    {
      id: 'cust-101',
      slNo: 1,
      name: 'Arun Kumar',
      area: 'Simmakkal',
      phone: '9876543210',
      about: 'Regular CCTV Client',
      reference: 'Direct',
      details: '',
      phoneBook: 'Yes',
      createdAt: '2026-10-01T10:00:00Z',
    },
    {
      id: 'cust-202',
      slNo: 2,
      name: 'Bala Traders',
      area: 'KK Nagar',
      phone: '9123456789',
      about: 'Desktop AMC',
      reference: 'Walk-in',
      details: '',
      phoneBook: 'Yes',
      createdAt: '2026-10-02T10:00:00Z',
    },
  ];

  const jobCards: JobCard[] = [
    {
      id: 'job-doc-1',
      jobId: 'SGS-2026-001',
      customerId: 'cust-101',
      customerName: 'Arun Kumar',
      customerPhone: '9876543210',
      customerArea: 'Simmakkal',
      type: 'service',
      category: 'laptop',
      deviceBrand: 'Dell',
      deviceModel: 'Inspiron 15',
      serialNumber: 'DL-1122',
      issueDescription: 'No power',
      status: 'in_process',
      intakeDate: '2026-11-10',
      estimatedDelivery: '2026-11-12',
      devicePhotos: [],
      estimatedCost: 2500,
      finalCost: 0,
      priority: 'P2',
      timeline: [{ id: 'evt-1', stage: 'in_process', stageLabel: 'In Process', timestamp: '2026-11-10T10:00:00Z', notes: 'Checked adapter' }],
      updatedAt: '2026-11-10',
    },
    {
      // Legacy job card with missing customerId, linked by phone (+91 format)
      id: 'job-doc-legacy',
      jobId: 'SGS-2026-002',
      customerId: '',
      customerName: 'Arun K',
      customerPhone: '+91 98765 43210',
      customerArea: 'Old Area',
      type: 'service',
      category: 'cctv',
      deviceBrand: 'Hikvision',
      issueDescription: 'DVR HDD error',
      status: 'received',
      intakeDate: '2026-11-11',
      devicePhotos: [],
      estimatedCost: 1200,
      finalCost: 0,
      updatedAt: '2026-11-11',
    },
    {
      // Unrelated customer job card
      id: 'job-doc-other',
      jobId: 'SGS-2026-003',
      customerId: 'cust-202',
      customerName: 'Bala Traders',
      customerPhone: '9123456789',
      customerArea: 'KK Nagar',
      type: 'sales',
      category: 'desktop',
      deviceBrand: 'HP',
      issueDescription: 'SSD Upgrade',
      status: 'received',
      intakeDate: '2026-11-11',
      devicePhotos: [],
      estimatedCost: 3000,
      finalCost: 0,
      updatedAt: '2026-11-11',
    },
  ];

  const invoices: Invoice[] = [
    {
      id: 'inv-1',
      invoiceNumber: 'SGS-INV-501',
      type: 'invoice',
      customerId: 'cust-101',
      customerName: 'Arun Kumar',
      customerPhone: '9876543210',
      customerArea: 'Simmakkal',
      jobCardId: 'job-doc-1',
      date: '2026-11-12',
      items: [],
      subtotal: 2000,
      gstPercent: 0,
      taxAmount: 0,
      grandTotal: 2000,
      paymentStatus: 'unpaid',
      paymentMode: 'upi',
      paidAmount: 0,
      status: 'active',
    },
  ];

  const quotations: ManualQuotation[] = [];

  // 5. Job card edit preserves original id, jobId, and timeline history without duplicating
  const editedJobRes = applyJobCardEdit(
    jobCards,
    'job-doc-1',
    {
      jobId: 'SHOULD-NOT-CHANGE', // must be ignored so original jobId is preserved
      deviceBrand: 'Dell Latitude',
      deviceModel: 'E7490',
      serialNumber: 'DL-9988',
      issueDescription: 'No power + hinge crack',
      priority: 'P1',
      assignedEmployeeId: 'emp-1',
      assignedTechnician: 'Karthik',
      estimatedCost: 3500,
      estimatedDelivery: '2026-11-15',
      technicianNotes: 'Motherboard IC replaced',
    },
    {
      stage: 'in_process',
      stageLabel: 'Job Card Edited',
      timestamp: '2026-11-12T12:00:00Z',
      notes: 'Updated priority and staff',
    }
  );
  eq('5. Job card edit does not create duplicate job card', editedJobRes.jobCards.length, 3);
  eq('5. Job card edit preserves original id and jobId', [editedJobRes.updatedJob?.id, editedJobRes.updatedJob?.jobId], ['job-doc-1', 'SGS-2026-001']);
  eq('5. Job card edit preserves existing timeline and appends audit event', editedJobRes.updatedJob?.timeline?.length, 2);
  eq('5. Job card edit updates deviceModel, priority, assigned staff & notes', [
    editedJobRes.updatedJob?.deviceModel,
    editedJobRes.updatedJob?.priority,
    editedJobRes.updatedJob?.assignedTechnician,
    editedJobRes.updatedJob?.estimatedCost,
  ], ['E7490', 'P1', 'Karthik', 3500]);

  // 6. Customer name, phone & area edit synchronizes to linked Job Cards (by customerId AND legacy phone) and Invoices
  const syncRes = syncCustomerDetailsAcrossRecords(
    'cust-101',
    { name: 'Arun Kumar (Updated)', phone: '9876500000', area: 'Anna Nagar' },
    { customers, jobCards: editedJobRes.jobCards, invoices, quotations }
  );
  eq('6. Customer sync updates both primary-linked and legacy phone-linked job cards', syncRes.changedJobCards.length, 2);
  eq('6. Linked job card reflects new customer name, phone & area', [
    syncRes.jobCards[0].customerName,
    syncRes.jobCards[0].customerPhone,
    syncRes.jobCards[0].customerArea,
  ], ['Arun Kumar (Updated)', '9876500000', 'Anna Nagar']);
  eq('6. Legacy phone-matched job card backfills customerId & updates name', [
    syncRes.jobCards[1].customerId,
    syncRes.jobCards[1].customerName,
  ], ['cust-101', 'Arun Kumar (Updated)']);
  eq('6. Unrelated customer job card is untouched', syncRes.jobCards[2].customerName, 'Bala Traders');
  eq('6. Linked invoice reflects updated customer name, phone & customerArea', [
    syncRes.changedInvoices.length,
    syncRes.invoices[0].customerName,
    syncRes.invoices[0].customerArea,
  ], [1, 'Arun Kumar (Updated)', 'Anna Nagar']);

  // Repeated identical customer save triggers ZERO redundant Firestore updates
  const repeatSync = syncCustomerDetailsAcrossRecords(
    'cust-101',
    { name: 'Arun Kumar (Updated)', phone: '9876500000', area: 'Anna Nagar' },
    { customers: syncRes.customers, jobCards: syncRes.jobCards, invoices: syncRes.invoices, quotations: syncRes.quotations }
  );
  eq('6. Identical customer save produces 0 redundant job/invoice writes', [
    repeatSync.changedJobCards.length,
    repeatSync.changedInvoices.length,
  ], [0, 0]);
}

// ============================================================================
// 7, 8, 9, 10: Shared WhatsApp Pending Calculation (Billing & Invoices == Job Cards)
// ============================================================================
{
  const customers: Customer[] = [
    {
      id: 'cust-gladis',
      slNo: 10,
      name: 'Gladis',
      area: 'Madurai',
      phone: '9842100111',
      about: '',
      reference: '',
      details: '',
      phoneBook: 'Yes',
      createdAt: '2026-09-01T00:00:00Z',
    },
  ];

  const job: JobCard = {
    id: 'job-gladis-new',
    jobId: 'SGS-2026-009',
    customerId: 'cust-gladis',
    customerName: 'Gladis Old Stale Name', // intentionally stale to verify live customer name resolution
    customerPhone: '9842100111',
    customerArea: 'Madurai',
    type: 'service',
    category: 'cctv',
    deviceBrand: 'Hikvision',
    issueDescription: 'Camera repair',
    status: 'payment_pending',
    intakeDate: '2026-11-15',
    devicePhotos: [],
    estimatedCost: 9999, // MUST NOT substitute when actual invoices exist
    finalCost: 0,
    updatedAt: '2026-11-15',
  };

  const invoices: Invoice[] = [
    // Old bill (legacy phone match without customerId): ₹3,000 billed, ₹1,000 paid via legacy cashFlow -> ₹2,000 pending
    {
      id: 'inv-old',
      invoiceNumber: 'SGS-INV-101',
      type: 'invoice',
      customerId: '',
      customerName: 'Gladis',
      customerPhone: '+91 98421-00111',
      date: '2026-09-10',
      items: [],
      subtotal: 3000,
      gstPercent: 0,
      taxAmount: 0,
      grandTotal: 3000,
      paymentStatus: 'partial',
      paymentMode: 'cash',
      paidAmount: 1000,
      status: 'active',
    },
    // New bill (linked to job + customerId): ₹2,500 billed; ₹1,000 paid (active) + ₹500 reversed + ₹200 refunded -> valid paid = ₹800 -> ₹1,700 pending
    {
      id: 'inv-new',
      invoiceNumber: 'SGS-INV-205',
      type: 'invoice',
      customerId: 'cust-gladis',
      customerName: 'Gladis',
      customerPhone: '9842100111',
      jobCardId: 'job-gladis-new',
      date: '2026-11-15',
      items: [],
      subtotal: 2500,
      gstPercent: 0,
      taxAmount: 0,
      grandTotal: 2500,
      paymentStatus: 'partial',
      paymentMode: 'upi',
      paidAmount: 1500, // intentionally stale to verify ledger payments + reversed + refunds are authoritative!
      status: 'active',
    },
    // Cancelled bill: ₹4,000 MUST be excluded
    {
      id: 'inv-cancelled',
      invoiceNumber: 'SGS-INV-206',
      type: 'invoice',
      customerId: 'cust-gladis',
      customerName: 'Gladis',
      customerPhone: '9842100111',
      date: '2026-11-16',
      items: [],
      subtotal: 4000,
      gstPercent: 0,
      taxAmount: 0,
      grandTotal: 4000,
      paymentStatus: 'cancelled',
      paymentMode: 'cash',
      paidAmount: 0,
      status: 'cancelled',
    },
    // Quotation: ₹6,000 MUST be excluded
    {
      id: 'quot-1',
      invoiceNumber: 'SGS-QUOT-301',
      type: 'quotation',
      customerId: 'cust-gladis',
      customerName: 'Gladis',
      customerPhone: '9842100111',
      date: '2026-11-16',
      items: [],
      subtotal: 6000,
      gstPercent: 0,
      taxAmount: 0,
      grandTotal: 6000,
      paymentStatus: 'unpaid',
      paymentMode: 'cash',
      paidAmount: 0,
      status: 'active',
    },
  ];

  const invoicePayments: InvoicePaymentRecord[] = [
    // Active partial payment on inv-new (linked to cf-pay-1 -> MUST NOT double count!)
    {
      id: 'pay-1',
      paymentReference: 'PAY-1',
      invoiceId: 'inv-new',
      invoiceNumber: 'SGS-INV-205',
      customerId: 'cust-gladis',
      customerName: 'Gladis',
      amount: 1000,
      date: '2026-11-15',
      paymentMode: 'upi',
      accountType: 'bank',
      cashFlowEntryId: 'cf-pay-1',
      createdAt: '2026-11-15T10:00:00Z',
    },
    // Reversed payment on inv-new (₹500 -> MUST be excluded!)
    {
      id: 'pay-2-rev',
      paymentReference: 'PAY-2',
      invoiceId: 'inv-new',
      invoiceNumber: 'SGS-INV-205',
      customerId: 'cust-gladis',
      customerName: 'Gladis',
      amount: 500,
      date: '2026-11-15',
      paymentMode: 'upi',
      accountType: 'bank',
      cashFlowEntryId: 'cf-pay-2-rev',
      isReversed: true,
      createdAt: '2026-11-15T11:00:00Z',
    },
  ];

  const cashFlow: CashFlowEntry[] = [
    // Legacy cashFlow payment on inv-old (₹1,000)
    {
      id: 'cf-old-1',
      date: '2026-09-10',
      type: 'income',
      category: 'Service Charge',
      description: 'Old bill part payment',
      amount: 1000,
      paymentMode: 'cash',
      referenceId: 'inv-old',
    },
    // Matching cashFlow entry for pay-1 (₹1,000 -> MUST NOT double count with pay-1!)
    {
      id: 'cf-pay-1',
      date: '2026-11-15',
      type: 'income',
      category: 'Customer Payment',
      description: 'UPI payment for inv-new',
      amount: 1000,
      paymentMode: 'upi',
      referenceId: 'inv-new',
      invoiceId: 'inv-new',
      paymentRecordId: 'pay-1',
    },
    // Matching cashFlow entry for reversed pay-2-rev (even if isReversed omitted on cf, paymentRecordId links to reversed pay-2-rev -> MUST NOT count!)
    {
      id: 'cf-pay-2-rev',
      date: '2026-11-15',
      type: 'income',
      category: 'Customer Payment',
      description: 'Reversed UPI payment',
      amount: 500,
      paymentMode: 'upi',
      referenceId: 'inv-new',
      invoiceId: 'inv-new',
      paymentRecordId: 'pay-2-rev',
    },
    // Customer refund on inv-new (₹200 expense -> reduces net valid paid from 1000 to 800)
    {
      id: 'cf-refund-1',
      date: '2026-11-16',
      type: 'expense',
      category: 'Customer Refund',
      description: 'Partial refund',
      amount: 200,
      paymentMode: 'cash',
      referenceId: 'inv-new',
      invoiceId: 'inv-new',
    },
  ];

  // Billing & Invoices view calculation
  const billingSummary = calculateCustomerPendingSummary({
    seedInvoice: invoices[1],
    customerId: invoices[1].customerId,
    customerName: invoices[1].customerName,
    customerPhone: invoices[1].customerPhone,
    invoices,
    invoicePayments,
    cashFlow,
    customers,
  });

  // Job Card view calculation
  const jobSummary = getCustomerPendingSummaryForJob(job, [], invoices, invoicePayments, customers, cashFlow);

  // Expected math:
  // Valid invoices = inv-old (3000) + inv-new (2500) = 5500 (cancelled 4000 & quotation 6000 excluded)
  // Valid payments = inv-old (1000) + inv-new (1000 - 200 refund, reversed 500 excluded, no double count) = 1800
  // Actual Pending = 5500 - 1800 = 3700 (inv-old: 2000 + inv-new: 1700)
  eq('7 & 9. Valid invoices include old + new and exclude cancelled + quotations', billingSummary.allValidInvoices.length, 2);
  eq('8 & 10. Total valid billed / valid paid / actual pending = 5500 / 1800 / 3700', [
    billingSummary.totalValidInvoiceAmount,
    billingSummary.totalValidPaymentsReceived,
    billingSummary.totalPending,
  ], [5500, 1800, 3700]);
  eq('7. Billing & Invoices and Job Card produce IDENTICAL pending total', jobSummary.totalPendingAcrossBills, billingSummary.totalPending);
  eq('7. Billing & Invoices and Job Card produce IDENTICAL pending bill list',
    jobSummary.allPendingInvoices.map(i => [i.invoiceNumber, i.paidAmount]),
    billingSummary.pendingInvoices.map(i => [i.invoiceNumber, i.paidAmount])
  );
  eq('7. Live customer name resolved over stale job.customerName', jobSummary.liveCustomer?.name, 'Gladis');

  const waBillingMsg = buildCustomerPendingWhatsAppMessage({
    customerName: billingSummary.customerName,
    pendingInvoices: billingSummary.pendingInvoices,
    totalOutstanding: billingSummary.totalPending,
  });
  const waJobMsg = buildCustomerPendingWhatsAppMessage({
    customerName: jobSummary.liveCustomer?.name || job.customerName,
    pendingInvoices: jobSummary.allPendingInvoices,
    totalOutstanding: jobSummary.totalPendingAcrossBills,
  });
  eq('7. WhatsApp Pending message text is IDENTICAL between Billing & Job Cards', waJobMsg, waBillingMsg);
  eq('7. WhatsApp Pending message contains ₹3,700 total', waJobMsg.includes('₹3,700'), true);
}

console.log(fails ? `\n${fails} FAILED` : '\nALL RECOVERY REGRESSION TESTS PASSED');
if (fails > 0) process.exit(1);
