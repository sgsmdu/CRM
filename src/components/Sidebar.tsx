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
  FileSpreadsheet,
  Sun,
  Moon,
  ShieldCheck,
  Share2,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
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
  const { customers, jobCards, leadSources, exportDataJson, importDataJson, resetToDefaultData, theme, toggleTheme } = useSgs();
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const isDark = theme === 'dark';

  const activeJobsCount = jobCards.filter(j => j.status !== 'delivered' && j.status !== 'completed').length;

  const handleExport = () => {
    const jsonStr = exportDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sgs-backup-${new Date().toISOString().split('T')[0]}.json`;
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
        alert('Data backup successfully restored!');
      } else {
        alert('Failed to parse backup JSON. Please check file format.');
      }
    };
    reader.readAsText(file);
    setShowSettingsMenu(false);
  };

  const handleReset = () => {
    if (window.confirm('Reset all databases back to default Spider Grid Solutions 31 Golden Customers and seed records?')) {
      resetToDefaultData();
      setShowSettingsMenu(false);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
    { id: 'jobs', label: 'Job Cards & Timeline', count: activeJobsCount, icon: Wrench },
    { id: 'billing', label: 'Billing & Cash Flow', icon: CreditCard },
    { id: 'inventory', label: 'Stock & Parts Inventory', icon: Boxes },
    { id: 'vendors', label: 'Vendor Hub & Bill Scan', icon: Receipt },
    { id: 'customers', label: 'Golden Customers', count: customers.length, icon: Users },
    { id: 'leads', label: 'Lead Sources', count: leadSources.length, icon: Share2 },
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
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out border-r ${
          isCollapsed ? 'w-20' : 'w-64'
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
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 font-bold text-lg tracking-wider shrink-0">
              SGS
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold tracking-tight truncate">
                  Spider Grid Solutions
                </span>
                <span className={`text-[10px] font-medium truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Operations & CRM · Madurai
                </span>
              </div>
            )}
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
            className="lg:hidden p-1.5 text-slate-400 hover:text-white"
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
              isCollapsed ? 'px-0' : ''
            }`}
            title="Create New Job Card"
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>New Job Card</span>}
          </button>
        </div>

        {/* Navigation Menu List */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => {
            const Icon = item.icon;
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
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                title={item.label}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && (
                  <span className="flex-1 text-left truncate">{item.label}</span>
                )}
                {!isCollapsed && item.count !== undefined && item.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : (isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700')
                  }`}>
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* External Cloud Sync Integrations */}
        <div className={`p-3 border-t space-y-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          {!isCollapsed && (
            <div className={`text-[10px] font-bold uppercase tracking-wider px-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Google Cloud Sync
            </div>
          )}

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
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
              title="Google Contacts Live Cloud Sync"
            >
              <Users className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              {!isCollapsed && <span className="truncate">Google Contacts</span>}
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
            } ${isCollapsed ? 'justify-center px-0' : ''}`}
            title="Google Sheets Database Sync"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            {!isCollapsed && <span className="truncate">Google Sheets</span>}
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
                    onClick={handleReset}
                    className="w-full flex items-center gap-2 px-3 py-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer text-left"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset 31 Records</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
