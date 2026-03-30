import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyADGR45Y4rzrLsqk7dt05iCIu2dONSE3NI",
  authDomain: "ghostpang.firebaseapp.com",
  projectId: "ghostpang",
  storageBucket: "ghostpang.firebasestorage.app",
  messagingSenderId: "494956996773",
  appId: "1:494956996773:web:b3346f2116e88d8192054c",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
