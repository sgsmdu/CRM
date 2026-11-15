import React, { useState } from 'react';
import {
  Phone,
  CheckCircle2,
  Eye,
  Printer,
  Trash2,
  UserCheck,
  MapPin,
  Clock,
  AlertTriangle,
  Link2,
  FileText,
  CreditCard,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  IndianRupee,
  Zap,
  MessageSquare,
  ThumbsUp,
  Check,
  Package,
  Star,
  Flag,
  PauseCircle,
  Edit3,
  MoreHorizontal,
  Receipt,
  User,
} from 'lucide-react';
import {
  JobCard,
  JobStatus,
  DeviceCategory,
  Invoice,
  InvoicePaymentRecord,
  ManualQuotation,
} from '../types';
import { getJobCardFinancialSummary } from '../utils/moneyFlow';

export type QuickStageTarget =
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
  | 'other';

export const WhatsAppLogoIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
  >
    <path d="M12.031 2c-5.516 0-9.969 4.453-9.969 9.969 0 1.766.469 3.484 1.344 5l-1.406 5.156 5.281-1.375c1.469.797 3.109 1.219 4.75 1.219 5.516 0 9.969-4.453 9.969-9.969S17.547 2 12.031 2zm5.813 14.125c-.25.703-1.438 1.344-2 1.422-.516.078-1.172.109-1.906-.125-.453-.141-1.031-.344-1.766-.656-3.078-1.328-5.094-4.438-5.25-4.641-.156-.203-1.25-1.672-1.25-3.188s.797-2.266 1.078-2.578c.281-.313.609-.391.813-.391.203 0 .406 0 .578.016.188.016.438-.078.688.516.25.609.859 2.094.938 2.25.078.156.125.344.031.547-.094.203-.156.328-.313.5-.156.172-.328.391-.469.531-.156.156-.313.328-.141.641.172.313.781 1.297 1.672 2.094 1.156 1.031 2.125 1.344 2.438 1.5.313.156.5.125.688-.078.188-.203.781-.906.984-1.219.203-.313.422-.266.703-.156.281.109 1.797.844 2.109 1 .313.156.516.234.594.359.078.125.078.734-.172 1.438z" />
  </svg>
);

interface JobCardItemProps {
  job: JobCard;
  isDark: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  canDelete: boolean;
  CategoryIcon: React.ElementType;
  statusMap: Record<JobStatus, { label: string; bg: string; text: string }>;
  quotations: ManualQuotation[];
  invoices: Invoice[];
  invoicePayments: InvoicePaymentRecord[];
  onToggleExpand: () => void;
  onToggleSelect: () => void;
  onStatusChange: (newStatus: JobStatus) => void;
  onToggleCallCompleted: () => void;
  onShowJob: () => void;
  onPrintSlip: () => void;
  onOpenWhatsAppHub: () => void;
  onOpenPaymentReminder: () => void;
  onDeleteJob: () => void;
  onOpenPriorityModal: () => void;
  onOpenReassignModal: () => void;
  onOpenTimelineModal: (stage: QuickStageTarget) => void;
  onViewTimelineHistory: () => void;
  onOpenBilling: () => void;
  onOpenManualQuote?: () => void;
  onOpenLinkStockInvoice: () => void;
  onCollectPayment: () => void;
  onOpenPhoto: (photoUrl: string) => void;
}

export const JobCardItem: React.FC<JobCardItemProps> = ({
  job,
  isDark,
  isExpanded,
  isSelected,
  canDelete,
  CategoryIcon,
  statusMap,
  quotations,
  invoices,
  invoicePayments,
  onToggleExpand,
  onToggleSelect,
  onStatusChange,
  onToggleCallCompleted,
  onShowJob,
  onPrintSlip,
  onOpenWhatsAppHub,
  onOpenPaymentReminder,
  onDeleteJob,
  onOpenPriorityModal,
  onOpenReassignModal,
  onOpenTimelineModal,
  onViewTimelineHistory,
  onOpenBilling,
  onOpenManualQuote,
  onOpenLinkStockInvoice,
  onCollectPayment,
  onOpenPhoto,
}) => {
  const [showMobileMoreActions, setShowMobileMoreActions] = useState(false);

  const statusConfig = statusMap[job.status] || statusMap.received;

  const lastNote =
    job.technicianNotes ||
    (job.timeline && job.timeline.length > 0
      ? job.timeline[job.timeline.length - 1]?.notes
      : '') ||
    job.workOrderNotes ||
    job.issueDescription ||
    'No recent notes';

  // Real Firestore financial calculations
  const jobFin = getJobCardFinancialSummary(job, quotations, invoices, invoicePayments);
  const quotedModelsCount = jobFin.quotationModelSummaries.reduce(
    (sum, qs) => sum + qs.models.length,
    0
  );
  const latestQuote = jobFin.quotationModelSummaries[0];
  const selectedModelEntry = latestQuote?.models.find(
    m => m.key === latestQuote.selectedModel
  );
  const latestTimelineQuote =
    job.timeline
      ?.slice()
      .reverse()
      .find(ev => typeof ev.quoteAmount === 'number' && ev.quoteAmount > 0)?.quoteAmount ?? 0;
  const quotedAmount = selectedModelEntry
    ? selectedModelEntry.total
    : latestQuote?.models[0]?.total ?? latestTimelineQuote;

  const billedAmount = jobFin.totalBilled;
  const pendingPayment = jobFin.totalPending;
  const linkedStockCount = (job.linkedVendorBillIds || []).length;

  const showPayReminder =
    pendingPayment > 0 ||
    (job.finalCost > 0 ? job.finalCost : job.estimatedCost || 0) > (job.advancePaid || 0);

  const priorityBadgeClass =
    job.priority === 'P1'
      ? 'bg-rose-600 text-white'
      : job.priority === 'P2'
        ? 'bg-amber-500 text-white'
        : job.priority === 'P3'
          ? 'bg-blue-600 text-white'
          : 'bg-slate-600 text-white';

  const priorityLabel = `${job.priority || (job.workOrderPriority ? `P${job.workOrderPriority}` : 'P2')}${
    job.priorityOrder ? ` #${job.priorityOrder}` : ''
  }`;

  const renderStatusSelect = (className: string) => (
    <select
      value={job.status}
      onClick={e => e.stopPropagation()}
      onChange={e => onStatusChange(e.target.value as JobStatus)}
      aria-label={`Job status for ${job.jobId}`}
      className={`${className} rounded-lg border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${statusConfig.bg} ${statusConfig.text}`}
    >
      <option value="received">Received (Inspection)</option>
      <option value="in_process">In Process</option>
      <option value="quotation_pending">Quotation Pending</option>
      <option value="waiting_parts">Waiting for Parts</option>
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
  );

  // Consistent Quick Stage Action styling helpers
  const stageBtnBase =
    'h-9 px-2.5 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap truncate';
  const mobileStageBtnBase =
    'h-10 px-2.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap truncate';

  return (
    <div
      className={`rounded-xl border transition-all overflow-hidden ${
        isSelected
          ? isDark
            ? 'bg-blue-950/30 border-blue-600 ring-1 ring-blue-600'
            : 'bg-blue-50/40 border-blue-500 ring-1 ring-blue-400'
          : isDark
            ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
            : 'bg-white border-slate-200/90 hover:border-blue-300 shadow-xs'
      }`}
    >
      {/* =====================================================================
          DESKTOP VIEW (md and above) — Horizontal 3-Section Professional Card
          ===================================================================== */}
      <div className="hidden md:block">
        {/* Desktop Header Row */}
        <div
          onClick={onToggleExpand}
          className={`px-4 py-3 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
            isExpanded
              ? isDark
                ? 'bg-slate-800/50 border-b border-slate-800'
                : 'bg-slate-50/90 border-b border-slate-200'
              : isDark
                ? 'hover:bg-slate-800/40'
                : 'hover:bg-slate-50/70'
          }`}
          title="Click to expand or collapse job card"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Checkbox */}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onToggleSelect();
              }}
              className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer shrink-0 p-0.5"
              title={isSelected ? 'Deselect job' : 'Select job'}
            >
              {isSelected ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {/* Category Icon */}
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                job.type === 'service'
                  ? isDark
                    ? 'bg-blue-950/60 border-blue-800 text-blue-400'
                    : 'bg-blue-50 border-blue-200 text-blue-600'
                  : isDark
                    ? 'bg-indigo-950/60 border-indigo-800 text-indigo-400'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-600'
              }`}
            >
              <CategoryIcon className="w-4 h-4" />
            </div>

            {/* 5-Column Summary Strip */}
            <div className="grid grid-cols-5 gap-3 flex-1 min-w-0 items-center text-xs">
              {/* 1. Job ID & Service Type */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400 truncate tabular-nums">
                    {job.jobId}
                  </span>
                  <span
                    className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold shrink-0 ${
                      job.type === 'service'
                        ? isDark
                          ? 'bg-blue-950 text-blue-300'
                          : 'bg-blue-50 text-blue-700'
                        : isDark
                          ? 'bg-indigo-950 text-indigo-300'
                          : 'bg-indigo-50 text-indigo-700'
                    }`}
                  >
                    {job.type}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono tabular-nums block">
                  {job.intakeDate}
                </span>
              </div>

              {/* 2. Customer Name, Phone, Area */}
              <div className="min-w-0">
                <div
                  className={`font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}
                  title={job.customerName}
                >
                  {job.customerName}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono tabular-nums">
                  {job.customerPhone || 'No phone'}
                  {job.customerArea ? ` · ${job.customerArea}` : ''}
                </div>
              </div>

              {/* 3. Product / Brand */}
              <div className="min-w-0">
                <div
                  className={`font-semibold truncate ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
                  title={job.deviceBrand}
                >
                  {job.deviceBrand}
                </div>
                <div className="text-[11px] text-slate-400 capitalize truncate">
                  {job.category}
                  {job.serialNumber ? ` · S/N: ${job.serialNumber}` : ''}
                </div>
              </div>

              {/* 4. Assigned Staff & Priority */}
              <div className="min-w-0">
                <div className="flex items-center gap-1 min-w-0">
                  <UserCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span
                    className={`truncate font-medium ${
                      job.assignedTechnician
                        ? isDark
                          ? 'text-purple-300'
                          : 'text-purple-800'
                        : 'text-slate-400 italic'
                    }`}
                  >
                    {job.assignedTechnician || 'Unassigned'}
                  </span>
                </div>
                <span
                  className={`inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${priorityBadgeClass}`}
                >
                  {priorityLabel}
                </span>
              </div>

              {/* 5. Last Note */}
              <div className="min-w-0">
                <p
                  className={`text-[11px] truncate italic ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}
                  title={lastNote}
                >
                  "{lastNote}"
                </p>
              </div>
            </div>
          </div>

          {/* Right Header Controls: Status Dropdown + Expand Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {renderStatusSelect('text-xs font-semibold px-3 py-1.5 w-44')}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onToggleExpand();
              }}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title={isExpanded ? 'Collapse job card' : 'Expand job card'}
              aria-label={isExpanded ? 'Collapse job card' : 'Expand job card'}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-blue-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>
          </div>
        </div>

        {/* Desktop Expanded 3-Section Horizontal Body */}
        {isExpanded && (
          <div
            className={`p-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start ${
              isDark ? 'bg-slate-950/30' : 'bg-slate-50/40'
            }`}
          >
            {/* LEFT SECTION (4 cols) — Job & Customer Details */}
            <div className="lg:col-span-4 space-y-3 min-w-0 lg:pr-4 lg:border-r border-slate-200 dark:border-slate-800">
              {/* Identity + Priority + Assigned Employee */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={onShowJob}
                    className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer tabular-nums"
                  >
                    {job.jobId}
                  </button>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                      job.type === 'service'
                        ? isDark
                          ? 'bg-blue-950/60 border-blue-800 text-blue-300'
                          : 'bg-blue-50 border-blue-200 text-blue-700'
                        : isDark
                          ? 'bg-indigo-950/60 border-indigo-800 text-indigo-300'
                          : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    }`}
                  >
                    {job.type}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={onOpenPriorityModal}
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded cursor-pointer hover:opacity-90 transition-opacity ${priorityBadgeClass}`}
                    title="Click to change priority & order"
                  >
                    {priorityLabel}
                  </button>
                  <button
                    type="button"
                    onClick={onOpenReassignModal}
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 cursor-pointer transition-colors ${
                      job.assignedEmployeeId
                        ? isDark
                          ? 'bg-purple-950/50 border-purple-800 text-purple-300 hover:bg-purple-900/60'
                          : 'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100'
                        : isDark
                          ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                    title="Click to assign or reassign employee"
                  >
                    <UserCheck className="w-3 h-3" />
                    <span className="truncate max-w-[110px]">
                      {job.assignedTechnician || 'Assign Staff'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Customer Details + Location */}
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {job.customerName}
                  </span>
                  {job.customerPhone && (
                    <span className="font-mono text-slate-600 dark:text-slate-300 tabular-nums">
                      · {job.customerPhone}
                    </span>
                  )}
                  {job.customerArea && (
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-0.5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {job.customerArea}
                    </span>
                  )}
                </div>

                <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  {job.deviceBrand}{' '}
                  <span className="text-slate-400 font-normal capitalize">
                    ({job.category}
                    {job.serialNumber ? ` · S/N: ${job.serialNumber}` : ''})
                  </span>
                </div>
              </div>

              {/* Customer Issue / Work Note */}
              <div
                className={`p-2.5 rounded-lg border text-xs leading-relaxed ${
                  isDark
                    ? 'bg-slate-900/80 border-slate-800 text-slate-300'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <p className="italic">"{job.issueDescription}"</p>
                {job.technicianNotes && job.technicianNotes !== job.issueDescription && (
                  <p className="mt-1 pt-1 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                    <strong className="not-italic text-slate-600 dark:text-slate-300">Work Note:</strong>{' '}
                    {job.technicianNotes}
                  </p>
                )}
              </div>

              {job.status === 'hold' && (
                <div
                  className={`p-2 rounded-lg text-xs flex items-center gap-2 border ${
                    isDark
                      ? 'bg-rose-950/30 border-rose-900 text-rose-300'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="truncate">
                    <strong>On Hold:</strong>{' '}
                    {job.holdReason || job.technicianNotes || 'Awaiting response / spares'}
                  </span>
                </div>
              )}

              {/* Intake Date, Estimated Cost & Photos */}
              <div className="flex items-center justify-between gap-2 text-xs pt-0.5 flex-wrap">
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                  <span className="font-mono tabular-nums">
                    Intake: <strong className={isDark ? 'text-slate-200' : 'text-slate-700'}>{job.intakeDate}</strong>
                  </span>
                  <span className="font-mono tabular-nums">
                    Est:{' '}
                    <strong className={isDark ? 'text-white' : 'text-slate-900'}>
                      ₹{(job.estimatedCost || 0).toLocaleString('en-IN')}
                    </strong>
                  </span>
                </div>

                {job.devicePhotos && job.devicePhotos.length > 0 && (
                  <div className="flex items-center gap-1">
                    {job.devicePhotos.slice(0, 4).map((photo, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => onOpenPhoto(photo)}
                        className="w-6 h-6 rounded border border-slate-300 dark:border-slate-700 overflow-hidden hover:opacity-80 cursor-pointer"
                        title="View device photo"
                      >
                        <img
                          src={photo}
                          alt="Device thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Timeline Log trigger */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onViewTimelineHistory}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 font-semibold cursor-pointer"
                  title="View full timeline history"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span className="tabular-nums">
                    Timeline Log ({job.timeline?.length || 0})
                  </span>
                </button>
              </div>
            </div>

            {/* CENTRE SECTION (4 cols) — Quick Stage Actions in Clean Equally-Sized Rows */}
            <div className="lg:col-span-4 space-y-2.5 min-w-0 lg:pr-4 lg:border-r border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Quick Stage Actions
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* 1. In Process */}
                <button
                  type="button"
                  onClick={() => onOpenTimelineModal('in_process')}
                  className={`${stageBtnBase} ${
                    job.status === 'in_process'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : isDark
                        ? 'bg-amber-950/40 border-amber-900 text-amber-300 hover:bg-amber-900/60'
                        : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 shrink-0" />
                  <span>In Process</span>
                </button>

                {/* 2. Quote */}
                <button
                  type="button"
                  onClick={() => onOpenTimelineModal('quote_given')}
                  className={`${stageBtnBase} ${
                    job.status === 'quotation_pending'
                      ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                      : isDark
                        ? 'bg-orange-950/40 border-orange-900 text-orange-300 hover:bg-orange-900/60'
                        : 'bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100'
                  }`}
                >
                  <IndianRupee className="w-3.5 h-3.5 shrink-0" />
                  <span>Quote</span>
                </button>

                {/* 3. Approval */}
                <button
                  type="button"
                  onClick={() => onOpenTimelineModal('customer_approval')}
                  className={`${stageBtnBase} ${
                    job.status === 'customer_approval'
                      ? 'bg-teal-600 text-white border-teal-700 shadow-xs'
                      : isDark
                        ? 'bg-teal-950/40 border-teal-900 text-teal-300 hover:bg-teal-900/60'
                        : 'bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5 shrink-0" />
                  <span>Approval</span>
                </button>

                {/* 4. Discussion */}
                <button
                  type="button"
                  onClick={() => onOpenTimelineModal('customer_discussion')}
                  className={`${stageBtnBase} ${
                    job.status === 'customer_discussion'
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                      : isDark
                        ? 'bg-indigo-950/40 border-indigo-900 text-indigo-300 hover:bg-indigo-900/60'
                        : 'bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span>Discussion</span>
                </button>

                {/* 5. Work Done */}
                <button
                  type="button"
                  onClick={() => onOpenTimelineModal('work_completed')}
                  className={`${stageBtnBase} ${
                    job.status === 'work_completed'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : isDark
                        ? 'bg-emerald-950/40 border-emerald-900 text-emerald-300 hover:bg-emerald-900/60'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Work Done</span>
                </button>

                {/* 6. Bill Now */}
                <button
                  type="button"
                  onClick={onOpenBilling}
                  className={`${stageBtnBase} ${
                    job.status === 'billed'
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                      : isDark
                        ? 'bg-cyan-950/50 border-cyan-800 text-cyan-300 hover:bg-cyan-700 hover:text-white'
                        : 'bg-cyan-50 border-cyan-300 text-cyan-800 hover:bg-cyan-600 hover:text-white'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5 shrink-0" />
                  <span>Bill Now</span>
                </button>

                {/* 7. Manual Quote */}
                {onOpenManualQuote && (
                  <button
                    type="button"
                    onClick={onOpenManualQuote}
                    className={`${stageBtnBase} ${
                      isDark
                        ? 'bg-orange-950/40 border-orange-800 text-orange-300 hover:bg-orange-700 hover:text-white'
                        : 'bg-orange-50 border-orange-300 text-orange-800 hover:bg-orange-600 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span>Manual Quote</span>
                  </button>
                )}

                {/* 8. Link to Stock Invoice */}
                <button
                  type="button"
                  onClick={onOpenLinkStockInvoice}
                  className={`${stageBtnBase} ${!onOpenManualQuote ? 'col-span-2' : ''} ${
                    linkedStockCount > 0
                      ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                      : isDark
                        ? 'bg-purple-950/40 border-purple-800 text-purple-300 hover:bg-purple-700 hover:text-white'
                        : 'bg-purple-50 border-purple-300 text-purple-800 hover:bg-purple-600 hover:text-white'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Link to Stock Invoice</span>
                  {linkedStockCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-black/20 rounded text-[10px] tabular-nums shrink-0">
                      {linkedStockCount}
                    </span>
                  )}
                </button>

                {/* 9. Pickup Note */}
                <button
                  type="button"
                  onClick={() => onOpenTimelineModal('pickup_note')}
                  className={`${stageBtnBase} ${
                    job.status === 'pickup_ready' || job.status === 'completed'
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                      : isDark
                        ? 'bg-blue-950/40 border-blue-900 text-blue-300 hover:bg-blue-900/60'
                        : 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100'
                  }`}
                >
                  <Package className="w-3.5 h-3.5 shrink-0" />
                  <span>Pickup Note</span>
                </button>

                {/* 10. Call Review */}
                <button
                  type="button"
                  onClick={() => onOpenTimelineModal('call_review')}
                  className={`${stageBtnBase} ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Star className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                  <span>Call Review</span>
                </button>

                {/* 11. Call Close */}
                <button
                  type="button"
                  onClick={() => onOpenTimelineModal('call_close')}
                  className={`${stageBtnBase} ${
                    job.status === 'delivered'
                      ? 'bg-slate-700 text-white border-slate-800 shadow-xs'
                      : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5 shrink-0" />
                  <span>Call Close</span>
                </button>

                {/* 12. Hold */}
                <button
                  type="button"
                  onClick={() => onOpenTimelineModal('hold')}
                  className={`${stageBtnBase} ${
                    job.status === 'hold'
                      ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                      : isDark
                        ? 'bg-rose-950/40 border-rose-900 text-rose-300 hover:bg-rose-900/60'
                        : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  <PauseCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Hold</span>
                </button>

                {/* 13. Others */}
                <button
                  type="button"
                  onClick={() => onOpenTimelineModal('other')}
                  className={`${stageBtnBase} col-span-2 ${
                    job.status === 'other'
                      ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                      : isDark
                        ? 'bg-purple-950/40 border-purple-900 text-purple-300 hover:bg-purple-900/60'
                        : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5 shrink-0" />
                  <span>Others</span>
                </button>
              </div>
            </div>

            {/* RIGHT SECTION (4 cols) — Header Actions + Billing & Payment Dashboard */}
            <div className="lg:col-span-4 space-y-3 min-w-0">
              {/* Header Action Controls */}
              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                {job.customerPhone && (
                  <a
                    href={`tel:${job.customerPhone}`}
                    className={`h-8 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                      isDark
                        ? 'text-blue-400 bg-blue-950/60 border-blue-900 hover:bg-blue-900'
                        : 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100'
                    }`}
                    title={`Call ${job.customerName}: ${job.customerPhone}`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={onToggleCallCompleted}
                  className={`h-8 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                    job.callCompleted
                      ? isDark
                        ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : isDark
                        ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                  title={
                    job.callCompleted
                      ? `Call recorded on ${job.lastCalledAt || 'record'}`
                      : 'Click to mark phone call completed'
                  }
                >
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      job.callCompleted ? 'text-emerald-500' : 'text-slate-400'
                    }`}
                  />
                  <span>{job.callCompleted ? 'Call Done' : 'Mark Called'}</span>
                </button>

                <button
                  type="button"
                  onClick={onPrintSlip}
                  className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                    isDark
                      ? 'text-slate-300 bg-slate-800 border-slate-700 hover:bg-slate-700'
                      : 'text-slate-700 bg-white border-slate-300 hover:bg-slate-100'
                  }`}
                  title="Print Workshop Service Slip / Job Card"
                  aria-label="Print Job Card"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={onShowJob}
                  className="h-8 px-3 text-xs font-bold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-xs"
                  title="Open full job details & timeline"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Show Job</span>
                </button>

                {/* Desktop WhatsApp Hub button WITH text */}
                <button
                  type="button"
                  onClick={onOpenWhatsAppHub}
                  className="h-8 px-3 text-xs font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shadow-xs"
                  title="Open WhatsApp Hub"
                >
                  <WhatsAppLogoIcon className="w-3.5 h-3.5" />
                  <span>WhatsApp Hub</span>
                </button>

                {showPayReminder && (
                  <button
                    type="button"
                    onClick={onOpenPaymentReminder}
                    className={`h-8 px-2.5 text-xs font-semibold rounded-lg border flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                      isDark
                        ? 'text-rose-300 bg-rose-950/60 border-rose-800 hover:bg-rose-700 hover:text-white'
                        : 'text-rose-700 bg-rose-50 border-rose-300 hover:bg-rose-600 hover:text-white'
                    }`}
                    title="Send Payment Pending Reminder via WhatsApp"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Pay Reminder</span>
                  </button>
                )}

                {canDelete && (
                  <button
                    type="button"
                    onClick={onDeleteJob}
                    className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer ${
                      isDark
                        ? 'text-slate-400 border-slate-800 hover:text-rose-400 hover:bg-slate-800'
                        : 'text-slate-400 border-slate-200 hover:text-rose-600 hover:bg-rose-50'
                    }`}
                    title="Delete Job Card (Admin Only)"
                    aria-label="Delete Job Card"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Billing & Payment Dashboard */}
              <div
                className={`p-3.5 rounded-xl border space-y-2.5 ${
                  isDark
                    ? 'bg-slate-900/90 border-slate-800'
                    : 'bg-white border-slate-200 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    Quoted Amount
                  </span>
                  <div className="text-right font-mono tabular-nums">
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      ₹{quotedAmount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold ml-1.5">
                      ({quotedModelsCount} {quotedModelsCount === 1 ? 'Model' : 'Models'})
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    Billed Amount
                  </span>
                  <div className="text-right font-mono tabular-nums">
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      ₹{billedAmount.toLocaleString('en-IN')}
                    </span>
                    {jobFin.totalPaid > 0 && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 ml-1.5">
                        (Paid ₹{jobFin.totalPaid.toLocaleString('en-IN')})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    Linked Stock Invoices
                  </span>
                  <button
                    type="button"
                    onClick={onOpenLinkStockInvoice}
                    className="font-mono font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer tabular-nums"
                  >
                    {linkedStockCount} {linkedStockCount === 1 ? 'Invoice' : 'Invoices'}
                  </button>
                </div>

                <div
                  className={`pt-2 border-t flex items-center justify-between ${
                    isDark ? 'border-slate-800' : 'border-slate-200'
                  }`}
                >
                  <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                    Pending Payment
                  </span>
                  <span className="text-base font-bold font-mono tabular-nums text-orange-600 dark:text-orange-400">
                    ₹{pendingPayment.toLocaleString('en-IN')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onCollectPayment}
                  className="w-full h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <IndianRupee className="w-4 h-4" />
                  <span>Collect Payment</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          MOBILE VIEW (< md) — Dedicated Touch-First Compact Layout
          ===================================================================== */}
      <div className="md:hidden">
        {/* Collapsed / Top Mobile Header (Always visible) */}
        <div
          onClick={onToggleExpand}
          className={`p-3 space-y-2 cursor-pointer select-none ${
            isExpanded
              ? isDark
                ? 'bg-slate-800/50 border-b border-slate-800'
                : 'bg-slate-50 border-b border-slate-200'
              : ''
          }`}
        >
          {/* 1. Top Line: Checkbox + Icon + Job ID + Priority + Expand */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onToggleSelect();
                }}
                className="p-1 -ml-1 text-slate-400 hover:text-blue-600 shrink-0"
                aria-label={isSelected ? 'Deselect job' : 'Select job'}
              >
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
              </button>

              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                  job.type === 'service'
                    ? isDark
                      ? 'bg-blue-950/60 border-blue-800 text-blue-400'
                      : 'bg-blue-50 border-blue-200 text-blue-600'
                    : isDark
                      ? 'bg-indigo-950/60 border-indigo-800 text-indigo-400'
                      : 'bg-indigo-50 border-indigo-200 text-indigo-600'
                }`}
              >
                <CategoryIcon className="w-4 h-4" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 tabular-nums truncate">
                    {job.jobId}
                  </span>
                  <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                    {job.type}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${priorityBadgeClass}`}
              >
                {priorityLabel}
              </span>
              <span
                className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-300'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-blue-600" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </span>
            </div>
          </div>

          {/* 2. Customer + Product / Staff Compact Line */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="min-w-0">
              <div className={`font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {job.customerName}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate tabular-nums">
                {job.customerPhone || 'No phone'}
                {job.customerArea ? ` · ${job.customerArea}` : ''}
              </div>
            </div>

            <div className="min-w-0 text-right">
              <div className={`font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {job.deviceBrand}
              </div>
              <div className="text-[11px] text-purple-700 dark:text-purple-300 truncate">
                {job.assignedTechnician || 'Unassigned'}
              </div>
            </div>
          </div>

          {/* Collapsed Status + Note Preview */}
          {!isExpanded && (
            <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px]">
              <p className="text-slate-500 dark:text-slate-400 truncate italic flex-1">
                "{lastNote}"
              </p>
              <span className={`px-2 py-0.5 rounded border text-[10px] shrink-0 ${statusConfig.bg} ${statusConfig.text}`}>
                {statusConfig.label}
              </span>
            </div>
          )}
        </div>

        {/* Expanded Mobile Body */}
        {isExpanded && (
          <div className={`p-3 space-y-3 ${isDark ? 'bg-slate-950/30' : 'bg-slate-50/50'}`}>
            {/* 3. Status Selector — Full Width */}
            <div>
              {renderStatusSelect('w-full min-h-[44px] px-3 text-xs font-semibold')}
            </div>

            {/* 4. Call, Print, WhatsApp (44x44 icon only) & Mark Called + Show Job aligned in one row */}
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Official White WhatsApp Icon on Green 44x44 Button — NO text */}
                <button
                  type="button"
                  onClick={onOpenWhatsAppHub}
                  aria-label="WhatsApp"
                  title="WhatsApp Hub"
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white flex items-center justify-center shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <WhatsAppLogoIcon className="w-5 h-5" />
                </button>

                {job.customerPhone && (
                  <a
                    href={`tel:${job.customerPhone}`}
                    aria-label={`Call ${job.customerName}`}
                    title={`Call ${job.customerPhone}`}
                    className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border flex items-center justify-center transition-colors shrink-0 ${
                      isDark
                        ? 'text-blue-400 bg-blue-950/60 border-blue-900'
                        : 'text-blue-700 bg-blue-50 border-blue-200'
                    }`}
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={onPrintSlip}
                  aria-label="Print Job Card"
                  title="Print Job Card"
                  className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                    isDark
                      ? 'text-slate-300 bg-slate-800 border-slate-700'
                      : 'text-slate-700 bg-white border-slate-300'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-1.5 flex-1 justify-end min-w-0">
                <button
                  type="button"
                  onClick={onToggleCallCompleted}
                  className={`h-11 px-2.5 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer truncate ${
                    job.callCompleted
                      ? isDark
                        ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : isDark
                        ? 'bg-slate-900 border-slate-700 text-slate-300'
                        : 'bg-white border-slate-300 text-slate-700'
                  }`}
                >
                  <CheckCircle2
                    className={`w-3.5 h-3.5 shrink-0 ${
                      job.callCompleted ? 'text-emerald-500' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{job.callCompleted ? 'Called' : 'Mark Call'}</span>
                </button>

                <button
                  type="button"
                  onClick={onShowJob}
                  className="h-11 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Show Job</span>
                </button>
              </div>
            </div>

            {/* 5. Job Information in a Compact Layout */}
            <div
              className={`p-3 rounded-xl border space-y-2 text-xs ${
                isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                <div>
                  <span className="text-[10px] text-slate-400 block">Intake Date</span>
                  <span className="font-mono font-semibold tabular-nums">{job.intakeDate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Estimated Amount</span>
                  <span className="font-mono font-bold tabular-nums">
                    ₹{(job.estimatedCost || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Assigned Staff</span>
                  <button
                    type="button"
                    onClick={onOpenReassignModal}
                    className="font-semibold text-purple-600 dark:text-purple-400 hover:underline text-left truncate max-w-full cursor-pointer"
                  >
                    {job.assignedTechnician || 'Assign Staff'}
                  </button>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Priority</span>
                  <button
                    type="button"
                    onClick={onOpenPriorityModal}
                    className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {priorityLabel} (Edit)
                  </button>
                </div>
              </div>

              <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800">
                <p className={`italic leading-snug ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  "{job.issueDescription}"
                </p>
                {job.technicianNotes && job.technicianNotes !== job.issueDescription && (
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Note: {job.technicianNotes}
                  </p>
                )}
              </div>

              {job.status === 'hold' && (
                <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-[11px] text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{job.holdReason || 'Job On Hold'}</span>
                </div>
              )}

              {job.devicePhotos && job.devicePhotos.length > 0 && (
                <div className="flex items-center gap-1.5 pt-1">
                  {job.devicePhotos.slice(0, 4).map((photo, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => onOpenPhoto(photo)}
                      className="w-9 h-9 rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden"
                    >
                      <img src={photo} alt="Device thumbnail" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 6. Quick Actions in a 2-Column Grid */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onOpenTimelineModal('in_process')}
                  className={`${mobileStageBtnBase} ${
                    job.status === 'in_process'
                      ? 'bg-amber-500 text-white border-amber-600'
                      : isDark
                        ? 'bg-amber-950/40 border-amber-900 text-amber-300'
                        : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 shrink-0" />
                  <span>In Process</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenTimelineModal('quote_given')}
                  className={`${mobileStageBtnBase} ${
                    job.status === 'quotation_pending'
                      ? 'bg-orange-500 text-white border-orange-600'
                      : isDark
                        ? 'bg-orange-950/40 border-orange-900 text-orange-300'
                        : 'bg-orange-50 border-orange-200 text-orange-800'
                  }`}
                >
                  <IndianRupee className="w-3.5 h-3.5 shrink-0" />
                  <span>Quote</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenTimelineModal('customer_approval')}
                  className={`${mobileStageBtnBase} ${
                    job.status === 'customer_approval'
                      ? 'bg-teal-600 text-white border-teal-700'
                      : isDark
                        ? 'bg-teal-950/40 border-teal-900 text-teal-300'
                        : 'bg-teal-50 border-teal-200 text-teal-800'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5 shrink-0" />
                  <span>Approval</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenTimelineModal('customer_discussion')}
                  className={`${mobileStageBtnBase} ${
                    job.status === 'customer_discussion'
                      ? 'bg-indigo-600 text-white border-indigo-700'
                      : isDark
                        ? 'bg-indigo-950/40 border-indigo-900 text-indigo-300'
                        : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span>Discussion</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenTimelineModal('work_completed')}
                  className={`${mobileStageBtnBase} ${
                    job.status === 'work_completed'
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : isDark
                        ? 'bg-emerald-950/40 border-emerald-900 text-emerald-300'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Work Done</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenBilling}
                  className={`${mobileStageBtnBase} ${
                    job.status === 'billed'
                      ? 'bg-blue-600 text-white border-blue-700'
                      : isDark
                        ? 'bg-cyan-950/50 border-cyan-800 text-cyan-300'
                        : 'bg-cyan-50 border-cyan-300 text-cyan-800'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5 shrink-0" />
                  <span>Bill Now</span>
                </button>

                {onOpenManualQuote && (
                  <button
                    type="button"
                    onClick={onOpenManualQuote}
                    className={`${mobileStageBtnBase} ${
                      isDark
                        ? 'bg-orange-950/40 border-orange-800 text-orange-300'
                        : 'bg-orange-50 border-orange-300 text-orange-800'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span>Manual Quote</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onOpenLinkStockInvoice}
                  className={`${mobileStageBtnBase} ${!onOpenManualQuote ? 'col-span-2' : ''} ${
                    linkedStockCount > 0
                      ? 'bg-purple-600 text-white border-purple-700'
                      : isDark
                        ? 'bg-purple-950/40 border-purple-800 text-purple-300'
                        : 'bg-purple-50 border-purple-300 text-purple-800'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Stock Invoice</span>
                  {linkedStockCount > 0 && (
                    <span className="px-1.5 bg-black/20 rounded text-[10px] tabular-nums">
                      {linkedStockCount}
                    </span>
                  )}
                </button>
              </div>

              {/* 7. Less-used Actions inside "More Actions" */}
              <button
                type="button"
                onClick={() => setShowMobileMoreActions(prev => !prev)}
                className={`w-full h-9 px-3 rounded-lg border text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-300'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <MoreHorizontal className="w-4 h-4 text-slate-400" />
                  <span>More Actions</span>
                </span>
                {showMobileMoreActions ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showMobileMoreActions && (
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => onOpenTimelineModal('pickup_note')}
                    className={`${mobileStageBtnBase} ${
                      job.status === 'pickup_ready' || job.status === 'completed'
                        ? 'bg-blue-600 text-white border-blue-700'
                        : isDark
                          ? 'bg-blue-950/40 border-blue-900 text-blue-300'
                          : 'bg-blue-50 border-blue-200 text-blue-800'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5 shrink-0" />
                    <span>Pickup Note</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenTimelineModal('call_review')}
                    className={`${mobileStageBtnBase} ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-200'
                        : 'bg-white border-slate-300 text-slate-700'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                    <span>Call Review</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenTimelineModal('call_close')}
                    className={`${mobileStageBtnBase} ${
                      job.status === 'delivered'
                        ? 'bg-slate-700 text-white border-slate-800'
                        : isDark
                          ? 'bg-slate-900 border-slate-800 text-slate-300'
                          : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5 shrink-0" />
                    <span>Call Close</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenTimelineModal('hold')}
                    className={`${mobileStageBtnBase} ${
                      job.status === 'hold'
                        ? 'bg-rose-600 text-white border-rose-700'
                        : isDark
                          ? 'bg-rose-950/40 border-rose-900 text-rose-300'
                          : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}
                  >
                    <PauseCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Hold</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenTimelineModal('other')}
                    className={`${mobileStageBtnBase} ${
                      job.status === 'other'
                        ? 'bg-purple-600 text-white border-purple-700'
                        : isDark
                          ? 'bg-purple-950/40 border-purple-900 text-purple-300'
                          : 'bg-purple-50 border-purple-200 text-purple-700'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5 shrink-0" />
                    <span>Others</span>
                  </button>

                  {showPayReminder && (
                    <button
                      type="button"
                      onClick={onOpenPaymentReminder}
                      className={`${mobileStageBtnBase} ${
                        isDark
                          ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                          : 'bg-rose-50 border-rose-300 text-rose-700'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5 shrink-0" />
                      <span>Pay Reminder</span>
                    </button>
                  )}

                  {canDelete && (
                    <button
                      type="button"
                      onClick={onDeleteJob}
                      className={`${mobileStageBtnBase} col-span-2 ${
                        isDark
                          ? 'bg-slate-900 border-slate-800 text-rose-400'
                          : 'bg-rose-50 border-rose-200 text-rose-700'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Delete Job Card</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 8. Billing Details Card + 9. Full-Width Collect Payment */}
            <div
              className={`p-3 rounded-xl border space-y-2.5 ${
                isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Quoted Amount</span>
                  <span className="font-mono font-bold tabular-nums">
                    ₹{quotedAmount.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-orange-600 dark:text-orange-400 ml-1">
                    ({quotedModelsCount}M)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Billed Amount</span>
                  <span className="font-mono font-bold tabular-nums">
                    ₹{billedAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Linked Stock</span>
                  <button
                    type="button"
                    onClick={onOpenLinkStockInvoice}
                    className="font-mono font-bold text-purple-600 dark:text-purple-400 hover:underline tabular-nums"
                  >
                    {linkedStockCount} {linkedStockCount === 1 ? 'Invoice' : 'Invoices'}
                  </button>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 block">
                    Pending Payment
                  </span>
                  <span className="font-mono font-bold text-sm text-orange-600 dark:text-orange-400 tabular-nums">
                    ₹{pendingPayment.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onCollectPayment}
                className="w-full min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <IndianRupee className="w-4 h-4" />
                <span>Collect Payment</span>
              </button>
            </div>

            {/* 10. Timeline at the Bottom */}
            <button
              type="button"
              onClick={onViewTimelineHistory}
              className={`w-full h-10 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-blue-400 hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-blue-600 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="tabular-nums">
                Timeline Log ({job.timeline?.length || 0})
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
