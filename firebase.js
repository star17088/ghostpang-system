import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyADGR45Y4rzrLsqk7dt05iCIu2dONSE3NI",
  authDomain: "ghostpang.firebaseapp.com",
  projectId: "ghostpang",
  storageBucket: "ghostpang.firebasestorage.app",
  messagingSenderId: "494956996773",
  appId: "1:494956996773:web:b3346f2116e88d8192054c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export {
  db,
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc
};
