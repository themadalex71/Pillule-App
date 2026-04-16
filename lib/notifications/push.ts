import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminDb, getFirebaseAdminMessaging } from "@/lib/firebase/admin";
import { normalizeUserNotificationSettings } from "@/lib/notifications/settings";

type PushMessageInput = {
  title: string;
  body: string;
  url: string;
};

type PushDeliveryResult = {
  delivered: boolean;
  attempted: number;
  sent: number;
};

function isInvalidTokenError(error: unknown) {
  const code = typeof error === "object" && error ? String((error as any).code || "") : "";
  return (
    code.includes("registration-token-not-registered") ||
    code.includes("invalid-registration-token")
  );
}

export async function sendPushNotificationToUser(
  uid: string,
  userData: any,
  message: PushMessageInput,
): Promise<PushDeliveryResult> {
  const settings = normalizeUserNotificationSettings(userData);
  const tokens = settings.pushEnabled ? settings.webPushTokens : [];

  if (!settings.pushEnabled || tokens.length === 0) {
    return {
      delivered: false,
      attempted: 0,
      sent: 0,
    };
  }

  const messaging = getFirebaseAdminMessaging();
  const invalidTokens: string[] = [];
  let sent = 0;

  for (const token of tokens) {
    try {
      await messaging.send({
        token,
        notification: {
          title: message.title,
          body: message.body,
        },
        webpush: {
          fcmOptions: {
            link: message.url,
          },
          notification: {
            icon: "/vercel.svg",
            badge: "/vercel.svg",
          },
        },
        data: {
          url: message.url,
        },
      });
      sent += 1;
    } catch (error) {
      if (isInvalidTokenError(error)) {
        invalidTokens.push(token);
      } else {
        console.error(`push send error for uid=${uid}:`, error);
      }
    }
  }

  if (invalidTokens.length > 0) {
    try {
      const db = getFirebaseAdminDb();
      await db
        .collection("users")
        .doc(uid)
        .set(
          {
            notificationSettings: {
              webPushTokens: FieldValue.arrayRemove(...invalidTokens),
              updatedAt: FieldValue.serverTimestamp(),
            },
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
    } catch (error) {
      console.error(`push cleanup error for uid=${uid}:`, error);
    }
  }

  return {
    delivered: sent > 0,
    attempted: tokens.length,
    sent,
  };
}

