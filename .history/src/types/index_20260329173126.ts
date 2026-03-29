export interface User {
  id: string;
  name: string;
  avatar?: string;
  isOnline: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string; // ISO string for easy sorting
  isMe: boolean;     // Helper for UI alignment
}