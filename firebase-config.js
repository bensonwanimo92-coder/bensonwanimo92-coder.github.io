import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyDJpbuA35i96lx2H5BRF2CsnatRX85ra8Q",
  authDomain: "hello-chuka.firebaseapp.com",
  projectId: "hello-chuka",
  storageBucket: "hello-chuka.firebasestorage.app",
  messagingSenderId: "711098456820",
  appId: "1:711098456820:web:cbddce1090f55ecbf91ca1",
  measurementId: "G-FN62XR3G6R"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
