export type ServiceSalesType = 'service' | 'sales';

export type DeviceCategory = 'laptop' | 'desktop' | 'cctv' | 'printer' | 'network' | 'general';

export type JobStatus = 
  | 'received' 
  | 'in_process' 
  | 'quotation_pending' 
  | 'waiting_parts' 
  | 'customer_approval'
  | 'customer_discussion'
  | 'work_completed'
  | 'billed'
  | 'pickup_ready'
  | 'delivered'
  | 'completed'
  | 'hold'
  | 'other';

export interface JobTimelineEvent {
  id: string;
  stage: 
    | 'in_process' 
    | 'quote_given' 
    | 'customer_approval' 
    | 'customer_discussion' 
    | 'work_completed' 
    | 'billed' 
    | 'pickup_note' 
    | 'call_review' 
    | 'call_close' 
    | 'hold' 
    | 'other';
  stageLabel: string;
  timestamp: string; // ISO string or readable format
  notes?: string;
  quoteAmount?: number; // for quote given
  customStageName?: string; // for 'other'
  performedBy?: string;
}

export type PaymentMode = 'cash' | 'upi' | 'bank_transfer' | 'card' | 'cheque';

export type LeadCategory = 
  | 'network' 
  | 'school_friend' 
  | 'college_friend' 
  | 'relative' 
  | 'existing_customer' 
  | 'business_associate' 
  | 'social_media' 
  | 'google_maps' 
  | 'walk_in' 
  | 'other';

export interface LeadSource {
  id: string;
  name: string; // Referrer person's name or channel (e.g. Vivek Real Wire, Sathesh Kumar, Karthik)
  category: LeadCategory;
  phone?: string;
  email?: string;
  area?: string;
  notes?: string;
  companyOrOccupation?: string;
  syncedWithGoogleContacts?: boolean;
  // Meeting Planner & Commission
  lastMeetingDate?: string; // e.g. "2026-09-15"
  nextMeetingPlan?: string; // e.g. "Plan to meet at Simmakkal for Q4 CCTV leads & gift handover"
  meetingNotes?: string;
  commissionRatePercent?: number; // e.g. 5 or 10 (%)
  commissionPaid?: number; // Total ₹ paid out so far
  giftDetails?: string; // e.g. "Diwali Sweet Box & SGS Powerbank gift"
  giftStatus?: 'planned' | 'handed_over' | 'none';
  createdAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  phone?: string;
  gstin?: string;
  address?: string;
  category?: string; // Spares & Chips, CCTV & Security, Printers & Refill, Desktop / Laptops, Consumables
  upiId?: string;
  bankDetails?: string;
  notes?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  slNo: number;
  name: string;
  area: string;
  phone: string;
  about: string;
  reference: string;
  leadSourceId?: string;
  details: string;
  phoneBook: 'Yes' | 'No';
  mapUrl?: string; // Google Maps Location Link
  syncedToGoogleContacts?: boolean;
  // Per-client manual referral commission
  referralCommissionAmount?: number; // Manual commission amount in ₹
  referralCommissionStatus?: 'paid' | 'pending';
  referralCommissionNotes?: string;
  referralCommissionPaidDate?: string;
  createdAt: string;
}

export interface JobCard {
  id: string;
  jobId: string; // e.g. SGS-2026-001
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerArea: string;
  type: ServiceSalesType;
  category: DeviceCategory;
  deviceBrand: string; // e.g. "Lenovo ThinkPad E14", "Hikvision 4-CH DVR"
  serialNumber?: string;
  issueDescription: string;
  status: JobStatus;
  intakeDate: string;
  estimatedDelivery?: string;
  devicePhotos: string[]; // Base64 data URLs
  estimatedCost: number;
  finalCost: number;
  technicianNotes?: string;
  partsUsed?: { itemName: string; qty: number; cost: number }[];
  updatedAt: string;
  // Phone call tracking
  callCompleted?: boolean;
  lastCalledAt?: string;
  // Enhanced Timeline & Lifecycle
  timeline?: JobTimelineEvent[];
  holdReason?: string;
  otherStatusText?: string;
  invoiceId?: string; // Linked invoice once billed
}

export interface VendorBillItem {
  itemName: string;
  hsnCode?: string;
  quantity: number;
  unitCost: number; // Base unit cost (without GST)
  total: number; // Base total (quantity * unitCost)
  matchedInventoryId?: string;
  syncMode?: 'merge_existing' | 'create_separate';
  grossUnitCost?: number; // Unit cost with GST (Rate with GST)
  gstPercent?: number; // GST % for this specific item (e.g. 0, 5, 12, 18, 28)
  gstAmount?: number; // GST tax amount for this item
  totalWithGst?: number; // Total amount inclusive of GST
}

export interface VendorBill {
  id: string;
  vendorId?: string;
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  billImage?: string; // Base64 preview or uploaded document photo
  items: VendorBillItem[];
  subtotal?: number;
  taxAmount?: number;
  discount?: number; // Discount in ₹
  roundOff?: number; // Manual rounding off in ₹
  totalAmount: number;
  paymentStatus: 'paid' | 'pending' | 'partial';
  paidAmount: number;
  paymentMode?: PaymentMode;
  paymentReference?: string; // UPI UTR, Transaction ID, Cheque No
  paymentDate?: string;
  notes?: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: DeviceCategory;
  currentStock: number;
  minStockAlert: number;
  unitCost: number;
  unitPrice: number;
  sku?: string;
  location?: string;
  hsnCode?: string;
  // Vendor Bill Traceability
  vendorBillId?: string; // Linked originating Vendor Bill
  vendorName?: string; // Name of supplying vendor
  vendorInvoiceNumber?: string; // Vendor Bill / Invoice #
  vendorBillDate?: string; // Date of vendor purchase
  notes?: string;
  updatedAt: string;
}

export interface StockTransaction {
  id: string;
  itemId: string;
  itemName: string;
  type: 'in' | 'out';
  quantity: number;
  date: string;
  reason: string;
  jobCardId?: string;
  referenceBillId?: string;
}

export interface InvoiceItem {
  description: string;
  hsnCode?: string; // HSN / SAC code (e.g. 998713, 8471, etc.)
  quantity: number;
  rate: number; // Base rate (without GST / net selling rate)
  amount: number; // Base amount (quantity * rate)
  purchaseCost?: number; // Cost price per unit for profit calculation
  isService?: boolean; // If true, full profit
  inventoryItemId?: string; // If selected from stock
  grossRate?: number; // Rate with GST (Rate inclusive of GST)
  gstPercent?: number; // GST % for this specific item (e.g. 0, 5, 12, 18, 28)
  gstAmount?: number; // Calculated GST amount for this line item
  totalWithGst?: number; // Total amount inclusive of GST
}

export type BillingFirm = 'sgs' | 'pandiyan';
export type BillingTheme = 'modern_navy' | 'classic_emerald' | 'sleek_monochrome' | 'royal_purple';
export type PandiyanBillingTheme = 'warm_amber' | 'crimson_ruby' | 'teak_bronze' | 'indigo_slate';

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. SGS-INV-1042 or PC-EST-501
  type: 'invoice' | 'quotation';
  billingFirm?: BillingFirm; // SGS (With GST, deducts stock) or Pandiyan Computers (Without GST, manual items, no stock deduction)
  theme?: BillingTheme;
  pandiyanTheme?: PandiyanBillingTheme;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerArea?: string;
  jobCardId?: string;
  date: string;
  items: InvoiceItem[];
  subtotal: number;
  gstPercent: number; // 0, 5, 12, 18 (0 for Pandiyan Computers)
  taxAmount: number;
  discount?: number; // Discount in ₹
  roundOff?: number; // Manual rounding off adjustment in ₹
  grandTotal: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid' | 'cancelled';
  paymentMode: PaymentMode;
  paymentReference?: string; // UPI Ref / UTR / Transaction No / Cheque No
  paidAmount: number;
  notes?: string;
  // Profit & Loss Tracking
  purchaseCostTotal?: number; // Total purchase cost of spare parts
  manualExtraCost?: number; // Additional manual input expenses (travel, outside repair, etc.)
  profitAmount?: number; // Calculated profit: (subtotal - purchaseCostTotal - manualExtraCost)
  status?: 'active' | 'cancelled';
  cancelledReason?: string;
  attachedBillImage?: string; // Scanned invoice / receipt photo
}

export interface CashFlowEntry {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string; // "Service Charge", "Hardware Sale", "Vendor Spares", "Rent & Bills", "Tools & Consumables"
  description: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceId?: string; // Invoice ID or Vendor Bill ID
  referenceNumber?: string; // UPI UTR or Transaction Ref
}

export interface QuickServicePreset {
  name: string;
  hsn: string;
  rate: number;
  cost: number;
  category: DeviceCategory;
}

export interface AdminSettings {
  workshopName: string;
  workshopGstin: string;
  workshopPhone: string;
  workshopEmail: string;
  workshopAddress: string;
  workshopUpiId: string;
  defaultHsnCode: string;
  defaultGstPercent: number;
  invoicePrefix: string;
  googleReviewUrl: string;
  technicians: string[];
  welcomeMessageTemplate: string;
  statusMessageTemplate: string;
  reviewMessageTemplate: string;
  quickServices: QuickServicePreset[];
  // SGS Billing Customization & Themes
  billingTheme: BillingTheme;
  workshopLogoUrl?: string; // SGS Logo
  rubberStampUrl?: string; // SGS Rubber Stamp Seal
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankBranch?: string;
  termsAndConditions?: string;
  authorizedSignatoryTitle?: string;
  // Pandiyan Computers Configuration (Non-GST Firm)
  pandiyanFirmName?: string;
  pandiyanPhone?: string;
  pandiyanAddress?: string;
  pandiyanEmail?: string;
  pandiyanLogoUrl?: string; // Pandiyan Computers Logo
  pandiyanRubberStampUrl?: string; // Pandiyan Computers Rubber Stamp Seal
  pandiyanBillingTheme?: PandiyanBillingTheme; // Pandiyan Theme
  pandiyanTerms?: string;
}
