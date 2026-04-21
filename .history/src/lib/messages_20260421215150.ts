import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { Message } from "@/types";

// ── ID ───────────────────────────────
export const getConversationId = (uid1: string, uid2: string): string =>
  [uid1, uid2].sort().join("_");

// Reference
const msgsRef = (convId: string) =>
  collection(db, "conversations", convId, "messages");

// ── Send msg ────────────────────────────────────
export interface SendMessagePayload {
  senderId: string;
  senderName: string;
  recipientId: string;
  text: string;
  replyTo?: Message["replyTo"];
  voiceUrl?: string;
  voiceDuration?: number;
}

export const sendMessage = async (payload: SendMessagePayload): Promise<void> => {
  const convId = getConversationId(payload.senderId, payload.recipientId);

  await addDoc(msgsRef(convId), {
    senderId: payload.senderId,
    senderName: payload.senderName,
    recipientId: payload.recipientId,
    text: payload.text,
    status: "sent",
    replyTo: payload.replyTo || null,
    reactions: {}, // { "❤️": ["uid1", "uid2"] }
    isDeleted: false,
    deletedForUsers: [],
    createdAt: serverTimestamp(),
  });
};

// ──  listener ────────────
export const subscribeToMessages = (
  myId: string,
  recipientId: string,
  onMessages: (msgs: Message[]) => void
): (() => void) => {
  const convId = getConversationId(myId, recipientId);
  const q = query(msgsRef(convId), orderBy("createdAt", "asc"), limit(100));

  return onSnapshot(q, (snap) => {
    const msgs: Message[] = snap.docs
      .map((d) => {
        const data = d.data();

        // Skip msgs 
        if ((data.deletedForUsers as string[]).includes(myId)) return null;

        return {
          id: d.id,
          senderId: data.senderId,
          senderName: data.senderName,
          text: data.isDeleted ? "" : data.text,
          timestamp:
            data.createdAt instanceof Timestamp
              ? data.createdAt.toDate().toISOString()
              : new Date().toISOString(),
          isMe: data.senderId === myId,
          status: data.status,
          replyTo: data.replyTo || undefined,
          reactions: data.reactions || {},
          isDeleted: data.isDeleted || false,
        } as Message;
      })
      .filter(Boolean) as Message[];

    onMessages(msgs);
  });
};

// ── reaction ───────────────────
export const toggleReaction = async (
  convId: string,
  messageId: string,
  emoji: string,
  myId: string
): Promise<void> => {
  const msgDoc = doc(db, "conversations", convId, "messages", messageId);
  const snap = await getDoc(msgDoc);
  if (!snap.exists()) return;
  const reactions: Record<string, string[]> = snap.data().reactions || {};
  const current = reactions[emoji] || [];
  const alreadyReacted = current.includes(myId);

  //  updated reactions 
  let updated: Record<string, string[]>;
  if (alreadyReacted) {
    const next = current.filter((u) => u !== myId);
    updated = { ...reactions, [emoji]: next };
    if (next.length === 0) delete updated[emoji];
  } else {
    updated = { ...reactions, [emoji]: [...current, myId] };
  }

  await updateDoc(msgDoc, { reactions: updated });
};

// ── Delete ────────────
export const deleteMessageForMe = async (
  convId: string,
  messageId: string,
  myId: string
): Promise<void> => {
  const msgDoc = doc(db, "conversations", convId, "messages", messageId);
  await updateDoc(msgDoc, {
    deletedForUsers: arrayUnion(myId),
  });
};

export const deleteMessageForEveryone = async (
  convId: string,
  messageId: string
): Promise<void> => {
  const msgDoc = doc(db, "conversations", convId, "messages", messageId);
  await updateDoc(msgDoc, {
    isDeleted: true,
    text: "",
    reactions: {},
  });
};

export const markMessagesAsRead = async (
  convId: string,
  recipientId: string, // other person's ID
  myId: string
): Promise<void> => {
  const q = query(
    msgsRef(convId),
    where("senderId", "==", recipientId),
    where("status", "!=", "read")
  );

  const snap = await import("firebase/firestore").then(({ getDocs }) =>
    getDocs(q)
  );
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { status: "read" }));
  await batch.commit();
};
