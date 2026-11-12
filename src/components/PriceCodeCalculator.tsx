import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  ArrowRightLeft, 
  Copy, 
  Check, 
  Settings, 
  History, 
  AlertTriangle, 
  RotateCcw, 
  Save, 
  X, 
  Sparkles, 
  ShieldCheck, 
  Tag, 
  TrendingUp, 
  KeyRound,
  ArrowRight,
  Info,
  CheckCircle2
} from 'lucide-react';
import { useSgs } from '../context/SgsContext';
import { DigitChar, PriceCodeMapping } from '../types';
import { 
  DEFAULT_PRICE_CODE_MAPPING, 
  encodeAmountToCode, 
  decodeCodeToAmount, 
  validateMapping,
  calculateSaleMinimum,
  isSaleRateBelowMinimum
} from '../utils/priceCode';

const DIGIT_ORDER: DigitChar[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

export const PriceCodeCalculator: React.FC = () => {
  const { 
    theme, 
    activePriceCodeMapping, 
    priceCodeMappingVersions, 
    updatePriceCodeMapping, 
    resetPriceCodeMappingToDefault 
  } = useSgs();
  const isDark = theme === 'dark';

  // Navigation tab inside Price Code Calculator
  const [activeTab, setActiveTab] = useState<'converter' | 'calculator' | 'settings'>('converter');

  // Converter Tab State
  const [converterMode, setConverterMode] = useState<'amountToCode' | 'codeToAmount'>('amountToCode');
  const [amountInput, setAmountInput] = useState<string>('600');
  const [codeInput, setCodeInput] = useState<string>('HMM');
  const [selectedVersionForDecode, setSelectedVersionForDecode] = useState<number>(() => {
    return priceCodeMappingVersions[0]?.version || 1;
  });

  // Price Calculation Section State
  const [calcBuyAmount, setCalcBuyAmount] = useState<string>('550');
  const [calcProfitAmount, setCalcProfitAmount] = useState<string>('50');
  const [calcAdditionalSalePrice, setCalcAdditionalSalePrice] = useState<string>('700');

  // Mapping Settings State (Draft for editing)
  const [draftMapping, setDraftMapping] = useState<PriceCodeMapping>(() => ({ ...activePriceCodeMapping }));
  const [mappingNotes, setMappingNotes] = useState<string>('');
  const [mappingValidationMsg, setMappingValidationMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Synchronize draft mapping when active mapping changes outside or on reset
  React.useEffect(() => {
    setDraftMapping({ ...activePriceCodeMapping });
  }, [activePriceCodeMapping]);

  // Determine active mapping for decoder (can be older version or current)
  const decodeMapping = useMemo(() => {
    const found = priceCodeMappingVersions.find(v => v.version === selectedVersionForDecode);
    return found ? found.mapping : activePriceCodeMapping;
  }, [selectedVersionForDecode, priceCodeMappingVersions, activePriceCodeMapping]);

  // Amount -> Code Computation
  const amountToCodeResult = useMemo(() => {
    return encodeAmountToCode(amountInput, activePriceCodeMapping);
  }, [amountInput, activePriceCodeMapping]);

  // Code -> Amount Computation
  const codeToAmountResult = useMemo(() => {
    return decodeCodeToAmount(codeInput, decodeMapping);
  }, [codeInput, decodeMapping]);

  // Price Calculation Computations
  const numBuy = Math.round(Number(calcBuyAmount) || 0);
  const numProfit = Math.round(Number(calcProfitAmount) || 0);
  const numAdditional = calcAdditionalSalePrice.trim() !== '' ? Math.round(Number(calcAdditionalSalePrice) || 0) : null;

  const saleMinimum = useMemo(() => {
    return calculateSaleMinimum(numBuy, numProfit);
  }, [numBuy, numProfit]);

  const saleMinimumCodeResult = useMemo(() => {
    if (saleMinimum <= 0) return { code: '' };
    return encodeAmountToCode(saleMinimum, activePriceCodeMapping);
  }, [saleMinimum, activePriceCodeMapping]);

  const additionalSalePriceCodeResult = useMemo(() => {
    if (numAdditional === null || isNaN(numAdditional) || numAdditional <= 0) return { code: '' };
    return encodeAmountToCode(numAdditional, activePriceCodeMapping);
  }, [numAdditional, activePriceCodeMapping]);

  const isBelowMinimumWarning = useMemo(() => {
    if (numAdditional === null) return false;
    return isSaleRateBelowMinimum(numAdditional, saleMinimum);
  }, [numAdditional, saleMinimum]);

  // Profit reference percentage click handler
  const handleApplyProfitPercent = (pct: number) => {
    if (numBuy > 0) {
      const calculatedProfit = Math.round((numBuy * pct) / 100);
      setCalcProfitAmount(String(calculatedProfit));
    }
  };

  // Mapping Edit Handlers
  const handleDraftLetterChange = (digit: DigitChar, value: string) => {
    const clean = value.replace(/[^a-zA-Z]/g, '').slice(-1).toUpperCase();
    setDraftMapping(prev => ({
      ...prev,
      [digit]: clean
    }));
    setMappingValidationMsg(null);
  };

  const handleSaveMapping = () => {
    const val = validateMapping(draftMapping);
    if (!val.isValid) {
      setMappingValidationMsg({ type: 'error', text: val.error || 'Invalid mapping' });
      return;
    }
    const res = updatePriceCodeMapping(draftMapping, mappingNotes || undefined);
    if (res.success) {
      setMappingValidationMsg({ type: 'success', text: 'Mapping settings saved successfully! New version created.' });
      setMappingNotes('');
      setTimeout(() => setMappingValidationMsg(null), 3500);
    } else {
      setMappingValidationMsg({ type: 'error', text: res.error || 'Failed to save mapping' });
    }
  };

  const handleResetMappingToDefault = () => {
    if (window.confirm('Reset mapping to default SGS Secret Code (S-R-I-O-C-H-A-N-D-M)?')) {
      resetPriceCodeMappingToDefault();
      setDraftMapping({ ...DEFAULT_PRICE_CODE_MAPPING });
      setMappingValidationMsg({ type: 'success', text: 'Reset to default SGS mapping (v1)!' });
      setTimeout(() => setMappingValidationMsg(null), 3000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Header Banner */}
      <div className={`p-6 rounded-2xl border transition-colors ${
        isDark 
          ? 'bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border-slate-800' 
          : 'bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white border-blue-100 shadow-xs'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  SGS Price Code Calculator
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Secret Sticker Code
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Confidential digit-to-letter pricing codes for physical retail stock stickers and margin calculation
              </p>
            </div>
          </div>

          {/* Quick Active Mapping Badge */}
          <div className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs ${
            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <span className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Active Mapping:</span>
            <div className="flex items-center gap-1 font-mono font-bold text-blue-600 dark:text-blue-400">
              {DIGIT_ORDER.map(d => (
                <span key={d} title={`${d} = ${activePriceCodeMapping[d]}`}>
                  {activePriceCodeMapping[d]}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('converter')}
            className={`flex items-center gap-2 pb-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'converter'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Amount ↔ Secret Code Converter</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calculator')}
            className={`flex items-center gap-2 pb-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'calculator'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Price & Minimum Sale Calculator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 pb-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'settings'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Mapping Settings & Version History</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              v{priceCodeMappingVersions[0]?.version || 1}
            </span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: CONVERTER (Amount -> Code & Code -> Amount)       */}
      {/* ======================================================== */}
      {activeTab === 'converter' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* SECTION A: Amount -> Code */}
          <div className={`p-6 rounded-2xl border space-y-5 ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  ₹
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Section A: Amount → Secret Code
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Convert numeric rupee amount into secret sticker code
                  </p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                Encode
              </span>
            </div>

            {/* Input Field */}
            <div className="space-y-1.5">
              <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Enter Rupee Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                  ₹
                </span>
                <input
                  type="text"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="e.g. 600, 700, 1250..."
                  className={`w-full rounded-xl pl-8 pr-4 py-3 text-base font-mono font-bold focus:outline-none transition-all ${
                    amountToCodeResult.error
                      ? 'border-rose-500 focus:border-rose-500 bg-rose-50/20 text-rose-600'
                      : isDark
                      ? 'bg-slate-950 border border-slate-800 text-white focus:border-blue-500'
                      : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
                  }`}
                />
              </div>

              {/* Validation error if any */}
              {amountToCodeResult.error && (
                <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium pt-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{amountToCodeResult.error}</span>
                </div>
              )}
            </div>

            {/* Quick Test Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400">Quick Test Samples:</span>
              <div className="flex flex-wrap gap-1.5">
                {['500', '550', '600', '700', '1250', '2500'].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmountInput(val)}
                    className={`px-2.5 py-1 text-xs rounded-lg border font-mono transition-colors cursor-pointer ${
                      amountInput === val
                        ? 'bg-blue-600 text-white border-blue-600 font-bold'
                        : isDark
                        ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    ₹{val}
                  </button>
                ))}
              </div>
            </div>

            {/* Generated Secret Code Output Card */}
            <div className={`p-4 rounded-xl border space-y-3 transition-colors ${
              amountToCodeResult.code
                ? (isDark ? 'bg-blue-950/20 border-blue-800/80' : 'bg-blue-50/80 border-blue-200')
                : (isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200')
            }`}>
              <div className="flex items-center justify-between text-xs">
                <span className={`font-semibold uppercase tracking-wider text-[11px] ${
                  isDark ? 'text-blue-300' : 'text-blue-900'
                }`}>
                  Generated Secret Code
                </span>
                {amountToCodeResult.code && (
                  <button
                    type="button"
                    onClick={() => handleCopy(amountToCodeResult.code, 'encoded')}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                  >
                    {copiedKey === 'encoded' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="flex items-baseline justify-between gap-4">
                <div className="font-mono text-3xl font-extrabold tracking-widest text-blue-600 dark:text-blue-400">
                  {amountToCodeResult.code || '— — —'}
                </div>
                {amountToCodeResult.code && (
                  <div className="text-right text-[11px] font-mono text-slate-400">
                    Length: {amountToCodeResult.code.length} chars
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between">
                <span>Original Amount: <strong>₹{amountInput || '0'}</strong></span>
                <span>Code to write on item: <strong className="font-mono text-blue-600 dark:text-blue-400">{amountToCodeResult.code || '—'}</strong></span>
              </div>
            </div>
          </div>

          {/* SECTION B: Code -> Amount */}
          <div className={`p-6 rounded-2xl border space-y-5 ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Section B: Secret Code → Amount
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Decode secret sticker code back into rupee amount
                  </p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                Decode
              </span>
            </div>

            {/* Input Field + Version Selector */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Enter Secret Code <span className="text-rose-500">*</span>
                  </label>
                  {/* Mapping Version selector */}
                  {priceCodeMappingVersions.length > 1 && (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-slate-400">Mapping:</span>
                      <select
                        value={selectedVersionForDecode}
                        onChange={(e) => setSelectedVersionForDecode(Number(e.target.value))}
                        className={`rounded px-1.5 py-0.5 text-[11px] font-mono ${
                          isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {priceCodeMappingVersions.map(v => (
                          <option key={v.version} value={v.version}>
                            v{v.version} {v.version === priceCodeMappingVersions[0].version ? '(Active)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. HMM, AMM, SRCM..."
                  className={`w-full rounded-xl px-4 py-3 text-base font-mono font-bold tracking-widest uppercase focus:outline-none transition-all ${
                    codeToAmountResult.error
                      ? 'border-rose-500 focus:border-rose-500 bg-rose-50/20 text-rose-600'
                      : isDark
                      ? 'bg-slate-950 border border-slate-800 text-white focus:border-indigo-500'
                      : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-indigo-600'
                  }`}
                />

                {/* Validation error if any */}
                {codeToAmountResult.error && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium pt-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{codeToAmountResult.error}</span>
                  </div>
                )}
              </div>

              {/* Quick Sample Code Chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400">Sample Sticker Codes:</span>
                <div className="flex flex-wrap gap-1.5">
                  {['CMM', 'CCM', 'HMM', 'AMM', 'SRCM', 'RCMM'].map(code => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setCodeInput(code)}
                      className={`px-2.5 py-1 text-xs rounded-lg border font-mono font-bold transition-colors cursor-pointer ${
                        codeInput === code
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : isDark
                          ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Decoded Rupee Amount Output Card */}
            <div className={`p-4 rounded-xl border space-y-3 transition-colors ${
              codeToAmountResult.amount !== undefined
                ? (isDark ? 'bg-indigo-950/20 border-indigo-800/80' : 'bg-indigo-50/80 border-indigo-200')
                : (isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200')
            }`}>
              <div className="flex items-center justify-between text-xs">
                <span className={`font-semibold uppercase tracking-wider text-[11px] ${
                  isDark ? 'text-indigo-300' : 'text-indigo-900'
                }`}>
                  Decoded Selling Rate
                </span>
                {codeToAmountResult.amount !== undefined && (
                  <button
                    type="button"
                    onClick={() => handleCopy(String(codeToAmountResult.amount), 'decoded')}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
                  >
                    {copiedKey === 'decoded' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Amount</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="flex items-baseline justify-between gap-4">
                <div className="font-mono text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                  {codeToAmountResult.amount !== undefined
                    ? `₹${codeToAmountResult.amount.toLocaleString('en-IN')}`
                    : '— — —'}
                </div>
                {codeToAmountResult.amount !== undefined && (
                  <div className="text-right text-[11px] font-mono text-slate-400">
                    Whole Rupees
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between">
                <span>Decoded From: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{codeInput || '—'}</strong></span>
                <span>Using Version: <strong>v{selectedVersionForDecode}</strong></span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: PRICE & MINIMUM SALE CALCULATOR                   */}
      {/* ======================================================== */}
      {activeTab === 'calculator' && (
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border space-y-6 ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4 border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-blue-600" />
                  Price Calculation & Minimum Sale Threshold
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Calculate target minimum selling price from buy amount + profit, and generate sticker codes
                </p>
              </div>
              <div className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Sale Minimum = Buy Amount + Profit Amount
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* Field 1: Buy Amount */}
              <div className="space-y-1.5">
                <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  1. Buy Amount (Cost Price ₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={calcBuyAmount}
                    onChange={(e) => setCalcBuyAmount(e.target.value)}
                    placeholder="e.g. 550"
                    className={`w-full rounded-xl pl-7 pr-3 py-2 text-sm font-mono font-bold focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <p className="text-[10px] text-slate-400">Actual hardware purchase cost</p>
              </div>

              {/* Field 2: Profit Amount + Reference Percentages */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    2. Profit Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Reference:</span>
                </div>
                
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={calcProfitAmount}
                    onChange={(e) => setCalcProfitAmount(e.target.value)}
                    placeholder="e.g. 50"
                    className={`w-full rounded-xl pl-7 pr-3 py-2 text-sm font-mono font-bold text-emerald-600 focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>

                {/* Optional Percentage Reference Buttons */}
                <div className="flex items-center gap-1 pt-1">
                  <span className="text-[10px] text-slate-400">Quick %:</span>
                  {[10, 20, 30, 40, 50].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleApplyProfitPercent(pct)}
                      className={`px-1.5 py-0.5 text-[10px] rounded font-bold transition-colors cursor-pointer border ${
                        isDark 
                          ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 
                          : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                      title={`Set profit to ${pct}% of Buy Amount (₹${Math.round((numBuy * pct) / 100)})`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 5: Additional Sale Price */}
              <div className="space-y-1.5">
                <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  5. Additional Sale Price (Target Rate ₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={calcAdditionalSalePrice}
                    onChange={(e) => setCalcAdditionalSalePrice(e.target.value)}
                    placeholder="e.g. 700"
                    className={`w-full rounded-xl pl-7 pr-3 py-2 text-sm font-mono font-bold focus:outline-none ${
                      isBelowMinimumWarning
                        ? 'border-amber-500 bg-amber-50/20 text-amber-600'
                        : isDark
                        ? 'bg-slate-950 border border-slate-800 text-white'
                        : 'bg-slate-50 border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <p className="text-[10px] text-slate-400">Optional higher retail rate to generate secondary code</p>
              </div>

            </div>

            {/* Warning Message if Additional Sale Price is below Sale Minimum */}
            {isBelowMinimumWarning && (
              <div className="p-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800/80 text-amber-800 dark:text-amber-200 flex items-start gap-2.5 text-xs animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Warning: Sale Rate is below Minimum Sale Price.</strong>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                    Target sale price ₹{numAdditional} is lower than calculated minimum ₹{saleMinimum} (Buy ₹{numBuy} + Profit ₹{numProfit}).
                    This is an advisory warning only; saving is allowed.
                  </p>
                </div>
              </div>
            )}

            {/* Calculated Results Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              
              {/* Result 1: Sale Minimum & Sale Minimum Code */}
              <div className={`p-4 rounded-xl border space-y-2.5 transition-all ${
                isDark ? 'bg-emerald-950/20 border-emerald-800/80' : 'bg-emerald-50 border-emerald-300 shadow-xs'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                    3. Calculated Sale Minimum
                  </span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-700 text-white dark:bg-emerald-800 dark:text-emerald-100 font-extrabold shadow-xs">
                    Floor Price
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <div className="font-mono text-2xl font-black text-slate-900 dark:text-white">
                    ₹{saleMinimum.toLocaleString('en-IN')}
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">4. Sale Minimum Code:</span>
                    <span className="font-mono text-2xl font-black tracking-wider text-emerald-700 dark:text-emerald-400">
                      {saleMinimumCodeResult.code || '—'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-emerald-200 dark:border-emerald-900/60 text-xs">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Buy ₹{numBuy} + Profit ₹{numProfit}
                  </span>
                  {saleMinimumCodeResult.code && (
                    <button
                      type="button"
                      onClick={() => handleCopy(saleMinimumCodeResult.code, 'min_code')}
                      className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 hover:underline cursor-pointer"
                    >
                      {copiedKey === 'min_code' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Copied Code</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Code ({saleMinimumCodeResult.code})</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Result 2: Additional Sale Price Code */}
              <div className={`p-4 rounded-xl border space-y-2.5 transition-all ${
                isDark ? 'bg-blue-950/20 border-blue-800/80' : 'bg-blue-50 border-blue-300 shadow-xs'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-blue-900 dark:text-blue-300">
                    6. Additional Sale Price Code
                  </span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-700 text-white dark:bg-blue-800 dark:text-blue-100 font-extrabold shadow-xs">
                    Retail Sticker Code
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <div className="font-mono text-2xl font-black text-slate-900 dark:text-white">
                    {numAdditional !== null ? `₹${numAdditional.toLocaleString('en-IN')}` : '—'}
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">Sticker Code:</span>
                    <span className="font-mono text-2xl font-black tracking-wider text-blue-700 dark:text-blue-400">
                      {additionalSalePriceCodeResult.code || '—'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-blue-200 dark:border-blue-900/60 text-xs">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    {numAdditional !== null && numBuy > 0 
                      ? `Margin: ₹${numAdditional - numBuy} (${Math.round(((numAdditional - numBuy) / numBuy) * 100)}%)` 
                      : 'Temporary calculation'}
                  </span>
                  {additionalSalePriceCodeResult.code && (
                    <button
                      type="button"
                      onClick={() => handleCopy(additionalSalePriceCodeResult.code, 'add_code')}
                      className="flex items-center gap-1 text-[11px] font-bold text-blue-800 dark:text-blue-300 hover:underline cursor-pointer"
                    >
                      {copiedKey === 'add_code' ? (
                        <>
                          <Check className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          <span>Copied Code</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Code ({additionalSalePriceCodeResult.code})</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* Note on temporary calculation */}
            <div className="flex items-center gap-2 text-[11px] text-slate-400 italic">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>Calculations in this section are temporary workspace scratchpad figures and are not persisted to database.</span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: MAPPING SETTINGS & VERSION HISTORY                */}
      {/* ======================================================== */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border space-y-6 ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  Editable Secret Price Code Mapping
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure the 10 letters mapped to digits 0–9. Accessible to all CRM users.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetMappingToDefault}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                  title="Reset to default S-R-I-O-C-H-A-N-D-M"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Default</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveMapping}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Mapping</span>
                </button>
              </div>
            </div>

            {/* Validation Feedback Banner */}
            {mappingValidationMsg && (
              <div className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                mappingValidationMsg.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300'
              }`}>
                {mappingValidationMsg.type === 'error' ? (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
                <span>{mappingValidationMsg.text}</span>
              </div>
            )}

            {/* 10-Digit Mapping Grid */}
            <div className="space-y-3">
              <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Digit ↔ Letter Mapping (Each digit must have a unique letter A–Z)
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2.5">
                {DIGIT_ORDER.map(digit => {
                  const letter = draftMapping[digit] || '';
                  const isDuplicate = Object.entries(draftMapping).some(
                    ([d, l]) => d !== digit && l === letter && letter !== ''
                  );

                  return (
                    <div 
                      key={digit}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                        isDuplicate
                          ? 'border-rose-500 bg-rose-50/30'
                          : isDark
                          ? 'bg-slate-950 border-slate-800'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-400">
                        Digit {digit}
                      </span>
                      <input
                        type="text"
                        maxLength={1}
                        value={letter}
                        onChange={(e) => handleDraftLetterChange(digit, e.target.value)}
                        className={`w-10 h-10 rounded-lg text-center font-mono font-extrabold text-lg uppercase focus:outline-none ${
                          isDuplicate
                            ? 'bg-rose-100 text-rose-700 border border-rose-300'
                            : isDark
                            ? 'bg-slate-900 border border-slate-700 text-blue-400 focus:border-blue-500'
                            : 'bg-white border border-slate-300 text-blue-600 focus:border-blue-600 shadow-2xs'
                        }`}
                      />
                      {isDuplicate && (
                        <span className="text-[9px] text-rose-500 font-bold">Duplicate</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Version Note */}
              <div className="pt-2">
                <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Version Note / Description (Optional)
                </label>
                <input
                  type="text"
                  value={mappingNotes}
                  onChange={(e) => setMappingNotes(e.target.value)}
                  placeholder="e.g. Q4 2026 Updated Secret Code"
                  className={`w-full rounded-lg px-3 py-1.5 text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            {/* Version History Table */}
            <div className="border-t pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-blue-500" />
                    Mapping Version History ({priceCodeMappingVersions.length} versions recorded)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Older sticker codes on warehouse hardware can be decoded using their originating version
                  </p>
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {priceCodeMappingVersions.map((ver, idx) => {
                  const isCurrent = idx === 0;
                  return (
                    <div
                      key={ver.version}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                        isCurrent
                          ? (isDark ? 'bg-blue-950/20 border-blue-900/60' : 'bg-blue-50/50 border-blue-200')
                          : (isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50/60 border-slate-200')
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                          isCurrent
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          v{ver.version}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>{ver.notes || `Mapping Version ${ver.version}`}</span>
                            {isCurrent && (
                              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded font-bold">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(ver.createdAt).toLocaleString('en-IN')} · By {ver.changedBy || 'CRM User'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wider">
                          {DIGIT_ORDER.map(d => `${d}:${ver.mapping[d]}`).join(' ')}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedVersionForDecode(ver.version);
                            setActiveTab('converter');
                            setConverterMode('codeToAmount');
                          }}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                            isDark ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          Use in Decoder
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
