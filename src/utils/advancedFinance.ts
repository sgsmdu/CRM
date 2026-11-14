import {
  AttendanceRecord,
  BankAccount,
  CashFlowEntry,
  Employee,
  FinancialAlertItem,
  FinancialAlertSeverity,
  InterestType,
  InvestmentAccount,
  InvestmentTransaction,
  Invoice,
  LoanAccount,
  LoanPayment,
  LoanPaymentKind,
  PaymentAccountType,
  PaymentMode,
  PaymentModeChoice,
  RecurringDueEntry,
  RecurringExpense,
  RecurringFrequency,
  SalaryAdvance,
  SalaryPayment,
  SavingsAccount,
  SavingsTransaction,
  VendorBill,
} from '../types';
import { addDays, amountDue, round2, todayLocal, uid } from './accounting';
import {
  isOperatingExpenseEntry,
  isOperatingIncomeEntry,
  mapChoiceToPaymentMode,
} from './moneyFlow';

// ============================================================================
// DATE & SCHEDULE HELPERS
// ============================================================================

export const parseYYYYMMDD = (s: string): Date => {
  const [y, m, d] = (s || todayLocal()).split('-').map(Number);
  return new Date(y || 2026, (m || 1) - 1, d || 1);
};

export const formatYYYYMMDD = (d: Date): string => todayLocal(d);

/**
 * Positive when targetDate > fromDate (days left), negative when targetDate < fromDate (overdue).
 */
export const diffDays = (fromDateStr: string, targetDateStr: string): number => {
  const a = parseYYYYMMDD(fromDateStr);
  const b = parseYYYYMMDD(targetDateStr);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
};

export const daysInMonth = (year: number, month1To12: number): number =>
  new Date(year, month1To12, 0).getDate();

export const clampDayInMonth = (year: number, month1To12: number, day: number): string => {
  const maxD = daysInMonth(year, month1To12);
  const safeD = Math.max(1, Math.min(maxD, Math.floor(day || 1)));
  return `${year}-${String(month1To12).padStart(2, '0')}-${String(safeD).padStart(2, '0')}`;
};

export const addMonthsClamped = (dateStr: string, monthsToAdd: number, preferredDay?: number): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetDay = preferredDay && preferredDay >= 1 ? preferredDay : d;
  const totalMonths = (y * 12 + (m - 1)) + monthsToAdd;
  const nextY = Math.floor(totalMonths / 12);
  const nextM = (totalMonths % 12) + 1;
  return clampDayInMonth(nextY, nextM, targetDay);
};

export const classifyAlertSeverity = (
  daysRemaining: number,
  isPaid: boolean
): FinancialAlertSeverity => {
  if (isPaid) return 'paid';
  if (daysRemaining < 0) return 'overdue';
  if (daysRemaining === 0) return 'due_today';
  if (daysRemaining === 1) return 'due_tomorrow';
  if (daysRemaining <= 3) return 'due_3_days';
  if (daysRemaining <= 7) return 'due_7_days';
  return 'upcoming';
};

// ============================================================================
// 1. LOANS, GOLD LOAN & EMI SCHEDULE ENGINE
// ============================================================================

export const calculateReducingEmi = (
  principal: number,
  annualRatePercent: number,
  tenureMonths: number
): number => {
  const P = Number(principal) || 0;
  const n = Math.max(1, Math.floor(Number(tenureMonths) || 1));
  const r = (Number(annualRatePercent) || 0) / 12 / 100;
  if (P <= 0) return 0;
  if (r <= 0) return round2(P / n);
  const factor = Math.pow(1 + r, n);
  return round2((P * r * factor) / (factor - 1));
};

export const calculateFlatEmi = (
  principal: number,
  annualRatePercent: number,
  tenureMonths: number
): number => {
  const P = Number(principal) || 0;
  const n = Math.max(1, Math.floor(Number(tenureMonths) || 1));
  const years = n / 12;
  const totalInterest = P * ((Number(annualRatePercent) || 0) / 100) * years;
  return round2((P + totalInterest) / n);
};

export const estimateEmiBreakdown = (
  loan: Pick<LoanAccount, 'outstandingPrincipal' | 'originalAmount' | 'interestRate' | 'interestType' | 'tenureMonths'>,
  paymentAmount: number
): {
  principalComponent: number;
  interestComponent: number;
  chargesComponent: number;
  isEstimatedBreakdown: boolean;
} => {
  const amt = round2(Math.max(0, paymentAmount));
  const outP = Math.max(0, Number(loan.outstandingPrincipal) || 0);
  if (amt <= 0) {
    return { principalComponent: 0, interestComponent: 0, chargesComponent: 0, isEstimatedBreakdown: true };
  }

  let estInterest = 0;
  if (loan.interestType === 'flat') {
    const n = Math.max(1, loan.tenureMonths || 12);
    const totalFlatInt = loan.originalAmount * ((loan.interestRate || 0) / 100) * (n / 12);
    estInterest = round2(totalFlatInt / n);
  } else {
    const monthlyRate = (Number(loan.interestRate) || 0) / 12 / 100;
    estInterest = round2(outP * monthlyRate);
  }

  const interestComponent = Math.min(amt, Math.max(0, estInterest));
  const principalComponent = round2(Math.min(outP, Math.max(0, amt - interestComponent)));
  const remainderToInterest = round2(Math.max(0, amt - interestComponent - principalComponent));

  return {
    principalComponent,
    interestComponent: round2(interestComponent + remainderToInterest),
    chargesComponent: 0,
    isEstimatedBreakdown: true,
  };
};

export const getEffectiveEmiPeriod = (
  loan: LoanAccount,
  monthYYYYMM: string
): { dueDate: string; period: string } => {
  const [y, m] = monthYYYYMM.split('-').map(Number);
  const dueDay = loan.emiDueDay || (loan.firstEmiDate ? Number(loan.firstEmiDate.split('-')[2]) : 5);
  return {
    dueDate: clampDayInMonth(y, m, dueDay),
    period: monthYYYYMM,
  };
};

export const isLoanScheduledInMonth = (loan: LoanAccount, monthYYYYMM: string): boolean => {
  if (loan.status === 'closed' || loan.status === 'completed') return false;
  if (loan.loanType === 'gold') {
    if (loan.interestDueDate && loan.interestDueDate.startsWith(monthYYYYMM)) return true;
    if ((loan.emiAmount || 0) <= 0) return false;
  }
  if ((loan.emiAmount || 0) <= 0 && (loan.outstandingPrincipal || 0) <= 0) return false;
  const firstMonth = (loan.firstEmiDate || loan.startDate || '').slice(0, 7);
  if (firstMonth && monthYYYYMM < firstMonth) return false;
  if (loan.lastEmiDate && monthYYYYMM > loan.lastEmiDate.slice(0, 7)) return false;
  return true;
};

export interface MonthlyEmiRow {
  loanId: string;
  loanName: string;
  loanType: LoanAccount['loanType'];
  lenderName: string;
  emiPeriod: string;
  dueDate: string;
  emiAmount: number;
  paidAmount: number;
  isPaid: boolean;
  daysRemaining: number;
  status: 'paid' | 'overdue' | 'today' | 'this_week' | 'this_month' | 'upcoming';
  linkedBankAccountId?: string;
}

export const getMonthlyEmiSummary = (
  loans: LoanAccount[],
  loanPayments: LoanPayment[],
  monthYYYYMM: string,
  asOfDate: string = todayLocal()
): {
  month: string;
  rows: MonthlyEmiRow[];
  totalMonthlyEmi: number;
  totalPaidThisMonth: number;
  totalPendingThisMonth: number;
  overdueCount: number;
  dueTodayCount: number;
} => {
  const rows: MonthlyEmiRow[] = [];

  loans.forEach(loan => {
    // Include if scheduled this month OR already has a payment for this month
    const monthPays = loanPayments.filter(
      p => !p.isReversed && p.loanId === loan.id && (p.emiPeriod === monthYYYYMM || p.paymentDate.startsWith(monthYYYYMM))
    );
    const paidForPeriod = round2(
      monthPays
        .filter(p => p.emiPeriod === monthYYYYMM || p.paymentKind === 'emi' || p.paymentKind === 'closure')
        .reduce((s, p) => s + (p.totalPaid || 0), 0)
    );

    const scheduled = isLoanScheduledInMonth(loan, monthYYYYMM);
    if (!scheduled && paidForPeriod <= 0) return;

    const { dueDate } =
      loan.loanType === 'gold' && loan.interestDueDate?.startsWith(monthYYYYMM)
        ? { dueDate: loan.interestDueDate }
        : getEffectiveEmiPeriod(loan, monthYYYYMM);

    const emiAmt =
      loan.loanType === 'gold' && (loan.emiAmount || 0) <= 0
        ? round2(loan.interestPending || 0)
        : round2(loan.emiAmount || 0);

    const isPaid =
      monthPays.some(p => p.emiPeriod === monthYYYYMM && (p.paymentKind === 'emi' || p.paymentKind === 'closure')) ||
      (emiAmt > 0 && paidForPeriod >= emiAmt - 0.5) ||
      loan.status === 'completed' ||
      loan.status === 'closed';

    const daysRemaining = diffDays(asOfDate, dueDate);
    let status: MonthlyEmiRow['status'] = 'upcoming';
    if (isPaid) {
      status = 'paid';
    } else if (daysRemaining < 0) {
      status = 'overdue';
    } else if (daysRemaining === 0) {
      status = 'today';
    } else if (daysRemaining <= 7) {
      status = 'this_week';
    } else if (dueDate.startsWith(asOfDate.slice(0, 7))) {
      status = 'this_month';
    }

    rows.push({
      loanId: loan.id,
      loanName: loan.loanName,
      loanType: loan.loanType,
      lenderName: loan.lenderName,
      emiPeriod: monthYYYYMM,
      dueDate,
      emiAmount: emiAmt > 0 ? emiAmt : paidForPeriod,
      paidAmount: paidForPeriod,
      isPaid,
      daysRemaining,
      status,
      linkedBankAccountId: loan.linkedBankAccountId,
    });
  });

  rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const totalMonthlyEmi = round2(rows.reduce((s, r) => s + r.emiAmount, 0));
  const totalPaidThisMonth = round2(rows.reduce((s, r) => s + Math.min(r.emiAmount, r.paidAmount), 0));
  const totalPendingThisMonth = round2(
    rows.reduce((s, r) => s + (r.isPaid ? 0 : Math.max(0, r.emiAmount - r.paidAmount)), 0)
  );

  return {
    month: monthYYYYMM,
    rows,
    totalMonthlyEmi,
    totalPaidThisMonth,
    totalPendingThisMonth,
    overdueCount: rows.filter(r => r.status === 'overdue').length,
    dueTodayCount: rows.filter(r => r.status === 'today').length,
  };
};

export const getLoanDashboardMetrics = (
  loans: LoanAccount[],
  loanPayments: LoanPayment[],
  asOfDate: string = todayLocal()
) => {
  const currentMonth = asOfDate.slice(0, 7);
  const emiSummary = getMonthlyEmiSummary(loans, loanPayments, currentMonth, asOfDate);

  const totalOriginalLoanAmount = round2(loans.reduce((s, l) => s + (l.originalAmount || 0), 0));
  const activeLoans = loans.filter(l => l.status === 'active');
  const regularOutstanding = round2(
    activeLoans.filter(l => l.loanType !== 'gold').reduce((s, l) => s + Math.max(0, l.outstandingPrincipal || 0), 0)
  );
  const goldOutstanding = round2(
    activeLoans.filter(l => l.loanType === 'gold').reduce((s, l) => s + Math.max(0, l.outstandingPrincipal || 0), 0)
  );
  const goldInterestPending = round2(
    activeLoans.filter(l => l.loanType === 'gold').reduce((s, l) => s + Math.max(0, l.interestPending || 0), 0)
  );
  const totalOutstandingBalance = round2(regularOutstanding + goldOutstanding);
  const totalPrincipalRepaid = round2(loans.reduce((s, l) => s + (l.totalPrincipalRepaid || 0), 0));
  const totalInterestPaid = round2(loans.reduce((s, l) => s + (l.totalInterestPaid || 0), 0));
  const totalChargesPaid = round2(loans.reduce((s, l) => s + (l.totalChargesPaid || 0), 0));
  const totalAmountRepaid = round2(totalPrincipalRepaid + totalInterestPaid + totalChargesPaid);
  const totalMonthlyEmi = emiSummary.totalMonthlyEmi;

  const unpaidRows = emiSummary.rows.filter(r => !r.isPaid);
  const overdueRows = unpaidRows.filter(r => r.status === 'overdue');
  const upcomingRows = unpaidRows.filter(r => r.daysRemaining >= 0);

  return {
    totalOriginalLoanAmount,
    totalOutstandingBalance,
    regularOutstanding,
    goldOutstanding,
    goldInterestPending,
    totalPrincipalRepaid,
    totalInterestPaid,
    totalChargesPaid,
    totalAmountRepaid,
    totalMonthlyEmi,
    activeLoansCount: activeLoans.length,
    goldLoansCount: activeLoans.filter(l => l.loanType === 'gold').length,
    nextEmiDue: upcomingRows[0] || null,
    overdueEmiAmount: round2(overdueRows.reduce((s, r) => s + Math.max(0, r.emiAmount - r.paidAmount), 0)),
    overdueEmiCount: overdueRows.length,
    monthlySummary: emiSummary,
  };
};

export interface RecordLoanPaymentInput {
  loanId: string;
  paymentKind: LoanPaymentKind;
  paymentDate: string;
  emiPeriod?: string; // e.g. '2026-11' for scheduled monthly EMI
  dueDate?: string;
  totalPaid: number;
  principalComponent: number;
  interestComponent: number;
  chargesComponent?: number;
  isEstimatedBreakdown?: boolean;
  paymentMode: PaymentMode;
  paymentModeChoice?: PaymentModeChoice;
  accountType: PaymentAccountType;
  bankAccountId?: string;
  bankAccountName?: string;
  transactionRef?: string;
  notes?: string;
  createdBy?: string;
  uniqueSourceKey?: string;
  nextInterestDueDate?: string; // Optional update for Gold Loan next interest due date
}

export const recordLoanPaymentTx = (
  loans: LoanAccount[],
  loanPayments: LoanPayment[],
  cashFlow: CashFlowEntry[],
  input: RecordLoanPaymentInput
): {
  loans: LoanAccount[];
  loanPayments: LoanPayment[];
  cashFlow: CashFlowEntry[];
  payment?: LoanPayment;
  duplicate?: boolean;
  error?: string;
} => {
  const loan = loans.find(l => l.id === input.loanId);
  if (!loan) {
    return { loans, loanPayments, cashFlow, error: 'Loan account not found.' };
  }

  const totalPaid = round2(Number(input.totalPaid) || 0);
  const principal = round2(Math.max(0, Number(input.principalComponent) || 0));
  const interest = round2(Math.max(0, Number(input.interestComponent) || 0));
  const charges = round2(Math.max(0, Number(input.chargesComponent) || 0));

  if (totalPaid <= 0) {
    return { loans, loanPayments, cashFlow, error: 'Payment amount must be greater than ₹0.' };
  }

  if (Math.abs(principal + interest + charges - totalPaid) > 0.5) {
    return {
      loans,
      loanPayments,
      cashFlow,
      error: `Principal (₹${principal}) + Interest (₹${interest}) + Charges (₹${charges}) must equal Total Paid (₹${totalPaid}).`,
    };
  }

  const outstandingBefore = round2(Math.max(0, loan.outstandingPrincipal || 0));
  const interestPendingBefore = round2(Math.max(0, loan.interestPending || 0));

  if (principal > outstandingBefore + 0.5) {
    return {
      loans,
      loanPayments,
      cashFlow,
      error: `Principal repayment (₹${principal.toLocaleString('en-IN')}) exceeds outstanding principal (₹${outstandingBefore.toLocaleString('en-IN')}). Put extra fees in Interest/Charges.`,
    };
  }

  // Gold / Loan Closure validation: cannot close unless full principal & pending interest settled
  if (input.paymentKind === 'closure') {
    const remPrincipal = round2(Math.max(0, outstandingBefore - principal));
    const remInterest = round2(Math.max(0, interestPendingBefore - interest));
    if (remPrincipal > 0.01 || remInterest > 0.01) {
      return {
        loans,
        loanPayments,
        cashFlow,
        error: `Cannot close loan yet. Remaining Principal: ₹${remPrincipal.toLocaleString('en-IN')}, Pending Interest: ₹${remInterest.toLocaleString('en-IN')}.`,
      };
    }
  }

  // Duplicate EMI / uniqueSourceKey protection
  const effectiveSourceKey =
    input.uniqueSourceKey ||
    (input.paymentKind === 'emi' && input.emiPeriod ? `loan-emi-${loan.id}-${input.emiPeriod}` : undefined);

  if (
    effectiveSourceKey &&
    (loanPayments.some(p => !p.isReversed && p.uniqueSourceKey === effectiveSourceKey) ||
      cashFlow.some(c => !c.isReversed && c.uniqueSourceKey === effectiveSourceKey))
  ) {
    const existing = loanPayments.find(p => !p.isReversed && p.uniqueSourceKey === effectiveSourceKey);
    return { loans, loanPayments, cashFlow, payment: existing, duplicate: true };
  }

  const now = new Date().toISOString();
  const paymentId = uid('loanpay');
  const resolvedMode = input.paymentModeChoice
    ? mapChoiceToPaymentMode(input.paymentModeChoice, input.paymentMode)
    : input.paymentMode;

  const newCashEntries: CashFlowEntry[] = [];
  let principalCashFlowId: string | undefined;
  let interestCashFlowId: string | undefined;

  // 1. Principal Repayment -> deducts Cash/Bank, EXCLUDED from Operating Expenses (accountingNature: 'loan_principal')
  if (principal > 0) {
    principalCashFlowId = uid('cf-lp');
    newCashEntries.push({
      id: principalCashFlowId,
      date: input.paymentDate,
      type: 'expense',
      accountingNature: 'loan_principal',
      category: 'Loan Principal Repayment',
      categoryName: 'Loan Principal Repayment',
      subcategory: loan.loanType === 'gold' ? 'Gold Loan Principal' : 'EMI Principal',
      description: `Loan Principal: ${loan.loanName} (${loan.lenderName})${input.emiPeriod ? ` · ${input.emiPeriod}` : ''}`,
      amount: principal,
      paymentMode: resolvedMode,
      paymentModeChoice: input.paymentModeChoice,
      accountType: input.accountType,
      bankAccountId: input.accountType === 'bank' ? input.bankAccountId : undefined,
      referenceNumber: input.transactionRef,
      payeeOrCustomer: loan.lenderName,
      loanId: loan.id,
      loanPaymentId: paymentId,
      sourceModule: 'loan',
      sourceDocId: paymentId,
      uniqueSourceKey: effectiveSourceKey ? `${effectiveSourceKey}-p` : undefined,
      isEstimated: input.isEstimatedBreakdown,
      notes: input.notes,
      createdBy: input.createdBy || 'CRM User',
      createdAt: now,
    });
  }

  // 2. Interest & Charges -> deducts Cash/Bank AND counts as Finance / Operating Expense
  const financeExpense = round2(interest + charges);
  if (financeExpense > 0) {
    interestCashFlowId = uid('cf-li');
    newCashEntries.push({
      id: interestCashFlowId,
      date: input.paymentDate,
      type: 'expense',
      accountingNature: 'loan_interest',
      category: 'Loans & Interest',
      categoryId: 'mfc-loans',
      categoryName: 'Loans & Interest',
      subcategory: charges > 0 && interest === 0 ? 'Processing & Closure Charges' : 'Loan Interest Paid',
      subcategoryId: charges > 0 && interest === 0 ? 'mfc-loans-charges' : 'mfc-loans-interest',
      description: `Loan ${interest > 0 && charges > 0 ? 'Interest & Charges' : interest > 0 ? 'Interest' : 'Charges'}: ${loan.loanName} (${loan.lenderName})${input.emiPeriod ? ` · ${input.emiPeriod}` : ''}`,
      amount: financeExpense,
      paymentMode: resolvedMode,
      paymentModeChoice: input.paymentModeChoice,
      accountType: input.accountType,
      bankAccountId: input.accountType === 'bank' ? input.bankAccountId : undefined,
      referenceNumber: input.transactionRef,
      payeeOrCustomer: loan.lenderName,
      loanId: loan.id,
      loanPaymentId: paymentId,
      sourceModule: 'loan',
      sourceDocId: paymentId,
      uniqueSourceKey: effectiveSourceKey ? `${effectiveSourceKey}-i` : undefined,
      isEstimated: input.isEstimatedBreakdown,
      notes: input.notes,
      createdBy: input.createdBy || 'CRM User',
      createdAt: now,
    });
  }

  const payment: LoanPayment = {
    id: paymentId,
    loanId: loan.id,
    loanName: loan.loanName,
    loanType: loan.loanType,
    emiPeriod: input.emiPeriod,
    dueDate: input.dueDate,
    paymentDate: input.paymentDate,
    paymentKind: input.paymentKind,
    totalPaid,
    principalComponent: principal,
    interestComponent: interest,
    chargesComponent: charges,
    isEstimatedBreakdown: input.isEstimatedBreakdown,
    paymentMode: resolvedMode,
    paymentModeChoice: input.paymentModeChoice,
    accountType: input.accountType,
    bankAccountId: input.accountType === 'bank' ? input.bankAccountId : undefined,
    bankAccountName: input.bankAccountName,
    transactionRef: input.transactionRef,
    notes: input.notes,
    principalCashFlowId,
    interestCashFlowId,
    uniqueSourceKey: effectiveSourceKey,
    createdBy: input.createdBy || 'CRM User',
    createdAt: now,
  };

  const nextPrincipal = round2(Math.max(0, outstandingBefore - principal));
  const nextInterestPending =
    loan.loanType === 'gold'
      ? round2(Math.max(0, interestPendingBefore - interest))
      : loan.interestPending;

  const isSettled = nextPrincipal <= 0.01 && (nextInterestPending || 0) <= 0.01;
  const nextStatus: LoanAccount['status'] =
    input.paymentKind === 'closure' ? 'closed' : isSettled ? 'completed' : loan.status;

  const updatedLoans = loans.map(l =>
    l.id === loan.id
      ? {
          ...l,
          outstandingPrincipal: nextPrincipal,
          interestPending: nextInterestPending,
          totalPrincipalRepaid: round2((l.totalPrincipalRepaid || 0) + principal),
          totalInterestPaid: round2((l.totalInterestPaid || 0) + interest),
          totalChargesPaid: round2((l.totalChargesPaid || 0) + charges),
          interestDueDate: input.nextInterestDueDate || l.interestDueDate,
          status: nextStatus,
          closedDate: nextStatus === 'closed' || nextStatus === 'completed' ? input.paymentDate : l.closedDate,
          updatedAt: now,
        }
      : l
  );

  return {
    loans: updatedLoans,
    loanPayments: [payment, ...loanPayments],
    cashFlow: [...newCashEntries, ...cashFlow],
    payment,
    duplicate: false,
  };
};

// ============================================================================
// 2. RECURRING MONTHLY EXPENSES ENGINE
// ============================================================================

export const advanceRecurringDate = (
  currentDateStr: string,
  frequency: RecurringFrequency,
  customIntervalDays?: number,
  dueDayOfMonth?: number
): string => {
  switch (frequency) {
    case 'weekly':
      return addDays(currentDateStr, 7);
    case 'monthly':
      return addMonthsClamped(currentDateStr, 1, dueDayOfMonth);
    case 'quarterly':
      return addMonthsClamped(currentDateStr, 3, dueDayOfMonth);
    case 'yearly':
      return addMonthsClamped(currentDateStr, 12, dueDayOfMonth);
    case 'custom': {
      const days = Math.max(1, Math.floor(customIntervalDays || 30));
      return addDays(currentDateStr, days);
    }
    default:
      return addMonthsClamped(currentDateStr, 1, dueDayOfMonth);
  }
};

export const getRecurringPeriodKey = (dueDate: string, frequency: RecurringFrequency): string => {
  if (frequency === 'weekly' || frequency === 'custom') return dueDate;
  return dueDate.slice(0, 7); // YYYY-MM
};

/**
 * Generates pending due entries ONLY.
 * CRITICAL RULES:
 * - Never auto-deducts Cash/Bank balance.
 * - Never auto-creates CashFlowExpense entries.
 * - Never auto-marks a due entry as paid.
 * - Prevents duplicate entries for the same (recurringExpenseId, duePeriod).
 */
export const syncRecurringDueEntries = (
  templates: RecurringExpense[],
  existingDues: RecurringDueEntry[],
  asOfDate: string = todayLocal()
): {
  recurringExpenses: RecurringExpense[];
  recurringDueEntries: RecurringDueEntry[];
  addedCount: number;
} => {
  const newDues: RecurringDueEntry[] = [];
  const existingKeys = new Set(
    existingDues.map(d => `${d.recurringExpenseId}::${d.duePeriod}`)
  );
  const now = new Date().toISOString();

  const updatedTemplates = templates.map(tpl => {
    if (!tpl.isActive) return tpl;

    const leadDays = Math.max(7, Number(tpl.reminderDaysBefore) || 3);
    const horizonDate = addDays(asOfDate, leadDays);
    let cursorDate = tpl.nextDueDate || tpl.startDate;
    let safety = 0;

    while (cursorDate && cursorDate <= horizonDate && safety < 36) {
      safety += 1;
      if (tpl.repeatUntil && cursorDate > tpl.repeatUntil) {
        break;
      }

      if (cursorDate >= tpl.startDate) {
        const periodKey = getRecurringPeriodKey(cursorDate, tpl.frequency);
        const compositeKey = `${tpl.id}::${periodKey}`;
        if (!existingKeys.has(compositeKey)) {
          existingKeys.add(compositeKey);
          newDues.push({
            id: uid('recdue'),
            recurringExpenseId: tpl.id,
            expenseName: tpl.name,
            duePeriod: periodKey,
            dueDate: cursorDate,
            amountDue: round2(tpl.amount),
            categoryId: tpl.categoryId,
            categoryName: tpl.categoryName,
            subcategory: tpl.subcategory,
            subcategoryId: tpl.subcategoryId,
            secondSubcategory: tpl.secondSubcategory,
            secondSubcategoryId: tpl.secondSubcategoryId,
            status: 'pending',
            uniqueSourceKey: `rec-${tpl.id}-${periodKey}`,
            createdAt: now,
          });
        }
      }

      cursorDate = advanceRecurringDate(
        cursorDate,
        tpl.frequency,
        tpl.customIntervalDays,
        tpl.dueDayOfMonth
      );
    }

    if (cursorDate !== tpl.nextDueDate) {
      return { ...tpl, nextDueDate: cursorDate };
    }
    return tpl;
  });

  return {
    recurringExpenses: updatedTemplates,
    recurringDueEntries: newDues.length > 0 ? [...newDues, ...existingDues] : existingDues,
    addedCount: newDues.length,
  };
};

export interface PayRecurringDueInput {
  dueEntryId: string;
  paidAmount: number;
  paidDate: string;
  paymentMode: PaymentMode;
  paymentModeChoice?: PaymentModeChoice;
  accountType: PaymentAccountType;
  bankAccountId?: string;
  transactionRef?: string;
  notes?: string;
  createdBy?: string;
}

export const payRecurringDueTx = (
  dues: RecurringDueEntry[],
  cashFlow: CashFlowEntry[],
  input: PayRecurringDueInput
): {
  recurringDueEntries: RecurringDueEntry[];
  cashFlow: CashFlowEntry[];
  entry?: CashFlowEntry;
  duplicate?: boolean;
  error?: string;
} => {
  const due = dues.find(d => d.id === input.dueEntryId);
  if (!due) return { recurringDueEntries: dues, cashFlow, error: 'Due entry not found.' };
  if (due.status === 'paid') {
    return { recurringDueEntries: dues, cashFlow, duplicate: true };
  }

  const paidAmt = round2(Number(input.paidAmount) || 0);
  if (paidAmt <= 0) {
    return { recurringDueEntries: dues, cashFlow, error: 'Payment amount must be greater than ₹0.' };
  }

  if (cashFlow.some(c => !c.isReversed && c.uniqueSourceKey === due.uniqueSourceKey)) {
    return { recurringDueEntries: dues, cashFlow, duplicate: true };
  }

  const resolvedMode = input.paymentModeChoice
    ? mapChoiceToPaymentMode(input.paymentModeChoice, input.paymentMode)
    : input.paymentMode;
  const now = new Date().toISOString();
  const cfId = uid('cf-rec');

  const cfEntry: CashFlowEntry = {
    id: cfId,
    date: input.paidDate,
    type: 'expense',
    accountingNature: 'operating',
    category: due.categoryName || 'Office Expenses',
    categoryId: due.categoryId,
    categoryName: due.categoryName,
    subcategory: due.subcategory,
    subcategoryId: due.subcategoryId,
    secondSubcategory: due.secondSubcategory,
    secondSubcategoryId: due.secondSubcategoryId,
    description: `${due.expenseName} (${due.duePeriod})`,
    amount: paidAmt,
    paymentMode: resolvedMode,
    paymentModeChoice: input.paymentModeChoice,
    accountType: input.accountType,
    bankAccountId: input.accountType === 'bank' ? input.bankAccountId : undefined,
    referenceNumber: input.transactionRef,
    recurringExpenseId: due.recurringExpenseId,
    recurringDueId: due.id,
    sourceModule: 'recurring',
    sourceDocId: due.id,
    uniqueSourceKey: due.uniqueSourceKey,
    notes: input.notes,
    createdBy: input.createdBy || 'CRM User',
    createdAt: now,
  };

  const nextDues = dues.map(d =>
    d.id === due.id
      ? {
          ...d,
          status: 'paid' as const,
          paidAmount: paidAmt,
          paidDate: input.paidDate,
          paymentMode: resolvedMode,
          paymentModeChoice: input.paymentModeChoice,
          accountType: input.accountType,
          bankAccountId: input.accountType === 'bank' ? input.bankAccountId : undefined,
          transactionRef: input.transactionRef,
          cashFlowEntryId: cfId,
          notes: input.notes || d.notes,
          updatedAt: now,
        }
      : d
  );

  return {
    recurringDueEntries: nextDues,
    cashFlow: [cfEntry, ...cashFlow],
    entry: cfEntry,
    duplicate: false,
  };
};

// ============================================================================
// 3. SAVINGS & INVESTMENTS PURE TRANSACTIONS
// ============================================================================

export interface RecordSavingsTxInput {
  savingsAccountId: string;
  type: SavingsTransaction['type']; // 'deposit' | 'withdraw' | 'transfer_in' | 'transfer_out'
  amount: number;
  date: string;
  accountType: PaymentAccountType; // Source Cash/Bank (on deposit) or Dest Cash/Bank (on withdraw)
  bankAccountId?: string;
  paymentMode: PaymentMode;
  paymentModeChoice?: PaymentModeChoice;
  transactionRef?: string;
  notes?: string;
  createdBy?: string;
  uniqueSourceKey?: string;
}

export const recordSavingsTx = (
  savingsAccounts: SavingsAccount[],
  savingsTransactions: SavingsTransaction[],
  cashFlow: CashFlowEntry[],
  input: RecordSavingsTxInput
): {
  savingsAccounts: SavingsAccount[];
  savingsTransactions: SavingsTransaction[];
  cashFlow: CashFlowEntry[];
  transaction?: SavingsTransaction;
  duplicate?: boolean;
  error?: string;
} => {
  const acc = savingsAccounts.find(s => s.id === input.savingsAccountId);
  if (!acc) return { savingsAccounts, savingsTransactions, cashFlow, error: 'Savings account not found.' };

  const amt = round2(Number(input.amount) || 0);
  if (amt <= 0) return { savingsAccounts, savingsTransactions, cashFlow, error: 'Amount must be greater than ₹0.' };

  const isInflowToSavings = input.type === 'deposit' || input.type === 'transfer_in';
  if (!isInflowToSavings && amt > (acc.currentBalance || 0) + 0.01) {
    return {
      savingsAccounts,
      savingsTransactions,
      cashFlow,
      error: `Withdrawal (₹${amt.toLocaleString('en-IN')}) exceeds Savings balance (₹${(acc.currentBalance || 0).toLocaleString('en-IN')}).`,
    };
  }

  if (
    input.uniqueSourceKey &&
    savingsTransactions.some(t => !t.isReversed && t.uniqueSourceKey === input.uniqueSourceKey)
  ) {
    return { savingsAccounts, savingsTransactions, cashFlow, duplicate: true };
  }

  const now = new Date().toISOString();
  const txId = uid('savtx');
  const cfId = uid('cf-sav');
  const resolvedMode = input.paymentModeChoice
    ? mapChoiceToPaymentMode(input.paymentModeChoice, input.paymentMode)
    : input.paymentMode;

  // Transfer entry keeps Cash/Bank accurate without affecting Business Operating Expense or Income!
  const cfEntry: CashFlowEntry = isInflowToSavings
    ? {
        id: cfId,
        date: input.date,
        type: 'transfer',
        accountingNature: 'savings_transfer',
        isTransfer: true,
        transferType: 'to_savings',
        category: 'Savings & Reserves',
        categoryName: 'Savings & Reserves',
        description: `Transfer to Savings (${acc.name})`,
        amount: amt,
        paymentMode: resolvedMode,
        paymentModeChoice: input.paymentModeChoice,
        accountType: input.accountType,
        bankAccountId: input.accountType === 'bank' ? input.bankAccountId : undefined,
        toAccountType: undefined,
        toBankAccountId: undefined,
        referenceNumber: input.transactionRef,
        savingsAccountId: acc.id,
        sourceModule: 'savings',
        sourceDocId: txId,
        uniqueSourceKey: input.uniqueSourceKey,
        notes: input.notes,
        createdBy: input.createdBy || 'CRM User',
        createdAt: now,
      }
    : {
        id: cfId,
        date: input.date,
        type: 'transfer',
        accountingNature: 'savings_transfer',
        isTransfer: true,
        transferType: 'from_savings',
        category: 'Savings & Reserves',
        categoryName: 'Savings & Reserves',
        description: `Withdrawal from Savings (${acc.name})`,
        amount: amt,
        // Use bank_transfer/other when source is external savings so cashSource fallback doesn't misread paymentMode === 'cash'
        paymentMode: resolvedMode === 'cash' ? 'other' : resolvedMode,
        paymentModeChoice: input.paymentModeChoice,
        accountType: undefined,
        bankAccountId: undefined,
        toAccountType: input.accountType,
        toBankAccountId: input.accountType === 'bank' ? input.bankAccountId : undefined,
        referenceNumber: input.transactionRef,
        savingsAccountId: acc.id,
        sourceModule: 'savings',
        sourceDocId: txId,
        uniqueSourceKey: input.uniqueSourceKey,
        notes: input.notes,
        createdBy: input.createdBy || 'CRM User',
        createdAt: now,
      };

  const savTx: SavingsTransaction = {
    id: txId,
    savingsAccountId: acc.id,
    savingsAccountName: acc.name,
    type: input.type,
    amount: amt,
    date: input.date,
    accountType: input.accountType,
    bankAccountId: input.accountType === 'bank' ? input.bankAccountId : undefined,
    paymentMode: resolvedMode,
    paymentModeChoice: input.paymentModeChoice,
    transactionRef: input.transactionRef,
    notes: input.notes,
    cashFlowEntryId: cfId,
    uniqueSourceKey: input.uniqueSourceKey,
    createdBy: input.createdBy || 'CRM User',
    createdAt: now,
  };

  const nextBalance = round2(
    isInflowToSavings ? (acc.currentBalance || 0) + amt : Math.max(0, (acc.currentBalance || 0) - amt)
  );

  return {
    savingsAccounts: savingsAccounts.map(s =>
      s.id === acc.id ? { ...s, currentBalance: nextBalance, updatedAt: now } : s
    ),
    savingsTransactions: [savTx, ...savingsTransactions],
    cashFlow: [cfEntry, ...cashFlow],
    transaction: savTx,
    duplicate: false,
  };
};

export interface RecordInvestmentTxInput {
  investmentId: string;
  type: 'add_capital' | 'withdrawal';
  amount: number; // Invested amount (on add_capital) OR Cost basis reduction (on withdrawal; defaults proportionally or full if closing)
  receivedAmount?: number; // Cash/Bank received on withdrawal
  isFullClosure?: boolean;
  date: string;
  accountType: PaymentAccountType;
  bankAccountId?: string;
  paymentMode: PaymentMode;
  paymentModeChoice?: PaymentModeChoice;
  transactionRef?: string;
  notes?: string;
  createdBy?: string;
  uniqueSourceKey?: string;
}

export const recordInvestmentTx = (
  investments: InvestmentAccount[],
  investmentTransactions: InvestmentTransaction[],
  cashFlow: CashFlowEntry[],
  input: RecordInvestmentTxInput
): {
  investments: InvestmentAccount[];
  investmentTransactions: InvestmentTransaction[];
  cashFlow: CashFlowEntry[];
  transaction?: InvestmentTransaction;
  duplicate?: boolean;
  error?: string;
} => {
  const inv = investments.find(i => i.id === input.investmentId);
  if (!inv) return { investments, investmentTransactions, cashFlow, error: 'Investment not found.' };

  if (
    input.uniqueSourceKey &&
    investmentTransactions.some(t => !t.isReversed && t.uniqueSourceKey === input.uniqueSourceKey)
  ) {
    return { investments, investmentTransactions, cashFlow, duplicate: true };
  }

  const now = new Date().toISOString();
  const txId = uid('invtx');
  const cfId = uid('cf-inv');
  const resolvedMode = input.paymentModeChoice
    ? mapChoiceToPaymentMode(input.paymentModeChoice, input.paymentMode)
    : input.paymentMode;

  if (input.type === 'add_capital') {
    const amt = round2(Number(input.amount) || 0);
    if (amt <= 0) {
      return { investments, investmentTransactions, cashFlow, error: 'Investment amount must be greater than ₹0.' };
    }

    const cfEntry: CashFlowEntry = {
      id: cfId,
      date: input.date,
      type: 'transfer',
      accountingNature: 'investment_transfer',
      isTransfer: true,
      transferType: 'to_investment',
      category: 'Investments',
      categoryName: 'Investments',
      description: `Investment Deposit: ${inv.name} (${inv.investmentType.toUpperCase()})`,
      amount: amt,
      paymentMode: resolvedMode,
      paymentModeChoice: input.paymentModeChoice,
      accountType: input.accountType,
      bankAccountId: input.accountType === 'bank' ? input.bankAccountId : undefined,
      referenceNumber: input.transactionRef,
      investmentId: inv.id,
      sourceModule: 'investment',
      sourceDocId: txId,
      uniqueSourceKey: input.uniqueSourceKey,
      notes: input.notes,
      createdBy: input.createdBy || 'CRM User',
      createdAt: now,
    };

    const invTx: InvestmentTransaction = {
      id: txId,
      investmentId: inv.id,
      investmentName: inv.name,
      type: 'add_capital',
      amount: amt,
      date: input.date,
      accountType: input.accountType,
      bankAccountId: input.accountType === 'bank' ? input.bankAccountId : undefined,
      paymentMode: resolvedMode,
      paymentModeChoice: input.paymentModeChoice,
      transactionRef: input.transactionRef,
      notes: input.notes,
      cashFlowEntryId: cfId,
      uniqueSourceKey: input.uniqueSourceKey,
      createdBy: input.createdBy || 'CRM User',
      createdAt: now,
    };

    return {
      investments: investments.map(item =>
        item.id === inv.id
          ? {
              ...item,
              investedAmount: round2((item.investedAmount || 0) + amt),
              currentValue: round2((item.currentValue || 0) + amt),
              lastValuedAt: input.date,
              status: 'active',
              updatedAt: now,
            }
          : item
      ),
      investmentTransactions: [invTx, ...investmentTransactions],
      cashFlow: [cfEntry, ...cashFlow],
      transaction: invTx,
      duplicate: false,
    };
  }

  // Withdrawal / Maturity / Sale
  const receivedAmt = round2(Number(input.receivedAmount ?? input.amount) || 0);
  if (receivedAmt <= 0) {
    return { investments, investmentTransactions, cashFlow, error: 'Withdrawal received amount must be greater than ₹0.' };
  }

  const prevInvested = round2(Math.max(0, inv.investedAmount || 0));
  const prevValue = round2(Math.max(0, inv.currentValue || 0));

  let costBasisReduced = 0;
  if (input.isFullClosure) {
    costBasisReduced = prevInvested;
  } else if (input.amount > 0 && input.amount <= prevInvested) {
    costBasisReduced = round2(input.amount);
  } else if (prevValue > 0 && prevInvested > 0) {
    const ratio = Math.min(1, receivedAmt / prevValue);
    costBasisReduced = round2(prevInvested * ratio);
  } else {
    costBasisReduced = Math.min(prevInvested, receivedAmt);
  }

  const realizedGainLoss = round2(receivedAmt - costBasisReduced);
  const nextInvested = input.isFullClosure ? 0 : round2(Math.max(0, prevInvested - costBasisReduced));
  const nextValue = input.isFullClosure ? 0 : round2(Math.max(0, prevValue - receivedAmt));
  const nextStatus: InvestmentAccount['status'] =
    input.isFullClosure || (nextInvested <= 0.01 && nextValue <= 0.01) ? 'closed' : inv.status;

  const cfEntry: CashFlowEntry = {
    id: cfId,
    date: input.date,
    type: 'transfer',
    accountingNature: 'investment_return',
    isTransfer: true,
    transferType: 'from_investment',
    category: 'Investments',
    categoryName: 'Investments',
    description: `Investment Withdrawal: ${inv.name}${realizedGainLoss !== 0 ? ` (Realized ${realizedGainLoss >= 0 ? 'Gain' : 'Loss'}: ₹${Math.abs(realizedGainLoss).toLocaleString('en-IN')})` : ''}`,
    amount: receivedAmt,
    paymentMode: resolvedMode === 'cash' ? 'other' : resolvedMode,
    paymentModeChoice: input.paymentModeChoice,
    accountType: undefined,
    bankAccountId: undefined,
    toAccountType: input.accountType,
    toBankAccountId: input.accountType === 'bank' ? input.bankAccountId : undefined,
    referenceNumber: input.transactionRef,
    investmentId: inv.id,
    sourceModule: 'investment',
    sourceDocId: txId,
    uniqueSourceKey: input.uniqueSourceKey,
    notes: input.notes,
    createdBy: input.createdBy || 'CRM User',
    createdAt: now,
  };

  const invTx: InvestmentTransaction = {
    id: txId,
    investmentId: inv.id,
    investmentName: inv.name,
    type: 'withdrawal',
    amount: costBasisReduced,
    receivedAmount: receivedAmt,
    realizedGainLoss,
    previousValue: prevValue,
    newValue: nextValue,
    date: input.date,
    accountType: input.accountType,
    bankAccountId: input.accountType === 'bank' ? input.bankAccountId : undefined,
    paymentMode: resolvedMode,
    paymentModeChoice: input.paymentModeChoice,
    transactionRef: input.transactionRef,
    notes: input.notes,
    cashFlowEntryId: cfId,
    uniqueSourceKey: input.uniqueSourceKey,
    createdBy: input.createdBy || 'CRM User',
    createdAt: now,
  };

  return {
    investments: investments.map(item =>
      item.id === inv.id
        ? {
            ...item,
            investedAmount: nextInvested,
            currentValue: nextValue,
            realizedProfitLoss: round2((item.realizedProfitLoss || 0) + realizedGainLoss),
            lastValuedAt: input.date,
            status: nextStatus,
            updatedAt: now,
          }
        : item
    ),
    investmentTransactions: [invTx, ...investmentTransactions],
    cashFlow: [cfEntry, ...cashFlow],
    transaction: invTx,
    duplicate: false,
  };
};

// ============================================================================
// 4. STAFF SALARY MONTHLY SUMMARY & ALERTS
// ============================================================================

export interface EmployeeMonthlySalaryRow {
  employee: Employee;
  monthlyCommitment: number;
  calculatedGross: number;
  paidThisMonth: number;
  pendingThisMonth: number;
  activeAdvanceBalance: number;
  status: 'paid' | 'partial' | 'pending' | 'paused';
  paymentDay: number;
}

export const getMonthlyStaffSalarySummary = (
  employees: Employee[],
  salaryPayments: SalaryPayment[],
  attendanceRecords: AttendanceRecord[],
  salaryAdvances: SalaryAdvance[],
  monthYYYYMM: string
): {
  month: string;
  totalStaff: number;
  totalMonthlySalaryCommitment: number;
  paidThisMonth: number;
  pendingThisMonth: number;
  activeAdvanceBalance: number;
  rows: EmployeeMonthlySalaryRow[];
} => {
  const activeEmps = employees.filter(e => e.status === 'active');

  const rows: EmployeeMonthlySalaryRow[] = activeEmps.map(emp => {
    const monthRecs = attendanceRecords.filter(
      a => a.employeeId === emp.id && a.date.startsWith(monthYYYYMM)
    );
    const presentCount = monthRecs.filter(a => a.status === 'present').length;
    const halfDayCount = monthRecs.filter(a => a.status === 'half_day').length;
    const effectiveDays = presentCount + halfDayCount * 0.5;

    const existingSal = salaryPayments.find(
      s => s.employeeId === emp.id && s.month === monthYYYYMM
    );
    const monthlyBase = round2(emp.monthlySalary || (emp.dailySalary ? emp.dailySalary * 26 : 0));
    const attendanceGross = Math.round((emp.dailySalary || 0) * effectiveDays);

    // Payable uses existing register adjustments if present, otherwise monthly salary or attendance-based gross
    const commitment =
      emp.salaryStatus === 'paused'
        ? 0
        : existingSal
          ? round2(
              existingSal.calculatedSalary +
                (existingSal.bonus || 0) -
                (existingSal.advanceDeduction || 0)
            )
          : monthlyBase > 0
            ? monthlyBase
            : attendanceGross;

    const installments = existingSal?.payments || [];
    const paidThisMonth = round2(
      installments.length > 0
        ? installments.reduce((sum, p) => sum + (p.amount || 0), 0)
        : existingSal?.status === 'paid'
          ? existingSal.netPaid || 0
          : 0
    );

    const pendingThisMonth =
      emp.salaryStatus === 'paused' ? 0 : round2(Math.max(0, commitment - paidThisMonth));

    const empAdvances = round2(
      salaryAdvances
        .filter(a => a.employeeId === emp.id && a.status === 'active')
        .reduce((s, a) => s + Math.max(0, (a.amount || 0) - (a.repaidAmount || 0)), 0)
    );

    const status: EmployeeMonthlySalaryRow['status'] =
      emp.salaryStatus === 'paused'
        ? 'paused'
        : commitment > 0 && pendingThisMonth <= 0.01
          ? 'paid'
          : paidThisMonth > 0
            ? 'partial'
            : 'pending';

    return {
      employee: emp,
      monthlyCommitment: commitment,
      calculatedGross: attendanceGross,
      paidThisMonth,
      pendingThisMonth,
      activeAdvanceBalance: empAdvances,
      status,
      paymentDay: emp.salaryPaymentDay || 5,
    };
  });

  return {
    month: monthYYYYMM,
    totalStaff: activeEmps.length,
    totalMonthlySalaryCommitment: round2(rows.reduce((s, r) => s + r.monthlyCommitment, 0)),
    paidThisMonth: round2(rows.reduce((s, r) => s + r.paidThisMonth, 0)),
    pendingThisMonth: round2(rows.reduce((s, r) => s + r.pendingThisMonth, 0)),
    activeAdvanceBalance: round2(rows.reduce((s, r) => s + r.activeAdvanceBalance, 0)),
    rows,
  };
};

// ============================================================================
// 5. UNIFIED UPCOMING EXPENSE & PAYMENT ALERTS
// ============================================================================

export const buildFinancialAlerts = (params: {
  loans: LoanAccount[];
  loanPayments: LoanPayment[];
  recurringExpenses: RecurringExpense[];
  recurringDueEntries: RecurringDueEntry[];
  employees: Employee[];
  salaryPayments: SalaryPayment[];
  attendanceRecords: AttendanceRecord[];
  salaryAdvances: SalaryAdvance[];
  asOfDate?: string;
  defaultReminderDays?: number;
}): FinancialAlertItem[] => {
  const asOfDate = params.asOfDate || todayLocal();
  const currentMonth = asOfDate.slice(0, 7);
  const [yr, mo] = currentMonth.split('-').map(Number);
  const alerts: FinancialAlertItem[] = [];

  // 1. Loan EMI Alerts for current month (plus next month within 7 days)
  const emiCurrent = getMonthlyEmiSummary(params.loans, params.loanPayments, currentMonth, asOfDate);
  emiCurrent.rows.forEach(row => {
    const severity = classifyAlertSeverity(row.daysRemaining, row.isPaid);
    if (!row.isPaid || severity === 'paid') {
      alerts.push({
        id: `alert-emi-${row.loanId}-${row.emiPeriod}`,
        sourceType: 'loan_emi',
        sourceId: row.loanId,
        duePeriod: row.emiPeriod,
        title: `${row.loanName} (${row.lenderName}) EMI`,
        subtitle: `${row.loanType.replace('_', ' ').toUpperCase()} · Period ${row.emiPeriod}`,
        dueDate: row.dueDate,
        amount: row.isPaid ? row.paidAmount : Math.max(0, row.emiAmount - row.paidAmount),
        severity,
        daysRemaining: row.daysRemaining,
        isPaid: row.isPaid,
        actionTab: 'emi_calendar',
      });
    }
  });

  // 2. Gold Loan Interest & Renewal / Maturity Alerts
  params.loans
    .filter(l => l.status === 'active' && l.loanType === 'gold')
    .forEach(gold => {
      if (gold.interestDueDate && !gold.interestDueDate.startsWith(currentMonth)) {
        const dRem = diffDays(asOfDate, gold.interestDueDate);
        if (dRem <= 14) {
          alerts.push({
            id: `alert-gold-int-${gold.id}`,
            sourceType: 'gold_interest',
            sourceId: gold.id,
            title: `Gold Loan Interest Due: ${gold.loanName}`,
            subtitle: `Pledge #${gold.pledgeReferenceNumber || 'N/A'} · ${gold.lenderName}`,
            dueDate: gold.interestDueDate,
            amount: gold.interestPending || 0,
            severity: classifyAlertSeverity(dRem, false),
            daysRemaining: dRem,
            isPaid: false,
            actionTab: 'loans',
          });
        }
      }
      if (gold.renewalMaturityDate) {
        const dRem = diffDays(asOfDate, gold.renewalMaturityDate);
        if (dRem <= 30) {
          alerts.push({
            id: `alert-gold-ren-${gold.id}`,
            sourceType: 'gold_renewal',
            sourceId: gold.id,
            title: `Gold Loan Renewal / Maturity: ${gold.loanName}`,
            subtitle: `${gold.goldWeightGrams ? `${gold.goldWeightGrams}g (${gold.goldPurity || '22K'}) · ` : ''}${gold.lenderName}`,
            dueDate: gold.renewalMaturityDate,
            amount: gold.outstandingPrincipal,
            severity: classifyAlertSeverity(dRem, false),
            daysRemaining: dRem,
            isPaid: false,
            actionTab: 'loans',
          });
        }
      }
    });

  // 3. Recurring Expenses Alerts (pending & recently paid in current month)
  const tplMap = new Map(params.recurringExpenses.map(t => [t.id, t]));
  params.recurringDueEntries.forEach(due => {
    if (due.status === 'skipped') return;
    const tpl = tplMap.get(due.recurringExpenseId);
    const isPaid = due.status === 'paid';
    if (isPaid && !due.dueDate.startsWith(currentMonth)) return;
    const dRem = diffDays(asOfDate, due.dueDate);
    const leadWindow = Math.max(7, tpl?.reminderDaysBefore || params.defaultReminderDays || 7);
    if (!isPaid && dRem > leadWindow) return;

    alerts.push({
      id: `alert-rec-${due.id}`,
      sourceType: 'recurring',
      sourceId: due.id,
      duePeriod: due.duePeriod,
      title: due.expenseName,
      subtitle: [due.categoryName, due.subcategory, due.secondSubcategory].filter(Boolean).join(' › '),
      dueDate: due.dueDate,
      amount: isPaid ? due.paidAmount || due.amountDue : due.amountDue,
      severity: classifyAlertSeverity(dRem, isPaid),
      daysRemaining: dRem,
      isPaid,
      actionTab: 'recurring',
    });
  });

  // 4. Staff Salary Due Alerts for current month
  const salSummary = getMonthlyStaffSalarySummary(
    params.employees,
    params.salaryPayments,
    params.attendanceRecords,
    params.salaryAdvances,
    currentMonth
  );
  salSummary.rows.forEach(row => {
    if (row.status === 'paused' || row.monthlyCommitment <= 0) return;
    const dueDate = clampDayInMonth(yr, mo, row.paymentDay || 5);
    const dRem = diffDays(asOfDate, dueDate);
    const isPaid = row.status === 'paid';
    if (!isPaid && dRem > 10) return;

    alerts.push({
      id: `alert-sal-${row.employee.id}-${currentMonth}`,
      sourceType: 'salary',
      sourceId: row.employee.id,
      duePeriod: currentMonth,
      title: `Staff Salary: ${row.employee.name}`,
      subtitle: `${row.employee.role} · Paid ₹${row.paidThisMonth.toLocaleString('en-IN')} / ₹${row.monthlyCommitment.toLocaleString('en-IN')}`,
      dueDate,
      amount: isPaid ? row.paidThisMonth : row.pendingThisMonth,
      severity: classifyAlertSeverity(dRem, isPaid),
      daysRemaining: dRem,
      isPaid,
      actionTab: 'salary',
    });
  });

  const order: Record<FinancialAlertSeverity, number> = {
    overdue: 0,
    due_today: 1,
    due_tomorrow: 2,
    due_3_days: 3,
    due_7_days: 4,
    upcoming: 5,
    paid: 6,
  };

  return alerts.sort(
    (a, b) => order[a.severity] - order[b.severity] || a.dueDate.localeCompare(b.dueDate)
  );
};

// ============================================================================
// 6. COMPLETE FINANCIAL DASHBOARD & MONTHLY / YEARLY REPORTS
// ============================================================================

export const computeAccountBalancesAsOf = (
  cashFlow: CashFlowEntry[],
  bankAccounts: BankAccount[],
  openingCashBalance: number,
  asOfDateEnd?: string
): {
  cashBalance: number;
  totalBankBalance: number;
  totalOperatingBalance: number;
  bankBalancesById: Record<string, number>;
} => {
  let cashIn = 0;
  let cashOut = 0;
  const bankMap = new Map<string, number>();

  bankAccounts.forEach(b => {
    bankMap.set(b.id, Number(b.openingBalance) || 0);
  });

  cashFlow.forEach(e => {
    if (e.isReversed) return;
    if (asOfDateEnd && e.date > asOfDateEnd) return;
    const amt = Number(e.amount) || 0;
    if (amt <= 0) return;

    const isExternalReturn =
      (e.accountingNature === 'savings_transfer' || e.accountingNature === 'investment_return') &&
      !e.accountType;
    const isCashSrc =
      !isExternalReturn && (e.accountType === 'cash' || (!e.accountType && e.paymentMode === 'cash'));
    const isCashDest = e.toAccountType === 'cash';

    if (e.isTransfer || e.type === 'transfer') {
      if (isCashSrc) cashOut += amt;
      if (isCashDest) cashIn += amt;
      if (e.accountType === 'bank' && e.bankAccountId && bankMap.has(e.bankAccountId)) {
        bankMap.set(e.bankAccountId, bankMap.get(e.bankAccountId)! - amt);
      }
      if (e.toAccountType === 'bank' && e.toBankAccountId && bankMap.has(e.toBankAccountId)) {
        bankMap.set(e.toBankAccountId, bankMap.get(e.toBankAccountId)! + amt);
      }
    } else if (e.type === 'income') {
      if (isCashSrc) {
        cashIn += amt;
      } else {
        const bankId = e.bankAccountId || bankAccounts[0]?.id;
        if (bankId && bankMap.has(bankId)) {
          bankMap.set(bankId, bankMap.get(bankId)! + amt);
        }
      }
    } else if (e.type === 'expense') {
      if (isCashSrc) {
        cashOut += amt;
      } else {
        const bankId = e.bankAccountId || bankAccounts[0]?.id;
        if (bankId && bankMap.has(bankId)) {
          bankMap.set(bankId, bankMap.get(bankId)! - amt);
        }
      }
    }
  });

  const cashBalance = round2(openingCashBalance + cashIn - cashOut);
  let totalBankBalance = 0;
  const bankBalancesById: Record<string, number> = {};
  bankAccounts.forEach(b => {
    const bal = round2(bankMap.get(b.id) || 0);
    bankBalancesById[b.id] = bal;
    if (b.isActive) totalBankBalance += bal;
  });
  totalBankBalance = round2(totalBankBalance);

  return {
    cashBalance,
    totalBankBalance,
    totalOperatingBalance: round2(cashBalance + totalBankBalance),
    bankBalancesById,
  };
};

export interface CompleteFinancialDashboard {
  // 1. Operating Cash & Bank (Liquid Funds - NEVER includes Loans, Receivables, Investments)
  cashBalance: number;
  bankBalance: number;
  totalOperatingAvailableBalance: number;
  // 2. Receivables & Payables
  customerReceivables: number;
  vendorPayables: number;
  // 3. Loan Liabilities (Regular + Gold)
  totalOriginalLoans: number;
  totalOutstandingLoanLiabilities: number;
  regularLoansOutstanding: number;
  goldLoansOutstanding: number;
  totalMonthlyEmi: number;
  overdueEmiAmount: number;
  // 4. Savings & Reserves
  totalSavingsBalance: number;
  unlinkedSavingsBalance: number;
  linkedSavingsBalance: number;
  // 5. Investments
  totalInvestedAmount: number;
  totalInvestmentCurrentValue: number;
  investmentUnrealizedGainLoss: number;
  investmentRealizedGainLoss: number;
  // 6. Operating Income & Expenses (Current Month - excludes transfers & loan principal)
  thisMonthOperatingIncome: number;
  thisMonthOperatingExpenses: number;
  thisMonthStaffSalaryPending: number;
  thisMonthRecurringPending: number;
}

export const computeCompleteFinancialDashboard = (params: {
  cashFlow: CashFlowEntry[];
  bankAccounts: BankAccount[];
  openingCashBalance: number;
  invoices: Invoice[];
  vendorBills: VendorBill[];
  loans: LoanAccount[];
  loanPayments: LoanPayment[];
  recurringDueEntries: RecurringDueEntry[];
  savingsAccounts: SavingsAccount[];
  investments: InvestmentAccount[];
  employees: Employee[];
  salaryPayments: SalaryPayment[];
  attendanceRecords: AttendanceRecord[];
  salaryAdvances: SalaryAdvance[];
  asOfDate?: string;
}): CompleteFinancialDashboard => {
  const asOfDate = params.asOfDate || todayLocal();
  const month = asOfDate.slice(0, 7);

  const balances = computeAccountBalancesAsOf(
    params.cashFlow,
    params.bankAccounts,
    params.openingCashBalance
  );

  const customerReceivables = round2(
    params.invoices
      .filter(i => i.type === 'invoice' && i.status !== 'cancelled')
      .reduce((s, i) => s + amountDue(i), 0)
  );

  const vendorPayables = round2(
    params.vendorBills.reduce((s, b) => s + Math.max(0, (b.totalAmount || 0) - (b.paidAmount || 0)), 0)
  );

  const loanMetrics = getLoanDashboardMetrics(params.loans, params.loanPayments, asOfDate);

  const activeSavings = params.savingsAccounts.filter(s => s.isActive);
  const totalSavingsBalance = round2(activeSavings.reduce((s, a) => s + (a.currentBalance || 0), 0));
  const linkedSavingsBalance = round2(
    activeSavings.filter(a => Boolean(a.linkedBankAccountId)).reduce((s, a) => s + (a.currentBalance || 0), 0)
  );
  const unlinkedSavingsBalance = round2(totalSavingsBalance - linkedSavingsBalance);

  const activeInvestments = params.investments.filter(i => i.status !== 'closed');
  const totalInvestedAmount = round2(activeInvestments.reduce((s, i) => s + (i.investedAmount || 0), 0));
  const totalInvestmentCurrentValue = round2(
    activeInvestments.reduce((s, i) => s + (i.currentValue || 0), 0)
  );
  const investmentUnrealizedGainLoss = round2(totalInvestmentCurrentValue - totalInvestedAmount);
  const investmentRealizedGainLoss = round2(
    params.investments.reduce((s, i) => s + (i.realizedProfitLoss || 0), 0)
  );

  let thisMonthOperatingIncome = 0;
  let thisMonthOperatingExpenses = 0;
  params.cashFlow.forEach(e => {
    if (!e.date.startsWith(month)) return;
    if (isOperatingIncomeEntry(e)) thisMonthOperatingIncome += Number(e.amount) || 0;
    else if (isOperatingExpenseEntry(e)) thisMonthOperatingExpenses += Number(e.amount) || 0;
  });

  const salSummary = getMonthlyStaffSalarySummary(
    params.employees,
    params.salaryPayments,
    params.attendanceRecords,
    params.salaryAdvances,
    month
  );

  const thisMonthRecurringPending = round2(
    params.recurringDueEntries
      .filter(d => d.status === 'pending' && d.dueDate.startsWith(month))
      .reduce((s, d) => s + (d.amountDue || 0), 0)
  );

  return {
    cashBalance: balances.cashBalance,
    bankBalance: balances.totalBankBalance,
    totalOperatingAvailableBalance: balances.totalOperatingBalance,
    customerReceivables,
    vendorPayables,
    totalOriginalLoans: loanMetrics.totalOriginalLoanAmount,
    totalOutstandingLoanLiabilities: loanMetrics.totalOutstandingBalance,
    regularLoansOutstanding: loanMetrics.regularOutstanding,
    goldLoansOutstanding: loanMetrics.goldOutstanding,
    totalMonthlyEmi: loanMetrics.totalMonthlyEmi,
    overdueEmiAmount: loanMetrics.overdueEmiAmount,
    totalSavingsBalance,
    unlinkedSavingsBalance,
    linkedSavingsBalance,
    totalInvestedAmount,
    totalInvestmentCurrentValue,
    investmentUnrealizedGainLoss,
    investmentRealizedGainLoss,
    thisMonthOperatingIncome: round2(thisMonthOperatingIncome),
    thisMonthOperatingExpenses: round2(thisMonthOperatingExpenses),
    thisMonthStaffSalaryPending: salSummary.pendingThisMonth,
    thisMonthRecurringPending,
  };
};

export interface MonthlyFinancialReport {
  month: string; // YYYY-MM
  // 1. Business Operating Income & Expenses
  monthlyIncome: number;
  monthlyOperatingExpenses: number;
  netOperatingProfit: number;
  // Operating Expense Components (sum === monthlyOperatingExpenses)
  staffSalaryPaid: number;
  recurringExpensesPaid: number;
  loanInterestPaid: number;
  loanChargesPaid: number;
  otherOperatingExpenses: number;
  // 2. Liability Repayments (NOT Operating Expenses)
  loanPrincipalRepaid: number;
  totalEmiPaid: number; // Principal + Interest + Charges
  // 3. Asset & Reserve Transfers (NOT Operating Expenses or Income)
  savingsDeposits: number;
  savingsWithdrawals: number;
  investmentDeposits: number;
  investmentWithdrawals: number;
  investmentRealizedGainLoss: number;
  // 4. Receivables & Payables Flow
  customerPaymentsReceived: number;
  vendorPaymentsMade: number;
  // 5. Closing Balances as of month-end
  closingCashBalance: number;
  closingBankBalance: number;
  closingTotalOperatingBalance: number;
}

export const computeMonthlyFinancialReport = (params: {
  month: string; // YYYY-MM
  cashFlow: CashFlowEntry[];
  bankAccounts: BankAccount[];
  openingCashBalance: number;
  loanPayments: LoanPayment[];
  investmentTransactions: InvestmentTransaction[];
}): MonthlyFinancialReport => {
  const { month, cashFlow, bankAccounts, openingCashBalance, loanPayments, investmentTransactions } = params;
  const monthEntries = cashFlow.filter(e => !e.isReversed && e.date.startsWith(month));

  let monthlyIncome = 0;
  let staffSalaryPaid = 0;
  let recurringExpensesPaid = 0;
  let loanInterestFlow = 0;
  let otherOperatingExpenses = 0;
  let loanPrincipalRepaid = 0;

  let savingsDeposits = 0;
  let savingsWithdrawals = 0;
  let investmentDeposits = 0;
  let investmentWithdrawals = 0;

  let customerPaymentsReceived = 0;
  let vendorPaymentsMade = 0;

  monthEntries.forEach(e => {
    const amt = Number(e.amount) || 0;
    if (amt <= 0) return;

    // Asset / Reserve transfers
    if (e.isTransfer || e.type === 'transfer') {
      if (e.accountingNature === 'savings_transfer') {
        if (e.transferType === 'to_savings') savingsDeposits += amt;
        else if (e.transferType === 'from_savings') savingsWithdrawals += amt;
      } else if (e.accountingNature === 'investment_transfer') {
        investmentDeposits += amt;
      } else if (e.accountingNature === 'investment_return') {
        investmentWithdrawals += amt;
      }
      return;
    }

    if (e.type === 'income') {
      if (isOperatingIncomeEntry(e)) {
        monthlyIncome += amt;
        if (
          e.sourceModule === 'billing' ||
          e.sourceModule === 'customer' ||
          e.sourceModule === 'job_card' ||
          Boolean(e.invoiceId || e.customerId)
        ) {
          customerPaymentsReceived += amt;
        }
      }
      return;
    }

    if (e.type === 'expense') {
      if (e.accountingNature === 'loan_principal') {
        loanPrincipalRepaid += amt;
        return;
      }
      if (!isOperatingExpenseEntry(e)) return;

      if (e.sourceModule === 'salary' || e.categoryId === 'mfc-salary') {
        staffSalaryPaid += amt;
      } else if (e.sourceModule === 'recurring') {
        recurringExpensesPaid += amt;
      } else if (e.accountingNature === 'loan_interest' || e.sourceModule === 'loan') {
        loanInterestFlow += amt;
      } else {
        otherOperatingExpenses += amt;
      }

      if (e.sourceModule === 'vendor' || Boolean(e.vendorBillId)) {
        vendorPaymentsMade += amt;
      }
    }
  });

  // Exact interest vs charges split from loanPayments when available
  const monthLoanPayments = loanPayments.filter(p => !p.isReversed && p.paymentDate.startsWith(month));
  const loanInterestExact = round2(monthLoanPayments.reduce((s, p) => s + (p.interestComponent || 0), 0));
  const loanChargesExact = round2(monthLoanPayments.reduce((s, p) => s + (p.chargesComponent || 0), 0));
  const loanInterestPaid =
    loanInterestExact + loanChargesExact > 0 ? loanInterestExact : round2(loanInterestFlow);
  const loanChargesPaid =
    loanInterestExact + loanChargesExact > 0 ? loanChargesExact : 0;

  const monthlyOperatingExpenses = round2(
    staffSalaryPaid + recurringExpensesPaid + loanInterestFlow + otherOperatingExpenses
  );

  const investmentRealizedGainLoss = round2(
    investmentTransactions
      .filter(t => !t.isReversed && t.type === 'withdrawal' && t.date.startsWith(month))
      .reduce((s, t) => s + (t.realizedGainLoss || 0), 0)
  );

  const closingBalances = computeAccountBalancesAsOf(
    cashFlow,
    bankAccounts,
    openingCashBalance,
    `${month}-31`
  );

  return {
    month,
    monthlyIncome: round2(monthlyIncome),
    monthlyOperatingExpenses,
    netOperatingProfit: round2(monthlyIncome - monthlyOperatingExpenses),
    staffSalaryPaid: round2(staffSalaryPaid),
    recurringExpensesPaid: round2(recurringExpensesPaid),
    loanInterestPaid,
    loanChargesPaid,
    otherOperatingExpenses: round2(otherOperatingExpenses),
    loanPrincipalRepaid: round2(loanPrincipalRepaid),
    totalEmiPaid: round2(loanPrincipalRepaid + loanInterestFlow),
    savingsDeposits: round2(savingsDeposits),
    savingsWithdrawals: round2(savingsWithdrawals),
    investmentDeposits: round2(investmentDeposits),
    investmentWithdrawals: round2(investmentWithdrawals),
    investmentRealizedGainLoss,
    customerPaymentsReceived: round2(customerPaymentsReceived),
    vendorPaymentsMade: round2(vendorPaymentsMade),
    closingCashBalance: closingBalances.cashBalance,
    closingBankBalance: closingBalances.totalBankBalance,
    closingTotalOperatingBalance: closingBalances.totalOperatingBalance,
  };
};

export const computeYearlyFinancialComparison = (params: {
  year: string; // YYYY
  cashFlow: CashFlowEntry[];
  bankAccounts: BankAccount[];
  openingCashBalance: number;
  loanPayments: LoanPayment[];
  investmentTransactions: InvestmentTransaction[];
}): MonthlyFinancialReport[] => {
  const reports: MonthlyFinancialReport[] = [];
  for (let m = 1; m <= 12; m++) {
    const month = `${params.year}-${String(m).padStart(2, '0')}`;
    reports.push(
      computeMonthlyFinancialReport({
        ...params,
        month,
      })
    );
  }
  return reports;
};

export const monthlyFinancialReportToCsv = (report: MonthlyFinancialReport): string => {
  const rows: [string, string, number][] = [
    ['Cash Flow', 'Monthly Operating Income', report.monthlyIncome],
    ['Cash Flow', 'Monthly Operating Expenses', report.monthlyOperatingExpenses],
    ['Cash Flow', 'Net Operating Surplus', report.netOperatingProfit],
    ['Operating Expenses', 'Staff Salary Paid', report.staffSalaryPaid],
    ['Operating Expenses', 'Rent & Recurring Expenses Paid', report.recurringExpensesPaid],
    ['Operating Expenses', 'Loan Interest Paid', report.loanInterestPaid],
    ['Operating Expenses', 'Loan Charges Paid', report.loanChargesPaid],
    ['Operating Expenses', 'Other Business Expenses', report.otherOperatingExpenses],
    ['Liability Repayments', 'Loan Principal Repaid (Non-Expense)', report.loanPrincipalRepaid],
    ['Liability Repayments', 'Total EMI Paid', report.totalEmiPaid],
    ['Asset Transfers', 'Savings Deposits (Transfer)', report.savingsDeposits],
    ['Asset Transfers', 'Savings Withdrawals (Transfer)', report.savingsWithdrawals],
    ['Asset Transfers', 'Investment Deposits (Transfer)', report.investmentDeposits],
    ['Asset Transfers', 'Investment Withdrawals (Transfer)', report.investmentWithdrawals],
    ['Asset Transfers', 'Investment Realized Gain/Loss', report.investmentRealizedGainLoss],
    ['Receivables & Payables', 'Customer Payments Received', report.customerPaymentsReceived],
    ['Receivables & Payables', 'Vendor Payments Made', report.vendorPaymentsMade],
    ['Closing Balances', 'Closing Cash Balance', report.closingCashBalance],
    ['Closing Balances', 'Closing Bank Balance', report.closingBankBalance],
    ['Closing Balances', 'Total Closing Available Balance', report.closingTotalOperatingBalance],
  ];
  return [
    'Section,Particulars,Amount (INR)',
    ...rows.map(([sec, part, amt]) => `"${sec}","${part}",${amt}`),
  ].join('\n');
};
