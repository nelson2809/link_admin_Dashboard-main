import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAd9OFEMI0-bdXGTD1vjHUJcU-3XfW0Oq8",
  authDomain: "link-140f5.firebaseapp.com",
  projectId: "link-140f5",
  storageBucket: "link-140f5.firebasestorage.app",
  messagingSenderId: "918390837809",
  appId: "1:918390837809:web:6e294f582e68a63fd33b10",
  measurementId: "G-ZWTF3398JZ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
