import React, { useState, useMemo, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Receipt, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Plus, 
  Trash2, 
  IndianRupee, 
  Search, 
  ExternalLink,
  CreditCard,
  X,
  FileText,
  Eye,
  Maximize2,
  Building2,
  Phone,
  MapPin,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  UserPlus,
  Edit2,
  Filter,
  Boxes,
  ArrowRightLeft,
  Layers
} from 'lucide-react';
import { useSgs } from '../context/SgsContext';
import { VendorBill, VendorBillItem, PaymentMode, Vendor } from '../types';
import { calculateFromInclusiveRate, calculateFromBaseRate, GST_PRESET_RATES } from '../utils/gstUtils';

interface VendorBillScannerProps {
  isScannerModalOpen: boolean;
  setIsScannerModalOpen: (open: boolean) => void;
}

export const VendorBillScanner: React.FC<VendorBillScannerProps> = ({
  isScannerModalOpen,
  setIsScannerModalOpen,
}) => {
  const { 
    vendorBills, 
    addVendorBill, 
    updateVendorBillPayment, 
    updateVendorBill,
    vendors, 
    addVendor, 
    updateVendor, 
    deleteVendor, 
    inventory,
    theme 
  } = useSgs();

  const isDark = theme === 'dark';

  // Navigation tab inside Vendor Hub: 'bills' | 'vendors'
  const [activeView, setActiveView] = useState<'bills' | 'vendors'>('vendors');

  // Scanner upload state
  const [billImage, setBillImage] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);

  // Extracted/Edited Form Fields
  const [vendorName, setVendorName] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [isVendorDropdownOpen, setIsVendorDropdownOpen] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<VendorBillItem[]>([
    { itemName: '', quantity: 1, unitCost: 0, grossUnitCost: 0, gstPercent: 18, gstAmount: 0, total: 0, totalWithGst: 0 },
  ]);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [roundOff, setRoundOff] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending' | 'partial'>('paid');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('upi');
  const [paymentReference, setPaymentReference] = useState('');
  const [autoUpdateStock, setAutoUpdateStock] = useState(true);
  const [notes, setNotes] = useState('');

  // Auto-fill and keep paidAmount in sync when paymentStatus is 'paid'
  useEffect(() => {
    if (paymentStatus === 'paid') {
      setPaidAmount(totalAmount);
    }
  }, [paymentStatus, totalAmount]);

  // Stock Search / Picker Drawer
  const [isStockPickerOpen, setIsStockPickerOpen] = useState(false);
  const [stockSearchQuery, setStockSearchQuery] = useState('');

  // Payment update modal
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<VendorBill | null>(null);
  const [payModalAmount, setPayModalAmount] = useState<number>(0);
  const [payModalStatus, setPayModalStatus] = useState<'paid' | 'pending' | 'partial'>('paid');
  const [payModalMode, setPayModalMode] = useState<PaymentMode>('upi');
  const [payModalRef, setPayModalRef] = useState('');

  // Bill Detail Viewer Modal
  const [viewingBill, setViewingBill] = useState<VendorBill | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Vendor Register / Edit Modal
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [vendorFormData, setVendorFormData] = useState({
    name: '',
    phone: '',
    gstin: '',
    address: 'Madurai, Tamil Nadu',
    category: 'Hardware & Spares',
    upiId: '',
    bankDetails: '',
    notes: '',
  });

  // Expanded vendor bills tracker in Vendor directory
  const [expandedVendorId, setExpandedVendorId] = useState<string | null>(null);

  // Expanded individual bill tracker for inline expansion in bills view
  const [expandedBillIds, setExpandedBillIds] = useState<string[]>([]);
  const toggleBillExpand = (id: string) => {
    setExpandedBillIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Expanded items in bill entry scanner modal: shows main thing only by default, click to expand full form
  const [expandedItemIndices, setExpandedItemIndices] = useState<number[]>([0]);
  const toggleItemExpand = (index: number) => {
    setExpandedItemIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  // Search filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendorFilter, setSelectedVendorFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');

  // Handle image upload from camera or file picker
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageMime(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setBillImage(base64);
      setScanError(null);
      setScanSuccess(false);
    };
    reader.readAsDataURL(file);
  };

  // Trigger Gemini OCR
  const handleScanWithGemini = async () => {
    if (!billImage) {
      setScanError('Please select or capture a bill photo first');
      return;
    }

    try {
      setIsScanning(true);
      setScanError(null);

      const response = await fetch('/api/scan-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: billImage,
          mimeType: imageMime,
        }),
      });

      const result = await response.json().catch(() => null);

      if (response.ok && result?.success && result?.data) {
        const d = result.data;
        if (d.vendorName) {
          setVendorName(d.vendorName);
          // Check if matches an existing vendor
          const match = vendors.find(v => v.name.toLowerCase().includes(d.vendorName.toLowerCase()));
          if (match) setSelectedVendorId(match.id);
        }
        if (d.invoiceNumber) setInvoiceNumber(d.invoiceNumber);
        if (d.invoiceDate) setInvoiceDate(d.invoiceDate);
        if (d.totalAmount) {
          setTotalAmount(d.totalAmount);
          setPaidAmount(d.totalAmount);
        }
        if (d.taxAmount) setTaxAmount(d.taxAmount);
        if (d.items && Array.isArray(d.items) && d.items.length > 0) {
          setItems(d.items.map((it: any) => {
            const qty = Math.max(1, Number(it.quantity) || 1);
            const gstPct = it.gstPercent !== undefined && it.gstPercent !== null ? Number(it.gstPercent) : 18;
            const gross = it.grossUnitCost 
              ? Number(it.grossUnitCost) 
              : (it.unitCost ? Number(it.unitCost) : (Number(it.total) / qty || 0));
            const calc = calculateFromInclusiveRate(gross, gstPct, qty);
            return {
              itemName: it.itemName || 'Spare Part',
              hsnCode: it.hsnCode || '',
              quantity: qty,
              grossUnitCost: gross,
              gstPercent: gstPct,
              unitCost: calc.baseRate,
              total: calc.baseAmount,
              gstAmount: calc.totalGst,
              totalWithGst: calc.totalWithGst,
            };
          }));
        }
        setScanSuccess(true);
        setExpandedItemIndices([0]);
      } else {
        const serverError = result?.error || (response.status === 402 
          ? 'Google Gemini API prepayment credits are depleted. Please check your project billing or attach an active API key.' 
          : `Server responded with status ${response.status}. Please enter details manually.`);
        setScanError(serverError);
      }
    } catch (err: any) {
      console.warn('OCR fetch error:', err);
      setScanError(err.message || 'Network error connecting to OCR service. Please enter details manually below.');
    } finally {
      setIsScanning(false);
    }
  };

  // Dynamic Item calculations with per-item GST input & auto-reduction
  const handleItemChange = (index: number, field: keyof VendorBillItem, value: any) => {
    const updated = [...items];
    const current = { ...updated[index] };
    const itPct = current.gstPercent !== undefined ? current.gstPercent : 18;
    const qty = field === 'quantity' ? Math.max(1, Number(value) || 1) : Math.max(1, current.quantity || 1);

    if (field === 'grossUnitCost') {
      // User inputs amount with GST (Gross Unit Cost) -> reduces GST % from the rate
      const gross = Math.max(0, Number(value) || 0);
      const calc = calculateFromInclusiveRate(gross, itPct, qty);
      updated[index] = {
        ...current,
        grossUnitCost: gross,
        gstPercent: itPct,
        quantity: qty,
        unitCost: calc.baseRate,
        total: calc.baseAmount,
        gstAmount: calc.totalGst,
        totalWithGst: calc.totalWithGst,
      };
    } else if (field === 'gstPercent') {
      // User inputs/changes GST % for this specific item -> reduce GST % from the rate!
      const pct = Math.max(0, Number(value) || 0);
      const gross = (current.grossUnitCost !== undefined && current.grossUnitCost > 0)
        ? current.grossUnitCost
        : (current.unitCost * (1 + (current.gstPercent || 0) / 100));
      const calc = calculateFromInclusiveRate(gross, pct, qty);
      updated[index] = {
        ...current,
        gstPercent: pct,
        grossUnitCost: gross,
        quantity: qty,
        unitCost: calc.baseRate,
        total: calc.baseAmount,
        gstAmount: calc.totalGst,
        totalWithGst: calc.totalWithGst,
      };
    } else if (field === 'unitCost') {
      // User directly inputs Base Unit Cost (Without GST)
      const base = Math.max(0, Number(value) || 0);
      const calc = calculateFromBaseRate(base, itPct, qty);
      updated[index] = {
        ...current,
        unitCost: base,
        grossUnitCost: calc.grossRate,
        gstPercent: itPct,
        quantity: qty,
        total: calc.baseAmount,
        gstAmount: calc.totalGst,
        totalWithGst: calc.totalWithGst,
      };
    } else if (field === 'quantity') {
      const q = Math.max(1, Number(value) || 1);
      const gross = (current.grossUnitCost !== undefined && current.grossUnitCost > 0)
        ? current.grossUnitCost
        : (current.unitCost * (1 + itPct / 100));
      const calc = calculateFromInclusiveRate(gross, itPct, q);
      updated[index] = {
        ...current,
        quantity: q,
        total: calc.baseAmount,
        gstAmount: calc.totalGst,
        totalWithGst: calc.totalWithGst,
      };
    } else {
      updated[index] = { ...current, [field]: value };
    }

    setItems(updated);

    // Sum overall totals as per exact value (no integer rounding)
    const sumBase = Number(updated.reduce((acc, it) => acc + (it.total || 0), 0).toFixed(2));
    const sumGst = Number(updated.reduce((acc, it) => acc + (it.gstAmount || 0), 0).toFixed(2));
    setTaxAmount(sumGst);
    setTotalAmount(Number(Math.max(0, sumBase + sumGst - (discount || 0) + (roundOff || 0)).toFixed(2)));
  };

  const handleAddItem = () => {
    setItems(prev => {
      setExpandedItemIndices(old => [...old, prev.length]);
      return [...prev, { 
        itemName: '', 
        quantity: 1, 
        unitCost: 0, 
        grossUnitCost: 0, 
        gstPercent: 18, 
        gstAmount: 0, 
        total: 0, 
        totalWithGst: 0 
      }];
    });
  };

  const handleSelectStockItem = (inv: any) => {
    const grossCost = inv.unitCost || 0;
    const calc = calculateFromInclusiveRate(grossCost, 18, 1);
    const updated = [
      ...items.filter(it => it.itemName.trim() !== '' || items.length === 1 && it.itemName === '' ? false : true),
      {
        itemName: inv.name,
        hsnCode: inv.hsnCode || '8471',
        quantity: 1,
        grossUnitCost: grossCost,
        gstPercent: 18,
        unitCost: calc.baseRate,
        total: calc.baseAmount,
        gstAmount: calc.totalGst,
        totalWithGst: calc.totalWithGst,
        matchedInventoryId: inv.id,
        syncMode: 'merge_existing' as const,
      }
    ];
    setItems(updated);
    const sumBase = Number(updated.reduce((acc, it) => acc + (it.total || 0), 0).toFixed(2));
    const sumGst = Number(updated.reduce((acc, it) => acc + (it.gstAmount || 0), 0).toFixed(2));
    setTaxAmount(sumGst);
    setTotalAmount(Number(Math.max(0, sumBase + sumGst - (discount || 0) + (roundOff || 0)).toFixed(2)));
    setIsStockPickerOpen(false);
    setStockSearchQuery('');
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    const sumBase = Number(updated.reduce((acc, it) => acc + (it.total || 0), 0).toFixed(2));
    const sumGst = Number(updated.reduce((acc, it) => acc + (it.gstAmount || 0), 0).toFixed(2));
    setTaxAmount(sumGst);
    setTotalAmount(Number(Math.max(0, sumBase + sumGst - (discount || 0) + (roundOff || 0)).toFixed(2)));
  };

  // Auto-sync paidAmount when paymentStatus is 'paid'
  useEffect(() => {
    if (paymentStatus === 'paid') {
      setPaidAmount(totalAmount);
    }
  }, [totalAmount, paymentStatus]);

  // Save new bill
  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      alert('Please enter or select a vendor name');
      return;
    }
    if (!invoiceNumber.trim()) {
      alert('Please enter invoice / bill number');
      return;
    }

    // Auto-register vendor if not yet existing
    let matchedVendorId = selectedVendorId;
    if (!matchedVendorId) {
      const existing = vendors.find(v => v.name.toLowerCase() === vendorName.trim().toLowerCase());
      if (existing) {
        matchedVendorId = existing.id;
      } else {
        const newV = addVendor({
          name: vendorName.trim(),
          category: 'Hardware & Spares',
          address: 'Madurai',
          notes: 'Auto-registered via Vendor Bill',
        });
        matchedVendorId = newV.id;
      }
    }

    const sumBase = Number(items.reduce((acc, it) => acc + (it.total || 0), 0).toFixed(2));
    const effectiveDiscount = Number(discount) || 0;
    const effectiveRoundOff = Number(roundOff) || 0;

    addVendorBill({
      vendorId: matchedVendorId,
      vendorName: vendorName.trim(),
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate,
      billImage: billImage || undefined,
      items: items.filter(it => it.itemName.trim() !== ''),
      subtotal: sumBase,
      taxAmount: Number(taxAmount) || 0,
      discount: effectiveDiscount,
      roundOff: effectiveRoundOff,
      totalAmount,
      paidAmount: Number(paidAmount) || 0,
      paymentStatus,
      paymentMode,
      paymentReference: paymentReference.trim() || undefined,
      notes,
    }, autoUpdateStock);

    setIsScannerModalOpen(false);
  };

  // Record payment for bill
  const handleConfirmPaymentUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillForPayment) return;

    updateVendorBillPayment(
      selectedBillForPayment.id,
      payModalAmount,
      payModalStatus,
      payModalMode,
      payModalRef
    );

    setSelectedBillForPayment(null);
  };

  // Vendor Register / Edit Handlers
  const handleOpenAddVendorModal = () => {
    setEditingVendor(null);
    setVendorFormData({
      name: '',
      phone: '',
      gstin: '',
      address: 'Madurai, Tamil Nadu',
      category: 'Hardware & Spares',
      upiId: '',
      bankDetails: '',
      notes: '',
    });
    setIsVendorModalOpen(true);
  };

  const handleOpenEditVendorModal = (v: Vendor) => {
    setEditingVendor(v);
    setVendorFormData({
      name: v.name,
      phone: v.phone || '',
      gstin: v.gstin || '',
      address: v.address || 'Madurai, Tamil Nadu',
      category: v.category || 'Hardware & Spares',
      upiId: v.upiId || '',
      bankDetails: v.bankDetails || '',
      notes: v.notes || '',
    });
    setIsVendorModalOpen(true);
  };

  const handleSaveVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorFormData.name.trim()) {
      alert('Please enter vendor name');
      return;
    }

    if (editingVendor) {
      updateVendor(editingVendor.id, vendorFormData);
    } else {
      addVendor(vendorFormData);
    }
    setIsVendorModalOpen(false);
  };

  const handleDeleteVendor = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete vendor "${name}"? Existing bills will be preserved.`)) {
      deleteVendor(id);
    }
  };

  // Aggregated stats per Vendor
  const vendorLedgerStats = useMemo(() => {
    const stats: Record<string, { totalPurchases: number; totalPaid: number; pending: number; bills: VendorBill[] }> = {};
    
    vendors.forEach(v => {
      stats[v.id] = { totalPurchases: 0, totalPaid: 0, pending: 0, bills: [] };
    });

    vendorBills.forEach(bill => {
      // Find matching vendor
      let vId = bill.vendorId;
      if (!vId) {
        const matched = vendors.find(v => v.name.toLowerCase() === bill.vendorName.toLowerCase());
        if (matched) vId = matched.id;
      }

      if (vId && stats[vId]) {
        stats[vId].totalPurchases += (bill.totalAmount || 0);
        stats[vId].totalPaid += (bill.paidAmount || 0);
        stats[vId].pending += ((bill.totalAmount || 0) - (bill.paidAmount || 0));
        stats[vId].bills.push(bill);
      }
    });

    return stats;
  }, [vendors, vendorBills]);

  // Overall totals
  const totalPurchases = vendorBills.reduce((acc, b) => acc + (b.totalAmount || 0), 0);
  const totalPaid = vendorBills.reduce((acc, b) => acc + (b.paidAmount || 0), 0);
  const totalPending = totalPurchases - totalPaid;

  // Filtered Bills
  const filteredBills = useMemo(() => {
    return vendorBills.filter(bill => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        bill.vendorName.toLowerCase().includes(q) ||
        bill.invoiceNumber.toLowerCase().includes(q) ||
        (bill.paymentReference && bill.paymentReference.toLowerCase().includes(q)) ||
        bill.items.some(it => it.itemName.toLowerCase().includes(q));

      const matchesVendor = 
        selectedVendorFilter === 'all' || 
        bill.vendorId === selectedVendorFilter || 
        bill.vendorName.toLowerCase() === selectedVendorFilter.toLowerCase();

      const matchesStatus = 
        paymentStatusFilter === 'all' || 
        bill.paymentStatus === paymentStatusFilter;

      return matchesSearch && matchesVendor && matchesStatus;
    });
  }, [vendorBills, searchQuery, selectedVendorFilter, paymentStatusFilter]);

  // Filtered Vendors for directory
  const filteredVendors = useMemo(() => {
    return vendors.filter(v => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        v.name.toLowerCase().includes(q) ||
        (v.phone && v.phone.includes(q)) ||
        (v.gstin && v.gstin.toLowerCase().includes(q)) ||
        (v.category && v.category.toLowerCase().includes(q)) ||
        (v.address && v.address.toLowerCase().includes(q))
      );
    });
  }, [vendors, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Top Banner & View Switcher */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 transition-colors ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
              Vendor & Spares Hub
            </span>
            <span className="text-slate-400">·</span>
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Total Purchases & Outstanding Balance
            </span>
          </div>
          <h2 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Vendor Directory, Invoices & OCR Scanner
          </h2>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Sub-view switcher */}
          <div className={`flex rounded-lg p-1 border ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setActiveView('vendors')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeView === 'vendors'
                  ? (isDark ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-blue-700 shadow-xs font-bold')
                  : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              Vendor Directory ({vendors.length})
            </button>
            <button
              onClick={() => setActiveView('bills')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeView === 'bills'
                  ? (isDark ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-blue-700 shadow-xs font-bold')
                  : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
              }`}
            >
              All Invoices ({vendorBills.length})
            </button>
          </div>

          <button
            onClick={handleOpenAddVendorModal}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              isDark ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-blue-500" />
            <span>Register Vendor</span>
          </button>

          <button
            onClick={() => {
              setBillImage(null);
              setVendorName('');
              setSelectedVendorId('');
              setInvoiceNumber('');
              setInvoiceDate(new Date().toISOString().split('T')[0]);
              setItems([{ itemName: '', quantity: 1, unitCost: 0, grossUnitCost: 0, gstPercent: 18, gstAmount: 0, total: 0, totalWithGst: 0 }]);
              setTaxAmount(0);
              setDiscount(0);
              setRoundOff(0);
              setTotalAmount(0);
              setPaidAmount(0);
              setPaymentStatus('paid');
              setPaymentReference('');
              setIsStockPickerOpen(false);
              setStockSearchQuery('');
              setIsScannerModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Scan / Enter Bill</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className={`p-4 rounded-xl border transition-colors ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
        }`}>
          <span className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Registered Vendors
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className={`text-2xl font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {vendors.length}
            </span>
            <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {vendorBills.length} Invoices
            </span>
          </div>
        </div>

        <div className={`p-4 rounded-xl border transition-colors ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
        }`}>
          <span className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Total Purchases
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className={`text-2xl font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
              ₹{totalPurchases.toLocaleString('en-IN')}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              Spares
            </span>
          </div>
        </div>

        <div className={`p-4 rounded-xl border transition-colors ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
        }`}>
          <span className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Total Paid Out
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className={`text-2xl font-bold font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              ₹{totalPaid.toLocaleString('en-IN')}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Settled
            </span>
          </div>
        </div>

        <div className={`p-4 rounded-xl border transition-colors ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
        }`}>
          <span className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Payment Pending
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className={`text-2xl font-bold font-mono ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
              ₹{totalPending.toLocaleString('en-IN')}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              totalPending > 0 
                ? (isDark ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-amber-100 text-amber-800') 
                : (isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600')
            }`}>
              {totalPending > 0 ? 'Due to Vendors' : 'All Clear'}
            </span>
          </div>
        </div>
      </div>

      {/* VIEW 1: VENDOR DIRECTORY & VIA BILL VIEW */}
      {activeView === 'vendors' && (
        <div className="space-y-4">
          {/* Vendor Search Bar */}
          <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
          }`}>
            <div className="relative flex-1">
              <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vendor by name, GSTIN, phone, category, or address..."
                className={`w-full rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none ${
                  isDark ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' : 'bg-slate-50 border border-slate-300 text-slate-900 focus:border-blue-600'
                }`}
              />
            </div>
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Showing <strong>{filteredVendors.length}</strong> vendors
            </span>
          </div>

          {/* Vendor Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredVendors.length === 0 ? (
              <div className={`col-span-full py-12 text-center rounded-xl border ${
                isDark ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
              }`}>
                No vendors found. Click "Register Vendor" to add your first supplier.
              </div>
            ) : (
              filteredVendors.map((vendor) => {
                const stat = vendorLedgerStats[vendor.id] || { totalPurchases: 0, totalPaid: 0, pending: 0, bills: [] };
                const isExpanded = expandedVendorId === vendor.id;

                return (
                  <div
                    key={vendor.id}
                    className={`rounded-xl border overflow-hidden transition-all ${
                      isExpanded 
                        ? (isDark ? 'bg-slate-900/90 border-blue-600/80 shadow-md ring-1 ring-blue-600/30' : 'bg-white border-blue-400 shadow-md ring-1 ring-blue-400/20')
                        : (isDark ? 'bg-slate-900/70 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-xs hover:border-blue-300')
                    }`}
                  >
                    {/* Main Vendor Card (Click to Expand) */}
                    <div 
                      onClick={() => setExpandedVendorId(isExpanded ? null : vendor.id)}
                      className="p-4 cursor-pointer select-none space-y-3"
                      title="Click to expand full vendor bills ledger, bank info & actions"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {vendor.name}
                            </h3>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {vendor.category || 'Spares'}
                            </span>
                          </div>
                          {vendor.phone && (
                            <p className="text-[11px] font-mono text-slate-500 mt-1 flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-blue-500" />
                              <span>{vendor.phone}</span>
                            </p>
                          )}
                        </div>

                        {/* Expand Toggle Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedVendorId(isExpanded ? null : vendor.id);
                          }}
                          className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer shrink-0 ${
                            isExpanded 
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' 
                              : (isDark ? 'border-slate-800 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100 shadow-2xs')
                          }`}
                        >
                          <span>{isExpanded ? 'Less' : 'Details & Bills'}</span>
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Main Financial Metrics Pill */}
                      <div className={`grid grid-cols-3 gap-2 p-2 rounded-lg text-center ${
                        isDark ? 'bg-slate-950/70 border border-slate-800' : 'bg-slate-50 border border-slate-200'
                      }`}>
                        <div>
                          <span className={`block text-[10px] font-medium uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Purchases
                          </span>
                          <span className={`text-xs font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            ₹{stat.totalPurchases.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div>
                          <span className={`block text-[10px] font-medium uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Paid
                          </span>
                          <span className={`text-xs font-bold font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                            ₹{stat.totalPaid.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div>
                          <span className={`block text-[10px] font-medium uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Pending
                          </span>
                          <span className={`text-xs font-bold font-mono ${
                            stat.pending > 0 ? (isDark ? 'text-amber-400 font-bold' : 'text-amber-700 font-bold') : 'text-slate-400'
                          }`}>
                            ₹{stat.pending.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Section: Address, GSTIN, Bank & Bills */}
                    {isExpanded && (
                      <div className={`p-4 border-t space-y-3 animate-in fade-in duration-150 ${
                        isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50/60 border-slate-200'
                      }`}>
                        {/* GSTIN, Address, UPI */}
                        <div className="text-xs space-y-1.5 text-slate-500 p-2.5 rounded-lg border dark:border-slate-800 bg-white dark:bg-slate-900">
                          {vendor.gstin && (
                            <p className="font-mono text-[11px]">
                              GSTIN: <span className="font-semibold text-slate-700 dark:text-slate-200">{vendor.gstin}</span>
                            </p>
                          )}
                          {vendor.address && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span className="truncate">{vendor.address}</span>
                            </div>
                          )}
                          {vendor.upiId && (
                            <div className="flex items-center gap-1.5">
                              <CreditCard className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{vendor.upiId}</span>
                            </div>
                          )}
                          {vendor.notes && (
                            <p className="italic text-[11px] text-slate-400 pt-0.5">"{vendor.notes}"</p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenEditVendorModal(vendor)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                                isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <Edit2 className="w-3 h-3 text-blue-500" />
                              <span>Edit Vendor</span>
                            </button>
                            <button
                              onClick={() => handleDeleteVendor(vendor.id, vendor.name)}
                              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>

                          <button
                            onClick={() => {
                              setBillImage(null);
                              setVendorName(vendor.name);
                              setSelectedVendorId(vendor.id);
                              setInvoiceNumber('');
                              setInvoiceDate(new Date().toISOString().split('T')[0]);
                              setItems([{ itemName: '', quantity: 1, unitCost: 0, grossUnitCost: 0, gstPercent: 18, gstAmount: 0, total: 0, totalWithGst: 0 }]);
                              setTaxAmount(0);
                              setDiscount(0);
                              setRoundOff(0);
                              setTotalAmount(0);
                              setPaidAmount(0);
                              setPaymentStatus('paid');
                              setPaymentReference('');
                              setIsStockPickerOpen(false);
                              setStockSearchQuery('');
                              setIsScannerModalOpen(true);
                            }}
                            className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
                          >
                            <Plus className="w-3 h-3" />
                            <span>+ New Bill</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Expandable Bills Ledger Under This Vendor */}
                    {isExpanded && (
                      <div className={`p-4 border-t space-y-2 ${
                        isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
                          <span>Invoices from {vendor.name}</span>
                          <span>{stat.bills.length} bills</span>
                        </div>

                        {stat.bills.length === 0 ? (
                          <p className="text-xs text-slate-400 py-3 text-center italic">
                            No bills recorded for this vendor yet. Click "+ New Bill for Vendor" above.
                          </p>
                        ) : (
                          stat.bills.map(b => (
                            <div
                              key={b.id}
                              className={`p-2.5 rounded-lg border flex items-center justify-between gap-3 text-xs ${
                                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setViewingBill(b)}
                                    className="font-mono font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
                                    title="View full bill details"
                                  >
                                    <FileText className="w-3 h-3" />
                                    <span>{b.invoiceNumber}</span>
                                  </button>
                                  <span className="text-[10px] text-slate-400">{b.invoiceDate}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  {b.items.map(it => `${it.quantity}x ${it.itemName}`).join(', ') || 'Spares inward'}
                                </div>
                              </div>

                              <div className="text-right space-y-0.5">
                                <div className="font-mono font-bold text-slate-900 dark:text-white">
                                  ₹{b.totalAmount.toLocaleString('en-IN')}
                                </div>
                                <div className="flex items-center gap-1.5 justify-end">
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                    b.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                    b.paymentStatus === 'partial' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                                    'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  }`}>
                                    {b.paymentStatus.toUpperCase()}
                                  </span>
                                  {b.paymentStatus !== 'paid' && (
                                    <button
                                      onClick={() => {
                                        setSelectedBillForPayment(b);
                                        setPayModalAmount(b.paidAmount);
                                        setPayModalStatus(b.paymentStatus);
                                        setPayModalMode(b.paymentMode || 'upi');
                                        setPayModalRef(b.paymentReference || '');
                                      }}
                                      className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer"
                                    >
                                      Pay
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: ALL BILLS RECORDS TABLE */}
      {activeView === 'bills' && (
        <div className={`p-4 rounded-xl border space-y-4 transition-colors ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-1 flex-wrap">
              <div className="relative w-full sm:w-64">
                <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search vendor, bill no, UPI ID, or item..."
                  className={`w-full rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none transition-colors ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
                  }`}
                />
              </div>

              {/* Vendor select filter */}
              <div className="w-full sm:w-48">
                <select
                  value={selectedVendorFilter}
                  onChange={(e) => setSelectedVendorFilter(e.target.value)}
                  className={`w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="all">All Vendors ({vendors.length})</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              {/* Status filter */}
              <div className="w-full sm:w-36">
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  className={`w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="all">All Statuses</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
            </div>

            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Showing <strong className={`font-mono ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{filteredBills.length}</strong> invoices
            </span>
          </div>

          <div className={`rounded-xl border overflow-hidden ${
            isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-white'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`border-b uppercase tracking-wider text-[11px] font-semibold ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <tr>
                    <th className="py-3 px-2 w-8 text-center"></th>
                    <th className="py-3 px-3">Vendor / Supplier</th>
                    <th className="py-3 px-3">Bill Number</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Items</th>
                    <th className="py-3 px-3 font-mono">Total Amount</th>
                    <th className="py-3 px-3 font-mono">Paid</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/70' : 'divide-slate-100'}`}>
                  {filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={9} className={`py-8 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        No vendor bills match your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((bill) => {
                      const isExpanded = expandedBillIds.includes(bill.id);
                      const statusClass = 
                        bill.paymentStatus === 'paid' ? (isDark ? 'text-emerald-400 bg-emerald-950/50 border-emerald-800' : 'text-emerald-700 bg-emerald-50 border-emerald-200') :
                        bill.paymentStatus === 'partial' ? (isDark ? 'text-amber-400 bg-amber-950/50 border-amber-800' : 'text-amber-700 bg-amber-50 border-amber-200') :
                        (isDark ? 'text-rose-400 bg-rose-950/50 border-rose-800' : 'text-rose-700 bg-rose-50 border-rose-200');

                      return (
                        <React.Fragment key={bill.id}>
                          {/* Main Row: Main thing only (Click to Expand) */}
                          <tr 
                            onClick={() => toggleBillExpand(bill.id)}
                            className={`transition-colors cursor-pointer select-none ${
                              isExpanded 
                                ? (isDark ? 'bg-slate-800/60' : 'bg-blue-50/50') 
                                : (isDark ? 'hover:bg-slate-900/60' : 'hover:bg-slate-50')
                            }`}
                            title="Click row to expand itemized spares, receipt image & payment details"
                          >
                            <td className="py-3 px-2 text-center text-slate-400">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-blue-500 inline-block" />
                              ) : (
                                <ChevronRight className="w-4 h-4 inline-block" />
                              )}
                            </td>

                            <td className={`py-3 px-3 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {bill.vendorName}
                            </td>
                            
                            {/* Clickable Bill Number */}
                            <td className="py-3 px-3">
                              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                <FileText className="w-3.5 h-3.5" />
                                <span>{bill.invoiceNumber}</span>
                              </span>
                            </td>

                            <td className={`py-3 px-3 font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {bill.invoiceDate}
                            </td>

                            <td className={`py-3 px-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {bill.items?.length || 0} items
                              </span>
                            </td>

                            <td className={`py-3 px-3 font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              ₹{bill.totalAmount.toLocaleString('en-IN')}
                            </td>

                            <td className={`py-3 px-3 font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-700 font-semibold'}`}>
                              ₹{bill.paidAmount.toLocaleString('en-IN')}
                            </td>

                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusClass}`}>
                                {bill.paymentStatus}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => toggleBillExpand(bill.id)}
                                  className={`px-2 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                                    isExpanded 
                                      ? 'bg-blue-600 text-white border-blue-600' 
                                      : (isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100')
                                  }`}
                                >
                                  {isExpanded ? 'Hide' : 'Expand'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setViewingBill(bill)}
                                  className={`p-1.5 rounded transition-colors cursor-pointer ${
                                    isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                  }`}
                                  title="View full tax bill slip & print"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* 2. EXPANDED INLINE DETAILS (Only shown when clicked) */}
                          {isExpanded && (
                            <tr key={`${bill.id}-expanded`} className={isDark ? 'bg-slate-950/70 border-b border-slate-800' : 'bg-slate-50/70 border-b border-slate-200'}>
                              <td colSpan={9} className="p-4 space-y-3">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                                  
                                  {/* Left: Itemized Spares List */}
                                  <div className="lg:col-span-8 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                        <Boxes className="w-3.5 h-3.5 text-blue-500" />
                                        <span>Purchased Items & Spares ({bill.items?.length || 0})</span>
                                      </span>
                                      <span className="text-xs font-mono text-slate-400">
                                        Tax: ₹{(bill.taxAmount || 0).toLocaleString('en-IN')}
                                      </span>
                                    </div>

                                    <div className={`rounded-lg border overflow-hidden ${
                                      isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
                                    }`}>
                                      <table className="w-full text-xs">
                                        <thead className={`border-b text-[10px] uppercase font-semibold ${
                                          isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}>
                                          <tr>
                                            <th className="py-2 px-3">Item Description</th>
                                            <th className="py-2 px-3 text-center">Qty</th>
                                            <th className="py-2 px-3 text-right">Unit Rate</th>
                                            <th className="py-2 px-3 text-center">GST</th>
                                            <th className="py-2 px-3 text-right">Total (Inc. GST)</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                          {bill.items && bill.items.length > 0 ? (
                                            bill.items.map((item, idx) => (
                                              <tr key={idx} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                                                <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                                                  {item.itemName}
                                                </td>
                                                <td className="py-2 px-3 text-center font-mono">
                                                  {item.quantity}
                                                </td>
                                                <td className="py-2 px-3 text-right font-mono text-slate-500">
                                                  ₹{item.grossUnitCost || item.unitCost}
                                                </td>
                                                <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-500">
                                                  {item.gstPercent || 0}%
                                                </td>
                                                <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                                                  ₹{(item.totalWithGst || item.total).toLocaleString('en-IN')}
                                                </td>
                                              </tr>
                                            ))
                                          ) : (
                                            <tr>
                                              <td colSpan={5} className="py-3 text-center text-xs text-slate-400 italic">
                                                No itemized records available.
                                              </td>
                                            </tr>
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>

                                  {/* Right: Payment Details, Receipt Photo & Actions */}
                                  <div className="lg:col-span-4 space-y-3">
                                    <div className={`p-3 rounded-xl border text-xs space-y-2 ${
                                      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                                    }`}>
                                      <div className="flex justify-between items-center pb-1.5 border-b border-slate-100 dark:border-slate-800">
                                        <span className="text-slate-400 font-semibold">Payment Mode:</span>
                                        <span className="font-bold uppercase text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                          {bill.paymentMode || 'UPI'}
                                        </span>
                                      </div>
                                      {bill.paymentReference && (
                                        <div className="flex justify-between items-center text-[11px]">
                                          <span className="text-slate-400">Reference:</span>
                                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                                            {bill.paymentReference}
                                          </span>
                                        </div>
                                      )}
                                      <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Paid Amount:</span>
                                        <span className="font-mono font-bold text-emerald-600">
                                          ₹{bill.paidAmount.toLocaleString('en-IN')}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-slate-400">Pending Due:</span>
                                        <span className={`font-mono font-bold ${
                                          bill.totalAmount - bill.paidAmount > 0 ? 'text-amber-600' : 'text-slate-400'
                                        }`}>
                                          ₹{Math.max(0, bill.totalAmount - bill.paidAmount).toLocaleString('en-IN')}
                                        </span>
                                      </div>
                                      {bill.notes && (
                                        <p className="text-[11px] italic text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                                          "{bill.notes}"
                                        </p>
                                      )}
                                    </div>

                                    {/* Attached Receipt Image Thumbnail */}
                                    {bill.billImage && (
                                      <div className="flex items-center gap-2 p-2 rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900">
                                        <img 
                                          src={bill.billImage} 
                                          alt="Scanned Bill" 
                                          className="w-12 h-12 object-cover rounded-lg border dark:border-slate-800 cursor-pointer hover:opacity-80"
                                          onClick={() => setZoomedImage(bill.billImage || null)}
                                        />
                                        <div className="flex-1 min-w-0">
                                          <span className="text-[11px] font-bold block truncate">Attached Tax Invoice Photo</span>
                                          <button
                                            type="button"
                                            onClick={() => setZoomedImage(bill.billImage || null)}
                                            className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                                          >
                                            Click to Zoom Fullscreen ↗
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedBillForPayment(bill);
                                          setPayModalAmount(bill.paidAmount);
                                          setPayModalStatus(bill.paymentStatus);
                                          setPayModalMode(bill.paymentMode || 'upi');
                                          setPayModalRef(bill.paymentReference || '');
                                        }}
                                        className="flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs cursor-pointer text-center"
                                      >
                                        Update Payment / Ref
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setViewingBill(bill)}
                                        className={`py-1.5 px-3 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                                          isDark ? 'border-slate-800 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                                        }`}
                                      >
                                        Full Slip
                                      </button>
                                    </div>
                                  </div>

                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Bill Scanner & Inward Entry Modal */}
      {isScannerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-3xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Vendor Bill Entry & AI OCR Scanner</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Select registered vendor, photo-scan receipt or enter details</p>
                </div>
              </div>
              <button
                onClick={() => setIsScannerModalOpen(false)}
                className={`p-1 rounded-lg cursor-pointer ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Photo Upload Zone */}
              <div className={`p-5 rounded-xl border border-dashed text-center space-y-3 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
              }`}>
                {billImage ? (
                  <div className="space-y-3">
                    <div className={`max-h-60 overflow-hidden rounded-lg border inline-block shadow-lg ${
                      isDark ? 'border-slate-800' : 'border-slate-200'
                    }`}>
                      <img src={billImage} alt="Scanned receipt" className="max-h-60 w-auto object-contain mx-auto" />
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <label className={`text-xs underline cursor-pointer ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                        Retake / Choose Another Photo
                        <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                      </label>
                      <button
                        type="button"
                        onClick={handleScanWithGemini}
                        disabled={isScanning}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-md transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isScanning ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Scanning with AI OCR...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Extract with Gemini OCR</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 py-2">
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 mx-auto flex items-center justify-center">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <p className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        Snap or upload physical vendor bill
                      </p>
                      <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        Supports PNG, JPG, JPEG photos taken from workshop phone
                      </p>
                    </div>
                    <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer shadow-xs transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Select Receipt Photo</span>
                      <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                    </label>
                  </div>
                )}

                {scanError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div className="space-y-1 flex-1">
                        <p className="font-bold leading-snug">{scanError}</p>
                        {(scanError.toLowerCase().includes('depleted') || scanError.toLowerCase().includes('credit') || scanError.toLowerCase().includes('billing') || scanError.toLowerCase().includes('402')) && (
                          <div className="pt-1 space-y-2">
                            <p className="text-[11px] text-slate-600 dark:text-slate-400">
                              Your Google AI Studio project's prepayment balance is exhausted. You can manage or add credits in the <a href="https://ai.studio/projects" target="_blank" rel="noreferrer" className="underline font-bold text-blue-600 dark:text-blue-400 hover:text-blue-500">Google AI Studio Console</a> or select another API key.
                            </p>
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  // Pre-fill realistic IT Hardware Bill Sample
                                  setVendorName('Siva Printer Spares & IT Hub');
                                  setInvoiceNumber(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
                                  setInvoiceDate(new Date().toISOString().split('T')[0]);
                                  const item1Gross = 750;
                                  const item1Calc = calculateFromInclusiveRate(item1Gross, 18, 2);
                                  const item2Gross = 2450;
                                  const item2Calc = calculateFromInclusiveRate(item2Gross, 18, 1);
                                  setItems([
                                    {
                                      itemName: 'HP 12A Laser Toner Cartridge (Compatible)',
                                      hsnCode: '8443',
                                      quantity: 2,
                                      grossUnitCost: item1Gross,
                                      gstPercent: 18,
                                      unitCost: item1Calc.baseRate,
                                      total: item1Calc.baseAmount,
                                      gstAmount: item1Calc.totalGst,
                                      totalWithGst: item1Calc.totalWithGst,
                                    },
                                    {
                                      itemName: 'Kingston A400 240GB 2.5" SATA SSD',
                                      hsnCode: '8471',
                                      quantity: 1,
                                      grossUnitCost: item2Gross,
                                      gstPercent: 18,
                                      unitCost: item2Calc.baseRate,
                                      total: item2Calc.baseAmount,
                                      gstAmount: item2Calc.totalGst,
                                      totalWithGst: item2Calc.totalWithGst,
                                    }
                                  ]);
                                  const total = item1Calc.totalWithGst + item2Calc.totalWithGst;
                                  setTaxAmount(item1Calc.totalGst + item2Calc.totalGst);
                                  setTotalAmount(total);
                                  setPaidAmount(total);
                                  setScanError(null);
                                  setScanSuccess(true);
                                  setExpandedItemIndices([0]);
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300 rounded-lg hover:bg-blue-200 cursor-pointer transition-colors"
                              >
                                ⚡ Pre-fill Sample Hardware Spares
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {scanSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Invoice data successfully extracted! Review and adjust line items below.</span>
                  </div>
                )}
              </div>

              {/* Verified Details Form */}
              <form onSubmit={handleSaveBill} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* Vendor Select Option & Autocomplete */}
                  <div className="relative">
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Vendor / Supplier (Select or Type) *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={vendorName}
                        onChange={(e) => {
                          setVendorName(e.target.value);
                          setSelectedVendorId('');
                          setIsVendorDropdownOpen(true);
                        }}
                        onFocus={() => setIsVendorDropdownOpen(true)}
                        placeholder="Search vendor or enter name"
                        className={`w-full rounded-lg pl-3 pr-7 py-2 text-xs focus:outline-none ${
                          isDark ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setIsVendorDropdownOpen(prev => !prev)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Vendor Autocomplete Dropdown */}
                    {isVendorDropdownOpen && (
                      <div className={`absolute z-30 left-0 right-0 mt-1 rounded-xl border shadow-xl max-h-48 overflow-y-auto ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}>
                        <div className="p-1 space-y-0.5">
                          <div className="px-2 py-1 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                            Select Registered Vendor
                          </div>
                          {vendors
                            .filter(v => !vendorName || v.name.toLowerCase().includes(vendorName.toLowerCase()))
                            .map(v => (
                              <div
                                key={v.id}
                                onClick={() => {
                                  setVendorName(v.name);
                                  setSelectedVendorId(v.id);
                                  setIsVendorDropdownOpen(false);
                                }}
                                className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between ${
                                  isDark ? 'hover:bg-slate-800' : 'hover:bg-blue-50'
                                }`}
                              >
                                <div>
                                  <span className="font-bold">{v.name}</span>
                                  {v.category && <span className="text-[10px] text-slate-400 ml-1.5">({v.category})</span>}
                                </div>
                                {v.upiId && <span className="text-[10px] font-mono text-emerald-600">{v.upiId}</span>}
                              </div>
                            ))}

                          {vendorName.trim() && !vendors.some(v => v.name.toLowerCase() === vendorName.trim().toLowerCase()) && (
                            <div
                              onClick={() => {
                                const newV = addVendor({
                                  name: vendorName.trim(),
                                  category: 'Hardware & Spares',
                                  address: 'Madurai',
                                  notes: 'Quick added from bill entry',
                                });
                                setSelectedVendorId(newV.id);
                                setIsVendorDropdownOpen(false);
                              }}
                              className={`p-2 rounded-lg text-xs cursor-pointer border-t border-dashed flex items-center gap-1.5 ${
                                isDark ? 'border-slate-800 text-blue-400 hover:bg-slate-800' : 'border-slate-200 text-blue-600 hover:bg-blue-50'
                              }`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>+ Register "{vendorName}" as new Vendor</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Invoice / Bill No *</label>
                    <input
                      type="text"
                      required
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="e.g. SPS/2026/0892"
                      className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                        isDark ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Invoice Date</label>
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                        isDark ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                      }`}
                    />
                  </div>
                </div>

                {/* Line Items Container */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Invoiced Spares & Materials
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsStockPickerOpen(!isStockPickerOpen)}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors"
                      >
                        <Boxes className="w-3.5 h-3.5" />
                        <span>Search Stock Inventory</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Blank Item</span>
                      </button>
                    </div>
                  </div>

                  {/* Stock Inventory Search & Link Drawer */}
                  {isStockPickerOpen && (
                    <div className={`p-3 rounded-xl border space-y-2 mb-2 ${
                      isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                          <Boxes className="w-3.5 h-3.5" /> Pick Workshop Inventory Item (Links & Merges into Existing Stock)
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsStockPickerOpen(false)}
                          className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={stockSearchQuery}
                          onChange={(e) => setStockSearchQuery(e.target.value)}
                          placeholder="Search stock by item name, SKU, or HSN..."
                          className={`w-full rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none ${
                            isDark ? 'bg-slate-900 border border-slate-700 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>

                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                        {inventory
                          .filter(inv => {
                            if (!stockSearchQuery.trim()) return true;
                            const q = stockSearchQuery.toLowerCase();
                            return inv.name.toLowerCase().includes(q) || (inv.sku && inv.sku.toLowerCase().includes(q)) || (inv.hsnCode && inv.hsnCode.includes(q));
                          })
                          .map((inv, idx) => (
                            <div
                              key={`${inv.id}-${idx}`}
                              onClick={() => handleSelectStockItem(inv)}
                              className={`p-2 flex items-center justify-between cursor-pointer rounded-lg transition-colors ${
                                isDark ? 'hover:bg-slate-900' : 'hover:bg-emerald-50/60'
                              }`}
                            >
                              <div>
                                <p className="font-semibold">{inv.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  Stock: <strong className="text-emerald-500 font-bold">{inv.currentStock} units</strong> · Cost: ₹{inv.unitCost} · HSN: {inv.hsnCode || '—'}
                                </p>
                              </div>
                              <button
                                type="button"
                                className="px-2 py-1 text-[11px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 rounded cursor-pointer hover:bg-emerald-200"
                              >
                                + Link & Insert
                              </button>
                            </div>
                          ))}
                        {inventory.length === 0 && (
                          <p className="text-slate-400 text-xs p-2 text-center">No inventory items in stock yet.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Datalist for fast item suggestions while typing */}
                  <datalist id="vendor-bill-stock-datalist">
                    {inventory.map((inv, idx) => (
                      <option key={`${inv.id}-${idx}`} value={inv.name}>
                        Stock: {inv.currentStock} units (Cost: ₹{inv.unitCost})
                      </option>
                    ))}
                  </datalist>

                  <div className="space-y-3">
                    {items.map((it, idx) => {
                      const cleanItemName = it.itemName.trim().toLowerCase();
                      const similarStock = it.matchedInventoryId
                        ? inventory.find(i => i.id === it.matchedInventoryId)
                        : (cleanItemName.length >= 2
                            ? inventory.find(i => {
                                const invName = i.name.trim().toLowerCase();
                                return invName === cleanItemName || (cleanItemName.length >= 4 && (invName.includes(cleanItemName) || cleanItemName.includes(invName)));
                              })
                            : null);

                      const isItemExpanded = expandedItemIndices.includes(idx);
                      const itemTotalGst = it.totalWithGst ?? ((it.total || 0) + (it.gstAmount || 0));

                      return (
                        <div key={idx} className={`rounded-xl border transition-all overflow-hidden ${
                          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                        }`}>
                          {/* 1. Main Collapsed Summary Header (Always visible - Click to Expand) */}
                          <div
                            onClick={() => toggleItemExpand(idx)}
                            className={`p-3 cursor-pointer select-none flex items-center justify-between gap-2.5 transition-colors ${
                              isItemExpanded
                                ? (isDark ? 'bg-slate-800/50 border-b border-slate-800' : 'bg-blue-50/40 border-b border-blue-100')
                                : (isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50')
                            }`}
                            title="Click to expand/collapse item fields"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold font-mono text-xs flex items-center justify-center shrink-0">
                                #{idx + 1}
                              </span>
                              <div className="min-w-0">
                                <p className={`text-xs font-bold truncate ${it.itemName.trim() ? (isDark ? 'text-white' : 'text-slate-900') : 'text-slate-400 italic'}`}>
                                  {it.itemName.trim() || 'Click to enter item description...'}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                  {it.hsnCode && <span className="font-mono">HSN: {it.hsnCode}</span>}
                                  {it.matchedInventoryId ? (
                                    <span className="text-emerald-500 font-semibold flex items-center gap-0.5">
                                      ✓ Linked to Stock
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">New Item</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right font-mono">
                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                                  ₹{itemTotalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  {it.quantity} Qty · {it.gstPercent ?? 18}% GST
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleItemExpand(idx);
                                }}
                                className={`flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-md border transition-colors cursor-pointer ${
                                  isItemExpanded 
                                    ? 'bg-blue-600 text-white border-blue-600' 
                                    : (isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100')
                                }`}
                              >
                                <span>{isItemExpanded ? 'Less' : 'Edit'}</span>
                                {isItemExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>

                              {items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveItem(idx);
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer transition-colors"
                                  title="Remove Item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* 2. Expanded Inputs (Shown only when clicked) */}
                          {isItemExpanded && (
                            <div className="p-3.5 space-y-2.5 animate-in fade-in duration-150">
                              {/* Top: Item Name, HSN No, Quantity */}
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                {/* Part Name */}
                                <div className="flex-1 w-full">
                                  <label className={`block text-[10px] font-bold uppercase mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Part / Item Name *
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    list="vendor-bill-stock-datalist"
                                    value={it.itemName}
                                    onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                                    placeholder="Part Name (e.g. HP 12A Toner, Kingston 240GB SSD)"
                                    className={`w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none ${
                                      isDark ? 'bg-slate-950 border border-slate-700 text-slate-200' : 'bg-slate-50 border border-slate-300 text-slate-900'
                                    }`}
                                  />
                                </div>

                                {/* HSN No */}
                                <div className="w-full sm:w-28">
                                  <label className={`block text-[10px] font-bold uppercase mb-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    HSN Code
                                  </label>
                                  <input
                                    type="text"
                                    value={it.hsnCode || ''}
                                    onChange={(e) => handleItemChange(idx, 'hsnCode', e.target.value)}
                                    placeholder="HSN No"
                                    className={`w-full rounded-lg px-2 py-1.5 text-xs font-mono text-center focus:outline-none ${
                                      isDark ? 'bg-slate-950 border border-slate-700 text-blue-400' : 'bg-slate-50 border border-slate-300 text-blue-700 font-semibold'
                                    }`}
                                  />
                                </div>

                                {/* Quantity */}
                                <div className="w-full sm:w-20">
                                  <label className={`block text-[10px] font-bold uppercase mb-0.5 text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Quantity
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={it.quantity}
                                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                                    placeholder="Qty"
                                    className={`w-full rounded-lg px-2 py-1.5 text-xs font-mono text-center focus:outline-none ${
                                      isDark ? 'bg-slate-950 border border-slate-700 text-slate-200' : 'bg-slate-50 border border-slate-300 text-slate-900 font-bold'
                                    }`}
                                  />
                                </div>
                              </div>

                              {/* Stock Connection & Link Bar */}
                              <div className={`px-2.5 py-1.5 rounded-lg text-[11px] flex flex-wrap items-center justify-between gap-1.5 border ${
                                it.matchedInventoryId
                                  ? (isDark ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800')
                                  : (isDark ? 'bg-slate-950/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600')
                              }`}>
                                <div className="flex items-center gap-1.5">
                                  <Boxes className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                                  {it.matchedInventoryId ? (
                                    <span>
                                      ✓ Linked to Stock: <strong className="font-semibold text-emerald-600 dark:text-emerald-400">{inventory.find(i => i.id === it.matchedInventoryId)?.name || it.itemName}</strong>
                                      {' '}(Stock: <span className="font-mono font-bold">{inventory.find(i => i.id === it.matchedInventoryId)?.currentStock ?? 0}</span> units)
                                    </span>
                                  ) : (
                                    <span>Stock Link: Item will be added as new unless matched to existing stock</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <select
                                    value={it.matchedInventoryId || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val) {
                                        const chosen = inventory.find(inv => inv.id === val);
                                        handleItemChange(idx, 'matchedInventoryId', val);
                                        handleItemChange(idx, 'syncMode', 'merge_existing');
                                        if (chosen?.name && !it.itemName.trim()) handleItemChange(idx, 'itemName', chosen.name);
                                        if (chosen?.hsnCode && !it.hsnCode) handleItemChange(idx, 'hsnCode', chosen.hsnCode);
                                      } else {
                                        handleItemChange(idx, 'matchedInventoryId', undefined);
                                        handleItemChange(idx, 'syncMode', 'create_separate');
                                      }
                                    }}
                                    className={`text-[10px] rounded px-2 py-0.5 border ${
                                      isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                                    }`}
                                  >
                                    <option value="">{it.matchedInventoryId ? 'Change stock link...' : 'Search / link to stock item...'}</option>
                                    {inventory.map((inv, iidx) => (
                                      <option key={`${inv.id}-${iidx}`} value={inv.id}>
                                        {inv.name} (Stock: {inv.currentStock}, Cost: ₹{inv.unitCost})
                                      </option>
                                    ))}
                                  </select>
                                  {it.matchedInventoryId && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleItemChange(idx, 'matchedInventoryId', undefined);
                                        handleItemChange(idx, 'syncMode', 'create_separate');
                                      }}
                                      className="text-[10px] text-rose-500 hover:underline px-1 cursor-pointer font-bold"
                                    >
                                      Unlink
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Bottom Row: Calculation Grid */}
                              <div className={`p-2.5 rounded-lg border grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-end text-xs ${
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
                                      value={it.grossUnitCost !== undefined ? it.grossUnitCost : Number(((it.unitCost * (1 + (it.gstPercent || 0)/100))).toFixed(2))}
                                      onChange={(e) => handleItemChange(idx, 'grossUnitCost', e.target.value)}
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
                                        value={it.gstPercent !== undefined ? it.gstPercent : 18}
                                        onChange={(e) => handleItemChange(idx, 'gstPercent', e.target.value)}
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
                                        onClick={() => handleItemChange(idx, 'gstPercent', ratePct)}
                                        className={`text-[9px] font-bold px-1 py-0.5 rounded transition-colors cursor-pointer ${
                                          (it.gstPercent ?? 18) === ratePct
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-blue-100'
                                        }`}
                                      >
                                        {ratePct}%
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* 3. GST Tax Amount */}
                                <div>
                                  <div className="flex items-center justify-between mb-0.5">
                                    <label className={`text-[10px] font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                                      Input GST (₹)
                                    </label>
                                    <span className="text-[9px] text-amber-500 font-mono">Tax Amount</span>
                                  </div>
                                  <div className={`rounded-md px-2 py-1 text-xs font-mono font-bold border ${
                                    isDark ? 'bg-slate-900 border-amber-900/60 text-amber-300' : 'bg-white border-amber-200 text-amber-800'
                                  }`}>
                                    +₹{(it.gstAmount ?? (((it.total || 0) * (it.gstPercent || 0)) / 100)).toFixed(2)}
                                  </div>
                                  <span className="text-[9px] text-slate-400 block truncate mt-0.5 font-mono">
                                    CGST: ₹{(((it.gstAmount || 0) / 2)).toFixed(2)} | SGST: ₹{(((it.gstAmount || 0) / 2)).toFixed(2)}
                                  </span>
                                </div>

                                {/* 4. Item Total with GST */}
                                <div className="text-right">
                                  <label className={`block text-[10px] font-bold mb-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                                    Total with GST (₹)
                                  </label>
                                  <div className={`rounded-md px-2 py-1 text-xs font-mono font-bold text-right border ${
                                    isDark ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                  }`}>
                                    ₹{itemTotalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                  <span className="text-[9px] text-slate-400 block truncate mt-0.5 font-mono">
                                    Base: ₹{(it.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>

                              {/* Similar Stock Item Resolution Prompt */}
                              {similarStock && !it.matchedInventoryId && (
                                <div className={`mt-2 p-2 rounded-lg text-xs space-y-1.5 border ${
                                  it.syncMode === 'merge_existing'
                                    ? (isDark ? 'bg-emerald-950/20 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800')
                                    : (isDark ? 'bg-blue-950/30 border-blue-900/60 text-slate-300' : 'bg-blue-50/70 border-blue-200 text-slate-800')
                                }`}>
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px]">
                                    <div className="flex items-center gap-1.5">
                                      <Boxes className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                      <span>
                                        Detected existing stock: <strong className="font-semibold">{similarStock.name}</strong> 
                                        {' '}(Current: <span className="font-mono">{similarStock.currentStock}</span> units · HSN: <span className="font-mono">{similarStock.hsnCode || 'N/A'}</span> · Cost: ₹{similarStock.unitCost})
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 italic">
                                      Add into existing stock or create separate?
                                    </span>
                                  </div>

                                  <div className="flex items-center flex-wrap gap-2 pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleItemChange(idx, 'matchedInventoryId', similarStock.id);
                                        handleItemChange(idx, 'syncMode', 'merge_existing');
                                        if (!it.hsnCode && similarStock.hsnCode) {
                                          handleItemChange(idx, 'hsnCode', similarStock.hsnCode);
                                        }
                                      }}
                                      className="px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all bg-emerald-600 text-white shadow-xs"
                                    >
                                      ✓ Add to Existing Stock ({similarStock.name})
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleItemChange(idx, 'matchedInventoryId', undefined);
                                        handleItemChange(idx, 'syncMode', 'create_separate');
                                      }}
                                      className="px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                                    >
                                      ➕ Keep Separate as New Item
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div className="pt-1 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleAddItem}
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

                {/* Financial Totals: Subtotal, Total GST Amount, Discount, Round Off, Total Bill Amount & Payment */}
                <div className={`p-4 rounded-xl border space-y-3 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* 1. Subtotal / Base Amount */}
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Subtotal (Taxable)
                      </label>
                      <div className={`rounded-lg px-3 py-1.5 text-xs font-mono font-bold border ${
                        isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                      }`}>
                        ₹{Number(items.reduce((acc, it) => acc + (it.total || 0), 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    {/* 2. Total GST Tax Amount */}
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Total GST / Tax (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={taxAmount}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setTaxAmount(val);
                          const sum = items.reduce((acc, it) => acc + (it.total || 0), 0);
                          setTotalAmount(Number(Math.max(0, sum + val - (discount || 0) + (roundOff || 0)).toFixed(2)));
                        }}
                        className={`w-full rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-blue-600 focus:outline-none ${
                          isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-300'
                        }`}
                      />
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
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value) || 0);
                            setDiscount(val);
                            const sum = items.reduce((acc, it) => acc + (it.total || 0), 0);
                            setTotalAmount(Number(Math.max(0, sum + taxAmount - val + (roundOff || 0)).toFixed(2)));
                          }}
                          placeholder="0.00"
                          className={`w-full rounded-lg pl-6 pr-3 py-1.5 text-xs font-mono focus:outline-none ${
                            isDark ? 'bg-slate-900 border border-slate-800 text-rose-300' : 'bg-white border border-slate-300 text-rose-700'
                          }`}
                        />
                        <span className="text-xs absolute left-2.5 top-1/2 -translate-y-1/2 text-rose-400 font-bold">-₹</span>
                      </div>
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
                            const sum = items.reduce((acc, it) => acc + (it.total || 0), 0);
                            const base = sum + taxAmount - discount;
                            const rounded = Math.round(base);
                            const diff = Number((rounded - base).toFixed(2));
                            setRoundOff(diff);
                            setTotalAmount(Number(Math.max(0, base + diff).toFixed(2)));
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
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setRoundOff(val);
                            const sum = items.reduce((acc, it) => acc + (it.total || 0), 0);
                            setTotalAmount(Number(Math.max(0, sum + taxAmount - discount + val).toFixed(2)));
                          }}
                          placeholder="0.00"
                          className={`w-full rounded-lg pl-6 pr-3 py-1.5 text-xs font-mono focus:outline-none ${
                            isDark ? 'bg-slate-900 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                          }`}
                        />
                        <span className="text-xs absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">±₹</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 items-end">
                    {/* Total Bill Amount */}
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Total Bill Amount (₹)
                      </label>
                      <input
                        type="number"
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(Number(e.target.value) || 0)}
                        className={`w-full rounded-lg px-3 py-1.5 text-xs font-mono font-bold ${
                          isDark ? 'bg-slate-900 border border-emerald-900 text-emerald-400' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        }`}
                      />
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
                          if (val >= totalAmount) setPaymentStatus('paid');
                          else if (val > 0) setPaymentStatus('partial');
                          else setPaymentStatus('pending');
                        }}
                        className={`w-full rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-emerald-600 ${
                          isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-300'
                        }`}
                      />
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
                          if (newStatus === 'paid') setPaidAmount(totalAmount);
                          else if (newStatus === 'pending') setPaidAmount(0);
                        }}
                        className={`w-full rounded-lg px-3 py-1.5 text-xs ${
                          isDark ? 'bg-slate-900 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value="paid">Fully Paid</option>
                        <option value="partial">Partially Paid</option>
                        <option value="pending">Payment Pending</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Payment Mode</label>
                      <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                        className={`w-full rounded-lg px-3 py-1.5 text-xs ${
                          isDark ? 'bg-slate-900 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value="upi">UPI / GPay / PhonePe</option>
                        <option value="cash">Cash in Hand</option>
                        <option value="bank_transfer">Bank IMPS / NEFT</option>
                        <option value="card">Debit / Credit Card</option>
                        <option value="cheque">Cheque</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        UPI Ref / UTR / Cheque No
                      </label>
                      <input
                        type="text"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        placeholder="e.g. UPI-9988221144"
                        className={`w-full rounded-lg px-3 py-1.5 text-xs font-mono ${
                          isDark ? 'bg-slate-900 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="autoStockCheck"
                      checked={autoUpdateStock}
                      onChange={(e) => setAutoUpdateStock(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="autoStockCheck" className={`text-xs cursor-pointer ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Automatically increment workshop inventory stock for matching parts
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsScannerModalOpen(false)}
                    className={`px-4 py-2 text-xs rounded-lg transition-colors cursor-pointer ${
                      isDark ? 'text-slate-400 hover:text-slate-200 bg-slate-800' : 'text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition-colors cursor-pointer"
                  >
                    Save & Record Vendor Bill
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Register / Edit Vendor Modal */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div>
                <h3 className="text-base font-bold">
                  {editingVendor ? 'Edit Vendor Details' : 'Register New Vendor / Supplier'}
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Record distributor contact details, GSTIN, and UPI ID for instant bill selection
                </p>
              </div>
              <button
                onClick={() => setIsVendorModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVendor} className="p-6 space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Vendor / Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={vendorFormData.name}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, name: e.target.value })}
                  placeholder="e.g. Siva Printer & Spares Madurai"
                  className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Category / Supply Line
                  </label>
                  <select
                    value={vendorFormData.category}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, category: e.target.value })}
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="Hardware & Spares">Hardware & Spares</option>
                    <option value="Printers & Spares">Printers & Spares</option>
                    <option value="Spares & Chips">Spares & Chip-Level ICs</option>
                    <option value="CCTV & Security">CCTV & Security</option>
                    <option value="Networking & Cables">Networking & Cables</option>
                    <option value="Consumables & Tools">Consumables & Tools</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={vendorFormData.phone}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, phone: e.target.value })}
                    placeholder="e.g. 9842199881"
                    className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    GSTIN Number
                  </label>
                  <input
                    type="text"
                    value={vendorFormData.gstin}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, gstin: e.target.value })}
                    placeholder="e.g. 33AASCS1290K1Z5"
                    className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Vendor UPI ID (for Quick Pay)
                  </label>
                  <input
                    type="text"
                    value={vendorFormData.upiId}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, upiId: e.target.value })}
                    placeholder="e.g. sivaprinters@okaxis"
                    className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Address in Madurai
                </label>
                <input
                  type="text"
                  value={vendorFormData.address}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, address: e.target.value })}
                  placeholder="e.g. Simmakkal North Veli St, Madurai - 625001"
                  className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Bank Account / Notes
                </label>
                <textarea
                  rows={2}
                  value={vendorFormData.notes}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, notes: e.target.value })}
                  placeholder="e.g. SBI A/C: 3099882211, IFSC: SBIN0000845"
                  className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsVendorModalOpen(false)}
                  className={`px-4 py-2 text-xs rounded-lg ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  {editingVendor ? 'Save Changes' : 'Register Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Record Modal */}
      {selectedBillForPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold">Update Bill Payment & Ref</h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {selectedBillForPayment.vendorName} · {selectedBillForPayment.invoiceNumber}
                </p>
              </div>
              <button onClick={() => setSelectedBillForPayment(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPaymentUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Paid Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  max={selectedBillForPayment.totalAmount}
                  value={payModalAmount}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPayModalAmount(val);
                    if (val >= selectedBillForPayment.totalAmount) setPayModalStatus('paid');
                    else if (val > 0) setPayModalStatus('partial');
                    else setPayModalStatus('pending');
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-xs font-mono font-bold ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-emerald-400' : 'bg-slate-50 border border-slate-300 text-emerald-700'
                  }`}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Total Bill: ₹{selectedBillForPayment.totalAmount.toLocaleString('en-IN')}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Payment Status</label>
                <select
                  value={payModalStatus}
                  onChange={(e) => setPayModalStatus(e.target.value as any)}
                  className={`w-full rounded-lg px-3 py-2 text-xs ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="paid">Fully Paid</option>
                  <option value="partial">Partially Paid</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Payment Mode</label>
                <select
                  value={payModalMode}
                  onChange={(e) => setPayModalMode(e.target.value as PaymentMode)}
                  className={`w-full rounded-lg px-3 py-2 text-xs ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer (IMPS / NEFT)</option>
                  <option value="card">Card</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  UPI Ref / UTR / Transaction ID
                </label>
                <input
                  type="text"
                  value={payModalRef}
                  onChange={(e) => setPayModalRef(e.target.value)}
                  placeholder="e.g. 429381749281 or UTR-998811"
                  className={`w-full rounded-lg px-3 py-2 text-xs font-mono ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedBillForPayment(null)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                >
                  Update Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bill Detail Viewer Modal */}
      {viewingBill && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-base font-bold">Vendor Invoice: {viewingBill.invoiceNumber}</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {viewingBill.vendorName} · Dated: {viewingBill.invoiceDate}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingBill(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Uploaded receipt photo preview */}
              {viewingBill.billImage && (
                <div className={`p-3 rounded-xl border space-y-2 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-blue-500" />
                      <span>Uploaded Bill / Receipt Image</span>
                    </span>
                    <button
                      onClick={() => setZoomedImage(viewingBill.billImage!)}
                      className="text-blue-600 hover:underline flex items-center gap-1 text-[11px]"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Zoom</span>
                    </button>
                  </div>
                  <div className="max-h-56 overflow-hidden rounded-lg border text-center">
                    <img 
                      src={viewingBill.billImage} 
                      alt="Uploaded bill" 
                      className="max-h-56 w-auto object-contain mx-auto cursor-pointer"
                      onClick={() => setZoomedImage(viewingBill.billImage!)}
                    />
                  </div>
                </div>
              )}

              {/* Items Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Invoiced Line Items</h4>
                <div className={`rounded-xl border overflow-hidden ${
                  isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'
                }`}>
                  <table className="w-full text-xs text-left">
                    <thead className={`border-b font-semibold ${
                      isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
                    }`}>
                      <tr>
                        <th className="py-2 px-3">Item Description</th>
                        <th className="py-2 px-2">HSN</th>
                        <th className="py-2 px-2 text-center">Qty</th>
                        <th className="py-2 px-2 text-center">GST %</th>
                        <th className="py-2 px-2 text-right">Input GST</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {viewingBill.items.map((it, idx) => {
                        const itGst = it.gstPercent !== undefined ? it.gstPercent : 18;
                        const itTax = it.gstAmount ?? Number((((it.total || (it.unitCost * it.quantity)) * itGst) / 100).toFixed(2));
                        const itTotal = it.totalWithGst ?? Number(((it.total || 0) + itTax).toFixed(2));
                        return (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-medium">{it.itemName}</td>
                            <td className="py-2 px-2 font-mono text-[11px] text-blue-500">{it.hsnCode || '—'}</td>
                            <td className="py-2 px-2 text-center font-mono">{it.quantity}</td>
                            <td className="py-2 px-2 text-center font-mono font-bold text-blue-600">{itGst}%</td>
                            <td className="py-2 px-2 text-right font-mono text-amber-600">₹{itTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold">₹{itTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial & Payment Summary */}
              <div className={`grid grid-cols-2 gap-3 p-3.5 rounded-xl border ${
                isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Payment Breakdown</span>
                  <p className="text-xs">Status: <strong className="uppercase">{viewingBill.paymentStatus}</strong></p>
                  <p className="text-xs">Mode: <strong className="uppercase">{viewingBill.paymentMode || 'UPI'}</strong></p>
                  {viewingBill.paymentReference && (
                    <p className="text-xs font-mono">Ref / UTR: <strong className="text-blue-500">{viewingBill.paymentReference}</strong></p>
                  )}
                  {viewingBill.taxAmount !== undefined && viewingBill.taxAmount > 0 && (
                    <p className="text-xs text-blue-600 font-semibold pt-1">
                      Input GST Credit: ₹{viewingBill.taxAmount.toLocaleString('en-IN')} (CGST: ₹{Math.round((viewingBill.taxAmount / 2) * 10) / 10} | SGST: ₹{Math.round((viewingBill.taxAmount / 2) * 10) / 10})
                    </p>
                  )}
                </div>

                <div className="text-right space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Amounts</span>
                  <p className="text-xs font-mono">Total: <strong>₹{viewingBill.totalAmount.toLocaleString('en-IN')}</strong></p>
                  <p className="text-xs font-mono text-emerald-600">Paid: <strong>₹{viewingBill.paidAmount.toLocaleString('en-IN')}</strong></p>
                  <p className="text-xs font-mono text-amber-600">
                    Pending: <strong>₹{(viewingBill.totalAmount - viewingBill.paidAmount).toLocaleString('en-IN')}</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className={`px-6 py-3 border-t flex justify-end ${
              isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
            }`}>
              <button
                onClick={() => setViewingBill(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-size Image Zoom Modal */}
      {zoomedImage && (
        <div 
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img src={zoomedImage} alt="Zoomed Receipt" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
        </div>
      )}

    </div>
  );
};
