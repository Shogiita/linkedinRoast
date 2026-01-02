import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// --- DEBUG LOGGING ---
// Buka Console Browser (F12) untuk melihat ini
if (typeof window !== "undefined") {
  console.log("🔥 FIREBASE CLIENT DEBUG 🔥");
  console.log("API KEY Status:", firebaseConfig.apiKey ? "ADA ✅" : "KOSONG ❌");
  console.log("Project ID Status:", firebaseConfig.projectId ? "ADA ✅" : "KOSONG ❌");
  console.log("Full Config (Partial):", {
    ...firebaseConfig,
    apiKey: firebaseConfig.apiKey ? "HIDDEN_FOR_SECURITY" : "MISSING"
  });
}
// ---------------------

// Kita hapus pengecekan "isConfigValid" supaya error aslinya dari Firebase keluar
// Jika config kosong, initializeApp akan throw error di console, 
// yang lebih informatif daripada sekedar "Cek .env"
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();