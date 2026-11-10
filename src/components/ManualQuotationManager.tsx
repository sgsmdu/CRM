import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Calendar, 
  User, 
  Phone, 
  MapPin, 
  Mail, 
  Copy, 
  Trash2, 
  Edit3, 
  Eye, 
  Printer, 
  Share2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Boxes, 
  ChevronRight, 
  ChevronDown, 
  X, 
  ArrowRight, 
  RotateCcw, 
  Layers, 
  DollarSign, 
  Settings, 
  ExternalLink,
  ShieldCheck,
  Tag,
  Archive,
  History,
  Check,
  Sliders,
  Sparkles,
  Info
} from 'lucide-react';
import { useSgs } from '../context/SgsContext';
import { 
  ManualQuotation, 
  QuotationProposalModel, 
  QuotationItem, 
  QuotationModelInternalCharges, 
  QuotationStatus, 
  CustomerModelSelection,
  QuotationProduct,
  QuotationCategory,
  QuotationSubcategory,
  Customer,
  JobCard
} from '../types';
import { round2 } from '../utils/accounting';
import { DEFAULT_SGS_QUOTATION_LETTERHEAD_BG } from '../utils/brandAssets';

interface ManualQuotationManagerProps {
  initialJobCard?: JobCard | null;
  onClearInitialJobCard?: () => void;
}

export const ManualQuotationManager: React.FC<ManualQuotationManagerProps> = ({
  initialJobCard,
  onClearInitialJobCard,
}) => {
  const {
    quotations,
    quotationCategories,
    quotationSubcategories,
    quotationProducts,
    quotationBrands,
    customers,
    adminSettings,
    theme,
    addManualQuotation,
    updateManualQuotation,
    deleteManualQuotation,
    duplicateManualQuotation,
    updateQuotationStatus,
    addQuotationCategory,
    updateQuotationCategory,
    deleteQuotationCategory,
    addQuotationSubcategory,
    updateQuotationSubcategory,
    deleteQuotationSubcategory,
    addQuotationProduct,
    updateQuotationProduct,
    deleteQuotationProduct,
    restoreQuotationProduct,
    addQuotationBrand,
    updateProductLatestPrice,
    getNextQuotationNumber,
  } = useSgs();

  const isDark = theme === 'dark';

  // Tabs: 'dashboard' | 'catalogue'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'catalogue'>('dashboard');

  // Search & Filters for Dashboard
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modals
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null);
  const [pdfPreviewQuotation, setPdfPreviewQuotation] = useState<ManualQuotation | null>(null);
  const [versionHistoryQuotation, setVersionHistoryQuotation] = useState<ManualQuotation | null>(null);
  const [statusModalQuotation, setStatusModalQuotation] = useState<ManualQuotation | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // --------------------------------------------------------------------------
  // Quotation Editor State (for creating / editing a quotation)
  // --------------------------------------------------------------------------
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [originatingJobId, setOriginatingJobId] = useState<string | undefined>(undefined);

  const [quotationDate, setQuotationDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [validityDays, setValidityDays] = useState<number>(7);
  const [termsAndConditions, setTermsAndConditions] = useState<string>('');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState<number | undefined>(undefined);
  const [customerNotes, setCustomerNotes] = useState('');
  const [installationNotes, setInstallationNotes] = useState('');
  const [activeModelTab, setActiveModelTab] = useState<'model1' | 'model2'>('model1');

  // Model 1 State
  const [model1Name, setModel1Name] = useState('Model 1: 4CH DVR + 2MP HD Camera Package');
  const [model1Items, setModel1Items] = useState<QuotationItem[]>([]);
  const [model1Charges, setModel1Charges] = useState<QuotationModelInternalCharges>({
    installation: 1500,
    helperFees: 500,
    commission: 0,
    margin: 2000,
    petrolVisit: 300,
    customerReduction: 0,
  });

  // Model 2 State
  const [model2Name, setModel2Name] = useState('Model 2: 4CH DVR + 5MP 3K Camera Package');
  const [model2Items, setModel2Items] = useState<QuotationItem[]>([]);
  const [model2Charges, setModel2Charges] = useState<QuotationModelInternalCharges>({
    installation: 1800,
    helperFees: 600,
    commission: 0,
    margin: 2500,
    petrolVisit: 300,
    customerReduction: 0,
  });

  // Product Picker Drawer
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [pickerTargetModel, setPickerTargetModel] = useState<'model1' | 'model2'>('model1');
  const [pickerCategory, setPickerCategory] = useState<string>('all');
  const [pickerSubcategory, setPickerSubcategory] = useState<string>('all');
  const [pickerSearch, setPickerSearch] = useState('');

  // Handle incoming Job Card from prop
  useEffect(() => {
    if (initialJobCard) {
      handleOpenCreateFromJobCard(initialJobCard);
      if (onClearInitialJobCard) {
        onClearInitialJobCard();
      }
    }
  }, [initialJobCard]);

  const handleOpenCreateFromJobCard = (job: JobCard) => {
    resetEditorForm();
    setOriginatingJobId(job.id);
    setCustomerName(job.customerName || '');
    setCustomerPhone(job.customerPhone || '');
    setCustomerAddress(job.customerArea || '');
    
    // Check if matched customer in database
    const matched = customers.find(c => 
      c.id === job.customerId || 
      (c.phone && job.customerPhone && c.phone.replace(/\D/g, '') === job.customerPhone.replace(/\D/g, ''))
    );
    if (matched) {
      setSelectedCustomerId(matched.id);
      if (!job.customerArea && matched.area) setCustomerAddress(matched.area);
    }

    setIsEditorOpen(true);
    showToast(`Quotation initialized for Job #${job.jobId || job.id} (${job.customerName})`);
  };

  const resetEditorForm = () => {
    setEditingQuotationId(null);
    setSelectedCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerEmail('');
    setOriginatingJobId(undefined);
    setQuotationDate(new Date().toISOString().split('T')[0]);
    setValidityDays(7);
    setTermsAndConditions(adminSettings.quotationTerms || adminSettings.termsAndConditions || '');
    setPaymentDetails('');
    setAdvanceAmount(undefined);
    setCustomerNotes('');
    setInstallationNotes('');
    setActiveModelTab('model1');

    setModel1Name('Model 1: 4CH DVR + 2MP HD Camera Package');
    setModel1Items([]);
    setModel1Charges({
      installation: 1500,
      helperFees: 500,
      commission: 0,
      margin: 2000,
      petrolVisit: 300,
      customerReduction: 0,
    });

    setModel2Name('Model 2: 4CH DVR + 5MP 3K Camera Package');
    setModel2Items([]);
    setModel2Charges({
      installation: 1800,
      helperFees: 600,
      commission: 0,
      margin: 2500,
      petrolVisit: 300,
      customerReduction: 0,
    });
  };

  const handleStartNewQuotation = () => {
    resetEditorForm();
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (qtn: ManualQuotation) => {
    setEditingQuotationId(qtn.id);
    setSelectedCustomerId(qtn.customerId || '');
    setCustomerName(qtn.customerName || '');
    setCustomerPhone(qtn.customerPhone || '');
    setCustomerAddress(qtn.customerAddress || '');
    setCustomerEmail(qtn.customerEmail || '');
    setOriginatingJobId(qtn.jobCardId);
    setQuotationDate(qtn.date || new Date().toISOString().split('T')[0]);
    setValidityDays(qtn.validityDays || 7);
    setTermsAndConditions(qtn.termsAndConditions || adminSettings.quotationTerms || '');
    setPaymentDetails(qtn.paymentDetails || '');
    setAdvanceAmount(qtn.advanceAmount);
    setCustomerNotes(qtn.customerNotes || '');
    setInstallationNotes(qtn.installationNotes || '');
    setActiveModelTab('model1');

    setModel1Name(qtn.model1.name || 'Model 1');
    setModel1Items(JSON.parse(JSON.stringify(qtn.model1.items || [])));
    setModel1Charges({ ...qtn.model1.internalCharges });

    setModel2Name(qtn.model2.name || 'Model 2');
    setModel2Items(JSON.parse(JSON.stringify(qtn.model2.items || [])));
    setModel2Charges({ ...qtn.model2.internalCharges });

    setIsEditorOpen(true);
  };

  // Helper calculation for a model
  const calculateModelSummary = (items: QuotationItem[], charges: QuotationModelInternalCharges) => {
    const totalItemRate = round2(items.reduce((sum, it) => sum + (it.itemTotal || 0), 0));
    const internalSum = round2(
      (charges.installation || 0) + 
      (charges.helperFees || 0) + 
      (charges.commission || 0) + 
      (charges.margin || 0) + 
      (charges.petrolVisit || 0)
    );
    const totalDisplayAmount = round2(totalItemRate + internalSum);
    const reduction = round2(charges.customerReduction || 0);
    const finalModelTotal = round2(Math.max(0, totalDisplayAmount - reduction));

    return {
      totalItemRate,
      internalSum,
      totalDisplayAmount,
      finalModelTotal,
    };
  };

  const model1Calc = useMemo(() => calculateModelSummary(model1Items, model1Charges), [model1Items, model1Charges]);
  const model2Calc = useMemo(() => calculateModelSummary(model2Items, model2Charges), [model2Items, model2Charges]);

  // Customer selection auto-fill
  const handleSelectCustomer = (custId: string) => {
    setSelectedCustomerId(custId);
    const cust = customers.find(c => c.id === custId);
    if (cust) {
      setCustomerName(cust.name);
      setCustomerPhone(cust.phone);
      setCustomerAddress(cust.area || '');
    }
  };

  // Copy Model 1 to Model 2
  const handleCopyModel1ToModel2 = () => {
    setModel2Name(`${model1Name} (Copy)`);
    setModel2Items(JSON.parse(JSON.stringify(model1Items)));
    setModel2Charges({ ...model1Charges });
    showToast('Model 1 items and internal charges copied to Model 2 successfully!');
  };

  // Add Item to a Model
  const handleAddItemToModel = (model: 'model1' | 'model2', item: QuotationItem) => {
    if (model === 'model1') {
      setModel1Items(prev => [...prev, item]);
    } else {
      setModel2Items(prev => [...prev, item]);
    }
  };

  // Add Product from Catalogue
  const handleSelectProductFromCatalogue = (prod: QuotationProduct) => {
    const defaultQty = 1;
    const unitPrice = prod.latestQuotationPrice || 0;
    const itemTotal = round2(defaultQty * unitPrice);

    const newItem: QuotationItem = {
      id: `qit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: prod.id,
      description: `${prod.name}${prod.modelNumber ? ` (${prod.modelNumber})` : ''}`,
      brand: prod.brand,
      modelNumber: prod.modelNumber,
      warranty: prod.warranty,
      quantity: defaultQty,
      unit: 'Nos',
      unitPrice,
      itemTotal,
      isService: false,
    };

    handleAddItemToModel(pickerTargetModel, newItem);
    setIsProductPickerOpen(false);
    showToast(`Added "${prod.name}" to ${pickerTargetModel === 'model1' ? 'Model 1' : 'Model 2'}`);
  };

  // Add Manual Custom Item Row
  const handleAddCustomRow = (model: 'model1' | 'model2', isService = false) => {
    const newItem: QuotationItem = {
      id: `qit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      description: isService ? 'Installation & Onsite Configuration' : 'Custom Equipment',
      brand: isService ? 'SGS Service' : 'SGS',
      quantity: 1,
      unit: 'Nos',
      unitPrice: isService ? 0 : 500,
      itemTotal: isService ? 0 : 500,
      isService,
    };
    handleAddItemToModel(model, newItem);
  };

  // Update item field in Model 1 or Model 2
  const handleUpdateItem = (
    model: 'model1' | 'model2',
    index: number,
    field: keyof QuotationItem,
    value: any
  ) => {
    const setter = model === 'model1' ? setModel1Items : setModel2Items;
    setter(prev => {
      const updated = [...prev];
      const it = { ...updated[index] };

      if (field === 'quantity') {
        const qty = Math.max(0, Number(value) || 0);
        it.quantity = qty;
        it.itemTotal = round2(qty * (it.unitPrice || 0));
      } else if (field === 'unitPrice') {
        const price = Math.max(0, Number(value) || 0);
        it.unitPrice = price;
        it.itemTotal = round2((it.quantity || 1) * price);

        // Update latest quotation price in catalogue if linked to catalogue product
        if (it.productId) {
          updateProductLatestPrice(it.productId, price);
        }
      } else if (field === 'description') {
        it.description = String(value);
      } else if (field === 'brand') {
        it.brand = String(value);
        if (value && typeof value === 'string') {
          addQuotationBrand(value);
        }
      } else if (field === 'modelNumber') {
        it.modelNumber = String(value);
      } else if (field === 'warranty') {
        it.warranty = String(value);
      }

      updated[index] = it;
      return updated;
    });
  };

  const handleRemoveItem = (model: 'model1' | 'model2', index: number) => {
    const setter = model === 'model1' ? setModel1Items : setModel2Items;
    setter(prev => prev.filter((_, i) => i !== index));
  };

  // Save Quotation (Draft or Complete)
  const handleSaveQuotation = (targetStatus?: QuotationStatus, openPdf = false) => {
    if (!customerName.trim()) {
      alert('Please enter a customer name.');
      return;
    }

    const validUntilDate = new Date(quotationDate);
    validUntilDate.setDate(validUntilDate.getDate() + (validityDays || 7));
    const validUntilStr = validUntilDate.toISOString().split('T')[0];

    const model1: QuotationProposalModel = {
      name: model1Name.trim() || 'Model 1',
      items: model1Items,
      internalCharges: model1Charges,
      totalItemRate: model1Calc.totalItemRate,
      totalDisplayAmount: model1Calc.totalDisplayAmount,
      finalModelTotal: model1Calc.finalModelTotal,
    };

    const model2: QuotationProposalModel = {
      name: model2Name.trim() || 'Model 2',
      items: model2Items,
      internalCharges: model2Charges,
      totalItemRate: model2Calc.totalItemRate,
      totalDisplayAmount: model2Calc.totalDisplayAmount,
      finalModelTotal: model2Calc.finalModelTotal,
    };

    if (editingQuotationId) {
      // Editing existing quotation creates an immutable new version snapshot!
      updateManualQuotation(editingQuotationId, {
        customerId: selectedCustomerId || undefined,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        customerEmail: customerEmail.trim() || undefined,
        jobCardId: originatingJobId,
        date: quotationDate,
        validityDays,
        validUntil: validUntilStr,
        model1,
        model2,
        status: targetStatus || 'Draft',
        termsAndConditions,
        paymentDetails: paymentDetails.trim() || undefined,
        advanceAmount: advanceAmount ? Number(advanceAmount) : undefined,
        customerNotes: customerNotes.trim() || undefined,
        installationNotes: installationNotes.trim() || undefined,
      }, `Saved changes to quotation`);

      const updated = quotations.find(q => q.id === editingQuotationId);
      if (updated && openPdf) {
        setPdfPreviewQuotation({
          ...updated,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim(),
          date: quotationDate,
          validityDays,
          validUntil: validUntilStr,
          model1,
          model2,
          termsAndConditions,
          paymentDetails,
          advanceAmount,
          customerNotes,
          installationNotes,
        });
      }

      showToast(`Quotation #${updated?.quotationNumber || editingQuotationId} updated (New Version created)!`);
    } else {
      // New quotation
      const created = addManualQuotation({
        customerId: selectedCustomerId || undefined,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        customerEmail: customerEmail.trim() || undefined,
        jobCardId: originatingJobId,
        date: quotationDate,
        validityDays,
        validUntil: validUntilStr,
        model1,
        model2,
        status: targetStatus || 'Draft',
        selectedModel: 'Not Decided',
        termsAndConditions,
        paymentDetails: paymentDetails.trim() || undefined,
        advanceAmount: advanceAmount ? Number(advanceAmount) : undefined,
        customerNotes: customerNotes.trim() || undefined,
        installationNotes: installationNotes.trim() || undefined,
      });

      if (openPdf) {
        setPdfPreviewQuotation(created);
      }

      showToast(`Manual Quotation #${created.quotationNumber} saved successfully!`);
    }

    setIsEditorOpen(false);
  };

  // WhatsApp Share Message Generator
  const generateWhatsAppMessage = (q: ManualQuotation) => {
    return `*SPIDER GRID SOLUTIONS (SGS)*
*Quotation Ref: ${q.quotationNumber}*
📅 Date: ${q.date} (Valid for ${q.validityDays || 7} Days)

Dear *${q.customerName}*,
Thank you for your enquiry with Spider Grid Solutions - Madurai. We have prepared two tailored CCTV / Security proposals for your premises:

━━━━━━━━━━━━━━━━━━━━━
*OPTION 1: ${q.model1.name}*
• Equipment Packages: ${q.model1.items.length} items
• Total Proposal Amount: *₹${q.model1.finalModelTotal.toLocaleString('en-IN')}*

*OPTION 2: ${q.model2.name}*
• Equipment Packages: ${q.model2.items.length} items
• Total Proposal Amount: *₹${q.model2.finalModelTotal.toLocaleString('en-IN')}*
━━━━━━━━━━━━━━━━━━━━━

*Proposal Terms:*
• Hardware comes with manufacturer warranty.
• Standard installation included.
• Free 30-day onsite service support from handover.

Please review both options and let us know your preferred configuration!
📞 Contact: +91 9677776001 | Madurai`;
  };

  const handleShareWhatsApp = (q: ManualQuotation) => {
    const cleanPhone = (q.customerPhone || '').replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = generateWhatsAppMessage(q);
    const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Filtered Quotation List for Dashboard
  const filteredQuotations = useMemo(() => {
    return quotations
      .filter(q => !q.isArchived)
      .filter(q => {
        if (!searchQuery.trim()) return true;
        const s = searchQuery.toLowerCase();
        return (
          q.quotationNumber?.toLowerCase().includes(s) ||
          q.customerName?.toLowerCase().includes(s) ||
          q.customerPhone?.toLowerCase().includes(s) ||
          q.model1?.name?.toLowerCase().includes(s) ||
          q.model2?.name?.toLowerCase().includes(s)
        );
      })
      .filter(q => {
        if (statusFilter === 'all') return true;
        return q.status === statusFilter;
      })
      .filter(q => {
        if (customerFilter === 'all') return true;
        return q.customerId === customerFilter;
      })
      .filter(q => {
        if (!dateFrom) return true;
        return q.date >= dateFrom;
      })
      .filter(q => {
        if (!dateTo) return true;
        return q.date <= dateTo;
      })
      .sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
  }, [quotations, searchQuery, statusFilter, customerFilter, dateFrom, dateTo]);

  // Dashboard Metrics
  const metrics = useMemo(() => {
    const active = quotations.filter(q => !q.isArchived);
    return {
      total: active.length,
      draft: active.filter(q => q.status === 'Draft').length,
      sent: active.filter(q => q.status === 'Sent').length,
      pending: active.filter(q => q.status === 'Pending Decision').length,
      confirmed: active.filter(q => q.status === 'Confirmed').length,
      rejected: active.filter(q => q.status === 'Rejected').length,
    };
  }, [quotations]);

  // Catalogue Management States
  const [catSearch, setCatSearch] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState('all');
  const [showDeletedProducts, setShowDeletedProducts] = useState(false);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<QuotationProduct | null>(null);

  // New Product Form State
  const [prodFormName, setProdFormName] = useState('');
  const [prodFormCategory, setProdFormCategory] = useState('');
  const [prodFormSubcategory, setProdFormSubcategory] = useState('');
  const [prodFormBrand, setProdFormBrand] = useState('Hikvision');
  const [prodFormCustomBrand, setProdFormCustomBrand] = useState('');
  const [prodFormModel, setProdFormModel] = useState('');
  const [prodFormDesc, setProdFormDesc] = useState('');
  const [prodFormWarranty, setProdFormWarranty] = useState('2 Years Manufacturer Warranty');
  const [prodFormPrice, setProdFormPrice] = useState<number>(1000);

  // Filtered Products for Catalogue Table
  const filteredProducts = useMemo(() => {
    return quotationProducts
      .filter(p => showDeletedProducts ? true : !p.isDeleted)
      .filter(p => {
        if (selectedCatFilter === 'all') return true;
        return p.categoryId === selectedCatFilter;
      })
      .filter(p => {
        if (!catSearch.trim()) return true;
        const s = catSearch.toLowerCase();
        return (
          p.name.toLowerCase().includes(s) ||
          p.brand.toLowerCase().includes(s) ||
          (p.modelNumber && p.modelNumber.toLowerCase().includes(s)) ||
          (p.description && p.description.toLowerCase().includes(s))
        );
      });
  }, [quotationProducts, selectedCatFilter, catSearch, showDeletedProducts]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-blue-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className={`p-6 rounded-2xl border transition-colors ${
        isDark 
          ? 'bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border-slate-800' 
          : 'bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white border-blue-100 shadow-xs'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Manual Quotation Module
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Model 1 & Model 2 Comparison
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Stock Independent
                </span>
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Prepare two proposal packages in one document. Prices, margins and internal charges remain 100% hidden on customer PDF.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isDark ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Quotations ({quotations.filter(q => !q.isArchived).length})</span>
            </button>

            <button
              onClick={() => setActiveTab('catalogue')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'catalogue'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isDark ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Product Catalogue ({quotationProducts.filter(p => !p.isDeleted).length})</span>
            </button>

            <button
              onClick={handleStartNewQuotation}
              className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl transition-all shadow-md shadow-blue-600/25 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Manual Quote</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: QUOTATION DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Quotes', val: metrics.total, color: 'text-blue-600', bg: 'bg-blue-50/50 dark:bg-blue-950/20', border: 'border-blue-200 dark:border-blue-900/40' },
              { label: 'Draft', val: metrics.draft, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-900/40', border: 'border-slate-200 dark:border-slate-800' },
              { label: 'Sent to Client', val: metrics.sent, color: 'text-sky-600', bg: 'bg-sky-50/50 dark:bg-sky-950/20', border: 'border-sky-200 dark:border-sky-900/40' },
              { label: 'Pending Decision', val: metrics.pending, color: 'text-amber-600', bg: 'bg-amber-50/50 dark:bg-amber-950/20', border: 'border-amber-200 dark:border-amber-900/40' },
              { label: 'Confirmed', val: metrics.confirmed, color: 'text-emerald-600', bg: 'bg-emerald-50/50 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-900/40' },
              { label: 'Rejected', val: metrics.rejected, color: 'text-rose-600', bg: 'bg-rose-50/50 dark:bg-rose-950/20', border: 'border-rose-200 dark:border-rose-900/40' },
            ].map((m, idx) => (
              <div key={idx} className={`p-4 rounded-xl border ${m.bg} ${m.border}`}>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block truncate">
                  {m.label}
                </span>
                <span className={`text-2xl font-black font-mono mt-1 block ${m.color}`}>
                  {m.val}
                </span>
              </div>
            ))}
          </div>

          {/* Search, Filter & Controls Bar */}
          <div className={`p-4 rounded-2xl border space-y-3 ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search */}
              <div className="relative w-full sm:flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search quote # (e.g. SGS/QTN/2026/001), customer, phone or model package..."
                  className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              {/* Status Filter */}
              <div className="w-full sm:w-auto flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`w-full sm:w-44 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-slate-50 border border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="all">All Statuses ({quotations.filter(q => !q.isArchived).length})</option>
                  <option value="Draft">Draft</option>
                  <option value="Sent">Sent</option>
                  <option value="Pending Decision">Pending Decision</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Rejected">Rejected</option>
                </select>

                {/* Customer Filter */}
                <select
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  className={`w-full sm:w-44 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-slate-50 border border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="all">All Customers</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Range Filters */}
            <div className="flex items-center gap-3 flex-wrap text-xs pt-1 border-t border-slate-100 dark:border-slate-800/60">
              <span className={`text-[11px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Date Filter:
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400">From:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className={`px-2 py-1 rounded-lg text-xs font-mono focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-200 text-slate-800'
                  }`}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400">To:</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className={`px-2 py-1 rounded-lg text-xs font-mono focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-200 text-slate-800'
                  }`}
                />
              </div>
              {(dateFrom || dateTo || searchQuery || statusFilter !== 'all' || customerFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setCustomerFilter('all');
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="text-[11px] text-blue-600 hover:underline cursor-pointer font-semibold ml-auto"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* Quotations List Table */}
          <div className={`rounded-2xl border overflow-hidden ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                  isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="py-3 px-4">Quote Number</th>
                    <th className="py-3 px-4">Date & Validity</th>
                    <th className="py-3 px-4">Customer Details</th>
                    <th className="py-3 px-4 font-mono text-right">Model 1 Total</th>
                    <th className="py-3 px-4 font-mono text-right">Model 2 Total</th>
                    <th className="py-3 px-4 text-center">Selected Option</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/70' : 'divide-slate-100'}`}>
                  {filteredQuotations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-40 text-blue-500" />
                        <p className="font-semibold">No quotations found</p>
                        <p className="text-[11px] mt-0.5">Click "Create Manual Quote" to generate a two-model CCTV/IT quote</p>
                      </td>
                    </tr>
                  ) : (
                    filteredQuotations.map((q) => {
                      const isConfirmed = q.status === 'Confirmed';
                      const statusColor = 
                        q.status === 'Confirmed' ? (isDark ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200') :
                        q.status === 'Sent' ? (isDark ? 'bg-sky-950/60 text-sky-400 border-sky-800' : 'bg-sky-50 text-sky-700 border-sky-200') :
                        q.status === 'Pending Decision' ? (isDark ? 'bg-amber-950/60 text-amber-400 border-amber-800' : 'bg-amber-50 text-amber-700 border-amber-200') :
                        q.status === 'Rejected' ? (isDark ? 'bg-rose-950/60 text-rose-400 border-rose-800' : 'bg-rose-50 text-rose-700 border-rose-200') :
                        (isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200');

                      return (
                        <tr key={q.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}>
                          
                          {/* Quote Number & Version Badge */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                {q.quotationNumber}
                              </span>
                              {q.version > 1 && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                  v{q.version}
                                </span>
                              )}
                            </div>
                            {q.jobCardId && (
                              <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                                Job Ref: {q.jobCardId}
                              </span>
                            )}
                          </td>

                          {/* Date & Validity */}
                          <td className="py-3 px-4">
                            <span className="font-mono text-slate-700 dark:text-slate-300 block">{q.date}</span>
                            <span className="text-[10px] text-slate-400">
                              Valid: {q.validUntil} ({q.validityDays}d)
                            </span>
                          </td>

                          {/* Customer Name, Phone, Area */}
                          <td className="py-3 px-4">
                            <p className="font-semibold text-slate-900 dark:text-white">{q.customerName}</p>
                            <p className="text-[11px] text-slate-500 font-mono">{q.customerPhone || 'N/A'}</p>
                            {q.customerAddress && (
                              <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{q.customerAddress}</p>
                            )}
                          </td>

                          {/* Model 1 Total */}
                          <td className="py-3 px-4 text-right">
                            <span className="font-mono font-bold text-slate-900 dark:text-white block">
                              ₹{q.model1?.finalModelTotal?.toLocaleString('en-IN') || 0}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[140px] block text-right">
                              {q.model1?.name || 'Model 1'} ({q.model1?.items?.length || 0} items)
                            </span>
                          </td>

                          {/* Model 2 Total */}
                          <td className="py-3 px-4 text-right">
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 block">
                              ₹{q.model2?.finalModelTotal?.toLocaleString('en-IN') || 0}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[140px] block text-right">
                              {q.model2?.name || 'Model 2'} ({q.model2?.items?.length || 0} items)
                            </span>
                          </td>

                          {/* Selected Model */}
                          <td className="py-3 px-4 text-center">
                            {q.selectedModel === 'Model 1' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200">
                                <Check className="w-3 h-3" /> Model 1
                              </span>
                            ) : q.selectedModel === 'Model 2' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200">
                                <Check className="w-3 h-3" /> Model 2
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">
                                Not Decided
                              </span>
                            )}
                            {q.confirmationDate && (
                              <span className="text-[9px] font-mono text-slate-400 block mt-0.5">
                                Confirmed: {q.confirmationDate}
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColor}`}>
                              {q.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              
                              {/* Preview PDF */}
                              <button
                                onClick={() => setPdfPreviewQuotation(q)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isDark ? 'text-blue-400 hover:bg-slate-800' : 'text-blue-600 hover:bg-blue-50'
                                }`}
                                title="Customer PDF Preview (Prices & Internal Charges Hidden)"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* WhatsApp Share */}
                              <button
                                onClick={() => handleShareWhatsApp(q)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                title="Share quotation proposal summary on WhatsApp"
                              >
                                <Share2 className="w-4 h-4" />
                              </button>

                              {/* Edit Quotation (New Version Created on Save) */}
                              <button
                                onClick={() => handleOpenEdit(q)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                                }`}
                                title="Edit Quotation (Creates Version 2/3...)"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              {/* Duplicate */}
                              <button
                                onClick={() => {
                                  try {
                                    const dup = duplicateManualQuotation(q.id);
                                    showToast(`Duplicated to Quotation #${dup.quotationNumber}!`);
                                  } catch (e: any) {
                                    alert(e.message || 'Failed to duplicate');
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                                title="Duplicate Quotation"
                              >
                                <Copy className="w-4 h-4" />
                              </button>

                              {/* Version History */}
                              {q.history && q.history.length > 0 && (
                                <button
                                  onClick={() => setVersionHistoryQuotation(q)}
                                  className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                  title={`View Version History (${q.history.length} snapshots)`}
                                >
                                  <History className="w-4 h-4" />
                                </button>
                              )}

                              {/* Change Status / Confirm Model */}
                              <button
                                onClick={() => setStatusModalQuotation(q)}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                title="Update Status / Confirm Model Selection"
                              >
                                <Sliders className="w-4 h-4" />
                              </button>

                              {/* Delete / Archive */}
                              <button
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to archive Quotation #${q.quotationNumber}? Historical records will be safely preserved.`)) {
                                    deleteManualQuotation(q.id);
                                    showToast(`Quotation #${q.quotationNumber} archived.`);
                                  }
                                }}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                title="Archive Quotation"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>

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

        </div>
      )}

      {/* VIEW 2: PRODUCT CATALOGUE MANAGEMENT (Requirement 4 & 5) */}
      {activeTab === 'catalogue' && (
        <div className="space-y-6">
          <div className={`p-4 rounded-2xl border space-y-4 ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Independent Quotation Catalogue
                </h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Category → Subcategory → Product structure. Completely independent of Stock inventory & Billing.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDeletedProducts(prev => !prev)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                    showDeletedProducts 
                      ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200' 
                      : isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  {showDeletedProducts ? 'Hide Soft-Deleted' : 'Show Soft-Deleted'}
                </button>

                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setProdFormName('');
                    setProdFormCategory(quotationCategories[0]?.id || 'cat-dvr');
                    setProdFormSubcategory(quotationSubcategories[0]?.id || 'sub-dvr-hik');
                    setProdFormBrand('Hikvision');
                    setProdFormCustomBrand('');
                    setProdFormModel('');
                    setProdFormDesc('');
                    setProdFormWarranty('2 Years Manufacturer Warranty');
                    setProdFormPrice(1500);
                    setIsNewProductModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Catalogue Product</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={catSearch}
                  onChange={(e) => setCatSearch(e.target.value)}
                  placeholder="Search products by name, brand, model..."
                  className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <select
                  value={selectedCatFilter}
                  onChange={(e) => setSelectedCatFilter(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-slate-50 border border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="all">All 12 Categories ({quotationProducts.length})</option>
                  {quotationCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Showing {filteredProducts.length} products
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-[11px] text-blue-600 font-semibold font-mono">
                  {quotationBrands.length} Brands tracked
                </span>
              </div>
            </div>
          </div>

          {/* Product Catalogue Table */}
          <div className={`rounded-2xl border overflow-hidden ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                  isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  <tr>
                    <th className="py-3 px-4">Product Name & Model</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Brand</th>
                    <th className="py-3 px-4">Warranty</th>
                    <th className="py-3 px-4 text-center">Unit</th>
                    <th className="py-3 px-4 font-mono text-right">Latest Quotation Price (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/70' : 'divide-slate-100'}`}>
                  {filteredProducts.map(p => {
                    const catName = quotationCategories.find(c => c.id === p.categoryId)?.name || p.categoryId;
                    const isDeleted = Boolean(p.isDeleted);

                    return (
                      <tr key={p.id} className={`transition-colors ${isDeleted ? 'opacity-50 bg-rose-500/5' : ''} ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}>
                        <td className="py-3 px-4">
                          <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{p.name}</p>
                          {p.modelNumber && (
                            <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 block mt-0.5">
                              Model: {p.modelNumber}
                            </span>
                          )}
                          {p.description && (
                            <span className="text-[10px] text-slate-400 block truncate max-w-sm">
                              {p.description}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-medium text-slate-600 dark:text-slate-300">
                          {catName}
                        </td>

                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {p.brand}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {p.warranty || 'Standard Warranty'}
                        </td>

                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">
                          {p.unit || 'Nos'}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                          ₹{p.latestQuotationPrice.toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-4 text-center">
                          {isDeleted ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200">
                              Deleted
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                              Active
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isDeleted ? (
                              <button
                                onClick={() => {
                                  restoreQuotationProduct(p.id);
                                  showToast(`Restored "${p.name}" to active catalogue!`);
                                }}
                                className="px-2.5 py-1 text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1 cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Restore</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingProduct(p);
                                    setProdFormName(p.name);
                                    setProdFormCategory(p.categoryId);
                                    setProdFormSubcategory(p.subcategoryId);
                                    setProdFormBrand(p.brand);
                                    setProdFormCustomBrand('');
                                    setProdFormModel(p.modelNumber || '');
                                    setProdFormDesc(p.description || '');
                                    setProdFormWarranty(p.warranty || '2 Years Manufacturer Warranty');
                                    setProdFormPrice(p.latestQuotationPrice || 0);
                                    setIsNewProductModalOpen(true);
                                  }}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                                  title="Edit product"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Soft-delete "${p.name}"? It will be hidden from new quotations, but existing quotations are 100% safe.`)) {
                                      deleteQuotationProduct(p.id);
                                      showToast(`Soft-deleted "${p.name}"`);
                                    }
                                  }}
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                                  title="Soft-delete product"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: QUOTATION CREATION & EDIT MODAL (TWO MODELS IN ONE) */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className={`border rounded-2xl w-full max-w-5xl max-h-[94vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold">
                      {editingQuotationId ? 'Edit Manual Quotation' : 'Create New Manual Quotation'}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      {editingQuotationId ? (quotations.find(q => q.id === editingQuotationId)?.quotationNumber || 'EDIT') : getNextQuotationNumber()}
                    </span>
                    {originatingJobId && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        Linked Job #{originatingJobId}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Two independent proposal models in one document · Hidden internal calculations
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsEditorOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* 1. Customer Information & Dates */}
              <div className={`p-4 rounded-xl border space-y-4 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Customer Details & Proposal Reference
                  </span>
                  
                  {/* Select from existing CRM customers */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-semibold">Select Existing:</span>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => handleSelectCustomer(e.target.value)}
                      className={`text-xs rounded-lg px-2.5 py-1 focus:outline-none ${
                        isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-800'
                      }`}
                    >
                      <option value="">-- Choose Customer from Database --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.phone || c.area})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Karthikeyen"
                      className={`w-full rounded-lg px-3 py-1.5 text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Contact Phone *
                    </label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="e.g. 9677776001"
                      className={`w-full rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none ${
                        isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Site Location / Address
                    </label>
                    <input
                      type="text"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="e.g. Kancharampettai, Madurai"
                      className={`w-full rounded-lg px-3 py-1.5 text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Quote Date
                      </label>
                      <input
                        type="date"
                        value={quotationDate}
                        onChange={(e) => setQuotationDate(e.target.value)}
                        className={`w-full rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none ${
                          isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Validity (Days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={validityDays}
                        onChange={(e) => setValidityDays(Number(e.target.value) || 7)}
                        className={`w-full rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none ${
                          isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Model 1 vs Model 2 Workspace Navigation */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveModelTab('model1')}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                        activeModelTab === 'model1'
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-500'
                          : isDark ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>Model 1</span>
                      <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-black/30 text-white">
                        ₹{model1Calc.finalModelTotal.toLocaleString('en-IN')}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveModelTab('model2')}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                        activeModelTab === 'model2'
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25 ring-2 ring-purple-500'
                          : isDark ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>Model 2</span>
                      <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-black/30 text-white">
                        ₹{model2Calc.finalModelTotal.toLocaleString('en-IN')}
                      </span>
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyModel1ToModel2}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800 transition-colors cursor-pointer flex items-center gap-1.5"
                      title="Copy all items, prices, and internal charges from Model 1 into Model 2"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Model 1 → Model 2</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPickerTargetModel(activeModelTab);
                        setIsProductPickerOpen(true);
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Boxes className="w-3.5 h-3.5" />
                      <span>Pick from Catalogue</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddCustomRow(activeModelTab, false)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                        isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
                      }`}
                    >
                      + Custom Item
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAddCustomRow(activeModelTab, true)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                        isDark ? 'bg-slate-800 border-slate-700 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}
                      title="Add Installation & Setup row (amount hidden on customer PDF)"
                    >
                      + Installation Row
                    </button>
                  </div>
                </div>

                {/* Active Model Title */}
                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {activeModelTab === 'model1' ? 'Model 1 Package Title' : 'Model 2 Package Title'}
                  </label>
                  <input
                    type="text"
                    value={activeModelTab === 'model1' ? model1Name : model2Name}
                    onChange={(e) => {
                      if (activeModelTab === 'model1') setModel1Name(e.target.value);
                      else setModel2Name(e.target.value);
                    }}
                    placeholder="e.g. Model 1: 4CH DVR + 2MP Camera Package"
                    className={`w-full rounded-xl px-3 py-2 text-xs font-bold focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                {/* Line Items Table */}
                <div className={`rounded-xl border overflow-hidden ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-left text-xs min-w-[680px]">
                    <thead className={`border-b text-[11px] font-semibold uppercase ${
                      isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      <tr>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-2">Brand</th>
                        <th className="py-2.5 px-2">Model #</th>
                        <th className="py-2.5 px-2 text-center w-16">Qty</th>
                        <th className="py-2.5 px-2 text-center w-14">Unit</th>
                        <th className="py-2.5 px-2 text-right w-24">Unit Price (₹)</th>
                        <th className="py-2.5 px-3 text-right w-28 font-mono">Total (₹)</th>
                        <th className="py-2.5 px-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                      {(activeModelTab === 'model1' ? model1Items : model2Items).length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            No equipment items in {activeModelTab === 'model1' ? 'Model 1' : 'Model 2'} yet.
                            <br />
                            <span className="text-[11px] text-blue-500 font-semibold cursor-pointer" onClick={() => {
                              setPickerTargetModel(activeModelTab);
                              setIsProductPickerOpen(true);
                            }}>
                              + Pick from Product Catalogue
                            </span>
                          </td>
                        </tr>
                      ) : (
                        (activeModelTab === 'model1' ? model1Items : model2Items).map((it, idx) => (
                          <tr key={it.id || idx} className={isDark ? 'hover:bg-slate-900/60' : 'hover:bg-slate-50'}>
                            
                            {/* Description */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={it.description}
                                onChange={(e) => handleUpdateItem(activeModelTab, idx, 'description', e.target.value)}
                                className={`w-full rounded px-2 py-1 text-xs focus:outline-none ${
                                  isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                                }`}
                              />
                            </td>

                            {/* Brand (Custom entry allowed) */}
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={it.brand || ''}
                                onChange={(e) => handleUpdateItem(activeModelTab, idx, 'brand', e.target.value)}
                                list="brandList"
                                placeholder="Brand"
                                className={`w-24 rounded px-2 py-1 text-xs focus:outline-none ${
                                  isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                                }`}
                              />
                            </td>

                            {/* Model Number */}
                            <td className="py-2 px-2">
                              <input
                                type="text"
                                value={it.modelNumber || ''}
                                onChange={(e) => handleUpdateItem(activeModelTab, idx, 'modelNumber', e.target.value)}
                                placeholder="Model #"
                                className={`w-24 rounded px-2 py-1 text-xs font-mono focus:outline-none ${
                                  isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                                }`}
                              />
                            </td>

                            {/* Quantity */}
                            <td className="py-2 px-2 text-center">
                              <input
                                type="number"
                                min="1"
                                value={it.quantity}
                                onChange={(e) => handleUpdateItem(activeModelTab, idx, 'quantity', e.target.value)}
                                className={`w-14 rounded px-1.5 py-1 text-xs font-mono text-center focus:outline-none ${
                                  isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                                }`}
                              />
                            </td>

                            {/* Unit (Nos only) */}
                            <td className="py-2 px-2 text-center font-mono text-slate-400 font-semibold">
                              Nos
                            </td>

                            {/* Unit Price (Manual Entry, remembered into catalogue) */}
                            <td className="py-2 px-2 text-right">
                              <input
                                type="number"
                                min="0"
                                value={it.unitPrice}
                                onChange={(e) => handleUpdateItem(activeModelTab, idx, 'unitPrice', e.target.value)}
                                className={`w-24 rounded px-2 py-1 text-xs font-mono font-bold text-right focus:outline-none ${
                                  isDark ? 'bg-slate-900 border border-slate-700 text-emerald-400' : 'bg-white border border-slate-300 text-emerald-700'
                                }`}
                              />
                            </td>

                            {/* Item Total (Qty * Unit Price) */}
                            <td className="py-2 px-3 text-right font-mono font-black text-slate-800 dark:text-slate-100">
                              ₹{it.itemTotal.toLocaleString('en-IN')}
                            </td>

                            {/* Remove Row */}
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(activeModelTab, idx)}
                                className="p-1 text-rose-400 hover:text-rose-600 cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>

                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

                {/* 3. Internal Calculation Section (Requirement 8 - INTERNAL CRM ONLY) */}
                <div className={`p-4 rounded-xl border space-y-4 ${
                  isDark ? 'bg-amber-950/20 border-amber-800/40' : 'bg-amber-50/60 border-amber-200'
                }`}>
                  <div className="flex items-center justify-between border-b pb-2 border-amber-200 dark:border-amber-900/40">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-amber-600" />
                        Internal CRM Calculation & Margin Section ({activeModelTab === 'model1' ? 'Model 1' : 'Model 2'})
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                        HIDDEN FROM CUSTOMER PDF
                      </span>
                    </div>

                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                      Total Item Rate: ₹{(activeModelTab === 'model1' ? model1Calc.totalItemRate : model2Calc.totalItemRate).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                    
                    {/* 1. Installation */}
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        1. Installation (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={activeModelTab === 'model1' ? model1Charges.installation : model2Charges.installation}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          if (activeModelTab === 'model1') setModel1Charges(prev => ({ ...prev, installation: val }));
                          else setModel2Charges(prev => ({ ...prev, installation: val }));
                        }}
                        className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none ${
                          isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    {/* 2. Helper Fees */}
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        2. Helper Fees (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={activeModelTab === 'model1' ? model1Charges.helperFees : model2Charges.helperFees}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          if (activeModelTab === 'model1') setModel1Charges(prev => ({ ...prev, helperFees: val }));
                          else setModel2Charges(prev => ({ ...prev, helperFees: val }));
                        }}
                        className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none ${
                          isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    {/* 3. Commission */}
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        3. Commission (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={activeModelTab === 'model1' ? model1Charges.commission : model2Charges.commission}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          if (activeModelTab === 'model1') setModel1Charges(prev => ({ ...prev, commission: val }));
                          else setModel2Charges(prev => ({ ...prev, commission: val }));
                        }}
                        className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none ${
                          isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    {/* 4. Margin */}
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        4. Margin (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={activeModelTab === 'model1' ? model1Charges.margin : model2Charges.margin}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          if (activeModelTab === 'model1') setModel1Charges(prev => ({ ...prev, margin: val }));
                          else setModel2Charges(prev => ({ ...prev, margin: val }));
                        }}
                        className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none ${
                          isDark ? 'bg-slate-900 border border-slate-700 text-emerald-400' : 'bg-white border border-slate-300 text-emerald-700'
                        }`}
                      />
                    </div>

                    {/* 5. Petrol Visit */}
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        5. Petrol Visit (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={activeModelTab === 'model1' ? model1Charges.petrolVisit : model2Charges.petrolVisit}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          if (activeModelTab === 'model1') setModel1Charges(prev => ({ ...prev, petrolVisit: val }));
                          else setModel2Charges(prev => ({ ...prev, petrolVisit: val }));
                        }}
                        className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none ${
                          isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    {/* 6. Customer Reduction (Negotiation) */}
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 text-rose-600 dark:text-rose-400`}>
                        6. Customer Reduction (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={activeModelTab === 'model1' ? model1Charges.customerReduction : model2Charges.customerReduction}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          if (activeModelTab === 'model1') setModel1Charges(prev => ({ ...prev, customerReduction: val }));
                          else setModel2Charges(prev => ({ ...prev, customerReduction: val }));
                        }}
                        placeholder="Negotiation discount"
                        className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none ${
                          isDark ? 'bg-slate-900 border border-rose-800 text-rose-400' : 'bg-white border border-rose-300 text-rose-700'
                        }`}
                      />
                    </div>

                  </div>

                  {/* Model Financial Summary Banner */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 text-xs border-t border-amber-200 dark:border-amber-900/40">
                    <div>
                      <span className="text-slate-500 text-[11px]">Total Item Rate:</span>
                      <p className="font-mono font-bold text-sm">
                        ₹{(activeModelTab === 'model1' ? model1Calc.totalItemRate : model2Calc.totalItemRate).toLocaleString('en-IN')}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[11px]">Margin & Internal Charges:</span>
                      <p className="font-mono font-bold text-sm text-amber-700 dark:text-amber-400">
                        +₹{(activeModelTab === 'model1' ? model1Calc.internalSum : model2Calc.internalSum).toLocaleString('en-IN')}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[11px]">Customer Reduction:</span>
                      <p className="font-mono font-bold text-sm text-rose-600">
                        -₹{(activeModelTab === 'model1' ? model1Charges.customerReduction : model2Charges.customerReduction).toLocaleString('en-IN')}
                      </p>
                    </div>

                    <div className="bg-emerald-600 text-white p-2.5 rounded-xl text-right">
                      <span className="text-[10px] uppercase font-bold text-emerald-100 tracking-wider block">
                        Final Model Total (Customer Price)
                      </span>
                      <span className="text-lg font-black font-mono block">
                        ₹{(activeModelTab === 'model1' ? model1Calc.finalModelTotal : model2Calc.finalModelTotal).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Optional Payment, Notes & Terms */}
              <div className={`p-4 rounded-xl border space-y-4 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-500" /> Optional Terms, Notes & Advance Payment
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Payment Terms & Advance Note
                    </label>
                    <input
                      type="text"
                      value={paymentDetails}
                      onChange={(e) => setPaymentDetails(e.target.value)}
                      placeholder="e.g. 50% advance with work order, 50% on completion & demo"
                      className={`w-full rounded-lg px-3 py-1.5 text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Advance Amount (₹) (Optional)
                    </label>
                    <input
                      type="number"
                      value={advanceAmount !== undefined ? advanceAmount : ''}
                      onChange={(e) => setAdvanceAmount(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="e.g. 10000"
                      className={`w-full rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none ${
                        isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Customer Site Notes (Shown on PDF if filled)
                    </label>
                    <textarea
                      rows={2}
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      placeholder="e.g. Cable routing through rear false ceiling. Customer requested 2TB storage backup."
                      className={`w-full rounded-lg p-2.5 text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Quotation Terms & Conditions (Editable per quotation)
                    </label>
                    <textarea
                      rows={2}
                      value={termsAndConditions}
                      onChange={(e) => setTermsAndConditions(e.target.value)}
                      placeholder="Terms and conditions..."
                      className={`w-full rounded-lg p-2.5 text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className={`px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-400">Model 1 Total:</span>{' '}
                  <strong className="text-slate-900 dark:text-white">₹{model1Calc.finalModelTotal.toLocaleString('en-IN')}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Model 2 Total:</span>{' '}
                  <strong className="text-purple-600 dark:text-purple-400">₹{model2Calc.finalModelTotal.toLocaleString('en-IN')}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer ${
                    isDark ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveQuotation('Draft', false)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer border ${
                    isDark ? 'bg-slate-800 border-slate-700 text-blue-300 hover:bg-slate-700' : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  Save as Draft
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveQuotation('Sent', true)}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-md shadow-blue-600/25 cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Save & Preview Customer PDF</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* DRAWER: PRODUCT CATALOGUE PICKER */}
      {isProductPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className={`border rounded-2xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-base font-bold">
                    Select Equipment from Catalogue
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Adding to: <strong className="text-blue-600">{pickerTargetModel === 'model1' ? model1Name : model2Name}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsProductPickerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b space-y-3 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Search product by name, brand, model..."
                    className={`w-full rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none ${
                      isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <select
                    value={pickerCategory}
                    onChange={(e) => setPickerCategory(e.target.value)}
                    className={`w-full rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none ${
                      isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="all">All Categories</option>
                    {quotationCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1 max-h-[60vh]">
              {quotationProducts
                .filter(p => !p.isDeleted)
                .filter(p => pickerCategory === 'all' || p.categoryId === pickerCategory)
                .filter(p => {
                  if (!pickerSearch.trim()) return true;
                  const s = pickerSearch.toLowerCase();
                  return (
                    p.name.toLowerCase().includes(s) ||
                    p.brand.toLowerCase().includes(s) ||
                    (p.modelNumber && p.modelNumber.toLowerCase().includes(s))
                  );
                })
                .map(prod => (
                  <div
                    key={prod.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                      isDark ? 'bg-slate-950/60 border-slate-800 hover:border-blue-500' : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-xs truncate">{prod.name}</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          {prod.brand}
                        </span>
                        {prod.modelNumber && (
                          <span className="text-[10px] font-mono text-slate-400">
                            {prod.modelNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{prod.description || 'Standard equipment'}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-black text-emerald-600 block">
                        ₹{prod.latestQuotationPrice.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-slate-400">Latest Quote Price</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectProductFromCatalogue(prod)}
                      className="px-3 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer shrink-0 shadow-xs"
                    >
                      + Add
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CUSTOMER PDF PREVIEW & PRINT (Requirement 9 & 14 - NO INTERNAL CHARGES/PRICES) */}
      {pdfPreviewQuotation && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 border rounded-2xl w-full max-w-4xl max-h-[96vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Action Bar */}
            <div className="px-6 py-3 border-b flex items-center justify-between shrink-0 bg-slate-100 text-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="font-bold text-xs uppercase tracking-wider">
                  Customer PDF Preview: {pdfPreviewQuotation.quotationNumber}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Individual Prices &amp; Internal Margins Hidden
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleShareWhatsApp(pdfPreviewQuotation)}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share on WhatsApp</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print A4 / Save PDF</span>
                </button>

                <button
                  onClick={() => setPdfPreviewQuotation(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* A4 Paper Viewport with Fixed Letterhead Background */}
            <div className="p-2 sm:p-6 lg:p-8 overflow-y-auto overflow-x-auto flex-1 bg-slate-200/60 flex justify-start sm:justify-center print:p-0 print:bg-white" id="customerPdfContainer">
              
              {/* Single A4 Sheet Container */}
              <div 
                className="relative bg-white shadow-2xl rounded-sm w-full max-w-[794px] min-h-[1123px] text-slate-900 font-sans print:shadow-none print:w-full print:max-w-none overflow-hidden flex flex-col justify-between"
                style={{
                  backgroundImage: `url('${adminSettings.quotationBackgroundUrl || DEFAULT_SGS_QUOTATION_LETTERHEAD_BG}')`,
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                }}
              >
                {/* Content Area with top padding below letterhead header and bottom padding above letterhead footer */}
                <div className="pt-40 pb-24 px-10 space-y-6 flex-1 flex flex-col">
                  
                  {/* Proposal Document Header Banner */}
                  <div className="flex items-center justify-between border-b pb-3 border-slate-300">
                    <div>
                      <div className="inline-block px-3 py-1 text-xs font-black uppercase tracking-wider rounded bg-blue-900 text-white shadow-xs">
                        OFFICIAL COMMERCIAL PROPOSAL / QUOTATION
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-1">
                        CCTV Security &amp; Surveillance Systems Specification
                      </p>
                    </div>

                    <div className="text-right text-xs">
                      <p className="font-bold text-slate-800">
                        Quotation No: <span className="font-mono text-blue-700 font-black">{pdfPreviewQuotation.quotationNumber}</span>
                      </p>
                      <p className="text-slate-600 font-mono text-[11px]">
                        Date: {pdfPreviewQuotation.date}
                      </p>
                      <p className="text-[11px] font-bold text-emerald-700">
                        Validity: {pdfPreviewQuotation.validityDays || 7} Days (Until {pdfPreviewQuotation.validUntil})
                      </p>
                    </div>
                  </div>

                  {/* Customer Information Box */}
                  <div className="p-3.5 rounded-lg bg-slate-50/90 border border-slate-200 grid grid-cols-2 gap-3 text-xs leading-snug">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Proposal Submitted To:</span>
                      <p className="font-black text-sm text-slate-900 mt-0.5">{pdfPreviewQuotation.customerName}</p>
                      {pdfPreviewQuotation.customerAddress && (
                        <p className="text-slate-600 mt-0.5">{pdfPreviewQuotation.customerAddress}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Contact Phone:</span>
                      <p className="font-mono font-bold text-slate-800 mt-0.5">{pdfPreviewQuotation.customerPhone || 'N/A'}</p>
                      {pdfPreviewQuotation.jobCardId && (
                        <p className="text-[10px] font-mono text-blue-600">Reference Job Card #{pdfPreviewQuotation.jobCardId}</p>
                      )}
                    </div>
                  </div>

                  {/* Comparative Two-Model Table */}
                  <div className="space-y-4 flex-1">
                    
                    {/* Model 1 Section */}
                    <div className="border border-slate-300 rounded-lg overflow-hidden bg-white/95 shadow-2xs">
                      <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider">
                          OPTION 1: {pdfPreviewQuotation.model1.name}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-600 text-white">
                          Proposed Configuration
                        </span>
                      </div>

                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-700">
                          <tr>
                            <th className="py-2 px-3 w-10 text-center">#</th>
                            <th className="py-2 px-3">Equipment / Service Description</th>
                            <th className="py-2 px-3 text-center w-24">Qty / Unit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {pdfPreviewQuotation.model1.items.map((it, idx) => (
                            <tr key={idx}>
                              <td className="py-2 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                              <td className="py-2 px-3 font-semibold text-slate-800">
                                {it.description}
                                {it.warranty && (
                                  <span className="text-[10px] font-normal text-slate-500 block">
                                    Warranty: {it.warranty}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center font-mono font-bold text-slate-700">
                                {String(it.quantity).padStart(2, '0')} {it.unit || 'Nos'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Model 1 Total Amount (Hides all individual prices & internal calculations!) */}
                      <div className="bg-blue-50/90 border-t border-blue-200 px-4 py-2.5 flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-blue-900">
                          {pdfPreviewQuotation.model1.name} — Total Proposal Amount:
                        </span>
                        <span className="text-base font-black font-mono text-blue-900">
                          ₹{pdfPreviewQuotation.model1.finalModelTotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Model 2 Section */}
                    <div className="border border-slate-300 rounded-lg overflow-hidden bg-white/95 shadow-2xs">
                      <div className="bg-purple-950 text-white px-4 py-2 flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider">
                          OPTION 2: {pdfPreviewQuotation.model2.name}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-600 text-white">
                          Alternative High-Performance Configuration
                        </span>
                      </div>

                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-700">
                          <tr>
                            <th className="py-2 px-3 w-10 text-center">#</th>
                            <th className="py-2 px-3">Equipment / Service Description</th>
                            <th className="py-2 px-3 text-center w-24">Qty / Unit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {pdfPreviewQuotation.model2.items.map((it, idx) => (
                            <tr key={idx}>
                              <td className="py-2 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                              <td className="py-2 px-3 font-semibold text-slate-800">
                                {it.description}
                                {it.warranty && (
                                  <span className="text-[10px] font-normal text-slate-500 block">
                                    Warranty: {it.warranty}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center font-mono font-bold text-slate-700">
                                {String(it.quantity).padStart(2, '0')} {it.unit || 'Nos'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Model 2 Total Amount */}
                      <div className="bg-purple-50/90 border-t border-purple-200 px-4 py-2.5 flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-purple-950">
                          {pdfPreviewQuotation.model2.name} — Total Proposal Amount:
                        </span>
                        <span className="text-base font-black font-mono text-purple-900">
                          ₹{pdfPreviewQuotation.model2.finalModelTotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Payment Terms & Advance Note (Only if filled) */}
                  {(pdfPreviewQuotation.paymentDetails || pdfPreviewQuotation.advanceAmount) && (
                    <div className="p-3 rounded-lg bg-slate-50/95 border border-slate-200 text-xs space-y-1">
                      <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block">Payment Terms:</span>
                      {pdfPreviewQuotation.paymentDetails && (
                        <p className="text-slate-700">{pdfPreviewQuotation.paymentDetails}</p>
                      )}
                      {pdfPreviewQuotation.advanceAmount && (
                        <p className="font-mono text-blue-800 font-bold">
                          Required Advance Commitment: ₹{pdfPreviewQuotation.advanceAmount.toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Customer / Site Notes (Only if filled) */}
                  {pdfPreviewQuotation.customerNotes && (
                    <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100 text-xs space-y-0.5">
                      <span className="font-bold text-blue-900 text-[10px] uppercase tracking-wider block">Scope &amp; Site Notes:</span>
                      <p className="text-slate-700 whitespace-pre-line leading-relaxed">{pdfPreviewQuotation.customerNotes}</p>
                    </div>
                  )}

                  {/* Terms & Conditions */}
                  <div className="text-[10px] text-slate-600 space-y-1 border-t pt-3">
                    <span className="font-bold text-slate-800 uppercase tracking-wider block">Terms &amp; Conditions:</span>
                    <p className="whitespace-pre-line leading-relaxed font-sans text-slate-600">
                      {pdfPreviewQuotation.termsAndConditions || adminSettings.quotationTerms || adminSettings.termsAndConditions}
                    </p>
                  </div>

                  {/* Authorized Signatory Signature Area */}
                  <div className="pt-4 flex items-end justify-between border-t border-slate-200">
                    <div className="text-[10px] text-slate-500">
                      <p>Accepted By Customer (Signature &amp; Date):</p>
                      <div className="h-10 w-48 border-b border-dashed border-slate-400 mt-2" />
                    </div>

                    <div className="text-right text-[10px] text-slate-700">
                      <p className="font-bold text-slate-800">For SPIDER GRID SOLUTIONS</p>
                      <div className="h-10 flex items-center justify-end">
                        <span className="italic text-slate-400 font-serif">Authorized Signatory</span>
                      </div>
                      <p className="text-[9px] text-slate-500">Madurai Center · Official Quotation</p>
                    </div>
                  </div>

                </div>

                {/* Decorative Bottom Bar */}
                <div className="h-3 w-full bg-blue-950 shrink-0" />
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: VERSION HISTORY MODAL (Requirement 16) */}
      {versionHistoryQuotation && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="text-base font-bold">
                    Quotation Version History (#{versionHistoryQuotation.quotationNumber})
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Current Active Version: v{versionHistoryQuotation.version} · All prior version snapshots are immutable
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVersionHistoryQuotation(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              
              {/* Current Version */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 dark:border-blue-900/60 dark:bg-blue-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-blue-700 dark:text-blue-300">
                      Version {versionHistoryQuotation.version} (Current Active)
                    </span>
                    <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-blue-600 text-white">
                      Live
                    </span>
                  </div>
                  <span className="font-mono text-xs text-slate-400">
                    {versionHistoryQuotation.updatedAt?.split('T')[0] || versionHistoryQuotation.date}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div>
                    <span className="text-slate-400">Model 1:</span>{' '}
                    <strong>₹{versionHistoryQuotation.model1.finalModelTotal.toLocaleString('en-IN')}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Model 2:</span>{' '}
                    <strong>₹{versionHistoryQuotation.model2.finalModelTotal.toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setPdfPreviewQuotation(versionHistoryQuotation);
                    setVersionHistoryQuotation(null);
                  }}
                  className="px-3 py-1 text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer pt-1"
                >
                  <Eye className="w-3.5 h-3.5" /> Preview PDF for Current Version
                </button>
              </div>

              {/* Historical Snapshots */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Prior Saved Version Snapshots ({versionHistoryQuotation.history.length})
                </span>

                {versionHistoryQuotation.history.map((snap, sIdx) => (
                  <div
                    key={sIdx}
                    className={`p-4 rounded-xl border space-y-2 transition-colors ${
                      isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-purple-600 dark:text-purple-400">
                          Version {snap.version}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {snap.notes || 'Archived Snapshot'}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-slate-400">
                        {snap.updatedAt?.split('T')[0]}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div>
                        <span className="text-slate-400">Model 1:</span>{' '}
                        <strong>₹{snap.model1?.finalModelTotal?.toLocaleString('en-IN') || 0}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Model 2:</span>{' '}
                        <strong>₹{snap.model2?.finalModelTotal?.toLocaleString('en-IN') || 0}</strong>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const historicalQuote: ManualQuotation = {
                          ...versionHistoryQuotation,
                          version: snap.version,
                          date: snap.updatedAt.split('T')[0],
                          validityDays: snap.validityDays,
                          validUntil: snap.validUntil,
                          model1: snap.model1,
                          model2: snap.model2,
                          termsAndConditions: snap.termsAndConditions,
                          paymentDetails: snap.paymentDetails,
                          advanceAmount: snap.advanceAmount,
                          customerNotes: snap.customerNotes,
                          installationNotes: snap.installationNotes,
                        };
                        setPdfPreviewQuotation(historicalQuote);
                        setVersionHistoryQuotation(null);
                      }}
                      className="px-3 py-1 text-xs font-bold text-purple-600 hover:underline flex items-center gap-1 cursor-pointer pt-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Preview PDF for Version {snap.version} Snapshot
                    </button>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: STATUS & MODEL CONFIRMATION MODAL (Requirement 15) */}
      {statusModalQuotation && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm">
                  Update Quotation Status
                </h3>
              </div>
              <button onClick={() => setStatusModalQuotation(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Quotation: <strong className="font-mono text-blue-600">{statusModalQuotation.quotationNumber}</strong> ({statusModalQuotation.customerName})
            </p>

            {/* Status Selector */}
            <div>
              <label className="block text-xs font-semibold mb-1">Quotation Status</label>
              <select
                defaultValue={statusModalQuotation.status}
                id="qStatusSelect"
                className={`w-full rounded-xl px-3 py-2 text-xs font-bold focus:outline-none ${
                  isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'
                }`}
              >
                <option value="Draft">Draft</option>
                <option value="Sent">Sent to Customer</option>
                <option value="Pending Decision">Pending Decision</option>
                <option value="Confirmed">Confirmed by Customer</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            {/* Model Selection (Requirement 15: Not Decided, Model 1, Model 2) */}
            <div>
              <label className="block text-xs font-semibold mb-1">Customer Selected Option</label>
              <select
                defaultValue={statusModalQuotation.selectedModel}
                id="qModelSelect"
                className={`w-full rounded-xl px-3 py-2 text-xs font-bold focus:outline-none ${
                  isDark ? 'bg-slate-950 border border-slate-800 text-blue-400' : 'bg-slate-50 border border-slate-300 text-blue-800'
                }`}
              >
                <option value="Not Decided">Not Decided (Evaluating Both Options)</option>
                <option value="Model 1">Model 1: {statusModalQuotation.model1.name} (₹{statusModalQuotation.model1.finalModelTotal.toLocaleString('en-IN')})</option>
                <option value="Model 2">Model 2: {statusModalQuotation.model2.name} (₹{statusModalQuotation.model2.finalModelTotal.toLocaleString('en-IN')})</option>
              </select>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              When confirmed, both model details remain fully available for reference and records.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setStatusModalQuotation(null)}
                className={`px-3 py-1.5 text-xs rounded-xl ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const statusEl = document.getElementById('qStatusSelect') as HTMLSelectElement;
                  const modelEl = document.getElementById('qModelSelect') as HTMLSelectElement;
                  const newStatus = statusEl.value as QuotationStatus;
                  const newModel = modelEl.value as CustomerModelSelection;

                  updateQuotationStatus(statusModalQuotation.id, newStatus, newModel);
                  showToast(`Quotation #${statusModalQuotation.quotationNumber} updated to ${newStatus}`);
                  setStatusModalQuotation(null);
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: ADD / EDIT CATALOGUE PRODUCT MODAL */}
      {isNewProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-sm">
                {editingProduct ? 'Edit Catalogue Product' : 'Add New Catalogue Product'}
              </h3>
              <button onClick={() => setIsNewProductModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!prodFormName.trim()) return;
                const chosenBrand = (prodFormBrand === 'custom' ? prodFormCustomBrand.trim() : prodFormBrand.trim()) || 'Hikvision';

                if (editingProduct) {
                  updateQuotationProduct(editingProduct.id, {
                    name: prodFormName.trim(),
                    categoryId: prodFormCategory,
                    subcategoryId: prodFormSubcategory,
                    brand: chosenBrand,
                    modelNumber: prodFormModel.trim() || undefined,
                    description: prodFormDesc.trim() || undefined,
                    warranty: prodFormWarranty.trim() || undefined,
                    unit: 'Nos',
                    latestQuotationPrice: Number(prodFormPrice) || 0,
                  });
                  showToast(`Updated "${prodFormName}" in catalogue`);
                } else {
                  addQuotationProduct({
                    name: prodFormName.trim(),
                    categoryId: prodFormCategory || quotationCategories[0]?.id || 'cat-dvr',
                    subcategoryId: prodFormSubcategory || quotationSubcategories[0]?.id || 'sub-dvr-hik',
                    brand: chosenBrand,
                    modelNumber: prodFormModel.trim() || undefined,
                    description: prodFormDesc.trim() || undefined,
                    warranty: prodFormWarranty.trim() || undefined,
                    unit: 'Nos',
                    latestQuotationPrice: Number(prodFormPrice) || 0,
                  });
                  showToast(`Added "${prodFormName}" to catalogue`);
                }
                setIsNewProductModalOpen(false);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-semibold mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={prodFormName}
                  onChange={(e) => setProdFormName(e.target.value)}
                  placeholder="e.g. 4CH Hikvision 2MP HD DVR"
                  className={`w-full rounded-lg px-3 py-1.5 focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Category *</label>
                  <select
                    value={prodFormCategory}
                    onChange={(e) => setProdFormCategory(e.target.value)}
                    className={`w-full rounded-lg px-2.5 py-1.5 focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'
                    }`}
                  >
                    {quotationCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Brand *</label>
                  <div className="space-y-1">
                    <select
                      value={prodFormBrand}
                      onChange={(e) => setProdFormBrand(e.target.value)}
                      className={`w-full rounded-lg px-2.5 py-1.5 focus:outline-none ${
                        isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'
                      }`}
                    >
                      {quotationBrands.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                      <option value="custom">+ Enter Any Custom Brand</option>
                    </select>

                    {prodFormBrand === 'custom' && (
                      <input
                        type="text"
                        required
                        value={prodFormCustomBrand}
                        onChange={(e) => setProdFormCustomBrand(e.target.value)}
                        placeholder="Type new brand name..."
                        className={`w-full rounded-lg px-2.5 py-1 focus:outline-none ${
                          isDark ? 'bg-slate-950 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                        }`}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Model Number (Optional)</label>
                  <input
                    type="text"
                    value={prodFormModel}
                    onChange={(e) => setProdFormModel(e.target.value)}
                    placeholder="e.g. DS-7104HGHI-K1"
                    className={`w-full rounded-lg px-3 py-1.5 font-mono focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Latest Quotation Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={prodFormPrice}
                    onChange={(e) => setProdFormPrice(Number(e.target.value) || 0)}
                    className={`w-full rounded-lg px-3 py-1.5 font-mono font-bold focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-emerald-400' : 'bg-slate-50 border border-slate-300 text-emerald-700'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Warranty Details</label>
                <input
                  type="text"
                  value={prodFormWarranty}
                  onChange={(e) => setProdFormWarranty(e.target.value)}
                  placeholder="e.g. 2 Years Official Manufacturer Warranty"
                  className={`w-full rounded-lg px-3 py-1.5 focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Technical Description</label>
                <textarea
                  rows={2}
                  value={prodFormDesc}
                  onChange={(e) => setProdFormDesc(e.target.value)}
                  placeholder="Specification details..."
                  className={`w-full rounded-lg p-2.5 focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsNewProductModalOpen(false)}
                  className={`px-3 py-1.5 rounded-xl ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer"
                >
                  {editingProduct ? 'Save Product' : 'Add to Catalogue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Datalist for Brand custom entry */}
      <datalist id="brandList">
        {quotationBrands.map(b => (
          <option key={b} value={b} />
        ))}
      </datalist>

    </div>
  );
};
