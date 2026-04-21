import { Timestamp } from "firebase/firestore";

// ─── User / Friend ─────────────────────────────────────────────────────────
export interface UserProfile {
  uid: string;

  // Basic Info
  displayName: string;
  username?: string | null;
  phoneNumber?: string;

  // Profile
  avatar?: string | null;
  bio?: string | null;

  // Status
  isOnline?: boolean;
  lastSeen?: unknown; // could be Timestamp or Date, depending on how you store it

  // Optional extras
  email?: string | null;
}

// ─── Status Update ─────────────────────────────────────────────────

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
  userId?: string; // For DM chats, the other user's ID
  pinnedMessage?: {
    id: string;
    text: string;
    senderName: string;
  } | null;
}

// ─── Message ───────────────────────────────────────────────────────────────

// Message types for different content
export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'voice'
  | 'file'
  | 'document'
  | 'location'
  | 'contact'
  | 'gif'
  | 'sticker';

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId?: string;
  groupId?: string;
  text: string;
  type: MessageType;
  timestamp: string;
  isMe: boolean;
  status: "sending" | "sent" | "delivered" | "read";
  replyTo?: { id: string; text: string; senderName: string };
  reactions?: Record<string, string[]>;
  isDeleted?: boolean;
  isEdited?: boolean;
  deletedFor?: string[];
  starredBy?: string[];

  // Media and file attachments
  mediaUrl?: string;
  mediaType?: string;
  fileName?: string;
  fileSize?: number;
  thumbnailUrl?: string;

  // Voice messages
  voiceUrl?: string;
  voiceDuration?: number;

  // Location sharing
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };

  // Contact sharing
  contact?: {
    name: string;
    phoneNumber: string;
    avatar?: string;
    userId?: string;
  };

  // Disappearing messages
  expiresAt?: Timestamp;
  isDisappearing?: boolean;

  // Status updates (stories)
  isStatus?: boolean;
  statusViews?: string[];
  statusExpiresAt?: Timestamp;

  // ── File / media fields ──────────────────────────────────────────────────
  fileType?: "image" | "pdf" | "file";
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