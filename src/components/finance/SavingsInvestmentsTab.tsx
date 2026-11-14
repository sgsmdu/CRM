import React, { useEffect, useMemo, useState } from 'react';
import {
  PiggyBank,
  TrendingUp,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Edit2,
  Trash2,
  X,
  Landmark,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useSgs } from '../../context/SgsContext';
import {
  InvestmentAccount,
  InvestmentStatus,
  InvestmentType,
  PaymentAccountType,
  PaymentModeChoice,
  SavingsAccount,
  SavingsAccountType,
} from '../../types';
import { todayLocal, round2 } from '../../utils/accounting';
import { formatAccountLabel, mapChoiceToPaymentMode, validatePaymentAccountSelection } from '../../utils/moneyFlow';
import { PaymentAccountSelector } from '../PaymentAccountSelector';

const SAVINGS_TYPE_LABELS: Record<SavingsAccountType, string> = {
  bank_savings: 'Bank Savings',
  emergency_fund: 'Emergency Fund',
  business_reserve: 'Business Reserve',
  personal_savings: 'Personal Savings',
  other: 'Other Reserve',
};

const INVESTMENT_TYPE_LABELS: Record<InvestmentType, string> = {
  fd: 'Fixed Deposit (FD)',
  rd: 'Recurring Deposit (RD)',
  mutual_fund: 'Mutual Fund',
  stocks: 'Stocks / Equity',
  gold: 'Gold / Bullion',
  other: 'Other Investment',
};

export const SavingsInvestmentsTab: React.FC<{
  initialSection?: 'savings' | 'investments';
  onShowToast?: (msg: string) => void;
}> = ({ initialSection = 'savings', onShowToast }) => {
  const {
    savingsAccounts,
    savingsTransactions,
    addSavingsAccount,
    updateSavingsAccount,
    deleteSavingsAccount,
    recordSavingsTransaction,
    investments,
    investmentTransactions,
    addInvestment,
    updateInvestment,
    updateInvestmentValuation,
    deleteInvestment,
    recordInvestmentTransaction,
    bankAccounts,
    canDelete,
    theme,
  } = useSgs();

  const isDark = theme === 'dark';
  const today = todayLocal();
  const [section, setSection] = useState<'savings' | 'investments'>(initialSection);

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  // --- SAVINGS ACCOUNT MODAL ---
  const [isSavModalOpen, setIsSavModalOpen] = useState(false);
  const [editingSav, setEditingSav] = useState<SavingsAccount | null>(null);
  const [savName, setSavName] = useState('');
  const [savType, setSavType] = useState<SavingsAccountType>('emergency_fund');
  const [savInstitution, setSavInstitution] = useState('');
  const [savLinkedBankId, setSavLinkedBankId] = useState('');
  const [savOpeningBalance, setSavOpeningBalance] = useState('0');
  const [savTargetAmount, setSavTargetAmount] = useState('');
  const [savStartDate, setSavStartDate] = useState(today);
  const [savNotes, setSavNotes] = useState('');
  const [savFundFromAccount, setSavFundFromAccount] = useState(false);
  const [savInitMode, setSavInitMode] = useState<PaymentModeChoice>('bank');
  const [savInitAccType, setSavInitAccType] = useState<PaymentAccountType>(
    bankAccounts.length > 0 ? 'bank' : 'cash'
  );
  const [savInitBankId, setSavInitBankId] = useState(bankAccounts[0]?.id || '');
  const [savError, setSavError] = useState<string | null>(null);

  // --- SAVINGS DEPOSIT / WITHDRAW MODAL ---
  const [savTxTarget, setSavTxTarget] = useState<{
    account: SavingsAccount;
    txType: 'deposit' | 'withdraw';
  } | null>(null);
  const [savTxAmount, setSavTxAmount] = useState('');
  const [savTxDate, setSavTxDate] = useState(today);
  const [savTxMode, setSavTxMode] = useState<PaymentModeChoice>('bank');
  const [savTxAccType, setSavTxAccType] = useState<PaymentAccountType>(
    bankAccounts.length > 0 ? 'bank' : 'cash'
  );
  const [savTxBankId, setSavTxBankId] = useState(bankAccounts[0]?.id || '');
  const [savTxRef, setSavTxRef] = useState('');
  const [savTxNotes, setSavTxNotes] = useState('');
  const [savTxError, setSavTxError] = useState<string | null>(null);

  // --- INVESTMENT ADD/EDIT MODAL ---
  const [isInvModalOpen, setIsInvModalOpen] = useState(false);
  const [editingInv, setEditingInv] = useState<InvestmentAccount | null>(null);
  const [invName, setInvName] = useState('');
  const [invType, setInvType] = useState<InvestmentType>('fd');
  const [invInstitution, setInvInstitution] = useState('');
  const [invDate, setInvDate] = useState(today);
  const [invInvested, setInvInvested] = useState('');
  const [invCurrentValue, setInvCurrentValue] = useState('');
  const [invMaturityDate, setInvMaturityDate] = useState('');
  const [invExpectedReturn, setInvExpectedReturn] = useState('');
  const [invStatus, setInvStatus] = useState<InvestmentStatus>('active');
  const [invNotes, setInvNotes] = useState('');
  const [invFundFromAccount, setInvFundFromAccount] = useState(true);
  const [invInitMode, setInvInitMode] = useState<PaymentModeChoice>('bank');
  const [invInitAccType, setInvInitAccType] = useState<PaymentAccountType>(
    bankAccounts.length > 0 ? 'bank' : 'cash'
  );
  const [invInitBankId, setInvInitBankId] = useState(bankAccounts[0]?.id || '');
  const [invError, setInvError] = useState<string | null>(null);

  // --- INVESTMENT ACTION MODALS (Add Capital / Withdraw / Update Value) ---
  const [invActionTarget, setInvActionTarget] = useState<{
    investment: InvestmentAccount;
    mode: 'add_capital' | 'withdrawal' | 'valuation';
  } | null>(null);
  const [invActionAmt, setInvActionAmt] = useState('');
  const [invActionReceivedAmt, setInvActionReceivedAmt] = useState('');
  const [invActionFullClose, setInvActionFullClose] = useState(false);
  const [invActionDate, setInvActionDate] = useState(today);
  const [invActionMode, setInvActionMode] = useState<PaymentModeChoice>('bank');
  const [invActionAccType, setInvActionAccType] = useState<PaymentAccountType>(
    bankAccounts.length > 0 ? 'bank' : 'cash'
  );
  const [invActionBankId, setInvActionBankId] = useState(bankAccounts[0]?.id || '');
  const [invActionRef, setInvActionRef] = useState('');
  const [invActionNotes, setInvActionNotes] = useState('');
  const [invActionError, setInvActionError] = useState<string | null>(null);

  const savingsSummary = useMemo(() => {
    const active = savingsAccounts.filter(s => s.isActive);
    const total = round2(active.reduce((s, a) => s + (a.currentBalance || 0), 0));
    const linked = round2(
      active.filter(a => Boolean(a.linkedBankAccountId)).reduce((s, a) => s + (a.currentBalance || 0), 0)
    );
    const unlinked = round2(total - linked);
    return { total, linked, unlinked, count: active.length };
  }, [savingsAccounts]);

  const invSummary = useMemo(() => {
    const active = investments.filter(i => i.status !== 'closed');
    const totalInvested = round2(active.reduce((s, i) => s + (i.investedAmount || 0), 0));
    const currentValue = round2(active.reduce((s, i) => s + (i.currentValue || 0), 0));
    const unrealized = round2(currentValue - totalInvested);
    const realized = round2(investments.reduce((s, i) => s + (i.realizedProfitLoss || 0), 0));
    return { totalInvested, currentValue, unrealized, realized, activeCount: active.length };
  }, [investments]);

  // --- SAVINGS HANDLERS ---
  const openNewSavings = () => {
    setEditingSav(null);
    setSavName('');
    setSavType('emergency_fund');
    setSavInstitution('');
    setSavLinkedBankId('');
    setSavOpeningBalance('0');
    setSavTargetAmount('');
    setSavStartDate(today);
    setSavNotes('');
    setSavFundFromAccount(false);
    setSavInitMode('bank');
    setSavInitAccType(bankAccounts.length > 0 ? 'bank' : 'cash');
    setSavInitBankId(bankAccounts[0]?.id || '');
    setSavError(null);
    setIsSavModalOpen(true);
  };

  const openEditSavings = (s: SavingsAccount) => {
    setEditingSav(s);
    setSavName(s.name);
    setSavType(s.savingsType);
    setSavInstitution(s.institution || '');
    setSavLinkedBankId(s.linkedBankAccountId || '');
    setSavOpeningBalance(String(s.currentBalance));
    setSavTargetAmount(s.targetAmount ? String(s.targetAmount) : '');
    setSavStartDate(s.startDate);
    setSavNotes(s.notes || '');
    setSavFundFromAccount(false);
    setSavError(null);
    setIsSavModalOpen(true);
  };

  const handleSaveSavingsAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setSavError(null);
    if (!savName.trim()) {
      setSavError('Please enter a savings/reserve account name.');
      return;
    }
    const openBal = round2(Number(savOpeningBalance) || 0);
    if (openBal < 0) {
      setSavError('Balance cannot be negative.');
      return;
    }

    if (editingSav) {
      updateSavingsAccount(editingSav.id, {
        name: savName.trim(),
        savingsType: savType,
        institution: savInstitution.trim() || undefined,
        linkedBankAccountId: savLinkedBankId || undefined,
        targetAmount: savTargetAmount ? round2(Number(savTargetAmount)) : undefined,
        startDate: savStartDate,
        notes: savNotes.trim() || undefined,
      });
      onShowToast?.(`Updated savings account "${savName.trim()}".`);
    } else {
      let transferInit:
        | {
            accountType: PaymentAccountType;
            bankAccountId?: string;
            paymentModeChoice: PaymentModeChoice;
          }
        | undefined;
      if (savFundFromAccount && openBal > 0) {
        const check = validatePaymentAccountSelection({
          paymentModeChoice: savInitMode,
          accountType: savInitAccType,
          bankAccountId: savInitBankId,
          bankAccounts,
          requireReferenceForOther: false,
        });
        if (!check.valid) {
          setSavError(check.error || 'Choose a valid Cash or Bank source to transfer from.');
          return;
        }
        transferInit = {
          accountType: check.resolvedAccountType,
          bankAccountId: check.resolvedBankAccountId,
          paymentModeChoice: savInitMode,
        };
      }

      addSavingsAccount(
        {
          name: savName.trim(),
          savingsType: savType,
          institution: savInstitution.trim() || undefined,
          linkedBankAccountId: savLinkedBankId || undefined,
          openingBalance: openBal,
          targetAmount: savTargetAmount ? round2(Number(savTargetAmount)) : undefined,
          startDate: savStartDate,
          notes: savNotes.trim() || undefined,
          isActive: true,
        },
        transferInit
      );
      onShowToast?.(
        transferInit
          ? `Created "${savName.trim()}" and transferred ₹${openBal.toLocaleString('en-IN')} from operating account.`
          : `Created savings account "${savName.trim()}".`
      );
    }
    setIsSavModalOpen(false);
  };

  const handleConfirmSavTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!savTxTarget) return;
    setSavTxError(null);
    const amt = round2(Number(savTxAmount) || 0);
    if (amt <= 0) {
      setSavTxError('Amount must be greater than ₹0.');
      return;
    }

    const check = validatePaymentAccountSelection({
      paymentModeChoice: savTxMode,
      accountType: savTxAccType,
      bankAccountId: savTxBankId,
      bankAccounts,
      transactionRef: savTxRef,
      requireReferenceForOther: true,
    });
    if (!check.valid) {
      setSavTxError(check.error || 'Select a valid Cash or Bank account.');
      return;
    }

    const res = recordSavingsTransaction({
      savingsAccountId: savTxTarget.account.id,
      type: savTxTarget.txType,
      amount: amt,
      date: savTxDate,
      accountType: check.resolvedAccountType,
      bankAccountId: check.resolvedBankAccountId,
      paymentMode: mapChoiceToPaymentMode(savTxMode),
      paymentModeChoice: savTxMode,
      transactionRef: savTxRef.trim() || undefined,
      notes: savTxNotes.trim() || undefined,
    });

    if (!res.success) {
      setSavTxError(res.error || 'Could not record savings transfer.');
      return;
    }
    setSavTxTarget(null);
    onShowToast?.(
      `${savTxTarget.txType === 'deposit' ? 'Transferred to' : 'Withdrawn from'} "${savTxTarget.account.name}": ₹${amt.toLocaleString('en-IN')} (Recorded as Transfer, non-expense).`
    );
  };

  // --- INVESTMENT HANDLERS ---
  const openNewInv = () => {
    setEditingInv(null);
    setInvName('');
    setInvType('fd');
    setInvInstitution('');
    setInvDate(today);
    setInvInvested('');
    setInvCurrentValue('');
    setInvMaturityDate('');
    setInvExpectedReturn('');
    setInvStatus('active');
    setInvNotes('');
    setInvFundFromAccount(true);
    setInvInitMode('bank');
    setInvInitAccType(bankAccounts.length > 0 ? 'bank' : 'cash');
    setInvInitBankId(bankAccounts[0]?.id || '');
    setInvError(null);
    setIsInvModalOpen(true);
  };

  const openEditInv = (inv: InvestmentAccount) => {
    setEditingInv(inv);
    setInvName(inv.name);
    setInvType(inv.investmentType);
    setInvInstitution(inv.institution || '');
    setInvDate(inv.investmentDate);
    setInvInvested(String(inv.investedAmount));
    setInvCurrentValue(String(inv.currentValue));
    setInvMaturityDate(inv.maturityDate || '');
    setInvExpectedReturn(inv.expectedReturnPercent !== undefined ? String(inv.expectedReturnPercent) : '');
    setInvStatus(inv.status);
    setInvNotes(inv.notes || '');
    setInvFundFromAccount(false);
    setInvError(null);
    setIsInvModalOpen(true);
  };

  const handleSaveInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    setInvError(null);
    if (!invName.trim()) {
      setInvError('Please enter an investment name.');
      return;
    }
    const invested = round2(Number(invInvested) || 0);
    if (!editingInv && invested <= 0) {
      setInvError('Initial invested amount must be greater than ₹0.');
      return;
    }
    const curVal = invCurrentValue !== '' ? round2(Number(invCurrentValue) || 0) : invested;

    if (editingInv) {
      updateInvestment(editingInv.id, {
        name: invName.trim(),
        investmentType: invType,
        institution: invInstitution.trim() || undefined,
        investmentDate: invDate,
        maturityDate: invMaturityDate || undefined,
        expectedReturnPercent: invExpectedReturn !== '' ? Number(invExpectedReturn) : undefined,
        status: invStatus,
        notes: invNotes.trim() || undefined,
      });
      onShowToast?.(`Updated investment "${invName.trim()}".`);
    } else {
      let transferInit:
        | {
            accountType: PaymentAccountType;
            bankAccountId?: string;
            paymentModeChoice: PaymentModeChoice;
          }
        | undefined;
      if (invFundFromAccount && invested > 0) {
        const check = validatePaymentAccountSelection({
          paymentModeChoice: invInitMode,
          accountType: invInitAccType,
          bankAccountId: invInitBankId,
          bankAccounts,
          requireReferenceForOther: false,
        });
        if (!check.valid) {
          setInvError(check.error || 'Choose a valid Cash or Bank source account.');
          return;
        }
        transferInit = {
          accountType: check.resolvedAccountType,
          bankAccountId: check.resolvedBankAccountId,
          paymentModeChoice: invInitMode,
        };
      }

      addInvestment(
        {
          name: invName.trim(),
          investmentType: invType,
          institution: invInstitution.trim() || undefined,
          investmentDate: invDate,
          investedAmount: invested,
          currentValue: curVal,
          maturityDate: invMaturityDate || undefined,
          expectedReturnPercent: invExpectedReturn !== '' ? Number(invExpectedReturn) : undefined,
          status: invStatus,
          notes: invNotes.trim() || undefined,
        },
        transferInit
      );
      onShowToast?.(
        transferInit
          ? `Added investment "${invName.trim()}" and transferred ₹${invested.toLocaleString('en-IN')} from operating funds.`
          : `Added historical investment "${invName.trim()}".`
      );
    }
    setIsInvModalOpen(false);
  };

  const openInvAction = (
    investment: InvestmentAccount,
    mode: 'add_capital' | 'withdrawal' | 'valuation'
  ) => {
    setInvActionTarget({ investment, mode });
    setInvActionDate(today);
    setInvActionAmt(
      mode === 'valuation'
        ? String(investment.currentValue)
        : mode === 'withdrawal'
          ? String(investment.investedAmount)
          : ''
    );
    setInvActionReceivedAmt(mode === 'withdrawal' ? String(investment.currentValue) : '');
    setInvActionFullClose(false);
    setInvActionMode('bank');
    setInvActionAccType(bankAccounts.length > 0 ? 'bank' : 'cash');
    setInvActionBankId(bankAccounts[0]?.id || '');
    setInvActionRef('');
    setInvActionNotes('');
    setInvActionError(null);
  };

  const handleConfirmInvAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invActionTarget) return;
    setInvActionError(null);
    const { investment, mode } = invActionTarget;

    if (mode === 'valuation') {
      const nextVal = round2(Number(invActionAmt));
      if (isNaN(nextVal) || nextVal < 0) {
        setInvActionError('Please enter a valid non-negative current value.');
        return;
      }
      updateInvestmentValuation(investment.id, nextVal, invActionDate, invActionNotes.trim() || undefined);
      setInvActionTarget(null);
      onShowToast?.(`Updated manual value of "${investment.name}" to ₹${nextVal.toLocaleString('en-IN')}.`);
      return;
    }

    const check = validatePaymentAccountSelection({
      paymentModeChoice: invActionMode,
      accountType: invActionAccType,
      bankAccountId: invActionBankId,
      bankAccounts,
      transactionRef: invActionRef,
      requireReferenceForOther: true,
    });
    if (!check.valid) {
      setInvActionError(check.error || 'Please choose a valid Cash or Bank account.');
      return;
    }

    if (mode === 'add_capital') {
      const amt = round2(Number(invActionAmt) || 0);
      if (amt <= 0) {
        setInvActionError('Capital deposit must be greater than ₹0.');
        return;
      }
      const res = recordInvestmentTransaction({
        investmentId: investment.id,
        type: 'add_capital',
        amount: amt,
        date: invActionDate,
        accountType: check.resolvedAccountType,
        bankAccountId: check.resolvedBankAccountId,
        paymentMode: mapChoiceToPaymentMode(invActionMode),
        paymentModeChoice: invActionMode,
        transactionRef: invActionRef.trim() || undefined,
        notes: invActionNotes.trim() || undefined,
      });
      if (!res.success) {
        setInvActionError(res.error || 'Failed to add capital.');
        return;
      }
      setInvActionTarget(null);
      onShowToast?.(`Transferred ₹${amt.toLocaleString('en-IN')} into "${investment.name}".`);
      return;
    }

    // Withdrawal
    const recAmt = round2(Number(invActionReceivedAmt) || 0);
    if (recAmt <= 0) {
      setInvActionError('Received withdrawal amount must be greater than ₹0.');
      return;
    }
    const costReduced = invActionFullClose
      ? investment.investedAmount
      : round2(Number(invActionAmt) || 0);

    const res = recordInvestmentTransaction({
      investmentId: investment.id,
      type: 'withdrawal',
      amount: costReduced,
      receivedAmount: recAmt,
      isFullClosure: invActionFullClose,
      date: invActionDate,
      accountType: check.resolvedAccountType,
      bankAccountId: check.resolvedBankAccountId,
      paymentMode: mapChoiceToPaymentMode(invActionMode),
      paymentModeChoice: invActionMode,
      transactionRef: invActionRef.trim() || undefined,
      notes: invActionNotes.trim() || undefined,
    });
    if (!res.success) {
      setInvActionError(res.error || 'Failed to record withdrawal.');
      return;
    }
    setInvActionTarget(null);
    onShowToast?.(`Recorded withdrawal of ₹${recAmt.toLocaleString('en-IN')} from "${investment.name}".`);
  };

  return (
    <div className="space-y-6">
      {/* Header + Section Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            {section === 'savings' ? (
              <PiggyBank className="w-5 h-5 text-teal-500" />
            ) : (
              <TrendingUp className="w-5 h-5 text-indigo-500" />
            )}
            <span>
              {section === 'savings' ? 'Savings & Reserve Accounts' : 'Investments & Capital Portfolio'}
            </span>
          </h2>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {section === 'savings'
              ? 'Emergency reserves & savings buckets. Transfers never affect Business Expenses or Operating Income.'
              : 'FD, RD, Mutual Funds, Stocks & Gold with manual current value tracking and realized profit/loss.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className={`p-1 rounded-xl border flex items-center gap-1 ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              type="button"
              onClick={() => setSection('savings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                section === 'savings' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-500'
              }`}
            >
              Savings ({savingsAccounts.length})
            </button>
            <button
              type="button"
              onClick={() => setSection('investments')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                section === 'investments' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500'
              }`}
            >
              Investments ({investments.length})
            </button>
          </div>

          {section === 'savings' ? (
            <button
              type="button"
              onClick={openNewSavings}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> + Add Savings Account
            </button>
          ) : (
            <button
              type="button"
              onClick={openNewInv}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> + Add Investment
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SAVINGS SECTION                                                       */}
      {/* ===================================================================== */}
      {section === 'savings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-[11px] font-bold uppercase text-teal-600 dark:text-teal-400">
                Total Savings & Reserves
              </span>
              <div className="mt-1.5 text-2xl font-bold font-mono text-teal-600 dark:text-teal-400">
                ₹{savingsSummary.total.toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-slate-500">{savingsSummary.count} active reserve account(s)</span>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-[11px] font-bold uppercase text-slate-400">Standalone Reserve Balance</span>
              <div className="mt-1.5 text-2xl font-bold font-mono">
                ₹{savingsSummary.unlinked.toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-slate-500">Separate from workshop cash & bank</span>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-[11px] font-bold uppercase text-blue-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Bank-Linked Reserves
              </span>
              <div className="mt-1.5 text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
                ₹{savingsSummary.linked.toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-slate-500">Excluded from double-counting</span>
            </div>
          </div>

          {/* Savings Accounts Grid */}
          {savingsAccounts.length === 0 ? (
            <div className={`p-10 rounded-2xl border text-center ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <PiggyBank className="w-10 h-10 text-teal-500/60 mx-auto mb-2" />
              <p className="text-sm font-bold">No Savings or Reserve Accounts Yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Create an Emergency Fund, Business Reserve, or Bank Savings bucket to transfer surplus funds safely.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savingsAccounts.map(acc => {
                const linkedBank = acc.linkedBankAccountId
                  ? bankAccounts.find(b => b.id === acc.linkedBankAccountId)
                  : undefined;
                const progress = acc.targetAmount && acc.targetAmount > 0
                  ? Math.min(100, Math.round((acc.currentBalance / acc.targetAmount) * 100))
                  : null;

                return (
                  <div
                    key={acc.id}
                    className={`p-5 rounded-2xl border space-y-3 ${
                      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-teal-500/15 text-teal-600 dark:text-teal-300">
                          {SAVINGS_TYPE_LABELS[acc.savingsType]}
                        </span>
                        <h3 className="text-sm font-bold mt-1.5">{acc.name}</h3>
                        <p className="text-[11px] text-slate-400">
                          {acc.institution || 'Internal Reserve'} · Since {acc.startDate}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditSavings(acc)}
                          className="p-1.5 rounded text-slate-400 hover:text-blue-500 cursor-pointer"
                          title="Edit Savings Account"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Delete savings account "${acc.name}"?`)) {
                                deleteSavingsAccount(acc.id);
                                onShowToast?.(`Deleted savings account "${acc.name}".`);
                              }
                            }}
                            className="p-1.5 rounded text-slate-400 hover:text-rose-500 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-2xl font-extrabold font-mono text-teal-600 dark:text-teal-400">
                      ₹{acc.currentBalance.toLocaleString('en-IN')}
                    </div>

                    {linkedBank && (
                      <div className="text-[10px] px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-300 flex items-center gap-1.5">
                        <Landmark className="w-3 h-3 shrink-0" />
                        <span>Linked to {linkedBank.bankName} (no double-counting)</span>
                      </div>
                    )}

                    {progress !== null && acc.targetAmount && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Goal: ₹{acc.targetAmount.toLocaleString('en-IN')}</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full bg-teal-500 rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setSavTxTarget({ account: acc, txType: 'deposit' });
                          setSavTxAmount('');
                          setSavTxDate(today);
                          setSavTxRef('');
                          setSavTxNotes(`Transfer to ${acc.name}`);
                          setSavTxError(null);
                        }}
                        className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-teal-600 hover:bg-teal-700 text-white cursor-pointer"
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" /> Deposit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSavTxTarget({ account: acc, txType: 'withdraw' });
                          setSavTxAmount('');
                          setSavTxDate(today);
                          setSavTxRef('');
                          setSavTxNotes(`Withdraw from ${acc.name}`);
                          setSavTxError(null);
                        }}
                        className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                          isDark ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" /> Withdraw
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Savings Transactions Table */}
          <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className={`p-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <h3 className="text-sm font-bold">Savings Transfer History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase text-[10px] font-bold tracking-wider ${
                  isDark ? 'bg-slate-950/60 text-slate-400 border-b border-slate-800' : 'bg-slate-50 text-slate-600 border-b border-slate-200'
                }`}>
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Savings Account</th>
                    <th className="py-2.5 px-4">Direction</th>
                    <th className="py-2.5 px-4">Cash / Bank Account</th>
                    <th className="py-2.5 px-4">Notes</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                  {savingsTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">No savings transfers recorded yet.</td>
                    </tr>
                  ) : (
                    savingsTransactions.map(tx => {
                      const isDeposit = tx.type === 'deposit' || tx.type === 'transfer_in';
                      return (
                        <tr key={tx.id}>
                          <td className="py-2.5 px-4 font-mono text-slate-500">{tx.date}</td>
                          <td className="py-2.5 px-4 font-bold">{tx.savingsAccountName}</td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isDeposit
                                ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            }`}>
                              {isDeposit ? 'Cash/Bank → Savings' : 'Savings → Cash/Bank'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-[11px]">
                            {formatAccountLabel(tx.accountType, tx.bankAccountId, bankAccounts, tx.paymentMode)}
                          </td>
                          <td className="py-2.5 px-4 text-slate-400">{tx.notes || tx.transactionRef || '—'}</td>
                          <td className={`py-2.5 px-4 text-right font-mono font-bold ${isDeposit ? 'text-teal-600' : 'text-amber-600'}`}>
                            ₹{tx.amount.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* INVESTMENTS SECTION                                                   */}
      {/* ===================================================================== */}
      {section === 'investments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-[11px] font-bold uppercase text-indigo-500">Total Invested Capital</span>
              <div className="mt-1.5 text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                ₹{invSummary.totalInvested.toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-slate-500">{invSummary.activeCount} active holding(s)</span>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-[11px] font-bold uppercase text-slate-400">Current Portfolio Value</span>
              <div className="mt-1.5 text-2xl font-bold font-mono">
                ₹{invSummary.currentValue.toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-slate-500">Manual valuation only</span>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-[11px] font-bold uppercase text-slate-400">Unrealized Gain / Loss</span>
              <div className={`mt-1.5 text-2xl font-bold font-mono ${
                invSummary.unrealized >= 0 ? 'text-emerald-600' : 'text-rose-500'
              }`}>
                {invSummary.unrealized >= 0 ? '+' : '-'}₹{Math.abs(invSummary.unrealized).toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-slate-500">Current Value − Cost Basis</span>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-[11px] font-bold uppercase text-emerald-500">Realized Profit / Loss</span>
              <div className={`mt-1.5 text-2xl font-bold font-mono ${
                invSummary.realized >= 0 ? 'text-emerald-600' : 'text-rose-500'
              }`}>
                {invSummary.realized >= 0 ? '+' : '-'}₹{Math.abs(invSummary.realized).toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-slate-500">From redeemed/closed units</span>
            </div>
          </div>

          <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-2 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <div>
                <h3 className="text-sm font-bold">Investments Register</h3>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Capital additions & withdrawals move Cash/Bank via Asset Transfers (never Operating Expenses).
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase text-[10px] font-bold tracking-wider ${
                  isDark ? 'bg-slate-950/60 text-slate-400 border-b border-slate-800' : 'bg-slate-50 text-slate-600 border-b border-slate-200'
                }`}>
                  <tr>
                    <th className="py-2.5 px-4">Investment</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4 text-right">Invested Cost</th>
                    <th className="py-2.5 px-4 text-right">Current Value</th>
                    <th className="py-2.5 px-4 text-right">Unrealized P&L</th>
                    <th className="py-2.5 px-4 text-right">Realized P&L</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                    <th className="py-2.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                  {investments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No investments recorded yet. Click &ldquo;+ Add Investment&rdquo; to track FDs, RDs, Mutual Funds, Stocks or Gold.
                      </td>
                    </tr>
                  ) : (
                    investments.map(inv => {
                      const unreal = round2((inv.currentValue || 0) - (inv.investedAmount || 0));
                      return (
                        <tr key={inv.id}>
                          <td className="py-3 px-4 font-bold">
                            <p>{inv.name}</p>
                            <span className="text-[10px] font-normal text-slate-400">
                              {inv.institution || 'Direct'} · Since {inv.investmentDate}
                              {inv.maturityDate ? ` · Mat: ${inv.maturityDate}` : ''}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
                              {INVESTMENT_TYPE_LABELS[inv.investmentType]}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold">
                            ₹{inv.investedAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            ₹{inv.currentValue.toLocaleString('en-IN')}
                            <span className="block text-[10px] font-normal text-slate-400">as of {inv.lastValuedAt}</span>
                          </td>
                          <td className={`py-3 px-4 text-right font-mono font-bold ${unreal >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {unreal >= 0 ? '+' : '-'}₹{Math.abs(unreal).toLocaleString('en-IN')}
                          </td>
                          <td className={`py-3 px-4 text-right font-mono font-semibold ${(inv.realizedProfitLoss || 0) >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {(inv.realizedProfitLoss || 0) >= 0 ? '+' : '-'}₹{Math.abs(inv.realizedProfitLoss || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              inv.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              {inv.status !== 'closed' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openInvAction(inv, 'add_capital')}
                                    className="px-2 py-1 rounded text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                                  >
                                    + Capital
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openInvAction(inv, 'valuation')}
                                    className="px-2 py-1 rounded text-[10px] font-bold bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 cursor-pointer flex items-center gap-0.5"
                                    title="Manually update current value"
                                  >
                                    <RefreshCw className="w-2.5 h-2.5" /> Value
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openInvAction(inv, 'withdrawal')}
                                    className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                                  >
                                    Withdraw
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => openEditInv(inv)}
                                className="p-1 text-slate-400 hover:text-blue-500 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Delete investment "${inv.name}"?`)) {
                                      deleteInvestment(inv.id);
                                      onShowToast?.(`Deleted investment "${inv.name}".`);
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Investment Transactions History */}
          <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className={`p-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <h3 className="text-sm font-bold">Investment Capital & Valuation Ledger</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase text-[10px] font-bold tracking-wider ${
                  isDark ? 'bg-slate-950/60 text-slate-400 border-b border-slate-800' : 'bg-slate-50 text-slate-600 border-b border-slate-200'
                }`}>
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Investment</th>
                    <th className="py-2.5 px-4">Event</th>
                    <th className="py-2.5 px-4">Account</th>
                    <th className="py-2.5 px-4 text-right">Principal / Val</th>
                    <th className="py-2.5 px-4 text-right">Received / P&L</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                  {investmentTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">No investment movements recorded yet.</td>
                    </tr>
                  ) : (
                    investmentTransactions.map(tx => (
                      <tr key={tx.id}>
                        <td className="py-2.5 px-4 font-mono text-slate-500">{tx.date}</td>
                        <td className="py-2.5 px-4 font-bold">{tx.investmentName}</td>
                        <td className="py-2.5 px-4 uppercase text-[10px] font-bold">{tx.type.replace('_', ' ')}</td>
                        <td className="py-2.5 px-4 text-[11px]">
                          {tx.accountType
                            ? formatAccountLabel(tx.accountType, tx.bankAccountId, bankAccounts, tx.paymentMode)
                            : 'Manual Valuation'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold">
                          ₹{(tx.type === 'valuation_update' ? tx.newValue || 0 : tx.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono">
                          {tx.type === 'withdrawal' ? (
                            <span className="font-bold text-emerald-600">
                              ₹{(tx.receivedAmount || 0).toLocaleString('en-IN')}
                              {tx.realizedGainLoss !== undefined && (
                                <span className={`block text-[10px] ${tx.realizedGainLoss >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  P&L: {tx.realizedGainLoss >= 0 ? '+' : '-'}₹{Math.abs(tx.realizedGainLoss).toLocaleString('en-IN')}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400">{tx.notes || '—'}</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SAVINGS ACCOUNT */}
      {isSavModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className={`border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-teal-600 dark:text-teal-400">
                {editingSav ? 'Edit Savings / Reserve Account' : 'Create Savings / Reserve Account'}
              </h3>
              <button type="button" onClick={() => setIsSavModalOpen(false)} className="p-1 text-slate-400 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveSavingsAccount} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Account Name *</label>
                  <input
                    type="text"
                    required
                    value={savName}
                    onChange={(e) => setSavName(e.target.value)}
                    placeholder="e.g. Workshop Emergency Fund"
                    className={`w-full rounded-xl px-3 py-2 text-xs font-semibold ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Savings Type</label>
                  <select
                    value={savType}
                    onChange={(e) => setSavType(e.target.value as SavingsAccountType)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-semibold ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  >
                    {Object.entries(SAVINGS_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Bank / Institution</label>
                  <input
                    type="text"
                    value={savInstitution}
                    onChange={(e) => setSavInstitution(e.target.value)}
                    placeholder="e.g. SBI Savings / Cash Safe"
                    className={`w-full rounded-xl px-3 py-2 text-xs ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Link Operating Bank (Optional)</label>
                  <select
                    value={savLinkedBankId}
                    onChange={(e) => setSavLinkedBankId(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  >
                    <option value="">Standalone Reserve (Not Linked)</option>
                    {bankAccounts.map(b => (
                      <option key={b.id} value={b.id}>{b.bankName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {!editingSav && (
                  <div>
                    <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Opening Balance (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={savOpeningBalance}
                      onChange={(e) => setSavOpeningBalance(e.target.value)}
                      className={`w-full rounded-xl px-3 py-2 text-xs font-mono font-bold ${
                        isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                      }`}
                    />
                  </div>
                )}
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Target Goal (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={savTargetAmount}
                    onChange={(e) => setSavTargetAmount(e.target.value)}
                    placeholder="Optional"
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={savStartDate}
                    onChange={(e) => setSavStartDate(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
              </div>

              {!editingSav && Number(savOpeningBalance) > 0 && (
                <div className={`p-3 rounded-xl border space-y-2.5 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={savFundFromAccount}
                      onChange={(e) => setSavFundFromAccount(e.target.checked)}
                    />
                    <span>Transfer initial ₹{Number(savOpeningBalance).toLocaleString('en-IN')} from Workshop Cash / Bank today</span>
                  </label>
                  {savFundFromAccount && (
                    <PaymentAccountSelector
                      paymentModeChoice={savInitMode}
                      onChangePaymentModeChoice={setSavInitMode}
                      accountType={savInitAccType}
                      onChangeAccountType={setSavInitAccType}
                      bankAccountId={savInitBankId}
                      onChangeBankAccountId={setSavInitBankId}
                      bankAccounts={bankAccounts}
                      isDark={isDark}
                      showReferenceInput={false}
                      labelPrefix="Transfer Initial Reserve From"
                    />
                  )}
                </div>
              )}

              <div>
                <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Notes</label>
                <input
                  type="text"
                  value={savNotes}
                  onChange={(e) => setSavNotes(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs ${
                    isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

              {savError && (
                <div className="p-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-500 text-xs font-semibold">
                  {savError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setIsSavModalOpen(false)} className="px-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl cursor-pointer">
                  {editingSav ? 'Save Changes' : 'Save Savings Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SAVINGS DEPOSIT / WITHDRAWAL */}
      {savTxTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-teal-600 dark:text-teal-400">
                  {savTxTarget.txType === 'deposit' ? 'Deposit / Transfer to Savings' : 'Withdraw from Savings'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {savTxTarget.account.name} · Current Balance: ₹{savTxTarget.account.currentBalance.toLocaleString('en-IN')}
                </p>
              </div>
              <button type="button" onClick={() => setSavTxTarget(null)} className="p-1 text-slate-400 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmSavTx} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={savTxAmount}
                    onChange={(e) => setSavTxAmount(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-sm font-mono font-bold text-teal-600 ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={savTxDate}
                    onChange={(e) => setSavTxDate(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <PaymentAccountSelector
                paymentModeChoice={savTxMode}
                onChangePaymentModeChoice={setSavTxMode}
                accountType={savTxAccType}
                onChangeAccountType={setSavTxAccType}
                bankAccountId={savTxBankId}
                onChangeBankAccountId={setSavTxBankId}
                transactionRef={savTxRef}
                onChangeTransactionRef={setSavTxRef}
                bankAccounts={bankAccounts}
                isDark={isDark}
                labelPrefix={savTxTarget.txType === 'deposit' ? 'Transfer From Operating Account' : 'Deposit Back Into Account'}
              />

              <div>
                <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Notes</label>
                <input
                  type="text"
                  value={savTxNotes}
                  onChange={(e) => setSavTxNotes(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs ${
                    isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

              {savTxError && (
                <div className="p-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-500 text-xs font-semibold">
                  {savTxError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setSavTxTarget(null)} className="px-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl cursor-pointer">
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT INVESTMENT */}
      {isInvModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className={`border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                {editingInv ? 'Edit Investment Details' : 'Register New Investment'}
              </h3>
              <button type="button" onClick={() => setIsInvModalOpen(false)} className="p-1 text-slate-400 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvestment} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Investment Name *</label>
                  <input
                    type="text"
                    required
                    value={invName}
                    onChange={(e) => setInvName(e.target.value)}
                    placeholder="e.g. Axis 1-Yr FD, Nifty 50 MF, Gold Coin"
                    className={`w-full rounded-xl px-3 py-2 text-xs font-semibold ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Investment Type</label>
                  <select
                    value={invType}
                    onChange={(e) => setInvType(e.target.value as InvestmentType)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-semibold ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  >
                    {Object.entries(INVESTMENT_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Institution / Broker</label>
                  <input
                    type="text"
                    value={invInstitution}
                    onChange={(e) => setInvInstitution(e.target.value)}
                    placeholder="e.g. HDFC, Zerodha, Groww, Tanishq"
                    className={`w-full rounded-xl px-3 py-2 text-xs ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Start / Investment Date</label>
                  <input
                    type="date"
                    value={invDate}
                    onChange={(e) => setInvDate(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
              </div>

              {!editingInv && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Invested Capital (₹) *</label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      required
                      value={invInvested}
                      onChange={(e) => {
                        setInvInvested(e.target.value);
                        if (!invCurrentValue || invCurrentValue === invInvested) {
                          setInvCurrentValue(e.target.value);
                        }
                      }}
                      className={`w-full rounded-xl px-3 py-2 text-sm font-mono font-bold ${
                        isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Current Value (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={invCurrentValue}
                      onChange={(e) => setInvCurrentValue(e.target.value)}
                      className={`w-full rounded-xl px-3 py-2 text-sm font-mono font-bold ${
                        isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                      }`}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Maturity Date</label>
                  <input
                    type="date"
                    value={invMaturityDate}
                    onChange={(e) => setInvMaturityDate(e.target.value)}
                    className={`w-full rounded-xl px-2.5 py-2 text-xs font-mono ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Expected % p.a.</label>
                  <input
                    type="number"
                    step="0.1"
                    value={invExpectedReturn}
                    onChange={(e) => setInvExpectedReturn(e.target.value)}
                    placeholder="e.g. 7.5"
                    className={`w-full rounded-xl px-2.5 py-2 text-xs font-mono ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Status</label>
                  <select
                    value={invStatus}
                    onChange={(e) => setInvStatus(e.target.value as InvestmentStatus)}
                    className={`w-full rounded-xl px-2.5 py-2 text-xs font-semibold ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  >
                    <option value="active">Active</option>
                    <option value="matured">Matured</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {!editingInv && Number(invInvested) > 0 && (
                <div className={`p-3 rounded-xl border space-y-2.5 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={invFundFromAccount}
                      onChange={(e) => setInvFundFromAccount(e.target.checked)}
                    />
                    <span>Transfer ₹{Number(invInvested).toLocaleString('en-IN')} from Workshop Cash / Bank today</span>
                  </label>
                  {invFundFromAccount && (
                    <PaymentAccountSelector
                      paymentModeChoice={invInitMode}
                      onChangePaymentModeChoice={setInvInitMode}
                      accountType={invInitAccType}
                      onChangeAccountType={setInvInitAccType}
                      bankAccountId={invInitBankId}
                      onChangeBankAccountId={setInvInitBankId}
                      bankAccounts={bankAccounts}
                      isDark={isDark}
                      showReferenceInput={false}
                      labelPrefix="Fund Investment From"
                    />
                  )}
                </div>
              )}

              <div>
                <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Notes</label>
                <input
                  type="text"
                  value={invNotes}
                  onChange={(e) => setInvNotes(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs ${
                    isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

              {invError && (
                <div className="p-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-500 text-xs font-semibold">
                  {invError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setIsInvModalOpen(false)} className="px-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer">
                  {editingInv ? 'Save Changes' : 'Save Investment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INVESTMENT ACTION (Add Capital / Withdrawal / Manual Value Update) */}
      {invActionTarget && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                  {invActionTarget.mode === 'add_capital'
                    ? `Add Capital: ${invActionTarget.investment.name}`
                    : invActionTarget.mode === 'withdrawal'
                      ? `Withdraw / Redeem: ${invActionTarget.investment.name}`
                      : `Manual Value Update: ${invActionTarget.investment.name}`}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Cost Basis: ₹{invActionTarget.investment.investedAmount.toLocaleString('en-IN')} · Current Value: ₹{invActionTarget.investment.currentValue.toLocaleString('en-IN')}
                </p>
              </div>
              <button type="button" onClick={() => setInvActionTarget(null)} className="p-1 text-slate-400 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmInvAction} className="space-y-3 text-xs">
              {invActionTarget.mode === 'valuation' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">New Current Value (₹) *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={invActionAmt}
                        onChange={(e) => setInvActionAmt(e.target.value)}
                        className={`w-full rounded-xl px-3 py-2 text-sm font-mono font-bold text-blue-500 ${
                          isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Valuation Date</label>
                      <input
                        type="date"
                        value={invActionDate}
                        onChange={(e) => setInvActionDate(e.target.value)}
                        className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${
                          isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                        }`}
                      />
                    </div>
                  </div>
                  <div className={`p-2.5 rounded-xl border text-xs ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    Unrealized Gain/Loss Preview:{' '}
                    <strong className={Number(invActionAmt) - invActionTarget.investment.investedAmount >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                      {Number(invActionAmt) - invActionTarget.investment.investedAmount >= 0 ? '+' : '-'}₹
                      {Math.abs(round2((Number(invActionAmt) || 0) - invActionTarget.investment.investedAmount)).toLocaleString('en-IN')}
                    </strong>
                  </div>
                </>
              )}

              {invActionTarget.mode === 'add_capital' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Capital Amount (₹) *</label>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        required
                        value={invActionAmt}
                        onChange={(e) => setInvActionAmt(e.target.value)}
                        className={`w-full rounded-xl px-3 py-2 text-sm font-mono font-bold text-indigo-500 ${
                          isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Date</label>
                      <input
                        type="date"
                        value={invActionDate}
                        onChange={(e) => setInvActionDate(e.target.value)}
                        className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${
                          isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                        }`}
                      />
                    </div>
                  </div>
                  <PaymentAccountSelector
                    paymentModeChoice={invActionMode}
                    onChangePaymentModeChoice={setInvActionMode}
                    accountType={invActionAccType}
                    onChangeAccountType={setInvActionAccType}
                    bankAccountId={invActionBankId}
                    onChangeBankAccountId={setInvActionBankId}
                    transactionRef={invActionRef}
                    onChangeTransactionRef={setInvActionRef}
                    bankAccounts={bankAccounts}
                    isDark={isDark}
                    labelPrefix="Transfer Capital From"
                  />
                </>
              )}

              {invActionTarget.mode === 'withdrawal' && (
                <>
                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={invActionFullClose}
                      onChange={(e) => {
                        setInvActionFullClose(e.target.checked);
                        if (e.target.checked) {
                          setInvActionAmt(String(invActionTarget.investment.investedAmount));
                        }
                      }}
                    />
                    <span>Full Withdrawal / Maturity Closure</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Cash/Bank Received (₹) *</label>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        required
                        value={invActionReceivedAmt}
                        onChange={(e) => setInvActionReceivedAmt(e.target.value)}
                        className={`w-full rounded-xl px-3 py-2 text-sm font-mono font-bold text-emerald-600 ${
                          isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Principal / Cost Reduced (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        disabled={invActionFullClose}
                        value={invActionAmt}
                        onChange={(e) => setInvActionAmt(e.target.value)}
                        className={`w-full rounded-xl px-3 py-2 text-sm font-mono font-bold disabled:opacity-60 ${
                          isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                        }`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Date</label>
                      <input
                        type="date"
                        value={invActionDate}
                        onChange={(e) => setInvActionDate(e.target.value)}
                        className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${
                          isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                        }`}
                      />
                    </div>
                    <div className={`p-2 rounded-xl border flex flex-col justify-center ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="text-[10px] text-slate-400">Realized P&L Preview</span>
                      {(() => {
                        const gain = round2((Number(invActionReceivedAmt) || 0) - (Number(invActionAmt) || 0));
                        return (
                          <strong className={`font-mono text-xs ${gain >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {gain >= 0 ? '+' : '-'}₹{Math.abs(gain).toLocaleString('en-IN')}
                          </strong>
                        );
                      })()}
                    </div>
                  </div>
                  <PaymentAccountSelector
                    paymentModeChoice={invActionMode}
                    onChangePaymentModeChoice={setInvActionMode}
                    accountType={invActionAccType}
                    onChangeAccountType={setInvActionAccType}
                    bankAccountId={invActionBankId}
                    onChangeBankAccountId={setInvActionBankId}
                    transactionRef={invActionRef}
                    onChangeTransactionRef={setInvActionRef}
                    bankAccounts={bankAccounts}
                    isDark={isDark}
                    labelPrefix="Deposit Proceeds To"
                  />
                </>
              )}

              <div>
                <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Notes</label>
                <input
                  type="text"
                  value={invActionNotes}
                  onChange={(e) => setInvActionNotes(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs ${
                    isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

              {invActionError && (
                <div className="p-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-500 text-xs font-semibold">
                  {invActionError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setInvActionTarget(null)} className="px-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer">
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
