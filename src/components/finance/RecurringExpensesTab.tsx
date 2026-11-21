import React, { useMemo, useState } from 'react';
import {
  Repeat,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Edit2,
  Trash2,
  Power,
  X,
  CreditCard,
  SkipForward,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useSgs } from '../../context/SgsContext';
import {
  PaymentAccountType,
  PaymentModeChoice,
  RecurringDueEntry,
  RecurringExpense,
  RecurringFrequency,
} from '../../types';
import { todayLocal, round2 } from '../../utils/accounting';
import { diffDays } from '../../utils/advancedFinance';
import {
  formatAccountLabel,
  mapChoiceToPaymentMode,
  paymentModeToChoice,
  validatePaymentAccountSelection,
} from '../../utils/moneyFlow';
import { PaymentAccountSelector } from '../PaymentAccountSelector';
import { MoneyFlowCategoryPicker } from '../MoneyFlowCategoryPicker';

const FREQ_LABELS: Record<RecurringFrequency, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  custom: 'Custom Days',
};

export const RecurringExpensesTab: React.FC<{ onShowToast?: (msg: string) => void }> = ({
  onShowToast,
}) => {
  const {
    recurringExpenses,
    recurringDueEntries,
    addRecurringExpense,
    updateRecurringExpense,
    toggleRecurringExpenseActive,
    deleteRecurringExpense,
    payRecurringDue,
    skipRecurringDue,
    syncRecurringDuesNow,
    bankAccounts,
    adminSettings,
    canDelete,
    theme,
  } = useSgs();

  const isDark = theme === 'dark';
  const today = todayLocal();
  const currentMonth = today.slice(0, 7);

  const [dueStatusFilter, setDueStatusFilter] = useState<'pending' | 'paid' | 'skipped' | 'all'>('pending');

  // Template Add/Edit Modal
  const [isTplModalOpen, setIsTplModalOpen] = useState(false);
  const [editingTpl, setEditingTpl] = useState<RecurringExpense | null>(null);
  const [tplName, setTplName] = useState('');
  const [tplAmount, setTplAmount] = useState('');
  const [tplFreq, setTplFreq] = useState<RecurringFrequency>('monthly');
  const [tplCustomDays, setTplCustomDays] = useState('30');
  const [tplStartDate, setTplStartDate] = useState(today);
  const [tplDueDay, setTplDueDay] = useState('5');
  const [tplRepeatUntil, setTplRepeatUntil] = useState('');
  const [tplReminderDays, setTplReminderDays] = useState(String(adminSettings.defaultReminderDays || 3));
  const [tplNotes, setTplNotes] = useState('');
  const [tplCatId, setTplCatId] = useState('mfc-office');
  const [tplCatName, setTplCatName] = useState('Office Expenses');
  const [tplSubId, setTplSubId] = useState('');
  const [tplSubName, setTplSubName] = useState('');
  const [tplThirdId, setTplThirdId] = useState('');
  const [tplThirdName, setTplThirdName] = useState('');
  const [tplModeChoice, setTplModeChoice] = useState<PaymentModeChoice>(
    bankAccounts.length > 0 ? 'bank' : 'cash'
  );
  const [tplAccountType, setTplAccountType] = useState<PaymentAccountType>(
    bankAccounts.length > 0 ? 'bank' : 'cash'
  );
  const [tplBankId, setTplBankId] = useState(bankAccounts[0]?.id || '');
  const [tplError, setTplError] = useState<string | null>(null);

  // Pay Due Modal
  const [payingDue, setPayingDue] = useState<RecurringDueEntry | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(today);
  const [payModeChoice, setPayModeChoice] = useState<PaymentModeChoice>(
    bankAccounts.length > 0 ? 'bank' : 'cash'
  );
  const [payAccountType, setPayAccountType] = useState<PaymentAccountType>(
    bankAccounts.length > 0 ? 'bank' : 'cash'
  );
  const [payBankId, setPayBankId] = useState(bankAccounts[0]?.id || '');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payError, setPayError] = useState<string | null>(null);

  const metrics = useMemo(() => {
    const activeTpls = recurringExpenses.filter(t => t.isActive);
    const monthlyEquivalent = round2(
      activeTpls.reduce((s, t) => {
        if (t.frequency === 'monthly') return s + (t.amount || 0);
        if (t.frequency === 'weekly') return s + (t.amount || 0) * 4;
        if (t.frequency === 'quarterly') return s + (t.amount || 0) / 3;
        if (t.frequency === 'yearly') return s + (t.amount || 0) / 12;
        return s + (t.amount || 0);
      }, 0)
    );
    const pendingDues = recurringDueEntries.filter(d => d.status === 'pending');
    const pendingAmount = round2(pendingDues.reduce((s, d) => s + (d.amountDue || 0), 0));
    const overdueCount = pendingDues.filter(d => d.dueDate < today).length;
    const paidThisMonth = round2(
      recurringDueEntries
        .filter(d => d.status === 'paid' && (d.paidDate || d.dueDate).startsWith(currentMonth))
        .reduce((s, d) => s + (d.paidAmount || d.amountDue || 0), 0)
    );
    return {
      activeCount: activeTpls.length,
      monthlyEquivalent,
      pendingCount: pendingDues.length,
      pendingAmount,
      overdueCount,
      paidThisMonth,
    };
  }, [recurringExpenses, recurringDueEntries, today, currentMonth]);

  const filteredDues = useMemo(() => {
    return recurringDueEntries
      .filter(d => (dueStatusFilter === 'all' ? true : d.status === dueStatusFilter))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [recurringDueEntries, dueStatusFilter]);

  const openNewTemplate = () => {
    setEditingTpl(null);
    setTplName('');
    setTplAmount('');
    setTplFreq('monthly');
    setTplCustomDays('30');
    setTplStartDate(today);
    setTplDueDay(String(Math.min(28, Number(today.slice(8, 10)) || 5)));
    setTplRepeatUntil('');
    setTplReminderDays(String(adminSettings.defaultReminderDays || 3));
    setTplNotes('');
    setTplCatId('mfc-office');
    setTplCatName('Office Expenses');
    setTplSubId('');
    setTplSubName('');
    setTplThirdId('');
    setTplThirdName('');
    setTplModeChoice(bankAccounts.length > 0 ? 'bank' : 'cash');
    setTplAccountType(bankAccounts.length > 0 ? 'bank' : 'cash');
    setTplBankId(bankAccounts[0]?.id || '');
    setTplError(null);
    setIsTplModalOpen(true);
  };

  const openEditTemplate = (t: RecurringExpense) => {
    setEditingTpl(t);
    setTplName(t.name);
    setTplAmount(String(t.amount));
    setTplFreq(t.frequency);
    setTplCustomDays(String(t.customIntervalDays || 30));
    setTplStartDate(t.startDate);
    setTplDueDay(String(t.dueDayOfMonth || 5));
    setTplRepeatUntil(t.repeatUntil || '');
    setTplReminderDays(String(t.reminderDaysBefore ?? 3));
    setTplNotes(t.notes || '');
    setTplCatId(t.categoryId || '');
    setTplCatName(t.categoryName || 'Office Expenses');
    setTplSubId(t.subcategoryId || '');
    setTplSubName(t.subcategory || '');
    setTplThirdId(t.secondSubcategoryId || '');
    setTplThirdName(t.secondSubcategory || '');
    setTplModeChoice(t.preferredModeChoice || paymentModeToChoice(t.preferredPaymentMode));
    setTplAccountType(t.preferredAccountType || 'cash');
    setTplBankId(t.preferredBankAccountId || bankAccounts[0]?.id || '');
    setTplError(null);
    setIsTplModalOpen(true);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    setTplError(null);
    const amt = round2(Number(tplAmount) || 0);
    if (!tplName.trim()) {
      setTplError('Please enter a recurring expense name (e.g. Shop Rent, Broadband, EB Bill).');
      return;
    }
    if (amt <= 0) {
      setTplError('Amount must be greater than ₹0.');
      return;
    }
    if (!tplCatName.trim()) {
      setTplError('Please select a Category.');
      return;
    }

    const accCheck = validatePaymentAccountSelection({
      paymentModeChoice: tplModeChoice,
      accountType: tplAccountType,
      bankAccountId: tplBankId,
      bankAccounts,
      requireReferenceForOther: false,
    });
    if (!accCheck.valid) {
      setTplError(accCheck.error || 'Select a valid preferred Cash or Bank account.');
      return;
    }

    const payload = {
      name: tplName.trim(),
      categoryId: tplCatId || undefined,
      categoryName: tplCatName,
      subcategory: tplSubName || undefined,
      subcategoryId: tplSubId || undefined,
      secondSubcategory: tplThirdName || undefined,
      secondSubcategoryId: tplThirdId || undefined,
      amount: amt,
      frequency: tplFreq,
      customIntervalDays: tplFreq === 'custom' ? Math.max(1, Number(tplCustomDays) || 30) : undefined,
      startDate: tplStartDate,
      dueDayOfMonth: ['monthly', 'quarterly', 'yearly'].includes(tplFreq)
        ? Math.max(1, Math.min(31, Number(tplDueDay) || 5))
        : undefined,
      repeatUntil: tplRepeatUntil || undefined,
      preferredPaymentMode: mapChoiceToPaymentMode(tplModeChoice),
      preferredModeChoice: tplModeChoice,
      preferredAccountType: accCheck.resolvedAccountType,
      preferredBankAccountId: accCheck.resolvedBankAccountId,
      reminderDaysBefore: Math.max(0, Number(tplReminderDays) || 3),
      notes: tplNotes.trim() || undefined,
      isActive: editingTpl ? editingTpl.isActive : true,
    };

    if (editingTpl) {
      updateRecurringExpense(editingTpl.id, payload);
      onShowToast?.(`Updated recurring template "${payload.name}" (past paid history untouched).`);
    } else {
      addRecurringExpense(payload);
      onShowToast?.(`Created recurring reminder "${payload.name}" — no balance auto-deducted.`);
    }
    setIsTplModalOpen(false);
  };

  const openPayDue = (due: RecurringDueEntry) => {
    const tpl = recurringExpenses.find(t => t.id === due.recurringExpenseId);
    setPayingDue(due);
    setPayAmount(String(due.amountDue));
    setPayDate(today);
    setPayModeChoice(tpl?.preferredModeChoice || paymentModeToChoice(tpl?.preferredPaymentMode) || 'bank');
    setPayAccountType(tpl?.preferredAccountType || (bankAccounts.length > 0 ? 'bank' : 'cash'));
    setPayBankId(tpl?.preferredBankAccountId || bankAccounts[0]?.id || '');
    setPayRef('');
    setPayNotes(`${due.expenseName} — ${due.duePeriod}`);
    setPayError(null);
  };

  const handleConfirmPayDue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDue) return;
    setPayError(null);

    const amt = round2(Number(payAmount) || 0);
    if (amt <= 0) {
      setPayError('Payment amount must be greater than ₹0.');
      return;
    }

    const accCheck = validatePaymentAccountSelection({
      paymentModeChoice: payModeChoice,
      accountType: payAccountType,
      bankAccountId: payBankId,
      bankAccounts,
      transactionRef: payRef,
      requireReferenceForOther: true,
    });
    if (!accCheck.valid) {
      setPayError(accCheck.error || 'Please choose a valid Cash or Bank account.');
      return;
    }

    const res = payRecurringDue({
      dueEntryId: payingDue.id,
      paidAmount: amt,
      paidDate: payDate,
      paymentMode: mapChoiceToPaymentMode(payModeChoice),
      paymentModeChoice: payModeChoice,
      accountType: accCheck.resolvedAccountType,
      bankAccountId: accCheck.resolvedBankAccountId,
      transactionRef: payRef.trim() || undefined,
      notes: payNotes.trim() || undefined,
    });

    if (res.duplicate) {
      setPayError('This recurring due period has already been paid.');
      return;
    }
    if (!res.success) {
      setPayError(res.error || 'Could not record payment.');
      return;
    }

    setPayingDue(null);
    onShowToast?.(`Paid ₹${amt.toLocaleString('en-IN')} for "${payingDue.expenseName}".`);
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2">
            <Repeat className="w-5 h-5 text-purple-500" />
            <span>Recurring Monthly Expenses & Reminders</span>
          </h2>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Schedule rent, broadband, electricity, software & fixed bills. Generates due reminders only — never auto-deducts Cash or Bank.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              const added = syncRecurringDuesNow();
              onShowToast?.(
                added > 0
                  ? `Synced ${added} new upcoming recurring due reminder(s).`
                  : 'All upcoming recurring reminders are already up to date.'
              );
            }}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border cursor-pointer ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-purple-500" /> Sync Reminders
          </button>
          <button
            type="button"
            onClick={openNewTemplate}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> + New Recurring
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className={`p-3 sm:p-3.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className="text-[10px] sm:text-[11px] font-bold uppercase text-slate-400">Active Schedules</span>
          <div className="mt-1 text-lg sm:text-2xl font-bold font-mono">{metrics.activeCount}</div>
          <span className="text-[10px] sm:text-[11px] text-slate-500">Est. ₹{metrics.monthlyEquivalent.toLocaleString('en-IN')}/month</span>
        </div>

        <div className={`p-3 sm:p-3.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className="text-[10px] sm:text-[11px] font-bold uppercase text-amber-500">Pending Due Bills</span>
          <div className="mt-1 text-lg sm:text-2xl font-bold font-mono text-amber-500">
            ₹{metrics.pendingAmount.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-500">{metrics.pendingCount} unpaid period(s)</span>
        </div>

        <div className={`p-3 sm:p-3.5 rounded-xl border ${
          metrics.overdueCount > 0
            ? isDark ? 'bg-rose-950/30 border-rose-900/60' : 'bg-rose-50 border-rose-200'
            : isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <span className="text-[10px] sm:text-[11px] font-bold uppercase text-rose-500">Overdue Reminders</span>
          <div className="mt-1 text-lg sm:text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
            {metrics.overdueCount}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-500">Requires manual confirmation</span>
        </div>

        <div className={`p-3 sm:p-3.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className="text-[10px] sm:text-[11px] font-bold uppercase text-emerald-500">Paid This Month</span>
          <div className="mt-1 text-lg sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            ₹{metrics.paidThisMonth.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] sm:text-[11px] text-slate-500">Posted to Operating Expenses</span>
        </div>
      </div>

      {/* Upcoming / Pending Due Queue */}
      <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-2 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Recurring Due Queue (Manual Confirmation Required)</span>
            </h3>
            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Clicking Pay Now records the Cash/Bank outflow once for that period and prevents duplicates.
            </p>
          </div>
          <div className="flex items-center gap-1">
            {(['pending', 'paid', 'skipped', 'all'] as const).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setDueStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize cursor-pointer ${
                  dueStatusFilter === st
                    ? 'bg-purple-600 text-white'
                    : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`uppercase text-[10px] font-bold tracking-wider ${
              isDark ? 'bg-slate-950/60 text-slate-400 border-b border-slate-800' : 'bg-slate-50 text-slate-600 border-b border-slate-200'
            }`}>
              <tr>
                <th className="py-2.5 px-4">Due Date</th>
                <th className="py-2.5 px-4">Expense Name</th>
                <th className="py-2.5 px-4">Category (3-Level)</th>
                <th className="py-2.5 px-4">Period</th>
                <th className="py-2.5 px-4 text-right">Due Amount</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
              {filteredDues.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No {dueStatusFilter === 'all' ? '' : dueStatusFilter} recurring due entries.
                  </td>
                </tr>
              ) : (
                filteredDues.map(due => {
                  const daysLeft = diffDays(today, due.dueDate);
                  const isOverdue = due.status === 'pending' && daysLeft < 0;
                  const catBreadcrumb = [due.categoryName, due.subcategory, due.secondSubcategory]
                    .filter(Boolean)
                    .join(' › ');

                  return (
                    <tr key={due.id} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/70'}>
                      <td className="py-3 px-4 font-mono whitespace-nowrap">
                        <span className={isOverdue ? 'text-rose-500 font-bold' : 'text-slate-500'}>
                          {due.dueDate}
                        </span>
                        {due.status === 'pending' && (
                          <span className={`block text-[10px] ${
                            isOverdue ? 'text-rose-500' : daysLeft === 0 ? 'text-amber-500' : 'text-slate-400'
                          }`}>
                            {isOverdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `In ${daysLeft}d`}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold">{due.expenseName}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-300">
                          {catBreadcrumb || 'Office Expenses'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">{due.duePeriod}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        ₹{(due.status === 'paid' ? due.paidAmount || due.amountDue : due.amountDue).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {due.status === 'paid' ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" /> Paid
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-0.5">
                              {due.paidDate} · {formatAccountLabel(due.accountType, due.bankAccountId, bankAccounts, due.paymentMode)}
                            </span>
                          </div>
                        ) : due.status === 'skipped' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-500">
                            Skipped
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            <AlertTriangle className="w-3 h-3" /> Overdue
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {due.status === 'pending' ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openPayDue(due)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                            >
                              <CreditCard className="w-3 h-3" /> Pay Now
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                skipRecurringDue(due.id, 'Skipped by user');
                                onShowToast?.(`Marked "${due.expenseName}" (${due.duePeriod}) as skipped.`);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-700 cursor-pointer"
                              title="Skip this billing period"
                            >
                              <SkipForward className="w-3 h-3" /> Skip
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recurring Expense Templates Table */}
      <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-2 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <div>
            <h3 className="text-sm font-bold">Configured Recurring Expense Templates</h3>
            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Editing future template amounts or dates will never modify past paid records.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" /> Zero Auto-Deduction Guard Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`uppercase text-[10px] font-bold tracking-wider ${
              isDark ? 'bg-slate-950/60 text-slate-400 border-b border-slate-800' : 'bg-slate-50 text-slate-600 border-b border-slate-200'
            }`}>
              <tr>
                <th className="py-2.5 px-4">Template Name</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Frequency</th>
                <th className="py-2.5 px-4">Next Due Date</th>
                <th className="py-2.5 px-4">Preferred Account</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
              {recurringExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                    No recurring expense templates added yet. Click &ldquo;+ New Recurring Expense&rdquo; to schedule rent, internet, EB or subscriptions.
                  </td>
                </tr>
              ) : (
                recurringExpenses.map(tpl => {
                  const breadcrumb = [tpl.categoryName, tpl.subcategory, tpl.secondSubcategory]
                    .filter(Boolean)
                    .join(' › ');
                  return (
                    <tr key={tpl.id} className={!tpl.isActive ? 'opacity-60' : undefined}>
                      <td className="py-3 px-4 font-bold">
                        <p>{tpl.name}</p>
                        {tpl.notes && <span className="text-[10px] font-normal text-slate-400">{tpl.notes}</span>}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-500">{breadcrumb}</td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold">{FREQ_LABELS[tpl.frequency]}</span>
                        {tpl.frequency === 'custom' && tpl.customIntervalDays && (
                          <span className="block text-[10px] text-slate-400">Every {tpl.customIntervalDays} days</span>
                        )}
                        {tpl.dueDayOfMonth && tpl.frequency !== 'weekly' && tpl.frequency !== 'custom' && (
                          <span className="block text-[10px] text-slate-400">Day {tpl.dueDayOfMonth} · Alert -{tpl.reminderDaysBefore}d</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono">{tpl.nextDueDate}</td>
                      <td className="py-3 px-4 text-[11px]">
                        {formatAccountLabel(tpl.preferredAccountType, tpl.preferredBankAccountId, bankAccounts, tpl.preferredPaymentMode)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        ₹{tpl.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tpl.isActive
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {tpl.isActive ? 'Active' : 'Paused'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditTemplate(tpl)}
                            className="p-1.5 rounded text-slate-400 hover:text-blue-500 cursor-pointer"
                            title="Edit Template"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              toggleRecurringExpenseActive(tpl.id);
                              onShowToast?.(
                                `${tpl.isActive ? 'Paused' : 'Activated'} recurring expense "${tpl.name}".`
                              );
                            }}
                            className={`p-1.5 rounded cursor-pointer ${
                              tpl.isActive ? 'text-amber-500 hover:bg-amber-500/10' : 'text-emerald-500 hover:bg-emerald-500/10'
                            }`}
                            title={tpl.isActive ? 'Pause Template' : 'Resume Template'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Delete recurring template "${tpl.name}"? Already paid historical expenses remain intact.`)) {
                                  deleteRecurringExpense(tpl.id);
                                  onShowToast?.(`Deleted recurring template "${tpl.name}".`);
                                }
                              }}
                              className="p-1.5 rounded text-slate-400 hover:text-rose-500 cursor-pointer"
                              title="Delete Template"
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

      {/* ADD / EDIT RECURRING TEMPLATE MODAL */}
      {isTplModalOpen && (
        <div className="sgs-modal-backdrop">
          <div className={`sgs-modal-sheet sm:max-w-xl block overflow-y-auto p-4 sm:p-5 space-y-3.5 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <Calendar className="w-5 h-5" />
                {editingTpl ? 'Edit Recurring Expense Schedule' : 'New Recurring Expense Reminder'}
              </h3>
              <button
                type="button"
                onClick={() => setIsTplModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[11px] block mb-1">Expense Name *</label>
                  <input
                    type="text"
                    required
                    value={tplName}
                    onChange={(e) => setTplName(e.target.value)}
                    placeholder="e.g. Shop Rent, Fiber Internet, EB Bill"
                    className={`w-full rounded-xl px-3 py-2 text-xs font-semibold ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[11px] block mb-1">Scheduled Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={tplAmount}
                    onChange={(e) => setTplAmount(e.target.value)}
                    placeholder="e.g. 12000"
                    className={`w-full rounded-xl px-3 py-2 text-sm font-mono font-bold ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <MoneyFlowCategoryPicker
                flowType="expense"
                categoryId={tplCatId}
                subcategoryId={tplSubId}
                secondSubcategoryId={tplThirdId}
                onChange={(sel) => {
                  setTplCatId(sel.categoryId);
                  setTplCatName(sel.categoryName || 'Office Expenses');
                  setTplSubId(sel.subcategoryId);
                  setTplSubName(sel.subcategoryName);
                  setTplThirdId(sel.secondSubcategoryId);
                  setTplThirdName(sel.secondSubcategoryName);
                }}
                isDark={isDark}
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Frequency</label>
                  <select
                    value={tplFreq}
                    onChange={(e) => setTplFreq(e.target.value as RecurringFrequency)}
                    className={`w-full rounded-xl px-2.5 py-2 text-xs font-semibold ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                    <option value="custom">Custom Days</option>
                  </select>
                </div>

                {tplFreq === 'custom' ? (
                  <div>
                    <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Every N Days</label>
                    <input
                      type="number"
                      min="1"
                      value={tplCustomDays}
                      onChange={(e) => setTplCustomDays(e.target.value)}
                      className={`w-full rounded-xl px-2.5 py-2 text-xs font-mono ${
                        isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                      }`}
                    />
                  </div>
                ) : tplFreq !== 'weekly' ? (
                  <div>
                    <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Due Day (1-31)</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={tplDueDay}
                      onChange={(e) => setTplDueDay(e.target.value)}
                      className={`w-full rounded-xl px-2.5 py-2 text-xs font-mono ${
                        isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                      }`}
                    />
                  </div>
                ) : (
                  <div />
                )}

                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={tplStartDate}
                    onChange={(e) => setTplStartDate(e.target.value)}
                    className={`w-full rounded-xl px-2.5 py-2 text-xs font-mono ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Alert Before (Days)</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={tplReminderDays}
                    onChange={(e) => setTplReminderDays(e.target.value)}
                    className={`w-full rounded-xl px-2.5 py-2 text-xs font-mono ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Repeat Until (Optional)</label>
                  <input
                    type="date"
                    value={tplRepeatUntil}
                    onChange={(e) => setTplRepeatUntil(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Notes / Vendor Ref</label>
                  <input
                    type="text"
                    value={tplNotes}
                    onChange={(e) => setTplNotes(e.target.value)}
                    placeholder="Landlord phone, consumer #, or plan info"
                    className={`w-full rounded-xl px-3 py-2 text-xs ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <PaymentAccountSelector
                paymentModeChoice={tplModeChoice}
                onChangePaymentModeChoice={setTplModeChoice}
                accountType={tplAccountType}
                onChangeAccountType={setTplAccountType}
                bankAccountId={tplBankId}
                onChangeBankAccountId={setTplBankId}
                bankAccounts={bankAccounts}
                isDark={isDark}
                showReferenceInput={false}
                labelPrefix="Preferred Payment Mode & Account"
              />

              {tplError && (
                <div className="p-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-500 text-xs font-semibold">
                  {tplError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTplModalOpen(false)}
                  className="px-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm cursor-pointer"
                >
                  {editingTpl ? 'Save Schedule Changes' : 'Create Recurring Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAY RECURRING DUE MODAL */}
      {payingDue && (
        <div className="sgs-modal-backdrop">
          <div className={`sgs-modal-sheet sm:max-w-md block overflow-y-auto p-4 sm:p-5 space-y-3.5 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  Pay Recurring Due: {payingDue.expenseName}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Period: {payingDue.duePeriod} · Due Date: {payingDue.dueDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayingDue(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayDue} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Actual Paid Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-sm font-mono font-bold text-emerald-600 ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
              </div>

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
                labelPrefix="Pay Expense From"
              />

              <div>
                <label className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Notes</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs ${
                    isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

              {payError && (
                <div className="p-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-500 text-xs font-semibold">
                  {payError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPayingDue(null)}
                  className="px-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm cursor-pointer"
                >
                  Confirm & Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
