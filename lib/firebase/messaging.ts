"use client";

import { getFirebaseApp } from "@/lib/firebase/client";

type PushInitResult =
  | {
      supported: false;
      reason: string;
    }
  | {
      supported: true;
      permission: NotificationPermission;
      token: string | null;
      reason?: string;
    };

async function canUsePushInBrowser() {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;
  if (!("serviceWorker" in navigator)) return false;
  return true;
}

export async function requestBrowserPushToken(): Promise<PushInitResult> {
  if (!(await canUsePushInBrowser())) {
    return {
      supported: false,
      reason: "Ce navigateur ne supporte pas les notifications push.",
    };
  }

  const { isSupported, getMessaging, getToken } = await import("firebase/messaging");
  const messagingSupported = await isSupported().catch(() => false);
  if (!messagingSupported) {
    return {
      supported: false,
      reason: "Firebase Messaging n'est pas supporte sur cet appareil.",
    };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      supported: true,
      permission,
      token: null,
      reason: "Permission de notification non accordee.",
    };
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    return {
      supported: true,
      permission,
      token: null,
      reason: "NEXT_PUBLIC_FIREBASE_VAPID_KEY manquant.",
    };
  }

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const messaging = getMessaging(getFirebaseApp());
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  return {
    supported: true,
    permission,
    token: token || null,
  };
}

