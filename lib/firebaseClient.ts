// shogiita/linkedinroast/linkedinRoast-a3e34660214acb9cdbc8e4abe9e4ac556175d88e/lib/firebaseClient.ts
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

// Pola Singleton yang lebih aman untuk Next.js
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Inisialisasi Auth dan Provider secara langsung
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Tambahkan konfigurasi tambahan jika perlu agar popup tidak terblokir
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { auth, googleProvider };