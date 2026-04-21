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

// ✅ Enhanced Message interface
export interface Message {
  id: string;
  text: string;
  senderId: string;
  chatId: string;
  type: MessageType;

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
  };

  // Disappearing messages
  expiresAt?: Timestamp;
  isDisappearing?: boolean;

  // Starred messages
  starredBy?: string[];

  // Status updates (stories)
  isStatus?: boolean;
  statusViews?: string[];
  statusExpiresAt?: Timestamp;
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
  userId?: string; // For DM chats, the other user's ID
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

// ─── Status Updates (Stories) ─────────────────────────

export interface StatusUpdate {
  id: string;
  userId: string;
  type: 'text' | 'image' | 'video';
  content: string;
  mediaUrl?: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  views: string[]; // userIds who viewed
  reactions?: {
    [emoji: string]: string[]; // userIds
  };
}

// ─── Voice Recording ──────────────────────────────────

export interface VoiceRecording {
  blob: Blob;
  duration: number;
  url: string;
}

// ─── Location ─────────────────────────────────────────

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  timestamp: number;
}

// ─── Contact ──────────────────────────────────────────

export interface ContactData {
  name: string;
  phoneNumber: string;
  avatar?: string;
  userId?: string; // if it's another app user
}