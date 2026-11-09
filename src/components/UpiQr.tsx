import React, { useEffect, useState } from 'react';

/**
 * UPI payment QR (scan with GPay / PhonePe / Paytm). Uses the "qrcode" package, loaded only
 * when a bill is printed. If the package is not installed it quietly shows the UPI link text.
 */
export const UpiQr: React.FC<{ link: string; size?: number }> = ({ link, size = 112 }) => {
  const [src, setSrc] = useState<string>('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setSrc('');
    setFailed(false);
    import('qrcode')
      .then(mod => {
        const toDataURL = (mod as any).toDataURL || (mod as any).default?.toDataURL;
        return toDataURL(link, { margin: 1, width: size * 3, errorCorrectionLevel: 'M' });
      })
      .then((url: string) => { if (alive) setSrc(url); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [link, size]);

  if (failed) return <p className="text-[9px] text-slate-500 font-mono break-all max-w-[160px]">{link}</p>;
  if (!src) return <div style={{ width: size, height: size }} className="bg-slate-100 animate-pulse rounded" />;
  return <img src={src} width={size} height={size} alt="UPI payment QR" className="rounded border border-slate-200" />;
};

export default UpiQr;
