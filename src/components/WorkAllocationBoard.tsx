import { todayLocal } from '../utils/accounting';
import React, { useState, useMemo } from 'react';
import { 
  Wrench, 
  Search, 
  Filter, 
  ArrowUp, 
  ArrowDown, 
  UserCheck, 
  Users, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Share2, 
  Send, 
  Layers, 
  CheckSquare, 
  Square, 
  RefreshCw, 
  FileText, 
  Phone, 
  MapPin, 
  Sparkles, 
  Info,
  Laptop,
  Monitor,
  Cctv,
  Printer,
  Eye,
  Check,
  X,
  Star
} from 'lucide-react';
import { useSgs } from '../context/SgsContext';
import { JobCard, Employee, DeviceCategory } from '../types';

interface WorkAllocationBoardProps {
  onOpenJobDetail?: (job: JobCard) => void;
}

export const WorkAllocationBoard: React.FC<WorkAllocationBoardProps> = ({ onOpenJobDetail }) => {
  const { 
    jobCards, 
    employees, 
    updateJobPriority, 
    assignJobToEmployee, 
    bulkAssignJobs,
    shareJobToEmployeeWhatsApp,
    theme 
  } = useSgs();

  const isDark = theme === 'dark';

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('pending_active'); // 'all', 'pending_active', 'in_progress', 'hold', 'work_completed', 'delivered'
  const [filterPriority, setFilterPriority] = useState<string>('all'); // 'all', 'P1', 'P2', 'P3', 'P4'
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [filterOverdueOnly, setFilterOverdueOnly] = useState<boolean>(false);

  // Multi-selection checkboxes
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);

  // Bulk Actions Modals
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [bulkEmployeeId, setBulkEmployeeId] = useState('');
  const [bulkInstructions, setBulkInstructions] = useState('Please service with high priority.');
  const [bulkDueDate, setBulkDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return todayLocal(d);
  });

  // Priority Change Prompt Modal
  const [priorityModalJob, setPriorityModalJob] = useState<JobCard | null>(null);
  const [targetPriority, setTargetPriority] = useState<'P1' | 'P2' | 'P3' | 'P4'>('P2');
  const [targetPriorityOrder, setTargetPriorityOrder] = useState<number>(1);
  const [priorityChangeReason, setPriorityChangeReason] = useState('');

  // Single Reassign Prompt Modal
  const [reassignModalJob, setReassignModalJob] = useState<JobCard | null>(null);
  const [reassignEmployeeId, setReassignEmployeeId] = useState('');
  const [reassignInstructions, setReassignInstructions] = useState('');
  const [reassignDueDate, setReassignDueDate] = useState('');
  const [reassignDurationHours, setReassignDurationHours] = useState<number>(2);
  const [reassignReason, setReassignReason] = useState('Workload balancing');

  // Bulk WhatsApp Dispatch Preview Modal
  const [isBulkWhatsAppModalOpen, setIsBulkWhatsAppModalOpen] = useState(false);
  const [bulkWhatsAppTargetEmpId, setBulkWhatsAppTargetEmpId] = useState('');

  // Toast feedback
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const todayStr = todayLocal();

  // Helper to determine if a job is overdue
  const isJobOverdue = (job: JobCard): boolean => {
    if (job.status === 'completed' || job.status === 'delivered') return false;
    const targetDate = job.estimatedDelivery || job.intakeDate;
    if (!targetDate) return false;
    return targetDate < todayStr;
  };

  // KPIs
  const kpis = useMemo(() => {
    const totalPending = jobCards.filter(j => j.status !== 'work_completed' && j.status !== 'completed' && j.status !== 'delivered').length;
    const inProgress = jobCards.filter(j => j.status === 'in_process').length;
    const highPriority = jobCards.filter(j => 
      (j.priority === 'P1' || j.priority === 'P2' || j.workOrderPriority === 1) &&
      j.status !== 'work_completed' && j.status !== 'completed' && j.status !== 'delivered'
    ).length;
    const overdue = jobCards.filter(j => isJobOverdue(j)).length;
    const completedToday = jobCards.filter(j => 
      (j.status === 'work_completed' || j.status === 'completed' || j.status === 'delivered') &&
      (j.updatedAt === todayStr || j.completionNotes?.completedAt?.startsWith(todayStr))
    ).length;
    const awaitingPartsOrApproval = jobCards.filter(j => 
      j.status === 'waiting_parts' || j.status === 'customer_approval' || j.status === 'hold'
    ).length;

    // Workload per employee
    const employeeWorkload: Record<string, { name: string; count: number; role: string }> = {};
    employees.forEach(emp => {
      employeeWorkload[emp.id] = { name: emp.name, count: 0, role: emp.role };
    });
    jobCards.forEach(j => {
      if (j.status !== 'work_completed' && j.status !== 'completed' && j.status !== 'delivered') {
        if (j.assignedEmployeeId && employeeWorkload[j.assignedEmployeeId]) {
          employeeWorkload[j.assignedEmployeeId].count += 1;
        }
      }
    });

    return {
      totalPending,
      inProgress,
      highPriority,
      overdue,
      completedToday,
      awaitingPartsOrApproval,
      employeeWorkload: Object.entries(employeeWorkload).map(([id, val]) => ({ id, ...val }))
    };
  }, [jobCards, employees, todayStr]);

  // Filtered and Sorted Jobs
  const filteredJobs = useMemo(() => {
    return jobCards.filter(job => {
      // 1. Search Query (Job ID, customer, phone, device, issue, employee)
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        job.jobId.toLowerCase().includes(q) ||
        job.customerName.toLowerCase().includes(q) ||
        (job.customerPhone && job.customerPhone.includes(q)) ||
        job.deviceBrand.toLowerCase().includes(q) ||
        job.issueDescription.toLowerCase().includes(q) ||
        (job.assignedTechnician && job.assignedTechnician.toLowerCase().includes(q)) ||
        (job.customerArea && job.customerArea.toLowerCase().includes(q))
      );

      // 2. Category Filter
      const matchesCategory = filterCategory === 'all' || job.category === filterCategory;

      // 3. Status Filter (Only pending jobs on active list!)
      let matchesStatus = true;
      if (filterStatus === 'pending_active') {
        matchesStatus = job.status !== 'work_completed' && job.status !== 'completed' && job.status !== 'delivered' && job.status !== 'billed';
      } else if (filterStatus !== 'all') {
        matchesStatus = job.status === filterStatus;
      }

      // 4. Priority Filter
      let matchesPriority = true;
      if (filterPriority !== 'all') {
        matchesPriority = job.priority === filterPriority || (
          filterPriority === 'P1' && job.workOrderPriority === 1
        ) || (
          filterPriority === 'P2' && job.workOrderPriority === 2
        );
      }

      // 5. Employee Filter
      let matchesEmployee = true;
      if (filterEmployee === 'unassigned') {
        matchesEmployee = !job.assignedEmployeeId;
      } else if (filterEmployee !== 'all') {
        matchesEmployee = job.assignedEmployeeId === filterEmployee;
      }

      // 6. Overdue Only Filter
      let matchesOverdue = true;
      if (filterOverdueOnly) {
        matchesOverdue = isJobOverdue(job);
      }

      return matchesSearch && matchesCategory && matchesStatus && matchesPriority && matchesEmployee && matchesOverdue;
    }).sort((a, b) => {
      // Sort by priority order first (P1 -> P2 -> P3 -> P4), then sequence order, then overdue
      const pWeight: Record<string, number> = { P1: 1, P2: 2, P3: 3, P4: 4 };
      const weightA = a.priority ? (pWeight[a.priority] || 3) : (a.workOrderPriority || 3);
      const weightB = b.priority ? (pWeight[b.priority] || 3) : (b.workOrderPriority || 3);

      if (weightA !== weightB) {
        return weightA - weightB;
      }

      const orderA = a.priorityOrder || a.workOrderPriority || 999;
      const orderB = b.priorityOrder || b.workOrderPriority || 999;
      if (orderA !== orderB) {
        return orderA - orderB;
      }

      // Overdue first
      const isAOver = isJobOverdue(a);
      const isBOver = isJobOverdue(b);
      if (isAOver && !isBOver) return -1;
      if (!isAOver && isBOver) return 1;

      return 0;
    });
  }, [jobCards, searchQuery, filterCategory, filterStatus, filterPriority, filterEmployee, filterOverdueOnly, todayStr]);

  // Handle Multi-Select Checkboxes
  const handleToggleSelectAll = () => {
    if (selectedJobIds.length === filteredJobs.length && filteredJobs.length > 0) {
      setSelectedJobIds([]);
    } else {
      setSelectedJobIds(filteredJobs.map(j => j.id));
    }
  };

  const handleToggleJobSelect = (jobId: string) => {
    setSelectedJobIds(prev => 
      prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]
    );
  };

  // Move Sequence Up
  const handleMoveUp = (job: JobCard) => {
    const currentOrder = job.priorityOrder || 2;
    const newOrder = Math.max(1, currentOrder - 1);
    updateJobPriority(
      job.id, 
      job.priority || 'P2', 
      newOrder, 
      `Shifted sequence higher to #${newOrder}`, 
      'Office Staff'
    );
    showToast(`Job ${job.jobId} moved up to Sequence #${newOrder}`);
  };

  // Move Sequence Down
  const handleMoveDown = (job: JobCard) => {
    const currentOrder = job.priorityOrder || 1;
    const newOrder = currentOrder + 1;
    updateJobPriority(
      job.id, 
      job.priority || 'P2', 
      newOrder, 
      `Shifted sequence lower to #${newOrder}`, 
      'Office Staff'
    );
    showToast(`Job ${job.jobId} moved down to Sequence #${newOrder}`);
  };

  // Submit Priority Change from Modal
  const handleSavePriorityChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!priorityModalJob) return;

    updateJobPriority(
      priorityModalJob.id,
      targetPriority,
      Number(targetPriorityOrder) || 1,
      priorityChangeReason || 'Priority adjusted in work allocation board',
      'Office Staff'
    );

    showToast(`Priority updated to ${targetPriority} (Seq #${targetPriorityOrder}) for ${priorityModalJob.jobId}`);
    setPriorityModalJob(null);
    setPriorityChangeReason('');
  };

  // Submit Reassign from Modal
  const handleSaveReassign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignModalJob || !reassignEmployeeId) return;

    const emp = employees.find(e => e.id === reassignEmployeeId);
    if (!emp) return;

    assignJobToEmployee(
      reassignModalJob.id,
      emp.id,
      emp.name,
      reassignInstructions,
      reassignDueDate,
      reassignDurationHours,
      'Office Staff',
      reassignReason
    );

    showToast(`Job ${reassignModalJob.jobId} assigned to ${emp.name}`);
    setReassignModalJob(null);
    setReassignEmployeeId('');
    setReassignInstructions('');
    setReassignReason('');
  };

  // Submit Bulk Assignment
  const handleSaveBulkAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkEmployeeId || selectedJobIds.length === 0) return;

    const emp = employees.find(e => e.id === bulkEmployeeId);
    if (!emp) return;

    bulkAssignJobs(selectedJobIds, emp.id, emp.name, bulkInstructions);
    showToast(`${selectedJobIds.length} jobs assigned to ${emp.name}`);
    setIsBulkAssignModalOpen(false);
    setSelectedJobIds([]);
  };

  // Bulk WhatsApp Dispatch
  const handleOpenBulkWhatsApp = () => {
    if (selectedJobIds.length === 0) {
      showToast('Please mark at least one pending job to share via WhatsApp.');
      return;
    }
    const defaultEmp = employees[0]?.id || '';
    setBulkWhatsAppTargetEmpId(defaultEmp);
    setIsBulkWhatsAppModalOpen(true);
  };

  const handleSendBulkWhatsApp = () => {
    const selectedJobs = jobCards.filter(j => selectedJobIds.includes(j.id));
    if (selectedJobs.length === 0) return;

    const targetEmp = employees.find(e => e.id === bulkWhatsAppTargetEmpId);
    let targetPhone = targetEmp?.phone ? targetEmp.phone.replace(/[^0-9]/g, '') : '';
    if (targetPhone.length === 10) targetPhone = `91${targetPhone}`;

    let msg = `*SPIDER GRID SOLUTIONS (SGS) — WORK ALLOCATION DISPATCH*\n`;
    msg += `Technician: *${targetEmp?.name || 'Staff'}*\n`;
    msg += `Total Dispatched Jobs: ${selectedJobs.length}\n`;
    msg += `Date: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}\n`;
    msg += `─────────────────────────\n\n`;

    selectedJobs.forEach((j, idx) => {
      const priorityLabel = j.priority || (j.workOrderPriority === 1 ? 'P1' : 'P2');
      msg += `*${idx + 1}. [${priorityLabel}] Job Card: ${j.jobId}*\n`;
      msg += `• Customer: ${j.customerName} (${j.customerPhone || 'N/A'})\n`;
      msg += `• Work: ${j.category.toUpperCase()} — ${j.deviceBrand}\n`;
      msg += `• Location: ${j.customerArea || 'Madurai'}\n`;
      msg += `• Target Due: ${j.estimatedDelivery || j.intakeDate}\n`;
      msg += `• Problem: ${j.issueDescription}\n`;
      if (j.workOrderNotes) {
        msg += `• Office Instructions: ${j.workOrderNotes}\n`;
      }
      msg += `• Status: ${j.status.toUpperCase()}\n\n`;
    });

    msg += `─────────────────────────\n`;
    msg += `Please report diagnosis & progress after reaching site.\n`;
    msg += `Spider Grid Solutions · Madurai`;

    const waUrl = targetPhone 
      ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    window.open(waUrl, '_blank');
    showToast(`WhatsApp dispatch opened for ${selectedJobs.length} jobs!`);
    setIsBulkWhatsAppModalOpen(false);
  };

  const priorityBadgeConfig: Record<string, { label: string; bg: string; text: string }> = {
    P1: { label: 'P1 — Emergency', bg: 'bg-rose-600 text-white', text: 'text-rose-600' },
    P2: { label: 'P2 — High', bg: 'bg-amber-500 text-white', text: 'text-amber-600' },
    P3: { label: 'P3 — Normal', bg: 'bg-blue-600 text-white', text: 'text-blue-600' },
    P4: { label: 'P4 — Low', bg: 'bg-slate-500 text-white', text: 'text-slate-500' },
  };

  const categoryIcons: Record<string, React.ElementType> = {
    laptop: Laptop,
    desktop: Monitor,
    cctv: Cctv,
    printer: Printer,
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 transition-colors ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <h2 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Employee Work Allocation & Priority Ordering
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              Admin & Office Staff Dispatch
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Organize priority sequences (P1-P4), allocate service jobs to technicians, and dispatch WhatsApp work orders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedJobIds.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => {
                  setBulkEmployeeId(employees[0]?.id || '');
                  setIsBulkAssignModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Assign Selected ({selectedJobIds.length})</span>
              </button>

              <button
                type="button"
                onClick={handleOpenBulkWhatsApp}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp Dispatch</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Workload Dashboard (Module 1.4) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Pending Jobs */}
        <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Pending Jobs</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-black font-mono mt-1 text-blue-600">{kpis.totalPending}</p>
          <span className="text-[10px] text-slate-400">Total active call roster</span>
        </div>

        {/* Card 2: In Progress */}
        <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>In Progress</span>
            <Wrench className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-black font-mono mt-1 text-amber-600">{kpis.inProgress}</p>
          <span className="text-[10px] text-slate-400">On bench / field repair</span>
        </div>

        {/* Card 3: High Priority (P1/P2) */}
        <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>High Priority</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl font-black font-mono mt-1 text-rose-600">{kpis.highPriority}</p>
          <span className="text-[10px] text-rose-500 font-semibold">P1 Emergency & P2 High</span>
        </div>

        {/* Card 4: Overdue Jobs */}
        <div className={`p-3 rounded-xl border ${
          kpis.overdue > 0 
            ? (isDark ? 'bg-rose-950/20 border-rose-900/60' : 'bg-rose-50 border-rose-200 shadow-xs')
            : (isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs')
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${kpis.overdue > 0 ? 'text-rose-600' : (isDark ? 'text-slate-400' : 'text-slate-500')}`}>
              Overdue Jobs
            </span>
            <AlertTriangle className={`w-4 h-4 ${kpis.overdue > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <p className={`text-xl font-black font-mono mt-1 ${kpis.overdue > 0 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}`}>
            {kpis.overdue}
          </p>
          <span className="text-[10px] text-slate-400">Past target delivery</span>
        </div>

        {/* Card 5: Completed Today */}
        <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Completed Today</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-black font-mono mt-1 text-emerald-600">{kpis.completedToday}</p>
          <span className="text-[10px] text-slate-400">Tested & finished</span>
        </div>

        {/* Card 6: Awaiting Parts / Approval */}
        <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>On Hold / Spares</span>
            <Info className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl font-black font-mono mt-1 text-purple-600">{kpis.awaitingPartsOrApproval}</p>
          <span className="text-[10px] text-slate-400">Client ok or part delivery</span>
        </div>
      </div>

      {/* Employee-Wise Workload Ribbon */}
      <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
        isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          <span className="font-bold">Staff Workload Distribution:</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {kpis.employeeWorkload.map(emp => (
            <button
              key={emp.id}
              type="button"
              onClick={() => setFilterEmployee(filterEmployee === emp.id ? 'all' : emp.id)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                filterEmployee === emp.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : (isDark ? 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500' : 'bg-white border-slate-300 text-slate-700 hover:border-blue-400')
              }`}
            >
              <span>{emp.name}</span>
              <span className={`font-mono font-bold px-1.5 py-0.2 rounded-full text-[10px] ${
                filterEmployee === emp.id 
                  ? 'bg-white text-blue-700' 
                  : (emp.count > 3 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300')
              }`}>
                {emp.count} active
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFilterEmployee(filterEmployee === 'unassigned' ? 'all' : 'unassigned')}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
              filterEmployee === 'unassigned'
                ? 'bg-rose-600 text-white border-rose-600'
                : (isDark ? 'bg-slate-900 border-slate-700 text-rose-300' : 'bg-white border-slate-300 text-rose-700')
            }`}
          >
            <span>Unassigned</span>
          </button>
        </div>
      </div>

      {/* Multi-Filter & Search Bar (Module 1.1) */}
      <div className={`p-4 rounded-xl border space-y-3 transition-colors ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
      }`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search JC #, customer, phone, tech..."
              className={`w-full rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none transition-colors ${
                isDark 
                  ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                  : 'bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
              }`}
            />
          </div>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={`w-full rounded-lg px-3 py-1.5 text-xs focus:outline-none ${
              isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-slate-50 border border-slate-300 text-slate-900'
            }`}
          >
            <option value="all">All Service Types ({jobCards.length})</option>
            <option value="cctv">📹 CCTV & Surveillance</option>
            <option value="laptop">💻 Laptop Service</option>
            <option value="desktop">🖥️ Computer / Desktop</option>
            <option value="printer">🖨️ Printer Repair</option>
            <option value="network">🌐 Networking & Wi-Fi</option>
            <option value="general">⚙️ General Hardware</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`w-full rounded-lg px-3 py-1.5 text-xs focus:outline-none ${
              isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-slate-50 border border-slate-300 text-slate-900'
            }`}
          >
            <option value="pending_active">Active & Pending Only</option>
            <option value="all">All Statuses</option>
            <option value="received">Intake / Inspection</option>
            <option value="in_process">In Process</option>
            <option value="waiting_parts">Waiting for Parts</option>
            <option value="customer_approval">Customer Approval</option>
            <option value="work_completed">Work Completed</option>
            <option value="hold">On Hold</option>
            <option value="completed">Ready for Pickup</option>
            <option value="delivered">Delivered / Closed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className={`w-full rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none ${
              isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-slate-50 border border-slate-300 text-slate-900'
            }`}
          >
            <option value="all">All Priority Levels</option>
            <option value="P1">🚨 P1 — Emergency</option>
            <option value="P2">⚡ P2 — High</option>
            <option value="P3">🔷 P3 — Normal</option>
            <option value="P4">⚪ P4 — Low</option>
          </select>

          {/* Assigned Technician Filter */}
          <select
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
            className={`w-full rounded-lg px-3 py-1.5 text-xs focus:outline-none ${
              isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-slate-50 border border-slate-300 text-slate-900'
            }`}
          >
            <option value="all">All Technicians ({employees.length})</option>
            <option value="unassigned">⚠️ Unassigned Jobs</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
            ))}
          </select>
        </div>

        {/* Bottom controls: Overdue Checkbox & Select All */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              {selectedJobIds.length === filteredJobs.length && filteredJobs.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>Select All Visible ({filteredJobs.length})</span>
            </button>

            <label className="flex items-center gap-1.5 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={filterOverdueOnly}
                onChange={(e) => setFilterOverdueOnly(e.target.checked)}
                className="w-3.5 h-3.5 text-rose-600 rounded"
              />
              <span className={filterOverdueOnly ? 'text-rose-600 font-bold' : (isDark ? 'text-slate-300' : 'text-slate-600')}>
                🚨 Show Overdue Jobs Only
              </span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              Showing <strong>{filteredJobs.length}</strong> jobs | Ordered by Priority & Sequence
            </span>
            {(searchQuery || filterCategory !== 'all' || filterStatus !== 'pending_active' || filterPriority !== 'all' || filterEmployee !== 'all' || filterOverdueOnly) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setFilterCategory('all');
                  setFilterStatus('pending_active');
                  setFilterPriority('all');
                  setFilterEmployee('all');
                  setFilterOverdueOnly(false);
                }}
                className="text-xs text-blue-600 hover:underline cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Work Allocation Table / Cards (Module 1.1 & 1.2) */}
      <div className="space-y-3">
        {filteredJobs.length === 0 ? (
          <div className={`p-12 text-center rounded-xl border ${
            isDark ? 'bg-slate-900/40 border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-400'
          }`}>
            <p className="text-sm font-semibold">No job cards match your allocation criteria</p>
            <p className="text-xs mt-1">Try relaxing your search terms or unchecking the overdue filter.</p>
          </div>
        ) : (
          filteredJobs.map((job, idx) => {
            const isSelected = selectedJobIds.includes(job.id);
            const isOverdue = isJobOverdue(job);
            const priorityKey = job.priority || (job.workOrderPriority === 1 ? 'P1' : (job.workOrderPriority === 2 ? 'P2' : 'P3'));
            const pBadge = priorityBadgeConfig[priorityKey] || priorityBadgeConfig.P3;
            const seqOrder = job.priorityOrder || (job.workOrderPriority || (idx + 1));
            const CatIcon = categoryIcons[job.category] || Wrench;

            return (
              <div
                key={`${job.id}-${idx}`}
                className={`p-4 rounded-xl border transition-all ${
                  isSelected 
                    ? (isDark ? 'bg-blue-950/30 border-blue-700' : 'bg-blue-50/70 border-blue-400 shadow-sm')
                    : isOverdue
                    ? (isDark ? 'bg-rose-950/20 border-rose-900/80 hover:border-rose-700' : 'bg-rose-50/40 border-rose-200 hover:border-rose-300')
                    : (isDark ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200/90 hover:border-blue-300 shadow-xs')
                }`}
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  
                  {/* Left: Checkbox, Sequence Controls, Priority, Job Details */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggleJobSelect(job.id)}
                      className="mt-1 cursor-pointer text-slate-400 hover:text-blue-600 transition-colors shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>

                    {/* Sequence Order Controls (Module 1.2: Move Up / Down) */}
                    <div className="flex flex-col items-center justify-center shrink-0 border rounded-lg px-2 py-1 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(job)}
                        className="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5"
                        title="Move Priority Up (Complete Earlier)"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-mono text-xs font-black text-blue-600 my-0.5">
                        #{seqOrder}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(job)}
                        className="text-slate-400 hover:text-blue-600 cursor-pointer p-0.5"
                        title="Move Priority Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Category Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                      isDark ? 'bg-blue-950/60 border-blue-800 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
                    }`}>
                      <CatIcon className="w-5 h-5" />
                    </div>

                    {/* Job Details */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        
                        {/* Priority Badge with Click-to-Change */}
                        <button
                          type="button"
                          onClick={() => {
                            setPriorityModalJob(job);
                            setTargetPriority(job.priority || 'P2');
                            setTargetPriorityOrder(job.priorityOrder || 1);
                            setPriorityChangeReason(job.priorityChangeReason || '');
                          }}
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded cursor-pointer transition-all hover:opacity-90 ${pBadge.bg}`}
                          title="Click to change Priority (P1-P4) with audit reason"
                        >
                          {pBadge.label}
                        </button>

                        <span className={`text-xs font-mono font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                          {job.jobId}
                        </span>

                        <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'} truncate`}>
                          {job.deviceBrand}
                        </span>

                        {isOverdue && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500 text-white flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="w-3 h-3" /> Overdue
                          </span>
                        )}

                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                          job.status === 'work_completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
                            : (isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200')
                        }`}>
                          {job.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Customer Row */}
                      <div className="flex items-center gap-3 text-xs flex-wrap">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                          <span>{job.customerName}</span>
                        </span>
                        {job.customerPhone && (
                          <span className="font-mono text-slate-500">{job.customerPhone}</span>
                        )}
                        {job.customerArea && (
                          <span className="text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {job.customerArea}
                          </span>
                        )}
                      </div>

                      {/* Work Description / Complaint */}
                      <p className={`text-xs italic line-clamp-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        "{job.issueDescription}"
                      </p>

                      {/* Instructions & Timing */}
                      <div className="flex items-center gap-3 text-[11px] pt-0.5 flex-wrap text-slate-500">
                        <span>Target Due: <strong className={isOverdue ? 'text-rose-600 font-bold' : ''}>{job.estimatedDelivery || job.intakeDate}</strong></span>
                        {job.estimatedDurationHours && (
                          <span>Est Duration: <strong>{job.estimatedDurationHours} hours</strong></span>
                        )}
                        {job.workOrderNotes && (
                          <span className="text-blue-600 dark:text-blue-400 font-medium truncate max-w-md">
                            Instructions: {job.workOrderNotes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Assigned Technician & Actions */}
                  <div className={`flex flex-col sm:flex-row lg:flex-col items-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 ${
                    isDark ? 'border-slate-800' : 'border-slate-200'
                  }`}>
                    
                    {/* Assigned Technician Badge & Reassign */}
                    <div className="flex items-center gap-2">
                      <div className={`px-2.5 py-1 rounded-lg border text-xs flex items-center gap-1.5 ${
                        job.assignedEmployeeId
                          ? (isDark ? 'bg-blue-950/40 border-blue-800 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-800 font-semibold')
                          : (isDark ? 'bg-rose-950/40 border-rose-900 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700 font-semibold')
                      }`}>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{job.assignedTechnician ? `Tech: ${job.assignedTechnician}` : 'Unassigned'}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setReassignModalJob(job);
                          setReassignEmployeeId(job.assignedEmployeeId || employees[0]?.id || '');
                          setReassignInstructions(job.workOrderNotes || 'Inspect and diagnose issue');
                          setReassignDueDate(job.estimatedDelivery || todayStr);
                          setReassignDurationHours(job.estimatedDurationHours || 2);
                          setReassignReason(job.assignedEmployeeId ? 'Workload balancing / specialized skill' : 'Initial allocation');
                        }}
                        className={`px-2 py-1 text-xs rounded-lg border cursor-pointer transition-colors ${
                          isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                        }`}
                        title="Assign or reassign to another technician with recorded audit reason"
                      >
                        {job.assignedEmployeeId ? 'Reassign' : 'Assign'}
                      </button>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5">
                      {/* Show Job Detail */}
                      {onOpenJobDetail && (
                        <button
                          type="button"
                          onClick={() => onOpenJobDetail(job)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Show Job</span>
                        </button>
                      )}

                      {/* Direct WhatsApp Share */}
                      <button
                        type="button"
                        onClick={() => {
                          const targetEmp = employees.find(e => e.id === job.assignedEmployeeId) || employees[0];
                          if (!targetEmp) {
                            alert('No employee available to dispatch.');
                            return;
                          }
                          shareJobToEmployeeWhatsApp(
                            targetEmp.id,
                            job.id,
                            job.workOrderNotes || 'Inspect and repair',
                            job.priorityOrder || 1
                          );
                          showToast(`Job ${job.jobId} shared to ${targetEmp.name} via WhatsApp!`);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer"
                        title="Send work allocation order directly to technician WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Priority Change Modal (Module 1.2) */}
      {priorityModalJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm sm:text-base font-bold">Update Work Order Priority</h3>
                <p className="text-xs text-slate-400">Job: {priorityModalJob.jobId} — {priorityModalJob.customerName}</p>
              </div>
              <button
                type="button"
                onClick={() => setPriorityModalJob(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePriorityChange} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">Select Priority Level</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetPriority('P1')}
                    className={`p-2.5 rounded-xl border text-left font-bold cursor-pointer transition-all ${
                      targetPriority === 'P1'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    🚨 P1 — Emergency
                    <p className="text-[10px] font-normal opacity-90 mt-0.5">Critical, complete immediately</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetPriority('P2')}
                    className={`p-2.5 rounded-xl border text-left font-bold cursor-pointer transition-all ${
                      targetPriority === 'P2'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    ⚡ P2 — High
                    <p className="text-[10px] font-normal opacity-90 mt-0.5">VIP or same-day commitment</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetPriority('P3')}
                    className={`p-2.5 rounded-xl border text-left font-bold cursor-pointer transition-all ${
                      targetPriority === 'P3'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    🔷 P3 — Normal
                    <p className="text-[10px] font-normal opacity-90 mt-0.5">Standard 24-48h queue</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetPriority('P4')}
                    className={`p-2.5 rounded-xl border text-left font-bold cursor-pointer transition-all ${
                      targetPriority === 'P4'
                        ? 'bg-slate-600 text-white border-slate-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    ⚪ P4 — Low
                    <p className="text-[10px] font-normal opacity-90 mt-0.5">Non-urgent maintenance</p>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Work Sequence Order (Position in Queue)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={targetPriorityOrder}
                  onChange={(e) => setTargetPriorityOrder(Number(e.target.value))}
                  className="w-full rounded-xl px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  1st = Complete first, 2nd = Complete next, etc.
                </span>
              </div>

              <div>
                <label className="block font-bold mb-1">Reason for Priority Setting / Change (Audit Log)</label>
                <textarea
                  rows={2}
                  value={priorityChangeReason}
                  onChange={(e) => setPriorityChangeReason(e.target.value)}
                  placeholder="e.g. VIP client requested urgent CCTV repair before evening event..."
                  className="w-full rounded-xl px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPriorityModalJob(null)}
                  className="px-4 py-2 text-xs rounded-xl font-medium cursor-pointer text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer shadow-md"
                >
                  Save Priority & Sequence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Technician Reassign Modal (Module 1.3) */}
      {reassignModalJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm sm:text-base font-bold">Assign / Reassign Technician</h3>
                <p className="text-xs text-slate-400">Job: {reassignModalJob.jobId} — {reassignModalJob.deviceBrand}</p>
              </div>
              <button
                type="button"
                onClick={() => setReassignModalJob(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReassign} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold mb-1">Select Employee / Technician</label>
                <select
                  value={reassignEmployeeId}
                  onChange={(e) => setReassignEmployeeId(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — {emp.role} ({emp.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Expected Target Due Date</label>
                  <input
                    type="date"
                    value={reassignDueDate}
                    onChange={(e) => setReassignDueDate(e.target.value)}
                    className="w-full rounded-xl px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Estimated Duration (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    max="48"
                    value={reassignDurationHours}
                    onChange={(e) => setReassignDurationHours(Number(e.target.value))}
                    className="w-full rounded-xl px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Special Work Instructions</label>
                <textarea
                  rows={2}
                  value={reassignInstructions}
                  onChange={(e) => setReassignInstructions(e.target.value)}
                  placeholder="e.g. Test camera night vision, verify DVR HDD recording playback..."
                  className="w-full rounded-xl px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 resize-none"
                />
              </div>

              {reassignModalJob.assignedEmployeeId && (
                <div>
                  <label className="block font-bold mb-1 text-amber-600">Reassignment Reason (Audit Trail)</label>
                  <input
                    type="text"
                    value={reassignReason}
                    onChange={(e) => setReassignReason(e.target.value)}
                    placeholder="e.g. Previous tech on field leave / chip-level specialization needed..."
                    className="w-full rounded-xl px-3 py-2 text-xs bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setReassignModalJob(null)}
                  className="px-4 py-2 text-xs rounded-xl font-medium cursor-pointer text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer shadow-md"
                >
                  Assign Technician
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Assign Modal (Module 1.1) */}
      {isBulkAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm sm:text-base font-bold">Bulk Assign {selectedJobIds.length} Jobs</h3>
                <p className="text-xs text-slate-400">Allocate multiple calls in one action</p>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkAssignModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBulkAssign} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold mb-1">Assign to Employee</label>
                <select
                  value={bulkEmployeeId}
                  onChange={(e) => setBulkEmployeeId(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} — {emp.role}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Common Work Instructions</label>
                <textarea
                  rows={2}
                  value={bulkInstructions}
                  onChange={(e) => setBulkInstructions(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBulkAssignModalOpen(false)}
                  className="px-4 py-2 text-xs rounded-xl font-medium cursor-pointer text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer shadow-md"
                >
                  Assign All {selectedJobIds.length} Jobs
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk WhatsApp Dispatch Modal (Module 2.5) */}
      {isBulkWhatsAppModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm sm:text-base font-bold">Bulk WhatsApp Dispatch Preview</h3>
                <p className="text-xs text-slate-400">Dispatch {selectedJobIds.length} service jobs via WhatsApp</p>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkWhatsAppModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Select Technician to Receive WhatsApp Message</label>
                <select
                  value={bulkWhatsAppTargetEmpId}
                  onChange={(e) => setBulkWhatsAppTargetEmpId(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.phone})</option>
                  ))}
                </select>
              </div>

              {/* Message preview */}
              <div>
                <label className="block font-bold mb-1">Message Preview</label>
                <div className="p-3 rounded-xl border max-h-56 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                  {(() => {
                    const selectedJobs = jobCards.filter(j => selectedJobIds.includes(j.id));
                    const emp = employees.find(e => e.id === bulkWhatsAppTargetEmpId);
                    return `SGS — BATCH WORK ALLOCATION\nTechnician: ${emp?.name || 'Staff'}\nTotal Jobs: ${selectedJobs.length}\nDate: ${new Date().toLocaleDateString('en-IN')}\n\n` +
                      selectedJobs.map((j, i) => `${i + 1}. [${j.priority || 'P2'}] ${j.jobId} — ${j.customerName} (${j.deviceBrand})\n• Problem: ${j.issueDescription}\n• Target: ${j.estimatedDelivery || j.intakeDate}`).join('\n\n') +
                      `\n\nSpider Grid Solutions · Madurai`;
                  })()}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBulkWhatsAppModalOpen(false)}
                  className="px-4 py-2 text-xs rounded-xl font-medium cursor-pointer text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendBulkWhatsApp}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer shadow-md"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Open WhatsApp & Send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
