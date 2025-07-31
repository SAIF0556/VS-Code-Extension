// src/config/firebase.js
const { initializeApp } = require("firebase/app");
const { getAuth } = require("firebase/auth");
const { getFirestore } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "",
  clientId: process.env.REACT_APP_FIREBASE_CLIENT_ID || "" // Note: clientId is less common for Firebase web SDK
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.setPersistence(require('firebase/auth').browserLocalPersistence);
const db = getFirestore(app);

module.exports = {
  firebaseConfig,
  app,
  auth,
  db
};
