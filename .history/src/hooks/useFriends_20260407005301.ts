"use client";

import { useState, useEffect } from "react";
import {
  doc,
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserProfile, OnlineStatusMap } from "@/types/chat";

interface UseFriendsResult {
  friends: UserProfile[];
  onlineStatusMap: OnlineStatusMap;
  myPhone: string;
}

export function useFriends(myUid: string | null): UseFriendsResult {
  const [friends, setFriends]                 = useState<UserProfile[]>([]);
  const [onlineStatusMap, setOnlineStatusMap] = useState<OnlineStatusMap>({});
  const [myPhone, setMyPhone]                 = useState("");

  // ── Own document → phone number ──────────────────────────────────────────
  useEffect(() => {
    if (!myUid) return;
    const unsub = onSnapshot(doc(db, "users", myUid), (snap) => {
      if (snap.exists()) setMyPhone(snap.data().phoneNumber ?? "");
    });
    return () => unsub();
  }, [myUid]);

  // ── Chats → peer UIDs → individual profile fetches ───────────────────────
  useEffect(() => {
    if (!myUid) return;

    const chatsQuery = query(
      collection(db, "chats"),
      where("members", "array-contains", myUid)
    );

    const unsubChats = onSnapshot(chatsQuery, async (chatSnap) => {
      const peerUids = new Set<string>();

      chatSnap.forEach((d) => {
        const data = d.data();
        if (data.isGroup) return;
        (data.members as string[]).forEach((uid) => {
          if (uid !== myUid) peerUids.add(uid);
        });
      });

      if (peerUids.size === 0) {
        setFriends([]);
        setOnlineStatusMap({});
        return;
      }

      const profiles: UserProfile[]       = [];
      const statusPatch: OnlineStatusMap  = {};

      await Promise.all(
        Array.from(peerUids).map(async (uid) => {
          try {
            const snap = await getDoc(doc(db, "users", uid));
            if (!snap.exists()) return;
            const data     = snap.data();
            const isOnline = data.isOnline ?? false;

            profiles.push({
              uid,
              displayName: data.name ?? data.displayName ?? "Unknown",
              username:    data.username    ?? null,
              avatar:      data.avatar      ?? null,
              phoneNumber: data.phoneNumber ?? null,
              isOnline,
              lastSeen:    data.lastSeen    ?? null,
            });

            statusPatch[uid] = isOnline;
          } catch (err) {
            console.error("Failed to fetch peer profile:", uid, err);
          }
        })
      );

      setFriends(profiles);
      setOnlineStatusMap((prev) => ({ ...prev, ...statusPatch }));
    });

    return () => unsubChats();
  }, [myUid]);

  return { friends, onlineStatusMap, myPhone };
}