import React from 'react';
import { BankAccount, PaymentAccountType, PaymentModeChoice } from '../types';
import { Wallet, Landmark, Smartphone, MoreHorizontal, AlertCircle } from 'lucide-react';

export interface PaymentAccountSelectorProps {
  paymentModeChoice: PaymentModeChoice;
  onChangePaymentModeChoice: (choice: PaymentModeChoice) => void;
  accountType: PaymentAccountType;
  onChangeAccountType: (t: PaymentAccountType) => void;
  bankAccountId: string;
  onChangeBankAccountId: (id: string) => void;
  transactionRef?: string;
  onChangeTransactionRef?: (ref: string) => void;
  bankAccounts: BankAccount[];
  isDark: boolean;
  showReferenceInput?: boolean;
  labelPrefix?: string;
  validationError?: string | null;
}

export const PaymentAccountSelector: React.FC<PaymentAccountSelectorProps> = ({
  paymentModeChoice,
  onChangePaymentModeChoice,
  accountType,
  onChangeAccountType,
  bankAccountId,
  onChangeBankAccountId,
  transactionRef = '',
  onChangeTransactionRef,
  bankAccounts,
  isDark,
  showReferenceInput = true,
  labelPrefix = 'Payment Mode & Account',
  validationError,
}) => {
  const activeBanks = bankAccounts.filter(b => b.isActive);

  const handleModeClick = (choice: PaymentModeChoice) => {
    onChangePaymentModeChoice(choice);
    if (choice === 'cash') {
      onChangeAccountType('cash');
      onChangeBankAccountId('');
    } else if (choice === 'bank') {
      onChangeAccountType('bank');
      if (!bankAccountId && activeBanks.length > 0) {
        onChangeBankAccountId(activeBanks[0].id);
      }
    } else {
      // UPI or Other: keep current accountType or auto-fill first bank if bank selected
      if (accountType === 'bank' && !bankAccountId && activeBanks.length > 0) {
        onChangeBankAccountId(activeBanks[0].id);
      }
    }
  };

  const modes: { id: PaymentModeChoice; label: string; icon: React.ReactNode }[] = [
    { id: 'cash', label: 'Cash', icon: <Wallet className="w-3.5 h-3.5" /> },
    { id: 'bank', label: 'Bank', icon: <Landmark className="w-3.5 h-3.5" /> },
    { id: 'upi', label: 'UPI', icon: <Smartphone className="w-3.5 h-3.5" /> },
    { id: 'other', label: 'Other', icon: <MoreHorizontal className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-3">
      <div>
        <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {labelPrefix} *
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {modes.map(m => {
            const active = paymentModeChoice === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleModeClick(m.id)}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {m.icon}
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Account destination logic */}
      {paymentModeChoice === 'cash' && (
        <div className={`px-3 py-2 rounded-lg border text-xs flex items-center gap-2 ${
          isDark ? 'bg-amber-950/30 border-amber-800/50 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <Wallet className="w-3.5 h-3.5 shrink-0" />
          <span>Automatically recorded in <strong>Cash Account (Cash in Hand)</strong></span>
        </div>
      )}

      {paymentModeChoice === 'bank' && (
        <div>
          <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Select Bank Account *
          </label>
          <select
            value={bankAccountId}
            onChange={(e) => {
              onChangeAccountType('bank');
              onChangeBankAccountId(e.target.value);
            }}
            className={`w-full rounded-lg px-3 py-2 text-xs font-medium focus:outline-none ${
              isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
            }`}
          >
            <option value="">-- Choose Active Bank Account --</option>
            {activeBanks.map(b => (
              <option key={b.id} value={b.id}>
                {b.bankName} ({b.accountNumber ? `••${b.accountNumber.slice(-4)}` : b.accountType})
              </option>
            ))}
          </select>
        </div>
      )}

      {(paymentModeChoice === 'upi' || paymentModeChoice === 'other') && (
        <div className="space-y-2">
          <div>
            <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {paymentModeChoice === 'upi' ? 'UPI Account Destination *' : 'Actual Settlement Account *'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onChangeAccountType('cash');
                  onChangeBankAccountId('');
                }}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                  accountType === 'cash'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-300'
                      : 'bg-white border-slate-300 text-slate-700'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Cash Account</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeAccountType('bank');
                  if (!bankAccountId && activeBanks.length > 0) {
                    onChangeBankAccountId(activeBanks[0].id);
                  }
                }}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                  accountType === 'bank'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-300'
                      : 'bg-white border-slate-300 text-slate-700'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                <span>Specific Bank Account</span>
              </button>
            </div>
          </div>

          {accountType === 'bank' && (
            <div>
              <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Which Bank Account? *
              </label>
              <select
                value={bankAccountId}
                onChange={(e) => onChangeBankAccountId(e.target.value)}
                className={`w-full rounded-lg px-3 py-2 text-xs font-medium focus:outline-none ${
                  isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                }`}
              >
                <option value="">-- Select Bank Account --</option>
                {activeBanks.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} ({b.accountNumber ? `••${b.accountNumber.slice(-4)}` : b.accountType})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {showReferenceInput && onChangeTransactionRef && (
        <div>
          <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {paymentModeChoice === 'other'
              ? 'Payment Reference / Mode Description * (Required for Other)'
              : 'Transaction Ref / UTR / Cheque No'}
          </label>
          <input
            type="text"
            value={transactionRef}
            onChange={(e) => onChangeTransactionRef(e.target.value)}
            placeholder={
              paymentModeChoice === 'other'
                ? 'e.g. Card / Cheque #20491 / Wallet adjustment'
                : paymentModeChoice === 'upi'
                  ? 'e.g. UPI Ref 429104820129'
                  : 'e.g. IMPS/NEFT Ref or Voucher #'
            }
            className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
              isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
            }`}
          />
        </div>
      )}

      {validationError && (
        <div className="p-2.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-500 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
};
