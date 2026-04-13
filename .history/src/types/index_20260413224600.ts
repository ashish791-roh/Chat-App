import { Timestamp } from "firebase/firestore";

// ─── User / Friend ─────────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  displayName: string;
  username?: string | null;
  avatar?: string | null;
  phoneNumber?: string | null;
  isOnline?: boolean;
  lastSeen?: Timestamp | null;
  coins?: number;
}

// ─── Chat ──────────────────────────────────────────────────────────────────

export interface Chat {
  id: string;
  name: string;
  isGroup: boolean;
  lastMessage: string;
  lastMessageAt?: Timestamp | null;
  status: string;
  isOnline?: boolean;
  members?: string[];
}

// ─── Message ───────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId?: string;
  groupId?: string;
  text: string;
  timestamp: string;
  isMe: boolean;
  status: "sending" | "sent" | "delivered" | "read";
  replyTo?: { id: string; text: string; senderName: string };
  reactions?: Record<string, string[]>;
  isDeleted?: boolean;
  isEdited?: boolean;
  starredBy?: string[];
  // ── File / media fields ──────────────────────────────────────────────────
  fileType?: "image" | "pdf" | "file";
  fileName?: string;
  gift?: { id: string; emoji: string; label: string; cost: number; };
  coinTransfer?: { amount: number; };
  callLog?: { duration: number; isVideo: boolean; status: "completed" | "missed" | "declined"; };
}

// ─── Call ──────────────────────────────────────────────────────────────────

export type CallState =
  | "idle"
  | "calling"   // outgoing, waiting for answer
  | "incoming"  // receiving a call
  | "active"    // call connected
  | "ended";    // call finished, transitioning back to idle

export interface ActiveCall {
  callId: string;
  peerId: string;
  peerName: string;
  peerPhone?: string;
  isVideo: boolean;
  direction: "outgoing" | "incoming";
  _offer?: RTCSessionDescriptionInit; // stored on incoming before accept
}

// ─── Online Status Map ─────────────────────────────────────────────────────

export type OnlineStatusMap = Record<string, boolean>;