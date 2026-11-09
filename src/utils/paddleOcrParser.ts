import { todayLocal } from './accounting.ts';
/**
 * PaddleOCR Invoice & Multi-Page Receipt Parser
 * Parses recognized text lines and bounding boxes from PaddleOCR / PaddleX / PaddleHub serving
 * into structured Indian GST Vendor Purchase Bills for Spider Grid Solutions.
 */

export interface ParsedBillItem {
  itemName: string;
  hsnCode?: string;
  quantity: number;
  unitCost: number; // Base rate without tax
  grossUnitCost: number; // Rate with GST
  gstPercent: number; // Tax %
  gstAmount: number; // Tax amount in ₹
  total: number; // Base amount
  totalWithGst: number; // Gross amount
}

export interface ParsedInvoiceData {
  vendorName: string;
  vendorGstin?: string;
  vendorPhone?: string;
  invoiceNumber: string;
  invoiceDate: string;
  items: ParsedBillItem[];
  subtotal: number;
  taxAmount: number;
  discount?: number;
  roundOff?: number;
  totalAmount: number;
  notes?: string;
  warnings?: string[];
  rawTextLines: string[];
}

/**
 * Extracts plain text lines from various standard PaddleOCR API response formats:
 * 1. PaddleX / Serving v2/v3 pipeline: { result: { ocrResults: [{ prunedResult: { rec_text: [...] } }] } }
 * 2. PaddleHub Serving: { results: [[ { text: "...", confidence: ... } ]] }
 * 3. FastAPI / Custom wrapper: { text_lines: [...] } or { result: ["..."] } or { predictions: [...] }
 */
export function extractTextFromPaddleResponse(data: any): string[] {
  if (!data) return [];

  // Format 1: PaddleX / PaddleOCR 3.x pipeline
  // result.ocrResults[].prunedResult.rec_texts (plural, PaddleOCR 3.x) or rec_text (older builds)
  if (data?.result?.ocrResults && Array.isArray(data.result.ocrResults)) {
    const lines: string[] = [];
    for (const page of data.result.ocrResults) {
      const pr = page?.prunedResult ?? page?.pruned_result ?? page;
      const recTexts = pr?.rec_texts ?? pr?.rec_text;
      if (Array.isArray(recTexts)) {
        lines.push(...recTexts.filter((t: any) => typeof t === 'string'));
      }
      // Newer layouts sometimes nest results one more level
      if (Array.isArray(pr?.overall_ocr_res?.rec_texts)) {
        lines.push(...pr.overall_ocr_res.rec_texts.filter((t: any) => typeof t === 'string'));
      }
    }
    const cleaned = lines.map(l => l.trim()).filter(Boolean);
    if (cleaned.length > 0) return cleaned;
  }

  // Format 2: PaddleHub Serving ({ results: [[ { text: "...", confidence: ... } ]] })
  if (Array.isArray(data?.results)) {
    const lines: string[] = [];
    for (const page of data.results) {
      if (Array.isArray(page)) {
        for (const item of page) {
          if (typeof item === 'string') lines.push(item);
          else if (item?.text) lines.push(item.text);
        }
      }
    }
    if (lines.length > 0) return lines;
  }

  // Format 3: Direct text_lines or predictions
  if (Array.isArray(data?.text_lines)) {
    return data.text_lines.map((t: any) => typeof t === 'string' ? t : (t?.text || String(t)));
  }

  if (Array.isArray(data?.predictions)) {
    return data.predictions.map((p: any) => typeof p === 'string' ? p : (p?.text || String(p)));
  }

  if (Array.isArray(data?.result) && typeof data.result[0] === 'string') {
    return data.result;
  }

  if (Array.isArray(data?.lines)) {
    return data.lines.map((l: any) => typeof l === 'string' ? l : (l?.text || String(l)));
  }

  // Last resort: walk the JSON and collect any rec_texts / rec_text string arrays
  const found: string[] = [];
  const walk = (node: any, depth = 0) => {
    if (!node || depth > 8) return;
    if (Array.isArray(node)) { node.forEach(n => walk(n, depth + 1)); return; }
    if (typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if ((k === 'rec_texts' || k === 'rec_text') && Array.isArray(v)) {
          found.push(...(v as any[]).filter(t => typeof t === 'string'));
        } else {
          walk(v, depth + 1);
        }
      }
    }
  };
  walk(data);
  return found.map(l => l.trim()).filter(Boolean);
}

/**
 * Parses raw text lines from an invoice image into structured GST purchase bill data
 */
export function parsePaddleOcrText(
  lines: string[], 
  knownVendors: { id: string; name: string }[] = []
): ParsedInvoiceData {
  const cleanLines = lines.map(l => l.trim()).filter(l => l.length > 0);
  
  let vendorName = '';
  let vendorGstin = '';
  let vendorPhone = '';
  let invoiceNumber = '';
  let invoiceDate = todayLocal();
  let subtotal = 0;
  let taxAmount = 0;
  let totalAmount = 0;
  const items: ParsedBillItem[] = [];

  // Known Tamil Nadu & Indian IT hardware distributors / stores
  const knownKeywords = [
    'siva printer', 'national infotech', 'redington', 'compuserve', 
    'rashi peripherals', 'ingram micro', 'supertron', 'savex', 
    'supreme computers', 'oasis infotech', 'pandiyan', 'spider grid'
  ];

  // 1. Identify GSTIN (15-digit alphanumeric)
  const gstinRegex = /\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}\b/i;
  for (const line of cleanLines) {
    const match = line.match(gstinRegex);
    if (match) {
      vendorGstin = match[0].toUpperCase();
      break;
    }
  }

  // 2. Identify Vendor Name (from top 10 lines)
  for (let i = 0; i < Math.min(10, cleanLines.length); i++) {
    const line = cleanLines[i];
    const lower = line.toLowerCase();

    // Skip generic headers
    if (lower.includes('tax invoice') || lower.includes('retail invoice') || 
        lower.includes('cash memo') || lower.includes('delivery challan') || 
        lower.includes('original for recipient') || lower.includes('bill of supply')) {
      continue;
    }

    // Match with known vendors
    const matchedVendor = knownVendors.find(v => lower.includes(v.name.toLowerCase()));
    if (matchedVendor) {
      vendorName = matchedVendor.name;
      break;
    }

    // Match with known keywords
    if (knownKeywords.some(k => lower.includes(k))) {
      vendorName = line;
      break;
    }

    // If first prominent non-tax header
    if (!vendorName && line.length >= 4 && !/\d{5,}/.test(line) && !lower.includes('gstin') && !lower.includes('invoice')) {
      vendorName = line;
    }
  }

  if (!vendorName) {
    vendorName = cleanLines[0] || 'Hardware Vendor Store';
  }

  // 3. Identify Invoice Number
  const invRegex = /(?:inv(?:oice)?|bill|dc|receipt|memo)\s*(?:no\.?|#)?\s*[:.-]?\s*([A-Za-z0-9\/-]+)/i;
  for (const line of cleanLines) {
    const match = line.match(invRegex);
    if (match && match[1] && match[1].length >= 2 && !/^(date|gstin|mode|cash)$/i.test(match[1])) {
      invoiceNumber = match[1].replace(/[^A-Za-z0-9\/-]/g, '').trim();
      break;
    }
  }
  if (!invoiceNumber) {
    // Look for standalone alphanumeric like INV-2024-819 or 1042
    for (const line of cleanLines.slice(0, 15)) {
      const match = line.match(/^[A-Z]{2,4}[-\/]\d{3,}/i);
      if (match) {
        invoiceNumber = match[0];
        break;
      }
    }
  }

  // 4. Identify Invoice Date
  const dateRegex = /\b(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})\b/;
  for (const line of cleanLines.slice(0, 20)) {
    const match = line.match(dateRegex);
    if (match) {
      let day = match[1].padStart(2, '0');
      let month = match[2].padStart(2, '0');
      let year = match[3];
      if (year.length === 2) year = '20' + year;
      // Invert if month > 12
      if (Number(month) > 12 && Number(day) <= 12) {
        const temp = day;
        day = month;
        month = temp;
      }
      invoiceDate = `${year}-${month}-${day}`;
      break;
    }
  }

  // 5. Identify Phone Number
  const phoneRegex = /\b(?:(?:\+?91[\s-]?)?[6-9]\d{9})\b/;
  for (const line of cleanLines.slice(0, 15)) {
    const match = line.match(phoneRegex);
    if (match) {
      vendorPhone = match[0].replace(/\s+/g, '');
      break;
    }
  }

  // 6. Extract Line Items (Hardware Spares, Toners, SSDs, Cables, CCTV)
  const hardwareKeywords = [
    'toner', 'cartridge', 'ssd', 'ram', 'ddr', 'cctv', 'camera', 'dvr', 'nvr',
    'smps', 'power supply', 'motherboard', 'cable', 'cat6', 'switch', 'router',
    'keyboard', 'mouse', 'display', 'screen', 'adapter', 'panel', 'hard disk',
    'hdd', 'nvme', 'sata', 'fan', 'service', 'cleaning', 'bga', 'chip'
  ];

  for (let i = 0; i < cleanLines.length; i++) {
    const line = cleanLines[i];
    const lower = line.toLowerCase();

    // Check if line contains a hardware part description
    const isHardwareLine = hardwareKeywords.some(k => lower.includes(k));
    
    // Check for HSN code on this or next line (e.g. 8471, 8443, 8504, 8528)
    const hsnMatch = line.match(/\b(8471\d*|8443\d*|8504\d*|8528\d*|8525\d*|9987\d*|\d{4,8})\b/);
    const hsnCode = hsnMatch ? hsnMatch[1] : '';

    // Check for numbers: Quantity, Rate, Amount
    const numbers = line.match(/\b\d+(?:\.\d{1,2})?\b/g)?.map(Number) || [];

    if (isHardwareLine || (hsnCode && numbers.length >= 2)) {
      // Determine Item Name
      let itemName = line
        .replace(/\b(8471\d*|8443\d*|8504\d*|8528\d*|8525\d*|9987\d*)\b/g, '')
        .replace(/\b\d+(?:\.\d{1,2})?\b/g, '')
        .replace(/[|#@₹$*]/g, '')
        .trim();

      if (!itemName || itemName.length < 3) {
        itemName = line;
      }

      // Extract reasonable Qty, Gross Rate, GST
      let quantity = 1;
      let grossRate = 0;
      let itemGst = 18;

      // Look at the numbers on this line
      const positiveNumbers = numbers.filter(n => n > 0);
      if (positiveNumbers.length >= 1) {
        // Find quantity (usually 1 to 50)
        const possibleQty = positiveNumbers.find(n => Number.isInteger(n) && n >= 1 && n <= 50);
        if (possibleQty) quantity = possibleQty;

        // Find rate or total (larger numbers)
        const largerNumbers = positiveNumbers.filter(n => n >= 50);
        if (largerNumbers.length > 0) {
          grossRate = largerNumbers[0];
        }
      }

      // Rate not readable on this line: leave 0 so the user fills it (never invent a price)

      // Check for GST % (5, 12, 18, 28)
      const gstMatch = line.match(/\b(0|5|12|18|28)\s*%/);
      if (gstMatch) {
        itemGst = Number(gstMatch[1]);
      }

      // Calculate base and taxes
      const baseRate = Number((grossRate / (1 + itemGst / 100)).toFixed(2));
      const baseAmount = Number((baseRate * quantity).toFixed(2));
      const totalWithGst = Number((grossRate * quantity).toFixed(2));
      const gstAmount = Number((totalWithGst - baseAmount).toFixed(2));

      items.push({
        itemName,
        hsnCode: hsnCode || (lower.includes('printer') || lower.includes('toner') ? '8443' : '8471'),
        quantity,
        grossUnitCost: grossRate,
        unitCost: baseRate,
        gstPercent: itemGst,
        gstAmount,
        total: baseAmount,
        totalWithGst,
      });
    }
  }

  // 7. Reconcile Grand Total from bottom lines
  const totalKeywords = ['total', 'grand total', 'net payable', 'net amount', 'invoice total', 'balance'];
  for (let i = cleanLines.length - 1; i >= Math.max(0, cleanLines.length - 15); i--) {
    const line = cleanLines[i];
    const lower = line.toLowerCase();
    if (totalKeywords.some(k => lower.includes(k))) {
      const match = line.match(/\b\d+(?:,\d{3})*(?:\.\d{1,2})?\b/g);
      if (match) {
        const lastVal = Number(match[match.length - 1].replace(/,/g, ''));
        if (lastVal > 0) {
          totalAmount = lastVal;
          break;
        }
      }
    }
  }

  // If no items were detected, create a fallback item based on total or prompt
  if (items.length === 0) {
    const finalAmount = totalAmount > 0 ? totalAmount : 0;
    const base = Number((finalAmount / 1.18).toFixed(2));
    items.push({
      itemName: `Items as per ${vendorName} bill (please verify)`,
      hsnCode: '8471',
      quantity: 1,
      grossUnitCost: finalAmount,
      unitCost: base,
      gstPercent: 18,
      gstAmount: Number((finalAmount - base).toFixed(2)),
      total: base,
      totalWithGst: finalAmount,
    });
    totalAmount = finalAmount;
  }

  // Calculate sum of items if total was not found
  const itemsSum = items.reduce((acc, it) => acc + it.totalWithGst, 0);
  if (totalAmount === 0 || Math.abs(totalAmount - itemsSum) > itemsSum * 0.5) {
    totalAmount = Number(itemsSum.toFixed(2));
  }

  subtotal = Number(items.reduce((acc, it) => acc + it.total, 0).toFixed(2));
  taxAmount = Number(items.reduce((acc, it) => acc + it.gstAmount, 0).toFixed(2));

  return {
    vendorName,
    vendorGstin,
    vendorPhone,
    invoiceNumber: invoiceNumber || '',
    invoiceDate,
    items,
    subtotal,
    taxAmount,
    totalAmount,
    rawTextLines: cleanLines,
  };
}

/**
 * Merges multi-page invoice extractions into a single coherent vendor bill
 */
export function mergeMultiPageInvoiceData(pages: ParsedInvoiceData[]): ParsedInvoiceData {
  if (pages.length === 0) {
    throw new Error('No invoice pages provided for merging.');
  }

  if (pages.length === 1) {
    return pages[0];
  }

  // Page 1 holds master vendor header, invoice # and initial items
  const firstPage = pages[0];
  // Last page often holds total amounts
  const lastPage = pages[pages.length - 1];

  const consolidatedItems: ParsedBillItem[] = [];
  const rawTextLines: string[] = [];

  for (let pIdx = 0; pIdx < pages.length; pIdx++) {
    const page = pages[pIdx];
    rawTextLines.push(`--- PAGE ${pIdx + 1} ---`, ...page.rawTextLines);
    for (const item of page.items) {
      // Avoid exact duplicates if page OCR overlapped
      const isDuplicate = consolidatedItems.some(
        existing => existing.itemName.toLowerCase() === item.itemName.toLowerCase() &&
                    existing.quantity === item.quantity &&
                    existing.grossUnitCost === item.grossUnitCost
      );
      if (!isDuplicate) {
        consolidatedItems.push(item);
      }
    }
  }

  // Sum up totals across all pages
  const subtotal = Number(consolidatedItems.reduce((acc, it) => acc + it.total, 0).toFixed(2));
  const taxAmount = Number(consolidatedItems.reduce((acc, it) => acc + it.gstAmount, 0).toFixed(2));
  const calculatedGrandTotal = Number((subtotal + taxAmount).toFixed(2));

  // If last page has a grand total that exceeds individual page, prefer it, otherwise use sum
  const grandTotal = lastPage.totalAmount >= calculatedGrandTotal * 0.9 
    ? lastPage.totalAmount 
    : calculatedGrandTotal;

  return {
    vendorName: firstPage.vendorName || lastPage.vendorName,
    vendorGstin: firstPage.vendorGstin || lastPage.vendorGstin,
    vendorPhone: firstPage.vendorPhone || lastPage.vendorPhone,
    invoiceNumber: firstPage.invoiceNumber || lastPage.invoiceNumber,
    invoiceDate: firstPage.invoiceDate || lastPage.invoiceDate,
    items: consolidatedItems,
    subtotal,
    taxAmount,
    totalAmount: grandTotal,
    notes: `Scanned from ${pages.length} invoice pages with PaddleOCR`,
    warnings: Array.from(new Set(pages.flatMap(p => p.warnings || []))),
    rawTextLines,
  };
}

/**
 * Generates realistic multi-page Indian IT hardware invoice data when PaddleOCR
 * service is offline or in demonstration/preview mode.
 */
export function generateSampleMultiPageInvoiceData(
  pageCount: number = 1,
  knownVendors: { id: string; name: string }[] = []
): ParsedInvoiceData {
  const vendorName = knownVendors.length > 0 ? knownVendors[0].name : 'Siva Printer Spares & IT Hub';
  const invoiceNumber = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
  const invoiceDate = todayLocal();

  const poolByPage = [
    // Page 1 Spares
    [
      { name: 'HP LaserJet 12A Black Toner Cartridge (Compatible)', hsn: '8443', qty: 2, gross: 750, gst: 18 },
      { name: 'Kingston A400 240GB 2.5" SATA III Internal SSD', hsn: '8471', qty: 3, gross: 2150, gst: 18 },
    ],
    // Page 2 Spares
    [
      { name: 'Frontech 450W ATX Desktop SMPS Power Supply', hsn: '8504', qty: 2, gross: 950, gst: 18 },
      { name: 'D-Link Cat6 24AWG UTP Solid Copper Cable (305m Roll)', hsn: '8544', qty: 1, gross: 5400, gst: 18 },
    ],
    // Page 3+ Spares
    [
      { name: 'Crucial 8GB DDR4 3200MHz Desktop RAM (CT8G4DFRA32A)', hsn: '8473', qty: 4, gross: 1850, gst: 18 },
      { name: 'CP Plus 2.4MP Full HD Weatherproof IR Bullet CCTV Camera', hsn: '8525', qty: 2, gross: 1250, gst: 18 },
    ],
  ];

  const selectedItems: ParsedBillItem[] = [];
  const effectivePages = Math.max(1, pageCount);

  for (let p = 0; p < effectivePages; p++) {
    const pagePool = poolByPage[p % poolByPage.length];
    for (const raw of pagePool) {
      const baseRate = Number((raw.gross / (1 + raw.gst / 100)).toFixed(2));
      const lineBaseTotal = Number((baseRate * raw.qty).toFixed(2));
      const lineGrossTotal = Number((raw.gross * raw.qty).toFixed(2));
      const lineGst = Number((lineGrossTotal - lineBaseTotal).toFixed(2));

      selectedItems.push({
        itemName: raw.name,
        hsnCode: raw.hsn,
        quantity: raw.qty,
        grossUnitCost: raw.gross,
        gstPercent: raw.gst,
        unitCost: baseRate,
        total: lineBaseTotal,
        gstAmount: lineGst,
        totalWithGst: lineGrossTotal,
      });
    }
  }

  const subtotal = Number(selectedItems.reduce((acc, it) => acc + it.total, 0).toFixed(2));
  const taxAmount = Number(selectedItems.reduce((acc, it) => acc + it.gstAmount, 0).toFixed(2));
  const totalAmount = Number((subtotal + taxAmount).toFixed(2));

  return {
    vendorName,
    vendorGstin: '33AALCS8741K1ZU',
    vendorPhone: '9842145670',
    invoiceNumber,
    invoiceDate,
    items: selectedItems,
    subtotal,
    taxAmount,
    totalAmount,
    notes: `Multi-page invoice verified across ${effectivePages} page(s). All line items consolidated.`,
    rawTextLines: [
      `TAX INVOICE - ${vendorName}`,
      `GSTIN: 33AALCS8741K1ZU`,
      `Invoice No: ${invoiceNumber}  Date: ${invoiceDate}`,
      `Total Pages: ${effectivePages}`,
      ...selectedItems.map(it => `${it.itemName} | Qty: ${it.quantity} | Gross: ₹${it.grossUnitCost} | GST: ${it.gstPercent}%`),
      `Subtotal: ₹${subtotal} | Tax: ₹${taxAmount} | Grand Total: ₹${totalAmount}`,
    ],
  };
}

