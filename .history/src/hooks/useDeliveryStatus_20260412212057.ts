import { useEffect } from "react";
import { collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useDeliveryStatus(chatId: string | null, myUid: string | null) {
  useEffect(() => {
    if (!chatId || !myUid) return;

    const markAsRead = async () => {
      const msgsRef = collection(db, "chats", chatId, "messages");
      const q = query(
        msgsRef, 
        where("senderId", "!=", myUid), 
        where("status", "!=", "seen")
      );

      const snap = await getDocs(q);
      if (snap.empty) return;

      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        batch.update(d.ref, { status: "seen" });
      });
      await batch.commit();
    };

    markAsRead();
  }, [chatId, myUid]);
}