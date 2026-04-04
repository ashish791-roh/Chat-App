import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export interface ChatMessage {
  id?: string;
  text: string;
  senderId: string;
  senderName: string;
  receiverId?: string;
  groupId?: string;
  createdAt?: any;
}

/**
 * Generate chatId (same for both users)
 */
export const getChatId = (uid1: string, uid2: string) => {
  return [uid1, uid2].sort().join("_");
};

/**
 * Send Message
 */
export const sendMessage = async (chatId: string, message: ChatMessage) => {
  const messagesRef = collection(db, "chats", chatId, "messages");

  await addDoc(messagesRef, {
    ...message,
    createdAt: serverTimestamp(),
  });

  // update last message
  await setDoc(
    doc(db, "chats", chatId),
    {
      lastMessage: message.text,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

/**
 * Subscribe to Messages (REAL-TIME)
 */
export const subscribeToMessages = (
  chatId: string,
  callback: (messages: ChatMessage[]) => void
) => {
  const q = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(q, (snapshot) => {
    const msgs: ChatMessage[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as ChatMessage),
    }));

    callback(msgs);
  });
};