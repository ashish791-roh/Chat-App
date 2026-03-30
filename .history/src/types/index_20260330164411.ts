// src/types/index.ts
export interface UserProfile {
  uid: string;
  displayName: string;
  username: string; 
  phoneNumber: string; 
  photoURL?: string; // Added for DP
  bio?: string;
  lastSeen?: string;
  contacts: string[]; // List of UIDs
  notificationSettings: {
    enabled: boolean;
  };
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isMe: boolean;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  reactions?: { [emoji: string]: string[] }; // Emoji -> List of UserIDs
  isDeleted?: boolean;
  isDeletedForMe?: boolean;
}