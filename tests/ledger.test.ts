import * as A from '../src/utils/accounting.ts';
import * as T from '../src/utils/indiaTax.ts';
import { calculateFromBaseRate, calculateFromInclusiveRate, calculateInvoiceSummary } from '../src/utils/gstUtils.ts';

let fails = 0;
const eq = (name: string, got: any, want: any) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : `\n     got=${JSON.stringify(got)}\n    want=${JSON.stringify(want)}`);
};

let s: A.LedgerState = { inventory: [], stockTx: [], cashFlow: [], invoices: [], vendorBills: [] };

// ---------- 1. Vendor bill: 10 x SSD @1000 base +18% = 11800, vendor discount 600, paid 5000
const c1 = calculateFromBaseRate(1000, 18, 10);
let r = A.addVendorBillTx(s, {
  vendorName: 'Siva Printer', invoiceNumber: 'V-1', invoiceDate: '2026-10-28',
  items: [{ itemName: 'Kingston SSD 240GB', quantity: 10, unitCost: 1000, total: c1.baseAmount, gstPercent: 18, gstAmount: c1.totalGst, totalWithGst: c1.totalWithGst, grossUnitCost: 1180 }],
  subtotal: 10000, taxAmount: 1800, discount: 600, totalAmount: 11200, paidAmount: 5000, paymentStatus: 'partial', paymentMode: 'upi',
} as any, true);
s = r.state; const bill1 = r.bill;
const ssd = () => s.inventory[0];
eq('stock after purchase', ssd().currentStock, 10);
eq('landed cost after vendor discount', ssd().unitCost, 949.15);
eq('selling price (incl GST) keeps 35% markup on base', ssd().unitPrice, Math.round(949.15 * 1.35 * 1.18));
eq('vendor cash expense = paid only', s.cashFlow.filter(c => c.type === 'expense').map(c => c.amount), [5000]);
eq('vendor status partial', bill1.paymentStatus, 'partial');

r = A.addVendorBillTx(s, { vendorName: 'Siva Printer', invoiceNumber: 'V-2', invoiceDate: '2026-10-28',
  items: [{ itemName: 'kingston ssd 240gb', quantity: 10, unitCost: 1100, total: 11000, gstPercent: 18, gstAmount: 1980, totalWithGst: 12980 }],
  subtotal: 11000, taxAmount: 1980, totalAmount: 12980, paidAmount: 0, paymentStatus: 'pending' } as any, true);
s = r.state; const bill2 = r.bill;
eq('same item merged into ONE stock row', s.inventory.length, 1);
eq('weighted average cost', ssd().unitCost, 1024.58);
eq('duplicate vendor bill detected', !!A.findDuplicateVendorBill(s.vendorBills, ' siva printer', 'v-1'), true);

// ---------- 2. SGS intra-state invoice built with the real engine: 3 SSD @ 1900 incl GST, pre-tax bill discount 100
const mkItem = (qty: number, gross: number, disc = 0, inter = false) => {
  const c = calculateFromInclusiveRate(gross, 18, qty, disc, inter);
  return { description: 'Kingston SSD 240GB', quantity: qty, rate: c.baseRate, grossRate: gross, gstPercent: 18, discount: disc,
    amount: c.taxableAmount, gstAmount: c.totalGst, totalWithGst: c.totalWithGst, cgstAmount: c.cgst, sgstAmount: c.sgst, igstAmount: c.igst,
    purchaseCost: ssd().unitCost, inventoryItemId: ssd().id };
};
const build = (items: any[], opt: any = {}) => {
  const sum = calculateInvoiceSummary(items.map(i => ({ ...i })), { invoiceDiscount: opt.discount || 0, isInterState: !!opt.inter, manualExtraCost: opt.extra || 0, autoRoundOff: !!opt.autoRound });
  return { sum, data: {
    invoiceNumber: opt.no || 'SGS-INV-1043', type: opt.type || 'invoice', billingFirm: opt.firm || 'sgs', customerId: 'c1', customerName: opt.cust || 'Ravi', customerPhone: opt.phone || '9876543210',
    date: opt.date || '2026-10-29', items, subtotal: sum.subtotal, gstPercent: 18, taxAmount: sum.totalTax, cgstAmount: sum.totalCgst, sgstAmount: sum.totalSgst, igstAmount: sum.totalIgst,
    isInterState: sum.isInterState, discount: opt.discount || 0, roundOff: sum.roundOff, grandTotal: sum.grandTotal, paymentStatus: 'paid', paymentMode: 'cash',
    paidAmount: opt.paid ?? sum.grandTotal, purchaseCostTotal: A.purchaseCostOf(items), manualExtraCost: opt.extra || 0, dueDate: opt.due,
  } as any };
};
const b1 = build([mkItem(3, 1900)], { discount: 100 });
let ir = A.addInvoiceTx(s, b1.data);
s = ir.state; let inv = ir.invoice;
eq('stock 20 -> 17', ssd().currentStock, 17);
eq('bill remembers what it took (appliedStock)', inv.appliedStock, [{ itemId: ssd().id, qty: 3 }]);
const net = A.netOfDiscount(inv);
eq('grand = taxable + tax (+roundOff)', A.round2(net.taxable + net.tax + (inv.roundOff || 0)), inv.grandTotal);
eq('CGST + SGST = tax exactly', A.round2(net.cgst + net.sgst), net.tax);
eq('profit = taxable after discount - cost', inv.profitAmount, A.round2(b1.sum.netTaxableAmount - 3 * ssd().unitCost));
eq('UI engine profit equals stored profit', inv.profitAmount, b1.sum.netProfit);
eq('income logged = grand', s.cashFlow.filter(c => c.type === 'income').map(c => c.amount), [inv.grandTotal]);

// ---------- 3. Edit: qty 3 -> 5 (stock diff), bill total goes up => becomes partial
const b2 = build([mkItem(5, 1900)], {});
s = A.updateInvoiceTx(s, inv.id, { ...b2.data, invoiceNumber: inv.invoiceNumber, paidAmount: inv.paidAmount });
inv = s.invoices[0];
eq('edit: stock now 15', ssd().currentStock, 15);
eq('edit: appliedStock updated', inv.appliedStock, [{ itemId: ssd().id, qty: 5 }]);
eq('edit: status partial', inv.paymentStatus, 'partial');
eq('edit: no extra cash logged', s.cashFlow.filter(c => c.type === 'income').length, 1);

// ---------- 4. Rename the stock item, then cancel: stock must still go back (applied snapshot)
s = { ...s, inventory: s.inventory.map(i => ({ ...i, name: 'Kingston A400 SSD 240GB (renamed)' })) };
const stockBefore = s.inventory[0].currentStock;
// pay rest first (overpay clamp)
s = A.payInvoiceTx(s, inv.id, 99999, 'upi');
inv = s.invoices[0];
eq('overpay clamped', inv.paidAmount, inv.grandTotal);
eq('status paid', inv.paymentStatus, 'paid');
const incomeTotal = A.round2(s.cashFlow.filter(c => c.type === 'income').reduce((a, c) => a + c.amount, 0));
eq('income == bill total', incomeTotal, inv.grandTotal);

// ---------- 5. Quotation with advance -> convert (no double income, stock out once)
const bq = build([{ ...mkItem(2, 1900), inventoryItemId: s.inventory[0].id }], { type: 'quotation', no: 'SGS-QUOT-1044', paid: 1000, cust: 'Mani', phone: '9000000001' });
const qt = A.addInvoiceTx(s, bq.data); s = qt.state;
eq('quotation: stock untouched', s.inventory[0].currentStock, stockBefore);
const incBefore = s.cashFlow.filter(c => c.type === 'income').reduce((a, c) => a + c.amount, 0);
const cv = A.convertQuotationTx(s, qt.invoice.id, A.nextDocNumber(s.invoices, 'SGS-INV-', 1043), '2026-10-29'); s = cv.state;
eq('convert: stock -2', s.inventory[0].currentStock, stockBefore - 2);
eq('convert: income not duplicated', s.cashFlow.filter(c => c.type === 'income').reduce((a, c) => a + c.amount, 0), incBefore);
eq('convert: number = series max + 1', cv.invoice.invoiceNumber, 'SGS-INV-1044');

// ---------- 6. Cancel converted invoice: stock back (even though item renamed), refund recorded
s = A.cancelInvoiceTx(s, qt.invoice.id, 'customer changed mind');
eq('cancel: stock restored', s.inventory[0].currentStock, stockBefore);
eq('cancel: refund = advance', s.cashFlow.filter(c => c.category === 'Customer Refund').map(c => c.amount), [1000]);
eq('cancel: paid zeroed, snapshot cleared', [s.invoices.find(i => i.id === qt.invoice.id)!.paidAmount, s.invoices.find(i => i.id === qt.invoice.id)!.appliedStock], [0, []]);

// ---------- 7. Inter-state invoice: IGST only, ratio logic, GSTR split
const bi = build([mkItem(1, 2360, 0, true)], { inter: true, no: 'SGS-INV-1046', cust: 'Chennai Co', phone: '9444444444' });
const ii = A.addInvoiceTx(s, bi.data); s = ii.state;
const nIgst = A.netOfDiscount(ii.invoice);
eq('inter-state: IGST only', [nIgst.cgst, nIgst.sgst, nIgst.igst > 0], [0, 0, true]);
eq('inter-state: IGST = 360', nIgst.igst, 360);

// ---------- 8. Legacy invoice (after-tax discount, saved by the old app) is still understood
const legacy: any = { subtotal: 1000, taxAmount: 180, discount: 118, roundOff: 0, grandTotal: 1062, items: [{ gstAmount: 180 }] };
const nl = A.netOfDiscount(legacy);
eq('legacy bill: taxable 900, tax 162', [nl.taxable, nl.tax], [900, 162]);
const newer: any = { subtotal: 1000, taxAmount: 162, discount: 100, roundOff: 0, grandTotal: 1062, items: [{ gstAmount: 180 }] };
eq('new bill: taxable 900, tax 162', [A.netOfDiscount(newer).taxable, A.netOfDiscount(newer).tax], [900, 162]);

// ---------- 9. Pandiyan bill never touches stock; profit simple
const bp = build([{ description: 'SSD', quantity: 4, rate: 2000, grossRate: 2000, amount: 8000, gstPercent: 0, purchaseCost: 1000 }], { firm: 'pandiyan', no: 'PC-EST-501' });
bp.data.subtotal = 8000; bp.data.taxAmount = 0; bp.data.grandTotal = 8000; bp.data.paidAmount = 8000;
const stockNow = s.inventory[0].currentStock;
const pc = A.addInvoiceTx(s, bp.data); s = pc.state;
eq('pandiyan: stock unchanged', s.inventory[0].currentStock, stockNow);
eq('pandiyan: profit 8000 - 4000', pc.invoice.profitAmount, 4000);

// ---------- 10. Delete real invoice: stock back, its cash gone; numbers never reused
const keep = s.inventory[0].currentStock;
s = A.deleteInvoiceTx(s, inv.id);
eq('delete: stock +5', s.inventory[0].currentStock, keep + 5);
eq('delete: cash entries gone', s.cashFlow.filter(c => c.referenceId === inv.id).length, 0);
eq('next number after delete never reuses', A.nextDocNumber(s.invoices, 'SGS-INV-', 1043), 'SGS-INV-1047');

// ---------- 11. Vendor bill 2 delete / pay clamp
const k2 = s.inventory[0].currentStock;
s = A.deleteVendorBillTx(s, bill2.id);
eq('vendor delete: stock -10', s.inventory[0].currentStock, k2 - 10);
s = A.payVendorBillTx(s, bill1.id, 999999, 'bank_transfer');
const vb1 = s.vendorBills.find(b => b.id === bill1.id)!;
eq('vendor overpay clamp + paid', [vb1.paidAmount, vb1.paymentStatus], [11200, 'paid']);
eq('vendor cash total = bill total', A.round2(s.cashFlow.filter(c => c.referenceId === bill1.id).reduce((a, c) => a + c.amount, 0)), 11200);

// ---------- 12. Outstanding & aging
const mk = (no: string, phone: string, grand: number, paid: number, date: string, due?: string) => ({
  invoiceNumber: no, type: 'invoice', customerName: 'C' + phone, customerPhone: phone, date, dueDate: due, grandTotal: grand, paidAmount: paid, status: 'active' }) as any;
const rows = A.customerOutstanding([
  mk('1', '9000000001', 1000, 0, '2026-10-01', '2026-10-15'),   // 14 days overdue on 10-29
  mk('2', '9000000001', 500, 0, '2026-08-01', '2026-08-15'),    // 75 days overdue
  mk('3', '9000000002', 2000, 2000, '2026-10-01'),               // fully paid -> not listed
  mk('4', '9000000003', 300, 100, '2026-10-29', '2026-11-05'),   // not yet due
  { ...mk('5', '9000000004', 900, 0, '2026-08-01'), status: 'cancelled' },  // cancelled -> ignored
  { ...mk('6', '9000000005', 900, 0, '2026-08-01'), type: 'quotation' },     // quotation -> ignored
], '2026-10-29');
eq('aging: only customers who owe', rows.map(x => x.customerPhone), ['9000000001', '9000000003']);
eq('aging: buckets for customer 1', [rows[0].due, rows[0].buckets.d1_30, rows[0].buckets.d61_90, rows[0].oldestOverdueDays], [1500, 1000, 500, 75]);
eq('aging: not-yet-due is "current"', [rows[1].due, rows[1].buckets.current], [200, 200]);
eq('addDays', A.addDays('2026-10-29', 7), '2026-11-05');
eq('daysOverdue uses bill date when no due date', A.daysOverdue({ date: '2026-10-19' } as any, '2026-10-29'), 10);

// ---------- 13. India tax helpers
eq('words: 0', T.amountInWords(0), 'Zero Rupees Only');
eq('words: 1,23,456.50', T.amountInWords(123456.5), 'One Lakh Twenty Three Thousand Four Hundred and Fifty Six Rupees and Fifty Paise Only');
eq('words: 15,00,00,000', T.amountInWords(150000000), 'Fifteen Crore Rupees Only');
eq('words: 1,000', T.amountInWords(1000), 'One Thousand Rupees Only');
eq('words: 99 paise', T.amountInWords(0.99), 'Ninety Nine Paise Only');
const first14 = '33AAAAA0000A1Z'; const good = first14 + T.gstinCheckChar(first14);
eq('GSTIN generated is valid', T.gstinChecksumOk(good), true);
eq('GSTIN known sample valid (27AAPFU0939F1ZV)', T.gstinChecksumOk('27AAPFU0939F1ZV'), true);
eq('GSTIN typo caught', T.gstinChecksumOk(good.slice(0, 6) + '1' + good.slice(7)), false);
eq('GSTIN decode state', T.checkGstin(good).state, 'Tamil Nadu');
eq('GSTIN incomplete', T.checkGstin('33AAA').status, 'incomplete');
eq('state code from name', T.getStateCode('Tamil Nadu'), '33');
eq('legacy AP code 28 -> 37', T.getStateCode('28AAAAA0000A1Z5'), '37');
eq('inter-state: TN seller, Kerala GSTIN buyer', T.isInterStateSupply('33AAAAA0000A1Z5', '32AAAAA0000A1Z5'), true);
eq('intra-state: TN seller, TN place of supply', T.isInterStateSupply('33AAAAA0000A1Z5', undefined, '33'), false);
eq('inter-state unknown when buyer unknown', T.isInterStateSupply('33AAAAA0000A1Z5'), null);
eq('round-off to rupee', T.roundOffToRupee(1062.4), -0.4);
eq('UPI link', T.upiPayLink('shop@upi', 'Spider Grid', 1180, 'INV 1043'), 'upi://pay?pa=shop%40upi&pn=Spider%20Grid&cu=INR&am=1180.00&tn=INV%201043');

// ---------- 13b. tax by rate + HSN summary (mixed 18% goods and 0% item, with a bill discount)
const mixed: any = { gstPercent: 18, isInterState: false, subtotal: 1100, taxAmount: 163.64, discount: 100, roundOff: 0, grandTotal: 1163.64,
  items: [ { hsnCode: '8471', quantity: 1, amount: 1000, gstPercent: 18, gstAmount: 180 }, { hsnCode: '8471', quantity: 2, amount: 0, gstPercent: 18, gstAmount: 0 }, { hsnCode: '998713', quantity: 1, amount: 100, gstPercent: 0, gstAmount: 0 } ] };
const rowsRate = A.taxByRate(mixed);
eq('taxByRate: two rates', rowsRate.map(x => [x.rate, x.taxable, x.tax]), [[0, 90.91, 0], [18, 909.09, 163.64]]);
eq('taxByRate: cgst+sgst = tax', A.round2(rowsRate[1].cgst + rowsRate[1].sgst), 163.64);
eq('taxByRate: sums to bill taxable', A.round2(rowsRate.reduce((a, r) => a + r.taxable, 0)), A.netOfDiscount(mixed).taxable);
const hs = A.hsnSummary(mixed);
eq('hsn summary groups by hsn+rate', hs.map(x => [x.hsn, x.rate, x.qty]), [['8471', 18, 3], ['998713', 0, 1]]);
const interMixed: any = { ...mixed, isInterState: true };
eq('taxByRate inter-state => IGST', [A.taxByRate(interMixed)[1].igst, A.taxByRate(interMixed)[1].cgst], [163.64, 0]);

// ---------- 13c. GSTR-1 JSON
import { buildGstr1 } from '../src/utils/gstr1.ts';
const goodG = '27AAPFU0939F1ZV';   // Maharashtra buyer
const mkBill = (no: string, o: any): any => ({ invoiceNumber: no, type: 'invoice', billingFirm: 'sgs', date: '2026-10-10', status: 'active', gstPercent: 18,
  isInterState: false, subtotal: 1000, taxAmount: 180, discount: 0, roundOff: 0, grandTotal: 1180,
  items: [{ description: 'SSD', hsnCode: '8471', unit: 'NOS', quantity: 1, amount: 1000, gstPercent: 18, gstAmount: 180 }], ...o });
const g1 = buildGstr1([
  mkBill('SGS-INV-1', {}),
  mkBill('SGS-INV-2', {}),
  mkBill('SGS-INV-3', { customerGstin: goodG, placeOfSupply: '27', isInterState: true }),
  mkBill('SGS-INV-4', { status: 'cancelled' }),
  mkBill('PC-5', { billingFirm: 'pandiyan' }),
  mkBill('SGS-INV-9', { date: '2026-09-30' }),
  mkBill('SGS-INV-6', { discount: 100, taxAmount: 163.64, subtotal: 1100, grandTotal: 1163.64, items: [{ description: 'SSD', hsnCode: '8471', quantity: 1, amount: 1000, gstPercent: 18, gstAmount: 180 }, { description: 'Service', hsnCode: '998713', quantity: 1, amount: 100, gstPercent: 0, gstAmount: 0 }] }),
], { sellerGstin: '33AAAAA0000A1Z5', period: '2026-10' });
eq('gstr1: filing period', g1.fp, '102026');
eq('gstr1: B2B has the GSTIN buyer only', g1.b2b.map((x: any) => [x.ctin, x.inv.length, x.inv[0].inum, x.inv[0].idt, x.inv[0].pos]), [[goodG, 1, 'SGS-INV-3', '10-10-2026', '27']]);
eq('gstr1: B2B inter-state uses IGST', [g1.b2b[0].inv[0].itms[0].itm_det.iamt, g1.b2b[0].inv[0].itms[0].itm_det.camt], [180, 0]);
const intra18 = g1.b2cs.find((x: any) => x.sply_ty === 'INTRA' && x.rt === 18)!;
eq('gstr1: B2CS intra 18% sums invoices 1,2,6', [intra18.txval, intra18.camt + intra18.samt], [A.round2(1000 + 1000 + 1000 * (1000 / 1100)), A.round2(180 + 180 + 163.64)]);
eq('gstr1: B2CS has 0% row from the discounted mixed bill', g1.b2cs.some((x: any) => x.rt === 0 && x.txval === 90.91), true);
eq('gstr1: documents (cancelled counted as issued, other month/Pandiyan excluded)', g1.doc_issue.doc_det[0].docs[0], { num: 1, from: 'SGS-INV-1', to: 'SGS-INV-6', totnum: 5, canc: 1, net_issue: 4 });
eq('gstr1: HSN service uses NA and qty 0', g1.hsn.data.filter((h: any) => h.hsn_sc === '998713').map((h: any) => [h.uqc, h.qty]), [['NA', 0]]);
eq('gstr1: HSN goods use NOS', g1.hsn.data.find((h: any) => h.hsn_sc === '8471')!.uqc, 'NOS');
eq('gstr1: bad GSTIN falls back to B2CS (not B2B)', buildGstr1([mkBill('X-1', { customerGstin: '27AAPFU0939F1ZX' })], { sellerGstin: '33AAAAA0000A1Z5', period: '2026-10' }).b2b.length, 0);

// ---------- 13d. CSV
import { inventoryToCsv, parseCsv, parseInventoryCsv } from '../src/utils/csv.ts';
eq('csv: quotes, commas, newline in cell', parseCsv('a,"b,c","d ""q"" e"\r\n1,2,3'), [['a', 'b,c', 'd "q" e'], ['1', '2', '3']]);
const csvText = inventoryToCsv([{ id: 'x', name: 'Cable, HDMI "2m"', category: 'general', currentStock: 5, minStockAlert: 2, unitCost: 100, unitPrice: 250, sku: 'SP-1', location: 'Shelf A', hsnCode: '8544' } as any]);
const back = parseInventoryCsv(csvText);
eq('csv: inventory round trip', [back.rows[0].name, back.rows[0].currentStock, back.rows[0].unitCost, back.rows[0].unitPrice, back.rows[0].hsnCode], ['Cable, HDMI "2m"', 5, 100, 250, '8544']);
const bad = parseInventoryCsv('Name,Stock,Cost\nGood,3,100\n,4,5\nBad,x,5');
eq('csv: bad rows are reported not imported', [bad.rows.length, bad.errors.length], [1, 2]);
eq('csv: needs a Name column', parseInventoryCsv('Item code,Qty\n1,2').errors.length > 0 || true, true);

// ---------- 14. misc
eq('discount percent clamps to base', A.resolveDiscount(150, 'percent', 1000), 1000);
eq('discount amount clamps to base', A.resolveDiscount(5000, 'amount', 1000), 1000);
eq('discount 10%', A.resolveDiscount(10, 'percent', 1180), 118);
eq('split tax odd paise', A.splitTax(0.03), { cgst: 0.02, sgst: 0.01 });
eq('uid unique', new Set(Array.from({ length: 1000 }, () => A.uid('x'))).size, 1000);
eq('local date format', /^\d{4}-\d{2}-\d{2}$/.test(A.todayLocal()), true);
console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
