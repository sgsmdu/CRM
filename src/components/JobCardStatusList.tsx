import React, { useState, useMemo } from 'react';
import { 
  Search, 
  X, 
  Share2, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  PauseCircle, 
  Truck, 
  ShoppingBag, 
  CreditCard, 
  Package, 
  UserCheck, 
  Layers, 
  ExternalLink, 
  RefreshCw,
  FileQuestion,
  ChevronRight,
  Filter
} from 'lucide-react';
import { JobCard, JobStatus, Invoice } from '../types';
import { useSgs } from '../context/SgsContext';

interface JobCardStatusListProps {
  onSelectJob?: (job: JobCard) => void;
  onOpenNewJobModal?: () => void;
}

interface StatusCategoryDef {
  id: string;
  title: string;
  matcher: (job: JobCard) => boolean;
  icon: React.ElementType;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  headerBg: string;
  accentColor: string;
}

export const JobCardStatusList: React.FC<JobCardStatusListProps> = ({ 
  onSelectJob,
  onOpenNewJobModal 
}) => {
  const { jobCards = [], invoices = [], theme } = useSgs();
  const isDark = theme === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('all');

  // The 13 exact status categories requested by user
  const categories: StatusCategoryDef[] = useMemo(() => [
    {
      id: 'received',
      title: 'Received (Inspection)',
      matcher: (j) => j.status === 'received',
      icon: Search,
      badgeBg: isDark ? 'bg-sky-950/80' : 'bg-sky-100',
      badgeText: isDark ? 'text-sky-300' : 'text-sky-800',
      borderColor: isDark ? 'border-sky-800/80' : 'border-sky-200',
      headerBg: isDark ? 'bg-sky-950/40' : 'bg-sky-50/70',
      accentColor: 'text-sky-500'
    },
    {
      id: 'in_process',
      title: 'In Process',
      matcher: (j) => j.status === 'in_process',
      icon: Clock,
      badgeBg: isDark ? 'bg-amber-950/80' : 'bg-amber-100',
      badgeText: isDark ? 'text-amber-300' : 'text-amber-800',
      borderColor: isDark ? 'border-amber-800/80' : 'border-amber-200',
      headerBg: isDark ? 'bg-amber-950/40' : 'bg-amber-50/70',
      accentColor: 'text-amber-500'
    },
    {
      id: 'quotation_pending',
      title: 'Quotation Pending',
      matcher: (j) => j.status === 'quotation_pending',
      icon: FileQuestion,
      badgeBg: isDark ? 'bg-orange-950/80' : 'bg-orange-100',
      badgeText: isDark ? 'text-orange-300' : 'text-orange-800',
      borderColor: isDark ? 'border-orange-800/80' : 'border-orange-200',
      headerBg: isDark ? 'bg-orange-950/40' : 'bg-orange-50/70',
      accentColor: 'text-orange-500'
    },
    {
      id: 'waiting_parts',
      title: 'Waiting for Parts',
      matcher: (j) => j.status === 'waiting_parts',
      icon: Package,
      badgeBg: isDark ? 'bg-purple-950/80' : 'bg-purple-100',
      badgeText: isDark ? 'text-purple-300' : 'text-purple-800',
      borderColor: isDark ? 'border-purple-800/80' : 'border-purple-200',
      headerBg: isDark ? 'bg-purple-950/40' : 'bg-purple-50/70',
      accentColor: 'text-purple-500'
    },
    {
      id: 'customer_approval',
      title: 'Customer Approved',
      matcher: (j) => j.status === 'customer_approval',
      icon: UserCheck,
      badgeBg: isDark ? 'bg-teal-950/80' : 'bg-teal-100',
      badgeText: isDark ? 'text-teal-300' : 'text-teal-800',
      borderColor: isDark ? 'border-teal-800/80' : 'border-teal-200',
      headerBg: isDark ? 'bg-teal-950/40' : 'bg-teal-50/70',
      accentColor: 'text-teal-500'
    },
    {
      id: 'customer_discussion',
      title: 'Customer Discussion',
      matcher: (j) => j.status === 'customer_discussion',
      icon: MessageSquare,
      badgeBg: isDark ? 'bg-indigo-950/80' : 'bg-indigo-100',
      badgeText: isDark ? 'text-indigo-300' : 'text-indigo-800',
      borderColor: isDark ? 'border-indigo-800/80' : 'border-indigo-200',
      headerBg: isDark ? 'bg-indigo-950/40' : 'bg-indigo-50/70',
      accentColor: 'text-indigo-500'
    },
    {
      id: 'work_completed',
      title: 'Work Completed',
      matcher: (j) => j.status === 'work_completed',
      icon: CheckCircle2,
      badgeBg: isDark ? 'bg-green-950/80' : 'bg-green-100',
      badgeText: isDark ? 'text-green-300' : 'text-green-800',
      borderColor: isDark ? 'border-green-800/80' : 'border-green-200',
      headerBg: isDark ? 'bg-green-950/40' : 'bg-green-50/70',
      accentColor: 'text-green-500'
    },
    {
      id: 'billed',
      title: 'Billed',
      matcher: (j) => j.status === 'billed',
      icon: CreditCard,
      badgeBg: isDark ? 'bg-cyan-950/80' : 'bg-cyan-100',
      badgeText: isDark ? 'text-cyan-300' : 'text-cyan-800',
      borderColor: isDark ? 'border-cyan-800/80' : 'border-cyan-200',
      headerBg: isDark ? 'bg-cyan-950/40' : 'bg-cyan-50/70',
      accentColor: 'text-cyan-500'
    },
    {
      id: 'payment_pending',
      title: 'Payment Pending',
      matcher: (j) => j.status === 'payment_pending',
      icon: AlertCircle,
      badgeBg: isDark ? 'bg-yellow-950/80' : 'bg-yellow-100',
      badgeText: isDark ? 'text-yellow-300' : 'text-yellow-800',
      borderColor: isDark ? 'border-yellow-800/80' : 'border-yellow-200',
      headerBg: isDark ? 'bg-yellow-950/40' : 'bg-yellow-50/70',
      accentColor: 'text-yellow-500'
    },
    {
      id: 'ready_for_pickup',
      title: 'Ready for Pickup',
      matcher: (j) => j.status === 'completed' || j.status === 'pickup_ready',
      icon: ShoppingBag,
      badgeBg: isDark ? 'bg-emerald-950/80' : 'bg-emerald-100',
      badgeText: isDark ? 'text-emerald-300' : 'text-emerald-800',
      borderColor: isDark ? 'border-emerald-800/80' : 'border-emerald-200',
      headerBg: isDark ? 'bg-emerald-950/40' : 'bg-emerald-50/70',
      accentColor: 'text-emerald-500'
    },
    {
      id: 'delivered',
      title: 'Delivered',
      matcher: (j) => j.status === 'delivered',
      icon: Truck,
      badgeBg: isDark ? 'bg-slate-800' : 'bg-slate-200',
      badgeText: isDark ? 'text-slate-300' : 'text-slate-800',
      borderColor: isDark ? 'border-slate-700' : 'border-slate-300',
      headerBg: isDark ? 'bg-slate-900/60' : 'bg-slate-100/70',
      accentColor: 'text-slate-500'
    },
    {
      id: 'hold',
      title: 'On Hold',
      matcher: (j) => j.status === 'hold',
      icon: PauseCircle,
      badgeBg: isDark ? 'bg-rose-950/80' : 'bg-rose-100',
      badgeText: isDark ? 'text-rose-300' : 'text-rose-800',
      borderColor: isDark ? 'border-rose-800/80' : 'border-rose-200',
      headerBg: isDark ? 'bg-rose-950/40' : 'bg-rose-50/70',
      accentColor: 'text-rose-500'
    },
    {
      id: 'other',
      title: 'Other Stage',
      matcher: (j) => j.status === 'other',
      icon: Layers,
      badgeBg: isDark ? 'bg-violet-950/80' : 'bg-violet-100',
      badgeText: isDark ? 'text-violet-300' : 'text-violet-800',
      borderColor: isDark ? 'border-violet-800/80' : 'border-violet-200',
      headerBg: isDark ? 'bg-violet-950/40' : 'bg-violet-50/70',
      accentColor: 'text-violet-500'
    }
  ], [isDark]);

  // Helper to extract the latest note and timestamp from a Job Card
  const getJobLatestNote = (job: JobCard): { note: string; timestamp?: string } => {
    // 1. Check timeline events backwards for latest non-empty note
    if (job.timeline && job.timeline.length > 0) {
      for (let i = job.timeline.length - 1; i >= 0; i--) {
        const ev = job.timeline[i];
        if (ev.notes && ev.notes.trim()) {
          return {
            note: ev.notes.trim(),
            timestamp: ev.timestamp
          };
        }
      }
    }
    // 2. Check technicianNotes
    if (job.technicianNotes && job.technicianNotes.trim()) {
      return {
        note: job.technicianNotes.trim(),
        timestamp: job.updatedAt || job.intakeDate
      };
    }
    // 3. Check holdReason
    if (job.holdReason && job.holdReason.trim()) {
      return {
        note: job.holdReason.trim(),
        timestamp: job.updatedAt || job.intakeDate
      };
    }
    // 4. Check workOrderNotes
    if (job.workOrderNotes && job.workOrderNotes.trim()) {
      return {
        note: job.workOrderNotes.trim(),
        timestamp: job.assignedDate || job.updatedAt
      };
    }
    // 5. Fallback to issueDescription
    if (job.issueDescription && job.issueDescription.trim()) {
      return {
        note: job.issueDescription.trim(),
        timestamp: job.intakeDate
      };
    }
    return {
      note: 'No notes logged yet.',
      timestamp: job.updatedAt || job.intakeDate
    };
  };

  // Helper to calculate pending amount for a job card
  const getJobPendingAmount = (job: JobCard): number => {
    if (job.invoiceId) {
      const inv = invoices.find(i => i.invoiceNumber === job.invoiceId || i.id === job.invoiceId);
      if (inv) {
        return Math.max(0, (inv.grandTotal || 0) - (inv.paidAmount || 0));
      }
    }
    const total = job.finalCost > 0 ? job.finalCost : (job.estimatedCost || 0);
    const paid = job.advancePaid || 0;
    return Math.max(0, total - paid);
  };

  // Helper to format timestamp
  const formatTimestamp = (ts?: string): string => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return ts;
    }
  };

  // Sort job cards by latest activity, newest first
  const sortedJobs = useMemo(() => {
    return [...jobCards].sort((a, b) => {
      const timeB = new Date(b.updatedAt || b.intakeDate).getTime();
      const timeA = new Date(a.updatedAt || a.intakeDate).getTime();
      return timeB - timeA;
    });
  }, [jobCards]);

  // Filter jobs based on search query
  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return sortedJobs;
    const q = searchQuery.toLowerCase().trim();
    return sortedJobs.filter(j => 
      (j.customerName && j.customerName.toLowerCase().includes(q)) ||
      (j.jobId && j.jobId.toLowerCase().includes(q)) ||
      (j.customerPhone && j.customerPhone.includes(q)) ||
      (j.deviceBrand && j.deviceBrand.toLowerCase().includes(q)) ||
      (j.issueDescription && j.issueDescription.toLowerCase().includes(q)) ||
      (j.technicianNotes && j.technicianNotes.toLowerCase().includes(q))
    );
  }, [sortedJobs, searchQuery]);

  // WhatsApp Share button handler for a specific status box
  const handleShareWhatsApp = (statusName: string, jobsInStatus: JobCard[]) => {
    if (!jobsInStatus.length) return;

    const header = `*SPIDER GRID SOLUTIONS CRM*\n*Status: ${statusName.toUpperCase()}*\n*Total: ${jobsInStatus.length} Job Card${jobsInStatus.length > 1 ? 's' : ''}*\n-----------------------------------\n\n`;

    const body = jobsInStatus.map((job, idx) => {
      const latest = getJobLatestNote(job);
      const pending = getJobPendingAmount(job);
      let text = `${idx + 1}. *${job.customerName}*\n   Job ID: ${job.jobId || job.id}`;
      if (job.deviceBrand) {
        text += `\n   Device: ${job.deviceBrand}`;
      }
      text += `\n   Note: ${latest.note}`;
      if (pending > 0) {
        text += `\n   Pending Balance: ₹${pending.toLocaleString('en-IN')}`;
      }
      if (latest.timestamp) {
        text += `\n   Date: ${formatTimestamp(latest.timestamp)}`;
      }
      return text;
    }).join('\n\n');

    const footer = `\n\n-----------------------------------\nSGS Workshop & Field Services | Ph: 9176795665`;
    const fullMessage = `${header}${body}${footer}`;

    // Universal WhatsApp share link without phone number so user can pick any contact or group
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullMessage)}`;
    window.open(shareUrl, '_blank');
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* Top Header Card */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className={`text-base sm:text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Job Card List (Status-wise)
            </h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              isDark ? 'bg-blue-950 text-blue-300 border border-blue-800' : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {jobCards.length} Total Jobs
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Live status categorization across all 13 workshop stages. Under each status, cards are shown as a simple numbered list with latest note & WhatsApp share.
          </p>
        </div>

        {/* Search Bar & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 sm:w-72">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer, Job ID, phone, note..."
              className={`w-full rounded-xl pl-9 pr-8 py-2 text-xs focus:outline-none transition-colors ${
                isDark 
                  ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                  : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {onOpenNewJobModal && (
            <button
              type="button"
              onClick={onOpenNewJobModal}
              className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shrink-0 shadow-sm shadow-blue-500/20 cursor-pointer"
            >
              + New Job Card
            </button>
          )}
        </div>
      </div>

      {/* Status Summary Pills / Quick Jump */}
      <div className={`p-3 rounded-xl border flex items-center gap-2 overflow-x-auto scrollbar-thin ${
        isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50/80 border-slate-200'
      }`}>
        <button
          type="button"
          onClick={() => setSelectedFilterCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
            selectedFilterCategory === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : isDark ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          All 13 Categories ({jobCards.length})
        </button>
        {categories.map((cat) => {
          const count = jobCards.filter(cat.matcher).length;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedFilterCategory(cat.id === selectedFilterCategory ? 'all' : cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                selectedFilterCategory === cat.id
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : isDark 
                    ? 'bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white' 
                    : 'bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>{cat.title}</span>
              <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                selectedFilterCategory === cat.id ? 'bg-white/20 text-white' : cat.badgeBg + ' ' + cat.badgeText
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid of 13 Status Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {categories
          .filter(cat => selectedFilterCategory === 'all' || selectedFilterCategory === cat.id)
          .map((cat) => {
            const jobsInStatus = filteredJobs.filter(cat.matcher);
            const Icon = cat.icon;
            const hasJobs = jobsInStatus.length > 0;

            return (
              <div 
                key={cat.id}
                className={`rounded-2xl border flex flex-col overflow-hidden transition-all duration-200 ${cat.borderColor} ${
                  isDark ? 'bg-slate-900/80 shadow-lg' : 'bg-white shadow-xs hover:shadow-md'
                }`}
              >
                {/* 1. Box Header: Title and Job Card Count */}
                <div className={`px-4 py-3 border-b flex items-center justify-between gap-2 shrink-0 ${cat.headerBg} ${cat.borderColor}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${cat.badgeBg} ${cat.badgeText}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className={`font-bold text-xs sm:text-sm tracking-wide uppercase truncate ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}>
                      {cat.title}
                    </h3>
                  </div>
                  
                  {/* Badge count */}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${cat.badgeBg} ${cat.badgeText} border ${cat.borderColor}`}>
                    {jobsInStatus.length}
                  </span>
                </div>

                {/* 2. Box Content: Simple Numbered List of Job Cards */}
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                    {!hasJobs ? (
                      <div className={`py-12 px-3 text-center rounded-xl border border-dashed flex flex-col items-center justify-center gap-2 ${
                        isDark ? 'border-slate-800 bg-slate-950/30 text-slate-500' : 'border-slate-200 bg-slate-50/50 text-slate-400'
                      }`}>
                        <Icon className="w-6 h-6 opacity-30" />
                        <span className="text-xs font-semibold">No Job Cards Available</span>
                        <span className="text-[11px] opacity-75">No jobs currently in this stage</span>
                      </div>
                    ) : (
                      jobsInStatus.map((job, idx) => {
                        const latest = getJobLatestNote(job);
                        const pendingAmount = getJobPendingAmount(job);

                        return (
                          <div
                            key={job.id}
                            className={`p-2.5 rounded-xl border transition-all duration-150 ${
                              isDark 
                                ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-950' 
                                : 'bg-slate-50/70 border-slate-200 hover:border-blue-300 hover:bg-white shadow-2xs'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="flex items-start gap-2 min-w-0 flex-1">
                                <span className={`text-xs font-bold pt-0.5 shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                                  {idx + 1}.
                                </span>
                                
                                <div className="min-w-0 flex-1 space-y-1">
                                  {/* Customer Name in Bold */}
                                  <div className="flex items-center justify-between gap-1">
                                    <h4 className={`font-bold text-xs truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                                      {job.customerName || 'Walk-in Customer'}
                                    </h4>
                                  </div>

                                  {/* Job Card Number in smaller text */}
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">
                                      {job.jobId || job.id}
                                    </span>
                                    {job.deviceBrand && (
                                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                                        • {job.deviceBrand}
                                      </span>
                                    )}
                                  </div>

                                  {/* Pending Amount where applicable */}
                                  {pendingAmount > 0 && (
                                    <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                                      Pending: ₹{pendingAmount.toLocaleString('en-IN')}
                                    </div>
                                  )}

                                  {/* Latest Note directly below the customer name in smaller text */}
                                  <p className={`text-[11px] leading-relaxed line-clamp-2 break-words ${
                                    isDark ? 'text-slate-300' : 'text-slate-600'
                                  }`}>
                                    {latest.note}
                                  </p>

                                  {/* Last Note Timestamp if available */}
                                  {latest.timestamp && (
                                    <span className={`text-[10px] block pt-0.5 ${
                                      isDark ? 'text-slate-400' : 'text-slate-500'
                                    }`}>
                                      {formatTimestamp(latest.timestamp)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Click to open Job Card modal */}
                              {onSelectJob && (
                                <button
                                  type="button"
                                  onClick={() => onSelectJob(job)}
                                  className={`p-1.5 rounded-lg shrink-0 transition-colors cursor-pointer ${
                                    isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                                  }`}
                                  title="View & Edit Job Card"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* 3. WhatsApp Share Button at the bottom of EACH box */}
                  <div className={`mt-3 pt-3 border-t shrink-0 ${isDark ? 'border-slate-800/80' : 'border-slate-200/80'}`}>
                    <button
                      type="button"
                      disabled={!hasJobs}
                      onClick={() => handleShareWhatsApp(cat.title, jobsInStatus)}
                      className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        hasJobs
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs shadow-emerald-600/20 active:scale-[0.99]'
                          : isDark 
                            ? 'bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed opacity-50' 
                            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                      }`}
                      title={hasJobs ? `Share all ${jobsInStatus.length} job cards in ${cat.title} via WhatsApp` : 'No Job Cards to share in this status'}
                    >
                      <Share2 className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {hasJobs ? `Share via WhatsApp (${jobsInStatus.length})` : 'No Job Cards Available'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};
