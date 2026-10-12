import React, { useState, useMemo } from 'react';
import { 
  Laptop, 
  Monitor, 
  Cctv, 
  Printer, 
  Network, 
  Cpu, 
  Plus, 
  Search, 
  MessageSquare, 
  Camera, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Truck, 
  X, 
  Image as ImageIcon,
  Copy,
  ExternalLink,
  ChevronRight,
  User,
  Phone,
  Calendar,
  IndianRupee,
  Eye,
  Trash2,
  Star,
  Check,
  ArrowRight,
  Play,
  FileText,
  ArrowUpDown,
  PauseCircle,
  RotateCcw,
  Tag,
  Info
} from 'lucide-react';
import { useSgs } from '../context/SgsContext';
import { JobCard, JobStatus, DeviceCategory, ServiceSalesType, Customer, JobTimelineEvent } from '../types';

interface JobCardManagerProps {
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  preselectedCustomer: Customer | null;
  onClearPreselectedCustomer: () => void;
  selectedJobForWhatsApp: JobCard | null;
  setSelectedJobForWhatsApp: (job: JobCard | null) => void;
  onNavigateToBilling?: (jobId?: string) => void;
}

export const JobCardManager: React.FC<JobCardManagerProps> = ({
  isCreateModalOpen,
  setIsCreateModalOpen,
  preselectedCustomer,
  onClearPreselectedCustomer,
  selectedJobForWhatsApp,
  setSelectedJobForWhatsApp,
  onNavigateToBilling,
}) => {
  const { 
    customers, 
    jobCards, 
    addJobCard, 
    updateJobCardStatus, 
    updateJobCard, 
    deleteJobCard, 
    toggleCallCompleted,
    addJobTimelineEvent,
    getWhatsAppLinks, 
    theme 
  } = useSgs();
  
  const isDark = theme === 'dark';

  // Filters & Multiple Sort Options
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'long_pending' | 'today_call' | 'date_newest' | 'date_oldest' | 'status'>('long_pending');

  // Timeline Step Modal State (In process, Quote, Approval, Discussion, Work Completed, Bill, Pickup note, Call review, Call close, Hold, Other)
  const [timelineModalJob, setTimelineModalJob] = useState<JobCard | null>(null);
  const [timelineTargetStage, setTimelineTargetStage] = useState<
    | 'in_process' 
    | 'quote_given' 
    | 'customer_approval' 
    | 'customer_discussion' 
    | 'work_completed' 
    | 'billed' 
    | 'pickup_note' 
    | 'call_review' 
    | 'call_close' 
    | 'hold' 
    | 'other'
  >('in_process');
  const [timelineNotes, setTimelineNotes] = useState('');
  const [timelineQuoteAmount, setTimelineQuoteAmount] = useState<number>(0);
  const [timelineOtherName, setTimelineOtherName] = useState('');
  const [timelineHoldReason, setTimelineHoldReason] = useState('');
  const [viewHistoryJob, setViewHistoryJob] = useState<JobCard | null>(null);

  // Active Photo Lightbox
  const [activePhotoLightbox, setActivePhotoLightbox] = useState<string | null>(null);

  // WhatsApp Modal state
  const [whatsAppTab, setWhatsAppTab] = useState<'welcome' | 'status' | 'review'>('welcome');
  const [customNotes, setCustomNotes] = useState('');
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Form State for New Job Card
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerArea, setCustomerArea] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  const [jobType, setJobType] = useState<ServiceSalesType>('service');
  const [category, setCategory] = useState<DeviceCategory>('laptop');
  const [deviceBrand, setDeviceBrand] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [intakeDate, setIntakeDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [devicePhotos, setDevicePhotos] = useState<string[]>([]);

  // Update form if preselected customer changes
  React.useEffect(() => {
    if (preselectedCustomer) {
      setCustomerId(preselectedCustomer.id);
      setCustomerName(preselectedCustomer.name);
      setCustomerPhone(preselectedCustomer.phone);
      setCustomerArea(preselectedCustomer.area);
      setIsCreateModalOpen(true);
    }
  }, [preselectedCustomer]);

  // Autocomplete Golden Customers for Search & Select
  const searchedCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers.slice(0, 10);
    const q = customerSearchQuery.toLowerCase().trim();
    return customers.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.phone && c.phone.includes(q)) || 
      (c.area && c.area.toLowerCase().includes(q)) ||
      String(c.slNo).includes(q)
    );
  }, [customers, customerSearchQuery]);

  const handleSelectCustomer = (c: Customer) => {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setCustomerArea(c.area);
    setCustomerSearchQuery('');
    setIsCustomerDropdownOpen(false);
  };

  const handleClearSelectedCustomer = () => {
    setCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerArea('');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          setDevicePhotos(prev => [...prev, base64]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (index: number) => {
    setDevicePhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !deviceBrand.trim() || !issueDescription.trim()) {
      alert('Please fill in Customer Name, Device Brand/Model, and Issue Description');
      return;
    }

    const newJob = addJobCard({
      customerId: customerId || `cust-${Date.now()}`,
      customerName,
      customerPhone,
      customerArea,
      type: jobType,
      category,
      deviceBrand,
      serialNumber,
      issueDescription,
      status: 'received',
      intakeDate,
      estimatedDelivery,
      devicePhotos,
      estimatedCost: Number(estimatedCost) || 0,
      finalCost: 0,
      technicianNotes,
    });

    // Reset and close
    setIsCreateModalOpen(false);
    onClearPreselectedCustomer();
    setCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerArea('');
    setDevicePhotos([]);
    setDeviceBrand('');
    setSerialNumber('');
    setIssueDescription('');
    setEstimatedCost(0);
    setTechnicianNotes('');

    // Prompt WhatsApp welcome message
    setSelectedJobForWhatsApp(newJob);
    setWhatsAppTab('welcome');
  };

  // Filtered and Sorted Job Cards
  const filteredJobs = useMemo(() => {
    const list = jobCards.filter(job => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        job.jobId.toLowerCase().includes(q) ||
        job.customerName.toLowerCase().includes(q) ||
        (job.customerPhone && job.customerPhone.includes(q)) ||
        job.deviceBrand.toLowerCase().includes(q) ||
        job.issueDescription.toLowerCase().includes(q);

      const matchesCat = selectedCategory === 'all' || job.category === selectedCategory;
      const matchesStatus = selectedStatus === 'all' || job.status === selectedStatus;
      const matchesType = selectedType === 'all' || job.type === selectedType;

      return matchesSearch && matchesCat && matchesStatus && matchesType;
    });

    const todayStr = new Date().toISOString().split('T')[0];

    return list.sort((a, b) => {
      if (sortBy === 'long_pending') {
        // Pending jobs (not delivered/completed) sorted oldest intake date first
        const isADone = a.status === 'delivered' || a.status === 'completed';
        const isBDone = b.status === 'delivered' || b.status === 'completed';
        if (!isADone && isBDone) return -1;
        if (isADone && !isBDone) return 1;
        return new Date(a.intakeDate).getTime() - new Date(b.intakeDate).getTime();
      }
      if (sortBy === 'today_call') {
        // Today's calls needed (uncalled pending jobs prioritized)
        if (!a.callCompleted && b.callCompleted) return -1;
        if (a.callCompleted && !b.callCompleted) return 1;
        return new Date(b.intakeDate).getTime() - new Date(a.intakeDate).getTime();
      }
      if (sortBy === 'date_newest') {
        return new Date(b.intakeDate).getTime() - new Date(a.intakeDate).getTime();
      }
      if (sortBy === 'date_oldest') {
        return new Date(a.intakeDate).getTime() - new Date(b.intakeDate).getTime();
      }
      if (sortBy === 'status') {
        return a.status.localeCompare(b.status);
      }
      return 0;
    });
  }, [jobCards, searchQuery, selectedCategory, selectedStatus, selectedType, sortBy]);

  const categoryIcons: Record<DeviceCategory, React.ElementType> = {
    laptop: Laptop,
    desktop: Monitor,
    cctv: Cctv,
    printer: Printer,
    network: Network,
    general: Cpu,
  };

  const statusMap: Record<JobStatus, { label: string; bg: string; text: string }> = {
    received: { 
      label: 'Intake / Inspection', 
      bg: isDark ? 'bg-sky-950/60 border-sky-800' : 'bg-sky-50 border-sky-200', 
      text: isDark ? 'text-sky-300' : 'text-sky-700 font-semibold' 
    },
    in_process: { 
      label: 'In Process', 
      bg: isDark ? 'bg-amber-950/60 border-amber-800' : 'bg-amber-50 border-amber-200', 
      text: isDark ? 'text-amber-300' : 'text-amber-800 font-semibold' 
    },
    quotation_pending: { 
      label: 'Quotation Pending', 
      bg: isDark ? 'bg-orange-950/60 border-orange-800' : 'bg-orange-50 border-orange-200', 
      text: isDark ? 'text-orange-300' : 'text-orange-800 font-semibold' 
    },
    waiting_parts: { 
      label: 'Waiting for Parts', 
      bg: isDark ? 'bg-purple-950/60 border-purple-800' : 'bg-purple-50 border-purple-200', 
      text: isDark ? 'text-purple-300' : 'text-purple-800 font-semibold' 
    },
    completed: { 
      label: 'Ready for Pickup', 
      bg: isDark ? 'bg-emerald-950/60 border-emerald-800' : 'bg-emerald-50 border-emerald-200', 
      text: isDark ? 'text-emerald-300' : 'text-emerald-700 font-semibold' 
    },
    delivered: { 
      label: 'Delivered', 
      bg: isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200', 
      text: isDark ? 'text-slate-400' : 'text-slate-600 font-semibold' 
    },
    customer_approval: {
      label: 'Customer Approved',
      bg: isDark ? 'bg-teal-950/60 border-teal-800' : 'bg-teal-50 border-teal-200',
      text: isDark ? 'text-teal-300' : 'text-teal-700 font-semibold',
    },
    customer_discussion: {
      label: 'Customer Discussion',
      bg: isDark ? 'bg-indigo-950/60 border-indigo-800' : 'bg-indigo-50 border-indigo-200',
      text: isDark ? 'text-indigo-300' : 'text-indigo-700 font-semibold',
    },
    work_completed: {
      label: 'Work Completed',
      bg: isDark ? 'bg-green-950/60 border-green-800' : 'bg-green-50 border-green-200',
      text: isDark ? 'text-green-300' : 'text-green-700 font-semibold',
    },
    billed: {
      label: 'Billed (Invoice Created)',
      bg: isDark ? 'bg-cyan-950/60 border-cyan-800' : 'bg-cyan-50 border-cyan-200',
      text: isDark ? 'text-cyan-300' : 'text-cyan-700 font-semibold',
    },
    pickup_ready: {
      label: 'Pickup Note Ready',
      bg: isDark ? 'bg-blue-950/60 border-blue-800' : 'bg-blue-50 border-blue-200',
      text: isDark ? 'text-blue-300' : 'text-blue-700 font-semibold',
    },
    hold: {
      label: 'On Hold',
      bg: isDark ? 'bg-rose-950/60 border-rose-800' : 'bg-rose-50 border-rose-200',
      text: isDark ? 'text-rose-300' : 'text-rose-700 font-semibold',
    },
    other: {
      label: 'Other Stage',
      bg: isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300',
      text: isDark ? 'text-slate-300' : 'text-slate-700 font-semibold',
    },
  };

  // WhatsApp Dialog links & message
  const activeWaLinks = selectedJobForWhatsApp ? getWhatsAppLinks(selectedJobForWhatsApp) : null;
  
  const currentWaMessage = useMemo(() => {
    if (!activeWaLinks) return '';
    if (whatsAppTab === 'welcome') return activeWaLinks.welcomeMessage;
    if (whatsAppTab === 'review') return activeWaLinks.reviewMessage;
    return customNotes ? `${activeWaLinks.statusMessage}\n\n*Tech Update:* ${customNotes}` : activeWaLinks.statusMessage;
  }, [activeWaLinks, whatsAppTab, customNotes]);

  const currentWaUrl = useMemo(() => {
    if (!selectedJobForWhatsApp) return '#';
    const cleanPhone = selectedJobForWhatsApp.customerPhone.replace(/[^0-9]/g, '');
    const phone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    return `https://wa.me/${phone}?text=${encodeURIComponent(currentWaMessage)}`;
  }, [selectedJobForWhatsApp, currentWaMessage]);

  const handleCopyMessage = () => {
    if (currentWaMessage) {
      navigator.clipboard.writeText(currentWaMessage);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Action & KPI Bar */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 transition-colors ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
      }`}>
        <div>
          <h2 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Service & Sales Work Orders
          </h2>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Manage workshop jobs, phone calls, photo intakes, and WhatsApp notifications
          </p>
        </div>

        <button
          onClick={() => {
            onClearPreselectedCustomer();
            setCustomerId('');
            setCustomerName('');
            setCustomerPhone('');
            setCustomerArea('');
            setIsCreateModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-md shadow-blue-500/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Job Card</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className={`p-4 rounded-xl border space-y-3 transition-colors ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
      }`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search Input */}
          <div className="relative">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Job ID, client, device..."
              className={`w-full rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none transition-colors ${
                isDark 
                  ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                  : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
              }`}
            />
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className={`w-full rounded-lg px-3 py-1.5 text-xs focus:outline-none transition-colors ${
              isDark 
                ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
            }`}
          >
            <option value="all">All Statuses ({jobCards.length})</option>
            <option value="received">Intake Registered</option>
            <option value="in_process">In Process</option>
            <option value="quotation_pending">Quotation Pending</option>
            <option value="waiting_parts">Waiting for Parts</option>
            <option value="customer_approval">Customer Approved</option>
            <option value="customer_discussion">Customer Discussion</option>
            <option value="work_completed">Work Completed</option>
            <option value="billed">Billed</option>
            <option value="completed">Ready for Pickup</option>
            <option value="delivered">Delivered</option>
            <option value="hold">On Hold</option>
            <option value="other">Other Stage</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`w-full rounded-lg px-3 py-1.5 text-xs focus:outline-none transition-colors ${
              isDark 
                ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
            }`}
          >
            <option value="all">All Device Categories</option>
            <option value="laptop">Laptops</option>
            <option value="desktop">Desktops</option>
            <option value="cctv">CCTV & Surveillance</option>
            <option value="printer">Printers</option>
            <option value="network">Network & Wi-Fi</option>
            <option value="general">General Hardware</option>
          </select>

          {/* Multiple Sort Options */}
          <div className="flex items-center gap-1.5">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={`w-full rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none transition-colors ${
                isDark 
                  ? 'bg-blue-950/60 border border-blue-800 text-blue-300 focus:border-blue-500' 
                  : 'bg-blue-50 border border-blue-300 text-blue-800 focus:bg-white focus:border-blue-600 font-bold'
              }`}
            >
              <option value="long_pending">⚡ Sort: Long Time Pending First</option>
              <option value="today_call">📞 Sort: Today Calls Pending</option>
              <option value="date_newest">📅 Sort: Newest Date / Time</option>
              <option value="date_oldest">⏳ Sort: Oldest Date / Time</option>
              <option value="status">🏷️ Sort: By Workflow Status</option>
            </select>
          </div>
        </div>

        {/* Type Filter & Summary strip */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Type:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSelectedType('all')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium cursor-pointer transition-colors ${
                  selectedType === 'all'
                    ? 'bg-blue-600 text-white font-bold'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('service')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium cursor-pointer transition-colors ${
                  selectedType === 'service'
                    ? 'bg-blue-600 text-white font-bold'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Service & Repairs
              </button>
              <button
                type="button"
                onClick={() => setSelectedType('sales')}
                className={`px-2.5 py-1 text-xs rounded-md font-medium cursor-pointer transition-colors ${
                  selectedType === 'sales'
                    ? 'bg-blue-600 text-white font-bold'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sales & Parts
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
            Showing <strong className={`font-mono ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{filteredJobs.length}</strong> work orders
          </span>
          {(searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all' || selectedType !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedStatus('all');
                setSelectedType('all');
              }}
              className="text-xs text-blue-600 hover:underline cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Job Card List */}
      <div className="space-y-3">
        {filteredJobs.length === 0 ? (
          <div className={`p-12 text-center rounded-xl border ${
            isDark ? 'bg-slate-900/40 border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-400'
          }`}>
            <p className="text-sm font-semibold">No job cards match your criteria</p>
            <p className="text-xs mt-1">Try resetting the search terms or create a new job card.</p>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const Icon = categoryIcons[job.category] || Cpu;
            const statusConfig = statusMap[job.status] || statusMap.received;
            const isCompletedOrDelivered = job.status === 'completed' || job.status === 'delivered';

            return (
              <div 
                key={job.id}
                className={`p-4 rounded-xl border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-all ${
                  isDark ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200/90 hover:border-blue-300 shadow-xs'
                }`}
              >
                {/* Left Device & Customer Details */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                    job.type === 'service' 
                      ? (isDark ? 'bg-blue-950/60 border-blue-800 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600')
                      : (isDark ? 'bg-indigo-950/60 border-indigo-800 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600')
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-mono font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                        {job.jobId}
                      </span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                        job.type === 'service'
                          ? (isDark ? 'bg-blue-950 text-blue-400 border-blue-900' : 'bg-blue-50 text-blue-700 border-blue-200')
                          : (isDark ? 'bg-indigo-950 text-indigo-400 border-indigo-900' : 'bg-indigo-50 text-indigo-700 border-indigo-200')
                      }`}>
                        {job.type}
                      </span>
                      <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'} truncate`}>
                        {job.deviceBrand}
                      </span>
                      {job.serialNumber && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                          isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                        }`}>
                          S/N: {job.serialNumber}
                        </span>
                      )}
                    </div>

                    {/* Customer Row */}
                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      <div className="flex items-center gap-1 font-medium">
                        <User className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                        <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>{job.customerName}</span>
                      </div>
                      
                      {job.customerPhone && (
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <Phone className={`w-3 h-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                          <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>{job.customerPhone}</span>
                        </div>
                      )}

                      {job.customerArea && (
                        <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          ({job.customerArea})
                        </span>
                      )}
                    </div>

                    {/* Issue Description */}
                    <p className={`text-xs italic line-clamp-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      "{job.issueDescription}"
                    </p>

                    {/* Meta Tags, Dates & Photos */}
                    <div className="flex items-center gap-3 text-[11px] pt-1 flex-wrap">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                        Intake: {job.intakeDate}
                      </span>
                      {job.estimatedDelivery && (
                        <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                          Est Delivery: <strong className={isDark ? 'text-slate-300' : 'text-slate-700'}>{job.estimatedDelivery}</strong>
                        </span>
                      )}
                      <span className={`font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Est: ₹{job.estimatedCost.toLocaleString('en-IN')}
                      </span>

                      {job.devicePhotos && job.devicePhotos.length > 0 && (
                        <div className="flex items-center gap-1.5 ml-auto">
                          <span className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Photos ({job.devicePhotos.length}):</span>
                          <div className="flex items-center gap-1">
                            {job.devicePhotos.map((photo, pIdx) => (
                              <button
                                key={pIdx}
                                onClick={() => setActivePhotoLightbox(photo)}
                                className="w-6 h-6 rounded border border-slate-300 dark:border-slate-700 overflow-hidden hover:opacity-80 transition-opacity cursor-pointer"
                                title="Click to view full photo"
                              >
                                <img src={photo} alt="Device thumbnail" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Interactive Workflow Lifecycle Bar (Tamil brief: In process -> Quote -> Customer approval -> Customer discussion -> Work Completed -> Bill -> Pickup note -> Call review -> Call close -> Hold / Other) */}
                    <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Quick Stage Action:
                      </span>

                      {/* In Process Action */}
                      <button
                        type="button"
                        onClick={() => {
                          setTimelineModalJob(job);
                          setTimelineTargetStage('in_process');
                          setTimelineNotes(job.technicianNotes || 'Started diagnosing hardware');
                        }}
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border transition-all cursor-pointer ${
                          job.status === 'in_process'
                            ? 'bg-amber-500 text-white font-bold border-amber-600 shadow-xs'
                            : (isDark ? 'bg-amber-950/40 border-amber-900 text-amber-300 hover:bg-amber-900/60' : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100')
                        }`}
                        title="Click to record In Process start with notes & time"
                      >
                        ⚡ In Process
                      </button>

                      {/* Quote Action */}
                      <button
                        type="button"
                        onClick={() => {
                          setTimelineModalJob(job);
                          setTimelineTargetStage('quote_given');
                          setTimelineQuoteAmount(job.estimatedCost || 1200);
                          setTimelineNotes('Given estimated quote to customer');
                        }}
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border transition-all cursor-pointer ${
                          job.status === 'quotation_pending'
                            ? 'bg-orange-500 text-white font-bold border-orange-600 shadow-xs'
                            : (isDark ? 'bg-orange-950/40 border-orange-900 text-orange-300 hover:bg-orange-900/60' : 'bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100')
                        }`}
                        title="Record Quotation given with amount & notes"
                      >
                        💰 Quote
                      </button>

                      {/* Customer Approval */}
                      <button
                        type="button"
                        onClick={() => {
                          setTimelineModalJob(job);
                          setTimelineTargetStage('customer_approval');
                          setTimelineNotes('Customer approved the quotation & proceeding with work');
                        }}
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border transition-all cursor-pointer ${
                          job.status === 'customer_approval'
                            ? 'bg-teal-600 text-white font-bold border-teal-700 shadow-xs'
                            : (isDark ? 'bg-teal-950/40 border-teal-900 text-teal-300 hover:bg-teal-900/60' : 'bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100')
                        }`}
                        title="Record Customer Approval"
                      >
                        👍 Approval
                      </button>

                      {/* Customer Discussion */}
                      <button
                        type="button"
                        onClick={() => {
                          setTimelineModalJob(job);
                          setTimelineTargetStage('customer_discussion');
                          setTimelineNotes('Discussed repair options & part availability with customer');
                        }}
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border transition-all cursor-pointer ${
                          job.status === 'customer_discussion'
                            ? 'bg-indigo-600 text-white font-bold border-indigo-700 shadow-xs'
                            : (isDark ? 'bg-indigo-950/40 border-indigo-900 text-indigo-300 hover:bg-indigo-900/60' : 'bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100')
                        }`}
                        title="Record Customer Discussion with notes"
                      >
                        💬 Discussion
                      </button>

                      {/* Work Completed */}
                      <button
                        type="button"
                        onClick={() => {
                          setTimelineModalJob(job);
                          setTimelineTargetStage('work_completed');
                          setTimelineNotes('Device fully repaired, tested & quality-checked');
                        }}
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border transition-all cursor-pointer ${
                          job.status === 'work_completed'
                            ? 'bg-green-600 text-white font-bold border-green-700 shadow-xs'
                            : (isDark ? 'bg-green-950/40 border-green-900 text-green-300 hover:bg-green-900/60' : 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100')
                        }`}
                        title="Record Work Completed"
                      >
                        ✅ Work Done
                      </button>

                      {/* Bill (Direct to Billing) */}
                      <button
                        type="button"
                        onClick={() => {
                          if (onNavigateToBilling) {
                            onNavigateToBilling(job.id);
                          } else {
                            setTimelineModalJob(job);
                            setTimelineTargetStage('billed');
                            setTimelineNotes('Invoice raised in billing system');
                          }
                        }}
                        className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md border transition-all cursor-pointer flex items-center gap-1 ${
                          job.status === 'billed'
                            ? 'bg-cyan-600 text-white border-cyan-700 shadow-xs'
                            : (isDark ? 'bg-cyan-950/50 border-cyan-800 text-cyan-300 hover:bg-cyan-700 hover:text-white' : 'bg-cyan-50 border-cyan-300 text-cyan-800 hover:bg-cyan-600 hover:text-white')
                        }`}
                        title="Click to generate bill - opens Billing directly"
                      >
                        <FileText className="w-3 h-3" />
                        <span>🧾 Bill Now</span>
                      </button>

                      {/* Pickup Note */}
                      <button
                        type="button"
                        onClick={() => {
                          setTimelineModalJob(job);
                          setTimelineTargetStage('pickup_note');
                          setTimelineNotes('Informed customer device is packed & ready for pickup');
                        }}
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border transition-all cursor-pointer ${
                          job.status === 'pickup_ready' || job.status === 'completed'
                            ? 'bg-blue-600 text-white font-bold border-blue-700 shadow-xs'
                            : (isDark ? 'bg-blue-950/40 border-blue-900 text-blue-300 hover:bg-blue-900/60' : 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100')
                        }`}
                        title="Record Pickup Note"
                      >
                        📦 Pickup Note
                      </button>

                      {/* Call Review */}
                      <button
                        type="button"
                        onClick={() => {
                          setTimelineModalJob(job);
                          setTimelineTargetStage('call_review');
                          setTimelineNotes('Customer called back for performance check & satisfaction review');
                        }}
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border transition-all cursor-pointer ${
                          isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                        }`}
                        title="Record Call Review"
                      >
                        ⭐ Call Review
                      </button>

                      {/* Call Close */}
                      <button
                        type="button"
                        onClick={() => {
                          setTimelineModalJob(job);
                          setTimelineTargetStage('call_close');
                          setTimelineNotes('Work card and post-service follow-up closed');
                        }}
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border transition-all cursor-pointer ${
                          job.status === 'delivered'
                            ? 'bg-slate-700 text-white font-bold border-slate-800 shadow-xs'
                            : (isDark ? 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100')
                        }`}
                        title="Call Close & Deliver"
                      >
                        🏁 Call Close
                      </button>

                      {/* Hold Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setTimelineModalJob(job);
                          setTimelineTargetStage('hold');
                          setTimelineHoldReason(job.holdReason || 'Customer requested postponement / awaiting spare shipment');
                          setTimelineNotes(job.holdReason || 'Put on hold');
                        }}
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border transition-all cursor-pointer ${
                          job.status === 'hold'
                            ? 'bg-rose-600 text-white font-bold border-rose-700 shadow-xs'
                            : (isDark ? 'bg-rose-950/40 border-rose-900 text-rose-300 hover:bg-rose-900/60' : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100')
                        }`}
                        title="Put Job on Hold"
                      >
                        ⏸️ Hold
                      </button>

                      {/* Other Manual Stage */}
                      <button
                        type="button"
                        onClick={() => {
                          setTimelineModalJob(job);
                          setTimelineTargetStage('other');
                          setTimelineOtherName(job.otherStatusText || 'Outside Lab Rework');
                          setTimelineNotes('Custom workshop transition step');
                        }}
                        className={`px-2 py-0.5 text-[11px] font-semibold rounded-md border transition-all cursor-pointer ${
                          job.status === 'other'
                            ? 'bg-purple-600 text-white font-bold border-purple-700 shadow-xs'
                            : (isDark ? 'bg-purple-950/40 border-purple-900 text-purple-300 hover:bg-purple-900/60' : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100')
                        }`}
                        title="Custom / Manual Stage Input"
                      >
                        ✍️ Others
                      </button>

                      {/* View Timeline History */}
                      <button
                        type="button"
                        onClick={() => setViewHistoryJob(job)}
                        className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 ml-auto font-semibold cursor-pointer"
                        title="View complete date & time event ledger"
                      >
                        <Clock className="w-3 h-3 text-blue-500" />
                        <span>Timeline Log ({job.timeline?.length || 0})</span>
                      </button>
                    </div>

                    {/* Hold Reason Banner if On Hold */}
                    {job.status === 'hold' && (
                      <div className={`mt-1.5 p-2 rounded-lg text-xs flex items-center gap-2 border ${
                        isDark ? 'bg-rose-950/30 border-rose-900/80 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}>
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span><strong>Job On Hold:</strong> {job.holdReason || job.technicianNotes || 'Awaiting customer response or rare spare arrival'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Interactive Controls: Status Selector, Call Tracker, and WhatsApp */}
                <div className={`flex flex-col sm:flex-row lg:flex-col items-end gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 ${
                  isDark ? 'border-slate-800' : 'border-slate-200'
                }`}>
                  
                  {/* Status Dropdown */}
                  <div className="w-full sm:w-auto">
                    <select
                      value={job.status}
                      onChange={(e) => {
                        const newStat = e.target.value as JobStatus;
                        updateJobCardStatus(job.id, newStat);
                        addJobTimelineEvent(job.id, {
                          stage: newStat as any,
                          stageLabel: statusMap[newStat]?.label || newStat,
                          timestamp: new Date().toISOString(),
                          notes: `Status changed to ${statusMap[newStat]?.label || newStat}`,
                        });
                      }}
                      className={`w-full sm:w-48 text-xs font-semibold px-3 py-1.5 rounded-lg border cursor-pointer ${statusConfig.bg} ${statusConfig.text}`}
                    >
                      <option value="received">Received (Inspection)</option>
                      <option value="in_process">In Process</option>
                      <option value="quotation_pending">Quotation Pending</option>
                      <option value="waiting_parts">Waiting for Parts</option>
                      <option value="customer_approval">Customer Approved</option>
                      <option value="customer_discussion">Customer Discussion</option>
                      <option value="work_completed">Work Completed</option>
                      <option value="billed">Billed</option>
                      <option value="completed">Ready for Pickup</option>
                      <option value="delivered">Delivered</option>
                      <option value="hold">On Hold</option>
                      <option value="other">Other Stage</option>
                    </select>
                  </div>

                  {/* Call Tracking & Completed Indicator */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    
                    {/* Phone Call Trigger */}
                    {job.customerPhone && (
                      <a
                        href={`tel:${job.customerPhone}`}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isDark ? 'text-blue-400 bg-blue-950/60 hover:bg-blue-900 border border-blue-900' : 'text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200'
                        }`}
                        title={`Call ${job.customerName}: ${job.customerPhone}`}
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {/* Call Completed Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleCallCompleted(job.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                        job.callCompleted
                          ? (isDark ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800')
                          : (isDark ? 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-900')
                      }`}
                      title={job.callCompleted ? `Call recorded on ${job.lastCalledAt || 'record'}` : 'Click to mark phone call completed'}
                    >
                      <CheckCircle2 className={`w-3.5 h-3.5 ${job.callCompleted ? 'text-emerald-500 fill-emerald-500/20' : 'text-slate-400'}`} />
                      <span>{job.callCompleted ? 'Call Done' : 'Mark Called'}</span>
                    </button>

                    {/* WhatsApp Hub Trigger */}
                    <button
                      onClick={() => {
                        setSelectedJobForWhatsApp(job);
                        setWhatsAppTab(isCompletedOrDelivered ? 'review' : (job.status === 'received' ? 'welcome' : 'status'));
                      }}
                      className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                        isDark 
                          ? 'text-emerald-300 hover:text-white bg-emerald-950/60 hover:bg-emerald-600 border border-emerald-800' 
                          : 'text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp Hub</span>
                    </button>

                    {/* Delete Job */}
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete job card ${job.jobId} for ${job.customerName}?`)) {
                          deleteJobCard(job.id);
                        }
                      }}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isDark ? 'text-slate-500 hover:text-rose-400 hover:bg-slate-800' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                      }`}
                      title="Delete Job Card"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Job Card Modal with Golden Customer Search & Select */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div>
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Create Service / Sales Job Card</h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Search Golden Customers or enter custom walk-in client</p>
              </div>
              <button
                onClick={() => {
                  setIsCreateModalOpen(false);
                  onClearPreselectedCustomer();
                }}
                className={`p-1 rounded-lg ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJobSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* Golden Customer Search & Select Component */}
              <div className="space-y-2">
                <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Golden Customer Search & Select (Roster of 31 Madurai VIP Clients)
                </label>

                {/* If a customer is already selected, show customer badge chip */}
                {customerName ? (
                  <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    isDark ? 'bg-blue-950/40 border-blue-800 text-blue-200' : 'bg-blue-50/80 border-blue-200 text-blue-900'
                  }`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {customerName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs truncate">{customerName}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500 text-white flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-white" /> Golden
                          </span>
                        </div>
                        <p className={`text-[11px] ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                          {customerPhone || 'No Phone'} · {customerArea || 'Madurai'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleClearSelectedCustomer}
                      className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer shrink-0"
                    >
                      Change Customer
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
                      <input
                        type="text"
                        value={customerSearchQuery}
                        onChange={(e) => {
                          setCustomerSearchQuery(e.target.value);
                          setIsCustomerDropdownOpen(true);
                        }}
                        onFocus={() => setIsCustomerDropdownOpen(true)}
                        placeholder="Search Golden Customer by name, phone (e.g. 9677776001), or area..."
                        className={`w-full rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none ${
                          isDark ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
                        }`}
                      />
                    </div>

                    {/* Autocomplete Dropdown List */}
                    {isCustomerDropdownOpen && (
                      <div className={`absolute top-full left-0 right-0 mt-1 z-30 rounded-xl border max-h-60 overflow-y-auto shadow-xl ${
                        isDark ? 'bg-slate-900 border-slate-800 divide-y divide-slate-800' : 'bg-white border-slate-200 divide-y divide-slate-100 shadow-md'
                      }`}>
                        {searchedCustomers.length === 0 ? (
                          <div className={`p-4 text-center text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            No matching customer. You can enter new details below.
                          </div>
                        ) : (
                          searchedCustomers.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleSelectCustomer(c)}
                              className={`w-full p-2.5 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-blue-50/70 text-slate-900'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-blue-600 font-mono">#{c.slNo}</span>
                                <span className="font-semibold">{c.name}</span>
                                {c.area && <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>· {c.area}</span>}
                              </div>
                              <span className="font-mono text-[11px] text-emerald-600 font-medium">{c.phone}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Editable Name, Phone, Area fields (prefilled or manual) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer Name"
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                        : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="WhatsApp Phone Number"
                    className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                        : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Location / Area
                  </label>
                  <input
                    type="text"
                    value={customerArea}
                    onChange={(e) => setCustomerArea(e.target.value)}
                    placeholder="Area in Madurai"
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                        : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                    }`}
                  />
                </div>
              </div>

              {/* Type & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Job Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setJobType('service')}
                      className={`py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                        jobType === 'service'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      Service & Repair
                    </button>
                    <button
                      type="button"
                      onClick={() => setJobType('sales')}
                      className={`py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                        jobType === 'sales'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      Sales & Upgrades
                    </button>
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Device Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as DeviceCategory)}
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                        : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                    }`}
                  >
                    <option value="laptop">Laptop Computer</option>
                    <option value="desktop">Desktop PC / Workstation</option>
                    <option value="cctv">CCTV DVR / Camera System</option>
                    <option value="printer">Printer / Scanner</option>
                    <option value="network">Network Router / Switch</option>
                    <option value="general">General Electronics</option>
                  </select>
                </div>
              </div>

              {/* Device Brand & Serial Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Device Brand & Model *</label>
                  <input
                    type="text"
                    required
                    value={deviceBrand}
                    onChange={(e) => setDeviceBrand(e.target.value)}
                    placeholder="e.g. Dell Inspiron 15 3520 / Hikvision 4CH"
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                        : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Serial Number / Service Tag</label>
                  <input
                    type="text"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="e.g. CN-08D93K-71289"
                    className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                        : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                    }`}
                  />
                </div>
              </div>

              {/* Issue Description */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Customer Reported Issue *</label>
                <textarea
                  required
                  rows={2}
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="e.g. No display on boot, fan spinning loudly, liquid spill on keyboard"
                  className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                    isDark 
                      ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                      : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                  }`}
                />
              </div>

              {/* Intake Date, Delivery Estimate, & Cost Estimate */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Intake Date</label>
                  <input
                    type="date"
                    value={intakeDate}
                    onChange={(e) => setIntakeDate(e.target.value)}
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                        : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Est. Delivery Date</label>
                  <input
                    type="text"
                    value={estimatedDelivery}
                    onChange={(e) => setEstimatedDelivery(e.target.value)}
                    placeholder="e.g. 12 Oct (Tomorrow Evening)"
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                        : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Estimated Cost (₹)</label>
                  <input
                    type="number"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(Number(e.target.value))}
                    placeholder="Estimated Amount"
                    className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                        : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                    }`}
                  />
                </div>
              </div>

              {/* Device Photo Capture */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Device Intake Photos (Condition, Serial Sticker, Defect)
                </label>
                <div className="flex items-center gap-3">
                  <label className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg cursor-pointer transition-colors ${
                    isDark 
                      ? 'text-slate-300 bg-slate-950 border border-slate-800 hover:border-slate-700' 
                      : 'text-slate-700 bg-slate-50 border border-slate-300 hover:border-blue-500'
                  }`}>
                    <Camera className="w-4 h-4 text-blue-500" />
                    <span>Upload or Take Photos</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                    {devicePhotos.length} photo(s) attached
                  </span>
                </div>

                {devicePhotos.length > 0 && (
                  <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
                    {devicePhotos.map((photo, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden shrink-0 group">
                        <img src={photo} alt="Device upload" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1 right-1 bg-black/70 hover:bg-rose-600 text-white rounded p-0.5 text-[10px]"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Technician Diagnosis Notes */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Initial Technician Diagnosis Notes
                </label>
                <input
                  type="text"
                  value={technicianNotes}
                  onChange={(e) => setTechnicianNotes(e.target.value)}
                  placeholder="e.g. Adapter working, fan dusty, RAM test passed, customer approved NVMe upgrade"
                  className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                    isDark 
                      ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                      : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                  }`}
                />
              </div>

              {/* Buttons */}
              <div className={`flex items-center justify-end gap-3 pt-4 border-t shrink-0 ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    onClearPreselectedCustomer();
                  }}
                  className={`px-4 py-2 text-xs rounded-lg transition-colors cursor-pointer ${
                    isDark ? 'text-slate-400 hover:text-slate-200 bg-slate-800' : 'text-slate-600 hover:text-slate-800 bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  Register Job Card & Launch WhatsApp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Message Dispatcher Modal with 3 Message Options (Welcome, Flow, Review) */}
      {selectedJobForWhatsApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>WhatsApp Dispatch Hub</h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    To: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{selectedJobForWhatsApp.customerName}</strong> ({selectedJobForWhatsApp.customerPhone || 'No Phone'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedJobForWhatsApp(null)}
                className={`p-1 rounded-lg ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Message Type 3-Way Tabs */}
              <div className={`flex items-center gap-1.5 p-1 border rounded-xl overflow-x-auto ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setWhatsAppTab('welcome')}
                  className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    whatsAppTab === 'welcome' 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  1. Welcome & Intake
                </button>
                <button
                  type="button"
                  onClick={() => setWhatsAppTab('status')}
                  className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    whatsAppTab === 'status' 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  2. Status Flow Alert
                </button>
                <button
                  type="button"
                  onClick={() => setWhatsAppTab('review')}
                  className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    whatsAppTab === 'review' 
                      ? 'bg-amber-600 text-white shadow-xs' 
                      : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  3. ⭐ Google Review & Delivery
                </button>
              </div>

              {whatsAppTab === 'status' && (
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Add Custom Technician Message / Quotation Details
                  </label>
                  <input
                    type="text"
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    placeholder="e.g. Motherboard diagnosed. Replacement IC is ₹1,800. Ready for pickup tomorrow."
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-emerald-500' 
                        : 'bg-white border border-slate-300 text-slate-900 focus:border-emerald-600'
                    }`}
                  />
                </div>
              )}

              {/* Formatted Message Preview */}
              <div>
                <div className={`flex items-center justify-between text-xs mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>Formatted Message Preview:</span>
                  {copiedNotification && (
                    <span className="text-emerald-600 font-medium">Copied to clipboard!</span>
                  )}
                </div>
                <div className={`border rounded-xl p-3 text-xs font-mono whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed border-l-4 ${
                  whatsAppTab === 'review' ? 'border-l-amber-500' : 'border-l-emerald-500'
                } ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}>
                  {currentWaMessage}
                </div>
              </div>

              {/* Action Buttons */}
              <div className={`flex items-center justify-end gap-3 pt-3 border-t ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    isDark ? 'text-slate-300 hover:text-white bg-slate-800' : 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Text</span>
                </button>

                <a
                  href={currentWaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-md shadow-emerald-600/25 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Open in WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Device Photos */}
      {activePhotoLightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-3xl max-h-[90vh] overflow-hidden rounded-xl bg-slate-950 border border-slate-800 p-2">
            <button
              onClick={() => setActivePhotoLightbox(null)}
              className="absolute top-4 right-4 z-10 bg-black/70 hover:bg-rose-600 text-white rounded-lg p-1.5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={activePhotoLightbox} 
              alt="Device intake photo full" 
              className="max-w-full max-h-[85vh] object-contain rounded-lg mx-auto" 
            />
          </div>
        </div>
      )}

      {/* Timeline Step Action Confirmation Dialog with Notes, Quote, Hold & Custom Inputs */}
      {timelineModalJob && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  SGS
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    Record Stage: {
                      timelineTargetStage === 'in_process' ? '⚡ In Process Start' :
                      timelineTargetStage === 'quote_given' ? '💰 Quote Given to Customer' :
                      timelineTargetStage === 'customer_approval' ? '👍 Customer Approval' :
                      timelineTargetStage === 'customer_discussion' ? '💬 Customer Discussion' :
                      timelineTargetStage === 'work_completed' ? '✅ Work Completed' :
                      timelineTargetStage === 'billed' ? '🧾 Bill Generated' :
                      timelineTargetStage === 'pickup_note' ? '📦 Ready for Pickup Note' :
                      timelineTargetStage === 'call_review' ? '⭐ Customer Call Review' :
                      timelineTargetStage === 'call_close' ? '🏁 Call Close & Delivered' :
                      timelineTargetStage === 'hold' ? '⏸️ Put Job on Hold' : '✍️ Custom Stage: Others'
                    }
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Job: <strong className="font-mono text-blue-500">{timelineModalJob.jobId}</strong> · {timelineModalJob.customerName} ({timelineModalJob.deviceBrand})
                  </p>
                </div>
              </div>
              <button onClick={() => setTimelineModalJob(null)} className="p-1 rounded text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!timelineModalJob) return;

                const nowIso = new Date().toISOString();
                let newJobStatus: JobStatus = timelineModalJob.status;
                let finalStageLabel = '';

                if (timelineTargetStage === 'in_process') {
                  newJobStatus = 'in_process';
                  finalStageLabel = 'In Process Started';
                } else if (timelineTargetStage === 'quote_given') {
                  newJobStatus = 'quotation_pending';
                  finalStageLabel = `Quotation Given: ₹${timelineQuoteAmount}`;
                } else if (timelineTargetStage === 'customer_approval') {
                  newJobStatus = 'customer_approval';
                  finalStageLabel = 'Customer Approved';
                } else if (timelineTargetStage === 'customer_discussion') {
                  newJobStatus = 'customer_discussion';
                  finalStageLabel = 'Customer Discussion';
                } else if (timelineTargetStage === 'work_completed') {
                  newJobStatus = 'work_completed';
                  finalStageLabel = 'Work Completed';
                } else if (timelineTargetStage === 'billed') {
                  newJobStatus = 'billed';
                  finalStageLabel = 'Billed';
                } else if (timelineTargetStage === 'pickup_note') {
                  newJobStatus = 'pickup_ready';
                  finalStageLabel = 'Ready for Pickup Note';
                } else if (timelineTargetStage === 'call_review') {
                  finalStageLabel = 'Post-Service Call Review';
                } else if (timelineTargetStage === 'call_close') {
                  newJobStatus = 'delivered';
                  finalStageLabel = 'Call Closed & Delivered';
                } else if (timelineTargetStage === 'hold') {
                  newJobStatus = 'hold';
                  finalStageLabel = 'Job Placed On Hold';
                } else if (timelineTargetStage === 'other') {
                  newJobStatus = 'other';
                  finalStageLabel = timelineOtherName.trim() || 'Other Stage';
                }

                // Append event
                addJobTimelineEvent(timelineModalJob.id, {
                  stage: timelineTargetStage,
                  stageLabel: finalStageLabel,
                  timestamp: nowIso,
                  notes: timelineNotes.trim(),
                  quoteAmount: timelineTargetStage === 'quote_given' ? Number(timelineQuoteAmount) : undefined,
                  customStageName: timelineTargetStage === 'other' ? timelineOtherName : undefined,
                });

                // Update job
                const updates: Partial<JobCard> = {
                  status: newJobStatus,
                  technicianNotes: timelineNotes.trim() || timelineModalJob.technicianNotes,
                };
                if (timelineTargetStage === 'quote_given' && timelineQuoteAmount > 0) {
                  updates.estimatedCost = Number(timelineQuoteAmount);
                }
                if (timelineTargetStage === 'hold') {
                  updates.holdReason = timelineHoldReason.trim() || timelineNotes.trim();
                }
                if (timelineTargetStage === 'other') {
                  updates.otherStatusText = timelineOtherName.trim();
                }
                if (timelineTargetStage === 'work_completed') {
                  updates.finalCost = timelineModalJob.estimatedCost || 0;
                }

                updateJobCard(timelineModalJob.id, updates);
                setTimelineModalJob(null);
                setTimelineNotes('');
              }}
              className="space-y-3.5"
            >
              {/* Conditional Quote Amount Field */}
              {timelineTargetStage === 'quote_given' && (
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Quote Amount Provided to Customer (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      required
                      min="0"
                      value={timelineQuoteAmount}
                      onChange={(e) => setTimelineQuoteAmount(Number(e.target.value))}
                      placeholder="e.g. 1850"
                      className={`w-full rounded-lg pl-8 pr-3 py-2 text-sm font-mono font-bold focus:outline-none ${
                        isDark ? 'bg-slate-950 border border-slate-800 text-emerald-400' : 'bg-slate-50 border border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Conditional Hold Reason */}
              {timelineTargetStage === 'hold' && (
                <div>
                  <label className={`block text-xs font-semibold mb-1 text-rose-500`}>
                    Reason for Hold *
                  </label>
                  <input
                    type="text"
                    required
                    value={timelineHoldReason}
                    onChange={(e) => setTimelineHoldReason(e.target.value)}
                    placeholder="e.g. Waiting for customer confirmation / Motherboard donor chip transit"
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-rose-900 text-rose-300' : 'bg-rose-50 border border-rose-300 text-rose-900'
                    }`}
                  />
                </div>
              )}

              {/* Conditional Manual Other Input */}
              {timelineTargetStage === 'other' && (
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Custom Stage / Action Name (Manual Input) *
                  </label>
                  <input
                    type="text"
                    required
                    value={timelineOtherName}
                    onChange={(e) => setTimelineOtherName(e.target.value)}
                    placeholder="e.g. Sent for BGA Reballing / Outside Lab Inspection"
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              )}

              {/* Notes Input for Timeline */}
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Stage Notes & Technician Remarks:
                </label>
                <textarea
                  rows={3}
                  value={timelineNotes}
                  onChange={(e) => setTimelineNotes(e.target.value)}
                  placeholder="Enter details of discussion, part status, technician observations..."
                  className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-slate-50 border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Timestamp Indicator */}
              <div className={`p-2.5 rounded-lg border text-[11px] flex items-center justify-between ${
                isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <span>Timestamp: <strong>{new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</strong></span>
                <span className="text-emerald-500 font-semibold">Auto-Recorded with Notes</span>
              </div>

              {/* Action Buttons */}
              <div className={`flex items-center justify-end gap-2.5 pt-3 border-t ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setTimelineModalJob(null)}
                  className={`px-4 py-2 text-xs rounded-lg transition-colors cursor-pointer ${
                    isDark ? 'text-slate-400 hover:text-white bg-slate-800' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-md shadow-blue-600/25 cursor-pointer"
                >
                  Confirm & Save Stage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Complete Timeline History Modal */}
      {viewHistoryJob && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b shrink-0 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div>
                <h3 className="text-base font-bold">
                  Complete Timeline & Status History
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Work Order: <strong className="font-mono text-blue-500">{viewHistoryJob.jobId}</strong> · {viewHistoryJob.customerName}
                </p>
              </div>
              <button onClick={() => setViewHistoryJob(null)} className="p-1 rounded text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Event List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {(!viewHistoryJob.timeline || viewHistoryJob.timeline.length === 0) ? (
                <div className={`p-6 text-center text-xs rounded-xl border ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}>
                  <Clock className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                  <p>Intake registered on {viewHistoryJob.intakeDate}.</p>
                  <p className="mt-1">No custom lifecycle steps recorded yet. Click the quick stage buttons to log events.</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-blue-600/40 ml-4 space-y-4 py-2">
                  {viewHistoryJob.timeline.map((evt, idx) => (
                    <div key={evt.id || idx} className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-600 border-2 border-white dark:border-slate-900 shadow-xs" />
                      
                      <div className={`p-3 rounded-xl border space-y-1 ${
                        isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-xs font-bold text-blue-500">
                            {evt.stageLabel}
                          </span>
                          <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {new Date(evt.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>

                        {evt.quoteAmount !== undefined && evt.quoteAmount > 0 && (
                          <p className="text-xs font-bold font-mono text-emerald-500">
                            Quoted: ₹{evt.quoteAmount.toLocaleString('en-IN')}
                          </p>
                        )}

                        {evt.notes && (
                          <p className={`text-xs italic ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            "{evt.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={`pt-3 border-t flex justify-end shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                onClick={() => setViewHistoryJob(null)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg ${
                  isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-800'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
