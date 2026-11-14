import * as A from '../src/utils/accounting.ts';
import * as MF from '../src/utils/moneyFlow.ts';
import type {
  BankAccount,
  Customer,
  CustomerPaymentAllocation,
  InvoicePaymentRecord,
  JobCard,
  ManualQuotation,
  VendorPaymentRecord,
} from '../src/types.ts';

let fails = 0;
const eq = (name: string, got: any, want: any) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(
    ok ? 'PASS' : 'FAIL',
    name,
    ok ? '' : `\n     got=${JSON.stringify(got)}\n    want=${JSON.stringify(want)}`
  );
};

const assertTrue = (name: string, cond: boolean, detail = '') => {
  if (!cond) fails++;
  console.log(cond ? 'PASS' : 'FAIL', name, cond ? '' : detail);
};

const sbiBank: BankAccount = {
  id: 'bank-sbi',
  bankName: 'State Bank of India',
  accountHolder: 'Spider Grid Solutions',
  accountNumber: '123456789012',
  accountType: 'current',
  openingBalance: 10000,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
};

const banks: BankAccount[] = [sbiBank];

// 1. Dynamic 3-level Category CRUD: create, rename, deactivate preserving historical entries
let cats = MF.ensureDefaultCategories([]);
const snacksL2 = MF.createMoneyFlowCategoryNode(cats, {
  name: 'Snacks',
  level: 2,
  parentId: 'mfc-food',
  type: 'expense',
});
cats = snacksL2.categories;
const snacksOfficeL3 = MF.createMoneyFlowCategoryNode(cats, {
  name: 'Office Counter',
  level: 3,
  parentId: snacksL2.category.id,
  type: 'expense',
});
cats = snacksOfficeL3.categories;
cats = MF.renameMoneyFlowCategoryNode(cats, snacksOfficeL3.category.id, 'Madurai Office');
cats = MF.toggleMoneyFlowCategoryNodeActive(cats, snacksL2.category.id, false);
const inactiveSnacks = cats.find(c => c.id === snacksL2.category.id);
eq('1a. 3-level category renamed & deactivated without deleting node', [inactiveSnacks?.isActive, cats.find(c => c.id === snacksOfficeL3.category.id)?.name], [false, 'Madurai Office']);

// 2. Duplicate category name blocked under same parent, allowed under different parent
let dupBlocked = false;
try {
  MF.createMoneyFlowCategoryNode(cats, {
    name: '  tea ',
    level: 2,
    parentId: 'mfc-food',
    type: 'expense',
  });
} catch {
  dupBlocked = true;
}
assertTrue('2a. duplicate subcategory under same parent blocked', dupBlocked);

const travelOfficeL3 = MF.createMoneyFlowCategoryNode(cats, {
  name: 'Office',
  level: 3,
  parentId: 'mfc-travel-petrol',
  type: 'expense',
});
assertTrue('2b. same leaf name allowed under different parent', !!travelOfficeL3.category.id);

// 3 & 4. Account validation for Cash / Bank / UPI / Other + Cash expense tracking
const cashValid = MF.validatePaymentAccountSelection({
  paymentModeChoice: 'cash',
  accountType: 'cash',
  bankAccounts: banks,
});
eq('3a. Cash auto-resolves to Cash Account', cashValid.resolvedAccountType, 'cash');

const upiMissingBank = MF.validatePaymentAccountSelection({
  paymentModeChoice: 'upi',
  accountType: 'bank',
  bankAccountId: '',
  bankAccounts: banks,
});
eq('4a. UPI with Bank selected requires a specific BankAccountId', upiMissingBank.valid, false);

const upiCashValid = MF.validatePaymentAccountSelection({
  paymentModeChoice: 'upi',
  accountType: 'cash',
  bankAccounts: banks,
});
eq('4b. UPI routed to Cash Account is valid', [upiCashValid.valid, upiCashValid.resolvedAccountType], [true, 'cash']);

const otherMissingRef = MF.validatePaymentAccountSelection({
  paymentModeChoice: 'other',
  accountType: 'bank',
  bankAccountId: sbiBank.id,
  bankAccounts: banks,
  transactionRef: '   ',
});
eq('4c. Other mode requires reference/description', otherMissingRef.valid, false);

const otherValid = MF.validatePaymentAccountSelection({
  paymentModeChoice: 'other',
  accountType: 'bank',
  bankAccountId: sbiBank.id,
  bankAccounts: banks,
  transactionRef: 'CHQ-7712',
});
eq('4d. Other mode with bank + ref passes', [otherValid.valid, otherValid.resolvedBankAccountId], [true, 'bank-sbi']);

// 5. New Invoice saves unpaid (paidAmount = 0, paymentStatus = 'unpaid', 0 Money Flow entries)
let ledger: A.LedgerState = { inventory: [], stockTx: [], cashFlow: [], invoices: [], vendorBills: [] };
let invPayments: InvoicePaymentRecord[] = [];
let custAllocs: CustomerPaymentAllocation[] = [];
let vendPays: VendorPaymentRecord[] = [];

const customer: Customer = {
  id: 'cust-karthik',
  slNo: 1,
  name: 'Karthik Electronics',
  area: 'Anna Nagar',
  phone: '9876543210',
  about: 'CCTV',
  reference: 'Direct',
  details: 'Shop owner',
  phoneBook: 'Yes',
  createdAt: '2026-11-10',
};

const inv1Add = A.addInvoiceTx(ledger, {
  invoiceNumber: 'SGS-INV-2001',
  type: 'invoice',
  billingFirm: 'sgs',
  customerId: customer.id,
  customerName: customer.name,
  customerPhone: customer.phone,
  jobCardId: 'job-1',
  date: '2026-11-10',
  items: [{ description: '4CH CCTV Setup', quantity: 1, rate: 10000, amount: 10000, gstPercent: 0, gstAmount: 0, totalWithGst: 10000 }],
  subtotal: 10000,
  gstPercent: 0,
  taxAmount: 0,
  grandTotal: 10000,
  paymentStatus: 'unpaid',
  paymentMode: 'cash',
  paidAmount: 0,
} as any);
ledger = inv1Add.state;
const inv1 = inv1Add.invoice;
eq('5. New invoice saved unpaid with 0 Money Flow entries', [inv1.paidAmount, inv1.paymentStatus, ledger.cashFlow.length], [0, 'unpaid', 0]);

// 6. Incremental invoice payments: Cash ₹3,000 then UPI (SBI Bank) ₹2,000
const p1 = A.recordInvoicePaymentTx(ledger, invPayments, {
  invoiceId: inv1.id,
  customerId: customer.id,
  customerName: customer.name,
  customerPhone: customer.phone,
  amount: 3000,
  date: '2026-11-10',
  paymentMode: 'cash',
  paymentModeChoice: 'cash',
  accountType: 'cash',
  uniqueSourceKey: 'pay-key-1',
});
ledger = p1.state;
invPayments = p1.invoicePayments;

const p2 = A.recordInvoicePaymentTx(ledger, invPayments, {
  invoiceId: inv1.id,
  customerId: customer.id,
  customerName: customer.name,
  customerPhone: customer.phone,
  amount: 2000,
  date: '2026-11-11',
  paymentMode: 'upi',
  paymentModeChoice: 'upi',
  accountType: 'bank',
  bankAccountId: sbiBank.id,
  bankAccountName: sbiBank.bankName,
  transactionRef: 'UTR-8812',
  uniqueSourceKey: 'pay-key-2',
});
ledger = p2.state;
invPayments = p2.invoicePayments;

const inv1After = ledger.invoices.find(i => i.id === inv1.id)!;
const cashInTotal = ledger.cashFlow.filter(c => !c.isReversed && c.accountType === 'cash' && c.type === 'income').reduce((s, c) => s + c.amount, 0);
const bankInTotal = ledger.cashFlow.filter(c => !c.isReversed && c.bankAccountId === sbiBank.id && c.type === 'income').reduce((s, c) => s + c.amount, 0);
eq('6. Incremental payments split accurately between Cash & Bank', [inv1After.paidAmount, inv1After.paymentStatus, A.amountDue(inv1After), cashInTotal, bankInTotal], [5000, 'partial', 5000, 3000, 2000]);

// 7. Second invoice for same customer keeps independent balance; customer totalPending combines both
const inv2Add = A.addInvoiceTx(ledger, {
  invoiceNumber: 'SGS-INV-2002',
  type: 'invoice',
  billingFirm: 'sgs',
  customerId: customer.id,
  customerName: customer.name,
  customerPhone: customer.phone,
  date: '2026-11-12',
  items: [{ description: 'SSD Upgrade', quantity: 1, rate: 5000, amount: 5000, gstPercent: 0, gstAmount: 0, totalWithGst: 5000 }],
  subtotal: 5000,
  gstPercent: 0,
  taxAmount: 0,
  grandTotal: 5000,
  paymentStatus: 'unpaid',
  paymentMode: 'cash',
  paidAmount: 0,
} as any);
ledger = inv2Add.state;
const inv2 = inv2Add.invoice;

const custSummaryBeforeMulti = MF.getCustomerFinancialSummary(customer, ledger.invoices, invPayments, custAllocs);
eq('7. Customer summary sums individual pending bills without merging', [custSummaryBeforeMulti.totalBills, custSummaryBeforeMulti.totalBilled, custSummaryBeforeMulti.totalPaid, custSummaryBeforeMulti.totalPending], [2, 15000, 5000, 10000]);

// 8. Multi-invoice customer payment with excess stored as explicit unallocatedCredit
const multiRes = A.recordCustomerMultiPaymentTx(ledger, invPayments, custAllocs, {
  customerId: customer.id,
  customerName: customer.name,
  customerPhone: customer.phone,
  totalAmount: 11500,
  date: '2026-11-13',
  paymentMode: 'bank_transfer',
  paymentModeChoice: 'bank',
  accountType: 'bank',
  bankAccountId: sbiBank.id,
  transactionRef: 'NEFT-9901',
  allocations: [
    { invoiceId: inv1.id, amount: 5000 },
    { invoiceId: inv2.id, amount: 5000 },
  ],
  uniqueSourceKey: 'multi-key-1',
});
ledger = multiRes.state;
invPayments = multiRes.invoicePayments;
custAllocs = multiRes.customerAllocations;

const custSummaryAfterMulti = MF.getCustomerFinancialSummary(customer, ledger.invoices, invPayments, custAllocs);
eq('8. Multi-bill allocation settles both bills & preserves ₹1500 advance credit', [custSummaryAfterMulti.totalPending, custSummaryAfterMulti.unallocatedCredit, multiRes.allocation.unallocatedAmount], [0, 1500, 1500]);

// 9. Job Card summary: Quotation Model 1..5, Linked Bills + Unlinked Job Advance, and job.status untouched
const jobCard: JobCard = {
  id: 'job-1',
  jobId: 'SGS-2026-001',
  customerId: customer.id,
  customerName: customer.name,
  customerPhone: customer.phone,
  customerArea: customer.area,
  type: 'service',
  category: 'cctv',
  deviceBrand: 'Hikvision 4CH',
  issueDescription: 'No display on DVR',
  status: 'in_process',
  intakeDate: '2026-11-10',
  devicePhotos: [],
  callCompleted: false,
  estimatedCost: 10000,
  finalCost: 0,
  updatedAt: '2026-11-10T10:00:00Z',
  priority: 'P3',
};

const emptyCharges = { installation: 0, helperFees: 0, commission: 0, margin: 0, petrolVisit: 0, customerReduction: 0 };

const m1 = {
  name: 'Standard 2MP',
  items: [{ id: '1', description: 'Camera', quantity: 4, unit: 'Nos', unitPrice: 2360, itemTotal: 9440 }],
  internalCharges: emptyCharges,
  totalItemRate: 9440,
  totalDisplayAmount: 9440,
  finalModelTotal: 9440,
};

const m2 = {
  name: 'Pro Night Vision',
  items: [{ id: '2', description: 'ColorVu', quantity: 4, unit: 'Nos', unitPrice: 2950, itemTotal: 11800 }],
  internalCharges: emptyCharges,
  totalItemRate: 11800,
  totalDisplayAmount: 11800,
  finalModelTotal: 11800,
};

const quote: ManualQuotation = {
  id: 'mq-1',
  quotationNumber: 'SGS-MQ-101',
  customerId: customer.id,
  customerName: customer.name,
  customerPhone: customer.phone,
  jobCardId: jobCard.id,
  date: '2026-11-10',
  validityDays: 15,
  validUntil: '2026-11-25',
  status: 'Sent',
  selectedModel: 'Model 2',
  version: 2,
  history: [{ version: 1, updatedAt: '2026-11-10', model1: m1, termsAndConditions: '', validityDays: 15, validUntil: '2026-11-25', notes: 'Initial' }],
  model1: m1,
  model2: m2,
  model3: { name: 'IP PoE', items: [], internalCharges: emptyCharges, totalItemRate: 0, totalDisplayAmount: 14500, finalModelTotal: 14500 },
  termsAndConditions: '',
  createdAt: '2026-11-10T10:00:00Z',
  updatedAt: '2026-11-10T11:00:00Z',
};

const jobAdv = A.recordInvoicePaymentTx(ledger, invPayments, {
  jobCardId: jobCard.id,
  customerId: customer.id,
  customerName: customer.name,
  amount: 1000,
  date: '2026-11-10',
  paymentMode: 'cash',
  accountType: 'cash',
  isAdvance: true,
  uniqueSourceKey: 'job-adv-1',
});
ledger = jobAdv.state;
invPayments = jobAdv.invoicePayments;

const jobFin = MF.getJobCardFinancialSummary(jobCard, [quote], ledger.invoices, invPayments);
eq(
  '9. JobCard summary reads Model 1-3, billed ₹10k + unlinked adv ₹1k, status stays in_process',
  [jobFin.quotationModelSummaries[0].models.length, jobFin.totalBilled, jobFin.totalUnlinkedAdvance, jobFin.totalPaid, jobCard.status],
  [3, 10000, 1000, 11000, 'in_process']
);

// 10. Advanced Reports: Expense + Filtering + 3-level Category Tree + CSV export
ledger = {
  ...ledger,
  cashFlow: [
    {
      id: 'cf-exp-tea',
      date: '2026-11-11',
      type: 'expense',
      category: 'Food Expenses',
      categoryId: 'mfc-food',
      categoryName: 'Food Expenses',
      subcategory: 'Tea',
      subcategoryId: 'mfc-food-tea',
      secondSubcategory: 'Office',
      secondSubcategoryId: 'mfc-food-tea-office',
      description: 'Evening tea for staff',
      amount: 500,
      paymentMode: 'cash',
      accountType: 'cash',
    },
    ...ledger.cashFlow,
  ],
};

const filteredExpenses = MF.filterAndSortCashFlow(
  ledger.cashFlow,
  {
    datePreset: 'custom',
    customFrom: '2026-11-10',
    customTo: '2026-11-15',
    type: 'expense',
    categoryFilter: 'mfc-food',
    subcategoryFilter: 'mfc-food-tea',
    secondSubcategoryFilter: 'mfc-food-tea-office',
    accountFilter: 'cash',
    sortBy: 'amount_desc',
  },
  cats,
  banks
);
const tree = MF.buildThreeLevelCategoryTree(filteredExpenses, cats);
const csv = MF.cashFlowToReportCsv(filteredExpenses, cats, banks);
eq('10a. 3-level report filter & tree aggregation matches ₹500', [filteredExpenses.length, tree[0]?.amount, tree[0]?.children[0]?.children[0]?.name], [1, 500, 'Office']);
assertTrue('10b. CSV report includes headers and Office cell', csv.includes('Date,Type,Category,Subcategory,2nd Subcategory') && csv.includes('Office'));

// 11. WhatsApp Pending Message includes all pending bills, UPI ID, and Madurai phone
const pendingWa = MF.buildCustomerPendingWhatsAppMessage({
  customerName: 'Ravi Kumar',
  pendingInvoices: [
    { invoiceNumber: 'SGS-INV-101', date: '2026-11-01', grandTotal: 10000, paidAmount: 3000 },
    { invoiceNumber: 'SGS-INV-102', date: '2026-11-05', grandTotal: 5000, paidAmount: 0 },
  ],
});
assertTrue(
  '11. WhatsApp Pending lists both bills, ₹12,000 total, UPI & helpline',
  pendingWa.includes('SGS-INV-101') &&
    pendingWa.includes('SGS-INV-102') &&
    pendingWa.includes('12,000') &&
    pendingWa.includes('9176795665@okbizaxis') &&
    pendingWa.includes('9176795665')
);

// 12. WhatsApp Thank You message distinguishes partial vs fully paid + other bills pending
const thankPartial = MF.buildPaymentThankYouWhatsAppMessage({
  customerName: 'Ravi Kumar',
  paidAmount: 3000,
  paymentModeLabel: 'UPI',
  accountLabel: 'State Bank of India',
  date: '2026-11-10',
  invoiceNumber: 'SGS-INV-101',
  invoiceTotal: 10000,
  invoicePaid: 3000,
  invoiceRemaining: 7000,
  otherPendingTotal: 5000,
  otherPendingCount: 1,
});
const thankFull = MF.buildPaymentThankYouWhatsAppMessage({
  customerName: 'Ravi Kumar',
  paidAmount: 7000,
  paymentModeLabel: 'Cash',
  date: '2026-11-12',
  invoiceNumber: 'SGS-INV-101',
  invoiceTotal: 10000,
  invoicePaid: 10000,
  invoiceRemaining: 0,
});
assertTrue(
  '12. WhatsApp Thank You distinguishes Partial+OtherPending vs FULLY PAID',
  thankPartial.includes('7,000') &&
    thankPartial.includes('5,000') &&
    thankFull.includes('FULLY PAID')
);

// 13. Idempotency via uniqueSourceKey prevents duplicate payment & cashflow
const dupPayAttempt = A.recordInvoicePaymentTx(ledger, invPayments, {
  jobCardId: jobCard.id,
  customerId: customer.id,
  customerName: customer.name,
  amount: 1000,
  date: '2026-11-10',
  paymentMode: 'cash',
  accountType: 'cash',
  isAdvance: true,
  uniqueSourceKey: 'job-adv-1',
});
eq('13. Duplicate uniqueSourceKey prevented double recording', [dupPayAttempt.duplicate, dupPayAttempt.invoicePayments.length], [true, invPayments.length]);

// 14. Audit-safe reversal restores unpaid state without deleting audit record
const inv3Add = A.addInvoiceTx(ledger, {
  invoiceNumber: 'SGS-INV-2003',
  type: 'invoice',
  billingFirm: 'sgs',
  customerId: customer.id,
  customerName: customer.name,
  date: '2026-11-14',
  items: [{ description: 'Router', quantity: 1, rate: 2500, amount: 2500, gstPercent: 0, gstAmount: 0, totalWithGst: 2500 }],
  subtotal: 2500,
  gstPercent: 0,
  taxAmount: 0,
  grandTotal: 2500,
  paymentStatus: 'unpaid',
  paymentMode: 'cash',
  paidAmount: 0,
} as any);
ledger = inv3Add.state;
const p3 = A.recordInvoicePaymentTx(ledger, invPayments, {
  invoiceId: inv3Add.invoice.id,
  customerId: customer.id,
  customerName: customer.name,
  amount: 2500,
  date: '2026-11-14',
  paymentMode: 'cash',
  accountType: 'cash',
});
ledger = p3.state;
invPayments = p3.invoicePayments;
const rev = A.reverseInvoicePaymentTx(ledger, invPayments, p3.record.id, 'Entered wrong amount');
ledger = rev.state;
invPayments = rev.invoicePayments;
const inv3AfterRev = ledger.invoices.find(i => i.id === inv3Add.invoice.id)!;
const revRec = invPayments.find(p => p.id === p3.record.id)!;
const revCf = ledger.cashFlow.find(c => c.id === p3.cashFlowEntry!.id)!;
eq('14. Reversal resets invoice due & keeps audit-safe isReversed flags', [inv3AfterRev.paidAmount, inv3AfterRev.paymentStatus, revRec.isReversed, revCf.isReversed], [0, 'unpaid', true, true]);

// 15. Vendor incremental payment updates bill & creates linked expense cashFlow with bankAccountId
const vbAdd = A.addVendorBillTx(
  ledger,
  {
    vendorName: 'Tech Distributors',
    invoiceNumber: 'TD-501',
    invoiceDate: '2026-11-14',
    items: [{ itemName: 'Cat6 Cable Box', quantity: 2, unitCost: 3000, total: 6000, gstPercent: 0, gstAmount: 0, totalWithGst: 6000 }],
    subtotal: 6000,
    taxAmount: 0,
    totalAmount: 6000,
    paidAmount: 0,
    paymentStatus: 'pending',
  } as any,
  false
);
ledger = vbAdd.state;
const vpRes = A.recordVendorPaymentTx(ledger, vendPays, {
  vendorBillId: vbAdd.bill.id,
  amount: 2500,
  date: '2026-11-14',
  paymentMode: 'upi',
  paymentModeChoice: 'upi',
  accountType: 'bank',
  bankAccountId: sbiBank.id,
  transactionRef: 'UTR-VEND-1',
  uniqueSourceKey: 'vpay-1',
});
ledger = vpRes.state;
vendPays = vpRes.vendorPayments;
const billAfterPay = ledger.vendorBills.find(b => b.id === vbAdd.bill.id)!;
const vendCf = ledger.cashFlow.find(c => c.id === vpRes.record.cashFlowEntryId)!;
eq('15. Vendor payment records partial bill state & SBI bank expense', [billAfterPay.paidAmount, billAfterPay.paymentStatus, vendCf.bankAccountId, vendCf.amount], [2500, 'partial', sbiBank.id, 2500]);

console.log(`\nSummary: ${fails === 0 ? 'ALL TESTS PASSED' : `${fails} TEST(S) FAILED`}`);
if (fails > 0) {
  process.exit(1);
}
