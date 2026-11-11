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
  Info,
  Upload,
  Image as ImageIcon
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
    jobCards,
    adminSettings,
    updateAdminSettings,
    theme,
    canDelete,
    isAdmin,
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
  
  // Manual Quotation Title / Subject
  const [quotationTitle, setQuotationTitle] = useState('');

  // Active Models Count (1 to 5, defaults to 1 as requested)
  const [activeModelsCount, setActiveModelsCount] = useState<number>(1);
  type ModelKey = 'model1' | 'model2' | 'model3' | 'model4' | 'model5';
  const [activeModelTab, setActiveModelTab] = useState<ModelKey>('model1');

  // Custom Header & Footer Image State for Quotation (read from adminSettings)
  const [quotationHeaderImg, setQuotationHeaderImg] = useState<string>('');
  const [quotationFooterImg, setQuotationFooterImg] = useState<string>('');

  // Enhanced "Select Existing" States
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectExistingTab, setSelectExistingTab] = useState<'customer' | 'job' | 'quotation'>('customer');
  const [selectedJobIdToLoad, setSelectedJobIdToLoad] = useState('');
  const [selectedQtnIdToCopy, setSelectedQtnIdToCopy] = useState('');

  // Default empty internal charges
  const defaultCharges = (): QuotationModelInternalCharges => ({
    installation: 0,
    helperFees: 0,
    commission: 0,
    margin: 0,
    petrolVisit: 0,
    customerReduction: 0,
  });

  // Model 1 State (Clean default: starts with Model 1 only, no prefilled packages)
  const [model1Name, setModel1Name] = useState('Model 1');
  const [model1Items, setModel1Items] = useState<QuotationItem[]>([]);
  const [model1Charges, setModel1Charges] = useState<QuotationModelInternalCharges>(defaultCharges());

  // Model 2 State
  const [model2Name, setModel2Name] = useState('Model 2');
  const [model2Items, setModel2Items] = useState<QuotationItem[]>([]);
  const [model2Charges, setModel2Charges] = useState<QuotationModelInternalCharges>(defaultCharges());

  // Model 3 State
  const [model3Name, setModel3Name] = useState('Model 3');
  const [model3Items, setModel3Items] = useState<QuotationItem[]>([]);
  const [model3Charges, setModel3Charges] = useState<QuotationModelInternalCharges>(defaultCharges());

  // Model 4 State
  const [model4Name, setModel4Name] = useState('Model 4');
  const [model4Items, setModel4Items] = useState<QuotationItem[]>([]);
  const [model4Charges, setModel4Charges] = useState<QuotationModelInternalCharges>(defaultCharges());

  // Model 5 State
  const [model5Name, setModel5Name] = useState('Model 5');
  const [model5Items, setModel5Items] = useState<QuotationItem[]>([]);
  const [model5Charges, setModel5Charges] = useState<QuotationModelInternalCharges>(defaultCharges());

  // Product Picker Drawer
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [pickerTargetModel, setPickerTargetModel] = useState<ModelKey>('model1');
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
    setOriginatingJobId(job.jobId || job.id);
    setCustomerName(job.customerName || '');
    setCustomerPhone(job.customerPhone || '');
    setCustomerAddress(job.customerArea || '');
    setQuotationTitle(`Proposal for Job #${job.jobId || job.id} (${job.deviceBrand || job.category})`);
    
    // Check if matched customer in database
    const matched = customers.find(c => 
      c.id === job.customerId || 
      (c.phone && job.customerPhone && c.phone.replace(/\D/g, '') === job.customerPhone.replace(/\D/g, ''))
    );
    if (matched) {
      setSelectedCustomerId(matched.id);
      if (!job.customerArea && matched.area) setCustomerAddress(matched.area);
      if ((matched as any).email) setCustomerEmail((matched as any).email);
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
    setQuotationTitle('');
    setOriginatingJobId(undefined);
    setQuotationDate(new Date().toISOString().split('T')[0]);
    setValidityDays(7);
    setTermsAndConditions(adminSettings.quotationTerms || adminSettings.termsAndConditions || '');
    setPaymentDetails('');
    setAdvanceAmount(undefined);
    setCustomerNotes('');
    setInstallationNotes('');
    
    // Default to Model 1 only
    setActiveModelsCount(1);
    setActiveModelTab('model1');
    setQuotationHeaderImg(adminSettings.quotationHeaderImageUrl || '');
    setQuotationFooterImg(adminSettings.quotationFooterImageUrl || '');
    setCustomerSearchQuery('');
    setSelectedJobIdToLoad('');
    setSelectedQtnIdToCopy('');

    setModel1Name('Model 1');
    setModel1Items([]);
    setModel1Charges(defaultCharges());

    setModel2Name('Model 2');
    setModel2Items([]);
    setModel2Charges(defaultCharges());

    setModel3Name('Model 3');
    setModel3Items([]);
    setModel3Charges(defaultCharges());

    setModel4Name('Model 4');
    setModel4Items([]);
    setModel4Charges(defaultCharges());

    setModel5Name('Model 5');
    setModel5Items([]);
    setModel5Charges(defaultCharges());
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
    setQuotationTitle(qtn.title || '');
    setOriginatingJobId(qtn.jobCardId);
    setQuotationDate(qtn.date || new Date().toISOString().split('T')[0]);
    setValidityDays(qtn.validityDays || 7);
    setTermsAndConditions(qtn.termsAndConditions || adminSettings.quotationTerms || '');
    setPaymentDetails(qtn.paymentDetails || '');
    setAdvanceAmount(qtn.advanceAmount);
    setCustomerNotes(qtn.customerNotes || '');
    setInstallationNotes(qtn.installationNotes || '');
    setActiveModelsCount(qtn.activeModelsCount || (qtn.model2?.items?.length ? 2 : 1));
    setActiveModelTab('model1');
    setQuotationHeaderImg(qtn.headerImageUrl || adminSettings.quotationHeaderImageUrl || '');
    setQuotationFooterImg(qtn.footerImageUrl || adminSettings.quotationFooterImageUrl || '');
    setCustomerSearchQuery('');
    setSelectedJobIdToLoad('');
    setSelectedQtnIdToCopy('');

    setModel1Name(qtn.model1?.name || 'Model 1');
    setModel1Items(JSON.parse(JSON.stringify(qtn.model1?.items || [])));
    setModel1Charges({ ...defaultCharges(), ...(qtn.model1?.internalCharges || {}) });

    if (qtn.model2) {
      setModel2Name(qtn.model2.name || 'Model 2');
      setModel2Items(JSON.parse(JSON.stringify(qtn.model2.items || [])));
      setModel2Charges({ ...defaultCharges(), ...(qtn.model2.internalCharges || {}) });
    }
    if (qtn.model3) {
      setModel3Name(qtn.model3.name || 'Model 3');
      setModel3Items(JSON.parse(JSON.stringify(qtn.model3.items || [])));
      setModel3Charges({ ...defaultCharges(), ...(qtn.model3.internalCharges || {}) });
    }
    if (qtn.model4) {
      setModel4Name(qtn.model4.name || 'Model 4');
      setModel4Items(JSON.parse(JSON.stringify(qtn.model4.items || [])));
      setModel4Charges({ ...defaultCharges(), ...(qtn.model4.internalCharges || {}) });
    }
    if (qtn.model5) {
      setModel5Name(qtn.model5.name || 'Model 5');
      setModel5Items(JSON.parse(JSON.stringify(qtn.model5.items || [])));
      setModel5Charges({ ...defaultCharges(), ...(qtn.model5.internalCharges || {}) });
    }

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
  const model3Calc = useMemo(() => calculateModelSummary(model3Items, model3Charges), [model3Items, model3Charges]);
  const model4Calc = useMemo(() => calculateModelSummary(model4Items, model4Charges), [model4Items, model4Charges]);
  const model5Calc = useMemo(() => calculateModelSummary(model5Items, model5Charges), [model5Items, model5Charges]);

  // Model accessor helper
  const getModelData = (key: ModelKey) => {
    switch (key) {
      case 'model1': return { name: model1Name, items: model1Items, charges: model1Charges, calc: model1Calc, setName: setModel1Name, setItems: setModel1Items, setCharges: setModel1Charges };
      case 'model2': return { name: model2Name, items: model2Items, charges: model2Charges, calc: model2Calc, setName: setModel2Name, setItems: setModel2Items, setCharges: setModel2Charges };
      case 'model3': return { name: model3Name, items: model3Items, charges: model3Charges, calc: model3Calc, setName: setModel3Name, setItems: setModel3Items, setCharges: setModel3Charges };
      case 'model4': return { name: model4Name, items: model4Items, charges: model4Charges, calc: model4Calc, setName: setModel4Name, setItems: setModel4Items, setCharges: setModel4Charges };
      case 'model5': return { name: model5Name, items: model5Items, charges: model5Charges, calc: model5Calc, setName: setModel5Name, setItems: setModel5Items, setCharges: setModel5Charges };
    }
  };

  // Customer selection auto-fill (with email, phone, address)
  const handleSelectCustomer = (custId: string) => {
    setSelectedCustomerId(custId);
    const cust = customers.find(c => c.id === custId);
    if (cust) {
      setCustomerName(cust.name || '');
      setCustomerPhone(cust.phone || '');
      setCustomerAddress(cust.area || cust.address || '');
      setCustomerEmail((cust as any).email || '');
      showToast(`Loaded customer: ${cust.name}`);
    }
  };

  // Job Card selection auto-fill
  const handleSelectJobCard = (jobId: string) => {
    setSelectedJobIdToLoad(jobId);
    const job = jobCards.find(j => j.id === jobId || j.jobId === jobId);
    if (job) {
      setOriginatingJobId(job.jobId);
      setCustomerName(job.customerName || '');
      setCustomerPhone(job.customerPhone || '');
      setCustomerAddress(job.customerArea || '');
      const cust = customers.find(c => c.id === job.customerId || c.phone === job.customerPhone);
      if (cust) {
        setSelectedCustomerId(cust.id);
        if ((cust as any).email) setCustomerEmail((cust as any).email);
      }
      showToast(`Loaded details from Job Card #${job.jobId} (${job.customerName})`);
    }
  };

  // Copy Model items and charges from an existing Quotation (Fixed iframe blocking bug: removed window.confirm)
  const handleCopyFromQuotation = (qtnId: string) => {
    setSelectedQtnIdToCopy(qtnId);
    const source = quotations.find(q => q.id === qtnId);
    if (!source) return;

    if (source.title) setQuotationTitle(source.title);
    const count = source.activeModelsCount || (source.model2?.items?.length ? 2 : 1);
    setActiveModelsCount(count);

    if (source.model1) {
      setModel1Name(source.model1.name || 'Model 1');
      setModel1Items(JSON.parse(JSON.stringify(source.model1.items || [])));
      setModel1Charges({ ...defaultCharges(), ...(source.model1.internalCharges || {}) });
    }

    if (source.model2) {
      setModel2Name(source.model2.name || 'Model 2');
      setModel2Items(JSON.parse(JSON.stringify(source.model2.items || [])));
      setModel2Charges({ ...defaultCharges(), ...(source.model2.internalCharges || {}) });
    }

    if (source.model3) {
      setModel3Name(source.model3.name || 'Model 3');
      setModel3Items(JSON.parse(JSON.stringify(source.model3.items || [])));
      setModel3Charges({ ...defaultCharges(), ...(source.model3.internalCharges || {}) });
    }

    if (source.model4) {
      setModel4Name(source.model4.name || 'Model 4');
      setModel4Items(JSON.parse(JSON.stringify(source.model4.items || [])));
      setModel4Charges({ ...defaultCharges(), ...(source.model4.internalCharges || {}) });
    }

    if (source.model5) {
      setModel5Name(source.model5.name || 'Model 5');
      setModel5Items(JSON.parse(JSON.stringify(source.model5.items || [])));
      setModel5Charges({ ...defaultCharges(), ...(source.model5.internalCharges || {}) });
    }

    if (source.termsAndConditions) setTermsAndConditions(source.termsAndConditions);
    if (source.paymentDetails) setPaymentDetails(source.paymentDetails);
    if (source.customerNotes) setCustomerNotes(source.customerNotes);
    if (source.installationNotes) setInstallationNotes(source.installationNotes);
    showToast(`Copied items & configuration from Quotation #${source.quotationNumber}!`);
  };

  // Copy any Model into another Model (e.g. Model 1 into Model 2, Model 1 into Model 3, etc.)
  const handleCopyModel = (fromKey: ModelKey, toKey: ModelKey) => {
    const from = getModelData(fromKey);
    const to = getModelData(toKey);

    to.setName(`${from.name} (Copy)`);
    to.setItems(JSON.parse(JSON.stringify(from.items)));
    to.setCharges({ ...from.charges });
    showToast(`Copied ${fromKey.toUpperCase()} items & charges into ${toKey.toUpperCase()} successfully!`);
  };

  // Add Item to a Model
  const handleAddItemToModel = (modelKey: ModelKey, item: QuotationItem) => {
    const m = getModelData(modelKey);
    m.setItems(prev => [...prev, item]);
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
    showToast(`Added "${prod.name}" to ${pickerTargetModel.toUpperCase()}`);
  };

  // Add Manual Custom Item Row
  const handleAddCustomRow = (modelKey: ModelKey, isService = false) => {
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
    handleAddItemToModel(modelKey, newItem);
  };

  // Update item field in any Model
  const handleUpdateItem = (
    modelKey: ModelKey,
    index: number,
    field: keyof QuotationItem,
    value: any
  ) => {
    const m = getModelData(modelKey);
    m.setItems(prev => {
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

  const handleRemoveItem = (modelKey: ModelKey, index: number) => {
    const m = getModelData(modelKey);
    m.setItems(prev => prev.filter((_, i) => i !== index));
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

    const model2: QuotationProposalModel | undefined = activeModelsCount >= 2 ? {
      name: model2Name.trim() || 'Model 2',
      items: model2Items,
      internalCharges: model2Charges,
      totalItemRate: model2Calc.totalItemRate,
      totalDisplayAmount: model2Calc.totalDisplayAmount,
      finalModelTotal: model2Calc.finalModelTotal,
    } : undefined;

    const model3: QuotationProposalModel | undefined = activeModelsCount >= 3 ? {
      name: model3Name.trim() || 'Model 3',
      items: model3Items,
      internalCharges: model3Charges,
      totalItemRate: model3Calc.totalItemRate,
      totalDisplayAmount: model3Calc.totalDisplayAmount,
      finalModelTotal: model3Calc.finalModelTotal,
    } : undefined;

    const model4: QuotationProposalModel | undefined = activeModelsCount >= 4 ? {
      name: model4Name.trim() || 'Model 4',
      items: model4Items,
      internalCharges: model4Charges,
      totalItemRate: model4Calc.totalItemRate,
      totalDisplayAmount: model4Calc.totalDisplayAmount,
      finalModelTotal: model4Calc.finalModelTotal,
    } : undefined;

    const model5: QuotationProposalModel | undefined = activeModelsCount >= 5 ? {
      name: model5Name.trim() || 'Model 5',
      items: model5Items,
      internalCharges: model5Charges,
      totalItemRate: model5Calc.totalItemRate,
      totalDisplayAmount: model5Calc.totalDisplayAmount,
      finalModelTotal: model5Calc.finalModelTotal,
    } : undefined;

    if (editingQuotationId) {
      // Editing existing quotation creates an immutable new version snapshot!
      updateManualQuotation(editingQuotationId, {
        title: quotationTitle.trim() || undefined,
        activeModelsCount,
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
        model3,
        model4,
        model5,
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
          title: quotationTitle.trim() || undefined,
          activeModelsCount,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim(),
          date: quotationDate,
          validityDays,
          validUntil: validUntilStr,
          model1,
          model2,
          model3,
          model4,
          model5,
          termsAndConditions,
          paymentDetails,
          advanceAmount,
          customerNotes,
          installationNotes,
        });
      }

      showToast(`Quotation #${updated?.quotationNumber || editingQuotationId} updated!`);
    } else {
      // New quotation
      const created = addManualQuotation({
        title: quotationTitle.trim() || undefined,
        activeModelsCount,
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
        model3,
        model4,
        model5,
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
    const modelsList: QuotationProposalModel[] = [
      q.model1,
      q.model2,
      q.model3,
      q.model4,
      q.model5
    ].filter(Boolean) as QuotationProposalModel[];

    const activeList = modelsList.slice(0, q.activeModelsCount || (q.model2 ? 2 : 1));

    const modelSummaries = activeList.map((m, idx) => {
      return `*OPTION ${idx + 1}: ${m.name}*
• Equipment Packages: ${m.items?.length || 0} items
• Total Proposal Amount: *₹${(m.finalModelTotal || 0).toLocaleString('en-IN')}*`;
    }).join('\n\n');

    return `*SPIDER GRID SOLUTIONS (SGS)*
*QUOTATION REF: ${q.quotationNumber}*
${q.title ? `📌 *Subject: ${q.title}*\n` : ''}📅 Date: ${q.date} (Valid for ${q.validityDays || 7} Days)

Dear *${q.customerName}*,
Thank you for your enquiry with Spider Grid Solutions - Madurai. We have prepared comparative proposal options for your premises:

━━━━━━━━━━━━━━━━━━━━━
${modelSummaries}
━━━━━━━━━━━━━━━━━━━━━

*Proposal Terms:*
• Hardware comes with manufacturer warranty.
• Standard installation included.
• Free 30-day onsite service support from handover.

Please review the proposal options and let us know your preferred configuration!
📞 Contact: ${adminSettings.workshopPhone || '+91 9176795665'} | Madurai`;
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

                              {/* Delete / Archive - Admin Only */}
                              {canDelete && (
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to archive Quotation #${q.quotationNumber}? Historical records will be safely preserved.`)) {
                                      deleteManualQuotation(q.id);
                                      showToast(`Quotation #${q.quotationNumber} archived.`);
                                    }
                                  }}
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                  title="Archive Quotation (Admin Only)"
                                >
                                  <Trash2 className="w-4 h-4" />
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
                  
                  {/* Select Existing Tab Switcher */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectExistingTab('customer')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        selectExistingTab === 'customer'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : isDark ? 'bg-slate-900 text-slate-300 hover:bg-slate-800' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      👤 Select Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectExistingTab('job')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        selectExistingTab === 'job'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : isDark ? 'bg-slate-900 text-slate-300 hover:bg-slate-800' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      📋 From Job Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectExistingTab('quotation')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        selectExistingTab === 'quotation'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : isDark ? 'bg-slate-900 text-slate-300 hover:bg-slate-800' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      📄 Copy From Quote
                    </button>
                  </div>
                </div>

                {/* Select Existing Panels */}
                <div className="p-2.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40">
                  {selectExistingTab === 'customer' && (
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                          <input
                            type="text"
                            value={customerSearchQuery}
                            onChange={(e) => setCustomerSearchQuery(e.target.value)}
                            placeholder="Type to filter customer by name, phone or area..."
                            className={`w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border focus:outline-none ${
                              isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>
                        <select
                          value={selectedCustomerId}
                          onChange={(e) => handleSelectCustomer(e.target.value)}
                          className={`text-xs rounded-lg px-2.5 py-1.5 focus:outline-none flex-1 ${
                            isDark ? 'bg-slate-950 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-800'
                          }`}
                        >
                          <option value="">-- Click to choose from Customer Database ({customers.length}) --</option>
                          {customers
                            .filter(c => {
                              if (!customerSearchQuery.trim()) return true;
                              const q = customerSearchQuery.toLowerCase();
                              return (
                                (c.name && c.name.toLowerCase().includes(q)) ||
                                (c.phone && c.phone.includes(q)) ||
                                (c.area && c.area.toLowerCase().includes(q))
                              );
                            })
                            .map(c => (
                              <option key={c.id} value={c.id}>
                                {c.name} {c.phone ? `· ${c.phone}` : ''} {c.area ? `(${c.area})` : ''}
                              </option>
                            ))}
                        </select>
                      </div>
                      {selectedCustomerId && (
                        <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                          <Check className="w-3 h-3" /> Customer linked to database. Details auto-populated below.
                        </p>
                      )}
                    </div>
                  )}

                  {selectExistingTab === 'job' && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-slate-400 font-semibold block">
                        Select an existing active or past Job Card to populate customer & link reference:
                      </label>
                      <select
                        value={selectedJobIdToLoad}
                        onChange={(e) => handleSelectJobCard(e.target.value)}
                        className={`w-full text-xs rounded-lg px-2.5 py-1.5 focus:outline-none ${
                          isDark ? 'bg-slate-950 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-800'
                        }`}
                      >
                        <option value="">-- Select Job Card from Workshop Database ({jobCards.length}) --</option>
                        {jobCards.map(j => (
                          <option key={j.id} value={j.id}>
                            #{j.jobId} · {j.customerName} ({j.customerPhone}) · {j.deviceBrand} - {j.status.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectExistingTab === 'quotation' && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-purple-400 font-semibold block">
                        Select a past quotation to copy all Model 1 &amp; Model 2 equipment rows &amp; charges:
                      </label>
                      <select
                        value={selectedQtnIdToCopy}
                        onChange={(e) => handleCopyFromQuotation(e.target.value)}
                        className={`w-full text-xs rounded-lg px-2.5 py-1.5 focus:outline-none ${
                          isDark ? 'bg-slate-950 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-800'
                        }`}
                      >
                        <option value="">-- Choose previous Quotation to copy items from ({quotations.length}) --</option>
                        {quotations
                          .filter(q => q.id !== editingQuotationId)
                          .map(q => (
                            <option key={q.id} value={q.id}>
                              #{q.quotationNumber} · {q.customerName} ({q.date}) {q.title ? `[${q.title}] ` : ''}· Model 1: ₹{(q.model1?.finalModelTotal || 0).toLocaleString('en-IN')}{q.model2 ? ` | Model 2: ₹${(q.model2.finalModelTotal || 0).toLocaleString('en-IN')}` : ''}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
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
                      placeholder="e.g. 9176795665"
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

                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="e.g. client@example.com"
                      className={`w-full rounded-lg px-3 py-1.5 text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:col-span-2">
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

                  <div className="sm:col-span-2 flex items-end">
                    {originatingJobId && (
                      <div className="w-full flex items-center justify-between p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
                        <span>Linked Originating Job: <strong>#{originatingJobId}</strong></span>
                        <button
                          type="button"
                          onClick={() => setOriginatingJobId(undefined)}
                          className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                        >
                          Unlink
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Manual Quotation Title / Subject */}
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Quotation Title / Subject
                  </label>
                  <input
                    type="text"
                    value={quotationTitle}
                    onChange={(e) => setQuotationTitle(e.target.value)}
                    placeholder="e.g. CCTV Surveillance System Proposal / Computer Networking Specification"
                    className={`w-full rounded-xl px-3 py-2 text-xs font-medium focus:outline-none ${
                      isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                  <p className={`text-[10px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    A4 letterhead header and footer banners are managed in Admin Settings and automatically apply to this quotation.
                  </p>
                </div>
              </div>

              {/* 2. Dynamic Models Workspace (Model 1, 2, 3, 4, 5) */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {Array.from({ length: activeModelsCount }).map((_, idx) => {
                      const key = `model${idx + 1}` as ModelKey;
                      const m = getModelData(key);
                      const isActive = activeModelTab === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setActiveModelTab(key)}
                          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-500'
                              : isDark ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <span>{m.name || `Model ${idx + 1}`}</span>
                          <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-black/30 text-white">
                            ₹{m.calc.finalModelTotal.toLocaleString('en-IN')}
                          </span>
                        </button>
                      );
                    })}

                    {/* Add Model Button (up to 5 models) */}
                    {activeModelsCount < 5 && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = activeModelsCount + 1;
                          setActiveModelsCount(next);
                          setActiveModelTab(`model${next}` as ModelKey);
                          showToast(`Activated Model ${next} option!`);
                        }}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl border border-dashed border-blue-400 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer flex items-center gap-1"
                        title="Add another model option (Model 1 to 5)"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Model {activeModelsCount + 1}</span>
                      </button>
                    )}

                    {/* Remove highest Model button if > 1 */}
                    {activeModelsCount > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = activeModelsCount - 1;
                          setActiveModelsCount(next);
                          if (activeModelTab === `model${activeModelsCount}`) {
                            setActiveModelTab(`model${next}` as ModelKey);
                          }
                          showToast(`Model ${activeModelsCount} removed.`);
                        }}
                        className="px-2 py-1 text-[11px] font-semibold text-rose-500 hover:underline cursor-pointer"
                        title={`Remove Model ${activeModelsCount}`}
                      >
                        Remove Model {activeModelsCount}
                      </button>
                    )}
                  </div>

                  {/* Actions for current active model */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Copy From Another Model */}
                    {activeModelsCount > 1 && (
                      <div className="flex items-center gap-1 text-xs">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Copy From:</span>
                        {Array.from({ length: activeModelsCount }).map((_, idx) => {
                          const srcKey = `model${idx + 1}` as ModelKey;
                          if (srcKey === activeModelTab) return null;
                          return (
                            <button
                              key={srcKey}
                              type="button"
                              onClick={() => handleCopyModel(srcKey, activeModelTab)}
                              className="px-2 py-1 text-[11px] font-bold rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800 transition-colors cursor-pointer"
                              title={`Copy items & charges from Model ${idx + 1} into ${activeModelTab.toUpperCase()}`}
                            >
                              Model {idx + 1}
                            </button>
                          );
                        })}
                      </div>
                    )}

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

                {/* Active Model Package Title */}
                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {getModelData(activeModelTab).name} Package Title
                  </label>
                  <input
                    type="text"
                    value={getModelData(activeModelTab).name}
                    onChange={(e) => getModelData(activeModelTab).setName(e.target.value)}
                    placeholder={`e.g. ${activeModelTab.toUpperCase()} Package Title`}
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
                      {getModelData(activeModelTab).items.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            No equipment items in {getModelData(activeModelTab).name} yet.
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
                        getModelData(activeModelTab).items.map((it, idx) => (
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

                            {/* Brand */}
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

                            {/* Unit (Nos) */}
                            <td className="py-2 px-2 text-center font-mono text-slate-400 font-semibold">
                              Nos
                            </td>

                            {/* Unit Price */}
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

                {/* 3. Internal Calculation Section (Hidden on Customer Proposal) */}
                <div className={`p-4 rounded-xl border space-y-4 ${
                  isDark ? 'bg-amber-950/20 border-amber-800/40' : 'bg-amber-50/60 border-amber-200'
                }`}>
                  <div className="flex items-center justify-between border-b pb-2 border-amber-200 dark:border-amber-900/40">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-amber-600" />
                        Internal CRM Calculation &amp; Margin ({getModelData(activeModelTab).name})
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                        HIDDEN FROM CUSTOMER PROPOSAL
                      </span>
                    </div>

                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                      Total Item Rate: ₹{getModelData(activeModelTab).calc.totalItemRate.toLocaleString('en-IN')}
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
                        value={getModelData(activeModelTab).charges.installation}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          getModelData(activeModelTab).setCharges(prev => ({ ...prev, installation: val }));
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
                        value={getModelData(activeModelTab).charges.helperFees}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          getModelData(activeModelTab).setCharges(prev => ({ ...prev, helperFees: val }));
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
                        value={getModelData(activeModelTab).charges.commission}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          getModelData(activeModelTab).setCharges(prev => ({ ...prev, commission: val }));
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
                        value={getModelData(activeModelTab).charges.margin}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          getModelData(activeModelTab).setCharges(prev => ({ ...prev, margin: val }));
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
                        value={getModelData(activeModelTab).charges.petrolVisit}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          getModelData(activeModelTab).setCharges(prev => ({ ...prev, petrolVisit: val }));
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
                        value={getModelData(activeModelTab).charges.customerReduction}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          getModelData(activeModelTab).setCharges(prev => ({ ...prev, customerReduction: val }));
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
                        ₹{getModelData(activeModelTab).calc.totalItemRate.toLocaleString('en-IN')}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[11px]">Margin &amp; Internal Charges:</span>
                      <p className="font-mono font-bold text-sm text-amber-700 dark:text-amber-400">
                        +₹{getModelData(activeModelTab).calc.internalSum.toLocaleString('en-IN')}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-500 text-[11px]">Customer Reduction:</span>
                      <p className="font-mono font-bold text-sm text-rose-600">
                        -₹{getModelData(activeModelTab).charges.customerReduction.toLocaleString('en-IN')}
                      </p>
                    </div>

                    <div className="bg-emerald-600 text-white p-2.5 rounded-xl text-right">
                      <span className="text-[10px] uppercase font-bold text-emerald-100 tracking-wider block">
                        Final Model Total (Customer Price)
                      </span>
                      <span className="text-lg font-black font-mono block">
                        ₹{getModelData(activeModelTab).calc.finalModelTotal.toLocaleString('en-IN')}
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
              {(() => {
                const previewHeaderImg = pdfPreviewQuotation.headerImageUrl || adminSettings.quotationHeaderImageUrl;
                const previewFooterImg = pdfPreviewQuotation.footerImageUrl || adminSettings.quotationFooterImageUrl;

                return (
                  <div 
                    className="relative bg-white shadow-2xl rounded-sm w-full max-w-[794px] min-h-[1123px] text-slate-900 font-sans print:shadow-none print:w-full print:max-w-none overflow-hidden flex flex-col justify-between"
                    style={{
                      backgroundImage: (!previewHeaderImg && !previewFooterImg) ? `url('${adminSettings.quotationBackgroundUrl || DEFAULT_SGS_QUOTATION_LETTERHEAD_BG}')` : undefined,
                      backgroundSize: '100% 100%',
                      backgroundRepeat: 'no-repeat',
                    }}
                  >
                    {/* Custom Header Banner Image */}
                    {previewHeaderImg && (
                      <div className="w-full shrink-0 bg-white border-b border-slate-200">
                        <img 
                          src={previewHeaderImg} 
                          alt="Quotation Letterhead Header" 
                          className="w-full max-h-36 object-contain object-top" 
                        />
                      </div>
                    )}

                    {/* Content Area with dynamic top/bottom padding depending on custom header/footer */}
                    <div className={`${previewHeaderImg ? 'pt-5' : 'pt-40'} ${previewFooterImg ? 'pb-5' : 'pb-24'} px-10 space-y-6 flex-1 flex flex-col`}>
                  
                  {/* Proposal Document Header Banner (Requirement 5: QUOTATION only) */}
                  <div className="flex items-center justify-between border-b pb-3 border-slate-300">
                    <div>
                      <div className="inline-block px-3 py-1 text-xs font-black uppercase tracking-wider rounded bg-blue-900 text-white shadow-xs">
                        QUOTATION
                      </div>
                      {pdfPreviewQuotation.title ? (
                        <p className="text-xs text-slate-800 font-bold mt-1">
                          {pdfPreviewQuotation.title}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500 font-medium mt-1">
                          Spider Grid Solutions · Commercial Proposal
                        </p>
                      )}
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

                  {/* Dynamic Models Display (Models 1 to 5) */}
                  <div className="space-y-4 flex-1">
                    {(() => {
                      const allModels: (QuotationProposalModel | undefined)[] = [
                        pdfPreviewQuotation.model1,
                        pdfPreviewQuotation.model2,
                        pdfPreviewQuotation.model3,
                        pdfPreviewQuotation.model4,
                        pdfPreviewQuotation.model5,
                      ];
                      const activeCount = pdfPreviewQuotation.activeModelsCount || (pdfPreviewQuotation.model2 ? 2 : 1);
                      const displayList = allModels.slice(0, activeCount).filter(Boolean) as QuotationProposalModel[];

                      const headerColors = [
                        'bg-slate-900',
                        'bg-indigo-950',
                        'bg-purple-950',
                        'bg-teal-950',
                        'bg-blue-950'
                      ];

                      return displayList.map((model, idx) => (
                        <div key={idx} className="border border-slate-300 rounded-lg overflow-hidden bg-white/95 shadow-2xs">
                          <div className={`${headerColors[idx % headerColors.length]} text-white px-4 py-2 flex items-center justify-between`}>
                            <span className="text-xs font-black uppercase tracking-wider">
                              {model.name}
                            </span>
                            {displayList.length > 1 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-600 text-white">
                                Option {idx + 1}
                              </span>
                            )}
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
                              {model.items && model.items.length > 0 ? (
                                model.items.map((it, itIdx) => (
                                  <tr key={itIdx}>
                                    <td className="py-2 px-3 text-center text-slate-400 font-mono">{itIdx + 1}</td>
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
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={3} className="py-4 text-center text-slate-400 text-xs">
                                    No items listed for {model.name}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>

                          {/* Model Total Amount (Individual item prices & internal margins hidden) */}
                          <div className="bg-blue-50/90 border-t border-blue-200 px-4 py-2.5 flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-wider text-blue-900">
                              {model.name} — Total Proposal Amount:
                            </span>
                            <span className="text-base font-black font-mono text-blue-900">
                              ₹{(model.finalModelTotal || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      ));
                    })()}
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

                {/* Bottom Custom Footer Banner or Default Blue Accent Bar */}
                {previewFooterImg ? (
                  <div className="w-full shrink-0 bg-white border-t border-slate-200">
                    <img 
                      src={previewFooterImg} 
                      alt="Quotation Letterhead Footer" 
                      className="w-full max-h-24 object-contain object-bottom" 
                    />
                  </div>
                ) : (
                  <div className="h-3 w-full bg-blue-950 shrink-0" />
                )}
              </div>
            );
          })()}
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
                  {versionHistoryQuotation.model2 && (
                    <div>
                      <span className="text-slate-400">Model 2:</span>{' '}
                      <strong>₹{versionHistoryQuotation.model2.finalModelTotal.toLocaleString('en-IN')}</strong>
                    </div>
                  )}
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
                <option value="Not Decided">Not Decided (Evaluating Options)</option>
                {statusModalQuotation.model1 && (
                  <option value="Model 1">Model 1: {statusModalQuotation.model1.name} (₹{(statusModalQuotation.model1.finalModelTotal || 0).toLocaleString('en-IN')})</option>
                )}
                {statusModalQuotation.model2 && (
                  <option value="Model 2">Model 2: {statusModalQuotation.model2.name} (₹{(statusModalQuotation.model2.finalModelTotal || 0).toLocaleString('en-IN')})</option>
                )}
                {statusModalQuotation.model3 && (
                  <option value="Model 3">Model 3: {statusModalQuotation.model3.name} (₹{(statusModalQuotation.model3.finalModelTotal || 0).toLocaleString('en-IN')})</option>
                )}
                {statusModalQuotation.model4 && (
                  <option value="Model 4">Model 4: {statusModalQuotation.model4.name} (₹{(statusModalQuotation.model4.finalModelTotal || 0).toLocaleString('en-IN')})</option>
                )}
                {statusModalQuotation.model5 && (
                  <option value="Model 5">Model 5: {statusModalQuotation.model5.name} (₹{(statusModalQuotation.model5.finalModelTotal || 0).toLocaleString('en-IN')})</option>
                )}
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
