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
  const q = Math.max(1, Number(quantity) || 1);
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
    sgst: halfGst,
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
  const q = Math.max(1, Number(quantity) || 1);
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
    sgst: halfGst,
    igst,
    isInterState,
  };
}

export interface InvoiceLineItemInput {
  description: string;
  quantity: number;
  rate: number;                 // Base rate (without GST)
  grossRate?: number;           // Inclusive rate (with GST)
  gstPercent: number;           // 0, 5, 12, 18, 28
  purchaseCost?: number;        // Unit base cost without GST
  purchaseCostWithGst?: number; // Unit cost WITH GST
  purchaseGstPercent?: number;  // GST % paid on purchase (defaults to 18 or gstPercent)
  isService?: boolean;          // True if service labor (100% profit)
  discount?: number;            // Line discount in ₹
}

export interface InvoiceCalculationSummary {
  subtotal: number;                 // Total taxable value of all items
  totalItemDiscount: number;        // Sum of line item discounts
  invoiceDiscount: number;          // Additional invoice-level discount
  netTaxableAmount: number;         // Final taxable value
  totalCgst: number;                // Central GST
  totalSgst: number;                // State GST
  totalIgst: number;                // Integrated GST
  totalTax: number;                 // Total GST (CGST + SGST + IGST)
  totalCostOfGoods: number;         // Total purchase cost of items (base)
  totalCostOfGoodsWithGst: number;  // Total item cost WITH GST (spares cost)
  manualExtraCost: number;          // Extra outside expenses
  grossProfit: number;              // Total Sale with GST - Total COGS with GST
  netProfit: number;                // (Sale with GST - Buy with GST - manualExtraCost)
  taxableProfit: number;            // Taxable Revenue - Taxable COGS - manualExtraCost
  profitMarginPercent: number;      // (Net profit / Grand Total) * 100
  totalLinesWithGst: number;        // Sum of line item totals with GST
  unroundedTotal: number;           // totalLinesWithGst - invoiceDiscount
  roundOff: number;                 // Difference to round to nearest ₹
  grandTotal: number;               // Final payable amount
  isInterState: boolean;
}

/**
 * Suggests standard GST rate for a given HSN or SAC code.
 */
export function suggestGstRate(hsnCode?: string): number | null {
  if (!hsnCode) return null;
  const clean = hsnCode.trim().replace(/\D/g, '');
  if (clean.length < 4) return null;
  
  const map: Record<string, number> = {
    '9987': 18,
    '998713': 18,
    '9983': 18,
    '8471': 18,
    '8473': 18,
    '8504': 18,
    '8528': 18, // IT Monitors are 18% (Consumer TVs > 32" are 28%)
    '8443': 18,
    '8525': 18,
    '8544': 18,
    '8517': 18,
    '8523': 18,
    '8536': 18,
  };

  if (map[clean] !== undefined) return map[clean];
  const prefix4 = clean.substring(0, 4);
  if (map[prefix4] !== undefined) return map[prefix4];
  return null;
}

/**
 * Converts numeric amount to Indian English words (Rupees & Paise).
 */
export function numberToWordsIndian(num: number): string {
  if (!num || isNaN(num) || num <= 0) return 'Zero Rupees Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const convertToWords = (n: number): string => {
    if (n < 20) return a[n];
    return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
  };

  const getIndianFormatString = (n: number): string => {
    let res = '';
    const crore = Math.floor(n / 10000000);
    n -= crore * 10000000;
    const lakh = Math.floor(n / 100000);
    n -= lakh * 100000;
    const thousand = Math.floor(n / 1000);
    n -= thousand * 1000;
    const hundred = Math.floor(n / 100);
    n -= hundred * 100;

    if (crore > 99) res += getIndianFormatString(crore) + ' Crore ';
    else if (crore > 0) res += convertToWords(crore) + ' Crore ';
    if (lakh > 0) res += convertToWords(lakh) + ' Lakh ';
    if (thousand > 0) res += convertToWords(thousand) + ' Thousand ';
    if (hundred > 0) res += convertToWords(hundred) + ' Hundred ';
    if (n > 0) res += (res !== '' ? 'and ' : '') + convertToWords(n);
    return res.trim();
  };

  const roundedNum = Math.round(num * 100) / 100;
  const rupees = Math.floor(roundedNum);
  const paise = Math.round((roundedNum - rupees) * 100);
  let result = getIndianFormatString(rupees) + ' Rupees';
  if (paise > 0) {
    result += ' and ' + getIndianFormatString(paise) + ' Paise';
  }
  return (result + ' Only').replace(/\s+/g, ' ');
}

/**
 * Calculates complete, end-to-end invoice totals, taxes, round-off, and profit.
 * Profit is calculated as the authentic difference between total sale amount with GST
 * and total spare/buy cost with GST (as well as book taxable profit).
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
  let totalLinesWithGst = 0;
  let totalCostOfGoods = 0;
  let totalCostOfGoodsWithGst = 0;

  items.forEach(it => {
    const qty = Math.max(1, Number(it.quantity) || 1);
    const pct = isNonGstFirm ? 0 : Math.max(0, Number(it.gstPercent) || 0);
    const lineDisc = Math.max(0, Number(it.discount) || 0);
    totalItemDiscount += lineDisc;

    // 1. Spares / Purchase Cost Calculation (with GST)
    if (it.isService) {
      // Services have 0 purchase cost -> 100% margin
    } else {
      const pCostBase = Math.max(0, Number(it.purchaseCost) || 0);
      const pCostGross = Math.max(0, Number(it.purchaseCostWithGst) || 0);
      const pGst = it.purchaseGstPercent !== undefined ? Number(it.purchaseGstPercent) : pct;

      let unitCostBase = pCostBase;
      let unitCostGross = pCostGross;

      if (unitCostGross > 0 && unitCostBase === 0) {
        unitCostBase = pGst > 0 ? Math.round((unitCostGross / (1 + pGst / 100)) * 100) / 100 : unitCostGross;
      } else if (unitCostBase > 0 && unitCostGross === 0) {
        unitCostGross = pGst > 0 ? Math.round((unitCostBase * (1 + pGst / 100)) * 100) / 100 : unitCostBase;
      } else if (unitCostGross === 0 && unitCostBase === 0) {
        unitCostBase = 0;
        unitCostGross = 0;
      }

      totalCostOfGoods += Math.round(unitCostBase * qty * 100) / 100;
      totalCostOfGoodsWithGst += Math.round(unitCostGross * qty * 100) / 100;
    }

    // 2. Line Item Sale & Tax Calculation
    if (isNonGstFirm) {
      const rate = Math.max(0, Number(it.grossRate !== undefined ? it.grossRate : it.rate) || 0);
      const lineTotal = Math.max(0, Math.round(((rate * qty) - lineDisc) * 100) / 100);
      totalTaxable += lineTotal;
      totalLinesWithGst += lineTotal;
      return;
    }

    // GST Firm: SGS
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
    totalLinesWithGst += itemCalc.totalWithGst;
  });

  totalTaxable = Math.round(totalTaxable * 100) / 100;
  totalCgst = Math.round(totalCgst * 100) / 100;
  totalSgst = Math.round(totalSgst * 100) / 100;
  totalIgst = Math.round(totalIgst * 100) / 100;
  totalTax = isNonGstFirm ? 0 : (isInterState ? totalIgst : Math.round((totalCgst + totalSgst) * 100) / 100);
  totalLinesWithGst = Math.round(totalLinesWithGst * 100) / 100;
  totalCostOfGoods = Math.round(totalCostOfGoods * 100) / 100;
  totalCostOfGoodsWithGst = Math.round(totalCostOfGoodsWithGst * 100) / 100;

  const validInvDiscount = Math.max(0, Number(invoiceDiscount) || 0);
  const netTaxableAmount = Math.max(0, Math.round((totalTaxable - validInvDiscount) * 100) / 100);

  // Grand Total calculation:
  // In standard retail/service billing (like Free GST Billing Software),
  // total lines with GST minus invoice discount gives unrounded payable amount.
  const unroundedTotal = Math.max(0, Math.round((totalLinesWithGst - validInvDiscount) * 100) / 100);
  
  let roundOff = Number(roundOffAdjustment.toFixed(2));
  if (autoRoundOff) {
    const target = Math.round(unroundedTotal);
    roundOff = Math.round((target - unroundedTotal) * 100) / 100;
  }

  const grandTotal = Math.max(0, Math.round((unroundedTotal + roundOff) * 100) / 100);

  // Profit calculation:
  // User Requirement: "profit cost is different between item buy with GST and sale amount with GST"
  // Cash profit = (Sale Amount with GST) - (Total Spares Buy Cost with GST) - (Extra Manual Expenses)
  const validExtraCost = Math.max(0, Number(manualExtraCost) || 0);
  const grossProfit = Math.round((grandTotal - totalCostOfGoodsWithGst) * 100) / 100;
  const netProfit = Math.round((grossProfit - validExtraCost) * 100) / 100;
  const taxableProfit = Math.round((netTaxableAmount - totalCostOfGoods - validExtraCost) * 100) / 100;
  const profitMarginPercent = grandTotal > 0 
    ? Number(((netProfit / grandTotal) * 100).toFixed(1)) 
    : 0;

  return {
    subtotal: totalTaxable,
    totalItemDiscount: Math.round(totalItemDiscount * 100) / 100,
    invoiceDiscount: validInvDiscount,
    netTaxableAmount,
    totalCgst,
    totalSgst,
    totalIgst,
    totalTax,
    totalCostOfGoods,
    totalCostOfGoodsWithGst,
    manualExtraCost: validExtraCost,
    grossProfit,
    netProfit,
    taxableProfit,
    profitMarginPercent,
    totalLinesWithGst,
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
