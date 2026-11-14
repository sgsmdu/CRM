import React, { useEffect, useMemo, useState } from 'react';
import {
  Customer,
  Invoice,
  JobCard,
  PaymentAccountType,
  PaymentModeChoice,
} from '../types';
import { useSgs } from '../context/SgsContext';
import { amountDue, round2, todayLocal } from '../utils/accounting';
import {
  buildPaymentThankYouWhatsAppMessage,
  formatAccountLabel,
  formatWhatsAppPhone,
  getCustomerFinancialSummary,
  getJobCardFinancialSummary,
  mapChoiceToPaymentMode,
  validatePaymentAccountSelection,
} from '../utils/moneyFlow';
import { PaymentAccountSelector } from './PaymentAccountSelector';
import {
  X,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ExternalLink,
  Copy,
  Check,
  Wand2,
} from 'lucide-react';

export interface CollectPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'single_invoice' | 'job_advance' | 'customer_multi';
  invoice?: Invoice | null;
  customer?: Customer | null;
  jobCard?: JobCard | null;
  onPaymentSaved?: (summaryText: string) => void;
}

interface RecordedThankYouState {
  paidAmount: number;
  date: string;
  paymentModeLabel: string;
  accountLabel: string;
  transactionRef?: string;
  phone: string;
  message: string;
  headline: string;
}

export const CollectPaymentModal: React.FC<CollectPaymentModalProps> = ({
  isOpen,
  onClose,
  mode,
  invoice,
  customer,
  jobCard,
  onPaymentSaved,
}) => {
  const {
    invoices,
    invoicePayments,
    customerPaymentAllocations,
    bankAccounts,
    adminSettings,
    quotations,
    recordInvoicePayment,
    recordCustomerMultiInvoicePayment,
    theme,
  } = useSgs();

  const isDark = theme === 'dark';

  // Target invoice (either passed directly or picked on job_advance mode)
  const jobSummary = useMemo(
    () => (jobCard ? getJobCardFinancialSummary(jobCard, quotations, invoices, invoicePayments) : null),
    [jobCard, quotations, invoices, invoicePayments]
  );

  const pendingJobInvoices = useMemo(
    () => (jobSummary ? jobSummary.invoices.filter(i => amountDue(i) > 0) : []),
    [jobSummary]
  );

  const custSummary = useMemo(
    () =>
      customer
        ? getCustomerFinancialSummary(customer, invoices, invoicePayments, customerPaymentAllocations)
        : null,
    [customer, invoices, invoicePayments, customerPaymentAllocations]
  );

  const [selectedJobInvoiceId, setSelectedJobInvoiceId] = useState<string>('');
  const activeInvoice = useMemo(() => {
    if (mode === 'single_invoice' && invoice) {
      return invoices.find(i => i.id === invoice.id) || invoice;
    }
    if (mode === 'job_advance' && selectedJobInvoiceId) {
      return invoices.find(i => i.id === selectedJobInvoiceId) || null;
    }
    return null;
  }, [mode, invoice, selectedJobInvoiceId, invoices]);

  // Form states
  const [amountInput, setAmountInput] = useState<string>('');
  const [dateInput, setDateInput] = useState<string>(() => todayLocal());
  const [paymentModeChoice, setPaymentModeChoice] = useState<PaymentModeChoice>('cash');
  const [accountType, setAccountType] = useState<PaymentAccountType>('cash');
  const [bankAccountId, setBankAccountId] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [allocAmounts, setAllocAmounts] = useState<Record<string, number>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionKey, setSubmissionKey] = useState('');
  const [recordedState, setRecordedState] = useState<RecordedThankYouState | null>(null);
  const [showThankYouEditor, setShowThankYouEditor] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);

  // Initialize modal state cleanly when opened
  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    setIsSubmitting(false);
    setRecordedState(null);
    setShowThankYouEditor(false);
    setCopiedMsg(false);
    setDateInput(todayLocal());
    setPaymentModeChoice('cash');
    setAccountType('cash');
    setBankAccountId(bankAccounts.find(b => b.isActive)?.id || '');
    setTransactionRef('');
    setNotes('');
    setSubmissionKey(`pay-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);

    if (mode === 'single_invoice' && invoice) {
      const live = invoices.find(i => i.id === invoice.id) || invoice;
      setAmountInput(String(amountDue(live)));
      setSelectedJobInvoiceId(live.id);
    } else if (mode === 'job_advance') {
      const firstPending = pendingJobInvoices[0];
      if (firstPending) {
        setSelectedJobInvoiceId(firstPending.id);
        setAmountInput(String(amountDue(firstPending)));
      } else {
        setSelectedJobInvoiceId('');
        setAmountInput('');
      }
    } else if (mode === 'customer_multi' && custSummary) {
      const initAlloc: Record<string, number> = {};
      custSummary.pendingInvoices.forEach(inv => {
        initAlloc[inv.id] = amountDue(inv);
      });
      setAllocAmounts(initAlloc);
      setAmountInput(String(custSummary.totalPending || ''));
    }
  }, [isOpen, mode, invoice?.id, customer?.id, jobCard?.id]);

  if (!isOpen) return null;

  const targetCustomerName =
    activeInvoice?.customerName || customer?.name || jobCard?.customerName || 'Customer';
  const targetCustomerPhone =
    activeInvoice?.customerPhone || customer?.phone || jobCard?.customerPhone || '';
  const targetCustomerId =
    activeInvoice?.customerId || customer?.id || jobCard?.customerId || 'cust-walkin';

  const allocatedTotal = useMemo(
    () =>
      round2(
        Object.values(allocAmounts).reduce((s, v) => s + Math.max(0, Number(v) || 0), 0)
      ),
    [allocAmounts]
  );

  const numericAmount = round2(Number(amountInput) || 0);
  const unallocatedCredit =
    mode === 'customer_multi' ? round2(Math.max(0, numericAmount - allocatedTotal)) : 0;

  const handleAutoAllocateFifo = () => {
    if (!custSummary) return;
    let remaining = round2(Number(amountInput) || 0);
    if (remaining <= 0) {
      setFormError('Enter the total received amount first to auto-allocate.');
      return;
    }
    setFormError(null);
    const oldestFirst = [...custSummary.pendingInvoices].sort((a, b) => a.date.localeCompare(b.date));
    const next: Record<string, number> = {};
    for (const inv of oldestFirst) {
      const due = amountDue(inv);
      if (remaining <= 0) {
        next[inv.id] = 0;
      } else {
        const take = round2(Math.min(remaining, due));
        next[inv.id] = take;
        remaining = round2(remaining - take);
      }
    }
    setAllocAmounts(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError(null);

    if (!(numericAmount > 0)) {
      setFormError('Please enter a valid payment amount greater than ₹0.');
      return;
    }

    const accValidation = validatePaymentAccountSelection({
      paymentModeChoice,
      accountType,
      bankAccountId,
      bankAccounts,
      transactionRef,
      requireReferenceForOther: true,
    });
    if (!accValidation.valid) {
      setFormError(accValidation.error || 'Please choose a valid Cash or Bank account.');
      return;
    }

    const paymentMode = mapChoiceToPaymentMode(paymentModeChoice);
    const modeLabel =
      paymentModeChoice === 'cash'
        ? 'Cash'
        : paymentModeChoice === 'upi'
          ? 'UPI'
          : paymentModeChoice === 'bank'
            ? 'Bank Transfer'
            : 'Other';
    const accountLabel = formatAccountLabel(
      accValidation.resolvedAccountType,
      accValidation.resolvedBankAccountId,
      bankAccounts,
      paymentMode
    );

    if (mode === 'customer_multi') {
      if (allocatedTotal > numericAmount + 0.01) {
        setFormError(
          `Allocated total (₹${allocatedTotal.toLocaleString('en-IN')}) exceeds payment received (₹${numericAmount.toLocaleString('en-IN')}).`
        );
        return;
      }
      const allocationsList = (custSummary?.pendingInvoices || [])
        .map(inv => ({ invoiceId: inv.id, amount: round2(Number(allocAmounts[inv.id]) || 0) }))
        .filter(a => a.amount > 0);

      setIsSubmitting(true);
      const res = recordCustomerMultiInvoicePayment({
        customerId: targetCustomerId,
        customerName: targetCustomerName,
        customerPhone: targetCustomerPhone,
        totalAmount: numericAmount,
        date: dateInput,
        paymentMode,
        paymentModeChoice,
        accountType: accValidation.resolvedAccountType,
        bankAccountId: accValidation.resolvedBankAccountId,
        bankAccountName: accValidation.resolvedBankName,
        transactionRef: transactionRef.trim() || undefined,
        notes: notes.trim() || undefined,
        allocations: allocationsList,
        uniqueSourceKey: submissionKey,
      });
      setIsSubmitting(false);

      if (!res.success) {
        setFormError(res.error || 'Failed to record customer payment.');
        return;
      }

      const allocatedSummaries = allocationsList.map(a => {
        const inv = custSummary?.pendingInvoices.find(i => i.id === a.invoiceId);
        const prevDue = inv ? amountDue(inv) : a.amount;
        return {
          invoiceNumber: inv?.invoiceNumber || a.invoiceId,
          amount: a.amount,
          remaining: round2(Math.max(0, prevDue - a.amount)),
        };
      });
      const remainingOther = round2(
        Math.max(0, (custSummary?.totalPending || 0) - allocatedTotal)
      );

      const thankYou = buildPaymentThankYouWhatsAppMessage({
        customerName: targetCustomerName,
        paidAmount: numericAmount,
        paymentModeLabel: modeLabel,
        accountLabel,
        transactionRef: transactionRef.trim() || undefined,
        date: dateInput,
        allocatedInvoices: allocatedSummaries,
        unallocatedCredit,
        otherPendingTotal: remainingOther,
        workshopName: adminSettings.workshopName || 'Spider Grid Solutions, Madurai',
        workshopPhone: (adminSettings.workshopPhone || '9176795665').replace(/^\+91\s*/, ''),
      });

      const headline = `Received ₹${numericAmount.toLocaleString('en-IN')} via ${modeLabel} (${accountLabel})`;
      onPaymentSaved?.(headline);
      setRecordedState({
        paidAmount: numericAmount,
        date: dateInput,
        paymentModeLabel: modeLabel,
        accountLabel,
        transactionRef: transactionRef.trim() || undefined,
        phone: targetCustomerPhone,
        message: thankYou,
        headline,
      });
      return;
    }

    // Single Invoice or Job Advance
    if (activeInvoice) {
      const due = amountDue(activeInvoice);
      if (numericAmount > due + 0.01) {
        setFormError(
          `Payment amount (₹${numericAmount.toLocaleString('en-IN')}) cannot exceed invoice balance due (₹${due.toLocaleString('en-IN')}).`
        );
        return;
      }
    }

    setIsSubmitting(true);
    const res = recordInvoicePayment({
      invoiceId: activeInvoice?.id,
      jobCardId: jobCard?.id || activeInvoice?.jobCardId,
      customerId: targetCustomerId,
      customerName: targetCustomerName,
      customerPhone: targetCustomerPhone,
      amount: numericAmount,
      date: dateInput,
      paymentMode,
      paymentModeChoice,
      accountType: accValidation.resolvedAccountType,
      bankAccountId: accValidation.resolvedBankAccountId,
      bankAccountName: accValidation.resolvedBankName,
      transactionRef: transactionRef.trim() || undefined,
      notes: notes.trim() || undefined,
      isAdvance: !activeInvoice,
      uniqueSourceKey: submissionKey,
    });
    setIsSubmitting(false);

    if (!res.success) {
      setFormError(res.error || 'Could not record payment.');
      return;
    }

    const newPaidOnInv = activeInvoice ? round2((activeInvoice.paidAmount || 0) + numericAmount) : numericAmount;
    const newRemainingOnInv = activeInvoice ? round2(Math.max(0, activeInvoice.grandTotal - newPaidOnInv)) : 0;

    // Calculate other pending bills for the same customer
    const otherPendingInvs = invoices.filter(
      inv =>
        inv.type === 'invoice' &&
        inv.status !== 'cancelled' &&
        inv.id !== activeInvoice?.id &&
        ((targetCustomerPhone &&
          inv.customerPhone &&
          inv.customerPhone.replace(/\D/g, '').slice(-10) === targetCustomerPhone.replace(/\D/g, '').slice(-10)) ||
          (inv.customerId && inv.customerId === targetCustomerId)) &&
        amountDue(inv) > 0
    );
    const otherPendingTotal = round2(otherPendingInvs.reduce((s, i) => s + amountDue(i), 0));

    const thankYou = buildPaymentThankYouWhatsAppMessage({
      customerName: targetCustomerName,
      paidAmount: numericAmount,
      paymentModeLabel: modeLabel,
      accountLabel,
      transactionRef: transactionRef.trim() || undefined,
      date: dateInput,
      invoiceNumber: activeInvoice?.invoiceNumber,
      invoiceTotal: activeInvoice?.grandTotal,
      invoicePaid: newPaidOnInv,
      invoiceRemaining: newRemainingOnInv,
      otherPendingTotal,
      otherPendingCount: otherPendingInvs.length,
      isAdvance: !activeInvoice,
      workshopName: adminSettings.workshopName || 'Spider Grid Solutions, Madurai',
      workshopPhone: (adminSettings.workshopPhone || '9176795665').replace(/^\+91\s*/, ''),
    });

    const headline = activeInvoice
      ? `Collected ₹${numericAmount.toLocaleString('en-IN')} on ${activeInvoice.invoiceNumber} (${accountLabel})`
      : `Collected Advance ₹${numericAmount.toLocaleString('en-IN')} for Job ${jobCard?.jobId || ''} (${accountLabel})`;

    onPaymentSaved?.(headline);
    setRecordedState({
      paidAmount: numericAmount,
      date: dateInput,
      paymentModeLabel: modeLabel,
      accountLabel,
      transactionRef: transactionRef.trim() || undefined,
      phone: targetCustomerPhone,
      message: thankYou,
      headline,
    });
  };

  // --- Confirmation & WhatsApp Thank You View ---
  if (recordedState) {
    const waDigits = formatWhatsAppPhone(recordedState.phone);
    const waUrl = waDigits
      ? `https://wa.me/${waDigits}?text=${encodeURIComponent(recordedState.message)}`
      : '';

    return (
      <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
        <div
          className={`border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-500">Payment Recorded!</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {recordedState.headline}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`p-3.5 rounded-xl border text-xs grid grid-cols-2 gap-2 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <span className="text-slate-400">Amount Received</span>
                <p className="font-mono font-bold text-sm text-emerald-500">
                  ₹{recordedState.paidAmount.toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Credited To</span>
                <p className="font-bold mt-0.5">{recordedState.accountLabel}</p>
              </div>
              <div>
                <span className="text-slate-400">Mode & Date</span>
                <p className="font-mono mt-0.5">{recordedState.paymentModeLabel} · {recordedState.date}</p>
              </div>
              <div>
                <span className="text-slate-400">Reference</span>
                <p className="font-mono mt-0.5">{recordedState.transactionRef || 'Auto-logged'}</p>
              </div>
            </div>

            {!showThankYouEditor ? (
              <div className={`p-4 rounded-xl border space-y-3 ${
                isDark ? 'bg-emerald-950/20 border-emerald-800/50' : 'bg-emerald-50 border-emerald-200'
              }`}>
                <p className={`text-xs font-semibold ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>
                  Would you like to send a WhatsApp Thank You & Receipt Confirmation message to {targetCustomerName}?
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowThankYouEditor(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Send WhatsApp Thank You Message</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                      isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white border border-slate-300 text-slate-700'
                    }`}
                  >
                    Skip & Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Customer WhatsApp Phone
                  </label>
                  <input
                    type="tel"
                    value={recordedState.phone}
                    onChange={(e) => setRecordedState({ ...recordedState, phone: e.target.value })}
                    placeholder="10-digit WhatsApp number"
                    className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Thank You Message Preview (Editable)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(recordedState.message);
                        setCopiedMsg(true);
                        setTimeout(() => setCopiedMsg(false), 2000);
                      }}
                      className="text-[11px] font-semibold text-blue-500 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedMsg ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedMsg ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    value={recordedState.message}
                    onChange={(e) => setRecordedState({ ...recordedState, message: e.target.value })}
                    className={`w-full rounded-xl p-3 text-xs font-mono leading-relaxed focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-slate-50 border border-slate-300 text-slate-800'
                    }`}
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer ${
                      isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Done
                  </button>
                  {waUrl ? (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={onClose}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Open WhatsApp</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="px-4 py-2 text-xs font-bold text-white bg-slate-400 rounded-lg cursor-not-allowed"
                    >
                      Enter Valid Phone
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Main Collect Payment Form ---
  const currentInvDue = activeInvoice ? amountDue(activeInvoice) : 0;

  return (
    <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className={`border rounded-2xl w-full ${mode === 'customer_multi' ? 'max-w-2xl' : 'max-w-lg'} max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">
                {mode === 'customer_multi'
                  ? `Collect Customer Payment — ${targetCustomerName}`
                  : mode === 'job_advance'
                    ? `Collect Payment / Advance — ${jobCard?.jobId || ''}`
                    : `Collect Payment — ${activeInvoice?.invoiceNumber || ''}`}
              </h3>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {targetCustomerName}{targetCustomerPhone ? ` · ${targetCustomerPhone}` : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Job Advance Target Selector */}
          {mode === 'job_advance' && (
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Apply Payment To
              </label>
              <select
                value={selectedJobInvoiceId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedJobInvoiceId(id);
                  const found = invoices.find(i => i.id === id);
                  if (found) setAmountInput(String(amountDue(found)));
                }}
                className={`w-full rounded-lg px-3 py-2 text-xs font-medium focus:outline-none ${
                  isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                }`}
              >
                {pendingJobInvoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    Invoice #{inv.invoiceNumber} — Balance Due: ₹{amountDue(inv).toLocaleString('en-IN')}
                  </option>
                ))}
                <option value="">Job Card Advance / Unbilled Receipt ({jobCard?.jobId})</option>
              </select>
            </div>
          )}

          {/* Single Invoice Summary */}
          {activeInvoice && mode !== 'customer_multi' && (
            <div className={`p-3.5 rounded-xl border grid grid-cols-3 gap-2 text-xs ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <span className="text-slate-400">Invoice Total</span>
                <p className="font-mono font-bold text-sm mt-0.5">₹{activeInvoice.grandTotal.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <span className="text-slate-400">Already Paid</span>
                <p className="font-mono font-bold text-sm text-emerald-500 mt-0.5">
                  ₹{(activeInvoice.paidAmount || 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Current Balance</span>
                <p className="font-mono font-bold text-sm text-rose-500 mt-0.5">
                  ₹{currentInvDue.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          )}

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Payment Amount (₹) *
                </label>
                {activeInvoice && currentInvDue > 0 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAmountInput(String(round2(currentInvDue / 2)))}
                      className="text-[10px] font-bold text-blue-500 hover:underline cursor-pointer"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmountInput(String(currentInvDue))}
                      className="text-[10px] font-bold text-emerald-500 hover:underline cursor-pointer"
                    >
                      Full (₹{currentInvDue.toLocaleString('en-IN')})
                    </button>
                  </div>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="Enter amount received"
                className={`w-full rounded-lg px-3 py-2 text-sm font-mono font-bold focus:outline-none ${
                  isDark ? 'bg-slate-950 border border-slate-800 text-emerald-400' : 'bg-white border border-slate-300 text-emerald-700'
                }`}
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                  isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Customer Multi-Invoice Allocation Table */}
          {mode === 'customer_multi' && custSummary && (
            <div className={`p-3.5 rounded-xl border space-y-2.5 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-xs font-bold">
                    Allocate Across Pending Invoices ({custSummary.pendingInvoices.length})
                  </span>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Total Pending: ₹{custSummary.totalPending.toLocaleString('en-IN')} · Allocated: ₹{allocatedTotal.toLocaleString('en-IN')}
                    {unallocatedCredit > 0 ? ` · Unallocated Advance Credit: ₹${unallocatedCredit.toLocaleString('en-IN')}` : ''}
                  </p>
                </div>
                {custSummary.pendingInvoices.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAutoAllocateFifo}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  >
                    <Wand2 className="w-3 h-3" /> Auto-Allocate Oldest First
                  </button>
                )}
              </div>

              {custSummary.pendingInvoices.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">
                  No pending invoices — full amount will be saved as Unallocated Customer Advance / Credit.
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
                  {custSummary.pendingInvoices.map(inv => {
                    const due = amountDue(inv);
                    const val = allocAmounts[inv.id] || 0;
                    return (
                      <div key={inv.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                        <label className="flex items-center gap-2 min-w-0 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={val > 0}
                            onChange={(e) => {
                              setAllocAmounts(prev => ({
                                ...prev,
                                [inv.id]: e.target.checked ? due : 0,
                              }));
                            }}
                            className="rounded border-slate-300 text-blue-600 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <span className="font-mono font-bold text-blue-500">{inv.invoiceNumber}</span>
                            <span className={`ml-1.5 text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {inv.date} · Due ₹{due.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={due}
                          step="0.01"
                          value={val || ''}
                          placeholder="0"
                          onChange={(e) => {
                            const num = Math.max(0, Math.min(due, Number(e.target.value) || 0));
                            setAllocAmounts(prev => ({ ...prev, [inv.id]: num }));
                          }}
                          className={`w-28 rounded-lg px-2 py-1 text-xs font-mono font-bold text-right ${
                            isDark ? 'bg-slate-900 border border-slate-700 text-emerald-400' : 'bg-white border border-slate-300 text-emerald-700'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Mandatory Payment Mode & Account Selector */}
          <PaymentAccountSelector
            paymentModeChoice={paymentModeChoice}
            onChangePaymentModeChoice={setPaymentModeChoice}
            accountType={accountType}
            onChangeAccountType={setAccountType}
            bankAccountId={bankAccountId}
            onChangeBankAccountId={setBankAccountId}
            transactionRef={transactionRef}
            onChangeTransactionRef={setTransactionRef}
            bankAccounts={bankAccounts}
            isDark={isDark}
          />

          {/* Notes */}
          <div>
            <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Notes / Remarks
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional payment note or receipt remarks"
              className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
              }`}
            />
          </div>

          {formError && (
            <div className="p-2.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-500 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className={`flex items-center justify-end gap-2 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer ${
                isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : `Record ₹${numericAmount.toLocaleString('en-IN')} Payment`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
