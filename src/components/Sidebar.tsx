import { todayLocal } from '../utils/accounting';
import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Wrench, 
  Boxes, 
  Receipt, 
  CreditCard, 
  Plus, 
  Download, 
  Upload, 
  RotateCcw,
  Sparkles,
  Trash2,
  FileSpreadsheet,
  Sun,
  Moon,
  ShieldCheck,
  Share2,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ListOrdered,
  FileText,
  KeyRound,
  ClipboardList,
  ChevronDown,
  UserCheck,
  Wallet
} from 'lucide-react';
import { useSgs } from '../context/SgsContext';
import { PWAInstallButton } from './PWAInstallButton';
import { NavTab } from './Navbar';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenNewJobModal: () => void;
  onOpenGoogleSheetsModal: () => void;
  onOpenGoogleContactsModal?: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenNewJobModal,
  onOpenGoogleSheetsModal,
  onOpenGoogleContactsModal,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const { customers, jobCards, quotations = [], leadSources, exportDataJson, importDataJson, clearAllInputData, resetToDefaultData, theme, toggleTheme } = useSgs();
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [resetToast, setResetToast] = useState<string | null>(null);
  const isDark = theme === 'dark';

  const activeJobsCount = jobCards.filter(j => j.status !== 'delivered' && j.status !== 'completed').length;
  const pendingTasksCount = jobCards.filter(j => j.status !== 'work_completed' && j.status !== 'completed' && j.status !== 'delivered').length;
  const pendingQuotesCount = quotations.filter(q => q.status === 'Pending Decision' || q.status === 'Draft').length;

  const handleExport = () => {
    const jsonStr = exportDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sgs-backup-${todayLocal()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowSettingsMenu(false);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importDataJson(content);
      if (success) {
        setResetToast('Data backup successfully restored!');
        setTimeout(() => setResetToast(null), 3500);
      } else {
        setResetToast('Failed to parse backup JSON. Please check file format.');
        setTimeout(() => setResetToast(null), 3500);
      }
    };
    reader.readAsText(file);
    setShowSettingsMenu(false);
  };

  const handleConfirmClearAll = () => {
    clearAllInputData();
    setShowClearConfirmModal(false);
    setShowSettingsMenu(false);
    setResetToast('All input data cleared! App is now 100% fresh with 0 records.');
    setTimeout(() => setResetToast(null), 4000);
  };

  const handleConfirmReset = () => {
    resetToDefaultData();
    setShowResetConfirmModal(false);
    setShowSettingsMenu(false);
    setResetToast('Sample Demo Data Loaded! All 31 Verified Customers and clean records reloaded.');
    setTimeout(() => setResetToast(null), 4000);
  };

  // Expandable submenu state for Job Cards and Vendor Hub
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    jobs_group: true,
    vendors_group: false,
  });

  // Keep parent group expanded if any child route is active
  React.useEffect(() => {
    if (activeTab === 'jobs' || activeTab === 'job_card_list') {
      setExpandedGroups(prev => ({ ...prev, jobs_group: true }));
    } else if (activeTab === 'inventory' || activeTab === 'vendors') {
      setExpandedGroups(prev => ({ ...prev, vendors_group: true }));
    }
  }, [activeTab]);

  interface SubMenuItem {
    id: NavTab;
    label: string;
    icon: React.ElementType;
    count?: number;
  }

  interface MenuItem {
    id: string;
    label: string;
    icon: React.ElementType;
    count?: number;
    subItems?: SubMenuItem[];
  }

  // EXACT MAIN MENU ORDER (1 to 12)
  const menuItems: MenuItem[] = [
    // 1. Command Center
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },

    // 2. Customer Directory
    { id: 'customers', label: 'Customer Directory', count: customers.length, icon: Users },

    // 3. Job Cards & Timeline
    { 
      id: 'jobs_group', 
      label: 'Job Cards & Timeline', 
      icon: Wrench, 
      count: activeJobsCount,
      subItems: [
        { id: 'jobs', label: 'Job Card Detail List', count: activeJobsCount, icon: FileText },
        { id: 'job_card_list', label: 'Job Card (Status-wise)', count: jobCards.length, icon: ClipboardList }
      ]
    },

    // 4. Task Assign & Priority
    { id: 'allocation', label: 'Task Assign & Priority', count: pendingTasksCount, icon: ListOrdered },

    // 5. Staff & Attendance
    { id: 'employees', label: 'Staff & Attendance', icon: UserCheck },

    // 6. Vendor Hub & Bill Scan
    {
      id: 'vendors_group',
      label: 'Vendor Hub & Bill Scan',
      icon: Receipt,
      subItems: [
        { id: 'inventory', label: 'Stock & Parts Inventory', icon: Boxes },
        { id: 'vendors', label: 'Vendor Bills & Bill Scan', icon: Receipt }
      ]
    },

    // 7. Billing & Invoices
    { id: 'billing', label: 'Billing & Invoices', icon: CreditCard },

    // Money Flow
    { id: 'money_flow', label: 'Money Flow', icon: Wallet },

    // 8. Manual Quotations
    { id: 'quotations', label: 'Manual Quotations', count: pendingQuotesCount, icon: FileText },

    // 9. GST Reports & Filing
    { id: 'reports', label: 'GST Reports & Filing', icon: FileSpreadsheet },

    // 10. Price Code Calculator
    { id: 'price_calculator', label: 'Price Code Calculator', icon: KeyRound },

    // 11. Lead Sources
    { id: 'leads', label: 'Lead Sources', count: leadSources.length, icon: Share2 },

    // 12. Admin Hub & Settings
    { id: 'admin', label: 'Admin Hub & Settings', icon: ShieldCheck },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out border-r w-72 sm:w-80 max-w-[85vw] ${
          isCollapsed ? 'lg:w-20' : 'lg:w-64'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          isDark ? 'bg-[#080d1a] border-slate-800/90 text-slate-100' : 'bg-white border-slate-200/90 text-slate-900 shadow-md'
        }`}
      >
        {/* Brand & Toggle Header */}
        <div className={`p-4 border-b flex items-center justify-between gap-2 ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 p-1 flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
              <img 
                src="/assets/aistudio/Final_logo51_79c6a806.png" 
                alt="Spider Grid Solutions" 
                className="w-full h-full object-contain select-none" 
              />
            </div>
            <div className={`flex flex-col min-w-0 ${isCollapsed ? 'lg:hidden' : ''}`}>
              <span className="text-sm font-bold tracking-tight truncate">
                Spider Grid Solutions
              </span>
              <span className={`text-[10px] font-medium truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Operations & CRM · Madurai
              </span>
            </div>
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(prev => !prev)}
            className={`hidden lg:flex p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
              isDark ? 'text-slate-400 hover:text-white bg-slate-900 border-slate-800' : 'text-slate-600 hover:text-slate-900 bg-slate-100 border-slate-200'
            }`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/50 cursor-pointer"
            title="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action Button: New Job Card */}
        <div className="p-3">
          <button
            onClick={() => {
              onOpenNewJobModal();
              setIsMobileOpen(false);
            }}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-xl transition-all shadow-md shadow-blue-600/25 cursor-pointer ${
              isCollapsed ? 'lg:px-0' : ''
            }`}
            title="Create New Job Card"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className={isCollapsed ? 'lg:hidden' : ''}>New Job Card</span>
          </button>
        </div>

        {/* Navigation Menu List */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto scrollbar-thin">
          {menuItems.map((item) => {
            const Icon = item.icon;
            
            // Handle regular items without submenus
            if (!item.subItems) {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id as NavTab);
                    setIsMobileOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                      : isDark
                      ? 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  } ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}`}
                  title={item.label}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className={`flex-1 text-left truncate ${isCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isCollapsed ? 'lg:hidden' : ''
                    } ${
                      isActive ? 'bg-white/20 text-white' : (isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700')
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            }

            // Handle items WITH submenus (Job Cards & Timeline, Vendor Hub & Bill Scan)
            const isGroupActive = item.subItems.some(sub => sub.id === activeTab);
            const isExpanded = !!expandedGroups[item.id];

            return (
              <div key={item.id} className="space-y-1">
                {/* Parent Group Header Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (isCollapsed) {
                      setIsCollapsed(false);
                      setExpandedGroups(prev => ({ ...prev, [item.id]: true }));
                    } else {
                      setExpandedGroups(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isGroupActive && !isExpanded
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                      : isGroupActive
                      ? (isDark ? 'bg-slate-900/90 text-blue-400 font-bold border border-slate-800' : 'bg-blue-50/80 text-blue-700 font-bold border border-blue-100')
                      : isDark
                      ? 'text-slate-300 hover:text-white hover:bg-slate-900/80'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  } ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}`}
                  title={item.label}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className={`flex-1 text-left truncate ${isCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                  
                  {item.count !== undefined && item.count > 0 && !isExpanded && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isCollapsed ? 'lg:hidden' : ''
                    } ${
                      isGroupActive ? 'bg-white/20 text-white' : (isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700')
                    }`}>
                      {item.count}
                    </span>
                  )}

                  <span className={`${isCollapsed ? 'lg:hidden' : ''} text-slate-400 shrink-0`}>
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </span>
                </button>

                {/* Submenu Dropdown List (Indented) */}
                {isExpanded && !isCollapsed && (
                  <div className={`ml-4 pl-3 border-l space-y-1 transition-all ${
                    isDark ? 'border-slate-800' : 'border-slate-200'
                  }`}>
                    {item.subItems.map(sub => {
                      const SubIcon = sub.icon;
                      const isSubActive = activeTab === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => {
                            onTabChange(sub.id);
                            setIsMobileOpen(false);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            isSubActive
                              ? 'bg-blue-600 text-white font-bold shadow-xs'
                              : isDark
                              ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                          }`}
                        >
                          <SubIcon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                          <span className="flex-1 text-left truncate">{sub.label}</span>
                          {sub.count !== undefined && sub.count > 0 && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                              isSubActive 
                                ? 'bg-white/20 text-white' 
                                : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {sub.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* External Cloud Sync Integrations */}
        <div className={`p-3 border-t space-y-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className={`text-[10px] font-bold uppercase tracking-wider px-2 ${isCollapsed ? 'lg:hidden' : ''} ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Google Cloud Sync
          </div>

          {onOpenGoogleContactsModal && (
            <button
              onClick={() => {
                onOpenGoogleContactsModal();
                setIsMobileOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                isDark 
                  ? 'bg-blue-950/40 border-blue-900 text-blue-300 hover:bg-blue-900/60 hover:text-white' 
                  : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
              } ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}`}
              title="Google Contacts Live Cloud Sync"
            >
              <Users className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className={`truncate ${isCollapsed ? 'lg:hidden' : ''}`}>Google Contacts</span>
            </button>
          )}

          <button
            onClick={() => {
              onOpenGoogleSheetsModal();
              setIsMobileOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              isDark 
                ? 'bg-emerald-950/40 border-emerald-900 text-emerald-300 hover:bg-emerald-900/60 hover:text-white' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
            } ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}`}
            title="Google Sheets Database Sync"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className={`truncate ${isCollapsed ? 'lg:hidden' : ''}`}>Google Sheets</span>
          </button>
        </div>

        {/* Footer Area: Theme Toggle & Tools Menu */}
        <div className={`p-3 border-t flex items-center justify-between gap-2 ${
          isDark ? 'border-slate-800 bg-[#060a14]' : 'border-slate-200 bg-slate-50'
        }`}>
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-2 p-2 rounded-lg border transition-colors cursor-pointer ${
              isDark 
                ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' 
                : 'bg-white border-slate-200 text-blue-600 hover:bg-slate-100'
            } ${isCollapsed ? 'w-full justify-center' : 'flex-1'}`}
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
            {!isCollapsed && (
              <span className="text-xs font-medium">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            )}
          </button>

          {/* Backup Menu Trigger */}
          {!isCollapsed && (
            <div className="relative">
              <button
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className={`p-2 border rounded-lg transition-colors cursor-pointer ${
                  isDark
                    ? 'text-slate-400 hover:text-slate-200 bg-slate-900 border-slate-800 hover:border-slate-700'
                    : 'text-slate-600 hover:text-slate-900 bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
                title="System Tools & Backup"
              >
                <Sparkles className="w-4 h-4 text-blue-500" />
              </button>

              {showSettingsMenu && (
                <div className={`absolute bottom-full left-0 mb-2 w-56 border rounded-xl shadow-2xl py-1.5 z-50 text-xs ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider border-b ${
                    isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-100'
                  }`}>
                    Backup & Maintenance
                  </div>
                  <button
                    onClick={handleExport}
                    className={`w-full flex items-center gap-2 px-3 py-2 transition-colors cursor-pointer text-left ${
                      isDark ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Export Database (JSON)</span>
                  </button>
                  <label className={`w-full flex items-center gap-2 px-3 py-2 transition-colors cursor-pointer text-left ${
                    isDark ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}>
                    <Upload className="w-3.5 h-3.5 text-blue-500" />
                    <span>Restore from Backup</span>
                    <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                  </label>
                  <div className={`border-t my-1 ${isDark ? 'border-slate-800' : 'border-slate-100'}`} />
                  <button
                    onClick={() => setShowClearConfirmModal(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer text-left font-semibold text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All Data (Fresh Start)</span>
                  </button>
                  <button
                    onClick={() => setShowResetConfirmModal(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer text-left font-semibold text-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Load Sample / Demo Data</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Toast Feedback */}
      {resetToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4" />
          <span>{resetToast}</span>
        </div>
      )}

      {/* Safe Clear All Confirmation Modal */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-600">
                  Clear All Input Data?
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Start completely fresh with 0 records
                </p>
              </div>
            </div>

            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              This will wipe all <strong>customers, job cards, inventory stock, vendor bills, invoices, staff records, and cash flow</strong> to a 100% clean slate. You will be able to test and input fresh workshop data.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className={`px-4 py-2 text-xs rounded-xl font-medium cursor-pointer ${
                  isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Yes, Clear All Fresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe Demo Reset Confirmation Modal */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-blue-600">
                  Load Sample / Demo Data?
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Restore 31 verified customers and demo workshop records
                </p>
              </div>
            </div>

            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              This will restore the <strong>31 verified customer accounts</strong>, default inventory stock items, sample job cards, staff roster, and vendor bills.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className={`px-4 py-2 text-xs rounded-xl font-medium cursor-pointer ${
                  isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 cursor-pointer"
              >
                Yes, Load Demo Data
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
