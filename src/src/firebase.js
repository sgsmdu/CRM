import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAhWwpErTkeZS_O8VyeR7OvX9M2VzVcDeQ",
  authDomain: "crm-sgs.firebaseapp.com",
  databaseURL: "https://crm-sgs-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "crm-sgs",
  storageBucket: "crm-sgs.firebasestorage.app",
  messagingSenderId: "753863497565",
  appId: "1:753863497565:web:cf62dea4ab67cc327b7ab4",
  measurementId: "G-HC9DF99RYG"
};

import { getAuth } from "firebase/auth";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export { app };
export * from "../services/firebase";
