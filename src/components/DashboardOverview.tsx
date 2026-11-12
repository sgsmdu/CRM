import React, { useState } from 'react';
import { 
  Wrench, 
  IndianRupee, 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  Users, 
  MessageSquare, 
  Plus, 
  Receipt, 
  CheckCircle2, 
  Layers,
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  FileSpreadsheet,
  ShieldCheck,
  Share2,
  Eye
} from 'lucide-react';
import { useSgs } from '../context/SgsContext';
import { JobCard, JobStatus } from '../types';
import { NavTab } from './Navbar';

interface DashboardOverviewProps {
  onNavigate: (tab: NavTab) => void;
  onOpenNewJobModal: () => void;
  onOpenVendorBillModal: () => void;
  onOpenNewCustomerModal: () => void;
  onSelectJobForWhatsApp: (job: JobCard) => void;
  onOpenGoogleSheetsModal?: () => void;
  onShowJob?: (job: JobCard) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onNavigate,
  onOpenNewJobModal,
  onOpenVendorBillModal,
  onOpenNewCustomerModal,
  onSelectJobForWhatsApp,
  onOpenGoogleSheetsModal,
  onShowJob,
}) => {
  const { customers, jobCards, inventory, vendorBills, cashFlow, updateJobCardStatus, theme } = useSgs();
  const isDark = theme === 'dark';

  // Calculations
  const totalIncome = cashFlow
    .filter(c => c.type === 'income')
    .reduce((sum, c) => sum + c.amount, 0);

  const totalExpense = cashFlow
    .filter(c => c.type === 'expense')
    .reduce((sum, c) => sum + c.amount, 0);

  const netBalance = totalIncome - totalExpense;

  const activeJobs = jobCards.filter(j => j.status !== 'delivered');
  const quotationPendingJobs = jobCards.filter(j => j.status === 'quotation_pending');
  const lowStockItems = inventory.filter(i => i.currentStock <= i.minStockAlert);

  // Group lead references from 31 Golden Customers
  const referenceCounts = customers.reduce((acc, c) => {
    const ref = c.reference?.trim() || 'Direct Walk-in';
    acc[ref] = (acc[ref] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedReferences = Object.entries(referenceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // Category breakdown of active jobs
  const categoryCounts = activeJobs.reduce((acc, j) => {
    acc[j.category] = (acc[j.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusLabelMap: Record<JobStatus, { label: string; color: string }> = {
    received: { label: 'Received', color: isDark ? 'text-sky-400 bg-sky-950/40 border-sky-800' : 'text-sky-700 bg-sky-50 border-sky-200' },
    in_process: { label: 'In Process', color: isDark ? 'text-amber-400 bg-amber-950/40 border-amber-800' : 'text-amber-700 bg-amber-50 border-amber-200' },
    quotation_pending: { label: 'Quotation Pending', color: isDark ? 'text-orange-400 bg-orange-950/40 border-orange-800' : 'text-orange-700 bg-orange-50 border-orange-200' },
    waiting_parts: { label: 'Waiting Parts', color: isDark ? 'text-purple-400 bg-purple-950/40 border-purple-800' : 'text-purple-700 bg-purple-50 border-purple-200' },
    customer_approval: { label: 'Customer Approved', color: isDark ? 'text-teal-400 bg-teal-950/40 border-teal-800' : 'text-teal-700 bg-teal-50 border-teal-200' },
    customer_discussion: { label: 'Discussion', color: isDark ? 'text-indigo-400 bg-indigo-950/40 border-indigo-800' : 'text-indigo-700 bg-indigo-50 border-indigo-200' },
    work_completed: { label: 'Work Completed', color: isDark ? 'text-green-400 bg-green-950/40 border-green-800' : 'text-green-700 bg-green-50 border-green-200' },
    billed: { label: 'Billed', color: isDark ? 'text-cyan-400 bg-cyan-950/40 border-cyan-800' : 'text-cyan-700 bg-cyan-50 border-cyan-200' },
    payment_pending: { label: 'Payment Pending', color: isDark ? 'text-yellow-400 bg-yellow-950/40 border-yellow-800' : 'text-yellow-800 bg-yellow-50 border-yellow-200' },
    pickup_ready: { label: 'Pickup Ready', color: isDark ? 'text-blue-400 bg-blue-950/40 border-blue-800' : 'text-blue-700 bg-blue-50 border-blue-200' },
    completed: { label: 'Ready for Delivery', color: isDark ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800' : 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    delivered: { label: 'Delivered', color: isDark ? 'text-slate-400 bg-slate-900 border-slate-800' : 'text-slate-600 bg-slate-100 border-slate-200' },
    hold: { label: 'On Hold', color: isDark ? 'text-rose-400 bg-rose-950/40 border-rose-800' : 'text-rose-700 bg-rose-50 border-rose-200' },
    other: { label: 'Other Stage', color: isDark ? 'text-violet-400 bg-violet-950/40 border-violet-800' : 'text-violet-700 bg-violet-50 border-violet-200' },
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Operations Header */}
      <div 
        className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl border transition-colors ${
          isDark 
            ? 'bg-black border-slate-800 shadow-xl' 
            : 'bg-white border-blue-200/80 shadow-sm'
        }`}
      >
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white dark:bg-slate-900 p-1.5 flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
            <img 
              src="/assets/aistudio/Final_logo51_79c6a806.png" 
              alt="Spider Grid Solutions" 
              className="w-full h-full object-contain select-none" 
            />
          </div>
          <div>
            <div className={`flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-semibold uppercase tracking-wider mb-1 ${
              isDark ? 'text-indigo-400' : 'text-blue-700'
            }`}>
              <span>Spider Grid Solutions Operations Command</span>
              <span>·</span>
              <span>Madurai Tech Hub</span>
            </div>
            <h1 className={`text-lg sm:text-xl md:text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Workshop CRM & Service Operations
            </h1>
            <p className={`text-xs mt-1 max-w-2xl ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Managing <strong className={isDark ? 'text-slate-200' : 'text-blue-900'}>{customers.length} Verified Customers</strong>, {activeJobs.length} active service & sales jobs, vendor invoices with Gemini OCR, and workshop cash flow.
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={onOpenNewJobModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-md shadow-blue-600/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Job Card</span>
          </button>
          <button
            onClick={onOpenVendorBillModal}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              isDark 
                ? 'text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border-slate-700' 
                : 'text-blue-800 hover:text-blue-900 bg-blue-50/80 hover:bg-blue-100 border-blue-200 shadow-xs'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-blue-500" />
            <span>Scan Vendor Bill</span>
          </button>
          <button
            onClick={onOpenNewCustomerModal}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              isDark 
                ? 'text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border-slate-700' 
                : 'text-slate-800 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200 shadow-xs'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            <span>Add Customer</span>
          </button>
          {onOpenGoogleSheetsModal && (
            <button
              onClick={onOpenGoogleSheetsModal}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                isDark
                  ? 'text-emerald-300 hover:text-white bg-emerald-950/70 hover:bg-emerald-600 border-emerald-800'
                  : 'text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border-emerald-300 shadow-xs'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Google Sheets Sync</span>
            </button>
          )}
          <button
            onClick={() => onNavigate('leads')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              isDark
                ? 'text-sky-300 hover:text-white bg-sky-950/70 hover:bg-sky-600 border-sky-800'
                : 'text-sky-800 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 border-sky-300 shadow-xs'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 text-sky-600" />
            <span>Lead Sources</span>
          </button>
          <button
            onClick={() => onNavigate('admin')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              isDark
                ? 'text-purple-300 hover:text-white bg-purple-950/70 hover:bg-purple-600 border-purple-800'
                : 'text-purple-800 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border-purple-300 shadow-xs'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Admin Hub</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inflow */}
        <div className={`p-4 rounded-xl border transition-colors ${
          isDark 
            ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' 
            : 'bg-white border-slate-200/90 shadow-xs hover:border-blue-300'
        }`}>
          <div className={`flex items-center justify-between text-xs mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className="font-medium">Total Inflow (Revenue)</span>
            <span className={`p-1.5 rounded-lg ${isDark ? 'bg-emerald-950/60 text-emerald-400' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
              <IndianRupee className="w-4 h-4" />
            </span>
          </div>
          <div className={`text-2xl font-bold font-mono tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
            ₹{totalIncome.toLocaleString('en-IN')}
          </div>
          <div className={`flex items-center gap-1 text-[11px] mt-2 font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
            <TrendingUp className="w-3 h-3" />
            <span>Customer service fees & sales</span>
          </div>
        </div>

        {/* Vendor & Workshop Outflows */}
        <div className={`p-4 rounded-xl border transition-colors ${
          isDark 
            ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' 
            : 'bg-white border-slate-200/90 shadow-xs hover:border-blue-300'
        }`}>
          <div className={`flex items-center justify-between text-xs mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className="font-medium">Vendor & Parts Outflow</span>
            <span className={`p-1.5 rounded-lg ${isDark ? 'bg-rose-950/60 text-rose-400' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <div className={`text-2xl font-bold font-mono tabular-nums ${isDark ? 'text-white' : 'text-slate-900'}`}>
            ₹{totalExpense.toLocaleString('en-IN')}
          </div>
          <div className={`flex items-center gap-1 text-[11px] mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>{vendorBills.length} recorded vendor invoices</span>
          </div>
        </div>

        {/* Net Cash Balance */}
        <div className={`p-4 rounded-xl border transition-colors ${
          isDark 
            ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' 
            : 'bg-white border-slate-200/90 shadow-xs hover:border-blue-300'
        }`}>
          <div className={`flex items-center justify-between text-xs mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className="font-medium">Net Workshop Balance</span>
            <span className={`p-1.5 rounded-lg ${isDark ? 'bg-indigo-950/60 text-indigo-400' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className={`text-2xl font-bold font-mono tabular-nums ${netBalance >= 0 ? (isDark ? 'text-emerald-400' : 'text-emerald-700') : (isDark ? 'text-rose-400' : 'text-rose-600')}`}>
            ₹{netBalance.toLocaleString('en-IN')}
          </div>
          <div className={`flex items-center gap-1 text-[11px] mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>Operating reserve & margin</span>
          </div>
        </div>

        {/* Active Jobs & Quotation Pipeline */}
        <div className={`p-4 rounded-xl border transition-colors ${
          isDark 
            ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' 
            : 'bg-white border-slate-200/90 shadow-xs hover:border-blue-300'
        }`}>
          <div className={`flex items-center justify-between text-xs mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className="font-medium">Active Job Pipeline</span>
            <span className={`p-1.5 rounded-lg ${isDark ? 'bg-amber-950/60 text-amber-400' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className={`text-2xl font-bold font-mono tabular-nums flex items-baseline gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <span>{activeJobs.length}</span>
            <span className={`text-xs font-semibold font-sans ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
              ({quotationPendingJobs.length} Quotation Pending)
            </span>
          </div>
          <div className={`flex items-center gap-1 text-[11px] mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>Laptops · CCTV · Desktops · Printers</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Active Work Orders + Side Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Active Service & Sales Jobs (2 cols wide) */}
        <div className="lg:col-span-2 space-y-4">
          <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div>
              <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Active Service & Sales Jobs</h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Track device progress and dispatch one-click WhatsApp status updates</p>
            </div>
            <button
              onClick={() => onNavigate('jobs')}
              className={`flex items-center gap-1 text-xs font-semibold cursor-pointer ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
            >
              <span>View All ({jobCards.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {activeJobs.length === 0 ? (
              <div className={`p-8 text-center rounded-xl border border-dashed text-xs ${
                isDark ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                No active jobs in queue. Click "+ Create Job Card" to register a device.
              </div>
            ) : (
              activeJobs.slice(0, 5).map((job) => {
                const statusMeta = statusLabelMap[job.status] || { label: job.status, color: isDark ? 'text-slate-400 bg-slate-900' : 'text-slate-700 bg-slate-100 border-slate-300' };
                return (
                  <div
                    key={job.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isDark 
                        ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700' 
                        : 'bg-white border-slate-200/90 hover:border-blue-300 hover:bg-blue-50/20 shadow-xs'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <button
                          type="button"
                          onClick={() => onShowJob ? onShowJob(job) : onNavigate('jobs')}
                          className={`font-mono font-bold hover:underline cursor-pointer ${isDark ? 'text-blue-400' : 'text-blue-700'}`}
                          title="Click to view full job card"
                        >
                          {job.jobId}
                        </button>
                        <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>·</span>
                        <span className={`font-semibold inline-flex items-center gap-1 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                          <span>{job.customerName}</span>
                        </span>
                        {job.customerArea && (
                          <>
                            <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>·</span>
                            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{job.customerArea}</span>
                          </>
                        )}
                        <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>·</span>
                        <span className={`uppercase text-[10px] tracking-wider font-semibold px-2 py-0.5 rounded ${
                          isDark ? 'bg-slate-800 text-slate-300' : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {job.category}
                        </span>
                      </div>

                      <h3 
                        onClick={() => onShowJob ? onShowJob(job) : onNavigate('jobs')}
                        className={`text-sm font-semibold truncate hover:underline cursor-pointer ${isDark ? 'text-white' : 'text-slate-900'}`}
                        title="Click to view full job card"
                      >
                        {job.deviceBrand}
                      </h3>

                      <p className={`text-xs line-clamp-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {job.issueDescription}
                      </p>

                      <div className={`flex items-center gap-3 text-[11px] pt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                        <span>Intake: <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>{job.intakeDate}</strong></span>
                        <span>·</span>
                        <span>Est. Cost: <strong className={`font-mono ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>₹{job.estimatedCost.toLocaleString('en-IN')}</strong></span>
                      </div>
                    </div>

                    {/* Status & Actions Zone */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                      {/* Inline Status Dropdown */}
                      <select
                        value={job.status}
                        onChange={(e) => updateJobCardStatus(job.id, e.target.value as JobStatus)}
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border cursor-pointer ${statusMeta.color}`}
                      >
                        <option value="received">Received (Inspection)</option>
                        <option value="in_process">In Process</option>
                        <option value="quotation_pending">Quotation Pending</option>
                        <option value="waiting_parts">Waiting Parts</option>
                        <option value="customer_approval">Customer Approved</option>
                        <option value="customer_discussion">Customer Discussion</option>
                        <option value="work_completed">Work Completed</option>
                        <option value="billed">Billed</option>
                        <option value="payment_pending">Payment Pending</option>
                        <option value="completed">Ready for Pickup</option>
                        <option value="delivered">Delivered</option>
                        <option value="hold">On Hold</option>
                        <option value="other">Other Stage</option>
                      </select>

                      {/* Show Job Button */}
                      {onShowJob && (
                        <button
                          type="button"
                          onClick={() => onShowJob(job)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-xs cursor-pointer whitespace-nowrap transition-colors"
                          title="Show full job card details & markings"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Show Job</span>
                        </button>
                      )}

                      {/* WhatsApp Button */}
                      <button
                        onClick={() => onSelectJobForWhatsApp(job)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                          isDark
                            ? 'text-emerald-400 hover:text-white bg-emerald-950/50 hover:bg-emerald-600 border border-emerald-800/80 hover:border-emerald-500'
                            : 'text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs'
                        }`}
                        title="Open WhatsApp Welcome & Status Dispatcher"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Lead References & Inventory Alerts (1 col wide) */}
        <div className="space-y-6">
          
          {/* Golden Customer Lead Sources */}
          <div className={`p-4 rounded-xl border ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
          }`}>
            <div className={`flex items-center justify-between pb-2 mb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div>
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>Top Lead & Reach Sources</h3>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>How customers reached Spider Grid Solutions</p>
              </div>
              <button
                onClick={() => onNavigate('customers')}
                className={`text-[11px] font-semibold cursor-pointer ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
              >
                Directory
              </button>
            </div>

            <div className="space-y-2">
              {sortedReferences.map(([source, count], idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-semibold ${
                      isDark ? 'bg-slate-800 text-slate-300' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>{source}</span>
                  </div>
                  <span className={`font-mono text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{count} customers</span>
                </div>
              ))}
            </div>
          </div>

          {/* Low Stock Alerts */}
          <div className={`p-4 rounded-xl border ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
          }`}>
            <div className={`flex items-center justify-between pb-2 mb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>Stock & Spares Notice</h3>
              </div>
              <button
                onClick={() => onNavigate('inventory')}
                className={`text-[11px] font-semibold cursor-pointer ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
              >
                Inventory
              </button>
            </div>

            {lowStockItems.length === 0 ? (
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>All critical spare parts are sufficiently stocked.</p>
            ) : (
              <div className="space-y-2">
                {lowStockItems.map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                    isDark ? 'bg-amber-950/20 border-amber-900/40' : 'bg-amber-50/60 border-amber-200'
                  }`}>
                    <div>
                      <div className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{item.name}</div>
                      <div className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Category: {item.category}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>{item.currentStock} left</div>
                      <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Min: {item.minStockAlert}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category Service Distribution */}
          <div className={`p-4 rounded-xl border ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
          }`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Category Workload</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className={`p-2.5 rounded-lg border ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-blue-50/60 border-blue-100'
              }`}>
                <span className={`text-[11px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Laptops</span>
                <span className={`text-base font-bold font-mono ${isDark ? 'text-white' : 'text-blue-950'}`}>{categoryCounts.laptop || 0}</span>
              </div>
              <div className={`p-2.5 rounded-lg border ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-blue-50/60 border-blue-100'
              }`}>
                <span className={`text-[11px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>CCTV Systems</span>
                <span className={`text-base font-bold font-mono ${isDark ? 'text-white' : 'text-blue-950'}`}>{categoryCounts.cctv || 0}</span>
              </div>
              <div className={`p-2.5 rounded-lg border ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-blue-50/60 border-blue-100'
              }`}>
                <span className={`text-[11px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Desktops</span>
                <span className={`text-base font-bold font-mono ${isDark ? 'text-white' : 'text-blue-950'}`}>{categoryCounts.desktop || 0}</span>
              </div>
              <div className={`p-2.5 rounded-lg border ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-blue-50/60 border-blue-100'
              }`}>
                <span className={`text-[11px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Printers & Others</span>
                <span className={`text-base font-bold font-mono ${isDark ? 'text-white' : 'text-blue-950'}`}>{(categoryCounts.printer || 0) + (categoryCounts.network || 0) + (categoryCounts.general || 0)}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
