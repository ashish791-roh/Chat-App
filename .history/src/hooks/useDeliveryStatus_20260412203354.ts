"use client";

import { useEffect } from "react";
import {
  collection, query, where, onSnapshot,
  writeBatch, doc, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * useDeliveryStatus
 *
 * Two responsibilities:
 * 1. DELIVERED — When this user opens a chat, mark every message sent BY
 *    the other person that still has status "sent" → "delivered".
 *    This fires once per chat mount, then again whenever new "sent" msgs arrive.
 *
 * 2. READ (seen) — Mark every "delivered" message from the other person as
 *    "read" while the chat is open.
 *
 * Both operations are batched to minimise Firestore writes.
 */
export function useDeliveryStatus(
  chatId: string | null,
  myUid: string | null
) {
  // ── 1. DELIVERED listener ──────────────────────────────────────────────
  useEffect(() => {
    if (!chatId || !myUid) return;

    const q = query(
      collection(db, "chats", chatId, "messages"),
      where("senderId", "!=", myUid),
      where("status", "==", "sent")
    );

    const unsub = onSnapshot(q, async (snap) => {
      if (snap.empty) return;
      const batch = writeBatch(db);
      snap.docs.forEach((d) =>
        batch.update(doc(db, "chats", chatId, "messages", d.id), {
          status: "delivered",
        })
      );
      try { await batch.commit(); } catch { /* ignore */ }
    });

    return () => unsub();
  }, [chatId, myUid]);

  // ── 2. READ (seen) listener ────────────────────────────────────────────
  useEffect(() => {
    if (!chatId || !myUid) return;

    const q = query(
      collection(db, "chats", chatId, "messages"),
      where("senderId", "!=", myUid),
      where("status", "==", "delivered")
    );

    const unsub = onSnapshot(q, async (snap) => {
      if (snap.empty) return;
      const batch = writeBatch(db);
      snap.docs.forEach((d) =>
        batch.update(doc(db, "chats", chatId, "messages", d.id), {
          status: "read",
        })
      );
      try { await batch.commit(); } catch { /* ignore */ }
    });

    return () => unsub();
  }, [chatId, myUid]);
}