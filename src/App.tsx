import React, { useState, useEffect, useRef } from 'react';
import { SgsProvider } from './context/SgsContext';
import { NavTab } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { HeaderTopBar } from './components/HeaderTopBar';
import { DashboardOverview } from './components/DashboardOverview';
import { CustomerDirectory } from './components/CustomerDirectory';
import { LeadSourceManager } from './components/LeadSourceManager';
import { JobCardManager } from './components/JobCardManager';
import { WorkAllocationBoard } from './components/WorkAllocationBoard';
import { InventoryManager } from './components/InventoryManager';
import { VendorBillScanner } from './components/VendorBillScanner';
import { BillingCashFlow } from './components/BillingCashFlow';
import { MoneyFlowManager } from './components/MoneyFlowManager';
import { ReportsManager } from './components/ReportsManager';
import { EmployeeManager } from './components/EmployeeManager';
import { AdminDashboard } from './components/AdminDashboard';
import { ManualQuotationManager } from './components/ManualQuotationManager';
import { PriceCodeCalculator } from './components/PriceCodeCalculator';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { GoogleContactsModal } from './components/GoogleContactsModal';
import { GoogleLoginScreen } from './components/GoogleLoginScreen';
import { useSgs } from './context/SgsContext';
import { Customer, JobCard, LeadSource } from './types';

function SgsAppContent() {
  const { theme, isAuthenticated, isAuthLoading, handleAuthSuccess } = useSgs();
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // Left Sidebar layout state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Shared Modal States
  const [isNewJobModalOpen, setIsNewJobModalOpen] = useState(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [isVendorBillModalOpen, setIsVendorBillModalOpen] = useState(false);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);
  const [isGoogleContactsModalOpen, setIsGoogleContactsModalOpen] = useState(false);
  const [preselectedCustomer, setPreselectedCustomer] = useState<Customer | null>(null);
  const [selectedJobForWhatsApp, setSelectedJobForWhatsApp] = useState<JobCard | null>(null);
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<JobCard | null>(null);
  const [billingInitialJobId, setBillingInitialJobId] = useState<string | null>(null);
  const [quotationInitialJob, setQuotationInitialJob] = useState<JobCard | null>(null);
  const [exitToast, setExitToast] = useState<string | null>(null);

  // Refs for tracking active state in browser popstate listener
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const isMobileMenuOpenRef = useRef(isMobileMenuOpen);
  isMobileMenuOpenRef.current = isMobileMenuOpen;
  const isNewJobModalOpenRef = useRef(isNewJobModalOpen);
  isNewJobModalOpenRef.current = isNewJobModalOpen;
  const isNewCustomerModalOpenRef = useRef(isNewCustomerModalOpen);
  isNewCustomerModalOpenRef.current = isNewCustomerModalOpen;
  const isVendorBillModalOpenRef = useRef(isVendorBillModalOpen);
  isVendorBillModalOpenRef.current = isVendorBillModalOpen;
  const isGoogleSheetsModalOpenRef = useRef(isGoogleSheetsModalOpen);
  isGoogleSheetsModalOpenRef.current = isGoogleSheetsModalOpen;
  const isGoogleContactsModalOpenRef = useRef(isGoogleContactsModalOpen);
  isGoogleContactsModalOpenRef.current = isGoogleContactsModalOpen;
  const selectedJobForWhatsAppRef = useRef(selectedJobForWhatsApp);
  selectedJobForWhatsAppRef.current = selectedJobForWhatsApp;
  const selectedJobForDetailsRef = useRef(selectedJobForDetails);
  selectedJobForDetailsRef.current = selectedJobForDetails;

  const handleTabChange = (newTab: NavTab) => {
    if (newTab === activeTab) return;
    try {
      window.history.pushState({ tab: newTab }, '');
    } catch {
      // ignore
    }
    setActiveTab(newTab);
  };

  // Browser Back Button Trap & Modal Protection
  useEffect(() => {
    try {
      window.history.replaceState({ tab: 'dashboard', root: true }, '');
      window.history.pushState({ tab: 'dashboard' }, '');
    } catch {
      // ignore
    }

    let lastExitAttempt = 0;

    const handlePopState = () => {
      // 1. Dispatch custom event to close open child modals/editors/viewers
      const customEvt = new CustomEvent('sgs:modal-back', { cancelable: true });
      window.dispatchEvent(customEvt);
      if (customEvt.defaultPrevented) {
        window.history.pushState({ tab: activeTabRef.current }, '');
        return;
      }

      // 2. Close any open top-level modals
      if (isMobileMenuOpenRef.current) {
        setIsMobileMenuOpen(false);
        window.history.pushState({ tab: activeTabRef.current }, '');
        return;
      }
      if (isNewJobModalOpenRef.current) {
        setIsNewJobModalOpen(false);
        window.history.pushState({ tab: activeTabRef.current }, '');
        return;
      }
      if (isNewCustomerModalOpenRef.current) {
        setIsNewCustomerModalOpen(false);
        window.history.pushState({ tab: activeTabRef.current }, '');
        return;
      }
      if (isVendorBillModalOpenRef.current) {
        setIsVendorBillModalOpen(false);
        window.history.pushState({ tab: activeTabRef.current }, '');
        return;
      }
      if (isGoogleSheetsModalOpenRef.current) {
        setIsGoogleSheetsModalOpen(false);
        window.history.pushState({ tab: activeTabRef.current }, '');
        return;
      }
      if (isGoogleContactsModalOpenRef.current) {
        setIsGoogleContactsModalOpen(false);
        window.history.pushState({ tab: activeTabRef.current }, '');
        return;
      }
      if (selectedJobForWhatsAppRef.current) {
        setSelectedJobForWhatsApp(null);
        window.history.pushState({ tab: activeTabRef.current }, '');
        return;
      }
      if (selectedJobForDetailsRef.current) {
        setSelectedJobForDetails(null);
        window.history.pushState({ tab: activeTabRef.current }, '');
        return;
      }

      // 3. If currently on a sub-page, navigate back to 'dashboard'
      if (activeTabRef.current !== 'dashboard') {
        setActiveTab('dashboard');
        window.history.pushState({ tab: 'dashboard' }, '');
        return;
      }

      // 4. If already on dashboard: prevent leaving outside domain on accidental back
      const now = Date.now();
      if (now - lastExitAttempt < 2000) {
        // Exit allowed on rapid double-tap back
        return;
      }
      lastExitAttempt = now;
      window.history.pushState({ tab: 'dashboard' }, '');
      setExitToast('Press back again to exit SGS CRM');
      setTimeout(() => setExitToast(null), 2500);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleOpenNewJobWithCustomer = (customer: Customer) => {
    setPreselectedCustomer(customer);
    setIsNewJobModalOpen(true);
  };

  // 1. Loading State while checking Firebase Auth and Firestore verification
  if (isAuthLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#080d1a] text-white">
        <div className="p-4 bg-white/5 rounded-3xl border border-white/10 mb-4 shadow-xl">
          <img
            src="/assets/aistudio/Final_logo51_79c6a806.png"
            alt="Spider Grid Solutions"
            className="h-16 w-auto object-contain animate-pulse"
          />
        </div>
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
          Verifying security credentials...
        </p>
      </div>
    );
  }

  // 2. Mandatory Google Login Screen: App dashboard is NOT shown until authenticated
  if (!isAuthenticated) {
    return <GoogleLoginScreen onLoginSuccess={handleAuthSuccess} />;
  }

  return (
    <div className={`min-h-screen flex transition-colors duration-150 w-full max-w-full overflow-x-hidden ${
      isDark 
        ? 'bg-[#080d1a] text-slate-100 selection:bg-blue-600 selection:text-white' 
        : 'bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white'
    }`}>
      {/* 1. Left-Side Navigation Menu */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenNewJobModal={() => {
          setPreselectedCustomer(null);
          setIsNewJobModalOpen(true);
        }}
        onOpenGoogleSheetsModal={() => setIsGoogleSheetsModalOpen(true)}
        onOpenGoogleContactsModal={() => setIsGoogleContactsModalOpen(true)}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      {/* Main Content Area (offset by left sidebar width) */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 w-full max-w-full overflow-x-hidden ${
        isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
      }`}>
        {/* Top Header Bar */}
        <HeaderTopBar
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenNewJobModal={() => {
            setPreselectedCustomer(null);
            setIsNewJobModalOpen(true);
          }}
          onOpenGoogleSheetsModal={() => setIsGoogleSheetsModalOpen(true)}
          onOpenGoogleContactsModal={() => setIsGoogleContactsModalOpen(true)}
        />

        {/* Main View Container */}
        <main className="flex-1 w-full mx-auto px-2.5 sm:px-4 lg:px-8 py-4 sm:py-6 max-w-7xl overflow-x-hidden">
        {activeTab === 'dashboard' && (
          <DashboardOverview
            onNavigate={handleTabChange}
            onOpenNewJobModal={() => {
              setPreselectedCustomer(null);
              setIsNewJobModalOpen(true);
            }}
            onOpenVendorBillModal={() => setIsVendorBillModalOpen(true)}
            onOpenNewCustomerModal={() => setIsNewCustomerModalOpen(true)}
            onSelectJobForWhatsApp={(job) => {
              setSelectedJobForWhatsApp(job);
              handleTabChange('jobs');
            }}
            onOpenGoogleSheetsModal={() => setIsGoogleSheetsModalOpen(true)}
            onShowJob={(job) => {
              setSelectedJobForDetails(job);
              handleTabChange('jobs');
            }}
          />
        )}

        {activeTab === 'customers' && (
          <CustomerDirectory
            onOpenNewJobWithCustomer={handleOpenNewJobWithCustomer}
            isCreateModalOpen={isNewCustomerModalOpen}
            setIsCreateModalOpen={setIsNewCustomerModalOpen}
            onOpenGoogleContactsModal={() => setIsGoogleContactsModalOpen(true)}
          />
        )}

        {activeTab === 'leads' && (
          <LeadSourceManager
            onOpenCustomerDirectoryWithLead={(leadName) => {
              handleTabChange('customers');
            }}
            onOpenNewCustomerWithLead={(lead) => {
              handleTabChange('customers');
              setIsNewCustomerModalOpen(true);
            }}
          />
        )}

        {(activeTab === 'jobs' || activeTab === 'job_card_list') && (
          <JobCardManager
            initialSubTab={activeTab === 'job_card_list' ? 'list' : 'cards'}
            isCreateModalOpen={isNewJobModalOpen}
            setIsCreateModalOpen={setIsNewJobModalOpen}
            preselectedCustomer={preselectedCustomer}
            onClearPreselectedCustomer={() => setPreselectedCustomer(null)}
            selectedJobForWhatsApp={selectedJobForWhatsApp}
            setSelectedJobForWhatsApp={setSelectedJobForWhatsApp}
            onNavigateToBilling={(jobId) => {
              setBillingInitialJobId(jobId || null);
              handleTabChange('billing');
            }}
            onNavigateToQuotation={(job) => {
              setQuotationInitialJob(job);
              handleTabChange('quotations');
            }}
            onNavigateToAllocation={() => handleTabChange('allocation')}
            initialJobForDetails={selectedJobForDetails}
            onClearInitialJobForDetails={() => setSelectedJobForDetails(null)}
          />
        )}

        {activeTab === 'quotations' && (
          <ManualQuotationManager
            initialJobCard={quotationInitialJob}
            onClearInitialJobCard={() => setQuotationInitialJob(null)}
          />
        )}

        {activeTab === 'allocation' && (
          <WorkAllocationBoard
            onOpenJobDetail={(job) => {
              setSelectedJobForDetails(job);
              handleTabChange('jobs');
            }}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryManager />
        )}

        {activeTab === 'price_calculator' && (
          <PriceCodeCalculator />
        )}

        {activeTab === 'vendors' && (
          <VendorBillScanner
            isScannerModalOpen={isVendorBillModalOpen}
            setIsScannerModalOpen={setIsVendorBillModalOpen}
          />
        )}

        {activeTab === 'billing' && (
          <BillingCashFlow 
            initialJobId={billingInitialJobId}
            onClearInitialJobId={() => setBillingInitialJobId(null)}
          />
        )}

        {activeTab === 'money_flow' && (
          <MoneyFlowManager />
        )}

        {activeTab === 'reports' && (
          <ReportsManager />
        )}

        {activeTab === 'employees' && (
          <EmployeeManager />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard />
        )}
      </main>

      {/* Background Modals when invoked globally from other views */}
      {/* Note: Job Card Modal is also rendered by JobCardManager, so if on another tab, render JobCardManager invisibly or handle */}
      {activeTab !== 'jobs' && activeTab !== 'job_card_list' && isNewJobModalOpen && (
        <JobCardManager
          isCreateModalOpen={isNewJobModalOpen}
          setIsCreateModalOpen={setIsNewJobModalOpen}
          preselectedCustomer={preselectedCustomer}
          onClearPreselectedCustomer={() => setPreselectedCustomer(null)}
          selectedJobForWhatsApp={selectedJobForWhatsApp}
          setSelectedJobForWhatsApp={setSelectedJobForWhatsApp}
        />
      )}

      {activeTab !== 'vendors' && isVendorBillModalOpen && (
        <VendorBillScanner
          isScannerModalOpen={isVendorBillModalOpen}
          setIsScannerModalOpen={setIsVendorBillModalOpen}
        />
      )}

      {activeTab !== 'customers' && isNewCustomerModalOpen && (
        <CustomerDirectory
          onOpenNewJobWithCustomer={handleOpenNewJobWithCustomer}
          isCreateModalOpen={isNewCustomerModalOpen}
          setIsCreateModalOpen={setIsNewCustomerModalOpen}
        />
      )}

      {/* Google Sheets Synchronization Modal */}
      <GoogleSheetsModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
      />

      {/* Google Contacts Synchronization Modal */}
      <GoogleContactsModal
        isOpen={isGoogleContactsModalOpen}
        onClose={() => setIsGoogleContactsModalOpen(false)}
      />

      {/* Footer */}
      <footer className={`mt-auto border-t py-6 px-4 lg:px-8 text-xs transition-colors ${
        isDark ? 'border-slate-900 bg-[#060a14] text-slate-500' : 'border-slate-200 bg-white text-slate-600'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>Spider Grid Solutions (SGS)</span>
            <span>·</span>
            <span>Madurai, Tamil Nadu</span>
            <span>·</span>
            <span className="font-mono">Ph: 9176795665</span>
          </div>

          <div className="flex items-center gap-4">
            <span>Customer Service: spidergridsolutions@gmail.com</span>
            <span>·</span>
            <span>Laptop · CCTV · Desktop · Printer</span>
          </div>
        </div>
      </footer>

      {/* Exit Warning Toast */}
      {exitToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-slate-900/95 text-white border border-slate-700/80 shadow-2xl backdrop-blur-md text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>{exitToast}</span>
        </div>
      )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SgsProvider>
      <SgsAppContent />
    </SgsProvider>
  );
}
