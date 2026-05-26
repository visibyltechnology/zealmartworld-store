import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBnoc4cNwyfTNA4mKrJ1yhVhLeRkBTsmCY",
  authDomain: "zealmart-8d293.firebaseapp.com",
  projectId: "zealmart-8d293",
  storageBucket: "zealmart-8d293.firebasestorage.app",
  messagingSenderId: "193494130985",
  appId: "1:193494130985:web:7469e81034ba5813069738",
  measurementId: "G-QGVDW3ZPHV"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
