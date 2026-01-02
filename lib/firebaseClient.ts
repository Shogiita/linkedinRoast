// shogiita/linkedinroast/linkedinRoast-a3e34660214acb9cdbc8e4abe9e4ac556175d88e/lib/firebaseClient.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Pastikan kode hanya berjalan jika API Key tersedia
const isConfigValid = !!firebaseConfig.apiKey;

const app = isConfigValid 
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp())
  : null;

// Ekspor instance dengan pengecekan null untuk mencegah crash saat build
export const auth = app ? getAuth(app) : ({} as Auth);
export const googleProvider = new GoogleAuthProvider();