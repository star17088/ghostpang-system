// Firebase CDN 방식
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔥 당신 Firebase 설정 그대로 넣기
const firebaseConfig = {
  apiKey: "AIzaSyADGR45Y4rzrLsqk7dt05iCIu2dONSE3NI",
  authDomain: "ghostpang.firebaseapp.com",
  projectId: "ghostpang",
  storageBucket: "ghostpang.firebasestorage.app",
  messagingSenderId: "494956996773",
  appId: "1:494956996773:web:b3346f2116e88d8192054c"
};

// 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 👉 export
export {
  db,
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc
};
