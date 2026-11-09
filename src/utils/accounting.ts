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
  CashFlowEntry,
  InventoryItem,
  Invoice,
  InvoiceItem,
  PaymentMode,
  StockTransaction,
  VendorBill,
  VendorBillItem,
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
  const cgst = round2(totalTax / 2);
  return { cgst, sgst: round2(totalTax - cgst) };
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
  if (inv.billingFirm === 'pandiyan' || inv.type !== 'invoice' || inv.status === 'cancelled') return out;
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

export function addVendorBillTx(
  s: LedgerState,
  billData: Omit<VendorBill, 'id' | 'createdAt'>,
  updateStock = true
): { state: LedgerState; bill: VendorBill } {
  const pay = normalizePayment(billData.paidAmount, billData.totalAmount);
  const bill: VendorBill = {
    ...billData,
    id: uid('bill'),
    createdAt: new Date().toISOString(),
    paymentDate: billData.paymentDate || todayLocal(),
    paidAmount: pay.paid,
    paymentStatus: pay.status === 'unpaid' ? 'pending' : pay.status,
  };

  let st: LedgerState = { ...s, vendorBills: [bill, ...s.vendorBills] };

  if (updateStock) {
    // Vendor discount lowers the real (landed) cost of every item
    const gross = (bill.items || []).reduce(
      (sum, it) => sum + (it.totalWithGst ?? (it.total || 0) + (it.gstAmount || 0)),
      0
    );
    const discountRatio = bill.discount && gross > 0 ? Math.max(0, 1 - bill.discount / gross) : 1;

    for (const item of bill.items || []) {
      const qty = Number(item.quantity) || 0;
      if (qty <= 0 || !item.itemName?.trim()) continue;
      const landedBase = round2((Number(item.unitCost) || 0) * discountRatio);
      const gstPct = item.gstPercent ?? 18;

      const target = item.matchedInventoryId
        ? st.inventory.find(i => i.id === item.matchedInventoryId)
        : item.syncMode !== 'create_separate'
          ? st.inventory.find(i => normName(i.name) === normName(item.itemName))
          : undefined;

      if (target && item.syncMode !== 'create_separate') {
        const newStock = target.currentStock + qty;
        // weighted-average cost so profit on later sales is right
        const newCost =
          target.currentStock > 0
            ? round2((target.currentStock * target.unitCost + qty * landedBase) / newStock)
            : landedBase;
        st = {
          ...st,
          inventory: st.inventory.map(i =>
            i.id === target.id
              ? {
                  ...i,
                  unitCost: newCost,
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
  }

  if (bill.paidAmount > 0) {
    st = addCash(st, {
      date: bill.invoiceDate,
      type: 'expense',
      category: 'Vendor Spares',
      description: `Vendor: ${bill.vendorName} (Inv: ${bill.invoiceNumber})`,
      amount: bill.paidAmount,
      paymentMode: bill.paymentMode || 'upi',
      referenceId: bill.id,
      referenceNumber: bill.paymentReference,
    });
  }
  return { state: st, bill };
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

  const billTx = s.stockTx.filter(t => t.referenceBillId === id && t.type === 'in');
  const qtyByItem = new Map<string, number>();
  billTx.forEach(t => qtyByItem.set(t.itemId, (qtyByItem.get(t.itemId) || 0) + t.quantity));

  const otherTxItems = new Set(s.stockTx.filter(t => t.referenceBillId !== id).map(t => t.itemId));

  let inventory = s.inventory.map(i => {
    const q = qtyByItem.get(i.id);
    return q ? { ...i, currentStock: Math.max(0, i.currentStock - q), updatedAt: todayLocal() } : i;
  });
  // items that only ever existed because of this bill are removed with it
  inventory = inventory.filter(i => !(qtyByItem.has(i.id) && i.vendorBillId === id && i.currentStock === 0 && !otherTxItems.has(i.id)));

  return {
    ...s,
    inventory,
    vendorBills: s.vendorBills.filter(b => b.id !== id),
    cashFlow: s.cashFlow.filter(c => c.referenceId !== id),
    stockTx: s.stockTx.filter(t => t.referenceBillId !== id),
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
