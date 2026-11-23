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

// CPU OCR with orientation/unwarping models can be slow, so allow up to 10 minutes.
const OCR_TIMEOUT_MS = 10 * 60 * 1000;

async function callOcr(
  apiUrl: string,
  token: string | undefined,
  b64: string,
  state: { reachable: boolean },
  notes: string[],
  pageNo: number,
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const isPaddleX = apiUrl.includes('/ocr');
  // PaddleX basic serving needs "file"; the other shape is only for custom servers.
  const payloads = isPaddleX
    ? [{ file: b64, fileType: 1, visualize: false }]
    : [{ images: [b64] }, { file: b64, fileType: 1, visualize: false }];

  for (const p of payloads) {
    const t0 = Date.now();
    const secs = () => ((Date.now() - t0) / 1000).toFixed(0);
    try {
      const resp = await fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify(p), signal: AbortSignal.timeout(OCR_TIMEOUT_MS) });
      state.reachable = true;
      if (!resp.ok) {
        notes.push(`page ${pageNo}: HTTP ${resp.status} after ${secs()}s ${(await resp.text()).slice(0, 160)}`);
        continue; // wrong payload shape -> try the next one
      }
      const j = await resp.json().catch(() => null);
      const lines = extractTextFromPaddleResponse(j);
      if (lines.length > 0) return { json: j, lines };
      notes.push(`page ${pageNo}: HTTP 200 after ${secs()}s but 0 text lines`);
      return null; // the server answered; resending the same image will not help
    } catch (e: any) {
      notes.push(`page ${pageNo}: request failed after ${secs()}s (${e?.name || 'error'}: ${e?.message || ''})`);
      return null; // timeout / blocked / offline: do not retry with another payload
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
  const notes: string[] = [];
  const parsed: ParsedInvoiceData[] = [];
  let prevColumns: TableColumn[] | null = null;

  for (let i = 0; i < args.pages.length; i++) {
    const raw = (args.pages[i].imageBase64 || '').trim();
    const b64 = raw.replace(/^data:[^,]*;base64,/i, '').replace(/\s/g, '');
    if (b64.length < 100) continue;
    const out = await callOcr(args.paddleOcrApiUrl, args.paddleOcrToken, b64, state, notes, i + 1);
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
  console.warn('[local PaddleOCR]', notes);
  const details = notes.length ? ` Details: ${notes.join(' | ')}` : '';
  if (state.reachable) {
    return json(422, { success: false, error: `PaddleOCR did not return any text.${details}` });
  }
  return json(503, {
    success: false,
    error: `Cannot reach PaddleOCR at ${args.paddleOcrApiUrl}. Start paddlex (port 8090) and cors_proxy.py (port 8080) on this PC, and click "Allow" if Chrome asks for local network access.${details}`,
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
