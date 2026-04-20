"use client";

import { useState, useEffect, useRef } from "react";
import {
  collection, query, orderBy, onSnapshot, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Message } from "@/types";


export function useMessages(chatId: string | null, myUid: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Tear down previous listener
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    if (!chatId || !myUid) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const loaded: Message[] = [];

      snap.forEach((d) => {
        const data = d.data();
        loaded.push({
          id: d.id,
          senderId: data.senderId,
          senderName: data.senderName ?? "Unknown",
          receiverId: data.receiverId ?? undefined,
          groupId: data.groupId ?? undefined,
          text: data.text ?? "",
          timestamp:
            data.timestamp instanceof Timestamp
              ? data.timestamp.toDate().toISOString()
              : data.timestamp ?? new Date().toISOString(),
          isMe: data.senderId === myUid,
          status: data.status ?? "sent",
          replyTo: data.replyTo ?? undefined,
          reactions: data.reactions ?? undefined,
          isDeleted: data.isDeleted ?? false,
          isEdited: data.isEdited ?? false,
          starredBy: data.starredBy ?? [],
          // ── Fix: map file metadata so ChatBubble can render correctly ──
          fileType: data.fileType ?? undefined,
          fileName: data.fileName ?? undefined,
        });
      });

      setMessages(loaded);
    });

    unsubRef.current = unsub;

    return () => {
      unsub();
      unsubRef.current = null;
    };
  }, [chatId, myUid]);

  return messages;
}