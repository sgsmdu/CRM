/**
 * GSTR-1 (outward supplies) JSON builder - pure function, GST portal offline-tool shape.
 *  - B2B   : invoices to a buyer with a GSTIN (grouped by buyer)
 *  - B2CS  : everything else, summed by place of supply + GST rate (INTRA / INTER)
 *  - HSN   : by HSN + unit + rate
 *  - Docs  : issued / cancelled count
 * Discounts are already inside the taxable value (see accounting.netOfDiscount).
 */
import type { Invoice } from '../types';
import { hsnSummary, netOfDiscount, round2, splitTax, taxByRate } from './accounting.ts';
import { getStateCode, gstinChecksumOk } from './indiaTax.ts';

const dmy = (iso: string) => {
  const [y, m, d] = (iso || '').split('-');
  return `${d}-${m}-${y}`;
};

export interface Gstr1Options {
  sellerGstin: string;
  period: string; // YYYY-MM
  defaultHsn?: string;
}

export function buildGstr1(allInvoices: Invoice[], opt: Gstr1Options) {
  const sellerState = getStateCode(opt.sellerGstin) || '33';
  const inPeriod = allInvoices.filter(
    i => i.type === 'invoice' && i.billingFirm !== 'pandiyan' && (i.date || '').startsWith(opt.period)
  );
  const active = inPeriod.filter(i => i.status !== 'cancelled');
  const cancelled = inPeriod.length - active.length;

  // ---- B2B
  const b2bMap = new Map<string, any[]>();
  // ---- B2CS aggregate
  const b2csMap = new Map<string, { sply_ty: string; pos: string; typ: string; rt: number; txval: number; iamt: number; camt: number; samt: number; csamt: number }>();
  // ---- HSN aggregate
  const hsnMap = new Map<string, { hsn_sc: string; desc: string; uqc: string; qty: number; val: number; txval: number; iamt: number; camt: number; samt: number; csamt: number; rt: number }>();

  let invoiceValue = 0;

  for (const inv of active) {
    invoiceValue += inv.grandTotal || 0;
    const net = netOfDiscount(inv);
    const inter = !!inv.isInterState;
    const pos = (inv.placeOfSupply && getStateCode(inv.placeOfSupply)) || getStateCode(inv.customerGstin || '') || sellerState;
    const rows = taxByRate(inv);

    const ctin = (inv.customerGstin || '').trim().toUpperCase();
    if (ctin && gstinChecksumOk(ctin)) {
      const list = b2bMap.get(ctin) || [];
      list.push({
        inum: inv.invoiceNumber,
        idt: dmy(inv.date),
        val: round2(inv.grandTotal),
        pos,
        rchrg: 'N',
        inv_typ: 'R',
        itms: rows.map((r, idx) => ({
          num: idx + 1,
          itm_det: { rt: r.rate, txval: r.taxable, iamt: r.igst, camt: r.cgst, samt: r.sgst, csamt: 0 },
        })),
      });
      b2bMap.set(ctin, list);
    } else {
      for (const r of rows) {
        const key = `${inter ? 'INTER' : 'INTRA'}|${pos}|${r.rate}`;
        const row = b2csMap.get(key) || { sply_ty: inter ? 'INTER' : 'INTRA', pos, typ: 'OE', rt: r.rate, txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 };
        row.txval = round2(row.txval + r.taxable);
        row.iamt = round2(row.iamt + r.igst);
        row.camt = round2(row.camt + r.cgst);
        row.samt = round2(row.samt + r.sgst);
        b2csMap.set(key, row);
      }
    }

    for (const h of hsnSummary(inv)) {
      const item = (inv.items || []).find(i => ((i.hsnCode || '').trim() || '-') === h.hsn);
      const hsn = h.hsn === '-' ? (opt.defaultHsn || '998713') : h.hsn;
      const isService = hsn.startsWith('99');
      const uqc = isService ? 'NA' : (item?.unit || 'NOS').toUpperCase();
      const key = `${hsn}|${uqc}|${h.rate}`;
      const split = inter ? { cgst: 0, sgst: 0 } : splitTax(h.tax);
      const row = hsnMap.get(key) || { hsn_sc: hsn, desc: (item?.description || '').split('\n')[0].substring(0, 30), uqc, qty: 0, val: 0, txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0, rt: h.rate };
      row.qty = isService ? 0 : round2(row.qty + h.qty);
      row.txval = round2(row.txval + h.taxable);
      row.val = round2(row.val + h.taxable + h.tax);
      row.iamt = round2(row.iamt + (inter ? h.tax : 0));
      row.camt = round2(row.camt + split.cgst);
      row.samt = round2(row.samt + split.sgst);
      hsnMap.set(key, row);
    }
    void net;
  }

  // numbers issued in the month (cancelled ones count as issued)
  const nums = inPeriod.map(i => i.invoiceNumber).filter(Boolean).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );

  return {
    gstin: opt.sellerGstin,
    fp: `${opt.period.slice(5, 7)}${opt.period.slice(0, 4)}`,
    gt: 0,
    cur_gt: round2(invoiceValue),
    b2b: Array.from(b2bMap.entries()).map(([ctin, inv]) => ({ ctin, inv })),
    b2cs: Array.from(b2csMap.values()),
    hsn: { data: Array.from(hsnMap.values()).map((h, i) => ({ num: i + 1, ...h })) },
    doc_issue: {
      doc_det: [{
        doc_num: 1,
        doc_typ: 'Invoices for outward supply',
        docs: nums.length === 0 ? [] : [{
          num: 1,
          from: nums[0],
          to: nums[nums.length - 1],
          totnum: inPeriod.length,
          canc: cancelled,
          net_issue: active.length,
        }],
      }],
    },
  };
}
