"use client";
import { useEffect, useState, useCallback } from "react";
import {
  registerFCM,
  unregisterFCM,
  subscribeForegroundMessages,
  ForegroundNotificationPayload,
} from "@/lib/fcm";
 
export function useFCM(
  userId: string | null,
  onNotificationClick?: (chatId: string) => void
) {
  const [notification, setNotification] = useState<ForegroundNotificationPayload | null>(null);

  useEffect(() => {
    if (!userId) return;
    registerFCM(userId);
 
    return () => {
      unregisterFCM(userId);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
 
    const unsub = subscribeForegroundMessages((payload) => {
      setNotification(payload);
      setTimeout(() => setNotification(null), 5000);
    });
 
    return unsub;
  }, [userId]);

  useEffect(() => {
    if (!onNotificationClick || typeof navigator === "undefined") return;
 
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "NOTIFICATION_CLICK" && event.data.chatId) {
        onNotificationClick(event.data.chatId);
      }
    };
 
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [onNotificationClick]);
 
  const clearNotification = useCallback(() => setNotification(null), []);
 
  return { notification, clearNotification };
}
