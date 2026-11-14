import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Landmark,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Receipt,
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit2,
  Search,
  Calendar,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileText,
  MessageSquare,
  Printer,
  Download,
  Building2,
  Check,
  X,
  CreditCard,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Camera,
  Image as ImageIcon,
  ShieldCheck,
  FolderTree,
  Power,
  RotateCcw,
  ArrowUpDown,
  Repeat,
  PiggyBank,
  CalendarClock,
  Bell,
  AlertTriangle,
  FileBarChart2,
  Briefcase
} from 'lucide-react';
import { useSgs } from '../context/SgsContext';
import {
  BankAccount,
  CashFlowEntry,
  PaymentMode,
  Invoice,
  VendorBill,
  Customer,
  Vendor,
  PaymentAccountType,
  PaymentModeChoice,
  FinancialAlertSeverity,
} from '../types';
import { todayLocal, round2, amountDue } from '../utils/accounting';
import {
  buildThreeLevelCategoryTree,
  cashFlowToReportCsv,
  filterAndSortCashFlow,
  formatAccountLabel,
  getCustomerFinancialSummary,
  isOperatingExpenseEntry,
  isOperatingIncomeEntry,
  mapChoiceToPaymentMode,
  MoneyFlowReportFilter,
  ReportDatePreset,
  ReportSortBy,
  resolveCategoryNames,
  validatePaymentAccountSelection,
} from '../utils/moneyFlow';
import {
  buildFinancialAlerts,
  computeCompleteFinancialDashboard,
} from '../utils/advancedFinance';
import { PaymentAccountSelector } from './PaymentAccountSelector';
import { MoneyFlowCategoryPicker } from './MoneyFlowCategoryPicker';
import { WhatsAppPendingModal } from './WhatsAppPendingModal';
import { CollectPaymentModal } from './CollectPaymentModal';
import { LoansManagerTab } from './finance/LoansManagerTab';
import { EmiCalendarTab } from './finance/EmiCalendarTab';
import { RecurringExpensesTab } from './finance/RecurringExpensesTab';
import { SavingsInvestmentsTab } from './finance/SavingsInvestmentsTab';
import { MonthlyFinancialReportTab } from './finance/MonthlyFinancialReportTab';

export type MoneyFlowSubPage = 
  | 'dashboard' 
  | 'cash' 
  | 'banks' 
  | 'in' 
  | 'out' 
  | 'expenses' 
  | 'transfers'
  | 'loans'
  | 'emi_calendar'
  | 'recurring'
  | 'savings'
  | 'investments'
  | 'monthly_report'
  | 'categories'
  | 'reports';

interface MoneyFlowManagerProps {
  initialSubPage?: MoneyFlowSubPage;
}

export const MoneyFlowManager: React.FC<MoneyFlowManagerProps> = ({ initialSubPage = 'dashboard' }) => {
  const {
    cashFlow,
    addCashFlowEntry,
    updateCashFlowEntry,
    deleteCashFlowEntry,
    bankAccounts,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    toggleBankAccountStatus,
    transferFunds,
    moneyFlowCategories,
    addMoneyFlowCategory,
    updateMoneyFlowCategory,
    toggleMoneyFlowCategoryActive,
    invoicePayments,
    customerPaymentAllocations,
    recordInvoicePayment,
    recordVendorBillPayment,
    invoices,
    vendorBills,
    customers,
    vendors,
    adminSettings,
    updateAdminSettings,
    loans,
    loanPayments,
    recurringExpenses,
    recurringDueEntries,
    savingsAccounts,
    investments,
    employees,
    salaryPayments,
    attendanceRecords,
    salaryAdvances,
    canDelete,
    theme
  } = useSgs();

  const isDark = theme === 'dark';
  const [activeSubPage, setActiveSubPage] = useState<MoneyFlowSubPage>(initialSubPage);
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<'all_active' | FinancialAlertSeverity>('all_active');

  // Common filters & search state
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'custom'>('this_month');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return todayLocal(d);
  });
  const [customEndDate, setCustomEndDate] = useState(() => todayLocal());

  // Modals state
  const [isMoneyInModalOpen, setIsMoneyInModalOpen] = useState(false);
  const [isMoneyOutModalOpen, setIsMoneyOutModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState<BankAccount | null>(null);
  const [viewingBankLedger, setViewingBankLedger] = useState<BankAccount | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isOpeningCashModalOpen, setIsOpeningCashModalOpen] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<CashFlowEntry | null>(null);
  const [whatsAppPendingTarget, setWhatsAppPendingTarget] = useState<{
    customerName: string;
    customerPhone: string;
    pendingInvoices: Invoice[];
    totalOutstanding: number;
  } | null>(null);
  const [collectCustomerTarget, setCollectCustomerTarget] = useState<Customer | null>(null);

  // Opening Cash Balance
  const openingCashBalance = adminSettings.openingCashBalance ?? 10000;
  const [newOpeningCashInput, setNewOpeningCashInput] = useState<string>(String(openingCashBalance));

  // --- FORM STATES ---
  // Money In Form (3-level categories + PaymentAccountSelector)
  const [inDate, setInDate] = useState(() => todayLocal());
  const [inCatId, setInCatId] = useState('mfc-cust-pay');
  const [inCategory, setInCategory] = useState('Customer Payment');
  const [inSubId, setInSubId] = useState('');
  const [inSubName, setInSubName] = useState('');
  const [inThirdId, setInThirdId] = useState('');
  const [inThirdName, setInThirdName] = useState('');
  const [inAmount, setInAmount] = useState<number | ''>('');
  const [inModeChoice, setInModeChoice] = useState<PaymentModeChoice>('cash');
  const [inAccountType, setInAccountType] = useState<'cash' | 'bank'>('cash');
  const [inBankId, setInBankId] = useState<string>(() => bankAccounts[0]?.id || '');
  const [inRefNumber, setInRefNumber] = useState('');
  const [inCustomerId, setInCustomerId] = useState('');
  const [inInvoiceId, setInInvoiceId] = useState('');
  const [inDesc, setInDesc] = useState('');
  const [inNotes, setInNotes] = useState('');
  const [inFormError, setInFormError] = useState<string | null>(null);

  // Money Out / Expense Form (3-level categories + PaymentAccountSelector)
  const [outDate, setOutDate] = useState(() => todayLocal());
  const [outCatId, setOutCatId] = useState('mfc-office');
  const [outCategory, setOutCategory] = useState('Office Expenses');
  const [outSubId, setOutSubId] = useState('');
  const [outSubName, setOutSubName] = useState('');
  const [outThirdId, setOutThirdId] = useState('');
  const [outThirdName, setOutThirdName] = useState('');
  const [outAmount, setOutAmount] = useState<number | ''>('');
  const [outModeChoice, setOutModeChoice] = useState<PaymentModeChoice>('cash');
  const [outAccountType, setOutAccountType] = useState<'cash' | 'bank'>('cash');
  const [outBankId, setOutBankId] = useState<string>(() => bankAccounts[0]?.id || '');
  const [outRefNumber, setOutRefNumber] = useState('');
  const [outVendorId, setOutVendorId] = useState('');
  const [outBillId, setOutBillId] = useState('');
  const [outPayeeName, setOutPayeeName] = useState('');
  const [outDesc, setOutDesc] = useState('');
  const [outNotes, setOutNotes] = useState('');
  const [outAttachment, setOutAttachment] = useState<string>('');
  const [outFormError, setOutFormError] = useState<string | null>(null);

  // Category Management Page State
  const [catTypeFilter, setCatTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [showInactiveCats, setShowInactiveCats] = useState(true);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');
  const [addingChildParentId, setAddingChildParentId] = useState<string | null>(null);
  const [addingChildLevel, setAddingChildLevel] = useState<2 | 3>(2);
  const [addingChildName, setAddingChildName] = useState('');
  const [renamingCatId, setRenamingCatId] = useState<string | null>(null);
  const [renamingCatValue, setRenamingCatValue] = useState('');
  const [catFeedback, setCatFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Reports Page Filter & Breakdown Tree State
  const [reportFilter, setReportFilter] = useState<MoneyFlowReportFilter>({
    datePreset: 'this_month',
    customFrom: '',
    customTo: '',
    type: 'all',
    categoryFilter: 'all',
    subcategoryFilter: 'all',
    secondSubcategoryFilter: 'all',
    paymentMode: 'all',
    accountFilter: 'all',
    search: '',
    sortBy: 'date_desc',
    includeTransfers: false,
    includeReversed: false,
  });
  const [reportTreeType, setReportTreeType] = useState<'expense' | 'income'>('expense');

  // Transfer Form
  const [trDate, setTrDate] = useState(() => todayLocal());
  const [trType, setTrType] = useState<'cash_to_bank' | 'bank_to_cash' | 'bank_to_bank'>('cash_to_bank');
  const [trFromBankId, setTrFromBankId] = useState<string>(() => bankAccounts[0]?.id || '');
  const [trToBankId, setTrToBankId] = useState<string>(() => bankAccounts[1]?.id || bankAccounts[0]?.id || '');
  const [trAmount, setTrAmount] = useState<number | ''>('');
  const [trRefNumber, setTrRefNumber] = useState('');
  const [trNotes, setTrNotes] = useState('');

  // Bank Form
  const [bankNameInput, setBankNameInput] = useState('');
  const [holderInput, setHolderInput] = useState('Spider Grid Solutions');
  const [accountNumberInput, setAccountNumberInput] = useState('');
  const [accountTypeInput, setAccountTypeInput] = useState<'current' | 'savings' | 'overdraft' | 'other'>('current');
  const [branchInput, setBranchInput] = useState('');
  const [ifscInput, setIfscInput] = useState('');
  const [openingBalanceInput, setOpeningBalanceInput] = useState<number | ''>(0);
  const [bankNotesInput, setBankNotesInput] = useState('');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // --- DATE FILTER HELPER ---
  const isDateInRange = (dStr: string) => {
    if (dateFilter === 'all') return true;
    const today = todayLocal();
    if (dateFilter === 'today') return dStr === today;
    if (dateFilter === 'this_week') {
      const now = new Date();
      const first = now.getDate() - now.getDay();
      const startOfWeek = new Date(now.setDate(first));
      const startStr = todayLocal(startOfWeek);
      return dStr >= startStr && dStr <= today;
    }
    if (dateFilter === 'this_month') {
      const currentMonth = today.substring(0, 7);
      return dStr.startsWith(currentMonth);
    }
    if (dateFilter === 'custom') {
      return dStr >= customStartDate && dStr <= customEndDate;
    }
    return true;
  };

  // --- FINANCIAL CALCULATIONS ---

  // 1. Bank Balances calculation
  const bankBalances = useMemo(() => {
    const map = new Map<string, {
      account: BankAccount;
      balance: number;
      totalIn: number;
      totalOut: number;
      transactionsCount: number;
    }>();

    bankAccounts.forEach(b => {
      map.set(b.id, {
        account: b,
        balance: Number(b.openingBalance) || 0,
        totalIn: 0,
        totalOut: 0,
        transactionsCount: 0
      });
    });

    cashFlow.forEach(e => {
      if (e.isReversed) return;
      const amt = Number(e.amount) || 0;
      if (amt <= 0) return;

      if (e.isTransfer || e.type === 'transfer') {
        // Source bank
        if (e.accountType === 'bank' && e.bankAccountId && map.has(e.bankAccountId)) {
          const b = map.get(e.bankAccountId)!;
          b.balance -= amt;
          b.totalOut += amt;
          b.transactionsCount += 1;
        }
        // Destination bank
        if (e.toAccountType === 'bank' && e.toBankAccountId && map.has(e.toBankAccountId)) {
          const b = map.get(e.toBankAccountId)!;
          b.balance += amt;
          b.totalIn += amt;
          b.transactionsCount += 1;
        }
      } else if (e.type === 'income') {
        // Income into bank
        const isBank = e.accountType === 'bank' || (e.paymentMode !== 'cash' && !e.accountType);
        const bankId = e.bankAccountId || (isBank ? bankAccounts[0]?.id : undefined);
        if (isBank && bankId && map.has(bankId)) {
          const b = map.get(bankId)!;
          b.balance += amt;
          b.totalIn += amt;
          b.transactionsCount += 1;
        }
      } else if (e.type === 'expense') {
        // Expense out of bank
        const isBank = e.accountType === 'bank' || (e.paymentMode !== 'cash' && !e.accountType);
        const bankId = e.bankAccountId || (isBank ? bankAccounts[0]?.id : undefined);
        if (isBank && bankId && map.has(bankId)) {
          const b = map.get(bankId)!;
          b.balance -= amt;
          b.totalOut += amt;
          b.transactionsCount += 1;
        }
      }
    });

    return map;
  }, [bankAccounts, cashFlow]);

  // 2. Cash Account Balance calculation
  const cashBalanceDetails = useMemo(() => {
    let totalCashIn = 0;
    let totalCashOut = 0;

    cashFlow.forEach(e => {
      if (e.isReversed) return;
      const amt = Number(e.amount) || 0;
      if (amt <= 0) return;

      const isExternalReturn =
        (e.accountingNature === 'savings_transfer' || e.accountingNature === 'investment_return') &&
        !e.accountType;
      const isCashSource =
        !isExternalReturn && (e.accountType === 'cash' || (!e.accountType && e.paymentMode === 'cash'));
      const isCashDest = e.toAccountType === 'cash';

      if (e.isTransfer || e.type === 'transfer') {
        if (isCashSource) {
          totalCashOut += amt; // Cash deposited to bank
        }
        if (isCashDest) {
          totalCashIn += amt; // Cash withdrawn from bank
        }
      } else if (e.type === 'income') {
        if (isCashSource) {
          totalCashIn += amt;
        }
      } else if (e.type === 'expense') {
        if (isCashSource) {
          totalCashOut += amt;
        }
      }
    });

    const currentCashBalance = round2(openingCashBalance + totalCashIn - totalCashOut);

    return {
      openingBalance: openingCashBalance,
      totalCashIn: round2(totalCashIn),
      totalCashOut: round2(totalCashOut),
      currentCashBalance
    };
  }, [cashFlow, openingCashBalance]);

  // 3. Totals & Dashboard Metrics
  const totalBankBalance = useMemo(() => {
    let sum = 0;
    bankBalances.forEach(b => {
      if (b.account.isActive) {
        sum += b.balance;
      }
    });
    return round2(sum);
  }, [bankBalances]);

  const totalAvailableBalance = useMemo(() => {
    return round2(cashBalanceDetails.currentCashBalance + totalBankBalance);
  }, [cashBalanceDetails, totalBankBalance]);

  // Today & This Month In/Out (excluding transfers & reversed)
  const todayStr = todayLocal();
  const currentMonthStr = todayStr.substring(0, 7);

  const { todayMoneyIn, todayMoneyOut, thisMonthIncome, thisMonthExpenses } = useMemo(() => {
    let todayIn = 0;
    let todayOut = 0;
    let monthIn = 0;
    let monthOut = 0;

    cashFlow.forEach(e => {
      if (e.isReversed || e.isTransfer || e.type === 'transfer') return;
      const amt = Number(e.amount) || 0;
      if (amt <= 0) return;

      if (isOperatingIncomeEntry(e)) {
        if (e.date === todayStr) todayIn += amt;
        if (e.date.startsWith(currentMonthStr)) monthIn += amt;
      } else if (isOperatingExpenseEntry(e)) {
        if (e.date === todayStr) todayOut += amt;
        if (e.date.startsWith(currentMonthStr)) monthOut += amt;
      }
    });

    return {
      todayMoneyIn: round2(todayIn),
      todayMoneyOut: round2(todayOut),
      thisMonthIncome: round2(monthIn),
      thisMonthExpenses: round2(monthOut)
    };
  }, [cashFlow, todayStr, currentMonthStr]);

  // Customer Payment Pending (Outstanding Receivables from Tax Invoices ONLY — quotations excluded)
  const customerPaymentPending = useMemo(() => {
    let total = 0;
    invoices.forEach(inv => {
      if (inv.type === 'invoice' && inv.status !== 'cancelled') {
        const bal = Math.max(0, (inv.grandTotal || 0) - (inv.paidAmount || 0));
        total += bal;
      }
    });
    return round2(total);
  }, [invoices]);

  // Customer-grouped pending receivables (supports multi-invoice customers cleanly)
  const customerPendingGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        customerId?: string;
        customerName: string;
        customerPhone: string;
        customerObj?: Customer;
        pendingInvoices: Invoice[];
        totalPending: number;
      }
    >();

    invoices.forEach(inv => {
      if (inv.type !== 'invoice' || inv.status === 'cancelled') return;
      const due = amountDue(inv);
      if (due <= 0) return;
      const phoneKey = (inv.customerPhone || '').replace(/\D/g, '').slice(-10);
      const key = phoneKey || inv.customerId || inv.customerName.trim().toLowerCase();
      if (!groups.has(key)) {
        const custObj = customers.find(
          c =>
            (inv.customerId && c.id === inv.customerId) ||
            (phoneKey && (c.phone || '').replace(/\D/g, '').slice(-10) === phoneKey)
        );
        groups.set(key, {
          key,
          customerId: custObj?.id || inv.customerId,
          customerName: custObj?.name || inv.customerName,
          customerPhone: custObj?.phone || inv.customerPhone || '',
          customerObj: custObj,
          pendingInvoices: [],
          totalPending: 0,
        });
      }
      const g = groups.get(key)!;
      g.pendingInvoices.push(inv);
      g.totalPending = round2(g.totalPending + due);
    });

    return Array.from(groups.values()).sort((a, b) => b.totalPending - a.totalPending);
  }, [invoices, customers]);

  // Vendor Payment Pending (Outstanding Payables from Vendor Bills)
  const vendorPaymentPending = useMemo(() => {
    let total = 0;
    vendorBills.forEach(b => {
      const bal = Math.max(0, (b.totalAmount || 0) - (b.paidAmount || 0));
      total += bal;
    });
    return round2(total);
  }, [vendorBills]);

  // Daily In vs Out chart data (last 14 days)
  const dailyChartData = useMemo(() => {
    const days: { date: string; label: string; inAmt: number; outAmt: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = todayLocal(d);
      const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      days.push({ date: dStr, label, inAmt: 0, outAmt: 0 });
    }

    cashFlow.forEach(e => {
      if (e.isReversed || e.isTransfer || e.type === 'transfer') return;
      const match = days.find(d => d.date === e.date);
      if (match) {
        if (isOperatingIncomeEntry(e)) match.inAmt += Number(e.amount) || 0;
        else if (isOperatingExpenseEntry(e)) match.outAmt += Number(e.amount) || 0;
      }
    });

    return days;
  }, [cashFlow]);

  // Expense Category-wise breakdown (uses resolved Level 1 Category names, excludes loan principal & reversed)
  const expenseCategoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    let grandTotalExpense = 0;

    cashFlow.forEach(e => {
      if (isOperatingExpenseEntry(e)) {
        const amt = Number(e.amount) || 0;
        if (amt > 0) {
          const resolved = resolveCategoryNames(e, moneyFlowCategories);
          const cat = resolved.categoryName || 'Other Expenses';
          map.set(cat, (map.get(cat) || 0) + amt);
          grandTotalExpense += amt;
        }
      }
    });

    const list = Array.from(map.entries())
      .map(([category, amount]) => ({
        category,
        amount: round2(amount),
        percentage: grandTotalExpense > 0 ? Math.round((amount / grandTotalExpense) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    return { list, grandTotalExpense: round2(grandTotalExpense) };
  }, [cashFlow, moneyFlowCategories]);

  // Complete Financial Dashboard & Unified Upcoming Payment Alerts
  const completeDashboard = useMemo(
    () =>
      computeCompleteFinancialDashboard({
        cashFlow,
        bankAccounts,
        openingCashBalance,
        invoices,
        vendorBills,
        loans,
        loanPayments,
        recurringDueEntries,
        savingsAccounts,
        investments,
        employees,
        salaryPayments,
        attendanceRecords,
        salaryAdvances,
        asOfDate: todayStr,
      }),
    [
      cashFlow,
      bankAccounts,
      openingCashBalance,
      invoices,
      vendorBills,
      loans,
      loanPayments,
      recurringDueEntries,
      savingsAccounts,
      investments,
      employees,
      salaryPayments,
      attendanceRecords,
      salaryAdvances,
      todayStr,
    ]
  );

  const financialAlerts = useMemo(
    () =>
      buildFinancialAlerts({
        loans,
        loanPayments,
        recurringExpenses,
        recurringDueEntries,
        employees,
        salaryPayments,
        attendanceRecords,
        salaryAdvances,
        asOfDate: todayStr,
        defaultReminderDays: adminSettings.defaultReminderDays || 3,
      }),
    [
      loans,
      loanPayments,
      recurringExpenses,
      recurringDueEntries,
      employees,
      salaryPayments,
      attendanceRecords,
      salaryAdvances,
      todayStr,
      adminSettings.defaultReminderDays,
    ]
  );

  const urgentAlertCount = useMemo(
    () =>
      financialAlerts.filter(
        a => !a.isPaid && ['overdue', 'due_today', 'due_tomorrow', 'due_3_days', 'due_7_days'].includes(a.severity)
      ).length,
    [financialAlerts]
  );

  // Filtered transactions list (supports 3-level category breadcrumb & account labels, skips reversed)
  const filteredTransactions = useMemo(() => {
    return cashFlow
      .filter(e => {
        if (e.isReversed) return false;
        if (!isDateInRange(e.date)) return false;
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const resolved = resolveCategoryNames(e, moneyFlowCategories);
          const accLabel = formatAccountLabel(e.accountType, e.bankAccountId, bankAccounts, e.paymentMode);
          const haystack = [
            e.description,
            resolved.breadcrumb,
            e.referenceNumber,
            e.notes,
            e.payeeOrCustomer,
            accLabel,
            e.paymentMode,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id));
  }, [cashFlow, dateFilter, customStartDate, customEndDate, searchTerm, moneyFlowCategories, bankAccounts]);

  // Reports Filtered & Sorted Data + 3-Level Breakdown Tree
  const reportEntries = useMemo(
    () => filterAndSortCashFlow(cashFlow, reportFilter, moneyFlowCategories, bankAccounts),
    [cashFlow, reportFilter, moneyFlowCategories, bankAccounts]
  );

  const reportCategoryTree = useMemo(
    () =>
      buildThreeLevelCategoryTree(
        reportEntries.filter(e =>
          reportTreeType === 'income' ? isOperatingIncomeEntry(e) : isOperatingExpenseEntry(e)
        ),
        moneyFlowCategories
      ),
    [reportEntries, reportTreeType, moneyFlowCategories]
  );

  const reportTotals = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    reportEntries.forEach(e => {
      if (e.isReversed || e.isTransfer || e.type === 'transfer') return;
      if (isOperatingIncomeEntry(e)) totalIn += Number(e.amount) || 0;
      else if (isOperatingExpenseEntry(e)) totalOut += Number(e.amount) || 0;
    });
    return { totalIn: round2(totalIn), totalOut: round2(totalOut), net: round2(totalIn - totalOut) };
  }, [reportEntries]);

  // --- FORM SUBMIT HANDLERS ---

  // 1. Submit Money In (with 3-level Category & Cash/Bank/UPI/Other Account validation)
  const handleSaveMoneyIn = (e: React.FormEvent) => {
    e.preventDefault();
    setInFormError(null);
    const numAmt = Number(inAmount);
    if (!numAmt || numAmt <= 0) {
      setInFormError('Please enter a valid receipt amount greater than ₹0.');
      return;
    }

    const accCheck = validatePaymentAccountSelection({
      paymentModeChoice: inModeChoice,
      accountType: inAccountType,
      bankAccountId: inBankId,
      bankAccounts,
      transactionRef: inRefNumber,
      requireReferenceForOther: true,
    });
    if (!accCheck.valid) {
      setInFormError(accCheck.error || 'Please choose a valid Cash or Bank account.');
      return;
    }

    const customerObj = inCustomerId ? customers.find(cust => cust.id === inCustomerId) : undefined;
    const customerName = customerObj?.name || '';
    const effectiveMode = mapChoiceToPaymentMode(inModeChoice);

    if (inInvoiceId) {
      const targetInv = invoices.find(i => i.id === inInvoiceId);
      if (targetInv && numAmt > amountDue(targetInv) + 0.01) {
        setInFormError(`Amount exceeds invoice balance due (₹${amountDue(targetInv).toLocaleString('en-IN')}).`);
        return;
      }
      const res = recordInvoicePayment({
        invoiceId: inInvoiceId,
        customerId: customerObj?.id || targetInv?.customerId || '',
        customerName: customerName || targetInv?.customerName || 'Customer',
        customerPhone: customerObj?.phone || targetInv?.customerPhone,
        amount: numAmt,
        date: inDate,
        paymentMode: effectiveMode,
        paymentModeChoice: inModeChoice,
        accountType: accCheck.resolvedAccountType,
        bankAccountId: accCheck.resolvedBankAccountId,
        bankAccountName: accCheck.resolvedBankName,
        transactionRef: inRefNumber.trim() || undefined,
        notes: inDesc.trim() || inNotes.trim() || undefined,
      });
      if (!res.success) {
        setInFormError(res.error || 'Could not record invoice payment.');
        return;
      }
    } else {
      const targetBank = bankAccounts.find(b => b.id === accCheck.resolvedBankAccountId);
      let autoDesc = inDesc.trim();
      if (!autoDesc) {
        autoDesc = customerName
          ? `Payment from ${customerName}`
          : `${inCategory || 'Income'} received into ${accCheck.resolvedAccountType === 'cash' ? 'Cash Account' : (targetBank?.bankName || 'Bank')}`;
      }

      addCashFlowEntry({
        date: inDate,
        type: 'income',
        category: inCategory || 'Customer Payment',
        categoryId: inCatId || undefined,
        categoryName: inCategory || 'Customer Payment',
        subcategory: inSubName || undefined,
        subcategoryId: inSubId || undefined,
        secondSubcategory: inThirdName || undefined,
        secondSubcategoryId: inThirdId || undefined,
        description: autoDesc,
        amount: numAmt,
        paymentMode: effectiveMode,
        accountType: accCheck.resolvedAccountType,
        bankAccountId: accCheck.resolvedBankAccountId,
        referenceNumber: inRefNumber.trim() || undefined,
        customerId: inCustomerId || undefined,
        payeeOrCustomer: customerName || undefined,
        notes: inNotes.trim() || undefined,
        createdAt: new Date().toISOString(),
      });
    }

    setIsMoneyInModalOpen(false);
    setInAmount('');
    setInRefNumber('');
    setInDesc('');
    setInNotes('');
    setInCustomerId('');
    setInInvoiceId('');
    showToast(`Recorded ₹${numAmt.toLocaleString('en-IN')} Money In successfully!`);
  };

  // 2. Submit Money Out / Expense (with 3-level Category & Cash/Bank/UPI/Other Account validation)
  const handleSaveMoneyOut = (e: React.FormEvent) => {
    e.preventDefault();
    setOutFormError(null);
    const numAmt = Number(outAmount);
    if (!numAmt || numAmt <= 0) {
      setOutFormError('Please enter a valid expense amount greater than ₹0.');
      return;
    }

    const accCheck = validatePaymentAccountSelection({
      paymentModeChoice: outModeChoice,
      accountType: outAccountType,
      bankAccountId: outBankId,
      bankAccounts,
      transactionRef: outRefNumber,
      requireReferenceForOther: true,
    });
    if (!accCheck.valid) {
      setOutFormError(accCheck.error || 'Please choose a valid Cash or Bank account.');
      return;
    }

    let vendorName = outPayeeName.trim();
    if (outVendorId) {
      const v = vendors.find(ven => ven.id === outVendorId);
      if (v) vendorName = v.name;
    }

    const effectiveMode = mapChoiceToPaymentMode(outModeChoice);

    if (outBillId) {
      const res = recordVendorBillPayment({
        vendorBillId: outBillId,
        amount: numAmt,
        date: outDate,
        paymentMode: effectiveMode,
        paymentModeChoice: outModeChoice,
        accountType: accCheck.resolvedAccountType,
        bankAccountId: accCheck.resolvedBankAccountId,
        bankAccountName: accCheck.resolvedBankName,
        transactionRef: outRefNumber.trim() || undefined,
        notes: outDesc.trim() || outNotes.trim() || undefined,
      });
      if (!res.success) {
        setOutFormError(res.error || 'Could not record vendor payment.');
        return;
      }
    } else {
      const sourceBank = bankAccounts.find(b => b.id === accCheck.resolvedBankAccountId);
      let autoDesc = outDesc.trim();
      if (!autoDesc) {
        autoDesc = vendorName
          ? `Payment to ${vendorName} for ${outCategory || 'Expense'}`
          : `${outCategory || 'Expense'} paid from ${accCheck.resolvedAccountType === 'cash' ? 'Cash Account' : (sourceBank?.bankName || 'Bank')}`;
      }

      addCashFlowEntry({
        date: outDate,
        type: 'expense',
        category: outCategory || 'Office Expenses',
        categoryId: outCatId || undefined,
        categoryName: outCategory || 'Office Expenses',
        subcategory: outSubName || undefined,
        subcategoryId: outSubId || undefined,
        secondSubcategory: outThirdName || undefined,
        secondSubcategoryId: outThirdId || undefined,
        description: autoDesc,
        amount: numAmt,
        paymentMode: effectiveMode,
        accountType: accCheck.resolvedAccountType,
        bankAccountId: accCheck.resolvedBankAccountId,
        referenceNumber: outRefNumber.trim() || undefined,
        vendorId: outVendorId || undefined,
        payeeOrCustomer: vendorName || undefined,
        notes: outNotes.trim() || undefined,
        attachmentUrl: outAttachment || undefined,
        createdAt: new Date().toISOString(),
      });
    }

    setIsMoneyOutModalOpen(false);
    setIsExpenseModalOpen(false);
    setOutAmount('');
    setOutRefNumber('');
    setOutDesc('');
    setOutNotes('');
    setOutVendorId('');
    setOutBillId('');
    setOutPayeeName('');
    setOutAttachment('');
    showToast(`Recorded ₹${numAmt.toLocaleString('en-IN')} Money Out successfully!`);
  };

  // 3. Submit Internal Transfer
  const handleSaveTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = Number(trAmount);
    if (!numAmt || numAmt <= 0) {
      alert('Please enter a valid transfer amount');
      return;
    }

    let fromType: 'cash' | 'bank' = 'cash';
    let toType: 'cash' | 'bank' = 'bank';
    let fromBankId: string | undefined = undefined;
    let toBankId: string | undefined = undefined;

    if (trType === 'cash_to_bank') {
      fromType = 'cash';
      toType = 'bank';
      toBankId = trToBankId;
      if (!toBankId) {
        alert('Please select destination bank account');
        return;
      }
    } else if (trType === 'bank_to_cash') {
      fromType = 'bank';
      toType = 'cash';
      fromBankId = trFromBankId;
      if (!fromBankId) {
        alert('Please select source bank account');
        return;
      }
    } else {
      // bank_to_bank
      fromType = 'bank';
      toType = 'bank';
      fromBankId = trFromBankId;
      toBankId = trToBankId;
      if (!fromBankId || !toBankId) {
        alert('Please select both source and destination bank accounts');
        return;
      }
      if (fromBankId === toBankId) {
        alert('Source and destination bank accounts cannot be the same!');
        return;
      }
    }

    transferFunds({
      date: trDate,
      fromAccountType: fromType,
      fromBankAccountId: fromBankId,
      toAccountType: toType,
      toBankAccountId: toBankId,
      amount: numAmt,
      referenceNumber: trRefNumber.trim() || undefined,
      notes: trNotes.trim() || undefined,
    });

    setIsTransferModalOpen(false);
    setTrAmount('');
    setTrRefNumber('');
    setTrNotes('');
    showToast(`Transferred ₹${numAmt.toLocaleString('en-IN')} successfully!`);
  };

  // 4. Save Bank Account
  const handleSaveBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankNameInput.trim() || !accountNumberInput.trim()) {
      alert('Please enter Bank Name and Account Number');
      return;
    }

    if (editingBankAccount) {
      updateBankAccount(editingBankAccount.id, {
        bankName: bankNameInput.trim(),
        accountHolder: holderInput.trim() || 'Spider Grid Solutions',
        accountNumber: accountNumberInput.trim(),
        accountType: accountTypeInput,
        branch: branchInput.trim() || undefined,
        ifscCode: ifscInput.trim() || undefined,
        openingBalance: Number(openingBalanceInput) || 0,
        notes: bankNotesInput.trim() || undefined,
      });
      showToast(`Updated bank account "${bankNameInput}" successfully!`);
      setEditingBankAccount(null);
    } else {
      addBankAccount({
        bankName: bankNameInput.trim(),
        accountHolder: holderInput.trim() || 'Spider Grid Solutions',
        accountNumber: accountNumberInput.trim(),
        accountType: accountTypeInput,
        branch: branchInput.trim() || undefined,
        ifscCode: ifscInput.trim() || undefined,
        openingBalance: Number(openingBalanceInput) || 0,
        isActive: true,
        notes: bankNotesInput.trim() || undefined,
      });
      showToast(`Added new bank account "${bankNameInput}" successfully!`);
      setIsAddBankModalOpen(false);
    }

    setBankNameInput('');
    setAccountNumberInput('');
    setBranchInput('');
    setIfscInput('');
    setOpeningBalanceInput(0);
    setBankNotesInput('');
  };

  // 5. Open Edit Bank
  const handleOpenEditBank = (b: BankAccount) => {
    setEditingBankAccount(b);
    setBankNameInput(b.bankName);
    setHolderInput(b.accountHolder);
    setAccountNumberInput(b.accountNumber);
    setAccountTypeInput(b.accountType);
    setBranchInput(b.branch || '');
    setIfscInput(b.ifscCode || '');
    setOpeningBalanceInput(b.openingBalance);
    setBankNotesInput(b.notes || '');
    setIsAddBankModalOpen(true);
  };

  // 6. Delete Transaction
  const handleDeleteTransaction = (entry: CashFlowEntry) => {
    if (confirm(`Are you sure you want to delete this ${entry.type} entry: "${entry.description}" (₹${entry.amount.toLocaleString('en-IN')})?\n\nThis will update your ledger balances.`)) {
      deleteCashFlowEntry(entry.id);
      showToast('Transaction removed successfully.');
    }
  };

  // 7. Save Opening Cash
  const handleSaveOpeningCash = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(newOpeningCashInput);
    if (isNaN(val) || val < 0) {
      alert('Please enter a valid non-negative opening cash balance');
      return;
    }
    updateAdminSettings({ openingCashBalance: val });
    setIsOpeningCashModalOpen(false);
    showToast(`Opening cash balance set to ₹${val.toLocaleString('en-IN')}`);
  };

  // 8. Image Upload Helper
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const img = new Image();
      img.onload = () => {
        const maxSide = 1000;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setOutAttachment(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  // WhatsApp Payment Reminder Helper
  const handleSendPaymentReminder = (customerPhone: string, customerName: string, invNum: string, balDue: number) => {
    let cleanPhone = (customerPhone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;
    if (!cleanPhone) {
      alert('Customer phone number is missing');
      return;
    }
    const msg = `Dear ${customerName || 'Valued Customer'},\n` +
      `This is a friendly payment reminder from Spider Grid Solutions regarding Invoice #${invNum}.\n\n` +
      `• Outstanding Balance: ₹${balDue.toLocaleString('en-IN')}\n\n` +
      `Kindly settle via UPI: ${adminSettings.workshopUpiId || '9176795665@okbizaxis'} or contact ${adminSettings.workshopPhone || '+91 9176795665'}.\n` +
      `Thank you for your business!`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // CSV Export for Statements (supports filtered report entries & 3-level categories)
  const handleExportTransactionsCsv = (entriesToExport?: CashFlowEntry[]) => {
    const source = entriesToExport || filteredTransactions;
    const csvBody = cashFlowToReportCsv(source, moneyFlowCategories, bankAccounts);
    const blob = new Blob([csvBody], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SGS_Money_Flow_Report_${todayLocal()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP SUB-PAGE NAVIGATION BAR */}
      <div className={`p-1.5 rounded-2xl border flex items-center gap-1 overflow-x-auto scrollbar-thin shadow-xs ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        {[
          { id: 'dashboard', label: 'Dashboard', icon: Wallet, count: urgentAlertCount > 0 ? urgentAlertCount : undefined },
          { id: 'cash', label: 'Cash Account', icon: Coins },
          { id: 'banks', label: 'Bank Accounts', icon: Landmark, count: bankAccounts.length },
          { id: 'in', label: 'Money In', icon: ArrowDownLeft },
          { id: 'out', label: 'Money Out', icon: ArrowUpRight },
          { id: 'expenses', label: 'Expenses', icon: Receipt },
          { id: 'transfers', label: 'Transfers', icon: ArrowLeftRight },
          { id: 'loans', label: 'Loans & Gold', icon: ShieldCheck, count: loans.filter(l => l.status === 'active').length },
          { id: 'emi_calendar', label: 'EMI Calendar', icon: CalendarClock },
          { id: 'recurring', label: 'Recurring', icon: Repeat, count: recurringDueEntries.filter(d => d.status === 'pending').length },
          { id: 'savings', label: 'Savings', icon: PiggyBank, count: savingsAccounts.filter(s => s.isActive).length },
          { id: 'investments', label: 'Investments', icon: TrendingUp, count: investments.filter(i => i.status !== 'closed').length },
          { id: 'monthly_report', label: 'Monthly P&L', icon: FileBarChart2 },
          { id: 'categories', label: 'Categories (3-Level)', icon: FolderTree, count: moneyFlowCategories.filter(c => c.isActive !== false).length },
          { id: 'reports', label: 'Reports & Statements', icon: FileSpreadsheet },
        ].map(sub => {
          const Icon = sub.icon;
          const isActive = activeSubPage === sub.id;
          return (
            <button
              key={sub.id}
              onClick={() => setActiveSubPage(sub.id as MoneyFlowSubPage)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : isDark
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{sub.label}</span>
              {sub.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  {sub.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. MONEY FLOW DASHBOARD */}
      {/* ========================================================================= */}
      {activeSubPage === 'dashboard' && (
        <div className="space-y-6">
          {/* Quick Action Buttons Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Financial Command Center</h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Live multi-account liquidity, cash in hand, bank reconciliation, and cashflow velocity
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMoneyInModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> + Money In
              </button>
              <button
                type="button"
                onClick={() => setIsMoneyOutModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> - Money Out
              </button>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" /> Transfer Funds
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingBankAccount(null);
                  setBankNameInput('');
                  setAccountNumberInput('');
                  setBranchInput('');
                  setIfscInput('');
                  setOpeningBalanceInput(0);
                  setBankNotesInput('');
                  setIsAddBankModalOpen(true);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Landmark className="w-3.5 h-3.5 text-blue-500" /> Add Bank
              </button>
            </div>
          </div>

          {/* PRIMARY FINANCIAL KPI METRIC CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Total Available Balance */}
            <div className={`p-5 rounded-2xl border relative overflow-hidden transition-all ${
              isDark ? 'bg-gradient-to-br from-blue-950/40 to-slate-900 border-blue-900/60' : 'bg-gradient-to-br from-blue-50 to-white border-blue-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Wallet className="w-4 h-4" /> Total Available Balance
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded-full">
                  Cash + Banks
                </span>
              </div>
              <div className="mt-3 text-3xl font-extrabold font-mono tracking-tight text-blue-600 dark:text-blue-400">
                ₹{totalAvailableBalance.toLocaleString('en-IN')}
              </div>
              <div className="mt-2 text-xs flex items-center justify-between text-slate-500">
                <span>Cash: ₹{cashBalanceDetails.currentCashBalance.toLocaleString('en-IN')}</span>
                <span>Banks: ₹{totalBankBalance.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Total Cash in Hand */}
            <div className={`p-5 rounded-2xl border transition-all ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Coins className="w-4 h-4" /> Total Cash Balance
                </span>
                <button
                  type="button"
                  onClick={() => setIsOpeningCashModalOpen(true)}
                  className="text-[10px] underline hover:text-amber-700 cursor-pointer"
                >
                  Edit Opening
                </button>
              </div>
              <div className="mt-3 text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                ₹{cashBalanceDetails.currentCashBalance.toLocaleString('en-IN')}
              </div>
              <div className="mt-2 text-xs flex items-center justify-between text-slate-500">
                <span>In: +₹{cashBalanceDetails.totalCashIn.toLocaleString('en-IN')}</span>
                <span>Out: -₹{cashBalanceDetails.totalCashOut.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Total Bank Balance */}
            <div className={`p-5 rounded-2xl border transition-all ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between text-xs text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Landmark className="w-4 h-4" /> Total Bank Balance
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {bankAccounts.filter(b => b.isActive).length} Active Accounts
                </span>
              </div>
              <div className="mt-3 text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
                ₹{totalBankBalance.toLocaleString('en-IN')}
              </div>
              <div className="mt-2 text-xs text-slate-500 truncate">
                {bankAccounts.map(b => `${b.bankName}: ₹${(bankBalances.get(b.id)?.balance || 0).toLocaleString('en-IN')}`).join(' · ')}
              </div>
            </div>

            {/* Today's Money In */}
            <div className={`p-4 rounded-xl border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-xs text-emerald-600 font-semibold">
                <span>Today's Money In</span>
                <ArrowDownLeft className="w-3.5 h-3.5" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-emerald-600">
                ₹{todayMoneyIn.toLocaleString('en-IN')}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Received today ({todayStr})</p>
            </div>

            {/* Today's Money Out */}
            <div className={`p-4 rounded-xl border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-xs text-rose-600 font-semibold">
                <span>Today's Money Out</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-rose-600">
                ₹{todayMoneyOut.toLocaleString('en-IN')}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Paid out today ({todayStr})</p>
            </div>

            {/* This Month's Income */}
            <div className={`p-4 rounded-xl border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-xs text-blue-600 font-semibold">
                <span>This Month's Income</span>
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-blue-600">
                ₹{thisMonthIncome.toLocaleString('en-IN')}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Total customer & service income</p>
            </div>

            {/* This Month's Expenses */}
            <div className={`p-4 rounded-xl border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-xs text-amber-600 font-semibold">
                <span>This Month's Expenses</span>
                <TrendingDown className="w-3.5 h-3.5" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-amber-600">
                ₹{thisMonthExpenses.toLocaleString('en-IN')}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Vendor, spares, salary & rent</p>
            </div>

            {/* Customer Payment Pending */}
            <div className={`p-4 rounded-xl border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-xs text-amber-500 font-semibold">
                <span>Customer Payment Pending</span>
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-amber-500">
                ₹{customerPaymentPending.toLocaleString('en-IN')}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Receivables owed by clients</p>
            </div>

            {/* Vendor Payment Pending */}
            <div className={`p-4 rounded-xl border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-xs text-rose-500 font-semibold">
                <span>Vendor Payment Pending</span>
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <div className="mt-2 text-xl font-bold font-mono text-rose-500">
                ₹{vendorPaymentPending.toLocaleString('en-IN')}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Unpaid vendor purchase bills</p>
            </div>
          </div>

          {/* SEPARATED LIABILITIES, RESERVES, INVESTMENTS & SALARY COMMITMENTS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => setActiveSubPage('loans')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                isDark ? 'bg-slate-900 border-slate-800 hover:border-amber-500/50' : 'bg-white border-slate-200 hover:border-amber-400 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold uppercase text-amber-500">
                <span>Loan Liabilities (Sep.)</span>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="mt-2 text-xl font-extrabold font-mono text-amber-600 dark:text-amber-400">
                ₹{completeDashboard.totalOutstandingLoanLiabilities.toLocaleString('en-IN')}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                EMI/Mo: ₹{completeDashboard.totalMonthlyEmi.toLocaleString('en-IN')} · Gold: ₹{completeDashboard.goldLoansOutstanding.toLocaleString('en-IN')}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubPage('savings')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                isDark ? 'bg-slate-900 border-slate-800 hover:border-teal-500/50' : 'bg-white border-slate-200 hover:border-teal-400 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold uppercase text-teal-500">
                <span>Savings & Reserves</span>
                <PiggyBank className="w-4 h-4" />
              </div>
              <div className="mt-2 text-xl font-extrabold font-mono text-teal-600 dark:text-teal-400">
                ₹{completeDashboard.totalSavingsBalance.toLocaleString('en-IN')}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Standalone: ₹{completeDashboard.unlinkedSavingsBalance.toLocaleString('en-IN')} · Bank-Linked: ₹{completeDashboard.linkedSavingsBalance.toLocaleString('en-IN')}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubPage('investments')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                isDark ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-200 hover:border-indigo-400 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold uppercase text-indigo-500">
                <span>Investments Value</span>
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="mt-2 text-xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400">
                ₹{completeDashboard.totalInvestmentCurrentValue.toLocaleString('en-IN')}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Invested: ₹{completeDashboard.totalInvestedAmount.toLocaleString('en-IN')} · P&amp;L:{' '}
                <span className={completeDashboard.investmentUnrealizedGainLoss >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                  {completeDashboard.investmentUnrealizedGainLoss >= 0 ? '+' : '-'}₹{Math.abs(completeDashboard.investmentUnrealizedGainLoss).toLocaleString('en-IN')}
                </span>
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubPage('recurring')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                isDark ? 'bg-slate-900 border-slate-800 hover:border-purple-500/50' : 'bg-white border-slate-200 hover:border-purple-400 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold uppercase text-purple-500">
                <span>Monthly Obligations</span>
                <Briefcase className="w-4 h-4" />
              </div>
              <div className="mt-2 text-xl font-extrabold font-mono text-purple-600 dark:text-purple-400">
                ₹{round2(completeDashboard.thisMonthStaffSalaryPending + completeDashboard.thisMonthRecurringPending).toLocaleString('en-IN')}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Salary Pending: ₹{completeDashboard.thisMonthStaffSalaryPending.toLocaleString('en-IN')} · Recurring: ₹{completeDashboard.thisMonthRecurringPending.toLocaleString('en-IN')}
              </p>
            </button>
          </div>

          {/* UPCOMING EXPENSE, EMI & SALARY ALERTS */}
          <div className={`p-5 rounded-2xl border space-y-3 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold">Upcoming Expense, EMI & Salary Alerts</h3>
                {urgentAlertCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-500">
                    {urgentAlertCount} Action Needed
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1">
                {(
                  [
                    { id: 'all_active', label: 'All Pending' },
                    { id: 'overdue', label: 'Overdue' },
                    { id: 'due_today', label: 'Due Today' },
                    { id: 'due_tomorrow', label: 'Tomorrow' },
                    { id: 'due_3_days', label: '≤ 3 Days' },
                    { id: 'due_7_days', label: '≤ 7 Days' },
                    { id: 'paid', label: 'Paid' },
                  ] as const
                ).map(pill => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setAlertSeverityFilter(pill.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                      alertSeverityFilter === pill.id
                        ? 'bg-blue-600 text-white'
                        : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {(() => {
              const visibleAlerts = financialAlerts.filter(a => {
                if (alertSeverityFilter === 'all_active') return !a.isPaid;
                if (alertSeverityFilter === 'due_3_days') {
                  return !a.isPaid && ['due_today', 'due_tomorrow', 'due_3_days'].includes(a.severity);
                }
                if (alertSeverityFilter === 'due_7_days') {
                  return !a.isPaid && ['due_today', 'due_tomorrow', 'due_3_days', 'due_7_days'].includes(a.severity);
                }
                return a.severity === alertSeverityFilter;
              });

              if (visibleAlerts.length === 0) {
                return (
                  <p className="text-xs text-slate-400 py-3">
                    No {alertSeverityFilter === 'paid' ? 'paid alerts this month' : 'pending alerts in this window'}.
                  </p>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {visibleAlerts.map(al => {
                    const badgeStyle =
                      al.severity === 'overdue'
                        ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                        : al.severity === 'due_today'
                          ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                          : al.severity === 'paid'
                            ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                            : 'bg-blue-500/10 text-blue-500 border-blue-500/20';

                    return (
                      <div
                        key={al.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase ${badgeStyle}`}>
                              {al.severity === 'overdue'
                                ? `${Math.abs(al.daysRemaining)}d Overdue`
                                : al.severity === 'due_today'
                                  ? 'Due Today'
                                  : al.severity === 'due_tomorrow'
                                    ? 'Tomorrow'
                                    : al.severity === 'paid'
                                      ? 'Paid'
                                      : `In ${al.daysRemaining}d`}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">{al.dueDate}</span>
                          </div>
                          <p className="text-xs font-bold truncate mt-1">{al.title}</p>
                          <p className="text-[10px] text-slate-400 truncate">{al.subtitle}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-xs">₹{al.amount.toLocaleString('en-IN')}</div>
                          {al.actionTab !== 'salary' ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (al.actionTab !== 'salary') {
                                  setActiveSubPage(al.actionTab);
                                }
                              }}
                              className="mt-1 text-[10px] font-bold text-blue-500 hover:underline cursor-pointer"
                            >
                              {al.isPaid ? 'View →' : 'Pay Now →'}
                            </button>
                          ) : (
                            <span className="mt-1 block text-[10px] text-slate-400">Staff &amp; Salary Tab</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* VISUAL CHARTS & COMPARISONS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Daily Money In vs Money Out Trend (Last 14 Days) */}
            <div className={`lg:col-span-8 p-5 rounded-2xl border space-y-4 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <span>Daily Money Velocity (Last 14 Days)</span>
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Comparing daily customer collections (Green) vs expenses & purchases (Rose)
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
                    <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Money In
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-rose-600">
                    <span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" /> Money Out
                  </span>
                </div>
              </div>

              {/* Bar Chart Visualization */}
              <div className="h-48 pt-4 flex items-end gap-2 border-b border-slate-200 dark:border-slate-800">
                {dailyChartData.map((d, idx) => {
                  const maxAmt = Math.max(
                    ...dailyChartData.map(x => Math.max(x.inAmt, x.outAmt)),
                    1000
                  );
                  const inHeight = Math.min(100, Math.round((d.inAmt / maxAmt) * 100));
                  const outHeight = Math.min(100, Math.round((d.outAmt / maxAmt) * 100));

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                      {/* Tooltip */}
                      <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center px-2 py-1 text-[10px] font-mono text-white bg-slate-900 border border-slate-700 rounded-md shadow-lg pointer-events-none whitespace-nowrap">
                        <span>{d.date}</span>
                        <span className="text-emerald-400">In: ₹{d.inAmt.toLocaleString('en-IN')}</span>
                        <span className="text-rose-400">Out: ₹{d.outAmt.toLocaleString('en-IN')}</span>
                      </div>

                      <div className="w-full flex items-end justify-center gap-0.5 h-full pb-1">
                        <div
                          style={{ height: `${Math.max(inHeight, 4)}%` }}
                          className={`w-1/2 rounded-t transition-all ${
                            d.inAmt > 0 ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-slate-200 dark:bg-slate-800'
                          }`}
                        />
                        <div
                          style={{ height: `${Math.max(outHeight, 4)}%` }}
                          className={`w-1/2 rounded-t transition-all ${
                            d.outAmt > 0 ? 'bg-rose-500 hover:bg-rose-400' : 'bg-slate-200 dark:bg-slate-800'
                          }`}
                        />
                      </div>
                      <span className="text-[9px] text-slate-400 truncate max-w-full block">
                        {d.label.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Expense Category Breakdown */}
            <div className={`lg:col-span-4 p-5 rounded-2xl border space-y-4 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-purple-500" />
                    <span>Expense Breakdown</span>
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Major outflow heads
                  </p>
                </div>
                <span className="font-mono font-bold text-xs text-rose-500">
                  ₹{expenseCategoryBreakdown.grandTotalExpense.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="space-y-3 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                {expenseCategoryBreakdown.list.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No expenses recorded yet.</p>
                ) : (
                  expenseCategoryBreakdown.list.map((cat, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                          {cat.category}
                        </span>
                        <span className="font-mono font-bold">
                          ₹{cat.amount.toLocaleString('en-IN')}{' '}
                          <span className="text-[10px] text-slate-400 font-normal">({cat.percentage}%)</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${cat.percentage}%` }}
                          className="h-full bg-purple-500 rounded-full"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RECENT TRANSACTIONS FEED */}
          <div className={`rounded-2xl border overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
              isDark ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <div>
                <h3 className="text-base font-bold">Recent Cash & Bank Transactions</h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Live unified transaction feed from all accounts and payment gateways
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportTransactionsCsv()}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                    isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-50 text-slate-700'
                  }`}
                  title="Export to CSV"
                >
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase text-[10px] font-bold tracking-wider ${
                  isDark ? 'bg-slate-950/60 text-slate-400 border-b border-slate-800' : 'bg-slate-50 text-slate-600 border-b border-slate-200'
                }`}>
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Account</th>
                    <th className="py-3 px-4">Category & Description</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                  {filteredTransactions.slice(0, 15).map(entry => {
                    const isIncome = entry.type === 'income';
                    const isExpense = entry.type === 'expense';
                    const isTransfer = entry.isTransfer || entry.type === 'transfer';
                    const bank = bankAccounts.find(b => b.id === entry.bankAccountId);

                    return (
                      <tr key={entry.id} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/70'}>
                        <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {entry.date}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {entry.accountingNature === 'loan_principal' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              <ShieldCheck className="w-3 h-3" /> Loan Principal
                            </span>
                          ) : isTransfer ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                              <ArrowLeftRight className="w-3 h-3" /> {entry.accountingNature === 'savings_transfer' ? 'Savings Transfer' : entry.accountingNature === 'investment_transfer' || entry.accountingNature === 'investment_return' ? 'Invest Transfer' : 'Transfer'}
                            </span>
                          ) : isIncome ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <ArrowDownLeft className="w-3 h-3" /> Money In
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              <ArrowUpRight className="w-3 h-3" /> Money Out
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {entry.accountType === 'cash' || (!entry.accountType && entry.paymentMode === 'cash') ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                              <Coins className="w-3.5 h-3.5" /> Cash
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400">
                              <Landmark className="w-3.5 h-3.5" /> {bank?.bankName || 'Bank'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {entry.description}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {resolveCategoryNames(entry, moneyFlowCategories).breadcrumb} {entry.payeeOrCustomer ? `· ${entry.payeeOrCustomer}` : ''}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {entry.referenceNumber || '—'}
                        </td>
                        <td className={`py-3 px-4 font-mono font-bold text-right whitespace-nowrap ${
                          isTransfer ? 'text-purple-600 dark:text-purple-400' :
                          isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {isIncome ? '+' : isExpense ? '-' : ''}₹{entry.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            {entry.attachmentUrl && (
                              <button
                                type="button"
                                onClick={() => setZoomedImage(entry.attachmentUrl || null)}
                                className="p-1 rounded text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 cursor-pointer"
                                title="View attached receipt / voucher photo"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeleteTransaction(entry)}
                                className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"
                                title="Delete entry (Admin Only)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                        No transactions recorded matching the selected filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CASH ACCOUNT */}
      {/* ========================================================================= */}
      {activeSubPage === 'cash' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                <span>Cash Account Ledger</span>
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Physical cash in hand ledger, opening float, cash received, cash expenses & deposits
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setInModeChoice('cash');
                  setInAccountType('cash');
                  setInBankId('');
                  setInFormError(null);
                  setIsMoneyInModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Record Cash In
              </button>
              <button
                type="button"
                onClick={() => {
                  setOutModeChoice('cash');
                  setOutAccountType('cash');
                  setOutBankId('');
                  setOutFormError(null);
                  setIsMoneyOutModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Record Cash Out
              </button>
              <button
                type="button"
                onClick={() => {
                  setTrType('cash_to_bank');
                  setIsTransferModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <Landmark className="w-3.5 h-3.5" /> Deposit Cash to Bank
              </button>
              <button
                type="button"
                onClick={() => setIsOpeningCashModalOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-500" /> Set Opening Cash
              </button>
            </div>
          </div>

          {/* Cash Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className={`p-4 rounded-xl border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <span className="text-xs text-slate-500 font-semibold uppercase">Opening Cash Balance</span>
              <div className="mt-2 text-xl font-bold font-mono text-slate-700 dark:text-slate-300">
                ₹{cashBalanceDetails.openingBalance.toLocaleString('en-IN')}
              </div>
            </div>

            <div className={`p-4 rounded-xl border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <span className="text-xs text-emerald-600 font-semibold uppercase">Total Cash Received (+)</span>
              <div className="mt-2 text-xl font-bold font-mono text-emerald-600">
                ₹{cashBalanceDetails.totalCashIn.toLocaleString('en-IN')}
              </div>
            </div>

            <div className={`p-4 rounded-xl border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <span className="text-xs text-rose-600 font-semibold uppercase">Total Cash Paid (-)</span>
              <div className="mt-2 text-xl font-bold font-mono text-rose-600">
                ₹{cashBalanceDetails.totalCashOut.toLocaleString('en-IN')}
              </div>
            </div>

            <div className={`p-4 rounded-xl border ${
              isDark ? 'bg-amber-950/30 border-amber-900/60' : 'bg-amber-50 border-amber-300'
            }`}>
              <span className="text-xs text-amber-800 dark:text-amber-300 font-bold uppercase">Current Cash in Hand (=)</span>
              <div className="mt-2 text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
                ₹{cashBalanceDetails.currentCashBalance.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Cash Ledger Table with Running Balance */}
          <div className={`rounded-2xl border overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
              isDark ? 'border-slate-800' : 'border-slate-100'
            }`}>
              <h3 className="text-base font-bold">Cash Book Chronological Ledger</h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filter cash entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`px-3 py-1.5 text-xs rounded-lg border ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase text-[10px] font-bold tracking-wider ${
                  isDark ? 'bg-slate-950/60 text-slate-400 border-b border-slate-800' : 'bg-slate-50 text-slate-600 border-b border-slate-200'
                }`}>
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4 text-right text-emerald-600">Cash In (+)</th>
                    <th className="py-3 px-4 text-right text-rose-600">Cash Out (-)</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                  {filteredTransactions
                    .filter(t => {
                      const isCashSrc = t.accountType === 'cash' || (!t.accountType && t.paymentMode === 'cash');
                      const isCashDest = t.toAccountType === 'cash';
                      return isCashSrc || isCashDest;
                    })
                    .map(entry => {
                      const isCashIn = (entry.type === 'income') || (entry.type === 'transfer' && entry.toAccountType === 'cash');
                      const isCashOut = (entry.type === 'expense') || (entry.type === 'transfer' && entry.accountType === 'cash');

                      return (
                        <tr key={entry.id} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/70'}>
                          <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{entry.date}</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {entry.isTransfer ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                                {entry.transferType === 'cash_to_bank' ? 'Deposit to Bank' : 'Withdrawal from Bank'}
                              </span>
                            ) : entry.type === 'income' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                Cash In
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                Cash Out
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{entry.description}</p>
                            <span className="text-[10px] text-slate-400">{entry.category}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">{entry.referenceNumber || '—'}</td>
                          <td className="py-3 px-4 font-mono font-bold text-right text-emerald-600">
                            {isCashIn ? `₹${entry.amount.toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-right text-rose-600">
                            {isCashOut ? `₹${entry.amount.toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeleteTransaction(entry)}
                                className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"
                                title="Delete entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. BANK ACCOUNTS */}
      {/* ========================================================================= */}
      {activeSubPage === 'banks' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <Landmark className="w-5 h-5 text-blue-500" />
                <span>Multi-Bank Account Management</span>
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Current, Savings & Overdraft accounts with individual real-time ledgers & reconciliation
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingBankAccount(null);
                setBankNameInput('');
                setAccountNumberInput('');
                setBranchInput('');
                setIfscInput('');
                setOpeningBalanceInput(0);
                setBankNotesInput('');
                setIsAddBankModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add New Bank Account
            </button>
          </div>

          {/* Bank Accounts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {bankAccounts.map(b => {
              const bDetails = bankBalances.get(b.id) || {
                balance: b.openingBalance,
                totalIn: 0,
                totalOut: 0,
                transactionsCount: 0
              };

              const maskedAcc = b.accountNumber ? `•••• •••• ${b.accountNumber.slice(-4)}` : '•••• 0000';

              return (
                <div
                  key={b.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    b.isActive
                      ? (isDark ? 'bg-slate-900 border-slate-800 hover:border-blue-500/50' : 'bg-white border-slate-200 hover:border-blue-400 shadow-sm')
                      : (isDark ? 'bg-slate-950 border-slate-800 opacity-60' : 'bg-slate-50 border-slate-200 opacity-60')
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center font-bold text-sm">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-base leading-tight">{b.bankName}</h4>
                          <span className="text-[10px] font-mono text-slate-400">{maskedAcc}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditBank(b)}
                          className="p-1 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 cursor-pointer"
                          title="Edit Bank Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleBankAccountStatus(b.id)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                            b.isActive
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                          title="Toggle Active Status"
                        >
                          {b.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                    </div>

                    {/* Account Type & IFSC */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Account Type</span>
                        <span className="font-semibold uppercase text-slate-700 dark:text-slate-300">{b.accountType}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">IFSC Code</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">{b.ifscCode || '—'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block text-[10px] uppercase">Branch & Holder</span>
                        <span className="text-slate-600 dark:text-slate-400 truncate block">
                          {b.accountHolder} {b.branch ? `· ${b.branch}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Current Calculated Balance Badge */}
                    <div className={`p-3 rounded-xl border ${
                      isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className="text-[10px] font-bold uppercase text-slate-400">Current Book Balance</span>
                      <div className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
                        ₹{bDetails.balance.toLocaleString('en-IN')}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span className="text-emerald-500">+₹{bDetails.totalIn.toLocaleString('en-IN')} in</span>
                        <span className="text-rose-500">-₹{bDetails.totalOut.toLocaleString('en-IN')} out</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setViewingBankLedger(b)}
                      className="flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Ledger ({bDetails.transactionsCount})
                    </button>

                    {canDelete && bankAccounts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete bank account "${b.bankName}"?\n\nTransactions associated with it will remain in history.`)) {
                            deleteBankAccount(b.id);
                            showToast(`Deleted bank account "${b.bankName}".`);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"
                        title="Delete Bank Account (Admin Only)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MONEY IN */}
      {/* ========================================================================= */}
      {activeSubPage === 'in' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-emerald-500" />
                <span>Money In Register</span>
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Record client payments, service fees, advances, CCTV installation receipts & capital
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsMoneyInModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> + Record Money In
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <span className="text-xs text-slate-500 font-semibold uppercase">Total Money In (All-Time)</span>
              <div className="mt-2 text-2xl font-bold font-mono text-emerald-600">
                ₹{cashFlow
                  .filter(e => e.type === 'income' && !e.isTransfer)
                  .reduce((acc, it) => acc + (Number(it.amount) || 0), 0)
                  .toLocaleString('en-IN')}
              </div>
            </div>
            <div className={`p-4 rounded-xl border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <span className="text-xs text-slate-500 font-semibold uppercase">Received Today</span>
              <div className="mt-2 text-2xl font-bold font-mono text-emerald-600">
                ₹{todayMoneyIn.toLocaleString('en-IN')}
              </div>
            </div>
            <div className={`p-4 rounded-xl border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <span className="text-xs text-slate-500 font-semibold uppercase">Received This Month</span>
              <div className="mt-2 text-2xl font-bold font-mono text-emerald-600">
                ₹{thisMonthIncome.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by customer, invoice #, reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full text-xs bg-transparent border-0 focus:outline-none ${
                  isDark ? 'text-slate-200' : 'text-slate-800'
                }`}
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className={`px-3 py-1.5 text-xs rounded-lg border font-medium ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-300 text-slate-700'
                }`}
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className={`rounded-2xl border overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase text-[10px] font-bold tracking-wider ${
                  isDark ? 'bg-slate-950/60 text-slate-400 border-b border-slate-800' : 'bg-slate-50 text-slate-600 border-b border-slate-200'
                }`}>
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer / Payee</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Account & Mode</th>
                    <th className="py-3 px-4">Ref Number</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                  {filteredTransactions
                    .filter(t => t.type === 'income' && !t.isTransfer)
                    .map(entry => {
                      const bank = bankAccounts.find(b => b.id === entry.bankAccountId);

                      return (
                        <tr key={entry.id} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/70'}>
                          <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{entry.date}</td>
                          <td className="py-3 px-4 font-semibold">
                            <p className="text-slate-800 dark:text-slate-200">{entry.description}</p>
                            {entry.payeeOrCustomer && (
                              <span className="text-[10px] text-blue-500">{entry.payeeOrCustomer}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              {resolveCategoryNames(entry, moneyFlowCategories).breadcrumb}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="text-[11px] font-medium">
                              {formatAccountLabel(entry.accountType, entry.bankAccountId, bankAccounts, entry.paymentMode)}
                            </div>
                            <span className="text-[10px] text-slate-400 uppercase font-mono">{entry.paymentMode}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{entry.referenceNumber || '—'}</td>
                          <td className="py-3 px-4 font-mono font-bold text-right text-emerald-600 whitespace-nowrap">
                            +₹{entry.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeleteTransaction(entry)}
                                className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"
                                title="Delete entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MONEY OUT */}
      {/* ========================================================================= */}
      {activeSubPage === 'out' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-rose-500" />
                <span>Money Out Register</span>
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Record vendor bills settlement, stock purchases, salary payouts, shop rent & utilities
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setOutFormError(null);
                setIsMoneyOutModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> + Record Money Out
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <span className="text-xs text-slate-500 font-semibold uppercase">Total Money Out (All-Time)</span>
              <div className="mt-2 text-2xl font-bold font-mono text-rose-600">
                ₹{cashFlow
                  .filter(e => !e.isReversed && e.type === 'expense' && !e.isTransfer)
                  .reduce((acc, it) => acc + (Number(it.amount) || 0), 0)
                  .toLocaleString('en-IN')}
              </div>
            </div>
            <div className={`p-4 rounded-xl border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <span className="text-xs text-slate-500 font-semibold uppercase">Paid Out Today</span>
              <div className="mt-2 text-2xl font-bold font-mono text-rose-600">
                ₹{todayMoneyOut.toLocaleString('en-IN')}
              </div>
            </div>
            <div className={`p-4 rounded-xl border ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <span className="text-xs text-slate-500 font-semibold uppercase">Paid Out This Month</span>
              <div className="mt-2 text-2xl font-bold font-mono text-rose-600">
                ₹{thisMonthExpenses.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by vendor, bill #, 3-level category, account..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full text-xs bg-transparent border-0 focus:outline-none ${
                  isDark ? 'text-slate-200' : 'text-slate-800'
                }`}
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className={`px-3 py-1.5 text-xs rounded-lg border font-medium ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-300 text-slate-700'
                }`}
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className={`rounded-2xl border overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase text-[10px] font-bold tracking-wider ${
                  isDark ? 'bg-slate-950/60 text-slate-400 border-b border-slate-800' : 'bg-slate-50 text-slate-600 border-b border-slate-200'
                }`}>
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Vendor / Payee</th>
                    <th className="py-3 px-4">Category (3-Level)</th>
                    <th className="py-3 px-4">Account & Mode</th>
                    <th className="py-3 px-4">Ref Number</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                  {filteredTransactions
                    .filter(t => t.type === 'expense' && !t.isTransfer)
                    .map(entry => {
                      const catRes = resolveCategoryNames(entry, moneyFlowCategories);
                      return (
                        <tr key={entry.id} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/70'}>
                          <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{entry.date}</td>
                          <td className="py-3 px-4 font-semibold">
                            <p className="text-slate-800 dark:text-slate-200">{entry.description}</p>
                            {entry.payeeOrCustomer && (
                              <span className="text-[10px] text-purple-500">{entry.payeeOrCustomer}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              {catRes.breadcrumb}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="text-[11px] font-medium">
                              {formatAccountLabel(entry.accountType, entry.bankAccountId, bankAccounts, entry.paymentMode)}
                            </div>
                            <span className="text-[10px] text-slate-400 uppercase font-mono">{entry.paymentMode}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{entry.referenceNumber || '—'}</td>
                          <td className="py-3 px-4 font-mono font-bold text-right text-rose-600 whitespace-nowrap">
                            -₹{entry.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {entry.attachmentUrl && (
                                <button
                                  type="button"
                                  onClick={() => setZoomedImage(entry.attachmentUrl || null)}
                                  className="p-1 rounded text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 cursor-pointer"
                                  title="View attached bill receipt"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTransaction(entry)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"
                                  title="Delete entry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. EXPENSES */}
      {/* ========================================================================= */}
      {activeSubPage === 'expenses' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <Receipt className="w-5 h-5 text-purple-500" />
                <span>Operating Expense Manager</span>
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Workshop running costs, food, travel, rent, spares, EB bills & attachments (Transfers excluded)
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setOutFormError(null);
                setIsExpenseModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> + Add New Expense
            </button>
          </div>

          {/* Expense Category Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {expenseCategoryBreakdown.list.slice(0, 6).map((cat, idx) => (
              <div key={idx} className={`p-3 rounded-xl border ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <span className="text-[10px] text-slate-400 font-semibold truncate block uppercase">{cat.category}</span>
                <div className="mt-1 text-base font-bold font-mono text-purple-600 dark:text-purple-400">
                  ₹{cat.amount.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">{cat.percentage}% of total</div>
              </div>
            ))}
          </div>

          {/* Expenses List */}
          <div className={`rounded-2xl border overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase text-[10px] font-bold tracking-wider ${
                  isDark ? 'bg-slate-950/60 text-slate-400 border-b border-slate-800' : 'bg-slate-50 text-slate-600 border-b border-slate-200'
                }`}>
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Category (3-Level)</th>
                    <th className="py-3 px-4">Payee / Description</th>
                    <th className="py-3 px-4">Paid From</th>
                    <th className="py-3 px-4">Receipt Bill</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                  {filteredTransactions
                    .filter(t => isOperatingExpenseEntry(t))
                    .map(entry => {
                      const catRes = resolveCategoryNames(entry, moneyFlowCategories);
                      return (
                        <tr key={entry.id} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/70'}>
                          <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{entry.date}</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                              {catRes.breadcrumb}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold">
                            <p className="text-slate-800 dark:text-slate-200">{entry.description}</p>
                            {entry.notes && <p className="text-[10px] text-slate-400 font-normal">{entry.notes}</p>}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {formatAccountLabel(entry.accountType, entry.bankAccountId, bankAccounts, entry.paymentMode)}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono uppercase">{entry.paymentMode}</span>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {entry.attachmentUrl ? (
                              <button
                                type="button"
                                onClick={() => setZoomedImage(entry.attachmentUrl || null)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 hover:bg-blue-200 cursor-pointer"
                              >
                                <Eye className="w-3 h-3" /> View Slip
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[10px]">No attachment</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-right text-rose-600 whitespace-nowrap">
                            ₹{entry.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeleteTransaction(entry)}
                                className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"
                                title="Delete expense entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. TRANSFERS */}
      {/* ========================================================================= */}
      {activeSubPage === 'transfers' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-purple-500" />
                <span>Internal Account Transfers</span>
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Move liquidity between Cash and Bank accounts without affecting P&L or business income/expense
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsTransferModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> + New Transfer
            </button>
          </div>

          {/* Transfer Info Banner */}
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
            isDark ? 'bg-purple-950/20 border-purple-900/50 text-purple-200' : 'bg-purple-50 border-purple-200 text-purple-900'
          }`}>
            <Sparkles className="w-5 h-5 shrink-0 text-purple-500 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold">Strict Accounting Discipline Enforced:</p>
              <p className="text-[11px] opacity-90">
                Internal transfers (Cash Deposits to Bank, ATM Withdrawals to Cash, Inter-Bank transfers) strictly adjust account ledger balances without counting as taxable revenue or deductible business expense. Same-account transfers are strictly disallowed.
              </p>
            </div>
          </div>

          {/* Transfers Table */}
          <div className={`rounded-2xl border overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase text-[10px] font-bold tracking-wider ${
                  isDark ? 'bg-slate-950/60 text-slate-400 border-b border-slate-800' : 'bg-slate-50 text-slate-600 border-b border-slate-200'
                }`}>
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Transfer Type</th>
                    <th className="py-3 px-4">Source Account (Deducted)</th>
                    <th className="py-3 px-4">Destination (Credited)</th>
                    <th className="py-3 px-4">Reference / UTR</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                  {filteredTransactions
                    .filter(t => t.isTransfer || t.type === 'transfer')
                    .map(entry => {
                      const fromBank = bankAccounts.find(b => b.id === entry.bankAccountId);
                      const toBank = bankAccounts.find(b => b.id === entry.toBankAccountId);

                      return (
                        <tr key={entry.id} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/70'}>
                          <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{entry.date}</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                              {entry.transferType === 'cash_to_bank' ? 'Cash Deposit to Bank' :
                               entry.transferType === 'bank_to_cash' ? 'Cash Withdrawal to Hand' : 'Inter-Bank Transfer'}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-semibold text-rose-500">
                            {entry.accountType === 'cash' ? 'Cash in Hand' : (fromBank?.bankName || 'Bank')}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-semibold text-emerald-500">
                            {entry.toAccountType === 'cash' ? 'Cash in Hand' : (toBank?.bankName || 'Bank')}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">{entry.referenceNumber || '—'}</td>
                          <td className="py-3 px-4 font-mono font-bold text-right text-purple-600 dark:text-purple-400 whitespace-nowrap">
                            ₹{entry.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeleteTransaction(entry)}
                                className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 cursor-pointer"
                                title="Delete transfer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  {filteredTransactions.filter(t => t.isTransfer || t.type === 'transfer').length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                        No internal transfers recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7B. 3-LEVEL CATEGORY MANAGEMENT */}
      {/* ========================================================================= */}
      {activeSubPage === 'categories' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-blue-500" />
                <span>3-Level Money Flow Category Manager</span>
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Organize Category → Subcategory → 2nd Subcategory. Rename any level or deactivate without deleting historical entries.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {(['all', 'expense', 'income'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setCatTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize cursor-pointer ${
                    catTypeFilter === t
                      ? 'bg-blue-600 text-white'
                      : isDark ? 'bg-slate-900 border border-slate-800 text-slate-300' : 'bg-white border border-slate-300 text-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowInactiveCats(!showInactiveCats)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                  showInactiveCats
                    ? 'border-amber-500 text-amber-500'
                    : isDark ? 'border-slate-800 text-slate-400' : 'border-slate-300 text-slate-500'
                }`}
              >
                {showInactiveCats ? 'Showing Inactive' : 'Active Only'}
              </button>
            </div>
          </div>

          {/* Add New Level 1 Category */}
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-500">Create New Level 1 Category</h3>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={newCatType}
                onChange={(e) => setNewCatType(e.target.value as 'expense' | 'income')}
                className={`rounded-lg px-3 py-2 text-xs font-bold ${
                  isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-slate-50 border border-slate-300 text-slate-800'
                }`}
              >
                <option value="expense">Expense Category</option>
                <option value="income">Income Category</option>
              </select>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Marketing Expenses, Courier & Logistics, Workshop AMC..."
                className={`flex-1 min-w-[220px] rounded-lg px-3 py-2 text-xs ${
                  isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'
                }`}
              />
              <button
                type="button"
                onClick={() => {
                  const res = addMoneyFlowCategory({
                    name: newCatName,
                    level: 1,
                    parentId: null,
                    type: newCatType,
                  });
                  if (res.error) {
                    setCatFeedback({ type: 'error', text: res.error });
                  } else {
                    setCatFeedback({ type: 'success', text: `Created Level 1 category "${res.category?.name}"` });
                    setNewCatName('');
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Category
              </button>
            </div>
            {catFeedback && (
              <div className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                catFeedback.type === 'error'
                  ? 'bg-rose-500/10 border border-rose-500/40 text-rose-500'
                  : 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-500'
              }`}>
                {catFeedback.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{catFeedback.text}</span>
              </div>
            )}
          </div>

          {/* 3-Level Category Hierarchy Tree */}
          <div className="space-y-3">
            {moneyFlowCategories
              .filter(
                c =>
                  c.level === 1 &&
                  (catTypeFilter === 'all' || c.type === catTypeFilter || c.type === 'both') &&
                  (showInactiveCats || c.isActive !== false)
              )
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(l1 => {
                const l2Children = moneyFlowCategories
                  .filter(c => c.level === 2 && c.parentId === l1.id && (showInactiveCats || c.isActive !== false))
                  .sort((a, b) => a.name.localeCompare(b.name));

                return (
                  <div
                    key={l1.id}
                    className={`p-4 rounded-2xl border space-y-3 ${
                      l1.isActive === false
                        ? (isDark ? 'bg-slate-950/60 border-slate-800 opacity-60' : 'bg-slate-50 border-slate-200 opacity-70')
                        : (isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs')
                    }`}
                  >
                    {/* Level 1 Header */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          l1.type === 'income' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'
                        }`}>
                          {l1.type}
                        </span>
                        {renamingCatId === l1.id ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={renamingCatValue}
                              onChange={(e) => setRenamingCatValue(e.target.value)}
                              className={`rounded px-2 py-1 text-xs font-bold ${
                                isDark ? 'bg-slate-950 border border-slate-700 text-white' : 'bg-white border border-slate-300'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const r = updateMoneyFlowCategory(l1.id, renamingCatValue);
                                if (!r.success) setCatFeedback({ type: 'error', text: r.error || 'Rename failed' });
                                else {
                                  setCatFeedback({ type: 'success', text: `Renamed to "${renamingCatValue.trim()}"` });
                                  setRenamingCatId(null);
                                }
                              }}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-600 text-white cursor-pointer"
                            >
                              Save
                            </button>
                            <button type="button" onClick={() => setRenamingCatId(null)} className="text-[10px] text-slate-400 cursor-pointer">
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm font-bold">{l1.name}</span>
                        )}
                        {l1.isActive === false && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500">
                            INACTIVE
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setAddingChildParentId(l1.id);
                            setAddingChildLevel(2);
                            setAddingChildName('');
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Subcategory
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingCatId(l1.id);
                            setRenamingCatValue(l1.name);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 cursor-pointer"
                          title="Rename Category"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleMoneyFlowCategoryActive(l1.id)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                            l1.isActive !== false
                              ? 'text-amber-500 hover:bg-amber-500/10'
                              : 'text-emerald-500 hover:bg-emerald-500/10'
                          }`}
                          title={l1.isActive !== false ? 'Deactivate Category' : 'Activate Category'}
                        >
                          <Power className="w-3 h-3" /> {l1.isActive !== false ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>

                    {/* Inline Add Subcategory under this L1 */}
                    {addingChildParentId === l1.id && addingChildLevel === 2 && (
                      <div className="flex items-center gap-2 pl-4">
                        <input
                          type="text"
                          value={addingChildName}
                          onChange={(e) => setAddingChildName(e.target.value)}
                          placeholder={`New Subcategory under "${l1.name}"...`}
                          className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs ${
                            isDark ? 'bg-slate-950 border border-slate-700 text-white' : 'bg-slate-50 border border-slate-300'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const res = addMoneyFlowCategory({
                              name: addingChildName,
                              level: 2,
                              parentId: l1.id,
                              type: l1.type,
                            });
                            if (res.error) setCatFeedback({ type: 'error', text: res.error });
                            else {
                              setCatFeedback({ type: 'success', text: `Added subcategory "${res.category?.name}"` });
                              setAddingChildParentId(null);
                              setAddingChildName('');
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white cursor-pointer"
                        >
                          Save
                        </button>
                        <button type="button" onClick={() => setAddingChildParentId(null)} className="text-xs text-slate-400 cursor-pointer">
                          Cancel
                        </button>
                      </div>
                    )}

                    {/* Level 2 Children */}
                    {l2Children.length > 0 && (
                      <div className="pl-4 sm:pl-6 space-y-2 border-l-2 border-slate-200 dark:border-slate-800">
                        {l2Children.map(l2 => {
                          const l3Children = moneyFlowCategories
                            .filter(c => c.level === 3 && c.parentId === l2.id && (showInactiveCats || c.isActive !== false))
                            .sort((a, b) => a.name.localeCompare(b.name));

                          return (
                            <div
                              key={l2.id}
                              className={`p-3 rounded-xl border space-y-2 ${
                                l2.isActive === false
                                  ? (isDark ? 'bg-slate-950/40 border-slate-800/60 opacity-60' : 'bg-slate-100 border-slate-200 opacity-65')
                                  : (isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200')
                              }`}
                            >
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono text-slate-400">L2</span>
                                  {renamingCatId === l2.id ? (
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="text"
                                        value={renamingCatValue}
                                        onChange={(e) => setRenamingCatValue(e.target.value)}
                                        className={`rounded px-2 py-0.5 text-xs font-semibold ${
                                          isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300'
                                        }`}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const r = updateMoneyFlowCategory(l2.id, renamingCatValue);
                                          if (!r.success) setCatFeedback({ type: 'error', text: r.error || 'Rename failed' });
                                          else {
                                            setCatFeedback({ type: 'success', text: `Renamed to "${renamingCatValue.trim()}"` });
                                            setRenamingCatId(null);
                                          }
                                        }}
                                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white cursor-pointer"
                                      >
                                        Save
                                      </button>
                                      <button type="button" onClick={() => setRenamingCatId(null)} className="text-[10px] text-slate-400 cursor-pointer">
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-xs font-bold">{l2.name}</span>
                                  )}
                                  {l2.isActive === false && (
                                    <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-500">
                                      INACTIVE
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAddingChildParentId(l2.id);
                                      setAddingChildLevel(3);
                                      setAddingChildName('');
                                    }}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-600/10 text-purple-500 hover:bg-purple-600/20 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" /> 2nd Subcategory
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRenamingCatId(l2.id);
                                      setRenamingCatValue(l2.name);
                                    }}
                                    className="p-1 text-slate-400 hover:text-blue-500 cursor-pointer"
                                    title="Rename Subcategory"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleMoneyFlowCategoryActive(l2.id)}
                                    className="text-[10px] font-semibold text-amber-500 hover:underline cursor-pointer"
                                  >
                                    {l2.isActive !== false ? 'Deactivate' : 'Activate'}
                                  </button>
                                </div>
                              </div>

                              {/* Inline Add 2nd Subcategory under L2 */}
                              {addingChildParentId === l2.id && addingChildLevel === 3 && (
                                <div className="flex items-center gap-2 pl-3">
                                  <input
                                    type="text"
                                    value={addingChildName}
                                    onChange={(e) => setAddingChildName(e.target.value)}
                                    placeholder={`New 2nd Subcategory under "${l2.name}"...`}
                                    className={`flex-1 rounded-lg px-2.5 py-1 text-xs ${
                                      isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300'
                                    }`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const res = addMoneyFlowCategory({
                                        name: addingChildName,
                                        level: 3,
                                        parentId: l2.id,
                                        type: l2.type,
                                      });
                                      if (res.error) setCatFeedback({ type: 'error', text: res.error });
                                      else {
                                        setCatFeedback({ type: 'success', text: `Added 2nd subcategory "${res.category?.name}"` });
                                        setAddingChildParentId(null);
                                        setAddingChildName('');
                                      }
                                    }}
                                    className="px-2.5 py-1 rounded text-xs font-bold bg-purple-600 text-white cursor-pointer"
                                  >
                                    Save
                                  </button>
                                  <button type="button" onClick={() => setAddingChildParentId(null)} className="text-xs text-slate-400 cursor-pointer">
                                    Cancel
                                  </button>
                                </div>
                              )}

                              {/* Level 3 Nodes */}
                              {l3Children.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pl-3 pt-1">
                                  {l3Children.map(l3 => (
                                    <div
                                      key={l3.id}
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] ${
                                        l3.isActive === false
                                          ? 'border-slate-300 dark:border-slate-800 opacity-50 line-through'
                                          : isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'
                                      }`}
                                    >
                                      {renamingCatId === l3.id ? (
                                        <>
                                          <input
                                            type="text"
                                            value={renamingCatValue}
                                            onChange={(e) => setRenamingCatValue(e.target.value)}
                                            className="w-24 bg-transparent border-b border-blue-500 text-xs focus:outline-none"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const r = updateMoneyFlowCategory(l3.id, renamingCatValue);
                                              if (!r.success) setCatFeedback({ type: 'error', text: r.error || 'Rename failed' });
                                              else {
                                                setCatFeedback({ type: 'success', text: `Renamed to "${renamingCatValue.trim()}"` });
                                                setRenamingCatId(null);
                                              }
                                            }}
                                            className="text-[10px] font-bold text-emerald-500 cursor-pointer"
                                          >
                                            Save
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <span className="font-semibold">{l3.name}</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setRenamingCatId(l3.id);
                                              setRenamingCatValue(l3.name);
                                            }}
                                            className="text-slate-400 hover:text-blue-500 cursor-pointer"
                                            title="Rename"
                                          >
                                            <Edit2 className="w-2.5 h-2.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => toggleMoneyFlowCategoryActive(l3.id)}
                                            className="text-slate-400 hover:text-amber-500 cursor-pointer"
                                            title={l3.isActive !== false ? 'Deactivate' : 'Activate'}
                                          >
                                            <Power className="w-2.5 h-2.5" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. ADVANCED REPORTS & CATEGORY TREE ANALYTICS */}
      {/* ========================================================================= */}
      {activeSubPage === 'reports' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                <span>Advanced Reports & Category Spending Analytics</span>
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Filter by date presets, 3-level categories, mode, account, sort order & combined WhatsApp reminders
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print Statement
              </button>
              <button
                type="button"
                onClick={() => handleExportTransactionsCsv(reportEntries)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Export Filtered CSV
              </button>
            </div>
          </div>

          {/* Report Filters & Sort Toolbar */}
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            {/* Date Preset Strip */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: 'this_week', label: 'This Week' },
                  { id: 'this_month', label: 'This Month' },
                  { id: 'last_month', label: 'Last Month' },
                  { id: 'custom', label: 'Custom Range' },
                  { id: 'all', label: 'All Time' },
                ] as { id: ReportDatePreset; label: string }[]
              ).map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setReportFilter(prev => ({ ...prev, datePreset: p.id }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    reportFilter.datePreset === p.id
                      ? 'bg-blue-600 text-white'
                      : isDark ? 'bg-slate-950 border border-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              {reportFilter.datePreset === 'custom' && (
                <div className="flex items-center gap-2 ml-2">
                  <input
                    type="date"
                    value={reportFilter.customFrom || ''}
                    onChange={(e) => setReportFilter(prev => ({ ...prev, customFrom: e.target.value }))}
                    className={`rounded-lg px-2 py-1 text-xs font-mono ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-white border border-slate-300'}`}
                  />
                  <span className="text-xs text-slate-400">to</span>
                  <input
                    type="date"
                    value={reportFilter.customTo || ''}
                    onChange={(e) => setReportFilter(prev => ({ ...prev, customTo: e.target.value }))}
                    className={`rounded-lg px-2 py-1 text-xs font-mono ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-white border border-slate-300'}`}
                  />
                </div>
              )}
            </div>

            {/* Multi-Axis Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              <select
                value={reportFilter.type || 'all'}
                onChange={(e) => setReportFilter(prev => ({ ...prev, type: e.target.value as any }))}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
              >
                <option value="all">All Types</option>
                <option value="income">Money In Only</option>
                <option value="expense">Money Out / Expenses</option>
                <option value="transfer">Transfers Only</option>
              </select>

              <select
                value={reportFilter.categoryFilter || 'all'}
                onChange={(e) =>
                  setReportFilter(prev => ({
                    ...prev,
                    categoryFilter: e.target.value,
                    subcategoryFilter: 'all',
                    secondSubcategoryFilter: 'all',
                  }))
                }
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
              >
                <option value="all">All L1 Categories</option>
                {moneyFlowCategories
                  .filter(c => c.level === 1)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
              </select>

              <select
                value={reportFilter.subcategoryFilter || 'all'}
                onChange={(e) =>
                  setReportFilter(prev => ({
                    ...prev,
                    subcategoryFilter: e.target.value,
                    secondSubcategoryFilter: 'all',
                  }))
                }
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
              >
                <option value="all">All L2 Subcategories</option>
                {Array.from(
                  new Set(moneyFlowCategories.filter(c => c.level === 2).map(c => c.name))
                )
                  .sort()
                  .map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
              </select>

              <select
                value={reportFilter.secondSubcategoryFilter || 'all'}
                onChange={(e) => setReportFilter(prev => ({ ...prev, secondSubcategoryFilter: e.target.value }))}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
              >
                <option value="all">All L3 2nd Subcats</option>
                {Array.from(
                  new Set(moneyFlowCategories.filter(c => c.level === 3).map(c => c.name))
                )
                  .sort()
                  .map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
              </select>

              <select
                value={reportFilter.paymentMode || 'all'}
                onChange={(e) => setReportFilter(prev => ({ ...prev, paymentMode: e.target.value }))}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
              >
                <option value="all">All Modes</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank">Bank / Card / Cheque</option>
                <option value="other">Other</option>
              </select>

              <select
                value={reportFilter.accountFilter || 'all'}
                onChange={(e) => setReportFilter(prev => ({ ...prev, accountFilter: e.target.value }))}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
              >
                <option value="all">All Accounts</option>
                <option value="cash">Cash Account</option>
                {bankAccounts.map(b => (
                  <option key={b.id} value={b.id}>{b.bankName}</option>
                ))}
              </select>

              <select
                value={reportFilter.sortBy || 'date_desc'}
                onChange={(e) => setReportFilter(prev => ({ ...prev, sortBy: e.target.value as ReportSortBy }))}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${isDark ? 'bg-slate-950 border border-slate-800 text-blue-400' : 'bg-blue-50 border border-blue-200 text-blue-800'}`}
              >
                <option value="date_desc">Sort: Newest Date</option>
                <option value="date_asc">Sort: Oldest Date</option>
                <option value="amount_desc">Sort: Highest Amount</option>
                <option value="amount_asc">Sort: Lowest Amount</option>
                <option value="category_asc">Sort: Category A-Z</option>
                <option value="subcategory_asc">Sort: Subcategory A-Z</option>
                <option value="second_subcategory_asc">Sort: 2nd Subcategory A-Z</option>
                <option value="mode_asc">Sort: Payment Mode</option>
                <option value="account_asc">Sort: Account Name</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={reportFilter.search || ''}
                  onChange={(e) => setReportFilter(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Search description, category, customer, vendor, reference..."
                  className={`w-full rounded-lg pl-8 pr-3 py-1.5 text-xs ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
                />
              </div>

              {(reportFilter.categoryFilter !== 'all' ||
                reportFilter.subcategoryFilter !== 'all' ||
                reportFilter.secondSubcategoryFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() =>
                    setReportFilter(prev => ({
                      ...prev,
                      categoryFilter: 'all',
                      subcategoryFilter: 'all',
                      secondSubcategoryFilter: 'all',
                    }))
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 cursor-pointer"
                >
                  Clear Category Drill-Down
                </button>
              )}
            </div>
          </div>

          {/* Filtered Report KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-[11px] font-bold uppercase text-slate-400">Filtered Entries</span>
              <p className="text-xl font-bold font-mono mt-1">{reportEntries.length}</p>
            </div>
            <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-[11px] font-bold uppercase text-emerald-500">Filtered Money In</span>
              <p className="text-xl font-bold font-mono text-emerald-500 mt-1">₹{reportTotals.totalIn.toLocaleString('en-IN')}</p>
            </div>
            <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-[11px] font-bold uppercase text-rose-500">Filtered Expenses</span>
              <p className="text-xl font-bold font-mono text-rose-500 mt-1">₹{reportTotals.totalOut.toLocaleString('en-IN')}</p>
            </div>
            <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-[11px] font-bold uppercase text-blue-500">Net Period Flow</span>
              <p className={`text-xl font-bold font-mono mt-1 ${reportTotals.net >= 0 ? 'text-blue-500' : 'text-rose-500'}`}>
                ₹{reportTotals.net.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Interactive 3-Level Category Breakdown Tree */}
          <div className={`p-5 rounded-2xl border space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-purple-500" />
                  <span>3-Level Category Spending & Income Tree (Click any level to filter)</span>
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Category → Subcategory → 2nd Subcategory rollup for the selected date range & account filters
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setReportTreeType('expense')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    reportTreeType === 'expense' ? 'bg-rose-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  Expenses Tree
                </button>
                <button
                  type="button"
                  onClick={() => setReportTreeType('income')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    reportTreeType === 'income' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  Income Tree
                </button>
              </div>
            </div>

            {reportCategoryTree.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No matching {reportTreeType} entries in this period.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {reportCategoryTree.map(l1 => (
                  <div
                    key={l1.name}
                    className={`p-3.5 rounded-xl border space-y-2 ${
                      isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setReportFilter(prev => ({
                          ...prev,
                          type: reportTreeType,
                          categoryFilter: l1.name,
                          subcategoryFilter: 'all',
                          secondSubcategoryFilter: 'all',
                        }))
                      }
                      className="w-full flex items-center justify-between text-left cursor-pointer hover:underline"
                    >
                      <span className="text-xs font-bold text-blue-500">
                        {l1.name} <span className="text-[10px] font-normal text-slate-400">({l1.count})</span>
                      </span>
                      <span className="font-mono text-xs font-bold">₹{l1.amount.toLocaleString('en-IN')}</span>
                    </button>

                    {l1.children.map(l2 => (
                      <div key={l2.name} className="pl-3 border-l border-slate-300 dark:border-slate-700 space-y-1">
                        <button
                          type="button"
                          onClick={() =>
                            setReportFilter(prev => ({
                              ...prev,
                              type: reportTreeType,
                              categoryFilter: l1.name,
                              subcategoryFilter: l2.name,
                              secondSubcategoryFilter: 'all',
                            }))
                          }
                          className="w-full flex items-center justify-between text-left text-[11px] cursor-pointer hover:underline"
                        >
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {l2.name} ({l2.count})
                          </span>
                          <span className="font-mono font-semibold">₹{l2.amount.toLocaleString('en-IN')}</span>
                        </button>

                        {l2.children.map(l3 => (
                          <button
                            key={l3.name}
                            type="button"
                            onClick={() =>
                              setReportFilter(prev => ({
                                ...prev,
                                type: reportTreeType,
                                categoryFilter: l1.name,
                                subcategoryFilter: l2.name,
                                secondSubcategoryFilter: l3.name,
                              }))
                            }
                            className="w-full flex items-center justify-between text-left pl-3 text-[10px] text-slate-500 hover:text-blue-500 cursor-pointer"
                          >
                            <span>↳ {l3.name} ({l3.count})</span>
                            <span className="font-mono">₹{l3.amount.toLocaleString('en-IN')}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Filtered Statement Table */}
          <div className={`rounded-2xl border overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold">Detailed Statement ({reportEntries.length} records)</h3>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase text-[10px] font-bold tracking-wider sticky top-0 ${
                  isDark ? 'bg-slate-950 text-slate-400 border-b border-slate-800' : 'bg-slate-50 text-slate-600 border-b border-slate-200'
                }`}>
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Category › Sub › 2nd</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Account</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                  {reportEntries.map(e => {
                    const resolved = resolveCategoryNames(e, moneyFlowCategories);
                    const accLabel = formatAccountLabel(e.accountType, e.bankAccountId, bankAccounts, e.paymentMode);
                    return (
                      <tr key={e.id} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                        <td className="py-2 px-3 font-mono text-slate-500 whitespace-nowrap">{e.date}</td>
                        <td className="py-2 px-3 uppercase text-[10px] font-bold">{e.type}</td>
                        <td className="py-2 px-3 font-semibold">{resolved.breadcrumb}</td>
                        <td className="py-2 px-3">{e.description}</td>
                        <td className="py-2 px-3 text-slate-500">{accLabel}</td>
                        <td className="py-2 px-3 uppercase font-mono text-[10px]">{e.paymentMode}</td>
                        <td className={`py-2 px-3 font-mono font-bold text-right ${
                          e.type === 'income' ? 'text-emerald-500' : e.type === 'expense' ? 'text-rose-500' : 'text-purple-500'
                        }`}>
                          ₹{e.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                  {reportEntries.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">No entries match the current report filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Report 1: Customer Receivables Grouped & Individual Pending */}
          <div className={`p-5 rounded-2xl border space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Customer Payment Pending Summary ({customerPendingGroups.length} customers)
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Combined outstanding across multiple bills per customer with editable WhatsApp reminder & multi-bill collection
                </p>
              </div>
              <span className="font-mono font-bold text-sm text-amber-500">
                Total Pending: ₹{customerPaymentPending.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase text-[10px] font-bold tracking-wider ${
                  isDark ? 'bg-slate-950/60 text-slate-400 border-b border-slate-800' : 'bg-slate-50 text-slate-600 border-b border-slate-200'
                }`}>
                  <tr>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Pending Invoices</th>
                    <th className="py-2.5 px-3 text-right text-rose-500">Total Pending</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                  {customerPendingGroups.map(g => (
                    <tr key={g.key} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/70'}>
                      <td className="py-2.5 px-3 font-semibold">{g.customerName}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{g.customerPhone || '—'}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {g.pendingInvoices.map(inv => (
                            <span
                              key={inv.id}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-500"
                            >
                              {inv.invoiceNumber} (₹{amountDue(inv).toLocaleString('en-IN')})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-right text-rose-600">
                        ₹{g.totalPending.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setWhatsAppPendingTarget({
                                customerName: g.customerName,
                                customerPhone: g.customerPhone,
                                pendingInvoices: g.pendingInvoices,
                                totalOutstanding: g.totalPending,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200 cursor-pointer"
                          >
                            <MessageSquare className="w-3 h-3" /> WhatsApp Pending
                          </button>
                          {g.customerObj && (
                            <button
                              type="button"
                              onClick={() => setCollectCustomerTarget(g.customerObj!)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                            >
                              Collect
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {customerPendingGroups.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">All customer invoices are settled!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Report 2: Vendor Payables Aging */}
          <div className={`p-5 rounded-2xl border space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> Vendor Outstanding Payables
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Unsettled vendor purchases & spare parts bills
                </p>
              </div>
              <span className="font-mono font-bold text-sm text-rose-500">
                Total Payable: ₹{vendorPaymentPending.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase text-[10px] font-bold tracking-wider ${
                  isDark ? 'bg-slate-950/60 text-slate-400 border-b border-slate-800' : 'bg-slate-50 text-slate-600 border-b border-slate-200'
                }`}>
                  <tr>
                    <th className="py-2.5 px-3">Vendor</th>
                    <th className="py-2.5 px-3">Bill Date</th>
                    <th className="py-2.5 px-3">Bill #</th>
                    <th className="py-2.5 px-3 text-right">Bill Total</th>
                    <th className="py-2.5 px-3 text-right">Paid So Far</th>
                    <th className="py-2.5 px-3 text-right text-rose-500">Balance Pending</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                  {vendorBills
                    .filter(b => (b.totalAmount - (b.paidAmount || 0)) > 0)
                    .map(b => {
                      const balDue = Math.max(0, b.totalAmount - (b.paidAmount || 0));
                      return (
                        <tr key={b.id} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/70'}>
                          <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                            {b.vendorName}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">{b.invoiceDate}</td>
                          <td className="py-2.5 px-3 font-mono text-blue-500">{b.invoiceNumber}</td>
                          <td className="py-2.5 px-3 font-mono text-right">₹{b.totalAmount.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3 font-mono text-right text-emerald-600">₹{(b.paidAmount || 0).toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-right text-rose-600">₹{balDue.toLocaleString('en-IN')}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9-14. ADVANCED FINANCIAL MANAGEMENT TABS */}
      {/* ========================================================================= */}
      {activeSubPage === 'loans' && <LoansManagerTab onShowToast={showToast} />}
      {activeSubPage === 'emi_calendar' && <EmiCalendarTab onShowToast={showToast} />}
      {activeSubPage === 'recurring' && <RecurringExpensesTab onShowToast={showToast} />}
      {activeSubPage === 'savings' && (
        <SavingsInvestmentsTab initialSection="savings" onShowToast={showToast} />
      )}
      {activeSubPage === 'investments' && (
        <SavingsInvestmentsTab initialSection="investments" onShowToast={showToast} />
      )}
      {activeSubPage === 'monthly_report' && <MonthlyFinancialReportTab />}

      {/* ========================================================================= */}
      {/* MODAL 1: RECORD MONEY IN (3-Level Category & Account Selector) */}
      {/* ========================================================================= */}
      {isMoneyInModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className={`border rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl p-6 space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold flex items-center gap-2 text-emerald-600">
                <ArrowDownLeft className="w-5 h-5" /> Record Money In (Income)
              </h3>
              <button
                type="button"
                onClick={() => setIsMoneyInModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMoneyIn} className="space-y-4">
              <MoneyFlowCategoryPicker
                flowType="income"
                categoryId={inCatId}
                subcategoryId={inSubId}
                secondSubcategoryId={inThirdId}
                onChange={(sel) => {
                  setInCatId(sel.categoryId);
                  setInCategory(sel.categoryName);
                  setInSubId(sel.subcategoryId);
                  setInSubName(sel.subcategoryName);
                  setInThirdId(sel.secondSubcategoryId);
                  setInThirdName(sel.secondSubcategoryName);
                }}
                isDark={isDark}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Receipt Date *</label>
                  <input
                    type="date"
                    required
                    value={inDate}
                    onChange={(e) => setInDate(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    placeholder="e.g. 5000"
                    value={inAmount}
                    onChange={(e) => setInAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className={`w-full rounded-xl px-3 py-2 text-sm font-mono font-bold text-emerald-600 ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <PaymentAccountSelector
                paymentModeChoice={inModeChoice}
                onChangePaymentModeChoice={setInModeChoice}
                accountType={inAccountType}
                onChangeAccountType={setInAccountType}
                bankAccountId={inBankId}
                onChangeBankAccountId={setInBankId}
                transactionRef={inRefNumber}
                onChangeTransactionRef={setInRefNumber}
                bankAccounts={bankAccounts}
                isDark={isDark}
              />

              {/* Customer & Optional Pending Invoice selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Customer (Optional)</label>
                  <select
                    value={inCustomerId}
                    onChange={(e) => {
                      setInCustomerId(e.target.value);
                      setInInvoiceId('');
                    }}
                    className={`w-full rounded-xl px-3 py-2 text-xs ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  >
                    <option value="">-- General / Walk-in --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Link Pending Invoice (Optional)</label>
                  <select
                    value={inInvoiceId}
                    onChange={(e) => setInInvoiceId(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  >
                    <option value="">-- Direct Income (No Invoice Link) --</option>
                    {invoices
                      .filter(
                        inv =>
                          inv.type === 'invoice' &&
                          inv.status !== 'cancelled' &&
                          amountDue(inv) > 0 &&
                          (!inCustomerId || inv.customerId === inCustomerId)
                      )
                      .map(inv => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceNumber} — {inv.customerName} (Due ₹{amountDue(inv).toLocaleString('en-IN')})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Description / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. CCTV advance payment for Simmakkal site"
                  value={inDesc}
                  onChange={(e) => setInDesc(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs ${
                    isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

              {inFormError && (
                <div className="p-2.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-500 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{inFormError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsMoneyInModalOpen(false)}
                  className="px-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm cursor-pointer"
                >
                  Save Money In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RECORD MONEY OUT / EXPENSE (3-Level Category & Account Selector) */}
      {/* ========================================================================= */}
      {(isMoneyOutModalOpen || isExpenseModalOpen) && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className={`border rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl p-6 space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold flex items-center gap-2 text-rose-600">
                <ArrowUpRight className="w-5 h-5" /> Record Money Out / Expense
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsMoneyOutModalOpen(false);
                  setIsExpenseModalOpen(false);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMoneyOut} className="space-y-4">
              <MoneyFlowCategoryPicker
                flowType="expense"
                categoryId={outCatId}
                subcategoryId={outSubId}
                secondSubcategoryId={outThirdId}
                onChange={(sel) => {
                  setOutCatId(sel.categoryId);
                  setOutCategory(sel.categoryName);
                  setOutSubId(sel.subcategoryId);
                  setOutSubName(sel.subcategoryName);
                  setOutThirdId(sel.secondSubcategoryId);
                  setOutThirdName(sel.secondSubcategoryName);
                }}
                isDark={isDark}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={outDate}
                    onChange={(e) => setOutDate(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    placeholder="e.g. 500"
                    value={outAmount}
                    onChange={(e) => setOutAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className={`w-full rounded-xl px-3 py-2 text-sm font-mono font-bold text-rose-600 ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <PaymentAccountSelector
                paymentModeChoice={outModeChoice}
                onChangePaymentModeChoice={setOutModeChoice}
                accountType={outAccountType}
                onChangeAccountType={setOutAccountType}
                bankAccountId={outBankId}
                onChangeBankAccountId={setOutBankId}
                transactionRef={outRefNumber}
                onChangeTransactionRef={setOutRefNumber}
                bankAccounts={bankAccounts}
                isDark={isDark}
              />

              {/* Payee / Vendor / Pending Bill */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Payee / Vendor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Simmakkal Electronics / Office Lunch"
                    value={outPayeeName}
                    onChange={(e) => setOutPayeeName(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Link Pending Vendor Bill (Optional)</label>
                  <select
                    value={outBillId}
                    onChange={(e) => setOutBillId(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  >
                    <option value="">-- Direct Expense (No Bill Link) --</option>
                    {vendorBills
                      .filter(b => (b.totalAmount - (b.paidAmount || 0)) > 0)
                      .map(b => (
                        <option key={b.id} value={b.id}>
                          {b.invoiceNumber} — {b.vendorName} (Due ₹{(b.totalAmount - (b.paidAmount || 0)).toLocaleString('en-IN')})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Receipt Image Attachment */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  Receipt / Voucher Slip Photo (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />
                  {outAttachment && (
                    <div className="w-10 h-10 rounded border overflow-hidden shrink-0">
                      <img src={outAttachment} alt="Receipt" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Description / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Office lunch / Petrol / Spares purchase"
                  value={outDesc}
                  onChange={(e) => setOutDesc(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs ${
                    isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

              {outFormError && (
                <div className="p-2.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-500 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{outFormError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsMoneyOutModalOpen(false);
                    setIsExpenseModalOpen(false);
                  }}
                  className="px-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm cursor-pointer"
                >
                  Save Money Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: INTERNAL TRANSFER */}
      {/* ========================================================================= */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold flex items-center gap-2 text-purple-600">
                <ArrowLeftRight className="w-5 h-5" /> Transfer Funds Between Accounts
              </h3>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransfer} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Transfer Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'cash_to_bank', label: 'Cash to Bank (Deposit)' },
                    { id: 'bank_to_cash', label: 'Bank to Cash (ATM)' },
                    { id: 'bank_to_bank', label: 'Bank to Bank (Inter-Bank)' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTrType(t.id as any)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                        trType === t.id
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                          : isDark ? 'border-slate-800 text-slate-400 hover:border-slate-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Source & Destination Account Selectors */}
              <div className="grid grid-cols-2 gap-3">
                {trType === 'bank_to_cash' || trType === 'bank_to_bank' ? (
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">From Bank Account</label>
                    <select
                      value={trFromBankId}
                      onChange={(e) => setTrFromBankId(e.target.value)}
                      className={`w-full rounded-xl px-3 py-2 text-xs font-bold ${
                        isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                      }`}
                    >
                      {bankAccounts.map(b => (
                        <option key={b.id} value={b.id}>{b.bankName} (•••• {b.accountNumber.slice(-4)})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">From Account</label>
                    <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-amber-600">
                      Cash in Hand (Balance: ₹{cashBalanceDetails.currentCashBalance.toLocaleString('en-IN')})
                    </div>
                  </div>
                )}

                {trType === 'cash_to_bank' || trType === 'bank_to_bank' ? (
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">To Bank Account</label>
                    <select
                      value={trToBankId}
                      onChange={(e) => setTrToBankId(e.target.value)}
                      className={`w-full rounded-xl px-3 py-2 text-xs font-bold ${
                        isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                      }`}
                    >
                      {bankAccounts.map(b => (
                        <option key={b.id} value={b.id}>{b.bankName} (•••• {b.accountNumber.slice(-4)})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">To Account</label>
                    <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-amber-600">
                      Cash in Hand
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Transfer Date</label>
                  <input
                    type="date"
                    required
                    value={trDate}
                    onChange={(e) => setTrDate(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    placeholder="e.g. 10000"
                    value={trAmount}
                    onChange={(e) => setTrAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className={`w-full rounded-xl px-3 py-2 text-sm font-mono font-bold text-purple-600 ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Reference / Cheque #</label>
                <input
                  type="text"
                  placeholder="e.g. ATM Slip #291 or Cheque 00412"
                  value={trRefNumber}
                  onChange={(e) => setTrRefNumber(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${
                    isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Transfer Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly salary cash withdrawal from current account"
                  value={trNotes}
                  onChange={(e) => setTrNotes(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs ${
                    isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm cursor-pointer"
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ADD / EDIT BANK ACCOUNT */}
      {/* ========================================================================= */}
      {isAddBankModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold flex items-center gap-2 text-blue-600">
                <Landmark className="w-5 h-5" /> {editingBankAccount ? 'Edit Bank Account' : 'Add New Bank Account'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddBankModalOpen(false);
                  setEditingBankAccount(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBankAccount} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Bank Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Axis Bank, State Bank of India, HDFC"
                  value={bankNameInput}
                  onChange={(e) => setBankNameInput(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-semibold ${
                    isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Account Number</label>
                  <input
                    type="text"
                    required
                    placeholder="921020034567..."
                    value={accountNumberInput}
                    onChange={(e) => setAccountNumberInput(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Account Type</label>
                  <select
                    value={accountTypeInput}
                    onChange={(e) => setAccountTypeInput(e.target.value as any)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-semibold uppercase ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  >
                    <option value="current">Current</option>
                    <option value="savings">Savings</option>
                    <option value="overdraft">Overdraft (OD)</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Account Holder Name</label>
                <input
                  type="text"
                  required
                  value={holderInput}
                  onChange={(e) => setHolderInput(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs ${
                    isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Branch Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Simmakkal, Madurai"
                    value={branchInput}
                    onChange={(e) => setBranchInput(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">IFSC Code</label>
                  <input
                    type="text"
                    placeholder="e.g. UTIB0000123"
                    value={ifscInput}
                    onChange={(e) => setIfscInput(e.target.value.toUpperCase())}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono uppercase ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Opening Balance (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={openingBalanceInput}
                  onChange={(e) => setOpeningBalanceInput(e.target.value === '' ? '' : Number(e.target.value))}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-mono font-bold ${
                    isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddBankModalOpen(false);
                    setEditingBankAccount(null);
                  }}
                  className="px-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm cursor-pointer"
                >
                  {editingBankAccount ? 'Save Bank Changes' : 'Save Bank Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: BANK SPECIFIC LEDGER VIEWER */}
      {/* ========================================================================= */}
      {viewingBankLedger && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className={`border rounded-2xl w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`p-5 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-blue-500" />
                  <span>{viewingBankLedger.bankName} Statement & Ledger</span>
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {viewingBankLedger.accountHolder} · A/C: •••• {viewingBankLedger.accountNumber.slice(-4)} · IFSC: {viewingBankLedger.ifscCode || '—'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-3 py-1 rounded-lg">
                  Balance: ₹{(bankBalances.get(viewingBankLedger.id)?.balance || 0).toLocaleString('en-IN')}
                </span>
                <button
                  type="button"
                  onClick={() => setViewingBankLedger(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase text-[10px] font-bold tracking-wider ${
                  isDark ? 'bg-slate-950/60 text-slate-400 border-b border-slate-800' : 'bg-slate-50 text-slate-600 border-b border-slate-200'
                }`}>
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Ref / UTR</th>
                    <th className="py-2.5 px-3 text-right text-emerald-600">Credit (+)</th>
                    <th className="py-2.5 px-3 text-right text-rose-600">Debit (-)</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                  {cashFlow
                    .filter(e => {
                      if (e.isTransfer || e.type === 'transfer') {
                        return e.bankAccountId === viewingBankLedger.id || e.toBankAccountId === viewingBankLedger.id;
                      }
                      const isBank = e.accountType === 'bank' || (!e.accountType && e.paymentMode !== 'cash');
                      const bankId = e.bankAccountId || (isBank ? bankAccounts[0]?.id : undefined);
                      return isBank && bankId === viewingBankLedger.id;
                    })
                    .map(entry => {
                      const isCredit = (entry.type === 'income') || (entry.type === 'transfer' && entry.toBankAccountId === viewingBankLedger.id);
                      const isDebit = (entry.type === 'expense') || (entry.type === 'transfer' && entry.bankAccountId === viewingBankLedger.id);

                      return (
                        <tr key={entry.id} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/70'}>
                          <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">{entry.date}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              entry.isTransfer ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                              isCredit ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                              'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}>
                              {entry.isTransfer ? 'Transfer' : isCredit ? 'Deposit' : 'Withdrawal'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{entry.description}</p>
                            <span className="text-[10px] text-slate-400">{entry.category}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">{entry.referenceNumber || '—'}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-right text-emerald-600">
                            {isCredit ? `+₹${entry.amount.toLocaleString('en-IN')}` : '—'}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-right text-rose-600">
                            {isDebit ? `-₹${entry.amount.toLocaleString('en-IN')}` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div className={`p-4 border-t flex items-center justify-end ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setViewingBankLedger(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: EDIT OPENING CASH FLOAT */}
      {/* ========================================================================= */}
      {isOpeningCashModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className={`border rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold flex items-center gap-2 text-amber-500">
                <Coins className="w-5 h-5" /> Opening Cash Balance
              </h3>
              <button
                type="button"
                onClick={() => setIsOpeningCashModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOpeningCash} className="space-y-4">
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Set the starting physical cash float available in workshop counter drawer.
              </p>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Opening Cash (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={newOpeningCashInput}
                  onChange={(e) => setNewOpeningCashInput(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-base font-mono font-bold ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpeningCashModalOpen(false)}
                  className="px-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm cursor-pointer"
                >
                  Update Cash Float
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: ZOOM ATTACHMENT MODAL */}
      {/* ========================================================================= */}
      {zoomedImage && (
        <div 
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img 
              src={zoomedImage} 
              alt="Receipt Preview" 
              className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl" 
            />
            <button
              type="button"
              onClick={() => setZoomedImage(null)}
              className="absolute -top-3 -right-3 p-2 bg-white text-slate-900 rounded-full shadow-lg hover:scale-105 transition-transform"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp Payment Pending Modal (Reports Customer Pending Summary) */}
      <WhatsAppPendingModal
        isOpen={Boolean(whatsAppPendingTarget)}
        onClose={() => setWhatsAppPendingTarget(null)}
        customerName={whatsAppPendingTarget?.customerName || ''}
        customerPhone={whatsAppPendingTarget?.customerPhone || ''}
        pendingInvoices={whatsAppPendingTarget?.pendingInvoices || []}
        totalOutstanding={whatsAppPendingTarget?.totalOutstanding}
      />

      {/* Collect Multi-Invoice Customer Payment Modal */}
      <CollectPaymentModal
        isOpen={Boolean(collectCustomerTarget)}
        onClose={() => setCollectCustomerTarget(null)}
        mode="customer_multi"
        customer={collectCustomerTarget}
        onPaymentSaved={(msg) => showToast(msg)}
      />
    </div>
  );
};
