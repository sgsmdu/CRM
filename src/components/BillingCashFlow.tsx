import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, 
  IndianRupee, 
  Plus, 
  Printer, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  X, 
  Trash2,
  DollarSign,
  TrendingUp,
  Receipt,
  Copy,
  Ban,
  Edit3,
  Eye,
  Camera,
  Maximize2,
  Tag,
  Sparkles,
  Boxes,
  Building2,
  Palette,
  ShieldCheck,
  Check,
  Layers,
  ChevronDown,
  ArrowLeft,
  Save
} from 'lucide-react';
import { useSgs } from '../context/SgsContext';
import { Invoice, InvoiceItem, CashFlowEntry, PaymentMode, BillingFirm, BillingTheme, PandiyanBillingTheme, InventoryItem, Customer } from '../types';
import { 
  SgsLogo, 
  SgsStamp, 
  PandiyanLogo, 
  PandiyanStamp, 
  SGS_THEMES, 
  PANDIYAN_THEMES 
} from '../utils/brandAssets';
import { 
  calculateFromInclusiveRate, 
  calculateFromBaseRate, 
  calculateInvoiceSummary, 
  GST_PRESET_RATES, 
  COMMON_IT_HSN_CODES,
  ItemGstCalculation,
  suggestGstRate,
  numberToWordsIndian
} from '../utils/gstUtils';

interface BillingCashFlowProps {
  initialJobId?: string | null;
  onClearInitialJobId?: () => void;
}

export const BillingCashFlow: React.FC<BillingCashFlowProps> = ({ initialJobId, onClearInitialJobId }) => {
  const { 
    customers, 
    jobCards, 
    invoices, 
    cashFlow, 
    addInvoice, 
    updateInvoice, 
    updateInvoicePayment, 
    cancelInvoice, 
    duplicateInvoice, 
    deleteInvoice, 
    convertQuotationToInvoice,
    addCashFlowEntry, 
    adminSettings, 
    inventory,
    theme 
  } = useSgs();
  
  const isDark = theme === 'dark';

  // Tabs
  const [activeTab, setActiveTab] = useState<'invoices' | 'cashflow'>('invoices');
  const [docTypeFilter, setDocTypeFilter] = useState<'all' | 'invoice' | 'quotation'>('all');

  // Modals
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [printableInvoice, setPrintableInvoice] = useState<Invoice | null>(null);
  const [zoomedBillPhoto, setZoomedBillPhoto] = useState<string | null>(null);
  const [confirmConvertModal, setConfirmConvertModal] = useState<Invoice | null>(null);
  const [convertToast, setConvertToast] = useState<string | null>(null);

  // Form State: Create / Edit Invoice / Quotation
  const [invoiceType, setInvoiceType] = useState<'invoice' | 'quotation'>('invoice');
  const [billingFirm, setBillingFirm] = useState<BillingFirm>('sgs');
  const [docTheme, setDocTheme] = useState<BillingTheme>(adminSettings.billingTheme || 'modern_navy');
  const [pandiyanDocTheme, setPandiyanDocTheme] = useState<PandiyanBillingTheme>(adminSettings.pandiyanBillingTheme || 'warm_amber');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [isStockPickerOpen, setIsStockPickerOpen] = useState(false);
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custArea, setCustArea] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [docDate, setDocDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Line items with HSN and purchase cost
  const [docItems, setDocItems] = useState<InvoiceItem[]>([
    { description: 'Computer & Laptop General Service', hsnCode: '998713', quantity: 1, rate: 850, amount: 850, purchaseCost: 0, isService: true },
  ]);
  const [gstPercent, setGstPercent] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'partial' | 'unpaid'>('paid');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('upi');
  const [paymentReference, setPaymentReference] = useState('');
  const [paidAmount, setPaidAmount] = useState<number>(850);
  const [discount, setDiscount] = useState<number>(0);
  const [roundOff, setRoundOff] = useState<number>(0);
  const [autoRoundOff, setAutoRoundOff] = useState<boolean>(false);
  const [isInterState, setIsInterState] = useState<boolean>(false);
  const [manualExtraCost, setManualExtraCost] = useState<number>(0);
  const [invoiceNotes, setInvoiceNotes] = useState('Thank you for trusting Spider Grid Solutions! Spares carry 1-year warranty.');
  const [attachedBillImage, setAttachedBillImage] = useState<string | null>(null);

  // Form State: Add Manual Expense
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expenseCategory, setExpenseCategory] = useState('Workshop Rent & Electricity');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseMode, setExpenseMode] = useState<PaymentMode>('upi');
  const [expenseRef, setExpenseRef] = useState('');

  // Payment Quick Update Modal
  const [quickPayInvoice, setQuickPayInvoice] = useState<Invoice | null>(null);
  const [quickPayAmount, setQuickPayAmount] = useState<number>(0);
  const [quickPayStatus, setQuickPayStatus] = useState<'paid' | 'partial' | 'unpaid'>('paid');
  const [quickPayMode, setQuickPayMode] = useState<PaymentMode>('upi');
  const [quickPayRef, setQuickPayRef] = useState('');

  // Filter
  const [searchInvoices, setSearchInvoices] = useState('');

  // Calculations
  const activeInvoices = invoices.filter(inv => inv.status !== 'cancelled');

  const totalIncome = cashFlow
    .filter(c => c.type === 'income')
    .reduce((sum, c) => sum + c.amount, 0);

  const totalExpense = cashFlow
    .filter(c => c.type === 'expense')
    .reduce((sum, c) => sum + c.amount, 0);

  const netBalance = totalIncome - totalExpense;

  // Profit, GST & Invoice calculations using robust unified GST engine
  const invoiceSummary = useMemo(() => {
    return calculateInvoiceSummary(
      docItems.map(it => ({
        description: it.description,
        quantity: it.quantity,
        rate: it.rate,
        grossRate: it.grossRate,
        gstPercent: billingFirm === 'pandiyan' ? 0 : (it.gstPercent !== undefined ? it.gstPercent : (gstPercent || 0)),
        purchaseCost: it.purchaseCost,
        purchaseCostWithGst: it.purchaseCostWithGst,
        purchaseGstPercent: it.purchaseGstPercent !== undefined ? it.purchaseGstPercent : (it.gstPercent ?? 18),
        isService: it.isService,
        discount: it.discount,
      })),
      {
        invoiceDiscount: Number(discount) || 0,
        manualExtraCost: Number(manualExtraCost) || 0,
        roundOffAdjustment: Number(roundOff) || 0,
        autoRoundOff,
        isInterState,
        isNonGstFirm: billingFirm === 'pandiyan',
      }
    );
  }, [docItems, discount, manualExtraCost, roundOff, autoRoundOff, isInterState, billingFirm, gstPercent]);

  const subtotalCalc = invoiceSummary.subtotal;
  const taxCalc = invoiceSummary.totalTax;
  const grandTotalCalc = invoiceSummary.grandTotal;
  const totalPurchaseCostCalc = invoiceSummary.totalCostOfGoods;
  const totalPurchaseCostWithGstCalc = invoiceSummary.totalCostOfGoodsWithGst;
  const netProfitCalc = invoiceSummary.netProfit;
  const taxableProfitCalc = invoiceSummary.taxableProfit;
  const profitMarginPercentCalc = invoiceSummary.profitMarginPercent;

  // Auto-fill and keep paidAmount in sync when paymentStatus is 'paid'
  useEffect(() => {
    if (paymentStatus === 'paid') {
      setPaidAmount(grandTotalCalc);
    }
  }, [grandTotalCalc, paymentStatus]);

  // Draft Auto-Save States & Handlers
  const [draftSavedTime, setDraftSavedTime] = useState<string | null>(null);
  const [hasPendingDraft, setHasPendingDraft] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem('sgs_billing_draft');
    } catch {
      return false;
    }
  });

  // Continuous Auto-Save when form is open
  useEffect(() => {
    if (!isCreateInvoiceOpen) return;
    const timer = setTimeout(() => {
      if (custName.trim() || docItems.some(it => it.description.trim())) {
        const draftData = {
          editingInvoiceId,
          invoiceType,
          billingFirm,
          docTheme,
          pandiyanDocTheme,
          selectedCustomerId,
          customerSearchInput,
          custName,
          custPhone,
          custArea,
          selectedJobId,
          docDate,
          docItems,
          gstPercent,
          paymentStatus,
          paymentMode,
          paymentReference,
          paidAmount,
          discount,
          roundOff,
          manualExtraCost,
          invoiceNotes,
          savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        try {
          localStorage.setItem('sgs_billing_draft', JSON.stringify(draftData));
          setDraftSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          setHasPendingDraft(true);
        } catch (e) {
          console.warn('Failed to auto-save billing draft', e);
        }
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [
    isCreateInvoiceOpen,
    editingInvoiceId,
    invoiceType,
    billingFirm,
    docTheme,
    pandiyanDocTheme,
    selectedCustomerId,
    customerSearchInput,
    custName,
    custPhone,
    custArea,
    selectedJobId,
    docDate,
    docItems,
    gstPercent,
    paymentStatus,
    paymentMode,
    paymentReference,
    paidAmount,
    discount,
    roundOff,
    manualExtraCost,
    invoiceNotes,
  ]);

  const handleCloseWithAutoSave = () => {
    if (custName.trim() || docItems.length > 0) {
      const draftData = {
        editingInvoiceId,
        invoiceType,
        billingFirm,
        docTheme,
        pandiyanDocTheme,
        selectedCustomerId,
        customerSearchInput,
        custName,
        custPhone,
        custArea,
        selectedJobId,
        docDate,
        docItems,
        gstPercent,
        paymentStatus,
        paymentMode,
        paymentReference,
        paidAmount,
        discount,
        roundOff,
        manualExtraCost,
        invoiceNotes,
        savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      try {
        localStorage.setItem('sgs_billing_draft', JSON.stringify(draftData));
        setHasPendingDraft(true);
      } catch (e) {
        console.warn('Failed to save draft on close', e);
      }
    }
    setIsCreateInvoiceOpen(false);
  };

  const handleRestoreDraft = () => {
    try {
      const saved = localStorage.getItem('sgs_billing_draft');
      if (!saved) return;
      const d = JSON.parse(saved);
      setEditingInvoiceId(d.editingInvoiceId || null);
      setInvoiceType(d.invoiceType || 'invoice');
      setBillingFirm(d.billingFirm || 'sgs');
      setDocTheme(d.docTheme || adminSettings.billingTheme || 'modern_navy');
      setPandiyanDocTheme(d.pandiyanDocTheme || adminSettings.pandiyanBillingTheme || 'warm_amber');
      setSelectedCustomerId(d.selectedCustomerId || '');
      setCustomerSearchInput(d.customerSearchInput || '');
      setCustName(d.custName || '');
      setCustPhone(d.custPhone || '');
      setCustArea(d.custArea || '');
      setSelectedJobId(d.selectedJobId || '');
      setDocDate(d.docDate || new Date().toISOString().split('T')[0]);
      if (Array.isArray(d.docItems) && d.docItems.length > 0) setDocItems(d.docItems);
      setGstPercent(d.gstPercent !== undefined ? d.gstPercent : (d.billingFirm === 'pandiyan' ? 0 : 18));
      setPaymentStatus(d.paymentStatus || 'paid');
      setPaymentMode(d.paymentMode || 'upi');
      setPaymentReference(d.paymentReference || '');
      setPaidAmount(d.paidAmount || 0);
      setDiscount(d.discount || 0);
      setRoundOff(d.roundOff || 0);
      setManualExtraCost(d.manualExtraCost || 0);
      setInvoiceNotes(d.invoiceNotes || '');
      setIsCreateInvoiceOpen(true);
    } catch (e) {
      console.warn('Failed to restore draft', e);
    }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem('sgs_billing_draft');
    setHasPendingDraft(false);
  };


  const handleCustomerSelect = (id: string) => {
    setSelectedCustomerId(id);
    const found = customers.find(c => c.id === id);
    if (found) {
      setCustName(found.name);
      setCustPhone(found.phone);
      setCustArea(found.area);
    }
  };

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    const foundJob = jobCards.find(j => j.id === jobId || j.jobId === jobId);
    if (foundJob) {
      setCustName(foundJob.customerName);
      setCustPhone(foundJob.customerPhone);
      setCustArea(foundJob.customerArea);
      const est = foundJob.finalCost > 0 ? foundJob.finalCost : foundJob.estimatedCost;
      const defaultPct = billingFirm === 'pandiyan' ? 0 : (adminSettings.defaultGstPercent || 18);
      const calc = calculateFromInclusiveRate(est || 1200, defaultPct, 1);
      setDocItems([
        {
          description: `${foundJob.deviceBrand} - ${foundJob.issueDescription}`,
          hsnCode: adminSettings.defaultHsnCode || '998713',
          quantity: 1,
          grossRate: est || 1200,
          gstPercent: defaultPct,
          rate: calc.baseRate,
          amount: calc.baseAmount,
          gstAmount: calc.totalGst,
          totalWithGst: calc.totalWithGst,
          purchaseCost: 0,
        }
      ]);
      setPaidAmount(est || 1200);
    }
  };

  const handleAddDocItem = () => {
    const defaultPct = billingFirm === 'pandiyan' ? 0 : (adminSettings.defaultGstPercent || 18);
    setDocItems([
      ...docItems, 
      { 
        description: '', 
        hsnCode: billingFirm === 'pandiyan' ? undefined : (adminSettings.defaultHsnCode || '998713'), 
        quantity: 1, 
        unit: 'Nos',
        rate: 0, 
        grossRate: 0,
        gstPercent: defaultPct,
        gstAmount: 0,
        totalWithGst: 0,
        amount: 0, 
        purchaseCost: 0, 
        purchaseCostWithGst: 0,
        purchaseGstPercent: defaultPct,
        totalPurchaseCost: 0,
        totalPurchaseCostWithGst: 0,
        itemProfit: 0,
        isService: false 
      }
    ]);
  };

  const handleSelectStockItem = (inv: InventoryItem) => {
    const defaultPct = billingFirm === 'pandiyan' ? 0 : (adminSettings.defaultGstPercent || 18);
    const unitP = inv.unitPrice || 0;
    const calc = calculateFromInclusiveRate(unitP, defaultPct, 1);
    const baseCost = inv.unitCost || 0;
    const costGross = defaultPct > 0 ? Math.round(baseCost * (1 + defaultPct / 100) * 100) / 100 : baseCost;
    setDocItems(prev => [
      ...prev,
      {
        description: inv.name,
        hsnCode: billingFirm === 'pandiyan' ? undefined : (inv.hsnCode || '8471'),
        quantity: 1,
        unit: 'Nos',
        grossRate: unitP,
        gstPercent: defaultPct,
        rate: calc.baseRate,
        amount: calc.baseAmount,
        gstAmount: calc.totalGst,
        totalWithGst: calc.totalWithGst,
        purchaseCost: baseCost,
        purchaseCostWithGst: costGross,
        purchaseGstPercent: defaultPct,
        totalPurchaseCost: baseCost,
        totalPurchaseCostWithGst: costGross,
        itemProfit: Math.round((calc.totalWithGst - costGross) * 100) / 100,
        isService: false,
        inventoryItemId: inv.id,
      }
    ]);
    setIsStockPickerOpen(false);
    setStockSearchQuery('');
  };

  const handleAddServiceItem = (name = 'Computer & Laptop General Service', rate = 850, hsn = '998713') => {
    const defaultPct = billingFirm === 'pandiyan' ? 0 : (adminSettings.defaultGstPercent || 18);
    const calc = calculateFromInclusiveRate(rate, defaultPct, 1);
    setDocItems(prev => [
      ...prev,
      {
        description: name,
        hsnCode: billingFirm === 'pandiyan' ? undefined : hsn,
        quantity: 1,
        unit: 'Job',
        grossRate: rate,
        gstPercent: defaultPct,
        rate: calc.baseRate,
        amount: calc.baseAmount,
        gstAmount: calc.totalGst,
        totalWithGst: calc.totalWithGst,
        purchaseCost: 0,
        purchaseCostWithGst: 0,
        purchaseGstPercent: defaultPct,
        totalPurchaseCost: 0,
        totalPurchaseCostWithGst: 0,
        itemProfit: calc.totalWithGst,
        isService: true,
      }
    ]);
  };

  const handleRemoveDocItem = (index: number) => {
    setDocItems(docItems.filter((_, i) => i !== index));
  };

  const handleDocItemChange = (index: number, field: keyof InvoiceItem | 'discount', value: any) => {
    const updated = [...docItems];
    const current = { ...updated[index] };
    const defaultPct = billingFirm === 'pandiyan' ? 0 : (adminSettings.defaultGstPercent || 18);
    const itPct = current.gstPercent !== undefined ? current.gstPercent : defaultPct;
    const qty = field === 'quantity' ? Math.max(1, Number(value) || 1) : Math.max(1, current.quantity || 1);
    const disc = field === 'discount' ? Math.max(0, Number(value) || 0) : Math.max(0, current.discount || 0);
    const isServ = field === 'isService' ? Boolean(value) : Boolean(current.isService);

    // Helper for spare buy costs
    const computeSpares = (base: number, gross: number, pGst: number, isServiceItem: boolean) => {
      if (isServiceItem) {
        return {
          purchaseCost: 0,
          purchaseCostWithGst: 0,
          totalPurchaseCost: 0,
          totalPurchaseCostWithGst: 0,
        };
      }
      let b = base;
      let g = gross;
      if (g > 0 && b === 0) {
        b = pGst > 0 ? Math.round((g / (1 + pGst / 100)) * 100) / 100 : g;
      } else if (b > 0 && g === 0) {
        g = pGst > 0 ? Math.round((b * (1 + pGst / 100)) * 100) / 100 : b;
      }
      const totalB = Math.round(b * qty * 100) / 100;
      const totalG = Math.round(g * qty * 100) / 100;
      return {
        purchaseCost: b,
        purchaseCostWithGst: g,
        totalPurchaseCost: totalB,
        totalPurchaseCostWithGst: totalG,
      };
    };

    // Pandiyan Computers: Completely Non-GST firm - direct rate * qty - discount, 0 tax
    if (billingFirm === 'pandiyan') {
      const unitP = field === 'grossRate' || field === 'rate'
        ? Math.max(0, Number(value) || 0)
        : (current.grossRate !== undefined ? current.grossRate : (current.rate || 0));
      const totalAmt = Number(Math.max(0, (unitP * qty) - disc).toFixed(2));
      const pCost = field === 'purchaseCost' || field === 'purchaseCostWithGst'
        ? Math.max(0, Number(value) || 0)
        : (current.purchaseCostWithGst || current.purchaseCost || 0);
      const totalSpares = isServ ? 0 : Math.round(pCost * qty * 100) / 100;
      const profit = Math.round((totalAmt - totalSpares) * 100) / 100;

      updated[index] = {
        ...current,
        rate: unitP,
        grossRate: unitP,
        gstPercent: 0,
        quantity: qty,
        discount: disc,
        amount: totalAmt,
        gstAmount: 0,
        totalWithGst: totalAmt,
        isService: isServ,
        purchaseCost: isServ ? 0 : pCost,
        purchaseCostWithGst: isServ ? 0 : pCost,
        totalPurchaseCost: totalSpares,
        totalPurchaseCostWithGst: totalSpares,
        itemProfit: profit,
      };
      if (field !== 'grossRate' && field !== 'rate' && field !== 'quantity' && field !== 'discount' && field !== 'purchaseCost' && field !== 'purchaseCostWithGst' && field !== 'isService') {
        updated[index] = { ...updated[index], [field]: value };
      }
      setDocItems(updated);
      return;
    }

    // SGS Firm (GST Enabled)
    let nextGross = current.grossRate;
    let nextRate = current.rate;
    let nextGstPct = itPct;
    let nextHsn = current.hsnCode;

    if (field === 'hsnCode') {
      nextHsn = String(value);
      const suggested = suggestGstRate(nextHsn);
      if (suggested !== null) {
        nextGstPct = suggested;
      }
    }

    if (field === 'grossRate') {
      nextGross = Math.max(0, Number(value) || 0);
      const calc = calculateFromInclusiveRate(nextGross, nextGstPct, qty, disc, isInterState);
      nextRate = calc.baseRate;
    } else if (field === 'rate') {
      nextRate = Math.max(0, Number(value) || 0);
      const calc = calculateFromBaseRate(nextRate, nextGstPct, qty, disc, isInterState);
      nextGross = calc.grossRate;
    } else if (field === 'gstPercent') {
      nextGstPct = Math.max(0, Number(value) || 0);
      if (nextGross !== undefined && nextGross > 0) {
        const calc = calculateFromInclusiveRate(nextGross, nextGstPct, qty, disc, isInterState);
        nextRate = calc.baseRate;
      } else {
        const calc = calculateFromBaseRate(nextRate || 0, nextGstPct, qty, disc, isInterState);
        nextGross = calc.grossRate;
      }
    }

    let lineCalc: ItemGstCalculation;
    if (nextGross !== undefined && nextGross > 0) {
      lineCalc = calculateFromInclusiveRate(nextGross, nextGstPct, qty, disc, isInterState);
    } else {
      lineCalc = calculateFromBaseRate(nextRate || 0, nextGstPct, qty, disc, isInterState);
    }

    // Spare costs with GST
    let baseSpare = field === 'purchaseCost' ? Math.max(0, Number(value) || 0) : (current.purchaseCost || 0);
    let grossSpare = field === 'purchaseCostWithGst' ? Math.max(0, Number(value) || 0) : (current.purchaseCostWithGst || 0);

    if (field === 'purchaseCost') {
      grossSpare = nextGstPct > 0 ? Math.round(baseSpare * (1 + nextGstPct / 100) * 100) / 100 : baseSpare;
    } else if (field === 'purchaseCostWithGst') {
      baseSpare = nextGstPct > 0 ? Math.round((grossSpare / (1 + nextGstPct / 100)) * 100) / 100 : grossSpare;
    } else if (baseSpare > 0 && grossSpare === 0) {
      grossSpare = nextGstPct > 0 ? Math.round(baseSpare * (1 + nextGstPct / 100) * 100) / 100 : baseSpare;
    }

    const spareData = computeSpares(baseSpare, grossSpare, nextGstPct, isServ);
    const itemProfit = Math.round((lineCalc.totalWithGst - spareData.totalPurchaseCostWithGst) * 100) / 100;

    updated[index] = {
      ...current,
      description: field === 'description' ? value : current.description,
      hsnCode: nextHsn,
      unit: field === 'unit' ? value : (current.unit || 'Nos'),
      quantity: qty,
      discount: disc,
      gstPercent: nextGstPct,
      rate: lineCalc.baseRate,
      grossRate: nextGross,
      amount: lineCalc.taxableAmount,
      gstAmount: lineCalc.totalGst,
      totalWithGst: lineCalc.totalWithGst,
      cgstAmount: lineCalc.cgst,
      sgstAmount: lineCalc.sgst,
      igstAmount: lineCalc.igst,
      isService: isServ,
      purchaseCost: spareData.purchaseCost,
      purchaseCostWithGst: spareData.purchaseCostWithGst,
      purchaseGstPercent: nextGstPct,
      totalPurchaseCost: spareData.totalPurchaseCost,
      totalPurchaseCostWithGst: spareData.totalPurchaseCostWithGst,
      itemProfit,
    };

    if (field !== 'description' && field !== 'hsnCode' && field !== 'unit' && field !== 'quantity' && field !== 'discount' && field !== 'gstPercent' && field !== 'rate' && field !== 'grossRate' && field !== 'purchaseCost' && field !== 'purchaseCostWithGst' && field !== 'isService') {
      updated[index] = { ...updated[index], [field]: value };
    }

    setDocItems(updated);
  };

  // 1-Click Verification Test Entry (User requested: "neeyea oru entry pattu eppati work athunu paru")
  const handleLoadTestEntry = () => {
    const testCust = customers[0] || { id: 'cust-karthik', name: 'Karthik Raja', phone: '+91 98421 55678', area: 'KK Nagar, Madurai' };
    setSelectedCustomerId(testCust.id);
    setCustName(testCust.name);
    setCustPhone(testCust.phone);
    setCustArea(testCust.area || 'Madurai');

    const nvmeItem = inventory.find(i => i.name.toLowerCase().includes('ssd')) || inventory[0];
    const ramItem = inventory.find(i => i.name.toLowerCase().includes('ram')) || inventory[1];

    const item1Calc = calculateFromBaseRate(2200, 18, 1, 0, false);
    const item2Calc = calculateFromInclusiveRate(1770, 18, 1, 0, false);
    const item3Calc = calculateFromBaseRate(650, 18, 1, 0, false);

    setDocItems([
      {
        inventoryItemId: nvmeItem?.id,
        description: nvmeItem?.name || 'Crucial BX500 480GB 2.5 Inch SATA SSD',
        hsnCode: nvmeItem?.hsnCode || '8471',
        quantity: 1,
        unit: 'Nos',
        rate: item1Calc.baseRate,
        grossRate: item1Calc.grossRate,
        gstPercent: 18,
        discount: 0,
        amount: item1Calc.taxableAmount,
        gstAmount: item1Calc.totalGst,
        totalWithGst: item1Calc.totalWithGst,
        purchaseCost: 1750,
        purchaseCostWithGst: 2065,
        purchaseGstPercent: 18,
        totalPurchaseCost: 1750,
        totalPurchaseCostWithGst: 2065,
        itemProfit: 531,
        isService: false,
      },
      {
        inventoryItemId: ramItem?.id,
        description: ramItem?.name || 'Corsair Vengeance 8GB DDR4 3200MHz RAM',
        hsnCode: ramItem?.hsnCode || '8471',
        quantity: 1,
        unit: 'Nos',
        rate: item2Calc.baseRate,
        grossRate: item2Calc.grossRate,
        gstPercent: 18,
        discount: 0,
        amount: item2Calc.taxableAmount,
        gstAmount: item2Calc.totalGst,
        totalWithGst: item2Calc.totalWithGst,
        purchaseCost: 1150,
        purchaseCostWithGst: 1357,
        purchaseGstPercent: 18,
        totalPurchaseCost: 1150,
        totalPurchaseCostWithGst: 1357,
        itemProfit: 413,
        isService: false,
      },
      {
        description: 'Laptop High Speed SSD & RAM Installation + OS Service',
        hsnCode: '998713',
        quantity: 1,
        unit: 'Job',
        rate: item3Calc.baseRate,
        grossRate: item3Calc.grossRate,
        gstPercent: 18,
        discount: 0,
        amount: item3Calc.taxableAmount,
        gstAmount: item3Calc.totalGst,
        totalWithGst: item3Calc.totalWithGst,
        purchaseCost: 0,
        purchaseCostWithGst: 0,
        purchaseGstPercent: 18,
        totalPurchaseCost: 0,
        totalPurchaseCostWithGst: 0,
        itemProfit: 767,
        isService: true,
      }
    ]);
    setIsInterState(false);
    setDiscount(50);
    setRoundOff(0);
    setAutoRoundOff(false);
    setManualExtraCost(0);
    setInvoiceNotes('Verified Test Bill: SSD & RAM from stock + Labor service. Profit calculated as (Sale Amount with GST - Buy Cost with GST)!');
  };

  const handleAddPresetItem = (preset: { name: string; hsn: string; rate: number; cost: number }) => {
    const defaultPct = billingFirm === 'pandiyan' ? 0 : (adminSettings.defaultGstPercent || 18);
    const calc = calculateFromInclusiveRate(preset.rate, defaultPct, 1);
    setDocItems(prev => [
      ...prev,
      {
        description: preset.name,
        hsnCode: billingFirm === 'pandiyan' ? undefined : preset.hsn,
        quantity: 1,
        grossRate: preset.rate,
        gstPercent: defaultPct,
        rate: calc.baseRate,
        amount: calc.baseAmount,
        gstAmount: calc.totalGst,
        totalWithGst: calc.totalWithGst,
        purchaseCost: preset.cost,
        isService: preset.cost === 0,
      }
    ]);
  };

  // Open Create Modal from Scratch
  const handleOpenCreateModal = (firm: BillingFirm = 'sgs') => {
    setEditingInvoiceId(null);
    setInvoiceType('invoice');
    setBillingFirm(firm);
    setDocTheme(adminSettings.billingTheme || 'modern_navy');
    setPandiyanDocTheme(adminSettings.pandiyanBillingTheme || 'warm_amber');
    setSelectedCustomerId('');
    setCustomerSearchInput('');
    setCustName('');
    setCustPhone('');
    setCustArea('');
    setSelectedJobId('');
    const defPct = firm === 'pandiyan' ? 0 : (adminSettings.defaultGstPercent || 18);
    const initCalc = calculateFromInclusiveRate(850, defPct, 1);
    setDocItems([
      { 
        description: 'Computer & Laptop General Service', 
        hsnCode: firm === 'pandiyan' ? undefined : (adminSettings.defaultHsnCode || '998713'), 
        quantity: 1, 
        grossRate: 850,
        gstPercent: defPct,
        rate: firm === 'pandiyan' ? 850 : initCalc.baseRate, 
        amount: firm === 'pandiyan' ? 850 : initCalc.baseAmount, 
        gstAmount: firm === 'pandiyan' ? 0 : initCalc.totalGst,
        totalWithGst: 850,
        purchaseCost: 0, 
        isService: true 
      }
    ]);
    setGstPercent(defPct);
    setDiscount(0);
    setRoundOff(0);
    setPaymentStatus('paid');
    setPaymentMode('upi');
    setPaymentReference('');
    setPaidAmount(850);
    setManualExtraCost(0);
    setAttachedBillImage(null);
    setInvoiceNotes(firm === 'pandiyan' ? 'Thank you for choosing Pandiyan Computers! Valid for 7 days.' : 'Thank you for trusting Spider Grid Solutions! Spares carry 1-year warranty.');
    setIsCreateInvoiceOpen(true);
  };

  // Open Create Modal Pre-filled for a specific Job Card
  const handleOpenCreateModalForJob = (job: any) => {
    setEditingInvoiceId(null);
    setInvoiceType('invoice');
    setBillingFirm('sgs');
    setDocTheme(adminSettings.billingTheme || 'modern_navy');
    setSelectedCustomerId(job.customerId);
    setCustomerSearchInput(job.customerName);
    setCustName(job.customerName);
    setCustPhone(job.customerPhone);
    setCustArea(job.customerArea || '');
    setSelectedJobId(job.id);
    const defPct = adminSettings.defaultGstPercent || 18;
    const gross = job.estimatedCost || 850;
    const initCalc = calculateFromInclusiveRate(gross, defPct, 1);
    setDocItems([
      {
        description: `${job.deviceType} (${job.brandModel}) - Repair & Service [${job.reportedIssue}]`,
        hsnCode: adminSettings.defaultHsnCode || '998713',
        quantity: 1,
        grossRate: gross,
        gstPercent: defPct,
        rate: initCalc.baseRate,
        amount: initCalc.baseAmount,
        gstAmount: initCalc.totalGst,
        totalWithGst: gross,
        purchaseCost: 0,
        isService: true,
      }
    ]);
    setGstPercent(defPct);
    setDiscount(0);
    setRoundOff(0);
    const advance = job.advancePaid || 0;
    setPaymentStatus(advance >= gross ? 'paid' : (advance > 0 ? 'partial' : 'unpaid'));
    setPaymentMode('upi');
    setPaymentReference('');
    setPaidAmount(advance > 0 ? advance : gross);
    setManualExtraCost(0);
    setAttachedBillImage(null);
    setInvoiceNotes(`Repair & service completed for Job Card #${job.jobCardNumber}. Spares carry 1-year warranty.`);
    setIsCreateInvoiceOpen(true);
  };

  // Effect to handle navigation from Job Card "Bill Now"
  useEffect(() => {
    if (!initialJobId) return;

    // Check if quotation or invoice already exists for this job
    const existingQuot = invoices.find(i => i.jobCardId === initialJobId && i.type === 'quotation' && i.status !== 'cancelled');
    if (existingQuot) {
      setViewingInvoice(existingQuot);
      setConfirmConvertModal(existingQuot);
      onClearInitialJobId?.();
      return;
    }

    const existingInv = invoices.find(i => i.jobCardId === initialJobId && i.type === 'invoice' && i.status !== 'cancelled');
    if (existingInv) {
      setViewingInvoice(existingInv);
      onClearInitialJobId?.();
      return;
    }

    const job = jobCards.find(j => j.id === initialJobId);
    if (job) {
      handleOpenCreateModalForJob(job);
    }
    onClearInitialJobId?.();
  }, [initialJobId, invoices, jobCards]);

  // Open Edit Modal for Existing Bill
  const handleOpenEditModal = (inv: Invoice) => {
    setEditingInvoiceId(inv.id);
    setInvoiceType(inv.type);
    setBillingFirm(inv.billingFirm || 'sgs');
    setDocTheme(inv.theme || adminSettings.billingTheme || 'modern_navy');
    setPandiyanDocTheme(inv.pandiyanTheme || adminSettings.pandiyanBillingTheme || 'warm_amber');
    setSelectedCustomerId(inv.customerId || '');
    setCustomerSearchInput(inv.customerName);
    setCustName(inv.customerName);
    setCustPhone(inv.customerPhone);
    setCustArea(inv.customerArea || '');
    setSelectedJobId(inv.jobCardId || '');
    setDocDate(inv.date);
    setDiscount(inv.discount || 0);
    setRoundOff(inv.roundOff || 0);
    setDocItems(inv.items.map(it => {
      const itGst = it.gstPercent !== undefined ? it.gstPercent : (inv.billingFirm === 'pandiyan' ? 0 : (inv.gstPercent || 0));
      const gross = it.grossRate !== undefined ? it.grossRate : (it.rate * (1 + itGst / 100));
      const calc = calculateFromInclusiveRate(gross, itGst, it.quantity);
      return {
        description: it.description,
        hsnCode: inv.billingFirm === 'pandiyan' ? undefined : (it.hsnCode || '998713'),
        quantity: it.quantity,
        grossRate: gross,
        gstPercent: inv.billingFirm === 'pandiyan' ? 0 : itGst,
        rate: inv.billingFirm === 'pandiyan' ? gross : (it.rate || calc.baseRate),
        amount: inv.billingFirm === 'pandiyan' ? Number((gross * it.quantity).toFixed(2)) : (it.amount || calc.baseAmount),
        gstAmount: inv.billingFirm === 'pandiyan' ? 0 : (it.gstAmount !== undefined ? it.gstAmount : calc.totalGst),
        totalWithGst: it.totalWithGst !== undefined ? it.totalWithGst : calc.totalWithGst,
        purchaseCost: it.purchaseCost || 0,
        isService: it.isService,
        inventoryItemId: it.inventoryItemId,
      };
    }));
    setGstPercent(inv.billingFirm === 'pandiyan' ? 0 : (inv.gstPercent || 0));
    setPaymentStatus(inv.paymentStatus === 'cancelled' ? 'unpaid' : inv.paymentStatus);
    setPaymentMode(inv.paymentMode || 'upi');
    setPaymentReference(inv.paymentReference || '');
    setPaidAmount(inv.paidAmount);
    setManualExtraCost(inv.manualExtraCost || 0);
    setAttachedBillImage(inv.attachedBillImage || null);
    setInvoiceNotes(inv.notes || '');
    setViewingInvoice(null);
    setIsCreateInvoiceOpen(true);
  };

  // Attach photo
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      setAttachedBillImage(b64);
    };
    reader.readAsDataURL(file);
  };

  // Submit invoice create / edit
  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || docItems.length === 0) {
      alert('Please fill customer name and at least one item');
      return;
    }

    const nextNo = invoices.length + 1043;
    let prefix = 'SGS-INV-';
    if (billingFirm === 'pandiyan') {
      prefix = invoiceType === 'quotation' ? 'PC-QUOT-' : 'PC-EST-';
    } else {
      prefix = invoiceType === 'quotation' ? 'SGS-QUOT-' : (adminSettings.invoicePrefix || 'SGS-INV-');
    }
    const invoiceNumber = `${prefix}${nextNo}`;
    const effectiveGstPercent = billingFirm === 'pandiyan' ? 0 : gstPercent;
    const effectiveTaxAmount = billingFirm === 'pandiyan' ? 0 : invoiceSummary.totalTax;
    const effectiveDiscount = Number(discount) || 0;
    const effectiveRoundOff = Number(roundOff) || 0;
    const effectiveGrandTotal = invoiceSummary.grandTotal;

    if (editingInvoiceId) {
      // Update existing
      updateInvoice(editingInvoiceId, {
        type: invoiceType,
        billingFirm,
        theme: docTheme,
        pandiyanTheme: pandiyanDocTheme,
        customerId: selectedCustomerId || undefined,
        customerName: custName,
        customerPhone: custPhone,
        customerArea: custArea,
        jobCardId: selectedJobId || undefined,
        date: docDate,
        items: docItems,
        subtotal: invoiceSummary.subtotal,
        gstPercent: effectiveGstPercent,
        taxAmount: effectiveTaxAmount,
        cgstAmount: invoiceSummary.totalCgst,
        sgstAmount: invoiceSummary.totalSgst,
        igstAmount: invoiceSummary.totalIgst,
        isInterState: invoiceSummary.isInterState,
        discount: effectiveDiscount,
        roundOff: effectiveRoundOff,
        grandTotal: effectiveGrandTotal,
        paymentStatus,
        paymentMode,
        paymentReference: paymentReference.trim() || undefined,
        paidAmount: Number(paidAmount) || 0,
        purchaseCostTotal: invoiceSummary.totalCostOfGoods,
        totalPurchaseCostWithGst: invoiceSummary.totalCostOfGoodsWithGst,
        totalSaleWithGst: invoiceSummary.totalLinesWithGst,
        manualExtraCost: Number(manualExtraCost) || 0,
        profitAmount: invoiceSummary.netProfit,
        taxableProfit: invoiceSummary.taxableProfit,
        profitMarginPercent: invoiceSummary.profitMarginPercent,
        notes: invoiceNotes,
        attachedBillImage: attachedBillImage || undefined,
      });
    } else {
      // Create new
      addInvoice({
        invoiceNumber,
        type: invoiceType,
        billingFirm,
        theme: docTheme,
        pandiyanTheme: pandiyanDocTheme,
        customerId: selectedCustomerId || `cust-${Date.now()}`,
        customerName: custName,
        customerPhone: custPhone,
        customerArea: custArea,
        jobCardId: selectedJobId || undefined,
        date: docDate,
        items: docItems,
        subtotal: invoiceSummary.subtotal,
        gstPercent: effectiveGstPercent,
        taxAmount: effectiveTaxAmount,
        cgstAmount: invoiceSummary.totalCgst,
        sgstAmount: invoiceSummary.totalSgst,
        igstAmount: invoiceSummary.totalIgst,
        isInterState: invoiceSummary.isInterState,
        discount: effectiveDiscount,
        roundOff: effectiveRoundOff,
        grandTotal: effectiveGrandTotal,
        paymentStatus,
        paymentMode,
        paymentReference: paymentReference.trim() || undefined,
        paidAmount: Number(paidAmount) || 0,
        purchaseCostTotal: invoiceSummary.totalCostOfGoods,
        totalPurchaseCostWithGst: invoiceSummary.totalCostOfGoodsWithGst,
        totalSaleWithGst: invoiceSummary.totalLinesWithGst,
        manualExtraCost: Number(manualExtraCost) || 0,
        profitAmount: invoiceSummary.netProfit,
        taxableProfit: invoiceSummary.taxableProfit,
        profitMarginPercent: invoiceSummary.profitMarginPercent,
        notes: invoiceNotes,
        attachedBillImage: attachedBillImage || undefined,
      });
    }

    setIsCreateInvoiceOpen(false);
  };

  // Cancel Bill
  const handleCancelInvoice = (id: string) => {
    const reason = prompt('Reason for cancelling this bill / invoice:', 'Customer cancelled order / billing mistake');
    if (reason !== null) {
      cancelInvoice(id, reason);
      if (viewingInvoice?.id === id) {
        setViewingInvoice(null);
      }
    }
  };

  // Duplicate Bill
  const handleDuplicateInvoice = (id: string) => {
    try {
      const duplicated = duplicateInvoice(id);
      alert(`Duplicate invoice created: ${duplicated.invoiceNumber}`);
      setViewingInvoice(duplicated);
    } catch (err: any) {
      alert(`Failed to duplicate: ${err.message}`);
    }
  };

  // Submit quick payment update
  const handleSaveQuickPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPayInvoice) return;
    updateInvoicePayment(
      quickPayInvoice.id,
      Number(quickPayAmount),
      quickPayStatus,
      quickPayMode,
      quickPayRef.trim() || undefined
    );
    setQuickPayInvoice(null);
    setQuickPayRef('');
  };

  // Submit expense
  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc.trim() || expenseAmount <= 0) {
      alert('Please enter expense description and valid amount');
      return;
    }

    addCashFlowEntry({
      date: expenseDate,
      type: 'expense',
      category: expenseCategory,
      description: expenseDesc,
      amount: Number(expenseAmount),
      paymentMode: expenseMode,
      referenceNumber: expenseRef.trim() || undefined,
    });

    setIsAddExpenseOpen(false);
    setExpenseDesc('');
    setExpenseAmount(0);
    setExpenseRef('');
  };

  // Filtered invoices
  const filteredInvoices = invoices.filter(inv => {
    if (docTypeFilter !== 'all' && inv.type !== docTypeFilter) return false;
    const q = searchInvoices.toLowerCase().trim();
    if (!q) return true;
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q) ||
      inv.customerPhone.includes(q) ||
      (inv.customerArea && inv.customerArea.toLowerCase().includes(q)) ||
      (inv.paymentReference && inv.paymentReference.toLowerCase().includes(q)) ||
      inv.items.some(it => it.description.toLowerCase().includes(q) || (it.hsnCode && it.hsnCode.includes(q)))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Top Banner */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 transition-colors ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
      }`}>
        <div>
          <h2 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Billing, Invoicing & Workshop Cash Flow
          </h2>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            HSN codes, itemized profit/loss, UPI references, bill duplication, and printable slips
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddExpenseOpen(true)}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              isDark 
                ? 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800' 
                : 'bg-white border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Plus className="w-3.5 h-3.5 text-rose-500" />
            <span>Add Expense</span>
          </button>

          <button
            onClick={() => handleOpenCreateModal()}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Invoice / Quote</span>
          </button>
        </div>
      </div>

      {/* Auto-Saved Draft Alert Banner */}
      {hasPendingDraft && !isCreateInvoiceOpen && (
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-150 ${
          isDark ? 'bg-amber-950/30 border-amber-800/80 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900 shadow-xs'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0"></div>
            <div>
              <p className="text-xs font-bold">Unfinished Billing / Quotation Draft Auto-Saved</p>
              <p className="text-[11px] opacity-80">
                You have an auto-saved draft in local storage. Accidentally closed or refreshed? Click resume to continue!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="flex-1 sm:flex-none px-3.5 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg cursor-pointer shadow-xs transition-all"
            >
              Resume Draft
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('sgs_billing_draft');
                setHasPendingDraft(false);
              }}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 cursor-pointer"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards: Incomes, Spares Cost, Expenses & Profit Balance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Inflow */}
        <div className={`p-4 rounded-xl border transition-colors ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Total Collections (Inflow)
            </span>
            <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold font-mono mt-2 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
            ₹{totalIncome.toLocaleString('en-IN')}
          </div>
          <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Received across UPI, cash, & bank
          </p>
        </div>

        {/* Total Outflow */}
        <div className={`p-4 rounded-xl border transition-colors ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Total Expenses (Outflow)
            </span>
            <div className="w-7 h-7 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold font-mono mt-2 ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
            ₹{totalExpense.toLocaleString('en-IN')}
          </div>
          <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Vendor spares, rent & workshop
          </p>
        </div>

        {/* Net Cash Balance */}
        <div className={`p-4 rounded-xl border transition-colors ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Net Cash Flow
            </span>
            <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold font-mono mt-2 ${netBalance >= 0 ? (isDark ? 'text-white' : 'text-slate-900') : 'text-rose-500'}`}>
            ₹{netBalance.toLocaleString('en-IN')}
          </div>
          <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Current workshop reserve
          </p>
        </div>

        {/* Bill Profit Margin */}
        <div className={`p-4 rounded-xl border transition-colors ${
          isDark ? 'bg-emerald-950/20 border-emerald-800/60' : 'bg-emerald-50/70 border-emerald-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Total Invoicing Profit
            </span>
            <div className="w-7 h-7 rounded-full bg-emerald-600/20 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono mt-2 text-emerald-700 dark:text-emerald-400">
            ₹{activeInvoices.reduce((sum, inv) => sum + (inv.profitAmount || 0), 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] mt-1 text-emerald-800/80 dark:text-emerald-300/80">
            From {activeInvoices.length} active bills
          </p>
        </div>
      </div>

      {/* Auto-Saved Draft Banner */}
      {hasPendingDraft && !isCreateInvoiceOpen && (
        <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-200/80 dark:bg-amber-900/60 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-amber-700 dark:text-amber-300" />
            </div>
            <div>
              <p className="text-xs font-bold">Unsaved Billing / Quotation Draft Auto-Preserved</p>
              <p className="text-[11px] opacity-80">
                You have a draft automatically saved so you never lose progress.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
            >
              Resume Draft
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="px-3 py-1.5 text-xs font-medium text-amber-800 dark:text-amber-300 hover:underline cursor-pointer"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Tabs: Invoices vs Cash Flow */}
      <div className={`p-4 rounded-xl border space-y-4 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
      }`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className={`flex items-center gap-2 p-1 border rounded-lg ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'invoices' 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              Customer Invoices & Quotations ({invoices.length})
            </button>
            <button
              onClick={() => setActiveTab('cashflow')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'cashflow' 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              Cash Flow Ledger Entries ({cashFlow.length})
            </button>
          </div>

          {activeTab === 'invoices' && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`flex items-center p-0.5 border rounded-lg text-xs ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setDocTypeFilter('all')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                    docTypeFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                  }`}
                >
                  All ({invoices.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDocTypeFilter('invoice')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                    docTypeFilter === 'invoice'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : (isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                  }`}
                >
                  Tax Invoices ({invoices.filter(i => i.type === 'invoice').length})
                </button>
                <button
                  type="button"
                  onClick={() => setDocTypeFilter('quotation')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                    docTypeFilter === 'quotation'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : (isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-700 hover:text-amber-800')
                  }`}
                >
                  <span>Quotations</span>
                  <span className={`font-mono text-[10px] px-1 rounded font-bold ${
                    docTypeFilter === 'quotation' ? 'bg-black/30 text-white' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {invoices.filter(i => i.type === 'quotation').length}
                  </span>
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
                <input
                  type="text"
                  value={searchInvoices}
                  onChange={(e) => setSearchInvoices(e.target.value)}
                  placeholder="Search doc #, customer, HSN, UPI ref..."
                  className={`w-full rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none ${
                    isDark 
                      ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                      : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
                  }`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Tab 1: Invoices Table */}
        {activeTab === 'invoices' && (
          <div className={`rounded-xl border overflow-hidden ${
            isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-white'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`border-b uppercase tracking-wider text-[11px] font-semibold ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <tr>
                    <th className="py-3 px-4">Doc # (Click to View)</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 font-mono">Billed Total</th>
                    <th className="py-3 px-4 font-mono">Paid Amount</th>
                    <th className="py-3 px-4 font-mono text-emerald-600">Profit</th>
                    <th className="py-3 px-4">Payment Info</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/70' : 'divide-slate-100'}`}>
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={10} className={`py-8 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        No billing documents found. Click "Create Invoice / Quote" to generate one.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv, idx) => {
                      const isInvoice = inv.type === 'invoice';
                      const isCancelled = inv.status === 'cancelled';
                      const statusColor = 
                        isCancelled ? (isDark ? 'text-rose-400 bg-rose-950/50 border-rose-800' : 'text-rose-700 bg-rose-50 border-rose-200') :
                        inv.paymentStatus === 'paid' ? (isDark ? 'text-emerald-400 bg-emerald-950/50 border-emerald-800' : 'text-emerald-700 bg-emerald-50 border-emerald-200') :
                        inv.paymentStatus === 'partial' ? (isDark ? 'text-amber-400 bg-amber-950/50 border-amber-800' : 'text-amber-700 bg-amber-50 border-amber-200') :
                        (isDark ? 'text-slate-400 bg-slate-900 border-slate-800' : 'text-slate-700 bg-slate-100 border-slate-200');

                      return (
                        <tr key={`${inv.id}-${idx}`} className={`transition-colors ${isDark ? 'hover:bg-slate-900/60' : 'hover:bg-slate-50'} ${isCancelled ? 'opacity-60 bg-rose-500/5' : ''}`}>
                          
                          {/* Clickable Bill Number */}
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => setViewingInvoice(inv)}
                              className="flex items-center gap-1.5 font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                              title="Click to view full bill details, items, HSN, and profit"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>{inv.invoiceNumber}</span>
                            </button>
                          </td>

                          <td className="py-3 px-4">
                            <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                              isInvoice 
                                ? (isDark ? 'bg-sky-950 text-sky-400 border-sky-800' : 'bg-blue-50 text-blue-700 border-blue-200') 
                                : (isDark ? 'bg-purple-950 text-purple-400 border-purple-800' : 'bg-purple-50 text-purple-700 border-purple-200')
                            }`}>
                              {inv.type}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-semibold">{inv.customerName}</div>
                            {inv.customerPhone && (
                              <div className={`font-mono text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {inv.customerPhone}
                              </div>
                            )}
                          </td>

                          <td className={`py-3 px-4 font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {inv.date}
                          </td>

                          <td className={`py-3 px-4 font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            ₹{inv.grandTotal.toLocaleString('en-IN')}
                          </td>

                          <td className={`py-3 px-4 font-mono font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                            ₹{inv.paidAmount.toLocaleString('en-IN')}
                          </td>

                          {/* Profit Badge */}
                          <td className="py-3 px-4 font-mono">
                            {inv.profitAmount !== undefined && inv.profitAmount !== null ? (
                              <span className="text-emerald-600 font-bold">
                                +₹{inv.profitAmount.toLocaleString('en-IN')}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          {/* Payment Info & UPI Ref */}
                          <td className="py-3 px-4">
                            <div className="space-y-0.5">
                              <span className="uppercase text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {inv.paymentMode}
                              </span>
                              {inv.paymentReference && (
                                <p className={`font-mono text-[10px] truncate max-w-[120px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`} title={inv.paymentReference}>
                                  Ref: {inv.paymentReference}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className={`inline-block text-[11px] px-2 py-0.5 rounded border capitalize ${statusColor}`}>
                              {isCancelled ? 'Cancelled' : inv.paymentStatus}
                            </span>
                          </td>

                          {/* Actions: View, Print, Edit, Duplicate, Cancel */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setViewingInvoice(inv)}
                                className={`p-1.5 text-xs rounded transition-colors cursor-pointer ${
                                  isDark ? 'text-blue-400 hover:bg-slate-800' : 'text-blue-600 hover:bg-blue-50'
                                }`}
                                title="View bill details, items & profit"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setPrintableInvoice(inv)}
                                className={`p-1.5 text-xs rounded transition-colors cursor-pointer ${
                                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                                title="Print Slip"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {inv.type === 'quotation' && !isCancelled && (
                                <button
                                  type="button"
                                  onClick={() => setConfirmConvertModal(inv)}
                                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer"
                                  title="Convert Quotation to Official Tax Invoice"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Convert to Bill</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenEditModal(inv)}
                                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                                  isDark ? 'text-blue-300 bg-blue-950/70 border-blue-800 hover:bg-blue-900' : 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 shadow-2xs'
                                }`}
                                title="Edit bill entry, items, GST, payment details or customer info"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>

                              <button
                                onClick={() => handleDuplicateInvoice(inv.id)}
                                className={`p-1.5 text-xs rounded transition-colors cursor-pointer ${
                                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                                title="Duplicate / Re-bill"
                              >
                                <Copy className="w-4 h-4" />
                              </button>

                              {!isCancelled && (
                                <button
                                  onClick={() => handleCancelInvoice(inv.id)}
                                  className={`p-1.5 text-xs rounded transition-colors cursor-pointer ${
                                    isDark ? 'text-slate-500 hover:text-rose-400 hover:bg-slate-800' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                  }`}
                                  title="Cancel bill"
                                >
                                  <Ban className="w-4 h-4" />
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
        )}

        {/* Tab 2: Cash Flow Ledger Table */}
        {activeTab === 'cashflow' && (
          <div className={`rounded-xl border overflow-hidden ${
            isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-white'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`border-b uppercase tracking-wider text-[11px] font-semibold ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Flow Type</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Payment Mode</th>
                    <th className="py-3 px-4 font-mono">Reference / UTR</th>
                    <th className="py-3 px-4 font-mono text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/70' : 'divide-slate-100'}`}>
                  {cashFlow.map((cf) => {
                    const isIncome = cf.type === 'income';
                    return (
                      <tr key={cf.id} className={isDark ? 'hover:bg-slate-900/60' : 'hover:bg-slate-50'}>
                        <td className={`py-3 px-4 font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {cf.date}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            isIncome 
                              ? (isDark ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
                              : (isDark ? 'bg-rose-950 text-rose-400 border-rose-800' : 'bg-rose-50 text-rose-700 border-rose-200')
                          }`}>
                            {isIncome ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            <span>{cf.type}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold">{cf.category}</td>
                        <td className={`py-3 px-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{cf.description}</td>
                        <td className="py-3 px-4 uppercase text-[10px] font-mono">{cf.paymentMode}</td>
                        <td className={`py-3 px-4 font-mono text-[11px] ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                          {cf.referenceNumber || cf.referenceId || '-'}
                        </td>
                        <td className={`py-3 px-4 font-mono font-bold text-right ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isIncome ? '+' : '-'}₹{cf.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Viewing Bill Details Modal (Click old bill to view) */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-3xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {viewingInvoice.invoiceNumber}
                    </h3>
                    <span className="uppercase text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                      {viewingInvoice.type}
                    </span>
                    {viewingInvoice.status === 'cancelled' && (
                      <span className="uppercase text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">
                        CANCELLED
                      </span>
                    )}
                  </div>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {viewingInvoice.customerName} · Date: {viewingInvoice.date}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingInvoice(null)}
                className={`p-1 rounded-lg cursor-pointer ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              
              {/* Customer Info Card */}
              <div className={`p-4 rounded-xl border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Customer Name</span>
                  <p className="font-semibold text-sm mt-0.5">{viewingInvoice.customerName}</p>
                </div>
                <div>
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Contact Phone</span>
                  <p className="font-mono mt-0.5">{viewingInvoice.customerPhone || 'N/A'}</p>
                </div>
                <div>
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Area / City</span>
                  <p className="mt-0.5">{viewingInvoice.customerArea || 'Madurai'}</p>
                </div>
                <div>
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Linked Job Card</span>
                  <p className="font-mono text-blue-600 mt-0.5">{viewingInvoice.jobCardId || 'Direct Billing'}</p>
                </div>
              </div>

              {/* Items Table with HSN Code, Billed Rate, and Cost */}
              <div className="space-y-2">
                <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Billed Line Items & HSN Codes
                </h4>
                <div className={`rounded-xl border overflow-hidden ${
                  isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-white'
                }`}>
                  <table className="w-full text-left text-xs">
                    <thead className={`border-b text-[11px] font-semibold uppercase ${
                      isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      <tr>
                        <th className="py-2.5 px-3">Description</th>
                        {viewingInvoice.billingFirm !== 'pandiyan' && (
                          <th className="py-2.5 px-2">HSN/SAC</th>
                        )}
                        <th className="py-2.5 px-2 text-center">Qty</th>
                        <th className="py-2.5 px-2 text-right">Rate (₹)</th>
                        {viewingInvoice.billingFirm !== 'pandiyan' && (
                          <>
                            <th className="py-2.5 px-2 text-center">GST %</th>
                            <th className="py-2.5 px-2 text-right">GST (₹)</th>
                          </>
                        )}
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                      {viewingInvoice.items.map((it, idx) => {
                        const itGst = it.gstPercent !== undefined ? it.gstPercent : (viewingInvoice.billingFirm === 'pandiyan' ? 0 : viewingInvoice.gstPercent);
                        const itTax = it.gstAmount ?? Math.round(((it.amount || (it.rate * it.quantity)) * itGst) / 100);
                        const itTotal = it.totalWithGst ?? (it.amount + itTax);
                        return (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-semibold whitespace-pre-line">{it.description}</td>
                            {viewingInvoice.billingFirm !== 'pandiyan' && (
                              <td className="py-2 px-2 font-mono text-[11px] text-blue-600">
                                {it.hsnCode || '998713'}
                              </td>
                            )}
                            <td className="py-2 px-2 text-center font-mono">{it.quantity}</td>
                            <td className="py-2 px-2 text-right font-mono">₹{it.rate.toLocaleString('en-IN')}</td>
                            {viewingInvoice.billingFirm !== 'pandiyan' && (
                              <>
                                <td className="py-2 px-2 text-center font-mono font-bold text-blue-600">
                                  {itGst}%
                                </td>
                                <td className="py-2 px-2 text-right font-mono text-amber-600">
                                  ₹{itTax.toLocaleString('en-IN')}
                                </td>
                              </>
                            )}
                            <td className="py-2 px-3 text-right font-mono font-bold">
                              ₹{itTotal.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Profit & Loss Analysis Card */}
              <div className={`p-4 rounded-xl border space-y-2 ${
                isDark ? 'bg-emerald-950/20 border-emerald-800/60' : 'bg-emerald-50/70 border-emerald-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" /> Bill Profit & Loss Breakdown (Sale with GST vs Spares with GST)
                  </span>
                  <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-emerald-600 text-white">
                    Net Cash Profit: +₹{(viewingInvoice.profitAmount ?? (viewingInvoice.grandTotal - (viewingInvoice.totalPurchaseCostWithGst || viewingInvoice.purchaseCostTotal || 0) - (viewingInvoice.manualExtraCost || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Sale Amount (Grand Total)</span>
                    <p className="font-mono font-bold mt-0.5 text-emerald-600">₹{viewingInvoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Spares Buy Cost (with GST)</span>
                    <p className={`font-mono font-bold mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                      -₹{((viewingInvoice.totalPurchaseCostWithGst || viewingInvoice.purchaseCostTotal || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Extra Workshop Cost</span>
                    <p className={`font-mono font-bold mt-0.5 ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                      -₹{(viewingInvoice.manualExtraCost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Profit Margin</span>
                    <p className="font-mono font-bold text-emerald-600 mt-0.5">
                      {viewingInvoice.grandTotal > 0 ? (((viewingInvoice.profitAmount || 0) / viewingInvoice.grandTotal) * 100).toFixed(1) : '0.0'}% Margin
                    </p>
                  </div>
                </div>
              </div>

              {/* Financial Totals & Payment Summary */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Subtotal</span>
                    <p className="font-mono font-bold text-sm mt-0.5">₹{viewingInvoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  {viewingInvoice.billingFirm !== 'pandiyan' && (viewingInvoice.taxAmount || 0) > 0 && (() => {
                    const gstRate = viewingInvoice.gstPercent || 18;
                    const halfRate = (gstRate / 2).toFixed(gstRate % 2 === 0 ? 0 : 1);
                    return (
                      <>
                        <div>
                          <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>CGST ({halfRate}%)</span>
                          <p className="font-mono font-bold text-sm text-blue-600 mt-0.5">+₹{((viewingInvoice.taxAmount || 0) / 2).toFixed(2)}</p>
                        </div>
                        <div>
                          <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>SGST ({halfRate}%)</span>
                          <p className="font-mono font-bold text-sm text-blue-600 mt-0.5">+₹{((viewingInvoice.taxAmount || 0) / 2).toFixed(2)}</p>
                        </div>
                      </>
                    );
                  })()}
                  {viewingInvoice.discount !== undefined && viewingInvoice.discount > 0 && (
                    <div>
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Discount</span>
                      <p className="font-mono font-bold text-sm text-rose-600 mt-0.5">-₹{viewingInvoice.discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  )}
                  {viewingInvoice.roundOff !== undefined && viewingInvoice.roundOff !== 0 && (
                    <div>
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Round Off</span>
                      <p className="font-mono font-bold text-sm text-slate-500 mt-0.5">{viewingInvoice.roundOff > 0 ? '+' : ''}₹{viewingInvoice.roundOff.toFixed(2)}</p>
                    </div>
                  )}
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Grand Total</span>
                    <p className="font-mono font-bold text-sm text-emerald-600 mt-0.5">₹{viewingInvoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Amount Paid</span>
                    <p className="font-mono font-bold text-sm text-emerald-600 mt-0.5">₹{viewingInvoice.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Payment Mode</span>
                    <p className="font-bold uppercase mt-0.5">{viewingInvoice.paymentMode}</p>
                  </div>
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>UPI / Reference</span>
                    <p className="font-mono text-blue-600 mt-0.5">{viewingInvoice.paymentReference || 'None on record'}</p>
                  </div>
                </div>
              </div>

              {/* If attached physical receipt exists */}
              {viewingInvoice.attachedBillImage && (
                <div className={`p-4 rounded-xl border space-y-2 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-600 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" /> Attached Physical Voucher / Estimate Image
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomedBillPhoto(viewingInvoice.attachedBillImage || null)}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                    >
                      <Maximize2 className="w-3.5 h-3.5" /> Enlarge Photo
                    </button>
                  </div>
                  <div 
                    onClick={() => setZoomedBillPhoto(viewingInvoice.attachedBillImage || null)}
                    className="max-h-60 overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer text-center bg-black/10"
                  >
                    <img 
                      src={viewingInvoice.attachedBillImage} 
                      alt="Physical Bill Photo" 
                      className="max-h-60 w-auto object-contain mx-auto"
                    />
                  </div>
                </div>
              )}

              {viewingInvoice.notes && (
                <div className={`p-3 rounded-lg border text-xs italic ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  Note: {viewingInvoice.notes}
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className={`p-4 border-t flex items-center justify-between flex-wrap gap-2 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPrintableInvoice(viewingInvoice)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Voucher Slip
                </button>

                {viewingInvoice.type === 'quotation' && viewingInvoice.status !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={() => setConfirmConvertModal(viewingInvoice)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer shadow-xs"
                    title="Convert Quotation into Official Tax Invoice"
                  >
                    <FileText className="w-3.5 h-3.5" /> Convert to Bill
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenEditModal(viewingInvoice)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-700'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" /> {viewingInvoice.type === 'quotation' ? 'Edit Quotation' : 'Edit Bill'}
                </button>

                <button
                  type="button"
                  onClick={() => handleDuplicateInvoice(viewingInvoice.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-700'
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" /> {viewingInvoice.type === 'quotation' ? 'Copy Quotation' : 'Duplicate'}
                </button>

                {viewingInvoice.status !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={() => handleCancelInvoice(viewingInvoice.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-300 cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" /> Cancel Bill
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setViewingInvoice(null)}
                className={`px-4 py-1.5 text-xs rounded-lg cursor-pointer ${
                  isDark ? 'text-slate-300 bg-slate-800' : 'text-slate-700 bg-slate-100'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enlarged Photo Lightbox */}
      {zoomedBillPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[92vh] overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 p-2">
            <button
              onClick={() => setZoomedBillPhoto(null)}
              className="absolute top-4 right-4 z-10 bg-black/80 hover:bg-rose-600 text-white rounded-lg p-2 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={zoomedBillPhoto} 
              alt="Enlarged Bill Photo" 
              className="max-w-full max-h-[88vh] object-contain rounded-lg mx-auto" 
            />
          </div>
        </div>
      )}

      {/* Create / Edit Invoice Dedicated Full-Page View */}
      {isCreateInvoiceOpen && (
        <div className={`fixed inset-0 z-50 overflow-y-auto flex flex-col animate-in fade-in duration-150 ${
          isDark ? 'bg-[#080d1a] text-white' : 'bg-slate-50 text-slate-900'
        }`}>
          {/* Top Sticky Header */}
          <div className={`sticky top-0 z-30 px-4 lg:px-8 py-3.5 border-b backdrop-blur-md flex items-center justify-between gap-4 ${
            isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200 shadow-xs'
          }`}>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCloseWithAutoSave}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                }`}
                title="Go back (Draft is auto-saved)"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>← Back to Invoices</span>
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold">
                    {editingInvoiceId 
                      ? (invoiceType === 'quotation' ? 'Edit Quotation' : 'Edit Tax Invoice') 
                      : (invoiceType === 'quotation' ? 'New Customer Quotation' : 'New Customer Tax Invoice')}
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    billingFirm === 'pandiyan' 
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' 
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  }`}>
                    {billingFirm === 'pandiyan' ? 'Pandiyan (Non-GST)' : 'SGS (GST 18%)'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Draft Auto-Saved {draftSavedTime ? `at ${draftSavedTime}` : 'Active'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('sgs_billing_draft');
                  setHasPendingDraft(false);
                  setIsCreateInvoiceOpen(false);
                }}
                className={`px-3 py-1.5 text-xs rounded-xl font-medium cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-rose-400' : 'text-slate-500 hover:text-rose-600'
                }`}
              >
                Discard Draft
              </button>

              <button
                type="button"
                onClick={handleCloseWithAutoSave}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Close & Auto-Save Draft"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 flex-1">
            <form onSubmit={handleSaveInvoice} className="space-y-4">
              
              {/* Billing Firm Selector (SGS vs Pandiyan Computers) & Document Type */}
              <div className="p-3.5 rounded-xl border space-y-3 bg-gradient-to-r from-blue-50/50 via-slate-50 to-amber-50/40 dark:from-slate-900 dark:via-slate-900/80 dark:to-amber-950/20 border-slate-200 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Select Billing Firm / Entity
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setBillingFirm('sgs');
                          const defPct = adminSettings.defaultGstPercent || 18;
                          setGstPercent(defPct);
                          setDocItems(prev => prev.map(it => {
                            const gross = it.grossRate !== undefined && it.grossRate > 0 ? it.grossRate : (it.rate || 0);
                            const calc = calculateFromInclusiveRate(gross, defPct, it.quantity || 1);
                            return {
                              ...it,
                              hsnCode: it.hsnCode || adminSettings.defaultHsnCode || '998713',
                              gstPercent: defPct,
                              grossRate: gross,
                              rate: calc.baseRate,
                              amount: calc.baseAmount,
                              gstAmount: calc.totalGst,
                              totalWithGst: calc.totalWithGst,
                            };
                          }));
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          billingFirm === 'sgs'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-500'
                            : (isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100')
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Spider Grid Solutions (SGS)</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-700 text-white font-mono">With GST</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setBillingFirm('pandiyan');
                          setGstPercent(0);
                          setDocItems(prev => prev.map(it => {
                            const val = it.grossRate !== undefined && it.grossRate > 0 ? it.grossRate : it.rate;
                            return {
                              ...it,
                              hsnCode: undefined,
                              gstPercent: 0,
                              gstAmount: 0,
                              grossRate: val,
                              rate: val,
                              amount: Number((val * (it.quantity || 1)).toFixed(2)),
                              totalWithGst: Number((val * (it.quantity || 1)).toFixed(2)),
                            };
                          }));
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          billingFirm === 'pandiyan'
                            ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20 ring-2 ring-amber-500'
                            : (isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100')
                        }`}
                      >
                        <Tag className="w-3.5 h-3.5" />
                        <span>Pandiyan Computers</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-700 text-white font-mono">Without GST</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Document Type</label>
                      <select
                        value={invoiceType}
                        onChange={(e) => setInvoiceType(e.target.value as any)}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none ${
                          isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value="invoice">{billingFirm === 'pandiyan' ? 'Sales / Estimate Slip' : 'Tax Invoice / Bill'}</option>
                        <option value="quotation">Formal Quotation</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Theme Style</label>
                      {billingFirm === 'pandiyan' ? (
                        <select
                          value={pandiyanDocTheme}
                          onChange={(e) => setPandiyanDocTheme(e.target.value as PandiyanBillingTheme)}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none ${
                            isDark ? 'bg-slate-950 border border-slate-800 text-amber-300' : 'bg-white border border-slate-300 text-amber-800'
                          }`}
                        >
                          <option value="warm_amber">Royal Gold & Amber</option>
                          <option value="crimson_ruby">Heritage Crimson Ruby</option>
                          <option value="teak_bronze">Warm Teak & Bronze</option>
                          <option value="indigo_slate">Temple Indigo & Brass</option>
                        </select>
                      ) : (
                        <select
                          value={docTheme}
                          onChange={(e) => setDocTheme(e.target.value as BillingTheme)}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none ${
                            isDark ? 'bg-slate-950 border border-slate-800 text-blue-300' : 'bg-white border border-slate-300 text-blue-800'
                          }`}
                        >
                          <option value="modern_navy">Modern Navy</option>
                          <option value="classic_emerald">Classic Emerald</option>
                          <option value="sleek_monochrome">Sleek Charcoal</option>
                          <option value="royal_purple">Royal Purple</option>
                        </select>
                      )}
                    </div>
                  </div>
                </div>

                {/* Entity Brand & Seal Active Banner */}
                <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                  billingFirm === 'pandiyan'
                    ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
                    : 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/40 text-blue-900 dark:text-blue-200'
                }`}>
                  <div className="flex items-center gap-2.5">
                    {billingFirm === 'pandiyan' ? (
                      <PandiyanLogo url={adminSettings.pandiyanLogoUrl} size="sm" />
                    ) : (
                      <SgsLogo url={adminSettings.workshopLogoUrl} size="sm" />
                    )}
                    <span className="text-[11px] font-medium">
                      {billingFirm === 'pandiyan'
                        ? 'Pandiyan Computers: Non-GST Estimate Slip · Inventory stock will NOT be reduced'
                        : 'Spider Grid Solutions: GST Tax Invoice · Hardware parts deducted from stock inventory'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase bg-white dark:bg-slate-900 border">
                    {billingFirm === 'pandiyan' ? 'Pandiyan Stamp Applied' : 'SGS Stamp Applied'}
                  </span>
                </div>
              </div>

              {/* Customer Search & Select / Link from Job Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Search & Select Customer (Verified Client Directory)
                  </label>
                  <div className="relative">
                    <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                    <input
                      type="text"
                      value={customerSearchInput}
                      onChange={(e) => {
                        setCustomerSearchInput(e.target.value);
                        setIsCustomerSearchOpen(true);
                      }}
                      onFocus={() => setIsCustomerSearchOpen(true)}
                      placeholder="Type name, phone, or area to search..."
                      className={`w-full rounded-lg pl-8 pr-3 py-2 text-xs focus:outline-none ${
                        isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  {/* Customer search popup */}
                  {isCustomerSearchOpen && (
                    <div className={`absolute top-full left-0 right-0 z-30 mt-1 max-h-48 overflow-y-auto rounded-xl border shadow-xl ${
                      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                      <div className="p-1 space-y-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomerId('');
                            setCustomerSearchInput('');
                            setIsCustomerSearchOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800`}
                        >
                          + Manual / New Customer Entry
                        </button>
                        {customers
                          .filter(c => {
                            if (!customerSearchInput.trim()) return true;
                            const q = customerSearchInput.toLowerCase();
                            return c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.area && c.area.toLowerCase().includes(q));
                          })
                          .slice(0, 10)
                          .map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                handleCustomerSelect(c.id);
                                setCustomerSearchInput(`${c.name} (${c.phone || c.area})`);
                                setIsCustomerSearchOpen(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                selectedCustomerId === c.id
                                  ? 'bg-blue-600 text-white font-bold'
                                  : (isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100')
                              }`}
                            >
                              <span>#{c.slNo} {c.name}</span>
                              <span className="text-[10px] opacity-75 font-mono">{c.phone} · {c.area || 'Madurai'}</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Or Link from Active Job Card
                  </label>
                  <select
                    value={selectedJobId}
                    onChange={(e) => handleJobSelect(e.target.value)}
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="">-- Direct Counter Sale / On-site Service --</option>
                    {jobCards.map(j => (
                      <option key={j.id} value={j.id}>{j.jobId} - {j.customerName} ({j.deviceBrand})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Customer Details Row */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder="Customer Name"
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Phone</label>
                  <input
                    type="tel"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    placeholder="WhatsApp Phone"
                    className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Area / Location</label>
                  <input
                    type="text"
                    value={custArea}
                    onChange={(e) => setCustArea(e.target.value)}
                    placeholder="Madurai Location"
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Quick Presets Ribbon */}
              {(adminSettings.quickServices || []).length > 0 && (
                <div className="space-y-1">
                  <span className={`text-[11px] font-semibold flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <Sparkles className="w-3 h-3 text-blue-500" /> 1-Click Service Presets from Admin:
                  </span>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {adminSettings.quickServices.map((qs, qIdx) => (
                      <button
                        key={qIdx}
                        type="button"
                        onClick={() => handleAddPresetItem(qs)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border whitespace-nowrap transition-colors cursor-pointer ${
                          isDark 
                            ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-blue-500' 
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50/50'
                        }`}
                      >
                        + {qs.name} (₹{qs.rate})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Items List with HSN Code, Selling Rate, and Purchase Cost */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Line Items & HSN Codes
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleLoadTestEntry}
                      className="text-xs font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center gap-1.5 cursor-pointer bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800 transition-colors shadow-xs"
                      title="Insert verified test bill with SSD + RAM from stock and labor service to test end-to-end calculations"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>🧪 Load Test Entry</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsStockPickerOpen(!isStockPickerOpen)}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 cursor-pointer bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors"
                    >
                      <Boxes className="w-3.5 h-3.5" />
                      <span>Search Stock Inventory</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddDocItem}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 cursor-pointer bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Blank Item</span>
                    </button>
                  </div>
                </div>

                {/* Place of Supply (Intra-state Tamil Nadu vs Inter-state IGST) */}
                {billingFirm !== 'pandiyan' && (
                  <div className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs ${
                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-blue-50/50 border-blue-200'
                  }`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-700 dark:text-slate-300">Place of Supply:</span>
                      <div className="inline-flex rounded-lg border p-0.5 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setIsInterState(false)}
                          className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                            !isInterState
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                          }`}
                        >
                          📍 Tamil Nadu (Intra-State: CGST + SGST)
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsInterState(true)}
                          className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                            isInterState
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                          }`}
                        >
                          🌐 Outside TN (Inter-State: IGST)
                        </button>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {isInterState ? 'IGST Applicable (Full 100% Tax to Integrated GST)' : 'Intra-State: CGST (50%) + SGST (50%)'}
                    </span>
                  </div>
                )}

                {/* Search Stock Inventory Drawer */}
                {isStockPickerOpen && (
                  <div className={`p-3 rounded-xl border space-y-2 mb-2 ${
                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        <Boxes className="w-3.5 h-3.5" /> Pick Available Inventory Item (Auto-fills HSN, Description, Cost & Price)
                      </span>
                      <button 
                        type="button" 
                        onClick={() => setIsStockPickerOpen(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕ Close
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={stockSearchQuery}
                        onChange={(e) => setStockSearchQuery(e.target.value)}
                        placeholder="Search stock by item name, SKU, category, or HSN..."
                        className={`w-full rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none ${
                          isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
                      {inventory
                        .filter(inv => {
                          if (!stockSearchQuery.trim()) return true;
                          const q = stockSearchQuery.toLowerCase();
                          return (
                            inv.name.toLowerCase().includes(q) ||
                            (inv.sku && inv.sku.toLowerCase().includes(q)) ||
                            (inv.hsnCode && inv.hsnCode.includes(q)) ||
                            (inv.category && inv.category.toLowerCase().includes(q))
                          );
                        })
                        .slice(0, 15)
                        .map((inv, idx) => (
                          <div
                            key={`${inv.id}-${idx}`}
                            className={`p-2 rounded-lg border flex items-center justify-between gap-2 transition-colors ${
                              isDark ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-blue-300'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{inv.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">
                                In Stock: <strong className={inv.currentStock <= (inv.minStockAlert || 2) ? 'text-amber-600' : 'text-emerald-600'}>{inv.currentStock}</strong> | Cost: ₹{inv.unitCost} | Selling: ₹{inv.unitPrice} | HSN: {inv.hsnCode || '—'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setDocItems(prev => [
                                  ...prev,
                                  {
                                    inventoryItemId: inv.id,
                                    description: inv.name,
                                    hsnCode: inv.hsnCode || '8471',
                                    quantity: 1,
                                    rate: inv.unitPrice || inv.unitCost * 1.3,
                                    amount: inv.unitPrice || inv.unitCost * 1.3,
                                    purchaseCost: inv.unitCost || 0,
                                    isService: false,
                                  }
                                ]);
                              }}
                              className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer shrink-0"
                            >
                              + Add to Bill
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className={`p-3 rounded-xl border space-y-3 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Line Items · Individual GST % & Amount Breakdown
                    </span>
                    <span className="text-[10px] text-blue-600 font-semibold">
                      Type amount with GST → Enter GST % → Auto-reduces to base rate
                    </span>
                  </div>

                  {docItems.map((item, idx) => (
                    <div key={idx} className={`p-3 rounded-xl border transition-all space-y-2.5 ${
                      isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                    }`}>
                      {/* Top: Description, HSN, Qty, Remove */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                        <div className="flex-1 w-full">
                          <label className={`block text-[10px] font-bold uppercase mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Item / Service Description
                          </label>
                          <textarea
                            rows={2}
                            value={item.description}
                            onChange={(e) => handleDocItemChange(idx, 'description', e.target.value)}
                            placeholder="Item Name & Description&#10;Press Enter for 2nd line, 3rd line specs / warranty notes..."
                            className={`w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none resize-y ${
                              isDark ? 'bg-slate-950 border border-slate-700 text-slate-200' : 'bg-slate-50 border border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>

                        {billingFirm !== 'pandiyan' && (
                          <div className="w-full sm:w-28">
                            <label className={`block text-[10px] font-bold uppercase mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              HSN / SAC
                            </label>
                            <input
                              type="text"
                              value={item.hsnCode || '998713'}
                              onChange={(e) => handleDocItemChange(idx, 'hsnCode', e.target.value)}
                              placeholder="HSN/SAC"
                              className={`w-full rounded-lg px-2 py-1.5 text-xs font-mono text-center focus:outline-none ${
                                isDark ? 'bg-slate-950 border border-slate-700 text-blue-400' : 'bg-slate-50 border border-slate-300 text-blue-700 font-semibold'
                              }`}
                            />
                          </div>
                        )}

                        <div className="w-full sm:w-20">
                          <label className={`block text-[10px] font-bold uppercase mb-0.5 text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleDocItemChange(idx, 'quantity', e.target.value)}
                            placeholder="Qty"
                            className={`w-full rounded-lg px-2 py-1.5 text-xs font-mono text-center focus:outline-none ${
                              isDark ? 'bg-slate-950 border border-slate-700 text-slate-200' : 'bg-slate-50 border border-slate-300 text-slate-900 font-bold'
                            }`}
                          />
                        </div>

                        {docItems.length > 1 && (
                          <div className="sm:self-end pb-0.5">
                            <button
                              type="button"
                              onClick={() => handleRemoveDocItem(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer transition-colors"
                              title="Remove Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Bottom Row: GST Breakdown & Calculation Grid (Base Rate column removed) */}
                      {billingFirm === 'pandiyan' ? (
                        <div className={`p-2.5 rounded-lg border grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-end text-xs ${
                          isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                        }`}>
                          {/* 1. Unit Rate (₹) */}
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <label className={`text-[10px] font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                                Unit Rate (₹)
                              </label>
                              <span className="text-[9px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-950/80 px-1 rounded">No GST</span>
                            </div>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                value={item.grossRate !== undefined && item.grossRate > 0 ? item.grossRate : (item.rate || '')}
                                onChange={(e) => handleDocItemChange(idx, 'grossRate', e.target.value)}
                                placeholder="Rate"
                                className={`w-full rounded-md pl-4 pr-1.5 py-1 text-xs font-mono font-bold focus:outline-none ${
                                  isDark ? 'bg-slate-900 border border-amber-800 text-amber-300' : 'bg-white border border-amber-300 text-amber-800'
                                }`}
                              />
                              <span className="text-[10px] absolute left-1.5 top-1/2 -translate-y-1/2 text-amber-500 font-bold">₹</span>
                            </div>
                          </div>

                          {/* 2. Spare Cost (for Profit & Loss) */}
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <label className={`text-[10px] font-bold truncate ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                                Spare Cost (₹)
                              </label>
                              <button
                                type="button"
                                onClick={() => handleDocItemChange(idx, 'isService', !item.isService)}
                                className={`text-[9px] font-bold px-1 rounded cursor-pointer ${
                                  item.isService 
                                    ? 'bg-emerald-600 text-white' 
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                                }`}
                              >
                                {item.isService ? 'Service' : 'Spare'}
                              </button>
                            </div>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                disabled={item.isService}
                                value={item.isService ? 0 : (item.purchaseCost || '')}
                                onChange={(e) => handleDocItemChange(idx, 'purchaseCost', Number(e.target.value))}
                                placeholder="0"
                                className={`w-full rounded-md pl-4 pr-1.5 py-1 text-xs font-mono focus:outline-none ${
                                  item.isService
                                    ? 'bg-slate-100 dark:bg-slate-900/40 text-slate-400 cursor-not-allowed'
                                    : (isDark ? 'bg-slate-900 border border-slate-700 text-rose-300' : 'bg-white border border-slate-300 text-rose-700')
                                }`}
                              />
                              <span className="text-[10px] absolute left-1.5 top-1/2 -translate-y-1/2 text-rose-400">₹</span>
                            </div>
                            <span className="text-[9px] text-slate-500 block truncate mt-0.5 font-mono">
                              Total Cost: ₹{(item.totalPurchaseCost || 0).toLocaleString('en-IN')}
                            </span>
                          </div>

                          {/* 3. Quantity Display */}
                          <div>
                            <label className={`block text-[10px] font-bold mb-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                              Quantity
                            </label>
                            <div className={`rounded-md px-2 py-1 text-xs font-mono font-bold border ${
                              isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                            }`}>
                              {item.quantity} unit{item.quantity > 1 ? 's' : ''}
                            </div>
                            <span className="text-[9px] text-slate-400 block truncate mt-0.5 font-mono">
                              ₹{(item.grossRate || item.rate || 0)} × {item.quantity}
                            </span>
                          </div>

                          {/* 4. Total Amount & Profit */}
                          <div className="text-right">
                            <label className={`block text-[10px] font-bold mb-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                              Item Total (₹)
                            </label>
                            <div className={`rounded-md px-2 py-1 text-xs font-mono font-bold text-right border ${
                              isDark ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            }`}>
                              ₹{(item.amount ?? ((item.rate || 0) * (item.quantity || 1))).toLocaleString('en-IN')}
                            </div>
                            <span className="text-[9px] font-bold text-emerald-600 block truncate mt-0.5 font-mono">
                              Profit: +₹{((item.amount || 0) - (item.totalPurchaseCost || 0)).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className={`p-3 rounded-lg border grid grid-cols-2 sm:grid-cols-6 gap-2.5 items-end text-xs ${
                          isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                        }`}>
                          {/* 1. Base Rate (Without GST) */}
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <label className={`text-[10px] font-bold ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
                                Base Rate (Without GST)
                              </label>
                              <span className="text-[9px] font-bold text-sky-600 bg-sky-100 dark:bg-sky-950/80 px-1 rounded">Net</span>
                            </div>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.rate || ''}
                                onChange={(e) => handleDocItemChange(idx, 'rate', e.target.value)}
                                placeholder="Base Rate"
                                className={`w-full rounded-md pl-4 pr-1.5 py-1 text-xs font-mono font-bold focus:outline-none ${
                                  isDark ? 'bg-slate-900 border border-sky-800 text-sky-300' : 'bg-white border border-sky-300 text-sky-800'
                                }`}
                              />
                              <span className="text-[10px] absolute left-1.5 top-1/2 -translate-y-1/2 text-sky-500 font-bold">₹</span>
                            </div>
                            <span className="text-[9px] text-slate-400 block truncate mt-0.5">Excl. GST</span>
                          </div>

                          {/* 2. Rate with GST (Gross / Inclusive) */}
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <label className={`text-[10px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                                Rate With GST (MRP)
                              </label>
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/80 px-1 rounded">Gross</span>
                            </div>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.grossRate !== undefined ? item.grossRate : (item.rate ? Number(((item.rate * (1 + (item.gstPercent || 0)/100))).toFixed(2)) : '')}
                                onChange={(e) => handleDocItemChange(idx, 'grossRate', e.target.value)}
                                placeholder="Rate with GST"
                                className={`w-full rounded-md pl-4 pr-1.5 py-1 text-xs font-mono font-bold focus:outline-none ${
                                  isDark ? 'bg-slate-900 border border-emerald-800 text-emerald-300' : 'bg-white border border-emerald-300 text-emerald-800'
                                }`}
                              />
                              <span className="text-[10px] absolute left-1.5 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">₹</span>
                            </div>
                            <span className="text-[9px] text-slate-400 block truncate mt-0.5">Incl. GST</span>
                          </div>

                          {/* 3. Individual GST % Input & Presets */}
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <label className={`text-[10px] font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                                GST %
                              </label>
                              <span className="text-[9px] text-blue-500 font-mono">Tax %</span>
                            </div>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={item.gstPercent !== undefined ? item.gstPercent : 18}
                                onChange={(e) => handleDocItemChange(idx, 'gstPercent', e.target.value)}
                                placeholder="18"
                                className={`w-full rounded-md pl-2 pr-4 py-1 text-xs font-mono font-bold text-center focus:outline-none ${
                                  isDark ? 'bg-slate-900 border border-blue-700 text-blue-300' : 'bg-white border border-blue-400 text-blue-800'
                                }`}
                              />
                              <span className="text-[10px] absolute right-1.5 top-1/2 -translate-y-1/2 text-blue-500 font-bold">%</span>
                            </div>
                            {/* Quick GST Presets */}
                            <div className="flex items-center gap-0.5 mt-1">
                              {[0, 5, 12, 18, 28].map(ratePct => (
                                <button
                                  key={ratePct}
                                  type="button"
                                  onClick={() => handleDocItemChange(idx, 'gstPercent', ratePct)}
                                  className={`text-[9px] font-bold px-1 py-0.5 rounded transition-colors cursor-pointer ${
                                    (item.gstPercent ?? 18) === ratePct
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-100'
                                  }`}
                                >
                                  {ratePct}%
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 4. Line Discount (₹) */}
                          <div>
                            <label className={`block text-[10px] font-bold mb-0.5 truncate ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                              Discount (₹)
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.discount || ''}
                                onChange={(e) => handleDocItemChange(idx, 'discount', e.target.value)}
                                placeholder="0"
                                className={`w-full rounded-md pl-4 pr-1.5 py-1 text-xs font-mono focus:outline-none ${
                                  isDark ? 'bg-slate-900 border border-slate-700 text-rose-300' : 'bg-white border border-slate-300 text-rose-700'
                                }`}
                              />
                              <span className="text-[10px] absolute left-1.5 top-1/2 -translate-y-1/2 text-rose-400 font-bold">-₹</span>
                            </div>
                            <span className="text-[9px] text-slate-400 block truncate mt-0.5">Item discount</span>
                          </div>

                          {/* 5. Spare Cost / Purchase Cost WITH GST */}
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <label className={`text-[10px] font-bold truncate ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                                Spare Cost (₹)
                              </label>
                              <button
                                type="button"
                                onClick={() => handleDocItemChange(idx, 'isService', !item.isService)}
                                className={`text-[9px] font-bold px-1 rounded cursor-pointer ${
                                  item.isService 
                                    ? 'bg-emerald-600 text-white' 
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-emerald-100'
                                }`}
                                title="Toggle between Service (0 Spare) and Hardware Part"
                              >
                                {item.isService ? 'Labor' : 'Spare'}
                              </button>
                            </div>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                disabled={item.isService}
                                value={item.isService ? 0 : (item.purchaseCostWithGst !== undefined && item.purchaseCostWithGst > 0 ? item.purchaseCostWithGst : (item.purchaseCost || ''))}
                                onChange={(e) => handleDocItemChange(idx, 'purchaseCostWithGst', Number(e.target.value))}
                                placeholder="0"
                                className={`w-full rounded-md pl-4 pr-1.5 py-1 text-xs font-mono focus:outline-none ${
                                  item.isService
                                    ? 'bg-slate-100 dark:bg-slate-900/40 text-slate-400 cursor-not-allowed'
                                    : (isDark ? 'bg-slate-900 border border-slate-700 text-amber-300' : 'bg-white border border-slate-300 text-amber-800')
                                }`}
                              />
                              <span className="text-[10px] absolute left-1.5 top-1/2 -translate-y-1/2 text-amber-500 font-bold">₹</span>
                            </div>
                            <span className="text-[9px] text-amber-600 dark:text-amber-400 block truncate mt-0.5 font-mono font-medium">
                              {item.isService 
                                ? '₹0 Spares (100% Profit)' 
                                : `Cost w/GST: ₹${(item.totalPurchaseCostWithGst || (item.purchaseCost || 0) * (item.quantity || 1)).toLocaleString('en-IN')}`
                              }
                            </span>
                          </div>

                          {/* 6. Total With GST & Profit */}
                          <div className="text-right">
                            <label className={`block text-[10px] font-bold mb-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                              Line Total (₹)
                            </label>
                            <div className={`rounded-md px-2 py-1 text-xs font-mono font-bold text-right border ${
                              isDark ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            }`}>
                              ₹{(item.totalWithGst ?? ((item.amount || 0) + (item.gstAmount || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="flex items-center justify-end gap-1 mt-0.5">
                              <span className="text-[9px] font-bold font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-1 py-0.2 rounded border border-emerald-300 dark:border-emerald-800">
                                Profit: +₹{((item.totalWithGst || 0) - (item.totalPurchaseCostWithGst || 0)).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <div className="pt-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleAddDocItem}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 cursor-pointer bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add Blank Item</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsStockPickerOpen(true)}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 cursor-pointer bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors"
                    >
                      <Boxes className="w-3.5 h-3.5" />
                      <span>Search & Add From Stock</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Profit Calculation & Manual Adjustment Widget */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                isDark ? 'bg-emerald-950/20 border-emerald-800/60' : 'bg-emerald-50/70 border-emerald-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" /> Real-time Bill Profit & Loss Calculation
                  </span>
                  <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-full bg-emerald-600 text-white shadow-xs">
                    Estimated Profit: +₹{netProfitCalc.toLocaleString('en-IN')} ({profitMarginPercentCalc}%)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                      Total Sale Amount {billingFirm !== 'pandiyan' ? '(With GST)' : ''}
                    </span>
                    <p className="font-mono font-bold text-sm mt-0.5">
                      ₹{grandTotalCalc.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <span className="text-[10px] text-slate-400 block font-sans">
                      Billed to Customer
                    </span>
                  </div>

                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                      Total Spares Cost {billingFirm !== 'pandiyan' ? '(With GST)' : ''}
                    </span>
                    <p className={`font-mono font-bold text-sm mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                      -₹{totalPurchaseCostWithGstCalc.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <span className="text-[10px] text-slate-400 block font-sans">
                      Purchase cost paid to vendors
                    </span>
                  </div>

                  <div>
                    <label className={`block font-semibold mb-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Extra Manual Expenses (₹)
                    </label>
                    <input
                      type="number"
                      value={manualExtraCost || ''}
                      onChange={(e) => setManualExtraCost(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="0.00"
                      className={`w-full rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-none ${
                        isDark ? 'bg-slate-900 border border-slate-700 text-rose-400' : 'bg-white border border-slate-300 text-rose-700'
                      }`}
                    />
                    <span className="text-[10px] text-slate-400 block font-sans">
                      Travel, outside lathe, etc.
                    </span>
                  </div>

                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                      Net Cash Profit
                    </span>
                    <p className="font-mono font-bold text-base text-emerald-600 mt-0.5">
                      +₹{netProfitCalc.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block truncate font-sans font-semibold">
                      Margin: {profitMarginPercentCalc}% (Sale with GST - Spares with GST)
                    </span>
                  </div>
                </div>

                {billingFirm !== 'pandiyan' && (
                  <div className={`pt-2 border-t text-[11px] flex flex-wrap items-center justify-between gap-2 ${
                    isDark ? 'border-emerald-900/50 text-slate-400' : 'border-emerald-200 text-slate-600'
                  }`}>
                    <span className="font-mono">
                      Book Basis (Excl. GST): Taxable Sales ₹{subtotalCalc.toLocaleString('en-IN')} - Taxable Spares ₹{totalPurchaseCostCalc.toLocaleString('en-IN')} = Taxable Profit +₹{taxableProfitCalc.toLocaleString('en-IN')}
                    </span>
                    <span className="font-mono text-blue-600 font-semibold">
                      Output Tax: +₹{taxCalc.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
              </div>

              {/* Financial Totals: Subtotal, Total GST, Discount, Round Off, Grand Total & Payment */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* 1. Subtotal / Taxable Value */}
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Subtotal {billingFirm !== 'pandiyan' ? '(Taxable)' : ''}
                    </label>
                    <div className={`rounded-lg px-3 py-2 text-xs font-mono font-bold border ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                    }`}>
                      ₹{subtotalCalc.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* 2. Total GST Amount */}
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Total GST {isInterState ? '(IGST)' : '(CGST + SGST)'}
                    </label>
                    {billingFirm === 'pandiyan' ? (
                      <div className={`rounded-lg px-3 py-2 text-xs font-bold border text-amber-600 dark:text-amber-400 ${
                        isDark ? 'bg-slate-900 border-amber-900/50' : 'bg-white border-amber-200'
                      }`}>
                        ₹0.00 <span className="text-[10px] font-normal text-slate-400">(Exempt)</span>
                      </div>
                    ) : (
                      <div className={`rounded-lg px-3 py-1.5 text-xs font-mono font-bold border ${
                        isDark ? 'bg-slate-900 border-blue-900 text-blue-400' : 'bg-white border-blue-200 text-blue-700'
                      }`}>
                        +₹{taxCalc.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-[9px] text-slate-400 block font-normal font-sans">
                          {isInterState 
                            ? `IGST (100%): ₹${invoiceSummary.totalIgst.toFixed(2)}`
                            : `CGST: ₹${invoiceSummary.totalCgst.toFixed(2)} | SGST: ₹${invoiceSummary.totalSgst.toFixed(2)}`
                          }
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 3. Discount (₹) */}
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Discount (₹)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={discount === 0 ? '' : discount}
                        onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                        placeholder="0.00"
                        className={`w-full rounded-lg pl-6 pr-3 py-2 text-xs font-mono focus:outline-none ${
                          isDark ? 'bg-slate-900 border border-slate-800 text-rose-300' : 'bg-white border border-slate-300 text-rose-700'
                        }`}
                      />
                      <span className="text-xs absolute left-2.5 top-1/2 -translate-y-1/2 text-rose-400 font-bold">-₹</span>
                    </div>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Deducted from bill total</span>
                  </div>

                  {/* 4. Manual Round Off (₹) with Auto Round button */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Round Off (₹)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const unrounded = invoiceSummary.unroundedTotal;
                          const rounded = Math.round(unrounded);
                          const diff = Number((rounded - unrounded).toFixed(2));
                          setRoundOff(diff);
                        }}
                        className="text-[10px] text-blue-600 hover:underline cursor-pointer font-bold"
                        title="Auto-calculate round off to nearest rupee"
                      >
                        Auto Round
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        value={roundOff === 0 ? '' : roundOff}
                        onChange={(e) => setRoundOff(Number(e.target.value) || 0)}
                        placeholder="0.00"
                        className={`w-full rounded-lg pl-6 pr-3 py-2 text-xs font-mono focus:outline-none ${
                          isDark ? 'bg-slate-900 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                        }`}
                      />
                      <span className="text-xs absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">±₹</span>
                    </div>
                    <span className="text-[9px] text-slate-400 block mt-0.5">To nearest ₹</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 items-end">
                  {/* Grand Total */}
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>
                        Grand Total Amount (₹)
                      </label>
                      <span className="text-[10px] font-mono text-slate-400">
                        Lines Total: ₹{invoiceSummary.totalLinesWithGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={grandTotalCalc}
                        readOnly
                        className={`w-full rounded-lg pl-7 pr-3 py-2 text-base font-mono font-black focus:outline-none ${
                          isDark ? 'bg-slate-900 border-2 border-emerald-600 text-emerald-300' : 'bg-emerald-50 border-2 border-emerald-500 text-emerald-900'
                        }`}
                      />
                      <span className="text-sm absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-emerald-600">₹</span>
                    </div>
                    <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mt-1 italic">
                      {numberToWordsIndian(grandTotalCalc)}
                    </p>
                  </div>

                  {/* Payment Status */}
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Payment Status
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => {
                        const newStatus = e.target.value as any;
                        setPaymentStatus(newStatus);
                        if (newStatus === 'paid') setPaidAmount(grandTotalCalc);
                        else if (newStatus === 'unpaid') setPaidAmount(0);
                      }}
                      className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                        isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="paid">Paid in Full</option>
                      <option value="partial">Partial Payment</option>
                      <option value="unpaid">Unpaid / Credit</option>
                    </select>
                  </div>

                  {/* Paid Amount */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Paid Amount (₹)
                      </label>
                      {paymentStatus === 'paid' && (
                        <span className="text-[10px] text-emerald-600 font-bold">Auto-matched</span>
                      )}
                    </div>
                    <input
                      type="number"
                      value={paidAmount}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setPaidAmount(val);
                        if (val >= grandTotalCalc) setPaymentStatus('paid');
                        else if (val > 0) setPaymentStatus('partial');
                        else setPaymentStatus('unpaid');
                      }}
                      className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                        isDark ? 'bg-slate-950 border border-slate-800 text-emerald-400 font-bold' : 'bg-white border border-slate-300 text-emerald-700 font-bold'
                      }`}
                    />
                  </div>

                  {/* Payment Mode */}
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Payment Mode
                    </label>
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                      className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                        isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="upi">UPI / GPay / PhonePe</option>
                      <option value="cash">Cash in Hand</option>
                      <option value="bank_transfer">Bank Transfer (NEFT / IMPS)</option>
                      <option value="card">Debit / Credit Card</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                {/* UPI Ref / Reference No */}
                <div className="pt-1">
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    UPI Transaction ID / UTR / Reference No
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="e.g. UPI Ref 429104820129 or IMPS-912"
                    className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Attach Physical Bill / Voucher Photo */}
              <div className="space-y-1">
                <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Attach Photo of Physical Bill / Job Slip (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <label className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer border ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
                  }`}>
                    <Camera className="w-3.5 h-3.5 text-blue-500" />
                    <span>{attachedBillImage ? 'Change Bill Photo' : 'Upload Physical Bill Photo'}</span>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                  {attachedBillImage && (
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 1 Photo Attached
                    </span>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Terms & Notes</label>
                <input
                  type="text"
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Submit Buttons */}
              <div className={`flex items-center justify-end gap-3 pt-4 border-t ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={handleCloseWithAutoSave}
                  className={`px-4 py-2 text-xs rounded-lg transition-colors cursor-pointer ${
                    isDark ? 'text-slate-400 hover:text-slate-200 bg-slate-800' : 'text-slate-600 hover:text-slate-800 bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  {editingInvoiceId ? 'Update Bill & Recalculate Profit' : 'Save Invoice & Record Inflow'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Expense Modal */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between pb-2 border-b ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Add Workshop Expense</h3>
              <button onClick={() => setIsAddExpenseOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddExpenseSubmit} className="space-y-3">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Category</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="Workshop Rent & Electricity">Workshop Rent & Electricity</option>
                  <option value="Internet & Broadband">Internet & Broadband</option>
                  <option value="Tools, Soldering & Consumables">Tools, Soldering & Consumables</option>
                  <option value="Technician Travel / Conveyance">Technician Travel / Conveyance</option>
                  <option value="Tea, Refreshments & Misc">Tea, Refreshments & Misc</option>
                </select>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Description</label>
                <input
                  type="text"
                  required
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="e.g. EB Bill October 2026"
                  className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(Number(e.target.value))}
                    className={`w-full rounded-lg px-3 py-2 text-xs font-mono font-bold focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-rose-400' : 'bg-white border border-slate-300 text-rose-700'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Mode</label>
                  <select
                    value={expenseMode}
                    onChange={(e) => setExpenseMode(e.target.value as any)}
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="upi">UPI / GPay</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  UPI / Transaction Reference ID
                </label>
                <input
                  type="text"
                  value={expenseRef}
                  onChange={(e) => setExpenseRef(e.target.value)}
                  placeholder="e.g. UPI Ref / UTR / Receipt No"
                  className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className={`flex items-center justify-end gap-2 pt-3 border-t ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className={`px-3 py-1.5 text-xs rounded-lg cursor-pointer ${
                    isDark ? 'text-slate-400 bg-slate-800' : 'text-slate-600 bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer shadow-xs"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Invoice Voucher Slip Modal */}
      {printableInvoice && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 border rounded-2xl w-full max-w-xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-3 border-b flex items-center justify-between shrink-0 bg-slate-50">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Voucher Print Preview ({printableInvoice.invoiceNumber})
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Thermal / A4
                </button>
                <button onClick={() => setPrintableInvoice(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Slip Paper View */}
            <div className="p-8 overflow-y-auto space-y-5 text-xs leading-relaxed font-sans flex-1" id="invoiceSlip">
              
              {/* Slip Header - Firm Specific (SGS with GST vs Pandiyan Computers without GST) */}
              {printableInvoice.billingFirm === 'pandiyan' ? (
                // Pandiyan Computers (Non-GST Slip with Pandiyan Logo, Theme & Header)
                (() => {
                  const pThemeKey = printableInvoice.pandiyanTheme || adminSettings.pandiyanBillingTheme || 'warm_amber';
                  const pTheme = PANDIYAN_THEMES[pThemeKey] || PANDIYAN_THEMES.warm_amber;
                  return (
                    <div className={`border-b-2 pb-4 ${pTheme.headerBorder}`}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <PandiyanLogo url={adminSettings.pandiyanLogoUrl} size="md" />
                          <div>
                            <h2 className={`text-lg font-black tracking-tight ${pTheme.primary}`}>
                              {adminSettings.pandiyanFirmName || 'PANDIYAN COMPUTERS'}
                            </h2>
                            <p className="text-[11px] text-slate-700 font-medium">
                              {adminSettings.pandiyanAddress || 'Shop No. 14, Simmakkal Main Road, Madurai - 625001'} · Phone: {adminSettings.pandiyanPhone || '+91 9677776001'}
                            </p>
                            {adminSettings.pandiyanEmail && (
                              <p className="text-[10px] text-slate-500 font-mono">
                                Email: {adminSettings.pandiyanEmail}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded text-white ${pTheme.badgeBg}`}>
                            {printableInvoice.type === 'invoice' ? 'SALES & ESTIMATE SLIP' : 'ESTIMATE / QUOTE'}
                          </div>
                          <div className="inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            NON-GST COUNTER
                          </div>
                          <p className="text-[9px] text-slate-500 mt-0.5">Theme: {pTheme.name}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                // Spider Grid Solutions (SGS - GST Invoice with SGS Logo & Theme)
                (() => {
                  const sThemeKey = printableInvoice.theme || adminSettings.billingTheme || 'modern_navy';
                  const sTheme = SGS_THEMES[sThemeKey] || SGS_THEMES.modern_navy;
                  return (
                    <div className={`border-b-2 pb-4 ${sTheme.headerBorder}`}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <SgsLogo url={adminSettings.workshopLogoUrl} size="md" />
                          <div>
                            <h2 className={`text-lg font-black tracking-tight ${sTheme.primary}`}>
                              {adminSettings.workshopName || 'SPIDER GRID SOLUTIONS'}
                            </h2>
                            <p className="text-[11px] text-slate-600 font-medium">
                              {adminSettings.workshopAddress || 'Madurai, Tamil Nadu'} · Phone: {adminSettings.workshopPhone || '+91 9677776001'}
                            </p>
                            {adminSettings.workshopGstin && (
                              <p className="text-[10px] font-mono text-slate-500">
                                GSTIN: <span className="font-bold text-slate-800">{adminSettings.workshopGstin}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded text-white ${sTheme.badgeBg}`}>
                            {printableInvoice.type === 'invoice' ? 'TAX INVOICE' : 'QUOTATION'}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">Theme: {sTheme.name}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Meta details */}
              <div className="flex justify-between text-xs pt-1 border-b pb-3">
                <div>
                  <p><strong>Billed To:</strong> {printableInvoice.customerName}</p>
                  <p className="text-slate-600">Phone: {printableInvoice.customerPhone || 'N/A'}</p>
                  <p className="text-slate-600">Location: {printableInvoice.customerArea || 'Madurai'}</p>
                </div>
                <div className="text-right">
                  <p><strong>Doc #:</strong> <span className="font-mono font-bold text-blue-700">{printableInvoice.invoiceNumber}</span></p>
                  <p className="text-slate-600">Date: {printableInvoice.date}</p>
                  <p className="text-slate-600 font-mono">Job ID: {printableInvoice.jobCardId || 'Direct Billing'}</p>
                </div>
              </div>

              {/* Items Table - With HSN column for SGS, without GST column for Pandiyan */}
              <table className="w-full text-left text-xs border">
                <thead className="bg-slate-100 border-b text-[11px] font-bold">
                  <tr>
                    <th className="py-2 px-3">Description</th>
                    {printableInvoice.billingFirm !== 'pandiyan' && (
                      <th className="py-2 px-2 text-center">HSN/SAC</th>
                    )}
                    <th className="py-2 px-2 text-center">Qty</th>
                    <th className="py-2 px-2 text-right">Rate (₹)</th>
                    {printableInvoice.billingFirm !== 'pandiyan' && (
                      <>
                        <th className="py-2 px-2 text-center">GST %</th>
                        <th className="py-2 px-2 text-right">GST (₹)</th>
                      </>
                    )}
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {printableInvoice.items.map((it, idx) => {
                    const itGst = it.gstPercent !== undefined ? it.gstPercent : (printableInvoice.billingFirm === 'pandiyan' ? 0 : printableInvoice.gstPercent);
                    const itTax = it.gstAmount ?? (((it.amount || (it.rate * it.quantity)) * itGst) / 100);
                    const itTotal = it.totalWithGst ?? (it.amount + itTax);
                    return (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-semibold whitespace-pre-line">{it.description}</td>
                        {printableInvoice.billingFirm !== 'pandiyan' && (
                          <td className="py-2 px-2 text-center font-mono text-[11px] text-blue-700">
                            {it.hsnCode || '998713'}
                          </td>
                        )}
                        <td className="py-2 px-2 text-center font-mono">{it.quantity}</td>
                        <td className="py-2 px-2 text-right font-mono">₹{it.rate.toLocaleString('en-IN')}</td>
                        {printableInvoice.billingFirm !== 'pandiyan' && (
                          <>
                            <td className="py-2 px-2 text-center font-mono text-blue-700 font-bold">{itGst}%</td>
                            <td className="py-2 px-2 text-right font-mono text-slate-700">₹{itTax.toFixed(2)}</td>
                          </>
                        )}
                        <td className="py-2 px-3 text-right font-mono font-bold">₹{itTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Summary Totals */}
              <div className="flex justify-end pt-1">
                <div className="w-72 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Value (Subtotal):</span>
                    <span className="font-mono">₹{printableInvoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {printableInvoice.billingFirm !== 'pandiyan' && printableInvoice.taxAmount > 0 && (() => {
                    const gstRate = printableInvoice.gstPercent || 18;
                    const halfRate = (gstRate / 2).toFixed(gstRate % 2 === 0 ? 0 : 1);
                    return (
                      <>
                        <div className="flex justify-between text-slate-600">
                          <span>CGST (Central Tax {halfRate}%):</span>
                          <span className="font-mono">₹{(printableInvoice.taxAmount / 2).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>SGST (State Tax {halfRate}%):</span>
                          <span className="font-mono">₹{(printableInvoice.taxAmount / 2).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-blue-700 font-semibold">
                          <span>Total GST Amount:</span>
                          <span className="font-mono">₹{printableInvoice.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </>
                    );
                  })()}
                  {printableInvoice.discount !== undefined && printableInvoice.discount > 0 && (
                    <div className="flex justify-between text-rose-600 font-semibold">
                      <span>Discount:</span>
                      <span className="font-mono">-₹{printableInvoice.discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {printableInvoice.roundOff !== undefined && printableInvoice.roundOff !== 0 && (
                    <div className="flex justify-between text-slate-600 font-mono">
                      <span>Round Off:</span>
                      <span>{printableInvoice.roundOff > 0 ? '+' : ''}₹{printableInvoice.roundOff.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm border-t pt-1.5">
                    <span>Grand Total:</span>
                    <span className="font-mono">₹{printableInvoice.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Paid Amount:</span>
                    <span className="font-mono">₹{printableInvoice.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {printableInvoice.grandTotal - printableInvoice.paidAmount > 0 && (
                    <div className="flex justify-between text-rose-700 font-bold border-t border-dashed pt-1">
                      <span>Balance Due:</span>
                      <span className="font-mono">₹{(printableInvoice.grandTotal - printableInvoice.paidAmount).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Amount in Words (Indian Currency) */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Amount in Words:</span>
                <p className="font-semibold text-slate-800 italic capitalize">
                  {numberToWordsIndian(printableInvoice.grandTotal)}
                </p>
              </div>

              {/* SGS Bank Account Details & UPI Section (Shown on Tax Invoices & Quotes) */}
              {printableInvoice.billingFirm !== 'pandiyan' && adminSettings.bankAccountNumber && (
                <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100 text-[11px] space-y-1">
                  <p className="font-bold text-blue-900">🏦 Bank Account Transfer Details:</p>
                  <div className="grid grid-cols-2 gap-x-3 text-slate-700 font-mono text-[10px]">
                    <div>Bank: <strong className="font-sans">{adminSettings.bankName || 'HDFC Bank'}</strong></div>
                    <div>A/C No: <strong>{adminSettings.bankAccountNumber}</strong></div>
                    <div>IFSC: <strong>{adminSettings.bankIfsc || 'HDFC0001234'}</strong></div>
                    <div>Branch: <strong className="font-sans">{adminSettings.bankBranch || 'Madurai'}</strong></div>
                  </div>
                </div>
              )}

              {/* Payment Details & UPI Reference */}
              <div className="p-3 rounded-lg bg-slate-50 border text-[11px] space-y-1">
                <p><strong>Payment Mode:</strong> <span className="uppercase font-semibold">{printableInvoice.paymentMode}</span></p>
                {printableInvoice.paymentReference && (
                  <p><strong>UPI Transaction / UTR Ref:</strong> <span className="font-mono font-bold text-blue-700">{printableInvoice.paymentReference}</span></p>
                )}
                {adminSettings.workshopUpiId && (
                  <p className="text-slate-500 font-mono text-[10px]">
                    Workshop UPI VPA: {adminSettings.workshopUpiId}
                  </p>
                )}
              </div>

              {/* Terms and Conditions + Rubber Stamp PNG & Authorized Signatory */}
              <div className="border-t pt-3 flex flex-col sm:flex-row items-end justify-between gap-4">
                <div className="flex-1 text-[10px] text-slate-600 space-y-0.5">
                  <p className="font-bold text-slate-800 uppercase tracking-wider">Terms & Conditions:</p>
                  <p className="whitespace-pre-line leading-relaxed">
                    {printableInvoice.billingFirm === 'pandiyan'
                      ? (adminSettings.pandiyanTerms || 'Goods once sold cannot be returned. Warranty valid per manufacturer.')
                      : (adminSettings.termsAndConditions || '1. Warranty valid only against physical invoice. 2. Spares carry manufacturer guarantee. 3. Subject to Madurai jurisdiction.')}
                  </p>
                  {printableInvoice.notes && (
                    <p className="italic text-slate-500 pt-1">Note: {printableInvoice.notes}</p>
                  )}
                </div>

                {/* Rubber Stamp and Authorized Signature Box */}
                <div className="w-52 text-center shrink-0 space-y-1">
                  <div className="relative h-24 border border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50/50 p-2 overflow-hidden">
                    {printableInvoice.billingFirm === 'pandiyan' ? (
                      <PandiyanStamp url={adminSettings.pandiyanRubberStampUrl} />
                    ) : (
                      <SgsStamp url={adminSettings.rubberStampUrl} />
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-slate-800">
                    For {printableInvoice.billingFirm === 'pandiyan' ? (adminSettings.pandiyanFirmName || 'Pandiyan Computers') : (adminSettings.workshopName || 'Spider Grid Solutions')}
                  </p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider">Authorized Signatory</p>
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-center text-[10px] text-slate-400 border-t pt-2 space-y-0.5">
                <p className="font-medium">Spider Grid Solutions · Computer, Laptop, CCTV & Network Sales & Service Center · Madurai</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {convertToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{convertToast}</span>
        </div>
      )}

      {/* Convert Quotation to Official Tax Invoice Modal */}
      {confirmConvertModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-600">
                  Convert Quotation to Official Invoice?
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Document: <strong className="font-mono">{confirmConvertModal.invoiceNumber}</strong>
                </p>
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border text-xs space-y-2 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer:</span>
                <span className="font-bold">{confirmConvertModal.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Amount:</span>
                <span className="font-mono font-bold text-emerald-600">₹{confirmConvertModal.grandTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Firm:</span>
                <span className="capitalize">{confirmConvertModal.billingFirm === 'pandiyan' ? 'Pandiyan Computers' : 'Spider Grid Solutions'}</span>
              </div>
            </div>

            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              This will convert this estimate into an Official Tax Invoice with sequence numbering, register profit metrics, and link with the customer record.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmConvertModal(null)}
                className={`px-4 py-2 text-xs rounded-xl font-medium cursor-pointer ${
                  isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    const targetId = confirmConvertModal.id;
                    const targetNum = confirmConvertModal.invoiceNumber;
                    const converted = convertQuotationToInvoice(targetId);
                    setConfirmConvertModal(null);
                    setDocTypeFilter('all');
                    setViewingInvoice(converted);
                    setConvertToast(`Quotation #${targetNum} converted to Official Invoice #${converted.invoiceNumber}!`);
                    setTimeout(() => setConvertToast(null), 4000);
                  } catch (err: any) {
                    alert(err?.message || 'Failed to convert quotation to invoice');
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Yes, Convert to Tax Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
