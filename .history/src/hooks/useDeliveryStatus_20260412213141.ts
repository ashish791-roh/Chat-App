"use client";

import { useEffect } from "react";
import {
  collection, query, where, onSnapshot,
  writeBatch, doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * useDeliveryStatus - Final Corrected Version
 * * Fixes the inequality query error by using an 'in' query for specific statuses.
 * This is more robust than '!=' and avoids Firestore indexing errors.
 */
export function useDeliveryStatus(
  chatId: string | null,
  myUid: string | null
) {
  useEffect(() => {
    if (!chatId || !myUid) return;

    // Using 'in' operator to target exactly what needs changing.
    // This avoids the Firestore restriction on '!=' queries 
    // and is much more performant.
    const q = query(
      collection(db, "chats", chatId, "messages"),
      where("status", "in", ["sent", "delivered"])
    );

    const unsub = onSnapshot(q, async (snap) => {
      if (snap.empty) return;

      const batch = writeBatch(db);
      let hasUpdates = false;

      snap.docs.forEach((d) => {
        const data = d.data();
        
        // Safety check: Only update messages sent BY THE OTHER USER
        // and ensure we don't trigger an infinite loop on our own messages.
        if (data.senderId !== myUid) {
          batch.update(doc(db, "chats", chatId, "messages", d.id), {
            status: "seen",
          });
          hasUpdates = true;
        }
      });

      if (hasUpdates) {
        try {
          await batch.commit();
        } catch (err) {
          console.error("Delivery Status Update Error:", err);
        }
      }
    }, (error) => {
      console.error("Firestore Listener Error:", error);
    });

    return () => unsub();
  }, [chatId, myUid]);
}