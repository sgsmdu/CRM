import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Upload, 
  RefreshCw, 
  ExternalLink,
  Phone,
  Building2,
  Search,
  Check,
  UserPlus
} from 'lucide-react';
import { useSgs } from '../context/SgsContext';
import { 
  initAuth, 
  googleSignIn, 
  getAccessToken, 
  logout, 
  getCurrentUser 
} from '../services/googleAuth';
import { 
  getGoogleContacts, 
  syncCustomerToGoogleContacts, 
  syncLeadSourceToGoogleContacts,
  createGoogleContact,
  GoogleContactPerson 
} from '../services/googleContactsService';
import { Customer, LeadSource } from '../types';

interface GoogleContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCustomer?: Customer;
  targetLead?: LeadSource;
}

export const GoogleContactsModal: React.FC<GoogleContactsModalProps> = ({
  isOpen,
  onClose,
  targetCustomer,
  targetLead,
}) => {
  const { customers, leadSources, addCustomer, theme } = useSgs();
  const isDark = theme === 'dark';

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; message: string } | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  // Contacts browsing
  const [activeTab, setActiveTab] = useState<'sync' | 'browse'>('sync');
  const [googleContactsList, setGoogleContactsList] = useState<GoogleContactPerson[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [contactsSearch, setContactsSearch] = useState('');
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);

  // Initialize Auth state
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = initAuth(
      (user, accessToken) => {
        setCurrentUser(user);
        setToken(accessToken);
        setAuthError(null);
      },
      () => {
        setCurrentUser(null);
        setToken(null);
      }
    );

    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      getAccessToken().then(tok => {
        if (tok) setToken(tok);
      });
    }

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setToken(res.accessToken);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Google Sign-in failed. Please ensure popup blocker is disabled.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    setToken(null);
    setGoogleContactsList([]);
  };

  // Sync Single Customer
  const handleSyncSingleCustomer = async (cust: Customer) => {
    if (!token) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Sync Customer to Google Contacts',
      description: `Create contact "${cust.name} (SGS Client)" with phone ${cust.phone} in your Google Contacts?`,
      confirmLabel: 'Confirm & Sync',
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsSyncing(true);
        setSyncSuccess(null);
        try {
          await syncCustomerToGoogleContacts(token, cust);
          setSyncSuccess(`Successfully synced "${cust.name}" to your Google Contacts!`);
        } catch (err: any) {
          setAuthError(err.message || 'Failed to sync contact');
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  // Sync Single Lead
  const handleSyncSingleLead = async (lead: LeadSource) => {
    if (!token) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Sync Lead to Google Contacts',
      description: `Create contact "${lead.name} (SGS Referrer)" with phone ${lead.phone} in your Google Contacts?`,
      confirmLabel: 'Confirm & Sync',
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsSyncing(true);
        setSyncSuccess(null);
        try {
          await syncLeadSourceToGoogleContacts(token, lead);
          setSyncSuccess(`Successfully synced "${lead.name}" to your Google Contacts!`);
        } catch (err: any) {
          setAuthError(err.message || 'Failed to sync lead');
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  // Batch Sync Customers
  const handleBatchSyncCustomers = () => {
    if (!token) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Sync All Customers to Google Contacts',
      description: `This will create or sync ${customers.length} customer records to your personal Google Contacts with phone numbers and Madurai area tags. Proceed?`,
      confirmLabel: `Sync ${customers.length} Customers`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsSyncing(true);
        setSyncSuccess(null);
        try {
          let count = 0;
          for (const cust of customers) {
            count++;
            setSyncProgress({
              current: count,
              total: customers.length,
              message: `Syncing ${cust.name}... (${count}/${customers.length})`,
            });
            await syncCustomerToGoogleContacts(token, cust).catch(err => {
              console.warn(`Failed to sync ${cust.name}:`, err);
            });
          }
          setSyncSuccess(`All ${customers.length} customers successfully synced to your Google Contacts!`);
        } catch (err: any) {
          setAuthError(err.message || 'Error during batch sync');
        } finally {
          setIsSyncing(false);
          setSyncProgress(null);
        }
      },
    });
  };

  // Batch Sync Leads
  const handleBatchSyncLeads = () => {
    if (!token) return;

    setConfirmDialog({
      isOpen: true,
      title: 'Sync All Lead Sources to Google Contacts',
      description: `This will sync ${leadSources.length} referral partners & school/business network leads to your Google Contacts. Proceed?`,
      confirmLabel: `Sync ${leadSources.length} Leads`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setIsSyncing(true);
        setSyncSuccess(null);
        try {
          let count = 0;
          for (const lead of leadSources) {
            count++;
            setSyncProgress({
              current: count,
              total: leadSources.length,
              message: `Syncing ${lead.name}... (${count}/${leadSources.length})`,
            });
            await syncLeadSourceToGoogleContacts(token, lead).catch(err => {
              console.warn(`Failed to sync ${lead.name}:`, err);
            });
          }
          setSyncSuccess(`All ${leadSources.length} referral sources synced to your Google Contacts!`);
        } catch (err: any) {
          setAuthError(err.message || 'Error during lead sync');
        } finally {
          setIsSyncing(false);
          setSyncProgress(null);
        }
      },
    });
  };

  // Load Contacts from Google
  const handleLoadGoogleContacts = async () => {
    if (!token) return;
    setIsLoadingContacts(true);
    setAuthError(null);
    try {
      const list = await getGoogleContacts(token, 100);
      setGoogleContactsList(list);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to fetch Google Contacts');
    } finally {
      setIsLoadingContacts(false);
    }
  };

  // Import contact into CRM
  const handleImportContactToCrm = (contact: GoogleContactPerson) => {
    addCustomer({
      name: contact.name,
      area: contact.address || 'Madurai',
      phone: contact.phone || '',
      about: contact.organization || 'Imported from Google Contacts',
      reference: 'Google Contacts Import',
      details: contact.notes || 'Imported via Google People API',
      phoneBook: 'Yes',
    });

    setImportedIds(prev => new Set([...prev, contact.resourceName]));
  };

  const filteredGoogleContacts = googleContactsList.filter(c => {
    const q = contactsSearch.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email && c.email.toLowerCase().includes(q));
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className={`border rounded-2xl w-full max-w-2xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">Google Contacts Sync</h3>
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  People API
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Synchronize clients & referrers directly with your phone and Google Account
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth status bar */}
        <div className={`px-6 py-3 border-b flex items-center justify-between shrink-0 ${
          isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-100/70 border-slate-200'
        }`}>
          {currentUser ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt={currentUser.displayName || ''} className="w-6 h-6 rounded-full" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                    {currentUser.displayName?.[0] || 'G'}
                  </div>
                )}
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {currentUser.displayName || currentUser.email}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 ml-2 font-mono">
                    ● Connected
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="text-xs text-slate-500 hover:text-rose-500 cursor-pointer"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-500">
                Connect your Google Account to enable two-way Contacts synchronization
              </span>
              
              {/* Official Google Sign-in Button */}
              <button
                type="button"
                disabled={isAuthenticating}
                onClick={handleLogin}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold bg-white text-slate-800 hover:bg-slate-50 shadow-xs border-slate-300 cursor-pointer transition-all disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z" />
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15Z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z" />
                </svg>
                <span>{isAuthenticating ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Tab selection */}
        {currentUser && (
          <div className={`flex items-center gap-3 px-6 pt-3 border-b shrink-0 ${
            isDark ? 'border-slate-800 bg-slate-950/20' : 'border-slate-200 bg-slate-50/50'
          }`}>
            <button
              onClick={() => setActiveTab('sync')}
              className={`pb-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'sync'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Export to Google Contacts
            </button>
            <button
              onClick={() => {
                setActiveTab('browse');
                if (googleContactsList.length === 0) handleLoadGoogleContacts();
              }}
              className={`pb-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'browse'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Import from Google Contacts ({googleContactsList.length})
            </button>
          </div>
        )}

        {/* Modal content body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {authError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {syncSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{syncSuccess}</span>
            </div>
          )}

          {syncProgress && (
            <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/30 space-y-2">
              <div className="flex justify-between text-xs font-semibold text-blue-600">
                <span>{syncProgress.message}</span>
                <span>{Math.round((syncProgress.current / syncProgress.total) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {!currentUser ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
                <Users className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold">Connect Google Contacts</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Sign in with Google to enable automatic syncing of all Customers and referral lead sources with your phone.
                </p>
              </div>
              <button
                onClick={handleLogin}
                disabled={isAuthenticating}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 cursor-pointer"
              >
                {isAuthenticating ? 'Connecting...' : 'Sign in to Google Contacts'}
              </button>
            </div>
          ) : activeTab === 'sync' ? (
            <div className="space-y-4">
              
              {/* Target Customer / Lead fast action if opened from a specific row */}
              {targetCustomer && (
                <div className={`p-4 rounded-xl border space-y-2 ${
                  isDark ? 'bg-blue-950/30 border-blue-900/60' : 'bg-blue-50/80 border-blue-200'
                }`}>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider block">
                    Selected Customer
                  </span>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold">{targetCustomer.name}</h4>
                      <p className="text-xs text-slate-500 font-mono">{targetCustomer.phone} · {targetCustomer.area}</p>
                    </div>
                    <button
                      disabled={isSyncing}
                      onClick={() => handleSyncSingleCustomer(targetCustomer)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs"
                    >
                      Sync this Contact
                    </button>
                  </div>
                </div>
              )}

              {targetLead && (
                <div className={`p-4 rounded-xl border space-y-2 ${
                  isDark ? 'bg-amber-950/30 border-amber-900/60' : 'bg-amber-50/80 border-amber-200'
                }`}>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider block">
                    Selected Referral Partner
                  </span>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold">{targetLead.name}</h4>
                      <p className="text-xs text-slate-500 font-mono">{targetLead.phone} · {targetLead.area}</p>
                    </div>
                    <button
                      disabled={isSyncing}
                      onClick={() => handleSyncSingleLead(targetLead)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs"
                    >
                      Sync this Referrer
                    </button>
                  </div>
                </div>
              )}

              {/* Batch sync cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className={`p-4 rounded-xl border space-y-3 ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Customer Directory</span>
                    <span className="text-xs font-mono font-bold text-blue-600">{customers.length} Clients</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Sync all customers to your phone with company prefix and location tag.
                  </p>
                  <button
                    disabled={isSyncing}
                    onClick={handleBatchSyncCustomers}
                    className="w-full py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs"
                  >
                    Sync All {customers.length} Customers
                  </button>
                </div>

                <div className={`p-4 rounded-xl border space-y-3 ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Lead Referral Network</span>
                    <span className="text-xs font-mono font-bold text-amber-600">{leadSources.length} Leads</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Sync school friends, business partners, and referrers to your contacts.
                  </p>
                  <button
                    disabled={isSyncing}
                    onClick={handleBatchSyncLeads}
                    className="w-full py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs"
                  >
                    Sync All {leadSources.length} Leads
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={contactsSearch}
                    onChange={(e) => setContactsSearch(e.target.value)}
                    placeholder="Search Google Contacts by name, phone..."
                    className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-lg focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-white' : 'bg-slate-50 border border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <button
                  onClick={handleLoadGoogleContacts}
                  disabled={isLoadingContacts}
                  className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingContacts ? 'animate-spin' : ''}`} />
                  <span>Reload</span>
                </button>
              </div>

              {isLoadingContacts ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  Loading contacts from your Google Account...
                </div>
              ) : filteredGoogleContacts.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  No Google Contacts found matching query.
                </div>
              ) : (
                <div className="border rounded-xl divide-y max-h-80 overflow-y-auto text-xs">
                  {filteredGoogleContacts.map(contact => {
                    const isImported = importedIds.has(contact.resourceName);
                    return (
                      <div key={contact.resourceName} className="p-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold">{contact.name}</p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mt-0.5">
                            <span>{contact.phone || 'No phone'}</span>
                            {contact.email && <span>· {contact.email}</span>}
                            {contact.organization && <span>· {contact.organization}</span>}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isImported}
                          onClick={() => handleImportContactToCrm(contact)}
                          className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                            isImported
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                          }`}
                        >
                          {isImported ? '✓ Imported' : '+ Import to CRM'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className={`px-6 py-3 border-t flex items-center justify-between shrink-0 ${
          isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'
        }`}>
          <span className="text-[11px] text-slate-500">
            Official Google Workspace People API Integration · Spider Grid Solutions
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>

      </div>

      {/* Confirmation Dialog for Destructive / Mutating Workspace Operations */}
      {confirmDialog && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className={`border rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div>
              <h4 className="text-sm font-bold">{confirmDialog.title}</h4>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {confirmDialog.description}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className={`px-3 py-1.5 text-xs rounded-lg cursor-pointer ${
                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer shadow-xs"
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
