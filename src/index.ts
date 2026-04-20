import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
admin.initializeApp();
 
const db        = admin.firestore();
const messaging = admin.messaging();

// sendPushOnNewMessage
export const sendPushOnNewMessage = functions.firestore.onDocumentCreated(
  "chats/{chatId}/messages/{messageId}",
  async (event) => {
    const snap   = event.data;
    if (!snap) return;
 
    const message = snap.data() as {
      senderId:   string;
      senderName: string;
      text:       string;
      receiverId?: string;  
      groupId?:   string;   
      members?:   string[];  
      isDeleted?: boolean;
    };
 
    const chatId = event.params.chatId;
    if (message.isDeleted) return;

    let recipientUids: string[] = [];
 
    if (message.groupId) {
      const chatDoc = await db.collection("chats").doc(chatId).get();
      const members: string[] = chatDoc.data()?.members ?? [];
      recipientUids = members.filter((uid) => uid !== message.senderId);
    } else if (message.receiverId) {
      recipientUids = [message.receiverId];
    } else {
      const chatDoc = await db.collection("chats").doc(chatId).get();
      const members: string[] = chatDoc.data()?.members ?? [];
      recipientUids = members.filter((uid) => uid !== message.senderId);
    }
 
    if (recipientUids.length === 0) return;
    const tokenPromises = recipientUids.map((uid) =>
      db.collection("users").doc(uid).get()
    );
    const userDocs = await Promise.all(tokenPromises);
 
    const staleTokens: Array<{ uid: string; token: string }> = [];
    const allMessages: admin.messaging.Message[] = [];
 
    for (let i = 0; i < userDocs.length; i++) {
      const userDoc  = userDocs[i];
      const uid      = recipientUids[i];
      const fcmTokens: Record<string, boolean> = userDoc.data()?.fcmTokens ?? {};
 
      for (const token of Object.keys(fcmTokens)) {
        const bodyText = message.text.startsWith("data:")
          ? "📎 Sent an attachment"
          : message.text.startsWith("FILE::")
          ? "📎 Sent a file"
          : message.text.slice(0, 120);
 
        allMessages.push({
          token,
          data: {
            title:      message.senderName,
            body:       bodyText,
            chatId,
            senderName: message.senderName,
            senderId:   message.senderId,
          },
          android: {
            priority: "high",
            notification: {
              channelId: "blinkchat_messages",
              sound:     "default",
            },
          },
          apns: {
            payload: {
              aps: {
                alert: {
                  title: message.senderName,
                  body:  bodyText,
                },
                sound: "default",
                badge: 1,
              },
            },
          },
          webpush: {
            headers: { Urgency: "high" },
          },
        });
      }
    }
 
    if (allMessages.length === 0) return;
    const BATCH_SIZE = 500;
    for (let start = 0; start < allMessages.length; start += BATCH_SIZE) {
      const batch    = allMessages.slice(start, start + BATCH_SIZE);
      const response = await messaging.sendEach(batch);

      response.responses.forEach((res, idx) => {
        if (!res.success) {
          const code = res.error?.code;
          if (
            code === "messaging/invalid-registration-token" ||
            code === "messaging/registration-token-not-registered"
          ) {
            const failedMsg = batch[idx];
            const token     = typeof failedMsg.token === "string" ? failedMsg.token : null;
            if (token) {
              // Find which user owned this token
              for (let i = 0; i < userDocs.length; i++) {
                const tokens = Object.keys(userDocs[i].data()?.fcmTokens ?? {});
                if (tokens.includes(token)) {
                  staleTokens.push({ uid: recipientUids[i], token });
                  break;
                }
              }
            }
          }
        }
      });
 
      functions.logger.info(
        `FCM batch sent: ${response.successCount} ok, ${response.failureCount} failed`
      );
    }
    if (staleTokens.length > 0) {
      const cleanupBatch = db.batch();
      for (const { uid, token } of staleTokens) {
        cleanupBatch.update(db.collection("users").doc(uid), {
          [`fcmTokens.${token}`]: admin.firestore.FieldValue.delete(),
        });
      }
      await cleanupBatch.commit();
      functions.logger.info(`Removed ${staleTokens.length} stale FCM tokens`);
    }
  }
);
