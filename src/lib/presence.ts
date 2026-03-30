import { rtdb } from "./firebase";
import {
  ref,
  set,
  onValue,
  onDisconnect,
  serverTimestamp,
  off,
} from "firebase/database";


export const goOnline = (userId: string): void => {
  const userStatusRef = ref(rtdb, `status/${userId}`);
  const connectedRef = ref(rtdb, ".info/connected");

  onValue(connectedRef, (snap) => {
    if (!snap.val()) return;

    // Mark online
    set(userStatusRef, {
      isOnline: true,
      lastSeen: serverTimestamp(),
    });

    onDisconnect(userStatusRef).set({
      isOnline: false,
      lastSeen: serverTimestamp(),
    });
  });
};

export const goOffline = async (userId: string): Promise<void> => {
  const userStatusRef = ref(rtdb, `status/${userId}`);
  await set(userStatusRef, {
    isOnline: false,
    lastSeen: serverTimestamp(),
  });
};

export const subscribeToPresence = (
  userId: string,
  callback: (isOnline: boolean) => void
): (() => void) => {
  const statusRef = ref(rtdb, `status/${userId}`);
  const handler = onValue(statusRef, (snap) => {
    callback(snap.val()?.isOnline ?? false);
  });
  return () => off(statusRef, "value", handler);
};


export const startTyping = (convId: string, userId: string): void => {
  set(ref(rtdb, `typing/${convId}/${userId}`), true);
};


export const stopTyping = (convId: string, userId: string): void => {
  set(ref(rtdb, `typing/${convId}/${userId}`), null);
};

export const subscribeToTyping = (
  convId: string,
  otherUserId: string,
  callback: (isTyping: boolean) => void
): (() => void) => {
  const typingRef = ref(rtdb, `typing/${convId}/${otherUserId}`);
  const handler = onValue(typingRef, (snap) => {
    callback(snap.val() === true);
  });
  return () => off(typingRef, "value", handler);
};
