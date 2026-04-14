import { UserProfile } from 'firebase/auth';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
  autoConnect: true,
});


// ==========================
// 🔹 GROUP CHAT FEATURES
// ==========================

export const emitCreateGroup = (groupData: UserProfile) => {
  if (socket.connected) {
    socket.emit("create_group", groupData);
  }
};

export const onGroupCreated = (callback: (group: UserProfile) => void) => {
  socket.on("group_created", callback);

  return () => {
    socket.off("group_created", callback);
  };
};

export const joinGroupRoom = (groupId: string) => {
  if (socket.connected) {
    socket.emit("join_group", { groupId });
  }
};


// ==========================
// 🚀 CORE CHAT FEATURES
// ==========================

// ✅ SEND MESSAGE
export const emitSendMessage = (data: any) => {
  socket.emit("message:send", data);
};

// ✅ RECEIVE NEW MESSAGE
export const onNewMessage = (callback: (message: any) => void) => {
  socket.on("message:new", callback);

  return () => {
    socket.off("message:new", callback);
  };
};


// ==========================
// ✏️ EDIT MESSAGE
// ==========================

export const emitEditMessage = (data: {
  messageId: string;
  text: string;
}) => {
  socket.emit("message:edit", data);
};

export const onEditMessage = (callback: (message: any) => void) => {
  socket.on("message:edit", callback);

  return () => {
    socket.off("message:edit", callback);
  };
};


// ==========================
// 🗑 DELETE MESSAGE (ME + EVERYONE)
// ==========================

export const emitDeleteMessage = (data: {
  messageId: string;
  forEveryone: boolean;
}) => {
  socket.emit("message:delete", data);
};

export const onDeleteMessage = (
  callback: (data: {
    messageId: string;
    userId: string;
    forEveryone: boolean;
  }) => void
) => {
  socket.on("message:delete", callback);

  return () => {
    socket.off("message:delete", callback);
  };
};


// ==========================
// ❤️ REACTIONS
// ==========================

export const emitReaction = (data: {
  messageId: string;
  emoji: string;
}) => {
  socket.emit("message:reaction", data);
};

export const onReaction = (callback: (data: any) => void) => {
  socket.on("message:reaction", callback);

  return () => {
    socket.off("message:reaction", callback);
  };
};


// ==========================
// 👀 SEEN / DELIVERED
// ==========================

export const emitSeen = (messageId: string) => {
  socket.emit("message:seen", { messageId });
};

export const onSeen = (callback: (data: any) => void) => {
  socket.on("message:seen", callback);

  return () => {
    socket.off("message:seen", callback);
  };
};


// ==========================
// ⌨️ TYPING INDICATOR
// ==========================

export const emitTyping = (chatId: string) => {
  socket.emit("typing", { chatId });
};

export const emitStopTyping = (chatId: string) => {
  socket.emit("stop_typing", { chatId });
};

export const onTyping = (callback: (data: { userId: string }) => void) => {
  socket.on("typing", callback);

  return () => {
    socket.off("typing", callback);
  };
};

export const onStopTyping = (callback: (data: { userId: string }) => void) => {
  socket.on("stop_typing", callback);

  return () => {
    socket.off("stop_typing", callback);
  };
};


// ==========================
// 🟢 ONLINE / LAST SEEN
// ==========================

export const onUserOnline = (callback: (userId: string) => void) => {
  socket.on("user:online", callback);

  return () => {
    socket.off("user:online", callback);
  };
};

export const onUserOffline = (
  callback: (data: { userId: string; lastSeen: string }) => void
) => {
  socket.on("user:offline", callback);

  return () => {
    socket.off("user:offline", callback);
  };
};