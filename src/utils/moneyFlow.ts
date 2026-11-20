import {
  BankAccount,
  CashFlowEntry,
  Customer,
  CustomerPaymentAllocation,
  Invoice,
  InvoicePaymentRecord,
  JobCard,
  ManualQuotation,
  MoneyFlowCategory,
  MoneyFlowCategoryType,
  PaymentAccountType,
  PaymentMode,
  PaymentModeChoice,
} from '../types';
import { addDays, amountDue, round2, todayLocal } from './accounting';

// ============================================================================
// 1. DEFAULT 3-LEVEL MONEY FLOW CATEGORIES & MANAGEMENT HELPERS
// ============================================================================

const NOW_SEED = '2026-01-01T00:00:00.000Z';

const cat = (
  id: string,
  name: string,
  level: 1 | 2 | 3,
  parentId: string | null,
  type: MoneyFlowCategoryType
): MoneyFlowCategory => ({
  id,
  name,
  level,
  parentId,
  type,
  isActive: true,
  createdAt: NOW_SEED,
  updatedAt: NOW_SEED,
  createdBy: 'system',
});

export const DEFAULT_MONEY_FLOW_CATEGORIES: MoneyFlowCategory[] = [
  // Food Expenses (Requested Example Hierarchy)
  cat('mfc-food', 'Food Expenses', 1, null, 'expense'),
  cat('mfc-food-dinner', 'Dinner / Lunch', 2, 'mfc-food', 'expense'),
  cat('mfc-food-dinner-office', 'Office', 3, 'mfc-food-dinner', 'expense'),
  cat('mfc-food-dinner-home', 'Home', 3, 'mfc-food-dinner', 'expense'),
  cat('mfc-food-tea', 'Tea', 2, 'mfc-food', 'expense'),
  cat('mfc-food-tea-office', 'Office', 3, 'mfc-food-tea', 'expense'),
  cat('mfc-food-tea-home', 'Home', 3, 'mfc-food-tea', 'expense'),

  // Travel Expenses (Requested Example Hierarchy)
  cat('mfc-travel', 'Travel Expenses', 1, null, 'expense'),
  cat('mfc-travel-petrol', 'Petrol', 2, 'mfc-travel', 'expense'),
  cat('mfc-travel-petrol-bike', 'Bike', 3, 'mfc-travel-petrol', 'expense'),
  cat('mfc-travel-petrol-car', 'Car', 3, 'mfc-travel-petrol', 'expense'),
  cat('mfc-travel-petrol-visit', 'Business Visit', 3, 'mfc-travel-petrol', 'expense'),
  cat('mfc-travel-transport', 'Transport', 2, 'mfc-travel', 'expense'),
  cat('mfc-travel-transport-cust', 'Customer Visit', 3, 'mfc-travel-transport', 'expense'),
  cat('mfc-travel-transport-stock', 'Stock Purchase', 3, 'mfc-travel-transport', 'expense'),

  // Office & Workshop Expenses
  cat('mfc-office', 'Office Expenses', 1, null, 'expense'),
  cat('mfc-office-rent', 'Shop Rent', 2, 'mfc-office', 'expense'),
  cat('mfc-office-eb', 'Electricity (EB)', 2, 'mfc-office', 'expense'),
  cat('mfc-office-internet', 'Internet & Broadband', 2, 'mfc-office', 'expense'),
  cat('mfc-office-stationery', 'Stationery & Print', 2, 'mfc-office', 'expense'),

  // Tools, Spares & Consumables
  cat('mfc-tools', 'Tools & Consumables', 1, null, 'expense'),
  cat('mfc-tools-repair', 'Soldering & Repair Spares', 2, 'mfc-tools', 'expense'),
  cat('mfc-tools-cables', 'Wire, Cable & Accessories', 2, 'mfc-tools', 'expense'),

  // Vendor & Stock Purchase
  cat('mfc-vendor', 'Vendor Payment', 1, null, 'expense'),
  cat('mfc-vendor-stock', 'Stock Purchase Bill', 2, 'mfc-vendor', 'expense'),
  cat('mfc-vendor-stock-spares', 'Computer & Laptop Spares', 3, 'mfc-vendor-stock', 'expense'),
  cat('mfc-vendor-stock-cctv', 'CCTV & Networking', 3, 'mfc-vendor-stock', 'expense'),

  // Salary & Staff
  cat('mfc-salary', 'Salary & Staff Wages', 1, null, 'expense'),
  cat('mfc-salary-monthly', 'Monthly Salary', 2, 'mfc-salary', 'expense'),
  cat('mfc-salary-advance', 'Staff Advance', 2, 'mfc-salary', 'expense'),

  // Customer Payments (Income)
  cat('mfc-cust-pay', 'Customer Payment', 1, null, 'income'),
  cat('mfc-cust-pay-inv', 'Invoice Settlement', 2, 'mfc-cust-pay', 'income'),
  cat('mfc-cust-pay-inv-sgs', 'SGS Tax Invoice', 3, 'mfc-cust-pay-inv', 'income'),
  cat('mfc-cust-pay-inv-pc', 'Pandiyan Estimate', 3, 'mfc-cust-pay-inv', 'income'),
  cat('mfc-cust-pay-adv', 'Advance Receipt', 2, 'mfc-cust-pay', 'income'),
  cat('mfc-cust-pay-adv-job', 'Job Card Advance', 3, 'mfc-cust-pay-adv', 'income'),
  cat('mfc-cust-pay-adv-credit', 'Customer Credit', 3, 'mfc-cust-pay-adv', 'income'),

  // Sales & Service Income
  cat('mfc-sales', 'Sales & Service Income', 1, null, 'income'),
  cat('mfc-sales-service', 'Workshop Service Charge', 2, 'mfc-sales', 'income'),
  cat('mfc-sales-cctv', 'CCTV Installation', 2, 'mfc-sales', 'income'),
  cat('mfc-sales-hardware', 'Hardware Sales', 2, 'mfc-sales', 'income'),

  // Loans & Interest
  cat('mfc-loans', 'Loans & Interest', 1, null, 'expense'),
  cat('mfc-loans-interest', 'Loan Interest Paid', 2, 'mfc-loans', 'expense'),
  cat('mfc-loans-charges', 'Processing & Closure Charges', 2, 'mfc-loans', 'expense'),

  // Other / Misc
  cat('mfc-other-in', 'Other Income', 1, null, 'income'),
  cat('mfc-other-out', 'Other Expenses', 1, null, 'expense'),
];

export const ensureDefaultCategories = (existing: MoneyFlowCategory[]): MoneyFlowCategory[] => {
  if (!existing || existing.length === 0) {
    return DEFAULT_MONEY_FLOW_CATEGORIES.map(c => ({ ...c }));
  }
  const existingIds = new Set(existing.map(c => c.id));
  const missingCore = DEFAULT_MONEY_FLOW_CATEGORIES.filter(
    c => c.id.startsWith('mfc-loans') && !existingIds.has(c.id)
  );
  if (missingCore.length === 0) return existing;
  return [...existing, ...missingCore.map(c => ({ ...c }))];
};

/**
 * Operating Expense vs Liability/Asset Transfer classifier.
 * - Transfers, Loan Principal repayments, Savings transfers, and Investment deposits
 *   deduct Cash/Bank balances cleanly, but MUST NOT inflate Business Operating Expenses.
 * - Loan Interest & Charges ARE operating expenses.
 */
export const isOperatingExpenseEntry = (e: CashFlowEntry): boolean => {
  if (!e || e.isReversed || e.isTransfer || e.type !== 'expense') return false;
  if (
    e.accountingNature === 'loan_principal' ||
    e.accountingNature === 'savings_transfer' ||
    e.accountingNature === 'investment_transfer' ||
    e.accountingNature === 'transfer'
  ) {
    return false;
  }
  return true;
};

/**
 * Operating Income classifier.
 * - Transfers, Loan disbursements, Savings withdrawals, and Investment capital returns
 *   increase Cash/Bank balances cleanly, but MUST NOT inflate Business Operating Income.
 */
export const isOperatingIncomeEntry = (e: CashFlowEntry): boolean => {
  if (!e || e.isReversed || e.isTransfer || e.type !== 'income') return false;
  if (
    e.accountingNature === 'loan_disbursement' ||
    e.accountingNature === 'savings_transfer' ||
    e.accountingNature === 'investment_return' ||
    e.accountingNature === 'transfer'
  ) {
    return false;
  }
  return true;
};

export const normalizeCategoryName = (name: string): string =>
  (name || '').trim().replace(/\s+/g, ' ');

export const validateCategoryDuplicate = (
  categories: MoneyFlowCategory[],
  name: string,
  level: 1 | 2 | 3,
  parentId: string | null,
  type?: MoneyFlowCategoryType,
  excludeId?: string
): { valid: boolean; error?: string } => {
  const clean = normalizeCategoryName(name);
  if (!clean) {
    return { valid: false, error: 'Category name cannot be empty.' };
  }
  const lower = clean.toLowerCase();
  const conflict = categories.find(c => {
    if (excludeId && c.id === excludeId) return false;
    if (c.level !== level) return false;
    if ((c.parentId || null) !== (parentId || null)) return false;
    if (level === 1 && type && type !== 'both' && c.type !== 'both' && c.type !== type) {
      return false;
    }
    return normalizeCategoryName(c.name).toLowerCase() === lower;
  });
  if (conflict) {
    return {
      valid: false,
      error: `"${clean}" already exists under this parent.`,
    };
  }
  return { valid: true };
};

export const createMoneyFlowCategoryNode = (
  categories: MoneyFlowCategory[],
  input: {
    name: string;
    level: 1 | 2 | 3;
    parentId: string | null;
    type: MoneyFlowCategoryType;
    createdBy?: string;
  }
): { category: MoneyFlowCategory; categories: MoneyFlowCategory[] } => {
  const clean = normalizeCategoryName(input.name);
  const check = validateCategoryDuplicate(categories, clean, input.level, input.parentId, input.type);
  if (!check.valid) {
    throw new Error(check.error || 'Duplicate category name');
  }
  if (input.level > 1 && !input.parentId) {
    throw new Error('Parent category is required for Subcategory and 2nd Subcategory.');
  }
  const now = new Date().toISOString();
  const node: MoneyFlowCategory = {
    id: `mfc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: clean,
    level: input.level,
    parentId: input.level === 1 ? null : input.parentId,
    type: input.type,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy || 'CRM User',
  };
  return {
    category: node,
    categories: [...categories, node],
  };
};

export const renameMoneyFlowCategoryNode = (
  categories: MoneyFlowCategory[],
  id: string,
  newName: string
): MoneyFlowCategory[] => {
  const target = categories.find(c => c.id === id);
  if (!target) throw new Error('Category not found.');
  const clean = normalizeCategoryName(newName);
  const check = validateCategoryDuplicate(categories, clean, target.level, target.parentId, target.type, id);
  if (!check.valid) {
    throw new Error(check.error || 'Duplicate category name');
  }
  const now = new Date().toISOString();
  return categories.map(c => (c.id === id ? { ...c, name: clean, updatedAt: now } : c));
};

export const toggleMoneyFlowCategoryNodeActive = (
  categories: MoneyFlowCategory[],
  id: string,
  isActive?: boolean
): MoneyFlowCategory[] => {
  const now = new Date().toISOString();
  return categories.map(c =>
    c.id === id ? { ...c, isActive: isActive !== undefined ? isActive : !c.isActive, updatedAt: now } : c
  );
};

export const resolveCategoryNames = (
  entry: Pick<
    CashFlowEntry,
    'category' | 'categoryId' | 'categoryName' | 'subcategory' | 'subcategoryId' | 'secondSubcategory' | 'secondSubcategoryId'
  >,
  categories: MoneyFlowCategory[]
): {
  categoryName: string;
  subcategoryName: string;
  secondSubcategoryName: string;
  breadcrumb: string;
} => {
  const catNode = entry.categoryId ? categories.find(c => c.id === entry.categoryId) : undefined;
  const subNode = entry.subcategoryId ? categories.find(c => c.id === entry.subcategoryId) : undefined;
  const thirdNode = entry.secondSubcategoryId ? categories.find(c => c.id === entry.secondSubcategoryId) : undefined;

  const categoryName = catNode?.name || entry.categoryName || entry.category || 'Uncategorized';
  const subcategoryName = subNode?.name || entry.subcategory || '';
  const secondSubcategoryName = thirdNode?.name || entry.secondSubcategory || '';

  const parts = [categoryName, subcategoryName, secondSubcategoryName].filter(Boolean);
  return {
    categoryName,
    subcategoryName,
    secondSubcategoryName,
    breadcrumb: parts.join(' › '),
  };
};

// ============================================================================
// 2. PAYMENT MODE & ACCOUNT VALIDATION
// ============================================================================

export const mapChoiceToPaymentMode = (choice: PaymentModeChoice, explicitMode?: PaymentMode): PaymentMode => {
  if (explicitMode && choice === 'other') return explicitMode;
  switch (choice) {
    case 'cash':
      return 'cash';
    case 'bank':
      return 'bank_transfer';
    case 'upi':
      return 'upi';
    case 'other':
    default:
      return explicitMode || 'other';
  }
};

export const paymentModeToChoice = (mode?: PaymentMode): PaymentModeChoice => {
  if (mode === 'cash') return 'cash';
  if (mode === 'upi') return 'upi';
  if (mode === 'bank_transfer' || mode === 'card' || mode === 'cheque') return 'bank';
  return 'other';
};

export const validatePaymentAccountSelection = (params: {
  paymentModeChoice: PaymentModeChoice;
  accountType: PaymentAccountType;
  bankAccountId?: string;
  bankAccounts: BankAccount[];
  transactionRef?: string;
  requireReferenceForOther?: boolean;
}): {
  valid: boolean;
  error?: string;
  resolvedAccountType: PaymentAccountType;
  resolvedBankAccountId?: string;
  resolvedBankName?: string;
} => {
  const {
    paymentModeChoice,
    accountType,
    bankAccountId,
    bankAccounts,
    transactionRef,
    requireReferenceForOther = true,
  } = params;

  const activeBanks = bankAccounts.filter(b => b.isActive);

  if (paymentModeChoice === 'cash') {
    return {
      valid: true,
      resolvedAccountType: 'cash',
      resolvedBankAccountId: undefined,
      resolvedBankName: 'Cash Account',
    };
  }

  if (paymentModeChoice === 'bank') {
    if (!bankAccountId) {
      return {
        valid: false,
        error: activeBanks.length === 0
          ? 'No active Bank Account found. Add a Bank Account in Money Flow first or choose Cash.'
          : 'Please select the Bank Account for this bank payment.',
        resolvedAccountType: 'bank',
      };
    }
    const bank = bankAccounts.find(b => b.id === bankAccountId);
    if (!bank) {
      return {
        valid: false,
        error: 'Selected Bank Account does not exist.',
        resolvedAccountType: 'bank',
      };
    }
    return {
      valid: true,
      resolvedAccountType: 'bank',
      resolvedBankAccountId: bank.id,
      resolvedBankName: bank.bankName,
    };
  }

  // UPI or Other: user chooses Cash Account OR specific Bank Account
  if (paymentModeChoice === 'other' && requireReferenceForOther && !(transactionRef || '').trim()) {
    return {
      valid: false,
      error: 'Please enter a reference or description for Other payment mode.',
      resolvedAccountType: accountType,
    };
  }

  if (accountType === 'cash') {
    return {
      valid: true,
      resolvedAccountType: 'cash',
      resolvedBankAccountId: undefined,
      resolvedBankName: 'Cash Account',
    };
  }

  if (!bankAccountId) {
    return {
      valid: false,
      error: activeBanks.length === 0
        ? 'No active Bank Account found. Select Cash Account or create a Bank Account first.'
        : `Please select which Bank Account received/paid this ${paymentModeChoice.toUpperCase()} transaction.`,
      resolvedAccountType: 'bank',
    };
  }
  const bank = bankAccounts.find(b => b.id === bankAccountId);
  if (!bank) {
    return {
      valid: false,
      error: 'Selected Bank Account was not found.',
      resolvedAccountType: 'bank',
    };
  }

  return {
    valid: true,
    resolvedAccountType: 'bank',
    resolvedBankAccountId: bank.id,
    resolvedBankName: bank.bankName,
  };
};

export const formatAccountLabel = (
  accountType?: PaymentAccountType,
  bankAccountId?: string,
  bankAccounts: BankAccount[] = [],
  paymentMode?: PaymentMode
): string => {
  const effectiveType: PaymentAccountType =
    accountType || (paymentMode === 'cash' ? 'cash' : 'bank');
  if (effectiveType === 'cash') return 'Cash Account';
  const bank = bankAccountId
    ? bankAccounts.find(b => b.id === bankAccountId)
    : bankAccounts[0];
  if (!bank) return 'Bank Account';
  const last4 = bank.accountNumber ? ` (••${bank.accountNumber.slice(-4)})` : '';
  return `${bank.bankName}${last4}`;
};

// ============================================================================
// 3. CUSTOMER, INVOICE & JOB CARD FINANCIAL SELECTORS
// ============================================================================

export const normalizePhoneDigits = (phone?: string): string =>
  (phone || '').replace(/\D/g, '').slice(-10);

export const invoiceBelongsToCustomer = (inv: Invoice, customer: Customer): boolean => {
  if (inv.customerId && customer.id && inv.customerId === customer.id) return true;
  const invPhone = normalizePhoneDigits(inv.customerPhone);
  const custPhone = normalizePhoneDigits(customer.phone);
  if (invPhone && custPhone && invPhone === custPhone) return true;
  if (
    inv.customerName &&
    customer.name &&
    inv.customerName.trim().toLowerCase() === customer.name.trim().toLowerCase() &&
    (!invPhone || !custPhone)
  ) {
    return true;
  }
  return false;
};

export const getInvoicePaymentRecords = (
  invoice: Invoice,
  invoicePayments: InvoicePaymentRecord[],
  cashFlow: CashFlowEntry[]
): InvoicePaymentRecord[] => {
  const direct = invoicePayments.filter(p => p.invoiceId === invoice.id);
  const seenCfIds = new Set(direct.map(d => d.cashFlowEntryId).filter(Boolean));
  const seenRefs = new Set(direct.map(d => d.paymentReference).filter(Boolean));

  // Merge any legacy cashFlow entries that weren't created via InvoicePaymentRecord
  const legacy: InvoicePaymentRecord[] = cashFlow
    .filter(c => {
      if (c.isTransfer || c.isReversed) return false;
      if (c.referenceId !== invoice.id && c.invoiceId !== invoice.id) return false;
      if (seenCfIds.has(c.id)) return false;
      if (c.paymentRecordId && direct.some(d => d.id === c.paymentRecordId)) return false;
      return true;
    })
    .map(c => ({
      id: c.id,
      paymentReference: c.referenceNumber || `CF-${c.id.slice(-6)}`,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      jobCardId: c.jobCardId || invoice.jobCardId,
      customerId: c.customerId || invoice.customerId,
      customerName: c.payeeOrCustomer || invoice.customerName,
      customerPhone: invoice.customerPhone,
      amount: c.type === 'expense' ? -c.amount : c.amount,
      date: c.date,
      paymentMode: c.paymentMode,
      accountType: c.accountType || (c.paymentMode === 'cash' ? 'cash' : 'bank'),
      bankAccountId: c.bankAccountId,
      transactionRef: c.referenceNumber,
      notes: c.description || c.notes,
      cashFlowEntryId: c.id,
      createdAt: c.createdAt || c.date,
    }));

  return [...direct, ...legacy]
    .filter(r => !seenRefs.has(r.id))
    .sort((a, b) => (b.date + (b.createdAt || '')).localeCompare(a.date + (a.createdAt || '')));
};

export interface CustomerFinancialSummary {
  totalBills: number;
  totalBilled: number;
  totalPaid: number;
  totalPending: number;
  unallocatedCredit: number;
  allInvoices: Invoice[];
  pendingInvoices: Invoice[];
  settledInvoices: Invoice[];
  paymentRecords: InvoicePaymentRecord[];
  allocations: CustomerPaymentAllocation[];
}

export const getCustomerFinancialSummary = (
  customer: Customer,
  invoices: Invoice[],
  invoicePayments: InvoicePaymentRecord[],
  allocations: CustomerPaymentAllocation[] = []
): CustomerFinancialSummary => {
  const allInvoices = invoices
    .filter(inv => inv.type === 'invoice' && inv.status !== 'cancelled' && invoiceBelongsToCustomer(inv, customer))
    .sort((a, b) => b.date.localeCompare(a.date));

  const totalBilled = round2(allInvoices.reduce((s, inv) => s + (inv.grandTotal || 0), 0));
  const totalPaid = round2(allInvoices.reduce((s, inv) => s + Math.min(inv.grandTotal || 0, inv.paidAmount || 0), 0));
  const pendingInvoices = allInvoices.filter(inv => amountDue(inv) > 0);
  const settledInvoices = allInvoices.filter(inv => amountDue(inv) === 0);
  const totalPending = round2(pendingInvoices.reduce((s, inv) => s + amountDue(inv), 0));

  const invoiceIds = new Set(allInvoices.map(i => i.id));
  const custPhone = normalizePhoneDigits(customer.phone);

  const custAllocations = allocations.filter(
    a =>
      !a.isReversed &&
      (a.customerId === customer.id ||
        (custPhone && normalizePhoneDigits(a.customerPhone) === custPhone))
  );

  const unallocatedFromAllocations = round2(
    custAllocations.reduce((s, a) => s + Math.max(0, a.unallocatedAmount || 0), 0)
  );
  const directUnallocatedPayments = round2(
    invoicePayments
      .filter(
        p =>
          !p.isReversed &&
          !p.invoiceId &&
          !p.allocationId &&
          (p.customerId === customer.id ||
            (custPhone && normalizePhoneDigits(p.customerPhone) === custPhone))
      )
      .reduce((s, p) => s + (p.amount || 0), 0)
  );

  const paymentRecords = invoicePayments
    .filter(
      p =>
        (p.invoiceId && invoiceIds.has(p.invoiceId)) ||
        p.customerId === customer.id ||
        (custPhone && normalizePhoneDigits(p.customerPhone) === custPhone)
    )
    .sort((a, b) => (b.date + (b.createdAt || '')).localeCompare(a.date + (a.createdAt || '')));

  return {
    totalBills: allInvoices.length,
    totalBilled,
    totalPaid,
    totalPending,
    unallocatedCredit: round2(unallocatedFromAllocations + directUnallocatedPayments),
    allInvoices,
    pendingInvoices,
    settledInvoices,
    paymentRecords,
    allocations: custAllocations,
  };
};

export interface JobCardFinancialSummary {
  quotations: ManualQuotation[];
  invoices: Invoice[];
  totalBilled: number;
  totalPaidOnInvoices: number;
  totalUnlinkedAdvance: number;
  totalPaid: number;
  totalPending: number;
  unlinkedAdvances: InvoicePaymentRecord[];
  quotationModelSummaries: {
    quotationId: string;
    quotationNumber: string;
    version: number;
    historyCount: number;
    status: string;
    selectedModel: string;
    models: { key: string; label: string; total: number }[];
  }[];
}

export const quotationMatchesJob = (q: ManualQuotation, job: JobCard): boolean => {
  if (q.isArchived) return false;
  if (!q.jobCardId) return false;
  return q.jobCardId === job.id || q.jobCardId === job.jobId;
};

export const invoiceMatchesJob = (inv: Invoice, job: JobCard): boolean => {
  if (inv.status === 'cancelled') return false;
  if (inv.jobCardId && (inv.jobCardId === job.id || inv.jobCardId === job.jobId)) return true;
  if (job.invoiceId && (inv.id === job.invoiceId || inv.invoiceNumber === job.invoiceId)) return true;
  return false;
};

export const getJobCardFinancialSummary = (
  job: JobCard,
  quotations: ManualQuotation[],
  invoices: Invoice[],
  invoicePayments: InvoicePaymentRecord[]
): JobCardFinancialSummary => {
  const linkedQuotations = quotations
    .filter(q => quotationMatchesJob(q, job))
    .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));

  const quotationModelSummaries = linkedQuotations.map(q => {
    const models: { key: string; label: string; total: number }[] = [];
    const list = [
      { key: 'Model 1', m: q.model1 },
      { key: 'Model 2', m: q.model2 },
      { key: 'Model 3', m: q.model3 },
      { key: 'Model 4', m: q.model4 },
      { key: 'Model 5', m: q.model5 },
    ];
    list.forEach(({ key, m }) => {
      if (m && ((m.items && m.items.length > 0) || (m.finalModelTotal || 0) > 0)) {
        models.push({
          key,
          label: m.name || key,
          total: round2(m.finalModelTotal || m.totalDisplayAmount || 0),
        });
      }
    });
    return {
      quotationId: q.id,
      quotationNumber: q.quotationNumber,
      version: q.version || 1,
      historyCount: (q.history || []).length,
      status: q.status,
      selectedModel: q.selectedModel || 'Not Decided',
      models,
    };
  });

  const linkedInvoices = invoices
    .filter(inv => inv.type === 'invoice' && invoiceMatchesJob(inv, job))
    .sort((a, b) => b.date.localeCompare(a.date));

  const unlinkedAdvances = invoicePayments.filter(
    p =>
      !p.isReversed &&
      !p.invoiceId &&
      (p.jobCardId === job.id || p.jobCardId === job.jobId)
  );

  const totalBilled = round2(linkedInvoices.reduce((s, i) => s + (i.grandTotal || 0), 0));
  const totalPaidOnInvoices = round2(
    linkedInvoices.reduce((s, i) => s + Math.min(i.grandTotal || 0, i.paidAmount || 0), 0)
  );
  const totalUnlinkedAdvance = round2(
    unlinkedAdvances.reduce((s, p) => s + (p.amount || 0), 0)
  );
  const totalPaid = round2(totalPaidOnInvoices + totalUnlinkedAdvance);
  const totalPending = round2(
    linkedInvoices.reduce((s, i) => s + amountDue(i), 0)
  );

  return {
    quotations: linkedQuotations,
    invoices: linkedInvoices,
    totalBilled,
    totalPaidOnInvoices,
    totalUnlinkedAdvance,
    totalPaid,
    totalPending,
    unlinkedAdvances,
    quotationModelSummaries,
  };
};

export interface InvoiceActualBalance {
  grandTotal: number;
  validPaid: number;
  outstanding: number;
}

/**
 * Calculates actual valid paid amount and outstanding balance for a single invoice.
 * - Excludes cancelled invoices and non-invoice documents (returns 0).
 * - Incorporates `invoicePayments` (excluding reversed records) AND linked `cashFlow` entries
 *   (excluding reversed entries and transfers, subtracting customer refunds / expense entries)
 *   without double-counting entries linked via `cashFlowEntryId` or `paymentRecordId`.
 * - Falls back to `inv.paidAmount` only when no payment ledger / cashFlow entries exist for the invoice.
 */
export const calculateInvoiceActualBalance = (
  inv: Invoice,
  invoicePayments: InvoicePaymentRecord[] = [],
  cashFlow: CashFlowEntry[] = []
): InvoiceActualBalance => {
  if (inv.type !== 'invoice' || inv.status === 'cancelled') {
    return { grandTotal: 0, validPaid: 0, outstanding: 0 };
  }

  const grandTotal = round2(Math.max(0, Number(inv.grandTotal) || 0));

  const invPayRecords = invoicePayments.filter(p => p.invoiceId === inv.id);
  const invCashEntries = cashFlow.filter(
    c => !c.isTransfer && (c.referenceId === inv.id || c.invoiceId === inv.id)
  );

  let validPaid: number;
  if (invPayRecords.length > 0 || invCashEntries.length > 0) {
    // Track all linked cashFlow IDs and payment record IDs (including reversed ones so reversed payments are never resurrected)
    const linkedCfIds = new Set(invPayRecords.map(p => p.cashFlowEntryId).filter(Boolean));
    const knownPayIds = new Set(invPayRecords.map(p => p.id));

    const activePaySum = invPayRecords
      .filter(p => !p.isReversed)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const unlinkedCashSum = invCashEntries
      .filter(c => {
        if (c.isReversed) return false;
        if (linkedCfIds.has(c.id)) return false;
        if (c.paymentRecordId && knownPayIds.has(c.paymentRecordId)) return false;
        return true;
      })
      .reduce((sum, c) => {
        const amt = Number(c.amount) || 0;
        return sum + (c.type === 'expense' ? -amt : amt);
      }, 0);

    validPaid = round2(Math.min(grandTotal, Math.max(0, activePaySum + unlinkedCashSum)));
  } else {
    validPaid = round2(Math.min(grandTotal, Math.max(0, Number(inv.paidAmount) || 0)));
  }

  const outstanding = round2(Math.max(0, grandTotal - validPaid));
  return { grandTotal, validPaid, outstanding };
};

export interface CustomerPendingInvoiceItem {
  invoice: Invoice;
  invoiceNumber: string;
  date: string;
  grandTotal: number;
  paidAmount: number;
  pendingAmount: number;
}

export interface SharedCustomerPendingSummary {
  liveCustomer?: Customer;
  customerName: string;
  customerPhone: string;
  allValidInvoices: Invoice[];
  pendingItems: CustomerPendingInvoiceItem[];
  pendingInvoices: Invoice[]; // invoices with reconciled paidAmount for WhatsAppPendingModal
  totalValidInvoiceAmount: number;
  totalValidPaymentsReceived: number;
  totalPending: number;
  totalBilledAcrossPendingBills: number;
  totalPaidAcrossPendingBills: number;
}

/**
 * ONE shared customer pending calculation used by BOTH Billing & Invoices AND Job Cards.
 *
 * Formula: Actual Pending = Total Valid Invoice Amount - Total Valid Payments Received
 * - Matches by `customerId` first, then normalized 10-digit phone for legacy records.
 * - Excludes cancelled invoices and quotations.
 * - Respects `invoicePayments`, linked `cashFlow` payments, refunds, and reversed payments without double counting.
 */
export const calculateCustomerPendingSummary = (params: {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  linkedJob?: JobCard;
  seedInvoice?: Invoice;
  invoices: Invoice[];
  invoicePayments?: InvoicePaymentRecord[];
  cashFlow?: CashFlowEntry[];
  customers?: Customer[];
}): SharedCustomerPendingSummary => {
  const {
    customerId,
    customerName,
    customerPhone,
    linkedJob,
    seedInvoice,
    invoices,
    invoicePayments = [],
    cashFlow = [],
    customers = [],
  } = params;

  const targetCustomerId = customerId || linkedJob?.customerId || seedInvoice?.customerId;
  const rawPhone = customerPhone || linkedJob?.customerPhone || seedInvoice?.customerPhone || '';
  const normRawPhone = normalizePhoneDigits(rawPhone);

  const liveCustomer =
    (targetCustomerId ? customers.find(c => c.id === targetCustomerId) : undefined) ||
    (normRawPhone ? customers.find(c => normalizePhoneDigits(c.phone) === normRawPhone) : undefined);

  const effectiveCustomerId = liveCustomer?.id || targetCustomerId;
  const effectivePhone = liveCustomer?.phone || rawPhone;
  const effectivePhoneDigits = normalizePhoneDigits(effectivePhone);
  const effectiveName = (liveCustomer?.name || customerName || linkedJob?.customerName || seedInvoice?.customerName || '').trim();
  const effectiveNameLower = effectiveName.toLowerCase();

  const seenInvIds = new Set<string>();
  const allValidInvoices: Invoice[] = [];

  for (const inv of invoices) {
    if (inv.type !== 'invoice' || inv.status === 'cancelled') continue;

    const matched =
      Boolean(seedInvoice && inv.id === seedInvoice.id) ||
      Boolean(linkedJob && invoiceMatchesJob(inv, linkedJob)) ||
      Boolean(effectiveCustomerId && inv.customerId && inv.customerId === effectiveCustomerId) ||
      Boolean(targetCustomerId && inv.customerId && inv.customerId === targetCustomerId) ||
      Boolean(effectivePhoneDigits && normalizePhoneDigits(inv.customerPhone) === effectivePhoneDigits) ||
      Boolean(normRawPhone && normalizePhoneDigits(inv.customerPhone) === normRawPhone) ||
      Boolean(
        effectiveNameLower &&
          !effectivePhoneDigits &&
          !normalizePhoneDigits(inv.customerPhone) &&
          (inv.customerName || '').trim().toLowerCase() === effectiveNameLower
      );

    if (matched && !seenInvIds.has(inv.id)) {
      seenInvIds.add(inv.id);
      allValidInvoices.push(inv);
    }
  }

  // Chronological order (oldest pending bill first, then newer bills)
  allValidInvoices.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  let totalValidInvoiceAmount = 0;
  let totalValidPaymentsReceived = 0;
  let totalPending = 0;
  let totalBilledAcrossPendingBills = 0;
  let totalPaidAcrossPendingBills = 0;

  const pendingItems: CustomerPendingInvoiceItem[] = [];
  const pendingInvoices: Invoice[] = [];

  for (const inv of allValidInvoices) {
    const bal = calculateInvoiceActualBalance(inv, invoicePayments, cashFlow);
    totalValidInvoiceAmount = round2(totalValidInvoiceAmount + bal.grandTotal);
    totalValidPaymentsReceived = round2(totalValidPaymentsReceived + bal.validPaid);
    totalPending = round2(totalPending + bal.outstanding);

    if (bal.outstanding > 0) {
      totalBilledAcrossPendingBills = round2(totalBilledAcrossPendingBills + bal.grandTotal);
      totalPaidAcrossPendingBills = round2(totalPaidAcrossPendingBills + bal.validPaid);
      const reconciledInv: Invoice = {
        ...inv,
        grandTotal: bal.grandTotal,
        paidAmount: bal.validPaid,
      };
      pendingInvoices.push(reconciledInv);
      pendingItems.push({
        invoice: reconciledInv,
        invoiceNumber: inv.invoiceNumber,
        date: inv.date,
        grandTotal: bal.grandTotal,
        paidAmount: bal.validPaid,
        pendingAmount: bal.outstanding,
      });
    }
  }

  return {
    liveCustomer,
    customerName: effectiveName,
    customerPhone: effectivePhone,
    allValidInvoices,
    pendingItems,
    pendingInvoices,
    totalValidInvoiceAmount,
    totalValidPaymentsReceived,
    totalPending,
    totalBilledAcrossPendingBills,
    totalPaidAcrossPendingBills,
  };
};

export interface CustomerPendingSummaryForJob {
  jobSummary: JobCardFinancialSummary;
  liveCustomer?: Customer;
  allCustomerInvoices: Invoice[];
  allPendingInvoices: Invoice[];
  totalPendingAcrossBills: number;
  totalBilledAcrossPendingBills: number;
  totalPaidAcrossPendingBills: number;
  totalValidInvoiceAmount: number;
  totalValidPaymentsReceived: number;
}

/**
 * Resolves live customer identity + ALL customer pending invoices (old + new bills)
 * for a Job Card using the shared `calculateCustomerPendingSummary` utility so
 * WhatsApp payment pending reminders on Job Cards match Billing & Invoices identically.
 */
export const getCustomerPendingSummaryForJob = (
  job: JobCard,
  quotations: ManualQuotation[],
  invoices: Invoice[],
  invoicePayments: InvoicePaymentRecord[],
  customers: Customer[] = [],
  cashFlow: CashFlowEntry[] = []
): CustomerPendingSummaryForJob => {
  const jobSummary = getJobCardFinancialSummary(job, quotations, invoices, invoicePayments);
  const shared = calculateCustomerPendingSummary({
    customerId: job.customerId,
    customerName: job.customerName,
    customerPhone: job.customerPhone,
    linkedJob: job,
    invoices,
    invoicePayments,
    cashFlow,
    customers,
  });

  return {
    jobSummary,
    liveCustomer: shared.liveCustomer,
    allCustomerInvoices: shared.allValidInvoices,
    allPendingInvoices: shared.pendingInvoices,
    totalPendingAcrossBills: shared.totalPending,
    totalBilledAcrossPendingBills: shared.totalBilledAcrossPendingBills,
    totalPaidAcrossPendingBills: shared.totalPaidAcrossPendingBills,
    totalValidInvoiceAmount: shared.totalValidInvoiceAmount,
    totalValidPaymentsReceived: shared.totalValidPaymentsReceived,
  };
};

// ============================================================================
// 4. WHATSAPP MESSAGE BUILDERS (PENDING & THANK YOU)
// ============================================================================

export const formatWhatsAppPhone = (phone?: string): string => {
  const digits = (phone || '').replace(/[^0-9]/g, '');
  if (!digits) return '';
  return digits.length === 10 ? `91${digits}` : digits;
};

export const buildCustomerPendingWhatsAppMessage = (params: {
  customerName: string;
  pendingInvoices: Pick<Invoice, 'invoiceNumber' | 'date' | 'grandTotal' | 'paidAmount'>[];
  totalOutstanding?: number;
  workshopName?: string;
  workshopPhone?: string;
  workshopUpiId?: string;
}): string => {
  const {
    customerName,
    pendingInvoices,
    workshopName = 'Spider Grid Solutions, Madurai',
    workshopPhone = '9176795665',
    workshopUpiId = '9176795665@okbizaxis',
  } = params;

  const computedTotal = round2(
    pendingInvoices.reduce(
      (s, inv) => s + Math.max(0, (inv.grandTotal || 0) - (inv.paidAmount || 0)),
      0
    )
  );
  const total = params.totalOutstanding !== undefined ? round2(params.totalOutstanding) : computedTotal;

  const lines = pendingInvoices.map((inv, idx) => {
    const due = Math.max(0, round2((inv.grandTotal || 0) - (inv.paidAmount || 0)));
    return (
      `${idx + 1}. *${inv.invoiceNumber}* (${inv.date})\n` +
      `   Bill: ₹${(inv.grandTotal || 0).toLocaleString('en-IN')} | ` +
      `Paid: ₹${(inv.paidAmount || 0).toLocaleString('en-IN')} | ` +
      `Pending: *₹${due.toLocaleString('en-IN')}*`
    );
  });

  return [
    `Hello *${customerName || 'Valued Customer'}*,`,
    '',
    `This is a gentle payment reminder from *${workshopName}* regarding your pending invoice(s):`,
    '',
    ...lines,
    '',
    `*Total Outstanding Balance: ₹${total.toLocaleString('en-IN')}*`,
    '',
    `You can pay via UPI: *${workshopUpiId}*`,
    `For any clarification, please call us at *${workshopPhone}*.`,
    '',
    `Thank you,`,
    `*${workshopName}*`,
    `Ph: ${workshopPhone}`,
  ].join('\n');
};

export const buildPaymentThankYouWhatsAppMessage = (params: {
  customerName: string;
  paidAmount: number;
  paymentModeLabel: string;
  accountLabel?: string;
  transactionRef?: string;
  date: string;
  invoiceNumber?: string;
  invoiceTotal?: number;
  invoicePaid?: number;
  invoiceRemaining?: number;
  otherPendingTotal?: number;
  otherPendingCount?: number;
  isAdvance?: boolean;
  allocatedInvoices?: { invoiceNumber: string; amount: number; remaining: number }[];
  unallocatedCredit?: number;
  workshopName?: string;
  workshopPhone?: string;
}): string => {
  const {
    customerName,
    paidAmount,
    paymentModeLabel,
    accountLabel,
    transactionRef,
    date,
    invoiceNumber,
    invoiceTotal,
    invoicePaid,
    invoiceRemaining = 0,
    otherPendingTotal = 0,
    otherPendingCount = 0,
    isAdvance = false,
    allocatedInvoices,
    unallocatedCredit = 0,
    workshopName = 'Spider Grid Solutions, Madurai',
    workshopPhone = '9176795665',
  } = params;

  const header = `Dear *${customerName || 'Valued Customer'}*,`;
  const receiptLine = `Thank you! We have received your payment of *₹${round2(paidAmount).toLocaleString('en-IN')}* on *${date}* via *${paymentModeLabel}*${accountLabel ? ` (${accountLabel})` : ''}${transactionRef ? ` [Ref: ${transactionRef}]` : ''}.`;

  const bodyLines: string[] = [];

  if (allocatedInvoices && allocatedInvoices.length > 0) {
    bodyLines.push('*Payment Allocation Summary:*');
    allocatedInvoices.forEach((a, i) => {
      bodyLines.push(
        `${i + 1}. Invoice *#${a.invoiceNumber}*: Paid ₹${round2(a.amount).toLocaleString('en-IN')} | Remaining: *₹${round2(a.remaining).toLocaleString('en-IN')}*`
      );
    });
    if (unallocatedCredit > 0) {
      bodyLines.push(`Advance Credit Saved: *₹${round2(unallocatedCredit).toLocaleString('en-IN')}*`);
    }
  } else if (invoiceNumber) {
    bodyLines.push(`*Invoice #:* ${invoiceNumber}`);
    if (invoiceTotal !== undefined) {
      bodyLines.push(`*Bill Total:* ₹${round2(invoiceTotal).toLocaleString('en-IN')}`);
    }
    if (invoicePaid !== undefined) {
      bodyLines.push(`*Total Paid So Far:* ₹${round2(invoicePaid).toLocaleString('en-IN')}`);
    }
    if (round2(invoiceRemaining) <= 0) {
      bodyLines.push(`*Status:* FULLY PAID (₹0 Balance Remaining)`);
    } else {
      bodyLines.push(`*Remaining Balance on this Bill:* ₹${round2(invoiceRemaining).toLocaleString('en-IN')}`);
    }
  } else if (isAdvance) {
    bodyLines.push(`*Receipt Type:* Advance Payment Received`);
  }

  if (otherPendingTotal > 0) {
    bodyLines.push('');
    bodyLines.push(
      `Note: You have *₹${round2(otherPendingTotal).toLocaleString('en-IN')}* pending across ${otherPendingCount > 0 ? `${otherPendingCount} pending bill(s)` : 'your account'}.`
    );
  }

  return [
    header,
    '',
    receiptLine,
    '',
    ...bodyLines,
    '',
    `We appreciate your business with *${workshopName}*!`,
    `Contact: ${workshopPhone}`,
  ].join('\n');
};

// ============================================================================
// 5. ADVANCED REPORTS FILTERING, SORTING, 3-LEVEL TREE & CSV EXPORT
// ============================================================================

export type ReportDatePreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'custom'
  | 'all';

export type ReportSortBy =
  | 'date_desc'
  | 'date_asc'
  | 'amount_desc'
  | 'amount_asc'
  | 'category_asc'
  | 'subcategory_asc'
  | 'second_subcategory_asc'
  | 'mode_asc'
  | 'account_asc';

export interface MoneyFlowReportFilter {
  datePreset: ReportDatePreset;
  customFrom?: string;
  customTo?: string;
  type?: 'all' | 'income' | 'expense' | 'transfer';
  categoryFilter?: string; // id or name
  subcategoryFilter?: string; // id or name
  secondSubcategoryFilter?: string; // id or name
  paymentMode?: string; // 'all' | PaymentMode
  accountFilter?: string; // 'all' | 'cash' | bankAccountId
  search?: string;
  sortBy?: ReportSortBy;
  includeTransfers?: boolean;
  includeReversed?: boolean;
}

export const getDateRangeForPreset = (
  preset: ReportDatePreset,
  refToday: string = todayLocal(),
  customFrom?: string,
  customTo?: string
): { from: string | null; to: string | null } => {
  if (preset === 'all') return { from: null, to: null };
  if (preset === 'today') return { from: refToday, to: refToday };
  if (preset === 'yesterday') {
    const y = addDays(refToday, -1);
    return { from: y, to: y };
  }
  if (preset === 'this_week') {
    const d = new Date(`${refToday}T00:00:00`);
    const day = d.getDay(); // 0=Sun..6=Sat
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = addDays(refToday, diffToMonday);
    return { from: monday, to: refToday };
  }
  if (preset === 'this_month') {
    return { from: `${refToday.slice(0, 7)}-01`, to: `${refToday.slice(0, 7)}-31` };
  }
  if (preset === 'last_month') {
    const [yr, mo] = refToday.slice(0, 7).split('-').map(Number);
    const prev = new Date(yr, mo - 2, 1);
    const pYr = prev.getFullYear();
    const pMo = String(prev.getMonth() + 1).padStart(2, '0');
    return { from: `${pYr}-${pMo}-01`, to: `${pYr}-${pMo}-31` };
  }
  return { from: customFrom || null, to: customTo || null };
};

export const filterAndSortCashFlow = (
  entries: CashFlowEntry[],
  filter: MoneyFlowReportFilter,
  categories: MoneyFlowCategory[] = [],
  bankAccounts: BankAccount[] = [],
  refToday: string = todayLocal()
): CashFlowEntry[] => {
  const { from, to } = getDateRangeForPreset(
    filter.datePreset,
    refToday,
    filter.customFrom,
    filter.customTo
  );

  const q = (filter.search || '').trim().toLowerCase();

  const filtered = entries.filter(e => {
    if (!filter.includeReversed && e.isReversed) return false;
    const isTr = Boolean(e.isTransfer || e.type === 'transfer');
    if (filter.type && filter.type !== 'all') {
      if (filter.type === 'transfer' && !isTr) return false;
      if (filter.type === 'income' && (e.type !== 'income' || isTr)) return false;
      if (filter.type === 'expense' && (e.type !== 'expense' || isTr)) return false;
    } else if (!filter.includeTransfers && isTr) {
      return false;
    }

    if (from && e.date < from) return false;
    if (to && e.date > to) return false;

    const resolved = resolveCategoryNames(e, categories);

    if (filter.categoryFilter && filter.categoryFilter !== 'all') {
      const f = filter.categoryFilter;
      if (e.categoryId !== f && resolved.categoryName.toLowerCase() !== f.toLowerCase()) {
        return false;
      }
    }
    if (filter.subcategoryFilter && filter.subcategoryFilter !== 'all') {
      const f = filter.subcategoryFilter;
      if (e.subcategoryId !== f && resolved.subcategoryName.toLowerCase() !== f.toLowerCase()) {
        return false;
      }
    }
    if (filter.secondSubcategoryFilter && filter.secondSubcategoryFilter !== 'all') {
      const f = filter.secondSubcategoryFilter;
      if (
        e.secondSubcategoryId !== f &&
        resolved.secondSubcategoryName.toLowerCase() !== f.toLowerCase()
      ) {
        return false;
      }
    }

    if (filter.paymentMode && filter.paymentMode !== 'all') {
      if (filter.paymentMode === 'bank') {
        if (!['bank_transfer', 'card', 'cheque'].includes(e.paymentMode)) return false;
      } else if (e.paymentMode !== filter.paymentMode) {
        return false;
      }
    }

    if (filter.accountFilter && filter.accountFilter !== 'all') {
      const accType: PaymentAccountType =
        e.accountType || (e.paymentMode === 'cash' ? 'cash' : 'bank');
      if (filter.accountFilter === 'cash') {
        if (accType !== 'cash') return false;
      } else {
        const effectiveBankId = e.bankAccountId || (accType === 'bank' ? bankAccounts[0]?.id : undefined);
        if (accType !== 'bank' || effectiveBankId !== filter.accountFilter) return false;
      }
    }

    if (q) {
      const accLabel = formatAccountLabel(e.accountType, e.bankAccountId, bankAccounts, e.paymentMode);
      const haystack = [
        e.description,
        e.payeeOrCustomer,
        e.referenceNumber,
        e.invoiceNumber,
        e.notes,
        resolved.categoryName,
        resolved.subcategoryName,
        resolved.secondSubcategoryName,
        e.paymentMode,
        accLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });

  const sortBy = filter.sortBy || 'date_desc';
  return [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'amount_desc':
        return (Number(b.amount) || 0) - (Number(a.amount) || 0);
      case 'amount_asc':
        return (Number(a.amount) || 0) - (Number(b.amount) || 0);
      case 'date_asc':
        return (a.date + (a.createdAt || '')).localeCompare(b.date + (b.createdAt || ''));
      case 'category_asc':
        return resolveCategoryNames(a, categories).categoryName.localeCompare(
          resolveCategoryNames(b, categories).categoryName
        );
      case 'subcategory_asc':
        return resolveCategoryNames(a, categories).subcategoryName.localeCompare(
          resolveCategoryNames(b, categories).subcategoryName
        );
      case 'second_subcategory_asc':
        return resolveCategoryNames(a, categories).secondSubcategoryName.localeCompare(
          resolveCategoryNames(b, categories).secondSubcategoryName
        );
      case 'mode_asc':
        return (a.paymentMode || '').localeCompare(b.paymentMode || '');
      case 'account_asc':
        return formatAccountLabel(a.accountType, a.bankAccountId, bankAccounts, a.paymentMode).localeCompare(
          formatAccountLabel(b.accountType, b.bankAccountId, bankAccounts, b.paymentMode)
        );
      case 'date_desc':
      default:
        return (b.date + (b.createdAt || '')).localeCompare(a.date + (a.createdAt || ''));
    }
  });
};

export interface CategoryTreeLevel3 {
  name: string;
  id?: string;
  amount: number;
  count: number;
}

export interface CategoryTreeLevel2 {
  name: string;
  id?: string;
  amount: number;
  count: number;
  children: CategoryTreeLevel3[];
}

export interface CategoryTreeLevel1 {
  name: string;
  id?: string;
  amount: number;
  count: number;
  children: CategoryTreeLevel2[];
}

export const buildThreeLevelCategoryTree = (
  entries: CashFlowEntry[],
  categories: MoneyFlowCategory[] = []
): CategoryTreeLevel1[] => {
  const l1Map = new Map<
    string,
    {
      name: string;
      id?: string;
      amount: number;
      count: number;
      subs: Map<
        string,
        {
          name: string;
          id?: string;
          amount: number;
          count: number;
          thirds: Map<string, CategoryTreeLevel3>;
        }
      >;
    }
  >();

  entries.forEach(e => {
    if (e.isTransfer || e.type === 'transfer' || e.isReversed) return;
    const amt = Number(e.amount) || 0;
    const resolved = resolveCategoryNames(e, categories);
    const l1Key = resolved.categoryName.toLowerCase();

    if (!l1Map.has(l1Key)) {
      l1Map.set(l1Key, {
        name: resolved.categoryName,
        id: e.categoryId,
        amount: 0,
        count: 0,
        subs: new Map(),
      });
    }
    const l1 = l1Map.get(l1Key)!;
    l1.amount = round2(l1.amount + amt);
    l1.count += 1;

    if (resolved.subcategoryName) {
      const l2Key = resolved.subcategoryName.toLowerCase();
      if (!l1.subs.has(l2Key)) {
        l1.subs.set(l2Key, {
          name: resolved.subcategoryName,
          id: e.subcategoryId,
          amount: 0,
          count: 0,
          thirds: new Map(),
        });
      }
      const l2 = l1.subs.get(l2Key)!;
      l2.amount = round2(l2.amount + amt);
      l2.count += 1;

      if (resolved.secondSubcategoryName) {
        const l3Key = resolved.secondSubcategoryName.toLowerCase();
        if (!l2.thirds.has(l3Key)) {
          l2.thirds.set(l3Key, {
            name: resolved.secondSubcategoryName,
            id: e.secondSubcategoryId,
            amount: 0,
            count: 0,
          });
        }
        const l3 = l2.thirds.get(l3Key)!;
        l3.amount = round2(l3.amount + amt);
        l3.count += 1;
      }
    }
  });

  return Array.from(l1Map.values())
    .map(l1 => ({
      name: l1.name,
      id: l1.id,
      amount: l1.amount,
      count: l1.count,
      children: Array.from(l1.subs.values())
        .map(l2 => ({
          name: l2.name,
          id: l2.id,
          amount: l2.amount,
          count: l2.count,
          children: Array.from(l2.thirds.values()).sort((a, b) => b.amount - a.amount),
        }))
        .sort((a, b) => b.amount - a.amount),
    }))
    .sort((a, b) => b.amount - a.amount);
};

const csvEscape = (v: any): string => {
  const s = v === null || v === undefined ? '' : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export const cashFlowToReportCsv = (
  entries: CashFlowEntry[],
  categories: MoneyFlowCategory[] = [],
  bankAccounts: BankAccount[] = []
): string => {
  const headers = [
    'Date',
    'Type',
    'Category',
    'Subcategory',
    '2nd Subcategory',
    'Account',
    'Payment Mode',
    'Reference / UTR',
    'Customer / Payee',
    'Description',
    'Amount',
  ];
  const rows = entries.map(e => {
    const resolved = resolveCategoryNames(e, categories);
    const accLabel = formatAccountLabel(e.accountType, e.bankAccountId, bankAccounts, e.paymentMode);
    return [
      e.date,
      e.type.toUpperCase(),
      resolved.categoryName,
      resolved.subcategoryName,
      resolved.secondSubcategoryName,
      accLabel,
      e.paymentMode,
      e.referenceNumber || '',
      e.payeeOrCustomer || '',
      e.description,
      e.amount,
    ]
      .map(csvEscape)
      .join(',');
  });
  return [headers.join(','), ...rows].join('\n');
};
