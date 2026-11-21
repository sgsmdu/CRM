import React, { useMemo, useState } from 'react';
import {
  Landmark,
  Plus,
  Coins,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Edit2,
  Trash2,
  X,
  ShieldCheck,
  Sparkles,
  Lock,
} from 'lucide-react';
import { useSgs } from '../../context/SgsContext';
import {
  GoldInterestFrequency,
  InterestType,
  LoanAccount,
  LoanPaymentKind,
  LoanStatus,
  LoanType,
  PaymentAccountType,
  PaymentModeChoice,
} from '../../types';
import { todayLocal, round2 } from '../../utils/accounting';
import {
  calculateFlatEmi,
  calculateReducingEmi,
  estimateEmiBreakdown,
  getLoanDashboardMetrics,
} from '../../utils/advancedFinance';
import { formatAccountLabel, mapChoiceToPaymentMode, validatePaymentAccountSelection } from '../../utils/moneyFlow';
import { PaymentAccountSelector } from '../PaymentAccountSelector';

const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  personal: 'Personal Loan',
  business: 'Business Loan',
  gold: 'Gold Loan',
  vehicle: 'Vehicle Loan',
  home: 'Home Loan',
  bank: 'Bank Loan',
  private_finance: 'Private Finance',
  other: 'Other Loan',
};

export const LoansManagerTab: React.FC<{ onShowToast?: (msg: string) => void }> = ({ onShowToast }) => {
  const {
    loans,
    loanPayments,
    addLoan,
    updateLoan,
    deleteLoan,
    recordLoanPayment,
    bankAccounts,
    canDelete,
    theme,
  } = useSgs();

  const isDark = theme === 'dark';
  const today = todayLocal();
  const metrics = useMemo(() => getLoanDashboardMetrics(loans, loanPayments, today), [loans, loanPayments, today]);

  const [filterType, setFilterType] = useState<'all' | 'regular' | 'gold'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | LoanStatus>('all');

  // Add / Edit Loan Modal State
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanAccount | null>(null);
  const [loanName, setLoanName] = useState('');
  const [loanType, setLoanType] = useState<LoanType>('business');
  const [lenderName, setLenderName] = useState('');
  const [maskedAccount, setMaskedAccount] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [originalAmount, setOriginalAmount] = useState('');
  const [outstandingPrincipal, setOutstandingPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('12');
  const [interestType, setInterestType] = useState<InterestType>('reducing');
  const [tenureMonths, setTenureMonths] = useState('24');
  const [emiAmount, setEmiAmount] = useState('');
  const [emiDueDay, setEmiDueDay] = useState('5');
  const [firstEmiDate, setFirstEmiDate] = useState(today);
  const [lastEmiDate, setLastEmiDate] = useState('');
  const [processingCharges, setProcessingCharges] = useState('0');
  const [linkedBankId, setLinkedBankId] = useState('');
  const [loanStatus, setLoanStatus] = useState<LoanStatus>('active');
  const [loanNotes, setLoanNotes] = useState('');
  const [creditDisbursement, setCreditDisbursement] = useState(false);
  const [disburseAccountType, setDisburseAccountType] = useState<PaymentAccountType>(
    bankAccounts.length > 0 ? 'bank' : 'cash'
  );
  const [disburseBankId, setDisburseBankId] = useState(bankAccounts[0]?.id || '');

  // Gold Loan Fields
  const [pledgeRef, setPledgeRef] = useState('');
  const [goldWeight, setGoldWeight] = useState('');
  const [goldPurity, setGoldPurity] = useState('22K');
  const [pledgedDate, setPledgedDate] = useState(today);
  const [goldIntFreq, setGoldIntFreq] = useState<GoldInterestFrequency>('monthly');
  const [interestDueDate, setInterestDueDate] = useState('');
  const [renewalMaturityDate, setRenewalMaturityDate] = useState('');
  const [interestPending, setInterestPending] = useState('0');
  const [loanFormError, setLoanFormError] = useState<string | null>(null);

  // Record Loan Payment Modal
  const [payingLoan, setPayingLoan] = useState<LoanAccount | null>(null);
  const [payKind, setPayKind] = useState<LoanPaymentKind>('emi');
  const [payDate, setPayDate] = useState(today);
  const [payEmiPeriod, setPayEmiPeriod] = useState(today.slice(0, 7));
  const [payTotal, setPayTotal] = useState('');
  const [payPrincipal, setPayPrincipal] = useState('');
  const [payInterest, setPayInterest] = useState('');
  const [payCharges, setPayCharges] = useState('0');
  const [isEstimated, setIsEstimated] = useState(false);
  const [payModeChoice, setPayModeChoice] = useState<PaymentModeChoice>('bank');
  const [payAccountType, setPayAccountType] = useState<PaymentAccountType>(
    bankAccounts.length > 0 ? 'bank' : 'cash'
  );
  const [payBankId, setPayBankId] = useState(bankAccounts[0]?.id || '');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [nextGoldIntDate, setNextGoldIntDate] = useState('');
  const [payError, setPayError] = useState<string | null>(null);

  const openCreateLoan = (presetType: LoanType = 'business') => {
    setEditingLoan(null);
    setLoanName('');
    setLoanType(presetType);
    setLenderName('');
    setMaskedAccount('');
    setStartDate(today);
    setOriginalAmount('');
    setOutstandingPrincipal('');
    setInterestRate(presetType === 'gold' ? '10' : '12');
    setInterestType(presetType === 'gold' ? 'manual' : 'reducing');
    setTenureMonths('24');
    setEmiAmount('');
    setEmiDueDay('5');
    setFirstEmiDate(today);
    setLastEmiDate('');
    setProcessingCharges('0');
    setLinkedBankId(bankAccounts[0]?.id || '');
    setLoanStatus('active');
    setLoanNotes('');
    setCreditDisbursement(false);
    setPledgeRef('');
    setGoldWeight('');
    setGoldPurity('22K');
    setPledgedDate(today);
    setGoldIntFreq('monthly');
    setInterestDueDate('');
    setRenewalMaturityDate('');
    setInterestPending('0');
    setLoanFormError(null);
    setIsLoanModalOpen(true);
  };

  const openEditLoan = (loan: LoanAccount) => {
    setEditingLoan(loan);
    setLoanName(loan.loanName);
    setLoanType(loan.loanType);
    setLenderName(loan.lenderName);
    setMaskedAccount(loan.maskedAccountNumber || '');
    setStartDate(loan.startDate);
    setOriginalAmount(String(loan.originalAmount));
    setOutstandingPrincipal(String(loan.outstandingPrincipal));
    setInterestRate(String(loan.interestRate));
    setInterestType(loan.interestType);
    setTenureMonths(String(loan.tenureMonths));
    setEmiAmount(String(loan.emiAmount));
    setEmiDueDay(String(loan.emiDueDay || 5));
    setFirstEmiDate(loan.firstEmiDate || loan.startDate);
    setLastEmiDate(loan.lastEmiDate || '');
    setProcessingCharges(String(loan.processingCharges || 0));
    setLinkedBankId(loan.linkedBankAccountId || '');
    setLoanStatus(loan.status);
    setLoanNotes(loan.notes || '');
    setCreditDisbursement(false);
    setPledgeRef(loan.pledgeReferenceNumber || '');
    setGoldWeight(loan.goldWeightGrams ? String(loan.goldWeightGrams) : '');
    setGoldPurity(loan.goldPurity || '22K');
    setPledgedDate(loan.pledgedDate || loan.startDate);
    setGoldIntFreq(loan.interestPaymentFrequency || 'monthly');
    setInterestDueDate(loan.interestDueDate || '');
    setRenewalMaturityDate(loan.renewalMaturityDate || '');
    setInterestPending(String(loan.interestPending || 0));
    setLoanFormError(null);
    setIsLoanModalOpen(true);
  };

  const handleSuggestEmi = () => {
    const p = Number(originalAmount) || Number(outstandingPrincipal) || 0;
    const r = Number(interestRate) || 0;
    const n = Math.max(1, Number(tenureMonths) || 12);
    if (p <= 0) {
      setLoanFormError('Enter Original Loan Amount before calculating suggested EMI.');
      return;
    }
    const emi =
      interestType === 'flat' ? calculateFlatEmi(p, r, n) : calculateReducingEmi(p, r, n);
    setEmiAmount(String(emi));
    setLoanFormError(null);
  };

  const handleSaveLoan = (e: React.FormEvent) => {
    e.preventDefault();
    setLoanFormError(null);
    const orig = round2(Number(originalAmount) || 0);
    if (!loanName.trim() || !lenderName.trim() || orig <= 0) {
      setLoanFormError('Loan Name, Lender / Bank Name, and Original Loan Amount (> ₹0) are required.');
      return;
    }
    const outP = editingLoan
      ? round2(Math.max(0, Number(outstandingPrincipal) || 0))
      : round2(Number(outstandingPrincipal) > 0 ? Number(outstandingPrincipal) : orig);

    // Block marking gold or regular loan closed manually if balance remains
    if (loanStatus === 'closed' || loanStatus === 'completed') {
      if (outP > 0.01 || (loanType === 'gold' && Number(interestPending) > 0.01)) {
        setLoanFormError(
          'Cannot mark Loan as Closed/Completed while Principal or Pending Interest remains > ₹0. Use "Close Loan" payment first.'
        );
        return;
      }
    }

    const payload = {
      loanName: loanName.trim(),
      loanType,
      lenderName: lenderName.trim(),
      maskedAccountNumber: maskedAccount.trim() || undefined,
      startDate,
      originalAmount: orig,
      outstandingPrincipal: outP,
      interestRate: Number(interestRate) || 0,
      interestType,
      tenureMonths: Math.max(1, Number(tenureMonths) || 12),
      emiAmount: round2(Number(emiAmount) || 0),
      emiDueDay: Math.max(1, Math.min(31, Number(emiDueDay) || 5)),
      firstEmiDate: firstEmiDate || startDate,
      lastEmiDate: lastEmiDate || undefined,
      processingCharges: round2(Number(processingCharges) || 0),
      linkedBankAccountId: linkedBankId || undefined,
      notes: loanNotes.trim() || undefined,
      status: loanStatus,
      pledgeReferenceNumber: loanType === 'gold' ? pledgeRef.trim() || undefined : undefined,
      goldWeightGrams: loanType === 'gold' && Number(goldWeight) > 0 ? Number(goldWeight) : undefined,
      goldPurity: loanType === 'gold' ? goldPurity.trim() || undefined : undefined,
      pledgedDate: loanType === 'gold' ? pledgedDate || startDate : undefined,
      interestPaymentFrequency: loanType === 'gold' ? goldIntFreq : undefined,
      interestDueDate: loanType === 'gold' ? interestDueDate || undefined : undefined,
      renewalMaturityDate: loanType === 'gold' ? renewalMaturityDate || undefined : undefined,
      interestPending: loanType === 'gold' ? round2(Number(interestPending) || 0) : undefined,
    };

    if (editingLoan) {
      updateLoan(editingLoan.id, payload);
      onShowToast?.(`Updated loan "${payload.loanName}"`);
    } else {
      addLoan(
        payload,
        creditDisbursement
          ? {
              accountType: disburseAccountType,
              bankAccountId: disburseAccountType === 'bank' ? disburseBankId : undefined,
            }
          : undefined
      );
      onShowToast?.(`Registered loan "${payload.loanName}"`);
    }
    setIsLoanModalOpen(false);
  };

  const openPaymentModal = (loan: LoanAccount, kind: LoanPaymentKind) => {
    setPayingLoan(loan);
    setPayKind(kind);
    setPayDate(today);
    setPayEmiPeriod(today.slice(0, 7));
    setPayError(null);
    setPayRef('');
    setPayNotes('');
    setNextGoldIntDate('');

    if (loan.linkedBankAccountId && bankAccounts.some(b => b.id === loan.linkedBankAccountId)) {
      setPayModeChoice('bank');
      setPayAccountType('bank');
      setPayBankId(loan.linkedBankAccountId);
    }

    if (kind === 'closure') {
      const p = round2(loan.outstandingPrincipal || 0);
      const i = round2(loan.interestPending || 0);
      setPayPrincipal(String(p));
      setPayInterest(String(i));
      setPayCharges('0');
      setPayTotal(String(round2(p + i)));
      setIsEstimated(false);
    } else if (kind === 'interest_only') {
      const intAmt = round2(loan.interestPending || 0);
      setPayPrincipal('0');
      setPayInterest(String(intAmt));
      setPayCharges('0');
      setPayTotal(String(intAmt));
      setIsEstimated(false);
    } else if (kind === 'principal_prepayment') {
      setPayPrincipal('');
      setPayInterest('0');
      setPayCharges('0');
      setPayTotal('');
      setIsEstimated(false);
    } else {
      // EMI payment
      const emi = round2(loan.emiAmount || 0);
      setPayTotal(emi > 0 ? String(emi) : '');
      if (loan.interestType === 'manual') {
        setPayPrincipal('');
        setPayInterest('');
        setPayCharges('0');
        setIsEstimated(false);
      } else if (emi > 0) {
        const est = estimateEmiBreakdown(loan, emi);
        setPayPrincipal(String(est.principalComponent));
        setPayInterest(String(est.interestComponent));
        setPayCharges('0');
        setIsEstimated(true);
      } else {
        setPayPrincipal('');
        setPayInterest('');
        setPayCharges('0');
        setIsEstimated(false);
      }
    }
  };

  const handleAutoEstimateSplit = () => {
    if (!payingLoan) return;
    const tot = Number(payTotal) || 0;
    if (tot <= 0) {
      setPayError('Enter Total Paid Amount first to estimate Principal vs Interest.');
      return;
    }
    const est = estimateEmiBreakdown(payingLoan, tot);
    setPayPrincipal(String(est.principalComponent));
    setPayInterest(String(est.interestComponent));
    setPayCharges('0');
    setIsEstimated(true);
    setPayError(null);
  };

  const handleSyncTotalFromSplit = (pStr: string, iStr: string, cStr: string) => {
    const p = Number(pStr) || 0;
    const i = Number(iStr) || 0;
    const c = Number(cStr) || 0;
    setPayTotal(String(round2(p + i + c)));
  };

  const handleSubmitLoanPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingLoan) return;
    setPayError(null);

    const accCheck = validatePaymentAccountSelection({
      paymentModeChoice: payModeChoice,
      accountType: payAccountType,
      bankAccountId: payBankId,
      bankAccounts,
      transactionRef: payRef,
      requireReferenceForOther: true,
    });
    if (!accCheck.valid) {
      setPayError(accCheck.error || 'Please select a valid Cash or Bank account.');
      return;
    }

    const total = round2(Number(payTotal) || 0);
    const p = round2(Number(payPrincipal) || 0);
    const i = round2(Number(payInterest) || 0);
    const c = round2(Number(payCharges) || 0);

    if (total <= 0) {
      setPayError('Total Payment Amount must be greater than ₹0.');
      return;
    }

    if (payPrincipal.trim() === '' || payInterest.trim() === '') {
      setPayError(
        'Please enter Principal and Interest components explicitly (or click "Estimate Split [Estimated]" if terms are estimated).'
      );
      return;
    }

    const res = recordLoanPayment({
      loanId: payingLoan.id,
      paymentKind: payKind,
      paymentDate: payDate,
      emiPeriod: payKind === 'emi' ? payEmiPeriod : undefined,
      totalPaid: total,
      principalComponent: p,
      interestComponent: i,
      chargesComponent: c,
      isEstimatedBreakdown: isEstimated,
      paymentMode: mapChoiceToPaymentMode(payModeChoice),
      paymentModeChoice: payModeChoice,
      accountType: accCheck.resolvedAccountType,
      bankAccountId: accCheck.resolvedBankAccountId,
      bankAccountName: accCheck.resolvedBankName,
      transactionRef: payRef.trim() || undefined,
      notes: payNotes.trim() || undefined,
      nextInterestDueDate: nextGoldIntDate || undefined,
    });

    if (!res.success) {
      setPayError(res.error || 'Could not record loan payment.');
      return;
    }

    if (res.duplicate) {
      setPayError(`EMI for ${payEmiPeriod} has already been paid for "${payingLoan.loanName}". Duplicate prevented.`);
      return;
    }

    setPayingLoan(null);
    onShowToast?.(
      `Recorded ₹${total.toLocaleString('en-IN')} payment for ${payingLoan.loanName} (Principal: ₹${p.toLocaleString('en-IN')}, Interest/Charges: ₹${round2(i + c).toLocaleString('en-IN')})`
    );
  };

  const filteredLoans = useMemo(() => {
    return loans.filter(l => {
      if (filterType === 'gold' && l.loanType !== 'gold') return false;
      if (filterType === 'regular' && l.loanType === 'gold') return false;
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      return true;
    });
  }, [loans, filterType, statusFilter]);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2">
            <Landmark className="w-5 h-5 text-rose-500" />
            <span>Loans & Gold Loan Liabilities</span>
          </h2>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Principal repayment reduces liability & deducts Cash/Bank without inflating operating expenses. Interest & charges count as finance expenses.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => openCreateLoan('business')}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Loan
          </button>
          <button
            type="button"
            onClick={() => openCreateLoan('gold')}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm cursor-pointer"
          >
            <Coins className="w-3.5 h-3.5" /> Add Gold Loan
          </button>
        </div>
      </div>

      {/* Loan KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className="text-[10px] font-bold uppercase text-slate-400">Original Loan Total</span>
          <p className="text-lg font-extrabold font-mono mt-1">₹{metrics.totalOriginalLoanAmount.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{loans.length} total registered</p>
        </div>

        <div className={`p-4 rounded-xl border ${isDark ? 'bg-rose-950/20 border-rose-900/50' : 'bg-rose-50/70 border-rose-200'}`}>
          <span className="text-[10px] font-bold uppercase text-rose-500">Outstanding Principal</span>
          <p className="text-lg font-extrabold font-mono text-rose-500 mt-1">
            ₹{metrics.totalOutstandingBalance.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Reg: ₹{metrics.regularOutstanding.toLocaleString('en-IN')} · Gold: ₹{metrics.goldOutstanding.toLocaleString('en-IN')}
          </p>
        </div>

        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className="text-[10px] font-bold uppercase text-emerald-500">Total Amount Repaid</span>
          <p className="text-lg font-extrabold font-mono text-emerald-500 mt-1">
            ₹{metrics.totalAmountRepaid.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Prin: ₹{metrics.totalPrincipalRepaid.toLocaleString('en-IN')} · Int: ₹{metrics.totalInterestPaid.toLocaleString('en-IN')}
          </p>
        </div>

        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className="text-[10px] font-bold uppercase text-blue-500">Monthly EMI Due</span>
          <p className="text-lg font-extrabold font-mono text-blue-500 mt-1">
            ₹{metrics.totalMonthlyEmi.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">{metrics.activeLoansCount} active loans</p>
        </div>

        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className="text-[10px] font-bold uppercase text-amber-500">Next EMI Due</span>
          <p className="text-base font-extrabold font-mono text-amber-500 mt-1 truncate">
            {metrics.nextEmiDue ? `₹${metrics.nextEmiDue.emiAmount.toLocaleString('en-IN')}` : 'None'}
          </p>
          <p className="text-[10px] text-slate-500 truncate mt-0.5">
            {metrics.nextEmiDue ? `${metrics.nextEmiDue.dueDate} · ${metrics.nextEmiDue.loanName}` : 'All caught up'}
          </p>
        </div>

        <div className={`p-4 rounded-xl border ${
          metrics.overdueEmiCount > 0
            ? (isDark ? 'bg-rose-950/40 border-rose-800' : 'bg-rose-50 border-rose-300')
            : (isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200')
        }`}>
          <span className="text-[10px] font-bold uppercase text-rose-500">Overdue EMI</span>
          <p className="text-lg font-extrabold font-mono text-rose-500 mt-1">
            ₹{metrics.overdueEmiAmount.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">{metrics.overdueEmiCount} overdue schedule(s)</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {(
            [
              { id: 'all', label: `All Loans (${loans.length})` },
              { id: 'regular', label: `Regular Loans (${loans.filter(l => l.loanType !== 'gold').length})` },
              { id: 'gold', label: `Gold Loans (${loans.filter(l => l.loanType === 'gold').length})` },
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                filterType === tab.id
                  ? 'bg-blue-600 text-white'
                  : isDark ? 'bg-slate-900 border border-slate-800 text-slate-300' : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as 'all' | LoanStatus)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            isDark ? 'bg-slate-900 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-800'
          }`}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="completed">Completed</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Loan Cards */}
      {filteredLoans.length === 0 ? (
        <div className={`p-10 rounded-2xl border text-center space-y-2 ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
        }`}>
          <Landmark className="w-8 h-8 mx-auto opacity-40" />
          <p className="text-sm font-semibold">No loans registered yet.</p>
          <p className="text-xs">Register Business, Personal, Gold, Vehicle, or Private Finance loans to track EMIs and outstanding liabilities.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLoans.map(loan => {
            const isGold = loan.loanType === 'gold';
            const pctPaid =
              loan.originalAmount > 0
                ? Math.min(100, Math.round(((loan.originalAmount - loan.outstandingPrincipal) / loan.originalAmount) * 100))
                : 0;
            const linkedBank = bankAccounts.find(b => b.id === loan.linkedBankAccountId);

            return (
              <div
                key={loan.id}
                className={`p-5 rounded-2xl border space-y-4 ${
                  isGold
                    ? isDark ? 'bg-amber-950/10 border-amber-900/50' : 'bg-amber-50/30 border-amber-200 shadow-xs'
                    : isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isGold ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/15 text-blue-500'
                      }`}>
                        {LOAN_TYPE_LABELS[loan.loanType]}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        loan.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : 'bg-slate-500/15 text-slate-400'
                      }`}>
                        {loan.status}
                      </span>
                      {loan.maskedAccountNumber && (
                        <span className="text-[10px] font-mono text-slate-400">{loan.maskedAccountNumber}</span>
                      )}
                    </div>
                    <h3 className="text-base font-bold mt-1">{loan.loanName}</h3>
                    <p className="text-xs text-slate-400">
                      {loan.lenderName} · {loan.interestRate}% ({loan.interestType}) · Tenure {loan.tenureMonths}m
                      {linkedBank ? ` · Bank: ${linkedBank.bankName}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditLoan(loan)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 cursor-pointer"
                      title="Edit Loan Details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete loan "${loan.loanName}"? Existing Cash Flow entries remain untouched.`)) {
                            deleteLoan(loan.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        title="Delete Loan (Admin)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-400">
                      Outstanding: <strong className="font-mono text-rose-500">₹{loan.outstandingPrincipal.toLocaleString('en-IN')}</strong>
                    </span>
                    <span className="font-mono text-slate-400">
                      Original: ₹{loan.originalAmount.toLocaleString('en-IN')} ({pctPaid}% repaid)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pctPaid}%` }} />
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className={`p-3 rounded-xl border grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">EMI / Monthly</span>
                    <strong className="font-mono">₹{(loan.emiAmount || 0).toLocaleString('en-IN')}</strong>
                    <span className="text-[10px] text-slate-500 block">Due Day: {loan.emiDueDay || 5}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Principal Repaid</span>
                    <strong className="font-mono text-emerald-500">₹{(loan.totalPrincipalRepaid || 0).toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Interest & Charges</span>
                    <strong className="font-mono text-amber-500">
                      ₹{round2((loan.totalInterestPaid || 0) + (loan.totalChargesPaid || 0)).toLocaleString('en-IN')}
                    </strong>
                  </div>

                  {isGold && (
                    <>
                      <div>
                        <span className="text-[10px] text-amber-500 block uppercase font-bold">Pledge / Gold</span>
                        <strong className="font-mono">
                          {loan.goldWeightGrams ? `${loan.goldWeightGrams}g (${loan.goldPurity || '22K'})` : loan.pledgeReferenceNumber || '—'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-500 block uppercase font-bold">Interest Due / Pending</span>
                        <strong className="font-mono text-rose-500">
                          ₹{(loan.interestPending || 0).toLocaleString('en-IN')}
                        </strong>
                        {loan.interestDueDate && (
                          <span className="text-[10px] text-slate-500 block">Due: {loan.interestDueDate}</span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-500 block uppercase font-bold">Renewal / Maturity</span>
                        <strong className="font-mono">{loan.renewalMaturityDate || '—'}</strong>
                      </div>
                    </>
                  )}
                </div>

                {/* Action Buttons */}
                {loan.status === 'active' && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {!isGold || (loan.emiAmount || 0) > 0 ? (
                      <button
                        type="button"
                        onClick={() => openPaymentModal(loan, 'emi')}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" /> Pay EMI
                      </button>
                    ) : null}
                    {isGold && (
                      <button
                        type="button"
                        onClick={() => openPaymentModal(loan, 'interest_only')}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 cursor-pointer"
                      >
                        <Coins className="w-3.5 h-3.5" /> Pay Interest Only
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openPaymentModal(loan, 'principal_prepayment')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                        isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-200' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      + Principal Payment
                    </button>
                    <button
                      type="button"
                      onClick={() => openPaymentModal(loan, 'closure')}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 cursor-pointer flex items-center gap-1"
                    >
                      <Lock className="w-3 h-3" /> Close Loan
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Loan Payment History Ledger */}
      <div className={`rounded-2xl border overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold">Loan & Gold Loan Payment History ({loanPayments.length})</h3>
        </div>
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className={`uppercase text-[10px] font-bold sticky top-0 ${
              isDark ? 'bg-slate-950 text-slate-400 border-b border-slate-800' : 'bg-slate-50 text-slate-600 border-b border-slate-200'
            }`}>
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Loan</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Account & Ref</th>
                <th className="py-2.5 px-3 text-right">Principal</th>
                <th className="py-2.5 px-3 text-right">Interest + Chg</th>
                <th className="py-2.5 px-3 text-right">Total Paid</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
              {loanPayments.slice(0, 30).map(p => (
                <tr key={p.id}>
                  <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">{p.paymentDate}</td>
                  <td className="py-2.5 px-3 font-semibold">
                    {p.loanName}
                    {p.emiPeriod && <span className="ml-1.5 text-[10px] font-mono text-blue-500">[{p.emiPeriod}]</span>}
                    {p.isEstimatedBreakdown && (
                      <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-500">
                        [Estimated Split]
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 uppercase text-[10px] font-bold text-slate-400">{p.paymentKind.replace('_', ' ')}</td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {formatAccountLabel(p.accountType, p.bankAccountId, bankAccounts, p.paymentMode)}
                    {p.transactionRef ? ` · ${p.transactionRef}` : ''}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-500">₹{p.principalComponent.toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-500">
                    ₹{round2(p.interestComponent + p.chargesComponent).toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold">₹{p.totalPaid.toLocaleString('en-IN')}</td>
                </tr>
              ))}
              {loanPayments.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">No loan repayments recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT LOAN MODAL */}
      {isLoanModalOpen && (
        <div className="sgs-modal-backdrop">
          <div className={`sgs-modal-sheet sm:max-w-2xl ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold">
                {editingLoan ? `Edit Loan: ${editingLoan.loanName}` : loanType === 'gold' ? 'Register Gold Loan' : 'Register New Loan'}
              </h3>
              <button type="button" onClick={() => setIsLoanModalOpen(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLoan} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Loan Name *</label>
                  <input
                    type="text"
                    required
                    value={loanName}
                    onChange={e => setLoanName(e.target.value)}
                    placeholder="e.g. HDFC Business Term Loan / Muthoot Gold Loan"
                    className={`w-full rounded-lg px-3 py-2 ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Loan Type *</label>
                  <select
                    value={loanType}
                    onChange={e => setLoanType(e.target.value as LoanType)}
                    className={`w-full rounded-lg px-3 py-2 ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
                  >
                    {Object.entries(LOAN_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Bank / Finance / Lender Name *</label>
                  <input
                    type="text"
                    required
                    value={lenderName}
                    onChange={e => setLenderName(e.target.value)}
                    placeholder="e.g. HDFC Bank / Muthoot Finance"
                    className={`w-full rounded-lg px-3 py-2 ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Loan Account # (Masked)</label>
                  <input
                    type="text"
                    value={maskedAccount}
                    onChange={e => setMaskedAccount(e.target.value)}
                    placeholder="XXXX-4821"
                    className={`w-full rounded-lg px-3 py-2 font-mono ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Original Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={originalAmount}
                    onChange={e => setOriginalAmount(e.target.value)}
                    className={`w-full rounded-lg px-3 py-2 font-mono font-bold ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Current Outstanding (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={outstandingPrincipal}
                    onChange={e => setOutstandingPrincipal(e.target.value)}
                    placeholder={originalAmount || 'Same as Original'}
                    className={`w-full rounded-lg px-3 py-2 font-mono font-bold ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Interest Rate (% p.a.)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={interestRate}
                    onChange={e => setInterestRate(e.target.value)}
                    className={`w-full rounded-lg px-3 py-2 font-mono ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Interest Type</label>
                  <select
                    value={interestType}
                    onChange={e => setInterestType(e.target.value as InterestType)}
                    className={`w-full rounded-lg px-3 py-2 ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
                  >
                    <option value="reducing">Reducing Balance</option>
                    <option value="flat">Flat Rate</option>
                    <option value="manual">Manual / Unknown</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Tenure (Months)</label>
                  <input
                    type="number"
                    min="1"
                    value={tenureMonths}
                    onChange={e => setTenureMonths(e.target.value)}
                    className={`w-full rounded-lg px-3 py-2 font-mono ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1 flex items-center justify-between">
                    <span>EMI Amount (₹)</span>
                    <button
                      type="button"
                      onClick={handleSuggestEmi}
                      className="text-[10px] text-blue-500 hover:underline cursor-pointer"
                    >
                      Calc
                    </button>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={emiAmount}
                    onChange={e => setEmiAmount(e.target.value)}
                    className={`w-full rounded-lg px-3 py-2 font-mono font-bold ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">EMI Due Day (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={emiDueDay}
                    onChange={e => setEmiDueDay(e.target.value)}
                    className={`w-full rounded-lg px-3 py-2 font-mono ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Processing Charges (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={processingCharges}
                    onChange={e => setProcessingCharges(e.target.value)}
                    className={`w-full rounded-lg px-3 py-2 font-mono ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Loan Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className={`w-full rounded-lg px-3 py-2 ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">First EMI Date</label>
                  <input
                    type="date"
                    value={firstEmiDate}
                    onChange={e => setFirstEmiDate(e.target.value)}
                    className={`w-full rounded-lg px-3 py-2 ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Last EMI Date (Optional)</label>
                  <input
                    type="date"
                    value={lastEmiDate}
                    onChange={e => setLastEmiDate(e.target.value)}
                    className={`w-full rounded-lg px-3 py-2 ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Linked Bank Account (Optional)</label>
                  <select
                    value={linkedBankId}
                    onChange={e => setLinkedBankId(e.target.value)}
                    className={`w-full rounded-lg px-3 py-2 ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
                  >
                    <option value="">-- No Specific Bank Linked --</option>
                    {bankAccounts.map(b => (
                      <option key={b.id} value={b.id}>{b.bankName} ({b.accountNumber.slice(-4)})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Loan Status</label>
                  <select
                    value={loanStatus}
                    onChange={e => setLoanStatus(e.target.value as LoanStatus)}
                    className={`w-full rounded-lg px-3 py-2 ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* GOLD LOAN SPECIFIC FIELDS */}
              {loanType === 'gold' && (
                <div className={`p-4 rounded-xl border space-y-3 ${
                  isDark ? 'bg-amber-950/20 border-amber-900/60' : 'bg-amber-50 border-amber-200'
                }`}>
                  <h4 className="font-bold text-amber-500 flex items-center gap-1.5">
                    <Coins className="w-4 h-4" /> Gold Pledge & Renewal Details
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1">Pledge Ref #</label>
                      <input
                        type="text"
                        value={pledgeRef}
                        onChange={e => setPledgeRef(e.target.value)}
                        placeholder="GL-9012"
                        className={`w-full rounded-lg px-2.5 py-1.5 font-mono ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-white border border-amber-300'}`}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1">Gold Weight (g)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={goldWeight}
                        onChange={e => setGoldWeight(e.target.value)}
                        placeholder="24.5"
                        className={`w-full rounded-lg px-2.5 py-1.5 font-mono ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-white border border-amber-300'}`}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1">Purity</label>
                      <input
                        type="text"
                        value={goldPurity}
                        onChange={e => setGoldPurity(e.target.value)}
                        placeholder="22K / 916"
                        className={`w-full rounded-lg px-2.5 py-1.5 ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-white border border-amber-300'}`}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1">Interest Pending (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={interestPending}
                        onChange={e => setInterestPending(e.target.value)}
                        className={`w-full rounded-lg px-2.5 py-1.5 font-mono font-bold ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-white border border-amber-300'}`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1">Pledged Date</label>
                      <input
                        type="date"
                        value={pledgedDate}
                        onChange={e => setPledgedDate(e.target.value)}
                        className={`w-full rounded-lg px-2.5 py-1.5 ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-white border border-amber-300'}`}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1">Interest Frequency</label>
                      <select
                        value={goldIntFreq}
                        onChange={e => setGoldIntFreq(e.target.value as GoldInterestFrequency)}
                        className={`w-full rounded-lg px-2.5 py-1.5 ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-white border border-amber-300'}`}
                      >
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="bullet">At Closure / Bullet</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1">Next Interest Due</label>
                      <input
                        type="date"
                        value={interestDueDate}
                        onChange={e => setInterestDueDate(e.target.value)}
                        className={`w-full rounded-lg px-2.5 py-1.5 ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-white border border-amber-300'}`}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-400 mb-1">Renewal / Maturity</label>
                      <input
                        type="date"
                        value={renewalMaturityDate}
                        onChange={e => setRenewalMaturityDate(e.target.value)}
                        className={`w-full rounded-lg px-2.5 py-1.5 ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-white border border-amber-300'}`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Optional Disbursement Credit */}
              {!editingLoan && (
                <div className={`p-3 rounded-xl border space-y-2 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <label className="flex items-center gap-2 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={creditDisbursement}
                      onChange={e => setCreditDisbursement(e.target.checked)}
                    />
                    <span>Also credit newly received Loan Principal to Cash / Bank balance (not counted as sales income)</span>
                  </label>
                  {creditDisbursement && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <select
                        value={disburseAccountType}
                        onChange={e => setDisburseAccountType(e.target.value as PaymentAccountType)}
                        className={`rounded-lg px-2.5 py-1.5 ${isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-300'}`}
                      >
                        <option value="bank">Bank Account</option>
                        <option value="cash">Cash Account</option>
                      </select>
                      {disburseAccountType === 'bank' && (
                        <select
                          value={disburseBankId}
                          onChange={e => setDisburseBankId(e.target.value)}
                          className={`rounded-lg px-2.5 py-1.5 ${isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-300'}`}
                        >
                          {bankAccounts.map(b => (
                            <option key={b.id} value={b.id}>{b.bankName}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Loan Notes</label>
                <input
                  type="text"
                  value={loanNotes}
                  onChange={e => setLoanNotes(e.target.value)}
                  placeholder="Optional remarks, collateral or sanction details"
                  className={`w-full rounded-lg px-3 py-2 ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
                />
              </div>

              {loanFormError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-500 font-semibold">
                  {loanFormError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsLoanModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                >
                  {editingLoan ? 'Save Loan Changes' : 'Save Loan Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD LOAN PAYMENT MODAL */}
      {payingLoan && (
        <div className="sgs-modal-backdrop">
          <div className={`sgs-modal-sheet sm:max-w-lg ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  {payKind === 'closure'
                    ? 'Full Loan Closure Payment'
                    : payKind === 'interest_only'
                      ? 'Pay Gold Loan Interest'
                      : payKind === 'principal_prepayment'
                        ? 'Extra Principal Repayment'
                        : 'Pay Monthly Loan EMI'}
                </h3>
                <p className="text-xs text-slate-400">
                  {payingLoan.loanName} · Outstanding Principal: ₹{payingLoan.outstandingPrincipal.toLocaleString('en-IN')}
                </p>
              </div>
              <button type="button" onClick={() => setPayingLoan(null)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitLoanPayment} className="p-6 overflow-y-auto space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={e => setPayDate(e.target.value)}
                    className={`w-full rounded-lg px-3 py-2 ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
                  />
                </div>
                {payKind === 'emi' && (
                  <div>
                    <label className="block font-semibold text-slate-400 mb-1">EMI Month Period *</label>
                    <input
                      type="month"
                      required
                      value={payEmiPeriod}
                      onChange={e => setPayEmiPeriod(e.target.value)}
                      className={`w-full rounded-lg px-3 py-2 font-mono ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
                    />
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-400">Total Amount Paid (₹) *</label>
                  <button
                    type="button"
                    onClick={handleAutoEstimateSplit}
                    className="text-[11px] font-bold text-blue-500 hover:underline cursor-pointer"
                  >
                    Estimate Principal/Interest Split
                  </button>
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={payTotal}
                  onChange={e => {
                    setPayTotal(e.target.value);
                    if (payKind === 'principal_prepayment') {
                      setPayPrincipal(e.target.value);
                      setPayInterest('0');
                      setPayCharges('0');
                    } else if (payKind === 'interest_only') {
                      setPayPrincipal('0');
                      setPayInterest(e.target.value);
                      setPayCharges('0');
                    }
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-sm font-mono font-bold ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-emerald-500 mb-1">Principal (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={payPrincipal}
                    onChange={e => {
                      setPayPrincipal(e.target.value);
                      setIsEstimated(false);
                      handleSyncTotalFromSplit(e.target.value, payInterest, payCharges);
                    }}
                    className={`w-full rounded-lg px-2.5 py-2 font-mono font-bold ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-amber-500 mb-1">Interest (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={payInterest}
                    onChange={e => {
                      setPayInterest(e.target.value);
                      setIsEstimated(false);
                      handleSyncTotalFromSplit(payPrincipal, e.target.value, payCharges);
                    }}
                    className={`w-full rounded-lg px-2.5 py-2 font-mono font-bold ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Charges (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={payCharges}
                    onChange={e => {
                      setPayCharges(e.target.value);
                      handleSyncTotalFromSplit(payPrincipal, payInterest, e.target.value);
                    }}
                    className={`w-full rounded-lg px-2.5 py-2 font-mono ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
                  />
                </div>
              </div>

              {isEstimated && (
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[11px] font-semibold">
                  [Estimated] Principal vs Interest split calculated from loan rate/tenure. You can override exact values above.
                </div>
              )}

              {payingLoan.loanType === 'gold' && payKind !== 'closure' && (
                <div>
                  <label className="block font-semibold text-slate-400 mb-1">Next Gold Interest Due Date (Optional)</label>
                  <input
                    type="date"
                    value={nextGoldIntDate}
                    onChange={e => setNextGoldIntDate(e.target.value)}
                    className={`w-full rounded-lg px-3 py-2 ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
                  />
                </div>
              )}

              <PaymentAccountSelector
                paymentModeChoice={payModeChoice}
                onChangePaymentModeChoice={setPayModeChoice}
                accountType={payAccountType}
                onChangeAccountType={setPayAccountType}
                bankAccountId={payBankId}
                onChangeBankAccountId={setPayBankId}
                transactionRef={payRef}
                onChangeTransactionRef={setPayRef}
                bankAccounts={bankAccounts}
                isDark={isDark}
                labelPrefix="Pay Loan From"
              />

              <div>
                <label className="block font-semibold text-slate-400 mb-1">Remarks / Voucher Notes</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  placeholder="Optional payment note"
                  className={`w-full rounded-lg px-3 py-2 ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
                />
              </div>

              {payError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-500 font-semibold">
                  {payError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPayingLoan(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                >
                  Confirm Loan Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
