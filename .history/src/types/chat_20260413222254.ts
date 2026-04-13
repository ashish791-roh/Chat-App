import { Timestamp } from "firebase/firestore";
import { UserProfile, Message } from "./index";

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