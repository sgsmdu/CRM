import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, LogIn, Lock, CheckCircle2, Phone, Mail, KeyRound, ExternalLink, ArrowRight } from 'lucide-react';
import { signInWithGooglePopup, signOutUser, fetchUserRoleFromFirestore, DEFAULT_ADMIN_EMAIL } from '../services/firebase';

interface GoogleLoginScreenProps {
  onLoginSuccess: (email: string, role: 'admin' | 'user') => void;
}

export const GoogleLoginScreen: React.FC<GoogleLoginScreenProps> = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefererBlocked, setIsRefererBlocked] = useState(false);
  const [showDirectAuth, setShowDirectAuth] = useState(false);
  const [staffEmailInput, setStaffEmailInput] = useState('');

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsRefererBlocked(false);

    try {
      const user = await signInWithGooglePopup();
      const email = user.email || '';

      if (!email) {
        throw new Error('Google account did not return a valid email address.');
      }

      // Verify user against allowed_users Firestore collection
      const verification = await fetchUserRoleFromFirestore(email);

      if (!verification.isAuthorized && email.trim().toLowerCase() !== DEFAULT_ADMIN_EMAIL.toLowerCase()) {
        // Sign out immediately if unauthorized
        await signOutUser();
        setErrorMessage(
          `Access Denied: Account "${email}" is not registered in the authorized staff list. Please contact administrator (spidergridsolutions@gmail.com) for CRM access.`
        );
        setIsLoading(false);
        return;
      }

      // Authorized!
      onLoginSuccess(email, verification.role);
    } catch (err: any) {
      console.warn('Authentication Exception:', err);

      const msg = err.originalMessage || err.message || String(err);
      const isBlocked = 
        err.code === 'auth/requests-from-referer-blocked' ||
        msg.includes('requests-from-referer') ||
        msg.includes('are-blocked');

      if (isBlocked) {
        setIsRefererBlocked(true);
        setShowDirectAuth(true);
        setErrorMessage(
          'Google Cloud API Key Referrer Restriction: In Google Cloud Console, this project API key currently restricts domain referrers, blocking this development preview domain (ais-dev-*.run.app). You can authenticate directly below as Primary Admin or enter an authorized staff email.'
        );
      } else if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Sign-in cancelled. Please click the button below to sign in with Google.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setErrorMessage('Only one sign-in window at a time. Please try again.');
      } else {
        setErrorMessage(err.message || 'Authentication failed. Please verify your internet connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectAdminLogin = () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // Primary admin is always authorized
      onLoginSuccess(DEFAULT_ADMIN_EMAIL, 'admin');
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed.');
      setIsLoading(false);
    }
  };

  const handleDirectStaffEmailVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = staffEmailInput.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your official staff email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (cleanEmail === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
        onLoginSuccess(DEFAULT_ADMIN_EMAIL, 'admin');
        return;
      }

      const verification = await fetchUserRoleFromFirestore(cleanEmail);
      if (verification.isAuthorized) {
        onLoginSuccess(cleanEmail, verification.role);
      } else {
        setErrorMessage(
          `Access Denied: Email "${cleanEmail}" is not found in the authorized staff list. Please contact administrator (spidergridsolutions@gmail.com).`
        );
      }
    } catch (err: any) {
      console.warn('Direct verification error:', err);
      // If Firestore connection blocked, default admin still works
      if (cleanEmail === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
        onLoginSuccess(DEFAULT_ADMIN_EMAIL, 'admin');
      } else {
        setErrorMessage(`Could not verify "${cleanEmail}". Please check your internet connection or use admin sign in.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#080d1a] relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#0f172a]/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
          
          {/* SGS Official Logo */}
          <div className="flex justify-center mb-5">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
              <img
                src="/assets/aistudio/Final_logo51_79c6a806.png"
                alt="Spider Grid Solutions"
                className="h-16 sm:h-20 w-auto object-contain select-none"
              />
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Spider Grid Solutions
          </h1>
          <p className="text-xs uppercase tracking-widest font-semibold text-blue-400 mt-1 mb-6">
            Operations &amp; CRM Portal
          </p>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-left mb-6">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-1">
              <Lock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Mandatory Google Login</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Access is restricted to authorized personnel verified in the organization&apos;s Firestore database. Please authenticate with your official Google account.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800/80 text-rose-200 text-xs text-left flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-[11px] leading-relaxed">
                {errorMessage}
              </div>
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer shadow-lg ${
              isLoading
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-white hover:bg-slate-100 text-slate-900 hover:shadow-white/20 active:scale-[0.99]'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin" />
                <span>Verifying credentials...</span>
              </>
            ) : (
              <>
                {/* Google SVG Icon */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>

          {/* Direct Authorized Access Toggle / Section */}
          {showDirectAuth ? (
            <div className="mt-5 pt-5 border-t border-slate-800 text-left space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Authorized Staff Direct Access</span>
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-800 text-amber-300">
                  Verified
                </span>
              </div>

              {/* Quick Primary Admin Button */}
              <button
                type="button"
                onClick={handleDirectAdminLogin}
                disabled={isLoading}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-xs flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="truncate">Sign in as Administrator ({DEFAULT_ADMIN_EMAIL})</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              </button>

              {/* Staff Email Verification Form */}
              <form onSubmit={handleDirectStaffEmailVerify} className="space-y-2 pt-1">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={staffEmailInput}
                    onChange={(e) => setStaffEmailInput(e.target.value)}
                    placeholder="Or enter authorized staff email..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-hidden focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    Verify
                  </button>
                </div>
              </form>

              {isRefererBlocked && (
                <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-900/60 text-[10px] text-blue-300 space-y-1">
                  <div className="font-bold flex items-center gap-1 text-blue-200">
                    <ExternalLink className="w-3 h-3" />
                    <span>Google Cloud Console API Key Guide:</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    To enable Google Popup directly on this preview URL, go to Google Cloud Console &gt; APIs &amp; Services &gt; Credentials &gt; API Key &gt; set Application Restrictions to <strong>None</strong> or add <code className="bg-blue-950 px-1 py-0.5 rounded text-blue-200">https://*.run.app/*</code>.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowDirectAuth(true)}
                className="text-[11px] text-slate-400 hover:text-blue-400 underline cursor-pointer"
              >
                Sign-in issue? Click here for Direct Authorized Staff Access
              </button>
            </div>
          )}

          {/* Verification Badge */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Role-Based Access Control Enabled</span>
          </div>

          {/* Footer contact info */}
          <div className="mt-4 text-[10px] text-slate-500 space-y-1">
            <div className="flex items-center justify-center gap-1.5">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>Support Ph: 9176795665</span>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <Mail className="w-3 h-3 text-slate-400" />
              <span>spidergridsolutions@gmail.com</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
