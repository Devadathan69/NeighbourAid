import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD20PAra7OUKZcRRYncAlMuZ294Jm4-a_0",
  authDomain: "neighboraid-293c2.firebaseapp.com",
  projectId: "neighboraid-293c2",
  storageBucket: "neighboraid-293c2.firebasestorage.app",
  messagingSenderId: "361368432806",
  appId: "1:361368432806:web:064652ebffc5769cee4467"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function setAdminRole() {
  const email = "admin@neighboraid.in";
  
  try {
    console.log("Searching for user with email:", email);
    const q = query(collection(db, "users"), where("email", "==", email));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log("No user found in Firestore with that email. Make sure you registered it in the app first.");
      process.exit(1);
    }
    
    const userDoc = snapshot.docs[0];
    const uid = userDoc.id;
    
    console.log("Found user UID:", uid);
    console.log("Updating role to 'admin'...");
    
    await setDoc(doc(db, "users", uid), {
      role: "admin"
    }, { merge: true });
    
    console.log("Success! Role updated to admin.");
    process.exit(0);
  } catch (error) {
    console.error("Error updating role:", error);
    process.exit(1);
  }
}

setAdminRole();
