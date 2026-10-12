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
  Share2
} from 'lucide-react';
import { useSgs } from '../context/SgsContext';

import { PWAInstallButton } from './PWAInstallButton';

export type NavTab = 'dashboard' | 'customers' | 'leads' | 'jobs' | 'inventory' | 'vendors' | 'billing' | 'admin';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenNewJobModal: () => void;
  onOpenGoogleSheetsModal: () => void;
  onOpenGoogleContactsModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  activeTab, 
  onTabChange, 
  onOpenNewJobModal,
  onOpenGoogleSheetsModal,
  onOpenGoogleContactsModal,
}) => {
  const { customers, jobCards, leadSources, exportDataJson, importDataJson, resetToDefaultData, theme, toggleTheme } = useSgs();
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const isDark = theme === 'dark';

  const activeJobsCount = jobCards.filter(j => j.status !== 'delivered').length;

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
    { id: 'customers', label: `Golden Customers (${customers.length})`, icon: Users },
    { id: 'leads', label: `Lead Sources (${leadSources.length})`, icon: Share2 },
    { id: 'jobs', label: `Job Cards (${activeJobsCount})`, icon: Wrench },
    { id: 'inventory', label: 'Stock & Parts', icon: Boxes },
    { id: 'vendors', label: 'Vendor Hub & Ledger', icon: Receipt },
    { id: 'billing', label: 'Billing & Cash Flow', icon: CreditCard },
    { id: 'admin', label: 'Admin Hub', icon: ShieldCheck },
  ];

  return (
    <header className={`sticky top-0 z-40 backdrop-blur-md px-4 lg:px-8 py-3 transition-colors ${
      isDark ? 'bg-[#080d1a]/95 border-b border-slate-800/80' : 'bg-white/95 border-b border-slate-200/90 shadow-xs'
    }`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
        
        {/* Zone 1: Single-element Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 font-bold text-lg tracking-wider">
            SGS
          </div>
          <div className="flex flex-col">
            <span className={`text-base font-bold tracking-tight whitespace-nowrap ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Spider Grid Solutions
            </span>
            <span className={`text-[11px] font-medium whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Operations & CRM · Madurai
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className={`hidden xl:flex items-center gap-1 p-1 rounded-xl border transition-colors ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100/90 border-slate-200'
        }`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id as NavTab)}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Actions, PWA Install, Theme Toggle & Data Tools */}
        <div className="flex items-center gap-2 shrink-0">
          {/* PWA Install Web App Button */}
          <PWAInstallButton isDark={isDark} />

          {/* Theme Switcher Button with Clear Label / Indicator */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800 hover:text-amber-300'
                : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:text-blue-800 shadow-xs'
            }`}
            title={isDark ? 'Switch to Blue & White Light Theme' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Light Theme</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Dark Theme</span>
              </>
            )}
          </button>

          {onOpenGoogleContactsModal && (
            <button
              onClick={onOpenGoogleContactsModal}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border whitespace-nowrap shrink-0 cursor-pointer ${
                isDark
                  ? 'text-blue-300 hover:text-white bg-blue-950/60 hover:bg-blue-600 border-blue-800'
                  : 'text-blue-800 hover:text-white bg-blue-50 hover:bg-blue-600 border-blue-300 shadow-xs'
              }`}
              title="Sync & Manage Google Contacts"
            >
              <Users className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden md:inline">Google Contacts</span>
            </button>
          )}

          <button
            onClick={onOpenGoogleSheetsModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border whitespace-nowrap shrink-0 cursor-pointer ${
              isDark
                ? 'text-emerald-300 hover:text-white bg-emerald-950/60 hover:bg-emerald-600 border-emerald-800'
                : 'text-emerald-800 hover:text-white bg-emerald-50 hover:bg-emerald-600 border-emerald-300 shadow-xs'
            }`}
            title="Link & Sync with Google Sheets"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden md:inline">Google Sheets</span>
          </button>

          <button
            onClick={onOpenNewJobModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-lg transition-all shadow-md shadow-blue-600/25 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Job Card</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className={`p-2 border rounded-lg transition-colors cursor-pointer ${
                isDark
                  ? 'text-slate-400 hover:text-slate-200 bg-slate-900 border-slate-800 hover:border-slate-700'
                  : 'text-slate-600 hover:text-slate-900 bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
              title="System Backup & Tools"
            >
              <Sparkles className="w-4 h-4 text-blue-500" />
            </button>

            {showSettingsMenu && (
              <div className={`absolute right-0 mt-2 w-56 border rounded-xl shadow-2xl py-1.5 z-50 text-xs ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider border-b ${
                  isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-100'
                }`}>
                  Theme & Workspace
                </div>
                <button
                  onClick={() => {
                    toggleTheme();
                    setShowSettingsMenu(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 transition-colors cursor-pointer text-left font-medium ${
                    isDark ? 'text-amber-400 hover:bg-slate-800' : 'text-blue-700 hover:bg-blue-50'
                  }`}
                >
                  {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  <span>{isDark ? 'Switch to Light Theme' : 'Switch to Dark Mode'}</span>
                </button>
                <button
                  onClick={() => {
                    setShowSettingsMenu(false);
                    onOpenGoogleSheetsModal();
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 transition-colors cursor-pointer text-left font-medium ${
                    isDark ? 'text-emerald-300 hover:bg-slate-800' : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Google Sheets Sync</span>
                </button>
                <div className={`border-t my-1 ${isDark ? 'border-slate-800' : 'border-slate-100'}`} />
                <div className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider border-b ${
                  isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-100'
                }`}>
                  Data Backup & Reset
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
                  <span>Reset to 31 Golden Records</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile / Tablet Horizontal Nav Strip */}
      <div className="xl:hidden flex items-center gap-1 mt-3 overflow-x-auto pb-1 scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id as NavTab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isDark
                  ? 'text-slate-400 bg-slate-900 border border-slate-800/80 hover:text-slate-200'
                  : 'text-slate-700 bg-white border border-slate-200 hover:text-slate-900 shadow-xs'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
