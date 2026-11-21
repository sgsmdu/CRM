import { todayLocal } from '../utils/accounting';
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Phone, 
  MessageSquare, 
  Wrench, 
  Filter, 
  MapPin, 
  UserCheck, 
  UserX,
  Edit2, 
  Trash2, 
  X,
  Download,
  ExternalLink,
  Navigation,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  Users,
  Award,
  Star,
  IndianRupee,
  Receipt
} from 'lucide-react';
import { useSgs } from '../context/SgsContext';
import { Customer, Invoice, LeadSource } from '../types';
import { CollectPaymentModal } from './CollectPaymentModal';
import { WhatsAppPendingModal } from './WhatsAppPendingModal';
import {
  CustomerFinancialSummary,
  formatAccountLabel,
  getCustomerFinancialSummary,
} from '../utils/moneyFlow';
import { amountDue } from '../utils/accounting';

interface CustomerDirectoryProps {
  onOpenNewJobWithCustomer: (customer: Customer) => void;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  onOpenGoogleContactsModal?: () => void;
}

export const CustomerDirectory: React.FC<CustomerDirectoryProps> = ({
  onOpenNewJobWithCustomer,
  isCreateModalOpen,
  setIsCreateModalOpen,
  onOpenGoogleContactsModal,
}) => {
  const { 
    customers, 
    addCustomer, 
    updateCustomer, 
    deleteCustomer, 
    leadSources,
    addLeadSource,
    syncCustomerToContacts,
    generateVCard,
    downloadVCard,
    invoices,
    invoicePayments,
    customerPaymentAllocations,
    bankAccounts,
    theme,
    canDelete
  } = useSgs();

  const isDark = theme === 'dark';

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedReference, setSelectedReference] = useState<string>('all');
  const [selectedAbout, setSelectedAbout] = useState<string>('all');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToast, setCustomerToast] = useState<string | null>(null);

  // Customer Financial Ledger, Collect Payment & WhatsApp Pending Modals
  const [ledgerCustomer, setLedgerCustomer] = useState<Customer | null>(null);
  const [collectModalState, setCollectModalState] = useState<{
    mode: 'single_invoice' | 'customer_multi';
    customer?: Customer | null;
    invoice?: Invoice | null;
  } | null>(null);
  const [waPendingCustomer, setWaPendingCustomer] = useState<Customer | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState<{
    name: string;
    area: string;
    mapUrl: string;
    phone: string;
    about: string;
    reference: string;
    leadSourceId: string;
    details: string;
    phoneBook: 'Yes' | 'No';
    autoDownloadVcard: boolean;
  }>({
    name: '',
    area: '',
    mapUrl: '',
    phone: '',
    about: 'General',
    reference: 'Google Maps',
    leadSourceId: '',
    details: '',
    phoneBook: 'Yes',
    autoDownloadVcard: true,
  });

  // Autocomplete dropdown state for Lead Source
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [isLeadDropdownOpen, setIsLeadDropdownOpen] = useState(false);

  // Geolocation fetching state
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  
// Phone contact picker (Android Chrome only)
  const canPickPhoneContacts =
    typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window;

  const pickFromPhoneContacts = async () => {
    try {
      const picked = await (navigator as any).contacts.select(['name', 'tel'], { multiple: false });
      if (!picked || picked.length === 0) return;
      const c = picked[0];
      const name: string = (c.name && c.name[0]) || '';
      const digits: string = ((c.tel && c.tel[0]) || '').replace(/\D/g, '');
      const phone = digits.length > 10 ? digits.slice(-10) : digits;
      setFormData(prev => ({ ...prev, name: name || prev.name, phone: phone || prev.phone }));
    } catch (e) {
      console.warn('Contact picker cancelled or failed:', e);
    }
  };
  
  // Extract unique areas, references, about categories
  const areas = useMemo(() => {
    const list = Array.from(new Set(customers.map(c => c.area).filter(Boolean)));
    return list.sort();
  }, [customers]);

  const references = useMemo(() => {
    const list = Array.from(new Set(customers.map(c => c.reference).filter(Boolean)));
    return list.sort();
  }, [customers]);

  const aboutCategories = useMemo(() => {
    const list = Array.from(new Set(customers.map(c => c.about).filter(Boolean)));
    return list.sort();
  }, [customers]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.area && c.area.toLowerCase().includes(q)) ||
        (c.reference && c.reference.toLowerCase().includes(q)) ||
        (c.details && c.details.toLowerCase().includes(q)) ||
        (c.about && c.about.toLowerCase().includes(q));

      const matchesArea = selectedArea === 'all' || c.area === selectedArea;
      const matchesReference = selectedReference === 'all' || c.reference === selectedReference;
      const matchesAbout = selectedAbout === 'all' || c.about === selectedAbout;

      return matchesSearch && matchesArea && matchesReference && matchesAbout;
    });
  }, [customers, searchQuery, selectedArea, selectedReference, selectedAbout]);

  // Customer-wise financial summary across all bills (no bill merging; individual dues summed)
  const customerFinanceMap = useMemo(() => {
    const map = new Map<string, CustomerFinancialSummary>();
    customers.forEach(c => {
      map.set(c.id, getCustomerFinancialSummary(c, invoices, invoicePayments, customerPaymentAllocations));
    });
    return map;
  }, [customers, invoices, invoicePayments, customerPaymentAllocations]);

  // Filtered Lead Sources for Autocomplete
  const matchingLeadSources = useMemo(() => {
    if (!leadSearchQuery.trim()) return leadSources;
    const q = leadSearchQuery.toLowerCase();
    return leadSources.filter(l => 
      l.name.toLowerCase().includes(q) ||
      (l.category && l.category.toLowerCase().includes(q)) ||
      (l.companyOrOccupation && l.companyOrOccupation.toLowerCase().includes(q))
    );
  }, [leadSources, leadSearchQuery]);

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      area: '',
      mapUrl: '',
      phone: '',
      about: 'General',
      reference: 'Google Maps',
      leadSourceId: '',
      details: '',
      phoneBook: 'Yes',
      autoDownloadVcard: true,
    });
    setLeadSearchQuery('Google Maps');
    setIsLeadDropdownOpen(false);
    setGpsError(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      area: c.area || '',
      mapUrl: c.mapUrl || '',
      phone: c.phone || '',
      about: c.about || 'General',
      reference: c.reference || '',
      leadSourceId: c.leadSourceId || '',
      details: c.details || '',
      phoneBook: c.phoneBook || 'Yes',
      autoDownloadVcard: false,
    });
    setLeadSearchQuery(c.reference || '');
    setIsLeadDropdownOpen(false);
    setGpsError(null);
    setIsCreateModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter customer name');
      return;
    }

    // Auto generate mapUrl if area is given but mapUrl is blank
    let finalMapUrl = formData.mapUrl.trim();
    if (!finalMapUrl && formData.area.trim()) {
      finalMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${formData.area.trim()}, Madurai, Tamil Nadu`)}`;
    }

    const payload = {
      name: formData.name.trim(),
      area: formData.area.trim(),
      mapUrl: finalMapUrl,
      phone: formData.phone.trim(),
      about: formData.about.trim(),
      reference: formData.reference.trim() || 'Direct',
      leadSourceId: formData.leadSourceId || undefined,
      details: formData.details.trim(),
      phoneBook: formData.phoneBook,
      syncedToGoogleContacts: formData.autoDownloadVcard ? true : (editingCustomer?.syncedToGoogleContacts || false),
    };

    let savedCust: Customer;
    if (editingCustomer) {
      updateCustomer(editingCustomer.id, payload);
      savedCust = { ...editingCustomer, ...payload };
    } else {
      savedCust = addCustomer(payload);
    }

    if (formData.autoDownloadVcard) {
      syncCustomerToContacts(savedCust.id);
    }

    setIsCreateModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete customer record for "${name}"?`)) {
      deleteCustomer(id);
    }
  };

  // GPS Location Pin function
  const handleGetGpsLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const gmapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
        setFormData(prev => ({
          ...prev,
          mapUrl: gmapsLink,
          area: prev.area || 'Madurai (GPS Pinned)'
        }));
        setIsGettingGps(false);
      },
      (err) => {
        setIsGettingGps(false);
        setGpsError(`GPS pin failed: ${err.message}. You can enter a Google Maps link or area manually.`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Auto-generate Madurai Google Maps search link from current area input
  const handleAutoGenerateMapLink = () => {
    if (!formData.area.trim()) {
      alert('Please enter an area name first (e.g. Villapuram, Arasaradi, Anna Nagar)');
      return;
    }
    const query = `${formData.area.trim()}, Madurai, Tamil Nadu`;
    const link = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    setFormData(prev => ({ ...prev, mapUrl: link }));
  };

  // Bulk sync all customers to master vCard (.vcf)
  const handleSyncAllCustomersToGoogleContacts = () => {
    if (customers.length === 0) return;

    let masterVcf = '';
    customers.forEach(cust => {
      masterVcf += generateVCard({
        name: cust.name,
        phone: cust.phone,
        area: cust.area,
        notes: `Lead Reference: ${cust.reference || 'Direct'} | ${cust.details || ''}`,
        mapUrl: cust.mapUrl,
        category: cust.about,
        company: 'Spider Grid Solutions Client',
      });
      updateCustomer(cust.id, { phoneBook: 'Yes', syncedToGoogleContacts: true });
    });

    downloadVCard(`SGS-All-Customers-GoogleContacts-${todayLocal()}`, masterVcf);
    setCustomerToast(`Successfully exported Google Contacts file (.vcf) with all ${customers.length} Customers!`);
    setTimeout(() => setCustomerToast(null), 4000);
  };

  return (
    <div className="sgs-page">
      {customerToast && (
        <div className="fixed top-4 right-3 sm:right-6 z-50 max-w-[calc(100vw-1.5rem)] bg-emerald-600 text-white px-3.5 py-2 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span className="truncate">{customerToast}</span>
        </div>
      )}
      
      {/* Compact Header & Action Bar */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pb-3 border-b ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className={`text-base sm:text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Customer Database
            </h1>
            <span className={`text-xs font-mono font-semibold tabular-nums ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
              ({customers.length})
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Verified client accounts, Google Maps pins, lead sources &amp; contacts sync.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
          {onOpenGoogleContactsModal && (
            <button
              onClick={onOpenGoogleContactsModal}
              className={`h-9 sm:h-9 px-2.5 sm:px-3 text-xs font-semibold rounded-lg border transition-colors cursor-pointer flex items-center justify-center gap-1.5 min-w-0 ${
                isDark
                  ? 'bg-blue-950/70 border-blue-800 text-blue-200 hover:bg-blue-900/80 hover:text-white'
                  : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
              }`}
              title="Open Google Contacts live cloud sync and browse modal"
            >
              <Users className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="truncate">Google Contacts</span>
            </button>
          )}

          <button
            onClick={handleSyncAllCustomersToGoogleContacts}
            className={`h-9 sm:h-9 px-2.5 sm:px-3 text-xs font-semibold rounded-lg border transition-colors cursor-pointer flex items-center justify-center gap-1.5 min-w-0 ${
              isDark 
                ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800' 
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
            title="Download all customers as master Google Contacts vCard (.vcf) file"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="truncate">Export .vcf</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="col-span-2 sm:col-span-1 h-10 sm:h-9 px-3.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs shadow-blue-600/20 flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Add New Customer / Lead</span>
          </button>
        </div>
      </div>

      {/* Compact Filter & Search Bar */}
      <div className={`sgs-toolbar ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200/90 shadow-2xs'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
          
          {/* Search Box */}
          <div className="relative md:col-span-5 min-w-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, phone, area, lead or notes..."
              className={`w-full h-9 sm:h-9 rounded-lg pl-9 pr-8 text-xs transition-colors focus:outline-none ${
                isDark 
                  ? 'bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:border-blue-500' 
                  : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600'
              }`}
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 md:col-span-7 gap-2 min-w-0">
            {/* Area Filter */}
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              aria-label="Filter by Area"
              className={`w-full min-w-0 h-9 rounded-lg px-2.5 text-xs focus:outline-none ${
                isDark 
                  ? 'bg-slate-950 border border-slate-800 text-slate-300 focus:border-blue-500' 
                  : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
              }`}
            >
              <option value="all">All Areas ({areas.length})</option>
              {areas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>

            {/* Lead Reference Filter */}
            <select
              value={selectedReference}
              onChange={(e) => setSelectedReference(e.target.value)}
              aria-label="Filter by Lead Source"
              className={`w-full min-w-0 h-9 rounded-lg px-2.5 text-xs focus:outline-none ${
                isDark 
                  ? 'bg-slate-950 border border-slate-800 text-slate-300 focus:border-blue-500' 
                  : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
              }`}
            >
              <option value="all">All Lead Sources ({references.length})</option>
              {references.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>

            {/* Category / About Filter */}
            <select
              value={selectedAbout}
              onChange={(e) => setSelectedAbout(e.target.value)}
              aria-label="Filter by Category"
              className={`w-full min-w-0 h-9 rounded-lg px-2.5 text-xs focus:outline-none ${
                isDark 
                  ? 'bg-slate-950 border border-slate-800 text-slate-300 focus:border-blue-500' 
                  : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
              }`}
            >
              <option value="all">All Categories</option>
              {aboutCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filter Summary */}
        <div className={`flex items-center justify-between gap-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          <span className="truncate">
            Showing <strong className={`font-mono tabular-nums ${isDark ? 'text-white' : 'text-blue-900'}`}>{filteredCustomers.length}</strong> of <span className="font-mono tabular-nums">{customers.length}</span> customers
          </span>
          {(selectedArea !== 'all' || selectedReference !== 'all' || selectedAbout !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedArea('all');
                setSelectedReference('all');
                setSelectedAbout('all');
              }}
              className={`text-xs font-semibold shrink-0 cursor-pointer ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* MOBILE CUSTOMER CARDS (< md) — Zero Horizontal Scrolling */}
      <div className="md:hidden space-y-2.5">
        {filteredCustomers.length === 0 ? (
          <div className={`p-8 text-center rounded-xl border border-dashed text-xs ${
            isDark ? 'border-slate-800 bg-slate-900/50 text-slate-400' : 'border-slate-200 bg-white text-slate-500'
          }`}>
            No customer matches found with current search filters.
          </div>
        ) : (
          filteredCustomers.map((customer, idx) => {
            const cleanPhone = customer.phone ? customer.phone.replace(/[^0-9]/g, '') : '';
            const waUrl = cleanPhone 
              ? `https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${encodeURIComponent(`Hello ${customer.name}, greetings from Spider Grid Solutions (SGS) Madurai!`)}`
              : null;
            const mapLink = customer.mapUrl || (customer.area ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${customer.area}, Madurai, Tamil Nadu`)}` : null);
            const fin = customerFinanceMap.get(customer.id);

            return (
              <div
                key={`mob-${customer.id}-${idx}`}
                className={`p-3 rounded-xl border space-y-2 ${
                  isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90 shadow-2xs'
                }`}
              >
                {/* Row 1: Name + SlNo + Pending/Settled */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5 min-w-0">
                      <span className="text-[11px] font-mono text-slate-400 shrink-0">#{customer.slNo}</span>
                      <h3 className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {customer.name}
                      </h3>
                    </div>
                    <div className={`flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span>{customer.about || 'General'}</span>
                      <span aria-hidden="true">·</span>
                      <span className={`font-semibold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                        {customer.reference || 'Direct'}
                      </span>
                    </div>
                  </div>

                  {fin && (fin.totalBills > 0 || fin.unallocatedCredit > 0) && (
                    <button
                      type="button"
                      onClick={() => setLedgerCustomer(customer)}
                      className="text-right shrink-0 cursor-pointer"
                    >
                      {fin.totalPending > 0 ? (
                        <span className="text-xs font-mono font-bold text-amber-500 tabular-nums block">
                          Due ₹{fin.totalPending.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-500 block">Settled</span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono">
                        {fin.totalBills} bill{fin.totalBills === 1 ? '' : 's'}
                      </span>
                    </button>
                  )}
                </div>

                {/* Row 2: Phone & Location + Maps */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  {customer.phone ? (
                    <a
                      href={`tel:${customer.phone}`}
                      className={`inline-flex items-center gap-1.5 font-mono font-semibold tabular-nums ${
                        isDark ? 'text-sky-400' : 'text-blue-700'
                      }`}
                    >
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{customer.phone}</span>
                    </a>
                  ) : (
                    <span className="text-slate-400 text-[11px]">No phone</span>
                  )}

                  {customer.area && (
                    <div className="flex items-center gap-1.5 min-w-0 max-w-full">
                      <span className={`truncate text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        {customer.area}
                      </span>
                      {mapLink && (
                        <a
                          href={mapLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border shrink-0 ${
                            isDark 
                              ? 'bg-blue-950/60 border-blue-800 text-blue-400' 
                              : 'bg-blue-50 border-blue-200 text-blue-700'
                          }`}
                        >
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>Maps</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {customer.details && (
                  <p className={`text-[11px] line-clamp-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {customer.details}
                  </p>
                )}

                {/* Row 3: Accessible Actions Bar */}
                <div className={`pt-2 border-t flex items-center justify-between gap-1.5 flex-wrap ${
                  isDark ? 'border-slate-800' : 'border-slate-100'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenNewJobWithCustomer(customer)}
                      className="h-8 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Wrench className="w-3 h-3" />
                      <span>New Job</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setLedgerCustomer(customer)}
                      className={`h-8 px-2.5 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer ${
                        (fin?.totalPending || 0) > 0
                          ? isDark ? 'bg-amber-950/50 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
                          : isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <Receipt className="w-3 h-3" />
                      <span>Bills</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                          isDark ? 'bg-slate-800 border-slate-700 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        }`}
                        title="WhatsApp Chat"
                        aria-label="WhatsApp Chat"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {cleanPhone && (
                      <a
                        href={`https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${encodeURIComponent(`Hello ${customer.name}, greetings from Spider Grid Solutions (SGS)! Here is our workshop location & directions in Madurai: https://maps.google.com/?q=Spider+Grid+Solutions+Madurai (Area: ${customer.area || 'Madurai'}). Call +91 9176795665 if you need navigation help!`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                          isDark ? 'bg-slate-800 border-slate-700 text-sky-400' : 'bg-sky-50 border-sky-200 text-sky-700'
                        }`}
                        title="Send Workshop Directions via WhatsApp"
                        aria-label="Send Directions"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => syncCustomerToContacts(customer.id)}
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer ${
                        customer.phoneBook === 'Yes'
                          ? (isDark ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                          : (isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600')
                      }`}
                      title={customer.phoneBook === 'Yes' ? 'Synced to Contacts (click to re-download .vcf)' : 'Sync to Contacts (.vcf)'}
                      aria-label="Sync contact"
                    >
                      {customer.phoneBook === 'Yes' ? <UserCheck className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(customer)}
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer ${
                        isDark ? 'bg-slate-800 border-slate-700 text-sky-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                      title="Edit Customer"
                      aria-label="Edit Customer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(customer.id, customer.name)}
                        className={`w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer ${
                          isDark ? 'bg-slate-800 border-slate-700 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-600'
                        }`}
                        title="Delete Customer"
                        aria-label="Delete Customer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP CUSTOMER TABLE (md and above) */}
      <div className={`hidden md:block rounded-xl border overflow-hidden ${
        isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200/90 bg-white shadow-2xs'
      }`}>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs min-w-[780px]">
            <thead className={`border-b font-semibold text-[11px] ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Customer Name</th>
                <th className="py-2.5 px-3">Location &amp; Maps</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Lead Source</th>
                <th className="py-2.5 px-3">Details</th>
                <th className="py-2.5 px-3 text-right">Bills &amp; Pending</th>
                <th className="py-2.5 px-3 text-center">Contacts</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/70' : 'divide-slate-100'}`}>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={10} className={`py-10 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    No customer matches found with current search filters.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer, idx) => {
                  const cleanPhone = customer.phone ? customer.phone.replace(/[^0-9]/g, '') : '';
                  const waUrl = cleanPhone 
                    ? `https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${encodeURIComponent(`Hello ${customer.name}, greetings from Spider Grid Solutions (SGS) Madurai!`)}`
                    : null;

                  const mapLink = customer.mapUrl || (customer.area ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${customer.area}, Madurai, Tamil Nadu`)}` : null);

                  return (
                    <tr 
                      key={`${customer.id}-${idx}`}
                      className={`transition-colors group ${
                        isDark ? 'hover:bg-slate-800/40' : 'hover:bg-blue-50/40'
                      }`}
                    >
                      <td className={`py-2 px-3 text-center font-mono tabular-nums ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {customer.slNo}
                      </td>

                      <td className={`py-2 px-3 font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <span className="font-bold">{customer.name}</span>
                      </td>

                      {/* Location with Clickable Google Maps Pin */}
                      <td className={`py-2 px-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {customer.area ? (
                          <div className="flex items-center gap-1.5">
                            <span className="truncate max-w-[130px]" title={customer.area}>{customer.area}</span>
                            {mapLink && (
                              <a
                                href={mapLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer shrink-0 ${
                                  isDark 
                                    ? 'bg-blue-950/60 border border-blue-800 text-blue-400 hover:bg-blue-900/80' 
                                    : 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100'
                                }`}
                                title="Open location in Google Maps"
                              >
                                <MapPin className="w-2.5 h-2.5 shrink-0" />
                                <span>Maps</span>
                                <ExternalLink className="w-2 h-2" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className={isDark ? 'text-slate-600' : 'text-slate-400'}>—</span>
                        )}
                      </td>

                      <td className={`py-2 px-3 font-mono tabular-nums whitespace-nowrap ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {customer.phone ? (
                          <div className="flex items-center gap-1.5">
                            <span>{customer.phone}</span>
                            <a
                              href={`tel:${customer.phone}`}
                              className={`p-0.5 rounded transition-colors ${
                                isDark ? 'text-slate-500 hover:text-sky-400' : 'text-blue-600 hover:text-blue-800'
                              }`}
                              title="Call customer"
                            >
                              <Phone className="w-3 h-3" />
                            </a>
                          </div>
                        ) : (
                          <span className={isDark ? 'text-slate-600' : 'text-slate-400'}>No phone</span>
                        )}
                      </td>

                      <td className={`py-2 px-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span className="text-[11px] font-medium">
                          {customer.about || 'General'}
                        </span>
                      </td>

                      {/* Lead Source */}
                      <td className="py-2 px-3">
                        <span className={`font-semibold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                          {customer.reference || 'Direct'}
                        </span>
                      </td>

                      <td className={`py-2 px-3 max-w-[180px] truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`} title={customer.details}>
                        {customer.details || '—'}
                      </td>

                      {/* Bills & Pending Summary */}
                      <td className="py-2 px-3 text-right font-mono tabular-nums">
                        {(() => {
                          const fin = customerFinanceMap.get(customer.id);
                          if (!fin || (fin.totalBills === 0 && fin.unallocatedCredit === 0)) {
                            return <span className={isDark ? 'text-slate-600' : 'text-slate-400'}>—</span>;
                          }
                          return (
                            <button
                              type="button"
                              onClick={() => setLedgerCustomer(customer)}
                              className="text-right hover:underline cursor-pointer space-y-0.5 ml-auto block"
                              title="Click to inspect all bills and collect payment"
                            >
                              <div className="flex items-center justify-end gap-1.5">
                                <span className="text-[10px] text-blue-500 font-bold">
                                  {fin.totalBills}B
                                </span>
                                {fin.totalPending > 0 ? (
                                  <span className="font-bold text-amber-500">
                                    Due ₹{fin.totalPending.toLocaleString('en-IN')}
                                  </span>
                                ) : (
                                  <span className="font-bold text-emerald-500">Settled</span>
                                )}
                              </div>
                              <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                ₹{fin.totalBilled.toLocaleString('en-IN')} / ₹{fin.totalPaid.toLocaleString('en-IN')}
                              </div>
                              {fin.unallocatedCredit > 0 && (
                                <div className="text-[10px] text-cyan-500 font-semibold">
                                  Cr ₹{fin.unallocatedCredit.toLocaleString('en-IN')}
                                </div>
                              )}
                            </button>
                          );
                        })()}
                      </td>

                      {/* Google Contacts status & 1-click sync */}
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => syncCustomerToContacts(customer.id)}
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border transition-all cursor-pointer ${
                            customer.phoneBook === 'Yes'
                              ? (isDark ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                              : (isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200')
                          }`}
                          title={customer.phoneBook === 'Yes' ? 'Synced to Phone Contacts. Click to re-download .vcf' : 'Click to Sync with Google Contacts (.vcf)'}
                        >
                          {customer.phoneBook === 'Yes' ? (
                            <>
                              <UserCheck className="w-3 h-3 text-emerald-500" />
                              <span>Synced</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-3 h-3 text-blue-500" />
                              <span>Sync</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Bills Ledger & Collect */}
                          <button
                            type="button"
                            onClick={() => setLedgerCustomer(customer)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              (customerFinanceMap.get(customer.id)?.totalPending || 0) > 0
                                ? 'text-amber-500 hover:bg-amber-500/10'
                                : (isDark ? 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800' : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50')
                            }`}
                            title="View Customer Bills Ledger & Collect Payment"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>

                          {/* Create Job Card */}
                          <button
                            onClick={() => onOpenNewJobWithCustomer(customer)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isDark ? 'text-slate-400 hover:text-blue-300 hover:bg-slate-800' : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50'
                            }`}
                            title="Create Service/Sales Job Card"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </button>

                          {/* WhatsApp Chat */}
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isDark ? 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                              }`}
                              title="Open WhatsApp Chat"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {/* WhatsApp Direction Button */}
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${encodeURIComponent(`Hello ${customer.name}, greetings from Spider Grid Solutions (SGS)! Here is our workshop location & directions in Madurai: https://maps.google.com/?q=Spider+Grid+Solutions+Madurai (Area: ${customer.area || 'Madurai'}). Call +91 9176795665 if you need navigation help!`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isDark ? 'text-slate-400 hover:text-sky-400 hover:bg-slate-800' : 'text-sky-600 hover:text-sky-700 hover:bg-sky-50'
                              }`}
                              title="Send Google Maps Workshop Directions to Customer via WhatsApp"
                            >
                              <Navigation className="w-3.5 h-3.5 text-sky-500" />
                            </a>
                          )}

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEditModal(customer)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isDark ? 'text-slate-400 hover:text-sky-300 hover:bg-slate-800' : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50'
                            }`}
                            title="Edit Record"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete - Admin Only */}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(customer.id, customer.name)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isDark ? 'text-slate-500 hover:text-rose-400 hover:bg-slate-800' : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                              }`}
                              title="Delete Record (Admin Only)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal — Full-Width Mobile Sheet + Centered Desktop Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className={`w-full max-w-full sm:max-w-xl h-[96dvh] sm:h-auto sm:max-h-[90dvh] rounded-t-2xl sm:rounded-2xl border shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Sticky Modal Header */}
            <div className={`px-3.5 sm:px-5 py-3 border-b flex items-center justify-between gap-2 shrink-0 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className="min-w-0">
                <h3 className={`text-sm sm:text-base font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {editingCustomer ? 'Edit Customer' : 'Add New Customer / Lead'}
                </h3>
                <p className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Client profile, Maps pin, lead source &amp; contacts sync
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className={`p-1.5 rounded-lg shrink-0 cursor-pointer ${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Form Body */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3.5 sm:px-5 py-3 space-y-3">
                {canPickPhoneContacts && (
                  <button
                    type="button"
                    onClick={pickFromPhoneContacts}
                    className="w-full h-9 rounded-lg px-3 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
                  >
                    Pick from phone contacts
                  </button>
                )}

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Customer / Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Karthikeyen, RM Mahal, Dinesh Lenovo"
                    className={`w-full h-9 rounded-lg px-3 text-xs focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                        : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="min-w-0">
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. 9176795665"
                      className={`w-full h-9 rounded-lg px-3 text-xs font-mono focus:outline-none ${
                        isDark 
                          ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                          : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                      }`}
                    />
                  </div>

                  <div className="min-w-0">
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Area / Location in Madurai
                    </label>
                    <input
                      type="text"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      placeholder="e.g. Villapuram, Arasaradi"
                      className={`w-full h-9 rounded-lg px-3 text-xs focus:outline-none ${
                        isDark 
                          ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                          : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                      }`}
                    />
                  </div>
                </div>

                {/* Google Maps Location Link Input & Helper Tools */}
                <div className={`p-2.5 sm:p-3 rounded-xl border space-y-2 ${
                  isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label className={`flex items-center gap-1.5 text-xs font-semibold ${isDark ? 'text-sky-400' : 'text-blue-700'}`}>
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>Google Maps Location Link</span>
                    </label>
                    {formData.mapUrl && (
                      <a
                        href={formData.mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold shrink-0"
                      >
                        <span>Test Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <input
                    type="url"
                    value={formData.mapUrl}
                    onChange={(e) => setFormData({ ...formData, mapUrl: e.target.value })}
                    placeholder="https://maps.google.com/?q=..."
                    className={`w-full h-9 rounded-lg px-3 text-xs font-mono focus:outline-none ${
                      isDark 
                        ? 'bg-slate-900 border border-slate-700 text-slate-200 focus:border-sky-500' 
                        : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                    }`}
                  />

                  {gpsError && (
                    <p className="text-[11px] text-rose-500">{gpsError}</p>
                  )}

                  {/* Helper buttons for Map Link */}
                  <div className="grid grid-cols-2 sm:flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleGetGpsLocation}
                      disabled={isGettingGps}
                      className={`h-8 px-2.5 text-[11px] font-semibold rounded-md border transition-colors cursor-pointer inline-flex items-center justify-center gap-1 min-w-0 ${
                        isDark 
                          ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800' 
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Navigation className={`w-3 h-3 text-rose-500 shrink-0 ${isGettingGps ? 'animate-spin' : ''}`} />
                      <span className="truncate">{isGettingGps ? 'Detecting...' : 'Pin GPS'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAutoGenerateMapLink}
                      className={`h-8 px-2.5 text-[11px] font-semibold rounded-md border transition-colors cursor-pointer inline-flex items-center justify-center gap-1 min-w-0 ${
                        isDark 
                          ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800' 
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                      <span className="truncate">From Area</span>
                    </button>
                  </div>
                </div>

                {/* Lead Source Search & Select Autocomplete */}
                <div className="relative">
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Lead Source / Referrer *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={leadSearchQuery}
                      onChange={(e) => {
                        setLeadSearchQuery(e.target.value);
                        setFormData(prev => ({ ...prev, reference: e.target.value, leadSourceId: '' }));
                        setIsLeadDropdownOpen(true);
                      }}
                      onFocus={() => setIsLeadDropdownOpen(true)}
                      placeholder="Search lead person or type custom source..."
                      className={`w-full h-9 rounded-lg pl-3 pr-8 text-xs focus:outline-none ${
                        isDark 
                          ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                          : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setIsLeadDropdownOpen(prev => !prev)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      aria-label="Toggle lead source list"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Autocomplete Dropdown */}
                  {isLeadDropdownOpen && (
                    <div className={`absolute z-30 left-0 right-0 mt-1 rounded-xl border shadow-xl max-h-48 overflow-y-auto ${
                      isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}>
                      <div className="p-1.5 space-y-0.5">
                        <div className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b flex items-center justify-between ${
                          isDark ? 'border-slate-800' : 'border-slate-100'
                        }`}>
                          <span>Registered Lead Sources</span>
                          <span>{matchingLeadSources.length}</span>
                        </div>

                        {matchingLeadSources.map((lead) => (
                          <div
                            key={lead.id}
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                reference: lead.name,
                                leadSourceId: lead.id,
                              }));
                              setLeadSearchQuery(lead.name);
                              setIsLeadDropdownOpen(false);
                            }}
                            className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                              isDark ? 'hover:bg-slate-800' : 'hover:bg-blue-50'
                            }`}
                          >
                            <div className="min-w-0 truncate">
                              <span className="font-bold">{lead.name}</span>
                              {lead.companyOrOccupation && (
                                <span className="text-[11px] text-slate-500 ml-1">({lead.companyOrOccupation})</span>
                              )}
                            </div>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                              lead.category === 'school_friend' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' :
                              lead.category === 'relative' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                              'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {lead.category.replace(/_/g, ' ')}
                            </span>
                          </div>
                        ))}

                        {leadSearchQuery.trim() && !leadSources.some(l => l.name.toLowerCase() === leadSearchQuery.trim().toLowerCase()) && (
                          <div
                            onClick={() => {
                              const newLead = addLeadSource({
                                name: leadSearchQuery.trim(),
                                category: 'network',
                                phone: formData.phone || '',
                                area: formData.area || 'Madurai',
                                notes: `Auto-registered via Customer ${formData.name}`,
                                syncedWithGoogleContacts: false,
                              });
                              setFormData(prev => ({
                                ...prev,
                                reference: newLead.name,
                                leadSourceId: newLead.id,
                              }));
                              setIsLeadDropdownOpen(false);
                            }}
                            className={`p-2 rounded-lg text-xs cursor-pointer border-t border-dashed transition-colors flex items-center gap-1.5 ${
                              isDark ? 'border-slate-800 text-blue-400 hover:bg-slate-800' : 'border-slate-200 text-blue-600 hover:bg-blue-50'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Register "{leadSearchQuery}" as new Lead Source</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="min-w-0">
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Industry / Category
                    </label>
                    <input
                      type="text"
                      value={formData.about}
                      onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                      placeholder="e.g. General, IT, Food, Civil"
                      className={`w-full h-9 rounded-lg px-3 text-xs focus:outline-none ${
                        isDark 
                          ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                          : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                      }`}
                    />
                  </div>

                  <div className="min-w-0">
                    <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Occupation / Details
                    </label>
                    <input
                      type="text"
                      value={formData.details}
                      onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                      placeholder="e.g. School Manager, Gas distributor"
                      className={`w-full h-9 rounded-lg px-3 text-xs focus:outline-none ${
                        isDark 
                          ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                          : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                      }`}
                    />
                  </div>
                </div>

                {/* Sync to Contacts checkboxes */}
                <div className={`space-y-2 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                  <label htmlFor="autoVcardCustCheck" className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id="autoVcardCustCheck"
                      checked={formData.autoDownloadVcard}
                      onChange={(e) => setFormData({ ...formData, autoDownloadVcard: e.target.checked })}
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer shrink-0"
                    />
                    <span className={`text-xs font-medium leading-snug ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      Sync with Google Contacts (Download .vcf Card on Save)
                    </span>
                  </label>

                  <label htmlFor="phoneBookCheck" className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id="phoneBookCheck"
                      checked={formData.phoneBook === 'Yes'}
                      onChange={(e) => setFormData({ ...formData, phoneBook: e.target.checked ? 'Yes' : 'No' })}
                      className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer shrink-0"
                    />
                    <span className={`text-xs leading-snug ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Mark as saved in SGS Phone Book Contacts
                    </span>
                  </label>
                </div>
              </div>

              {/* Sticky Modal Footer — Always Visible Above Mobile Keyboard */}
              <div className={`px-3.5 sm:px-5 py-3 border-t flex items-center justify-end gap-2 shrink-0 ${
                isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'
              }`}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className={`flex-1 sm:flex-none h-10 sm:h-9 px-4 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    isDark ? 'text-slate-300 hover:text-white bg-slate-800' : 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 sm:flex-none h-10 sm:h-9 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs shadow-blue-600/20 cursor-pointer"
                >
                  {editingCustomer ? 'Save Changes' : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Financial Ledger & Multi-Bill Modal */}
      {ledgerCustomer && (() => {
        const fin = getCustomerFinancialSummary(ledgerCustomer, invoices, invoicePayments, customerPaymentAllocations);
        return (
          <div className="sgs-modal-backdrop">
            <div className={`sgs-modal-sheet sm:max-w-3xl ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className={`px-3.5 sm:px-5 py-3 border-b flex items-center justify-between gap-2 shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold truncate">{ledgerCustomer.name} — Bills &amp; Ledger</h3>
                  <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {ledgerCustomer.phone || 'No phone'} · {ledgerCustomer.area || 'Madurai'}
                  </p>
                </div>
                <button onClick={() => setLedgerCustomer(null)} className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer shrink-0" aria-label="Close ledger">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 sm:p-4 overflow-y-auto overscroll-contain space-y-3.5 text-xs flex-1 min-h-0">
                {/* Summary KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="text-[10px] uppercase text-slate-400 block">Total Bills</span>
                    <span className="text-sm sm:text-base font-bold font-mono tabular-nums">{fin.totalBills}</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="text-[10px] uppercase text-slate-400 block">Total Billed</span>
                    <span className="text-sm sm:text-base font-bold font-mono tabular-nums text-blue-500">₹{fin.totalBilled.toLocaleString('en-IN')}</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="text-[10px] uppercase text-slate-400 block">Total Paid</span>
                    <span className="text-sm sm:text-base font-bold font-mono tabular-nums text-emerald-500">₹{fin.totalPaid.toLocaleString('en-IN')}</span>
                  </div>
                  <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-amber-950/30 border-amber-900/60' : 'bg-amber-50 border-amber-200'}`}>
                    <span className="text-[10px] uppercase text-amber-500 block">Total Pending</span>
                    <span className="text-sm sm:text-base font-bold font-mono tabular-nums text-amber-500">₹{fin.totalPending.toLocaleString('en-IN')}</span>
                  </div>
                  <div className={`col-span-2 sm:col-span-1 p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="text-[10px] uppercase text-cyan-500 block">Advance Credit</span>
                    <span className="text-sm sm:text-base font-bold font-mono tabular-nums text-cyan-500">₹{fin.unallocatedCredit.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCollectModalState({
                        mode: 'customer_multi',
                        customer: ledgerCustomer,
                      })
                    }
                    className="h-9 px-3.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <IndianRupee className="w-3.5 h-3.5 shrink-0" />
                    <span>Collect Payment (Allocate Across Bills)</span>
                  </button>
                  {fin.pendingInvoices.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setWaPendingCustomer(ledgerCustomer)}
                      className="h-9 px-3.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                      <span>Share Pending via WhatsApp</span>
                    </button>
                  )}
                </div>

                {/* Individual Invoices */}
                <div className="space-y-2">
                  <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-400">
                    Individual Bills ({fin.allInvoices.length})
                  </h4>
                  {fin.allInvoices.length === 0 ? (
                    <p className="text-slate-500 italic py-4 text-center">No invoices recorded for this customer yet.</p>
                  ) : (
                    <>
                      {/* Mobile Bill Cards */}
                      <div className="sm:hidden space-y-2">
                        {fin.allInvoices.map(inv => {
                          const due = amountDue(inv);
                          return (
                            <div
                              key={`m-inv-${inv.id}`}
                              className={`p-2.5 rounded-xl border space-y-1.5 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono font-bold text-blue-500">{inv.invoiceNumber}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  due === 0
                                    ? 'bg-emerald-500/15 text-emerald-500'
                                    : inv.paidAmount > 0
                                      ? 'bg-amber-500/15 text-amber-500'
                                      : 'bg-rose-500/15 text-rose-500'
                                }`}>
                                  {due === 0 ? 'Paid' : inv.paidAmount > 0 ? 'Partial' : 'Unpaid'}
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono tabular-nums">
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-sans">Total</span>
                                  <span>₹{(inv.grandTotal || 0).toLocaleString('en-IN')}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-sans">Paid</span>
                                  <span className="text-emerald-500">₹{(inv.paidAmount || 0).toLocaleString('en-IN')}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block font-sans">Due</span>
                                  <span className="font-bold text-amber-500">₹{due.toLocaleString('en-IN')}</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[11px] font-mono text-slate-400">{inv.date}</span>
                                {due > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCollectModalState({
                                        mode: 'single_invoice',
                                        invoice: inv,
                                        customer: ledgerCustomer,
                                      })
                                    }
                                    className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer"
                                  >
                                    Collect
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Desktop Bill Table */}
                      <div className={`hidden sm:block rounded-xl border overflow-x-auto ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                        <table className="w-full text-left text-xs">
                          <thead className={`text-[10px] uppercase ${isDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-50 text-slate-600'}`}>
                            <tr>
                              <th className="py-2 px-3">Invoice #</th>
                              <th className="py-2 px-3">Date</th>
                              <th className="py-2 px-3 text-right">Bill Total</th>
                              <th className="py-2 px-3 text-right">Paid</th>
                              <th className="py-2 px-3 text-right">Pending Due</th>
                              <th className="py-2 px-3 text-center">Status</th>
                              <th className="py-2 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                            {fin.allInvoices.map(inv => {
                              const due = amountDue(inv);
                              return (
                                <tr key={inv.id}>
                                  <td className="py-2 px-3 font-mono font-bold text-blue-500">{inv.invoiceNumber}</td>
                                  <td className="py-2 px-3 font-mono">{inv.date}</td>
                                  <td className="py-2 px-3 text-right font-mono tabular-nums">₹{(inv.grandTotal || 0).toLocaleString('en-IN')}</td>
                                  <td className="py-2 px-3 text-right font-mono tabular-nums text-emerald-500">₹{(inv.paidAmount || 0).toLocaleString('en-IN')}</td>
                                  <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-amber-500">₹{due.toLocaleString('en-IN')}</td>
                                  <td className="py-2 px-3 text-center">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      due === 0
                                        ? 'bg-emerald-500/15 text-emerald-500'
                                        : inv.paidAmount > 0
                                          ? 'bg-amber-500/15 text-amber-500'
                                          : 'bg-rose-500/15 text-rose-500'
                                    }`}>
                                      {due === 0 ? 'Paid' : inv.paidAmount > 0 ? 'Partial' : 'Unpaid'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    {due > 0 && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setCollectModalState({
                                            mode: 'single_invoice',
                                            invoice: inv,
                                            customer: ledgerCustomer,
                                          })
                                        }
                                        className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold cursor-pointer"
                                      >
                                        Collect
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>

                {/* Payment History */}
                {fin.paymentRecords.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-400">
                      Payment History ({fin.paymentRecords.length})
                    </h4>
                    <div className="space-y-1.5">
                      {fin.paymentRecords.map(p => (
                        <div
                          key={p.id}
                          className={`p-2.5 rounded-lg border flex flex-wrap items-center justify-between gap-2 text-[11px] ${
                            p.isReversed ? 'opacity-60 line-through' : ''
                          } ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-mono font-bold">{p.paymentReference}</span>
                            <span className="mx-1.5 text-slate-400">·</span>
                            <span>{p.date}</span>
                            <span className="mx-1.5 text-slate-400">·</span>
                            <span className="text-blue-500 font-semibold">{p.invoiceNumber || 'Advance / Unallocated'}</span>
                            <span className="mx-1.5 text-slate-400">·</span>
                            <span>{formatAccountLabel(p.accountType, p.bankAccountId, bankAccounts, p.paymentMode)}</span>
                            {p.isReversed && (
                              <span className="ml-2 px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-500 text-[9px] font-bold uppercase no-underline">
                                Reversed
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-bold text-emerald-500 tabular-nums shrink-0">₹{p.amount.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Collect Payment Modal */}
      {collectModalState && (
        <CollectPaymentModal
          isOpen={!!collectModalState}
          onClose={() => setCollectModalState(null)}
          mode={collectModalState.mode}
          invoice={collectModalState.invoice}
          customer={collectModalState.customer}
          onPaymentSaved={(msg) => {
            setCustomerToast(msg);
            setTimeout(() => setCustomerToast(null), 4000);
          }}
        />
      )}

      {/* WhatsApp Combined Pending Modal */}
      {waPendingCustomer && (() => {
        const fin = getCustomerFinancialSummary(waPendingCustomer, invoices, invoicePayments, customerPaymentAllocations);
        return (
          <WhatsAppPendingModal
            isOpen={!!waPendingCustomer}
            onClose={() => setWaPendingCustomer(null)}
            customerName={waPendingCustomer.name}
            customerPhone={waPendingCustomer.phone}
            pendingInvoices={fin.pendingInvoices}
            totalOutstanding={fin.totalPending}
          />
        );
      })()}

    </div>
  );
};
