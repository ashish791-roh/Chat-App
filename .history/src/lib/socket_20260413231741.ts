import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  autoConnect: true,
});

// --- NEW GROUP CHAT FEATURES ---

/**
 * Emits a new group creation to the server
 * @param groupData The group object containing name, memberIds, etc.
 */
export const emitCreateGroup = (groupData: un) => {
  if (socket.connected) {
    socket.emit("create_group", groupData);
  }
};

/**
 * Listens for new groups being created where the current user is a member
 * @param callback Function to handle the new group data in the UI
 */
export const onGroupCreated = (callback: (group: any) => void) => {
  socket.on("group_created", callback);
  
  // Cleanup function to prevent multiple listeners
  return () => {
    socket.off("group_created", callback);
  };
};

/**
 * Join a specific group room for real-time messaging
 * @param groupId The unique ID of the group
 */
export const joinGroupRoom = (groupId: string) => {
  if (socket.connected) {
    socket.emit("join_group", { groupId });
  }
};