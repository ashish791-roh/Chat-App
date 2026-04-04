import {
  doc, getDoc, setDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─── DM chat ID ────────────────────────────────────────────────────────────
// Deterministic: always sorted so both users resolve to the same document.

export function getDmId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join("_");
}

// ─── Ensure DM chat document exists (idempotent) ──────────────────────────

export async function ensureDmChat(
  myUid: string,
  otherUid: string,
  otherName: string
): Promise<string> {
  const chatId = getDmId(myUid, otherUid);
  const chatRef = doc(db, "chats", chatId);
  const snap = await getDoc(chatRef);

  if (!snap.exists()) {
    await setDoc(chatRef, {
      isGroup: false,
      name: otherName,
      members: [myUid, otherUid],
      lastMessage: "",
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  }

  return chatId;
}

// ─── Phone validation ──────────────────────────────────────────────────────

export function validatePhone(phone: string): boolean {
  // Must start with optional +, then 7–15 digits, no spaces
  return /^\+?[1-9]\d{6,14}$/.test(phone.replace(/\s/g, ""));
}

// ─── cn helper ────────────────────────────────────────────────────────────

export function cn(
  ...inputs: (string | false | null | undefined)[]
): string {
  return inputs.filter(Boolean).join(" ");
}