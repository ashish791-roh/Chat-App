"use client";

import { useState, useEffect } from "react";
import {
  collection, query, where, orderBy, onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Chat, OnlineStatusMap } from "@/types/chat";

export function useChats(
  myUid: string | null,
  onlineStatusMap: OnlineStatusMap
) {
  const [chats, setChats] = useState<Chat[]>([]);

  useEffect(() => {
    if (!myUid) return;

    const q = query(
      collection(db, "chats"),
      where("members", "array-contains", myUid),
      orderBy("lastMessageAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const loaded: Chat[] = [];

      snap.forEach((d) => {
        const data = d.data();
        const isGroup = data.isGroup ?? false;
        const otherId = isGroup
          ? null
          : (data.members as string[]).find((m) => m !== myUid) ?? null;
        const isOnline = otherId ? (onlineStatusMap[otherId] ?? false) : false;

        loaded.push({
          id: d.id,
          name: data.name ?? "Unknown",
          isGroup,
          lastMessage: data.lastMessage ?? "",
          lastMessageAt: data.lastMessageAt ?? null,
          status: isOnline ? "Active now" : "Offline",
          isOnline,
          members: data.members ?? [],
        });
      });

      setChats(loaded);
    });

    return () => unsub();
  }, [myUid]); // eslint-disable-line

  // Patch isOnline / status whenever onlineStatusMap changes
  // without re-subscribing to Firestore
  const patched = chats.map((c) => {
    if (c.isGroup) return c;
    const otherId = c.members?.find((m) => m !== myUid) ?? c.id;
    const isOnline = onlineStatusMap[otherId] ?? false;
    return { ...c, isOnline, status: isOnline ? "Active now" : "Offline" };
  });

  return patched;
}