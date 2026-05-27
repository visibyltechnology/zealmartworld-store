import { initializeApp } from 'firebase/app';
import { getAuth, fetchSignInMethodsForEmail } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBnoc4cNwyfTNA4mKrJ1yhVhLeRkBTsmCY",
  authDomain: "zealmart-8d293.firebaseapp.com",
  projectId: "zealmart-8d293",
  storageBucket: "zealmart-8d293.firebasestorage.app",
  messagingSenderId: "193494130985",
  appId: "1:193494130985:web:7469e81034ba5813069738",
  measurementId: "G-QGVDW3ZPHV"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

fetchSignInMethodsForEmail(auth, 'hazytarzan12@gmail.com')
  .then((methods) => {
    if (methods.length > 0) {
      console.log('✅ USER FOUND! Sign in methods:', methods);
    } else {
      console.log('❌ USER NOT FOUND! (No sign in methods)');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
