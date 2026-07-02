import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBIv-ce5-zxLxMFaQCHKZO6X31SxaZwInw",
  authDomain: "proxima-5ad14.firebaseapp.com",
  projectId: "proxima-5ad14",
  storageBucket: "proxima-5ad14.firebasestorage.app",
  messagingSenderId: "753066828759",
  appId: "1:753066828759:web:9f9bd28b582c11e91da192"
};
// Initialize Firebase only if it hasn't been initialized already
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
