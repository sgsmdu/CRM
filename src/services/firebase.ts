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
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { AllowedUser, UserRole } from '../types';

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

// Default config from firebase-applet-config.json or user's crm-sgs credentials
const userConfig = {
  apiKey: "AIzaSyAhWwpErTkeZS_O8VyeR7OvX9M2VzVcDeQ",
  authDomain: "crm-sgs.firebaseapp.com",
  databaseURL: "https://crm-sgs-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "crm-sgs",
  storageBucket: "crm-sgs.firebasestorage.app",
  messagingSenderId: "753863497565",
  appId: "1:753863497565:web:cf62dea4ab67cc327b7ab4",
  measurementId: "G-HC9DF99RYG"
};

// Initialize or reuse Firebase App
export const app = getApps().length === 0 ? initializeApp(userConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

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
export const DEFAULT_ADMIN_EMAIL = 'spidergridsolutions@gmail.com';

/**
 * Fetch role for a given user email from `allowed_users` collection in Firestore
 */
export async function fetchUserRoleFromFirestore(email: string): Promise<{ role: UserRole; userRecord?: AllowedUser }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    return { role: 'user' };
  }

  // System owner is always admin
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
      return { role: 'admin', userRecord: bootstrapRecord };
    }

    return { role: 'user' };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, ALLOWED_USERS_COLLECTION);
    // Safe fallback: owner is admin, others default to user
    return { role: isDefaultOwner ? 'admin' : 'user' };
  }
}

/**
 * Real-time listener for `allowed_users` list (for Admin Users Manager)
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
