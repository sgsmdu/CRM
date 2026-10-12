import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Settings, 
  MessageSquare, 
  DollarSign, 
  Sparkles, 
  Star, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  CheckCircle2, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Save, 
  ExternalLink, 
  TrendingUp, 
  Download, 
  Upload, 
  FileText,
  Copy,
  Receipt,
  Tag,
  Palette,
  Image,
  Layers,
  RefreshCw
} from 'lucide-react';
import { useSgs } from '../context/SgsContext';
import { AdminSettings, QuickServicePreset, DeviceCategory, BillingTheme, PandiyanBillingTheme } from '../types';
import { 
  DEFAULT_SGS_LOGO_DATA_URL, 
  DEFAULT_SGS_STAMP_DATA_URL, 
  DEFAULT_PANDIYAN_LOGO_DATA_URL, 
  DEFAULT_PANDIYAN_STAMP_DATA_URL,
  SgsLogo,
  SgsStamp,
  PandiyanLogo,
  PandiyanStamp,
  SGS_THEMES,
  PANDIYAN_THEMES
} from '../utils/brandAssets';

export const AdminDashboard: React.FC = () => {
  const { 
    adminSettings, 
    updateAdminSettings, 
    resetAdminSettings,
    invoices, 
    vendorBills, 
    cashFlow, 
    jobCards,
    theme,
    exportDataJson,
    importDataJson,
    resetToDefaultData
  } = useSgs();
  
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'prefill' | 'billing_themes' | 'whatsapp' | 'profitloss' | 'backup'>('prefill');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Local Form state for admin settings
  const [formData, setFormData] = useState<AdminSettings>(adminSettings);
  const [newTechnician, setNewTechnician] = useState('');
  
  // New Quick Service state
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceHsn, setNewServiceHsn] = useState('998713');
  const [newServiceRate, setNewServiceRate] = useState<number>(500);
  const [newServiceCost, setNewServiceCost] = useState<number>(50);
  const [newServiceCategory, setNewServiceCategory] = useState<DeviceCategory>('laptop');

  // Preview message tab
  const [previewTab, setPreviewTab] = useState<'welcome' | 'status' | 'review'>('review');

  const handleFieldChange = <K extends keyof AdminSettings>(field: K, value: AdminSettings[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveSettings = () => {
    updateAdminSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleAddTechnician = () => {
    if (!newTechnician.trim()) return;
    const updated = [...(formData.technicians || []), newTechnician.trim()];
    handleFieldChange('technicians', updated);
    setNewTechnician('');
  };

  const handleRemoveTechnician = (index: number) => {
    const updated = (formData.technicians || []).filter((_, i) => i !== index);
    handleFieldChange('technicians', updated);
  };

  const handleAddQuickService = () => {
    if (!newServiceName.trim()) return;
    const newPreset: QuickServicePreset = {
      name: newServiceName.trim(),
      hsn: newServiceHsn.trim() || '998713',
      rate: Number(newServiceRate) || 0,
      cost: Number(newServiceCost) || 0,
      category: newServiceCategory,
    };
    handleFieldChange('quickServices', [...(formData.quickServices || []), newPreset]);
    setNewServiceName('');
    setNewServiceRate(500);
    setNewServiceCost(50);
  };

  const handleRemoveQuickService = (index: number) => {
    const updated = (formData.quickServices || []).filter((_, i) => i !== index);
    handleFieldChange('quickServices', updated);
  };

  // Profit & Loss Calculations
  const activeInvoices = invoices.filter(inv => inv.status !== 'cancelled' && inv.type === 'invoice');
  const totalBilled = activeInvoices.reduce((sum, inv) => sum + (inv.subtotal || 0), 0);
  const totalSpareCosts = activeInvoices.reduce((sum, inv) => sum + (inv.purchaseCostTotal || 0), 0);
  const totalManualCosts = activeInvoices.reduce((sum, inv) => sum + (inv.manualExtraCost || 0), 0);
  const totalInvoiceProfit = totalBilled - totalSpareCosts - totalManualCosts;
  const overallMargin = totalBilled > 0 ? Math.round((totalInvoiceProfit / totalBilled) * 100) : 0;

  const totalVendorPurchases = vendorBills.reduce((sum, vb) => sum + (vb.totalAmount || 0), 0);
  const totalGeneralExpenses = cashFlow
    .filter(c => c.type === 'expense' && c.category !== 'Vendor Spares')
    .reduce((sum, c) => sum + c.amount, 0);

  const sampleCustomer = {
    customerName: 'Karthikeyen',
    jobId: 'SGS-2026-001',
    category: 'LAPTOP',
    deviceBrand: 'Lenovo ThinkPad E14',
    reportedIssue: 'Motherboard No Power & Screen Flickering',
    intakeDate: '2026-10-10',
    estimatedDelivery: '12 Oct 2026',
    estimatedCost: '3,200',
    status: 'Ready for Pickup & Delivery',
    technicianNotes: 'SMPS capacitor replaced & thermal paste re-applied.',
    amount: '3,200',
    googleReviewUrl: formData.googleReviewUrl || 'https://g.page/r/spidergridsolutions/review',
    workshopPhone: formData.workshopPhone || '+91 9677776001',
  };

  const getPreviewText = () => {
    let tpl = '';
    if (previewTab === 'welcome') tpl = formData.welcomeMessageTemplate;
    else if (previewTab === 'status') tpl = formData.statusMessageTemplate;
    else tpl = formData.reviewMessageTemplate;

    return tpl
      .replace(/{customerName}/g, sampleCustomer.customerName)
      .replace(/{jobId}/g, sampleCustomer.jobId)
      .replace(/{category}/g, sampleCustomer.category)
      .replace(/{deviceBrand}/g, sampleCustomer.deviceBrand)
      .replace(/{reportedIssue}/g, sampleCustomer.reportedIssue)
      .replace(/{intakeDate}/g, sampleCustomer.intakeDate)
      .replace(/{estimatedDelivery}/g, sampleCustomer.estimatedDelivery)
      .replace(/{estimatedCost}/g, sampleCustomer.estimatedCost)
      .replace(/{status}/g, sampleCustomer.status)
      .replace(/{technicianNotes}/g, sampleCustomer.technicianNotes)
      .replace(/{amount}/g, sampleCustomer.amount)
      .replace(/{googleReviewUrl}/g, sampleCustomer.googleReviewUrl)
      .replace(/{workshopPhone}/g, sampleCustomer.workshopPhone);
  };

  const handleExport = () => {
    const jsonStr = exportDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sgs-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importDataJson(content);
      if (success) {
        alert('Data backup successfully restored!');
      } else {
        alert('Failed to parse backup JSON. Please check file format.');
      }
    };
    reader.readAsText(file);
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
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Admin Dashboard & Workshop Controls
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white uppercase tracking-wider">
                  Admin Master
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Prefill customizable billing defaults, HSN codes, Google Review link, & WhatsApp flow templates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveSettings}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Admin Settings</span>
            </button>
            {saveSuccess && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" />
                <span>Saved!</span>
              </span>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto border-t pt-4">
          <button
            onClick={() => setActiveTab('prefill')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'prefill'
                ? 'bg-blue-600 text-white shadow-xs'
                : (isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Prefill & Billing Defaults</span>
          </button>

          <button
            onClick={() => setActiveTab('billing_themes')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'billing_themes'
                ? 'bg-blue-600 text-white shadow-xs'
                : (isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Billing Themes, Logos & Pandiyan Mode</span>
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'whatsapp'
                ? 'bg-blue-600 text-white shadow-xs'
                : (isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>WhatsApp & Google Review Messages</span>
          </button>

          <button
            onClick={() => setActiveTab('profitloss')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'profitloss'
                ? 'bg-blue-600 text-white shadow-xs'
                : (isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Profit & Loss Intelligence</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'backup'
                ? 'bg-blue-600 text-white shadow-xs'
                : (isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Backup & Data Management</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Prefill & Billing Defaults */}
      {activeTab === 'prefill' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Workshop Details & UPI ID */}
          <div className={`lg:col-span-2 p-6 rounded-2xl border space-y-5 ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Workshop Profile & Billing Header</h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Appears on customer invoices, vouchers, and UPI payments</p>
              </div>
              <Building2 className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Workshop Legal Trade Name
                </label>
                <input
                  type="text"
                  value={formData.workshopName}
                  onChange={(e) => handleFieldChange('workshopName', e.target.value)}
                  className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  GSTIN / MSME Udyam Number
                </label>
                <input
                  type="text"
                  value={formData.workshopGstin}
                  onChange={(e) => handleFieldChange('workshopGstin', e.target.value)}
                  className={`w-full rounded-lg px-3 py-2 text-xs font-mono uppercase focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Workshop Official Phone
                </label>
                <input
                  type="text"
                  value={formData.workshopPhone}
                  onChange={(e) => handleFieldChange('workshopPhone', e.target.value)}
                  className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Official Email
                </label>
                <input
                  type="email"
                  value={formData.workshopEmail}
                  onChange={(e) => handleFieldChange('workshopEmail', e.target.value)}
                  className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
                  }`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Workshop Address (Madurai)
                </label>
                <input
                  type="text"
                  value={formData.workshopAddress}
                  onChange={(e) => handleFieldChange('workshopAddress', e.target.value)}
                  className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Workshop UPI ID (VPA for QR / Online Customer Payment)
                </label>
                <div className="relative">
                  <CreditCard className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    value={formData.workshopUpiId}
                    onChange={(e) => handleFieldChange('workshopUpiId', e.target.value)}
                    placeholder="e.g. spidergridsolutions@okaxis"
                    className={`w-full rounded-lg pl-9 pr-3 py-2 text-xs font-mono focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Invoice Number Prefix
                </label>
                <input
                  type="text"
                  value={formData.invoicePrefix}
                  onChange={(e) => handleFieldChange('invoicePrefix', e.target.value)}
                  placeholder="SGS-INV-"
                  className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Default HSN / SAC Code
                </label>
                <select
                  value={formData.defaultHsnCode}
                  onChange={(e) => handleFieldChange('defaultHsnCode', e.target.value)}
                  className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
                  }`}
                >
                  <option value="998713">998713 - Computer, Peripheral & Hardware Repair</option>
                  <option value="8471">8471 - Automatic Data Processing (Laptops/PCs)</option>
                  <option value="8528">8528 - CCTV Monitors, Displays & Screen Units</option>
                  <option value="8504">8504 - SMPS, Adapters, Power Transformers</option>
                  <option value="8443">8443 - Printer Spares, Heads & Cartridges</option>
                  <option value="8517">8517 - Networking, Routers, Modems</option>
                </select>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Default GST Tax Rate
                </label>
                <select
                  value={formData.defaultGstPercent}
                  onChange={(e) => handleFieldChange('defaultGstPercent', Number(e.target.value))}
                  className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
                  }`}
                >
                  <option value={0}>0% - Non-GST / Composition Invoice</option>
                  <option value={5}>5% - Essential Hardware</option>
                  <option value={12}>12% - Standard Components</option>
                  <option value={18}>18% - IT Services & General Computer Spares</option>
                </select>
              </div>
            </div>

            {/* Quick Services Catalog */}
            <div className="border-t pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    1-Click Billing Presets (Quick Services & Charges)
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Pre-set items auto-fill description, HSN, rate, and purchase cost when creating customer bills
                  </p>
                </div>
                <Tag className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
              </div>

              {/* Add Service Preset Form */}
              <div className={`p-3 rounded-xl border flex flex-col sm:flex-row items-end gap-2.5 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="w-full sm:flex-1">
                  <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Service / Item Description
                  </label>
                  <input
                    type="text"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    placeholder="e.g. Laptop Screen Replacement 15.6 LED"
                    className={`w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none ${
                      isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="w-full sm:w-24">
                  <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    HSN Code
                  </label>
                  <input
                    type="text"
                    value={newServiceHsn}
                    onChange={(e) => setNewServiceHsn(e.target.value)}
                    className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none ${
                      isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="w-full sm:w-24">
                  <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Billed Rate (₹)
                  </label>
                  <input
                    type="number"
                    value={newServiceRate}
                    onChange={(e) => setNewServiceRate(Number(e.target.value))}
                    className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none ${
                      isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div className="w-full sm:w-24">
                  <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Cost (₹)
                  </label>
                  <input
                    type="number"
                    value={newServiceCost}
                    onChange={(e) => setNewServiceCost(Number(e.target.value))}
                    className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none ${
                      isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddQuickService}
                  className="w-full sm:w-auto px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                >
                  <Plus className="w-4 h-4 inline" /> Add
                </button>
              </div>

              {/* Service List */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {(formData.quickServices || []).map((srv, idx) => (
                  <div 
                    key={idx}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${
                      isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/70 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{srv.name}</span>
                      <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${
                        isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                      }`}>
                        HSN {srv.hsn}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-emerald-600 font-bold">
                        Sell ₹{srv.rate}
                      </span>
                      <span className={`font-mono text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Cost ₹{srv.cost}
                      </span>
                      <span className="text-[10px] font-bold text-blue-600">
                        Profit +₹{srv.rate - srv.cost}
                      </span>
                      <button
                        onClick={() => handleRemoveQuickService(idx)}
                        className={`p-1 rounded cursor-pointer ${
                          isDark ? 'text-slate-500 hover:text-rose-400' : 'text-slate-400 hover:text-rose-600'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Workshop Technicians */}
          <div className={`p-6 rounded-2xl border space-y-4 ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Assigned Workshop Technicians
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Technicians appearing on job intake and assignment cards
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTechnician}
                onChange={(e) => setNewTechnician(e.target.value)}
                placeholder="e.g. Rajesh - Printer Specialist"
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs focus:outline-none ${
                  isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'
                }`}
              />
              <button
                type="button"
                onClick={handleAddTechnician}
                className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
              >
                Add
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {(formData.technicians || []).map((tech, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                    isDark ? 'bg-slate-950/60 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <span className="font-semibold">{tech}</span>
                  <button
                    onClick={() => handleRemoveTechnician(idx)}
                    className={`p-1 rounded cursor-pointer ${
                      isDark ? 'text-slate-500 hover:text-rose-400' : 'text-slate-400 hover:text-rose-600'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className={`p-4 rounded-xl border text-xs space-y-2 ${
              isDark ? 'bg-blue-950/30 border-blue-900/50 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              <div className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                <span>Auto-Fill Advantage</span>
              </div>
              <p>
                All presets configured here automatically populate on new Job Cards and Customer Bills with 1-click!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Billing Themes, Models & Firm Customization */}
      {activeTab === 'billing_themes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            
            {/* Card 1: Spider Grid Solutions (SGS) - GST Firm Identity */}
            <div className={`p-6 rounded-2xl border space-y-6 ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-blue-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between border-b pb-3 border-blue-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/30">
                    SGS
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-blue-600 dark:text-blue-400">
                        Spider Grid Solutions (SGS)
                      </h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                        GST Registered
                      </span>
                    </div>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Primary workshop firm · Tax Invoices, quotations & stock ledger
                    </p>
                  </div>
                </div>
                <Palette className="w-5 h-5 text-blue-600" />
              </div>

              {/* SGS Theme Selector */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  SGS Billing & Invoice Theme
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(SGS_THEMES) as BillingTheme[]).map(key => {
                    const thm = SGS_THEMES[key];
                    const isSelected = (formData.billingTheme || 'modern_navy') === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleFieldChange('billingTheme', key)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-600 ring-2 ring-blue-500 bg-blue-50/20 shadow-xs'
                            : (isDark ? 'border-slate-800 hover:border-slate-700 bg-slate-950/40' : 'border-slate-200 hover:border-slate-300 bg-white')
                        }`}
                      >
                        <div className={`w-full h-4 rounded mb-2 ${thm.previewColor}`} />
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{thm.name}</p>
                        <span className="text-[10px] text-slate-400">{isSelected ? '✓ Active Theme' : 'Select'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SGS Logo & Stamp Attachments */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                
                {/* SGS Logo Attachment */}
                <div className={`p-4 rounded-xl border space-y-3 ${
                  isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                      <Image className="w-4 h-4" />
                      SGS Official Logo
                    </span>
                    <button
                      type="button"
                      onClick={() => handleFieldChange('workshopLogoUrl', DEFAULT_SGS_LOGO_DATA_URL)}
                      className="text-[10px] font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                      title="Reset to default high-res SVG logo"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Reset Default
                    </button>
                  </div>
                  
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center min-h-[70px]">
                    <SgsLogo url={formData.workshopLogoUrl} size="md" />
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={formData.workshopLogoUrl || ''}
                      onChange={(e) => handleFieldChange('workshopLogoUrl', e.target.value)}
                      placeholder="Image URL or Base64 data..."
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    />
                    <label className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200 cursor-pointer">
                      <Upload className="w-3 h-3" /> Upload Logo File
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => handleFieldChange('workshopLogoUrl', reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* SGS Rubber Stamp Seal Attachment */}
                <div className={`p-4 rounded-xl border space-y-3 ${
                  isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                      <ShieldCheck className="w-4 h-4" />
                      SGS Rubber Stamp Seal
                    </span>
                    <button
                      type="button"
                      onClick={() => handleFieldChange('rubberStampUrl', DEFAULT_SGS_STAMP_DATA_URL)}
                      className="text-[10px] font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                      title="Reset to default circular seal"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Reset Default
                    </button>
                  </div>
                  
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center min-h-[70px]">
                    <SgsStamp url={formData.rubberStampUrl} className="max-h-16" />
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={formData.rubberStampUrl || ''}
                      onChange={(e) => handleFieldChange('rubberStampUrl', e.target.value)}
                      placeholder="Image URL or Base64 data..."
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    />
                    <label className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200 cursor-pointer">
                      <Upload className="w-3 h-3" /> Upload Stamp PNG
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => handleFieldChange('rubberStampUrl', reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

              </div>

              {/* SGS Bank Account Details */}
              <div className="border-t pt-4 space-y-3">
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  SGS Bank Account Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={formData.bankName || ''}
                      onChange={(e) => handleFieldChange('bankName', e.target.value)}
                      placeholder="HDFC Bank"
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs ${isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={formData.bankAccountNumber || ''}
                      onChange={(e) => handleFieldChange('bankAccountNumber', e.target.value)}
                      placeholder="50200084729103"
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono ${isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={formData.bankIfsc || ''}
                      onChange={(e) => handleFieldChange('bankIfsc', e.target.value)}
                      placeholder="HDFC0001234"
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono uppercase ${isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Branch Name</label>
                    <input
                      type="text"
                      value={formData.bankBranch || ''}
                      onChange={(e) => handleFieldChange('bankBranch', e.target.value)}
                      placeholder="Anna Nagar, Madurai"
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs ${isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'}`}
                    />
                  </div>
                </div>
              </div>

              {/* SGS Terms */}
              <div className="border-t pt-4 space-y-2">
                <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  SGS Tax Invoice Terms & Conditions
                </label>
                <textarea
                  rows={2}
                  value={formData.termsAndConditions || ''}
                  onChange={(e) => handleFieldChange('termsAndConditions', e.target.value)}
                  placeholder="Terms and conditions..."
                  className={`w-full rounded-xl p-2.5 text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

            </div>

            {/* Card 2: Pandiyan Computers - Non-GST Firm Identity */}
            <div className={`p-6 rounded-2xl border space-y-6 ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-amber-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between border-b pb-3 border-amber-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black shadow-md shadow-amber-500/30">
                    PC
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-amber-600 dark:text-amber-400">
                        Pandiyan Computers
                      </h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                        Non-GST Counter
                      </span>
                    </div>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Fast estimate slips · Without GST · No inventory stock deduction
                    </p>
                  </div>
                </div>
                <Building2 className="w-5 h-5 text-amber-600" />
              </div>

              {/* Pandiyan Theme Selector */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Pandiyan Computers Theme
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(PANDIYAN_THEMES) as PandiyanBillingTheme[]).map(key => {
                    const thm = PANDIYAN_THEMES[key];
                    const isSelected = (formData.pandiyanBillingTheme || 'warm_amber') === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleFieldChange('pandiyanBillingTheme', key)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'border-amber-600 ring-2 ring-amber-500 bg-amber-50/20 shadow-xs'
                            : (isDark ? 'border-slate-800 hover:border-slate-700 bg-slate-950/40' : 'border-slate-200 hover:border-slate-300 bg-white')
                        }`}
                      >
                        <div className={`w-full h-4 rounded mb-2 ${thm.previewColor}`} />
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{thm.name}</p>
                        <span className="text-[10px] text-slate-400">{isSelected ? '✓ Active Theme' : 'Select'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pandiyan Logo & Rubber Stamp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                
                {/* Pandiyan Logo Attachment */}
                <div className={`p-4 rounded-xl border space-y-3 ${
                  isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <Image className="w-4 h-4" />
                      Pandiyan Official Logo
                    </span>
                    <button
                      type="button"
                      onClick={() => handleFieldChange('pandiyanLogoUrl', DEFAULT_PANDIYAN_LOGO_DATA_URL)}
                      className="text-[10px] font-semibold text-amber-600 hover:underline flex items-center gap-1 cursor-pointer"
                      title="Reset to default royal crest logo"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Reset Default
                    </button>
                  </div>
                  
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center min-h-[70px]">
                    <PandiyanLogo url={formData.pandiyanLogoUrl} size="md" />
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={formData.pandiyanLogoUrl || ''}
                      onChange={(e) => handleFieldChange('pandiyanLogoUrl', e.target.value)}
                      placeholder="Image URL or Base64 data..."
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    />
                    <label className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200 cursor-pointer">
                      <Upload className="w-3 h-3" /> Upload Logo File
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => handleFieldChange('pandiyanLogoUrl', reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Pandiyan Rubber Stamp Seal Attachment */}
                <div className={`p-4 rounded-xl border space-y-3 ${
                  isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <ShieldCheck className="w-4 h-4" />
                      Pandiyan Rubber Stamp Seal
                    </span>
                    <button
                      type="button"
                      onClick={() => handleFieldChange('pandiyanRubberStampUrl', DEFAULT_PANDIYAN_STAMP_DATA_URL)}
                      className="text-[10px] font-semibold text-amber-600 hover:underline flex items-center gap-1 cursor-pointer"
                      title="Reset to default Pandiyan seal"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Reset Default
                    </button>
                  </div>
                  
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center min-h-[70px]">
                    <PandiyanStamp url={formData.pandiyanRubberStampUrl} className="max-h-16" />
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={formData.pandiyanRubberStampUrl || ''}
                      onChange={(e) => handleFieldChange('pandiyanRubberStampUrl', e.target.value)}
                      placeholder="Image URL or Base64 data..."
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    />
                    <label className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200 cursor-pointer">
                      <Upload className="w-3 h-3" /> Upload Stamp PNG
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => handleFieldChange('pandiyanRubberStampUrl', reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

              </div>

              {/* Pandiyan Details Form */}
              <div className="border-t pt-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Firm Name</label>
                    <input
                      type="text"
                      value={formData.pandiyanFirmName || 'Pandiyan Computers'}
                      onChange={(e) => handleFieldChange('pandiyanFirmName', e.target.value)}
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs ${isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={formData.pandiyanPhone || '+91 94433 12345'}
                      onChange={(e) => handleFieldChange('pandiyanPhone', e.target.value)}
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs ${isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold mb-1">Address / Shop Location</label>
                  <input
                    type="text"
                    value={formData.pandiyanAddress || 'Shop No. 14, Simmakkal Main Road, Madurai - 625001'}
                    onChange={(e) => handleFieldChange('pandiyanAddress', e.target.value)}
                    className={`w-full rounded-lg px-2.5 py-1.5 text-xs ${isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'}`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold mb-1">Estimate Slip Terms</label>
                  <textarea
                    rows={2}
                    value={formData.pandiyanTerms || 'Goods once sold cannot be returned. Warranty valid per manufacturer.'}
                    onChange={(e) => handleFieldChange('pandiyanTerms', e.target.value)}
                    className={`w-full rounded-xl p-2.5 text-xs focus:outline-none ${isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'}`}
                  />
                </div>
              </div>

            </div>

          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleSaveSettings}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" /> Save Brand Logos, Stamps & Themes
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: WhatsApp & Google Review Messages */}
      {activeTab === 'whatsapp' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Template Editors */}
          <div className={`lg:col-span-7 p-6 rounded-2xl border space-y-6 ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            
            {/* Google Review Direct Link Input */}
            <div className={`p-4 rounded-xl border space-y-2 ${
              isDark ? 'bg-amber-950/20 border-amber-900/40' : 'bg-amber-50/70 border-amber-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className={`text-xs font-bold ${isDark ? 'text-amber-300' : 'text-amber-900'}`}>
                    Spider Grid Solutions Google Review Link
                  </span>
                </div>
                {formData.googleReviewUrl && (
                  <a
                    href={formData.googleReviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                  >
                    Test Link <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <input
                type="text"
                value={formData.googleReviewUrl}
                onChange={(e) => handleFieldChange('googleReviewUrl', e.target.value)}
                placeholder="https://g.page/r/your_business_id/review"
                className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                  isDark ? 'bg-slate-950 border border-slate-800 text-white focus:border-amber-500' : 'bg-white border border-slate-300 text-slate-900 focus:border-amber-600'
                }`}
              />
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                This link is automatically embedded in the "Job Complete & Google Review" WhatsApp message sent to customers!
              </p>
            </div>

            {/* Template 1: Welcome Message */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className={`text-xs font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>1. Welcome & Job Intake Template</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-normal">Sent on Intake</span>
                </label>
                <button
                  type="button"
                  onClick={() => setPreviewTab('welcome')}
                  className="text-xs text-blue-600 hover:underline cursor-pointer"
                >
                  Preview Below
                </button>
              </div>
              <textarea
                rows={6}
                value={formData.welcomeMessageTemplate}
                onChange={(e) => handleFieldChange('welcomeMessageTemplate', e.target.value)}
                className={`w-full rounded-xl p-3 text-xs font-mono focus:outline-none leading-relaxed ${
                  isDark ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
                }`}
              />
            </div>

            {/* Template 2: Flow / Progress Update Message */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className={`text-xs font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>2. Repair Flow / Status Progress Template</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-normal">Sent on Status Change</span>
                </label>
                <button
                  type="button"
                  onClick={() => setPreviewTab('status')}
                  className="text-xs text-blue-600 hover:underline cursor-pointer"
                >
                  Preview Below
                </button>
              </div>
              <textarea
                rows={5}
                value={formData.statusMessageTemplate}
                onChange={(e) => handleFieldChange('statusMessageTemplate', e.target.value)}
                className={`w-full rounded-xl p-3 text-xs font-mono focus:outline-none leading-relaxed ${
                  isDark ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
                }`}
              />
            </div>

            {/* Template 3: Job Completed & Google Review Request */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className={`text-xs font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>3. Job Completed & Google Review Request Template</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-normal">Sent on Completion</span>
                </label>
                <button
                  type="button"
                  onClick={() => setPreviewTab('review')}
                  className="text-xs text-blue-600 hover:underline cursor-pointer"
                >
                  Preview Below
                </button>
              </div>
              <textarea
                rows={6}
                value={formData.reviewMessageTemplate}
                onChange={(e) => handleFieldChange('reviewMessageTemplate', e.target.value)}
                className={`w-full rounded-xl p-3 text-xs font-mono focus:outline-none leading-relaxed ${
                  isDark ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
                }`}
              />
            </div>

            {/* Tag Legend */}
            <div className={`p-4 rounded-xl border text-xs space-y-2 ${
              isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <span className="font-bold text-blue-600">Dynamic Tags Available:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 font-mono text-[11px]">
                <span><code>{`{customerName}`}</code></span>
                <span><code>{`{jobId}`}</code></span>
                <span><code>{`{deviceBrand}`}</code></span>
                <span><code>{`{category}`}</code></span>
                <span><code>{`{reportedIssue}`}</code></span>
                <span><code>{`{status}`}</code></span>
                <span><code>{`{technicianNotes}`}</code></span>
                <span><code>{`{amount}`}</code></span>
                <span><code>{`{googleReviewUrl}`}</code></span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Simulated WhatsApp Chat Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className={`p-5 rounded-2xl border space-y-4 ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    WA
                  </div>
                  <div>
                    <h3 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Live Customer Preview
                    </h3>
                    <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      What Karthikeyen receives on WhatsApp
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPreviewTab('welcome')}
                    className={`px-2 py-1 text-[11px] font-semibold rounded ${
                      previewTab === 'welcome' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Welcome
                  </button>
                  <button
                    onClick={() => setPreviewTab('status')}
                    className={`px-2 py-1 text-[11px] font-semibold rounded ${
                      previewTab === 'status' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Flow
                  </button>
                  <button
                    onClick={() => setPreviewTab('review')}
                    className={`px-2 py-1 text-[11px] font-semibold rounded ${
                      previewTab === 'review' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ⭐ Review
                  </button>
                </div>
              </div>

              {/* Chat bubble screen */}
              <div className={`p-4 rounded-xl border min-h-[380px] flex flex-col justify-end ${
                isDark ? 'bg-[#07131b] border-emerald-950/60' : 'bg-[#e5ddd5] border-slate-300'
              }`}>
                <div className="max-w-[92%] bg-emerald-900/90 text-white p-3.5 rounded-2xl rounded-tr-xs shadow-md space-y-2 text-xs leading-relaxed ml-auto">
                  <pre className="font-sans whitespace-pre-wrap break-words text-[11px] leading-relaxed">
                    {getPreviewText()}
                  </pre>
                  <div className="text-[10px] text-emerald-300 text-right">
                    Just now · Read ✓✓
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                  Ready to test with customer?
                </span>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
                >
                  Save & Apply Templates
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Profit & Loss Intelligence */}
      {activeTab === 'profitloss' && (
        <div className="space-y-6">
          
          {/* Key Profit & Loss Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Invoiced Revenue */}
            <div className={`p-5 rounded-2xl border ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <span className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Total Billed Sales
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className={`text-2xl font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  ₹{totalBilled.toLocaleString('en-IN')}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-700">
                  {activeInvoices.length} Bills
                </span>
              </div>
              <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Customer billed labor & hardware
              </p>
            </div>

            {/* Total Spare Parts Purchase Cost */}
            <div className={`p-5 rounded-2xl border ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <span className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Spares Purchase Cost
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className={`text-2xl font-bold font-mono ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                  ₹{totalSpareCosts.toLocaleString('en-IN')}
                </span>
                <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Item cost
                </span>
              </div>
              <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Hardware components used in repairs
              </p>
            </div>

            {/* Total Manual Extra Costs */}
            <div className={`p-5 rounded-2xl border ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <span className={`text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Extra Manual Expenses
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className={`text-2xl font-bold font-mono ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                  ₹{totalManualCosts.toLocaleString('en-IN')}
                </span>
                <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Transport/Lab
                </span>
              </div>
              <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Ad-hoc job costs entered per bill
              </p>
            </div>

            {/* Net Bill Profit & Margin */}
            <div className={`p-5 rounded-2xl border ${
              isDark ? 'bg-emerald-950/30 border-emerald-800' : 'bg-emerald-50 border-emerald-200 shadow-xs'
            }`}>
              <span className="text-xs font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Net Invoicing Profit
              </span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
                  ₹{totalInvoiceProfit.toLocaleString('en-IN')}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                  {overallMargin}% Margin
                </span>
              </div>
              <p className="text-[11px] mt-1 text-emerald-800 dark:text-emerald-300">
                Direct workshop profit after spares
              </p>
            </div>
          </div>

          {/* Itemized Profit & Loss by Invoice Table */}
          <div className={`p-6 rounded-2xl border space-y-4 ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Customer Bills Profit & Loss Ledger
                </h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Billed amount, purchase cost of spares, and net profit per invoice
                </p>
              </div>
              <Receipt className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
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
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 font-mono text-right">Billed Subtotal</th>
                      <th className="py-3 px-4 font-mono text-right">Spares Cost</th>
                      <th className="py-3 px-4 font-mono text-right">Extra Costs</th>
                      <th className="py-3 px-4 font-mono text-right">Net Profit</th>
                      <th className="py-3 px-4 text-center">Margin</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800/70' : 'divide-slate-100'}`}>
                    {activeInvoices.map((inv) => {
                      const cost = inv.purchaseCostTotal || 0;
                      const manual = inv.manualExtraCost || 0;
                      const profit = (inv.subtotal || 0) - cost - manual;
                      const margin = inv.subtotal > 0 ? Math.round((profit / inv.subtotal) * 100) : 0;

                      return (
                        <tr key={inv.id} className={isDark ? 'hover:bg-slate-900/60' : 'hover:bg-slate-50'}>
                          <td className={`py-3 px-4 font-mono font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                            {inv.invoiceNumber}
                          </td>
                          <td className={`py-3 px-4 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {inv.customerName}
                          </td>
                          <td className={`py-3 px-4 font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {inv.date}
                          </td>
                          <td className={`py-3 px-4 font-mono font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            ₹{inv.subtotal.toLocaleString('en-IN')}
                          </td>
                          <td className={`py-3 px-4 font-mono text-right ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                            ₹{cost.toLocaleString('en-IN')}
                          </td>
                          <td className={`py-3 px-4 font-mono text-right ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                            ₹{manual.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-right text-emerald-600">
                            +₹{profit.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              {margin}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-emerald-300 text-emerald-700 bg-emerald-50">
                              {inv.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Backup & Data Management */}
      {activeTab === 'backup' && (
        <div className={`p-6 rounded-2xl border space-y-6 ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div>
            <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Database Backup & Golden Customer Archive
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Export all workshop records (Golden Customers, Invoices, Vendor Bills, Parts) to a secure JSON file
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Export */}
            <div className={`p-5 rounded-xl border space-y-3 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <Download className="w-6 h-6 text-blue-600" />
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Export Full Backup JSON
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Download offline copy containing all 31 Golden Customers, Job Cards, and Billing History.
              </p>
              <button
                type="button"
                onClick={handleExport}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
              >
                <Download className="w-4 h-4" /> Export Backup
              </button>
            </div>

            {/* Import */}
            <div className={`p-5 rounded-xl border space-y-3 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <Upload className="w-6 h-6 text-purple-600" />
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Restore from Backup JSON
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Upload a previously exported `.json` file to restore all databases instantly.
              </p>
              <label className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg cursor-pointer">
                <Upload className="w-4 h-4" /> Select Backup File
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
            </div>

            {/* Reset */}
            <div className={`p-5 rounded-xl border space-y-3 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <RotateCcw className="w-6 h-6 text-rose-600" />
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Reset to Factory Defaults
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Restore clean 31 Golden Customer roster & seed records.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Reset all databases back to default Spider Grid Solutions 31 Golden Customers and seed records?')) {
                    resetToDefaultData();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-rose-600 border border-rose-300 hover:bg-rose-50 rounded-lg cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Reset Database
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
