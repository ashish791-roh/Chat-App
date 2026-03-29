import { io } from 'socket.io-client';

// Replace with backend URL later
const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  autoConnect: false, // Don't connect until the user logs in
});