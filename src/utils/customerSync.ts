import type { Customer, Invoice, JobCard, JobTimelineEvent, ManualQuotation } from '../types';
import { todayLocal } from './accounting';
import { normalizePhoneDigits } from './moneyFlow';

export interface CustomerSyncResult {
  customers: Customer[];
  jobCards: JobCard[];
  invoices: Invoice[];
  quotations: ManualQuotation[];
  updatedCustomer?: Customer;
  changedJobCards: JobCard[];
  changedInvoices: Invoice[];
  changedQuotations: ManualQuotation[];
}

/**
 * Pure, deterministic synchronization of Customer details (name, phone, area)
 * across Customers, Job Cards, Invoices, and Manual Quotations.
 *
 * - Primary relationship: `customerId === id`
 * - Legacy fallback: normalized 10-digit phone match when record is unlinked or points to a missing customer ID
 * - Avoids duplicate/no-op updates when fields are already up to date
 * - Designed to be called BEFORE React state setters so Firestore writes NEVER happen inside state updater callbacks
 */
export function syncCustomerDetailsAcrossRecords(
  id: string,
  updates: Partial<Customer>,
  data: {
    customers: Customer[];
    jobCards: JobCard[];
    invoices: Invoice[];
    quotations: ManualQuotation[];
  }
): CustomerSyncResult {
  const existingCustomer = data.customers.find(c => c.id === id);
  if (!existingCustomer) {
    return {
      customers: data.customers,
      jobCards: data.jobCards,
      invoices: data.invoices,
      quotations: data.quotations,
      changedJobCards: [],
      changedInvoices: [],
      changedQuotations: [],
    };
  }

  const updatedCustomer: Customer = {
    ...existingCustomer,
    ...updates,
    id: existingCustomer.id,
    createdAt: existingCustomer.createdAt,
  };

  const nextCustomers = data.customers.map(c => (c.id === id ? updatedCustomer : c));

  const nameChanged = updates.name !== undefined && updates.name !== existingCustomer.name;
  const phoneChanged = updates.phone !== undefined && updates.phone !== existingCustomer.phone;
  const areaChanged = updates.area !== undefined && updates.area !== existingCustomer.area;

  if (!nameChanged && !phoneChanged && !areaChanged) {
    return {
      customers: nextCustomers,
      jobCards: data.jobCards,
      invoices: data.invoices,
      quotations: data.quotations,
      updatedCustomer,
      changedJobCards: [],
      changedInvoices: [],
      changedQuotations: [],
    };
  }

  const validCustomerIds = new Set(data.customers.map(c => c.id));
  const existingNormPhone = normalizePhoneDigits(existingCustomer.phone);
  const newNormPhone = normalizePhoneDigits(updatedCustomer.phone);

  const matchesCustomer = (recordCustomerId?: string, recordPhone?: string): boolean => {
    if (recordCustomerId && recordCustomerId === id) return true;
    // Do not hijack records explicitly linked to another valid customer
    if (recordCustomerId && validCustomerIds.has(recordCustomerId) && recordCustomerId !== id) {
      return false;
    }
    const recPhone = normalizePhoneDigits(recordPhone);
    if (!recPhone) return false;
    return Boolean((existingNormPhone && recPhone === existingNormPhone) || (newNormPhone && recPhone === newNormPhone));
  };

  const today = todayLocal();
  const changedJobCards: JobCard[] = [];
  const nextJobCards = data.jobCards.map(job => {
    if (!matchesCustomer(job.customerId, job.customerPhone)) return job;
    const nextCustomerId = job.customerId && validCustomerIds.has(job.customerId) ? job.customerId : id;
    const nextName = updates.name !== undefined ? updates.name : job.customerName;
    const nextPhone = updates.phone !== undefined ? updates.phone : job.customerPhone;
    const nextArea = updates.area !== undefined ? updates.area : job.customerArea;

    if (
      nextCustomerId === job.customerId &&
      nextName === job.customerName &&
      nextPhone === job.customerPhone &&
      nextArea === job.customerArea
    ) {
      return job;
    }

    const updatedJob: JobCard = {
      ...job,
      customerId: nextCustomerId,
      customerName: nextName,
      customerPhone: nextPhone,
      customerArea: nextArea,
      updatedAt: today,
    };
    changedJobCards.push(updatedJob);
    return updatedJob;
  });

  const changedInvoices: Invoice[] = [];
  const nextInvoices = data.invoices.map(inv => {
    if (!matchesCustomer(inv.customerId, inv.customerPhone)) return inv;
    const nextCustomerId = inv.customerId && validCustomerIds.has(inv.customerId) ? inv.customerId : id;
    const nextName = updates.name !== undefined ? updates.name : inv.customerName;
    const nextPhone = updates.phone !== undefined ? updates.phone : inv.customerPhone;
    const nextArea = updates.area !== undefined ? updates.area : inv.customerArea;

    if (
      nextCustomerId === inv.customerId &&
      nextName === inv.customerName &&
      nextPhone === inv.customerPhone &&
      nextArea === inv.customerArea
    ) {
      return inv;
    }

    const updatedInv: Invoice = {
      ...inv,
      customerId: nextCustomerId,
      customerName: nextName,
      customerPhone: nextPhone,
      customerArea: nextArea,
    };
    changedInvoices.push(updatedInv);
    return updatedInv;
  });

  const nowIso = new Date().toISOString();
  const changedQuotations: ManualQuotation[] = [];
  const nextQuotations = data.quotations.map(q => {
    if (!matchesCustomer(q.customerId, q.customerPhone)) return q;
    const nextCustomerId = q.customerId && validCustomerIds.has(q.customerId) ? q.customerId : id;
    const nextName = updates.name !== undefined ? updates.name : q.customerName;
    const nextPhone = updates.phone !== undefined ? updates.phone : q.customerPhone;
    const nextAddress = updates.area !== undefined ? updates.area : q.customerAddress;

    if (
      nextCustomerId === q.customerId &&
      nextName === q.customerName &&
      nextPhone === q.customerPhone &&
      nextAddress === q.customerAddress
    ) {
      return q;
    }

    const updatedQuotation: ManualQuotation = {
      ...q,
      customerId: nextCustomerId,
      customerName: nextName,
      customerPhone: nextPhone,
      customerAddress: nextAddress,
      updatedAt: nowIso,
    };
    changedQuotations.push(updatedQuotation);
    return updatedQuotation;
  });

  return {
    customers: nextCustomers,
    jobCards: nextJobCards,
    invoices: nextInvoices,
    quotations: nextQuotations,
    updatedCustomer,
    changedJobCards,
    changedInvoices,
    changedQuotations,
  };
}

/**
 * Pure helper for editing an existing Job Card in place.
 * Always preserves original `id`, `jobId`, and existing `timeline` history.
 */
export function applyJobCardEdit(
  jobCards: JobCard[],
  id: string,
  updates: Partial<JobCard>,
  auditEvent?: Omit<JobTimelineEvent, 'id'>
): { jobCards: JobCard[]; updatedJob?: JobCard } {
  const existing = jobCards.find(j => j.id === id);
  if (!existing) return { jobCards };

  const baseTimeline = updates.timeline !== undefined ? updates.timeline : (existing.timeline || []);
  const nextTimeline = auditEvent
    ? [
        ...baseTimeline,
        {
          ...auditEvent,
          id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          timestamp: auditEvent.timestamp || new Date().toISOString(),
        },
      ]
    : baseTimeline;

  const updatedJob: JobCard = {
    ...existing,
    ...updates,
    // Strictly preserve original document identity and Job ID
    id: existing.id,
    jobId: existing.jobId,
    timeline: nextTimeline,
    updatedAt: todayLocal(),
  };

  return {
    jobCards: jobCards.map(j => (j.id === id ? updatedJob : j)),
    updatedJob,
  };
}
