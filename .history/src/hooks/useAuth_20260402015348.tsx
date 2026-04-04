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

  // 🔥 MAIN AUTH LISTENER
  useEffect(() => {
    const unsubscribe = subscribeToAuthState((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 🟢 OFFLINE DETECTION (tab close / refresh)
  useEffect(() => {
    const handleOffline = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      try {
        await updateDoc(doc(db, "users", currentUser.uid), {
          isOnline: false,
          lastSeen: serverTimestamp(),
        });
      } catch (error) {
        console.error("Offline update failed:", error);
      }
    };

    window.addEventListener("beforeunload", handleOffline);

    return () => {
      window.removeEventListener("beforeunload", handleOffline);
    };
  }, []);

  // 🔐 LOGOUT HANDLER (ensures offline state)
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

  return (
    <AuthContext.Provider value={{ user, loading, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ✅ Hook
export const useAuth = () => useContext(AuthContext);