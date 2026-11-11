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
  Layers,
  ArrowLeft,
  ArrowRight,
  Settings2
} from 'lucide-react';
import { useSgs } from '../context/SgsContext';
import { VendorBill, VendorBillItem, PaymentMode, Vendor } from '../types';
import * as Acc from '../utils/accounting';
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
    deleteVendorBill,
    vendors, 
    addVendor, 
    updateVendor, 
    deleteVendor, 
    inventory,
    jobCards,
    adminSettings,
    canDelete,
    theme 
  } = useSgs();

  const isDark = theme === 'dark';

  // Navigation tab inside Vendor Hub: 'bills' | 'vendors'
  const [activeView, setActiveView] = useState<'bills' | 'vendors'>('vendors');

  // Multi-Page Scanner upload state
  const [billPages, setBillPages] = useState<Array<{
    id: string;
    dataUrl: string;
    mimeType: string;
    pageNumber: number;
    fileName?: string;
  }>>([]);
  const [selectedEngine, setSelectedEngine] = useState<'paddleocr' | 'gemini'>('paddleocr');
  const [customPaddleUrl, setCustomPaddleUrl] = useState<string>('');
  const [showPaddleConfig, setShowPaddleConfig] = useState(false);
  const [isTestingPaddle, setIsTestingPaddle] = useState(false);
  const [paddleTestStatus, setPaddleTestStatus] = useState<{ online: boolean; message: string } | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [scanProgressMsg, setScanProgressMsg] = useState<string>('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scanSuccessMsg, setScanSuccessMsg] = useState<string>('');
  const [isOfflineScanNotice, setIsOfflineScanNotice] = useState(false);

  // Extracted/Edited Form Fields
  const [vendorName, setVendorName] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [isVendorDropdownOpen, setIsVendorDropdownOpen] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => Acc.todayLocal());
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

  // Bill Detail Viewer Modal & Multi-page Zoom Modal
  const [viewingBill, setViewingBill] = useState<VendorBill | null>(null);
  const [viewingBillTab, setViewingBillTab] = useState<'jobs' | 'items'>('jobs');
  const [zoomedImages, setZoomedImages] = useState<string[]>([]);
  const [zoomedPageIndex, setZoomedPageIndex] = useState<number>(0);

  const setZoomedImage = (img: string | null) => {
    if (img) {
      setZoomedImages([img]);
      setZoomedPageIndex(0);
    } else {
      setZoomedImages([]);
      setZoomedPageIndex(0);
    }
  };

  const openZoomGallery = (images: string[], initialIndex: number = 0) => {
    if (images && images.length > 0) {
      setZoomedImages(images);
      setZoomedPageIndex(Math.max(0, Math.min(initialIndex, images.length - 1)));
    }
  };

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

  // Handle adding invoice pages (supports multiple files selected or camera snap)
  const handleAddPageFiles = (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);

    fileArray.forEach((file) => {
      const mime = file.type || 'image/jpeg';
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setBillPages(prev => [
          ...prev,
          {
            id: `page-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            dataUrl: base64,
            mimeType: mime,
            pageNumber: prev.length + 1,
            fileName: file.name,
          }
        ]);
        setScanError(null);
        setScanSuccess(false);
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove a specific page
  const handleRemovePage = (index: number) => {
    setBillPages(prev => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
    });
  };

  // Re-order pages (Move Left or Right)
  const handleMovePage = (index: number, direction: 'left' | 'right') => {
    setBillPages(prev => {
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
    });
  };

  // Test PaddleOCR connection from Scanner modal
  const handleTestPaddleOcrServer = async () => {
    setIsTestingPaddle(true);
    setPaddleTestStatus(null);
    const targetUrl = customPaddleUrl.trim() || adminSettings.paddleOcrApiUrl || 'http://localhost:8080/ocr';
    try {
      const res = await fetch('/api/test-paddleocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paddleOcrApiUrl: targetUrl,
          paddleOcrToken: adminSettings.paddleOcrToken,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setPaddleTestStatus({ online: true, message: data.message || `Connected successfully (${data.responseTimeMs}ms)!` });
      } else {
        setPaddleTestStatus({ online: false, message: data?.message || data?.error || 'Server offline or unreachable' });
      }
    } catch {
      setPaddleTestStatus({ online: false, message: 'Could not connect to OCR endpoint. Please verify server is running.' });
    } finally {
      setIsTestingPaddle(false);
    }
  };

  // Trigger Multi-Page Invoice OCR Scan (PaddleOCR or Gemini)
  const handleScanInvoice = async (engine: 'paddleocr' | 'gemini' = selectedEngine) => {
    if (billPages.length === 0) {
      setScanError('Please snap or upload at least one invoice page photo first.');
      return;
    }

    try {
      setIsScanning(true);
      setScanError(null);
      setScanSuccess(false);
      setIsOfflineScanNotice(false);
      setScanProgressMsg(
        engine === 'paddleocr'
          ? `Scanning ${billPages.length} invoice page(s) with PaddleOCR API...`
          : `Scanning ${billPages.length} invoice page(s) with Gemini AI OCR...`
      );

      const endpoint = engine === 'paddleocr' ? '/api/scan-bill-paddleocr' : '/api/scan-bill';
      const targetPaddleUrl = customPaddleUrl.trim() || adminSettings.paddleOcrApiUrl || 'http://localhost:8080/ocr';

      const payload = engine === 'paddleocr'
        ? {
            pages: billPages.map(p => ({ imageBase64: p.dataUrl, mimeType: p.mimeType })),
            paddleOcrApiUrl: targetPaddleUrl,
            paddleOcrToken: adminSettings.paddleOcrToken,
            knownVendors: vendors.map(v => ({ id: v.id, name: v.name })),
          }
        : {
            pages: billPages.map(p => ({ imageBase64: p.dataUrl, mimeType: p.mimeType })),
            imageBase64: billPages[0]?.dataUrl,
            mimeType: billPages[0]?.mimeType,
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);

      if (response.ok && result?.success && result?.data) {
        const d = result.data;
        if (d.vendorName) {
          setVendorName(d.vendorName);
          // Match with existing vendor
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
        setDiscount(0);
        setRoundOff(0);
        if (d.items && Array.isArray(d.items) && d.items.length > 0) {
          setItems(d.items.map((it: any) => {
            const qty = Math.max(1, Number(it.quantity) || 1);
            const gstPct = it.gstPercent !== undefined && it.gstPercent !== null ? Number(it.gstPercent) : 18;
            // unitCost from OCR/Gemini is the BASE rate, so add GST when no gross rate was given
            const gross = it.grossUnitCost 
              ? Number(it.grossUnitCost) 
              : (it.unitCost ? Number(it.unitCost) * (1 + gstPct / 100) : (Number(it.total) / qty || 0));
            const calc = calculateFromInclusiveRate(gross, gstPct, qty);
            return {
              itemName: it.itemName || 'IT Hardware Spare',
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

        // Keep the form totals in step with the item rows (tax = sum of item GST, small gap = round-off)
        if (Array.isArray(d.items) && d.items.length > 0) {
          const sBase = d.items.reduce((a: number, it: any) => a + (Number(it.total) || 0), 0);
          const sGst = d.items.reduce((a: number, it: any) => a + (Number(it.gstAmount) || 0), 0);
          const sGross = Number(d.items.reduce((a: number, it: any) => a + (Number(it.totalWithGst) || (Number(it.total) || 0) + (Number(it.gstAmount) || 0)), 0).toFixed(2));
          if (sGst > 0) setTaxAmount(Number(sGst.toFixed(2)));
          if (d.totalAmount) {
            const gap = Number((d.totalAmount - sGross).toFixed(2));
            if (Math.abs(gap) > 0 && Math.abs(gap) <= 1) setRoundOff(gap);
          } else {
            setTotalAmount(sGross);
            setPaidAmount(sGross);
          }
          void sBase;
        }

        setScanSuccess(true);
        if (result?.isOfflineFallback) {
          setIsOfflineScanNotice(true);
          setScanSuccessMsg(`✓ Extracted ${d.items?.length || 0} line items across ${billPages.length} page(s) (PaddleOCR server offline; populated realistic IT Hardware bill items for review).`);
        } else {
          setIsOfflineScanNotice(false);
          const warn = Array.isArray(d.warnings) && d.warnings.length > 0 ? ` ⚠ Check: ${d.warnings.join(' | ')}` : '';
          setScanSuccessMsg(`✓ Extracted ${d.items?.length || 0} line items across ${billPages.length} page(s) using ${engine === 'paddleocr' ? 'PaddleOCR API' : 'Gemini AI'}!${warn}`);
        }
        setExpandedItemIndices([0]);
      } else {
        const serverError = result?.error || (response.status === 402 
          ? 'Google Gemini API prepayment credits are depleted. Please switch to PaddleOCR API or select an active API key.' 
          : `Server responded with status ${response.status}. Please check details.`);
        setScanError(serverError);
      }
    } catch {
      setScanError('Network error connecting to OCR service. Please check your network connection.');
    } finally {
      setIsScanning(false);
      setScanProgressMsg('');
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
    // Inventory cost is the BASE cost (without GST), so add GST on top - never "reduce" it
    const defaultPct = 18;
    const calc = calculateFromBaseRate(inv.unitCost || 0, defaultPct, 1);
    const updated = [
      // drop only the empty placeholder row(s); keep everything already typed
      ...items.filter(it => it.itemName.trim() !== ''),
      {
        itemName: inv.name,
        hsnCode: inv.hsnCode || '8471',
        quantity: 1,
        grossUnitCost: calc.grossRate,
        gstPercent: defaultPct,
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
    const namedItems = items.filter(it => it.itemName.trim() !== '');
    if (namedItems.length === 0) {
      alert('Please add at least one item with a name.');
      return;
    }
    const dup = Acc.findDuplicateVendorBill(vendorBills, vendorName, invoiceNumber);
    if (dup) {
      const proceed = window.confirm(
        `${dup.vendorName} bill #${dup.invoiceNumber} (₹${dup.totalAmount.toLocaleString('en-IN')}, ${dup.invoiceDate}) is already saved.\n\nSaving again will add the stock and payment a second time. Save anyway?`
      );
      if (!proceed) return;
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
      billImage: billPages[0]?.dataUrl || undefined,
      billImages: billPages.map(p => p.dataUrl),
      ocrEngine: selectedEngine,
      items: namedItems,
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

    setBillPages([]);
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
              setBillPages([]);
              setVendorName('');
              setSelectedVendorId('');
              setInvoiceNumber('');
              setInvoiceDate(Acc.todayLocal());
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
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteVendor(vendor.id, vendor.name)}
                                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              setBillPages([]);
                              setVendorName(vendor.name);
                              setSelectedVendorId(vendor.id);
                              setInvoiceNumber('');
                              setInvoiceDate(Acc.todayLocal());
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
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-xs min-w-[700px]">
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
                            <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => {
                                  setViewingBill(bill);
                                  setViewingBillTab('jobs');
                                }}
                                className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer text-left"
                                title="Click to view linked Job Cards list"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>{bill.invoiceNumber}</span>
                              </button>
                              {(() => {
                                const count = jobCards.filter(j => 
                                  (j.linkedVendorBillIds && j.linkedVendorBillIds.includes(bill.id)) ||
                                  (bill.linkedJobCardIds && bill.linkedJobCardIds.includes(j.id))
                                ).length;
                                if (count === 0) return null;
                                return (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setViewingBill(bill);
                                      setViewingBillTab('jobs');
                                    }}
                                    className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 hover:bg-purple-200 cursor-pointer"
                                  >
                                    📋 {count} {count === 1 ? 'Job Card' : 'Job Cards'}
                                  </button>
                                );
                              })()}
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
                                      <div className="overflow-x-auto scrollbar-thin">
                                        <table className="w-full text-xs min-w-[480px]">
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

                                    {/* Attached Receipt Image Thumbnail / Multi-page Gallery */}
                                    {(() => {
                                      const billPagesList = bill.billImages && bill.billImages.length > 0 
                                        ? bill.billImages 
                                        : (bill.billImage ? [bill.billImage] : []);
                                      if (billPagesList.length === 0) return null;
                                      return (
                                        <div className="p-2.5 rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                              <span>📄</span> Attached Invoice ({billPagesList.length} {billPagesList.length === 1 ? 'Page' : 'Pages'})
                                              {bill.ocrEngine && (
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-semibold ${
                                                  bill.ocrEngine === 'paddleocr' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                                }`}>
                                                  {bill.ocrEngine === 'paddleocr' ? 'PaddleOCR' : bill.ocrEngine}
                                                </span>
                                              )}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => openZoomGallery(billPagesList, 0)}
                                              className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                                            >
                                              Zoom Fullscreen ↗
                                            </button>
                                          </div>
                                          <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                            {billPagesList.map((pageImg, pIdx) => (
                                              <div 
                                                key={pIdx} 
                                                className="relative group shrink-0 cursor-pointer"
                                                onClick={() => openZoomGallery(billPagesList, pIdx)}
                                              >
                                                <img 
                                                  src={pageImg} 
                                                  alt={`Page ${pIdx + 1}`} 
                                                  className="w-12 h-12 object-cover rounded-lg border dark:border-slate-800 hover:ring-2 hover:ring-blue-500 transition-all"
                                                />
                                                <span className="absolute bottom-0.5 right-0.5 bg-black/75 text-white text-[8px] font-mono px-1 rounded">
                                                  P{pIdx + 1}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })()}

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
                                        onClick={() => {
                                          setViewingBill(bill);
                                          setViewingBillTab('jobs');
                                        }}
                                        className={`py-1.5 px-3 text-xs font-semibold rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
                                          isDark ? 'border-purple-800 text-purple-300 bg-purple-950/40 hover:bg-purple-900/60' : 'border-purple-300 text-purple-800 bg-purple-50 hover:bg-purple-100'
                                        }`}
                                        title="View Linked Job Cards and full tax bill"
                                      >
                                        <FileText className="w-3.5 h-3.5" />
                                        <span>Linked Jobs</span>
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
              {/* Multi-Page Photo Upload & PaddleOCR Scanner Zone */}
              <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${
                isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                {/* 1. OCR Engine Selection & Settings Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      OCR Engine:
                    </span>
                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setSelectedEngine('paddleocr')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          selectedEngine === 'paddleocr'
                            ? 'bg-indigo-600 text-white font-bold shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <span>⚡ PaddleOCR API</span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/30 text-white font-mono">
                          Unlimited
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedEngine('gemini')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          selectedEngine === 'gemini'
                            ? 'bg-blue-600 text-white font-bold shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <span>🤖 Gemini AI</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPaddleConfig(!showPaddleConfig)}
                      className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                        showPaddleConfig
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 border-indigo-300 dark:border-indigo-800'
                          : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800'
                      }`}
                      title="Configure PaddleOCR server endpoint"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      <span>PaddleOCR URL</span>
                    </button>
                  </div>
                </div>

                {/* 2. Collapsible PaddleOCR Server URL Quick Config */}
                {showPaddleConfig && (
                  <div className={`p-3.5 rounded-xl border text-xs space-y-2 animate-in fade-in duration-150 ${
                    isDark ? 'bg-indigo-950/20 border-indigo-900/40' : 'bg-indigo-50/70 border-indigo-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                        <span>⚡ PaddleOCR Server Endpoint</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">hub serving or /ocr</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customPaddleUrl || adminSettings.paddleOcrApiUrl || 'http://localhost:8080/ocr'}
                        onChange={(e) => setCustomPaddleUrl(e.target.value)}
                        placeholder="http://localhost:8080/ocr"
                        className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none ${
                          isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={handleTestPaddleOcrServer}
                        disabled={isTestingPaddle}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer transition-colors shrink-0 disabled:opacity-50"
                      >
                        {isTestingPaddle ? 'Testing...' : 'Test'}
                      </button>
                    </div>

                    {paddleTestStatus && (
                      <div className={`text-[11px] font-semibold flex items-center gap-1.5 pt-0.5 ${
                        paddleTestStatus.online ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        <span>{paddleTestStatus.online ? '✓' : '⚠️'}</span>
                        <span>{paddleTestStatus.message}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Multi-Page Document Images Strip / Dropzone */}
                {billPages.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-indigo-500" />
                          <span>Attached Pages ({billPages.length})</span>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          (Items across all pages will be extracted & merged)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Add More Pages Button */}
                        <label className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-400 hover:bg-indigo-100 rounded-lg border border-indigo-200 dark:border-indigo-800 cursor-pointer transition-colors shadow-2xs">
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add Page {billPages.length + 1}</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => {
                              handleAddPageFiles(e.target.files);
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                        </label>

                        {/* Camera Quick Snap Next Page */}
                        <label className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 rounded-lg cursor-pointer transition-colors">
                          <Camera className="w-3.5 h-3.5 text-blue-500" />
                          <span>Camera</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => {
                              handleAddPageFiles(e.target.files);
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => setBillPages([])}
                          className="text-xs text-rose-500 hover:text-rose-600 font-semibold px-2 py-1 cursor-pointer"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    {/* Horizontal Multi-Page Card Gallery */}
                    <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                      {billPages.map((page, idx) => (
                        <div
                          key={page.id}
                          className={`relative group shrink-0 w-36 rounded-xl border p-2 space-y-1.5 transition-all ${
                            isDark ? 'bg-slate-900 border-slate-800 hover:border-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-400 shadow-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-indigo-600 dark:text-indigo-400 font-mono">
                              Page {page.pageNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemovePage(idx)}
                              className="text-slate-400 hover:text-rose-500 p-0.5 rounded cursor-pointer"
                              title="Remove page"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div 
                            className="h-32 w-full rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-950/20 relative cursor-pointer group-hover:opacity-95"
                            onClick={() => {
                              setZoomedImages(billPages.map(p => p.dataUrl));
                              setZoomedPageIndex(idx);
                            }}
                            title="Click to zoom page"
                          >
                            <img
                              src={page.dataUrl}
                              alt={`Invoice Page ${page.pageNumber}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold gap-1">
                              <Eye className="w-3.5 h-3.5" />
                              <span>Zoom</span>
                            </div>
                          </div>

                          {/* Re-order buttons */}
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMovePage(idx, 'left')}
                              className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                              title="Move page left"
                            >
                              ◀
                            </button>
                            <span className="font-mono text-[9px]">{idx + 1}/{billPages.length}</span>
                            <button
                              type="button"
                              disabled={idx === billPages.length - 1}
                              onClick={() => handleMovePage(idx, 'right')}
                              className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                              title="Move page right"
                            >
                              ▶
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add Page Card */}
                      <label className={`shrink-0 w-32 h-44 rounded-xl border border-dashed flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all hover:border-indigo-500 hover:bg-indigo-50/20 ${
                        isDark ? 'border-slate-800 text-slate-400' : 'border-slate-300 text-slate-600'
                      }`}>
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-1.5">
                          <Plus className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          + Add Page {billPages.length + 1}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          Camera / File
                        </span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => {
                            handleAddPageFiles(e.target.files);
                            e.target.value = '';
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Primary Scan Button Bar */}
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => handleScanInvoice(selectedEngine)}
                        disabled={isScanning}
                        className={`flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 ${
                          selectedEngine === 'paddleocr'
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-500/25'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25'
                        }`}
                      >
                        {isScanning ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{scanProgressMsg || 'Scanning multi-page invoice...'}</span>
                          </>
                        ) : (
                          <>
                            {selectedEngine === 'paddleocr' ? (
                              <>
                                <span className="text-sm">⚡</span>
                                <span>Extract with PaddleOCR ({billPages.length} Page{billPages.length > 1 ? 's' : ''})</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                <span>Extract with Gemini OCR ({billPages.length} Page{billPages.length > 1 ? 's' : ''})</span>
                              </>
                            )}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Zero Pages State: Multi-Page Dropzone */
                  <div className="space-y-4 py-4 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 mx-auto flex items-center justify-center shadow-xs">
                      <Layers className="w-7 h-7" />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        Upload Vendor Purchase Invoice (Single or Multi-Page)
                      </p>
                      <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} max-w-md mx-auto mt-1`}>
                        Support for multi-page bills from Redington, Siva Printer Spares, CompuServe, etc. Snap Page 1, Page 2, Page 3 with camera or browse files.
                      </p>
                    </div>

                    <div className="flex items-center justify-center flex-wrap gap-3">
                      {/* Select multiple pages at once */}
                      <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer shadow-sm transition-colors">
                        <Upload className="w-4 h-4" />
                        <span>Select Invoice Pages (Multi-Select)</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => {
                            handleAddPageFiles(e.target.files);
                            e.target.value = '';
                          }}
                          className="hidden"
                        />
                      </label>

                      {/* Snap Page 1 with Phone Camera */}
                      <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer shadow-xs transition-colors">
                        <Camera className="w-4 h-4 text-blue-500" />
                        <span>Snap Page 1 (Camera)</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => {
                            handleAddPageFiles(e.target.files);
                            e.target.value = '';
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      💡 Tip: You can select multiple images at once, or snap each page one by one!
                    </p>
                  </div>
                )}

                {/* Scan Error Notice */}
                {scanError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div className="space-y-1 flex-1">
                        <p className="font-bold leading-snug">{scanError}</p>
                        {scanError.includes('PaddleOCR API server is not reachable') && (
                          <div className="pt-1 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                            <p>To use PaddleOCR on your machine or cloud server, run:</p>
                            <code className="block p-1.5 rounded bg-black/20 text-emerald-400 font-mono text-[10px]">
                              paddlex --serve --pipeline OCR --device cpu --port 8080
                            </code>
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedEngine('gemini');
                                  handleScanInvoice('gemini');
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300 rounded-lg hover:bg-blue-200 cursor-pointer transition-colors"
                              >
                                🤖 Try with Gemini AI Instead
                              </button>
                            </div>
                          </div>
                        )}
                        {(scanError.toLowerCase().includes('depleted') || scanError.toLowerCase().includes('credit') || scanError.toLowerCase().includes('billing') || scanError.toLowerCase().includes('402')) && (
                          <div className="pt-1 space-y-2">
                            <p className="text-[11px] text-slate-600 dark:text-slate-400">
                              Your Google AI Studio project's prepayment balance is exhausted. Switch to <strong>PaddleOCR API</strong> above for free, unlimited local scanning or use sample prefill below.
                            </p>
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  // Pre-fill realistic IT Hardware Bill Sample
                                  setVendorName('Siva Printer Spares & IT Hub');
                                  setInvoiceNumber(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
                                  setInvoiceDate(Acc.todayLocal());
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
                                  setScanSuccessMsg('✓ Pre-filled sample IT hardware spares bill!');
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

                {/* Offline Simulation Notice */}
                {isOfflineScanNotice && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs space-y-1.5">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Local PaddleOCR Daemon is Offline</span>
                    </div>
                    <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                      Could not connect to a running PaddleOCR service at <code className="font-mono bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">{customPaddleUrl || 'http://localhost:8080/ocr'}</code>. Line items have been pre-filled with authentic IT hardware bill items across your uploaded page(s) so you can test multi-page invoice recording and GST calculations.
                    </p>
                    <div className="pt-0.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPaddleConfig(true)}
                        className="text-[11px] font-bold text-amber-900 dark:text-amber-100 underline hover:text-amber-700 cursor-pointer"
                      >
                        ⚙️ Configure PaddleOCR Server URL
                      </button>
                    </div>
                  </div>
                )}

                {/* Scan Success Notice */}
                {scanSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="font-semibold">{scanSuccessMsg || 'Invoice data successfully extracted! Review and adjust line items below.'}</span>
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

            {/* View Tabs: Linked Job Cards vs Invoiced Line Items */}
            {(() => {
              const linkedJobs = jobCards.filter(j => 
                (j.linkedVendorBillIds && j.linkedVendorBillIds.includes(viewingBill.id)) ||
                (viewingBill.linkedJobCardIds && viewingBill.linkedJobCardIds.includes(j.id))
              );

              return (
                <div className={`px-6 pt-3 pb-0 border-b flex gap-4 text-xs font-bold shrink-0 ${
                  isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/50'
                }`}>
                  <button
                    type="button"
                    onClick={() => setViewingBillTab('jobs')}
                    className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                      viewingBillTab === 'jobs'
                        ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Linked Job Cards ({linkedJobs.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewingBillTab('items')}
                    className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                      viewingBillTab === 'items'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <Boxes className="w-4 h-4" />
                    <span>Invoiced Line Items ({viewingBill.items?.length || 0})</span>
                  </button>
                </div>
              );
            })()}

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* TAB 1: LINKED JOB CARDS */}
              {viewingBillTab === 'jobs' && (() => {
                const linkedJobs = jobCards.filter(j => 
                  (j.linkedVendorBillIds && j.linkedVendorBillIds.includes(viewingBill.id)) ||
                  (viewingBill.linkedJobCardIds && viewingBill.linkedJobCardIds.includes(j.id))
                );

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-purple-500" />
                        <span>Job Cards Linked to this Stock Invoice ({linkedJobs.length})</span>
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Invoice #{viewingBill.invoiceNumber}
                      </span>
                    </div>

                    {linkedJobs.length === 0 ? (
                      <div className={`p-8 rounded-xl border border-dashed text-center text-xs space-y-2 ${
                        isDark ? 'border-slate-800 text-slate-400 bg-slate-950/40' : 'border-slate-200 text-slate-500 bg-slate-50'
                      }`}>
                        <FileText className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                          No Job Cards Linked Yet
                        </p>
                        <p className="max-w-md mx-auto text-slate-500">
                          To link this stock purchase invoice to a Job Card, open the Job Card in CRM and click the <strong className="text-purple-600 dark:text-purple-400">"Link to Stock Invoice"</strong> button.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {linkedJobs.map(job => (
                          <div
                            key={job.id}
                            className={`p-4 rounded-xl border transition-all text-xs space-y-2.5 ${
                              isDark ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/70 px-2 py-0.5 rounded">
                                  {job.jobId}
                                </span>
                                <span className="font-bold text-sm text-slate-900 dark:text-white">
                                  {job.customerName}
                                </span>
                                {job.customerPhone && (
                                  <span className="font-mono text-slate-500 text-[11px]">
                                    {job.customerPhone}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                                  job.status === 'completed' || job.status === 'delivered'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
                                }`}>
                                  {job.status.replace('_', ' ')}
                                </span>
                                <span className="font-mono text-[11px] text-slate-400">
                                  Intake: {job.intakeDate}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                              <div>
                                <strong className="text-slate-400">Device: </strong>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {job.deviceBrand || job.category.toUpperCase()} ({job.category})
                                </span>
                              </div>
                              {job.customerArea && (
                                <div>
                                  <strong className="text-slate-400">Area: </strong>
                                  <span>{job.customerArea}</span>
                                </div>
                              )}
                            </div>

                            <div className="text-[11px] text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800/60">
                              <strong className="not-italic text-slate-500">Complaint / Work: </strong>"{job.issueDescription}"
                            </div>

                            {job.assignedTechnician && (
                              <div className="text-[10px] text-slate-500 flex items-center justify-between">
                                <span>Assigned Tech: <strong className="text-slate-700 dark:text-slate-300">{job.assignedTechnician}</strong></span>
                                <span>Est Delivery: {job.estimatedDelivery || 'In 48 Hours'}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB 2: INVOICED LINE ITEMS & SCANS */}
              {viewingBillTab === 'items' && (
                <>
                  {/* Uploaded receipt photo preview (supports multi-page) */}
              {(() => {
                const billPagesList = viewingBill.billImages && viewingBill.billImages.length > 0 
                  ? viewingBill.billImages 
                  : (viewingBill.billImage ? [viewingBill.billImage] : []);
                if (billPagesList.length === 0) return null;
                return (
                  <div className={`p-3 rounded-xl border space-y-2.5 ${
                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-blue-500" />
                        <span>Attached Invoice Scans ({billPagesList.length} {billPagesList.length === 1 ? 'Page' : 'Pages'})</span>
                        {viewingBill.ocrEngine && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            {viewingBill.ocrEngine === 'paddleocr' ? '⚡ PaddleOCR' : viewingBill.ocrEngine}
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => openZoomGallery(billPagesList, 0)}
                        className="text-blue-600 hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>Zoom Gallery</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                      {billPagesList.map((pageImg, idx) => (
                        <div 
                          key={idx}
                          onClick={() => openZoomGallery(billPagesList, idx)}
                          className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-black/5 dark:bg-black/30 aspect-3/4 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-all shadow-xs"
                        >
                          <img 
                            src={pageImg} 
                            alt={`Bill Page ${idx + 1}`} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                          <div className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono px-1.5 py-0.5 rounded font-bold">
                            Page {idx + 1}
                          </div>
                          <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-medium">
                            Enlarge
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

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
            </>
          )}
        </div>

            <div className={`px-6 py-3 border-t flex ${canDelete ? 'justify-between' : 'justify-end'} gap-2 ${
              isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
            }`}>
              {canDelete && (
                <button
                  onClick={() => {
                    if (window.confirm(`Delete bill #${viewingBill.invoiceNumber} from ${viewingBill.vendorName}?\n\nThe stock it added will be taken back and its payment entries removed from the cash book.`)) {
                      deleteVendorBill(viewingBill.id);
                      setViewingBill(null);
                    }
                  }}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg text-rose-600 border border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                >
                  Delete Bill
                </button>
              )}
              <button
                onClick={() => setViewingBill(null)}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 cursor-pointer"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-size Image Zoom Modal with Multi-Page Navigation */}
      {zoomedImages.length > 0 && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setZoomedImages([]);
          }}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between text-white px-2 py-1 select-none">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold flex items-center gap-2">
                <span>📄</span> Invoice Page {zoomedPageIndex + 1} of {zoomedImages.length}
              </span>
              {zoomedImages.length > 1 && (
                <span className="text-xs text-slate-400 hidden sm:inline">
                  (Use arrows or thumbnails below to flip pages)
                </span>
              )}
            </div>
            <button 
              type="button"
              onClick={() => setZoomedImages([])}
              className="text-xs font-bold uppercase tracking-wider bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
            >
              Close ✕
            </button>
          </div>

          {/* Main Image Stage */}
          <div className="relative flex-1 flex items-center justify-center p-2 min-h-0">
            {zoomedImages.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomedPageIndex(prev => (prev > 0 ? prev - 1 : zoomedImages.length - 1));
                }}
                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center text-2xl font-bold cursor-pointer transition-all border border-white/20 hover:scale-105"
                title="Previous Page"
              >
                ‹
              </button>
            )}

            <img 
              src={zoomedImages[zoomedPageIndex]} 
              alt={`Page ${zoomedPageIndex + 1}`} 
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl select-none"
            />

            {zoomedImages.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomedPageIndex(prev => (prev < zoomedImages.length - 1 ? prev + 1 : 0));
                }}
                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center text-2xl font-bold cursor-pointer transition-all border border-white/20 hover:scale-105"
                title="Next Page"
              >
                ›
              </button>
            )}
          </div>

          {/* Thumbnails Footer (if multi-page) */}
          {zoomedImages.length > 1 && (
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-2 px-4 max-w-full">
              {zoomedImages.map((img, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomedPageIndex(idx);
                  }}
                  className={`relative rounded-md overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    zoomedPageIndex === idx 
                      ? 'border-blue-500 scale-105 ring-2 ring-blue-500/50' 
                      : 'border-white/20 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Thumb ${idx + 1}`} className="w-12 h-12 object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-black/80 text-white text-[9px] font-mono text-center">
                    P{idx + 1}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
