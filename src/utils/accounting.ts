/**
 * Accounting core for Spider Grid Solutions CRM.
 *
 * Everything here is a PURE function (no React, no localStorage) so the stock,
 * cash-flow, GST and profit rules can be tested on their own and used from the
 * context. Rules implemented:
 *
 *  - Inventory.unitCost  = base cost per unit WITHOUT GST (landed, weighted average)
 *  - Inventory.unitPrice = selling price per unit INCLUDING GST
 *  - Bill discount is a PRE-TAX (trade) discount: it reduces the taxable value and
 *    GST follows it. invoice.subtotal = taxable value after line discounts,
 *    invoice.taxAmount is already the GST after the bill discount, so
 *    grand total = subtotal - discount + taxAmount + roundOff
 *    (older bills saved with an after-tax discount are still understood)
 *  - Profit = taxable value after discount - cost of items - extra cost (GST is never profit)
 *  - SGS invoices reduce stock, quotations and Pandiyan bills do not
 *  - Cancel / delete / edit of an invoice or vendor bill reverses stock + cash
 */
import type {
  BillingFirm,
  CashFlowEntry,
  CustomerPaymentAllocation,
  CustomerPaymentAllocationItem,
  InventoryItem,
  Invoice,
  InvoiceItem,
  InvoicePaymentRecord,
  PaymentAccountType,
  PaymentMode,
  PaymentModeChoice,
  StockTransaction,
  Vendor,
  VendorBill,
  VendorBillItem,
  VendorPaymentRecord,
} from '../types';

// ------------------------------------------------------------------ basics

export const round2 = (n: number): number => {
  const v = Number(n);
  if (!isFinite(v)) return 0;
  return Math.round((v + Math.sign(v) * Number.EPSILON) * 100) / 100;
};

/** Unique id (Date.now() alone collides when two entries are made in the same ms). */
export const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** Today's date in the user's LOCAL timezone (toISOString() gives yesterday before 5:30 AM IST). */
export const todayLocal = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** CGST + SGST that always add up exactly to the total tax. */
export function splitTax(totalTax: number): { cgst: number; sgst: number } {
  const safe = round2(Math.max(0, Number(totalTax) || 0));
  const cgst = round2(safe / 2);
  return { cgst, sgst: round2(safe - cgst) };
}

/** Compute GST-inclusive purchase cost from a base cost and GST %. Never adds GST if gstPercent <= 0. */
export function computeGstInclusiveCost(baseCost: number, gstPercent: number): number {
  const base = round2(Math.max(0, Number(baseCost) || 0));
  const pct = Math.max(0, Math.min(100, Number(gstPercent) || 0));
  if (pct <= 0 || base <= 0) return base;
  const gstAmt = round2((base * pct) / 100);
  return round2(base + gstAmt);
}

/**
 * Resolve the Spare Cost (₹) to display/use for an inventory item on an invoice:
 * - Spider Grid Solutions (GST firm, claims Input GST Credit): uses base unitCost WITHOUT GST.
 * - Pandiyan Computers (Non-GST firm, cannot claim ITC): uses GST-inclusive purchase cost
 *   (Base Cost + Applicable GST Amount) when the stock came from a GST vendor purchase.
 * - Never assumes 18% GST for Without-GST purchases or items without GST, and never adds GST twice.
 */
export function resolveSpareCostForFirm(
  inv: InventoryItem,
  billingFirm: BillingFirm,
  vendorBills: VendorBill[] = []
): {
  spareCost: number;
  baseCost: number;
  gstPercent: number;
  gstAmount: number;
  isGstInclusive: boolean;
} {
  const baseCost = round2(Math.max(0, Number(inv.unitCost) || 0));
  const linkedBill = inv.vendorBillId
    ? vendorBills.find(b => b.id === inv.vendorBillId)
    : undefined;

  let gstPercent = 0;
  let inclusiveCost = baseCost;
  let isGstApplicable = false;

  if (linkedBill && !isVendorBillGst(linkedBill)) {
    // Explicitly a Without-GST vendor bill: never assume 18% GST
    gstPercent = 0;
    inclusiveCost = baseCost;
    isGstApplicable = false;
  } else if (inv.gstPercent !== undefined && Number.isFinite(Number(inv.gstPercent))) {
    gstPercent = Math.max(0, Math.min(100, Number(inv.gstPercent) || 0));
    if (gstPercent > 0) {
      inclusiveCost =
        inv.unitCostWithGst !== undefined && Number(inv.unitCostWithGst) > 0
          ? round2(Number(inv.unitCostWithGst))
          : computeGstInclusiveCost(baseCost, gstPercent);
      isGstApplicable = true;
    } else {
      inclusiveCost = baseCost;
      isGstApplicable = false;
    }
  } else if (inv.unitCostWithGst !== undefined && Number(inv.unitCostWithGst) > baseCost) {
    inclusiveCost = round2(Number(inv.unitCostWithGst));
    gstPercent = baseCost > 0 ? round2(((inclusiveCost - baseCost) / baseCost) * 100) : 0;
    isGstApplicable = true;
  } else if (linkedBill && isVendorBillGst(linkedBill)) {
    // Legacy inventory record linked to a GST vendor bill prior to storing gstPercent on InventoryItem
    const invNorm = inv.name.trim().toLowerCase();
    const matchedLine =
      (linkedBill.items || []).find(it => it.matchedInventoryId === inv.id) ||
      (linkedBill.items || []).find(it => it.itemName?.trim().toLowerCase() === invNorm);
    const derivedPct = matchedLine
      ? Math.max(0, Number(matchedLine.gstPercent) || 0)
      : 0;
    gstPercent = derivedPct;
    inclusiveCost = derivedPct > 0 ? computeGstInclusiveCost(baseCost, derivedPct) : baseCost;
    isGstApplicable = derivedPct > 0;
  }

  const gstAmount = isGstApplicable ? round2(Math.max(0, inclusiveCost - baseCost)) : 0;

  if (billingFirm === 'pandiyan') {
    return {
      spareCost: isGstApplicable ? inclusiveCost : baseCost,
      baseCost,
      gstPercent,
      gstAmount,
      isGstInclusive: isGstApplicable,
    };
  }

  return {
    spareCost: baseCost,
    baseCost,
    gstPercent,
    gstAmount,
    isGstInclusive: false,
  };
}

/** Find a vendor record strictly by vendorId first, then exact case-insensitive name. */
export function resolveVendorRecord(
  vendors: Vendor[],
  vendorId?: string,
  vendorName?: string
): Vendor | undefined {
  if (vendorId) {
    const byId = vendors.find(v => v.id === vendorId);
    if (byId) return byId;
  }
  const norm = vendorName?.trim().toLowerCase();
  if (!norm) return undefined;
  return vendors.find(v => v.name.trim().toLowerCase() === norm);
}

/**
 * Resolve ONLY the specific vendor's saved UPI ID.
 * Returns null when the vendor has no UPI ID saved (never falls back to any global or workshop UPI).
 */
export function resolveVendorUpiId(
  vendors: Vendor[],
  vendorId?: string,
  vendorName?: string
): string | null {
  const v = resolveVendorRecord(vendors, vendorId, vendorName);
  const upi = v?.upiId?.trim();
  return upi ? upi : null;
}

/**
 * Paise-safe Vendor Bill total summary.
 * Guarantees: subtotal + taxAmount - discount + roundOff === totalAmount (clamped >= 0).
 */
export function computeVendorBillTotals(params: {
  items: VendorBillItem[];
  isGstBill: boolean;
  discount?: number;
  roundOff?: number;
}): {
  subtotal: number;
  taxAmount: number;
  cgst: number;
  sgst: number;
  discount: number;
  roundOff: number;
  totalAmount: number;
} {
  const { items = [], isGstBill, discount = 0, roundOff = 0 } = params;
  let subPaise = 0;
  let taxPaise = 0;

  for (const it of items) {
    const qty = Math.max(0, Number(it.quantity) || 0);
    const baseUnit = round2(Math.max(0, Number(it.unitCost) || 0));
    const lineBase =
      it.total !== undefined && Number.isFinite(Number(it.total))
        ? round2(Math.max(0, Number(it.total)))
        : round2(baseUnit * qty);
    const lineTax = isGstBill
      ? it.gstAmount !== undefined && Number.isFinite(Number(it.gstAmount))
        ? round2(Math.max(0, Number(it.gstAmount)))
        : round2((lineBase * Math.max(0, Number(it.gstPercent) || 0)) / 100)
      : 0;
    subPaise += Math.round(lineBase * 100);
    taxPaise += Math.round(lineTax * 100);
  }

  const subtotal = subPaise / 100;
  const taxAmount = isGstBill ? taxPaise / 100 : 0;
  const { cgst, sgst } = splitTax(taxAmount);
  const safeDiscount = round2(Math.max(0, Number(discount) || 0));
  const safeRoundOff = round2(Number(roundOff) || 0);
  const totalPaise = Math.max(
    0,
    subPaise + (isGstBill ? taxPaise : 0) - Math.round(safeDiscount * 100) + Math.round(safeRoundOff * 100)
  );

  return {
    subtotal,
    taxAmount,
    cgst,
    sgst,
    discount: safeDiscount,
    roundOff: safeRoundOff,
    totalAmount: totalPaise / 100,
  };
}

// ------------------------------------------------------------------ invoice maths

type TotalsInput = Pick<Invoice, 'subtotal' | 'taxAmount' | 'discount' | 'roundOff'> &
  Partial<Pick<Invoice, 'grandTotal' | 'cgstAmount' | 'sgstAmount' | 'igstAmount' | 'isInterState' | 'items'>>;

/**
 * Old bills (saved before the pre-tax discount rule) took the discount off the final, after-tax total
 * and left taxAmount untouched. New bills store taxAmount already reduced for the discount.
 * Both give the same grand total, so we tell them apart by comparing the bill's GST with the sum of
 * its item GST: equal => the tax was never reduced => old rule.
 */
function isLegacyPostTaxDiscount(inv: TotalsInput): boolean {
  const d = Number(inv.discount) || 0;
  if (!(d > 0) || !inv.items || inv.items.length === 0) return false;
  const itemsTax = inv.items.reduce((sum, it) => sum + (Number(it.gstAmount) || 0), 0);
  if (!(itemsTax > 0)) return false;
  return Math.abs((Number(inv.taxAmount) || 0) - itemsTax) <= 0.05;
}

/**
 * Net taxable value and GST of an invoice after the bill discount.
 * grand total = taxable + tax + roundOff
 */
export function netOfDiscount(inv: TotalsInput) {
  const subtotal = Number(inv.subtotal) || 0;
  const tax = Number(inv.taxAmount) || 0;
  const discount = Math.max(Number(inv.discount) || 0, 0);

  let taxable: number, netTax: number;
  if (isLegacyPostTaxDiscount(inv)) {
    // old rule: discount came off after-tax total, spread it over value and GST
    const gross = subtotal + tax;
    const d = Math.min(discount, gross);
    const ratio = gross > 0 ? (gross - d) / gross : 1;
    netTax = round2(tax * ratio);
    taxable = round2(gross - d - netTax);
  } else {
    taxable = round2(Math.max(0, subtotal - discount));
    netTax = round2(tax); // already reduced for the discount when the bill was saved
  }
  const ratio = subtotal > 0 ? taxable / subtotal : 1;

  // CGST/SGST/IGST: use what the bill stored if it adds up, else split here
  let cgst = 0, sgst = 0, igst = 0;
  const stored = (Number(inv.cgstAmount) || 0) + (Number(inv.sgstAmount) || 0) + (Number(inv.igstAmount) || 0);
  if (stored > 0 && Math.abs(stored - netTax) <= 0.05 && !isLegacyPostTaxDiscount(inv)) {
    cgst = round2(Number(inv.cgstAmount) || 0);
    sgst = round2(Number(inv.sgstAmount) || 0);
    igst = round2(Number(inv.igstAmount) || 0);
  } else if (inv.isInterState) {
    igst = netTax;
  } else {
    ({ cgst, sgst } = splitTax(netTax));
  }
  return { taxable, tax: netTax, cgst, sgst, igst, ratio };
}

export const purchaseCostOf = (items: InvoiceItem[] = []): number =>
  round2(items.reduce((s, it) => s + (Number(it.purchaseCost) || 0) * (Number(it.quantity) || 0), 0));

/** Net profit of one invoice: taxable value after discount - cost of items - extra cost. */
export function invoiceProfit(
  inv: TotalsInput & { purchaseCostTotal?: number; manualExtraCost?: number; items?: InvoiceItem[] }
): number {
  const net = netOfDiscount(inv);
  const cost = inv.purchaseCostTotal ?? purchaseCostOf(inv.items);
  return round2(net.taxable - (Number(cost) || 0) - (Number(inv.manualExtraCost) || 0));
}

/** grand total = taxable value - pre-tax discount + GST (already after discount) + round-off */
export function grandTotalOf(subtotal: number, tax: number, discount = 0, roundOff = 0): number {
  return round2(Math.max(0, subtotal - (Number(discount) || 0) + tax + (Number(roundOff) || 0)));
}

/** Discount typed as amount or percent -> rupees, never more than the base. */
export function resolveDiscount(value: number, type: 'amount' | 'percent', base: number): number {
  const v = Math.max(0, Number(value) || 0);
  const b = Math.max(0, Number(base) || 0);
  const d = type === 'percent' ? (b * Math.min(v, 100)) / 100 : v;
  return round2(Math.min(d, b));
}

/** paid amount can never exceed the bill; status always follows the amount. */
export function normalizePayment(paid: number, total: number): { paid: number; status: 'paid' | 'partial' | 'unpaid' } {
  const t = Math.max(0, Number(total) || 0);
  const p = Math.min(Math.max(0, Number(paid) || 0), t);
  if (t > 0 && p >= t - 0.005) return { paid: round2(t), status: 'paid' };
  if (p > 0) return { paid: round2(p), status: 'partial' };
  return { paid: 0, status: t === 0 ? 'paid' : 'unpaid' };
}

/** Next number in a series, based on the highest existing number (never reuses a deleted number). */
export function nextDocNumber(existing: { invoiceNumber: string }[], prefix: string, minStart = 1): string {
  let max = minStart - 1;
  for (const d of existing) {
    if (!d.invoiceNumber || !d.invoiceNumber.startsWith(prefix)) continue;
    const m = d.invoiceNumber.slice(prefix.length).match(/^\d+$/);
    if (m) max = Math.max(max, parseInt(m[0], 10));
  }
  return `${prefix}${max + 1}`;
}

/** Selling price (incl. GST) that keeps a given markup on the BASE cost. */
export const suggestedSellingPrice = (baseCost: number, gstPercent = 18, markup = 0.35): number =>
  Math.round(baseCost * (1 + markup) * (1 + gstPercent / 100));

// ------------------------------------------------------------------ ledger state

export interface LedgerState {
  inventory: InventoryItem[];
  stockTx: StockTransaction[];
  cashFlow: CashFlowEntry[];
  invoices: Invoice[];
  vendorBills: VendorBill[];
}

const normName = (s: string) => (s || '').trim().toLowerCase();

/** Which stock items (and how many) does this invoice take out of stock? */
export function invoiceStockLines(inv: Invoice, inventory: InventoryItem[]): Map<string, number> {
  const out = new Map<string, number>();
  if (inv.type !== 'invoice' || inv.status === 'cancelled') return out;
  for (const it of inv.items || []) {
    const qty = Number(it.quantity) || 0;
    if (it.isService || qty <= 0) continue;
    const item = it.inventoryItemId
      ? inventory.find(i => i.id === it.inventoryItemId)
      : inventory.find(i => normName(i.name) === normName(it.description));
    if (item) out.set(item.id, (out.get(item.id) || 0) + qty);
  }
  return out;
}

/**
 * Stock this invoice really took out. Bills remember what they took (appliedStock) so
 * cancel / edit / delete put back exactly that, even if the item was renamed or deleted later.
 * Older bills without the snapshot fall back to matching by item / name.
 */
export function appliedLines(inv: Invoice, inventory: InventoryItem[]): Map<string, number> {
  if (inv.appliedStock) {
    const m = new Map<string, number>();
    inv.appliedStock.forEach(l => m.set(l.itemId, (m.get(l.itemId) || 0) + l.qty));
    return m;
  }
  return invoiceStockLines(inv, inventory);
}
const toSnapshot = (m: Map<string, number>) => Array.from(m.entries()).map(([itemId, qty]) => ({ itemId, qty }));

/** Stock shortages for a draft invoice (for warnings in the UI). */
export function findStockShortages(
  draft: Pick<Invoice, 'items' | 'billingFirm' | 'type' | 'status'>,
  inventory: InventoryItem[],
  alreadyTaken?: Map<string, number>
): { itemId: string; name: string; need: number; have: number }[] {
  const lines = invoiceStockLines({ ...draft } as Invoice, inventory);
  const res: { itemId: string; name: string; need: number; have: number }[] = [];
  lines.forEach((need, itemId) => {
    const item = inventory.find(i => i.id === itemId)!;
    const have = item.currentStock + (alreadyTaken?.get(itemId) || 0);
    if (need > have) res.push({ itemId, name: item.name, need, have });
  });
  return res;
}

function moveStock(
  s: LedgerState,
  itemId: string,
  type: 'in' | 'out',
  qty: number,
  meta: { reason: string; date?: string; jobCardId?: string; referenceBillId?: string; referenceInvoiceId?: string }
): LedgerState {
  const item = s.inventory.find(i => i.id === itemId);
  if (!item || qty <= 0) return s;
  const before = item.currentStock;
  const after = type === 'in' ? before + qty : Math.max(0, before - qty);
  const moved = Math.abs(after - before);
  const short = type === 'out' && moved < qty ? ` (only ${moved} in stock, short by ${round2(qty - moved)})` : '';
  const tx: StockTransaction = {
    id: uid('st'),
    itemId,
    itemName: item.name,
    type,
    quantity: moved || qty,
    date: meta.date || todayLocal(),
    reason: meta.reason + short,
    jobCardId: meta.jobCardId,
    referenceBillId: meta.referenceBillId,
    referenceInvoiceId: meta.referenceInvoiceId,
  };
  return {
    ...s,
    inventory: s.inventory.map(i => (i.id === itemId ? { ...i, currentStock: after, updatedAt: todayLocal() } : i)),
    stockTx: [tx, ...s.stockTx],
  };
}


/** Take the invoice's items out of stock; returns the new state and what was REALLY taken. */
function applyInvoiceStockOut(
  s: LedgerState,
  inv: Invoice,
  reason: string,
  lines: Map<string, number>
): { state: LedgerState; applied: { itemId: string; qty: number }[] } {
  let st = s;
  const applied: { itemId: string; qty: number }[] = [];
  lines.forEach((qty, itemId) => {
    const have = st.inventory.find(i => i.id === itemId)?.currentStock ?? 0;
    applied.push({ itemId, qty: Math.min(qty, have) });
    st = moveStock(st, itemId, 'out', qty, {
      reason,
      date: inv.date,
      jobCardId: inv.jobCardId,
      referenceInvoiceId: inv.id,
    });
  });
  return { state: st, applied };
}

function addCash(
  s: LedgerState,
  e: Omit<CashFlowEntry, 'id'>
): LedgerState {
  if (!(e.amount > 0)) return s;
  return { ...s, cashFlow: [{ ...e, amount: round2(e.amount), id: uid('cf') }, ...s.cashFlow] };
}

// ------------------------------------------------------------------ manual stock movement

export function recordStockMovementTx(
  s: LedgerState,
  itemId: string,
  type: 'in' | 'out',
  qty: number,
  reason: string,
  jobCardId?: string
): LedgerState {
  return moveStock(s, itemId, type, qty, { reason, jobCardId });
}

// ------------------------------------------------------------------ invoices

export function addInvoiceTx(s: LedgerState, data: Omit<Invoice, 'id'>): { state: LedgerState; invoice: Invoice } {
  const pay = normalizePayment(data.paidAmount, data.grandTotal);
  const purchaseCostTotal = data.purchaseCostTotal ?? purchaseCostOf(data.items);
  const inv: Invoice = {
    ...data,
    billingFirm: data.billingFirm || 'sgs',
    id: uid('inv-doc'),
    paidAmount: data.status === 'cancelled' ? 0 : pay.paid,
    paymentStatus: data.status === 'cancelled' ? 'cancelled' : pay.status,
    purchaseCostTotal,
    manualExtraCost: data.manualExtraCost ?? 0,
    status: data.status || 'active',
  };
  inv.profitAmount = invoiceProfit(inv);

  let st: LedgerState = { ...s, invoices: [inv, ...s.invoices] };

  const out = applyInvoiceStockOut(st, inv, `Invoice Sale: ${inv.invoiceNumber} (${inv.customerName})`, invoiceStockLines(inv, st.inventory));
  st = {
    ...out.state,
    invoices: out.state.invoices.map(i => (i.id === inv.id ? { ...i, appliedStock: out.applied } : i)),
  };
  inv.appliedStock = out.applied;

  if (inv.paidAmount > 0 && inv.status !== 'cancelled') {
    st = addCash(st, {
      date: inv.date,
      type: 'income',
      category: inv.type === 'invoice' ? 'Service Charge' : 'Advance Payment',
      description: `Customer: ${inv.customerName} (${inv.invoiceNumber}) [${inv.billingFirm === 'pandiyan' ? 'Pandiyan Computers' : 'SGS'}]`,
      amount: inv.paidAmount,
      paymentMode: inv.paymentMode,
      referenceId: inv.id,
      referenceNumber: inv.paymentReference,
    });
  }
  return { state: st, invoice: inv };
}

export function updateInvoiceTx(s: LedgerState, id: string, updates: Partial<Invoice>): LedgerState {
  const old = s.invoices.find(i => i.id === id);
  if (!old) return s;
  const merged: Invoice = { ...old, ...updates };

  if (updates.items && updates.purchaseCostTotal === undefined) merged.purchaseCostTotal = purchaseCostOf(merged.items);
  if (merged.status !== 'cancelled') {
    const pay = normalizePayment(merged.paidAmount, merged.grandTotal);
    merged.paidAmount = pay.paid;
    merged.paymentStatus = pay.status;
  }
  merged.profitAmount = invoiceProfit(merged);

  let st: LedgerState = { ...s, invoices: s.invoices.map(i => (i.id === id ? merged : i)) };

  // stock: compare what the OLD version really took out vs what the NEW version should take out
  const oldLines = appliedLines(old, s.inventory);
  const newLines = invoiceStockLines(merged, s.inventory);
  const newApplied = new Map<string, number>();
  const ids = new Set<string>([...oldLines.keys(), ...newLines.keys()]);
  ids.forEach(itemId => {
    const before = oldLines.get(itemId) || 0;
    const want = newLines.get(itemId) || 0;
    const delta = want - before;
    if (Math.abs(delta) < 1e-9) {
      if (before > 0) newApplied.set(itemId, before);
      return;
    }
    if (delta > 0) {
      const have = st.inventory.find(i => i.id === itemId)?.currentStock ?? 0;
      newApplied.set(itemId, before + Math.min(delta, have));
    } else if (want > 0) {
      newApplied.set(itemId, want);
    }
    st = moveStock(st, itemId, delta > 0 ? 'out' : 'in', Math.abs(delta), {
      reason: `Invoice edited: ${merged.invoiceNumber}`,
      referenceInvoiceId: id,
    });
  });
  st = { ...st, invoices: st.invoices.map(i => (i.id === id ? { ...i, appliedStock: toSnapshot(newApplied) } : i)) };

  // cash: log only the difference in money received
  const diff = round2((merged.paidAmount || 0) - (old.paidAmount || 0));
  if (diff > 0) {
    st = addCash(st, {
      date: todayLocal(),
      type: 'income',
      category: 'Service Charge',
      description: `Payment from ${merged.customerName} (${merged.invoiceNumber}) - bill edited`,
      amount: diff,
      paymentMode: merged.paymentMode,
      referenceId: id,
      referenceNumber: merged.paymentReference,
    });
  } else if (diff < 0) {
    st = addCash(st, {
      date: todayLocal(),
      type: 'expense',
      category: 'Customer Refund',
      description: `Refund to ${merged.customerName} (${merged.invoiceNumber}) - bill edited`,
      amount: -diff,
      paymentMode: merged.paymentMode,
      referenceId: id,
    });
  }
  return st;
}

export function payInvoiceTx(
  s: LedgerState,
  id: string,
  paidAmount: number,
  mode: PaymentMode,
  paymentReference?: string
): LedgerState {
  const inv = s.invoices.find(i => i.id === id);
  if (!inv || inv.status === 'cancelled') return s;
  const pay = normalizePayment(paidAmount, inv.grandTotal);
  const delta = round2(pay.paid - (inv.paidAmount || 0));
  let st: LedgerState = {
    ...s,
    invoices: s.invoices.map(i =>
      i.id === id
        ? {
            ...i,
            paidAmount: pay.paid,
            paymentStatus: pay.status,
            paymentMode: mode,
            paymentReference: paymentReference !== undefined ? paymentReference : i.paymentReference,
          }
        : i
    ),
  };
  if (delta > 0) {
    st = addCash(st, {
      date: todayLocal(),
      type: 'income',
      category: 'Service Charge',
      description: `Payment from ${inv.customerName} (${inv.invoiceNumber})`,
      amount: delta,
      paymentMode: mode,
      referenceId: id,
      referenceNumber: paymentReference || inv.paymentReference,
    });
  } else if (delta < 0) {
    st = addCash(st, {
      date: todayLocal(),
      type: 'expense',
      category: 'Customer Refund',
      description: `Refund to ${inv.customerName} (${inv.invoiceNumber})`,
      amount: -delta,
      paymentMode: mode,
      referenceId: id,
    });
  }
  return st;
}

export function cancelInvoiceTx(s: LedgerState, id: string, reason = 'Cancelled by Admin'): LedgerState {
  const inv = s.invoices.find(i => i.id === id);
  if (!inv || inv.status === 'cancelled') return s;

  let st: LedgerState = s;
  // put back exactly what this bill took out
  appliedLines(inv, s.inventory).forEach((qty, itemId) => {
    st = moveStock(st, itemId, 'in', qty, { reason: `Invoice cancelled: ${inv.invoiceNumber}`, referenceInvoiceId: id });
  });
  // money that was received is returned
  const refunded = inv.paidAmount || 0;
  if (refunded > 0) {
    st = addCash(st, {
      date: todayLocal(),
      type: 'expense',
      category: 'Customer Refund',
      description: `Refund - cancelled ${inv.invoiceNumber} (${inv.customerName})`,
      amount: refunded,
      paymentMode: inv.paymentMode,
      referenceId: id,
    });
  }
  return {
    ...st,
    invoices: st.invoices.map(i =>
      i.id === id
        ? {
            ...i,
            status: 'cancelled',
            paymentStatus: 'cancelled',
            paidAmount: 0,
            appliedStock: [],
            cancelledReason: refunded > 0 ? `${reason} (refund ₹${round2(refunded)} recorded)` : reason,
          }
        : i
    ),
  };
}

export function deleteInvoiceTx(s: LedgerState, id: string): LedgerState {
  const inv = s.invoices.find(i => i.id === id);
  if (!inv) return s;
  let st: LedgerState = s;
  if (inv.status !== 'cancelled') {
    appliedLines(inv, s.inventory).forEach((qty, itemId) => {
      st = moveStock(st, itemId, 'in', qty, { reason: `Invoice deleted: ${inv.invoiceNumber}`, referenceInvoiceId: id });
    });
  }
  // the document disappears, so everything that hangs on it disappears too
  return {
    ...st,
    invoices: st.invoices.filter(i => i.id !== id),
    cashFlow: st.cashFlow.filter(c => c.referenceId !== id),
    stockTx: st.stockTx.filter(t => t.referenceInvoiceId !== id),
  };
}

/** Quotation -> invoice. Stock is taken out now; advance money was already logged when it was received. */
export function convertQuotationTx(
  s: LedgerState,
  quotationId: string,
  invoiceNumber: string,
  date: string,
  notes?: string
): { state: LedgerState; invoice: Invoice } {
  const quot = s.invoices.find(i => i.id === quotationId);
  if (!quot) throw new Error('Quotation not found');
  const converted: Invoice = { ...quot, type: 'invoice', invoiceNumber, date, notes: notes ?? quot.notes };
  let st: LedgerState = { ...s, invoices: s.invoices.map(i => (i.id === quotationId ? converted : i)) };
  const out = applyInvoiceStockOut(st, converted, `Invoice Sale: ${converted.invoiceNumber} (${converted.customerName})`, invoiceStockLines(converted, st.inventory));
  st = {
    ...out.state,
    invoices: out.state.invoices.map(i => (i.id === quotationId ? { ...i, appliedStock: out.applied } : i)),
  };
  converted.appliedStock = out.applied;
  // cash entries already point at this document id; just relabel advance -> payment
  st = {
    ...st,
    cashFlow: st.cashFlow.map(c =>
      c.referenceId === quotationId && c.category === 'Advance Payment' ? { ...c, category: 'Service Charge' } : c
    ),
  };
  return { state: st, invoice: converted };
}

// ------------------------------------------------------------------ vendor bills

export function findDuplicateVendorBill(
  bills: VendorBill[],
  vendorName: string,
  invoiceNumber: string
): VendorBill | undefined {
  return bills.find(
    b => normName(b.vendorName) === normName(vendorName) && normName(b.invoiceNumber) === normName(invoiceNumber)
  );
}

export const EMPTY_LEDGER: LedgerState = {
  inventory: [],
  stockTx: [],
  cashFlow: [],
  invoices: [],
  vendorBills: [],
};

/**
 * Determines whether a vendor purchase bill is a GST bill eligible for Stock & Parts Inventory sync.
 * IMPORTANT: Never infer GST bill type from default item `gstPercent` alone.
 * Explicit `isGstBill` boolean always wins; legacy bills without `isGstBill` check actual taxAmount/gstAmount > 0.
 */
export function isVendorBillGst(bill: Pick<VendorBill, 'isGstBill' | 'taxAmount' | 'items'>): boolean {
  if (bill.isGstBill !== undefined) return Boolean(bill.isGstBill);
  if ((Number(bill.taxAmount) || 0) > 0) return true;
  return (bill.items || []).some(it => (Number(it.gstAmount) || 0) > 0);
}

/** Net stock quantity currently attributed to a specific vendor bill across all in/out audit transactions. */
function netBillStockByItem(stockTx: StockTransaction[], billId: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of stockTx) {
    if (t.referenceBillId !== billId) continue;
    const delta = t.type === 'in' ? Number(t.quantity) || 0 : -(Number(t.quantity) || 0);
    m.set(t.itemId, round2((m.get(t.itemId) || 0) + delta));
  }
  return m;
}

function stockInputsSignature(bill: Pick<VendorBill, 'items' | 'discount'>): string {
  const itemsSig = (bill.items || [])
    .filter(it => it.itemName?.trim() && (Number(it.quantity) || 0) > 0)
    .map(it => ({
      n: normName(it.itemName),
      q: round2(Number(it.quantity) || 0),
      c: round2(Number(it.unitCost) || 0),
      g: round2(Number(it.gstPercent) || 0),
      m: it.matchedInventoryId || '',
      s: it.syncMode || 'merge_existing',
    }));
  return JSON.stringify({ d: round2(Number(bill.discount) || 0), items: itemsSig });
}

function resolveBillLandedBase(bill: VendorBill, item: VendorBillItem): number {
  const gross = (bill.items || []).reduce(
    (sum, it) => sum + (it.totalWithGst ?? (it.total || 0) + (it.gstAmount || 0)),
    0
  );
  const discountRatio = bill.discount && gross > 0 ? Math.max(0, 1 - bill.discount / gross) : 1;
  return round2((Number(item.unitCost) || 0) * discountRatio);
}

function resolveBillLandedWithGst(bill: VendorBill, item: VendorBillItem): { landedBase: number; landedWithGst: number; gstPct: number } {
  const landedBase = resolveBillLandedBase(bill, item);
  if (!isVendorBillGst(bill)) {
    return { landedBase, landedWithGst: landedBase, gstPct: 0 };
  }
  const gstPct = Math.max(0, Math.min(100, Number(item.gstPercent) || 0));
  const landedWithGst = computeGstInclusiveCost(landedBase, gstPct);
  return { landedBase, landedWithGst, gstPct };
}

function applyVendorBillStockItems(s: LedgerState, bill: VendorBill, itemsToApply: VendorBillItem[]): LedgerState {
  let st = s;
  for (const item of itemsToApply) {
    const qty = Number(item.quantity) || 0;
    if (qty <= 0 || !item.itemName?.trim()) continue;
    const { landedBase, landedWithGst, gstPct } = resolveBillLandedWithGst(bill, item);

    const target = item.matchedInventoryId
      ? st.inventory.find(i => i.id === item.matchedInventoryId)
      : item.syncMode !== 'create_separate'
        ? st.inventory.find(i => normName(i.name) === normName(item.itemName))
        : undefined;

    if (target && item.syncMode !== 'create_separate') {
      const newStock = round2(target.currentStock + qty);
      // weighted-average base cost (for SGS tax/profit accounting)
      const newCost =
        target.currentStock > 0 && newStock > 0
          ? round2((target.currentStock * target.unitCost + qty * landedBase) / newStock)
          : landedBase;
      // weighted-average GST-inclusive cost (for Pandiyan Computers Non-GST spare cost)
      const existingInclusive =
        target.unitCostWithGst !== undefined && target.unitCostWithGst > 0
          ? target.unitCostWithGst
          : computeGstInclusiveCost(target.unitCost, target.gstPercent ?? gstPct);
      const newCostWithGst =
        target.currentStock > 0 && newStock > 0
          ? round2((target.currentStock * existingInclusive + qty * landedWithGst) / newStock)
          : landedWithGst;
      st = {
        ...st,
        inventory: st.inventory.map(i =>
          i.id === target.id
            ? {
                ...i,
                unitCost: newCost,
                gstPercent: gstPct,
                unitCostWithGst: newCostWithGst,
                unitPrice: i.unitPrice > 0 ? i.unitPrice : suggestedSellingPrice(landedBase, gstPct),
                hsnCode: i.hsnCode || item.hsnCode,
                vendorBillId: bill.id,
                vendorName: bill.vendorName,
                vendorInvoiceNumber: bill.invoiceNumber,
                vendorBillDate: bill.invoiceDate,
              }
            : i
        ),
      };
      st = moveStock(st, target.id, 'in', qty, {
        reason: `Vendor Purchase (${bill.vendorName} - Inv #${bill.invoiceNumber})`,
        date: bill.invoiceDate,
        referenceBillId: bill.id,
      });
    } else {
      const created: InventoryItem = {
        id: uid('item'),
        name: item.itemName.trim(),
        category: 'general',
        currentStock: 0,
        minStockAlert: 2,
        unitCost: landedBase,
        gstPercent: gstPct,
        unitCostWithGst: landedWithGst,
        unitPrice: suggestedSellingPrice(landedBase, gstPct),
        sku: `SP-${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 90 + 10)}`,
        location: 'Main Shelf',
        hsnCode: item.hsnCode || '8471',
        vendorBillId: bill.id,
        vendorName: bill.vendorName,
        vendorInvoiceNumber: bill.invoiceNumber,
        vendorBillDate: bill.invoiceDate,
        updatedAt: todayLocal(),
      };
      st = { ...st, inventory: [created, ...st.inventory] };
      st = moveStock(st, created.id, 'in', qty, {
        reason: `Vendor Bill ${bill.invoiceNumber}`,
        date: bill.invoiceDate,
        referenceBillId: bill.id,
      });
    }
  }
  return st;
}

function applyVendorBillStockIn(s: LedgerState, bill: VendorBill): LedgerState {
  return applyVendorBillStockItems(s, bill, bill.items || []);
}

/**
 * Safely reverses a bill's net stock movement during edit (e.g. GST -> Without GST),
 * clamping to available currentStock so subsequently sold/adjusted items are never damaged,
 * and appending an audit StockTransaction rather than deleting history.
 */
function reverseVendorBillStockForEdit(s: LedgerState, bill: VendorBill, reason: string): LedgerState {
  const netByItem = netBillStockByItem(s.stockTx, bill.id);
  let st = s;

  netByItem.forEach((netQty, itemId) => {
    if (netQty <= 0) return;
    const item = st.inventory.find(i => i.id === itemId);
    if (!item) return;

    const available = Math.max(0, Number(item.currentStock) || 0);
    const safeReverseQty = round2(Math.min(available, netQty));
    const shortfall = round2(netQty - safeReverseQty);
    const auditNote =
      shortfall > 0
        ? `${reason} (reversed ${safeReverseQty} of ${netQty}; ${shortfall} already sold/adjusted)`
        : reason;

    if (safeReverseQty > 0) {
      const nextStock = round2(Math.max(0, available - safeReverseQty));
      const tx: StockTransaction = {
        id: uid('st'),
        itemId,
        itemName: item.name,
        type: 'out',
        quantity: safeReverseQty,
        date: todayLocal(),
        reason: auditNote,
        referenceBillId: bill.id,
      };
      st = {
        ...st,
        inventory: st.inventory.map(i => (i.id === itemId ? { ...i, currentStock: nextStock, updatedAt: todayLocal() } : i)),
        stockTx: [tx, ...st.stockTx],
      };
    } else {
      // All units were already sold/adjusted; record audit trail with 0 quantity so stock is never corrupted
      const tx: StockTransaction = {
        id: uid('st'),
        itemId,
        itemName: item.name,
        type: 'out',
        quantity: 0,
        date: todayLocal(),
        reason: `${reason} (0 in stock — ${netQty} already sold/adjusted; stock unchanged)`,
        referenceBillId: bill.id,
      };
      st = { ...st, stockTx: [tx, ...st.stockTx] };
    }
  });

  return st;
}

/**
 * Reconciles stock by delta when editing a GST bill that remains GST + stock-synced.
 * Preserves audit history and never damages stock if units were already sold/adjusted.
 */
function reconcileEditedGstBillStock(s: LedgerState, bill: VendorBill): LedgerState {
  const oldNet = netBillStockByItem(s.stockTx, bill.id);
  const hasPriorStock = Array.from(oldNet.values()).some(q => q > 0);
  if (!hasPriorStock) {
    return applyVendorBillStockIn(s, bill);
  }

  let st = s;
  const desiredByItemId = new Map<string, { qty: number; item: VendorBillItem }>();
  const newItemsToCreate: VendorBillItem[] = [];

  for (const item of bill.items || []) {
    const qty = Number(item.quantity) || 0;
    if (qty <= 0 || !item.itemName?.trim()) continue;
    const matched = item.matchedInventoryId
      ? st.inventory.find(i => i.id === item.matchedInventoryId)
      : item.syncMode !== 'create_separate'
        ? st.inventory.find(i => normName(i.name) === normName(item.itemName))
        : undefined;

    if (matched && item.syncMode !== 'create_separate') {
      const prev = desiredByItemId.get(matched.id);
      desiredByItemId.set(matched.id, {
        qty: round2((prev?.qty || 0) + qty),
        item,
      });
    } else {
      newItemsToCreate.push(item);
    }
  }

  const allItemIds = new Set<string>([...oldNet.keys(), ...desiredByItemId.keys()]);
  allItemIds.forEach(itemId => {
    const prevQty = Math.max(0, oldNet.get(itemId) || 0);
    const desired = desiredByItemId.get(itemId);
    const nextQty = Math.max(0, desired?.qty || 0);
    const delta = round2(nextQty - prevQty);
    const invItem = st.inventory.find(i => i.id === itemId);
    if (!invItem) return;

    if (delta > 0 && desired) {
      const { landedBase, landedWithGst, gstPct } = resolveBillLandedWithGst(bill, desired.item);
      const newStock = round2(invItem.currentStock + delta);
      const newCost =
        invItem.currentStock > 0 && newStock > 0
          ? round2((invItem.currentStock * invItem.unitCost + delta * landedBase) / newStock)
          : landedBase;
      const existingInclusive =
        invItem.unitCostWithGst !== undefined && invItem.unitCostWithGst > 0
          ? invItem.unitCostWithGst
          : computeGstInclusiveCost(invItem.unitCost, invItem.gstPercent ?? gstPct);
      const newCostWithGst =
        invItem.currentStock > 0 && newStock > 0
          ? round2((invItem.currentStock * existingInclusive + delta * landedWithGst) / newStock)
          : landedWithGst;
      st = {
        ...st,
        inventory: st.inventory.map(i =>
          i.id === itemId
            ? {
                ...i,
                unitCost: newCost,
                gstPercent: gstPct,
                unitCostWithGst: newCostWithGst,
                unitPrice: i.unitPrice > 0 ? i.unitPrice : suggestedSellingPrice(landedBase, gstPct),
                hsnCode: i.hsnCode || desired.item.hsnCode,
                vendorBillId: bill.id,
                vendorName: bill.vendorName,
                vendorInvoiceNumber: bill.invoiceNumber,
                vendorBillDate: bill.invoiceDate,
              }
            : i
        ),
      };
      st = moveStock(st, itemId, 'in', delta, {
        reason: `Vendor Bill Edited (+${delta}): ${bill.vendorName} - Inv #${bill.invoiceNumber}`,
        date: bill.invoiceDate,
        referenceBillId: bill.id,
      });
    } else if (delta < 0) {
      const wantReverse = Math.abs(delta);
      const available = Math.max(0, Number(invItem.currentStock) || 0);
      const safeReverse = round2(Math.min(available, wantReverse));
      const shortfall = round2(wantReverse - safeReverse);
      const reason =
        shortfall > 0
          ? `Vendor Bill Edited (-${wantReverse} requested, reversed ${safeReverse}; ${shortfall} already sold/adjusted): Inv #${bill.invoiceNumber}`
          : `Vendor Bill Edited (-${safeReverse}): ${bill.vendorName} - Inv #${bill.invoiceNumber}`;
      const tx: StockTransaction = {
        id: uid('st'),
        itemId,
        itemName: invItem.name,
        type: 'out',
        quantity: safeReverse,
        date: todayLocal(),
        reason,
        referenceBillId: bill.id,
      };
      st = {
        ...st,
        inventory: st.inventory.map(i =>
          i.id === itemId ? { ...i, currentStock: round2(Math.max(0, available - safeReverse)), updatedAt: todayLocal() } : i
        ),
        stockTx: [tx, ...st.stockTx],
      };
    } else if (delta === 0 && desired) {
      const { landedBase, landedWithGst, gstPct } = resolveBillLandedWithGst(bill, desired.item);
      st = {
        ...st,
        inventory: st.inventory.map(i =>
          i.id === itemId
            ? {
                ...i,
                unitCost: i.vendorBillId === bill.id && i.currentStock === prevQty ? landedBase : i.unitCost,
                gstPercent: gstPct,
                unitCostWithGst: i.vendorBillId === bill.id && i.currentStock === prevQty ? landedWithGst : i.unitCostWithGst,
                vendorName: bill.vendorName,
                vendorInvoiceNumber: bill.invoiceNumber,
                vendorBillDate: bill.invoiceDate,
                updatedAt: todayLocal(),
              }
            : i
        ),
      };
    }
  });

  if (newItemsToCreate.length > 0) {
    st = applyVendorBillStockItems(st, bill, newItemsToCreate);
  }

  return st;
}

function reverseVendorBillStockForDelete(s: LedgerState, id: string): LedgerState {
  const netByItem = netBillStockByItem(s.stockTx, id);
  if (netByItem.size === 0) return s;

  const otherTxItems = new Set(s.stockTx.filter(t => t.referenceBillId !== id).map(t => t.itemId));

  let inventory = s.inventory.map(i => {
    const q = netByItem.get(i.id);
    return q && q > 0 ? { ...i, currentStock: Math.max(0, i.currentStock - q), updatedAt: todayLocal() } : i;
  });
  // items that only ever existed because of this bill are removed with it
  inventory = inventory.filter(i => !(netByItem.has(i.id) && i.vendorBillId === id && i.currentStock === 0 && !otherTxItems.has(i.id)));

  return {
    ...s,
    inventory,
    stockTx: s.stockTx.filter(t => t.referenceBillId !== id),
  };
}

export function addVendorBillTx(
  s: LedgerState,
  billData: Omit<VendorBill, 'id' | 'createdAt'>,
  updateStock = true,
  accountMeta?: { accountType?: PaymentAccountType; bankAccountId?: string; paymentModeChoice?: PaymentModeChoice }
): { state: LedgerState; bill: VendorBill } {
  const gstBill = isVendorBillGst(billData);
  const effectiveUpdateStock = Boolean(updateStock && gstBill);
  const pay = normalizePayment(billData.paidAmount, billData.totalAmount);
  const bill: VendorBill = {
    ...billData,
    isGstBill: gstBill,
    stockSynced: effectiveUpdateStock,
    id: uid('bill'),
    createdAt: new Date().toISOString(),
    paymentDate: billData.paymentDate || todayLocal(),
    paidAmount: pay.paid,
    paymentStatus: pay.status === 'unpaid' ? 'pending' : pay.status,
  };

  let st: LedgerState = { ...s, vendorBills: [bill, ...s.vendorBills] };

  if (effectiveUpdateStock) {
    st = applyVendorBillStockIn(st, bill);
  }

  if (bill.paidAmount > 0) {
    const mode = bill.paymentMode || 'upi';
    const accType: PaymentAccountType = accountMeta?.accountType || (mode === 'cash' ? 'cash' : 'bank');
    st = addCash(st, {
      date: bill.invoiceDate,
      type: 'expense',
      category: 'Vendor Payment',
      categoryId: 'mfc-vendor',
      categoryName: 'Vendor Payment',
      subcategory: gstBill ? 'Stock Purchase Bill' : 'Without-GST Purchase Bill',
      subcategoryId: 'mfc-vendor-stock',
      description: `Vendor: ${bill.vendorName} (Inv: ${bill.invoiceNumber})${gstBill ? '' : ' [Non-GST]'}`,
      amount: bill.paidAmount,
      paymentMode: mode,
      paymentModeChoice: accountMeta?.paymentModeChoice,
      accountType: accType,
      bankAccountId: accType === 'bank' ? accountMeta?.bankAccountId : undefined,
      referenceId: bill.id,
      referenceNumber: bill.paymentReference,
      payeeOrCustomer: bill.vendorName,
      vendorId: bill.vendorId,
      vendorBillId: bill.id,
      invoiceNumber: bill.invoiceNumber,
      sourceModule: 'vendor',
      sourceDocId: bill.id,
    });
  }
  return { state: st, bill };
}

export function updateVendorBillTx(
  s: LedgerState,
  id: string,
  updates: Partial<VendorBill>,
  updateStock = true,
  accountMeta?: { accountType?: PaymentAccountType; bankAccountId?: string; paymentModeChoice?: PaymentModeChoice }
): { state: LedgerState; bill?: VendorBill } {
  const old = s.vendorBills.find(b => b.id === id);
  if (!old) return { state: s };

  const draft: VendorBill = {
    ...old,
    ...updates,
    id: old.id,
    createdAt: old.createdAt,
  };
  const gstBill = isVendorBillGst(draft);
  const effectiveUpdateStock = Boolean(updateStock && gstBill);
  const pay = normalizePayment(draft.paidAmount, draft.totalAmount);

  const merged: VendorBill = {
    ...draft,
    isGstBill: gstBill,
    stockSynced: effectiveUpdateStock,
    paidAmount: pay.paid,
    paymentStatus: pay.status === 'unpaid' ? 'pending' : pay.status,
  };

  let st: LedgerState = {
    ...s,
    vendorBills: s.vendorBills.map(b => (b.id === id ? merged : b)),
  };

  const priorNet = netBillStockByItem(st.stockTx, id);
  const hadSyncedStock = Array.from(priorNet.values()).some(q => q > 0);

  if (hadSyncedStock && !effectiveUpdateStock) {
    // GST -> Without-GST (or stock sync turned off): safely reverse stock and preserve audit history
    const reason = !gstBill
      ? `Vendor Bill Converted to Without-GST: ${merged.vendorName} (Inv #${merged.invoiceNumber})`
      : `Vendor Bill Stock Sync Disabled: ${merged.vendorName} (Inv #${merged.invoiceNumber})`;
    st = reverseVendorBillStockForEdit(st, old, reason);
  } else if (!hadSyncedStock && effectiveUpdateStock) {
    // Without-GST -> GST (confirmed) or newly synced GST bill: add stock
    st = applyVendorBillStockIn(st, merged);
  } else if (hadSyncedStock && effectiveUpdateStock) {
    // Both old and new are GST + stock synced: only reconcile if stock-relevant inputs actually changed
    if (stockInputsSignature(old) !== stockInputsSignature(merged)) {
      st = reconcileEditedGstBillStock(st, merged);
    }
  }

  // Reconcile cashFlow entries cleanly without duplicating on repeated saves
  const billCashEntries = st.cashFlow.filter(c => !c.isReversed && (c.referenceId === id || c.vendorBillId === id));
  const deltaPaid = round2((merged.paidAmount || 0) - (old.paidAmount || 0));
  const mode = merged.paymentMode || old.paymentMode || 'upi';
  const accType: PaymentAccountType | undefined =
    accountMeta?.accountType || (accountMeta ? (mode === 'cash' ? 'cash' : 'bank') : undefined);

  if (billCashEntries.length === 1 && !billCashEntries[0].paymentRecordId && Math.abs(billCashEntries[0].amount - (old.paidAmount || 0)) <= 0.01) {
    const entry = billCashEntries[0];
    if (merged.paidAmount <= 0) {
      st = { ...st, cashFlow: st.cashFlow.filter(c => c.id !== entry.id) };
    } else {
      st = {
        ...st,
        cashFlow: st.cashFlow.map(c =>
          c.id === entry.id
            ? {
                ...c,
                date: merged.invoiceDate || c.date,
                subcategory: gstBill ? 'Stock Purchase Bill' : 'Without-GST Purchase Bill',
                description: `Vendor: ${merged.vendorName} (Inv: ${merged.invoiceNumber})${gstBill ? '' : ' [Non-GST]'}`,
                amount: merged.paidAmount,
                paymentMode: mode,
                paymentModeChoice: accountMeta?.paymentModeChoice ?? c.paymentModeChoice,
                accountType: accType ?? c.accountType,
                bankAccountId: accType ? (accType === 'bank' ? accountMeta?.bankAccountId : undefined) : c.bankAccountId,
                referenceNumber: merged.paymentReference !== undefined ? merged.paymentReference : c.referenceNumber,
                payeeOrCustomer: merged.vendorName,
                vendorId: merged.vendorId,
                invoiceNumber: merged.invoiceNumber,
              }
            : c
        ),
      };
    }
  } else if (deltaPaid > 0) {
    const fallbackAccType: PaymentAccountType = accType || (mode === 'cash' ? 'cash' : 'bank');
    st = addCash(st, {
      date: merged.invoiceDate || todayLocal(),
      type: 'expense',
      category: 'Vendor Payment',
      categoryId: 'mfc-vendor',
      categoryName: 'Vendor Payment',
      subcategory: gstBill ? 'Stock Purchase Bill' : 'Without-GST Purchase Bill',
      subcategoryId: 'mfc-vendor-stock',
      description: `Vendor Bill Edited: ${merged.vendorName} (Inv: ${merged.invoiceNumber})${gstBill ? '' : ' [Non-GST]'}`,
      amount: deltaPaid,
      paymentMode: mode,
      paymentModeChoice: accountMeta?.paymentModeChoice,
      accountType: fallbackAccType,
      bankAccountId: fallbackAccType === 'bank' ? accountMeta?.bankAccountId : undefined,
      referenceId: merged.id,
      referenceNumber: merged.paymentReference,
      payeeOrCustomer: merged.vendorName,
      vendorId: merged.vendorId,
      vendorBillId: merged.id,
      invoiceNumber: merged.invoiceNumber,
      sourceModule: 'vendor',
      sourceDocId: merged.id,
    });
  } else if (deltaPaid < 0) {
    const fallbackAccType: PaymentAccountType = accType || (mode === 'cash' ? 'cash' : 'bank');
    st = addCash(st, {
      date: todayLocal(),
      type: 'income',
      category: 'Vendor Refund',
      description: `Vendor Bill Adjusted: ${merged.vendorName} (Inv: ${merged.invoiceNumber})`,
      amount: -deltaPaid,
      paymentMode: mode,
      accountType: fallbackAccType,
      bankAccountId: fallbackAccType === 'bank' ? accountMeta?.bankAccountId : undefined,
      referenceId: merged.id,
      payeeOrCustomer: merged.vendorName,
      vendorId: merged.vendorId,
      vendorBillId: merged.id,
      invoiceNumber: merged.invoiceNumber,
      sourceModule: 'vendor',
      sourceDocId: merged.id,
    });
  } else if (billCashEntries.length > 0) {
    // Paid amount unchanged: keep cashFlow metadata in sync without creating duplicates
    st = {
      ...st,
      cashFlow: st.cashFlow.map(c =>
        !c.isReversed && (c.referenceId === id || c.vendorBillId === id)
          ? {
              ...c,
              subcategory: gstBill ? 'Stock Purchase Bill' : 'Without-GST Purchase Bill',
              payeeOrCustomer: merged.vendorName,
              vendorId: merged.vendorId,
              invoiceNumber: merged.invoiceNumber,
            }
          : c
      ),
    };
  }

  return { state: st, bill: merged };
}

export function payVendorBillTx(
  s: LedgerState,
  id: string,
  paidAmount: number,
  paymentMode?: PaymentMode,
  paymentReference?: string
): LedgerState {
  const bill = s.vendorBills.find(b => b.id === id);
  if (!bill) return s;
  const pay = normalizePayment(paidAmount, bill.totalAmount);
  const delta = round2(pay.paid - (bill.paidAmount || 0));
  let st: LedgerState = {
    ...s,
    vendorBills: s.vendorBills.map(b =>
      b.id === id
        ? {
            ...b,
            paidAmount: pay.paid,
            paymentStatus: pay.status === 'unpaid' ? 'pending' : pay.status,
            paymentMode: paymentMode || b.paymentMode,
            paymentReference: paymentReference !== undefined ? paymentReference : b.paymentReference,
            paymentDate: todayLocal(),
          }
        : b
    ),
  };
  if (delta > 0) {
    st = addCash(st, {
      date: todayLocal(),
      type: 'expense',
      category: 'Vendor Spares',
      description: `Payment to ${bill.vendorName} (Inv: ${bill.invoiceNumber})`,
      amount: delta,
      paymentMode: paymentMode || bill.paymentMode || 'upi',
      referenceId: id,
      referenceNumber: paymentReference || bill.paymentReference,
    });
  } else if (delta < 0) {
    st = addCash(st, {
      date: todayLocal(),
      type: 'income',
      category: 'Vendor Refund',
      description: `Refund from ${bill.vendorName} (Inv: ${bill.invoiceNumber})`,
      amount: -delta,
      paymentMode: paymentMode || bill.paymentMode || 'upi',
      referenceId: id,
    });
  }
  return st;
}

export function deleteVendorBillTx(s: LedgerState, id: string): LedgerState {
  const bill = s.vendorBills.find(b => b.id === id);
  if (!bill) return s;

  const st = reverseVendorBillStockForDelete(s, id);

  return {
    ...st,
    vendorBills: st.vendorBills.filter(b => b.id !== id),
    cashFlow: st.cashFlow.filter(c => c.referenceId !== id && c.vendorBillId !== id),
    stockTx: st.stockTx.filter(t => t.referenceBillId !== id),
  };
}

export type { VendorBillItem };


// ------------------------------------------------------------------ dues, aging, payments

/** Amount still to be received on an invoice (0 for quotations and cancelled bills). */
export function amountDue(inv: Pick<Invoice, 'type' | 'status' | 'grandTotal' | 'paidAmount'>): number {
  if (inv.type !== 'invoice' || inv.status === 'cancelled') return 0;
  return round2(Math.max(0, (Number(inv.grandTotal) || 0) - (Number(inv.paidAmount) || 0)));
}

const dayNumber = (iso: string): number => {
  const [y, m, d] = (iso || '').split('-').map(Number);
  return Math.floor(Date.UTC(y || 1970, (m || 1) - 1, d || 1) / 86400000);
};

/** Days past the due date (0 when not yet due). Without a due date the bill date is used. */
export function daysOverdue(inv: Pick<Invoice, 'date' | 'dueDate'>, today: string = todayLocal()): number {
  const due = inv.dueDate || inv.date;
  return Math.max(0, dayNumber(today) - dayNumber(due));
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return todayLocal(new Date(y, m - 1, d + days));
}

export interface OutstandingRow {
  key: string;
  customerName: string;
  customerPhone: string;
  bills: number;
  billed: number;
  paid: number;
  due: number;
  oldestOverdueDays: number;
  buckets: { current: number; d1_30: number; d31_60: number; d61_90: number; d90plus: number };
}

/** Who owes money: per customer totals + aging buckets (by days past due date). */
export function customerOutstanding(invoices: Invoice[], today: string = todayLocal()): OutstandingRow[] {
  const map = new Map<string, OutstandingRow>();
  for (const inv of invoices) {
    if (inv.type !== 'invoice' || inv.status === 'cancelled') continue;
    const phone = (inv.customerPhone || '').replace(/\D/g, '').slice(-10);
    const key = phone || normName(inv.customerName);
    const row = map.get(key) || {
      key, customerName: inv.customerName, customerPhone: inv.customerPhone || '',
      bills: 0, billed: 0, paid: 0, due: 0, oldestOverdueDays: 0,
      buckets: { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90plus: 0 },
    };
    row.bills += 1;
    row.billed = round2(row.billed + (inv.grandTotal || 0));
    row.paid = round2(row.paid + (inv.paidAmount || 0));
    const due = amountDue(inv);
    if (due > 0) {
      row.due = round2(row.due + due);
      const od = daysOverdue(inv, today);
      row.oldestOverdueDays = Math.max(row.oldestOverdueDays, od);
      const b = row.buckets;
      if (od === 0) b.current = round2(b.current + due);
      else if (od <= 30) b.d1_30 = round2(b.d1_30 + due);
      else if (od <= 60) b.d31_60 = round2(b.d31_60 + due);
      else if (od <= 90) b.d61_90 = round2(b.d61_90 + due);
      else b.d90plus = round2(b.d90plus + due);
    }
    map.set(key, row);
  }
  return Array.from(map.values()).filter(r => r.due > 0).sort((a, b) => b.due - a.due);
}

/** Money received / refunded against one document (for the payment history list). */
export function paymentsOf(cashFlow: CashFlowEntry[], docId: string): CashFlowEntry[] {
  return cashFlow
    .filter(c => c.referenceId === docId)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}


// ------------------------------------------------------------------ GST summaries for printing / returns

/** Tax split of a bill by GST rate (a bill can mix 18% goods with 0% / 5% items). */
export function taxByRate(inv: Invoice): { rate: number; taxable: number; tax: number; cgst: number; sgst: number; igst: number }[] {
  const net = netOfDiscount(inv);
  const map = new Map<number, { taxable: number; tax: number }>();
  for (const it of inv.items || []) {
    const rate = it.gstPercent ?? inv.gstPercent ?? 0;
    const taxable = (Number(it.amount) || 0) * net.ratio;
    const tax = (it.gstAmount !== undefined ? Number(it.gstAmount) : (Number(it.amount) || 0) * rate / 100) * net.ratio;
    const row = map.get(rate) || { taxable: 0, tax: 0 };
    row.taxable += taxable;
    row.tax += tax;
    map.set(rate, row);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([rate, v]) => {
      const tax = round2(v.tax);
      const split = inv.isInterState ? { cgst: 0, sgst: 0 } : splitTax(tax);
      return { rate, taxable: round2(v.taxable), tax, cgst: split.cgst, sgst: split.sgst, igst: inv.isInterState ? tax : 0 };
    });
}

/** HSN-wise summary (taxable value and tax per HSN + rate) shown on GST invoices. */
export function hsnSummary(inv: Invoice): { hsn: string; rate: number; qty: number; taxable: number; tax: number }[] {
  const net = netOfDiscount(inv);
  const map = new Map<string, { hsn: string; rate: number; qty: number; taxable: number; tax: number }>();
  for (const it of inv.items || []) {
    const hsn = (it.hsnCode || '').trim() || '-';
    const rate = it.gstPercent ?? inv.gstPercent ?? 0;
    const key = `${hsn}|${rate}`;
    const row = map.get(key) || { hsn, rate, qty: 0, taxable: 0, tax: 0 };
    row.qty += Number(it.quantity) || 0;
    row.taxable += (Number(it.amount) || 0) * net.ratio;
    row.tax += (it.gstAmount !== undefined ? Number(it.gstAmount) : (Number(it.amount) || 0) * rate / 100) * net.ratio;
    map.set(key, row);
  }
  return Array.from(map.values()).map(r => ({ ...r, taxable: round2(r.taxable), tax: round2(r.tax) }));
}

// ------------------------------------------------------------------ incremental payments, multi-bill allocation & reversals

export interface RecordInvoicePaymentInput {
  invoiceId?: string;
  jobCardId?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  amount: number;
  date: string;
  paymentMode: PaymentMode;
  paymentModeChoice?: PaymentModeChoice;
  accountType: PaymentAccountType;
  bankAccountId?: string;
  bankAccountName?: string;
  transactionRef?: string;
  notes?: string;
  isAdvance?: boolean;
  uniqueSourceKey?: string;
  createdBy?: string;
}

export function recordInvoicePaymentTx(
  s: LedgerState,
  invoicePayments: InvoicePaymentRecord[],
  input: RecordInvoicePaymentInput
): {
  state: LedgerState;
  invoicePayments: InvoicePaymentRecord[];
  record: InvoicePaymentRecord;
  cashFlowEntry?: CashFlowEntry;
  duplicate: boolean;
} {
  const amt = round2(Number(input.amount) || 0);
  if (amt <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }
  if (input.accountType === 'bank' && !input.bankAccountId) {
    throw new Error('Bank Account selection is required for Bank payments.');
  }

  if (input.uniqueSourceKey) {
    const existingPay = invoicePayments.find(
      p => !p.isReversed && p.uniqueSourceKey === input.uniqueSourceKey
    );
    if (existingPay) {
      return {
        state: s,
        invoicePayments,
        record: existingPay,
        duplicate: true,
      };
    }
    const existingCf = s.cashFlow.find(
      c => !c.isReversed && c.uniqueSourceKey === input.uniqueSourceKey
    );
    if (existingCf) {
      return {
        state: s,
        invoicePayments,
        record: {
          id: existingCf.paymentRecordId || existingCf.id,
          paymentReference: existingCf.referenceNumber || existingCf.id,
          uniqueSourceKey: input.uniqueSourceKey,
          invoiceId: existingCf.invoiceId,
          invoiceNumber: existingCf.invoiceNumber,
          jobCardId: existingCf.jobCardId,
          customerId: existingCf.customerId || input.customerId,
          customerName: existingCf.payeeOrCustomer || input.customerName,
          customerPhone: input.customerPhone,
          amount: existingCf.amount,
          date: existingCf.date,
          paymentMode: existingCf.paymentMode,
          accountType: existingCf.accountType || 'cash',
          bankAccountId: existingCf.bankAccountId,
          cashFlowEntryId: existingCf.id,
          createdAt: existingCf.createdAt || new Date().toISOString(),
        },
        duplicate: true,
      };
    }
  }

  let inv: Invoice | undefined;
  let nextInvoices = s.invoices;
  if (input.invoiceId) {
    inv = s.invoices.find(i => i.id === input.invoiceId);
    if (!inv || inv.status === 'cancelled') {
      throw new Error('Invoice not found or cancelled.');
    }
    const due = Math.max(0, round2((inv.grandTotal || 0) - (inv.paidAmount || 0)));
    if (amt > due + 0.01) {
      throw new Error(`Payment amount (₹${amt.toLocaleString('en-IN')}) exceeds remaining balance (₹${due.toLocaleString('en-IN')}).`);
    }
    const newPaid = round2((inv.paidAmount || 0) + amt);
    const pay = normalizePayment(newPaid, inv.grandTotal);
    nextInvoices = s.invoices.map(i =>
      i.id === inv!.id
        ? {
            ...i,
            paidAmount: pay.paid,
            paymentStatus: pay.status,
            paymentMode: input.paymentMode,
            paymentReference: input.transactionRef?.trim() || i.paymentReference,
          }
        : i
    );
  }

  const cfId = uid('cf');
  const recId = uid('invpay');
  const paymentRef = input.transactionRef?.trim() || `PAY-${Date.now().toString().slice(-6)}`;
  const dateStr = input.date || todayLocal();
  const isAdvance = Boolean(input.isAdvance || !inv);

  const cfEntry: CashFlowEntry = {
    id: cfId,
    date: dateStr,
    type: 'income',
    category: 'Customer Payment',
    categoryId: 'mfc-cust-pay',
    categoryName: 'Customer Payment',
    subcategory: isAdvance ? 'Advance Receipt' : 'Invoice Settlement',
    subcategoryId: isAdvance ? 'mfc-cust-pay-adv' : 'mfc-cust-pay-inv',
    secondSubcategory: inv
      ? inv.billingFirm === 'pandiyan'
        ? 'Pandiyan Estimate'
        : 'SGS Tax Invoice'
      : input.jobCardId
        ? 'Job Card Advance'
        : 'Customer Credit',
    secondSubcategoryId: inv
      ? inv.billingFirm === 'pandiyan'
        ? 'mfc-cust-pay-inv-pc'
        : 'mfc-cust-pay-inv-sgs'
      : input.jobCardId
        ? 'mfc-cust-pay-adv-job'
        : 'mfc-cust-pay-adv-credit',
    description: inv
      ? `Payment from ${input.customerName} (${inv.invoiceNumber})${input.notes ? ` - ${input.notes}` : ''}`
      : `Advance Payment from ${input.customerName}${input.jobCardId ? ` (Job ${input.jobCardId})` : ''}${input.notes ? ` - ${input.notes}` : ''}`,
    amount: amt,
    paymentMode: input.paymentMode,
    paymentModeChoice: input.paymentModeChoice,
    accountType: input.accountType,
    bankAccountId: input.accountType === 'bank' ? input.bankAccountId : undefined,
    referenceId: inv?.id || input.jobCardId || input.customerId,
    referenceNumber: input.transactionRef?.trim() || paymentRef,
    payeeOrCustomer: input.customerName,
    customerId: input.customerId,
    jobCardId: input.jobCardId || inv?.jobCardId,
    invoiceId: inv?.id,
    invoiceNumber: inv?.invoiceNumber,
    sourceModule: inv ? 'billing' : input.jobCardId ? 'job_card' : 'customer',
    sourceDocId: inv?.id || input.jobCardId || input.customerId,
    paymentRecordId: recId,
    uniqueSourceKey: input.uniqueSourceKey,
    notes: input.notes,
    createdBy: input.createdBy || 'CRM User',
    createdAt: new Date().toISOString(),
  };

  const record: InvoicePaymentRecord = {
    id: recId,
    paymentReference: paymentRef,
    uniqueSourceKey: input.uniqueSourceKey,
    invoiceId: inv?.id,
    invoiceNumber: inv?.invoiceNumber,
    jobCardId: input.jobCardId || inv?.jobCardId,
    customerId: input.customerId,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    amount: amt,
    date: dateStr,
    paymentMode: input.paymentMode,
    paymentModeChoice: input.paymentModeChoice,
    accountType: input.accountType,
    bankAccountId: input.accountType === 'bank' ? input.bankAccountId : undefined,
    bankAccountName: input.bankAccountName,
    transactionRef: input.transactionRef?.trim() || undefined,
    notes: input.notes,
    isAdvance,
    cashFlowEntryId: cfId,
    createdBy: input.createdBy || 'CRM User',
    createdAt: new Date().toISOString(),
  };

  return {
    state: {
      ...s,
      invoices: nextInvoices,
      cashFlow: [cfEntry, ...s.cashFlow],
    },
    invoicePayments: [record, ...invoicePayments],
    record,
    cashFlowEntry: cfEntry,
    duplicate: false,
  };
}

export function reverseInvoicePaymentTx(
  s: LedgerState,
  invoicePayments: InvoicePaymentRecord[],
  paymentRecordId: string,
  reason = 'Payment reversed by Admin'
): { state: LedgerState; invoicePayments: InvoicePaymentRecord[] } {
  const now = new Date().toISOString();
  const target = invoicePayments.find(p => p.id === paymentRecordId && !p.isReversed);

  if (target) {
    const nextPayments = invoicePayments.map(p =>
      p.id === target.id ? { ...p, isReversed: true, reversedAt: now, reversalReason: reason } : p
    );
    const nextCashFlow = s.cashFlow.map(c =>
      c.id === target.cashFlowEntryId || c.paymentRecordId === target.id
        ? { ...c, isReversed: true, reversedAt: now, reversalReason: reason }
        : c
    );
    let nextInvoices = s.invoices;
    if (target.invoiceId) {
      nextInvoices = s.invoices.map(inv => {
        if (inv.id !== target.invoiceId) return inv;
        const reduced = Math.max(0, round2((inv.paidAmount || 0) - target.amount));
        const pay = normalizePayment(reduced, inv.grandTotal);
        return { ...inv, paidAmount: pay.paid, paymentStatus: inv.status === 'cancelled' ? 'cancelled' : pay.status };
      });
    }
    return {
      state: { ...s, invoices: nextInvoices, cashFlow: nextCashFlow },
      invoicePayments: nextPayments,
    };
  }

  // Fallback for legacy cashFlow entries recorded before invoice_payments collection existed
  const cf = s.cashFlow.find(c => c.id === paymentRecordId && !c.isReversed);
  if (!cf) return { state: s, invoicePayments };

  const linkedInvoiceId = cf.invoiceId || cf.referenceId;
  const nextCashFlow = s.cashFlow.map(c =>
    c.id === cf.id ? { ...c, isReversed: true, reversedAt: now, reversalReason: reason } : c
  );
  const nextInvoices = linkedInvoiceId
    ? s.invoices.map(inv => {
        if (inv.id !== linkedInvoiceId) return inv;
        const delta = cf.type === 'income' ? -cf.amount : cf.amount;
        const reduced = Math.max(0, round2((inv.paidAmount || 0) + delta));
        const pay = normalizePayment(reduced, inv.grandTotal);
        return { ...inv, paidAmount: pay.paid, paymentStatus: inv.status === 'cancelled' ? ('cancelled' as const) : pay.status };
      })
    : s.invoices;

  return {
    state: { ...s, invoices: nextInvoices, cashFlow: nextCashFlow },
    invoicePayments,
  };
}

export interface RecordCustomerMultiPaymentInput {
  customerId: string;
  customerName: string;
  customerPhone?: string;
  jobCardId?: string;
  totalAmount: number;
  date: string;
  paymentMode: PaymentMode;
  paymentModeChoice?: PaymentModeChoice;
  accountType: PaymentAccountType;
  bankAccountId?: string;
  bankAccountName?: string;
  transactionRef?: string;
  notes?: string;
  allocations: { invoiceId: string; amount: number }[];
  uniqueSourceKey?: string;
  createdBy?: string;
}

export function recordCustomerMultiPaymentTx(
  s: LedgerState,
  invoicePayments: InvoicePaymentRecord[],
  customerAllocations: CustomerPaymentAllocation[],
  input: RecordCustomerMultiPaymentInput
): {
  state: LedgerState;
  invoicePayments: InvoicePaymentRecord[];
  customerAllocations: CustomerPaymentAllocation[];
  allocation: CustomerPaymentAllocation;
  duplicate: boolean;
} {
  const totalAmount = round2(Number(input.totalAmount) || 0);
  if (totalAmount <= 0) {
    throw new Error('Total payment amount must be greater than zero.');
  }
  if (input.accountType === 'bank' && !input.bankAccountId) {
    throw new Error('Bank Account selection is required.');
  }

  if (input.uniqueSourceKey) {
    const existingAlloc = customerAllocations.find(
      a => !a.isReversed && a.uniqueSourceKey === input.uniqueSourceKey
    );
    if (existingAlloc) {
      return {
        state: s,
        invoicePayments,
        customerAllocations,
        allocation: existingAlloc,
        duplicate: true,
      };
    }
  }

  const cleanAllocations: CustomerPaymentAllocationItem[] = [];
  let allocatedSum = 0;

  for (const item of input.allocations || []) {
    const amt = round2(Number(item.amount) || 0);
    if (amt <= 0) continue;
    const inv = s.invoices.find(i => i.id === item.invoiceId);
    if (!inv || inv.status === 'cancelled') {
      throw new Error('Selected invoice not found or cancelled.');
    }
    const due = Math.max(0, round2((inv.grandTotal || 0) - (inv.paidAmount || 0)));
    if (amt > due + 0.01) {
      throw new Error(`Allocated amount ₹${amt} exceeds balance ₹${due} on ${inv.invoiceNumber}.`);
    }
    allocatedSum = round2(allocatedSum + amt);
    cleanAllocations.push({
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      amount: amt,
    });
  }

  if (allocatedSum > totalAmount + 0.01) {
    throw new Error('Allocated invoice amounts cannot exceed total received payment.');
  }

  const unallocatedAmount = round2(Math.max(0, totalAmount - allocatedSum));
  const allocId = uid('allocpay');
  const cfId = uid('cf');
  const dateStr = input.date || todayLocal();
  const paymentRef = input.transactionRef?.trim() || `CUST-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString();

  const invSummaryText =
    cleanAllocations.length > 0
      ? cleanAllocations.map(a => `${a.invoiceNumber} (₹${a.amount})`).join(', ')
      : 'Unallocated Advance';

  const cfEntry: CashFlowEntry = {
    id: cfId,
    date: dateStr,
    type: 'income',
    category: 'Customer Payment',
    categoryId: 'mfc-cust-pay',
    categoryName: 'Customer Payment',
    subcategory: cleanAllocations.length > 0 ? 'Invoice Settlement' : 'Advance Receipt',
    subcategoryId: cleanAllocations.length > 0 ? 'mfc-cust-pay-inv' : 'mfc-cust-pay-adv',
    secondSubcategory: cleanAllocations.length === 0 ? 'Customer Credit' : undefined,
    secondSubcategoryId: cleanAllocations.length === 0 ? 'mfc-cust-pay-adv-credit' : undefined,
    description: `Customer Payment: ${input.customerName} [${invSummaryText}]${unallocatedAmount > 0 && cleanAllocations.length > 0 ? ` + Advance Credit ₹${unallocatedAmount}` : ''}`,
    amount: totalAmount,
    paymentMode: input.paymentMode,
    paymentModeChoice: input.paymentModeChoice,
    accountType: input.accountType,
    bankAccountId: input.accountType === 'bank' ? input.bankAccountId : undefined,
    referenceId: cleanAllocations.length === 1 ? cleanAllocations[0].invoiceId : input.customerId,
    referenceNumber: paymentRef,
    payeeOrCustomer: input.customerName,
    customerId: input.customerId,
    jobCardId: input.jobCardId,
    invoiceId: cleanAllocations.length === 1 ? cleanAllocations[0].invoiceId : undefined,
    invoiceNumber: cleanAllocations.length === 1 ? cleanAllocations[0].invoiceNumber : undefined,
    sourceModule: 'customer',
    sourceDocId: allocId,
    uniqueSourceKey: input.uniqueSourceKey,
    notes: input.notes,
    createdBy: input.createdBy || 'CRM User',
    createdAt: now,
  };

  const allocMap = new Map<string, number>();
  cleanAllocations.forEach(a => allocMap.set(a.invoiceId, round2((allocMap.get(a.invoiceId) || 0) + a.amount)));

  const nextInvoices = s.invoices.map(inv => {
    const addAmt = allocMap.get(inv.id);
    if (!addAmt) return inv;
    const newPaid = round2((inv.paidAmount || 0) + addAmt);
    const pay = normalizePayment(newPaid, inv.grandTotal);
    return {
      ...inv,
      paidAmount: pay.paid,
      paymentStatus: pay.status,
      paymentMode: input.paymentMode,
      paymentReference: input.transactionRef?.trim() || inv.paymentReference,
    };
  });

  const newPaymentRecords: InvoicePaymentRecord[] = cleanAllocations.map((a, idx) => ({
    id: uid(`invpay${idx}`),
    paymentReference: paymentRef,
    invoiceId: a.invoiceId,
    invoiceNumber: a.invoiceNumber,
    jobCardId: input.jobCardId,
    customerId: input.customerId,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    amount: a.amount,
    date: dateStr,
    paymentMode: input.paymentMode,
    paymentModeChoice: input.paymentModeChoice,
    accountType: input.accountType,
    bankAccountId: input.accountType === 'bank' ? input.bankAccountId : undefined,
    bankAccountName: input.bankAccountName,
    transactionRef: input.transactionRef?.trim() || undefined,
    notes: input.notes,
    isAdvance: false,
    allocationId: allocId,
    cashFlowEntryId: cfId,
    createdBy: input.createdBy || 'CRM User',
    createdAt: now,
  }));

  const allocation: CustomerPaymentAllocation = {
    id: allocId,
    uniqueSourceKey: input.uniqueSourceKey,
    customerId: input.customerId,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    jobCardId: input.jobCardId,
    totalAmount,
    allocatedTotal: allocatedSum,
    unallocatedAmount,
    date: dateStr,
    paymentMode: input.paymentMode,
    accountType: input.accountType,
    bankAccountId: input.accountType === 'bank' ? input.bankAccountId : undefined,
    bankAccountName: input.bankAccountName,
    transactionRef: input.transactionRef?.trim() || undefined,
    notes: input.notes,
    allocations: cleanAllocations,
    cashFlowEntryId: cfId,
    createdBy: input.createdBy || 'CRM User',
    createdAt: now,
  };

  return {
    state: {
      ...s,
      invoices: nextInvoices,
      cashFlow: [cfEntry, ...s.cashFlow],
    },
    invoicePayments: [...newPaymentRecords, ...invoicePayments],
    customerAllocations: [allocation, ...customerAllocations],
    allocation,
    duplicate: false,
  };
}

export interface RecordVendorPaymentInput {
  vendorBillId: string;
  amount: number;
  date: string;
  paymentMode: PaymentMode;
  paymentModeChoice?: PaymentModeChoice;
  accountType: PaymentAccountType;
  bankAccountId?: string;
  bankAccountName?: string;
  transactionRef?: string;
  notes?: string;
  uniqueSourceKey?: string;
  createdBy?: string;
}

export function recordVendorPaymentTx(
  s: LedgerState,
  vendorPayments: VendorPaymentRecord[],
  input: RecordVendorPaymentInput
): {
  state: LedgerState;
  vendorPayments: VendorPaymentRecord[];
  record: VendorPaymentRecord;
  duplicate: boolean;
} {
  const amt = round2(Number(input.amount) || 0);
  if (amt <= 0) {
    throw new Error('Vendor payment amount must be greater than zero.');
  }
  if (input.accountType === 'bank' && !input.bankAccountId) {
    throw new Error('Bank Account selection is required for Bank payments.');
  }
  if (input.uniqueSourceKey) {
    const dup = vendorPayments.find(p => !p.isReversed && p.uniqueSourceKey === input.uniqueSourceKey);
    if (dup) {
      return { state: s, vendorPayments, record: dup, duplicate: true };
    }
  }

  const bill = s.vendorBills.find(b => b.id === input.vendorBillId);
  if (!bill) throw new Error('Vendor bill not found.');
  const due = Math.max(0, round2((bill.totalAmount || 0) - (bill.paidAmount || 0)));
  if (amt > due + 0.01) {
    throw new Error(`Payment amount (₹${amt.toLocaleString('en-IN')}) exceeds remaining vendor bill balance (₹${due.toLocaleString('en-IN')}).`);
  }

  const newPaid = round2((bill.paidAmount || 0) + amt);
  const pay = normalizePayment(newPaid, bill.totalAmount);
  const dateStr = input.date || todayLocal();
  const vpId = uid('vpay');
  const cfId = uid('cf');
  const now = new Date().toISOString();

  const cfEntry: CashFlowEntry = {
    id: cfId,
    date: dateStr,
    type: 'expense',
    category: 'Vendor Payment',
    categoryId: 'mfc-vendor',
    categoryName: 'Vendor Payment',
    subcategory: 'Stock Purchase Bill',
    subcategoryId: 'mfc-vendor-stock',
    description: `Payment to ${bill.vendorName} (Inv: ${bill.invoiceNumber})${input.notes ? ` - ${input.notes}` : ''}`,
    amount: amt,
    paymentMode: input.paymentMode,
    paymentModeChoice: input.paymentModeChoice,
    accountType: input.accountType,
    bankAccountId: input.accountType === 'bank' ? input.bankAccountId : undefined,
    referenceId: bill.id,
    referenceNumber: input.transactionRef?.trim() || undefined,
    payeeOrCustomer: bill.vendorName,
    vendorId: bill.vendorId,
    vendorBillId: bill.id,
    invoiceNumber: bill.invoiceNumber,
    sourceModule: 'vendor',
    sourceDocId: bill.id,
    paymentRecordId: vpId,
    uniqueSourceKey: input.uniqueSourceKey,
    notes: input.notes,
    createdBy: input.createdBy || 'CRM User',
    createdAt: now,
  };

  const record: VendorPaymentRecord = {
    id: vpId,
    uniqueSourceKey: input.uniqueSourceKey,
    vendorBillId: bill.id,
    vendorBillNumber: bill.invoiceNumber,
    vendorId: bill.vendorId,
    vendorName: bill.vendorName,
    amount: amt,
    date: dateStr,
    paymentMode: input.paymentMode,
    accountType: input.accountType,
    bankAccountId: input.accountType === 'bank' ? input.bankAccountId : undefined,
    bankAccountName: input.bankAccountName,
    transactionRef: input.transactionRef?.trim() || undefined,
    notes: input.notes,
    cashFlowEntryId: cfId,
    createdBy: input.createdBy || 'CRM User',
    createdAt: now,
  };

  const nextBills = s.vendorBills.map(b =>
    b.id === bill.id
      ? {
          ...b,
          paidAmount: pay.paid,
          paymentStatus: pay.status === 'unpaid' ? ('pending' as const) : pay.status,
          paymentMode: input.paymentMode,
          paymentReference: input.transactionRef?.trim() || b.paymentReference,
          paymentDate: dateStr,
        }
      : b
  );

  return {
    state: {
      ...s,
      vendorBills: nextBills,
      cashFlow: [cfEntry, ...s.cashFlow],
    },
    vendorPayments: [record, ...vendorPayments],
    record,
    duplicate: false,
  };
}

