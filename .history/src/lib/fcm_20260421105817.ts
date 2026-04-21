import { getMessaging, getToken, onMessage, deleteToken, MessagePayload } from "firebase/messaging";
import { doc, setDoc, deleteField, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { initializeApp, getApps, getApp } from "firebase/app";
 
const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
 
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
 
export interface ForegroundNotificationPayload {
  title:      string;
  body:       string;
  chatId?:    string;
  senderName?: string;
}

// registerFCM

export async function registerFCM(userId: string): Promise<string | null> {
  // FCM requires a browser environment
  if (typeof window === "undefined" || !("Notification" in window)) return null;
 
  try {

    const swRegistration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      { scope: "/" }
    );
 
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("[FCM] Notification permission denied");
      return null;
    }
 
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error("[FCM] NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set");
      return null;
    }
 
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    });
 
    if (!token) {
      console.warn("[FCM] No token returned — check VAPID key");
      return null;
    }
 
    await setDoc(
      doc(db, "users", userId),
      { fcmTokens: { [token]: true } },
      { merge: true }
    );
 
    console.log("[FCM] Token registered:", token.slice(0, 20) + "...");
    return token;
  } catch (err) {
    console.error("[FCM] Registration failed:", err);
    return null;
  }
}

// unregisterFCM
export async function unregisterFCM(userId: string): Promise<void> {
  if (typeof window === "undefined") return;
 
  try {
    const messaging = getMessaging(app);
    const vapidKey   = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

    let token: string | null = null;
    try {
      const swReg = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
      if (swReg && vapidKey) {
        token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg });
      }
    } catch {
      // Ignore — token may already be gone
    }
 
    await deleteToken(messaging);
 
    if (token) {
      await updateDoc(doc(db, "users", userId), {
        [`fcmTokens.${token}`]: deleteField(),
      });
    }
 
    console.log("[FCM] Token unregistered for user:", userId);
  } catch (err) {
    console.error("[FCM] Unregister failed:", err);
  }
}
// subscribeForegroundMessages
export function subscribeForegroundMessages(
  onNotification: (payload: ForegroundNotificationPayload) => void
): () => void {
  if (typeof window === "undefined") return () => {};
 
  const messaging = getMessaging(app);
 
  const unsub = onMessage(messaging, (payload: MessagePayload) => {
    const { title, body, chatId, senderName } = payload.data ?? {};
    onNotification({
      title:      title      || senderName  || "BlinkChat",
      body:       body       || "New message",
      chatId,
      senderName,
    });
  });
 
  return unsub;
}
