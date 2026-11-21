/**
 * Regression Test Suite covering all 12 SGS CRM Vendor Bill Improvements & Calculation Corrections:
 *  1. GST bill with ₹100.10 base price (18% GST -> ₹18.02, total ₹118.12, exact CGST/SGST split)
 *  2. GST bill with multiple decimal items (₹100.10, ₹100.25, ₹100.50, ₹100.75, ₹1250.99, ₹10000.75) + discount + roundOff
 *  3. Without-GST bill with ₹100.10 (tax = 0, total = 100.10, zero stock transactions, zero inventory mutations)
 *  4. Pandiyan Computers bill with GST-inclusive Spare Cost (₹100.00 + 18% -> ₹118.00, ₹100.10 + 18% -> ₹118.12,
 *     Without-GST stock never assumes 18%, SGS still uses base cost for ITC, no double-GST)
 *  5. Vendor bill with multiple items & individual long descriptions (item names preserved separately from descriptions)
 *  6. Editing an existing vendor bill preserves descriptions, decimal values, original document ID, and creates no duplicates
 *  7. GST invoice / vendor bill print model & CGST/SGST split exactness (2-decimal paise precision, no 1-decimal truncation)
 *  8. Without-GST bill strictly excludes GST calculation (isVendorBillGst === false, taxAmount === 0, gstPercent === 0)
 *  9. Two vendors with different UPI IDs resolve independently; editing Vendor A never alters Vendor B's UPI ID
 * 10. Vendor without UPI ID resolves to null (never invents or falls back to global/workshop UPI)
 * 11. Stock weighted-average base cost (unitCost) AND GST-inclusive cost (unitCostWithGst) with decimal rates & quantities
 * 12. Vendor ledger & payment calculations with decimal amounts (partial + full payment reconciliation, zero float drift)
 */
import * as Acc from '../src/utils/accounting.ts';
import {
  calculateFromBaseRate,
  calculateFromInclusiveRate,
  calculateInvoiceSummary,
  roundMoney,
  formatInr,
  safeNumber,
} from '../src/utils/gstUtils.ts';
import type { InventoryItem, Vendor, VendorBill, VendorBillItem } from '../src/types.ts';

let fails = 0;
const eq = (name: string, got: any, want: any) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : `\n     got=${JSON.stringify(got)}\n    want=${JSON.stringify(want)}`);
};

const makeItem = (
  itemName: string,
  quantity: number,
  unitCost: number,
  gstPercent: number,
  isGstBill = true,
  description?: string
): VendorBillItem => {
  const total = Acc.round2(quantity * unitCost);
  const effGst = isGstBill ? gstPercent : 0;
  const gstAmount = effGst > 0 ? Acc.round2((total * effGst) / 100) : 0;
  return {
    itemName,
    description,
    quantity,
    unitCost,
    gstPercent: effGst,
    gstAmount,
    total,
    totalWithGst: Acc.round2(total + gstAmount),
  };
};

// ============================================================================
// 1. GST Bill with ₹100.10 base price (18% GST)
// ============================================================================
{
  const items = [makeItem('Thermal Paste', 1, 100.10, 18, true, 'High conductivity silicone thermal paste tube')];
  const result = Acc.computeVendorBillTotals({ isGstBill: true, items });
  eq('1a. GST bill ₹100.10 subtotal', result.subtotal, 100.1);
  eq('1b. GST bill ₹100.10 18% GST amount', result.taxAmount, 18.02);
  eq('1c. GST bill ₹100.10 total', result.totalAmount, 118.12);
  eq('1d. GST bill ₹100.10 invariant subtotal + tax === total', Acc.round2(result.subtotal + result.taxAmount), result.totalAmount);

  const split = Acc.splitTax(result.taxAmount);
  eq('1e. Exact 2-decimal CGST split', split.cgst, 9.01);
  eq('1f. Exact 2-decimal SGST split', split.sgst, 9.01);
  eq('1g. CGST + SGST === total tax', Acc.round2(split.cgst + split.sgst), result.taxAmount);

  const invCalc = calculateFromBaseRate(100.10, 18, 1);
  eq('1h. Billing gstUtils ₹100.10 + 18% tax', invCalc.totalGst, 18.02);
  eq('1i. Billing gstUtils ₹100.10 + 18% total', invCalc.totalWithGst, 118.12);
  eq('1j. formatInr preserves paise', formatInr(100.10, true), '100.10');
}

// ============================================================================
// 2. GST Bill with multiple decimal items + discount + roundOff
// ============================================================================
{
  const items = [
    makeItem('Item A', 1, 100.10, 18, true),
    makeItem('Item B', 2, 100.25, 18, true),
    makeItem('Item C', 1, 100.50, 12, true),
    makeItem('Item D', 3, 100.75, 5, true),
    makeItem('Item E', 1, 1250.99, 18, true),
    makeItem('Item F', 1, 10000.75, 18, true),
  ];
  const result = Acc.computeVendorBillTotals({
    isGstBill: true,
    discount: 10.50,
    roundOff: -0.04,
    items,
  });
  const expectedSubtotal = Acc.round2(100.10 + 200.50 + 100.50 + 302.25 + 1250.99 + 10000.75);
  eq('2a. Multi-decimal subtotal exact', result.subtotal, expectedSubtotal);
  eq('2b. Multi-decimal subtotal === 11955.09', result.subtotal, 11955.09);
  eq(
    '2c. Multi-decimal invariant subtotal + tax - discount + roundOff === total',
    Acc.round2(result.subtotal + result.taxAmount - result.discount + result.roundOff),
    result.totalAmount
  );
  eq('2d. No NaN or Infinity', Number.isFinite(result.totalAmount) && !Number.isNaN(result.totalAmount), true);

  // Also verify Billing calculateInvoiceSummary with decimal items and decimal quantity
  const billingSummary = calculateInvoiceSummary(
    [
      { description: 'Part A', quantity: 1, rate: 100.10, gstPercent: 18, purchaseCost: 80.25 },
      { description: 'Part B', quantity: 1.5, rate: 100.50, gstPercent: 18, purchaseCost: 70.10 },
    ],
    { invoiceDiscount: 5.25, roundOffAdjustment: 0.02, isInterState: false, isNonGstFirm: false }
  );
  eq('2e. Billing summary decimal subtotal', billingSummary.subtotal, 250.85);
  eq(
    '2f. Billing summary invariant netTaxable + totalTax + roundOff === grandTotal',
    Acc.round2(billingSummary.netTaxableAmount + billingSummary.totalTax + billingSummary.roundOff),
    billingSummary.grandTotal
  );
}

// ============================================================================
// 3 & 8. Without-GST bill with ₹100.10 — zero GST, zero stock impact
// ============================================================================
{
  let st: Acc.LedgerState = { ...Acc.EMPTY_LEDGER };
  const rawNonGstItem: VendorBillItem = {
    itemName: 'Local Screw Pack',
    description: 'Assorted laptop body screws M2x4mm',
    quantity: 1,
    unitCost: 100.10,
    gstPercent: 18, // intentionally passed 18 to prove Without-GST ignores it
    gstAmount: 0,
    total: 100.10,
    totalWithGst: 100.10,
  };
  const totals = Acc.computeVendorBillTotals({
    isGstBill: false,
    items: [rawNonGstItem],
  });
  eq('3a. Without-GST forces taxAmount to 0 even if item had gstPercent=18', totals.taxAmount, 0);
  eq('3b. Without-GST CGST and SGST are 0', [totals.cgst, totals.sgst], [0, 0]);
  eq('3c. Without-GST subtotal === 100.10', totals.subtotal, 100.1);
  eq('3d. Without-GST total === 100.10', totals.totalAmount, 100.1);

  const created = Acc.addVendorBillTx(
    st,
    {
      vendorName: 'Simmakkal Local Spares',
      invoiceNumber: 'LOCAL-101',
      invoiceDate: '2026-05-01',
      isGstBill: false,
      items: [{ ...rawNonGstItem, gstPercent: 0, gstAmount: 0 }],
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      paidAmount: 0,
      paymentStatus: 'pending',
      paymentMode: 'upi',
      notes: 'Non-GST local purchase',
    },
    true // even when updateStock=true, Without-GST MUST NOT touch stock
  );
  st = created.state;

  eq('8a. Saved Without-GST bill isVendorBillGst === false', Acc.isVendorBillGst(created.bill), false);
  eq('8b. Saved Without-GST bill taxAmount === 0', created.bill.taxAmount, 0);
  eq('3e. Without-GST bill creates 0 inventory items', st.inventory.length, 0);
  eq('3f. Without-GST bill creates 0 stock transactions', st.stockTx.length, 0);
  eq('3g. Without-GST bill stockSynced === false', created.bill.stockSynced, false);
}

// ============================================================================
// 4. Pandiyan Computers Spare Cost (₹) GST-Inclusive Calculation
// ============================================================================
{
  const gstStockItem: InventoryItem = {
    id: 'inv-ram-1',
    name: 'DDR4 8GB RAM',
    category: 'laptop',
    currentStock: 5,
    minStockAlert: 1,
    unitCost: 100.00,
    gstPercent: 18,
    unitCostWithGst: 118.00,
    unitPrice: 250.00,
    updatedAt: '2026-05-01',
  };

  const pandiyanCost = Acc.resolveSpareCostForFirm(gstStockItem, 'pandiyan');
  eq('4a. Pandiyan Spare Cost for ₹100.00 + 18% GST === ₹118.00', pandiyanCost.spareCost, 118);
  eq('4b. Pandiyan Spare Cost preserves baseCost === ₹100.00', pandiyanCost.baseCost, 100);
  eq('4c. Pandiyan Spare Cost gstAmount === ₹18.00', pandiyanCost.gstAmount, 18);
  eq('4d. Pandiyan Spare Cost flags isGstInclusive === true', pandiyanCost.isGstInclusive, true);

  // Decimal case: ₹100.10 + 18% GST = ₹118.12
  eq('4e. computeGstInclusiveCost(100.10, 18) === 118.12', Acc.computeGstInclusiveCost(100.10, 18), 118.12);

  // SGS must still receive Base Cost (Excl. GST) for ITC accounting
  const sgsCost = Acc.resolveSpareCostForFirm(gstStockItem, 'sgs');
  eq('4f. SGS Spare Cost stays Base Cost ₹100.00 (no double GST)', sgsCost.spareCost, 100);
  eq('4g. SGS Spare Cost flags isGstInclusive === false', sgsCost.isGstInclusive, false);

  // Legacy stock item without unitCostWithGst stored yet, resolved via linked GST vendor bill
  const legacyGstBill: VendorBill = {
    id: 'vb-legacy-gst',
    vendorName: 'Madurai IT Distributors',
    invoiceNumber: 'GST-501',
    invoiceDate: '2026-04-20',
    isGstBill: true,
    items: [
      {
        itemName: 'Kingston NVMe 500GB',
        quantity: 2,
        unitCost: 100.10,
        gstPercent: 18,
        gstAmount: 36.04,
        total: 200.20,
        totalWithGst: 236.24,
        matchedInventoryId: 'inv-legacy-ssd',
      },
    ],
    subtotal: 200.20,
    taxAmount: 36.04,
    totalAmount: 236.24,
    paidAmount: 0,
    paymentStatus: 'pending',
    paymentMode: 'upi',
    stockSynced: true,
    createdAt: '2026-04-20',
  };
  const legacyStock: InventoryItem = {
    id: 'inv-legacy-ssd',
    name: 'Kingston NVMe 500GB',
    category: 'laptop',
    currentStock: 2,
    minStockAlert: 1,
    unitCost: 100.10,
    unitPrice: 200,
    vendorBillId: 'vb-legacy-gst',
    updatedAt: '2026-04-20',
  };
  const resolvedLegacy = Acc.resolveSpareCostForFirm(legacyStock, 'pandiyan', [legacyGstBill]);
  eq('4h. Legacy stock linked to GST bill resolves to ₹118.12 on Pandiyan', resolvedLegacy.spareCost, 118.12);

  // Without-GST or manual stock without GST — must NEVER assume 18%
  const nonGstStock: InventoryItem = {
    id: 'inv-manual-1',
    name: 'Generic Power Cable',
    category: 'general',
    currentStock: 10,
    minStockAlert: 2,
    unitCost: 100.00,
    unitPrice: 150.00,
    updatedAt: '2026-05-01',
  };
  const nonGstPandiyan = Acc.resolveSpareCostForFirm(nonGstStock, 'pandiyan', [legacyGstBill]);
  eq('4i. Manual/Without-GST stock does NOT assume 18% GST on Pandiyan', nonGstPandiyan.spareCost, 100);
  eq('4j. Manual/Without-GST stock isGstInclusive === false', nonGstPandiyan.isGstInclusive, false);

  // Switching Pandiyan -> SGS -> Pandiyan must NEVER double-add GST
  const switchedToSgs = Acc.resolveSpareCostForFirm(gstStockItem, 'sgs');
  const switchedBackToPandiyan = Acc.resolveSpareCostForFirm(gstStockItem, 'pandiyan');
  eq('4k. Switching back to Pandiyan stays ₹118.00 (no double-adding GST)', switchedBackToPandiyan.spareCost, 118);
  eq('4l. Switching to SGS stays ₹100.00', switchedToSgs.spareCost, 100);
}

// ============================================================================
// 5 & 6. Item Descriptions & Editing Vendor Bill Preserves Everything Safely
// ============================================================================
{
  let st: Acc.LedgerState = { ...Acc.EMPTY_LEDGER };
  const initialItems = [
    makeItem('RAM', 2, 1200.50, 18, true, 'DDR4 8GB Desktop RAM 3200MHz Crucial Long Spec Notes with 3-Year Warranty'),
    makeItem('SSD', 1, 2800.25, 18, true, 'Kingston NVMe 500GB PCIe Gen4 M.2 2280 NV2'),
    makeItem('Adapter', 1, 750.10, 18, true, 'HP 65W Original Blue Pin Adapter with Power Cord'),
  ];
  const initialTotals = Acc.computeVendorBillTotals({ isGstBill: true, items: initialItems });

  const created = Acc.addVendorBillTx(
    st,
    {
      vendorName: 'Tech World Distributors',
      invoiceNumber: 'TW-2026-88',
      invoiceDate: '2026-05-02',
      isGstBill: true,
      items: initialItems,
      subtotal: initialTotals.subtotal,
      taxAmount: initialTotals.taxAmount,
      totalAmount: initialTotals.totalAmount,
      paidAmount: 0,
      paymentStatus: 'pending',
      paymentMode: 'upi',
      notes: 'Multi-item GST purchase with detailed descriptions',
    },
    true
  );
  st = created.state;
  const origId = created.bill.id;

  eq('5a. Item 1 name preserved separately from description', created.bill.items[0].itemName, 'RAM');
  eq('5b. Item 1 long description preserved', created.bill.items[0].description, 'DDR4 8GB Desktop RAM 3200MHz Crucial Long Spec Notes with 3-Year Warranty');
  eq('5c. Item 2 description preserved', created.bill.items[1].description, 'Kingston NVMe 500GB PCIe Gen4 M.2 2280 NV2');
  eq('5d. Item 3 description preserved', created.bill.items[2].description, 'HP 65W Original Blue Pin Adapter with Power Cord');

  // Edit existing vendor bill: keep original ID, update description & decimal price, no duplicate bills
  const editedItems = [
    makeItem('RAM', 2, 1250.99, 18, true, created.bill.items[0].description),
    makeItem('SSD', 1, 2800.25, 18, true, 'Kingston NVMe 500GB PCIe Gen4 M.2 2280 NV2 — Updated Batch B'),
    created.bill.items[2],
  ];
  const editedTotals = Acc.computeVendorBillTotals({ isGstBill: true, items: editedItems });
  const edited = Acc.updateVendorBillTx(
    st,
    origId,
    {
      items: editedItems,
      subtotal: editedTotals.subtotal,
      taxAmount: editedTotals.taxAmount,
      totalAmount: editedTotals.totalAmount,
    },
    true
  );
  st = edited.state;

  eq('6a. Edit preserves original document ID', edited.bill?.id, origId);
  eq('6b. Edit creates NO duplicate vendor bills', st.vendorBills.length, 1);
  eq('6c. Edit preserves untouched item descriptions', edited.bill?.items[0].description, 'DDR4 8GB Desktop RAM 3200MHz Crucial Long Spec Notes with 3-Year Warranty');
  eq('6d. Edit saves updated item description', edited.bill?.items[1].description, 'Kingston NVMe 500GB PCIe Gen4 M.2 2280 NV2 — Updated Batch B');
  eq('6e. Edit saves updated decimal rate', edited.bill?.items[0].unitCost, 1250.99);
}

// ============================================================================
// 7. GST Tax Split & Inclusive Reverse Calculation Precision
// ============================================================================
{
  const rev = calculateFromInclusiveRate(118.12, 18, 1);
  eq('7a. Reverse from ₹118.12 inclusive @18% recovers base ₹100.10', rev.baseRate, 100.1);
  eq('7b. Reverse from ₹118.12 inclusive @18% total GST ₹18.02', rev.totalGst, 18.02);
  eq('7c. Reverse CGST/SGST exact 2-decimal split', [rev.cgst, rev.sgst], [9.01, 9.01]);
  eq('7d. safeNumber guards NaN and Infinity', [safeNumber(NaN, 0), safeNumber(Infinity, 0), safeNumber('100.10', 0)], [0, 0, 100.1]);
  eq('7e. roundMoney handles binary float 0.1 + 0.2', roundMoney(0.1 + 0.2), 0.3);
}

// ============================================================================
// 9 & 10. Vendor-Specific UPI ID Isolation & "Not Provided" (null) Fallback
// ============================================================================
{
  const vendors: Vendor[] = [
    { id: 'v-a', name: 'Alpha Computers', phone: '9842100001', upiId: 'alpha@okicici', createdAt: '2026-01-01' },
    { id: 'v-b', name: 'Beta Spares', phone: '9842100002', upiId: 'beta@ybl', createdAt: '2026-01-01' },
    { id: 'v-c', name: 'Gamma Traders', phone: '9842100003', createdAt: '2026-01-01' },
    { id: 'v-d', name: 'Delta Blank UPI', phone: '9842100004', upiId: '   ', createdAt: '2026-01-01' },
  ];

  eq('9a. Vendor A resolves its own UPI ID', Acc.resolveVendorUpiId(vendors, 'v-a'), 'alpha@okicici');
  eq('9b. Vendor B resolves its own UPI ID', Acc.resolveVendorUpiId(vendors, 'v-b'), 'beta@ybl');
  eq('9c. Resolve by vendorName when vendorId absent', Acc.resolveVendorUpiId(vendors, undefined, 'Beta Spares'), 'beta@ybl');

  // Updating Vendor A UPI must never mutate Vendor B
  const updatedVendors = vendors.map(v => v.id === 'v-a' ? { ...v, upiId: 'alpha.new@okhdfcbank' } : v);
  eq('9d. Updated Vendor A resolves new UPI ID', Acc.resolveVendorUpiId(updatedVendors, 'v-a'), 'alpha.new@okhdfcbank');
  eq('9e. Vendor B remains untouched after Vendor A edit', Acc.resolveVendorUpiId(updatedVendors, 'v-b'), 'beta@ybl');

  // Vendor without UPI ID returns null (UI displays "Not Provided", never workshop/global UPI)
  eq('10a. Vendor without UPI resolves to null', Acc.resolveVendorUpiId(vendors, 'v-c'), null);
  eq('10b. Vendor with whitespace-only UPI resolves to null', Acc.resolveVendorUpiId(vendors, 'v-d'), null);
  eq('10c. Unknown vendor resolves to null', Acc.resolveVendorUpiId(vendors, 'v-unknown', 'Nonexistent Vendor'), null);
}

// ============================================================================
// 11. Stock Weighted-Average Base Cost & GST-Inclusive Cost with Decimals
// ============================================================================
{
  let st: Acc.LedgerState = { ...Acc.EMPTY_LEDGER };
  // Batch 1: 2 units @ ₹100.10 base, 18% GST -> ₹118.12 incl GST
  const b1Items = [makeItem('SATA Cable Pro', 2, 100.10, 18, true)];
  const b1 = Acc.computeVendorBillTotals({ isGstBill: true, items: b1Items });
  st = Acc.addVendorBillTx(
    st,
    {
      vendorName: 'Cable Mart',
      invoiceNumber: 'CM-01',
      invoiceDate: '2026-05-01',
      isGstBill: true,
      items: b1Items,
      subtotal: b1.subtotal,
      taxAmount: b1.taxAmount,
      totalAmount: b1.totalAmount,
      paidAmount: 0,
      paymentStatus: 'pending',
      paymentMode: 'upi',
    },
    true
  ).state;

  eq('11a. Batch 1 stock qty === 2', st.inventory[0].currentStock, 2);
  eq('11b. Batch 1 base unitCost === 100.10', st.inventory[0].unitCost, 100.1);
  eq('11c. Batch 1 unitCostWithGst === 118.12', st.inventory[0].unitCostWithGst, 118.12);
  eq('11d. Batch 1 gstPercent === 18', st.inventory[0].gstPercent, 18);

  // Batch 2: 2 units @ ₹120.50 base, 18% GST -> ₹142.19 incl GST
  // Expected weighted avg base: (2*100.10 + 2*120.50)/4 = 110.30
  // Expected weighted avg incl GST: (2*118.12 + 2*142.19)/4 = 130.155 -> 130.16
  const b2Items = [makeItem('SATA Cable Pro', 2, 120.50, 18, true)];
  const b2 = Acc.computeVendorBillTotals({ isGstBill: true, items: b2Items });
  st = Acc.addVendorBillTx(
    st,
    {
      vendorName: 'Cable Mart',
      invoiceNumber: 'CM-02',
      invoiceDate: '2026-05-03',
      isGstBill: true,
      items: b2Items,
      subtotal: b2.subtotal,
      taxAmount: b2.taxAmount,
      totalAmount: b2.totalAmount,
      paidAmount: 0,
      paymentStatus: 'pending',
      paymentMode: 'upi',
    },
    true
  ).state;

  eq('11e. Batch 2 stock qty === 4', st.inventory[0].currentStock, 4);
  eq('11f. Weighted avg base unitCost === 110.30', st.inventory[0].unitCost, 110.3);
  eq('11g. Weighted avg unitCostWithGst === 130.16', st.inventory[0].unitCostWithGst, 130.16);
  eq('11h. Pandiyan uses weighted avg GST-inclusive cost 130.16', Acc.resolveSpareCostForFirm(st.inventory[0], 'pandiyan').spareCost, 130.16);
  eq('11i. SGS uses weighted avg base cost 110.30', Acc.resolveSpareCostForFirm(st.inventory[0], 'sgs').spareCost, 110.3);
}

// ============================================================================
// 12. Vendor Ledger & Payment Calculations with Decimal Amounts
// ============================================================================
{
  let st: Acc.LedgerState = { ...Acc.EMPTY_LEDGER };
  const items = [makeItem('NVMe Drive', 1, 100.10, 18, true)];
  const totals = Acc.computeVendorBillTotals({ isGstBill: true, items }); // totalAmount = 118.12
  const added = Acc.addVendorBillTx(
    st,
    {
      vendorName: 'Precision Parts',
      invoiceNumber: 'PP-001',
      invoiceDate: '2026-05-04',
      isGstBill: true,
      items,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.totalAmount,
      paidAmount: 0,
      paymentStatus: 'pending',
      paymentMode: 'upi',
    },
    true
  );
  st = added.state;
  const billId = added.bill.id;

  // Partial payment ₹50.05 -> balance ₹68.07
  st = Acc.payVendorBillTx(st, billId, 50.05, 'upi', 'UTR-DEC-1');
  const afterPartial = st.vendorBills.find(b => b.id === billId)!;
  eq('12a. Partial decimal payment recorded', afterPartial.paidAmount, 50.05);
  eq('12b. Partial status', afterPartial.paymentStatus, 'partial');
  eq('12c. Exact remaining balance ₹68.07', Acc.round2(afterPartial.totalAmount - afterPartial.paidAmount), 68.07);

  // Final payment bringing cumulative paid to ₹118.12 -> balance ₹0.00, status 'paid'
  st = Acc.payVendorBillTx(st, billId, 118.12, 'upi', 'UTR-DEC-2');
  const afterFull = st.vendorBills.find(b => b.id === billId)!;
  eq('12d. Full decimal payment exact ₹118.12', afterFull.paidAmount, 118.12);
  eq('12e. Full payment status === paid', afterFull.paymentStatus, 'paid');
  eq('12f. Remaining balance === 0', Acc.round2(afterFull.totalAmount - afterFull.paidAmount), 0);
  eq('12g. CashFlow has exactly 2 vendor payment entries', st.cashFlow.length, 2);
  eq('12h. CashFlow total equals bill total', Acc.round2(st.cashFlow.reduce((s, c) => s + c.amount, 0)), 118.12);
}

console.log(`\nvendor_improvements.test.ts finished with ${fails} failure(s).`);
if (fails > 0) process.exit(1);
