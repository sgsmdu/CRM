// GST Calculation Utility for Spider Grid Solutions & Pandiyan Computers
// Supports both forward (Base Rate + GST) and reverse (Inclusive Amount with GST - reduce GST %) calculations,
// Intra-state (CGST + SGST) vs Inter-state (IGST), line-item discounts, invoice round-off, and net profit analysis.

export const GST_PRESET_RATES = [0, 5, 12, 18, 28] as const;

export interface CommonHsnCode {
  code: string;
  description: string;
  defaultGstPercent: number;
}

export const COMMON_IT_HSN_CODES: CommonHsnCode[] = [
  { code: '998713', description: 'IT Repair & Maintenance Services (Laptops, Desktops, Printers)', defaultGstPercent: 18 },
  { code: '8471', description: 'Automatic Data Processing Machines, SSDs, RAM, Motherboards', defaultGstPercent: 18 },
  { code: '8473', description: 'Parts & Accessories for Computers & Laptops (Keyboards, Screens, Hinges)', defaultGstPercent: 18 },
  { code: '8504', description: 'Power Supplies (SMPS), Laptop Adapters & Chargers, Inverters', defaultGstPercent: 18 },
  { code: '8528', description: 'Monitors, Projectors & Display Screens', defaultGstPercent: 18 },
  { code: '8443', description: 'Printers, Scanners, Cartridges & Toner Powder', defaultGstPercent: 18 },
  { code: '8525', description: 'CCTV Cameras, DVRs, NVRs & Security Systems', defaultGstPercent: 18 },
  { code: '8544', description: 'Cat6 Cables, HDMI Cables, Power Cords & Networking Wire', defaultGstPercent: 18 },
  { code: '8517', description: 'Routers, Switches & Telecom / Wi-Fi Equipment', defaultGstPercent: 18 },
];

export interface ItemGstCalculation {
  baseRate: number;      // Rate without GST (Net unit rate)
  grossRate: number;     // Rate with GST (Gross unit rate)
  unitGst: number;       // Tax per unit
  baseAmount: number;    // Subtotal before line discount (baseRate * qty)
  discount: number;      // Line item discount in ₹
  taxableAmount: number; // Net amount subject to tax: (baseAmount - discount)
  totalGst: number;      // Total GST amount (cgst + sgst OR igst)
  totalWithGst: number;  // Grand total inclusive of GST
  cgst: number;          // Central GST (50% of total GST when intra-state, 0 when inter-state)
  sgst: number;          // State GST (50% of total GST when intra-state, 0 when inter-state)
  igst: number;          // Integrated GST (100% of GST when inter-state, 0 when intra-state)
  isInterState: boolean; // True if outside Tamil Nadu (place of supply != 33)
}

/**
 * Reverse GST calculation:
 * Given an amount WITH GST (Gross Rate) and GST %, extracts the base rate without GST and calculates taxes.
 * Formula: Base Rate = Gross Rate / (1 + GST% / 100)
 */
export function calculateFromInclusiveRate(
  grossRate: number, 
  gstPercent: number, 
  quantity = 1,
  discount = 0,
  isInterState = false
): ItemGstCalculation {
  const q = Number(quantity) > 0 ? Number(quantity) : 1;
  const gross = Math.max(0, Number(grossRate) || 0);
  const pct = Math.max(0, Number(gstPercent) || 0);
  const disc = Math.max(0, Number(discount) || 0);

  if (pct === 0 || gross === 0) {
    const rawTotal = Math.max(0, (gross * q) - disc);
    const total = Math.round(rawTotal * 100) / 100;
    return {
      baseRate: gross,
      grossRate: gross,
      unitGst: 0,
      baseAmount: Math.round(gross * q * 100) / 100,
      discount: disc,
      taxableAmount: total,
      totalGst: 0,
      totalWithGst: total,
      cgst: 0,
      sgst: 0,
      igst: 0,
      isInterState,
    };
  }

  // Exact 2-decimal precision base rate
  const baseRate = Math.round((gross / (1 + pct / 100)) * 100) / 100;
  const unitGst = Math.round((gross - baseRate) * 100) / 100;
  const baseAmount = Math.round(baseRate * q * 100) / 100;

  // Total gross after discount
  const totalWithGst = Math.round(Math.max(0, (gross * q) - disc) * 100) / 100;
  // Taxable after discount
  const taxableAmount = Math.round((totalWithGst / (1 + pct / 100)) * 100) / 100;
  const totalGst = Math.round((totalWithGst - taxableAmount) * 100) / 100;

  const halfGst = isInterState ? 0 : Math.round((totalGst / 2) * 100) / 100;
  const otherHalf = isInterState ? 0 : Math.round((totalGst - halfGst) * 100) / 100; // CGST + SGST always equals total GST
  const igst = isInterState ? totalGst : 0;

  return {
    baseRate,
    grossRate: gross,
    unitGst,
    baseAmount,
    discount: disc,
    taxableAmount,
    totalGst,
    totalWithGst,
    cgst: halfGst,
    sgst: otherHalf,
    igst,
    isInterState,
  };
}

/**
 * Forward GST calculation:
 * Given a base rate (without GST) and GST %, adds GST to calculate inclusive rate and taxes.
 */
export function calculateFromBaseRate(
  baseRate: number, 
  gstPercent: number, 
  quantity = 1,
  discount = 0,
  isInterState = false
): ItemGstCalculation {
  const q = Number(quantity) > 0 ? Number(quantity) : 1;
  const base = Math.max(0, Number(baseRate) || 0);
  const pct = Math.max(0, Number(gstPercent) || 0);
  const disc = Math.max(0, Number(discount) || 0);

  if (pct === 0 || base === 0) {
    const rawTotal = Math.max(0, (base * q) - disc);
    const total = Math.round(rawTotal * 100) / 100;
    return {
      baseRate: base,
      grossRate: base,
      unitGst: 0,
      baseAmount: Math.round(base * q * 100) / 100,
      discount: disc,
      taxableAmount: total,
      totalGst: 0,
      totalWithGst: total,
      cgst: 0,
      sgst: 0,
      igst: 0,
      isInterState,
    };
  }

  const unitGst = Math.round(((base * pct) / 100) * 100) / 100;
  const grossRate = Math.round((base + unitGst) * 100) / 100;
  const baseAmount = Math.round(base * q * 100) / 100;
  
  // Taxable amount is baseAmount minus discount
  const taxableAmount = Math.round(Math.max(0, baseAmount - disc) * 100) / 100;
  const totalGst = Math.round(((taxableAmount * pct) / 100) * 100) / 100;
  const totalWithGst = Math.round((taxableAmount + totalGst) * 100) / 100;

  const halfGst = isInterState ? 0 : Math.round((totalGst / 2) * 100) / 100;
  const otherHalf = isInterState ? 0 : Math.round((totalGst - halfGst) * 100) / 100; // CGST + SGST always equals total GST
  const igst = isInterState ? totalGst : 0;

  return {
    baseRate: base,
    grossRate,
    unitGst,
    baseAmount,
    discount: disc,
    taxableAmount,
    totalGst,
    totalWithGst,
    cgst: halfGst,
    sgst: otherHalf,
    igst,
    isInterState,
  };
}

export interface InvoiceLineItemInput {
  description: string;
  quantity: number;
  rate: number;             // Base rate (without GST)
  grossRate?: number;       // Inclusive rate (with GST)
  gstPercent: number;       // 0, 5, 12, 18, 28
  purchaseCost?: number;    // Unit cost for profit calculation
  isService?: boolean;      // True if service labor (100% profit)
  discount?: number;        // Line discount in ₹
}

export interface InvoiceCalculationSummary {
  subtotal: number;              // Total taxable value of all items
  totalItemDiscount: number;     // Sum of line item discounts
  invoiceDiscount: number;       // Additional invoice-level discount
  netTaxableAmount: number;      // Final taxable value
  totalCgst: number;             // Central GST
  totalSgst: number;             // State GST
  totalIgst: number;             // Integrated GST
  totalTax: number;              // Total GST (CGST + SGST + IGST)
  totalCostOfGoods: number;      // Total purchase cost of items
  manualExtraCost: number;       // Extra outside expenses
  grossProfit: number;           // Net taxable - Total COGS
  netProfit: number;             // Gross profit - manualExtraCost
  profitMarginPercent: number;   // (Net profit / Net taxable) * 100
  unroundedTotal: number;        // Net taxable + Total tax
  roundOff: number;              // Difference to round to nearest ₹
  grandTotal: number;            // Final payable amount
  isInterState: boolean;
}

/**
 * Calculates complete, end-to-end invoice totals, taxes, round-off, and profit.
 * Excludes GST from profit calculations so business owners see authentic margins.
 */
export function calculateInvoiceSummary(
  items: InvoiceLineItemInput[],
  options: {
    invoiceDiscount?: number;
    manualExtraCost?: number;
    roundOffAdjustment?: number;
    autoRoundOff?: boolean;
    isInterState?: boolean;
    isNonGstFirm?: boolean; // True for Pandiyan Computers
  } = {}
): InvoiceCalculationSummary {
  const {
    invoiceDiscount = 0,
    manualExtraCost = 0,
    roundOffAdjustment = 0,
    autoRoundOff = false,
    isInterState = false,
    isNonGstFirm = false,
  } = options;

  let totalTaxable = 0;
  let totalItemDiscount = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalTax = 0;
  let totalCostOfGoods = 0;

  items.forEach(it => {
    const qty = Number(it.quantity) > 0 ? Number(it.quantity) : 1;
    // cost counts for services too when entered (consumables, outside labour)
    const pCost = Math.max(0, Number(it.purchaseCost) || 0);
    totalCostOfGoods += pCost * qty;

    if (isNonGstFirm) {
      const rate = Math.max(0, Number(it.grossRate !== undefined ? it.grossRate : it.rate) || 0);
      const lineTotal = rate * qty;
      totalTaxable += lineTotal;
      return;
    }

    const pct = Math.max(0, Number(it.gstPercent) || 0);
    const lineDisc = Math.max(0, Number(it.discount) || 0);
    totalItemDiscount += lineDisc;

    // Use baseRate if available, else derive from grossRate
    let itemCalc: ItemGstCalculation;
    if (it.grossRate !== undefined && it.grossRate > 0) {
      itemCalc = calculateFromInclusiveRate(it.grossRate, pct, qty, lineDisc, isInterState);
    } else {
      itemCalc = calculateFromBaseRate(it.rate, pct, qty, lineDisc, isInterState);
    }

    totalTaxable += itemCalc.taxableAmount;
    totalCgst += itemCalc.cgst;
    totalSgst += itemCalc.sgst;
    totalIgst += itemCalc.igst;
    totalTax += itemCalc.totalGst;
  });

  const netTaxableAmount = Math.max(0, totalTaxable - invoiceDiscount);

  // If there's an invoice-level discount on a GST invoice, adjust taxes proportionally
  let finalCgst = totalCgst;
  let finalSgst = totalSgst;
  let finalIgst = totalIgst;
  let finalTotalTax = totalTax;

  if (!isNonGstFirm && invoiceDiscount > 0 && totalTaxable > 0) {
    const ratio = netTaxableAmount / totalTaxable;
    finalCgst = Math.round(totalCgst * ratio * 100) / 100;
    finalSgst = Math.round(totalSgst * ratio * 100) / 100;
    finalIgst = Math.round(totalIgst * ratio * 100) / 100;
    finalTotalTax = isInterState ? finalIgst : (finalCgst + finalSgst);
  }

  if (isNonGstFirm) {
    finalCgst = 0;
    finalSgst = 0;
    finalIgst = 0;
    finalTotalTax = 0;
  }

  const unroundedTotal = Number((netTaxableAmount + finalTotalTax).toFixed(2));
  
  let roundOff = Number(roundOffAdjustment.toFixed(2));
  if (autoRoundOff) {
    const target = Math.round(unroundedTotal);
    roundOff = Number((target - unroundedTotal).toFixed(2));
  }

  const grandTotal = Math.max(0, Number((unroundedTotal + roundOff).toFixed(2)));

  // Profit calculation: (Taxable Revenue - Cost of Goods Sold - Manual Extra Costs)
  const grossProfit = Number((netTaxableAmount - totalCostOfGoods).toFixed(2));
  const netProfit = Number((grossProfit - manualExtraCost).toFixed(2));
  const profitMarginPercent = netTaxableAmount > 0 
    ? Number(((netProfit / netTaxableAmount) * 100).toFixed(1)) 
    : 0;

  return {
    subtotal: Number(totalTaxable.toFixed(2)),
    totalItemDiscount: Number(totalItemDiscount.toFixed(2)),
    invoiceDiscount: Number(invoiceDiscount.toFixed(2)),
    netTaxableAmount: Number(netTaxableAmount.toFixed(2)),
    totalCgst: Number(finalCgst.toFixed(2)),
    totalSgst: Number(finalSgst.toFixed(2)),
    totalIgst: Number(finalIgst.toFixed(2)),
    totalTax: Number(finalTotalTax.toFixed(2)),
    totalCostOfGoods: Number(totalCostOfGoods.toFixed(2)),
    manualExtraCost: Number(manualExtraCost.toFixed(2)),
    grossProfit,
    netProfit,
    profitMarginPercent,
    unroundedTotal,
    roundOff,
    grandTotal,
    isInterState,
  };
}

/**
 * Calculates net GST settlement (Output Tax from sales minus Input Tax Credit from purchases).
 */
export function calculateGstSettlement(
  outputInvoices: Array<{ subtotal?: number; taxAmount?: number; grandTotal?: number; status?: string; billingFirm?: string }>,
  inputVendorBills: Array<{ subtotal?: number; taxAmount?: number; totalAmount?: number }>
) {
  let outputTaxable = 0;
  let outputTax = 0;
  let inputTaxable = 0;
  let inputTax = 0;

  outputInvoices.forEach(inv => {
    if (inv.status === 'cancelled') return;
    if (inv.billingFirm === 'pandiyan') return;
    outputTaxable += inv.subtotal || 0;
    outputTax += inv.taxAmount || 0;
  });

  inputVendorBills.forEach(bill => {
    const tax = bill.taxAmount || 0;
    inputTax += tax;
    inputTaxable += (bill.subtotal || ((bill.totalAmount || 0) - tax));
  });

  const netPayable = Math.max(0, outputTax - inputTax);
  const itcCarriedForward = Math.max(0, inputTax - outputTax);

  return {
    outputTaxable: Number(outputTaxable.toFixed(2)),
    outputTax: Number(outputTax.toFixed(2)),
    inputTaxable: Number(inputTaxable.toFixed(2)),
    inputTax: Number(inputTax.toFixed(2)),
    netPayable: Number(netPayable.toFixed(2)),
    itcCarriedForward: Number(itcCarriedForward.toFixed(2)),
  };
}
