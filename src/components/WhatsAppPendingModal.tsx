import React, { useEffect, useState } from 'react';
import { Invoice } from '../types';
import { useSgs } from '../context/SgsContext';
import { buildCustomerPendingWhatsAppMessage, formatWhatsAppPhone } from '../utils/moneyFlow';
import { X, MessageSquare, Copy, Check, ExternalLink, AlertCircle } from 'lucide-react';

export interface WhatsAppPendingModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  customerPhone?: string;
  pendingInvoices: Pick<Invoice, 'invoiceNumber' | 'date' | 'grandTotal' | 'paidAmount'>[];
  totalOutstanding?: number;
}

export const WhatsAppPendingModal: React.FC<WhatsAppPendingModalProps> = ({
  isOpen,
  onClose,
  customerName,
  customerPhone = '',
  pendingInvoices,
  totalOutstanding,
}) => {
  const { adminSettings, theme } = useSgs();
  const isDark = theme === 'dark';

  const [phone, setPhone] = useState(customerPhone || '');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPhone(customerPhone || '');
    setMessage(
      buildCustomerPendingWhatsAppMessage({
        customerName,
        pendingInvoices,
        totalOutstanding,
        workshopName: adminSettings.workshopName || 'Spider Grid Solutions, Madurai',
        workshopPhone: (adminSettings.workshopPhone || '9176795665').replace(/^\+91\s*/, ''),
        workshopUpiId: adminSettings.workshopUpiId || '9176795665@okbizaxis',
      })
    );
    setCopied(false);
  }, [isOpen, customerName, customerPhone, pendingInvoices, totalOutstanding, adminSettings]);

  if (!isOpen) return null;

  const waDigits = formatWhatsAppPhone(phone);
  const waUrl = waDigits ? `https://wa.me/${waDigits}?text=${encodeURIComponent(message)}` : '';

  const handleCopy = () => {
    try {
      navigator.clipboard?.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="sgs-modal-backdrop z-[70]">
      <div
        className={`sgs-modal-sheet sm:max-w-lg border shadow-2xl overflow-y-auto overscroll-contain animate-in fade-in zoom-in-95 duration-150 ${
          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className={`px-5 py-3.5 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Share Payment Pending via WhatsApp</h3>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {customerName} · {pendingInvoices.length} pending bill(s)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3.5">
          <div>
            <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Customer WhatsApp Number *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile number e.g. 9876543210"
              className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
              }`}
            />
            {!waDigits && (
              <p className="text-[11px] text-amber-500 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3 h-3" /> Enter a valid phone number to enable the WhatsApp link.
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Message Preview (Editable)
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-semibold text-blue-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </button>
            </div>
            <textarea
              rows={10}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={`w-full rounded-xl p-3 text-xs font-mono leading-relaxed focus:outline-none ${
                isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-slate-50 border border-slate-300 text-slate-800'
              }`}
            />
          </div>

          <div className={`flex items-center justify-end gap-2 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer ${
                isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Close
            </button>
            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md shadow-emerald-600/20"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Open WhatsApp</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-400 rounded-lg cursor-not-allowed"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Open WhatsApp</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
