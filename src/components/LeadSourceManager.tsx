import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserCheck, 
  Plus, 
  Search, 
  Filter, 
  Phone, 
  MessageSquare, 
  ExternalLink, 
  Download, 
  CheckCircle2, 
  Sparkles, 
  GraduationCap, 
  Heart, 
  Briefcase, 
  MapPin, 
  Building2, 
  Edit2, 
  Trash2, 
  X, 
  Share2, 
  IndianRupee,
  Calendar,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Gift,
  Clock,
  Award,
  Check
} from 'lucide-react';
import { useSgs } from '../context/SgsContext';
import { LeadSource, LeadCategory, Customer } from '../types';

interface LeadSourceManagerProps {
  onOpenCustomerDirectoryWithLead?: (leadName: string) => void;
  onOpenNewCustomerWithLead?: (lead: LeadSource) => void;
}

const ReferredCustomerCommissionRow: React.FC<{
  customer: Customer;
  isDark: boolean;
  onSaveCommission: (customerId: string, amount: number, status: 'paid' | 'pending', notes?: string) => void;
}> = ({ customer, isDark, onSaveCommission }) => {
  const [commAmount, setCommAmount] = useState<number>(customer.referralCommissionAmount || 0);
  const [commStatus, setCommStatus] = useState<'paid' | 'pending'>(customer.referralCommissionStatus || 'pending');
  const [commNotes, setCommNotes] = useState<string>(customer.referralCommissionNotes || '');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSaveCommission(customer.id, Number(commAmount) || 0, commStatus, commNotes);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleToggleStatus = (targetStatus: 'paid' | 'pending') => {
    setCommStatus(targetStatus);
    onSaveCommission(customer.id, Number(commAmount) || 0, targetStatus, commNotes);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className={`p-4 rounded-xl border transition-all ${
      isDark 
        ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700' 
        : 'bg-slate-50/80 border-slate-200 hover:border-slate-300 shadow-xs'
    }`}>
      {/* Customer Header Info */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              #{customer.slNo} {customer.name}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
              isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
            }`}>
              {customer.about || 'General'}
            </span>
            {customer.referralCommissionPaidDate && commStatus === 'paid' && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                Paid on {customer.referralCommissionPaidDate}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
            <span className="font-mono">{customer.phone || 'No phone'}</span>
            <span>·</span>
            <span>{customer.area || 'Madurai'}</span>
            {customer.details && (
              <>
                <span>·</span>
                <span className="italic truncate max-w-xs">{customer.details}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer"
              title="Call Customer"
            >
              <Phone className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Manual Commission Input Per Client */}
      <form onSubmit={handleSave} className="mt-3 pt-1 space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
          
          {/* Amount input */}
          <div className="sm:col-span-4">
            <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Manual Commission (₹)
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
              <input
                type="number"
                min="0"
                value={commAmount}
                onChange={(e) => setCommAmount(Number(e.target.value))}
                placeholder="0"
                className={`w-full rounded-lg pl-6 pr-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none ${
                  isDark ? 'bg-slate-900 border border-slate-700 text-white' : 'bg-white border border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Status selector */}
          <div className="sm:col-span-4">
            <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Payout Status
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleToggleStatus('pending')}
                className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                  commStatus === 'pending'
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-xs'
                    : 'bg-transparent text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-200'
                }`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => handleToggleStatus('paid')}
                className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                  commStatus === 'paid'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shadow-xs'
                    : 'bg-transparent text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-200'
                }`}
              >
                Paid ✓
              </button>
            </div>
          </div>

          {/* Save / Feedback */}
          <div className="sm:col-span-4 flex items-end justify-end gap-2 pt-4 sm:pt-0">
            {isSaved && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                <Check className="w-3.5 h-3.5" /> Saved!
              </span>
            )}
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              Update
            </button>
          </div>
        </div>

        {/* Note / Context */}
        <div>
          <input
            type="text"
            value={commNotes}
            onChange={(e) => setCommNotes(e.target.value)}
            placeholder="Commission note (e.g. 10% on CCTV DVR service, ₹300 laptop repair fee)"
            className={`w-full rounded-lg px-2.5 py-1 text-[11px] focus:outline-none ${
              isDark ? 'bg-slate-900 border border-slate-800 text-slate-300' : 'bg-white border border-slate-300 text-slate-700'
            }`}
          />
        </div>
      </form>
    </div>
  );
};

export const LeadSourceManager: React.FC<LeadSourceManagerProps> = ({
  onOpenCustomerDirectoryWithLead,
  onOpenNewCustomerWithLead,
}) => {
  const { 
    leadSources, 
    addLeadSource, 
    updateLeadSource, 
    deleteLeadSource, 
    toggleLeadSyncedContacts,
    customers, 
    invoices, 
    jobCards, 
    updateCustomerCommission,
    generateVCard, 
    downloadVCard, 
    theme 
  } = useSgs();

  const isDark = theme === 'dark';

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [syncFilter, setSyncFilter] = useState<'all' | 'synced' | 'unsynced'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadSource | null>(null);
  const [viewingReferredCustomersLead, setViewingReferredCustomersLead] = useState<LeadSource | null>(null);
  const [expandedLeadIds, setExpandedLeadIds] = useState<string[]>([]);
  const [leadToast, setLeadToast] = useState<string | null>(null);

  const showLeadToast = (msg: string) => {
    setLeadToast(msg);
    setTimeout(() => setLeadToast(null), 3500);
  };

  const toggleLeadExpand = (id: string) => {
    setExpandedLeadIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Quick Meeting / Gift Modal State
  const [meetingModalLead, setMeetingModalLead] = useState<LeadSource | null>(null);
  const [meetingForm, setMeetingForm] = useState<{
    lastMeetingDate: string;
    nextMeetingPlan: string;
    meetingNotes: string;
    giftDetails: string;
    giftStatus: 'planned' | 'handed_over' | 'none';
    commissionRatePercent: number;
  }>({
    lastMeetingDate: new Date().toISOString().split('T')[0],
    nextMeetingPlan: '',
    meetingNotes: '',
    giftDetails: '',
    giftStatus: 'planned',
    commissionRatePercent: 5,
  });

  // Commission Payout Modal State
  const [payCommissionLead, setPayCommissionLead] = useState<LeadSource | null>(null);
  const [payCommissionAmount, setPayCommissionAmount] = useState<number>(1000);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    category: LeadCategory;
    phone: string;
    email: string;
    area: string;
    companyOrOccupation: string;
    notes: string;
    downloadVcardOnSave: boolean;
    lastMeetingDate: string;
    nextMeetingPlan: string;
    meetingNotes: string;
    commissionRatePercent: number;
    commissionPaid: number;
    giftDetails: string;
    giftStatus: 'planned' | 'handed_over' | 'none';
  }>({
    name: '',
    category: 'school_friend',
    phone: '',
    email: '',
    area: 'Madurai',
    companyOrOccupation: '',
    notes: '',
    downloadVcardOnSave: true,
    lastMeetingDate: '',
    nextMeetingPlan: '',
    meetingNotes: '',
    commissionRatePercent: 5,
    commissionPaid: 0,
    giftDetails: '',
    giftStatus: 'none',
  });

  // Calculate referred customers and revenue per lead source
  const leadStats = useMemo(() => {
    const statsMap: Record<string, { customersCount: number; customers: Customer[]; revenue: number }> = {};

    // Initialize map
    leadSources.forEach(lead => {
      statsMap[lead.id] = { customersCount: 0, customers: [], revenue: 0 };
    });

    // Map customers by leadSourceId or matching name/reference
    customers.forEach(customer => {
      // Find matching lead
      const matchedLead = leadSources.find(l => 
        (customer.leadSourceId && l.id === customer.leadSourceId) ||
        (customer.reference && l.name.toLowerCase() === customer.reference.toLowerCase()) ||
        (customer.reference && customer.reference.toLowerCase().includes(l.name.toLowerCase()))
      );

      if (matchedLead) {
        if (!statsMap[matchedLead.id]) {
          statsMap[matchedLead.id] = { customersCount: 0, customers: [], revenue: 0 };
        }
        statsMap[matchedLead.id].customersCount += 1;
        statsMap[matchedLead.id].customers.push(customer);

        // Sum revenue from invoices for this customer
        const custInvoices = invoices.filter(inv => inv.customerId === customer.id && inv.paymentStatus !== 'cancelled');
        const invoiceTotal = custInvoices.reduce((sum, inv) => sum + (inv.paidAmount || inv.grandTotal || 0), 0);

        // Sum from job cards
        const custJobs = jobCards.filter(j => j.customerId === customer.id);
        const jobsTotal = custJobs.reduce((sum, j) => sum + (j.finalCost > 0 ? j.finalCost : j.estimatedCost), 0);

        statsMap[matchedLead.id].revenue += Math.max(invoiceTotal, jobsTotal);
      }
    });

    return statsMap;
  }, [leadSources, customers, invoices, jobCards]);

  // Overall totals
  const totalReferredCustomers = useMemo(() => {
    return Object.values(leadStats).reduce((sum, stat) => sum + stat.customersCount, 0);
  }, [leadStats]);

  const totalBusinessRevenue = useMemo(() => {
    return Object.values(leadStats).reduce((sum, stat) => sum + stat.revenue, 0);
  }, [leadStats]);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leadSources.filter(lead => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        lead.name.toLowerCase().includes(q) ||
        (lead.phone && lead.phone.includes(q)) ||
        (lead.area && lead.area.toLowerCase().includes(q)) ||
        (lead.companyOrOccupation && lead.companyOrOccupation.toLowerCase().includes(q)) ||
        (lead.notes && lead.notes.toLowerCase().includes(q));

      const matchesCategory = selectedCategory === 'all' || lead.category === selectedCategory;
      const matchesSync = 
        syncFilter === 'all' ||
        (syncFilter === 'synced' && lead.syncedWithGoogleContacts) ||
        (syncFilter === 'unsynced' && !lead.syncedWithGoogleContacts);

      return matchesSearch && matchesCategory && matchesSync;
    });
  }, [leadSources, searchQuery, selectedCategory, syncFilter]);

  const handleOpenAddModal = () => {
    setEditingLead(null);
    setFormData({
      name: '',
      category: 'school_friend',
      phone: '',
      email: '',
      area: 'Madurai',
      companyOrOccupation: '',
      notes: '',
      downloadVcardOnSave: true,
      lastMeetingDate: '',
      nextMeetingPlan: '',
      meetingNotes: '',
      commissionRatePercent: 5,
      commissionPaid: 0,
      giftDetails: '',
      giftStatus: 'none',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (lead: LeadSource) => {
    setEditingLead(lead);
    setFormData({
      name: lead.name,
      category: lead.category,
      phone: lead.phone || '',
      email: lead.email || '',
      area: lead.area || '',
      companyOrOccupation: lead.companyOrOccupation || '',
      notes: lead.notes || '',
      downloadVcardOnSave: false,
      lastMeetingDate: lead.lastMeetingDate || '',
      nextMeetingPlan: lead.nextMeetingPlan || '',
      meetingNotes: lead.meetingNotes || '',
      commissionRatePercent: lead.commissionRatePercent !== undefined ? lead.commissionRatePercent : 5,
      commissionPaid: lead.commissionPaid || 0,
      giftDetails: lead.giftDetails || '',
      giftStatus: lead.giftStatus || 'none',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter the lead person or source name');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      category: formData.category,
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      area: formData.area.trim(),
      companyOrOccupation: formData.companyOrOccupation.trim(),
      notes: formData.notes.trim(),
      lastMeetingDate: formData.lastMeetingDate.trim() || undefined,
      nextMeetingPlan: formData.nextMeetingPlan.trim() || undefined,
      meetingNotes: formData.meetingNotes.trim() || undefined,
      commissionRatePercent: Number(formData.commissionRatePercent) || 0,
      commissionPaid: Number(formData.commissionPaid) || 0,
      giftDetails: formData.giftDetails.trim() || undefined,
      giftStatus: formData.giftStatus,
    };

    if (editingLead) {
      updateLeadSource(editingLead.id, payload);
      if (formData.downloadVcardOnSave) {
        handleSyncToGoogleContacts({
          ...editingLead,
          ...payload,
        });
      }
    } else {
      const newLead = addLeadSource({
        ...payload,
        syncedWithGoogleContacts: formData.downloadVcardOnSave,
      });

      if (formData.downloadVcardOnSave) {
        handleSyncToGoogleContacts(newLead);
      }
    }

    setIsModalOpen(false);
  };

  // Quick Meeting & Gift Action
  const handleOpenMeetingModal = (lead: LeadSource) => {
    setMeetingModalLead(lead);
    setMeetingForm({
      lastMeetingDate: lead.lastMeetingDate || new Date().toISOString().split('T')[0],
      nextMeetingPlan: lead.nextMeetingPlan || '',
      meetingNotes: lead.meetingNotes || '',
      giftDetails: lead.giftDetails || '',
      giftStatus: lead.giftStatus || 'planned',
      commissionRatePercent: lead.commissionRatePercent !== undefined ? lead.commissionRatePercent : 5,
    });
  };

  const handleSaveMeetingModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingModalLead) return;

    updateLeadSource(meetingModalLead.id, {
      lastMeetingDate: meetingForm.lastMeetingDate,
      nextMeetingPlan: meetingForm.nextMeetingPlan.trim() || undefined,
      meetingNotes: meetingForm.meetingNotes.trim() || undefined,
      giftDetails: meetingForm.giftDetails.trim() || undefined,
      giftStatus: meetingForm.giftStatus,
      commissionRatePercent: Number(meetingForm.commissionRatePercent) || 0,
    });

    setMeetingModalLead(null);
  };

  // Quick Commission Pay Action
  const handleOpenPayCommissionModal = (lead: LeadSource, suggestedAmount: number) => {
    setPayCommissionLead(lead);
    setPayCommissionAmount(suggestedAmount > 0 ? suggestedAmount : 500);
  };

  const handleSaveCommissionPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payCommissionLead) return;

    const currentPaid = payCommissionLead.commissionPaid || 0;
    const newPaid = currentPaid + Number(payCommissionAmount);

    updateLeadSource(payCommissionLead.id, {
      commissionPaid: newPaid,
    });

    alert(`Successfully recorded ₹${payCommissionAmount.toLocaleString('en-IN')} referral commission payout to ${payCommissionLead.name}! Total paid to date: ₹${newPaid.toLocaleString('en-IN')}.`);
    setPayCommissionLead(null);
  };

  const handleMarkGiftHandedOver = (lead: LeadSource) => {
    updateLeadSource(lead.id, {
      giftStatus: 'handed_over',
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove lead person "${name}"?`)) {
      deleteLeadSource(id);
    }
  };

  // Sync single lead to Google Contacts (vCard format)
  const handleSyncToGoogleContacts = (lead: LeadSource) => {
    const vcard = generateVCard({
      name: lead.name,
      phone: lead.phone,
      area: lead.area || 'Madurai',
      company: lead.companyOrOccupation || 'Spider Grid Solutions Lead / Referral',
      category: formatCategoryLabel(lead.category),
      notes: `Lead Type: ${formatCategoryLabel(lead.category)} | Notes: ${lead.notes || 'Referred clients to SGS'}`,
      mapUrl: lead.area ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lead.area}, Madurai`)}` : undefined,
    });

    downloadVCard(`SGS-Lead-${lead.name.replace(/\s+/g, '_')}`, vcard);
    toggleLeadSyncedContacts(lead.id, true);
  };

  // Bulk sync all leads to Google Contacts master .vcf file
  const handleSyncAllLeadsToContacts = () => {
    if (leadSources.length === 0) return;

    let masterVcf = '';
    leadSources.forEach(lead => {
      masterVcf += generateVCard({
        name: lead.name,
        phone: lead.phone,
        area: lead.area || 'Madurai',
        company: lead.companyOrOccupation || 'Spider Grid Solutions Lead / Referral',
        category: formatCategoryLabel(lead.category),
        notes: `Lead Type: ${formatCategoryLabel(lead.category)} | Notes: ${lead.notes || 'Referred clients to SGS'}`,
      });
      toggleLeadSyncedContacts(lead.id, true);
    });

    downloadVCard(`SGS-All-Leads-GoogleContacts-${new Date().toISOString().split('T')[0]}`, masterVcf);
    showLeadToast(`Master Google Contacts file (.vcf) generated for ${leadSources.length} lead persons!`);
  };

  // Category helpers
  const formatCategoryLabel = (category: LeadCategory): string => {
    switch (category) {
      case 'school_friend': return 'School Friend';
      case 'college_friend': return 'College Friend';
      case 'relative': return 'Relative / Family';
      case 'network': return 'Business Network';
      case 'business_associate': return 'Business Associate';
      case 'existing_customer': return 'Existing Customer';
      case 'google_maps': return 'Google Maps / Local';
      case 'social_media': return 'Social Media';
      case 'walk_in': return 'Walk-in Board';
      default: return 'Other Channel';
    }
  };

  const getCategoryBadgeClass = (category: LeadCategory): { bg: string; text: string; icon: React.ReactNode } => {
    switch (category) {
      case 'school_friend':
        return {
          bg: isDark ? 'bg-indigo-950/60 border-indigo-800' : 'bg-indigo-50 border-indigo-200',
          text: isDark ? 'text-indigo-400' : 'text-indigo-700',
          icon: <GraduationCap className="w-3.5 h-3.5" />
        };
      case 'college_friend':
        return {
          bg: isDark ? 'bg-purple-950/60 border-purple-800' : 'bg-purple-50 border-purple-200',
          text: isDark ? 'text-purple-400' : 'text-purple-700',
          icon: <GraduationCap className="w-3.5 h-3.5" />
        };
      case 'relative':
        return {
          bg: isDark ? 'bg-amber-950/60 border-amber-800' : 'bg-amber-50 border-amber-200',
          text: isDark ? 'text-amber-400' : 'text-amber-700',
          icon: <Heart className="w-3.5 h-3.5" />
        };
      case 'network':
      case 'business_associate':
        return {
          bg: isDark ? 'bg-emerald-950/60 border-emerald-800' : 'bg-emerald-50 border-emerald-200',
          text: isDark ? 'text-emerald-400' : 'text-emerald-700',
          icon: <Briefcase className="w-3.5 h-3.5" />
        };
      case 'google_maps':
        return {
          bg: isDark ? 'bg-sky-950/60 border-sky-800' : 'bg-sky-50 border-sky-200',
          text: isDark ? 'text-sky-400' : 'text-sky-700',
          icon: <MapPin className="w-3.5 h-3.5" />
        };
      default:
        return {
          bg: isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200',
          text: isDark ? 'text-slate-300' : 'text-slate-700',
          icon: <Users className="w-3.5 h-3.5" />
        };
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Title */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-1 ${
            isDark ? 'text-blue-400' : 'text-blue-700'
          }`}>
            <span>Referral Engine</span>
            <span>·</span>
            <span>People & Attribution</span>
            <span>·</span>
            <span>Google Contacts Sync</span>
          </div>
          <h1 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Lead Source & Referrers Hub ({leadSources.length})
          </h1>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Manage person-level referrals (School friends, Relatives, Business Network) with 1-click Google Contacts sync and tracked sales revenue.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={handleSyncAllLeadsToContacts}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              isDark 
                ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-slate-600' 
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs'
            }`}
            title="Download all lead sources as Google Contacts vCard (.vcf) file"
          >
            <Download className="w-3.5 h-3.5 text-blue-500" />
            <span>Sync All to Google Contacts (.vcf)</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-md shadow-blue-600/20 cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register Lead Person</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className={`p-4 rounded-xl border transition-colors ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-slate-500">
            <span>Lead Sources</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className={`text-2xl font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {leadSources.length}
            </span>
            <span className="text-[11px] font-semibold text-blue-600">
              Registered
            </span>
          </div>
        </div>

        <div className={`p-4 rounded-xl border transition-colors ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-slate-500">
            <span>Referred Customers</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className={`text-2xl font-bold font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              {totalReferredCustomers}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600">
              From Leads
            </span>
          </div>
        </div>

        <div className={`p-4 rounded-xl border transition-colors ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-slate-500">
            <span>Business Generated</span>
            <IndianRupee className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className={`text-2xl font-bold font-mono ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
              ₹{totalBusinessRevenue.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] font-semibold text-amber-600">
              Attributed
            </span>
          </div>
        </div>

        <div className={`p-4 rounded-xl border transition-colors ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-slate-500">
            <span>Google Contacts Synced</span>
            <CheckCircle2 className="w-4 h-4 text-sky-500" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className={`text-2xl font-bold font-mono ${isDark ? 'text-sky-400' : 'text-sky-700'}`}>
              {leadSources.filter(l => l.syncedWithGoogleContacts).length}
            </span>
            <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              of {leadSources.length} in Phone
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={`p-4 rounded-xl border space-y-3 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
      }`}>
        <div className="flex flex-col md:flex-row gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by lead person name, phone, occupation, area, or notes..."
              className={`w-full rounded-lg pl-9 pr-4 py-2 text-xs transition-colors focus:outline-none ${
                isDark 
                  ? 'bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:border-blue-500' 
                  : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600'
              }`}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="w-full md:w-56">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                isDark 
                  ? 'bg-slate-950 border border-slate-800 text-slate-300 focus:border-blue-500' 
                  : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
              }`}
            >
              <option value="all">All Referral Categories</option>
              <option value="school_friend">School Friends</option>
              <option value="college_friend">College Friends</option>
              <option value="relative">Relatives / Family</option>
              <option value="network">Business Network</option>
              <option value="business_associate">Business Associates</option>
              <option value="existing_customer">Existing Customers</option>
              <option value="google_maps">Google Maps Local Search</option>
              <option value="social_media">Social Media</option>
              <option value="walk_in">Walk-in Board</option>
              <option value="other">Other Channels</option>
            </select>
          </div>

          {/* Sync Status Filter */}
          <div className="w-full md:w-48">
            <select
              value={syncFilter}
              onChange={(e) => setSyncFilter(e.target.value as any)}
              className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                isDark 
                  ? 'bg-slate-950 border border-slate-800 text-slate-300 focus:border-blue-500' 
                  : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
              }`}
            >
              <option value="all">All Contacts Sync</option>
              <option value="synced">Synced to Google Contacts</option>
              <option value="unsynced">Not Synced Yet</option>
            </select>
          </div>
        </div>

        {/* Quick Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none text-[11px]">
          <span className={`text-[10px] uppercase font-bold mr-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Quick:</span>
          {[
            { id: 'all', label: 'All Leads' },
            { id: 'school_friend', label: 'School Friends' },
            { id: 'relative', label: 'Relatives' },
            { id: 'network', label: 'Business Network' },
            { id: 'college_friend', label: 'College Buddies' },
            { id: 'google_maps', label: 'Google Maps' },
          ].map(chip => (
            <button
              key={chip.id}
              onClick={() => setSelectedCategory(chip.id)}
              className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === chip.id
                  ? (isDark ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white shadow-xs')
                  : (isDark ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Header Stats & Expand All / Collapse All Toggle */}
      <div className="flex items-center justify-between text-xs px-1 pb-1">
        <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
          Showing <strong>{filteredLeads.length}</strong> referral partners
        </span>
        {filteredLeads.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (expandedLeadIds.length === filteredLeads.length) {
                setExpandedLeadIds([]);
              } else {
                setExpandedLeadIds(filteredLeads.map(l => l.id));
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs'
            }`}
          >
            {expandedLeadIds.length === filteredLeads.length ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                <span>Collapse All</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
                <span>Expand All Details</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Lead Cards / Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLeads.length === 0 ? (
          <div className={`col-span-full py-16 text-center rounded-xl border ${
            isDark ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
          }`}>
            <Users className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
            <p className="text-sm font-semibold">No lead sources found</p>
            <p className="text-xs mt-1">Try resetting search filters or register a new referral person.</p>
            <button
              onClick={handleOpenAddModal}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register First Lead</span>
            </button>
          </div>
        ) : (
          filteredLeads.map((lead) => {
            const badge = getCategoryBadgeClass(lead.category);
            const stats = leadStats[lead.id] || { customersCount: 0, customers: [], revenue: 0 };
            const cleanPhone = lead.phone ? lead.phone.replace(/[^0-9]/g, '') : '';
            const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
            const waUrl = cleanPhone 
              ? `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(`Hello ${lead.name}! Greetings from Spider Grid Solutions (SGS) Madurai. Thank you for your continued support and customer referrals!`)}`
              : null;
            const isExpanded = expandedLeadIds.includes(lead.id);

            return (
              <div
                key={lead.id}
                className={`rounded-xl border transition-all overflow-hidden ${
                  isExpanded
                    ? (isDark ? 'bg-slate-900/90 border-blue-600/80 shadow-md ring-1 ring-blue-600/30' : 'bg-white border-blue-400 shadow-md ring-1 ring-blue-400/20')
                    : (isDark ? 'bg-slate-900/70 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200/90 shadow-xs hover:border-blue-300')
                }`}
              >
                {/* 1. MAIN COLLAPSED VIEW (Always visible - Click to Expand) */}
                <div 
                  onClick={() => toggleLeadExpand(lead.id)}
                  className="p-3.5 cursor-pointer select-none space-y-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  title="Click to expand/collapse full commission, meetings & partner actions"
                >
                  {/* Lead Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${badge.bg} ${badge.text}`}>
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className={`text-sm font-bold leading-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {lead.name}
                        </h3>
                        {lead.companyOrOccupation && (
                          <p className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`} title={lead.companyOrOccupation}>
                            {lead.companyOrOccupation}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Category Chip */}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${badge.bg} ${badge.text}`}>
                        {badge.icon}
                        <span>{formatCategoryLabel(lead.category)}</span>
                      </span>
                      {/* Expand Chevron Icon Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLeadExpand(lead.id);
                        }}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                          isExpanded 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' 
                            : (isDark ? 'border-slate-800 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100 shadow-2xs')
                        }`}
                        title={isExpanded ? 'Collapse' : 'Expand full options'}
                      >
                        <span>{isExpanded ? 'Less' : 'Details'}</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3 text-white" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {/* Main Essential Info Row: Phone + Primary Metrics */}
                  <div className="flex items-center justify-between text-xs gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {lead.phone ? (
                        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          <Phone className="w-3 h-3 text-blue-500 shrink-0" />
                          <span>{lead.phone}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No phone</span>
                      )}
                      {lead.area && (
                        <span className="text-[11px] text-slate-500 truncate">
                          · {lead.area}
                        </span>
                      )}
                    </div>

                    {/* Compact Main Metric Badge */}
                    <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                      <span className={`px-2 py-0.5 rounded-md font-bold ${
                        isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {stats.customersCount} Clients
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        ₹{stats.revenue.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. EXPANDED CONTENT: ONLY SHOWN WHEN CLICKED */}
                {isExpanded && (
                  <div className={`p-4 border-t space-y-3.5 animate-in fade-in duration-150 ${
                    isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/50 border-slate-200'
                  }`}>
                    {/* Quick Call & WhatsApp Action Row */}
                    <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Quick Connect:</span>
                      <div className="flex items-center gap-2">
                        {lead.phone && (
                          <a
                            href={`tel:${lead.phone}`}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-400 hover:bg-blue-100 transition-colors"
                            title="Direct Call"
                          >
                            <Phone className="w-3 h-3" />
                            <span>Call</span>
                          </a>
                        )}
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"
                            title="Chat on WhatsApp"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Detailed Metrics Grid */}
                    <div className={`grid grid-cols-2 gap-2 p-2.5 rounded-lg text-center ${
                      isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200 shadow-2xs'
                    }`}>
                      <div>
                        <span className={`block text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Referred Clients
                        </span>
                        <span className={`text-base font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {stats.customersCount}
                        </span>
                      </div>
                      <div>
                        <span className={`block text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Total Revenue
                        </span>
                        <span className={`text-base font-bold font-mono ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                          ₹{stats.revenue.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                    {/* Notes if available */}
                    {lead.notes && (
                      <p className={`text-[11px] italic p-2 rounded-lg border ${
                        isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                      }`}>
                        "{lead.notes}"
                      </p>
                    )}

                    {/* Meeting Plan & Last Met Details */}
                    <div className={`p-2.5 rounded-lg text-xs space-y-1.5 border ${
                      isDark ? 'bg-blue-950/20 border-blue-900/40 text-slate-300' : 'bg-blue-50/50 border-blue-100 text-slate-800'
                    }`}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Meeting Plan</span>
                        </span>
                        <button
                          onClick={() => handleOpenMeetingModal(lead)}
                          className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          {lead.nextMeetingPlan ? 'Edit Meeting' : '+ Plan Meeting'}
                        </button>
                      </div>

                      <div className="text-[11px] space-y-0.5">
                        <div className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3" />
                          <span>Last Met: </span>
                          <strong className="text-slate-700 dark:text-slate-300">
                            {lead.lastMeetingDate ? new Date(lead.lastMeetingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not logged yet'}
                          </strong>
                        </div>
                        {lead.nextMeetingPlan && (
                          <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400 pt-0.5">
                            👉 Next: {lead.nextMeetingPlan}
                          </p>
                        )}
                        {lead.meetingNotes && (
                          <p className="text-[10px] text-slate-500 italic">
                            Notes: "{lead.meetingNotes}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Gift & Lead Commission Section */}
                    {(() => {
                      const rate = lead.commissionRatePercent || 0;
                      const earned = Math.round((stats.revenue * rate) / 100);
                      const paid = lead.commissionPaid || 0;
                      const pending = Math.max(0, earned - paid);

                      return (
                        <div className={`p-2.5 rounded-lg text-xs space-y-2 border ${
                          isDark ? 'bg-amber-950/15 border-amber-900/40' : 'bg-amber-50/50 border-amber-200/60'
                        }`}>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                              <Award className="w-3 h-3 text-amber-500" />
                              <span>Commission & Gifts ({rate}%)</span>
                            </span>
                            {pending > 0 && (
                              <button
                                onClick={() => handleOpenPayCommissionModal(lead, pending)}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs"
                              >
                                Pay ₹{pending.toLocaleString('en-IN')}
                              </button>
                            )}
                          </div>

                          {/* Gift status */}
                          {lead.giftDetails ? (
                            <div className="flex items-center justify-between text-[11px] pt-0.5">
                              <div className="flex items-center gap-1">
                                <Gift className="w-3 h-3 text-rose-500 shrink-0" />
                                <span className="truncate max-w-[170px]" title={lead.giftDetails}>{lead.giftDetails}</span>
                              </div>
                              {lead.giftStatus === 'handed_over' ? (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.2 rounded">
                                  Handed Over ✓
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleMarkGiftHandedOver(lead)}
                                  className="text-[10px] font-bold text-amber-700 hover:underline cursor-pointer"
                                  title="Click to mark as handed over"
                                >
                                  Mark Handed Over
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 italic">No gift registered for this lead</div>
                          )}

                          {/* Commission breakdown */}
                          {(() => {
                            const manualComms = stats.customers.reduce((sum, c) => sum + (c.referralCommissionAmount || 0), 0);
                            const manualPaid = stats.customers.filter(c => c.referralCommissionStatus === 'paid').reduce((sum, c) => sum + (c.referralCommissionAmount || 0), 0);
                            const manualPending = stats.customers.filter(c => c.referralCommissionStatus !== 'paid').reduce((sum, c) => sum + (c.referralCommissionAmount || 0), 0);
                            const effectiveEarned = manualComms > 0 ? manualComms : earned;
                            const effectivePaid = manualComms > 0 ? manualPaid : paid;
                            const effectivePending = manualComms > 0 ? manualPending : pending;

                            return (
                              <div className="space-y-1.5 pt-1 border-t border-amber-200/40 dark:border-amber-900/30">
                                <div className="grid grid-cols-3 gap-1 text-center font-mono text-[10px]">
                                  <div>
                                    <span className="text-slate-400 block text-[9px]">EARNED</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-200">₹{effectiveEarned.toLocaleString('en-IN')}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[9px]">PAID</span>
                                    <span className="font-bold text-emerald-600">₹{effectivePaid.toLocaleString('en-IN')}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[9px]">PENDING</span>
                                    <span className={`font-bold ${effectivePending > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                                      ₹{effectivePending.toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setViewingReferredCustomersLead(lead)}
                                  className="w-full text-center py-1 rounded text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                >
                                  <span>Manage Commissions per Client ({stats.customersCount})</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })()}

                    {/* Footer Controls & Google Contact Sync */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                      {/* Google Contact Sync Button */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleSyncToGoogleContacts(lead)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-all cursor-pointer ${
                            lead.syncedWithGoogleContacts
                              ? (isDark ? 'bg-emerald-950/50 border-emerald-800 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                              : (isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs')
                          }`}
                          title={lead.syncedWithGoogleContacts ? 'Click to re-download vCard contact file' : 'Sync to phone & Google Contacts'}
                        >
                          {lead.syncedWithGoogleContacts ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span>Google Contact Synced</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-3 h-3 text-blue-500" />
                              <span>Sync to Contacts (.vcf)</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {onOpenNewCustomerWithLead && (
                          <button
                            onClick={() => onOpenNewCustomerWithLead(lead)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isDark ? 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800' : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title="Register New Customer referred by this Lead"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenMeetingModal(lead)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isDark ? 'text-slate-400 hover:text-amber-400 hover:bg-slate-800' : 'text-slate-500 hover:text-amber-700 hover:bg-amber-50'
                          }`}
                          title="Plan Meeting / Log Discussion"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(lead)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isDark ? 'text-slate-400 hover:text-sky-400 hover:bg-slate-800' : 'text-slate-500 hover:text-sky-700 hover:bg-sky-50'
                          }`}
                          title="Edit Lead Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(lead.id, lead.name)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isDark ? 'text-slate-500 hover:text-rose-400 hover:bg-slate-800' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                          }`}
                          title="Delete Lead Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* View & Manage Referred Clients with Per-Client Commission Modal */}
      {viewingReferredCustomersLead && (() => {
        const referredClients = leadStats[viewingReferredCustomersLead.id]?.customers || [];
        const totalClients = referredClients.length;
        const totalClientCommissions = referredClients.reduce((sum, c) => sum + (c.referralCommissionAmount || 0), 0);
        const totalPaidCommissions = referredClients.filter(c => c.referralCommissionStatus === 'paid').reduce((sum, c) => sum + (c.referralCommissionAmount || 0), 0);
        const totalPendingCommissions = referredClients.filter(c => c.referralCommissionStatus !== 'paid').reduce((sum, c) => sum + (c.referralCommissionAmount || 0), 0);

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className={`border rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              {/* Modal Header */}
              <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
                isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
              }`}>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <span>Referred Clients: {viewingReferredCustomersLead.name}</span>
                    </h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-bold">
                      {totalClients} Clients
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Add separate manual referral commission per client with instant paid/pending tracking
                  </p>
                </div>
                <button
                  onClick={() => setViewingReferredCustomersLead(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Commission Summary Metrics Banner */}
              <div className={`px-6 py-3 border-b grid grid-cols-3 gap-3 text-center shrink-0 ${
                isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-amber-50/50 border-amber-100'
              }`}>
                <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Allocated</span>
                  <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-100">
                    ₹{totalClientCommissions.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/40">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold block">Paid to Referrer</span>
                  <span className="text-sm font-bold font-mono text-emerald-600">
                    ₹{totalPaidCommissions.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-white/60 dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40">
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-semibold block">Pending Payout</span>
                  <span className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">
                    ₹{totalPendingCommissions.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Client List with Manual Commission Editors */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {referredClients.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <p className="text-xs text-slate-400">
                      No clients currently linked to "{viewingReferredCustomersLead.name}".
                    </p>
                    {onOpenNewCustomerWithLead && (
                      <button
                        onClick={() => {
                          setViewingReferredCustomersLead(null);
                          onOpenNewCustomerWithLead(viewingReferredCustomersLead);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white shadow-xs hover:bg-blue-700 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Register First Customer with this Lead</span>
                      </button>
                    )}
                  </div>
                ) : (
                  referredClients.map(cust => (
                    <ReferredCustomerCommissionRow
                      key={cust.id}
                      customer={cust}
                      isDark={isDark}
                      onSaveCommission={(id, amt, stat, notes) => {
                        updateCustomerCommission(id, amt, stat, notes);
                      }}
                    />
                  ))
                )}
              </div>

              {/* Modal Footer */}
              <div className={`px-6 py-3 border-t flex items-center justify-between shrink-0 ${
                isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="text-[11px] text-slate-500">
                  💡 Tip: Commissions are saved directly per client and reflect across all lead reports
                </div>
                <button
                  onClick={() => setViewingReferredCustomersLead(null)}
                  className="px-5 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add / Edit Lead Source Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div>
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {editingLead ? 'Edit Lead Person / Source' : 'Register New Lead Person / Source'}
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Record referrers from school, family, and business network for customer attribution
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className={`p-1 rounded-lg ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Lead Person / Source Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Karthik (School Friend), Vivek Real Wire, Dinesh Uncle"
                  className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                    isDark 
                      ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                      : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Referral Relationship / Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as LeadCategory })}
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                        : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                    }`}
                  >
                    <option value="school_friend">School Friend (St. Marys / TVS, etc.)</option>
                    <option value="college_friend">College Friend (KLN / Thiagarajar, etc.)</option>
                    <option value="relative">Relative / Family</option>
                    <option value="network">Business Network (Madurai Tech / Trade)</option>
                    <option value="business_associate">Business Associate / Partner</option>
                    <option value="existing_customer">Existing Satisfied Customer</option>
                    <option value="google_maps">Google Maps Local Search</option>
                    <option value="social_media">Social Media (Instagram / WhatsApp)</option>
                    <option value="walk_in">Walk-in Board Signage</option>
                    <option value="other">Other Referral Channel</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Phone Number (for Contacts Sync)
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 9842100001"
                    className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                        : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Company / Organization / Occupation
                  </label>
                  <input
                    type="text"
                    value={formData.companyOrOccupation}
                    onChange={(e) => setFormData({ ...formData, companyOrOccupation: e.target.value })}
                    placeholder="e.g. Govt School Teacher, Real Wire Networking"
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                        : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Area / Location in Madurai
                  </label>
                  <input
                    type="text"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    placeholder="e.g. Simmakkal, Anjal Nagar, Villapuram"
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                        : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                    }`}
                  />
                </div>
              </div>

              {/* Meeting Planning & Relationship Section */}
              <div className={`p-3.5 rounded-xl border space-y-3 ${
                isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-blue-50/50 border-blue-200'
              }`}>
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Meeting Plan & Last Meeting History</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Last Meeting Date
                    </label>
                    <input
                      type="date"
                      value={formData.lastMeetingDate}
                      onChange={(e) => setFormData({ ...formData, lastMeetingDate: e.target.value })}
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Next Meeting Plan / Agenda
                    </label>
                    <input
                      type="text"
                      value={formData.nextMeetingPlan}
                      onChange={(e) => setFormData({ ...formData, nextMeetingPlan: e.target.value })}
                      placeholder="e.g. Meet next Tuesday for school CCTV demo"
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Meeting Discussion Points / Notes
                  </label>
                  <input
                    type="text"
                    value={formData.meetingNotes}
                    onChange={(e) => setFormData({ ...formData, meetingNotes: e.target.value })}
                    placeholder="e.g. Discussed joint bid for hotel Wi-Fi; agrees on 5% referral fee"
                    className={`w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none ${
                      isDark ? 'bg-slate-900 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Commission & Gift Data Section */}
              <div className={`p-3.5 rounded-xl border space-y-3 ${
                isDark ? 'bg-amber-950/20 border-amber-900/50' : 'bg-amber-50/50 border-amber-200'
              }`}>
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <Award className="w-3.5 h-3.5" />
                  <span>Referral Commission & Relationship Gifts</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Commission Rate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.commissionRatePercent}
                      onChange={(e) => setFormData({ ...formData, commissionRatePercent: Number(e.target.value) })}
                      placeholder="5"
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none ${
                        isDark ? 'bg-slate-900 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Commission Paid (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.commissionPaid}
                      onChange={(e) => setFormData({ ...formData, commissionPaid: Number(e.target.value) })}
                      placeholder="0"
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none ${
                        isDark ? 'bg-slate-900 border border-slate-800 text-emerald-400 font-bold' : 'bg-white border border-slate-300 text-emerald-700 font-bold'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Gift Status
                    </label>
                    <select
                      value={formData.giftStatus}
                      onChange={(e) => setFormData({ ...formData, giftStatus: e.target.value as any })}
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none ${
                        isDark ? 'bg-slate-900 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="none">No Gift</option>
                      <option value="planned">Gift Planned</option>
                      <option value="handed_over">Handed Over ✓</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Gift Description / Item
                  </label>
                  <input
                    type="text"
                    value={formData.giftDetails}
                    onChange={(e) => setFormData({ ...formData, giftDetails: e.target.value })}
                    placeholder="e.g. Diwali Sweets Hamper & SGS Branded Powerbank"
                    className={`w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none ${
                      isDark ? 'bg-slate-900 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Notes & Details (Referral Context)
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. School batchmate 2012, regularly recommends local retail shops and CCTV requirements."
                  className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                    isDark 
                      ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                      : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                  }`}
                />
              </div>

              {/* Auto sync check */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="autoVcardCheck"
                  checked={formData.downloadVcardOnSave}
                  onChange={(e) => setFormData({ ...formData, downloadVcardOnSave: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="autoVcardCheck" className={`text-xs cursor-pointer ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Download Google Contacts Card (.vcf) automatically on save
                </label>
              </div>

              <div className={`flex items-center justify-end gap-3 pt-4 border-t ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 text-xs rounded-lg transition-colors cursor-pointer ${
                    isDark ? 'text-slate-400 hover:text-slate-200 bg-slate-800' : 'text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  {editingLead ? 'Save Changes' : 'Register Lead Source'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Meeting & Gift Handover Modal */}
      {meetingModalLead && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div>
                <h3 className="text-base font-bold flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span>Meeting Plan: {meetingModalLead.name}</span>
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Schedule next meet, review discussions, and assign appreciation gift
                </p>
              </div>
              <button
                onClick={() => setMeetingModalLead(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMeetingModal} className="p-6 space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Date of Last Meeting
                </label>
                <input
                  type="date"
                  value={meetingForm.lastMeetingDate}
                  onChange={(e) => setMeetingForm({ ...meetingForm, lastMeetingDate: e.target.value })}
                  className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Next Planned Meeting (Date & Agenda) *
                </label>
                <input
                  type="text"
                  required
                  value={meetingForm.nextMeetingPlan}
                  onChange={(e) => setMeetingForm({ ...meetingForm, nextMeetingPlan: e.target.value })}
                  placeholder="e.g. Meet next Friday at Simmakkal for CCTV lead review & gift handover"
                  className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Meeting Discussion Notes
                </label>
                <textarea
                  rows={2}
                  value={meetingForm.meetingNotes}
                  onChange={(e) => setMeetingForm({ ...meetingForm, meetingNotes: e.target.value })}
                  placeholder="e.g. Inquired about bulk desktop refurbishments; satisfied with earlier service."
                  className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Appreciation Gift
                  </label>
                  <input
                    type="text"
                    value={meetingForm.giftDetails}
                    onChange={(e) => setMeetingForm({ ...meetingForm, giftDetails: e.target.value })}
                    placeholder="e.g. Sweet Box & Diary"
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Gift Status
                  </label>
                  <select
                    value={meetingForm.giftStatus}
                    onChange={(e) => setMeetingForm({ ...meetingForm, giftStatus: e.target.value as any })}
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-slate-200' : 'bg-white border border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="planned">Gift Planned</option>
                    <option value="handed_over">Handed Over ✓</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </div>

              <div className={`flex items-center justify-end gap-2 pt-3 border-t ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setMeetingModalLead(null)}
                  className={`px-3 py-1.5 text-xs rounded-lg ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  Save Meeting Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payout Commission Modal */}
      {payCommissionLead && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div>
                <h3 className="text-base font-bold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <Award className="w-4 h-4" />
                  <span>Pay Commission: {payCommissionLead.name}</span>
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Record referral commission payment
                </p>
              </div>
              <button
                onClick={() => setPayCommissionLead(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCommissionPayment} className="p-6 space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Payment Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={payCommissionAmount}
                  onChange={(e) => setPayCommissionAmount(Number(e.target.value))}
                  className={`w-full rounded-lg px-3 py-2 text-sm font-mono font-bold focus:outline-none ${
                    isDark ? 'bg-slate-950 border border-slate-800 text-emerald-400' : 'bg-white border border-slate-300 text-emerald-700'
                  }`}
                />
              </div>

              <div className={`p-3 rounded-lg text-xs space-y-1 ${
                isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-50 border border-slate-200'
              }`}>
                <div className="flex justify-between">
                  <span className="text-slate-400">Commission Rate:</span>
                  <span className="font-mono font-bold">{payCommissionLead.commissionRatePercent || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Previously Paid:</span>
                  <span className="font-mono text-emerald-600">₹{(payCommissionLead.commissionPaid || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className={`flex items-center justify-end gap-2 pt-2 border-t ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setPayCommissionLead(null)}
                  className={`px-3 py-1.5 text-xs rounded-lg ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm"
                >
                  Confirm Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lead Toast Feedback */}
      {leadToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4" />
          <span>{leadToast}</span>
        </div>
      )}

    </div>
  );
};
