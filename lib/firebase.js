import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDklt1oiDEb9C15Bj8rGew6X4p7OA9iNsQ",
  authDomain: "linkedinroasting.firebaseapp.com",
  projectId: "linkedinroasting",
  storageBucket: "linkedinroasting.firebasestorage.app",
  messagingSenderId: "324383779080",
  appId: "1:324383779080:web:2a129c621f588ffd5664bd",
  measurementId: "G-CBFGGBMS4H"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();