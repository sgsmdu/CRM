/**
 * India GST helpers (pure functions): amount in words, GSTIN validation,
 * state codes and place-of-supply (inter-state) detection.
 * Ideas ported from the open-source "Free GST Billing Software" and typed for this app.
 */

// ------------------------------------------------------------ states

export const GST_STATES: { code: string; name: string }[] = [
  { code: '01', name: 'Jammu & Kashmir' }, { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' }, { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' }, { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' }, { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' }, { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' }, { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' }, { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' }, { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' }, { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' }, { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' }, { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' }, { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' }, { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' }, { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' }, { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' }, { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' }, { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' }, { code: '38', name: 'Ladakh' },
];

// old codes that still appear on GSTINs: 28 = Andhra (before split), 25 = Daman & Diu (before merger)
const LEGACY_CODE: Record<string, string> = { '28': '37', '25': '26' };

export const stateNameForCode = (code: string): string | null =>
  GST_STATES.find(s => s.code === String(code || '').trim())?.name ?? null;

/** 2-digit state code from a GSTIN or a state name ('' if unknown). */
export function getStateCode(stateOrGstin: string): string {
  const v = String(stateOrGstin || '').trim();
  if (!v) return '';
  if (/^\d{2}[A-Z0-9]{13}$/i.test(v)) {
    const c = v.slice(0, 2);
    return LEGACY_CODE[c] || c;
  }
  if (/^\d{2}$/.test(v)) return LEGACY_CODE[v] || v;
  const hit = GST_STATES.find(s => s.name.toLowerCase() === v.toLowerCase() || s.name.toLowerCase().replace(/&/g, 'and') === v.toLowerCase());
  return hit ? hit.code : '';
}

// ------------------------------------------------------------ GSTIN

const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const GSTIN_FORMAT = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][A-Z][0-9A-Z]$/;
const PAN_ENTITY: Record<string, string> = {
  P: 'Individual', C: 'Company', F: 'Firm / LLP', H: 'HUF', A: 'Association of persons',
  T: 'Trust', B: 'Body of individuals', L: 'Local authority', J: 'Artificial juridical person', G: 'Government',
};

/** Luhn mod-36 check over the first 14 characters - catches a mistyped or swapped character. */
export function gstinChecksumOk(value: string): boolean {
  const g = String(value || '').trim().toUpperCase();
  if (!GSTIN_FORMAT.test(g)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const product = GSTIN_CHARS.indexOf(g[i]) * (i % 2 ? 2 : 1);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return GSTIN_CHARS[(36 - (sum % 36)) % 36] === g[14];
}

/** Check character a GSTIN needs for its first 14 characters (used in tests / generators). */
export function gstinCheckChar(first14: string): string {
  const g = String(first14).toUpperCase();
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const product = GSTIN_CHARS.indexOf(g[i]) * (i % 2 ? 2 : 1);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return GSTIN_CHARS[(36 - (sum % 36)) % 36];
}

export type GstinStatus = 'empty' | 'incomplete' | 'bad_format' | 'bad_checksum' | 'ok';

export function checkGstin(value: string): { status: GstinStatus; stateCode: string; state: string | null; entity: string | null; message: string } {
  const g = String(value || '').trim().toUpperCase();
  if (!g) return { status: 'empty', stateCode: '', state: null, entity: null, message: '' };
  if (g.length < 15) return { status: 'incomplete', stateCode: '', state: null, entity: null, message: `${g.length}/15 characters` };
  if (!GSTIN_FORMAT.test(g)) return { status: 'bad_format', stateCode: '', state: null, entity: null, message: 'Not a valid GSTIN format' };
  const stateCode = LEGACY_CODE[g.slice(0, 2)] || g.slice(0, 2);
  const state = stateNameForCode(stateCode);
  const entity = PAN_ENTITY[g[5]] || null;
  if (!gstinChecksumOk(g)) return { status: 'bad_checksum', stateCode, state, entity, message: 'Check the GSTIN - one character looks wrong' };
  return { status: 'ok', stateCode, state, entity, message: `${state || 'State ' + stateCode}${entity ? ' · ' + entity : ''}` };
}

/**
 * Is the supply inter-state? Compares seller state with the place of supply
 * (buyer GSTIN state, else the chosen state). null when it cannot be told.
 */
export function isInterStateSupply(
  sellerGstinOrState: string,
  buyerGstin?: string,
  placeOfSupply?: string
): boolean | null {
  const seller = getStateCode(sellerGstinOrState);
  const pos = getStateCode(placeOfSupply || '') || getStateCode(buyerGstin || '');
  if (!seller || !pos) return null;
  return seller !== pos;
}

// ------------------------------------------------------------ amount in words

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function below100(n: number): string {
  return n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
}

function indianWords(n: number): string {
  if (n === 0) return '';
  const crore = Math.floor(n / 10000000); n -= crore * 10000000;
  const lakh = Math.floor(n / 100000); n -= lakh * 100000;
  const thousand = Math.floor(n / 1000); n -= thousand * 1000;
  const hundred = Math.floor(n / 100); n -= hundred * 100;
  const parts: string[] = [];
  if (crore) parts.push((crore > 99 ? indianWords(crore) : below100(crore)) + ' Crore');
  if (lakh) parts.push(below100(lakh) + ' Lakh');
  if (thousand) parts.push(below100(thousand) + ' Thousand');
  if (hundred) parts.push(ONES[hundred] + ' Hundred');
  if (n) parts.push((parts.length ? 'and ' : '') + below100(n));
  return parts.join(' ');
}

/** 12345.5 -> "Twelve Thousand Three Hundred and Forty Five Rupees and Fifty Paise Only" */
export function amountInWords(amount: number): string {
  const v = Math.round((Number(amount) || 0) * 100) / 100;
  if (v === 0) return 'Zero Rupees Only';
  const neg = v < 0;
  const abs = Math.abs(v);
  const rupees = Math.floor(abs);
  const paise = Math.round((abs - rupees) * 100);
  let out = (rupees ? indianWords(rupees) + ' Rupees' : '');
  if (paise) out += (out ? ' and ' : '') + indianWords(paise) + ' Paise';
  return ((neg ? 'Minus ' : '') + out + ' Only').replace(/\s+/g, ' ');
}

// ------------------------------------------------------------ misc

export const GST_PORTAL_RATES = [0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 12, 18, 28] as const;

/** Round-off needed to reach the nearest rupee. */
export function roundOffToRupee(total: number): number {
  if (!isFinite(total)) return 0;
  return Math.round((Math.round(total) - total) * 100) / 100;
}

/** UPI deep link that opens any UPI app with the amount filled (used for the payment QR). */
export function upiPayLink(vpa: string, name: string, amount?: number, note?: string): string {
  const q = new URLSearchParams({ pa: vpa.trim(), pn: name.trim(), cu: 'INR' });
  if (amount && amount > 0) q.set('am', amount.toFixed(2));
  if (note) q.set('tn', note.slice(0, 40));
  return `upi://pay?${q.toString().replace(/\+/g, '%20')}`;
}
export const isValidUpiId = (s: string) => /^[\w.\-]{2,}@[\w.\-]{2,}$/.test(String(s || '').trim());
