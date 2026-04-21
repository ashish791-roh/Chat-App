import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  doc,
  updateDoc,
  arrayUnion,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { StatusUpdate } from "@/types";

// Create a new status update
export const createStatusUpdate = async (
  userId: string,
  type: 'text' | 'image' | 'video',
  content: string,
  mediaUrl?: string
): Promise<void> => {
  const expiresAt = new Timestamp(
    Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours from now
    0
  );

  await addDoc(collection(db, "statusUpdates"), {
    userId,
    type,
    content,
    mediaUrl,
    createdAt: serverTimestamp(),
    expiresAt,
    views: [],
    reactions: {},
  });
};

// Get status updates from friends
export const subscribeToStatusUpdates = (
  userId: string,
  friendIds: string[],
  onUpdates: (updates: StatusUpdate[]) => void
): (() => void) => {
  const q = query(
    collection(db, "statusUpdates"),
    where("userId", "in", [userId, ...friendIds]),
    where("expiresAt", ">", serverTimestamp()),
    orderBy("expiresAt", "desc")
  );

  return onSnapshot(q, (snap) => {
    const updates: StatusUpdate[] = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as StatusUpdate));
    onUpdates(updates);
  });
};

// Mark status as viewed
export const viewStatusUpdate = async (
  statusId: string,
  userId: string
): Promise<void> => {
  const statusDoc = doc(db, "statusUpdates", statusId);
  await updateDoc(statusDoc, {
    views: arrayUnion(userId)
  });
};

// React to status
export const reactToStatus = async (
  statusId: string,
  emoji: string,
  userId: string
): Promise<void> => {
  const statusDoc = doc(db, "statusUpdates", statusId);
  const snap = await getDocs(query(collection(db, "statusUpdates"), where("__name__", "==", statusId)));
  if (snap.empty) return;

  const status = snap.docs[0].data() as StatusUpdate;
  const reactions = status.reactions || {};
  const current = reactions[emoji] || [];
  const hasReacted = current.includes(userId);

  const updatedReactions = { ...reactions };
  if (hasReacted) {
    updatedReactions[emoji] = current.filter(id => id !== userId);
    if (updatedReactions[emoji].length === 0) delete updatedReactions[emoji];
  } else {
    updatedReactions[emoji] = [...current, userId];
  }

  await updateDoc(statusDoc, { reactions: updatedReactions });
};