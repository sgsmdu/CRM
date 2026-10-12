import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || process.env.APP_PORT || process.env.DEFAULT_APP_PORT) || 3000;

// Body parser with expanded limit for base64 camera image uploads
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Initialize official @google/genai SDK
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// API Route: Scan vendor purchase invoice via Gemini 3.8 Flash
app.post('/api/scan-bill', async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: 'Image data is required' });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
      return;
    }

    // Clean up base64 prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
    const cleanMimeType = mimeType || 'image/jpeg';

    const imagePart = {
      inlineData: {
        data: cleanBase64,
        mimeType: cleanMimeType,
      },
    };

    const promptText = `You are an expert Indian IT hardware & electronics accounts auditor for Spider Grid Solutions.
Analyze this vendor bill/purchase invoice or delivery challan. Extract all key invoice details accurately.
If specific items or names are unclear or handwritten, do your best guess based on IT/computer hardware context (RAM, SSD, CCTV, SMPS, motherboard, toner, display, cables, services).
Return clean JSON with:
- vendorName: Name of the vendor/supplier store or company (e.g. Siva Printer Spares, National Infotech, Redington, CompuServe, etc.)
- invoiceNumber: Bill number, invoice number, or DC number (string)
- invoiceDate: Date in YYYY-MM-DD format if identifiable, or original text
- items: List of items purchased with:
  * itemName (string)
  * hsnCode (string, e.g. 8471, 8443, etc. if available)
  * quantity (number)
  * unitCost (base price before tax, or if prices include tax, note accordingly)
  * grossUnitCost (unit price with GST if listed on bill)
  * gstPercent (item-specific GST rate percentage e.g. 18, 12, 5, 28, 0 if listed)
  * total (line total amount)
- subtotal: Subtotal before tax if available (number)
- taxAmount: GST / Tax amount if listed (number)
- totalAmount: Grand total payable (number)
- notes: Any notes, payment terms, or warranty mentioned on the bill`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          imagePart,
          { text: promptText },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vendorName: { type: Type.STRING },
            invoiceNumber: { type: Type.STRING },
            invoiceDate: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  itemName: { type: Type.STRING },
                  hsnCode: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unitCost: { type: Type.NUMBER },
                  grossUnitCost: { type: Type.NUMBER },
                  gstPercent: { type: Type.NUMBER },
                  total: { type: Type.NUMBER },
                },
                required: ['itemName', 'quantity', 'total'],
              },
            },
            subtotal: { type: Type.NUMBER },
            taxAmount: { type: Type.NUMBER },
            totalAmount: { type: Type.NUMBER },
            notes: { type: Type.STRING },
          },
          required: ['vendorName', 'totalAmount'],
        },
      },
    });

    const rawText = response.text || '{}';
    const parsedData = JSON.parse(rawText);

    res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Error scanning vendor bill:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process vendor bill with Gemini AI',
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Spider Grid Solutions Ops Engine' });
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    // Serve production static assets
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Development mode with Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Spider Grid Solutions server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
