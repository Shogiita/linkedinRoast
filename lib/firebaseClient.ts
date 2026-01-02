// linkedinroast/lib/firebase.ts
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Kita deklarasikan variabel dengan tipe data yang jelas
let app: FirebaseApp;
let auth: Auth;
let googleProvider: GoogleAuthProvider;

// Cek apakah Firebase sudah diinisialisasi agar tidak double di mode development
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Inisialisasi Auth dan Provider
auth = getAuth(app);
googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };