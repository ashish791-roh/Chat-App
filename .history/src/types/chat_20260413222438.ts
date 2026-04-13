import { Timestamp } from "firebase/firestore";

// ✅ ADD THIS (IMPORTANT)
export interface UserProfile {
  uid: string;
  displayName: string;
  phoneNumber?: string;
  avatar?: string | null;
  isOnline?: boolean;
}

// ✅ ADD THIS (IMPORTANT)
export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp?: Timestamp;
  status?: "sent" | "delivered" | "seen";
  isDeleted?: boolean;
  fileType?: string;
  fileName?: string;
  reactions?: Record<string, string[]>;
  isMe?: boolean;
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