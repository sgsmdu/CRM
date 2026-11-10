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
  activityType?: string;
  previousStatus?: string;
  newStatus?: string;
  userId?: string;
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
  address?: string;
  email?: string;
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
  advancePaid?: number;
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
  assignedEmployeeId?: string; // ID of allocated staff member
  assignedTechnician?: string; // Name of assigned technician
  assignedDate?: string;
  assignedBy?: string;
  expectedStartDate?: string;
  expectedCompletionDate?: string;
  estimatedDurationHours?: number;
  workOrderPriority?: number; // 1 = High/First, 2 = Medium, 3 = Normal
  workOrderNotes?: string; // Special instruction for technician
  priority?: 'P1' | 'P2' | 'P3' | 'P4'; // P1: Emergency, P2: High, P3: Normal, P4: Low
  priorityOrder?: number;
  priorityChangeReason?: string;
  priorityChangedBy?: string;
  priorityChangedAt?: string;
  reassignReason?: string;
  completionNotes?: {
    workPerformed?: string;
    diagnosis?: string;
    solutionProvided?: string;
    sparePartsUsed?: string;
    remainingIssues?: string;
    customerConfirmation?: string;
    followUpRequired?: string;
    completedBy?: string;
    completedAt?: string;
    completionPhotos?: string[];
  };
  closureDetails?: {
    closedAt?: string;
    closedBy?: string;
    finalNotes?: string;
    verifiedBy?: string;
    verifiedAt?: string;
    reopenedAt?: string;
    reopenedReason?: string;
    reopenedBy?: string;
  };
  cctvDetails?: {
    cameraCount?: number;
    dvrDetails?: string;
    siteLocation?: string;
    nvrDetails?: string;
  };
  warrantyAMC?: {
    amcContract?: boolean;
    amcExpiry?: string;
    warrantyMonths?: number;
  };
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
  billImage?: string; // Primary preview / Page 1 photo
  billImages?: string[]; // Multiple invoice pages (Page 1, Page 2, Page 3, etc.)
  ocrEngine?: 'paddleocr' | 'gemini' | 'manual';
  items: VendorBillItem[];
  subtotal?: number;
  taxAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  isInterState?: boolean;
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
  referenceBillId?: string; // Vendor bill that brought this stock in
  referenceInvoiceId?: string; // Customer invoice that took this stock out
}

export interface InvoiceItem {
  description: string;
  unit?: string; // UQC for GST (NOS, PCS, MTR, SET...)
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
  discount?: number; // Line item discount in ₹
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
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
  customerGstin?: string; // Buyer GSTIN (B2B) - makes the bill a B2B supply in GSTR-1
  placeOfSupply?: string; // 2-digit GST state code (33 = Tamil Nadu)
  dueDate?: string; // Payment due date (YYYY-MM-DD); drives overdue / aging
  appliedStock?: { itemId: string; qty: number }[]; // exact stock this bill took out (used to put it back)
  jobCardId?: string;
  date: string;
  items: InvoiceItem[];
  subtotal: number;
  gstPercent: number; // 0, 5, 12, 18 (0 for Pandiyan Computers)
  taxAmount: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  isInterState?: boolean;
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
  paymentPendingMessageTemplate?: string;
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
  // PaddleOCR API & Scanner Configuration
  paddleOcrApiUrl?: string; // e.g. "http://localhost:8080/ocr" or "http://127.0.0.1:8000/ocr"
  paddleOcrToken?: string; // Optional bearer/auth token
  defaultOcrEngine?: 'paddleocr' | 'gemini'; // Default engine: paddleocr vs gemini
  // Manual Quotation Module Settings
  quotationBackgroundUrl?: string; // A4 Letterhead background image with SGS logo/header/footer
  quotationHeaderImageUrl?: string; // Custom header banner image for Manual Quotation
  quotationFooterImageUrl?: string; // Custom footer banner image for Manual Quotation
  quotationTerms?: string; // Default terms for manual quotations
}

export interface Employee {
  id: string;
  name: string;
  phone: string;
  role: string; // e.g. "Senior Chip-Level Technician", "CCTV & Network Specialist"
  department?: string; // e.g. "Technical Service", "CCTV Field Team", "Office Administration"
  skills?: string[]; // ['CCTV', 'Computer', 'Laptop', 'Networking', 'Software', 'Printer']
  salaryType?: 'monthly' | 'daily';
  dailySalary: number; // Daily wage e.g. 750
  monthlySalary?: number; // e.g. 19500
  weeklyOff?: string; // e.g. "Sunday"
  joiningDate: string;
  status: 'active' | 'inactive';
  upiId?: string;
  emergencyContact?: string;
  notes?: string;
}

export interface SalaryAdvance {
  id: string;
  employeeId: string;
  date: string;
  amount: number;
  reason: string;
  approvedBy: string;
  repaidAmount: number;
  status: 'active' | 'repaid';
  repayments?: { date: string; amount: number; note?: string }[];
}

export type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'leave' | 'holiday' | 'weekly_off';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  overtimeHours?: number;
  notes?: string;
}

export interface SalaryInstallment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  notes?: string;
  paidBy?: string;
}

export interface SalaryPayment {
  id: string;
  employeeId: string;
  month: string; // YYYY-MM
  baseSalary: number;
  daysPresent: number;
  halfDays: number;
  absentDays: number;
  calculatedSalary: number;
  advanceDeduction: number;
  bonus: number;
  netPaid: number;
  paymentDate: string;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  status: 'paid' | 'partial' | 'pending';
  notes?: string;
  payments?: SalaryInstallment[];
}

export interface WorkAllocation {
  id: string;
  employeeId: string;
  jobCardId: string;
  allocatedDate: string;
  priorityOrder: number; // 1, 2, 3
  notes?: string; // Work order instructions
  sharedViaWhatsAppAt?: string;
  status: 'assigned' | 'in_progress' | 'completed';
}

// ============================================================================
// DEDICATED MANUAL QUOTATION MODULE (Independent of Stock & Billing)
// ============================================================================

export interface QuotationCategory {
  id: string;
  name: string;
  isDeleted?: boolean;
  createdAt: string;
}

export interface QuotationSubcategory {
  id: string;
  categoryId: string;
  name: string;
  isDeleted?: boolean;
  createdAt: string;
}

export interface QuotationProduct {
  id: string;
  categoryId: string;
  subcategoryId: string;
  name: string;
  brand: string; // custom-entry only, allow any brand name
  modelNumber?: string;
  description?: string;
  warranty?: string;
  unit: 'Nos'; // Nos only
  latestQuotationPrice: number; // Manual entry, remembered across quotations
  isDeleted?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface QuotationItem {
  id: string;
  productId?: string;
  description: string;
  brand?: string;
  modelNumber?: string;
  warranty?: string;
  quantity: number;
  unit: string; // default "Nos"
  unitPrice: number; // unit price
  itemTotal: number; // Quantity * Unit Price
  isService?: boolean; // for manual service rows like Installation
}

export interface QuotationModelInternalCharges {
  installation: number;
  helperFees: number;
  commission: number;
  margin: number;
  petrolVisit: number;
  customerReduction: number; // Optional manual negotiation deduction
}

export interface QuotationProposalModel {
  name: string; // e.g. "Model 1" or custom title e.g. "4CH DVR + 2MP Camera Package"
  subtitle?: string;
  items: QuotationItem[];
  internalCharges: QuotationModelInternalCharges;
  totalItemRate: number; // Sum of all item totals (Quantity * Unit Price)
  totalDisplayAmount: number; // Total Item Rate + Margin + Internal Charges
  finalModelTotal: number; // Total Display Amount - Customer Reduction
}

export type QuotationStatus = 'Draft' | 'Sent' | 'Pending Decision' | 'Confirmed' | 'Rejected';
export type CustomerModelSelection = 'Not Decided' | 'Model 1' | 'Model 2';

export interface QuotationVersionSnapshot {
  version: number;
  updatedAt: string;
  updatedBy?: string;
  notes?: string;
  model1: QuotationProposalModel;
  model2: QuotationProposalModel;
  termsAndConditions: string;
  validityDays: number;
  validUntil: string;
  paymentDetails?: string;
  advanceAmount?: number;
  customerNotes?: string;
  installationNotes?: string;
}

export interface ManualQuotation {
  id: string;
  quotationNumber: string; // Format: SGS/QTN/YYYY/001
  date: string; // YYYY-MM-DD local
  validityDays: number; // default: 7 days
  validUntil: string; // date + 7 days
  
  // Originating reference
  jobCardId?: string; // Reference to originating Job Card if launched from Job Card
  
  // Customer details (reusing existing Customer database)
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerEmail?: string;
  
  // Two Proposal Models in One Quotation
  model1: QuotationProposalModel;
  model2: QuotationProposalModel;
  
  // Status and Confirmation
  status: QuotationStatus;
  selectedModel: CustomerModelSelection;
  confirmationDate?: string;
  
  // Terms & Notes
  termsAndConditions: string;
  paymentDetails?: string;
  advanceAmount?: number;
  customerNotes?: string;
  installationNotes?: string;
  
  // Custom Header & Footer Image Banners
  headerImageUrl?: string;
  footerImageUrl?: string;
  backgroundUrl?: string;

  // Version History
  version: number; // 1, 2, ...
  history: QuotationVersionSnapshot[];
  
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// ROLE-BASED ACCESS CONTROL (RBAC) - FIRESTORE
// ==========================================

export type UserRole = 'admin' | 'user';

export interface AllowedUser {
  id?: string;
  email: string;
  role: UserRole;
  displayName?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// PRICE CODE CALCULATOR (SECRET MAPPING)
// ==========================================

export type DigitChar = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

export type PriceCodeMapping = Record<DigitChar, string>;

export interface PriceCodeMappingVersion {
  version: number;
  mapping: PriceCodeMapping;
  createdAt: string; // ISO date string
  changedBy?: string;
  notes?: string;
}
