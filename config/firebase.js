const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');
const admin = require('firebase-admin');

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAHOJtKIGyBEy6oY9RtqU8W1vvtToIS2ao",
  authDomain: "empyrean-surge-453502-k6.firebaseapp.com",
  projectId: "empyrean-surge-453502-k6",
  storageBucket: "empyrean-surge-453502-k6.firebasestorage.app",
  messagingSenderId: "1048387947782",
  appId: "1:1048387947782:web:ff21b572c51ee7f1a72287",
  measurementId: "G-68LFENHPJL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

module.exports = {
  auth,
  firebaseConfig
};