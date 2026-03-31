import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDNcbtYKWmjFQqMam-1l7QxAN7NW5mDKCA",
  authDomain: "chat-app-fa051.firebaseapp.com",
  databaseURL: "https://chat-app-fa051-default-rtdb.firebaseio.com",
  projectId: "chat-app-fa051",
  storageBucket: "chat-app-fa051.firebasestorage.app",
  messagingSenderId: "420985704789",
  appId: "1:420985704789:web:4db455607bd089f3fb9fdc",
  measurementId: "G-6NHEHEWZZX"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app); 
