import { todayLocal } from '../utils/accounting';
import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  Send, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Wrench, 
  MessageSquare, 
  Phone, 
  Trash2, 
  Edit3, 
  Share2, 
  Check, 
  UserPlus, 
  Layers, 
  ArrowUp, 
  ArrowDown, 
  ExternalLink,
  Briefcase,
  FileText,
  Paperclip,
  Printer,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  CreditCard,
  Award,
  Eye
} from 'lucide-react';
import { useSgs } from '../context/SgsContext';
import { Employee, AttendanceStatus, PaymentMode, JobCard, SalaryPayment } from '../types';

export const EmployeeManager: React.FC = () => {
  const { 
    employees, 
    addEmployee, 
    updateEmployee, 
    deleteEmployee,
    attendanceRecords,
    markAttendance,
    updateAttendanceRecord,
    salaryPayments,
    recordSalaryPayment,
    recordSalaryInstallment,
    jobCards,
    workAllocations,
    allocateWorkToEmployee,
    removeWorkAllocation,
    shareJobToEmployeeWhatsApp,
    theme 
  } = useSgs();

  const isDark = theme === 'dark';

  const [activeSubTab, setActiveSubTab] = useState<'roster' | 'attendance' | 'salary'>('roster');

  // Work Allocation Drawer State
  const [selectedEmpForAllocation, setSelectedEmpForAllocation] = useState<Employee | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [workNotes, setWorkNotes] = useState<string>('');
  const [workPriorityOrder, setWorkPriorityOrder] = useState<number>(1);
  const [shareSuccessToast, setShareSuccessToast] = useState<string | null>(null);

  // Monthly Attendance Calendar Modal State (Module 3 - Requirement 3)
  const [selectedEmpForCalendar, setSelectedEmpForCalendar] = useState<Employee | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<string>(() => todayLocal().substring(0, 7));
  const [editingDayRecord, setEditingDayRecord] = useState<{
    date: string;
    status: AttendanceStatus;
    checkInTime?: string;
    checkOutTime?: string;
    overtimeHours?: number;
    notes?: string;
  } | null>(null);

  // Multi-Payment Installment Modal State (Module 3 - Requirement 4)
  const [payingInstallment, setPayingInstallment] = useState<{
    emp: Employee;
    totalPayable: number;
    totalPaid: number;
    balanceDue: number;
  } | null>(null);
  const [installmentAmount, setInstallmentAmount] = useState<number>(0);
  const [installmentDate, setInstallmentDate] = useState<string>(() => todayLocal());
  const [installmentMode, setInstallmentMode] = useState<PaymentMode>('upi');
  const [installmentRef, setInstallmentRef] = useState<string>('');
  const [installmentNotes, setInstallmentNotes] = useState<string>('');

  // Detailed Wage Slip Modal
  const [viewingWageSlip, setViewingWageSlip] = useState<{
    emp: Employee;
    sal?: SalaryPayment;
    gross: number;
    summary: { presentCount: number; halfDayCount: number; absentCount: number; leaveCount: number; effectiveDays: number };
    totalPayable: number;
    totalPaid: number;
    balanceDue: number;
  } | null>(null);

  // General toast notification
  const [empToast, setEmpToast] = useState<string | null>(null);
  const showEmpToast = (msg: string) => {
    setEmpToast(msg);
    setTimeout(() => setEmpToast(null), 3500);
  };

  // Add / Edit Employee Modal
  const [isAddEmpModalOpen, setIsAddEmpModalOpen] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [empName, setEmpName] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empRole, setEmpRole] = useState('Senior Chip-Level Technician');
  const [empDailySalary, setEmpDailySalary] = useState<number>(750);
  const [empMonthlySalary, setEmpMonthlySalary] = useState<number>(19500);
  const [empUpiId, setEmpUpiId] = useState('');
  const [empNotes, setEmpNotes] = useState('');

  const handleOpenAddEmployee = () => {
    setEditingEmpId(null);
    setEmpName('');
    setEmpPhone('');
    setEmpRole('Senior Chip-Level Technician');
    setEmpDailySalary(750);
    setEmpMonthlySalary(19500);
    setEmpUpiId('');
    setEmpNotes('');
    setIsAddEmpModalOpen(true);
  };

  const handleOpenEditEmployee = (emp: Employee) => {
    setEditingEmpId(emp.id);
    setEmpName(emp.name);
    setEmpPhone(emp.phone);
    setEmpRole(emp.role);
    setEmpDailySalary(emp.dailySalary || 750);
    setEmpMonthlySalary(emp.monthlySalary || (emp.dailySalary * 26));
    setEmpUpiId(emp.upiId || '');
    setEmpNotes(emp.notes || '');
    setIsAddEmpModalOpen(true);
  };

  // Attendance Date
  const [attendanceDate, setAttendanceDate] = useState(() => todayLocal());

  // Salary Month (YYYY-MM)
  const currentMonth = todayLocal().substring(0, 7);
  const [salaryMonth, setSalaryMonth] = useState<string>(currentMonth);

  // Pay Salary Modal
  const [payingEmp, setPayingEmp] = useState<Employee | null>(null);
  const [payAdvanceDeduction, setPayAdvanceDeduction] = useState<number>(0);
  const [payBonus, setPayBonus] = useState<number>(0);
  const [payMode, setPayMode] = useState<PaymentMode>('upi');
  const [payRef, setPayRef] = useState('');

  // Pending Jobs available for allocation (only active pending jobs, excluding work_completed, completed, delivered, billed)
  const pendingJobs = useMemo(() => {
    return jobCards.filter(j => 
      j.status !== 'work_completed' &&
      j.status !== 'completed' && 
      j.status !== 'delivered' &&
      j.status !== 'billed'
    );
  }, [jobCards]);

  // Open Allocation Modal for an Employee
  const handleOpenAllocationForEmp = (emp: Employee) => {
    setSelectedEmpForAllocation(emp);
    // Find if this employee already has an allocation or set default
    const firstPending = pendingJobs.find(j => j.assignedEmployeeId !== emp.id);
    setSelectedJobId(firstPending?.id || (pendingJobs[0]?.id || ''));
    setWorkNotes('Please diagnose and service this device with high priority.');
    setWorkPriorityOrder(1);
  };

  // Handle Share to WhatsApp & Update Job Card & Add to Job Card Timeline
  const handleShareToWhatsApp = () => {
    if (!selectedEmpForAllocation || !selectedJobId) {
      showEmpToast('Please select a pending job to allocate.');
      return;
    }

    const job = jobCards.find(j => j.id === selectedJobId);
    if (!job) return;

    // Trigger WhatsApp share and auto-timeline logging via context
    shareJobToEmployeeWhatsApp(
      selectedEmpForAllocation.id,
      job.id,
      workNotes,
      workPriorityOrder
    );

    setShareSuccessToast(`Job #${job.jobId} shared to ${selectedEmpForAllocation.name} via WhatsApp & logged in Job Card Timeline!`);
    setTimeout(() => setShareSuccessToast(null), 4000);
  };

  // Handle Add or Edit Employee
  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !empPhone.trim()) return;

    if (editingEmpId) {
      const updatedData = {
        name: empName.trim(),
        phone: empPhone.trim(),
        role: empRole.trim(),
        dailySalary: empDailySalary || 700,
        monthlySalary: empMonthlySalary || (empDailySalary * 26),
        upiId: empUpiId.trim(),
        notes: empNotes.trim()
      };
      updateEmployee(editingEmpId, updatedData);
      showEmpToast(`Updated profile for ${empName.trim()}`);
      if (selectedEmpForCalendar && selectedEmpForCalendar.id === editingEmpId) {
        setSelectedEmpForCalendar(prev => prev ? { ...prev, ...updatedData } : null);
      }
    } else {
      addEmployee({
        name: empName.trim(),
        phone: empPhone.trim(),
        role: empRole.trim(),
        dailySalary: empDailySalary || 700,
        monthlySalary: empMonthlySalary || (empDailySalary * 26),
        joiningDate: todayLocal(),
        status: 'active',
        upiId: empUpiId.trim(),
        notes: empNotes.trim()
      });
      showEmpToast(`Added new staff member: ${empName.trim()}`);
    }

    setIsAddEmpModalOpen(false);
    setEditingEmpId(null);
    setEmpName('');
    setEmpPhone('');
    setEmpRole('Senior Chip-Level Technician');
    setEmpDailySalary(750);
    setEmpMonthlySalary(19500);
    setEmpUpiId('');
    setEmpNotes('');
  };

  // Get today's attendance for an employee
  const getEmpAttendance = (empId: string, date: string): AttendanceStatus | null => {
    const rec = attendanceRecords.find(a => a.employeeId === empId && a.date === date);
    return rec ? rec.status : null;
  };

  // Calculate Monthly Stats for an Employee
  const getMonthlyAttendanceSummary = (empId: string, monthStr: string) => {
    const monthRecs = attendanceRecords.filter(a => a.employeeId === empId && a.date.startsWith(monthStr));
    const presentCount = monthRecs.filter(a => a.status === 'present').length;
    const halfDayCount = monthRecs.filter(a => a.status === 'half_day').length;
    const absentCount = monthRecs.filter(a => a.status === 'absent').length;
    const leaveCount = monthRecs.filter(a => a.status === 'leave').length;

    return {
      presentCount,
      halfDayCount,
      absentCount,
      leaveCount,
      effectiveDays: presentCount + (halfDayCount * 0.5)
    };
  };

  // Month navigation for Attendance Calendar Modal
  const handlePrevMonth = () => {
    const [y, m] = calendarMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const yr = prevDate.getFullYear();
    const mo = String(prevDate.getMonth() + 1).padStart(2, '0');
    setCalendarMonth(`${yr}-${mo}`);
  };

  const handleNextMonth = () => {
    const [y, m] = calendarMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const yr = nextDate.getFullYear();
    const mo = String(nextDate.getMonth() + 1).padStart(2, '0');
    setCalendarMonth(`${yr}-${mo}`);
  };

  // Save individual day attendance from Calendar Modal
  const handleSaveDayAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpForCalendar || !editingDayRecord) return;

    updateAttendanceRecord(
      selectedEmpForCalendar.id,
      editingDayRecord.date,
      editingDayRecord.status,
      editingDayRecord.notes,
      editingDayRecord.checkInTime,
      editingDayRecord.checkOutTime,
      editingDayRecord.overtimeHours
    );

    showEmpToast(`Attendance saved for ${selectedEmpForCalendar.name} on ${editingDayRecord.date}`);
    setEditingDayRecord(null);
  };

  // Handle Multi-Payment Installment submission
  const handleConfirmInstallmentPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInstallment || installmentAmount <= 0) return;

    recordSalaryInstallment(
      payingInstallment.emp.id,
      salaryMonth,
      {
        amount: Number(installmentAmount),
        paymentDate: installmentDate,
        paymentMode: installmentMode,
        referenceNumber: installmentRef.trim() || `PAY-${Date.now().toString().slice(-4)}`,
        notes: installmentNotes.trim() || `Multi-paid installment for ${salaryMonth}`,
        paidBy: 'Admin'
      },
      payingInstallment.totalPayable
    );

    showEmpToast(`Payment of ₹${Number(installmentAmount).toLocaleString('en-IN')} recorded for ${payingInstallment.emp.name}`);
    setPayingInstallment(null);
    setInstallmentAmount(0);
    setInstallmentRef('');
    setInstallmentNotes('');
  };

  // Handle Pay Salary Submission
  const handleConfirmSalaryPayment = () => {
    if (!payingEmp) return;

    const summary = getMonthlyAttendanceSummary(payingEmp.id, salaryMonth);
    const calculatedBase = payingEmp.dailySalary 
      ? Math.round(payingEmp.dailySalary * summary.effectiveDays)
      : (payingEmp.monthlySalary || 18000);

    const netPayable = Math.max(0, calculatedBase + payBonus - payAdvanceDeduction);

    recordSalaryPayment({
      employeeId: payingEmp.id,
      month: salaryMonth,
      baseSalary: payingEmp.monthlySalary || (payingEmp.dailySalary * 26),
      daysPresent: summary.presentCount,
      halfDays: summary.halfDayCount,
      absentDays: summary.absentCount,
      calculatedSalary: calculatedBase,
      advanceDeduction: payAdvanceDeduction,
      bonus: payBonus,
      netPaid: netPayable,
      paymentDate: todayLocal(),
      paymentMode: payMode,
      referenceNumber: payRef || `SAL-${payingEmp.name.substring(0, 3).toUpperCase()}-${salaryMonth}`,
      status: 'paid',
      notes: `Salary for ${salaryMonth} (${summary.effectiveDays} working days)`
    });

    setPayingEmp(null);
    setPayAdvanceDeduction(0);
    setPayBonus(0);
    setPayRef('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {empToast && (
        <div className="fixed top-6 right-6 z-50 bg-purple-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4" />
          <span>{empToast}</span>
        </div>
      )}
      
      {/* Top Banner */}
      <div className={`p-6 rounded-2xl border transition-all ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 text-purple-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Staff, Attendance & Work Allocation
              </h1>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Click employee name to open attachment, assign pending call, set work order priority, and send instant WhatsApp instructions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleOpenAddEmployee}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm cursor-pointer transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add New Staff</span>
            </button>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-2 mt-6 border-b border-slate-200 dark:border-slate-800 pb-3">
          <button
            onClick={() => setActiveSubTab('roster')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'roster'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Staff Roster & Work Allocation</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeSubTab === 'roster' ? 'bg-purple-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {employees.length} Staff
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('attendance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'attendance'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Daily Attendance</span>
          </button>

          <button
            onClick={() => setActiveSubTab('salary')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'salary'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Monthly Salary & Slips</span>
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {shareSuccessToast && (
        <div className="p-4 rounded-xl bg-emerald-500 text-white flex items-center justify-between text-xs font-semibold shadow-lg animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{shareSuccessToast}</span>
          </div>
          <button onClick={() => setShareSuccessToast(null)} className="opacity-80 hover:opacity-100">✕</button>
        </div>
      )}

      {/* SUB-TAB 1: ROSTER & WORK ALLOCATION */}
      {activeSubTab === 'roster' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {employees.map(emp => {
              const assignedJobs = jobCards.filter(j => j.assignedEmployeeId === emp.id && j.status !== 'work_completed' && j.status !== 'completed' && j.status !== 'delivered' && j.status !== 'billed');
              const todayAtt = getEmpAttendance(emp.id, todayLocal());

              return (
                <div
                  key={emp.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isDark ? 'bg-slate-900 border-slate-800 hover:border-purple-500/50' : 'bg-white border-slate-200 hover:border-purple-400 shadow-sm'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        {/* Clickable Employee Name */}
                        <button
                          type="button"
                          onClick={() => handleOpenAllocationForEmp(emp)}
                          className="text-left font-bold text-base text-blue-600 hover:text-blue-500 hover:underline flex items-center gap-1.5 cursor-pointer group"
                          title="Click to open attachment and allocate pending jobs"
                        >
                          <span>{emp.name}</span>
                          <Paperclip className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                        </button>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {emp.role}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditEmployee(emp)}
                          className="p-1 rounded-md text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 cursor-pointer transition-colors"
                          title={`Edit ${emp.name}'s profile, daily wage rate, and role`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          todayAtt === 'present' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          todayAtt === 'half_day' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {todayAtt || 'Not Marked'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono">{emp.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Daily: <strong>₹{emp.dailySalary}</strong> / Mo: <strong>₹{emp.monthlySalary || emp.dailySalary * 26}</strong></span>
                      </div>
                      {emp.upiId && (
                        <div className="text-[11px] font-mono text-purple-600 dark:text-purple-400">
                          UPI: {emp.upiId}
                        </div>
                      )}
                    </div>

                    {/* Assigned Jobs Badge */}
                    <div className={`p-2.5 rounded-xl border ${
                      assignedJobs.length > 0 
                        ? (isDark ? 'bg-purple-950/20 border-purple-900/60' : 'bg-purple-50/60 border-purple-200')
                        : (isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200')
                    }`}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-600 dark:text-slate-400">Active Work Order:</span>
                        <span className="font-bold font-mono text-purple-600">{assignedJobs.length} Assigned</span>
                      </div>
                      {assignedJobs.length > 0 && (
                        <div className="mt-1.5 space-y-1">
                          {assignedJobs.slice(0, 2).map((j, idx) => (
                            <div key={`${j.id}-${idx}`} className="text-[11px] truncate flex items-center justify-between">
                              <span className="font-mono font-bold text-blue-600">{j.jobId}</span>
                              <span className="text-slate-500 truncate max-w-[120px]">{j.deviceBrand}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Attachment & Work Allocation Action Button */}
                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleOpenAllocationForEmp(emp)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-sm cursor-pointer transition-all"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>Work Allocation & WhatsApp</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DAILY ATTENDANCE */}
      {activeSubTab === 'attendance' && (
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-purple-600" />
              <div>
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Staff Attendance Register
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Select date and tap status to record daily staff attendance
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Date:</span>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none ${
                  isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Attendance Table */}
          <div className={`rounded-2xl border overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-xs min-w-[620px]">
              <thead className={`border-b text-[11px] font-semibold uppercase ${
                isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}>
                <tr>
                  <th className="py-3 px-4">Employee Name</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Mark Attendance</th>
                  <th className="py-3 px-4">Monthly Present</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800 text-slate-200' : 'divide-slate-100 text-slate-800'}`}>
                {employees.map(emp => {
                  const currentStatus = getEmpAttendance(emp.id, attendanceDate);
                  const monthSummary = getMonthlyAttendanceSummary(emp.id, attendanceDate.substring(0, 7));

                  return (
                    <tr key={emp.id} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                      <td className="py-3.5 px-4 font-bold text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEmpForCalendar(emp);
                              setCalendarMonth(attendanceDate.substring(0, 7));
                            }}
                            className="group hover:text-purple-600 cursor-pointer flex items-center gap-2 text-left font-bold"
                            title="Click name to view monthly working & leave calendar, and edit attendance"
                          >
                            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                              <Calendar className="w-4 h-4 shrink-0" />
                            </span>
                            <div>
                              <span className={`block hover:underline text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{emp.name}</span>
                              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold block">Click for Monthly Working & Leaves ↗</span>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditEmployee(emp)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 cursor-pointer transition-colors shadow-2xs shrink-0"
                            title={`Edit ${emp.name}'s details, wage rate, role, and phone`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Staff</span>
                          </button>
                        </div>
                        <span className="block text-[11px] font-mono text-slate-400 font-normal mt-1">{emp.phone}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{emp.role}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          currentStatus === 'present' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          currentStatus === 'half_day' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                          currentStatus === 'absent' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {currentStatus ? currentStatus.replace('_', ' ') : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => markAttendance(emp.id, attendanceDate, 'present')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              currentStatus === 'present'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : (isDark ? 'bg-slate-800 text-slate-300 hover:bg-emerald-950 hover:text-emerald-400' : 'bg-slate-100 text-slate-700 hover:bg-emerald-100 hover:text-emerald-800')
                            }`}
                          >
                            Present
                          </button>

                          <button
                            type="button"
                            onClick={() => markAttendance(emp.id, attendanceDate, 'half_day')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              currentStatus === 'half_day'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : (isDark ? 'bg-slate-800 text-slate-300 hover:bg-amber-950 hover:text-amber-400' : 'bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-800')
                            }`}
                          >
                            Half Day
                          </button>

                          <button
                            type="button"
                            onClick={() => markAttendance(emp.id, attendanceDate, 'absent')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              currentStatus === 'absent'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : (isDark ? 'bg-slate-800 text-slate-300 hover:bg-rose-950 hover:text-rose-400' : 'bg-slate-100 text-slate-700 hover:bg-rose-100 hover:text-rose-800')
                            }`}
                          >
                            Absent
                          </button>

                          <button
                            type="button"
                            onClick={() => markAttendance(emp.id, attendanceDate, 'leave')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              currentStatus === 'leave'
                                ? 'bg-slate-600 text-white shadow-xs'
                                : (isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')
                            }`}
                          >
                            Leave
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-purple-600">
                        {monthSummary.presentCount} Full + {monthSummary.halfDayCount} Half ({monthSummary.effectiveDays} Days)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: MONTHLY SALARY & SLIPS */}
      {activeSubTab === 'salary' && (
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Staff Salary Register & Wage Slip
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Calculated from attendance days × daily wage with advance and bonus adjustments
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Salary Month:</span>
              <input
                type="month"
                value={salaryMonth}
                onChange={(e) => setSalaryMonth(e.target.value)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none ${
                  isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Salary Table */}
          <div className={`rounded-2xl border overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-xs min-w-[640px]">
              <thead className={`border-b text-[11px] font-semibold uppercase ${
                isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}>
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Daily Rate</th>
                  <th className="py-3 px-4">Days Worked</th>
                  <th className="py-3 px-4 text-right">Gross Payable</th>
                  <th className="py-3 px-4 text-right">Paid So Far</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800 text-slate-200' : 'divide-slate-100 text-slate-800'}`}>
                {employees.map(emp => {
                  const summary = getMonthlyAttendanceSummary(emp.id, salaryMonth);
                  const existingSal = salaryPayments.find(s => s.employeeId === emp.id && s.month === salaryMonth);
                  const calculatedGross = Math.round(emp.dailySalary * summary.effectiveDays);
                  const totalPayable = existingSal 
                    ? (existingSal.calculatedSalary + (existingSal.bonus || 0) - (existingSal.advanceDeduction || 0))
                    : calculatedGross;
                  
                  const installmentPayments = existingSal?.payments || [];
                  const totalPaid = installmentPayments.length > 0 
                    ? installmentPayments.reduce((sum, p) => sum + p.amount, 0)
                    : (existingSal?.status === 'paid' ? existingSal.netPaid : 0);

                  const balanceDue = Math.max(0, totalPayable - totalPaid);
                  const isFullyPaid = totalPaid >= totalPayable && totalPayable > 0;
                  const isPartiallyPaid = totalPaid > 0 && balanceDue > 0;

                  return (
                    <tr key={emp.id} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                      <td className="py-3.5 px-4 font-bold">
                        <span className={isDark ? 'text-white' : 'text-slate-900'}>{emp.name}</span>
                        <span className="block text-[11px] font-normal text-slate-400">{emp.role}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold">₹{emp.dailySalary} / day</td>
                      <td className="py-3.5 px-4 font-mono text-purple-600 font-bold">
                        {summary.effectiveDays} Days ({summary.presentCount} Full, {summary.halfDayCount} Half)
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold">₹{totalPayable.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600">
                        ₹{totalPaid.toLocaleString('en-IN')}
                        {installmentPayments.length > 0 && (
                          <span className="block text-[10px] font-normal text-slate-400">
                            ({installmentPayments.length} payment{installmentPayments.length > 1 ? 's' : ''})
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        {balanceDue > 0 ? (
                          <span className="text-amber-500">₹{balanceDue.toLocaleString('en-IN')}</span>
                        ) : (
                          <span className="text-emerald-500 font-normal">₹0 (Cleared)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isFullyPaid
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : isPartiallyPaid
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {isFullyPaid ? 'Full Paid' : isPartiallyPaid ? 'Partial Paid' : 'Unpaid'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Multi Paid / Partial Payment Trigger */}
                          <button
                            type="button"
                            onClick={() => {
                              setPayingInstallment({
                                emp,
                                totalPayable,
                                totalPaid,
                                balanceDue
                              });
                              setInstallmentAmount(balanceDue > 0 ? balanceDue : 1000);
                              setInstallmentDate(todayLocal());
                              setInstallmentRef(`UPI-${emp.phone.substring(emp.phone.length - 4)}`);
                              setInstallmentNotes(balanceDue > 0 ? 'Salary payout / partial installment' : 'Bonus / incentive payout');
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs ${
                              balanceDue > 0
                                ? 'text-white bg-emerald-600 hover:bg-emerald-700'
                                : (isDark ? 'text-emerald-300 bg-emerald-950/60 border border-emerald-800 hover:bg-emerald-900' : 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100')
                            }`}
                            title="Record Multi-Paid partial payment or advance"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>{balanceDue > 0 ? '+ Multi Paid' : '+ Add Payment'}</span>
                          </button>

                          {/* Wage Slip & Breakdown */}
                          <button
                            type="button"
                            onClick={() => {
                              setViewingWageSlip({
                                emp,
                                sal: existingSal,
                                gross: calculatedGross,
                                summary,
                                totalPayable,
                                totalPaid,
                                balanceDue
                              });
                            }}
                            className={`px-2 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex items-center gap-1 ${
                              isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                            title="View Wage Slip & Installment Records"
                          >
                            <Eye className="w-3 h-3 text-blue-500" />
                            <span>Wage Slip</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* WORK ALLOCATION & ATTACHMENT MODAL / DRAWER (Triggered on Emp Name click) */}
      {selectedEmpForAllocation && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-2xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <Paperclip className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Work Allocation & Attachment: {selectedEmpForAllocation.name}
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Select pending service call, add work instructions, set priority, and share to technician WhatsApp
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmpForAllocation(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              
              {/* Employee Quick Info */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Technician</span>
                  <p className="font-bold text-sm text-purple-600">{selectedEmpForAllocation.name}</p>
                  <p className="text-slate-500">{selectedEmpForAllocation.role}</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">WhatsApp Phone</span>
                  <p className="font-mono font-bold text-emerald-600">{selectedEmpForAllocation.phone}</p>
                </div>
              </div>

              {/* 1. Select on Pending Call */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  1. Select on Pending Call / Job Card *
                </label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-700 text-slate-100' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="">-- Choose a Pending Call / Job --</option>
                  {pendingJobs.map((job, idx) => (
                    <option key={`${job.id}-${idx}`} value={job.id}>
                      {job.jobId} - {job.customerName} ({job.deviceBrand}) - Problem: {job.issueDescription.substring(0, 35)}... [{job.status.toUpperCase()}]
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Showing {pendingJobs.length} active service calls awaiting diagnosis or completion.
                </span>
              </div>

              {/* Preview of Selected Job */}
              {(() => {
                const job = jobCards.find(j => j.id === selectedJobId);
                if (!job) return null;
                return (
                  <div className={`p-4 rounded-xl border space-y-2 text-xs ${
                    isDark ? 'bg-blue-950/20 border-blue-900/60' : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-600">{job.jobId}</span>
                        <span className="uppercase text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
                          {job.status.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-slate-500 font-mono">Customer: {job.customerPhone}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-blue-200/50 dark:border-blue-900/50">
                      <div>
                        <span className="text-slate-400 text-[10px]">Customer:</span>
                        <p className="font-semibold">{job.customerName} ({job.customerArea || 'Madurai'})</p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Device:</span>
                        <p className="font-semibold">{job.deviceBrand} · {job.category}</p>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 text-[10px]">Reported Issue:</span>
                      <p className="font-medium text-slate-700 dark:text-slate-300">{job.issueDescription}</p>
                    </div>
                  </div>
                );
              })()}

              {/* 2. Add Note & Instructions */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  2. Add Note / Technician Work Order Instructions *
                </label>
                <textarea
                  rows={3}
                  value={workNotes}
                  onChange={(e) => setWorkNotes(e.target.value)}
                  placeholder="e.g. Check backlight inverter IC, replace keyboard, test charging IC power rail..."
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-700 text-slate-100' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* 3. Change the Job Order / Priority */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  3. Change the Job Order / Work Priority *
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setWorkPriorityOrder(1)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      workPriorityOrder === 1
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/20'
                        : (isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700')
                    }`}
                  >
                    <span className="block text-sm font-bold">Priority #1</span>
                    <span className="text-[10px] opacity-80">Do First / Urgent</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWorkPriorityOrder(2)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      workPriorityOrder === 2
                        ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-500/20'
                        : (isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700')
                    }`}
                  >
                    <span className="block text-sm font-bold">Priority #2</span>
                    <span className="text-[10px] opacity-80">Next in Queue</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWorkPriorityOrder(3)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      workPriorityOrder === 3
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                        : (isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700')
                    }`}
                  >
                    <span className="block text-sm font-bold">Priority #3</span>
                    <span className="text-[10px] opacity-80">Normal Service</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Footer with Share to WhatsApp Button */}
            <div className={`px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'
            }`}>
              <span className="text-xs text-slate-400">
                Auto-updates Job Card timeline upon sharing
              </span>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setSelectedEmpForAllocation(null)}
                  className="flex-1 sm:flex-none px-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleShareToWhatsApp}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 cursor-pointer transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share to Employee WhatsApp & Add to Timeline</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAY SALARY MODAL */}
      {payingEmp && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <h3 className="text-base font-bold">Record Salary Payment</h3>
            <p className="text-xs text-slate-500">
              Staff: <strong>{payingEmp.name}</strong> · Month: <strong>{salaryMonth}</strong>
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Advance / Loan Deduction (₹)</label>
                <input
                  type="number"
                  value={payAdvanceDeduction}
                  onChange={(e) => setPayAdvanceDeduction(Number(e.target.value))}
                  className={`w-full rounded-lg px-3 py-2 text-xs font-mono ${
                    isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Bonus / Incentive (₹)</label>
                <input
                  type="number"
                  value={payBonus}
                  onChange={(e) => setPayBonus(Number(e.target.value))}
                  className={`w-full rounded-lg px-3 py-2 text-xs font-mono ${
                    isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Payment Mode</label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value as any)}
                  className={`w-full rounded-lg px-3 py-2 text-xs font-semibold ${
                    isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                >
                  <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">UPI Ref / Cheque No / Remarks</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="UPI Ref or UTR"
                  className={`w-full rounded-lg px-3 py-2 text-xs font-mono ${
                    isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPayingEmp(null)}
                className="px-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSalaryPayment}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT EMPLOYEE MODAL */}
      {isAddEmpModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">
                {editingEmpId ? 'Edit Employee Profile' : 'Add New Workshop Staff Member'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddEmpModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEmployee} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Staff Full Name *</label>
                <input
                  type="text"
                  required
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder="e.g. Anand Babu"
                  className={`w-full rounded-lg px-3 py-2 text-xs ${
                    isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">WhatsApp Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={empPhone}
                  onChange={(e) => setEmpPhone(e.target.value)}
                  placeholder="e.g. 9842100005"
                  className={`w-full rounded-lg px-3 py-2 text-xs font-mono ${
                    isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Role / Specialization</label>
                <input
                  type="text"
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value)}
                  placeholder="e.g. Senior Chip-Level Technician"
                  className={`w-full rounded-lg px-3 py-2 text-xs ${
                    isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Daily Wage (₹)</label>
                  <input
                    type="number"
                    value={empDailySalary}
                    onChange={(e) => setEmpDailySalary(Number(e.target.value))}
                    className={`w-full rounded-lg px-3 py-2 text-xs font-mono ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Monthly Approx (₹)</label>
                  <input
                    type="number"
                    value={empMonthlySalary}
                    onChange={(e) => setEmpMonthlySalary(Number(e.target.value))}
                    className={`w-full rounded-lg px-3 py-2 text-xs font-mono ${
                      isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">UPI ID for Salary Transfer</label>
                <input
                  type="text"
                  value={empUpiId}
                  onChange={(e) => setEmpUpiId(e.target.value)}
                  placeholder="name@okaxis / upi"
                  className={`w-full rounded-lg px-3 py-2 text-xs font-mono ${
                    isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-300'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddEmpModalOpen(false);
                    setEditingEmpId(null);
                  }}
                  className="px-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  {editingEmpId ? 'Save Profile Changes' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. MONTHLY ATTENDANCE CALENDAR & EDIT MODAL (Module 3 - Requirement 3) */}
      {selectedEmpForCalendar && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className={`border rounded-2xl w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/10 text-purple-600 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <span>{selectedEmpForCalendar.name}</span>
                      <span className="text-xs font-normal text-slate-400">({selectedEmpForCalendar.role})</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleOpenEditEmployee(selectedEmpForCalendar)}
                      className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer transition-all"
                      title="Edit employee profile details, wage rates, role and phone"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Staff Profile</span>
                    </button>
                  </div>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Monthly Working, Leave & Attendance Calendar · Click any day to edit status
                  </p>
                </div>
              </div>

              {/* Month Navigation Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="month"
                  value={calendarMonth}
                  onChange={(e) => setCalendarMonth(e.target.value)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedEmpForCalendar(null);
                    setEditingDayRecord(null);
                  }}
                  className="p-1.5 ml-2 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Monthly Summary Cards */}
              {(() => {
                const summary = getMonthlyAttendanceSummary(selectedEmpForCalendar.id, calendarMonth);
                const [y, m] = calendarMonth.split('-').map(Number);
                const totalDaysInMonth = new Date(y, m, 0).getDate();
                const estimatedEarnings = Math.round(selectedEmpForCalendar.dailySalary * summary.effectiveDays);

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                    <div className={`p-3 rounded-xl border text-center ${
                      isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Days</span>
                      <span className="text-lg font-bold font-mono">{totalDaysInMonth}</span>
                    </div>

                    <div className={`p-3 rounded-xl border text-center ${
                      isDark ? 'bg-emerald-950/30 border-emerald-900/60' : 'bg-emerald-50 border-emerald-200'
                    }`}>
                      <span className="text-[10px] uppercase font-bold text-emerald-600 block">🟢 Present</span>
                      <span className="text-lg font-bold font-mono text-emerald-600">{summary.presentCount}</span>
                    </div>

                    <div className={`p-3 rounded-xl border text-center ${
                      isDark ? 'bg-amber-950/30 border-amber-900/60' : 'bg-amber-50 border-amber-200'
                    }`}>
                      <span className="text-[10px] uppercase font-bold text-amber-600 block">🟡 Half Day</span>
                      <span className="text-lg font-bold font-mono text-amber-600">{summary.halfDayCount}</span>
                    </div>

                    <div className={`p-3 rounded-xl border text-center ${
                      isDark ? 'bg-blue-950/30 border-blue-900/60' : 'bg-blue-50 border-blue-200'
                    }`}>
                      <span className="text-[10px] uppercase font-bold text-blue-600 block">🔵 Leave / Off</span>
                      <span className="text-lg font-bold font-mono text-blue-600">{summary.leaveCount}</span>
                    </div>

                    <div className={`p-3 rounded-xl border text-center ${
                      isDark ? 'bg-rose-950/30 border-rose-900/60' : 'bg-rose-50 border-rose-200'
                    }`}>
                      <span className="text-[10px] uppercase font-bold text-rose-600 block">🔴 Absent</span>
                      <span className="text-lg font-bold font-mono text-rose-600">{summary.absentCount}</span>
                    </div>

                    <div className={`p-3 rounded-xl border text-center ${
                      isDark ? 'bg-purple-950/30 border-purple-900/60' : 'bg-purple-50 border-purple-200'
                    }`}>
                      <span className="text-[10px] uppercase font-bold text-purple-600 block">Effective Work</span>
                      <span className="text-lg font-bold font-mono text-purple-600">
                        {summary.effectiveDays}d <span className="text-xs font-normal">· ₹{estimatedEarnings.toLocaleString('en-IN')}</span>
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Monthly Interactive Calendar Grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {new Date(calendarMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Calendar View
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Tap any day to edit status, hours & notes
                  </span>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold text-slate-400 uppercase py-1">
                  <span>Sun</span>
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                </div>

                {/* Calendar Days */}
                {(() => {
                  const [y, m] = calendarMonth.split('-').map(Number);
                  const totalDays = new Date(y, m, 0).getDate();
                  const startDayOfWeek = new Date(y, m - 1, 1).getDay();

                  const blanks = Array.from({ length: startDayOfWeek }, (_, i) => i);
                  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

                  return (
                    <div className="grid grid-cols-7 gap-1.5">
                      {blanks.map(b => (
                        <div key={`blank-${b}`} className="min-h-[64px] rounded-xl opacity-20 border border-transparent" />
                      ))}

                      {days.map(d => {
                        const dateStr = `${calendarMonth}-${String(d).padStart(2, '0')}`;
                        const record = attendanceRecords.find(a => a.employeeId === selectedEmpForCalendar.id && a.date === dateStr);
                        const status = record?.status;
                        const isSelected = editingDayRecord?.date === dateStr;

                        return (
                          <div
                            key={dateStr}
                            onClick={() => {
                              setEditingDayRecord({
                                date: dateStr,
                                status: status || 'present',
                                checkInTime: record?.checkInTime || '09:00 AM',
                                checkOutTime: record?.checkOutTime || '07:30 PM',
                                overtimeHours: record?.overtimeHours || 0,
                                notes: record?.notes || ''
                              });
                            }}
                            className={`min-h-[64px] p-2 rounded-xl border flex flex-col justify-between transition-all cursor-pointer text-left ${
                              isSelected
                                ? 'ring-2 ring-purple-600 border-purple-600 shadow-md scale-[1.02]'
                                : isDark
                                ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                                : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold font-mono ${
                                isSelected ? 'text-purple-600' : isDark ? 'text-slate-300' : 'text-slate-700'
                              }`}>
                                {d}
                              </span>
                              {status === 'present' && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Present" />}
                              {status === 'half_day' && <span className="w-2 h-2 rounded-full bg-amber-500" title="Half Day" />}
                              {status === 'absent' && <span className="w-2 h-2 rounded-full bg-rose-500" title="Absent" />}
                              {status === 'leave' && <span className="w-2 h-2 rounded-full bg-blue-500" title="Leave" />}
                            </div>

                            <div className="mt-1">
                              {status ? (
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  status === 'present' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                                  status === 'half_day' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                                  status === 'absent' ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' :
                                  'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                                }`}>
                                  {status === 'half_day' ? 'Half Day' : status}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  —
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Day Attendance Edit Form (Requirement 3: "edit option for individual emp") */}
              {editingDayRecord && (
                <div className={`p-4 rounded-xl border animate-in fade-in slide-in-from-bottom-2 ${
                  isDark ? 'bg-slate-950 border-purple-800/60' : 'bg-purple-50/50 border-purple-200'
                }`}>
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-purple-200/50 dark:border-purple-900/50">
                    <h4 className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Attendance: {new Date(editingDayRecord.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setEditingDayRecord(null)}
                      className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Close
                    </button>
                  </div>

                  <form onSubmit={handleSaveDayAttendance} className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {/* Status Selector */}
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-slate-400 font-semibold mb-1">Status *</label>
                        <select
                          value={editingDayRecord.status}
                          onChange={(e) => setEditingDayRecord({ ...editingDayRecord, status: e.target.value as AttendanceStatus })}
                          className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                            isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                          }`}
                        >
                          <option value="present">🟢 Present</option>
                          <option value="half_day">🟡 Half Day</option>
                          <option value="absent">🔴 Absent</option>
                          <option value="leave">🔵 Leave / Off</option>
                        </select>
                      </div>

                      {/* Check-in Time */}
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Check In</label>
                        <input
                          type="text"
                          value={editingDayRecord.checkInTime || ''}
                          onChange={(e) => setEditingDayRecord({ ...editingDayRecord, checkInTime: e.target.value })}
                          placeholder="09:00 AM"
                          className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono ${
                            isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>

                      {/* Check-out Time */}
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Check Out</label>
                        <input
                          type="text"
                          value={editingDayRecord.checkOutTime || ''}
                          onChange={(e) => setEditingDayRecord({ ...editingDayRecord, checkOutTime: e.target.value })}
                          placeholder="07:30 PM"
                          className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono ${
                            isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>

                      {/* Overtime Hours */}
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Overtime (Hrs)</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={editingDayRecord.overtimeHours || 0}
                          onChange={(e) => setEditingDayRecord({ ...editingDayRecord, overtimeHours: Number(e.target.value) })}
                          className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono ${
                            isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Remarks / Location Note</label>
                      <input
                        type="text"
                        value={editingDayRecord.notes || ''}
                        onChange={(e) => setEditingDayRecord({ ...editingDayRecord, notes: e.target.value })}
                        placeholder="e.g. Madurai client site service / CCTV camera installation"
                        className={`w-full rounded-lg px-2.5 py-1.5 text-xs ${
                          isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingDayRecord(null)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-xs cursor-pointer"
                      >
                        Save Attendance Record
                      </button>
                    </div>
                  </form>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className={`px-6 py-3 border-t flex items-center justify-between shrink-0 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="text-[11px] text-slate-400">
                Staff: {selectedEmpForCalendar.name} · Wage: ₹{selectedEmpForCalendar.dailySalary}/day
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedEmpForCalendar(null);
                  setEditingDayRecord(null);
                }}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
              >
                Close Calendar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MULTI-PAID INSTALLMENT MODAL (Module 3 - Requirement 4) */}
      {payingInstallment && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Multi-Paid Salary Installment</h3>
                  <p className="text-xs text-slate-400">{payingInstallment.emp.name} · Month: {salaryMonth}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayingInstallment(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payout Summary Breakdown */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Gross Payable</span>
                <span className="text-sm font-bold font-mono">₹{payingInstallment.totalPayable.toLocaleString('en-IN')}</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Paid So Far</span>
                <span className="text-sm font-bold font-mono text-emerald-600">₹{payingInstallment.totalPaid.toLocaleString('en-IN')}</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-amber-950/30 border-amber-900/60' : 'bg-amber-50 border-amber-200'}`}>
                <span className="text-[10px] uppercase font-bold text-amber-600 block">Balance Due</span>
                <span className="text-sm font-bold font-mono text-amber-600">₹{payingInstallment.balanceDue.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleConfirmInstallmentPayment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Payment Amount to Pay Now (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    required
                    min="1"
                    max={payingInstallment.balanceDue > 0 ? payingInstallment.balanceDue * 2 : 100000}
                    value={installmentAmount}
                    onChange={(e) => setInstallmentAmount(Number(e.target.value))}
                    className={`w-full pl-8 pr-3 py-2 rounded-xl text-sm font-mono font-bold focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-700 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-slate-400">Quick fill:</span>
                  <button
                    type="button"
                    onClick={() => setInstallmentAmount(payingInstallment.balanceDue)}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 cursor-pointer"
                  >
                    Full Balance (₹{payingInstallment.balanceDue.toLocaleString('en-IN')})
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstallmentAmount(Math.round(payingInstallment.balanceDue / 2))}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 cursor-pointer"
                  >
                    Half (₹{Math.round(payingInstallment.balanceDue / 2).toLocaleString('en-IN')})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={installmentDate}
                    onChange={(e) => setInstallmentDate(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-bold ${
                      isDark ? 'bg-slate-950 border border-slate-700 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Payment Mode *</label>
                  <select
                    value={installmentMode}
                    onChange={(e) => setInstallmentMode(e.target.value as PaymentMode)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-semibold ${
                      isDark ? 'bg-slate-950 border border-slate-700 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer (IMPS/NEFT)</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  UPI Ref ID / Transaction Ref / Remarks
                </label>
                <input
                  type="text"
                  value={installmentRef}
                  onChange={(e) => setInstallmentRef(e.target.value)}
                  placeholder="e.g. UPI-98421-PART1 or UTR 429381"
                  className={`w-full rounded-xl px-3 py-2 text-xs font-mono ${
                    isDark ? 'bg-slate-950 border border-slate-700 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Payment Notes / Description</label>
                <input
                  type="text"
                  value={installmentNotes}
                  onChange={(e) => setInstallmentNotes(e.target.value)}
                  placeholder="e.g. Mid-month wage installment or festival advance"
                  className={`w-full rounded-xl px-3 py-2 text-xs ${
                    isDark ? 'bg-slate-950 border border-slate-700 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPayingInstallment(null)}
                  className="px-4 py-2 text-xs rounded-xl font-medium border border-slate-300 dark:border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  Record ₹{installmentAmount.toLocaleString('en-IN')} Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. DETAILED WAGE SLIP & PAYMENT LOGS MODAL (Module 3) */}
      {viewingWageSlip && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className={`border rounded-2xl w-full max-w-2xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="text-base font-bold">Official Staff Wage Slip & Payment Voucher</h3>
                  <p className="text-xs text-slate-400">Month: {salaryMonth} · Spider Grid Solutions</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingWageSlip(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              
              {/* Firm Letterhead */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-blue-600">SPIDER GRID SOLUTIONS</h2>
                  <p className="text-xs text-slate-500">CCTV Surveillance, Computer Hardware & Networking Systems</p>
                  <p className="text-xs text-slate-500">Madurai, Tamil Nadu · Ph: 9677776001</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded text-xs font-mono font-bold bg-purple-600/10 text-purple-600">
                    WAGE SLIP #{salaryMonth}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">Date: {new Date().toLocaleDateString('en-IN')}</p>
                </div>
              </div>

              {/* Employee Particulars */}
              <div className={`p-4 rounded-xl border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Employee Name</span>
                  <p className="font-bold text-sm">{viewingWageSlip.emp.name}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Designation</span>
                  <p className="font-medium text-slate-600 dark:text-slate-300">{viewingWageSlip.emp.role}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Contact Phone</span>
                  <p className="font-mono">{viewingWageSlip.emp.phone}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Daily Wage Rate</span>
                  <p className="font-mono font-bold text-purple-600">₹{viewingWageSlip.emp.dailySalary} / day</p>
                </div>
              </div>

              {/* Attendance & Earnings Breakdown Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Earnings & Working Days</h4>
                <div className={`rounded-xl border overflow-hidden text-xs ${
                  isDark ? 'border-slate-800' : 'border-slate-200'
                }`}>
                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-left min-w-[480px]">
                      <thead className={`border-b text-[11px] font-semibold uppercase ${
                        isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        <tr>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3 text-center">Days / Units</th>
                          <th className="py-2.5 px-3 text-right">Rate</th>
                          <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                        <tr>
                          <td className="py-2.5 px-3 font-semibold">Attendance Worked Days</td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            {viewingWageSlip.summary.effectiveDays} Days ({viewingWageSlip.summary.presentCount} Full, {viewingWageSlip.summary.halfDayCount} Half)
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">₹{viewingWageSlip.emp.dailySalary}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">₹{viewingWageSlip.gross.toLocaleString('en-IN')}</td>
                        </tr>
                        {viewingWageSlip.sal?.bonus && viewingWageSlip.sal.bonus > 0 ? (
                          <tr>
                            <td className="py-2 px-3 text-emerald-600">Performance Bonus / Incentive</td>
                            <td className="py-2 px-3 text-center font-mono">—</td>
                            <td className="py-2 px-3 text-right font-mono">—</td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-600">+₹{viewingWageSlip.sal.bonus.toLocaleString('en-IN')}</td>
                          </tr>
                        ) : null}
                        {viewingWageSlip.sal?.advanceDeduction && viewingWageSlip.sal.advanceDeduction > 0 ? (
                          <tr>
                            <td className="py-2 px-3 text-rose-500">Advance Salary Deduction</td>
                            <td className="py-2 px-3 text-center font-mono">—</td>
                            <td className="py-2 px-3 text-right font-mono">—</td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-rose-500">-₹{viewingWageSlip.sal.advanceDeduction.toLocaleString('en-IN')}</td>
                          </tr>
                        ) : null}
                        <tr className={isDark ? 'bg-slate-950/80 font-bold' : 'bg-slate-50 font-bold'}>
                          <td colSpan={3} className="py-2.5 px-3 text-right">Net Payable for Month:</td>
                          <td className="py-2.5 px-3 text-right font-mono text-purple-600 text-sm">
                            ₹{viewingWageSlip.totalPayable.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Installment Payment Logs Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Payment Installment Logs ({viewingWageSlip.sal?.payments?.length || (viewingWageSlip.totalPaid > 0 ? 1 : 0)} records)
                  </h4>
                  <span className={`text-xs font-bold font-mono ${viewingWageSlip.balanceDue > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    Balance Due: ₹{viewingWageSlip.balanceDue.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className={`rounded-xl border overflow-hidden text-xs ${
                  isDark ? 'border-slate-800' : 'border-slate-200'
                }`}>
                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-left min-w-[480px]">
                      <thead className={`border-b text-[10px] font-semibold uppercase ${
                        isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        <tr>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Mode</th>
                          <th className="py-2 px-3">Reference #</th>
                          <th className="py-2 px-3">Remarks</th>
                          <th className="py-2 px-3 text-right">Amount Paid</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                        {viewingWageSlip.sal?.payments && viewingWageSlip.sal.payments.length > 0 ? (
                          viewingWageSlip.sal.payments.map((p, pIdx) => (
                            <tr key={p.id || pIdx}>
                              <td className="py-2 px-3 font-mono">{p.paymentDate}</td>
                              <td className="py-2 px-3 uppercase text-[10px] font-bold text-slate-500">{p.paymentMode}</td>
                              <td className="py-2 px-3 font-mono text-slate-500">{p.referenceNumber || '—'}</td>
                              <td className="py-2 px-3 text-slate-400 truncate max-w-[140px]">{p.notes || 'Salary Installment'}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">₹{p.amount.toLocaleString('en-IN')}</td>
                            </tr>
                          ))
                        ) : viewingWageSlip.totalPaid > 0 ? (
                          <tr>
                            <td className="py-2 px-3 font-mono">{viewingWageSlip.sal?.paymentDate || 'Paid'}</td>
                            <td className="py-2 px-3 uppercase text-[10px] font-bold text-slate-500">{viewingWageSlip.sal?.paymentMode || 'UPI'}</td>
                            <td className="py-2 px-3 font-mono text-slate-500">{viewingWageSlip.sal?.referenceNumber || '—'}</td>
                            <td className="py-2 px-3 text-slate-400">Salary Payment</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">₹{viewingWageSlip.totalPaid.toLocaleString('en-IN')}</td>
                          </tr>
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-4 text-center text-slate-400 italic">
                              No payment installments recorded yet for this month.
                            </td>
                          </tr>
                        )}
                        <tr className={isDark ? 'bg-slate-950/80 font-bold' : 'bg-slate-50 font-bold'}>
                          <td colSpan={4} className="py-2.5 px-3 text-right">Total Paid So Far:</td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-600 text-sm">
                            ₹{viewingWageSlip.totalPaid.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Signatures & Stamp */}
              <div className="grid grid-cols-2 pt-8 text-center text-xs text-slate-400">
                <div className="border-t border-slate-300 dark:border-slate-700 pt-2 mx-8">
                  <p className="font-medium text-slate-600 dark:text-slate-300">Employee Signature</p>
                  <p className="text-[10px] text-slate-400">I acknowledge receipt of wages</p>
                </div>
                <div className="border-t border-slate-300 dark:border-slate-700 pt-2 mx-8">
                  <p className="font-medium text-slate-600 dark:text-slate-300">Authorized Signatory</p>
                  <p className="text-[10px] text-slate-400">Spider Grid Solutions</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
