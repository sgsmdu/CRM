import * as AF from '../src/utils/advancedFinance.ts';
import * as MF from '../src/utils/moneyFlow.ts';
import * as A from '../src/utils/accounting.ts';
import type {
  AttendanceRecord,
  BankAccount,
  CashFlowEntry,
  Employee,
  InvestmentAccount,
  InvestmentTransaction,
  Invoice,
  LoanAccount,
  LoanPayment,
  RecurringDueEntry,
  RecurringExpense,
  SalaryAdvance,
  SalaryPayment,
  SavingsAccount,
  SavingsTransaction,
  VendorBill,
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
  bankName: 'SBI Current Account',
  accountHolder: 'Spider Grid Solutions',
  accountNumber: '123456789012',
  accountType: 'current',
  openingBalance: 100000,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
};

const hdfcBank: BankAccount = {
  id: 'bank-hdfc',
  bankName: 'HDFC Savings',
  accountHolder: 'Spider Grid Solutions',
  accountNumber: '987654321098',
  accountType: 'savings',
  openingBalance: 25000,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
};

const banks: BankAccount[] = [sbiBank, hdfcBank];
const openingCashBalance = 20000;

// ----------------------------------------------------------------------------
// 1. Loan EMI calculation, Principal vs Interest split, non-expense Principal, duplicate EMI prevention
// ----------------------------------------------------------------------------
const reducingEmi = AF.calculateReducingEmi(100000, 12, 12);
const flatEmi = AF.calculateFlatEmi(100000, 12, 12);
assertTrue('1a. Reducing EMI ~ ₹8,884.88 & Flat EMI ₹9,333.33', reducingEmi > 8884 && reducingEmi < 8886 && Math.abs(flatEmi - 9333.33) < 0.05);

let loans: LoanAccount[] = [
  {
    id: 'loan-biz-1',
    loanName: 'Workshop Equipment Loan',
    loanType: 'business',
    lenderName: 'HDFC Bank',
    maskedAccountNumber: 'XXXX-4512',
    startDate: '2026-10-01',
    originalAmount: 100000,
    outstandingPrincipal: 100000,
    interestRate: 12,
    interestType: 'reducing',
    tenureMonths: 12,
    emiAmount: 8885,
    emiDueDay: 14,
    firstEmiDate: '2026-11-14',
    lastEmiDate: '2027-10-14',
    processingCharges: 0,
    linkedBankAccountId: sbiBank.id,
    status: 'active',
    totalPrincipalRepaid: 0,
    totalInterestPaid: 0,
    totalChargesPaid: 0,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
];
let loanPayments: LoanPayment[] = [];
let cashFlow: CashFlowEntry[] = [];

const estSplit = AF.estimateEmiBreakdown(loans[0], 8885);
eq('1b. Estimated EMI split gives ₹1,000 interest + ₹7,885 principal + estimated flag', [estSplit.interestComponent, estSplit.principalComponent, estSplit.isEstimatedBreakdown], [1000, 7885, true]);

const emiPay1 = AF.recordLoanPaymentTx(loans, loanPayments, cashFlow, {
  loanId: 'loan-biz-1',
  paymentKind: 'emi',
  paymentDate: '2026-11-14',
  emiPeriod: '2026-11',
  dueDate: '2026-11-14',
  totalPaid: 8885,
  principalComponent: estSplit.principalComponent,
  interestComponent: estSplit.interestComponent,
  chargesComponent: 0,
  isEstimatedBreakdown: estSplit.isEstimatedBreakdown,
  paymentMode: 'bank_transfer',
  paymentModeChoice: 'bank',
  accountType: 'bank',
  bankAccountId: sbiBank.id,
  bankAccountName: sbiBank.bankName,
  transactionRef: 'ECS-NOV-01',
});
loans = emiPay1.loans;
loanPayments = emiPay1.loanPayments;
cashFlow = emiPay1.cashFlow;

const principalEntry = cashFlow.find(c => c.accountingNature === 'loan_principal')!;
const interestEntry = cashFlow.find(c => c.accountingNature === 'loan_interest')!;
eq(
  '1c. Loan Principal is NOT operating expense, Interest IS operating expense, Outstanding reduced',
  [
    MF.isOperatingExpenseEntry(principalEntry),
    MF.isOperatingExpenseEntry(interestEntry),
    loans[0].outstandingPrincipal,
    loans[0].totalPrincipalRepaid,
    loans[0].totalInterestPaid,
  ],
  [false, true, 92115, 7885, 1000]
);

const dupEmiPay = AF.recordLoanPaymentTx(loans, loanPayments, cashFlow, {
  loanId: 'loan-biz-1',
  paymentKind: 'emi',
  paymentDate: '2026-11-14',
  emiPeriod: '2026-11',
  totalPaid: 8885,
  principalComponent: 7885,
  interestComponent: 1000,
  paymentMode: 'bank_transfer',
  accountType: 'bank',
  bankAccountId: sbiBank.id,
});
eq('1d. Duplicate EMI payment for same period blocked', [dupEmiPay.duplicate, dupEmiPay.loanPayments.length], [true, 1]);

// ----------------------------------------------------------------------------
// 2 & 13. Gold Loan: interest-only, closure blocked when pending > 0, closure succeeds when settled, renewal alert
// ----------------------------------------------------------------------------
const goldLoan: LoanAccount = {
  id: 'loan-gold-1',
  loanName: 'Muthoot Gold Pledge',
  loanType: 'gold',
  lenderName: 'Muthoot Finance',
  maskedAccountNumber: 'GL-9981',
  startDate: '2026-08-01',
  originalAmount: 50000,
  outstandingPrincipal: 50000,
  interestRate: 12,
  interestType: 'manual',
  tenureMonths: 12,
  emiAmount: 0,
  emiDueDay: 16,
  processingCharges: 0,
  status: 'active',
  totalPrincipalRepaid: 0,
  totalInterestPaid: 0,
  totalChargesPaid: 0,
  pledgeReferenceNumber: 'GLD-2026-88',
  goldWeightGrams: 16,
  goldPurity: '22K',
  pledgedDate: '2026-08-01',
  interestPaymentFrequency: 'monthly',
  interestDueDate: '2026-11-15',
  renewalMaturityDate: '2026-11-25',
  interestPending: 1500,
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
};
loans = [...loans, goldLoan];

const goldIntPay = AF.recordLoanPaymentTx(loans, loanPayments, cashFlow, {
  loanId: 'loan-gold-1',
  paymentKind: 'interest_only',
  paymentDate: '2026-11-14',
  totalPaid: 1000,
  principalComponent: 0,
  interestComponent: 1000,
  paymentMode: 'cash',
  paymentModeChoice: 'cash',
  accountType: 'cash',
});
loans = goldIntPay.loans;
loanPayments = goldIntPay.loanPayments;
cashFlow = goldIntPay.cashFlow;
eq('2a. Gold Loan interest-only reduces interestPending from ₹1500 to ₹500', loans.find(l => l.id === 'loan-gold-1')?.interestPending, 500);

const blockedClose = AF.recordLoanPaymentTx(loans, loanPayments, cashFlow, {
  loanId: 'loan-gold-1',
  paymentKind: 'closure',
  paymentDate: '2026-11-14',
  totalPaid: 50000,
  principalComponent: 50000,
  interestComponent: 0,
  paymentMode: 'cash',
  accountType: 'cash',
});
assertTrue('2b. Gold Loan closure blocked while ₹500 interest remains pending', Boolean(blockedClose.error) && blockedClose.loans.find(l => l.id === 'loan-gold-1')?.status === 'active');

// Check gold alerts before closing
const preCloseAlerts = AF.buildFinancialAlerts({
  loans,
  loanPayments,
  recurringExpenses: [],
  recurringDueEntries: [],
  employees: [],
  salaryPayments: [],
  attendanceRecords: [],
  salaryAdvances: [],
  asOfDate: '2026-11-14',
});
assertTrue(
  '13. Gold Loan interest & renewal maturity alerts generated within lead window',
  preCloseAlerts.some(a => a.sourceType === 'gold_renewal' && a.sourceId === 'loan-gold-1')
);

const successClose = AF.recordLoanPaymentTx(loans, loanPayments, cashFlow, {
  loanId: 'loan-gold-1',
  paymentKind: 'closure',
  paymentDate: '2026-11-14',
  totalPaid: 50500,
  principalComponent: 50000,
  interestComponent: 500,
  paymentMode: 'bank_transfer',
  paymentModeChoice: 'bank',
  accountType: 'bank',
  bankAccountId: sbiBank.id,
});
loans = successClose.loans;
loanPayments = successClose.loanPayments;
cashFlow = successClose.cashFlow;
const closedGold = loans.find(l => l.id === 'loan-gold-1')!;
eq('2c. Gold Loan closure succeeds when Principal + Pending Interest settled', [closedGold.status, closedGold.outstandingPrincipal, closedGold.interestPending], ['closed', 0, 0]);

// ----------------------------------------------------------------------------
// 3. EMI Calendar monthly summary (overdue, today, this_week, paid)
// ----------------------------------------------------------------------------
const emiLoans: LoanAccount[] = [
  {
    ...loans[0], // biz-1 already paid for 2026-11
  },
  {
    id: 'loan-veh-overdue',
    loanName: 'Bike Loan',
    loanType: 'vehicle',
    lenderName: 'Bajaj Finance',
    startDate: '2026-09-01',
    originalAmount: 60000,
    outstandingPrincipal: 45000,
    interestRate: 11,
    interestType: 'flat',
    tenureMonths: 12,
    emiAmount: 5500,
    emiDueDay: 10,
    firstEmiDate: '2026-10-10',
    processingCharges: 0,
    status: 'active',
    totalPrincipalRepaid: 15000,
    totalInterestPaid: 0,
    totalChargesPaid: 0,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'loan-pers-week',
    loanName: 'Tool Credit Line',
    loanType: 'personal',
    lenderName: 'IDFC First',
    startDate: '2026-10-01',
    originalAmount: 30000,
    outstandingPrincipal: 25000,
    interestRate: 14,
    interestType: 'reducing',
    tenureMonths: 12,
    emiAmount: 2700,
    emiDueDay: 17,
    firstEmiDate: '2026-11-17',
    processingCharges: 0,
    status: 'active',
    totalPrincipalRepaid: 5000,
    totalInterestPaid: 0,
    totalChargesPaid: 0,
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
];
const emiCal = AF.getMonthlyEmiSummary(emiLoans, loanPayments, '2026-11', '2026-11-14');
eq(
  '3. EMI Calendar classifies paid / overdue / this_week & sums totals',
  [
    emiCal.rows.find(r => r.loanId === 'loan-biz-1')?.status,
    emiCal.rows.find(r => r.loanId === 'loan-veh-overdue')?.status,
    emiCal.rows.find(r => r.loanId === 'loan-pers-week')?.status,
    emiCal.overdueCount,
  ],
  ['paid', 'overdue', 'this_week', 1]
);

// ----------------------------------------------------------------------------
// 4. Staff Salary summary: commitment, partial payment, active advance, & NEVER auto-paid on new month
// ----------------------------------------------------------------------------
const employees: Employee[] = [
  {
    id: 'emp-1',
    name: 'Arun Kumar',
    phone: '9876543211',
    role: 'Senior Technician',
    salaryType: 'monthly',
    dailySalary: 700,
    monthlySalary: 18000,
    salaryPaymentDay: 14,
    salaryStatus: 'active',
    joiningDate: '2026-01-01',
    status: 'active',
  },
  {
    id: 'emp-2',
    name: 'Karthik Raj',
    phone: '9876543212',
    role: 'CCTV Installer',
    salaryType: 'monthly',
    dailySalary: 600,
    monthlySalary: 15000,
    salaryPaymentDay: 15,
    salaryStatus: 'active',
    joiningDate: '2026-02-01',
    status: 'active',
  },
];
const salaryPayments: SalaryPayment[] = [
  {
    id: 'sal-nov-1',
    employeeId: 'emp-1',
    month: '2026-11',
    baseSalary: 18000,
    daysPresent: 26,
    halfDays: 0,
    absentDays: 0,
    calculatedSalary: 18000,
    advanceDeduction: 0,
    bonus: 0,
    netPaid: 10000,
    paymentDate: '2026-11-10',
    paymentMode: 'bank_transfer',
    status: 'partial',
    payments: [{ id: 'si-1', amount: 10000, paymentDate: '2026-11-10', paymentMode: 'bank_transfer' }],
  },
];
const attendanceRecords: AttendanceRecord[] = [];
const salaryAdvances: SalaryAdvance[] = [
  {
    id: 'adv-1',
    employeeId: 'emp-2',
    date: '2026-11-02',
    amount: 3000,
    reason: 'Medical',
    approvedBy: 'Admin',
    repaidAmount: 1000,
    status: 'active',
  },
];

const novSalary = AF.getMonthlyStaffSalarySummary(employees, salaryPayments, attendanceRecords, salaryAdvances, '2026-11');
const decSalary = AF.getMonthlyStaffSalarySummary(employees, salaryPayments, attendanceRecords, salaryAdvances, '2026-12');
eq(
  '4a. Staff Salary summary computes Nov partial/pending & active advances accurately',
  [novSalary.totalMonthlySalaryCommitment, novSalary.paidThisMonth, novSalary.pendingThisMonth, novSalary.activeAdvanceBalance],
  [33000, 10000, 23000, 2000]
);
eq(
  '4b. New month (2026-12) NEVER auto-marks salary paid',
  [decSalary.paidThisMonth, decSalary.pendingThisMonth, decSalary.rows.every(r => r.status === 'pending')],
  [0, 33000, true]
);

// ----------------------------------------------------------------------------
// 5 & 6. Recurring expenses: due generation NEVER auto-deducts Cash/Bank; future edit leaves history untouched; Pay Now prevents duplicates
// ----------------------------------------------------------------------------
let recurringExpenses: RecurringExpense[] = [
  {
    id: 'rec-tpl-rent',
    name: 'Workshop Office Rent',
    categoryId: 'mfc-office',
    categoryName: 'Office Expenses',
    subcategory: 'Rent',
    amount: 12000,
    frequency: 'monthly',
    startDate: '2026-11-01',
    dueDayOfMonth: 15,
    nextDueDate: '2026-11-15',
    preferredPaymentMode: 'bank_transfer',
    preferredModeChoice: 'bank',
    preferredAccountType: 'bank',
    preferredBankAccountId: sbiBank.id,
    reminderDaysBefore: 7,
    isActive: true,
    createdAt: '2026-10-25T00:00:00Z',
    updatedAt: '2026-10-25T00:00:00Z',
  },
];
let recurringDueEntries: RecurringDueEntry[] = [];

const cfLenBeforeSync = cashFlow.length;
const sync1 = AF.syncRecurringDueEntries(recurringExpenses, recurringDueEntries, '2026-11-14');
recurringExpenses = sync1.recurringExpenses;
recurringDueEntries = sync1.recurringDueEntries;

eq('5a. syncRecurringDueEntries generates 1 pending due & NEVER alters CashFlow', [sync1.addedCount, recurringDueEntries[0]?.status, cashFlow.length], [1, 'pending', cfLenBeforeSync]);

// Re-syncing idempotently prevents duplicate due entry
const sync2 = AF.syncRecurringDueEntries(recurringExpenses, recurringDueEntries, '2026-11-14');
eq('5b. Re-sync prevents duplicate due entry for same period', [sync2.addedCount, sync2.recurringDueEntries.length], [0, 1]);

// Pay recurring due
const payRec = AF.payRecurringDueTx(recurringDueEntries, cashFlow, {
  dueEntryId: recurringDueEntries[0].id,
  paidAmount: 12000,
  paidDate: '2026-11-14',
  paymentMode: 'bank_transfer',
  paymentModeChoice: 'bank',
  accountType: 'bank',
  bankAccountId: sbiBank.id,
  transactionRef: 'RENT-NOV',
});
recurringDueEntries = payRec.recurringDueEntries;
cashFlow = payRec.cashFlow;
eq('6a. Paying recurring due creates 1 operating expense CashFlowEntry & marks due paid', [recurringDueEntries[0].status, MF.isOperatingExpenseEntry(payRec.entry!), payRec.entry!.amount], ['paid', true, 12000]);

const dupPayRec = AF.payRecurringDueTx(recurringDueEntries, cashFlow, {
  dueEntryId: recurringDueEntries[0].id,
  paidAmount: 12000,
  paidDate: '2026-11-14',
  paymentMode: 'bank_transfer',
  accountType: 'bank',
  bankAccountId: sbiBank.id,
});
eq('6b. Duplicate recurring payment blocked', [dupPayRec.duplicate, dupPayRec.cashFlow.length], [true, cashFlow.length]);

// Editing future template amount to ₹13,500 leaves paid Nov due & paid CashFlow at ₹12,000
recurringExpenses = recurringExpenses.map(r => (r.id === 'rec-tpl-rent' ? { ...r, amount: 13500 } : r));
const syncDec = AF.syncRecurringDueEntries(recurringExpenses, recurringDueEntries, '2026-12-10');
const novPaidDue = syncDec.recurringDueEntries.find(d => d.duePeriod === '2026-11')!;
const decPendingDue = syncDec.recurringDueEntries.find(d => d.duePeriod === '2026-12')!;
eq('5c. Updating template to ₹13,500 preserves historical ₹12,000 paid Nov due & sets Dec due to ₹13,500', [novPaidDue.paidAmount, decPendingDue.amountDue], [12000, 13500]);

// ----------------------------------------------------------------------------
// 7. Unified alerts engine across Loans, Recurring, Staff Salary & severity ordering
// ----------------------------------------------------------------------------
const pendingRecDue: RecurringDueEntry = {
  id: 'due-eb-nov',
  recurringExpenseId: 'rec-eb',
  expenseName: 'EB Electricity Bill',
  duePeriod: '2026-11',
  dueDate: '2026-11-14', // Today!
  amountDue: 3200,
  categoryName: 'Office Expenses',
  status: 'pending',
  uniqueSourceKey: 'rec-eb-2026-11',
  createdAt: '2026-11-01T00:00:00Z',
};
const alerts = AF.buildFinancialAlerts({
  loans: emiLoans,
  loanPayments,
  recurringExpenses,
  recurringDueEntries: [...recurringDueEntries, pendingRecDue],
  employees,
  salaryPayments,
  attendanceRecords,
  salaryAdvances,
  asOfDate: '2026-11-14',
});
eq(
  '7a. Unified alerts classify overdue EMI, due_today EB & Salary, due_3_days EMI, and paid items',
  [
    alerts[0]?.severity, // overdue Bike Loan
    alerts.find(a => a.sourceId === 'due-eb-nov')?.severity,
    alerts.find(a => a.sourceId === 'emp-1')?.severity,
    alerts.find(a => a.sourceId === 'loan-pers-week')?.severity,
    alerts.find(a => a.sourceId === 'loan-biz-1')?.severity,
  ],
  ['overdue', 'due_today', 'due_today', 'due_3_days', 'paid']
);
eq(
  '7b. classifyAlertSeverity handles tomorrow & 7 days boundaries',
  [AF.classifyAlertSeverity(1, false), AF.classifyAlertSeverity(5, false)],
  ['due_tomorrow', 'due_7_days']
);

// ----------------------------------------------------------------------------
// 8. Cash -> Savings transfer (zero expense/income distortion + linked bank double-count guard)
// ----------------------------------------------------------------------------
let savingsAccounts: SavingsAccount[] = [
  {
    id: 'sav-emg',
    name: 'Emergency Cash Reserve',
    savingsType: 'emergency_fund',
    openingBalance: 0,
    currentBalance: 0,
    startDate: '2026-11-01',
    isActive: true,
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'sav-linked',
    name: 'HDFC Reserve Linked',
    savingsType: 'bank_savings',
    linkedBankAccountId: hdfcBank.id,
    openingBalance: 25000,
    currentBalance: 25000,
    startDate: '2026-11-01',
    isActive: true,
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
  },
];
let savingsTransactions: SavingsTransaction[] = [];

const savDep = AF.recordSavingsTx(savingsAccounts, savingsTransactions, cashFlow, {
  savingsAccountId: 'sav-emg',
  type: 'deposit',
  amount: 5000,
  date: '2026-11-14',
  accountType: 'cash',
  paymentMode: 'cash',
  paymentModeChoice: 'cash',
});
savingsAccounts = savDep.savingsAccounts;
savingsTransactions = savDep.savingsTransactions;
cashFlow = savDep.cashFlow;
const savCf = cashFlow[0];
eq(
  '8. Cash -> Savings transfer updates Savings & Cash accurately, NOT counted as operating expense/income',
  [
    savingsAccounts[0].currentBalance,
    MF.isOperatingExpenseEntry(savCf),
    MF.isOperatingIncomeEntry(savCf),
  ],
  [5000, false, false]
);

// ----------------------------------------------------------------------------
// 9. Bank -> Investment, manual valuation update, partial withdrawal w/ realized gain
// ----------------------------------------------------------------------------
let investments: InvestmentAccount[] = [
  {
    id: 'inv-mf-1',
    name: 'Nifty 50 Index Fund',
    investmentType: 'mutual_fund',
    institution: 'Zerodha Coin',
    investmentDate: '2026-11-01',
    investedAmount: 0,
    currentValue: 0,
    lastValuedAt: '2026-11-01',
    status: 'active',
    realizedProfitLoss: 0,
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
  },
];
let investmentTransactions: InvestmentTransaction[] = [];

const invAdd = AF.recordInvestmentTx(investments, investmentTransactions, cashFlow, {
  investmentId: 'inv-mf-1',
  type: 'add_capital',
  amount: 20000,
  date: '2026-11-14',
  accountType: 'bank',
  bankAccountId: sbiBank.id,
  paymentMode: 'bank_transfer',
  paymentModeChoice: 'bank',
});
investments = invAdd.investments;
investmentTransactions = invAdd.investmentTransactions;
cashFlow = invAdd.cashFlow;

// Manual valuation update to ₹24,000
investments = investments.map(i => (i.id === 'inv-mf-1' ? { ...i, currentValue: 24000, lastValuedAt: '2026-11-14' } : i));

// Withdraw ₹12,000 (cost basis ₹10,000 -> realized gain ₹2,000) into HDFC Bank
const invWith = AF.recordInvestmentTx(investments, investmentTransactions, cashFlow, {
  investmentId: 'inv-mf-1',
  type: 'withdrawal',
  amount: 10000,
  receivedAmount: 12000,
  date: '2026-11-14',
  accountType: 'bank',
  bankAccountId: hdfcBank.id,
  paymentMode: 'bank_transfer',
  paymentModeChoice: 'bank',
});
investments = invWith.investments;
investmentTransactions = invWith.investmentTransactions;
cashFlow = invWith.cashFlow;
const mfAfter = investments[0];
eq(
  '9. Investment add + manual valuation + partial withdrawal computes cost basis & ₹2,000 realized gain without touching Operating P&L',
  [mfAfter.investedAmount, mfAfter.currentValue, mfAfter.realizedProfitLoss, MF.isOperatingIncomeEntry(cashFlow[0])],
  [10000, 12000, 2000, false]
);

// ----------------------------------------------------------------------------
// 10 & 12. Complete Financial Dashboard & Account Balance Parity
// ----------------------------------------------------------------------------
// Add an operating service income entry of ₹15,000 in Cash
cashFlow = [
  {
    id: 'cf-inc-1',
    date: '2026-11-14',
    type: 'income',
    accountingNature: 'operating',
    category: 'Service Income',
    description: 'CCTV AMC Received',
    amount: 15000,
    paymentMode: 'cash',
    accountType: 'cash',
    sourceModule: 'billing',
  },
  ...cashFlow,
];

const invoices: Invoice[] = [
  {
    id: 'inv-open',
    invoiceNumber: 'SGS-INV-900',
    type: 'invoice',
    billingFirm: 'sgs',
    customerId: 'c1',
    customerName: 'Apex Mart',
    customerPhone: '9876543210',
    date: '2026-11-10',
    items: [],
    subtotal: 12000,
    gstPercent: 0,
    taxAmount: 0,
    grandTotal: 12000,
    paymentStatus: 'partial',
    paymentMode: 'cash',
    paidAmount: 4000,
  },
];
const vendorBills: VendorBill[] = [
  {
    id: 'vb-open',
    vendorName: 'Hikvision Hub',
    invoiceNumber: 'HH-101',
    invoiceDate: '2026-11-08',
    items: [],
    subtotal: 9000,
    taxAmount: 0,
    totalAmount: 9000,
    paidAmount: 3000,
    paymentStatus: 'partial',
    createdAt: '2026-11-08T00:00:00Z',
  },
];

// Expected Cash: 20,000 opening - 1,000 (gold int) - 5,000 (to savings) + 15,000 (income) = 29,000
// Expected SBI: 100,000 - 8,885 (EMI) - 50,500 (gold close) - 12,000 (rent) - 20,000 (invest) = 8,615
// Expected HDFC: 25,000 + 12,000 (invest return) = 37,000
// Expected Total Bank = 45,615; Total Operating = 74,615
const bals = AF.computeAccountBalancesAsOf(cashFlow, banks, openingCashBalance);
eq('12. Account balance parity across Cash, SBI & HDFC including savings/investment transfers', [bals.cashBalance, bals.bankBalancesById[sbiBank.id], bals.bankBalancesById[hdfcBank.id], bals.totalOperatingBalance], [29000, 8615, 37000, 74615]);

const dash = AF.computeCompleteFinancialDashboard({
  cashFlow,
  bankAccounts: banks,
  openingCashBalance,
  invoices,
  vendorBills,
  loans,
  loanPayments,
  recurringDueEntries: [...recurringDueEntries, pendingRecDue],
  savingsAccounts,
  investments,
  employees,
  salaryPayments,
  attendanceRecords,
  salaryAdvances,
  asOfDate: '2026-11-14',
});

// Operating Expenses this month = 1,000 (EMI int) + 1,000 (gold int) + 500 (gold close int) + 12,000 (rent) = 14,500
// (Principal 7,885 + 50,000 = 57,885, Savings 5,000, Invest 20,000 all EXCLUDED!)
// Operating Income this month = 15,000 (Invest return 12,000 EXCLUDED!)
eq(
  '10. Complete dashboard strictly separates Operating Cash/Bank, Receivables, Payables, Loans, Linked/Unlinked Savings, Investments & Monthly P&L',
  [
    dash.totalOperatingAvailableBalance,
    dash.customerReceivables,
    dash.vendorPayables,
    dash.totalOutstandingLoanLiabilities,
    dash.unlinkedSavingsBalance,
    dash.linkedSavingsBalance,
    dash.totalInvestmentCurrentValue,
    dash.investmentRealizedGainLoss,
    dash.thisMonthOperatingIncome,
    dash.thisMonthOperatingExpenses,
    dash.thisMonthStaffSalaryPending,
    dash.thisMonthRecurringPending,
  ],
  [74615, 8000, 6000, 92115, 5000, 25000, 12000, 2000, 15000, 14500, 23000, 3200]
);

// ----------------------------------------------------------------------------
// 11. Monthly Financial Report, Year-wise 12-Month Comparison & CSV Export
// ----------------------------------------------------------------------------
const novReport = AF.computeMonthlyFinancialReport({
  month: '2026-11',
  cashFlow,
  bankAccounts: banks,
  openingCashBalance,
  loanPayments,
  investmentTransactions,
});

const opSum = A.round2(
  novReport.staffSalaryPaid +
    novReport.recurringExpensesPaid +
    novReport.loanInterestPaid +
    novReport.loanChargesPaid +
    novReport.otherOperatingExpenses
);
eq(
  '11a. Monthly Financial Report balances sum cleanly & separate Principal/Savings/Investments',
  [
    novReport.monthlyIncome,
    novReport.monthlyOperatingExpenses,
    opSum,
    novReport.netOperatingProfit,
    novReport.loanPrincipalRepaid,
    novReport.savingsDeposits,
    novReport.investmentDeposits,
    novReport.investmentWithdrawals,
    novReport.investmentRealizedGainLoss,
    novReport.closingTotalOperatingBalance,
  ],
  [15000, 14500, 14500, 500, 57885, 5000, 20000, 12000, 2000, 74615]
);

const yearReport = AF.computeYearlyFinancialComparison({
  year: '2026',
  cashFlow,
  bankAccounts: banks,
  openingCashBalance,
  loanPayments,
  investmentTransactions,
});
eq('11b. Year-wise comparison produces all 12 months with Nov matching', [yearReport.length, yearReport[10].monthlyIncome], [12, 15000]);

const reportCsv = AF.monthlyFinancialReportToCsv(novReport);
assertTrue('11c. Monthly Financial CSV includes Loan Principal non-expense & Savings/Investment sections', reportCsv.includes('Loan Principal Repaid (Non-Expense)') && reportCsv.includes('Savings Deposits (Transfer)') && reportCsv.includes('Investment Realized Gain/Loss'));

// ----------------------------------------------------------------------------
// 14. Empty-state resilience across all 8 new collections
// ----------------------------------------------------------------------------
const emptyDash = AF.computeCompleteFinancialDashboard({
  cashFlow: [],
  bankAccounts: [],
  openingCashBalance: 0,
  invoices: [],
  vendorBills: [],
  loans: [],
  loanPayments: [],
  recurringDueEntries: [],
  savingsAccounts: [],
  investments: [],
  employees: [],
  salaryPayments: [],
  attendanceRecords: [],
  salaryAdvances: [],
  asOfDate: '2026-11-14',
});
eq('14. Empty-state dashboard initializes cleanly to 0 without NaN', [emptyDash.totalOperatingAvailableBalance, emptyDash.totalOutstandingLoanLiabilities, emptyDash.totalSavingsBalance, emptyDash.totalInvestmentCurrentValue], [0, 0, 0, 0]);

console.log(`\nSummary: ${fails === 0 ? 'ALL TESTS PASSED' : `${fails} TEST(S) FAILED`}`);
if (fails > 0) {
  process.exit(1);
}
