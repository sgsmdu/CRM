import { Customer, JobCard, InventoryItem, VendorBill, StockTransaction, Invoice, CashFlowEntry, AdminSettings, LeadSource, Vendor, Employee, AttendanceRecord, SalaryPayment, WorkAllocation, SalaryAdvance } from '../types';
import { 
  DEFAULT_SGS_LOGO_DATA_URL, 
  OFFICIAL_SGS_LOGO_URL,
  DEFAULT_SGS_STAMP_DATA_URL, 
  DEFAULT_PANDIYAN_LOGO_DATA_URL, 
  DEFAULT_PANDIYAN_STAMP_DATA_URL,
  DEFAULT_SGS_QUOTATION_LETTERHEAD_BG
} from '../utils/brandAssets';
import { DEFAULT_QUOTATION_TERMS } from '../utils/quotationSeedData';

// Production start: dummy/sample CRM entity seed arrays cleared so GitHub & live Firestore data stay clean.
export const SEED_CUSTOMERS: Customer[] = [];
export const SEED_JOB_CARDS: JobCard[] = [];
export const SEED_INVENTORY: InventoryItem[] = [];
export const SEED_VENDOR_BILLS: VendorBill[] = [];
export const SEED_STOCK_TRANSACTIONS: StockTransaction[] = [];
export const SEED_INVOICES: Invoice[] = [];
export const SEED_CASH_FLOW: CashFlowEntry[] = [];

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  workshopName: 'Spider Grid Solutions',
  workshopGstin: '33AABCS1429F1ZT',
  workshopPhone: '+91 9176795665',
  workshopEmail: 'spidergridsolutions@gmail.com',
  workshopAddress: 'Madurai, Tamil Nadu - 625001',
  workshopUpiId: 'spidergridsolutions@okaxis',
  defaultHsnCode: '998713',
  defaultGstPercent: 0,
  invoicePrefix: 'SGS-INV-',
  googleReviewUrl: 'https://g.page/r/spidergridsolutions/review',
  technicians: [
    'Senior Engineer - Vivek',
    'Hardware Tech - Karthik',
    'Network Specialist - Manoj',
    'CCTV Technician - Suresh'
  ],
  welcomeMessageTemplate: `*SPIDER GRID SOLUTIONS (SGS)*
*Service & Sales Department - Madurai*

Dear {customerName},
Thank you for bringing your device to Spider Grid Solutions! Your job card has been officially registered.

*Intake Details:*
• Job ID: *{jobId}*
• Device Category: *{category}*
• Brand / Model: *{deviceBrand}*
• Reported Issue: {reportedIssue}
• Intake Date: {intakeDate}
• Est. Delivery: {estimatedDelivery}
• Est. Amount: ₹{estimatedCost}

Our expert technician is attending to your equipment. We will keep you updated every step of the way!

Warm regards,
*Spider Grid Solutions*
Madurai, Tamil Nadu
Contact: +91 9176795665 | spidergridsolutions@gmail.com`,
  statusMessageTemplate: `*SPIDER GRID SOLUTIONS (SGS)*
*Service Status Notification*

Hello {customerName},
Here is the latest progress update for your equipment:

• Job ID: *{jobId}*
• Equipment: *{deviceBrand}*
• Current Status: *{status}*
• Notes: {technicianNotes}
• Total Amount: *₹{amount}*

Thank you for choosing Spider Grid Solutions - Madurai.
Contact: +91 9176795665`,
  reviewMessageTemplate: `*SPIDER GRID SOLUTIONS (SGS)*
*Job Completed & Thank You!* 🌟

Dear {customerName},
Great news! The service for your *{deviceBrand}* (Job ID: *{jobId}*) has been completed successfully and quality verified!

Your satisfaction is our top priority. If you were happy with our fast service and technician support, could you kindly take 15 seconds to leave us a 5-Star review on Google? It means the world to our workshop! ⭐⭐⭐⭐⭐

👉 *Click here to leave a Google Review:*
{googleReviewUrl}

Thank you once again for trusting Spider Grid Solutions!
Madurai | Phone: +91 9176795665`,
  paymentPendingMessageTemplate: `*SPIDER GRID SOLUTIONS (SGS)*
*Payment Pending Reminder* 🔔

Dear {customerName},
Greetings from Spider Grid Solutions! This is a gentle reminder regarding the pending balance for your service / equipment.

*Bill & Service Details:*
• Job / Bill Ref: *{jobId}*
• Equipment / Item: *{deviceBrand}*
• Total Bill Amount: *₹{amount}*
• Paid Amount: *₹{paidAmount}*
• *Pending Balance Due: ₹{pendingBalance}*

Kindly arrange payment at your earliest convenience.

*Payment Options:*
• Google Pay / PhonePe / UPI: *{workshopUpiId}*
• Cash at Workshop Counter

Thank you for choosing Spider Grid Solutions!
*Spider Grid Solutions*
Madurai | Contact: {workshopPhone}`,
  quickServices: [
    { name: 'Computer / Laptop General Service & Dust Cleaning', hsn: '998713', rate: 500, cost: 50, category: 'laptop' },
    { name: 'OS Reinstallation & Driver Configuration', hsn: '998713', rate: 600, cost: 0, category: 'laptop' },
    { name: 'Chip-Level Motherboard Diagnostic & Repair', hsn: '998713', rate: 1800, cost: 400, category: 'laptop' },
    { name: 'Crucial 512GB NVMe SSD Upgrade + OS Migration', hsn: '8471', rate: 3200, cost: 2350, category: 'laptop' },
    { name: 'Desktop SMPS 450W Power Replacement', hsn: '8504', rate: 1100, cost: 550, category: 'desktop' },
    { name: 'CCTV Camera BNC Re-crimping & Channel Tuning', hsn: '998713', rate: 750, cost: 150, category: 'cctv' },
    { name: 'Laser Printer Head Cleaning & Toner Refill', hsn: '8443', rate: 850, cost: 250, category: 'printer' },
    { name: 'Network Cat6 Structured Cabling & Punch Down (per node)', hsn: '998713', rate: 450, cost: 120, category: 'network' },
  ],
  // SGS Billing Themes & Letterhead Configuration
  billingTheme: 'modern_navy',
  workshopLogoUrl: OFFICIAL_SGS_LOGO_URL,
  rubberStampUrl: DEFAULT_SGS_STAMP_DATA_URL,
  bankName: 'HDFC Bank - Madurai Main Branch',
  bankAccountNumber: '50200045812934',
  bankIfsc: 'HDFC0000214',
  bankBranch: 'West Veli Street, Madurai',
  termsAndConditions: '1. Spares & hardware parts carry 1-year manufacturer warranty. Physical damage, liquid spill, and electrical surges void warranty.\n2. Service warranty is 30 days from date of delivery.\n3. Deliveries made against full payment. Cheques subject to realization.\n4. Subject to Madurai Jurisdiction.',
  authorizedSignatoryTitle: 'For SPIDER GRID SOLUTIONS (SGS) - Authorized Signatory',
  // Pandiyan Computers (Non-GST Firm)
  pandiyanFirmName: 'Pandiyan Computers',
  pandiyanPhone: '+91 9176795665',
  pandiyanAddress: 'Shop No. 14, Simmakkal Main Road, Madurai - 625001',
  pandiyanEmail: 'pandiyancomputers.mdu@gmail.com',
  pandiyanLogoUrl: DEFAULT_PANDIYAN_LOGO_DATA_URL,
  pandiyanRubberStampUrl: DEFAULT_PANDIYAN_STAMP_DATA_URL,
  pandiyanBillingTheme: 'warm_amber',
  pandiyanTerms: 'Non-GST Estimate Voucher. Valid for 7 days. Spares subject to market availability.',
  // PaddleOCR API Configuration
  paddleOcrApiUrl: 'http://localhost:8080/ocr',
  paddleOcrToken: '',
  defaultOcrEngine: 'paddleocr',
  // Quotation Letterhead & Terms
  quotationBackgroundUrl: DEFAULT_SGS_QUOTATION_LETTERHEAD_BG,
  quotationTerms: DEFAULT_QUOTATION_TERMS,
};

export const SEED_LEAD_SOURCES: LeadSource[] = [];
export const SEED_VENDORS: Vendor[] = [];
export const SEED_EMPLOYEES: Employee[] = [];
export const SEED_ATTENDANCE: AttendanceRecord[] = [];
export const SEED_SALARIES: SalaryPayment[] = [];
export const SEED_WORK_ALLOCATIONS: WorkAllocation[] = [];
export const SEED_SALARY_ADVANCES: SalaryAdvance[] = [];
