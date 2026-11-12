import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Customer, 
  JobCard, 
  VendorBill, 
  InventoryItem, 
  StockTransaction, 
  Invoice, 
  CashFlowEntry, 
  JobStatus,
  PaymentMode,
  AdminSettings,
  LeadSource,
  Vendor,
  Employee,
  AttendanceRecord,
  AttendanceStatus,
  SalaryPayment,
  WorkAllocation,
  SalaryAdvance,
  QuotationCategory,
  QuotationSubcategory,
  QuotationProduct,
  QuotationItem,
  QuotationProposalModel,
  QuotationStatus,
  CustomerModelSelection,
  QuotationVersionSnapshot,
  ManualQuotation,
  DigitChar,
  PriceCodeMapping,
  PriceCodeMappingVersion,
  AllowedUser,
  UserRole
} from '../types';
import { 
  fetchUserRoleFromFirestore, 
  subscribeToAllowedUsers, 
  saveAllowedUserToFirestore, 
  deleteAllowedUserFromFirestore,
  subscribeToJobCards,
  saveJobCardToFirestore,
  deleteJobCardFromFirestore,
  subscribeToInvoices,
  saveInvoiceToFirestore,
  deleteInvoiceFromFirestore,
  signOutUser,
  checkGoogleRedirectResult,
  auth,
  DEFAULT_ADMIN_EMAIL 
} from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useCollectionSync, useDocSync } from '../services/firestoreSync';
import * as Acc from '../utils/accounting';
import { 
  DEFAULT_PRICE_CODE_MAPPING, 
  INITIAL_PRICE_CODE_VERSION, 
  validateMapping 
} from '../utils/priceCode';
import { 
  SEED_CUSTOMERS, 
  SEED_JOB_CARDS, 
  SEED_INVENTORY, 
  SEED_VENDOR_BILLS, 
  SEED_STOCK_TRANSACTIONS, 
  SEED_INVOICES, 
  SEED_CASH_FLOW,
  DEFAULT_ADMIN_SETTINGS,
  SEED_LEAD_SOURCES,
  SEED_VENDORS,
  SEED_EMPLOYEES,
  SEED_ATTENDANCE,
  SEED_SALARIES,
  SEED_WORK_ALLOCATIONS,
  SEED_SALARY_ADVANCES
} from '../data/seedData';
import {
  INITIAL_QUOTATION_BRANDS,
  INITIAL_QUOTATION_CATEGORIES,
  INITIAL_QUOTATION_SUBCATEGORIES,
  INITIAL_QUOTATION_PRODUCTS
} from '../utils/quotationSeedData';

interface SgsContextType {
  customers: Customer[];
  jobCards: JobCard[];
  vendorBills: VendorBill[];
  inventory: InventoryItem[];
  stockTransactions: StockTransaction[];
  invoices: Invoice[];
  cashFlow: CashFlowEntry[];
  adminSettings: AdminSettings;
  leadSources: LeadSource[];
  vendors: Vendor[];
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  salaryPayments: SalaryPayment[];
  workAllocations: WorkAllocation[];
  
  // Customer methods
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'slNo'>) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  syncCustomerToContacts: (customerId: string) => void;
  updateCustomerCommission: (customerId: string, amount: number, status?: 'paid' | 'pending', notes?: string) => void;

  // Lead Source methods
  addLeadSource: (lead: Omit<LeadSource, 'id' | 'createdAt'>) => LeadSource;
  updateLeadSource: (id: string, updates: Partial<LeadSource>) => void;
  deleteLeadSource: (id: string) => void;
  toggleLeadSyncedContacts: (id: string, synced?: boolean) => void;

  // Vendor Directory methods
  addVendor: (vendor: Omit<Vendor, 'id' | 'createdAt'>) => Vendor;
  updateVendor: (id: string, updates: Partial<Vendor>) => void;
  deleteVendor: (id: string) => void;

  // Contact vCard Sync Utilities
  generateVCard: (contact: {
    name: string;
    phone?: string;
    area?: string;
    notes?: string;
    mapUrl?: string;
    category?: string;
    company?: string;
  }) => string;
  downloadVCard: (filename: string, vcardContent: string) => void;
  
  // Job Card methods
  addJobCard: (job: Omit<JobCard, 'id' | 'jobId' | 'updatedAt'>) => JobCard;
  updateJobCardStatus: (id: string, status: JobStatus, notes?: string) => void;
  updateJobCard: (id: string, updates: Partial<JobCard>) => void;
  deleteJobCard: (id: string) => void;
  toggleCallCompleted: (id: string, completed?: boolean) => void;
  addJobTimelineEvent: (jobId: string, event: Omit<import('../types').JobTimelineEvent, 'id'>) => void;
  toggleLinkJobAndVendorBill: (jobId: string, vendorBillId: string) => void;
  
  // Vendor Bill methods
  addVendorBill: (bill: Omit<VendorBill, 'id' | 'createdAt'>, updateStock?: boolean) => VendorBill;
  updateVendorBillPayment: (
    id: string, 
    paidAmount: number, 
    paymentStatus: 'paid' | 'pending' | 'partial',
    paymentMode?: PaymentMode,
    paymentReference?: string
  ) => void;
  updateVendorBill: (id: string, updates: Partial<VendorBill>) => void;
  deleteVendorBill: (id: string) => void;
  
  // Inventory methods
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'updatedAt'>) => InventoryItem;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  linkInventoryToVendorBill: (inventoryId: string, vendorBillId: string) => void;
  recordStockMovement: (itemId: string, type: 'in' | 'out', qty: number, reason: string, jobCardId?: string) => void;
  
  // Invoices & Billing
  addInvoice: (invoice: Omit<Invoice, 'id'>) => Invoice;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  updateInvoicePayment: (
    id: string, 
    paidAmount: number, 
    status: 'paid' | 'partial' | 'unpaid', 
    mode: PaymentMode,
    paymentReference?: string
  ) => void;
  cancelInvoice: (id: string, reason?: string) => void;
  duplicateInvoice: (id: string) => Invoice;
  deleteInvoice: (id: string) => void;
  
  // Cash Flow & Expenses
  addCashFlowEntry: (entry: Omit<CashFlowEntry, 'id'>) => void;
  
  // Admin Settings
  updateAdminSettings: (updates: Partial<AdminSettings>) => void;
  resetAdminSettings: () => void;
  
  // Theme Mode
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;

  // System Tools
  clearAllInputData: () => void;
  resetToDefaultData: () => void;
  exportDataJson: () => string;
  importDataJson: (jsonData: string) => boolean;
  
  // Helper for WhatsApp
  getWhatsAppLinks: (job: JobCard) => {
    welcomeMessage: string;
    welcomeUrl: string;
    statusMessage: string;
    statusUrl: string;
    reviewMessage: string;
    reviewUrl: string;
    paymentPendingMessage: string;
    paymentPendingUrl: string;
  };

  // Employee & Staff Allocation methods
  addEmployee: (emp: Omit<Employee, 'id'>) => Employee;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  markAttendance: (employeeId: string, date: string, status: AttendanceStatus, notes?: string, checkInTime?: string) => void;
  updateAttendanceRecord: (employeeId: string, date: string, status: AttendanceStatus, notes?: string, checkInTime?: string, checkOutTime?: string, overtimeHours?: number) => void;
  recordSalaryPayment: (sal: Omit<SalaryPayment, 'id'>) => SalaryPayment;
  recordSalaryInstallment: (employeeId: string, month: string, installment: { amount: number; paymentDate: string; paymentMode: PaymentMode; referenceNumber?: string; notes?: string; paidBy?: string }, totalPayableContext?: number) => void;
  allocateWorkToEmployee: (allocation: Omit<WorkAllocation, 'id'>) => WorkAllocation;
  removeWorkAllocation: (id: string) => void;
  shareJobToEmployeeWhatsApp: (employeeId: string, jobCardId: string, workNotes?: string, priorityOrder?: number) => string;
  convertQuotationToInvoice: (quotationId: string) => Invoice;

  // Module 1 & 2 Job Lifecycle & Priority Enhancements
  updateJobPriority: (jobId: string, priority: 'P1' | 'P2' | 'P3' | 'P4', priorityOrder: number, reason?: string, changedBy?: string) => void;
  assignJobToEmployee: (jobId: string, employeeId: string, employeeName: string, instructions?: string, dueDate?: string, expectedDurationHours?: number, assignedBy?: string, reason?: string) => void;
  bulkAssignJobs: (jobIds: string[], employeeId: string, employeeName: string, instructions?: string) => void;
  submitWorkCompletion: (jobId: string, completionNotes: NonNullable<JobCard['completionNotes']>) => void;
  closeJobCard: (jobId: string, closedBy: string, finalNotes?: string) => { success: boolean; error?: string };
  reopenJobCard: (jobId: string, reason: string, reopenedBy: string) => void;

  // Module 3 Salary Advance Management
  salaryAdvances: SalaryAdvance[];
  addSalaryAdvance: (adv: Omit<SalaryAdvance, 'id' | 'repaidAmount' | 'status' | 'repayments'>) => SalaryAdvance;
  recordAdvanceRepayment: (advanceId: string, amount: number, note?: string) => void;

  // Dedicated Manual Quotation Module (Independent of Stock & Billing)
  quotations: ManualQuotation[];
  quotationCategories: QuotationCategory[];
  quotationSubcategories: QuotationSubcategory[];
  quotationProducts: QuotationProduct[];
  quotationBrands: string[];

  addManualQuotation: (q: Omit<ManualQuotation, 'id' | 'quotationNumber' | 'createdAt' | 'updatedAt' | 'version' | 'history'>) => ManualQuotation;
  updateManualQuotation: (id: string, updates: Partial<ManualQuotation>, note?: string) => void;
  deleteManualQuotation: (id: string) => void;
  duplicateManualQuotation: (id: string) => ManualQuotation;
  updateQuotationStatus: (id: string, status: QuotationStatus, selectedModel?: CustomerModelSelection) => void;
  
  // Catalogue Management
  addQuotationCategory: (name: string) => QuotationCategory;
  updateQuotationCategory: (id: string, name: string) => void;
  deleteQuotationCategory: (id: string) => void;
  
  addQuotationSubcategory: (categoryId: string, name: string) => QuotationSubcategory;
  updateQuotationSubcategory: (id: string, name: string) => void;
  deleteQuotationSubcategory: (id: string) => void;
  
  addQuotationProduct: (prod: Omit<QuotationProduct, 'id' | 'createdAt' | 'updatedAt'>) => QuotationProduct;
  updateQuotationProduct: (id: string, updates: Partial<QuotationProduct>) => void;
  deleteQuotationProduct: (id: string) => void;
  restoreQuotationProduct: (id: string) => void;
  
  addQuotationBrand: (brand: string) => void;
  updateProductLatestPrice: (productId: string, newPrice: number) => void;
  getNextQuotationNumber: () => string;

  // Secret Price Code Calculator & Mapping
  activePriceCodeMapping: PriceCodeMapping;
  priceCodeMappingVersions: PriceCodeMappingVersion[];
  updatePriceCodeMapping: (newMapping: PriceCodeMapping, notes?: string) => { success: boolean; error?: string };
  resetPriceCodeMappingToDefault: () => void;

  // Role-Based Access Control (RBAC via Firestore allowed_users)
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  currentUserEmail: string;
  setCurrentUserEmail: (email: string) => Promise<void>;
  currentUserRole: UserRole;
  setCurrentUserRole: (role: UserRole) => void;
  isAdmin: boolean;
  canDelete: boolean;
  canEditCritical: boolean;
  allowedUsers: AllowedUser[];
  refreshAllowedUsers: () => Promise<void>;
  saveAllowedUser: (user: AllowedUser) => Promise<void>;
  deleteAllowedUser: (email: string) => Promise<void>;
  handleAuthSuccess: (email: string, role: UserRole) => void;
  logout: () => Promise<void>;
}

const STORAGE_KEY = 'spider_grid_solutions_db_v1';
const FRESH_CLEARED_KEY = `${STORAGE_KEY}_fresh_cleared_v1`;

// One-time automatic fresh wipe for clean start as requested by user ("clear all input data ill chack fresh")
try {
  if (typeof window !== 'undefined' && localStorage.getItem(FRESH_CLEARED_KEY) !== 'true' && localStorage.getItem(FRESH_CLEARED_KEY) !== 'demo_loaded') {
    localStorage.setItem(`${STORAGE_KEY}_customers`, JSON.stringify([]));
    localStorage.setItem(`${STORAGE_KEY}_jobs`, JSON.stringify([]));
    localStorage.setItem(`${STORAGE_KEY}_inventory`, JSON.stringify([]));
    localStorage.setItem(`${STORAGE_KEY}_vendor_bills`, JSON.stringify([]));
    localStorage.setItem(`${STORAGE_KEY}_stock_tx`, JSON.stringify([]));
    localStorage.setItem(`${STORAGE_KEY}_invoices`, JSON.stringify([]));
    localStorage.setItem(`${STORAGE_KEY}_cashflow`, JSON.stringify([]));
    localStorage.setItem(`${STORAGE_KEY}_lead_sources`, JSON.stringify([]));
    localStorage.setItem(`${STORAGE_KEY}_vendors`, JSON.stringify([]));
    localStorage.setItem(`${STORAGE_KEY}_employees`, JSON.stringify([]));
    localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify([]));
    localStorage.setItem(`${STORAGE_KEY}_salaries`, JSON.stringify([]));
    localStorage.setItem(`${STORAGE_KEY}_work_allocations`, JSON.stringify([]));
    localStorage.setItem(`${STORAGE_KEY}_salary_advances`, JSON.stringify([]));
    localStorage.removeItem('sgs_billing_draft');
    localStorage.setItem(FRESH_CLEARED_KEY, 'true');
  }
} catch (e) {
  console.warn('Failed to initialize fresh clear', e);
}

function deduplicateById<T extends { id: string }>(items: T[], prefix: string): T[] {
  const seenIds = new Set<string>();
  return items.map((item, idx) => {
    if (!item.id || seenIds.has(item.id)) {
      const uniqueId = `${item.id || prefix}-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
      seenIds.add(uniqueId);
      return { ...item, id: uniqueId };
    }
    seenIds.add(item.id);
    return item;
  });
}

const SgsContext = createContext<SgsContextType | undefined>(undefined);

export const SgsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_customers`);
      const raw: Customer[] = stored ? JSON.parse(stored) : [];
      return deduplicateById(raw, 'cust');
    } catch {
      return [];
    }
  });

  const [jobCards, setJobCards] = useState<JobCard[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_jobs`);
      const raw: JobCard[] = stored ? JSON.parse(stored) : [];
      return deduplicateById(raw, 'job');
    } catch {
      return [];
    }
  });

  const [vendorBills, setVendorBills] = useState<VendorBill[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_vendor_bills`);
      const raw: VendorBill[] = stored ? JSON.parse(stored) : [];
      return deduplicateById(raw, 'vbill');
    } catch {
      return [];
    }
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_inventory`);
      const raw: InventoryItem[] = stored ? JSON.parse(stored) : [];
      return deduplicateById(raw, 'inv');
    } catch {
      return [];
    }
  });

  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_stock_tx`);
      const raw: StockTransaction[] = stored ? JSON.parse(stored) : [];
      return deduplicateById(raw, 'stx');
    } catch {
      return [];
    }
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_invoices`);
      const rawInvoices: Invoice[] = stored ? JSON.parse(stored) : [];
      return deduplicateById(rawInvoices, 'inv-doc');
    } catch {
      return [];
    }
  });

  const [cashFlow, setCashFlow] = useState<CashFlowEntry[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_cashflow`);
      const raw: CashFlowEntry[] = stored ? JSON.parse(stored) : [];
      return deduplicateById(raw, 'cf');
    } catch {
      return [];
    }
  });

  const [adminSettings, setAdminSettings] = useState<AdminSettings>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_admin_settings`);
      if (stored) {
        const parsed = JSON.parse(stored);
        let workshopPhone = parsed.workshopPhone || DEFAULT_ADMIN_SETTINGS.workshopPhone;
        if (!workshopPhone || workshopPhone.includes('9677776001')) {
          workshopPhone = '+91 9176795665';
        }
        let pandiyanPhone = parsed.pandiyanPhone || DEFAULT_ADMIN_SETTINGS.pandiyanPhone;
        if (!pandiyanPhone || pandiyanPhone.includes('9677776001')) {
          pandiyanPhone = '+91 9176795665';
        }

        return {
          ...DEFAULT_ADMIN_SETTINGS,
          ...parsed,
          workshopPhone,
          pandiyanPhone,
          paymentPendingMessageTemplate: parsed.paymentPendingMessageTemplate || DEFAULT_ADMIN_SETTINGS.paymentPendingMessageTemplate,
          quotationHeaderImageUrl: parsed.quotationHeaderImageUrl || '',
          quotationFooterImageUrl: parsed.quotationFooterImageUrl || '',
          workshopLogoUrl: parsed.workshopLogoUrl || DEFAULT_ADMIN_SETTINGS.workshopLogoUrl,
          rubberStampUrl: parsed.rubberStampUrl || DEFAULT_ADMIN_SETTINGS.rubberStampUrl,
          pandiyanLogoUrl: parsed.pandiyanLogoUrl || DEFAULT_ADMIN_SETTINGS.pandiyanLogoUrl,
          pandiyanRubberStampUrl: parsed.pandiyanRubberStampUrl || DEFAULT_ADMIN_SETTINGS.pandiyanRubberStampUrl,
          pandiyanBillingTheme: parsed.pandiyanBillingTheme || DEFAULT_ADMIN_SETTINGS.pandiyanBillingTheme || 'warm_amber',
        };
      }
      return DEFAULT_ADMIN_SETTINGS;
    } catch {
      return DEFAULT_ADMIN_SETTINGS;
    }
  });

  const [leadSources, setLeadSources] = useState<LeadSource[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_lead_sources`);
      const raw: LeadSource[] = stored ? JSON.parse(stored) : [];
      return deduplicateById(raw, 'lead');
    } catch {
      return [];
    }
  });

  const [vendors, setVendors] = useState<Vendor[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_vendors`);
      const raw: Vendor[] = stored ? JSON.parse(stored) : [];
      return deduplicateById(raw, 'vendor');
    } catch {
      return [];
    }
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_employees`);
      const raw: Employee[] = stored ? JSON.parse(stored) : [];
      return deduplicateById(raw, 'emp');
    } catch {
      return [];
    }
  });

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_attendance`);
      const raw: AttendanceRecord[] = stored ? JSON.parse(stored) : [];
      return deduplicateById(raw, 'att');
    } catch {
      return [];
    }
  });

  const [salaryPayments, setSalaryPayments] = useState<SalaryPayment[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_salaries`);
      const raw: SalaryPayment[] = stored ? JSON.parse(stored) : [];
      return deduplicateById(raw, 'sal');
    } catch {
      return [];
    }
  });

  const [workAllocations, setWorkAllocations] = useState<WorkAllocation[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_work_allocations`);
      const raw: WorkAllocation[] = stored ? JSON.parse(stored) : [];
      return deduplicateById(raw, 'alloc');
    } catch {
      return [];
    }
  });

  const [salaryAdvances, setSalaryAdvances] = useState<SalaryAdvance[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_salary_advances`);
      const raw: SalaryAdvance[] = stored ? JSON.parse(stored) : [];
      return deduplicateById(raw, 'adv');
    } catch {
      return [];
    }
  });

  // Dedicated Manual Quotation States (Independent of Stock & Billing)
  const [quotations, setQuotations] = useState<ManualQuotation[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_quotations`);
      const raw: ManualQuotation[] = stored ? JSON.parse(stored) : [];
      return deduplicateById(raw, 'qtn');
    } catch {
      return [];
    }
  });

  const [quotationCategories, setQuotationCategories] = useState<QuotationCategory[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_q_categories`);
      if (stored) {
        const raw: QuotationCategory[] = JSON.parse(stored);
        if (Array.isArray(raw) && raw.length > 0) return deduplicateById(raw, 'cat');
      }
      return INITIAL_QUOTATION_CATEGORIES;
    } catch {
      return INITIAL_QUOTATION_CATEGORIES;
    }
  });

  const [quotationSubcategories, setQuotationSubcategories] = useState<QuotationSubcategory[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_q_subcategories`);
      if (stored) {
        const raw: QuotationSubcategory[] = JSON.parse(stored);
        if (Array.isArray(raw) && raw.length > 0) return deduplicateById(raw, 'sub');
      }
      return INITIAL_QUOTATION_SUBCATEGORIES;
    } catch {
      return INITIAL_QUOTATION_SUBCATEGORIES;
    }
  });

  const [quotationProducts, setQuotationProducts] = useState<QuotationProduct[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_q_products`);
      if (stored) {
        const raw: QuotationProduct[] = JSON.parse(stored);
        if (Array.isArray(raw) && raw.length > 0) return deduplicateById(raw, 'prod');
      }
      return INITIAL_QUOTATION_PRODUCTS;
    } catch {
      return INITIAL_QUOTATION_PRODUCTS;
    }
  });

  const [quotationBrands, setQuotationBrands] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_q_brands`);
      if (stored) {
        const raw: string[] = JSON.parse(stored);
        if (Array.isArray(raw) && raw.length > 0) return Array.from(new Set([...INITIAL_QUOTATION_BRANDS, ...raw]));
      }
      return INITIAL_QUOTATION_BRANDS;
    } catch {
      return INITIAL_QUOTATION_BRANDS;
    }
  });

  const [activePriceCodeMapping, setActivePriceCodeMapping] = useState<PriceCodeMapping>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_price_code_mapping`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') return parsed;
      }
      return DEFAULT_PRICE_CODE_MAPPING;
    } catch {
      return DEFAULT_PRICE_CODE_MAPPING;
    }
  });

  const [priceCodeMappingVersions, setPriceCodeMappingVersions] = useState<PriceCodeMappingVersion[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_price_code_versions`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return [INITIAL_PRICE_CODE_VERSION];
    } catch {
      return [INITIAL_PRICE_CODE_VERSION];
    }
  });

  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    try {
      const stored = localStorage.getItem('sgs_theme');
      return (stored === 'dark' || stored === 'light') ? stored : 'light';
    } catch {
      return 'light';
    }
  });

  const toggleTheme = () => {
    setThemeState(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('sgs_theme', next);
      return next;
    });
  };

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    localStorage.setItem('sgs_theme', newTheme);
  };

  // Role-Based Access Control (RBAC via Firestore allowed_users) & Mandatory Auth
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sgs_is_authenticated') === 'true';
    } catch {
      return false;
    }
  });
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  const [currentUserEmail, setCurrentUserEmailState] = useState<string>(() => {
    try {
      return localStorage.getItem('sgs_current_user_email') || DEFAULT_ADMIN_EMAIL;
    } catch {
      return DEFAULT_ADMIN_EMAIL;
    }
  });

  const [currentUserRole, setCurrentUserRoleState] = useState<UserRole>(() => {
    try {
      const stored = localStorage.getItem('sgs_current_user_role');
      if (stored === 'admin' || stored === 'user') return stored;
      return 'admin';
    } catch {
      return 'admin';
    }
  });

  const setCurrentUserRole = (role: UserRole) => {
    setCurrentUserRoleState(role);
    try {
      localStorage.setItem('sgs_current_user_role', role);
    } catch {}
  };

  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([
    {
      email: DEFAULT_ADMIN_EMAIL,
      role: 'admin',
      displayName: 'Spider Grid Admin',
      notes: 'Primary Organization Admin'
    }
  ]);

  // Mandatory Google Login Listener via onAuthStateChanged & getRedirectResult
  useEffect(() => {
    // 1. Process Google Sign-in redirect result (when returning from signInWithRedirect)
    checkGoogleRedirectResult()
      .then(async (user) => {
        if (user && user.email) {
          const cleanEmail = user.email.trim().toLowerCase();
          try {
            const verification = await fetchUserRoleFromFirestore(cleanEmail);
            if (verification.isAuthorized || cleanEmail === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
              setIsAuthenticated(true);
              setCurrentUserEmailState(cleanEmail);
              setCurrentUserRoleState(verification.role);
              try {
                localStorage.setItem('sgs_is_authenticated', 'true');
                localStorage.setItem('sgs_current_user_email', cleanEmail);
                localStorage.setItem('sgs_current_user_role', verification.role);
              } catch {}
            } else {
              await signOutUser();
              setIsAuthenticated(false);
              try {
                localStorage.removeItem('sgs_is_authenticated');
              } catch {}
            }
          } catch (err) {
            console.warn('Error checking redirect user authorization:', err);
          }
        }
      })
      .catch((err) => {
        console.warn('Redirect check notice:', err);
      });

    // 2. Auth State Listener
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && fbUser.email) {
        const cleanEmail = fbUser.email.trim().toLowerCase();
        try {
          const verification = await fetchUserRoleFromFirestore(cleanEmail);
          if (verification.isAuthorized || cleanEmail === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
            setIsAuthenticated(true);
            setCurrentUserEmailState(cleanEmail);
            setCurrentUserRoleState(verification.role);
            try {
              localStorage.setItem('sgs_is_authenticated', 'true');
              localStorage.setItem('sgs_current_user_email', cleanEmail);
              localStorage.setItem('sgs_current_user_role', verification.role);
            } catch {}
          } else {
            // Unauthorized email -> Sign out immediately and keep locked
            await signOutUser();
            setIsAuthenticated(false);
            try {
              localStorage.removeItem('sgs_is_authenticated');
            } catch {}
          }
        } catch (err) {
          console.warn('Error checking user authorization:', err);
        }
       } else {
        setIsAuthenticated(false);
        try {
          localStorage.removeItem('sgs_is_authenticated');
          localStorage.removeItem('sgs_current_user_email');
          localStorage.removeItem('sgs_current_user_role');
        } catch {}
      }
      setIsAuthLoading(false);
    });

    return () => unsubAuth();
  }, []);

  const handleAuthSuccess = (email: string, role: UserRole) => {
    setIsAuthenticated(true);
    setCurrentUserEmailState(email);
    setCurrentUserRoleState(role);
    try {
      localStorage.setItem('sgs_is_authenticated', 'true');
      localStorage.setItem('sgs_current_user_email', email);
      localStorage.setItem('sgs_current_user_role', role);
    } catch {}
  };

  const logout = async () => {
    try {
      await signOutUser();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    setIsAuthenticated(false);
    try {
      localStorage.removeItem('sgs_is_authenticated');
      localStorage.removeItem('sgs_current_user_email');
      localStorage.removeItem('sgs_current_user_role');
    } catch {}
  };

  // Subscribe to allowed_users in Firestore
  useEffect(() => {
    const unsub = subscribeToAllowedUsers(
      (users) => {
        if (users && users.length > 0) {
          setAllowedUsers(users);
          const currentClean = (currentUserEmail || '').trim().toLowerCase();
          const match = users.find(u => u.email.trim().toLowerCase() === currentClean);
          if (match) {
            setCurrentUserRoleState(match.role);
            try {
              localStorage.setItem('sgs_current_user_role', match.role);
            } catch {}
          } else if (currentClean === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
            setCurrentUserRoleState('admin');
          }
        }
      },
      (err) => {
        console.warn('Realtime subscription notice for allowed_users:', err);
      }
    );
    return () => unsub();
  }, [currentUserEmail]);

  const setCurrentUserEmail = async (email: string) => {
    const clean = (email || '').trim().toLowerCase();
    setCurrentUserEmailState(clean);
    try {
      localStorage.setItem('sgs_current_user_email', clean);
    } catch {}

    try {
      const res = await fetchUserRoleFromFirestore(clean);
      setCurrentUserRoleState(res.role);
      try {
        localStorage.setItem('sgs_current_user_role', res.role);
      } catch {}
    } catch (e) {
      console.warn('Could not query role from Firestore, keeping fallback:', e);
      if (clean === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
        setCurrentUserRoleState('admin');
      }
    }
  };

  const isAdmin = currentUserRole === 'admin';
  const canDelete = isAdmin;
  const canEditCritical = isAdmin;

  const refreshAllowedUsers = async () => {
    try {
      const res = await fetchUserRoleFromFirestore(currentUserEmail);
      setCurrentUserRoleState(res.role);
    } catch {}
  };

  const saveAllowedUser = async (user: AllowedUser) => {
    await saveAllowedUserToFirestore(user);
    setAllowedUsers(prev => {
      const clean = user.email.trim().toLowerCase();
      const filtered = prev.filter(u => u.email.trim().toLowerCase() !== clean);
      return [...filtered, user];
    });
    if (user.email.trim().toLowerCase() === currentUserEmail.trim().toLowerCase()) {
      setCurrentUserRoleState(user.role);
      try {
        localStorage.setItem('sgs_current_user_role', user.role);
      } catch {}
    }
  };

  const deleteAllowedUser = async (email: string) => {
    await deleteAllowedUserFromFirestore(email);
    setAllowedUsers(prev => prev.filter(u => u.email.trim().toLowerCase() !== email.trim().toLowerCase()));
  };

  // ==========================================
  // REAL-TIME FIRESTORE LISTENERS (onSnapshot)
  // Job cards & Billing invoices sync instantly
  // ==========================================
    const syncOn = isAuthenticated;

  useCollectionSync('customers', customers, setCustomers, syncOn);
  useCollectionSync('job_cards', jobCards, setJobCards, syncOn);
  useCollectionSync('invoices', invoices, setInvoices, syncOn);
  useCollectionSync('vendor_bills', vendorBills, setVendorBills, syncOn);
  useCollectionSync('quotations', quotations, setQuotations, syncOn);
  useCollectionSync('inventory', inventory, setInventory, syncOn);
  useCollectionSync('stock_transactions', stockTransactions, setStockTransactions, syncOn);
  useCollectionSync('cashflow', cashFlow, setCashFlow, syncOn);
  useCollectionSync('lead_sources', leadSources, setLeadSources, syncOn);
  useCollectionSync('vendors', vendors, setVendors, syncOn);
  useCollectionSync('employees', employees, setEmployees, syncOn);
  useCollectionSync('attendance', attendanceRecords, setAttendanceRecords, syncOn);
  useCollectionSync('salary_payments', salaryPayments, setSalaryPayments, syncOn);
  useCollectionSync('work_allocations', workAllocations, setWorkAllocations, syncOn);
  useCollectionSync('salary_advances', salaryAdvances, setSalaryAdvances, syncOn);
  useCollectionSync('quotation_categories', quotationCategories, setQuotationCategories, syncOn);
  useCollectionSync('quotation_subcategories', quotationSubcategories, setQuotationSubcategories, syncOn);
  useCollectionSync('quotation_products', quotationProducts, setQuotationProducts, syncOn);

  useDocSync('admin_settings', adminSettings, setAdminSettings, syncOn);
  useDocSync('price_code_mapping', activePriceCodeMapping, setActivePriceCodeMapping, syncOn);
  useDocSync('price_code_versions', priceCodeMappingVersions, setPriceCodeMappingVersions, syncOn);
  useDocSync('quotation_brands', quotationBrands, setQuotationBrands, syncOn);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_customers`, JSON.stringify(customers));
    } catch (e) {
      console.warn('Failed to save customers to localStorage', e);
    }
  }, [customers]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_jobs`, JSON.stringify(jobCards));
    } catch (e) {
      console.warn('Failed to save jobs to localStorage', e);
    }
  }, [jobCards]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_vendor_bills`, JSON.stringify(vendorBills));
    } catch (e) {
      console.warn('Failed to save vendor bills to localStorage', e);
    }
  }, [vendorBills]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_inventory`, JSON.stringify(inventory));
    } catch (e) {
      console.warn('Failed to save inventory to localStorage', e);
    }
  }, [inventory]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_stock_tx`, JSON.stringify(stockTransactions));
    } catch (e) {
      console.warn('Failed to save stock transactions to localStorage', e);
    }
  }, [stockTransactions]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_invoices`, JSON.stringify(invoices));
    } catch (e) {
      console.warn('Failed to save invoices to localStorage', e);
    }
  }, [invoices]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_cashflow`, JSON.stringify(cashFlow));
    } catch (e) {
      console.warn('Failed to save cashflow to localStorage', e);
    }
  }, [cashFlow]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_admin_settings`, JSON.stringify(adminSettings));
    } catch (e) {
      console.warn('Failed to save admin settings to localStorage', e);
    }
  }, [adminSettings]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_lead_sources`, JSON.stringify(leadSources));
    } catch (e) {
      console.warn('Failed to save lead sources to localStorage', e);
    }
  }, [leadSources]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_vendors`, JSON.stringify(vendors));
    } catch (e) {
      console.warn('Failed to save vendors to localStorage', e);
    }
  }, [vendors]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_employees`, JSON.stringify(employees));
    } catch (e) {
      console.warn('Failed to save employees to localStorage', e);
    }
  }, [employees]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify(attendanceRecords));
    } catch (e) {
      console.warn('Failed to save attendance to localStorage', e);
    }
  }, [attendanceRecords]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_salaries`, JSON.stringify(salaryPayments));
    } catch (e) {
      console.warn('Failed to save salaries to localStorage', e);
    }
  }, [salaryPayments]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_work_allocations`, JSON.stringify(workAllocations));
    } catch (e) {
      console.warn('Failed to save work allocations to localStorage', e);
    }
  }, [workAllocations]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_salary_advances`, JSON.stringify(salaryAdvances));
    } catch (e) {
      console.warn('Failed to save salary advances to localStorage', e);
    }
  }, [salaryAdvances]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_quotations`, JSON.stringify(quotations));
    } catch (e) {
      console.warn('Failed to save quotations to localStorage', e);
    }
  }, [quotations]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_q_categories`, JSON.stringify(quotationCategories));
    } catch (e) {
      console.warn('Failed to save quotation categories to localStorage', e);
    }
  }, [quotationCategories]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_q_subcategories`, JSON.stringify(quotationSubcategories));
    } catch (e) {
      console.warn('Failed to save quotation subcategories to localStorage', e);
    }
  }, [quotationSubcategories]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_q_products`, JSON.stringify(quotationProducts));
    } catch (e) {
      console.warn('Failed to save quotation products to localStorage', e);
    }
  }, [quotationProducts]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_q_brands`, JSON.stringify(quotationBrands));
    } catch (e) {
      console.warn('Failed to save quotation brands to localStorage', e);
    }
  }, [quotationBrands]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_price_code_mapping`, JSON.stringify(activePriceCodeMapping));
    } catch (e) {
      console.warn('Failed to save price code mapping to localStorage', e);
    }
  }, [activePriceCodeMapping]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_price_code_versions`, JSON.stringify(priceCodeMappingVersions));
    } catch (e) {
      console.warn('Failed to save price code versions to localStorage', e);
    }
  }, [priceCodeMappingVersions]);

  // Customer handlers
  const addCustomer = (customerData: Omit<Customer, 'id' | 'createdAt' | 'slNo'>): Customer => {
    const nextSlNo = customers.length > 0 ? Math.max(...customers.map(c => c.slNo || 0)) + 1 : 1;
    const newCustomer: Customer = {
      ...customerData,
      id: `cust-${Date.now()}`,
      slNo: nextSlNo,
      createdAt: new Date().toISOString(),
    };
    setCustomers(prev => [newCustomer, ...prev]);
    return newCustomer;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  const generateVCard = (contact: {
    name: string;
    phone?: string;
    area?: string;
    notes?: string;
    mapUrl?: string;
    category?: string;
    company?: string;
  }): string => {
    const cleanPhone = contact.phone ? contact.phone.replace(/[^0-9+]/g, '') : '';
    const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : cleanPhone.length === 10 ? `+91${cleanPhone}` : cleanPhone;
    
    let vcard = 'BEGIN:VCARD\r\nVERSION:3.0\r\n';
    vcard += `FN:${contact.name.replace(/[;,\r\n]/g, ' ')}\r\n`;
    vcard += `N:${contact.name.replace(/[;,\r\n]/g, ' ')};;;;\r\n`;
    if (formattedPhone) {
      vcard += `TEL;TYPE=CELL,VOICE:${formattedPhone}\r\n`;
    }
    if (contact.company) {
      vcard += `ORG:${contact.company.replace(/[;,\r\n]/g, ' ')}\r\n`;
    } else {
      vcard += `ORG:Spider Grid Solutions (SGS)\r\n`;
    }
    if (contact.area) {
      vcard += `ADR;TYPE=WORK:;;${contact.area.replace(/[;,\r\n]/g, ' ')};Madurai;Tamil Nadu;;India\r\n`;
    }
    const noteParts: string[] = [];
    if (contact.category) noteParts.push(`Category: ${contact.category}`);
    if (contact.notes) noteParts.push(contact.notes);
    if (contact.mapUrl) noteParts.push(`Google Maps: ${contact.mapUrl}`);
    if (noteParts.length > 0) {
      vcard += `NOTE:${noteParts.join(' | ').replace(/[\r\n]/g, ' ')}\r\n`;
    }
    if (contact.mapUrl) {
      vcard += `URL:${contact.mapUrl}\r\n`;
    }
    vcard += 'END:VCARD\r\n';
    return vcard;
  };

  const downloadVCard = (filename: string, vcardContent: string) => {
    const blob = new Blob([vcardContent], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.vcf') ? filename : `${filename}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const syncCustomerToContacts = (customerId: string) => {
    const cust = customers.find(c => c.id === customerId);
    if (!cust) return;
    const vcard = generateVCard({
      name: cust.name,
      phone: cust.phone,
      area: cust.area,
      notes: `Lead Reference: ${cust.reference || 'Direct'} | ${cust.details || ''}`,
      mapUrl: cust.mapUrl,
      category: cust.about,
      company: 'Spider Grid Solutions Client',
    });
    downloadVCard(`SGS-Customer-${cust.name.replace(/\s+/g, '_')}`, vcard);
    updateCustomer(customerId, { phoneBook: 'Yes', syncedToGoogleContacts: true });
  };

  const updateCustomerCommission = (
    customerId: string, 
    amount: number, 
    status: 'paid' | 'pending' = 'pending', 
    notes?: string
  ) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === customerId) {
        return {
          ...c,
          referralCommissionAmount: amount,
          referralCommissionStatus: status,
          referralCommissionNotes: notes !== undefined ? notes : c.referralCommissionNotes,
          referralCommissionPaidDate: status === 'paid' ? (c.referralCommissionPaidDate || Acc.todayLocal()) : undefined,
        };
      }
      return c;
    }));
  };

  // Lead Source handlers
  const addLeadSource = (leadData: Omit<LeadSource, 'id' | 'createdAt'>): LeadSource => {
    const newLead: LeadSource = {
      ...leadData,
      id: `lead-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setLeadSources(prev => [newLead, ...prev]);
    return newLead;
  };

  const updateLeadSource = (id: string, updates: Partial<LeadSource>) => {
    setLeadSources(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const deleteLeadSource = (id: string) => {
    setLeadSources(prev => prev.filter(l => l.id !== id));
  };

  const toggleLeadSyncedContacts = (id: string, synced?: boolean) => {
    setLeadSources(prev => prev.map(l => {
      if (l.id === id) {
        const nextSynced = synced !== undefined ? synced : !l.syncedWithGoogleContacts;
        return { ...l, syncedWithGoogleContacts: nextSynced };
      }
      return l;
    }));
  };

  // Vendor handlers
  const addVendor = (vendorData: Omit<Vendor, 'id' | 'createdAt'>): Vendor => {
    const newVendor: Vendor = {
      ...vendorData,
      id: `vendor-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setVendors(prev => [newVendor, ...prev]);
    return newVendor;
  };

  const updateVendor = (id: string, updates: Partial<Vendor>) => {
    setVendors(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  const deleteVendor = (id: string) => {
    setVendors(prev => prev.filter(v => v.id !== id));
  };

  // Job Card handlers
  const addJobCard = (jobData: Omit<JobCard, 'id' | 'jobId' | 'updatedAt'>): JobCard => {
    const count = jobCards.length + 1;
    const padded = String(count).padStart(3, '0');
    const year = new Date().getFullYear();
    const jobId = `SGS-${year}-${padded}`;

    const newJob: JobCard = {
      ...jobData,
      id: `job-${Date.now()}`,
      jobId,
      updatedAt: Acc.todayLocal(),
      callCompleted: false,
    };

    setJobCards(prev => [newJob, ...prev]);
    saveJobCardToFirestore(newJob).catch(err => console.warn('Could not save job to Firestore:', err));
    return newJob;
  };

  const updateJobCardStatus = (id: string, status: JobStatus, notes?: string) => {
    let updatedJob: JobCard | undefined;
    setJobCards(prev => prev.map(job => {
      if (job.id === id) {
        updatedJob = {
          ...job,
          status,
          technicianNotes: notes !== undefined ? notes : job.technicianNotes,
          updatedAt: Acc.todayLocal(),
        };
        return updatedJob;
      }
      return job;
    }));

    if (updatedJob) {
      saveJobCardToFirestore(updatedJob).catch(err => console.warn('Could not update job status in Firestore:', err));
    }

    if (status === 'work_completed' || status === 'completed' || status === 'delivered') {
      setWorkAllocations(prev => prev.filter(a => a.jobCardId !== id));
    }
  };

  const updateJobCard = (id: string, updates: Partial<JobCard>) => {
    let updatedJob: JobCard | undefined;
    setJobCards(prev => prev.map(job => {
      if (job.id === id) {
        updatedJob = {
          ...job,
          ...updates,
          updatedAt: Acc.todayLocal(),
        };
        return updatedJob;
      }
      return job;
    }));

    if (updatedJob) {
      saveJobCardToFirestore(updatedJob).catch(err => console.warn('Could not update job in Firestore:', err));
    }

    if (updates.status === 'work_completed' || updates.status === 'completed' || updates.status === 'delivered') {
      setWorkAllocations(prev => prev.filter(a => a.jobCardId !== id));
    }
  };

  const deleteJobCard = (id: string) => {
    setJobCards(prev => prev.filter(j => j.id !== id));
    setWorkAllocations(prev => prev.filter(a => a.jobCardId !== id));
    deleteJobCardFromFirestore(id).catch(err => console.warn('Could not delete job from Firestore:', err));
  };

  const toggleCallCompleted = (id: string, completed?: boolean) => {
    let updatedJob: JobCard | undefined;
    setJobCards(prev => prev.map(job => {
      if (job.id === id) {
        const nextState = completed !== undefined ? completed : !job.callCompleted;
        updatedJob = {
          ...job,
          callCompleted: nextState,
          lastCalledAt: nextState ? new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : undefined,
          updatedAt: Acc.todayLocal(),
        };
        return updatedJob;
      }
      return job;
    }));

    if (updatedJob) {
      saveJobCardToFirestore(updatedJob).catch(err => console.warn('Could not update job in Firestore:', err));
    }
  };

  const addJobTimelineEvent = (jobId: string, eventData: Omit<import('../types').JobTimelineEvent, 'id'>) => {
    const newEvent: import('../types').JobTimelineEvent = {
      ...eventData,
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: eventData.timestamp || new Date().toISOString(),
    };

    let updatedJob: JobCard | undefined;
    setJobCards(prev => prev.map(job => {
      if (job.id === jobId) {
        const existingTimeline = job.timeline || [];
        updatedJob = {
          ...job,
          timeline: [...existingTimeline, newEvent],
          updatedAt: Acc.todayLocal(),
        };
        return updatedJob;
      }
      return job;
    }));

    if (updatedJob) {
      saveJobCardToFirestore(updatedJob).catch(err => console.warn('Could not update job timeline in Firestore:', err));
    }
  };

  const toggleLinkJobAndVendorBill = (jobId: string, vendorBillId: string) => {
    let updatedJob: JobCard | undefined;
    setJobCards(prev => prev.map(job => {
      if (job.id === jobId) {
        const existingLinks = job.linkedVendorBillIds || [];
        const isLinked = existingLinks.includes(vendorBillId);
        const nextLinks = isLinked ? existingLinks.filter(id => id !== vendorBillId) : [...existingLinks, vendorBillId];
        updatedJob = {
          ...job,
          linkedVendorBillIds: nextLinks,
          updatedAt: Acc.todayLocal(),
        };
        return updatedJob;
      }
      return job;
    }));
    if (updatedJob) {
      saveJobCardToFirestore(updatedJob).catch(err => console.warn('Could not update job links in Firestore:', err));
    }

    setVendorBills(prev => prev.map(bill => {
      if (bill.id === vendorBillId) {
        const existingJobs = bill.linkedJobCardIds || [];
        const isLinked = existingJobs.includes(jobId);
        const nextJobs = isLinked ? existingJobs.filter(id => id !== jobId) : [...existingJobs, jobId];
        return {
          ...bill,
          linkedJobCardIds: nextJobs
        };
      }
      return bill;
    }));
  };

  // ---- Ledger helpers: all stock / cash / profit rules live in utils/accounting.ts (pure + tested)
  const getLedger = (): Acc.LedgerState => ({
    inventory,
    stockTx: stockTransactions,
    cashFlow,
    invoices,
    vendorBills,
  });
  const commitLedger = (next: Acc.LedgerState, prev: Acc.LedgerState) => {
    if (next.inventory !== prev.inventory) setInventory(next.inventory);
    if (next.stockTx !== prev.stockTx) setStockTransactions(next.stockTx);
    if (next.cashFlow !== prev.cashFlow) setCashFlow(next.cashFlow);
    if (next.invoices !== prev.invoices) setInvoices(next.invoices);
    if (next.vendorBills !== prev.vendorBills) setVendorBills(next.vendorBills);
  };

  // Vendor Bill handlers
  const addVendorBill = (billData: Omit<VendorBill, 'id' | 'createdAt'>, updateStock = true): VendorBill => {
    const prev = getLedger();
    const { state, bill } = Acc.addVendorBillTx(prev, billData, updateStock);
    commitLedger(state, prev);
    return bill;
  };

  const updateVendorBillPayment = (
    id: string, 
    paidAmount: number, 
    _paymentStatus: 'paid' | 'pending' | 'partial',
    paymentMode?: PaymentMode,
    paymentReference?: string
  ) => {
    // status is always derived from the amount (paid / partial / pending)
    const prev = getLedger();
    commitLedger(Acc.payVendorBillTx(prev, id, paidAmount, paymentMode, paymentReference), prev);
  };

  const updateVendorBill = (id: string, updates: Partial<VendorBill>) => {
    setVendorBills(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const deleteVendorBill = (id: string) => {
    // also takes back the stock it added and removes its payment entries
    const prev = getLedger();
    commitLedger(Acc.deleteVendorBillTx(prev, id), prev);
  };

  // Inventory handlers
  const addInventoryItem = (itemData: Omit<InventoryItem, 'id' | 'updatedAt'>): InventoryItem => {
    const newItem: InventoryItem = {
      ...itemData,
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      updatedAt: Acc.todayLocal(),
    };
    setInventory(prev => [newItem, ...prev]);
    return newItem;
  };

  const updateInventoryItem = (id: string, updates: Partial<InventoryItem>) => {
    setInventory(prev => prev.map(item => item.id === id ? { ...item, ...updates, updatedAt: Acc.todayLocal() } : item));
  };

  const deleteInventoryItem = (id: string) => {
    setInventory(prev => prev.filter(item => item.id !== id));
  };

  const linkInventoryToVendorBill = (inventoryId: string, vendorBillId: string) => {
    const bill = vendorBills.find(b => b.id === vendorBillId);
    if (!bill) return;
    setInventory(prev => prev.map(item => {
      if (item.id === inventoryId) {
        return {
          ...item,
          vendorBillId: bill.id,
          vendorName: bill.vendorName,
          vendorInvoiceNumber: bill.invoiceNumber,
          vendorBillDate: bill.invoiceDate,
          updatedAt: Acc.todayLocal(),
        };
      }
      return item;
    }));
  };

  const recordStockMovement = (itemId: string, type: 'in' | 'out', qty: number, reason: string, jobCardId?: string) => {
    const prev = getLedger();
    commitLedger(Acc.recordStockMovementTx(prev, itemId, type, qty, reason, jobCardId), prev);
  };

  // Invoices & Billing
  const addInvoice = (invoiceData: Omit<Invoice, 'id'>): Invoice => {
    const prev = getLedger();
    const { state, invoice } = Acc.addInvoiceTx(prev, invoiceData);
    commitLedger(state, prev);
    saveInvoiceToFirestore(invoice).catch(err => console.warn('Could not save invoice to Firestore:', err));
    return invoice;
  };

  const updateInvoice = (id: string, updates: Partial<Invoice>) => {
    const prev = getLedger();
    const nextState = Acc.updateInvoiceTx(prev, id, updates);
    commitLedger(nextState, prev);
    const updated = nextState.invoices.find(i => i.id === id);
    if (updated) {
      saveInvoiceToFirestore(updated).catch(err => console.warn('Could not update invoice in Firestore:', err));
    }
  };

  const updateInvoicePayment = (
    id: string, 
    paidAmount: number, 
    _status: 'paid' | 'partial' | 'unpaid', 
    mode: PaymentMode,
    paymentReference?: string
  ) => {
    // status is always derived from the amount; overpayment is capped at the bill total
    const prev = getLedger();
    const nextState = Acc.payInvoiceTx(prev, id, paidAmount, mode, paymentReference);
    commitLedger(nextState, prev);
    const updated = nextState.invoices.find(i => i.id === id);
    if (updated) {
      saveInvoiceToFirestore(updated).catch(err => console.warn('Could not update invoice payment in Firestore:', err));
    }
  };

  const cancelInvoice = (id: string, reason = 'Cancelled by Admin') => {
    // puts stock back and records a refund for money already received
    const prev = getLedger();
    const nextState = Acc.cancelInvoiceTx(prev, id, reason);
    commitLedger(nextState, prev);
    const updated = nextState.invoices.find(i => i.id === id);
    if (updated) {
      saveInvoiceToFirestore(updated).catch(err => console.warn('Could not update cancelled invoice in Firestore:', err));
    }
  };

  const duplicateInvoice = (id: string): Invoice => {
    const original = invoices.find(inv => inv.id === id);
    if (!original) {
      throw new Error('Invoice not found for duplication');
    }

    const prefix = original.billingFirm === 'pandiyan'
      ? (original.type === 'quotation' ? 'PC-QUOT-' : 'PC-EST-')
      : (original.type === 'quotation' ? 'SGS-QUOT-' : (adminSettings.invoicePrefix || 'SGS-INV-'));
    const newInvoiceNumber = Acc.nextDocNumber(invoices, prefix, original.billingFirm === 'pandiyan' ? 501 : 1043);

    const duplicateDoc: Invoice = {
      ...original,
      id: `inv-doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      invoiceNumber: newInvoiceNumber,
      date: Acc.todayLocal(),
      paymentStatus: 'unpaid',
      paidAmount: 0,
      paymentReference: '',
      status: 'active',
      cancelledReason: undefined,
      notes: `${original.notes || ''} (Cloned from ${original.invoiceNumber})`.trim(),
    };

    // go through the ledger so stock is reduced for a duplicated SGS invoice too
    const prev = getLedger();
    const { state, invoice } = Acc.addInvoiceTx(prev, (({ id: _id, ...rest }) => rest)(duplicateDoc) as Omit<Invoice, 'id'>);
    commitLedger(state, prev);
    saveInvoiceToFirestore(invoice).catch(err => console.warn('Could not save duplicate invoice to Firestore:', err));
    return invoice;
  };

  const deleteInvoice = (id: string) => {
    const prev = getLedger();
    commitLedger(Acc.deleteInvoiceTx(prev, id), prev);
    deleteInvoiceFromFirestore(id).catch(err => console.warn('Could not delete invoice from Firestore:', err));
  };

  // Admin Settings
  const updateAdminSettings = (updates: Partial<AdminSettings>) => {
    setAdminSettings(prev => ({ ...prev, ...updates }));
  };

  const resetAdminSettings = () => {
    setAdminSettings(DEFAULT_ADMIN_SETTINGS);
  };

  // Cash Flow
  const addCashFlowEntry = (entryData: Omit<CashFlowEntry, 'id'>) => {
    const newEntry: CashFlowEntry = {
      ...entryData,
      id: Acc.uid('cf'),
    };
    setCashFlow(prev => [newEntry, ...prev]);
  };

  // Convert Quotation directly to Official Tax Invoice
  const convertQuotationToInvoice = (quotationId: string): Invoice => {
    const quot = invoices.find(i => i.id === quotationId);
    if (!quot) throw new Error('Quotation not found');

    const isPandiyan = quot.billingFirm === 'pandiyan';
    const prefix = isPandiyan ? 'PC-EST-' : (adminSettings.invoicePrefix || 'SGS-INV-');
    const invNum = Acc.nextDocNumber(invoices, prefix, isPandiyan ? 501 : 1043);
    const note = quot.notes || (isPandiyan ? 'Converted from Quotation' : 'Converted from Quotation - Spares carry 1-year warranty.');

    const prev = getLedger();
    const { state, invoice: converted } = Acc.convertQuotationTx(prev, quotationId, invNum, Acc.todayLocal(), note);
    commitLedger(state, prev);

    if (quot.jobCardId) {
      updateJobCard(quot.jobCardId, { invoiceId: converted.id, status: 'billed' as any });
      addJobTimelineEvent(quot.jobCardId, {
        stage: 'billed',
        stageLabel: `Quotation Converted to Invoice #${converted.invoiceNumber}`,
        notes: `Converted to Tax Invoice #${converted.invoiceNumber} for amount ₹${converted.grandTotal.toLocaleString('en-IN')}`,
        timestamp: new Date().toISOString(),
        performedBy: 'Admin',
      });
    }
    return converted;
  };

  // Employee Management Handlers
  const addEmployee = (empData: Omit<Employee, 'id'>): Employee => {
    const newEmp: Employee = {
      ...empData,
      id: `emp-${Date.now()}`,
    };
    setEmployees(prev => [newEmp, ...prev]);
    return newEmp;
  };

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const deleteEmployee = (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
  };

  const markAttendance = (
    employeeId: string, 
    date: string, 
    status: AttendanceStatus, 
    notes?: string, 
    checkInTime?: string
  ) => {
    setAttendanceRecords(prev => {
      const existing = prev.find(a => a.employeeId === employeeId && a.date === date);
      if (existing) {
        return prev.map(a => a.id === existing.id ? {
          ...a,
          status,
          notes: notes !== undefined ? notes : a.notes,
          checkInTime: checkInTime !== undefined ? checkInTime : a.checkInTime,
        } : a);
      }
      return [
        {
          id: `att-${Date.now()}`,
          employeeId,
          date,
          status,
          notes,
          checkInTime: checkInTime || '09:00 AM',
        },
        ...prev,
      ];
    });
  };

  const updateAttendanceRecord = (
    employeeId: string,
    date: string,
    status: AttendanceStatus,
    notes?: string,
    checkInTime?: string,
    checkOutTime?: string,
    overtimeHours?: number
  ) => {
    setAttendanceRecords(prev => {
      const existing = prev.find(a => a.employeeId === employeeId && a.date === date);
      if (existing) {
        return prev.map(a => a.id === existing.id ? {
          ...a,
          status,
          notes: notes !== undefined ? notes : a.notes,
          checkInTime: checkInTime !== undefined ? checkInTime : a.checkInTime,
          checkOutTime: checkOutTime !== undefined ? checkOutTime : a.checkOutTime,
          overtimeHours: overtimeHours !== undefined ? overtimeHours : a.overtimeHours,
        } : a);
      }
      return [
        {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          employeeId,
          date,
          status,
          notes,
          checkInTime: checkInTime || '09:00 AM',
          checkOutTime,
          overtimeHours,
        },
        ...prev,
      ];
    });
  };

  const recordSalaryPayment = (salData: Omit<SalaryPayment, 'id'>): SalaryPayment => {
    const newSal: SalaryPayment = {
      ...salData,
      id: `sal-${Date.now()}`,
    };
    setSalaryPayments(prev => [newSal, ...prev]);
    
    // Add to cashflow if marked paid
    if (newSal.status === 'paid' && newSal.netPaid > 0) {
      const emp = employees.find(e => e.id === newSal.employeeId);
      addCashFlowEntry({
        date: newSal.paymentDate,
        type: 'expense',
        category: 'Salary & Staff Wages',
        description: `Staff Salary: ${emp?.name || 'Employee'} (${newSal.month})`,
        amount: newSal.netPaid,
        paymentMode: newSal.paymentMode || 'upi',
        referenceId: newSal.id,
        referenceNumber: newSal.referenceNumber || '',
      });
    }

    return newSal;
  };

  const recordSalaryInstallment = (
    employeeId: string,
    month: string,
    installment: {
      amount: number;
      paymentDate: string;
      paymentMode: PaymentMode;
      referenceNumber?: string;
      notes?: string;
      paidBy?: string;
    },
    totalPayableContext?: number
  ) => {
    const installmentItem = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      amount: installment.amount,
      paymentDate: installment.paymentDate,
      paymentMode: installment.paymentMode,
      referenceNumber: installment.referenceNumber,
      notes: installment.notes,
      paidBy: installment.paidBy || 'Admin',
    };

    setSalaryPayments(prev => {
      const existing = prev.find(s => s.employeeId === employeeId && s.month === month);
      if (existing) {
        const updatedPayments = [...(existing.payments || []), installmentItem];
        const newTotalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
        const totalDue = existing.calculatedSalary + (existing.bonus || 0) - (existing.advanceDeduction || 0);
        const newStatus: 'paid' | 'partial' | 'pending' = newTotalPaid >= totalDue ? 'paid' : (newTotalPaid > 0 ? 'partial' : 'pending');

        return prev.map(s => s.id === existing.id ? {
          ...s,
          payments: updatedPayments,
          netPaid: newTotalPaid,
          status: newStatus,
          paymentDate: installment.paymentDate,
          paymentMode: installment.paymentMode,
          referenceNumber: installment.referenceNumber || s.referenceNumber,
        } : s);
      } else {
        const emp = employees.find(e => e.id === employeeId);
        const base = totalPayableContext || emp?.monthlySalary || (emp?.dailySalary ? emp.dailySalary * 26 : 18000);
        const newStatus: 'paid' | 'partial' | 'pending' = installment.amount >= base ? 'paid' : 'partial';
        const newRecord: SalaryPayment = {
          id: `sal-${Date.now()}`,
          employeeId,
          month,
          baseSalary: base,
          daysPresent: 26,
          halfDays: 0,
          absentDays: 0,
          calculatedSalary: base,
          advanceDeduction: 0,
          bonus: 0,
          netPaid: installment.amount,
          paymentDate: installment.paymentDate,
          paymentMode: installment.paymentMode,
          referenceNumber: installment.referenceNumber,
          status: newStatus,
          notes: installment.notes || `Disbursed ₹${installment.amount}`,
          payments: [installmentItem],
        };
        return [newRecord, ...prev];
      }
    });

    // Also record cashflow outflow
    const emp = employees.find(e => e.id === employeeId);
    addCashFlowEntry({
      date: installment.paymentDate,
      type: 'expense',
      category: 'Salary & Staff Wages',
      description: `Staff Salary Payout: ${emp?.name || 'Staff'} (${month}) - ₹${installment.amount}`,
      amount: installment.amount,
      paymentMode: installment.paymentMode || 'upi',
      referenceNumber: installment.referenceNumber || '',
    });
  };

  const allocateWorkToEmployee = (allocationData: Omit<WorkAllocation, 'id'>): WorkAllocation => {
    const newAlloc: WorkAllocation = {
      ...allocationData,
      id: `alloc-${Date.now()}`,
    };
    setWorkAllocations(prev => [newAlloc, ...prev]);
    return newAlloc;
  };

  const removeWorkAllocation = (id: string) => {
    setWorkAllocations(prev => prev.filter(a => a.id !== id));
  };

  const shareJobToEmployeeWhatsApp = (
    employeeId: string, 
    jobCardId: string, 
    workNotes?: string, 
    priorityOrder?: number
  ): string => {
    const emp = employees.find(e => e.id === employeeId);
    const job = jobCards.find(j => j.id === jobCardId);
    if (!emp || !job) return '';

    const priority = priorityOrder || 1;
    const notes = workNotes || 'Please diagnose and service this device with priority.';

    // Update job card
    updateJobCard(jobCardId, {
      assignedEmployeeId: emp.id,
      assignedTechnician: emp.name,
      workOrderPriority: priority,
      workOrderNotes: notes,
    });

    // Update or add work allocation
    setWorkAllocations(prev => {
      const existing = prev.find(a => a.employeeId === emp.id && a.jobCardId === jobCardId);
      if (existing) {
        return prev.map(a => a.id === existing.id ? {
          ...a,
          priorityOrder: priority,
          notes,
          sharedViaWhatsAppAt: new Date().toISOString(),
          status: 'assigned',
        } : a);
      }
      return [
        {
          id: `alloc-${Date.now()}`,
          employeeId: emp.id,
          jobCardId,
          allocatedDate: Acc.todayLocal(),
          priorityOrder: priority,
          notes,
          sharedViaWhatsAppAt: new Date().toISOString(),
          status: 'assigned',
        },
        ...prev,
      ];
    });

    // Add to Job Card Timeline
    addJobTimelineEvent(jobCardId, {
      stage: 'in_process',
      stageLabel: `Work Allocated to ${emp.name} (Priority #${priority})`,
      notes: `Technician: ${emp.name} (${emp.phone}) | Priority Order: #${priority} | Instructions: ${notes}`,
      performedBy: emp.name,
      timestamp: new Date().toISOString(),
    });

    // Build WhatsApp message
    const msg = `*SPIDER GRID SOLUTIONS (SGS) - WORK ALLOCATION ORDER*
🛠️ *Job Assignment Order: #${priority}*

Hello *${emp.name}*, you have been assigned a workshop/field service call.

📋 *Job Details:*
• *Job ID:* ${job.jobId}
• *Device:* ${job.deviceBrand} (${job.category})
• *Serial No:* ${job.serialNumber || 'N/A'}
• *Current Status:* ${job.status.toUpperCase()}
• *Reported Problem:* ${job.issueDescription}

👤 *Customer Info:*
• *Name:* ${job.customerName}
• *Phone:* ${job.customerPhone}
• *Location / Area:* ${job.customerArea || 'Madurai'}

🎯 *Work To Do / Instructions:*
${notes}

${job.estimatedDelivery ? `⏳ *Target Delivery / Completion:* ${job.estimatedDelivery}` : ''}
${job.estimatedCost ? `💰 *Est. Quote:* ₹${job.estimatedCost}` : ''}

Please update your diagnostic notes and call status upon inspection.
— *Spider Grid Solutions Workshop*`;

    let cleanPhone = emp.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
    return url;
  };

  // Module 1 & 2: Priority Ordering & Timeline Audit
  const updateJobPriority = (
    jobId: string, 
    priority: 'P1' | 'P2' | 'P3' | 'P4', 
    priorityOrder: number, 
    reason?: string, 
    changedBy: string = 'Office Staff'
  ) => {
    setJobCards(prev => prev.map(job => {
      if (job.id === jobId) {
        const oldPriority = job.priority || 'P3';
        const priorityLabels: Record<string, string> = {
          P1: 'Emergency P1',
          P2: 'High P2',
          P3: 'Normal P3',
          P4: 'Low P4'
        };
        const updatedJob: JobCard = {
          ...job,
          priority,
          priorityOrder,
          priorityChangeReason: reason || job.priorityChangeReason,
          priorityChangedBy: changedBy,
          priorityChangedAt: new Date().toISOString(),
          updatedAt: Acc.todayLocal(),
        };
        const timelineEvent = {
          id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          stage: 'in_process' as const,
          stageLabel: `Priority set to ${priorityLabels[priority]} (Seq #${priorityOrder})`,
          notes: `Priority changed from ${priorityLabels[oldPriority] || oldPriority} to ${priorityLabels[priority]} (Seq #${priorityOrder})${reason ? ` - Reason: ${reason}` : ''}`,
          performedBy: changedBy,
          timestamp: new Date().toISOString(),
        };
        updatedJob.timeline = [...(job.timeline || []), timelineEvent];
        return updatedJob;
      }
      return job;
    }));
  };

  // Module 1 & 2: Employee Assignment & Reassignment with Audit
  const assignJobToEmployee = (
    jobId: string,
    employeeId: string,
    employeeName: string,
    instructions?: string,
    dueDate?: string,
    expectedDurationHours?: number,
    assignedBy: string = 'Office Staff',
    reason?: string
  ) => {
    setJobCards(prev => prev.map(job => {
      if (job.id === jobId) {
        const wasReassigned = Boolean(job.assignedEmployeeId && job.assignedEmployeeId !== employeeId);
        const previousTech = job.assignedTechnician;
        const updatedJob: JobCard = {
          ...job,
          assignedEmployeeId: employeeId,
          assignedTechnician: employeeName,
          assignedDate: new Date().toISOString(),
          assignedBy,
          workOrderNotes: instructions || job.workOrderNotes,
          estimatedDelivery: dueDate || job.estimatedDelivery,
          estimatedDurationHours: expectedDurationHours !== undefined ? expectedDurationHours : job.estimatedDurationHours,
          status: job.status === 'received' ? 'in_process' : job.status,
          reassignReason: wasReassigned ? reason : job.reassignReason,
          updatedAt: Acc.todayLocal(),
        };

        const timelineEvent = {
          id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          stage: 'in_process' as const,
          stageLabel: wasReassigned ? `Reassigned to ${employeeName}` : `Assigned to ${employeeName}`,
          notes: wasReassigned 
            ? `Reassigned from ${previousTech || 'unassigned'} to ${employeeName}. Reason: ${reason || 'Workload rebalance'}. Instructions: ${instructions || 'N/A'}`
            : `Allocated to ${employeeName}. Scheduled target: ${dueDate || 'Standard'}. Instructions: ${instructions || 'Diagnose and repair'}. Estimated duration: ${expectedDurationHours || 2}h`,
          performedBy: assignedBy,
          timestamp: new Date().toISOString(),
        };
        updatedJob.timeline = [...(job.timeline || []), timelineEvent];
        return updatedJob;
      }
      return job;
    }));

    setWorkAllocations(prev => {
      const existing = prev.find(a => a.jobCardId === jobId);
      if (existing) {
        return prev.map(a => a.id === existing.id ? {
          ...a,
          employeeId,
          notes: instructions || a.notes,
          status: 'assigned',
        } : a);
      }
      return [
        {
          id: `alloc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          employeeId,
          jobCardId: jobId,
          allocatedDate: Acc.todayLocal(),
          priorityOrder: 1,
          notes: instructions,
          status: 'assigned',
        },
        ...prev
      ];
    });
  };

  const bulkAssignJobs = (
    jobIds: string[],
    employeeId: string,
    employeeName: string,
    instructions?: string
  ) => {
    jobIds.forEach(id => {
      assignJobToEmployee(id, employeeId, employeeName, instructions);
    });
  };

  // Module 2: Work Completion Notes
  const submitWorkCompletion = (
    jobId: string,
    completionNotes: NonNullable<JobCard['completionNotes']>
  ) => {
    setJobCards(prev => prev.map(job => {
      if (job.id === jobId) {
        const updatedJob: JobCard = {
          ...job,
          status: 'work_completed',
          completionNotes: {
            ...completionNotes,
            completedAt: new Date().toISOString(),
          },
          updatedAt: Acc.todayLocal(),
        };
        const timelineEvent = {
          id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          stage: 'work_completed' as const,
          stageLabel: 'Work Completed by Technician',
          notes: `Work Done: ${completionNotes.workPerformed || 'Finished'}\nRoot Cause: ${completionNotes.diagnosis || 'Standard'}\nSolution: ${completionNotes.solutionProvided || 'N/A'}\nSpare Parts: ${completionNotes.sparePartsUsed || 'None'}\nCompleted by: ${completionNotes.completedBy || 'Technician'}`,
          performedBy: completionNotes.completedBy || 'Technician',
          timestamp: new Date().toISOString(),
        };
        updatedJob.timeline = [...(job.timeline || []), timelineEvent];
        return updatedJob;
      }
      return job;
    }));
  };

  // Module 2: Job Closure with Verification
  const closeJobCard = (jobId: string, closedBy: string, finalNotes?: string) => {
    const job = jobCards.find(j => j.id === jobId);
    if (!job) return { success: false, error: 'Job card not found' };

    setJobCards(prev => prev.map(j => {
      if (j.id === jobId) {
        const updated: JobCard = {
          ...j,
          status: 'delivered',
          closureDetails: {
            closedAt: new Date().toISOString(),
            closedBy,
            finalNotes: finalNotes || 'Job verified and closed administratively.',
            verifiedBy: closedBy,
            verifiedAt: new Date().toISOString(),
          },
          updatedAt: Acc.todayLocal(),
        };
        const timelineEvent = {
          id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          stage: 'call_close' as const,
          stageLabel: 'Job Verified & Closed',
          notes: `Closed by: ${closedBy}. Verification remarks: ${finalNotes || 'Service completed, client confirmed.'}`,
          performedBy: closedBy,
          timestamp: new Date().toISOString(),
        };
        updated.timeline = [...(j.timeline || []), timelineEvent];
        return updated;
      }
      return j;
    }));

    return { success: true };
  };

  // Module 2: Reopen Closed Job
  const reopenJobCard = (jobId: string, reason: string, reopenedBy: string) => {
    setJobCards(prev => prev.map(job => {
      if (job.id === jobId) {
        const updated: JobCard = {
          ...job,
          status: 'in_process',
          closureDetails: {
            ...job.closureDetails,
            reopenedAt: new Date().toISOString(),
            reopenedReason: reason,
            reopenedBy,
          },
          updatedAt: Acc.todayLocal(),
        };
        const timelineEvent = {
          id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          stage: 'in_process' as const,
          stageLabel: 'Job Reopened for Warranty / Repeat Complaint',
          notes: `Reopened by: ${reopenedBy}. Reason: ${reason}`,
          performedBy: reopenedBy,
          timestamp: new Date().toISOString(),
        };
        updated.timeline = [...(job.timeline || []), timelineEvent];
        return updated;
      }
      return job;
    }));
  };

  // Module 3: Salary Advances
  const addSalaryAdvance = (adv: Omit<SalaryAdvance, 'id' | 'repaidAmount' | 'status' | 'repayments'>): SalaryAdvance => {
    const newAdv: SalaryAdvance = {
      ...adv,
      id: `adv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      repaidAmount: 0,
      status: 'active',
      repayments: [],
    };
    setSalaryAdvances(prev => [newAdv, ...prev]);
    return newAdv;
  };

  const recordAdvanceRepayment = (advanceId: string, amount: number, note?: string) => {
    setSalaryAdvances(prev => prev.map(adv => {
      if (adv.id === advanceId) {
        const nextRepaid = (adv.repaidAmount || 0) + amount;
        const isFullyRepaid = nextRepaid >= adv.amount;
        const newRepayment = {
          date: Acc.todayLocal(),
          amount,
          note: note || 'Salary deduction / settlement',
        };
        return {
          ...adv,
          repaidAmount: nextRepaid,
          status: isFullyRepaid ? ('repaid' as const) : ('active' as const),
          repayments: [...(adv.repayments || []), newRepayment],
        };
      }
      return adv;
    }));
  };

  // ==========================================================================
  // DEDICATED MANUAL QUOTATION MODULE HANDLERS
  // ==========================================================================

  const getNextQuotationNumber = (): string => {
    const currentYear = new Date().getFullYear();
    const regex = new RegExp(`^SGS/QTN/${currentYear}/(\\d+)$`, 'i');
    let maxSeq = 0;
    quotations.forEach(q => {
      const match = q.quotationNumber?.match(regex);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    });
    const nextSeq = String(maxSeq + 1).padStart(3, '0');
    return `SGS/QTN/${currentYear}/${nextSeq}`;
  };

  const addManualQuotation = (qData: Omit<ManualQuotation, 'id' | 'quotationNumber' | 'createdAt' | 'updatedAt' | 'version' | 'history'>): ManualQuotation => {
    const quotationNumber = getNextQuotationNumber();
    const newQuote: ManualQuotation = {
      ...qData,
      id: `qtn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      quotationNumber,
      version: 1,
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setQuotations(prev => [newQuote, ...prev]);
    return newQuote;
  };

  const updateManualQuotation = (id: string, updates: Partial<ManualQuotation>, note?: string) => {
    setQuotations(prev => prev.map(existing => {
      if (existing.id !== id) return existing;

      // Create immutable version snapshot of the existing state
      const snapshot: QuotationVersionSnapshot = {
        version: existing.version,
        updatedAt: existing.updatedAt || new Date().toISOString(),
        notes: note || `Archived Version ${existing.version}`,
        model1: JSON.parse(JSON.stringify(existing.model1)),
        model2: JSON.parse(JSON.stringify(existing.model2)),
        termsAndConditions: existing.termsAndConditions,
        validityDays: existing.validityDays,
        validUntil: existing.validUntil,
        paymentDetails: existing.paymentDetails,
        advanceAmount: existing.advanceAmount,
        customerNotes: existing.customerNotes,
        installationNotes: existing.installationNotes,
      };

      const newVersion = (existing.version || 1) + 1;
      return {
        ...existing,
        ...updates,
        version: newVersion,
        history: [snapshot, ...(existing.history || [])],
        updatedAt: new Date().toISOString(),
      };
    }));
  };

  const deleteManualQuotation = (id: string) => {
    setQuotations(prev => prev.map(q => q.id === id ? { ...q, isArchived: true, updatedAt: new Date().toISOString() } : q));
  };

  const duplicateManualQuotation = (id: string): ManualQuotation => {
    const source = quotations.find(q => q.id === id);
    if (!source) throw new Error('Quotation not found');
    const quotationNumber = getNextQuotationNumber();
    const duplicated: ManualQuotation = {
      ...JSON.parse(JSON.stringify(source)),
      id: `qtn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      quotationNumber,
      status: 'Draft',
      selectedModel: 'Not Decided',
      confirmationDate: undefined,
      version: 1,
      history: [],
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setQuotations(prev => [duplicated, ...prev]);
    return duplicated;
  };

  const updateQuotationStatus = (id: string, status: QuotationStatus, selectedModel?: CustomerModelSelection) => {
    setQuotations(prev => prev.map(q => {
      if (q.id !== id) return q;
      const isConfirming = status === 'Confirmed';
      return {
        ...q,
        status,
        selectedModel: selectedModel !== undefined ? selectedModel : q.selectedModel,
        confirmationDate: isConfirming ? (q.confirmationDate || new Date().toISOString().split('T')[0]) : q.confirmationDate,
        updatedAt: new Date().toISOString(),
      };
    }));
  };

  // Catalogue Management
  const addQuotationCategory = (name: string): QuotationCategory => {
    const newCat: QuotationCategory = {
      id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };
    setQuotationCategories(prev => [...prev, newCat]);
    return newCat;
  };

  const updateQuotationCategory = (id: string, name: string) => {
    setQuotationCategories(prev => prev.map(c => c.id === id ? { ...c, name: name.trim() } : c));
  };

  const deleteQuotationCategory = (id: string) => {
    setQuotationCategories(prev => prev.map(c => c.id === id ? { ...c, isDeleted: true } : c));
  };

  const addQuotationSubcategory = (categoryId: string, name: string): QuotationSubcategory => {
    const newSub: QuotationSubcategory = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      categoryId,
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };
    setQuotationSubcategories(prev => [...prev, newSub]);
    return newSub;
  };

  const updateQuotationSubcategory = (id: string, name: string) => {
    setQuotationSubcategories(prev => prev.map(s => s.id === id ? { ...s, name: name.trim() } : s));
  };

  const deleteQuotationSubcategory = (id: string) => {
    setQuotationSubcategories(prev => prev.map(s => s.id === id ? { ...s, isDeleted: true } : s));
  };

  const addQuotationProduct = (prod: Omit<QuotationProduct, 'id' | 'createdAt' | 'updatedAt'>): QuotationProduct => {
    const newProd: QuotationProduct = {
      ...prod,
      id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setQuotationProducts(prev => [newProd, ...prev]);
    if (prod.brand && !quotationBrands.includes(prod.brand)) {
      addQuotationBrand(prod.brand);
    }
    return newProd;
  };

  const updateQuotationProduct = (id: string, updates: Partial<QuotationProduct>) => {
    setQuotationProducts(prev => prev.map(p => {
      if (p.id !== id) return p;
      return { ...p, ...updates, updatedAt: new Date().toISOString() };
    }));
    if (updates.brand && !quotationBrands.includes(updates.brand)) {
      addQuotationBrand(updates.brand);
    }
  };

  const deleteQuotationProduct = (id: string) => {
    setQuotationProducts(prev => prev.map(p => p.id === id ? { ...p, isDeleted: true, updatedAt: new Date().toISOString() } : p));
  };

  const restoreQuotationProduct = (id: string) => {
    setQuotationProducts(prev => prev.map(p => p.id === id ? { ...p, isDeleted: false, updatedAt: new Date().toISOString() } : p));
  };

  const addQuotationBrand = (brand: string) => {
    const trimmed = brand.trim();
    if (!trimmed) return;
    setQuotationBrands(prev => {
      if (prev.some(b => b.toLowerCase() === trimmed.toLowerCase())) return prev;
      return [...prev, trimmed];
    });
  };

  const updateProductLatestPrice = (productId: string, newPrice: number) => {
    if (!productId || isNaN(newPrice)) return;
    setQuotationProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return { ...p, latestQuotationPrice: newPrice, updatedAt: new Date().toISOString() };
      }
      return p;
    }));
  };

  // Price Code Mapping Handlers
  const updatePriceCodeMapping = (newMapping: PriceCodeMapping, notes?: string): { success: boolean; error?: string } => {
    const val = validateMapping(newMapping);
    if (!val.isValid) {
      return { success: false, error: val.error || 'Invalid mapping' };
    }

    const normalized: PriceCodeMapping = {
      '0': newMapping['0'].trim().toUpperCase(),
      '1': newMapping['1'].trim().toUpperCase(),
      '2': newMapping['2'].trim().toUpperCase(),
      '3': newMapping['3'].trim().toUpperCase(),
      '4': newMapping['4'].trim().toUpperCase(),
      '5': newMapping['5'].trim().toUpperCase(),
      '6': newMapping['6'].trim().toUpperCase(),
      '7': newMapping['7'].trim().toUpperCase(),
      '8': newMapping['8'].trim().toUpperCase(),
      '9': newMapping['9'].trim().toUpperCase(),
    };

    const nextVer = (priceCodeMappingVersions[0]?.version || 1) + 1;
    const newVersionObj: PriceCodeMappingVersion = {
      version: nextVer,
      mapping: normalized,
      createdAt: new Date().toISOString(),
      changedBy: 'CRM User',
      notes: notes || `Custom Price Code Mapping v${nextVer}`,
    };

    setPriceCodeMappingVersions(prev => [newVersionObj, ...prev]);
    setActivePriceCodeMapping(normalized);
    return { success: true };
  };

  const resetPriceCodeMappingToDefault = () => {
    const nextVer = (priceCodeMappingVersions[0]?.version || 1) + 1;
    const defaultVersionObj: PriceCodeMappingVersion = {
      version: nextVer,
      mapping: DEFAULT_PRICE_CODE_MAPPING,
      createdAt: new Date().toISOString(),
      changedBy: 'CRM User',
      notes: `Reset to Default SGS Mapping (v${nextVer})`,
    };
    setPriceCodeMappingVersions(prev => [defaultVersionObj, ...prev]);
    setActivePriceCodeMapping(DEFAULT_PRICE_CODE_MAPPING);
  };

  // System Tools - Clear All Input Data (Start 100% Fresh with 0 records)
  const clearAllInputData = () => {
    setCustomers([]);
    setJobCards([]);
    setInventory([]);
    setVendorBills([]);
    setStockTransactions([]);
    setInvoices([]);
    setCashFlow([]);
    setLeadSources([]);
    setVendors([]);
    setEmployees([]);
    setAttendanceRecords([]);
    setSalaryPayments([]);
    setWorkAllocations([]);
    setSalaryAdvances([]);
    setQuotations([]);

    try {
      localStorage.setItem(`${STORAGE_KEY}_customers`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_jobs`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_inventory`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_vendor_bills`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_stock_tx`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_invoices`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_cashflow`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_lead_sources`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_vendors`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_employees`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_salaries`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_work_allocations`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_salary_advances`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_quotations`, JSON.stringify([]));
      localStorage.setItem(FRESH_CLEARED_KEY, 'true');

      try {
        localStorage.removeItem('sgs_billing_draft');
      } catch {}
    } catch (e) {
      console.warn('Failed to clear localStorage keys', e);
    }
  };

  // System Tools - Factory Defaults Demo Reset
  const resetToDefaultData = () => {
    // Deep clone seeds to ensure no in-memory mutation contaminates the fresh reset
    const freshCustomers = JSON.parse(JSON.stringify(SEED_CUSTOMERS));
    const freshJobs = JSON.parse(JSON.stringify(SEED_JOB_CARDS));
    const freshInventory = JSON.parse(JSON.stringify(SEED_INVENTORY));
    const freshVendorBills = JSON.parse(JSON.stringify(SEED_VENDOR_BILLS));
    const freshStockTx = JSON.parse(JSON.stringify(SEED_STOCK_TRANSACTIONS));
    const freshInvoices = JSON.parse(JSON.stringify(SEED_INVOICES));
    const freshCashFlow = JSON.parse(JSON.stringify(SEED_CASH_FLOW));
    const freshAdminSettings = JSON.parse(JSON.stringify(DEFAULT_ADMIN_SETTINGS));
    const freshLeadSources = JSON.parse(JSON.stringify(SEED_LEAD_SOURCES));
    const freshVendors = JSON.parse(JSON.stringify(SEED_VENDORS));
    const freshEmployees = JSON.parse(JSON.stringify(SEED_EMPLOYEES));
    const freshAttendance = JSON.parse(JSON.stringify(SEED_ATTENDANCE));
    const freshSalaries = JSON.parse(JSON.stringify(SEED_SALARIES));
    const freshWorkAllocations = JSON.parse(JSON.stringify(SEED_WORK_ALLOCATIONS));
    const freshSalaryAdvances = JSON.parse(JSON.stringify(SEED_SALARY_ADVANCES));

    setCustomers(freshCustomers);
    setJobCards(freshJobs);
    setInventory(freshInventory);
    setVendorBills(freshVendorBills);
    setStockTransactions(freshStockTx);
    setInvoices(freshInvoices);
    setCashFlow(freshCashFlow);
    setAdminSettings(freshAdminSettings);
    setLeadSources(freshLeadSources);
    setVendors(freshVendors);
    setEmployees(freshEmployees);
    setAttendanceRecords(freshAttendance);
    setSalaryPayments(freshSalaries);
    setWorkAllocations(freshWorkAllocations);
    setSalaryAdvances(freshSalaryAdvances);
    setQuotations([]);
    setQuotationCategories(INITIAL_QUOTATION_CATEGORIES);
    setQuotationSubcategories(INITIAL_QUOTATION_SUBCATEGORIES);
    setQuotationProducts(INITIAL_QUOTATION_PRODUCTS);
    setQuotationBrands(INITIAL_QUOTATION_BRANDS);

    try {
      localStorage.clear();

      localStorage.setItem(`${STORAGE_KEY}_customers`, JSON.stringify(freshCustomers));
      localStorage.setItem(`${STORAGE_KEY}_jobs`, JSON.stringify(freshJobs));
      localStorage.setItem(`${STORAGE_KEY}_inventory`, JSON.stringify(freshInventory));
      localStorage.setItem(`${STORAGE_KEY}_vendor_bills`, JSON.stringify(freshVendorBills));
      localStorage.setItem(`${STORAGE_KEY}_stock_tx`, JSON.stringify(freshStockTx));
      localStorage.setItem(`${STORAGE_KEY}_invoices`, JSON.stringify(freshInvoices));
      localStorage.setItem(`${STORAGE_KEY}_cashflow`, JSON.stringify(freshCashFlow));
      localStorage.setItem(`${STORAGE_KEY}_admin_settings`, JSON.stringify(freshAdminSettings));
      localStorage.setItem(`${STORAGE_KEY}_lead_sources`, JSON.stringify(freshLeadSources));
      localStorage.setItem(`${STORAGE_KEY}_vendors`, JSON.stringify(freshVendors));
      localStorage.setItem(`${STORAGE_KEY}_employees`, JSON.stringify(freshEmployees));
      localStorage.setItem(`${STORAGE_KEY}_attendance`, JSON.stringify(freshAttendance));
      localStorage.setItem(`${STORAGE_KEY}_salaries`, JSON.stringify(freshSalaries));
      localStorage.setItem(`${STORAGE_KEY}_work_allocations`, JSON.stringify(freshWorkAllocations));
      localStorage.setItem(`${STORAGE_KEY}_salary_advances`, JSON.stringify(freshSalaryAdvances));
      localStorage.setItem(`${STORAGE_KEY}_quotations`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_q_categories`, JSON.stringify(INITIAL_QUOTATION_CATEGORIES));
      localStorage.setItem(`${STORAGE_KEY}_q_subcategories`, JSON.stringify(INITIAL_QUOTATION_SUBCATEGORIES));
      localStorage.setItem(`${STORAGE_KEY}_q_products`, JSON.stringify(INITIAL_QUOTATION_PRODUCTS));
      localStorage.setItem(`${STORAGE_KEY}_q_brands`, JSON.stringify(INITIAL_QUOTATION_BRANDS));
      localStorage.setItem(`${STORAGE_KEY}_price_code_mapping`, JSON.stringify(DEFAULT_PRICE_CODE_MAPPING));
      localStorage.setItem(`${STORAGE_KEY}_price_code_versions`, JSON.stringify([INITIAL_PRICE_CODE_VERSION]));
      localStorage.setItem(FRESH_CLEARED_KEY, 'demo_loaded');

      // Clear any pending billing drafts or temporary caches
      try {
        localStorage.removeItem('sgs_billing_draft');
      } catch {}
    } catch (e) {
      console.warn('Failed to reset localStorage keys', e);
    }
  };

  const exportDataJson = () => {
    const fullBackup = {
      timestamp: new Date().toISOString(),
      company: 'Spider Grid Solutions',
      adminSettings,
      customers,
      jobCards,
      vendorBills,
      inventory,
      stockTransactions,
      invoices,
      cashFlow,
      leadSources,
      vendors,
      employees,
      attendanceRecords,
      salaryPayments,
      workAllocations,
      salaryAdvances,
      quotations,
      quotationCategories,
      quotationSubcategories,
      quotationProducts,
      quotationBrands,
      activePriceCodeMapping,
      priceCodeMappingVersions,
    };
    return JSON.stringify(fullBackup, null, 2);
  };

  const importDataJson = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.adminSettings) setAdminSettings(parsed.adminSettings);
      if (parsed.customers && Array.isArray(parsed.customers)) setCustomers(parsed.customers);
      if (parsed.jobCards && Array.isArray(parsed.jobCards)) setJobCards(parsed.jobCards);
      if (parsed.vendorBills && Array.isArray(parsed.vendorBills)) setVendorBills(parsed.vendorBills);
      if (parsed.inventory && Array.isArray(parsed.inventory)) setInventory(parsed.inventory);
      if (parsed.stockTransactions && Array.isArray(parsed.stockTransactions)) setStockTransactions(parsed.stockTransactions);
      if (parsed.invoices && Array.isArray(parsed.invoices)) setInvoices(parsed.invoices);
      if (parsed.cashFlow && Array.isArray(parsed.cashFlow)) setCashFlow(parsed.cashFlow);
      if (parsed.leadSources && Array.isArray(parsed.leadSources)) setLeadSources(parsed.leadSources);
      if (parsed.vendors && Array.isArray(parsed.vendors)) setVendors(parsed.vendors);
      if (parsed.employees && Array.isArray(parsed.employees)) setEmployees(parsed.employees);
      if (parsed.attendanceRecords && Array.isArray(parsed.attendanceRecords)) setAttendanceRecords(parsed.attendanceRecords);
      if (parsed.salaryPayments && Array.isArray(parsed.salaryPayments)) setSalaryPayments(parsed.salaryPayments);
      if (parsed.workAllocations && Array.isArray(parsed.workAllocations)) setWorkAllocations(parsed.workAllocations);
      if (parsed.salaryAdvances && Array.isArray(parsed.salaryAdvances)) setSalaryAdvances(parsed.salaryAdvances);
      if (parsed.quotations && Array.isArray(parsed.quotations)) setQuotations(parsed.quotations);
      if (parsed.quotationCategories && Array.isArray(parsed.quotationCategories)) setQuotationCategories(parsed.quotationCategories);
      if (parsed.quotationSubcategories && Array.isArray(parsed.quotationSubcategories)) setQuotationSubcategories(parsed.quotationSubcategories);
      if (parsed.quotationProducts && Array.isArray(parsed.quotationProducts)) setQuotationProducts(parsed.quotationProducts);
      if (parsed.quotationBrands && Array.isArray(parsed.quotationBrands)) setQuotationBrands(parsed.quotationBrands);
      if (parsed.activePriceCodeMapping && typeof parsed.activePriceCodeMapping === 'object') {
        setActivePriceCodeMapping(parsed.activePriceCodeMapping);
      }
      if (parsed.priceCodeMappingVersions && Array.isArray(parsed.priceCodeMappingVersions)) {
        setPriceCodeMappingVersions(parsed.priceCodeMappingVersions);
      }
      return true;
    } catch (e) {
      console.error('Invalid JSON file format for import:', e);
      return false;
    }
  };

  // Dynamic WhatsApp Message Generator with Admin Custom Templates
  const getWhatsAppLinks = (job: JobCard) => {
    const cleanPhone = job.customerPhone ? job.customerPhone.replace(/[^0-9]/g, '') : '';
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const statusTitleMap: Record<JobStatus, string> = {
      received: 'Intake Registered & In Inspection',
      in_process: 'Diagnosis & Repair In Progress',
      quotation_pending: 'Quotation Ready - Awaiting Approval',
      waiting_parts: 'Waiting for Spares / Replacement Parts',
      customer_approval: 'Quotation Approved by Customer',
      customer_discussion: 'Technical Discussion with Customer',
      work_completed: 'Service Completed & Quality Checked',
      billed: 'Invoice Generated',
      payment_pending: 'Payment Pending - Awaiting Clearance',
      pickup_ready: 'Device Ready for Pickup',
      completed: 'Work Completed - Ready for Pickup / Delivery',
      delivered: 'Delivered & Handed Over',
      hold: 'Job Temporarily On Hold',
      other: 'Workshop Special Process Stage',
    };

    const replaceTags = (template: string) => {
      const amountNum = job.finalCost > 0 ? job.finalCost : (job.estimatedCost || 0);
      const paidNum = job.advancePaid || 0;
      const pendingNum = Math.max(0, amountNum - paidNum);
      const amountVal = amountNum.toLocaleString('en-IN');
      const paidVal = paidNum.toLocaleString('en-IN');
      const pendingVal = pendingNum.toLocaleString('en-IN');

      return template
        .replace(/{customerName}/g, job.customerName || 'Customer')
        .replace(/{jobId}/g, job.jobId || '')
        .replace(/{category}/g, (job.category || 'Device').toUpperCase())
        .replace(/{deviceBrand}/g, job.deviceBrand || '')
        .replace(/{reportedIssue}/g, job.issueDescription || '')
        .replace(/{intakeDate}/g, job.intakeDate || '')
        .replace(/{estimatedDelivery}/g, job.estimatedDelivery || '2-3 Business Days')
        .replace(/{estimatedCost}/g, (job.estimatedCost || 0).toLocaleString('en-IN'))
        .replace(/{status}/g, statusTitleMap[job.status] || job.status.toUpperCase())
        .replace(/{technicianNotes}/g, job.technicianNotes || 'Quality inspection in progress')
        .replace(/{amount}/g, amountVal)
        .replace(/{paidAmount}/g, paidVal)
        .replace(/{pendingBalance}/g, pendingVal)
        .replace(/{workshopUpiId}/g, adminSettings.workshopUpiId || '9176795665@okbizaxis')
        .replace(/{googleReviewUrl}/g, adminSettings.googleReviewUrl || 'https://g.page/r/spidergridsolutions/review')
        .replace(/{workshopPhone}/g, adminSettings.workshopPhone || '+91 9176795665');
    };

    const welcomeMessage = replaceTags(adminSettings.welcomeMessageTemplate || DEFAULT_ADMIN_SETTINGS.welcomeMessageTemplate);
    const statusMessage = replaceTags(adminSettings.statusMessageTemplate || DEFAULT_ADMIN_SETTINGS.statusMessageTemplate);
    const reviewMessage = replaceTags(adminSettings.reviewMessageTemplate || DEFAULT_ADMIN_SETTINGS.reviewMessageTemplate);
    const paymentPendingMessage = replaceTags(adminSettings.paymentPendingMessageTemplate || DEFAULT_ADMIN_SETTINGS.paymentPendingMessageTemplate || '');

    const welcomeUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(welcomeMessage)}`;
    const statusUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(statusMessage)}`;
    const reviewUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(reviewMessage)}`;
    const paymentPendingUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(paymentPendingMessage)}`;

    return {
      welcomeMessage,
      welcomeUrl,
      statusMessage,
      statusUrl,
      reviewMessage,
      reviewUrl,
      paymentPendingMessage,
      paymentPendingUrl,
    };
  };

  return (
    <SgsContext.Provider
      value={{
        customers,
        jobCards,
        vendorBills,
        inventory,
        stockTransactions,
        invoices,
        cashFlow,
        adminSettings,
        leadSources,
        vendors,
        employees,
        attendanceRecords,
        salaryPayments,
        workAllocations,
        salaryAdvances,
        quotations,
        quotationCategories,
        quotationSubcategories,
        quotationProducts,
        quotationBrands,
        activePriceCodeMapping,
        priceCodeMappingVersions,
        updatePriceCodeMapping,
        resetPriceCodeMappingToDefault,
        addManualQuotation,
        updateManualQuotation,
        deleteManualQuotation,
        duplicateManualQuotation,
        updateQuotationStatus,
        addQuotationCategory,
        updateQuotationCategory,
        deleteQuotationCategory,
        addQuotationSubcategory,
        updateQuotationSubcategory,
        deleteQuotationSubcategory,
        addQuotationProduct,
        updateQuotationProduct,
        deleteQuotationProduct,
        restoreQuotationProduct,
        addQuotationBrand,
        updateProductLatestPrice,
        getNextQuotationNumber,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        syncCustomerToContacts,
        updateCustomerCommission,
        addLeadSource,
        updateLeadSource,
        deleteLeadSource,
        toggleLeadSyncedContacts,
        addVendor,
        updateVendor,
        deleteVendor,
        generateVCard,
        downloadVCard,
        addJobCard,
        updateJobCardStatus,
        updateJobCard,
        deleteJobCard,
        toggleCallCompleted,
        addJobTimelineEvent,
        toggleLinkJobAndVendorBill,
        addVendorBill,
        updateVendorBillPayment,
        updateVendorBill,
        deleteVendorBill,
        addInventoryItem,
        updateInventoryItem,
        deleteInventoryItem,
        linkInventoryToVendorBill,
        recordStockMovement,
        addInvoice,
        updateInvoice,
        updateInvoicePayment,
        cancelInvoice,
        duplicateInvoice,
        deleteInvoice,
        convertQuotationToInvoice,
        addCashFlowEntry,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        markAttendance,
        updateAttendanceRecord,
        recordSalaryPayment,
        recordSalaryInstallment,
        allocateWorkToEmployee,
        removeWorkAllocation,
        shareJobToEmployeeWhatsApp,
        updateJobPriority,
        assignJobToEmployee,
        bulkAssignJobs,
        submitWorkCompletion,
        closeJobCard,
        reopenJobCard,
        addSalaryAdvance,
        recordAdvanceRepayment,
        updateAdminSettings,
        resetAdminSettings,
        clearAllInputData,
        resetToDefaultData,
        exportDataJson,
        importDataJson,
        getWhatsAppLinks,
        theme,
        toggleTheme,
        setTheme,
        // RBAC via Firestore allowed_users & Mandatory Auth
        isAuthenticated,
        isAuthLoading,
        handleAuthSuccess,
        logout,
        currentUserEmail,
        setCurrentUserEmail,
        currentUserRole,
        setCurrentUserRole,
        isAdmin,
        canDelete,
        canEditCritical,
        allowedUsers,
        refreshAllowedUsers,
        saveAllowedUser,
        deleteAllowedUser,
      }}
    >
      {children}
    </SgsContext.Provider>
  );
};

export const useSgs = () => {
  const context = useContext(SgsContext);
  if (!context) {
    throw new Error('useSgs must be used within an SgsProvider');
  }
  return context;
};
