/** Tiny CSV helpers (quotes, commas, newlines) + inventory import/export mapping. */
import type { InventoryItem } from '../types';

const cell = (v: unknown): string => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (rows: unknown[][]): string => rows.map(r => r.map(cell).join(',')).join('\r\n');

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cur = '', inQ = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQ) {
      if (c === '"') { if (src[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.some(x => x.trim() !== '')) rows.push(row);
      row = [];
    } else cur += c;
  }
  row.push(cur);
  if (row.some(x => x.trim() !== '')) rows.push(row);
  return rows;
}

export const INVENTORY_CSV_HEADER = ['Name', 'Category', 'HSN', 'Stock', 'Min Stock', 'Cost (no GST)', 'Selling Price (incl GST)', 'SKU', 'Location'];

export const inventoryToCsv = (items: InventoryItem[]): string =>
  toCsv([
    INVENTORY_CSV_HEADER,
    ...items.map(i => [i.name, i.category, i.hsnCode || '', i.currentStock, i.minStockAlert, i.unitCost, i.unitPrice, i.sku, i.location]),
  ]);

export interface ParsedInventoryRow {
  name: string; category: string; hsnCode: string; currentStock: number; minStockAlert: number;
  unitCost: number; unitPrice: number; sku: string; location: string;
}

/** Reads a CSV (any column order, header names are matched loosely). Returns rows + problems per line. */
export function parseInventoryCsv(text: string): { rows: ParsedInventoryRow[]; errors: string[] } {
  const table = parseCsv(text);
  const errors: string[] = [];
  if (table.length < 2) return { rows: [], errors: ['The file has no data rows.'] };
  const head = table[0].map(h => h.toLowerCase().replace(/[^a-z]/g, ''));
  const col = (...names: string[]) => head.findIndex(h => names.some(n => h.startsWith(n)));
  const idx = {
    name: col('name', 'item', 'product'), category: col('category'), hsn: col('hsn', 'sac'),
    stock: col('stock', 'qty', 'quantity'), min: col('minstock', 'min'),
    cost: col('cost', 'purchase'), price: col('selling', 'price', 'mrp'),
    sku: col('sku', 'code'), loc: col('location', 'shelf'),
  };
  if (idx.name < 0) return { rows: [], errors: ['A "Name" column is needed in the first row.'] };
  const num = (v: string | undefined) => {
    const n = Number(String(v ?? '').replace(/[₹,\s]/g, ''));
    return isFinite(n) && n >= 0 ? n : NaN;
  };
  const rows: ParsedInventoryRow[] = [];
  table.slice(1).forEach((r, k) => {
    const line = k + 2;
    const name = (r[idx.name] || '').trim();
    if (!name) { errors.push(`Line ${line}: item name is empty - skipped`); return; }
    const stock = idx.stock >= 0 ? num(r[idx.stock]) : 0;
    const cost = idx.cost >= 0 ? num(r[idx.cost]) : 0;
    const price = idx.price >= 0 ? num(r[idx.price]) : 0;
    if ([stock, cost, price].some(Number.isNaN)) { errors.push(`Line ${line} (${name}): a number is not valid - skipped`); return; }
    const min = idx.min >= 0 ? num(r[idx.min]) : 2;
    rows.push({
      name,
      category: (idx.category >= 0 ? r[idx.category] : '')?.trim().toLowerCase() || 'general',
      hsnCode: (idx.hsn >= 0 ? r[idx.hsn] : '')?.trim() || '',
      currentStock: stock, minStockAlert: Number.isNaN(min) ? 2 : min,
      unitCost: cost, unitPrice: price,
      sku: (idx.sku >= 0 ? r[idx.sku] : '')?.trim() || '',
      location: (idx.loc >= 0 ? r[idx.loc] : '')?.trim() || 'Main Shelf',
    });
  });
  return { rows, errors };
}
