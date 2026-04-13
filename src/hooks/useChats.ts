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

        loaded.push({
          id: d.id,
          name: data.name ?? "Unknown",
          isGroup: data.isGroup ?? false,
          lastMessage: data.lastMessage ?? "",
          lastMessageAt: data.lastMessageAt ?? null,
          members: data.members ?? [],
          pinnedMessage: data.pinnedMessage ?? null,
          isOnline: false,
          status: "Offline",
        });
      });

      setChats(loaded);
    });

    return () => unsub();
  }, [myUid]);

  return chats.map((c) => {
    if (c.isGroup) return c;

    const otherId = c.members.find((m) => m !== myUid);
    const isOnline = otherId ? onlineStatusMap[otherId] ?? false : false;

    return {
      ...c,
      isOnline,
      status: isOnline ? "Active now" : "Offline",
    };
  });
}