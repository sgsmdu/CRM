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
  Star
} from 'lucide-react';
import { useSgs } from '../context/SgsContext';
import { Customer, LeadSource } from '../types';

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
    theme 
  } = useSgs();

  const isDark = theme === 'dark';

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedReference, setSelectedReference] = useState<string>('all');
  const [selectedAbout, setSelectedAbout] = useState<string>('all');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerToast, setCustomerToast] = useState<string | null>(null);

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
    <div className="space-y-6">
      {customerToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4" />
          <span>{customerToast}</span>
        </div>
      )}
      
      {/* Header & Stats Banner */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-1 ${
            isDark ? 'text-emerald-400' : 'text-blue-700'
          }`}>
            <span>Customer Directory</span>
            <span>·</span>
            <span>Google Maps Location Pin</span>
            <span>·</span>
            <span>Contacts Sync</span>
          </div>
          <h1 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Customer Database & Verified Accounts ({customers.length})
          </h1>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            31 preloaded verified records detailing customer areas with Google Maps navigation links, lead referrers, and Google Contacts sync.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {onOpenGoogleContactsModal && (
            <button
              onClick={onOpenGoogleContactsModal}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                isDark
                  ? 'bg-blue-950/70 border-blue-800 text-blue-200 hover:bg-blue-900/80 hover:text-white'
                  : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 shadow-xs'
              }`}
              title="Open Google Contacts live cloud sync and browse modal"
            >
              <Users className="w-3.5 h-3.5 text-blue-500" />
              <span>Google Contacts Cloud Sync</span>
            </button>
          )}

          <button
            onClick={handleSyncAllCustomersToGoogleContacts}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              isDark 
                ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800' 
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs'
            }`}
            title="Download all customers as master Google Contacts vCard (.vcf) file"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span>Sync All to Google Contacts (.vcf)</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-md shadow-blue-600/20 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Customer / Lead</span>
          </button>
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
              placeholder="Search by customer name, phone, area, lead reference, or notes..."
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

          {/* Area Filter */}
          <div className="w-full md:w-48">
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
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
          </div>

          {/* Lead Reference Filter */}
          <div className="w-full md:w-52">
            <select
              value={selectedReference}
              onChange={(e) => setSelectedReference(e.target.value)}
              className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
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
          </div>

          {/* Category / About Filter */}
          <div className="w-full md:w-44">
            <select
              value={selectedAbout}
              onChange={(e) => setSelectedAbout(e.target.value)}
              className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
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
        <div className={`flex items-center justify-between text-xs pt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          <span>Showing <strong className={`font-mono ${isDark ? 'text-white' : 'text-blue-900'}`}>{filteredCustomers.length}</strong> of {customers.length} Customers</span>
          {(selectedArea !== 'all' || selectedReference !== 'all' || selectedAbout !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedArea('all');
                setSelectedReference('all');
                setSelectedAbout('all');
              }}
              className={`text-xs font-semibold cursor-pointer ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Customer Data Table */}
      <div className={`rounded-xl border overflow-hidden ${
        isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200/90 bg-white shadow-xs'
      }`}>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead className={`border-b font-semibold uppercase tracking-wider text-[11px] ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Location (Google Maps)</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Lead Source (Referrer)</th>
                <th className="py-3 px-4">Occupation / Details</th>
                <th className="py-3 px-4 text-center">Google Contacts</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/70' : 'divide-slate-100'}`}>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className={`py-12 text-center text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
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
                      <td className={`py-3 px-4 text-center font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {customer.slNo}
                      </td>

                      <td className={`py-3 px-4 font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span 
                            className="inline-flex items-center justify-center p-1 rounded-md text-amber-500 bg-amber-500/15 border border-amber-500/30 shadow-xs shrink-0" 
                            title="Customer"
                          >
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                          </span>
                          <span className="font-bold">{customer.name}</span>
                        </div>
                      </td>

                      {/* Location with Clickable Google Maps Pin */}
                      <td className={`py-3 px-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {customer.area ? (
                          <div className="flex items-center gap-1.5">
                            <span className="truncate max-w-[140px]" title={customer.area}>{customer.area}</span>
                            {mapLink && (
                              <a
                                href={mapLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
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

                      <td className={`py-3 px-4 font-mono tabular-nums ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {customer.phone ? (
                          <div className="flex items-center gap-2">
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

                      <td className={`py-3 px-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {customer.about || 'General'}
                        </span>
                      </td>

                      {/* Lead Source */}
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                          {customer.reference || 'Direct'}
                        </span>
                      </td>

                      <td className={`py-3 px-4 max-w-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`} title={customer.details}>
                        {customer.details || '—'}
                      </td>

                      {/* Google Contacts status & 1-click sync */}
                      <td className="py-3 px-4 text-center">
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

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
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
                              href={`https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${encodeURIComponent(`Hello ${customer.name}, greetings from Spider Grid Solutions (SGS)! Here is our workshop location & directions in Madurai: https://maps.google.com/?q=Spider+Grid+Solutions+Madurai (Area: ${customer.area || 'Madurai'}). Call +91 9677776001 if you need navigation help!`)}`}
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

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(customer.id, customer.name)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isDark ? 'text-slate-500 hover:text-rose-400 hover:bg-slate-800' : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                            }`}
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Add / Edit Customer Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div>
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {editingCustomer ? 'Edit Customer' : 'Add New Customer / Account'}
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Track location with Google Maps, attribution from registered Lead Sources, and Google Contacts sync
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className={`p-1 rounded-lg ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
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
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 9677776001"
                    className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
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
                    placeholder="e.g. Villapuram, Arasaradi"
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                        : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                    }`}
                  />
                </div>
              </div>

              {/* Google Maps Location Link Input & Helper Tools */}
              <div className={`p-3 rounded-xl border space-y-2 ${
                isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <label className={`flex items-center gap-1.5 text-xs font-semibold ${isDark ? 'text-sky-400' : 'text-blue-700'}`}>
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span>Google Maps Location Link</span>
                  </label>
                  {formData.mapUrl && (
                    <a
                      href={formData.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>Test Map Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <input
                  type="url"
                  value={formData.mapUrl}
                  onChange={(e) => setFormData({ ...formData, mapUrl: e.target.value })}
                  placeholder="https://maps.google.com/?q=... or https://maps.app.goo.gl/..."
                  className={`w-full rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                    isDark 
                      ? 'bg-slate-900 border border-slate-700 text-slate-200 focus:border-sky-500' 
                      : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                  }`}
                />

                {gpsError && (
                  <p className="text-[11px] text-rose-500">{gpsError}</p>
                )}

                {/* Helper buttons for Map Link */}
                <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleGetGpsLocation}
                    disabled={isGettingGps}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-all cursor-pointer ${
                      isDark 
                        ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800' 
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-xs'
                    }`}
                  >
                    <Navigation className={`w-3 h-3 text-rose-500 ${isGettingGps ? 'animate-spin' : ''}`} />
                    <span>{isGettingGps ? 'Detecting GPS...' : 'Pin Current GPS Location'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAutoGenerateMapLink}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-all cursor-pointer ${
                      isDark 
                        ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800' 
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-xs'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Auto-Generate from Area</span>
                  </button>
                </div>
              </div>

              {/* Lead Source Search & Select Autocomplete */}
              <div className="relative">
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Lead Source / Referrer (Search & Select Registered Leads) *
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
                    placeholder="Search registered lead person or type custom (e.g. Vivek Real Wire, Sathesh Kumar)"
                    className={`w-full rounded-lg pl-3 pr-8 py-2 text-xs focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                        : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setIsLeadDropdownOpen(prev => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Autocomplete Dropdown */}
                {isLeadDropdownOpen && (
                  <div className={`absolute z-30 left-0 right-0 mt-1 rounded-xl border shadow-xl max-h-52 overflow-y-auto ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}>
                    <div className="p-1.5 space-y-0.5">
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span>Select Registered Lead Source</span>
                        <span>{matchingLeadSources.length} options</span>
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
                          className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                            isDark ? 'hover:bg-slate-800' : 'hover:bg-blue-50'
                          }`}
                        >
                          <div>
                            <span className="font-bold">{lead.name}</span>
                            {lead.companyOrOccupation && (
                              <span className="text-[11px] text-slate-500 ml-1.5">({lead.companyOrOccupation})</span>
                            )}
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
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
                            // Register on the spot
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
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Register "{leadSearchQuery}" as a new Lead Source</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Industry / Category (About)
                  </label>
                  <input
                    type="text"
                    value={formData.about}
                    onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                    placeholder="e.g. General, IT, Food, Teacher, Civil"
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                        : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Occupation / Customer Details
                  </label>
                  <input
                    type="text"
                    value={formData.details}
                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                    placeholder="e.g. School Manager, Gas distributor"
                    className={`w-full rounded-lg px-3 py-2 text-xs focus:outline-none ${
                      isDark 
                        ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' 
                        : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                    }`}
                  />
                </div>
              </div>

              {/* Sync to Contacts checkbox */}
              <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoVcardCustCheck"
                    checked={formData.autoDownloadVcard}
                    onChange={(e) => setFormData({ ...formData, autoDownloadVcard: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="autoVcardCustCheck" className={`text-xs cursor-pointer font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    Sync with Google Contacts (Download .vcf Card on Save)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="phoneBookCheck"
                    checked={formData.phoneBook === 'Yes'}
                    onChange={(e) => setFormData({ ...formData, phoneBook: e.target.checked ? 'Yes' : 'No' })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="phoneBookCheck" className={`text-xs cursor-pointer ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Mark as saved in SGS Phone Book Contacts
                  </label>
                </div>
              </div>

              <div className={`flex items-center justify-end gap-3 pt-4 border-t ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
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
                  {editingCustomer ? 'Save Changes' : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
