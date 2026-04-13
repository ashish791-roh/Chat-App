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
 * Marks incoming messages as "delivered" then "read" (seen) without
 * requiring a composite Firestore index.
 *
 * Strategy: query only on `status` (single-field, no index needed),
 * then filter out our own messages in JS before writing.
 */
export function useDeliveryStatus(
  chatId: string | null,
  myUid: string | null
) {
  // ── 1. sent → delivered ────────────────────────────────────────────────
  useEffect(() => {
    if (!chatId || !myUid) return;

    // Single where clause = no composite index required
    const q = query(
      collection(db, "chats", chatId, "messages"),
      where("status", "==", "sent")
    );

    const unsub = onSnapshot(q, async (snap) => {
      if (snap.empty) return;

      // Filter in JS: only mark messages sent BY the other person
      const toUpdate = snap.docs.filter(
        (d) => d.data().senderId !== myUid
      );
      if (toUpdate.length === 0) return;

      const batch = writeBatch(db);
      toUpdate.forEach((d) =>
        batch.update(doc(db, "chats", chatId, "messages", d.id), {
          status: "delivered",
        })
      );
      try { await batch.commit(); } catch { /* ignore */ }
    });

    return () => unsub();
  }, [chatId, myUid]);

  // ── 2. delivered → read (seen) ─────────────────────────────────────────
  useEffect(() => {
    if (!chatId || !myUid) return;

    const q = query(
      collection(db, "chats", chatId, "messages"),
      where("status", "==", "delivered")
    );

    const unsub = onSnapshot(q, async (snap) => {
      if (snap.empty) return;

      // Filter in JS: only mark messages sent BY the other person
      const toUpdate = snap.docs.filter(
        (d) => d.data().senderId !== myUid
      );
      if (toUpdate.length === 0) return;

      const batch = writeBatch(db);
      toUpdate.forEach((d) =>
        batch.update(doc(db, "chats", chatId, "messages", d.id), {
          status: "read",
        })
      );
      try { await batch.commit(); } catch { /* ignore */ }
    });

    return () => unsub();
  }, [chatId, myUid]);
}