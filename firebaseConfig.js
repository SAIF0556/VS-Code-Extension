// Import the functions you need from the SDKs
const { initializeApp } = require("firebase/app");
const { getAuth } = require("firebase/auth");
const { getFirestore } = require("firebase/firestore");

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAJn4YIQ8if8W-wFaqq4u898XLSHBDLFec",
  authDomain: "vs-code-plugin-453ae.firebaseapp.com",
  projectId: "vs-code-plugin-453ae",
  storageBucket: "vs-code-plugin-453ae.firebasestorage.app",
  messagingSenderId: "414560570386",
  appId: "1:414560570386:web:ba07a941ce459fd9171ccb",
  measurementId: "G-F4RBL5YMMW",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);

module.exports = { auth, db };
