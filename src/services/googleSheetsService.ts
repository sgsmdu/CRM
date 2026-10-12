import { Customer, JobCard, InventoryItem, VendorBill, Invoice, CashFlowEntry } from '../types';

export interface SgsSyncData {
  customers: Customer[];
  jobCards: JobCard[];
  inventory: InventoryItem[];
  vendorBills: VendorBill[];
  invoices: Invoice[];
  cashFlow: CashFlowEntry[];
}

const SPREADSHEET_STORAGE_KEY = 'sgs_connected_spreadsheet_id';
const SPREADSHEET_URL_KEY = 'sgs_connected_spreadsheet_url';

export const getSavedSpreadsheetId = (): string | null => {
  return localStorage.getItem(SPREADSHEET_STORAGE_KEY);
};

export const getSavedSpreadsheetUrl = (): string | null => {
  return localStorage.getItem(SPREADSHEET_URL_KEY);
};

export const setSavedSpreadsheet = (id: string, url: string) => {
  localStorage.setItem(SPREADSHEET_STORAGE_KEY, id);
  localStorage.setItem(SPREADSHEET_URL_KEY, url);
};

export const clearSavedSpreadsheet = () => {
  localStorage.removeItem(SPREADSHEET_STORAGE_KEY);
  localStorage.removeItem(SPREADSHEET_URL_KEY);
};

/**
 * Creates a brand new Google Spreadsheet with all required tabs for SGS
 */
export const createSgsSpreadsheet = async (accessToken: string): Promise<{ id: string; url: string }> => {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: `Spider Grid Solutions - Operations & CRM (${new Date().toLocaleDateString('en-IN')})`,
      },
      sheets: [
        { properties: { title: 'Golden Customers', gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: 'Job Cards', gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: 'Hardware Inventory', gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: 'Vendor Purchases', gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: 'Invoices & Billing', gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: 'Cash Flow Ledger', gridProperties: { frozenRowCount: 1 } } },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Failed to create Google Spreadsheet');
  }

  const result = await response.json();
  const id = result.spreadsheetId;
  const url = `https://docs.google.com/spreadsheets/d/${id}/edit`;
  setSavedSpreadsheet(id, url);
  return { id, url };
};

/**
 * Syncs all current SGS databases to the linked Google Spreadsheet
 */
export const syncAllDataToGoogleSheet = async (
  spreadsheetId: string,
  accessToken: string,
  data: SgsSyncData
): Promise<void> => {
  // 1. Prepare Golden Customers Data
  const customerHeaders = [
    'Sl No', 'Customer Name', 'Area / Location', 'Phone Number', 'Category / About', 'Lead Source (Reference)', 'Occupation / Details', 'Phone Book Sync', 'Created At'
  ];
  const customerRows = data.customers.map(c => [
    c.slNo,
    c.name,
    c.area || '',
    c.phone || '',
    c.about || 'General',
    c.reference || 'Direct',
    c.details || '',
    c.phoneBook,
    c.createdAt || ''
  ]);

  // 2. Prepare Job Cards Data
  const jobHeaders = [
    'Job ID', 'Customer Name', 'Phone', 'Area', 'Type', 'Category', 'Device Brand & Model', 'Serial Number', 'Reported Issue', 'Status', 'Intake Date', 'Est Delivery', 'Est Cost (₹)', 'Final Cost (₹)', 'Technician Diagnosis'
  ];
  const jobRows = data.jobCards.map(j => [
    j.jobId,
    j.customerName,
    j.customerPhone || '',
    j.customerArea || '',
    j.type,
    j.category,
    j.deviceBrand,
    j.serialNumber || '',
    j.issueDescription,
    j.status,
    j.intakeDate,
    j.estimatedDelivery || '',
    j.estimatedCost,
    j.finalCost,
    j.technicianNotes || ''
  ]);

  // 3. Prepare Hardware Inventory Data
  const invHeaders = [
    'Part Name & Model', 'Category', 'SKU', 'Storage Location', 'Current Stock Qty', 'Min Reorder Alert', 'Unit Cost (₹)', 'Selling Price (₹)'
  ];
  const invRows = data.inventory.map(i => [
    i.name,
    i.category,
    i.sku || '',
    i.location || '',
    i.currentStock,
    i.minStockAlert,
    i.unitCost,
    i.unitPrice
  ]);

  // 4. Prepare Vendor Bills Data
  const billHeaders = [
    'Vendor / Store Name', 'Invoice Number', 'Invoice Date', 'Items Description', 'Total Amount (₹)', 'Paid Amount (₹)', 'Payment Status', 'Notes'
  ];
  const billRows = data.vendorBills.map(b => [
    b.vendorName,
    b.invoiceNumber,
    b.invoiceDate,
    b.items?.map(it => `${it.quantity}x ${it.itemName}`).join(', ') || '',
    b.totalAmount,
    b.paidAmount,
    b.paymentStatus,
    b.notes || ''
  ]);

  // 5. Prepare Invoices & Billing Data
  const invoiceHeaders = [
    'Doc Number', 'Document Type', 'Customer Name', 'Phone', 'Date', 'Grand Total (₹)', 'Paid Amount (₹)', 'Payment Status', 'Payment Mode', 'Notes'
  ];
  const invoiceRows = data.invoices.map(inv => [
    inv.invoiceNumber,
    inv.type,
    inv.customerName,
    inv.customerPhone || '',
    inv.date,
    inv.grandTotal,
    inv.paidAmount,
    inv.paymentStatus,
    inv.paymentMode,
    inv.notes || ''
  ]);

  // 6. Prepare Cash Flow Ledger Data
  const cashFlowHeaders = [
    'Date', 'Type (INCOME/EXPENSE)', 'Category', 'Description', 'Amount (₹)', 'Payment Mode', 'Reference ID'
  ];
  const cashFlowRows = data.cashFlow.map(cf => [
    cf.date,
    cf.type.toUpperCase(),
    cf.category,
    cf.description,
    cf.amount,
    cf.paymentMode,
    cf.referenceId || ''
  ]);

  // Execute batchUpdate on Values endpoint
  const valueUpdateData = [
    { range: "'Golden Customers'!A1:I", values: [customerHeaders, ...customerRows] },
    { range: "'Job Cards'!A1:O", values: [jobHeaders, ...jobRows] },
    { range: "'Hardware Inventory'!A1:H", values: [invHeaders, ...invRows] },
    { range: "'Vendor Purchases'!A1:H", values: [billHeaders, ...billRows] },
    { range: "'Invoices & Billing'!A1:J", values: [invoiceHeaders, ...invoiceRows] },
    { range: "'Cash Flow Ledger'!A1:G", values: [cashFlowHeaders, ...cashFlowRows] },
  ];

  const batchResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: valueUpdateData,
      }),
    }
  );

  if (!batchResponse.ok) {
    const err = await batchResponse.json();
    throw new Error(err.error?.message || 'Failed to update Google Sheet values');
  }
};
