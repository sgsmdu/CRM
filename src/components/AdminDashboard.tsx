import React, { useState, useEffect } from 'react';
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
  RefreshCw,
  Users,
  ShieldAlert,
  Key,
  Lock,
  Unlock,
  UserCheck,
  UserX,
  AlertTriangle
} from 'lucide-react';
import * as Acc from '../utils/accounting';
import { useSgs } from '../context/SgsContext';
import { AdminSettings, QuickServicePreset, DeviceCategory, BillingTheme, PandiyanBillingTheme, UserRole, AllowedUser } from '../types';
import { 
  DEFAULT_SGS_LOGO_DATA_URL, 
  OFFICIAL_SGS_LOGO_URL,
  DEFAULT_SGS_STAMP_DATA_URL, 
  DEFAULT_PANDIYAN_LOGO_DATA_URL, 
  DEFAULT_PANDIYAN_STAMP_DATA_URL,
  DEFAULT_SGS_QUOTATION_LETTERHEAD_BG,
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
    clearAllInputData,
    resetToDefaultData,
    currentUserEmail,
    setCurrentUserEmail,
    currentUserRole,
    setCurrentUserRole,
    isAdmin,
    canDelete,
    canEditCritical,
    allowedUsers,
    refreshAllowedUsers,
    saveAllowedUser,
    deleteAllowedUser,
  } = useSgs();
  
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'prefill' | 'billing_themes' | 'whatsapp' | 'users' | 'profitloss' | 'backup'>('prefill');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetSuccessToast, setResetSuccessToast] = useState<string | null>(null);

  // Local Form state for admin settings
  const [formData, setFormData] = useState<AdminSettings>(adminSettings);
  useEffect(() => {
    setFormData(adminSettings);
  }, [adminSettings]);
  const [newTechnician, setNewTechnician] = useState('');
  
  // New Quick Service state
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceHsn, setNewServiceHsn] = useState('998713');
  const [newServiceRate, setNewServiceRate] = useState<number>(500);
  const [newServiceCost, setNewServiceCost] = useState<number>(50);
  const [newServiceCategory, setNewServiceCategory] = useState<DeviceCategory>('laptop');

  // Preview message tab
  const [previewTab, setPreviewTab] = useState<'welcome' | 'status' | 'review' | 'payment_pending'>('payment_pending');

  // RBAC User Form state
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserDisplayName, setNewUserDisplayName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('user');
  const [newUserNotes, setNewUserNotes] = useState('');
  const [userOperationStatus, setUserOperationStatus] = useState<string | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);

  // PaddleOCR connection test state
  const [testingPaddleOcr, setTestingPaddleOcr] = useState(false);
  const [paddleTestResult, setPaddleTestResult] = useState<{ online: boolean; message: string } | null>(null);

  const handleTestPaddleOcr = async () => {
    setTestingPaddleOcr(true);
    setPaddleTestResult(null);
    try {
      const res = await fetch('/api/test-paddleocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paddleOcrApiUrl: formData.paddleOcrApiUrl || 'http://localhost:8080/ocr',
          paddleOcrToken: formData.paddleOcrToken,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPaddleTestResult({ online: true, message: data.message || `Connected (${data.responseTimeMs}ms)!` });
      } else {
        setPaddleTestResult({ online: false, message: data.error || 'Server offline or unreachable.' });
      }
    } catch (err: any) {
      setPaddleTestResult({ online: false, message: err.message || 'Network connection failed.' });
    } finally {
      setTestingPaddleOcr(false);
    }
  };

  const handleFieldChange = <K extends keyof AdminSettings>(field: K, value: AdminSettings[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveSettings = () => {
    updateAdminSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim()) {
      setUserOperationStatus('Please enter a valid user email address.');
      return;
    }
    setIsSavingUser(true);
    setUserOperationStatus('Connecting to Firestore allowed_users...');
    try {
      await saveAllowedUser({
        email: newUserEmail.trim(),
        displayName: newUserDisplayName.trim() || undefined,
        role: newUserRole,
        notes: newUserNotes.trim() || undefined,
      });
      setUserOperationStatus(`Successfully saved ${newUserEmail.trim()} with role ${newUserRole.toUpperCase()}!`);
      setNewUserEmail('');
      setNewUserDisplayName('');
      setNewUserRole('user');
      setNewUserNotes('');
      setTimeout(() => setUserOperationStatus(null), 4000);
    } catch (err: any) {
      setUserOperationStatus(`Error: ${err?.message || 'Failed to save user'}`);
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleToggleRole = async (user: AllowedUser) => {
    if (user.email.toLowerCase() === 'spidergridsolutions@gmail.com') {
      window.alert('The organization root administrator account (spidergridsolutions@gmail.com) must always remain an Admin.');
      return;
    }
    const nextRole: UserRole = user.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Change role for ${user.email} from ${user.role.toUpperCase()} to ${nextRole.toUpperCase()}?`)) return;
    try {
      await saveAllowedUser({
        ...user,
        role: nextRole,
      });
    } catch (err: any) {
      window.alert(`Failed to update role: ${err.message}`);
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (email.toLowerCase() === 'spidergridsolutions@gmail.com') {
      window.alert('Cannot delete the organization primary administrator account.');
      return;
    }
    if (!window.confirm(`Are you sure you want to remove ${email} from allowed users?`)) return;
    try {
      await deleteAllowedUser(email);
    } catch (err: any) {
      window.alert(`Failed to delete user: ${err.message}`);
    }
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
  // Billed (taxable) value AFTER discount, so margin and profit match each other
  const totalBilled = Acc.round2(activeInvoices.reduce((sum, inv) => sum + Acc.netOfDiscount(inv).taxable + (inv.roundOff || 0), 0));
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
    paidAmount: '1,000',
    pendingBalance: '2,200',
    workshopUpiId: formData.workshopUpiId || 'spidergridsolutions@okaxis',
    googleReviewUrl: formData.googleReviewUrl || 'https://g.page/r/spidergridsolutions/review',
    workshopPhone: formData.workshopPhone || '+91 9176795665',
  };

  const getPreviewText = () => {
    let tpl = '';
    if (previewTab === 'welcome') tpl = formData.welcomeMessageTemplate;
    else if (previewTab === 'status') tpl = formData.statusMessageTemplate;
    else if (previewTab === 'payment_pending') tpl = formData.paymentPendingMessageTemplate || '';
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
      .replace(/{paidAmount}/g, sampleCustomer.paidAmount)
      .replace(/{pendingBalance}/g, sampleCustomer.pendingBalance)
      .replace(/{workshopUpiId}/g, sampleCustomer.workshopUpiId)
      .replace(/{googleReviewUrl}/g, sampleCustomer.googleReviewUrl)
      .replace(/{workshopPhone}/g, sampleCustomer.workshopPhone);
  };

  const handleExport = () => {
    const jsonStr = exportDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sgs-backup-${Acc.todayLocal()}.json`;
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

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900 rounded-xl transition-all cursor-pointer"
              title="Reset database to clean 31 verified customers and default records"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Factory Defaults</span>
            </button>
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
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-xs'
                : (isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Allowed Users & Roles (RBAC)</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              isAdmin ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
            }`}>
              {allowedUsers.length}
            </span>
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
        <div className="space-y-6">
          {!canEditCritical && (
            <div className={`p-4 rounded-xl border flex items-center gap-3 ${
              isDark ? 'bg-amber-950/30 border-amber-800 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <Lock className="w-5 h-5 text-amber-500 shrink-0" />
              <div className="text-xs">
                <strong className="font-bold">Staff Read-Only Mode:</strong> Core firm settings (Legal Trade Name, GSTIN, UPI ID, GST Tax Rate, Bank Accounts) are locked for non-admin accounts. Contact Admin (<code>spidergridsolutions@gmail.com</code>) to request changes.
              </div>
            </div>
          )}

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
                  <label className={`block text-xs font-semibold mb-1 flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <span>Workshop Legal Trade Name</span>
                    {!canEditCritical && <Lock className="w-3 h-3 text-amber-500" />}
                  </label>
                  <input
                    type="text"
                    disabled={!canEditCritical}
                    value={formData.workshopName}
                    onChange={(e) => handleFieldChange('workshopName', e.target.value)}
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      !canEditCritical ? 'opacity-70 cursor-not-allowed bg-slate-100 dark:bg-slate-900 text-slate-500' :
                      isDark ? 'bg-slate-950 border border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <span>GSTIN / MSME Udyam Number</span>
                    {!canEditCritical && <Lock className="w-3 h-3 text-amber-500" />}
                  </label>
                  <input
                    type="text"
                    disabled={!canEditCritical}
                    value={formData.workshopGstin}
                    onChange={(e) => handleFieldChange('workshopGstin', e.target.value)}
                    className={`w-full rounded-lg px-3 py-2 text-xs font-mono uppercase focus:outline-none ${
                      !canEditCritical ? 'opacity-70 cursor-not-allowed bg-slate-100 dark:bg-slate-900 text-slate-500' :
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
                  <label className={`block text-xs font-semibold mb-1 flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <span>Workshop UPI ID (VPA for QR / Online Customer Payment)</span>
                    {!canEditCritical && <Lock className="w-3 h-3 text-amber-500" />}
                  </label>
                  <div className="relative">
                    <CreditCard className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                    <input
                      type="text"
                      disabled={!canEditCritical}
                      value={formData.workshopUpiId}
                      onChange={(e) => handleFieldChange('workshopUpiId', e.target.value)}
                      placeholder="e.g. spidergridsolutions@okaxis"
                      className={`w-full rounded-lg pl-9 pr-3 py-2 text-xs font-mono focus:outline-none ${
                        !canEditCritical ? 'opacity-70 cursor-not-allowed bg-slate-100 dark:bg-slate-900 text-slate-500' :
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
                  <label className={`block text-xs font-semibold mb-1 flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <span>Default GST Tax Rate</span>
                    {!canEditCritical && <Lock className="w-3 h-3 text-amber-500" />}
                  </label>
                  <select
                    disabled={!canEditCritical}
                    value={formData.defaultGstPercent}
                    onChange={(e) => handleFieldChange('defaultGstPercent', Number(e.target.value))}
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      !canEditCritical ? 'opacity-70 cursor-not-allowed bg-slate-100 dark:bg-slate-900 text-slate-500' :
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

          {/* PaddleOCR & Multi-Page Document Scanner Configuration */}
          <div className={`lg:col-span-3 p-6 rounded-2xl border space-y-5 ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold text-lg">
                  ⚡
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      PaddleOCR API & Multi-Page Invoice Scanner
                    </h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      High Speed · Unlimited Pages
                    </span>
                  </div>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Configure local or self-hosted PaddleOCR API server for fast, private invoice extraction with multi-page support
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    PaddleOCR Server API URL *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.paddleOcrApiUrl || ''}
                      onChange={(e) => handleFieldChange('paddleOcrApiUrl', e.target.value)}
                      placeholder="http://localhost:8080/ocr"
                      className={`flex-1 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                        isDark ? 'bg-slate-950 border border-slate-800 text-white focus:border-indigo-500' : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-indigo-600'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleTestPaddleOcr}
                      disabled={testingPaddleOcr}
                      className="px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer transition-colors shadow-2xs shrink-0 disabled:opacity-50"
                    >
                      {testingPaddleOcr ? 'Testing...' : 'Test Connection'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Supports PaddleHub Serving (<code>/predict/ocr_system</code>), PaddleX Serving (<code>/ocr</code>), or custom FastAPI/Flask wrappers.
                  </p>
                </div>

                {paddleTestResult && (
                  <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    paddleTestResult.online
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-600'
                  }`}>
                    <span>{paddleTestResult.online ? '✓' : '⚠️'}</span>
                    <span className="font-semibold">{paddleTestResult.message}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Optional Authorization Token (Bearer)
                    </label>
                    <input
                      type="password"
                      value={formData.paddleOcrToken || ''}
                      onChange={(e) => handleFieldChange('paddleOcrToken', e.target.value)}
                      placeholder="Optional API token"
                      className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                        isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Default Scanner OCR Engine
                    </label>
                    <select
                      value={formData.defaultOcrEngine || 'paddleocr'}
                      onChange={(e) => handleFieldChange('defaultOcrEngine', e.target.value as any)}
                      className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                        isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="paddleocr">⚡ PaddleOCR (Recommended - Multi-Page & Unlimited)</option>
                      <option value="gemini">🤖 Google Gemini AI OCR</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Instructions Callout */}
              <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                isDark ? 'bg-indigo-950/20 border-indigo-900/40 text-indigo-200' : 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
              }`}>
                <p className="font-bold">🚀 How to run PaddleOCR Server:</p>
                <div className="font-mono text-[11px] bg-black/20 p-2 rounded-lg space-y-1">
                  <p># Install PaddleOCR:</p>
                  <p className="text-emerald-400">Use your paddleocr-env Python environment with paddlepaddle and paddleocr installed</p>
                  <p className="pt-1"># Start OCR Hub Serving:</p>
                  <p className="text-emerald-400">paddlex --serve --pipeline OCR --device cpu --port 8080</p>
                </div>
                <p className="text-[11px] opacity-85">
                  Multi-page invoices from Redington, Siva Printer Spares, or CompuServe are automatically processed and line items consolidated!
                </p>
              </div>
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

              {/* SGS Logo, Stamp & Quotation Letterhead Attachments */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                
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
                      onClick={() => handleFieldChange('workshopLogoUrl', OFFICIAL_SGS_LOGO_URL)}
                      className="text-[10px] font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                      title="Reset to official Spider Grid Solutions logo"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Reset Official Logo
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

                {/* SGS Quotation Letterhead Background */}
                <div className={`p-4 rounded-xl border space-y-3 ${
                  isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                      <FileText className="w-4 h-4" />
                      Quotation Letterhead A4
                    </span>
                    <button
                      type="button"
                      onClick={() => handleFieldChange('quotationBackgroundUrl', DEFAULT_SGS_QUOTATION_LETTERHEAD_BG)}
                      className="text-[10px] font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                      title="Reset to default high-res SVG letterhead"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Reset Default
                    </button>
                  </div>
                  
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center min-h-[70px] overflow-hidden">
                    {formData.quotationBackgroundUrl ? (
                      <img 
                        src={formData.quotationBackgroundUrl} 
                        alt="Letterhead Preview" 
                        className="max-h-16 w-auto object-contain rounded border border-slate-200 dark:border-slate-700 shadow-2xs" 
                      />
                    ) : (
                      <span className="text-[11px] text-slate-400">Default SVG Vector Active</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={formData.quotationBackgroundUrl || ''}
                      onChange={(e) => handleFieldChange('quotationBackgroundUrl', e.target.value)}
                      placeholder="Image URL or Base64 data..."
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    />
                    <label className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200 cursor-pointer">
                      <Upload className="w-3 h-3" /> Upload Letterhead (PNG/JPG)
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => handleFieldChange('quotationBackgroundUrl', reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Quotation Proposal Header & Footer Banners */}
                <div className={`p-4 rounded-xl border space-y-3 sm:col-span-3 ${
                  isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                        <Layers className="w-4 h-4" />
                        Quotation Proposal Header & Footer Banners
                      </span>
                      <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Custom full-width banner images printed at the top and bottom of customer A4 Quotations
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {/* Header Image */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Default Quotation Header Image
                        </label>
                        {formData.quotationHeaderImageUrl && (
                          <button
                            type="button"
                            onClick={() => handleFieldChange('quotationHeaderImageUrl', undefined)}
                            className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center min-h-[60px] overflow-hidden">
                        {formData.quotationHeaderImageUrl ? (
                          <img 
                            src={formData.quotationHeaderImageUrl} 
                            alt="Header Preview" 
                            className="max-h-14 w-auto object-contain rounded" 
                          />
                        ) : (
                          <span className="text-[11px] text-slate-400">Standard Text & Logo Header Active</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.quotationHeaderImageUrl || ''}
                          onChange={(e) => handleFieldChange('quotationHeaderImageUrl', e.target.value)}
                          placeholder="Header Image URL or Base64..."
                          className={`flex-1 rounded-lg px-2.5 py-1 text-xs focus:outline-none ${
                            isDark ? 'bg-slate-900 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                          }`}
                        />
                        <label className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200 cursor-pointer shrink-0">
                          <Upload className="w-3 h-3" /> Upload
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = () => handleFieldChange('quotationHeaderImageUrl', reader.result as string);
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Footer Image */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Default Quotation Footer Image
                        </label>
                        {formData.quotationFooterImageUrl && (
                          <button
                            type="button"
                            onClick={() => handleFieldChange('quotationFooterImageUrl', undefined)}
                            className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center min-h-[60px] overflow-hidden">
                        {formData.quotationFooterImageUrl ? (
                          <img 
                            src={formData.quotationFooterImageUrl} 
                            alt="Footer Preview" 
                            className="max-h-14 w-auto object-contain rounded" 
                          />
                        ) : (
                          <span className="text-[11px] text-slate-400">Standard Terms & Sign Footer Active</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.quotationFooterImageUrl || ''}
                          onChange={(e) => handleFieldChange('quotationFooterImageUrl', e.target.value)}
                          placeholder="Footer Image URL or Base64..."
                          className={`flex-1 rounded-lg px-2.5 py-1 text-xs focus:outline-none ${
                            isDark ? 'bg-slate-900 border border-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-900'
                          }`}
                        />
                        <label className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200 cursor-pointer shrink-0">
                          <Upload className="w-3 h-3" /> Upload
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = () => handleFieldChange('quotationFooterImageUrl', reader.result as string);
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* SGS Bank Account Details */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <span>SGS Bank Account Details</span>
                    {!canEditCritical && <Lock className="w-3 h-3 text-amber-500" />}
                  </h3>
                  {!canEditCritical && (
                    <span className="text-[10px] text-amber-500 font-semibold">Protected (Admin Only)</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Bank Name</label>
                    <input
                      type="text"
                      disabled={!canEditCritical}
                      value={formData.bankName || ''}
                      onChange={(e) => handleFieldChange('bankName', e.target.value)}
                      placeholder="HDFC Bank"
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs ${
                        !canEditCritical ? 'opacity-70 cursor-not-allowed bg-slate-100 dark:bg-slate-900 text-slate-500' :
                        isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Account Number</label>
                    <input
                      type="text"
                      disabled={!canEditCritical}
                      value={formData.bankAccountNumber || ''}
                      onChange={(e) => handleFieldChange('bankAccountNumber', e.target.value)}
                      placeholder="50200084729103"
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono ${
                        !canEditCritical ? 'opacity-70 cursor-not-allowed bg-slate-100 dark:bg-slate-900 text-slate-500' :
                        isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      disabled={!canEditCritical}
                      value={formData.bankIfsc || ''}
                      onChange={(e) => handleFieldChange('bankIfsc', e.target.value)}
                      placeholder="HDFC0001234"
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono uppercase ${
                        !canEditCritical ? 'opacity-70 cursor-not-allowed bg-slate-100 dark:bg-slate-900 text-slate-500' :
                        isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Branch Name</label>
                    <input
                      type="text"
                      disabled={!canEditCritical}
                      value={formData.bankBranch || ''}
                      onChange={(e) => handleFieldChange('bankBranch', e.target.value)}
                      placeholder="Anna Nagar, Madurai"
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs ${
                        !canEditCritical ? 'opacity-70 cursor-not-allowed bg-slate-100 dark:bg-slate-900 text-slate-500' :
                        isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'
                      }`}
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

              {/* SGS Quotation Terms */}
              <div className="border-t pt-4 space-y-2">
                <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Manual Quotation Standard Terms & Conditions
                </label>
                <textarea
                  rows={3}
                  value={formData.quotationTerms || ''}
                  onChange={(e) => handleFieldChange('quotationTerms', e.target.value)}
                  placeholder="Quotation proposal terms & conditions..."
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
                rows={5}
                value={formData.reviewMessageTemplate}
                onChange={(e) => handleFieldChange('reviewMessageTemplate', e.target.value)}
                className={`w-full rounded-xl p-3 text-xs font-mono focus:outline-none leading-relaxed ${
                  isDark ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
                }`}
              />
            </div>

            {/* Template 4: Payment Pending Reminder Template */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className={`text-xs font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>4. Payment Pending Reminder Template</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-normal">Sent for Pending Balance</span>
                </label>
                <button
                  type="button"
                  onClick={() => setPreviewTab('payment_pending')}
                  className="text-xs text-rose-600 hover:underline cursor-pointer"
                >
                  Preview Below
                </button>
              </div>
              <textarea
                rows={6}
                value={formData.paymentPendingMessageTemplate || ''}
                onChange={(e) => handleFieldChange('paymentPendingMessageTemplate', e.target.value)}
                placeholder="Payment pending reminder message..."
                className={`w-full rounded-xl p-3 text-xs font-mono focus:outline-none leading-relaxed ${
                  isDark ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-rose-500' : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-rose-600'
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
                <span><code>{`{paidAmount}`}</code></span>
                <span><code>{`{pendingBalance}`}</code></span>
                <span><code>{`{workshopUpiId}`}</code></span>
                <span><code>{`{workshopPhone}`}</code></span>
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
                  <button
                    onClick={() => setPreviewTab('payment_pending')}
                    className={`px-2 py-1 text-[11px] font-semibold rounded ${
                      previewTab === 'payment_pending' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    💳 Pending
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

      {/* Tab: Allowed Users & Roles (RBAC via Firestore allowed_users) */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          
          {/* Active Session & Role Status Banner */}
          <div className={`p-6 rounded-2xl border ${
            isAdmin 
              ? (isDark ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-800/60' : 'bg-gradient-to-r from-emerald-50 via-white to-white border-emerald-200')
              : (isDark ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-amber-800/60' : 'bg-gradient-to-r from-amber-50 via-white to-white border-amber-200')
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-2xs ${
                    isAdmin 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-amber-600 text-white'
                  }`}>
                    {isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    {isAdmin ? '👑 Administrator Mode' : '👤 Staff User Mode'}
                  </span>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                  }`}>
                    Active Email: {currentUserEmail}
                  </span>
                </div>
                <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Role-Based Access Control (RBAC) via Firestore <code>allowed_users</code>
                </h2>
                <p className={`text-xs max-w-2xl ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {isAdmin ? (
                    <>You have <strong>full permissions</strong>: Create, read, update, and delete any record, plus access to edit organizational firm details, bank accounts, and manage allowed users.</>
                  ) : (
                    <>You are in <strong>restricted staff mode</strong>: You can create and process Job Cards, customer invoices, and stock entries, but <strong>record deletion is locked</strong> and critical firm fields cannot be edited.</>
                  )}
                </p>
              </div>

              {/* Quick Testing Switcher */}
              <div className={`p-3 rounded-xl border flex flex-col gap-2 shrink-0 ${
                isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-slate-500">Live Role Testing Switcher:</span>
                  <button
                    type="button"
                    onClick={() => refreshAllowedUsers()}
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentUserEmail('spidergridsolutions@gmail.com');
                      setCurrentUserRole('admin');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      currentUserRole === 'admin'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : (isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300')
                    }`}
                  >
                    👑 Test as Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentUserEmail('staff@spidergridsolutions.com');
                      setCurrentUserRole('user');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      currentUserRole === 'user'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : (isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300')
                    }`}
                  >
                    👤 Test as Staff (User)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Form & Table Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Authorize / Add User in Firestore */}
            <div className={`lg:col-span-5 p-6 rounded-2xl border space-y-4 ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-blue-600" />
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Authorize User in Firestore
                  </h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold">
                  allowed_users collection
                </span>
              </div>

              {!isAdmin && (
                <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                  isDark ? 'bg-amber-950/30 border-amber-800 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}>
                  <Lock className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Only administrators can grant or change user roles.</span>
                </div>
              )}

              <form onSubmit={handleSaveUser} className="space-y-3.5">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Google Account / Login Email *
                  </label>
                  <input
                    type="email"
                    required
                    disabled={!isAdmin}
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="e.g. employee@spidergridsolutions.com"
                    className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                      !isAdmin ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-950 text-slate-500' :
                      isDark ? 'bg-slate-950 border border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
                    }`}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Matching email fetched from Firestore <code>allowed_users</code> collection determines active role.
                  </p>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Staff / User Full Name
                  </label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={newUserDisplayName}
                    onChange={(e) => setNewUserDisplayName(e.target.value)}
                    placeholder="e.g. Priya - Service Coordinator"
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      !isAdmin ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-950 text-slate-500' :
                      isDark ? 'bg-slate-950 border border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Assigned Role & Permissions *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => setNewUserRole('user')}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        newUserRole === 'user'
                          ? 'border-amber-500 ring-2 ring-amber-500 bg-amber-50/20 shadow-xs'
                          : (isDark ? 'border-slate-800 hover:border-slate-700 bg-slate-950' : 'border-slate-200 bg-slate-50')
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>User (Staff)</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Create & edit operations. No deletes, no critical firm edits.
                      </p>
                    </button>

                    <button
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => setNewUserRole('admin')}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        newUserRole === 'admin'
                          ? 'border-emerald-500 ring-2 ring-emerald-500 bg-emerald-50/20 shadow-xs'
                          : (isDark ? 'border-slate-800 hover:border-slate-700 bg-slate-950' : 'border-slate-200 bg-slate-50')
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Administrator</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Full access: CRUD all records, manage users & firm settings.
                      </p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Role Notes / Designation
                  </label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={newUserNotes}
                    onChange={(e) => setNewUserNotes(e.target.value)}
                    placeholder="e.g. CCTV & Network Engineer"
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      !isAdmin ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-950 text-slate-500' :
                      isDark ? 'bg-slate-950 border border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
                    }`}
                  />
                </div>

                {userOperationStatus && (
                  <p className="text-xs font-medium text-blue-600 animate-in fade-in">
                    {userOperationStatus}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!isAdmin || isSavingUser}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingUser ? 'Saving...' : 'Authorize User in Firestore'}</span>
                </button>
              </form>
            </div>

            {/* Right: Allowed Users Directory Table */}
            <div className={`lg:col-span-7 p-6 rounded-2xl border space-y-4 ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Authorized Users Directory
                    </h3>
                    <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Synced with Firestore collection <code>allowed_users</code>
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-semibold text-slate-400">
                  {allowedUsers.length} user{allowedUsers.length === 1 ? '' : 's'} registered
                </span>
              </div>

              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {allowedUsers.map((u) => {
                  const isCurrentActive = currentUserEmail.toLowerCase() === u.email.toLowerCase();
                  const isRootAdmin = u.email.toLowerCase() === 'spidergridsolutions@gmail.com';
                  const isUserAdmin = u.role === 'admin';

                  return (
                    <div
                      key={u.email}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isCurrentActive
                          ? (isDark ? 'bg-blue-950/20 border-blue-800/80 ring-1 ring-blue-500/40' : 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-400/40')
                          : (isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-200')
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                            isUserAdmin 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-amber-600 text-white'
                          }`}>
                            {isUserAdmin ? '👑' : '👤'}
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {u.displayName || u.email.split('@')[0]}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isUserAdmin 
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}>
                                {isUserAdmin ? '👑 Admin' : '👤 Staff (User)'}
                              </span>
                              {isCurrentActive && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                  ● Active Session
                                </span>
                              )}
                              {isRootAdmin && (
                                <span className="text-[10px] font-semibold text-slate-400">
                                  (Primary Organization Owner)
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                              {u.email}
                            </p>
                            {u.notes && (
                              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                {u.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {/* Account Switcher */}
                          {!isCurrentActive && (
                            <button
                              type="button"
                              onClick={() => {
                                setCurrentUserEmail(u.email);
                                setCurrentUserRole(u.role);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 hover:bg-blue-100 border border-blue-200 dark:border-blue-900 cursor-pointer"
                              title="Switch active user to test this role"
                            >
                              Log In As
                            </button>
                          )}

                          {/* Toggle Role Button */}
                          {isAdmin && !isRootAdmin && (
                            <button
                              type="button"
                              onClick={() => handleToggleRole(u)}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                                isUserAdmin
                                  ? 'border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
                                  : 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                              }`}
                              title={`Switch to ${isUserAdmin ? 'User' : 'Admin'}`}
                            >
                              {isUserAdmin ? 'Demote to Staff' : 'Promote to Admin'}
                            </button>
                          )}

                          {/* Delete User */}
                          {isAdmin && !isRootAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.email)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Remove user from allowed_users"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Information Footnote */}
              <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Firestore Security & Rule Enforcement</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Roles are enforced in both the client UI (disabling delete operations and critical fields for <code>user</code> role) and through Firestore Security Rules where <code>allowed_users/{`{email}`}</code> defines access privileges.
                </p>
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
                    {activeInvoices.map((inv, idx) => {
                      const cost = inv.purchaseCostTotal || 0;
                      const manual = inv.manualExtraCost || 0;
                      const profit = (inv.subtotal || 0) - cost - manual;
                      const margin = inv.subtotal > 0 ? Math.round((profit / inv.subtotal) * 100) : 0;

                      return (
                        <tr key={`${inv.id}-${idx}`} className={isDark ? 'hover:bg-slate-900/60' : 'hover:bg-slate-50'}>
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
              Database Backup & Customer Directory Archive
            </h2>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Export all workshop records (Customers, Invoices, Vendor Bills, Parts) to a secure JSON file
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
                Download offline copy containing all 31 Verified Customers, Job Cards, and Billing History.
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
                Restore clean 31 Verified Customer roster & seed records.
              </p>
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-rose-600 border border-rose-300 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Reset Database
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Success Toast */}
      {resetSuccessToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4" />
          <span>{resetSuccessToast}</span>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-600">
                  Reset to Factory Defaults?
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Restore clean Spider Grid Solutions database
                </p>
              </div>
            </div>

            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              This will restore all <strong>31 verified customer accounts</strong>, default inventory stock items, seed job cards, staff records, and cash flow entries to fresh factory defaults.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className={`px-4 py-2 text-xs rounded-xl font-medium cursor-pointer ${
                  isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  resetToDefaultData();
                  setShowResetModal(false);
                  setResetSuccessToast('Factory Defaults Restored! All 31 Verified Customers and clean records reloaded.');
                  setTimeout(() => setResetSuccessToast(null), 4000);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Yes, Restore Defaults
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
