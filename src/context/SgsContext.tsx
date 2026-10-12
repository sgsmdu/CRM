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
  Vendor
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
  SEED_VENDORS
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
}

const STORAGE_KEY = 'spider_grid_solutions_db_v1';

const SgsContext = createContext<SgsContextType | undefined>(undefined);

export const SgsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_customers`);
      return stored ? JSON.parse(stored) : SEED_CUSTOMERS;
    } catch {
      return SEED_CUSTOMERS;
    }
  });

  const [jobCards, setJobCards] = useState<JobCard[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_jobs`);
      return stored ? JSON.parse(stored) : SEED_JOB_CARDS;
    } catch {
      return SEED_JOB_CARDS;
    }
  });

  const [vendorBills, setVendorBills] = useState<VendorBill[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_vendor_bills`);
      return stored ? JSON.parse(stored) : SEED_VENDOR_BILLS;
    } catch {
      return SEED_VENDOR_BILLS;
    }
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_inventory`);
      return stored ? JSON.parse(stored) : SEED_INVENTORY;
    } catch {
      return SEED_INVENTORY;
    }
  });

  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_stock_tx`);
      return stored ? JSON.parse(stored) : SEED_STOCK_TRANSACTIONS;
    } catch {
      return SEED_STOCK_TRANSACTIONS;
    }
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_invoices`);
      return stored ? JSON.parse(stored) : SEED_INVOICES;
    } catch {
      return SEED_INVOICES;
    }
  });

  const [cashFlow, setCashFlow] = useState<CashFlowEntry[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_cashflow`);
      return stored ? JSON.parse(stored) : SEED_CASH_FLOW;
    } catch {
      return SEED_CASH_FLOW;
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
      return stored ? JSON.parse(stored) : SEED_LEAD_SOURCES;
    } catch {
      return SEED_LEAD_SOURCES;
    }
  });

  const [vendors, setVendors] = useState<Vendor[]>(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_vendors`);
      return stored ? JSON.parse(stored) : SEED_VENDORS;
    } catch {
      return SEED_VENDORS;
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
  };

  const deleteJobCard = (id: string) => {
    setJobCards(prev => prev.filter(j => j.id !== id));
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
          if (item.hsnCode && !targetExisting.hsnCode) {
            updateInventoryItem(targetExisting.id, { hsnCode: item.hsnCode });
          }
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
    setVendorBills(prev => prev.filter(b => b.id !== id));
  };

  // Inventory handlers
  const addInventoryItem = (itemData: Omit<InventoryItem, 'id' | 'updatedAt'>): InventoryItem => {
    const newItem: InventoryItem = {
      ...itemData,
      id: `inv-${Date.now()}`,
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
    // Auto-compute profit if not provided
    const purchaseCostTotal = invoiceData.purchaseCostTotal ?? 
      (invoiceData.items || []).reduce((sum, it) => sum + ((it.purchaseCost || 0) * (it.quantity || 1)), 0);
    const manualExtraCost = invoiceData.manualExtraCost ?? 0;
    const profitAmount = invoiceData.profitAmount ?? 
      (invoiceData.subtotal - purchaseCostTotal - manualExtraCost);

    const newInvoice: Invoice = {
      ...invoiceData,
      billingFirm: invoiceData.billingFirm || 'sgs',
      id: `inv-doc-${Date.now()}`,
      purchaseCostTotal,
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
          const matchedItem = it.inventoryItemId 
            ? inventory.find(i => i.id === it.inventoryItemId)
            : inventory.find(i => i.name.toLowerCase() === it.description.toLowerCase());
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
        // Recalculate profit if items or costs changed
        if (updates.items || updates.subtotal !== undefined || updates.manualExtraCost !== undefined) {
          const purchaseCostTotal = updates.purchaseCostTotal !== undefined 
            ? updates.purchaseCostTotal 
            : (merged.items || []).reduce((sum, it) => sum + ((it.purchaseCost || 0) * (it.quantity || 1)), 0);
          const manualExtraCost = merged.manualExtraCost ?? 0;
          merged.purchaseCostTotal = purchaseCostTotal;
          merged.profitAmount = merged.subtotal - purchaseCostTotal - manualExtraCost;
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
      id: `inv-doc-${Date.now()}`,
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

  // System Tools
  const resetToDefaultData = () => {
    setCustomers(SEED_CUSTOMERS);
    setJobCards(SEED_JOB_CARDS);
    setInventory(SEED_INVENTORY);
    setVendorBills(SEED_VENDOR_BILLS);
    setStockTransactions(SEED_STOCK_TRANSACTIONS);
    setInvoices(SEED_INVOICES);
    setCashFlow(SEED_CASH_FLOW);
    setAdminSettings(DEFAULT_ADMIN_SETTINGS);
    setLeadSources(SEED_LEAD_SOURCES);
    setVendors(SEED_VENDORS);
    localStorage.clear();
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
        addCashFlowEntry,
        updateAdminSettings,
        resetAdminSettings,
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
