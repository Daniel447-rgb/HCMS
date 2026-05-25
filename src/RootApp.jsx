import React from 'react'
import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase.js";
import Login      from "./Login.jsx";
import StudentApp from "./StudentApp.jsx";
import PorterApp  from "./PorterApp.jsx";
import AdminApp   from "./AdminApp.jsx";

export default function RootApp() {
  const [user,           setUser]           = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [installPrompt,  setInstallPrompt]  = useState(null);
  const [showInstall,    setShowInstall]    = useState(false);

  // Capture the browser's install prompt event
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();          // stop auto-prompt
      setInstallPrompt(e);         // save it
      setShowInstall(true);        // show our banner
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Hide banner if app is already installed
  useEffect(() => {
    const handler = () => setShowInstall(false);
    window.addEventListener("appinstalled", handler);
    return () => window.removeEventListener("appinstalled", handler);
  }, []);

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

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "accepted") {
      setShowInstall(false);
      setInstallPrompt(null);
    }
  };

  const dismissInstall = () => setShowInstall(false);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <>
      {/* Install prompt banner */}
      {showInstall && (
        <div className="fixed bottom-0 left-0 right-0 z-[999] p-4 md:p-6
                        flex justify-center pointer-events-none">
          <div className="bg-slate-900 rounded-2xl shadow-2xl border border-white/10
                          flex items-center gap-4 px-5 py-4 w-full max-w-md
                          pointer-events-auto">
            <div className="w-12 h-12 rounded-xl bg-[#1447A3] flex items-center
                            justify-center flex-shrink-0 shadow">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 22V12h6v10" stroke="white" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold leading-tight">Install HostelDesk</p>
              <p className="text-slate-400 text-xs mt-0.5">
                Add to your home screen for quick access
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={dismissInstall}
                      className="px-3 py-2 rounded-xl text-slate-400 text-xs font-semibold
                                 hover:text-white hover:bg-white/10 transition-colors">
                Later
              </button>
              <button onClick={handleInstall}
                      className="px-4 py-2 rounded-xl bg-[#1447A3] text-white text-xs font-bold
                                 hover:bg-blue-700 transition-colors">
                Install
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main app */}
      {!user
        ? <Login onLogin={setUser} />
        : user.role === "student"
          ? <StudentApp user={user} onLogout={() => { auth.signOut(); setUser(null); }} />
          : user.role === "porter"
            ? <PorterApp  user={user} onLogout={() => { auth.signOut(); setUser(null); }} />
            : user.role === "admin"
              ? <AdminApp   user={user} onLogout={() => { auth.signOut(); setUser(null); }} />
              : null}
    </>
  );
}