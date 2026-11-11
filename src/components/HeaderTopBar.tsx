import React, { useState } from 'react';
import { Menu, Plus, Users, FileSpreadsheet, Sun, Moon, Shield, ShieldAlert, Check, ChevronDown, LogOut } from 'lucide-react';
import { useSgs } from '../context/SgsContext';
import { PWAInstallButton } from './PWAInstallButton';
import { NavTab } from './Navbar';

interface HeaderTopBarProps {
  activeTab: NavTab;
  onOpenMobileMenu: () => void;
  onOpenNewJobModal: () => void;
  onOpenGoogleSheetsModal: () => void;
  onOpenGoogleContactsModal?: () => void;
}

export const HeaderTopBar: React.FC<HeaderTopBarProps> = ({
  activeTab,
  onOpenMobileMenu,
  onOpenNewJobModal,
  onOpenGoogleSheetsModal,
  onOpenGoogleContactsModal,
}) => {
  const { theme, toggleTheme, currentUserEmail, setCurrentUserEmail, currentUserRole, setCurrentUserRole, isAdmin, allowedUsers, logout } = useSgs();
  const isDark = theme === 'dark';
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [customEmailInput, setCustomEmailInput] = useState('');

  const tabTitles: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: { title: 'Command Center', subtitle: 'Overview, quick actions, performance & alerts' },
    jobs: { title: 'Job Cards & Timeline', subtitle: 'Process tracking, quotations, approvals, delivery & calls' },
    quotations: { title: 'Manual Quotations (Model 1 & 2)', subtitle: 'Independent comparative quotation proposals with hidden internal margins' },
    allocation: { title: 'Task Assign & Work Priority', subtitle: 'Order pending tasks, assign to staff & share WhatsApp work schedule' },
    billing: { title: 'Billing & Invoices', subtitle: 'Tax invoices, manual GST edit & printable vouchers' },
    reports: { title: 'GST Reports & Filing', subtitle: 'Official GSTR-1, GSTR-2 JSON & Excel exports, master ledger' },
    employees: { title: 'Staff, Attendance & Allocation', subtitle: 'Staff attendance, wage slips, work allocation & WhatsApp orders' },
    inventory: { title: 'Stock & Parts Inventory', subtitle: 'Spares tracking, category summaries, vendor link & movements' },
    price_calculator: { title: 'SGS Price Code Calculator', subtitle: 'Secret price code encoder, decoder, minimum sale calculator & mapping manager' },
    vendors: { title: 'Vendor Hub & Bill Scan', subtitle: 'AI scanner, item matching, purchase ledger & payments' },
    customers: { title: 'Customer Directory', subtitle: 'Verified client accounts, contact details, GPS pins & Google Contacts' },
    leads: { title: 'Lead Sources & Referrals', subtitle: 'Referrer commissions, meetings & lead origin tracking' },
    admin: { title: 'Admin Hub & Settings', subtitle: 'Firm branding, logos, rubber stamps, presets & rates' },
  };

  const currentInfo = tabTitles[activeTab] || tabTitles.dashboard;

  return (
    <header className={`sticky top-0 z-30 px-4 lg:px-8 py-3.5 border-b backdrop-blur-md transition-colors ${
      isDark ? 'bg-[#080d1a]/95 border-slate-800/90 text-white' : 'bg-white/95 border-slate-200/90 text-slate-900 shadow-xs'
    }`}>
      <div className="flex items-center justify-between gap-2 sm:gap-4 max-w-full overflow-hidden">
        {/* Left: Mobile hamburger + Official Logo + Active Section Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            onClick={onOpenMobileMenu}
            className={`lg:hidden p-2 rounded-lg border transition-colors cursor-pointer shrink-0 ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900'
            }`}
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Official SGS Logo for Mobile Header */}
          <div className="lg:hidden shrink-0 flex items-center">
            <img 
              src="/assets/aistudio/Final_logo51_79c6a806.png" 
              alt="SGS Logo" 
              className="h-8 w-auto object-contain select-none" 
            />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-lg font-bold tracking-tight truncate">
              {currentInfo.title}
            </h1>
            <p className={`text-[11px] hidden sm:block truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {currentInfo.subtitle}
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* RBAC Role Indicator Badge & Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(prev => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                isAdmin
                  ? isDark 
                    ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/80 shadow-xs shadow-emerald-950'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                  : isDark
                    ? 'bg-amber-950/70 border-amber-700/60 text-amber-300 hover:bg-amber-900/80 shadow-xs shadow-amber-950'
                    : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
              }`}
              title="Click to view user role permissions from allowed_users Firestore collection"
            >
              {isAdmin ? (
                <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              )}
              <span className="font-bold tracking-wide">{isAdmin ? 'Admin' : 'Staff'}</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {/* Dropdown Menu for RBAC Testing & Info */}
            {showRoleMenu && (
              <div 
                className={`absolute right-0 mt-2 w-72 sm:w-80 rounded-xl p-3 border shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-700/50 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Firestore RBAC Profile
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isAdmin ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {isAdmin ? 'FULL ACCESS (ADMIN)' : 'RESTRICTED (STAFF)'}
                  </span>
                </div>

                <div className="text-xs mb-2">
                  <div className="font-medium text-slate-400 text-[10px]">CURRENT ACCOUNT:</div>
                  <div className="font-semibold truncate text-blue-400" title={currentUserEmail}>
                    {currentUserEmail}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {isAdmin ? (
                      <span className="text-emerald-400 font-medium">✓ Full create, read, update & delete access</span>
                    ) : (
                      <span className="text-amber-400 font-medium">⚠ Record deletion & critical settings editing disabled</span>
                    )}
                  </div>
                </div>

                {/* Quick Role Toggle for Testing */}
                <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/50 mb-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Test Role Permissions:
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => {
                        setCurrentUserRole('admin');
                        setShowRoleMenu(false);
                      }}
                      className={`px-2 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                        currentUserRole === 'admin'
                          ? 'bg-emerald-600 text-white'
                          : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      👑 Admin Role
                    </button>
                    <button
                      onClick={() => {
                        setCurrentUserRole('user');
                        setShowRoleMenu(false);
                      }}
                      className={`px-2 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                        currentUserRole === 'user'
                          ? 'bg-amber-600 text-white'
                          : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      👤 Staff User Role
                    </button>
                  </div>
                </div>

                {/* Change Email to Fetch from allowed_users */}
                <div className="mt-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Switch Account (Firestore Lookup):
                  </label>
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (customEmailInput.trim()) {
                        setCurrentUserEmail(customEmailInput.trim());
                        setCustomEmailInput('');
                        setShowRoleMenu(false);
                      }
                    }}
                    className="flex gap-1"
                  >
                    <input
                      type="email"
                      value={customEmailInput}
                      onChange={(e) => setCustomEmailInput(e.target.value)}
                      placeholder="user@example.com"
                      className={`flex-1 text-xs px-2 py-1 rounded border outline-none ${
                        isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
                      }`}
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 text-xs font-bold rounded bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                    >
                      Apply
                    </button>
                  </form>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex items-center justify-between">
                  <button
                    onClick={async () => {
                      setShowRoleMenu(false);
                      await logout();
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>

                  <button
                    onClick={() => setShowRoleMenu(false)}
                    className="text-[11px] text-slate-400 hover:text-white cursor-pointer px-2 py-1"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* PWA Install */}
          <PWAInstallButton isDark={isDark} />

          {/* Google Contacts Trigger */}
          {onOpenGoogleContactsModal && (
            <button
              onClick={onOpenGoogleContactsModal}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                isDark 
                  ? 'bg-blue-950/60 border-blue-800 text-blue-300 hover:text-white hover:bg-blue-600' 
                  : 'bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-600 hover:text-white'
              }`}
              title="Sync & Manage Google Contacts"
            >
              <Users className="w-3.5 h-3.5 text-blue-500" />
              <span>Google Contacts</span>
            </button>
          )}

          {/* Google Sheets Trigger */}
          <button
            onClick={onOpenGoogleSheetsModal}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              isDark 
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300 hover:text-white hover:bg-emerald-600' 
                : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-600 hover:text-white'
            }`}
            title="Sync with Google Sheets"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Google Sheets</span>
          </button>

          {/* Quick New Job Card Button */}
          <button
            onClick={onOpenNewJobModal}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-lg transition-all shadow-md shadow-blue-600/25 cursor-pointer whitespace-nowrap"
            title="Create New Job Card"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Job</span>
            <span className="sm:hidden">Job</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              isDark ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800' : 'bg-slate-100 border-slate-200 text-blue-600 hover:bg-slate-200'
            }`}
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Quick Sign Out Button */}
          <button
            onClick={logout}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-800' : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-slate-200'
            }`}
            title="Sign out of Google CRM session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
