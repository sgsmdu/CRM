import React, { useState } from 'react';
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
  ChevronDown
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
import { calculateFromInclusiveRate, calculateFromBaseRate, GST_PRESET_RATES } from '../utils/gstUtils';

export const BillingCashFlow: React.FC = () => {
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
    addCashFlowEntry, 
    adminSettings, 
    inventory,
    theme 
  } = useSgs();
  
  const isDark = theme === 'dark';

  // Tabs
  const [activeTab, setActiveTab] = useState<'invoices' | 'cashflow'>('invoices');

  // Modals
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [printableInvoice, setPrintableInvoice] = useState<Invoice | null>(null);
  const [zoomedBillPhoto, setZoomedBillPhoto] = useState<string | null>(null);

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

  // Profit & Tax calculations for form
  const subtotalCalc = docItems.reduce((acc, it) => acc + (it.amount || 0), 0);
  const totalItemTaxCalc = docItems.reduce((acc, it) => {
    if (billingFirm === 'pandiyan') return 0;
    if (it.gstAmount !== undefined && it.gstAmount >= 0) return acc + it.gstAmount;
    const itPct = it.gstPercent ?? gstPercent ?? 0;
    return acc + Math.round(((it.amount || 0) * itPct) / 100);
  }, 0);
  const taxCalc = billingFirm === 'pandiyan' ? 0 : Math.round(totalItemTaxCalc);
  const grandTotalCalc = Math.round(subtotalCalc + taxCalc);

  const totalPurchaseCostCalc = docItems.reduce((acc, it) => acc + ((it.purchaseCost || 0) * (it.quantity || 1)), 0);
  const netProfitCalc = subtotalCalc - totalPurchaseCostCalc - Number(manualExtraCost || 0);
  const profitMarginPercentCalc = subtotalCalc > 0 ? Math.round((netProfitCalc / subtotalCalc) * 100) : 0;

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
        rate: 0, 
        grossRate: 0,
        gstPercent: defaultPct,
        gstAmount: 0,
        totalWithGst: 0,
        amount: 0, 
        purchaseCost: 0, 
        isService: false 
      }
    ]);
  };

  const handleSelectStockItem = (inv: InventoryItem) => {
    const defaultPct = billingFirm === 'pandiyan' ? 0 : (adminSettings.defaultGstPercent || 18);
    const unitP = inv.unitPrice || 0;
    const calc = calculateFromInclusiveRate(unitP, defaultPct, 1);
    setDocItems(prev => [
      ...prev,
      {
        description: inv.name,
        hsnCode: billingFirm === 'pandiyan' ? undefined : (inv.hsnCode || '8471'),
        quantity: 1,
        grossRate: unitP,
        gstPercent: defaultPct,
        rate: calc.baseRate,
        amount: calc.baseAmount,
        gstAmount: calc.totalGst,
        totalWithGst: calc.totalWithGst,
        purchaseCost: inv.unitCost || 0,
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
        grossRate: rate,
        gstPercent: defaultPct,
        rate: calc.baseRate,
        amount: calc.baseAmount,
        gstAmount: calc.totalGst,
        totalWithGst: calc.totalWithGst,
        purchaseCost: 0,
        isService: true,
      }
    ]);
  };

  const handleRemoveDocItem = (index: number) => {
    setDocItems(docItems.filter((_, i) => i !== index));
  };

  const handleDocItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...docItems];
    const current = { ...updated[index] };
    const defaultPct = billingFirm === 'pandiyan' ? 0 : (adminSettings.defaultGstPercent || 18);
    const itPct = current.gstPercent !== undefined ? current.gstPercent : defaultPct;
    const qty = field === 'quantity' ? Math.max(1, Number(value) || 1) : Math.max(1, current.quantity || 1);

    if (field === 'grossRate') {
      // User inputs amount with GST (Rate with GST)
      const gross = Math.max(0, Number(value) || 0);
      const calc = calculateFromInclusiveRate(gross, itPct, qty);
      updated[index] = {
        ...current,
        grossRate: gross,
        gstPercent: itPct,
        quantity: qty,
        rate: calc.baseRate,
        amount: calc.baseAmount,
        gstAmount: calc.totalGst,
        totalWithGst: calc.totalWithGst,
      };
    } else if (field === 'gstPercent') {
      // User types or changes GST % for this item -> reduce GST % from the rate!
      const pct = Math.max(0, Number(value) || 0);
      const gross = (current.grossRate !== undefined && current.grossRate > 0)
        ? current.grossRate
        : (current.rate * (1 + (current.gstPercent || 0) / 100));
      const calc = calculateFromInclusiveRate(gross, pct, qty);
      updated[index] = {
        ...current,
        gstPercent: pct,
        grossRate: gross,
        quantity: qty,
        rate: calc.baseRate,
        amount: calc.baseAmount,
        gstAmount: calc.totalGst,
        totalWithGst: calc.totalWithGst,
      };
    } else if (field === 'rate') {
      // User directly inputs Base Rate (Without GST)
      const base = Math.max(0, Number(value) || 0);
      const calc = calculateFromBaseRate(base, itPct, qty);
      updated[index] = {
        ...current,
        rate: base,
        grossRate: calc.grossRate,
        gstPercent: itPct,
        quantity: qty,
        amount: calc.baseAmount,
        gstAmount: calc.totalGst,
        totalWithGst: calc.totalWithGst,
      };
    } else if (field === 'quantity') {
      const q = Math.max(1, Number(value) || 1);
      const gross = (current.grossRate !== undefined && current.grossRate > 0)
        ? current.grossRate
        : (current.rate * (1 + itPct / 100));
      const calc = calculateFromInclusiveRate(gross, itPct, q);
      updated[index] = {
        ...current,
        quantity: q,
        amount: calc.baseAmount,
        gstAmount: calc.totalGst,
        totalWithGst: calc.totalWithGst,
      };
    } else {
      updated[index] = { ...current, [field]: value };
    }

    setDocItems(updated);
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
        rate: initCalc.baseRate, 
        amount: initCalc.baseAmount, 
        gstAmount: initCalc.totalGst,
        totalWithGst: 850,
        purchaseCost: 0, 
        isService: true 
      }
    ]);
    setGstPercent(defPct);
    setPaymentStatus('paid');
    setPaymentMode('upi');
    setPaymentReference('');
    setPaidAmount(850);
    setManualExtraCost(0);
    setAttachedBillImage(null);
    setInvoiceNotes(firm === 'pandiyan' ? 'Thank you for choosing Pandiyan Computers! Valid for 7 days.' : 'Thank you for trusting Spider Grid Solutions! Spares carry 1-year warranty.');
    setIsCreateInvoiceOpen(true);
  };

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
    setDocItems(inv.items.map(it => {
      const itGst = it.gstPercent !== undefined ? it.gstPercent : (inv.billingFirm === 'pandiyan' ? 0 : (inv.gstPercent || 0));
      const gross = it.grossRate !== undefined ? it.grossRate : (it.rate * (1 + itGst / 100));
      const calc = calculateFromInclusiveRate(gross, itGst, it.quantity);
      return {
        description: it.description,
        hsnCode: it.hsnCode || '998713',
        quantity: it.quantity,
        grossRate: gross,
        gstPercent: itGst,
        rate: it.rate || calc.baseRate,
        amount: it.amount || calc.baseAmount,
        gstAmount: it.gstAmount !== undefined ? it.gstAmount : calc.totalGst,
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
    const effectiveTaxAmount = billingFirm === 'pandiyan' ? 0 : taxCalc;
    const effectiveGrandTotal = subtotalCalc + effectiveTaxAmount;

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
        subtotal: subtotalCalc,
        gstPercent: effectiveGstPercent,
        taxAmount: effectiveTaxAmount,
        grandTotal: effectiveGrandTotal,
        paymentStatus,
        paymentMode,
        paymentReference: paymentReference.trim() || undefined,
        paidAmount: Number(paidAmount) || 0,
        purchaseCostTotal: totalPurchaseCostCalc,
        manualExtraCost: Number(manualExtraCost) || 0,
        profitAmount: netProfitCalc,
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
        subtotal: subtotalCalc,
        gstPercent: effectiveGstPercent,
        taxAmount: effectiveTaxAmount,
        grandTotal: effectiveGrandTotal,
        paymentStatus,
        paymentMode,
        paymentReference: paymentReference.trim() || undefined,
        paidAmount: Number(paidAmount) || 0,
        purchaseCostTotal: totalPurchaseCostCalc,
        manualExtraCost: Number(manualExtraCost) || 0,
        profitAmount: netProfitCalc,
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
            <div className="relative w-full sm:w-72">
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
                    filteredInvoices.map((inv) => {
                      const isInvoice = inv.type === 'invoice';
                      const isCancelled = inv.status === 'cancelled';
                      const statusColor = 
                        isCancelled ? (isDark ? 'text-rose-400 bg-rose-950/50 border-rose-800' : 'text-rose-700 bg-rose-50 border-rose-200') :
                        inv.paymentStatus === 'paid' ? (isDark ? 'text-emerald-400 bg-emerald-950/50 border-emerald-800' : 'text-emerald-700 bg-emerald-50 border-emerald-200') :
                        inv.paymentStatus === 'partial' ? (isDark ? 'text-amber-400 bg-amber-950/50 border-amber-800' : 'text-amber-700 bg-amber-50 border-amber-200') :
                        (isDark ? 'text-slate-400 bg-slate-900 border-slate-800' : 'text-slate-700 bg-slate-100 border-slate-200');

                      return (
                        <tr key={inv.id} className={`transition-colors ${isDark ? 'hover:bg-slate-900/60' : 'hover:bg-slate-50'} ${isCancelled ? 'opacity-60 bg-rose-500/5' : ''}`}>
                          
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
                        <th className="py-2.5 px-2">HSN/SAC</th>
                        <th className="py-2.5 px-2 text-center">Qty</th>
                        <th className="py-2.5 px-2 text-right">Base Rate</th>
                        <th className="py-2.5 px-2 text-center">GST %</th>
                        <th className="py-2.5 px-2 text-right">GST (₹)</th>
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
                            <td className="py-2 px-3 font-semibold">{it.description}</td>
                            <td className="py-2 px-2 font-mono text-[11px] text-blue-600">
                              {it.hsnCode || '998713'}
                            </td>
                            <td className="py-2 px-2 text-center font-mono">{it.quantity}</td>
                            <td className="py-2 px-2 text-right font-mono">₹{it.rate.toLocaleString('en-IN')}</td>
                            <td className="py-2 px-2 text-center font-mono font-bold text-blue-600">
                              {itGst}%
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-amber-600">
                              ₹{itTax.toLocaleString('en-IN')}
                            </td>
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
                    <TrendingUp className="w-4 h-4" /> Bill Profit & Loss Breakdown
                  </span>
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                    Net Profit: +₹{(viewingInvoice.profitAmount || (viewingInvoice.subtotal - (viewingInvoice.purchaseCostTotal || 0) - (viewingInvoice.manualExtraCost || 0))).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Billed Subtotal</span>
                    <p className="font-mono font-bold mt-0.5">₹{viewingInvoice.subtotal.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Spares Purchase Cost</span>
                    <p className={`font-mono font-bold mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                      -₹{(viewingInvoice.purchaseCostTotal || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Extra Manual Cost</span>
                    <p className={`font-mono font-bold mt-0.5 ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                      -₹{(viewingInvoice.manualExtraCost || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Profit Margin</span>
                    <p className="font-mono font-bold text-emerald-600 mt-0.5">
                      {viewingInvoice.subtotal > 0 ? Math.round(((viewingInvoice.profitAmount || 0) / viewingInvoice.subtotal) * 100) : 0}% Margin
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Details & UPI Reference */}
              <div className={`p-4 rounded-xl border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Grand Total</span>
                  <p className="font-mono font-bold text-sm mt-0.5">₹{viewingInvoice.grandTotal.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Amount Paid</span>
                  <p className="font-mono font-bold text-sm text-emerald-600 mt-0.5">₹{viewingInvoice.paidAmount.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Payment Mode</span>
                  <p className="font-bold uppercase mt-0.5">{viewingInvoice.paymentMode}</p>
                </div>
                <div>
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>UPI / UTR Transaction ID</span>
                  <p className="font-mono text-blue-600 mt-0.5">{viewingInvoice.paymentReference || 'None on record'}</p>
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

                <button
                  type="button"
                  onClick={() => handleOpenEditModal(viewingInvoice)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-700'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Bill
                </button>

                <button
                  type="button"
                  onClick={() => handleDuplicateInvoice(viewingInvoice.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border cursor-pointer ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-700'
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" /> Duplicate
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

      {/* Create / Edit Invoice Modal */}
      {isCreateInvoiceOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-3xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div>
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {editingInvoiceId ? 'Edit Invoice / Quotation' : 'Create Customer Invoice / Quotation'}
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Includes itemized HSN codes, purchase costs, manual expense adjustment, and UPI references
                </p>
              </div>
              <button
                onClick={() => setIsCreateInvoiceOpen(false)}
                className={`p-1 rounded-lg cursor-pointer ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="p-6 space-y-4 overflow-y-auto flex-1">
              
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
                          setGstPercent(adminSettings.defaultGstPercent || 18);
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
                    Search & Select Golden Customer (31 Roster)
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsStockPickerOpen(!isStockPickerOpen)}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800"
                    >
                      <Boxes className="w-3.5 h-3.5" /> Search Stock Inventory
                    </button>
                    <button
                      type="button"
                      onClick={handleAddDocItem}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Blank Item
                    </button>
                  </div>
                </div>

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
                        .map(inv => (
                          <div
                            key={inv.id}
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
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleDocItemChange(idx, 'description', e.target.value)}
                            placeholder="e.g. Chip-Level Motherboard Diagnostic / RAM Upgrade"
                            className={`w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none ${
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

                      {/* Bottom Row: GST Breakdown & Calculation Grid */}
                      <div className={`p-2.5 rounded-lg border grid grid-cols-2 sm:grid-cols-6 gap-2.5 items-end text-xs ${
                        isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                      }`}>
                        {/* 1. Rate with GST (Gross / Inclusive) */}
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <label className={`text-[10px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                              Rate with GST (₹)
                            </label>
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/80 px-1 rounded">Gross</span>
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              value={item.grossRate !== undefined ? item.grossRate : Math.round((item.rate * (1 + (item.gstPercent || 0)/100)) * 100) / 100}
                              onChange={(e) => handleDocItemChange(idx, 'grossRate', e.target.value)}
                              placeholder="Rate with GST"
                              className={`w-full rounded-md pl-4 pr-1.5 py-1 text-xs font-mono font-bold focus:outline-none ${
                                isDark ? 'bg-slate-900 border border-emerald-800 text-emerald-300' : 'bg-white border border-emerald-300 text-emerald-800'
                              }`}
                            />
                            <span className="text-[10px] absolute left-1.5 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">₹</span>
                          </div>
                        </div>

                        {/* 2. Individual GST % Input Box */}
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <label className={`text-[10px] font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                              GST % Box
                            </label>
                            <span className="text-[9px] text-blue-500 font-mono">Tax %</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="relative flex-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={item.gstPercent !== undefined ? item.gstPercent : (billingFirm === 'pandiyan' ? 0 : 18)}
                                onChange={(e) => handleDocItemChange(idx, 'gstPercent', e.target.value)}
                                placeholder="GST %"
                                className={`w-full rounded-md pl-2 pr-4 py-1 text-xs font-mono font-bold text-center focus:outline-none ${
                                  isDark ? 'bg-slate-900 border border-blue-700 text-blue-300' : 'bg-white border border-blue-400 text-blue-800'
                                }`}
                              />
                              <span className="text-[10px] absolute right-1.5 top-1/2 -translate-y-1/2 text-blue-500 font-bold">%</span>
                            </div>
                          </div>
                          {/* Quick GST % Presets */}
                          <div className="flex items-center gap-1 mt-1">
                            {[0, 5, 12, 18, 28].map(ratePct => (
                              <button
                                key={ratePct}
                                type="button"
                                onClick={() => handleDocItemChange(idx, 'gstPercent', ratePct)}
                                className={`text-[9px] font-bold px-1 py-0.5 rounded transition-colors cursor-pointer ${
                                  (item.gstPercent ?? (billingFirm === 'pandiyan' ? 0 : 18)) === ratePct
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-100'
                                }`}
                              >
                                {ratePct}%
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 3. Base Rate without GST (Reduced Rate) */}
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <label className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Base Rate (Excl GST)
                            </label>
                            <span className="text-[9px] text-slate-400 font-mono">Reduced</span>
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              value={item.rate || 0}
                              onChange={(e) => handleDocItemChange(idx, 'rate', e.target.value)}
                              placeholder="Base Rate"
                              className={`w-full rounded-md pl-4 pr-1.5 py-1 text-xs font-mono focus:outline-none ${
                                isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                              }`}
                            />
                            <span className="text-[10px] absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                          </div>
                          <span className="text-[9px] text-slate-500 block truncate mt-0.5">
                            {item.gstPercent && item.gstPercent > 0 ? `-${item.gstPercent}% reduced` : 'Zero Tax'}
                          </span>
                        </div>

                        {/* 4. GST Tax Amount */}
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <label className={`text-[10px] font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                              GST Tax (₹)
                            </label>
                            <span className="text-[9px] text-amber-500 font-mono">Tax Amount</span>
                          </div>
                          <div className={`rounded-md px-2 py-1 text-xs font-mono font-bold border ${
                            isDark ? 'bg-slate-900 border-amber-900/60 text-amber-300' : 'bg-white border-amber-200 text-amber-800'
                          }`}>
                            +₹{(item.gstAmount ?? Math.round(((item.amount || 0) * (item.gstPercent || 0)) / 100)).toLocaleString('en-IN')}
                          </div>
                          <span className="text-[9px] text-slate-400 block truncate mt-0.5 font-mono">
                            CGST: ₹{Math.round(((item.gstAmount || 0) / 2) * 10) / 10} | SGST: ₹{Math.round(((item.gstAmount || 0) / 2) * 10) / 10}
                          </span>
                        </div>

                        {/* 5. Spare Cost (for Profit & Loss) */}
                        <div>
                          <label className={`block text-[10px] font-bold mb-0.5 truncate ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                            Spare Cost (₹)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              value={item.purchaseCost || 0}
                              onChange={(e) => handleDocItemChange(idx, 'purchaseCost', Number(e.target.value))}
                              placeholder="Spare Cost"
                              className={`w-full rounded-md pl-4 pr-1.5 py-1 text-xs font-mono focus:outline-none ${
                                isDark ? 'bg-slate-900 border border-slate-700 text-rose-300' : 'bg-white border border-slate-300 text-rose-700'
                              }`}
                            />
                            <span className="text-[10px] absolute left-1.5 top-1/2 -translate-y-1/2 text-rose-400">₹</span>
                          </div>
                          <span className="text-[9px] text-slate-500 block truncate mt-0.5">Workshop cost</span>
                        </div>

                        {/* 6. Total With GST */}
                        <div className="text-right">
                          <label className={`block text-[10px] font-bold mb-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                            Item Total with GST
                          </label>
                          <div className={`rounded-md px-2 py-1 text-xs font-mono font-bold text-right border ${
                            isDark ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          }`}>
                            ₹{(item.totalWithGst ?? ((item.amount || 0) + (item.gstAmount || 0))).toLocaleString('en-IN')}
                          </div>
                          <span className="text-[9px] text-slate-400 block truncate mt-0.5 font-mono">
                            Base: ₹{(item.amount || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
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
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                    Estimated Profit: +₹{netProfitCalc.toLocaleString('en-IN')} ({profitMarginPercentCalc}%)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Billed Amount</span>
                    <p className="font-mono font-bold text-sm mt-0.5">₹{subtotalCalc.toLocaleString('en-IN')}</p>
                  </div>

                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Spares Purchase Cost</span>
                    <p className={`font-mono font-bold text-sm mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                      -₹{totalPurchaseCostCalc.toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div>
                    <label className={`block font-semibold mb-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Extra Manual Expenses (₹)
                    </label>
                    <input
                      type="number"
                      value={manualExtraCost}
                      onChange={(e) => setManualExtraCost(Number(e.target.value))}
                      placeholder="e.g. Travel, outside lathe"
                      className={`w-full rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-none ${
                        isDark ? 'bg-slate-900 border border-slate-700 text-rose-400' : 'bg-white border border-slate-300 text-rose-700'
                      }`}
                    />
                  </div>

                  <div>
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Net Profit</span>
                    <p className="font-mono font-bold text-base text-emerald-600 mt-0.5">
                      +₹{netProfitCalc.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tax & Total */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>GST Percentage</label>
                  <select
                    value={gstPercent}
                    onChange={(e) => setGstPercent(Number(e.target.value))}
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value={0}>0% (Non-GST / Composition)</option>
                    <option value={5}>5% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={18}>18% GST (Standard)</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Grand Total (₹)</label>
                  <input
                    type="number"
                    value={grandTotalCalc}
                    readOnly
                    className={`w-full rounded-lg px-3 py-2 text-xs font-mono font-bold focus:outline-none ${
                      isDark ? 'bg-slate-900 border border-slate-800 text-white' : 'bg-slate-100 border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Paid Amount (₹)</label>
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
              </div>

              {/* Payment Mode & Reference Filling Option */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer (NEFT / IMPS)</option>
                    <option value="card">Debit / Credit Card</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>

                <div>
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

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Payment Status
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="paid">Paid in Full</option>
                    <option value="partial">Partial Payment</option>
                    <option value="unpaid">Unpaid / Credit</option>
                  </select>
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
                  onClick={() => setIsCreateInvoiceOpen(false)}
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
                    <th className="py-2 px-2 text-right">Base Rate</th>
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
                    const itTax = it.gstAmount ?? Math.round(((it.amount || (it.rate * it.quantity)) * itGst) / 100);
                    const itTotal = it.totalWithGst ?? (it.amount + itTax);
                    return (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-semibold">{it.description}</td>
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
                            <td className="py-2 px-2 text-right font-mono text-slate-700">₹{itTax.toLocaleString('en-IN')}</td>
                          </>
                        )}
                        <td className="py-2 px-3 text-right font-mono font-bold">₹{itTotal.toLocaleString('en-IN')}</td>
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
                    <span className="font-mono">₹{printableInvoice.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {printableInvoice.billingFirm !== 'pandiyan' && printableInvoice.taxAmount > 0 && (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>CGST (Central Tax 50%):</span>
                        <span className="font-mono">₹{(Math.round((printableInvoice.taxAmount / 2) * 10) / 10).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>SGST (State Tax 50%):</span>
                        <span className="font-mono">₹{(Math.round((printableInvoice.taxAmount / 2) * 10) / 10).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-blue-700 font-semibold">
                        <span>Total GST Amount:</span>
                        <span className="font-mono">₹{printableInvoice.taxAmount.toLocaleString('en-IN')}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between font-bold text-sm border-t pt-1.5">
                    <span>Grand Total:</span>
                    <span className="font-mono">₹{printableInvoice.grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Paid Amount:</span>
                    <span className="font-mono">₹{printableInvoice.paidAmount.toLocaleString('en-IN')}</span>
                  </div>
                  {printableInvoice.grandTotal - printableInvoice.paidAmount > 0 && (
                    <div className="flex justify-between text-rose-700 font-bold border-t border-dashed pt-1">
                      <span>Balance Due:</span>
                      <span className="font-mono">₹{(printableInvoice.grandTotal - printableInvoice.paidAmount).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
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

    </div>
  );
};
