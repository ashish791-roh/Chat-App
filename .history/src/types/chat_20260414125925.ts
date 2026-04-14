import { Timestamp } from "firebase/firestore";

// ✅ ADD THIS (IMPORTANT)
export interface UserProfile {
  uid: string;
  displayName: string;
  username?: string | null;
  phoneNumber?: string;
  avatar?: string | null;
  isOnline?: boolean;
}

// ✅ ADD THIS (IMPORTANT)
export interface Message {
  id: string;
  text: string;
  senderId: string;
  chatId: string;

  createdAt: string;
  updatedAt?: string;

  // ✅ NEW FEATURES
  edited?: boolean;
  editHistory?: string[];

  deletedFor?: string[]; // userIds
  deletedForEveryone?: boolean;

  replyTo?: Message;

  reactions?: {
    [emoji: string]: string[]; // userIds
  };

  seenBy?: string[];
}

// ─── Chat ─────────────────────────────────────────────

export interface Chat {
  id: string;
  name: string;
  isGroup: boolean;
  lastMessage: string;
  lastMessageAt?: Timestamp | null;
  status: string;
  isOnline?: boolean;
  members?: string[];
  pinnedMessage?: {
    id: string;
    text: string;
    senderName: string;
  } | null;
}

// ─── Call ─────────────────────────────────────────────

export type CallState =
  | "idle"
  | "calling"
  | "incoming"
  | "active"
  | "ended";

export interface ActiveCall {
  callId: string;
  peerId: string;
  peerName: string;
  peerPhone?: string;
  isVideo: boolean;
  direction: "outgoing" | "incoming";
  _offer?: RTCSessionDescriptionInit;
}

// ─── Online Status Map ────────────────────────────────

export type OnlineStatusMap = Record<string, boolean>;