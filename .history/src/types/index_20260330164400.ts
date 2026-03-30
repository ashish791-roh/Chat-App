// src/types/index.ts


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