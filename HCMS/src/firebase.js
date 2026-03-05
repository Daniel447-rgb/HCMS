import { initializeApp }  from "firebase/app";
import { getAuth }        from "firebase/auth";
import { getFirestore }   from "firebase/firestore";


const firebaseConfig = {
  apiKey:            "AIzaSyAecYEAE52xDI_L6ZYOvdoFPw84YqmRb0I",
  authDomain:        "hosteldesk-3ad93.firebaseapp.com",
  projectId:         "hosteldesk-3ad93",
  storageBucket:     "hosteldesk-3ad93.firebasestorage.app",
  messagingSenderId: "310547199848",
  appId:             "Y1:310547199848:web:66bd119b19ee79c6a808dd",
};

// Initialize Firebase 
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);