"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, OnlineStatusMap } from "@/types/chat";

interface UseFriendsResult {
  friends: UserProfile[];
  onlineStatusMap: OnlineStatusMap;
  myPhone: string;
}

export function useFriends(myUid: string | null): UseFriendsResult {
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [onlineStatusMap, setOnlineStatusMap] = useState<OnlineStatusMap>({});
  const [myPhone, setMyPhone] = useState("");

  useEffect(() => {
    if (!myUid) return;

    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const loaded: UserProfile[] = [];
      const statusPatch: OnlineStatusMap = {};

      snap.forEach((d) => {
        const data = d.data();

        // Read own phone number
        if (d.id === myUid) {
          setMyPhone(data.phoneNumber ?? "");
          return;
        }

        const isOnline = data.isOnline ?? false;

        loaded.push({
          uid: d.id,
          displayName: data.displayName ?? "Unknown",
          avatar: data.avatar ?? null,
          phoneNumber: data.phoneNumber ?? null,
          isOnline,
          lastSeen: data.lastSeen ?? null,
        });

        statusPatch[d.id] = isOnline;
      });

      setFriends(loaded);
      setOnlineStatusMap((prev) => ({ ...prev, ...statusPatch }));
    });

    return () => unsub();
  }, [myUid]);

  return { friends, onlineStatusMap, myPhone };
}