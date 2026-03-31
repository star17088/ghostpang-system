// firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "여기 그대로",
  authDomain: "ghostpang.firebaseapp.com",
  projectId: "ghostpang",
  storageBucket: "ghostpang.firebasestorage.app",
  messagingSenderId: "494956996773",
  appId: "1:494956996773:web:b3346f2116e88d8192054c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DATA_DOC = doc(db, "ghostpang", "main");

export { db, DATA_DOC, getDoc, setDoc, onSnapshot };
