import { todayLocal } from './accounting.ts';
/**
 * Layout-aware invoice parser for PaddleOCR 3.x output.
 *
 * The old parser treated every OCR text box as an independent "line", so the
 * columns of an invoice table (Item / HSN / Qty / Rate / GST / Amount) got mixed
 * up. This parser uses the bounding boxes instead:
 *   1. de-skews the photo (phone photos are always a little tilted)
 *   2. groups boxes into visual rows by Y position
 *   3. finds the table header row and builds columns from it
 *   4. puts every cell of every item row into the right column
 *   5. reads vendor / GSTIN / invoice no / date / totals by label
 */
import type { ParsedBillItem, ParsedInvoiceData } from './paddleOcrParser.ts';

type Pt = [number, number];

export interface OcrBox {
  text: string;
  x0: number; x1: number; y0: number; y1: number;
  cx: number; cy: number; w: number; h: number;
}

export interface TableColumn {
  key: string;   // desc | hsn | qty | rate | amount | taxable | gst | cgst | sgst | igst | disc | sno
  label: string;
  x0: number; x1: number; cx: number;
}

export interface LayoutResult {
  data: ParsedInvoiceData;
  columns: TableColumn[] | null;
  usedTable: boolean;
  rowTexts: string[];
}

interface Row { boxes: OcrBox[]; cy: number; h: number; text: string; }

// ---------------------------------------------------------------- extraction

function polyFrom(p: any): Pt[] | null {
  if (!Array.isArray(p)) return null;
  if (p.length === 4 && typeof p[0] === 'number') {
    const [x1, y1, x2, y2] = p as number[];
    return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
  }
  if (p.length >= 4 && Array.isArray(p[0])) {
    return p.slice(0, 4).map((q: any) => [Number(q[0]), Number(q[1])] as Pt);
  }
  return null;
}

/** Returns one OcrBox[] per page found in a PaddleOCR (PaddleX serving) response. */
export function extractOcrPages(data: any): OcrBox[][] {
  const out: OcrBox[][] = [];
  const results = data?.result?.ocrResults;
  if (!Array.isArray(results)) return out;

  for (const page of results) {
    const pr = page?.prunedResult ?? page?.pruned_result ?? page;
    const texts = pr?.rec_texts ?? pr?.rec_text;
    if (!Array.isArray(texts) || texts.length === 0) continue;

    // rec_* arrays are index-aligned with rec_texts; dt_polys only if the counts match
    const geo = [pr.rec_polys, pr.rec_boxes, pr.dt_polys].find(
      (c: any) => Array.isArray(c) && c.length === texts.length
    );
    if (!geo) continue;

    const polys: (Pt[] | null)[] = texts.map((_: any, i: number) => polyFrom(geo[i]));

    // Estimate page skew from the top edge of wide boxes (weighted median)
    const angs: { a: number; w: number }[] = [];
    for (const p of polys) {
      if (!p) continue;
      const dx = p[1][0] - p[0][0], dy = p[1][1] - p[0][1];
      const w = Math.hypot(dx, dy);
      const h = Math.hypot(p[3][0] - p[0][0], p[3][1] - p[0][1]);
      if (w > 2 * h && w > 0) angs.push({ a: Math.atan2(dy, dx), w });
    }
    let theta = 0;
    if (angs.length > 0) {
      angs.sort((a, b) => a.a - b.a);
      const half = angs.reduce((s, x) => s + x.w, 0) / 2;
      let acc = 0;
      for (const x of angs) { acc += x.w; if (acc >= half) { theta = x.a; break; } }
      if (Math.abs(theta) > 0.35) theta = 0; // >20deg is probably wrong, ignore
    }
    const cos = Math.cos(theta), sin = Math.sin(theta);

    const boxes: OcrBox[] = [];
    texts.forEach((t: any, i: number) => {
      const p = polys[i];
      const text = typeof t === 'string' ? t.trim() : '';
      if (!p || !text) return;
      const rp = p.map(([x, y]) => [x * cos + y * sin, -x * sin + y * cos] as Pt);
      const xs = rp.map(q => q[0]), ys = rp.map(q => q[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      boxes.push({ text, x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 });
    });
    if (boxes.length > 0) out.push(boxes);
  }
  return out;
}

// ---------------------------------------------------------------- helpers

const median = (a: number[]) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

function groupRows(boxes: OcrBox[]): Row[] {
  const medH = median(boxes.map(b => b.h)) || 20;
  const sorted = [...boxes].sort((a, b) => a.cy - b.cy);
  const rows: Row[] = [];
  for (const b of sorted) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(b.cy - last.cy) <= medH * 0.6) {
      last.boxes.push(b);
      last.cy = last.boxes.reduce((s, x) => s + x.cy, 0) / last.boxes.length;
    } else {
      rows.push({ boxes: [b], cy: b.cy, h: 0, text: '' });
    }
  }
  for (const r of rows) {
    r.boxes.sort((a, b) => a.x0 - b.x0);
    r.h = r.boxes.reduce((s, x) => s + x.h, 0) / r.boxes.length;
    r.text = r.boxes.map(b => b.text).join('  ');
  }
  return rows;
}

const nums = (s: string): number[] =>
  (s.match(/-?\d[\d,]*(?:\.\d+)?/g) || [])
    .map(x => Number(x.replace(/,/g, '')))
    .filter(n => !isNaN(n));

const r2 = (n: number) => Number(n.toFixed(2));
const SLABS = [0, 3, 5, 12, 18, 28];
const PCT_VALUES = [0, 0.25, 1.5, 2.5, 3, 5, 6, 9, 12, 14, 18, 28];

function nearestSlab(x: number): number {
  let best = SLABS[0], d = Infinity;
  for (const s of SLABS) { if (Math.abs(s - x) < d) { d = Math.abs(s - x); best = s; } }
  return d <= 1.5 ? best : Math.round(x);
}

function classifyHeader(t: string): string | null {
  const s = t.toLowerCase().replace(/[^a-z%\s.]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  if (/\b(hsn|sac)\b/.test(s)) return 'hsn';
  if (/taxable/.test(s)) return 'taxable';
  if (/\b(cgst|sgst|utgst|igst)\b/.test(s)) return s.includes('igst') ? 'igst' : s.includes('cgst') ? 'cgst' : 'sgst';
  if (/\b(gst|tax|vat)\b/.test(s)) return 'gst';
  if (/\b(qty|quantity|nos|pcs)\b/.test(s)) return 'qty';
  if (/\b(rate|price|mrp)\b/.test(s) || /\bunit\s*(price|rate|cost)\b/.test(s)) return 'rate';
  if (/\bdisc/.test(s)) return 'disc';
  if (/\b(amount|amt|total|value)\b/.test(s)) return 'amount';
  if (/(description|particulars|item|product|goods|details)/.test(s)) return 'desc';
  if (/^(s\.?\s*no\.?|sl\.?(\s*no\.?)?|sr\.?(\s*no\.?)?|no\.?|#)$/.test(s)) return 'sno';
  return null;
}

const STOP_ROW = /^(sub\s*-?\s*total|grand\s*total|total|net\s*(amount|payable)|amount\s*(in\s*words|chargeable|payable)|rupees|bank|terms|declaration|e\s*&\s*o)/i;

function findHeader(rows: Row[]): { idx: number; columns: TableColumn[] } | null {
  const limit = Math.min(rows.length, Math.max(3, Math.floor(rows.length * 0.75)));
  for (let i = 0; i < limit; i++) {
    const cols: TableColumn[] = [];
    for (const b of rows[i].boxes) {
      const key = classifyHeader(b.text);
      if (key) cols.push({ key, label: b.text, x0: b.x0, x1: b.x1, cx: b.cx });
    }
    const keys = new Set(cols.map(c => c.key));
    if ((keys.has('desc') || keys.has('qty')) && keys.size >= 3 && (keys.has('amount') || keys.has('rate') || keys.has('taxable'))) {
      cols.sort((a, b) => a.cx - b.cx);
      return { idx: i, columns: cols };
    }
  }
  return null;
}

function assignColumn(b: OcrBox, cols: TableColumn[]): number {
  const descIdx = cols.findIndex(c => c.key === 'desc');
  if (descIdx >= 0) {
    const next = cols[descIdx + 1];
    const descRight = next ? (cols[descIdx].x1 + next.x0) / 2 : Infinity;
    if (b.cx < descRight) {
      const snoIdx = cols.findIndex(c => c.key === 'sno');
      if (snoIdx >= 0 && /^\d{1,3}[.)]?$/.test(b.text) && b.x1 < cols[descIdx].x0 + 5) return snoIdx;
      if (snoIdx < 0 && /^\d{1,3}[.)]?$/.test(b.text) && b.cx < cols[descIdx].x0) return -1; // serial no. without header: ignore
      return descIdx;
    }
  }
  // overlap first
  let best = -1, bestOv = 0;
  cols.forEach((c, i) => {
    if (c.key === 'desc' || c.key === 'sno') return;
    const ov = Math.min(b.x1, c.x1) - Math.max(b.x0, c.x0);
    if (ov > bestOv) { bestOv = ov; best = i; }
  });
  if (best >= 0) return best;
  // otherwise nearest centre
  let d = Infinity;
  cols.forEach((c, i) => {
    if (c.key === 'desc' || c.key === 'sno') return;
    const dist = Math.abs(b.cx - c.cx);
    if (dist < d) { d = dist; best = i; }
  });
  return best >= 0 ? best : 0;
}

function asPercent(text: string, header: string): number | null {
  const ns = nums(text);
  if (!ns.length) return null;
  const v = ns[0];
  if ((/%/.test(text) || /%/.test(header)) && v <= 40) return v;
  if (v <= 28 && PCT_VALUES.includes(v)) return v;
  return null;
}

// ---------------------------------------------------------------- dates

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function parseDate(s: string): string | null {
  let m = s.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/);
  if (m) {
    let d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]);
    if (y < 100) y += 2000;
    if (mo > 12 && d <= 12) [d, mo] = [mo, d]; // Indian bills are dd/mm/yyyy
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  m = s.match(/\b(\d{1,2})[\s\-.]*([A-Za-z]{3,9})[\s\-.,]*(\d{2,4})\b/);
  if (m) {
    const mo = MONTHS[m[2].slice(0, 3).toLowerCase()];
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    if (mo) return `${y}-${String(mo).padStart(2, '0')}-${String(Number(m[1])).padStart(2, '0')}`;
  }
  return null;
}

// ---------------------------------------------------------------- main

interface RawItem {
  name: string; hsn: string;
  qty: number | null; rate: number | null; amount: number | null;
  taxable: number | null; pct: number | null; taxAmt: number | null;
}

export function parseInvoiceLayout(
  boxes: OcrBox[],
  knownVendors: { id: string; name: string }[] = [],
  prevColumns: TableColumn[] | null = null
): LayoutResult | null {
  if (boxes.length < 5) return null;
  const rows = groupRows(boxes);
  const rowTexts = rows.map(r => r.text);
  const warnings: string[] = [];

  let header = findHeader(rows);
  let columns: TableColumn[] | null = header ? header.columns : prevColumns;
  const tableStart = header ? header.idx + 1 : (prevColumns ? 0 : -1);
  if (!columns || tableStart < 0) return null;

  // ---- table rows
  const cellsOf = (row: Row) => {
    const cells: Record<number, string[]> = {};
    for (const b of row.boxes) {
      const ci = assignColumn(b, columns!);
      if (ci < 0) continue;
      (cells[ci] ||= []).push(b.text);
    }
    return cells;
  };
  const keyText = (cells: Record<number, string[]>, key: string) =>
    columns!.map((c, i) => (c.key === key ? (cells[i] || []).join(' ') : '')).filter(Boolean).join(' ').trim();
  const rowHasNumbers = (cells: Record<number, string[]>) =>
    ['qty', 'rate', 'amount', 'taxable'].some(k => nums(keyText(cells, k)).some(n => n > 0));

  const rawItems: RawItem[] = [];
  let tableEnd = rows.length;
  let pendingName = '';

  for (let i = tableStart; i < rows.length; i++) {
    const row = rows[i];
    if (STOP_ROW.test(row.boxes[0].text.trim()) || /(grand\s*total|sub\s*-?\s*total|amount\s*in\s*words)/i.test(row.text)) {
      tableEnd = i;
      break;
    }
    // A repeated header row inside the table (page break)
    if (i > tableStart && findHeader([row]) ) continue;

    const cells = cellsOf(row);
    const desc = keyText(cells, 'desc');

    if (!rowHasNumbers(cells)) {
      if (!desc) continue;
      const nextCells = i + 1 < rows.length ? cellsOf(rows[i + 1]) : null;
      const nextIsItemWithoutName = !!nextCells && rowHasNumbers(nextCells) && !keyText(nextCells, 'desc');
      if (nextIsItemWithoutName || rawItems.length === 0) pendingName = (pendingName + ' ' + desc).trim();
      else rawItems[rawItems.length - 1].name += ' ' + desc; // wrapped description
      continue;
    }

    // numeric row => a new item
    const qtyText = keyText(cells, 'qty');
    let pct: number | null = null, cg = 0, hasCg = false, igst: number | null = null, gstGeneric: number | null = null;
    let taxAmt = 0, hasTaxAmt = false;
    columns.forEach((c, ci) => {
      if (!['gst', 'cgst', 'sgst', 'igst'].includes(c.key)) return;
      const t = (cells[ci] || []).join(' ');
      if (!t) return;
      const p = asPercent(t, c.label);
      if (p !== null) {
        if (c.key === 'cgst' || c.key === 'sgst') { cg += p; hasCg = true; }
        else if (c.key === 'igst') igst = p;
        else gstGeneric = p;
      } else {
        const n = nums(t)[0];
        if (n) { taxAmt += n; hasTaxAmt = true; }
      }
    });
    pct = hasCg ? cg : (igst ?? gstGeneric);

    const qtyNums = nums(qtyText);
    const num = (k: string) => { const n = nums(keyText(cells, k)); return n.length ? n[n.length - 1] : null; };

    const name = (pendingName + ' ' + desc).trim() || 'Item';
    pendingName = '';
    rawItems.push({
      name,
      hsn: (keyText(cells, 'hsn').match(/\d{4,8}/) || [''])[0],
      qty: qtyNums.length ? qtyNums[0] : null,
      rate: num('rate'),
      amount: num('amount'),
      taxable: num('taxable'),
      pct,
      taxAmt: hasTaxAmt ? taxAmt : null,
    });
  }

  if (rawItems.length === 0) return null;

  // ---- header fields (above table) & totals (below table)
  const topRows = rows.slice(0, header ? header.idx : Math.min(rows.length, 12));
  const bottomRows = rows.slice(tableEnd);
  const topText = topRows.map(r => r.text).join('\n');

  const OWN = /(spider\s*grid|pandiyan)/i;
  const GENERIC = /(tax\s*invoice|retail\s*invoice|cash\s*memo|delivery\s*challan|original\s*for|duplicate|triplicate|bill\s*of\s*supply|invoice|estimate|quotation|page\s*\d)/i;

  // vendor
  let vendorName = '';
  for (const v of knownVendors) {
    if (v.name && topText.toLowerCase().includes(v.name.toLowerCase())) { vendorName = v.name; break; }
  }
  if (!vendorName) {
    let bestH = 0;
    for (const r of topRows.slice(0, 6)) {
      const t = r.text.trim();
      if (t.length < 4 || GENERIC.test(t) || OWN.test(t) || /gstin|phone|mob|email|www\.|@/i.test(t) || /\d{5,}/.test(t)) continue;
      if (r.h > bestH) { bestH = r.h; vendorName = t; }
    }
  }
  if (!vendorName) vendorName = 'Vendor (please select)';

  // GSTIN (skip anything after Bill To / Buyer / Consignee)
  const gstinRe = /\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]\b/i;
  let vendorGstin = '';
  let buyerSeen = false;
  for (const r of rows.slice(0, header ? header.idx : 25)) {
    if (/(bill(ed)?\s*to|buyer|consignee|ship(ped)?\s*to|customer|party\s*details)/i.test(r.text)) buyerSeen = true;
    const m = r.text.replace(/\s/g, ' ').match(gstinRe);
    if (m && !buyerSeen) { vendorGstin = m[0].toUpperCase(); break; }
  }

  // phone
  let vendorPhone = '';
  for (const r of topRows.slice(0, 8)) {
    const t = r.text.replace(gstinRe, '');
    const m = t.match(/(?:\+?91[\s-]?)?[6-9]\d{9}\b/);
    if (m) { vendorPhone = m[0].replace(/[\s+-]/g, '').replace(/^91(?=\d{10}$)/, ''); break; }
  }

  // invoice number (label is mandatory; value may be in the next row below the label)
  let invoiceNumber = '';
  const invRe = /(?:invoice|inv|bill|dc|challan|memo|receipt)\s*(?:no|number|num|#)\s*\.?\s*[:\-.]?\s*([A-Za-z0-9][A-Za-z0-9\/\-]*)/i;
  const scanRows = rows.slice(0, header ? header.idx : 20);
  for (let i = 0; i < scanRows.length && !invoiceNumber; i++) {
    const m = scanRows[i].text.match(invRe);
    if (m && !/^(date|gstin|dated)$/i.test(m[1])) { invoiceNumber = m[1]; break; }
    const lab = scanRows[i].boxes.find(b => /(?:invoice|bill|inv)\s*(?:no|number)\.?\s*[:\-]?$/i.test(b.text));
    if (lab && scanRows[i + 1]) {
      const below = [...scanRows[i + 1].boxes].sort((a, b) => Math.abs(a.cx - lab.cx) - Math.abs(b.cx - lab.cx))[0];
      if (below && /[A-Za-z0-9]/.test(below.text)) invoiceNumber = below.text.replace(/[^A-Za-z0-9\/\-]/g, '');
    }
  }

  // invoice date
  let invoiceDate = '';
  for (const r of scanRows) {
    const m = r.text.match(/date[d]?\s*[:\-]?\s*(.+)/i);
    const d = m ? parseDate(m[1]) : null;
    if (d) { invoiceDate = d; break; }
  }
  if (!invoiceDate) {
    for (const r of scanRows) { const d = parseDate(r.text); if (d) { invoiceDate = d; break; } }
  }
  if (!invoiceDate) { invoiceDate = todayLocal(); warnings.push('Invoice date not read - please check the date'); }
  if (!invoiceNumber) warnings.push('Invoice number not read - please type it');

  // totals
  const lastNum = (t: string) => { const n = nums(t); return n.length ? n[n.length - 1] : 0; };
  let grand = 0, taxTotal = 0, discount = 0, roundOff = 0;
  let cgstSum = 0, sgstSum = 0, igstSum = 0;
  for (const r of bottomRows) {
    const t = r.text;
    if (/round\s*off/i.test(t)) { const n = nums(t); if (n.length) roundOff = n[n.length - 1] * (/-\s*\d/.test(t.replace(/.*round\s*off/i, '')) ? -1 : 1); continue; }
    if (/(grand\s*total|total\s*amount|net\s*(payable|amount)|invoice\s*(total|value)|amount\s*payable|balance\s*due)/i.test(t) && !/in\s*words/i.test(t)) {
      const v = lastNum(t); if (v > 0) grand = v; continue;
    }
    if (/(total\s*(gst|tax)|tax\s*amount|gst\s*amount)/i.test(t) && !/taxable/i.test(t)) { const v = lastNum(t); if (v > 0) taxTotal = v; continue; }
    if (/^\s*cgst\b/i.test(t)) { cgstSum += lastNum(t); continue; }
    if (/^\s*sgst\b/i.test(t)) { sgstSum += lastNum(t); continue; }
    if (/^\s*igst\b/i.test(t)) { igstSum += lastNum(t); continue; }
    if (/discount/i.test(t)) { const v = lastNum(t); if (v > 0) discount = v; }
  }
  if (!taxTotal) taxTotal = cgstSum + sgstSum + igstSum;
  if (!grand) {
    // plain "Total  <qty>  <amount>" row directly after the table
    const tr = bottomRows.find(r => /^\s*total\b/i.test(r.text));
    if (tr) grand = lastNum(tr.text);
  }

  // ---- finalize items (decide whether rate includes GST)
  const lineAmt = (r: RawItem) => r.taxable ?? r.amount ?? ((r.rate ?? 0) * (r.qty ?? 1));
  const sumAmt = rawItems.reduce((a, r) => a + lineAmt(r), 0);
  const anyTaxInfo = rawItems.some(r => r.pct !== null || r.taxAmt !== null) || taxTotal > 0;
  let inclusive: boolean;
  if (rawItems.some(r => r.taxable !== null)) inclusive = false;
  else if (grand > 0 && sumAmt > 0) inclusive = grand / sumAmt < 1.02;
  else inclusive = !anyTaxInfo;

  let invoicePct: number | null = null;
  if (taxTotal > 0 && sumAmt > 0) {
    const base = inclusive ? sumAmt - taxTotal : sumAmt;
    if (base > 0) invoicePct = nearestSlab((taxTotal / base) * 100);
  } else if (!inclusive && grand > 0 && sumAmt > 0) {
    invoicePct = nearestSlab((grand / sumAmt - 1) * 100);
  }
  let assumedGst = false;

  const items: ParsedBillItem[] = rawItems.map(r => {
    const qty = r.qty && r.qty > 0 ? r.qty : (r.rate && r.amount ? Math.max(1, Math.round(r.amount / r.rate)) : 1);
    const amt = lineAmt({ ...r, qty });
    let g = r.pct;
    if (g === null && r.taxAmt && r.taxable) g = nearestSlab((r.taxAmt / r.taxable) * 100);
    if (g === null) g = invoicePct;
    if (g === null) { g = 18; assumedGst = true; }

    const unit = amt / qty;
    let gross: number, base: number;
    if (r.taxable !== null && r.amount !== null && r.amount > r.taxable * 1.001) {
      base = r.taxable / qty; gross = r.amount / qty;   // taxable + total columns both present
    } else if (inclusive) {
      gross = unit; base = unit / (1 + g / 100);
    } else {
      base = unit; gross = unit * (1 + g / 100);
    }
    const total = r2(base * qty), totalWithGst = r2(gross * qty);
    return {
      itemName: r.name.replace(/\s+/g, ' ').trim(),
      hsnCode: r.hsn,
      quantity: qty,
      unitCost: r2(base),
      grossUnitCost: r2(gross),
      gstPercent: g,
      total,
      totalWithGst,
      gstAmount: r2(totalWithGst - total),
    };
  });
  if (assumedGst) warnings.push('GST % not found on bill - 18% assumed, please verify');

  const itemsGross = r2(items.reduce((a, i) => a + i.totalWithGst, 0));
  const subtotal = r2(items.reduce((a, i) => a + i.total, 0));
  const taxAmount = r2(items.reduce((a, i) => a + i.gstAmount, 0));
  const totalAmount = grand > 0 ? grand : itemsGross;
  if (grand > 0 && Math.abs(itemsGross - grand) > Math.max(5, grand * 0.02)) {
    warnings.push(`Items add up to ₹${itemsGross} but bill total is ₹${grand} - check for a missed/mis-read row`);
  }

  return {
    columns,
    usedTable: true,
    rowTexts,
    data: {
      vendorName,
      vendorGstin,
      vendorPhone,
      invoiceNumber,
      invoiceDate,
      items,
      subtotal,
      taxAmount,
      discount: discount || undefined,
      roundOff: roundOff || undefined,
      totalAmount,
      warnings,
      rawTextLines: rowTexts,
    },
  };
}
