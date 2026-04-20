importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");
firebase.initializeApp({
  apiKey:            self.__FIREBASE_API_KEY__            || "AIzaSyDNcbtYKWmjFQqMam-1l7QxAN7NW5mDKCA",
  authDomain:        self.__FIREBASE_AUTH_DOMAIN__        || "chat-app-fa051.firebaseapp.com",
  projectId:         self.__FIREBASE_PROJECT_ID__         || "chat-app-fa051",
  storageBucket:     self.__FIREBASE_STORAGE_BUCKET__     || "chat-app-fa051.firebasestorage.app",
  messagingSenderId: self.__FIREBASE_MESSAGING_SENDER_ID__ || "420985704789",
  appId:             self.__FIREBASE_APP_ID__             || "420985704789:web:4db455607bd089f3fb9fdc",
});
 
const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Background message received:", payload);
  const { title, body, icon, chatId, senderName } = payload.data ?? {};
  const notificationTitle = title || senderName || "BlinkChat";
  const notificationOptions = {
    body:  body  || "You have a new message",
    icon:  icon  || "/favicon.ico",
    badge: "/favicon.ico",
    tag:   chatId || "blinkchat-message",   
    renotify: true,                         
    data: { chatId, url: "/" },              
    actions: [
      { action: "open",    title: "Open chat" },
      { action: "dismiss", title: "Dismiss"   },
    ],
  };
  return self.registration.showNotification(notificationTitle, notificationOptions);
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.postMessage({
            type: "NOTIFICATION_CLICK",
            chatId: event.notification.data?.chatId,
          });
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
