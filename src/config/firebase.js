// src/config/firebase.js
const { initializeApp } = require("firebase/app");
const { getAuth } = require("firebase/auth");
const { getFirestore } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyAJn4YIQ8if8W-wFaqq4u898XLSHBDLFec",
  authDomain: "vs-code-plugin-453ae.firebaseapp.com",
  projectId: "vs-code-plugin-453ae",
  storageBucket: "vs-code-plugin-453ae.firebasestorage.app",
  messagingSenderId: "414560570386",
  appId: "1:414560570386:web:ba07a941ce459fd9171ccb",
  clientId: "414560570386-35usvjqlcp7dgp4q4n1qgd2tlac68qea.apps.googleusercontent.com"
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
