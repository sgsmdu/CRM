// GST Calculation Utility for Spider Grid Solutions & Pandiyan Computers
// Supports both forward (Base Rate + GST) and reverse (Inclusive Amount with GST - reduce GST %) calculations.

export const GST_PRESET_RATES = [0, 5, 12, 18, 28] as const;

export interface ItemGstCalculation {
  baseRate: number;      // Rate without GST (Net unit rate)
  grossRate: number;     // Rate with GST (Gross unit rate)
  unitGst: number;       // Tax per unit
  baseAmount: number;    // Subtotal without GST (baseRate * qty)
  totalGst: number;      // Total GST amount (cgst + sgst)
  totalWithGst: number;  // Grand total inclusive of GST (grossRate * qty)
  cgst: number;          // Central GST (50% of total GST)
  sgst: number;          // State GST (50% of total GST)
}

/**
 * Reverse GST calculation:
 * Given an amount WITH GST (Gross Rate) and GST %, extracts the base rate without GST and calculates taxes.
 * Formula: Base Rate = Gross Rate / (1 + GST% / 100)
 */
export function calculateFromInclusiveRate(grossRate: number, gstPercent: number, quantity = 1): ItemGstCalculation {
  const q = Math.max(1, Number(quantity) || 1);
  const gross = Math.max(0, Number(grossRate) || 0);
  const pct = Math.max(0, Number(gstPercent) || 0);

  if (pct === 0 || gross === 0) {
    const total = Math.round(gross * q * 100) / 100;
    return {
      baseRate: gross,
      grossRate: gross,
      unitGst: 0,
      baseAmount: total,
      totalGst: 0,
      totalWithGst: total,
      cgst: 0,
      sgst: 0,
    };
  }

  // Exact 2-decimal precision base rate
  const baseRate = Math.round((gross / (1 + pct / 100)) * 100) / 100;
  const unitGst = Math.round((gross - baseRate) * 100) / 100;
  const totalWithGst = Math.round(gross * q * 100) / 100;
  const baseAmount = Math.round(baseRate * q * 100) / 100;
  const totalGst = Math.round((totalWithGst - baseAmount) * 100) / 100;
  const halfGst = Math.round((totalGst / 2) * 100) / 100;

  return {
    baseRate,
    grossRate: gross,
    unitGst,
    baseAmount,
    totalGst,
    totalWithGst,
    cgst: halfGst,
    sgst: halfGst,
  };
}

/**
 * Forward GST calculation:
 * Given a base rate (without GST) and GST %, adds GST to calculate inclusive rate and taxes.
 */
export function calculateFromBaseRate(baseRate: number, gstPercent: number, quantity = 1): ItemGstCalculation {
  const q = Math.max(1, Number(quantity) || 1);
  const base = Math.max(0, Number(baseRate) || 0);
  const pct = Math.max(0, Number(gstPercent) || 0);

  if (pct === 0 || base === 0) {
    const total = Math.round(base * q * 100) / 100;
    return {
      baseRate: base,
      grossRate: base,
      unitGst: 0,
      baseAmount: total,
      totalGst: 0,
      totalWithGst: total,
      cgst: 0,
      sgst: 0,
    };
  }

  const unitGst = Math.round(((base * pct) / 100) * 100) / 100;
  const grossRate = Math.round((base + unitGst) * 100) / 100;
  const baseAmount = Math.round(base * q * 100) / 100;
  const totalGst = Math.round(((baseAmount * pct) / 100) * 100) / 100;
  const totalWithGst = Math.round((baseAmount + totalGst) * 100) / 100;
  const halfGst = Math.round((totalGst / 2) * 100) / 100;

  return {
    baseRate: base,
    grossRate,
    unitGst,
    baseAmount,
    totalGst,
    totalWithGst,
    cgst: halfGst,
    sgst: halfGst,
  };
}
