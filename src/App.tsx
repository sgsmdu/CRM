import React, { useState } from 'react';
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
        onTabChange={setActiveTab}
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
            onNavigate={setActiveTab}
            onOpenNewJobModal={() => {
              setPreselectedCustomer(null);
              setIsNewJobModalOpen(true);
            }}
            onOpenVendorBillModal={() => setIsVendorBillModalOpen(true)}
            onOpenNewCustomerModal={() => setIsNewCustomerModalOpen(true)}
            onSelectJobForWhatsApp={(job) => {
              setSelectedJobForWhatsApp(job);
              setActiveTab('jobs');
            }}
            onOpenGoogleSheetsModal={() => setIsGoogleSheetsModalOpen(true)}
            onShowJob={(job) => {
              setSelectedJobForDetails(job);
              setActiveTab('jobs');
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
              setActiveTab('customers');
            }}
            onOpenNewCustomerWithLead={(lead) => {
              setActiveTab('customers');
              setIsNewCustomerModalOpen(true);
            }}
          />
        )}

        {activeTab === 'jobs' && (
          <JobCardManager
            isCreateModalOpen={isNewJobModalOpen}
            setIsCreateModalOpen={setIsNewJobModalOpen}
            preselectedCustomer={preselectedCustomer}
            onClearPreselectedCustomer={() => setPreselectedCustomer(null)}
            selectedJobForWhatsApp={selectedJobForWhatsApp}
            setSelectedJobForWhatsApp={setSelectedJobForWhatsApp}
            onNavigateToBilling={(jobId) => {
              setBillingInitialJobId(jobId || null);
              setActiveTab('billing');
            }}
            onNavigateToQuotation={(job) => {
              setQuotationInitialJob(job);
              setActiveTab('quotations');
            }}
            onNavigateToAllocation={() => setActiveTab('allocation')}
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
              setActiveTab('jobs');
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
      {activeTab !== 'jobs' && isNewJobModalOpen && (
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
