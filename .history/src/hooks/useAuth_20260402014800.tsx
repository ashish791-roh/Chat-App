"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { subscribeToAuthState, logout as firebaseLogout, AppUser } from "@/lib/auth";
import { goOnline, goOffline } from "@/lib/presence";

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsub = subscribeToAuthState((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser) {
        goOnline(firebaseUser.id);
      }
    });
    return unsub;
  }, []);

  const logout = async () => {
    if (user) await goOffline(user.id);
    await firebaseLogout();
    router.push("/auth/login");
  };
  useEffect(() => {
  const handleOffline = async () => {
    const user = auth.currentUser;
    if (!user) return;

    await updateDoc(doc(db, "users", user.uid), {
      isOnline: false,
      lastSeen: serverTimestamp(),
    });
  };

  window.addEventListener("beforeunload", handleOffline);

  return () => {
    window.removeEventListener("beforeunload", handleOffline);
  };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
