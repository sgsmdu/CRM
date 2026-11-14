import React, { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, AlertTriangle, Clock, CreditCard, X } from 'lucide-react';
import { useSgs } from '../../context/SgsContext';
import { todayLocal, round2 } from '../../utils/accounting';
import { estimateEmiBreakdown, getMonthlyEmiSummary, MonthlyEmiRow } from '../../utils/advancedFinance';
import { PaymentAccountType, PaymentModeChoice } from '../../types';
import { mapChoiceToPaymentMode, validatePaymentAccountSelection } from '../../utils/moneyFlow';
import { PaymentAccountSelector } from '../PaymentAccountSelector';

export const EmiCalendarTab: React.FC<{ onShowToast?: (msg: string) => void }> = ({ onShowToast }) => {
  const { loans, loanPayments, recordLoanPayment, bankAccounts, theme } = useSgs();
  const isDark = theme === 'dark';
  const today = todayLocal();
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));

  const summary = useMemo(
    () => getMonthlyEmiSummary(loans, loanPayments, selectedMonth, today),
    [loans, loanPayments, selectedMonth, today]
  );

  // Quick Pay EMI Modal
  const [payingRow, setPayingRow] = useState<MonthlyEmiRow | null>(null);
  const [payDate, setPayDate] = useState(today);
  const [principalAmt, setPrincipalAmt] = useState('');
  const [interestAmt, setInterestAmt] = useState('');
  const [chargesAmt, setChargesAmt] = useState('0');
  const [isEstimated, setIsEstimated] = useState(false);
  const [modeChoice, setModeChoice] = useState<PaymentModeChoice>('bank');
  const [accType, setAccType] = useState<PaymentAccountType>(bankAccounts.length > 0 ? 'bank' : 'cash');
  const [bankId, setBankId] = useState(bankAccounts[0]?.id || '');
  const [txRef, setTxRef] = useState('');
  const [payErr, setPayErr] = useState<string | null>(null);

  const openQuickPay = (row: MonthlyEmiRow) => {
    const loan = loans.find(l => l.id === row.loanId);
    setPayingRow(row);
    setPayDate(today);
    setPayErr(null);
    setTxRef('');
    if (row.linkedBankAccountId && bankAccounts.some(b => b.id === row.linkedBankAccountId)) {
      setModeChoice('bank');
      setAccType('bank');
      setBankId(row.linkedBankAccountId);
    }
    if (loan && loan.interestType !== 'manual') {
      const est = estimateEmiBreakdown(loan, row.emiAmount);
      setPrincipalAmt(String(est.principalComponent));
      setInterestAmt(String(est.interestComponent));
      setChargesAmt('0');
      setIsEstimated(true);
    } else if (loan?.loanType === 'gold' && (loan.emiAmount || 0) <= 0) {
      setPrincipalAmt('0');
      setInterestAmt(String(row.emiAmount));
      setChargesAmt('0');
      setIsEstimated(false);
    } else {
      setPrincipalAmt('');
      setInterestAmt('');
      setChargesAmt('0');
      setIsEstimated(false);
    }
  };

  const handleConfirmQuickPay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingRow) return;
    setPayErr(null);

    const accCheck = validatePaymentAccountSelection({
      paymentModeChoice: modeChoice,
      accountType: accType,
      bankAccountId: bankId,
      bankAccounts,
      transactionRef: txRef,
      requireReferenceForOther: true,
    });
    if (!accCheck.valid) {
      setPayErr(accCheck.error || 'Please choose a valid Cash or Bank account.');
      return;
    }

    if (principalAmt.trim() === '' || interestAmt.trim() === '') {
      setPayErr('Enter exact Principal and Interest split (or estimate split from loan terms).');
      return;
    }

    const p = round2(Number(principalAmt) || 0);
    const i = round2(Number(interestAmt) || 0);
    const c = round2(Number(chargesAmt) || 0);
    const tot = round2(p + i + c);

    const res = recordLoanPayment({
      loanId: payingRow.loanId,
      paymentKind: 'emi',
      paymentDate: payDate,
      emiPeriod: payingRow.emiPeriod,
      dueDate: payingRow.dueDate,
      totalPaid: tot,
      principalComponent: p,
      interestComponent: i,
      chargesComponent: c,
      isEstimatedBreakdown: isEstimated,
      paymentMode: mapChoiceToPaymentMode(modeChoice),
      paymentModeChoice: modeChoice,
      accountType: accCheck.resolvedAccountType,
      bankAccountId: accCheck.resolvedBankAccountId,
      bankAccountName: accCheck.resolvedBankName,
      transactionRef: txRef.trim() || undefined,
    });

    if (!res.success) {
      setPayErr(res.error || 'Payment failed.');
      return;
    }
    if (res.duplicate) {
      setPayErr(`EMI for ${payingRow.emiPeriod} is already paid. Duplicate payment blocked.`);
      return;
    }

    setPayingRow(null);
    onShowToast?.(`Paid EMI ₹${tot.toLocaleString('en-IN')} for ${payingRow.loanName} (${payingRow.emiPeriod})`);
  };

  const badgeForStatus = (status: MonthlyEmiRow['status']) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-500/15 text-emerald-500';
      case 'overdue':
        return 'bg-rose-500/20 text-rose-500';
      case 'today':
        return 'bg-amber-500/20 text-amber-500';
      case 'this_week':
        return 'bg-orange-500/15 text-orange-500';
      default:
        return 'bg-blue-500/15 text-blue-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            <span>EMI Calendar & Monthly EMI Summary</span>
          </h2>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Track Upcoming, Today, This Week, Overdue & Paid EMIs. Duplicate EMI payments for the same due period are prevented.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Select Month:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
              isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
            }`}
          />
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className="text-[10px] font-bold uppercase text-slate-400">Total Monthly EMI</span>
          <p className="text-xl font-extrabold font-mono mt-1">₹{summary.totalMonthlyEmi.toLocaleString('en-IN')}</p>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className="text-[10px] font-bold uppercase text-emerald-500">Paid This Month</span>
          <p className="text-xl font-extrabold font-mono text-emerald-500 mt-1">₹{summary.totalPaidThisMonth.toLocaleString('en-IN')}</p>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className="text-[10px] font-bold uppercase text-amber-500">Pending This Month</span>
          <p className="text-xl font-extrabold font-mono text-amber-500 mt-1">₹{summary.totalPendingThisMonth.toLocaleString('en-IN')}</p>
        </div>
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <span className="text-[10px] font-bold uppercase text-rose-500">Overdue / Due Today</span>
          <p className="text-xl font-extrabold font-mono text-rose-500 mt-1">
            {summary.overdueCount} Overdue · {summary.dueTodayCount} Today
          </p>
        </div>
      </div>

      {/* Monthly EMI Summary Table */}
      <div className={`rounded-2xl border overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold">Monthly EMI Schedule — {selectedMonth}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[640px]">
            <thead className={`uppercase text-[10px] font-bold ${
              isDark ? 'bg-slate-950 text-slate-400 border-b border-slate-800' : 'bg-slate-50 text-slate-600 border-b border-slate-200'
            }`}>
              <tr>
                <th className="py-3 px-4">Loan</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">EMI Amount</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {summary.rows.map(row => (
                <tr key={row.loanId} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                  <td className="py-3 px-4">
                    <p className="font-bold">{row.loanName}</p>
                    <span className="text-[10px] text-slate-400">{row.lenderName} · {row.loanType.toUpperCase()}</span>
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {row.dueDate}
                    {!row.isPaid && (
                      <span className="block text-[10px] text-slate-400">
                        {row.daysRemaining < 0
                          ? `${Math.abs(row.daysRemaining)}d overdue`
                          : row.daysRemaining === 0
                            ? 'Due Today'
                            : `In ${row.daysRemaining}d`}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold">₹{row.emiAmount.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-500">₹{row.paidAmount.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${badgeForStatus(row.status)}`}>
                      {row.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {row.isPaid ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openQuickPay(row)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" /> Pay EMI
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {summary.rows.length > 0 && (
                <tr className={isDark ? 'bg-slate-950 font-bold' : 'bg-slate-50 font-bold'}>
                  <td colSpan={2} className="py-3 px-4 text-right">Total Monthly EMI:</td>
                  <td className="py-3 px-4 text-right font-mono text-sm">₹{summary.totalMonthlyEmi.toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 text-right font-mono text-sm text-emerald-500">₹{summary.totalPaidThisMonth.toLocaleString('en-IN')}</td>
                  <td colSpan={2} />
                </tr>
              )}
              {summary.rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">No active loan EMIs scheduled for {selectedMonth}.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Pay EMI Modal */}
      {payingRow && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold">Pay EMI: {payingRow.loanName}</h3>
                <p className="text-xs text-slate-400">Period {payingRow.emiPeriod} · Due {payingRow.dueDate}</p>
              </div>
              <button type="button" onClick={() => setPayingRow(null)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmQuickPay} className="space-y-3 text-xs">
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

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-emerald-500 mb-1">Principal (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={principalAmt}
                    onChange={e => {
                      setPrincipalAmt(e.target.value);
                      setIsEstimated(false);
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
                    value={interestAmt}
                    onChange={e => {
                      setInterestAmt(e.target.value);
                      setIsEstimated(false);
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
                    value={chargesAmt}
                    onChange={e => setChargesAmt(e.target.value)}
                    className={`w-full rounded-lg px-2.5 py-2 font-mono ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'}`}
                  />
                </div>
              </div>

              {isEstimated && (
                <p className="text-[11px] text-amber-500 font-semibold">
                  [Estimated] Principal & Interest split derived from loan rate/tenure.
                </p>
              )}

              <PaymentAccountSelector
                paymentModeChoice={modeChoice}
                onChangePaymentModeChoice={setModeChoice}
                accountType={accType}
                onChangeAccountType={setAccType}
                bankAccountId={bankId}
                onChangeBankAccountId={setBankId}
                transactionRef={txRef}
                onChangeTransactionRef={setTxRef}
                bankAccounts={bankAccounts}
                isDark={isDark}
                labelPrefix="Pay EMI From"
              />

              {payErr && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-500 font-semibold">
                  {payErr}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setPayingRow(null)} className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer">
                  Confirm ₹{round2((Number(principalAmt) || 0) + (Number(interestAmt) || 0) + (Number(chargesAmt) || 0)).toLocaleString('en-IN')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
