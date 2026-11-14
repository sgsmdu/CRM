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
  ShieldCheck
} from 'lucide-react';
import { useSgs } from '../context/SgsContext';
import { BankAccount, CashFlowEntry, PaymentMode, Invoice, VendorBill, Customer, Vendor } from '../types';
import { todayLocal, round2 } from '../utils/accounting';

export type MoneyFlowSubPage = 
  | 'dashboard' 
  | 'cash' 
  | 'banks' 
  | 'in' 
  | 'out' 
  | 'expenses' 
  | 'transfers' 
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
    invoices,
    vendorBills,
    customers,
    vendors,
    adminSettings,
    updateAdminSettings,
    canDelete,
    theme
  } = useSgs();

  const isDark = theme === 'dark';
  const [activeSubPage, setActiveSubPage] = useState<MoneyFlowSubPage>(initialSubPage);

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

  // Opening Cash Balance
  const openingCashBalance = adminSettings.openingCashBalance ?? 10000;
  const [newOpeningCashInput, setNewOpeningCashInput] = useState<string>(String(openingCashBalance));

  // --- FORM STATES ---
  // Money In Form
  const [inDate, setInDate] = useState(() => todayLocal());
  const [inCategory, setInCategory] = useState('Customer Payment');
  const [inAmount, setInAmount] = useState<number | ''>('');
  const [inAccountType, setInAccountType] = useState<'cash' | 'bank'>('cash');
  const [inBankId, setInBankId] = useState<string>(() => bankAccounts[0]?.id || '');
  const [inPaymentMode, setInPaymentMode] = useState<PaymentMode>('cash');
  const [inRefNumber, setInRefNumber] = useState('');
  const [inCustomerId, setInCustomerId] = useState('');
  const [inInvoiceId, setInInvoiceId] = useState('');
  const [inDesc, setInDesc] = useState('');
  const [inNotes, setInNotes] = useState('');

  // Money Out Form
  const [outDate, setOutDate] = useState(() => todayLocal());
  const [outCategory, setOutCategory] = useState('Vendor Payment');
  const [outAmount, setOutAmount] = useState<number | ''>('');
  const [outAccountType, setOutAccountType] = useState<'cash' | 'bank'>('cash');
  const [outBankId, setOutBankId] = useState<string>(() => bankAccounts[0]?.id || '');
  const [outPaymentMode, setOutPaymentMode] = useState<PaymentMode>('cash');
  const [outRefNumber, setOutRefNumber] = useState('');
  const [outVendorId, setOutVendorId] = useState('');
  const [outBillId, setOutBillId] = useState('');
  const [outPayeeName, setOutPayeeName] = useState('');
  const [outDesc, setOutDesc] = useState('');
  const [outNotes, setOutNotes] = useState('');
  const [outAttachment, setOutAttachment] = useState<string>('');

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
      const amt = Number(e.amount) || 0;
      if (amt <= 0) return;

      const isCashSource = e.accountType === 'cash' || (!e.accountType && e.paymentMode === 'cash');
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

  // Today & This Month In/Out (excluding transfers)
  const todayStr = todayLocal();
  const currentMonthStr = todayStr.substring(0, 7);

  const { todayMoneyIn, todayMoneyOut, thisMonthIncome, thisMonthExpenses } = useMemo(() => {
    let todayIn = 0;
    let todayOut = 0;
    let monthIn = 0;
    let monthOut = 0;

    cashFlow.forEach(e => {
      if (e.isTransfer || e.type === 'transfer') return; // Exclude internal transfers
      const amt = Number(e.amount) || 0;
      if (amt <= 0) return;

      if (e.type === 'income') {
        if (e.date === todayStr) todayIn += amt;
        if (e.date.startsWith(currentMonthStr)) monthIn += amt;
      } else if (e.type === 'expense') {
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

  // Customer Payment Pending (Outstanding Receivables from Invoices)
  const customerPaymentPending = useMemo(() => {
    let total = 0;
    invoices.forEach(inv => {
      if (inv.status !== 'cancelled') {
        const bal = Math.max(0, (inv.grandTotal || 0) - (inv.paidAmount || 0));
        total += bal;
      }
    });
    return round2(total);
  }, [invoices]);

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
      if (e.isTransfer || e.type === 'transfer') return;
      const match = days.find(d => d.date === e.date);
      if (match) {
        if (e.type === 'income') match.inAmt += Number(e.amount) || 0;
        else if (e.type === 'expense') match.outAmt += Number(e.amount) || 0;
      }
    });

    return days;
  }, [cashFlow]);

  // Expense Category-wise breakdown
  const expenseCategoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    let grandTotalExpense = 0;

    cashFlow.forEach(e => {
      if (e.type === 'expense' && !e.isTransfer) {
        const amt = Number(e.amount) || 0;
        if (amt > 0) {
          const cat = e.category || 'Other Expenses';
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
  }, [cashFlow]);

  // Filtered transactions list
  const filteredTransactions = useMemo(() => {
    return cashFlow
      .filter(e => {
        if (!isDateInRange(e.date)) return false;
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchDesc = (e.description || '').toLowerCase().includes(q);
          const matchCat = (e.category || '').toLowerCase().includes(q);
          const matchRef = (e.referenceNumber || '').toLowerCase().includes(q);
          const matchNotes = (e.notes || '').toLowerCase().includes(q);
          const matchPayee = (e.payeeOrCustomer || '').toLowerCase().includes(q);
          if (!matchDesc && !matchCat && !matchRef && !matchNotes && !matchPayee) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id));
  }, [cashFlow, dateFilter, customStartDate, customEndDate, searchTerm]);

  // --- FORM SUBMIT HANDLERS ---

  // 1. Submit Money In
  const handleSaveMoneyIn = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = Number(inAmount);
    if (!numAmt || numAmt <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    let customerName = '';
    if (inCustomerId) {
      const c = customers.find(cust => cust.id === inCustomerId);
      if (c) customerName = c.name;
    }

    const targetBank = bankAccounts.find(b => b.id === inBankId);
    let autoDesc = inDesc.trim();
    if (!autoDesc) {
      autoDesc = customerName 
        ? `Payment from ${customerName}` 
        : `${inCategory} received into ${inAccountType === 'cash' ? 'Cash' : (targetBank?.bankName || 'Bank')}`;
    }

    addCashFlowEntry({
      date: inDate,
      type: 'income',
      category: inCategory,
      description: autoDesc,
      amount: numAmt,
      paymentMode: inPaymentMode,
      accountType: inAccountType,
      bankAccountId: inAccountType === 'bank' ? inBankId : undefined,
      referenceNumber: inRefNumber.trim() || undefined,
      customerId: inCustomerId || undefined,
      invoiceId: inInvoiceId || undefined,
      payeeOrCustomer: customerName || undefined,
      notes: inNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    });

    setIsMoneyInModalOpen(false);
    setInAmount('');
    setInRefNumber('');
    setInDesc('');
    setInNotes('');
    setInCustomerId('');
    setInInvoiceId('');
    showToast(`Recorded ₹${numAmt.toLocaleString('en-IN')} Money In successfully!`);
  };

  // 2. Submit Money Out / Expense
  const handleSaveMoneyOut = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = Number(outAmount);
    if (!numAmt || numAmt <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    let vendorName = outPayeeName.trim();
    if (outVendorId) {
      const v = vendors.find(ven => ven.id === outVendorId);
      if (v) vendorName = v.name;
    }

    const sourceBank = bankAccounts.find(b => b.id === outBankId);
    let autoDesc = outDesc.trim();
    if (!autoDesc) {
      autoDesc = vendorName 
        ? `Payment to ${vendorName} for ${outCategory}` 
        : `${outCategory} paid from ${outAccountType === 'cash' ? 'Cash' : (sourceBank?.bankName || 'Bank')}`;
    }

    addCashFlowEntry({
      date: outDate,
      type: 'expense',
      category: outCategory,
      description: autoDesc,
      amount: numAmt,
      paymentMode: outPaymentMode,
      accountType: outAccountType,
      bankAccountId: outAccountType === 'bank' ? outBankId : undefined,
      referenceNumber: outRefNumber.trim() || undefined,
      vendorId: outVendorId || undefined,
      vendorBillId: outBillId || undefined,
      payeeOrCustomer: vendorName || undefined,
      notes: outNotes.trim() || undefined,
      attachmentUrl: outAttachment || undefined,
      createdAt: new Date().toISOString(),
    });

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

  // CSV Export for Statements
  const handleExportTransactionsCsv = () => {
    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount (INR)', 'Account', 'Payment Mode', 'Reference No', 'Notes'];
    const rows = filteredTransactions.map(t => {
      const acc = t.accountType === 'cash' ? 'Cash' : (bankAccounts.find(b => b.id === t.bankAccountId)?.bankName || 'Bank');
      return [
        `"${t.date}"`,
        `"${t.type}"`,
        `"${t.category || ''}"`,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        t.amount,
        `"${acc}"`,
        `"${t.paymentMode || ''}"`,
        `"${t.referenceNumber || ''}"`,
        `"${(t.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SGS_Money_Flow_${todayLocal()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          { id: 'dashboard', label: 'Dashboard', icon: Wallet },
          { id: 'cash', label: 'Cash Account', icon: Coins },
          { id: 'banks', label: 'Bank Accounts', icon: Landmark, count: bankAccounts.length },
          { id: 'in', label: 'Money In', icon: ArrowDownLeft },
          { id: 'out', label: 'Money Out', icon: ArrowUpRight },
          { id: 'expenses', label: 'Expenses', icon: Receipt },
          { id: 'transfers', label: 'Transfers', icon: ArrowLeftRight },
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
                  onClick={handleExportTransactionsCsv}
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
                          {isTransfer ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                              <ArrowLeftRight className="w-3 h-3" /> Transfer
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
                            {entry.category} {entry.payeeOrCustomer ? `· ${entry.payeeOrCustomer}` : ''}
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
                  setInAccountType('cash');
                  setInPaymentMode('cash');
                  setIsMoneyInModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Record Cash In
              </button>
              <button
                type="button"
                onClick={() => {
                  setOutAccountType('cash');
                  setOutPaymentMode('cash');
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
                              {entry.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="text-[11px] font-medium">
                              {entry.accountType === 'cash' ? 'Cash' : (bank?.bankName || 'Bank')}
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
              onClick={() => setIsMoneyOutModalOpen(true)}
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
                  .filter(e => e.type === 'expense' && !e.isTransfer)
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
                placeholder="Search by vendor, bill #, category..."
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
                    <th className="py-3 px-4">Category</th>
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
                      const bank = bankAccounts.find(b => b.id === entry.bankAccountId);

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
                              {entry.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="text-[11px] font-medium">
                              {entry.accountType === 'cash' ? 'Cash' : (bank?.bankName || 'Bank')}
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
                Workshop running costs, rent, travel, spares, EB bills & attachments (Transfers excluded)
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setOutCategory('Office Expenses');
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
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Payee / Description</th>
                    <th className="py-3 px-4">Paid From</th>
                    <th className="py-3 px-4">Receipt Bill</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                  {filteredTransactions
                    .filter(t => t.type === 'expense' && !t.isTransfer)
                    .map(entry => {
                      const bank = bankAccounts.find(b => b.id === entry.bankAccountId);

                      return (
                        <tr key={entry.id} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/70'}>
                          <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{entry.date}</td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                              {entry.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold">
                            <p className="text-slate-800 dark:text-slate-200">{entry.description}</p>
                            {entry.notes && <p className="text-[10px] text-slate-400 font-normal">{entry.notes}</p>}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {entry.accountType === 'cash' ? 'Cash Account' : (bank?.bankName || 'Bank')}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">{entry.paymentMode}</span>
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
      {/* 8. REPORTS & STATEMENTS */}
      {/* ========================================================================= */}
      {activeSubPage === 'reports' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                <span>Financial Statements & Audit Reports</span>
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Daily cash/bank summary, customer receivables aging, vendor payables & cash flow statement
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
                onClick={handleExportTransactionsCsv}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Export Excel/CSV
              </button>
            </div>
          </div>

          {/* Report 1: Customer Receivables Aging */}
          <div className={`p-5 rounded-2xl border space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Customer Receivables & Payment Pending
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Outstanding client balances with instant WhatsApp reminder dispatch
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
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3 text-right">Bill Total</th>
                    <th className="py-2.5 px-3 text-right">Paid</th>
                    <th className="py-2.5 px-3 text-right text-rose-500">Balance Due</th>
                    <th className="py-2.5 px-3 text-center">WhatsApp</th>
                  </tr>
                </thead>
                <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                  {invoices
                    .filter(inv => inv.status !== 'cancelled' && (inv.grandTotal - (inv.paidAmount || 0)) > 0)
                    .map(inv => {
                      const balDue = Math.max(0, inv.grandTotal - (inv.paidAmount || 0));
                      return (
                        <tr key={inv.id} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/70'}>
                          <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                            {inv.customerName}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">{inv.customerPhone}</td>
                          <td className="py-2.5 px-3 font-mono text-blue-500">{inv.invoiceNumber}</td>
                          <td className="py-2.5 px-3 font-mono text-right">₹{inv.grandTotal.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3 font-mono text-right text-emerald-600">₹{(inv.paidAmount || 0).toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-right text-rose-600">₹{balDue.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleSendPaymentReminder(inv.customerPhone, inv.customerName, inv.invoiceNumber, balDue)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200 cursor-pointer"
                              title="Send WhatsApp Payment Pending Reminder"
                            >
                              <MessageSquare className="w-3 h-3" /> Remind
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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
      {/* MODAL 1: RECORD MONEY IN */}
      {/* ========================================================================= */}
      {isMoneyInModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 ${
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Receipt Date</label>
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
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Category</label>
                  <select
                    value={inCategory}
                    onChange={(e) => setInCategory(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  >
                    <option value="Customer Payment">Customer Payment</option>
                    <option value="Advance Payment">Advance Payment</option>
                    <option value="Service Income">Service Income</option>
                    <option value="Product Sales">Product Sales</option>
                    <option value="Other Income">Other Income</option>
                    <option value="Capital Investment">Capital Investment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  placeholder="e.g. 5000"
                  value={inAmount}
                  onChange={(e) => setInAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className={`w-full rounded-xl px-3 py-2.5 text-base font-mono font-bold text-emerald-600 ${
                    isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

              {/* Deposit Into: Cash vs Bank */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Deposit Into</label>
                  <select
                    value={inAccountType}
                    onChange={(e) => setInAccountType(e.target.value as any)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-bold ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  >
                    <option value="cash">Cash in Hand</option>
                    <option value="bank">Bank Account</option>
                  </select>
                </div>

                {inAccountType === 'bank' ? (
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Select Bank</label>
                    <select
                      value={inBankId}
                      onChange={(e) => setInBankId(e.target.value)}
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
                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Payment Mode</label>
                    <select
                      value={inPaymentMode}
                      onChange={(e) => setInPaymentMode(e.target.value as PaymentMode)}
                      className={`w-full rounded-xl px-3 py-2 text-xs ${
                        isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                      }`}
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI / QR Code</option>
                      <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                      <option value="card">Card (POS)</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Customer selection (optional) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Customer (Optional)</label>
                  <select
                    value={inCustomerId}
                    onChange={(e) => setInCustomerId(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  >
                    <option value="">-- Select or Walk-in --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Ref / UTR / Cheque #</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI Ref 38291..."
                    value={inRefNumber}
                    onChange={(e) => setInRefNumber(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
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
      {/* MODAL 2: RECORD MONEY OUT / EXPENSE */}
      {/* ========================================================================= */}
      {(isMoneyOutModalOpen || isExpenseModalOpen) && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold flex items-center gap-2 text-rose-600">
                <ArrowUpRight className="w-5 h-5" /> Record Money Out (Expense / Bill Payment)
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Expense Date</label>
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
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Category</label>
                  <select
                    value={outCategory}
                    onChange={(e) => setOutCategory(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  >
                    <option value="Vendor Payment">Vendor Payment</option>
                    <option value="Stock Purchase">Stock Purchase</option>
                    <option value="Office Expenses">Office Expenses</option>
                    <option value="Salary & Staff Wages">Salary & Staff Wages</option>
                    <option value="Shop / Office Rent">Shop / Office Rent</option>
                    <option value="EB / Electricity Bill">EB / Electricity Bill</option>
                    <option value="Travel & Conveyance">Travel & Conveyance</option>
                    <option value="Tools & Consumables">Tools & Workshop Consumables</option>
                    <option value="Tea & Refreshments">Tea & Refreshments</option>
                    <option value="Internet & Phone Bill">Internet & Phone Bill</option>
                    <option value="Other Expense">Other Expense</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  placeholder="e.g. 3500"
                  value={outAmount}
                  onChange={(e) => setOutAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className={`w-full rounded-xl px-3 py-2.5 text-base font-mono font-bold text-rose-600 ${
                    isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

              {/* Paid From: Cash vs Bank */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Paid From</label>
                  <select
                    value={outAccountType}
                    onChange={(e) => setOutAccountType(e.target.value as any)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-bold ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  >
                    <option value="cash">Cash Account</option>
                    <option value="bank">Bank Account</option>
                  </select>
                </div>

                {outAccountType === 'bank' ? (
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Select Bank</label>
                    <select
                      value={outBankId}
                      onChange={(e) => setOutBankId(e.target.value)}
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
                    <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Payment Mode</label>
                    <select
                      value={outPaymentMode}
                      onChange={(e) => setOutPaymentMode(e.target.value as PaymentMode)}
                      className={`w-full rounded-xl px-3 py-2 text-xs ${
                        isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                      }`}
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI / QR Code</option>
                      <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                      <option value="card">Card (POS)</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Payee / Vendor Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Vendor / Payee</label>
                  <input
                    type="text"
                    placeholder="e.g. Simmakkal Electronics or EB"
                    value={outPayeeName}
                    onChange={(e) => setOutPayeeName(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Ref / UTR / Cheque #</label>
                  <input
                    type="text"
                    placeholder="e.g. UTR 94820..."
                    value={outRefNumber}
                    onChange={(e) => setOutRefNumber(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
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
                  placeholder="e.g. Spares purchase bill #1042"
                  value={outDesc}
                  onChange={(e) => setOutDesc(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs ${
                    isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

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
              onClick={() => setZoomedImage(null)}
              className="absolute -top-3 -right-3 p-2 bg-white text-slate-900 rounded-full shadow-lg hover:scale-105 transition-transform"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
