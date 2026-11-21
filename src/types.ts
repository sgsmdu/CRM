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
  | 'payment_pending'
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
    | 'payment_pending'
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

export type PaymentMode = 'cash' | 'upi' | 'bank_transfer' | 'card' | 'cheque' | 'other';

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
  deviceModel?: string; // Optional separate model number / series
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
  linkedVendorBillIds?: string[]; // Linked stock / vendor purchase invoices
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
  description?: string; // Detailed item description (separate from itemName)
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
  isGstBill?: boolean; // true = GST Bill (updates Stock & Parts Inventory), false = Without GST Bill (ledger & cash flow only, no stock)
  stockSynced?: boolean; // Whether this bill actually pushed quantities to workshop inventory
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
  linkedJobCardIds?: string[]; // Job cards linked to this stock invoice
  notes?: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: DeviceCategory;
  currentStock: number;
  minStockAlert: number;
  unitCost: number; // Base unit cost WITHOUT GST (for SGS accounting & ITC)
  gstPercent?: number; // Purchase GST % from GST vendor bill (0 for non-GST)
  unitCostWithGst?: number; // GST-inclusive purchase cost (Base + GST) for Pandiyan Computers Spare Cost
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

export interface BankAccount {
  id: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string; // Stored securely; displayed masked (e.g. •••• 7890)
  accountType: 'savings' | 'current' | 'overdraft' | 'other';
  branch?: string;
  ifscCode?: string;
  openingBalance: number;
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

export type MoneyFlowCategoryType = 'income' | 'expense' | 'both';
export type PaymentAccountType = 'cash' | 'bank';
export type PaymentModeChoice = 'cash' | 'bank' | 'upi' | 'other';

export interface MoneyFlowCategory {
  id: string;
  name: string;
  level: 1 | 2 | 3; // 1 = Category, 2 = Subcategory, 3 = 2nd Subcategory
  parentId: string | null;
  type: MoneyFlowCategoryType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface InvoicePaymentRecord {
  id: string;
  paymentReference: string;
  uniqueSourceKey?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  jobCardId?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  amount: number;
  date: string;
  paymentMode: PaymentMode;
  paymentModeChoice?: PaymentModeChoice;
  accountType: PaymentAccountType;
  bankAccountId?: string;
  bankAccountName?: string;
  transactionRef?: string;
  notes?: string;
  isAdvance?: boolean;
  allocationId?: string;
  cashFlowEntryId?: string;
  isReversed?: boolean;
  reversedAt?: string;
  reversalReason?: string;
  createdBy?: string;
  createdAt: string;
}

export interface CustomerPaymentAllocationItem {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
}

export interface CustomerPaymentAllocation {
  id: string;
  uniqueSourceKey?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  jobCardId?: string;
  totalAmount: number;
  allocatedTotal: number;
  unallocatedAmount: number;
  date: string;
  paymentMode: PaymentMode;
  accountType: PaymentAccountType;
  bankAccountId?: string;
  bankAccountName?: string;
  transactionRef?: string;
  notes?: string;
  allocations: CustomerPaymentAllocationItem[];
  cashFlowEntryId?: string;
  isReversed?: boolean;
  createdBy?: string;
  createdAt: string;
}

export interface VendorPaymentRecord {
  id: string;
  uniqueSourceKey?: string;
  vendorBillId: string;
  vendorBillNumber?: string;
  vendorId?: string;
  vendorName: string;
  amount: number;
  date: string;
  paymentMode: PaymentMode;
  accountType: PaymentAccountType;
  bankAccountId?: string;
  bankAccountName?: string;
  transactionRef?: string;
  notes?: string;
  cashFlowEntryId?: string;
  isReversed?: boolean;
  createdBy?: string;
  createdAt: string;
}

export type CashFlowAccountingNature =
  | 'operating'
  | 'transfer'
  | 'loan_principal'
  | 'loan_interest'
  | 'loan_disbursement'
  | 'savings_transfer'
  | 'investment_transfer'
  | 'investment_return';

export interface CashFlowEntry {
  id: string;
  date: string;
  type: 'income' | 'expense' | 'transfer';
  accountingNature?: CashFlowAccountingNature;
  category: string; // Display Category name (Level 1) for backward compatibility
  categoryId?: string;
  categoryName?: string;
  subcategory?: string;
  subcategoryId?: string;
  secondSubcategory?: string;
  secondSubcategoryId?: string;
  description: string;
  amount: number;
  paymentMode: PaymentMode;
  paymentModeChoice?: PaymentModeChoice;
  referenceId?: string; // Invoice ID or Vendor Bill ID or Job Card ID
  referenceNumber?: string; // UPI UTR, Cheque No, Transaction Ref
  // Money Flow & Accounts Management
  accountType?: 'cash' | 'bank'; // 'cash' or 'bank'
  bankAccountId?: string; // Bank account ID if accountType === 'bank'
  toAccountType?: 'cash' | 'bank'; // Destination account for transfers
  toBankAccountId?: string; // Destination bank account for transfers
  isTransfer?: boolean; // True for internal transfers (excluded from P&L / Income / Expense metrics)
  transferType?: 'cash_to_bank' | 'bank_to_cash' | 'bank_to_bank' | 'to_savings' | 'from_savings' | 'to_investment' | 'from_investment';
  payeeOrCustomer?: string; // Contact or company name
  customerId?: string;
  vendorId?: string;
  jobCardId?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  vendorBillId?: string;
  loanId?: string;
  loanPaymentId?: string;
  recurringExpenseId?: string;
  recurringDueId?: string;
  savingsAccountId?: string;
  investmentId?: string;
  sourceModule?: 'billing' | 'job_card' | 'customer' | 'vendor' | 'salary' | 'money_flow' | 'transfer' | 'loan' | 'recurring' | 'savings' | 'investment' | 'other';
  sourceDocId?: string;
  paymentRecordId?: string;
  uniqueSourceKey?: string;
  isEstimated?: boolean;
  attachmentUrl?: string; // Scanned bill, receipt, or payment voucher image
  notes?: string;
  isReversed?: boolean;
  reversedAt?: string;
  reversalReason?: string;
  createdBy?: string;
  createdAt?: string;
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
  // Money Flow & Accounts
  openingCashBalance?: number; // Starting cash in hand balance (₹)
  defaultReminderDays?: number; // Configurable upcoming payment reminder days
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
  salaryEffectiveDate?: string;
  salaryPaymentDay?: number; // Day of month (1-31) when salary is due
  preferredPaymentMode?: PaymentMode;
  preferredAccountType?: PaymentAccountType;
  preferredBankAccountId?: string;
  salaryStatus?: 'active' | 'paused';
  salaryNotes?: string;
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
export type CustomerModelSelection = 'Not Decided' | 'Model 1' | 'Model 2' | 'Model 3' | 'Model 4' | 'Model 5';

export interface QuotationVersionSnapshot {
  version: number;
  updatedAt: string;
  updatedBy?: string;
  notes?: string;
  title?: string;
  model1: QuotationProposalModel;
  model2?: QuotationProposalModel;
  model3?: QuotationProposalModel;
  model4?: QuotationProposalModel;
  model5?: QuotationProposalModel;
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
  title?: string; // Manual quotation title
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
  
  // Multi-Proposal Models (Model 1, 2, 3, 4, 5)
  activeModelsCount?: number; // 1 to 5
  model1: QuotationProposalModel;
  model2?: QuotationProposalModel;
  model3?: QuotationProposalModel;
  model4?: QuotationProposalModel;
  model5?: QuotationProposalModel;
  
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

// ============================================================================
// ADVANCED FINANCIAL MANAGEMENT ADD-ON
// Loans, Gold Loan, EMI, Recurring Expenses, Savings & Investments
// ============================================================================

export type LoanType =
  | 'personal'
  | 'business'
  | 'gold'
  | 'vehicle'
  | 'home'
  | 'bank'
  | 'private_finance'
  | 'other';

export type InterestType = 'reducing' | 'flat' | 'manual';
export type LoanStatus = 'active' | 'completed' | 'closed';
export type GoldInterestFrequency = 'monthly' | 'quarterly' | 'bullet' | 'custom';

export interface LoanAccount {
  id: string;
  loanName: string;
  loanType: LoanType;
  lenderName: string;
  maskedAccountNumber?: string;
  startDate: string; // YYYY-MM-DD
  originalAmount: number;
  outstandingPrincipal: number;
  interestRate: number; // % per annum
  interestType: InterestType;
  tenureMonths: number;
  emiAmount: number;
  emiDueDay: number; // Day of month (1-31)
  firstEmiDate?: string;
  lastEmiDate?: string;
  processingCharges: number;
  linkedBankAccountId?: string;
  notes?: string;
  status: LoanStatus;
  totalPrincipalRepaid: number;
  totalInterestPaid: number;
  totalChargesPaid: number;
  // Gold Loan specific fields
  pledgeReferenceNumber?: string;
  goldWeightGrams?: number;
  goldPurity?: string;
  pledgedDate?: string;
  interestPaymentFrequency?: GoldInterestFrequency;
  interestDueDate?: string;
  renewalMaturityDate?: string;
  interestPending?: number;
  closedDate?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export type LoanPaymentKind = 'emi' | 'interest_only' | 'principal_prepayment' | 'closure';

export interface LoanPayment {
  id: string;
  loanId: string;
  loanName: string;
  loanType: LoanType;
  emiPeriod?: string; // YYYY-MM when tied to an EMI schedule period
  dueDate?: string;
  paymentDate: string; // YYYY-MM-DD
  paymentKind: LoanPaymentKind;
  totalPaid: number;
  principalComponent: number;
  interestComponent: number;
  chargesComponent: number;
  isEstimatedBreakdown?: boolean;
  paymentMode: PaymentMode;
  paymentModeChoice?: PaymentModeChoice;
  accountType: PaymentAccountType;
  bankAccountId?: string;
  bankAccountName?: string;
  transactionRef?: string;
  notes?: string;
  principalCashFlowId?: string;
  interestCashFlowId?: string;
  uniqueSourceKey?: string;
  isReversed?: boolean;
  createdAt: string;
  createdBy?: string;
}

export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';

export interface RecurringExpense {
  id: string;
  name: string;
  categoryId?: string;
  categoryName: string;
  subcategory?: string;
  subcategoryId?: string;
  secondSubcategory?: string;
  secondSubcategoryId?: string;
  amount: number;
  frequency: RecurringFrequency;
  customIntervalDays?: number;
  startDate: string; // YYYY-MM-DD
  dueDayOfMonth?: number; // 1-31
  nextDueDate: string; // YYYY-MM-DD
  repeatUntil?: string;
  preferredPaymentMode: PaymentMode;
  preferredModeChoice?: PaymentModeChoice;
  preferredAccountType: PaymentAccountType;
  preferredBankAccountId?: string;
  reminderDaysBefore: number;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export type RecurringDueStatus = 'pending' | 'paid' | 'skipped';

export interface RecurringDueEntry {
  id: string;
  recurringExpenseId: string;
  expenseName: string;
  duePeriod: string; // YYYY-MM or YYYY-MM-DD for weekly/custom
  dueDate: string; // YYYY-MM-DD
  amountDue: number;
  categoryId?: string;
  categoryName: string;
  subcategory?: string;
  subcategoryId?: string;
  secondSubcategory?: string;
  secondSubcategoryId?: string;
  status: RecurringDueStatus;
  paidAmount?: number;
  paidDate?: string;
  paymentMode?: PaymentMode;
  paymentModeChoice?: PaymentModeChoice;
  accountType?: PaymentAccountType;
  bankAccountId?: string;
  transactionRef?: string;
  cashFlowEntryId?: string;
  notes?: string;
  uniqueSourceKey: string;
  createdAt: string;
  updatedAt?: string;
}

export type SavingsAccountType =
  | 'bank_savings'
  | 'emergency_fund'
  | 'business_reserve'
  | 'personal_savings'
  | 'other';

export interface SavingsAccount {
  id: string;
  name: string;
  savingsType: SavingsAccountType;
  institution?: string;
  linkedBankAccountId?: string; // If linked to an existing operating BankAccount, avoid double counting in net operating total
  openingBalance: number;
  currentBalance: number;
  targetAmount?: number;
  startDate: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SavingsTransaction {
  id: string;
  savingsAccountId: string;
  savingsAccountName: string;
  type: 'deposit' | 'withdraw' | 'transfer_in' | 'transfer_out';
  amount: number;
  date: string;
  accountType: PaymentAccountType;
  bankAccountId?: string;
  paymentMode: PaymentMode;
  paymentModeChoice?: PaymentModeChoice;
  transactionRef?: string;
  notes?: string;
  cashFlowEntryId?: string;
  uniqueSourceKey?: string;
  isReversed?: boolean;
  createdAt: string;
  createdBy?: string;
}

export type InvestmentType = 'fd' | 'rd' | 'mutual_fund' | 'stocks' | 'gold' | 'other';
export type InvestmentStatus = 'active' | 'matured' | 'closed';

export interface InvestmentAccount {
  id: string;
  name: string;
  investmentType: InvestmentType;
  institution?: string;
  investmentDate: string;
  investedAmount: number;
  currentValue: number; // Manually updated only — never auto-fetched
  lastValuedAt: string;
  maturityDate?: string;
  expectedReturnPercent?: number;
  linkedBankAccountId?: string;
  notes?: string;
  status: InvestmentStatus;
  realizedProfitLoss: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentTransaction {
  id: string;
  investmentId: string;
  investmentName: string;
  type: 'initial' | 'add_capital' | 'withdrawal' | 'valuation_update';
  amount: number; // Capital invested or principal reduced
  receivedAmount?: number; // Cash/Bank received on withdrawal
  realizedGainLoss?: number;
  previousValue?: number;
  newValue?: number;
  date: string;
  accountType?: PaymentAccountType;
  bankAccountId?: string;
  paymentMode?: PaymentMode;
  paymentModeChoice?: PaymentModeChoice;
  transactionRef?: string;
  notes?: string;
  cashFlowEntryId?: string;
  uniqueSourceKey?: string;
  isReversed?: boolean;
  createdAt: string;
  createdBy?: string;
}

export type FinancialAlertSeverity =
  | 'overdue'
  | 'due_today'
  | 'due_tomorrow'
  | 'due_3_days'
  | 'due_7_days'
  | 'upcoming'
  | 'paid';

export interface FinancialAlertItem {
  id: string;
  sourceType: 'loan_emi' | 'gold_interest' | 'gold_renewal' | 'recurring' | 'salary';
  sourceId: string;
  duePeriod?: string;
  title: string;
  subtitle: string;
  dueDate: string;
  amount: number;
  severity: FinancialAlertSeverity;
  daysRemaining: number;
  isPaid: boolean;
  actionTab: 'loans' | 'emi_calendar' | 'recurring' | 'salary';
}

