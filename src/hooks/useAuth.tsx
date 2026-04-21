"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { AppUser, subscribeToAuthState, logout } from "@/lib/auth";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false); // ✅ important
    });

    return () => unsubscribe();
  }, []);

  // ✅ Safe offline update
  useEffect(() => {
    const handleOffline = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        await updateDoc(doc(db, "users", currentUser.uid), {
          isOnline: false,
          lastSeen: serverTimestamp(),
        });
      } catch {}
    };

    window.addEventListener("beforeunload", handleOffline);
    return () => window.removeEventListener("beforeunload", handleOffline);
  }, []);

  const handleLogout = async () => {
    try {
      const currentUser = auth.currentUser;

      if (currentUser) {
        await updateDoc(doc(db, "users", currentUser.uid), {
          isOnline: false,
          lastSeen: serverTimestamp(),
        });
      }

      await logout();
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <span className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display, sans-serif)" }}>
            BlinkChat
          </span>
        </div>
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
