// Runs the PaddleOCR call + bill parsing in the BROWSER, so the hosted site
// (crm.sgsmdu.in, no Node server) can use the PaddleOCR running on this PC.
import {
  extractTextFromPaddleResponse,
  parsePaddleOcrText,
  mergeMultiPageInvoiceData,
} from '../utils/paddleOcrParser';
import type { ParsedInvoiceData } from '../utils/paddleOcrParser';
import { extractOcrPages, parseInvoiceLayout } from '../utils/paddleLayoutParser';
import type { TableColumn } from '../utils/paddleLayoutParser';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function callOcr(apiUrl: string, token: string | undefined, b64: string, state: { reachable: boolean }) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const isPaddleX = apiUrl.includes('/ocr');
  const payloads = isPaddleX
    ? [{ file: b64, fileType: 1, visualize: false }, { images: [b64] }]
    : [{ images: [b64] }, { file: b64, fileType: 1, visualize: false }];

  for (const p of payloads) {
    try {
      const resp = await fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify(p), signal: AbortSignal.timeout(120000) });
      state.reachable = true;
      if (!resp.ok) continue;
      const j = await resp.json().catch(() => null);
      const lines = extractTextFromPaddleResponse(j);
      if (lines.length > 0) return { json: j, lines };
    } catch {
      /* offline / CORS blocked -> try next payload */
    }
  }
  return null;
}

/** Same contract as POST /api/scan-bill-paddleocr, but returns a Response built in the browser. */
export async function scanBillViaLocalPaddle(args: {
  pages: Array<{ imageBase64: string; mimeType?: string }>;
  paddleOcrApiUrl: string;
  paddleOcrToken?: string;
  knownVendors: Array<{ id: string; name: string }>;
}): Promise<Response> {
  const state = { reachable: false };
  const parsed: ParsedInvoiceData[] = [];
  let prevColumns: TableColumn[] | null = null;

  for (let i = 0; i < args.pages.length; i++) {
    const raw = (args.pages[i].imageBase64 || '').trim();
    const b64 = raw.replace(/^data:[^,]*;base64,/i, '').replace(/\s/g, '');
    if (b64.length < 100) continue;
    const out = await callOcr(args.paddleOcrApiUrl, args.paddleOcrToken, b64, state);
    if (!out) continue;

    let pageData: ParsedInvoiceData | null = null;
    try {
      for (const boxes of extractOcrPages(out.json)) {
        const layout = parseInvoiceLayout(boxes, args.knownVendors, prevColumns);
        if (layout) { prevColumns = layout.columns; pageData = layout.data; break; }
      }
    } catch (e) {
      console.error('layout parser failed, using line parser', e);
    }
    if (!pageData) {
      pageData = parsePaddleOcrText(out.lines, args.knownVendors);
      pageData.warnings = [...(pageData.warnings || []), `Page ${i + 1}: item table not detected - please check item rows`];
    }
    parsed.push(pageData);
  }

  if (parsed.length > 0) {
    return json(200, { success: true, engine: 'paddleocr', isOfflineFallback: false, pageCount: parsed.length, data: mergeMultiPageInvoiceData(parsed) });
  }
  if (state.reachable) {
    return json(422, { success: false, error: 'PaddleOCR ran but could not read any text. Try a clearer, straighter photo.' });
  }
  return json(503, {
    success: false,
    error: `Cannot reach PaddleOCR at ${args.paddleOcrApiUrl}. Start paddlex (port 8090) and cors_proxy.py (port 8080) on this PC, and click "Allow" if Chrome asks for local network access.`,
  });
}

/** Connection test used by the "Test" button. */
export async function testLocalPaddle(apiUrl: string, token?: string): Promise<{ success: boolean; message: string }> {
  const tiny = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const t0 = Date.now();
  try {
    const r = await fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify({ file: tiny, fileType: 1, visualize: false }), signal: AbortSignal.timeout(30000) });
    return { success: r.status !== 502, message: r.status === 502 ? 'Proxy is up but PaddleOCR (port 8090) is not running' : `Connected (HTTP ${r.status}, ${Date.now() - t0}ms)` };
  } catch {
    return { success: false, message: 'Not reachable: proxy not running, or Chrome blocked local network access (click Allow).' };
  }
}
