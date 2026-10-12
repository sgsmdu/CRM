import { Customer, LeadSource } from '../types';

export interface GoogleContactPerson {
  resourceName: string;
  etag: string;
  name: string;
  phone: string;
  email?: string;
  organization?: string;
  address?: string;
  notes?: string;
}

/**
 * Fetch contacts list from user's Google Contacts via People API
 */
export async function getGoogleContacts(accessToken: string, pageSize = 100): Promise<GoogleContactPerson[]> {
  const url = `https://people.googleapis.com/v1/people/me/connections?personFields=names,phoneNumbers,emailAddresses,addresses,organizations,biographies&pageSize=${pageSize}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to fetch Google Contacts: ${response.statusText}`);
  }

  const data = await response.json();
  const connections = data.connections || [];

  return connections.map((person: any): GoogleContactPerson => {
    const primaryName = person.names?.[0]?.displayName || person.names?.[0]?.givenName || 'Unnamed Contact';
    const primaryPhone = person.phoneNumbers?.[0]?.value || '';
    const primaryEmail = person.emailAddresses?.[0]?.value || '';
    const primaryOrg = person.organizations?.[0]?.name || '';
    const primaryAddress = person.addresses?.[0]?.formattedValue || '';
    const notes = person.biographies?.[0]?.value || '';

    return {
      resourceName: person.resourceName,
      etag: person.etag,
      name: primaryName,
      phone: primaryPhone,
      email: primaryEmail,
      organization: primaryOrg,
      address: primaryAddress,
      notes,
    };
  });
}

/**
 * Create a new contact in Google Contacts
 */
export async function createGoogleContact(
  accessToken: string,
  details: {
    name: string;
    phone?: string;
    email?: string;
    organization?: string;
    address?: string;
    notes?: string;
  }
): Promise<{ resourceName: string; name: string }> {
  const nameParts = details.name.trim().split(' ');
  const givenName = nameParts[0] || details.name;
  const familyName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

  const personPayload: any = {
    names: [
      {
        givenName,
        familyName,
        displayName: details.name,
      },
    ],
  };

  if (details.phone) {
    personPayload.phoneNumbers = [
      {
        value: details.phone,
        type: 'mobile',
      },
    ];
  }

  if (details.email) {
    personPayload.emailAddresses = [
      {
        value: details.email,
        type: 'work',
      },
    ];
  }

  if (details.organization) {
    personPayload.organizations = [
      {
        name: details.organization,
        title: 'Client / Associate',
      },
    ];
  }

  if (details.address) {
    personPayload.addresses = [
      {
        formattedValue: details.address,
        type: 'work',
      },
    ];
  }

  if (details.notes) {
    personPayload.biographies = [
      {
        value: `[Spider Grid Solutions CRM] ${details.notes}`,
        contentType: 'TEXT_PLAIN',
      },
    ];
  }

  const response = await fetch('https://people.googleapis.com/v1/people:createContact', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(personPayload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to create Google Contact: ${response.statusText}`);
  }

  const result = await response.json();
  return {
    resourceName: result.resourceName,
    name: result.names?.[0]?.displayName || details.name,
  };
}

/**
 * Sync a customer to Google Contacts
 */
export async function syncCustomerToGoogleContacts(
  accessToken: string,
  customer: Customer
): Promise<{ resourceName: string; name: string }> {
  return createGoogleContact(accessToken, {
    name: `${customer.name} (SGS Client)`,
    phone: customer.phone,
    organization: 'Spider Grid Solutions Client',
    address: `${customer.area}, Madurai`,
    notes: `Customer #${customer.slNo} | Reference: ${customer.reference || 'None'} | Notes: ${customer.details || ''}`,
  });
}

/**
 * Sync a Lead Source referrer to Google Contacts
 */
export async function syncLeadSourceToGoogleContacts(
  accessToken: string,
  lead: LeadSource
): Promise<{ resourceName: string; name: string }> {
  return createGoogleContact(accessToken, {
    name: `${lead.name} (SGS Referrer)`,
    phone: lead.phone,
    organization: lead.companyOrOccupation || 'Referral Partner',
    address: `${lead.area}, Madurai`,
    notes: `Lead Category: ${lead.category} | Notes: ${lead.notes || ''} | Next Plan: ${lead.nextMeetingPlan || ''}`,
  });
}
