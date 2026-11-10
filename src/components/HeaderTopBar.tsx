import React from 'react';
import { Menu, Plus, Users, FileSpreadsheet, Sun, Moon } from 'lucide-react';
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
  const { theme, toggleTheme } = useSgs();
  const isDark = theme === 'dark';

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
        </div>
      </div>
    </header>
  );
};
