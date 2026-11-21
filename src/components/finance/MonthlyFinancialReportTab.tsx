import React, { useMemo, useState } from 'react';
import { FileBarChart2, Download, Printer, ShieldCheck } from 'lucide-react';
import { useSgs } from '../../context/SgsContext';
import { todayLocal } from '../../utils/accounting';
import {
  computeMonthlyFinancialReport,
  computeYearlyFinancialComparison,
  monthlyFinancialReportToCsv,
} from '../../utils/advancedFinance';

const getPrevMonth = (monthStr: string): string => {
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const MonthlyFinancialReportTab: React.FC = () => {
  const {
    cashFlow,
    bankAccounts,
    adminSettings,
    loanPayments,
    investmentTransactions,
    theme,
  } = useSgs();

  const isDark = theme === 'dark';
  const currentMonth = todayLocal().slice(0, 7);
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentMonth.slice(0, 4));

  const openingCashBalance = adminSettings.openingCashBalance ?? 10000;

  const monthlyReport = useMemo(
    () =>
      computeMonthlyFinancialReport({
        month: selectedMonth,
        cashFlow,
        bankAccounts,
        openingCashBalance,
        loanPayments,
        investmentTransactions,
      }),
    [selectedMonth, cashFlow, bankAccounts, openingCashBalance, loanPayments, investmentTransactions]
  );

  const yearlyRows = useMemo(
    () =>
      computeYearlyFinancialComparison({
        year: selectedYear,
        cashFlow,
        bankAccounts,
        openingCashBalance,
        loanPayments,
        investmentTransactions,
      }),
    [selectedYear, cashFlow, bankAccounts, openingCashBalance, loanPayments, investmentTransactions]
  );

  const handleExportCsv = () => {
    let csvContent = '';
    let filename = '';
    if (viewMode === 'monthly') {
      csvContent = monthlyFinancialReportToCsv(monthlyReport);
      filename = `SGS_Monthly_Financial_Report_${selectedMonth}.csv`;
    } else {
      const headers = [
        'Month',
        'Operating Income',
        'Operating Expenses',
        'Net Surplus',
        'Staff Salary',
        'Recurring Paid',
        'Loan Interest & Charges',
        'Loan Principal Repaid (Non-Expense)',
        'Savings Deposits (Transfer)',
        'Investment Deposits (Transfer)',
        'Closing Cash',
        'Closing Bank',
      ].join(',');
      const lines = yearlyRows.map(r =>
        [
          r.month,
          r.monthlyIncome,
          r.monthlyOperatingExpenses,
          r.netOperatingProfit,
          r.staffSalaryPaid,
          r.recurringExpensesPaid,
          r.loanInterestPaid + r.loanChargesPaid,
          r.loanPrincipalRepaid,
          r.savingsDeposits,
          r.investmentDeposits,
          r.closingCashBalance,
          r.closingBankBalance,
        ].join(',')
      );
      csvContent = [headers, ...lines].join('\n');
      filename = `SGS_Annual_Financial_Comparison_${selectedYear}.csv`;
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2">
            <FileBarChart2 className="w-5 h-5 text-blue-500" />
            <span>Monthly & Annual Financial Reports</span>
          </h2>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Strict accounting separation: Operating P&amp;L vs Loan Principal vs Savings/Investment Transfers vs Closing Liquidity
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className={`p-1 rounded-xl border flex items-center gap-1 ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              type="button"
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                viewMode === 'monthly' ? 'bg-blue-600 text-white' : 'text-slate-500'
              }`}
            >
              Monthly Statement
            </button>
            <button
              type="button"
              onClick={() => setViewMode('yearly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                viewMode === 'yearly' ? 'bg-blue-600 text-white' : 'text-slate-500'
              }`}
            >
              Year-wise Comparison
            </button>
          </div>

          {viewMode === 'monthly' ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedMonth(currentMonth)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                  selectedMonth === currentMonth
                    ? 'bg-blue-600/10 border-blue-500 text-blue-600 dark:text-blue-400'
                    : isDark ? 'border-slate-700 text-slate-300' : 'border-slate-300 text-slate-700'
                }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => setSelectedMonth(getPrevMonth(currentMonth))}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                  selectedMonth === getPrevMonth(currentMonth)
                    ? 'bg-blue-600/10 border-blue-500 text-blue-600 dark:text-blue-400'
                    : isDark ? 'border-slate-700 text-slate-300' : 'border-slate-300 text-slate-700'
                }`}
              >
                Prev Month
              </button>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                  isDark ? 'bg-slate-900 border border-slate-800 text-white' : 'bg-white border border-slate-300'
                }`}
              />
            </div>
          ) : (
            <input
              type="number"
              min="2020"
              max="2035"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className={`w-24 rounded-xl px-3 py-1.5 text-xs font-bold font-mono ${
                isDark ? 'bg-slate-900 border border-slate-800 text-white' : 'bg-white border border-slate-300'
              }`}
            />
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Print / PDF
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MONTHLY STATEMENT VIEW                                                */}
      {/* ===================================================================== */}
      {viewMode === 'monthly' && (
        <div className="space-y-3 sm:space-y-4">
          {/* Headline KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            <div className={`p-3 sm:p-3.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase text-emerald-500">Operating Income</span>
              <div className="mt-1 text-lg sm:text-2xl font-bold font-mono text-emerald-600">
                ₹{monthlyReport.monthlyIncome.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-500">Excludes loan disbursements & transfers</span>
            </div>

            <div className={`p-3 sm:p-3.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase text-rose-500">Operating Expenses</span>
              <div className="mt-1 text-lg sm:text-2xl font-bold font-mono text-rose-600">
                ₹{monthlyReport.monthlyOperatingExpenses.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-500">Salary, Rent, Interest & Shop Costs</span>
            </div>

            <div className={`p-3 sm:p-3.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase text-blue-500">Net Operating Surplus</span>
              <div className={`mt-1 text-lg sm:text-2xl font-bold font-mono ${
                monthlyReport.netOperatingProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'
              }`}>
                {monthlyReport.netOperatingProfit >= 0 ? '+' : '-'}₹{Math.abs(monthlyReport.netOperatingProfit).toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] sm:text-[11px] text-slate-500">Income minus Operating Expenses</span>
            </div>

            <div className={`p-3 sm:p-3.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase text-purple-500">Month-End Closing Liquidity</span>
              <div className="mt-1 text-lg sm:text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
                ₹{monthlyReport.closingTotalOperatingBalance.toLocaleString('en-IN')}
              </div>
              <span className="text-[11px] text-slate-500">
                Cash ₹{monthlyReport.closingCashBalance.toLocaleString('en-IN')} · Bank ₹{monthlyReport.closingBankBalance.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Separated Statement Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Section 1: Operating Expenses Breakdown */}
            <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className={`p-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <h3 className="text-sm font-bold">1. Business Operating Expenses ({selectedMonth})</h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {[
                  ['Staff Salaries Paid', monthlyReport.staffSalaryPaid],
                  ['Recurring Expenses Paid (Rent, EB, Bills)', monthlyReport.recurringExpensesPaid],
                  ['Loan Interest Paid (Expense Portion)', monthlyReport.loanInterestPaid],
                  ['Loan Processing / Late Charges', monthlyReport.loanChargesPaid],
                  ['Other Business & Vendor Operating Expenses', monthlyReport.otherOperatingExpenses],
                ].map(([label, val]) => (
                  <div key={String(label)} className="px-4 py-3 flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">{label}</span>
                    <span className="font-mono font-bold">₹{Number(val).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div className={`px-4 py-3 flex items-center justify-between font-bold ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
                  <span>Total Operating Expenses</span>
                  <span className="font-mono text-rose-600">
                    ₹{monthlyReport.monthlyOperatingExpenses.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 2: Non-Expense Liability & Asset Movements */}
            <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <h3 className="text-sm font-bold">2. Liabilities, Reserves & Settlements</h3>
                <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Excluded from P&amp;L Expense
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Loan Principal Repaid (Liability Reduction)</span>
                  <span className="font-mono font-bold text-amber-600">₹{monthlyReport.loanPrincipalRepaid.toLocaleString('en-IN')}</span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Total EMI Outflow (Principal + Interest)</span>
                  <span className="font-mono font-bold">₹{monthlyReport.totalEmiPaid.toLocaleString('en-IN')}</span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Savings &amp; Reserve Deposits / Withdrawals</span>
                  <span className="font-mono font-bold text-teal-600">
                    +₹{monthlyReport.savingsDeposits.toLocaleString('en-IN')} / -₹{monthlyReport.savingsWithdrawals.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Investment Deposits / Withdrawals</span>
                  <span className="font-mono font-bold text-indigo-600">
                    +₹{monthlyReport.investmentDeposits.toLocaleString('en-IN')} / -₹{monthlyReport.investmentWithdrawals.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Investment Realized Profit / Loss</span>
                  <span className={`font-mono font-bold ${monthlyReport.investmentRealizedGainLoss >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {monthlyReport.investmentRealizedGainLoss >= 0 ? '+' : '-'}₹{Math.abs(monthlyReport.investmentRealizedGainLoss).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Customer Collections / Vendor Bill Settlements</span>
                  <span className="font-mono font-bold">
                    In ₹{monthlyReport.customerPaymentsReceived.toLocaleString('en-IN')} · Out ₹{monthlyReport.vendorPaymentsMade.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* YEAR-WISE COMPARISON TABLE                                            */}
      {/* ===================================================================== */}
      {viewMode === 'yearly' && (
        <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`uppercase text-[10px] font-bold tracking-wider ${
                isDark ? 'bg-slate-950/60 text-slate-400 border-b border-slate-800' : 'bg-slate-50 text-slate-600 border-b border-slate-200'
              }`}>
                <tr>
                  <th className="py-3 px-4">Month</th>
                  <th className="py-3 px-3 text-right text-emerald-600">Income</th>
                  <th className="py-3 px-3 text-right text-rose-600">Op. Expenses</th>
                  <th className="py-3 px-3 text-right">Net Surplus</th>
                  <th className="py-3 px-3 text-right">Salaries</th>
                  <th className="py-3 px-3 text-right">EMI Principal</th>
                  <th className="py-3 px-3 text-right">Savings Transfer</th>
                  <th className="py-3 px-3 text-right">Invest Transfer</th>
                  <th className="py-3 px-4 text-right text-blue-600">Closing Liquidity</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/80' : 'divide-slate-100'}`}>
                {yearlyRows.map(r => (
                  <tr key={r.month} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/70'}>
                    <td className="py-2.5 px-4 font-mono font-bold">{r.month}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-600">
                      ₹{r.monthlyIncome.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-600">
                      ₹{r.monthlyOperatingExpenses.toLocaleString('en-IN')}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-mono font-bold ${r.netOperatingProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {r.netOperatingProfit >= 0 ? '+' : '-'}₹{Math.abs(r.netOperatingProfit).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                      ₹{r.staffSalaryPaid.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-600">
                      ₹{r.loanPrincipalRepaid.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-teal-600">
                      ₹{r.savingsDeposits.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-indigo-600">
                      ₹{r.investmentDeposits.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-blue-600">
                      ₹{r.closingTotalOperatingBalance.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
