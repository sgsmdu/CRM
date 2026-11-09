import { extractOcrPages, parseInvoiceLayout } from '../src/utils/paddleLayoutParser.ts';
import { extractTextFromPaddleResponse } from '../src/utils/paddleOcrParser.ts';

const tilt = 0.064, c = Math.cos(tilt), s = Math.sin(tilt);
const texts: string[] = [], polys: number[][][] = [];
function put(t: string, x: number, y: number, w = t.length * 11, h = 24) {
  const pts: [number, number][] = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  polys.push(pts.map(([px, py]) => [Math.round(px * c - py * s + 60), Math.round(px * s + py * c)]));
  texts.push(t);
}
// letterhead (bigger)
put('SIVA PRINTER SPARES', 300, 20, 420, 44);
put('TAX INVOICE', 520, 80);
put('GSTIN: 33AALCS8741K1ZU', 20, 110); put('Ph: 9842145670', 20, 136);
put('Invoice No :', 700, 110); put('SPS/2425/1042', 820, 110);
put('Date :', 700, 136); put('12-10-2026', 780, 136);
put('Bill To:', 20, 175); put('Spider Grid Solutions', 20, 200); put('GSTIN: 33ABCDE1234F1Z5', 20, 225);
// header
const H = 270;
put('S.No', 10, H); put('Description of Goods', 120, H); put('HSN', 480, H); put('Qty', 560, H); put('Rate', 640, H); put('GST %', 740, H); put('Amount', 860, H);
function item(n: string, name: string[], hsn: string, qty: string, rate: string, gst: string, amt: string, y: number) {
  put(n, 15, y); put(name[0], 120, y); if (name[1]) put(name[1], 120, y + 26);
  put(hsn, 480, y); put(qty, 575, y); put(rate, 640 + (7 - rate.length) * 11, y); put(gst, 760, y); put(amt, 880 + (9 - amt.length) * 11, y);
}
item('1', ['HP 12A Black Toner Cartridge'], '8443', '2', '635.59', '18', '1271.19', 310);
item('2', ['Kingston A400 240GB SATA', 'SSD (3 Yr Warranty)'], '8471', '3', '1822.03', '18', '5466.10', 345);
item('3', ['Frontech 450W SMPS'], '8504', '2', '805.08', '18', '1610.17', 410);
put('Total', 120, 460); put('7', 575, 460); put('8347.46', 880, 460);
put('CGST 9%', 700, 500); put('751.27', 900, 500);
put('SGST 9%', 700, 526); put('751.27', 900, 526);
put('Grand Total', 700, 560); put('9850.00', 900, 560);

const resp = { result: { ocrResults: [{ prunedResult: { rec_texts: texts, dt_polys: polys, rec_polys: polys } }] } };
void extractTextFromPaddleResponse;
const pages = extractOcrPages(resp);
const r = parseInvoiceLayout(pages[0], [{ id: '1', name: 'Siva Printer Spares' }]);
const d = r!.data;
const ok = d.vendorName === 'Siva Printer Spares' && d.vendorGstin === '33AALCS8741K1ZU' && d.invoiceNumber === 'SPS/2425/1042' && d.invoiceDate === '2026-10-12'
  && d.items.length === 3 && d.items[1].itemName === 'Kingston A400 240GB SATA SSD (3 Yr Warranty)' && d.totalAmount === 9850 && (d.warnings || []).length === 0;
console.log(ok ? 'PASS ocr: tilted bill parsed (vendor, GSTIN, no., date, 3 items, wrapped name, total)' : 'FAIL ocr tilted bill ' + JSON.stringify(d.items.map((i: any) => i.itemName)));
if (!ok) process.exitCode = 1;
