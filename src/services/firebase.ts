import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  onSnapshot, 
  query, 
  where 
} from 'firebase/firestore';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { AllowedUser, UserRole, JobCard, Invoice, Customer, VendorBill } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Operation types for strict Firestore error handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Initialize or reuse Firebase App with provisioned applet configuration
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
  return errInfo;
}

export const ALLOWED_USERS_COLLECTION = 'allowed_users';
export const JOB_CARDS_COLLECTION = 'job_cards';
export const INVOICES_COLLECTION = 'invoices';
export const CUSTOMERS_COLLECTION = 'customers';
export const VENDOR_BILLS_COLLECTION = 'vendor_bills';
export const QUOTATIONS_COLLECTION = 'quotations';

export const DEFAULT_ADMIN_EMAIL = 'spidergridsolutions@gmail.com';

/**
 * Sign in using Google Popup
 */
export async function signInWithGooglePopup(): Promise<FirebaseUser> {
  try {
    const cred = await signInWithPopup(auth, googleAuthProvider);
    return cred.user;
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes('requests-from-referer') || msg.includes('are-blocked')) {
      console.warn('Google Sign-In blocked by GCP API Key referrer restrictions on this preview domain.');
      const customErr: any = new Error(
        'Google Cloud API Key has HTTP Referrer restrictions in Google Cloud Console that block this development preview domain (ais-dev-*.run.app).'
      );
      customErr.code = 'auth/requests-from-referer-blocked';
      customErr.originalMessage = msg;
      throw customErr;
    }
    console.error('Google Sign In Error:', err);
    throw err;
  }
}

/**
 * Sign out current user
 */
export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Google Sign Out Error:', err);
    throw err;
  }
}

/**
 * Fetch role for a given user email from `allowed_users` collection in Firestore
 */
export async function fetchUserRoleFromFirestore(email: string): Promise<{ role: UserRole; isAuthorized: boolean; userRecord?: AllowedUser }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    return { role: 'user', isAuthorized: false };
  }

  // System owner is always admin & authorized
  const isDefaultOwner = cleanEmail === DEFAULT_ADMIN_EMAIL.toLowerCase();

  try {
    // 1. Direct document check: doc(db, 'allowed_users', cleanEmail)
    const directDocRef = doc(db, ALLOWED_USERS_COLLECTION, cleanEmail);
    const directSnap = await getDoc(directDocRef);

    if (directSnap.exists()) {
      const data = directSnap.data();
      const role: UserRole = data?.role === 'admin' ? 'admin' : 'user';
      return {
        role,
        isAuthorized: true,
        userRecord: {
          id: directSnap.id,
          email: cleanEmail,
          role,
          displayName: data?.displayName || cleanEmail.split('@')[0],
          notes: data?.notes || '',
          createdAt: data?.createdAt || '',
          updatedAt: data?.updatedAt || ''
        }
      };
    }

    // 2. Query check: query(collection(db, 'allowed_users'), where('email', '==', cleanEmail))
    const q = query(collection(db, ALLOWED_USERS_COLLECTION), where('email', '==', cleanEmail));
    const querySnap = await getDocs(q);

    if (!querySnap.empty) {
      const firstDoc = querySnap.docs[0];
      const data = firstDoc.data();
      const role: UserRole = data?.role === 'admin' ? 'admin' : 'user';
      return {
        role,
        isAuthorized: true,
        userRecord: {
          id: firstDoc.id,
          email: cleanEmail,
          role,
          displayName: data?.displayName || cleanEmail.split('@')[0],
          notes: data?.notes || '',
          createdAt: data?.createdAt || '',
          updatedAt: data?.updatedAt || ''
        }
      };
    }

    // 3. If default admin email doesn't exist yet, bootstrap it into Firestore
    if (isDefaultOwner) {
      const bootstrapRecord: AllowedUser = {
        email: cleanEmail,
        role: 'admin',
        displayName: 'Spider Grid Solutions Admin',
        notes: 'Primary Organization Admin Account',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      try {
        await setDoc(directDocRef, bootstrapRecord);
      } catch (e) {
        console.warn('Could not auto-bootstrap admin record:', e);
      }
      return { role: 'admin', isAuthorized: true, userRecord: bootstrapRecord };
    }

    return { role: 'user', isAuthorized: false };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, ALLOWED_USERS_COLLECTION);
    return { role: isDefaultOwner ? 'admin' : 'user', isAuthorized: isDefaultOwner };
  }
}

/**
 * Real-time listener for `allowed_users` list
 */
export function subscribeToAllowedUsers(
  onData: (users: AllowedUser[]) => void,
  onError?: (err: unknown) => void
) {
  try {
    const colRef = collection(db, ALLOWED_USERS_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const users: AllowedUser[] = snapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            email: data.email || d.id,
            role: data.role === 'admin' ? 'admin' : 'user',
            displayName: data.displayName || (data.email ? data.email.split('@')[0] : d.id),
            notes: data.notes || '',
            createdAt: data.createdAt || '',
            updatedAt: data.updatedAt || ''
          };
        });
        onData(users);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, ALLOWED_USERS_COLLECTION);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, ALLOWED_USERS_COLLECTION);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Save / Update user role in `allowed_users`
 */
export async function saveAllowedUserToFirestore(user: AllowedUser): Promise<void> {
  const cleanEmail = user.email.trim().toLowerCase();
  if (!cleanEmail) throw new Error('Email address is required');

  const docRef = doc(db, ALLOWED_USERS_COLLECTION, cleanEmail);
  const payload = {
    email: cleanEmail,
    role: user.role,
    displayName: user.displayName || cleanEmail.split('@')[0],
    notes: user.notes || '',
    updatedAt: new Date().toISOString(),
    ...(user.createdAt ? { createdAt: user.createdAt } : { createdAt: new Date().toISOString() })
  };

  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${ALLOWED_USERS_COLLECTION}/${cleanEmail}`);
    throw err;
  }
}

/**
 * Delete a user from `allowed_users`
 */
export async function deleteAllowedUserFromFirestore(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  if (cleanEmail === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
    throw new Error('Cannot delete the primary organization administrator');
  }

  const docRef = doc(db, ALLOWED_USERS_COLLECTION, cleanEmail);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${ALLOWED_USERS_COLLECTION}/${cleanEmail}`);
    throw err;
  }
}

// ==========================================
// REAL-TIME FIRESTORE SYNC: JOB CARDS
// ==========================================

export function subscribeToJobCards(
  onData: (jobs: JobCard[]) => void,
  onError?: (err: unknown) => void
) {
  try {
    const colRef = collection(db, JOB_CARDS_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: JobCard[] = snapshot.docs.map(d => {
          const data = d.data();
          return {
            ...data,
            id: d.id,
          } as JobCard;
        });
        onData(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, JOB_CARDS_COLLECTION);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, JOB_CARDS_COLLECTION);
    if (onError) onError(err);
    return () => {};
  }
}

export async function saveJobCardToFirestore(job: JobCard): Promise<void> {
  if (!job.id) return;
  const docRef = doc(db, JOB_CARDS_COLLECTION, job.id);
  try {
    // Sanitize undefined fields for Firestore
    const cleanPayload = JSON.parse(JSON.stringify(job));
    await setDoc(docRef, cleanPayload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${JOB_CARDS_COLLECTION}/${job.id}`);
    throw err;
  }
}

export async function deleteJobCardFromFirestore(jobId: string): Promise<void> {
  if (!jobId) return;
  const docRef = doc(db, JOB_CARDS_COLLECTION, jobId);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${JOB_CARDS_COLLECTION}/${jobId}`);
    throw err;
  }
}

// ==========================================
// REAL-TIME FIRESTORE SYNC: INVOICES
// ==========================================

export function subscribeToInvoices(
  onData: (invoices: Invoice[]) => void,
  onError?: (err: unknown) => void
) {
  try {
    const colRef = collection(db, INVOICES_COLLECTION);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const list: Invoice[] = snapshot.docs.map(d => {
          const data = d.data();
          return {
            ...data,
            id: d.id,
          } as Invoice;
        });
        onData(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, INVOICES_COLLECTION);
        if (onError) onError(err);
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, INVOICES_COLLECTION);
    if (onError) onError(err);
    return () => {};
  }
}

export async function saveInvoiceToFirestore(invoice: Invoice): Promise<void> {
  if (!invoice.id) return;
  const docRef = doc(db, INVOICES_COLLECTION, invoice.id);
  try {
    const cleanPayload = JSON.parse(JSON.stringify(invoice));
    await setDoc(docRef, cleanPayload, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${INVOICES_COLLECTION}/${invoice.id}`);
    throw err;
  }
}

export async function deleteInvoiceFromFirestore(invoiceId: string): Promise<void> {
  if (!invoiceId) return;
  const docRef = doc(db, INVOICES_COLLECTION, invoiceId);
  try {
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${INVOICES_COLLECTION}/${invoiceId}`);
    throw err;
  }
}
