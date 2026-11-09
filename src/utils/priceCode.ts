import { DigitChar, PriceCodeMapping, PriceCodeMappingVersion } from '../types';

export const DEFAULT_PRICE_CODE_MAPPING: PriceCodeMapping = {
  '1': 'S',
  '2': 'R',
  '3': 'I',
  '4': 'O',
  '5': 'C',
  '6': 'H',
  '7': 'A',
  '8': 'N',
  '9': 'D',
  '0': 'M',
};

export const INITIAL_PRICE_CODE_VERSION: PriceCodeMappingVersion = {
  version: 1,
  mapping: DEFAULT_PRICE_CODE_MAPPING,
  createdAt: '2026-01-01T00:00:00.000Z',
  changedBy: 'System Default',
  notes: 'Default SGS Secret Price Code Mapping (S-R-I-O-C-H-A-N-D-M)',
};

/**
 * Validates whether a custom mapping is compliant:
 * - Must contain all 10 digits (0 through 9)
 * - Each digit must map to exactly one letter (A-Z)
 * - All 10 mapped letters must be distinct (no duplicates)
 */
export function validateMapping(mapping: Partial<PriceCodeMapping>): { isValid: boolean; error?: string } {
  if (!mapping) {
    return { isValid: false, error: 'Mapping object is missing.' };
  }

  const digits: DigitChar[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const seenLetters = new Set<string>();

  for (const d of digits) {
    const val = mapping[d];
    if (!val || typeof val !== 'string' || val.trim().length === 0) {
      return { isValid: false, error: `Digit "${d}" must be mapped to a letter.` };
    }
    const cleanLetter = val.trim().toUpperCase();
    if (!/^[A-Z]$/.test(cleanLetter)) {
      return { isValid: false, error: `Digit "${d}" must be mapped to a single letter (A-Z). Received "${val}".` };
    }
    if (seenLetters.has(cleanLetter)) {
      return { isValid: false, error: `Duplicate letter "${cleanLetter}" found. Every digit must have a unique letter.` };
    }
    seenLetters.add(cleanLetter);
  }

  return { isValid: true };
}

/**
 * Encodes a numeric rupee amount into its secret price code.
 * Rules:
 * - Whole rupee amounts only (non-negative integer).
 * - Decimal numbers or strings with fractional decimals are rejected.
 * - Negative amounts are rejected.
 * - Spaces are trimmed.
 * - Code length equals amount's digit count.
 */
export function encodeAmountToCode(
  rawAmount: number | string | null | undefined,
  mapping: PriceCodeMapping = DEFAULT_PRICE_CODE_MAPPING
): { code: string; error?: string } {
  if (rawAmount === null || rawAmount === undefined) {
    return { code: '' };
  }

  const str = String(rawAmount).trim();
  if (str === '') {
    return { code: '' };
  }

  // Check for negative numbers
  if (str.startsWith('-')) {
    return { code: '', error: 'Negative amounts are not allowed.' };
  }

  // Check for decimal point
  if (str.includes('.')) {
    const [, decimalPart] = str.split('.');
    if (decimalPart && decimalPart !== '0' && decimalPart !== '00') {
      return { code: '', error: 'Whole rupee amounts only. Decimal amounts are not supported.' };
    }
  }

  // Extract clean integer string
  const cleanIntStr = str.split('.')[0].replace(/,/g, '');

  if (!/^\d+$/.test(cleanIntStr)) {
    return { code: '', error: 'Amount must contain numbers only.' };
  }

  let result = '';
  for (let i = 0; i < cleanIntStr.length; i++) {
    const char = cleanIntStr[i] as DigitChar;
    const mapped = mapping[char];
    if (!mapped) {
      return { code: '', error: `Digit "${char}" has no secret code mapping.` };
    }
    result += mapped.toUpperCase();
  }

  return { code: result };
}

/**
 * Decodes a secret price code string back into the original whole rupee amount.
 * Rules:
 * - Code is trimmed and converted to uppercase.
 * - Only letters defined in the current mapping are accepted.
 * - Returns numeric integer amount.
 */
export function decodeCodeToAmount(
  rawCode: string | null | undefined,
  mapping: PriceCodeMapping = DEFAULT_PRICE_CODE_MAPPING
): { amount?: number; error?: string } {
  if (!rawCode) {
    return { error: 'Please enter a secret code.' };
  }

  const clean = rawCode.trim().toUpperCase();
  if (clean === '') {
    return { error: 'Please enter a secret code.' };
  }

  // Build reverse mapping: Letter -> Digit
  const reverseMap: Record<string, DigitChar> = {};
  const validLetters: string[] = [];

  for (const digit of Object.keys(mapping) as DigitChar[]) {
    const letter = mapping[digit].toUpperCase();
    reverseMap[letter] = digit;
    validLetters.push(letter);
  }

  let digitString = '';
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const digit = reverseMap[char];
    if (digit === undefined) {
      return { 
        error: `Invalid code letter "${char}". Valid letters for this mapping are: ${validLetters.join(', ')}.` 
      };
    }
    digitString += digit;
  }

  const num = parseInt(digitString, 10);
  if (isNaN(num)) {
    return { error: 'Could not decode into a valid number.' };
  }

  return { amount: num };
}

/**
 * Calculates Minimum Sale Price:
 * Sale Minimum = Buy Amount + Profit Amount
 */
export function calculateSaleMinimum(buyAmount: number, profitAmount: number): number {
  const buy = Math.round(Number(buyAmount) || 0);
  const profit = Math.round(Number(profitAmount) || 0);
  return Math.max(0, buy + profit);
}

/**
 * Checks if Sale Rate is below calculated Sale Minimum
 */
export function isSaleRateBelowMinimum(saleRate: number, saleMinimum: number): boolean {
  if (saleRate <= 0 || saleMinimum <= 0) return false;
  return saleRate < saleMinimum;
}
