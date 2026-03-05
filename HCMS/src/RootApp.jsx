import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase.js";
import Login from "./Login.jsx";
import StudentApp from "./StudentApp.jsx";
import PorterApp  from "./PorterApp.jsx";
import AdminApp   from "./AdminApp.jsx";

export default function RootApp() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (snap.exists()) {
          setUser({ uid: firebaseUser.uid, ...snap.data() });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  if (!user) return <Login onLogin={setUser} />;

  if (user.role === "student") return <StudentApp user={user} onLogout={() => { auth.signOut(); setUser(null); }} />;
  if (user.role === "porter")  return <PorterApp  user={user} onLogout={() => { auth.signOut(); setUser(null); }} />;
  if (user.role === "admin")   return <AdminApp   user={user} onLogout={() => { auth.signOut(); setUser(null); }} />;
}