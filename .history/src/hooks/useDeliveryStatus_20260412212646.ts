"use client";

import { useEffect } from "react";
import {
  collection, query, where, onSnapshot,
  writeBatch, doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * useDeliveryStatus
 *
 * Marks incoming messages as "delivered" then "seen" without
 * requiring a composite Firestore index.
 *
 * Strategy: Listen for any message that isn't "seen", 
 * filter by sender in JavaScript, and update in batches.
 */
export function useDeliveryStatus(
  chatId: string | null,
  myUid: string | null
) {
  useEffect(() => {
    if (!chatId || !myUid) return;

    // We query for messages where status is NOT 'seen'
    // This allows us to handle both 'sent' -> 'delivered' 
    // and 'delivered' -> 'seen' transitions in one listener.
    const q = query(
      collection(db, "chats", chatId, "messages"),
      where("status", "!=", "seen")
    );

    const unsub = onSnapshot(q, async (snap) => {
      if (snap.empty) return;

      const batch = writeBatch(db);
      let hasUpdates = false;

      snap.docs.forEach((d) => {
        const data = d.data();
        
        // Only update messages sent BY the other person
        if (data.senderId !== myUid) {
          const currentStatus = data.status;
          let nextStatus = currentStatus;

          // logic: 
          // 1. If 'sent' and we are online/in chat, move to 'seen' (skipping delivered for simplicity in active view)
          // 2. If 'delivered' move to 'seen'
          if (currentStatus === "sent" || currentStatus === "delivered") {
            nextStatus = "seen";
          }

          if (nextStatus !== currentStatus) {
            batch.update(doc(db, "chats", chatId, "messages", d.id), {
              status: nextStatus,
            });
            hasUpdates = true;
          }
        }
      });

      if (hasUpdates) {
        try {
          await batch.commit();
        } catch (err) {
          console.error("Failed to update delivery status:", err);
        }
      }
    });

    return () => unsub();
  }, [chatId, myUid]);
}