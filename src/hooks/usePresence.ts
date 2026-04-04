"use client";

import { useEffect, useCallback } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface PresenceUser {
  uid: string;
  displayName: string;
  profilePic?: string | null;
}

export function usePresence(user: PresenceUser | null) {
  const write = useCallback(
    async (isOnline: boolean) => {
      if (!user) return;
      try {
        await setDoc(
          doc(db, "users", user.uid),
          {
            isOnline,
            lastSeen: serverTimestamp(),
            displayName: user.displayName,
            ...(user.profilePic ? { avatar: user.profilePic } : {}),
          },
          { merge: true }
        );
      } catch (err) {
        console.error("Presence write failed:", err);
      }
    },
    [user?.uid] // eslint-disable-line
  );

  useEffect(() => {
    if (!user) return;

    write(true);

    const onVisibility = () =>
      write(document.visibilityState === "visible");
    const onUnload = () => write(false);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onUnload);

    return () => {
      write(false);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [user?.uid]); // eslint-disable-line
}