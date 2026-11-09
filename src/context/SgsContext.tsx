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
  SalaryAdvance
} from '../types';
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
        return {
          ...DEFAULT_ADMIN_SETTINGS,
          ...parsed,
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
          referralCommissionPaidDate: status === 'paid' ? (c.referralCommissionPaidDate || new Date().toISOString().split('T')[0]) : undefined,
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
      updatedAt: new Date().toISOString().split('T')[0],
      callCompleted: false,
    };

    setJobCards(prev => [newJob, ...prev]);
    return newJob;
  };

  const updateJobCardStatus = (id: string, status: JobStatus, notes?: string) => {
    setJobCards(prev => prev.map(job => {
      if (job.id === id) {
        return {
          ...job,
          status,
          technicianNotes: notes !== undefined ? notes : job.technicianNotes,
          updatedAt: new Date().toISOString().split('T')[0],
        };
      }
      return job;
    }));

    if (status === 'work_completed' || status === 'completed' || status === 'delivered') {
      setWorkAllocations(prev => prev.filter(a => a.jobCardId !== id));
    }
  };

  const updateJobCard = (id: string, updates: Partial<JobCard>) => {
    setJobCards(prev => prev.map(job => {
      if (job.id === id) {
        return {
          ...job,
          ...updates,
          updatedAt: new Date().toISOString().split('T')[0],
        };
      }
      return job;
    }));

    if (updates.status === 'work_completed' || updates.status === 'completed' || updates.status === 'delivered') {
      setWorkAllocations(prev => prev.filter(a => a.jobCardId !== id));
    }
  };

  const deleteJobCard = (id: string) => {
    setJobCards(prev => prev.filter(j => j.id !== id));
    setWorkAllocations(prev => prev.filter(a => a.jobCardId !== id));
  };

  const toggleCallCompleted = (id: string, completed?: boolean) => {
    setJobCards(prev => prev.map(job => {
      if (job.id === id) {
        const nextState = completed !== undefined ? completed : !job.callCompleted;
        return {
          ...job,
          callCompleted: nextState,
          lastCalledAt: nextState ? new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : undefined,
          updatedAt: new Date().toISOString().split('T')[0],
        };
      }
      return job;
    }));
  };

  const addJobTimelineEvent = (jobId: string, eventData: Omit<import('../types').JobTimelineEvent, 'id'>) => {
    const newEvent: import('../types').JobTimelineEvent = {
      ...eventData,
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: eventData.timestamp || new Date().toISOString(),
    };

    setJobCards(prev => prev.map(job => {
      if (job.id === jobId) {
        const existingTimeline = job.timeline || [];
        return {
          ...job,
          timeline: [...existingTimeline, newEvent],
          updatedAt: new Date().toISOString().split('T')[0],
        };
      }
      return job;
    }));
  };

  // Vendor Bill handlers
  const addVendorBill = (billData: Omit<VendorBill, 'id' | 'createdAt'>, updateStock = true): VendorBill => {
    const newBill: VendorBill = {
      ...billData,
      id: `bill-${Date.now()}`,
      createdAt: new Date().toISOString(),
      paymentDate: billData.paymentDate || new Date().toISOString().split('T')[0],
    };

    setVendorBills(prev => [newBill, ...prev]);

    // Update stock if requested
    if (updateStock && billData.items && billData.items.length > 0) {
      billData.items.forEach(item => {
        const cleanBillItemName = item.itemName.trim().toLowerCase();
        // Exact match check only (case-insensitive) - never loose substring includes!
        // Prevents "HP" matching "HP 12A Toner Cartridge" or "Dell" matching "Dell OptiPlex Power Supply"
        const targetExisting = item.matchedInventoryId 
          ? inventory.find(i => i.id === item.matchedInventoryId)
          : (item.syncMode !== 'create_separate'
              ? inventory.find(i => i.name.trim().toLowerCase() === cleanBillItemName)
              : undefined);

        if (targetExisting && item.syncMode !== 'create_separate') {
          // Merge into existing stock item
          recordStockMovement(targetExisting.id, 'in', item.quantity, `Vendor Purchase (${newBill.vendorName} - Inv #${newBill.invoiceNumber})`, undefined);
          updateInventoryItem(targetExisting.id, {
            unitCost: item.unitCost > 0 ? item.unitCost : targetExisting.unitCost,
            vendorBillId: newBill.id,
            vendorName: newBill.vendorName,
            vendorInvoiceNumber: newBill.invoiceNumber,
            vendorBillDate: newBill.invoiceDate,
            hsnCode: item.hsnCode || targetExisting.hsnCode,
          });
        } else {
          // Add as separate new stock item
          const created = addInventoryItem({
            name: item.itemName,
            category: 'general',
            currentStock: item.quantity,
            minStockAlert: 2,
            unitCost: item.unitCost,
            unitPrice: Math.round(item.unitCost * 1.35),
            sku: `SP-${Date.now().toString().slice(-4)}`,
            location: 'Main Shelf',
            hsnCode: item.hsnCode || '8471',
            vendorBillId: newBill.id,
            vendorName: newBill.vendorName,
            vendorInvoiceNumber: newBill.invoiceNumber,
            vendorBillDate: newBill.invoiceDate,
          });
          const tx: StockTransaction = {
            id: `st-${Date.now()}-${Math.random()}`,
            itemId: created.id,
            itemName: created.name,
            type: 'in',
            quantity: item.quantity,
            date: newBill.invoiceDate,
            reason: `Vendor Bill ${newBill.invoiceNumber}`,
            referenceBillId: newBill.id,
          };
          setStockTransactions(prev => [tx, ...prev]);
        }
      });
    }

    // Record cashflow expense if payment made
    if (newBill.paidAmount > 0) {
      const cfEntry: CashFlowEntry = {
        id: `cf-${Date.now()}`,
        date: newBill.invoiceDate,
        type: 'expense',
        category: 'Vendor Spares',
        description: `Vendor: ${newBill.vendorName} (Inv: ${newBill.invoiceNumber})`,
        amount: newBill.paidAmount,
        paymentMode: newBill.paymentMode || 'upi',
        referenceId: newBill.id,
        referenceNumber: newBill.paymentReference,
      };
      setCashFlow(prev => [cfEntry, ...prev]);
    }

    return newBill;
  };

  const updateVendorBillPayment = (
    id: string, 
    paidAmount: number, 
    paymentStatus: 'paid' | 'pending' | 'partial',
    paymentMode?: PaymentMode,
    paymentReference?: string
  ) => {
    setVendorBills(prev => prev.map(b => {
      if (b.id === id) {
        const delta = paidAmount - b.paidAmount;
        if (delta > 0) {
          const cfEntry: CashFlowEntry = {
            id: `cf-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            type: 'expense',
            category: 'Vendor Spares',
            description: `Payment to ${b.vendorName} (Inv: ${b.invoiceNumber})`,
            amount: delta,
            paymentMode: paymentMode || b.paymentMode || 'upi',
            referenceId: b.id,
            referenceNumber: paymentReference || b.paymentReference,
          };
          setCashFlow(cf => [cfEntry, ...cf]);
        }
        return { 
          ...b, 
          paidAmount, 
          paymentStatus,
          paymentMode: paymentMode || b.paymentMode,
          paymentReference: paymentReference !== undefined ? paymentReference : b.paymentReference,
          paymentDate: new Date().toISOString().split('T')[0]
        };
      }
      return b;
    }));
  };

  const updateVendorBill = (id: string, updates: Partial<VendorBill>) => {
    setVendorBills(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const deleteVendorBill = (id: string) => {
    // 1. Remove associated cashflow entry so cash balance is restored
    setCashFlow(prev => prev.filter(c => c.referenceId !== id));
    // 2. Remove stock transactions referencing this bill
    setStockTransactions(prev => prev.filter(st => st.referenceBillId !== id));
    // 3. Remove bill
    setVendorBills(prev => prev.filter(b => b.id !== id));
  };

  // Inventory handlers
  const addInventoryItem = (itemData: Omit<InventoryItem, 'id' | 'updatedAt'>): InventoryItem => {
    const newItem: InventoryItem = {
      ...itemData,
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setInventory(prev => [newItem, ...prev]);
    return newItem;
  };

  const updateInventoryItem = (id: string, updates: Partial<InventoryItem>) => {
    setInventory(prev => prev.map(item => item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString().split('T')[0] } : item));
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
          updatedAt: new Date().toISOString().split('T')[0],
        };
      }
      return item;
    }));
  };

  const recordStockMovement = (itemId: string, type: 'in' | 'out', qty: number, reason: string, jobCardId?: string) => {
    const targetItem = inventory.find(i => i.id === itemId);
    if (!targetItem) return;

    setInventory(prev => prev.map(item => {
      if (item.id === itemId) {
        const updatedStock = type === 'in' ? item.currentStock + qty : Math.max(0, item.currentStock - qty);
        return { ...item, currentStock: updatedStock, updatedAt: new Date().toISOString().split('T')[0] };
      }
      return item;
    }));

    const tx: StockTransaction = {
      id: `st-${Date.now()}`,
      itemId,
      itemName: targetItem.name,
      type,
      quantity: qty,
      date: new Date().toISOString().split('T')[0],
      reason,
      jobCardId,
    };
    setStockTransactions(prev => [tx, ...prev]);
  };

  // Invoices & Billing
  const addInvoice = (invoiceData: Omit<Invoice, 'id'>): Invoice => {
    // Auto-compute spare costs with GST and profit: (Sale Amount with GST - Spares Buy Cost with GST - Extra Cost)
    const totalPurchaseCostWithGst = invoiceData.totalPurchaseCostWithGst ?? 
      (invoiceData.items || []).reduce((sum, it) => {
        if (it.isService) return sum;
        const gross = it.purchaseCostWithGst !== undefined 
          ? it.purchaseCostWithGst 
          : (it.purchaseCost ? (it.purchaseCost * (1 + (it.purchaseGstPercent ?? it.gstPercent ?? 18) / 100)) : 0);
        return sum + (gross * (it.quantity || 1));
      }, 0);

    const purchaseCostTotal = invoiceData.purchaseCostTotal ?? 
      (invoiceData.items || []).reduce((sum, it) => sum + ((it.purchaseCost || 0) * (it.quantity || 1)), 0);

    const manualExtraCost = invoiceData.manualExtraCost ?? 0;
    const effectiveSaleAmount = invoiceData.grandTotal ?? Math.max(0, (invoiceData.subtotal || 0) + (invoiceData.taxAmount || 0) - (invoiceData.discount || 0));
    
    // Profit = Sale Amount with GST - Total Spares Buy Cost with GST - Extra Manual Cost
    const profitAmount = invoiceData.profitAmount !== undefined
      ? invoiceData.profitAmount
      : Math.round((effectiveSaleAmount - totalPurchaseCostWithGst - manualExtraCost) * 100) / 100;

    const newInvoice: Invoice = {
      ...invoiceData,
      billingFirm: invoiceData.billingFirm || 'sgs',
      id: `inv-doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      purchaseCostTotal,
      totalPurchaseCostWithGst,
      manualExtraCost,
      profitAmount,
      status: invoiceData.status || 'active',
    };
    setInvoices(prev => [newInvoice, ...prev]);

    // Inventory Stock Reduction:
    // SGS Invoices reduce stock for inventory items (services do not reduce stock)
    // Pandiyan Computers does NOT reduce stock: "Pandiyan Computer has without GST - do not reduce stock only input item names"
    if (newInvoice.billingFirm !== 'pandiyan' && newInvoice.type === 'invoice' && newInvoice.status !== 'cancelled') {
      (newInvoice.items || []).forEach(it => {
        if (!it.isService && it.quantity > 0) {
          const cleanItemName = it.description.trim().toLowerCase();
          const matchedItem = it.inventoryItemId 
            ? inventory.find(i => i.id === it.inventoryItemId)
            : inventory.find(i => i.name.trim().toLowerCase() === cleanItemName);
          if (matchedItem) {
            recordStockMovement(matchedItem.id, 'out', it.quantity, `Invoice Sale: ${newInvoice.invoiceNumber} (${newInvoice.customerName})`, newInvoice.jobCardId);
          }
        }
      });
    }

    // If money received, log to cash flow
    if (newInvoice.paidAmount > 0 && newInvoice.status !== 'cancelled') {
      const cfEntry: CashFlowEntry = {
        id: `cf-${Date.now()}`,
        date: newInvoice.date,
        type: 'income',
        category: newInvoice.type === 'invoice' ? 'Service Charge' : 'Advance Payment',
        description: `Customer: ${newInvoice.customerName} (${newInvoice.invoiceNumber}) [${newInvoice.billingFirm === 'pandiyan' ? 'Pandiyan Computers' : 'SGS'}]`,
        amount: newInvoice.paidAmount,
        paymentMode: newInvoice.paymentMode,
        referenceId: newInvoice.id,
        referenceNumber: newInvoice.paymentReference,
      };
      setCashFlow(prev => [cfEntry, ...prev]);
    }

    return newInvoice;
  };

  const updateInvoice = (id: string, updates: Partial<Invoice>) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        const merged = { ...inv, ...updates };
        // Recalculate profit if items, subtotal, discount, or extra costs changed
        if (updates.profitAmount !== undefined) {
          merged.profitAmount = updates.profitAmount;
        } else if (updates.items || updates.subtotal !== undefined || updates.grandTotal !== undefined || updates.manualExtraCost !== undefined || updates.discount !== undefined) {
          const totalPurchaseCostWithGst = updates.totalPurchaseCostWithGst !== undefined 
            ? updates.totalPurchaseCostWithGst 
            : (merged.items || []).reduce((sum, it) => {
                if (it.isService) return sum;
                const gross = it.purchaseCostWithGst !== undefined 
                  ? it.purchaseCostWithGst 
                  : (it.purchaseCost ? (it.purchaseCost * (1 + (it.purchaseGstPercent ?? it.gstPercent ?? 18) / 100)) : 0);
                return sum + (gross * (it.quantity || 1));
              }, 0);
          const purchaseCostTotal = updates.purchaseCostTotal !== undefined 
            ? updates.purchaseCostTotal 
            : (merged.items || []).reduce((sum, it) => sum + ((it.purchaseCost || 0) * (it.quantity || 1)), 0);
          const manualExtraCost = merged.manualExtraCost ?? 0;
          const effectiveSaleAmount = merged.grandTotal ?? Math.max(0, (merged.subtotal || 0) + (merged.taxAmount || 0) - (merged.discount || 0));
          merged.totalPurchaseCostWithGst = totalPurchaseCostWithGst;
          merged.purchaseCostTotal = purchaseCostTotal;
          merged.profitAmount = Math.round((effectiveSaleAmount - totalPurchaseCostWithGst - manualExtraCost) * 100) / 100;
        }
        return merged;
      }
      return inv;
    }));
  };

  const updateInvoicePayment = (
    id: string, 
    paidAmount: number, 
    status: 'paid' | 'partial' | 'unpaid', 
    mode: PaymentMode,
    paymentReference?: string
  ) => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        const addedAmount = paidAmount - inv.paidAmount;
        if (addedAmount > 0) {
          const cfEntry: CashFlowEntry = {
            id: `cf-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            type: 'income',
            category: 'Service Charge',
            description: `Payment from ${inv.customerName} (${inv.invoiceNumber})`,
            amount: addedAmount,
            paymentMode: mode,
            referenceId: inv.id,
            referenceNumber: paymentReference || inv.paymentReference,
          };
          setCashFlow(cf => [cfEntry, ...cf]);
        }
        return { 
          ...inv, 
          paidAmount, 
          paymentStatus: status, 
          paymentMode: mode,
          paymentReference: paymentReference !== undefined ? paymentReference : inv.paymentReference 
        };
      }
      return inv;
    }));
  };

  const cancelInvoice = (id: string, reason = 'Cancelled by Admin') => {
    const target = invoices.find(inv => inv.id === id);
    if (!target) return;

    // 1. If active SGS sales invoice, restock items that were deducted
    if (target.status === 'active' && target.billingFirm !== 'pandiyan' && target.type === 'invoice') {
      (target.items || []).forEach(it => {
        if (!it.isService && it.quantity > 0) {
          const cleanItemName = it.description.trim().toLowerCase();
          const matchedItem = it.inventoryItemId 
            ? inventory.find(i => i.id === it.inventoryItemId)
            : inventory.find(i => i.name.trim().toLowerCase() === cleanItemName);
          if (matchedItem) {
            recordStockMovement(matchedItem.id, 'in', it.quantity, `Restock (Cancelled ${target.invoiceNumber})`, target.jobCardId);
          }
        }
      });
    }

    // 2. Remove associated cashflow entry so cash balance stays correct
    setCashFlow(prev => prev.filter(c => c.referenceId !== id));

    // 3. Mark invoice as cancelled
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        return {
          ...inv,
          status: 'cancelled',
          paymentStatus: 'cancelled',
          cancelledReason: reason,
        };
      }
      return inv;
    }));
  };

  const duplicateInvoice = (id: string): Invoice => {
    const original = invoices.find(inv => inv.id === id);
    if (!original) {
      throw new Error('Invoice not found for duplication');
    }

    const nextNo = invoices.length + 1045;
    const prefix = original.type === 'quotation' ? 'SGS-QUOT-' : (adminSettings.invoicePrefix || 'SGS-INV-');
    const newInvoiceNumber = `${prefix}${nextNo}`;

    const duplicateDoc: Invoice = {
      ...original,
      id: `inv-doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      invoiceNumber: newInvoiceNumber,
      date: new Date().toISOString().split('T')[0],
      paymentStatus: 'unpaid',
      paidAmount: 0,
      paymentReference: '',
      status: 'active',
      notes: `${original.notes || ''} (Cloned from ${original.invoiceNumber})`.trim(),
    };

    setInvoices(prev => [duplicateDoc, ...prev]);
    return duplicateDoc;
  };

  const deleteInvoice = (id: string) => {
    const target = invoices.find(inv => inv.id === id);
    if (target && target.status === 'active' && target.billingFirm !== 'pandiyan' && target.type === 'invoice') {
      (target.items || []).forEach(it => {
        if (!it.isService && it.quantity > 0) {
          const cleanItemName = it.description.trim().toLowerCase();
          const matchedItem = it.inventoryItemId 
            ? inventory.find(i => i.id === it.inventoryItemId)
            : inventory.find(i => i.name.trim().toLowerCase() === cleanItemName);
          if (matchedItem) {
            recordStockMovement(matchedItem.id, 'in', it.quantity, `Restock (Deleted ${target.invoiceNumber})`, target.jobCardId);
          }
        }
      });
    }
    // Remove linked cash flow entry
    setCashFlow(prev => prev.filter(c => c.referenceId !== id));
    // Remove invoice
    setInvoices(prev => prev.filter(inv => inv.id !== id));
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
      id: `cf-${Date.now()}`,
    };
    setCashFlow(prev => [newEntry, ...prev]);
  };

  // Convert Quotation directly to Official Tax Invoice
  const convertQuotationToInvoice = (quotationId: string): Invoice => {
    const quot = invoices.find(i => i.id === quotationId);
    if (!quot) throw new Error('Quotation not found');

    const isPandiyan = quot.billingFirm === 'pandiyan';
    const allNumbers = invoices
      .filter(i => (isPandiyan ? i.billingFirm === 'pandiyan' : i.billingFirm !== 'pandiyan'))
      .map(i => {
        const match = i.invoiceNumber.match(/\d+$/);
        return match ? parseInt(match[0], 10) : 0;
      });
    const quotMatch = quot.invoiceNumber.match(/\d+$/);
    if (quotMatch) allNumbers.push(parseInt(quotMatch[0], 10));
    const maxNum = allNumbers.length > 0 ? Math.max(...allNumbers) : (isPandiyan ? 500 : 1042);
    const nextNum = Math.max(maxNum + 1, 1043);
    const prefix = isPandiyan ? 'PC-EST-' : (adminSettings.invoicePrefix || 'SGS-INV-');
    const invNum = `${prefix}${nextNum}`;

    const converted: Invoice = {
      ...quot,
      id: quot.id,
      invoiceNumber: invNum,
      type: 'invoice',
      date: new Date().toISOString().split('T')[0],
      notes: quot.notes || (isPandiyan ? 'Converted from Quotation' : 'Converted from Quotation - Spares carry 1-year warranty.'),
    };

    setInvoices(prev => prev.map(i => i.id === quotationId ? converted : i));

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

    if (converted.paidAmount > 0) {
      addCashFlowEntry({
        date: converted.date,
        type: 'income',
        category: 'Service Charge',
        description: `Invoice ${converted.invoiceNumber} - ${converted.customerName}`,
        amount: converted.paidAmount,
        paymentMode: converted.paymentMode || 'upi',
        referenceId: converted.id,
        referenceNumber: converted.paymentReference || '',
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
          allocatedDate: new Date().toISOString().split('T')[0],
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
          updatedAt: new Date().toISOString().split('T')[0],
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
          updatedAt: new Date().toISOString().split('T')[0],
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
          allocatedDate: new Date().toISOString().split('T')[0],
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
          updatedAt: new Date().toISOString().split('T')[0],
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
          updatedAt: new Date().toISOString().split('T')[0],
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
          updatedAt: new Date().toISOString().split('T')[0],
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
          date: new Date().toISOString().split('T')[0],
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
      pickup_ready: 'Device Ready for Pickup',
      completed: 'Work Completed - Ready for Pickup / Delivery',
      delivered: 'Delivered & Handed Over',
      hold: 'Job Temporarily On Hold',
      other: 'Workshop Special Process Stage',
    };

    const replaceTags = (template: string) => {
      const amountVal = (job.finalCost > 0 ? job.finalCost : job.estimatedCost).toLocaleString('en-IN');
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
        .replace(/{googleReviewUrl}/g, adminSettings.googleReviewUrl || 'https://g.page/r/spidergridsolutions/review')
        .replace(/{workshopPhone}/g, adminSettings.workshopPhone || '+91 9677776001');
    };

    const welcomeMessage = replaceTags(adminSettings.welcomeMessageTemplate || DEFAULT_ADMIN_SETTINGS.welcomeMessageTemplate);
    const statusMessage = replaceTags(adminSettings.statusMessageTemplate || DEFAULT_ADMIN_SETTINGS.statusMessageTemplate);
    const reviewMessage = replaceTags(adminSettings.reviewMessageTemplate || DEFAULT_ADMIN_SETTINGS.reviewMessageTemplate);

    const welcomeUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(welcomeMessage)}`;
    const statusUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(statusMessage)}`;
    const reviewUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(reviewMessage)}`;

    return {
      welcomeMessage,
      welcomeUrl,
      statusMessage,
      statusUrl,
      reviewMessage,
      reviewUrl,
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
