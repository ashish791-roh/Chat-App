// @/types/chat.ts
import { Timestamp } from "firebase/firestore";
export interface UserProfile {
  uid: string;
  displayName: string;
  username?: string | null;
  avatar?: string | null;
  phoneNumber?: string | null;
  isOnline?: boolean;
  lastSeen?: Timestamp | null;
}

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

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId?: string;
  groupId?: string;
  text: string;
  timestamp: string;
  isMe: boolean;
  status: "sent" | "delivered" | "read";
  replyTo?: { id: string; text: string; senderName: string };
  reactions?: Record<string, string[]>;
  isDeleted?: boolean;
  gift?: { id: string; emoji: string; label: string; cost: number };
}

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

export type OnlineStatusMap = Record<string, boolean>;
