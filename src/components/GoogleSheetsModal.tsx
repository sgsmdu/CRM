import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  LogOut, 
  Plus, 
  Link2,
  Lock,
  Layers,
  ArrowRight
} from 'lucide-react';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, getAccessToken, logout } from '../services/googleAuth';
import { 
  createSgsSpreadsheet, 
  syncAllDataToGoogleSheet, 
  getSavedSpreadsheetId, 
  getSavedSpreadsheetUrl, 
  setSavedSpreadsheet,
  clearSavedSpreadsheet 
} from '../services/googleSheetsService';
import { useSgs } from '../context/SgsContext';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({ isOpen, onClose }) => {
  const { customers, jobCards, inventory, vendorBills, invoices, cashFlow, theme } = useSgs();
  const isDark = theme === 'dark';

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(getSavedSpreadsheetId());
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(getSavedSpreadsheetUrl());
  const [customSheetId, setCustomSheetId] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setSyncError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setSyncError(err.message || 'Failed to sign in with Google');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setToken(null);
  };

  const handleCreateNewSheet = async () => {
    if (!token) {
      setSyncError('Please sign in with Google first.');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    setSyncStatus('Creating multi-tab Spider Grid Solutions spreadsheet...');

    try {
      const { id, url } = await createSgsSpreadsheet(token);
      setSpreadsheetId(id);
      setSpreadsheetUrl(url);

      setSyncStatus('Populating all 6 operational databases to Google Sheets...');
      await syncAllDataToGoogleSheet(id, token, {
        customers,
        jobCards,
        inventory,
        vendorBills,
        invoices,
        cashFlow,
      });

      setSyncStatus('Successfully synchronized all Spider Grid data to Google Sheets!');
    } catch (err: any) {
      console.error('Create sheet error:', err);
      setSyncError(err.message || 'Failed to create and sync Google Sheet');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncExistingSheet = async () => {
    const targetId = spreadsheetId || customSheetId.trim();
    if (!targetId) {
      setSyncError('Please select or specify a Google Spreadsheet ID.');
      return;
    }

    if (!token) {
      setSyncError('Please sign in with Google first.');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    setSyncStatus('Pushing updated Spider Grid Solutions records to Google Sheets...');

    try {
      await syncAllDataToGoogleSheet(targetId, token, {
        customers,
        jobCards,
        inventory,
        vendorBills,
        invoices,
        cashFlow,
      });

      if (!spreadsheetId) {
        const sheetUrl = `https://docs.google.com/spreadsheets/d/${targetId}/edit`;
        setSavedSpreadsheet(targetId, sheetUrl);
        setSpreadsheetId(targetId);
        setSpreadsheetUrl(sheetUrl);
      }

      setSyncStatus('Data successfully updated in Google Sheets!');
    } catch (err: any) {
      console.error('Sync error:', err);
      setSyncError(err.message || 'Failed to update Google Sheet');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className={`border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Google Sheets Live Data Link</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Sync Spider Grid Solutions records to your Google account</p>
            </div>
          </div>
          <button onClick={onClose} className={`cursor-pointer ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          
          {/* Auth State Box */}
          {!user ? (
            <div className={`p-4 rounded-xl border text-center space-y-3 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className={`w-10 h-10 rounded-full border flex items-center justify-center mx-auto ${
                isDark ? 'bg-slate-900 border-slate-800 text-blue-400' : 'bg-white border-slate-300 text-blue-600 shadow-xs'
              }`}>
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Connect Google Workspace Account</h4>
                <p className={`text-xs max-w-sm mx-auto mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Link your Google account (e.g., spidergridsolutions@gmail.com) to automatically push and read data in Google Sheets.
                </p>
              </div>

              {/* Official Google Material Button Style */}
              <button
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="inline-flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg shadow-sm border border-slate-300 transition-colors cursor-pointer disabled:opacity-50 mx-auto"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>{isSigningIn ? 'Signing in with Google...' : 'Sign in with Google'}</span>
              </button>
            </div>
          ) : (
            <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-400" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{user.displayName || 'Google Account'}</div>
                  <div className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{user.email}</div>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className={`flex items-center gap-1 text-[11px] p-1.5 rounded transition-colors cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-rose-400' : 'text-slate-600 hover:text-rose-600'
                }`}
                title="Disconnect Google Account"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>
          )}

          {/* Connected Sheet Details */}
          {spreadsheetUrl && (
            <div className={`p-4 rounded-xl border space-y-2 ${
              isDark ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-emerald-50 border-emerald-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold flex items-center gap-1.5 ${
                  isDark ? 'text-emerald-400' : 'text-emerald-800'
                }`}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Linked Google Spreadsheet</span>
                </span>
                <a
                  href={spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 px-3 py-1 rounded-lg transition-colors shadow-xs"
                >
                  <span>Open in Google Sheets</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className={`text-[11px] font-mono truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                ID: {spreadsheetId}
              </div>
            </div>
          )}

          {/* Sync Actions */}
          <div className="space-y-3">
            <h4 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>Synchronization Options</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleCreateNewSheet}
                disabled={isSyncing || !user}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-50 group ${
                  isDark 
                    ? 'bg-slate-950 border-slate-800 hover:border-blue-500' 
                    : 'bg-white border-slate-200 hover:border-blue-500 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Create New Spreadsheet</div>
                <div className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Creates 6 styled tabs (Customers, Job Cards, Inventory, Bills, Invoices, Cash Flow)
                </div>
              </button>

              <button
                onClick={handleSyncExistingSheet}
                disabled={isSyncing || !user || (!spreadsheetId && !customSheetId)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-50 group ${
                  isDark 
                    ? 'bg-slate-950 border-slate-800 hover:border-emerald-500' 
                    : 'bg-white border-slate-200 hover:border-emerald-500 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <RefreshCw className={`w-4 h-4 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                </div>
                <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Sync Live Data to Sheet</div>
                <div className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Overwrites or refreshes all 6 tabs with current workshop records
                </div>
              </button>
            </div>

            {/* Custom Spreadsheet ID input */}
            {!spreadsheetId && (
              <div className="pt-2">
                <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Or link an existing Google Sheet by ID:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customSheetId}
                    onChange={(e) => setCustomSheetId(e.target.value)}
                    placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none ${
                      isDark ? 'bg-slate-950 border border-slate-800 text-slate-200 focus:border-blue-500' : 'bg-white border border-slate-300 text-slate-900 focus:border-blue-600'
                    }`}
                  />
                  <button
                    onClick={handleSyncExistingSheet}
                    disabled={isSyncing || !user || !customSheetId.trim()}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    Connect
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sync Progress or Error Messages */}
          {syncStatus && (
            <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
              isDark ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{syncStatus}</span>
            </div>
          )}

          {syncError && (
            <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
              isDark ? 'bg-rose-950/40 border-rose-900/60 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{syncError}</span>
            </div>
          )}

          {/* Data Summary */}
          <div className={`p-3 rounded-xl border text-[11px] space-y-1 ${
            isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <span className={`font-semibold block ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>Spreadsheet Tabs that will be synchronized:</span>
            <div className="grid grid-cols-2 gap-1 pt-1 font-mono text-[10px]">
              <div>• Customers ({customers.length} records)</div>
              <div>• Job Cards ({jobCards.length} work orders)</div>
              <div>• Hardware Inventory ({inventory.length} parts)</div>
              <div>• Vendor Purchases ({vendorBills.length} invoices)</div>
              <div>• Invoices & Billing ({invoices.length} docs)</div>
              <div>• Cash Flow Ledger ({cashFlow.length} entries)</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
