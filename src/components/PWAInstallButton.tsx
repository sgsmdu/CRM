import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2, Share } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  isDark?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ isDark = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showDesktopGuide, setShowDesktopGuide] = useState(false);

  // If already installed as standalone PWA app, show subtle indicator or nothing
  if (isInstalled) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
        isDark ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      }`}>
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Installed App</span>
      </span>
    );
  }

  // Handle Chrome / Edge / Android install prompt
  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      setShowDesktopGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        title="Install SGS Web App on Phone / Desktop"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition-all duration-150 ${
          isDark
            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30 active:scale-95'
            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-95'
        }`}
      >
        <Download className="w-3.5 h-3.5 animate-bounce" />
        <span className="hidden md:inline">Install Web App</span>
        <span className="md:hidden">Install</span>
      </button>

      {/* iOS Safari Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl border ${
            isDark ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base">Install SGS on iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs shrink-0">
                  1
                </span>
                <p>
                  Tap the <Share className="w-4 h-4 inline mx-1 text-blue-600" /> <strong>Share</strong> button at the bottom of Safari.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs shrink-0">
                  2
                </span>
                <p>
                  Scroll down in the share menu and select <strong>"Add to Home Screen"</strong>.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs shrink-0">
                  3
                </span>
                <p>
                  Tap <strong>"Add"</strong> in the top-right. SGS CRM will be installed on your mobile home screen with instant access!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full mt-2 py-2.5 rounded-xl font-medium text-sm bg-blue-600 hover:bg-blue-700 text-white transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Desktop / Browser Helper Guide if prompt not triggered immediately */}
      {showDesktopGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className={`w-full max-w-sm rounded-2xl p-6 shadow-2xl border ${
            isDark ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base">Install SGS Web App</h3>
              </div>
              <button
                onClick={() => setShowDesktopGuide(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p>
                To install <strong>Spider Grid Solutions</strong> as an app on your computer or phone:
              </p>
              <ul className="list-disc list-inside space-y-2 text-xs text-slate-600 dark:text-slate-300 pl-1">
                <li>Look for the <strong>Install</strong> or <strong>⊕ icon</strong> in your browser address bar (Chrome / Edge / Brave).</li>
                <li>Or click browser menu (⋮) → <strong>"Install Spider Grid Solutions"</strong> / <strong>"Add to Home Screen"</strong>.</li>
                <li>It runs full-screen like a native desktop/mobile application with fast offline caching!</li>
              </ul>
            </div>

            <button
              onClick={() => setShowDesktopGuide(false)}
              className="w-full mt-2 py-2.5 rounded-xl font-medium text-sm bg-blue-600 hover:bg-blue-700 text-white transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
