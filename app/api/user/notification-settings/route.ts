import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebase/admin";
import {
  normalizeTimeZone,
  normalizeUserNotificationSettings,
} from "@/lib/notifications/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  const [scheme, token] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new Error("Non autorise.");
  }

  return token;
}

async function getCurrentUid(request: Request) {
  const token = getBearerToken(request);
  const decoded = await getFirebaseAdminAuth().verifyIdToken(token);
  return decoded.uid;
}

export async function GET(request: Request) {
  try {
    const uid = await getCurrentUid(request);
    const db = getFirebaseAdminDb();
    const userSnapshot = await db.collection("users").doc(uid).get();
    const userData = userSnapshot.exists ? userSnapshot.data() : {};
    const settings = normalizeUserNotificationSettings(userData);

    return NextResponse.json({ settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    const status = message === "Non autorise." ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const uid = await getCurrentUid(request);
    const body = await request.json().catch(() => ({}));
    const db = getFirebaseAdminDb();
    const userRef = db.collection("users").doc(uid);
    const userSnapshot = await userRef.get();
    const existingData = userSnapshot.exists ? userSnapshot.data() : {};
    const normalized = normalizeUserNotificationSettings({
      notificationSettings: {
        ...(existingData?.notificationSettings || {}),
        ...body,
      },
    });

    const nextSettings = {
      telegramChatId: normalized.telegramChatId,
      timezone: normalizeTimeZone(normalized.timezone),
      pilluleEnabled: normalized.pilluleEnabled,
      gameEnabled: normalized.gameEnabled,
      pilluleReminderHour: normalized.pilluleReminderHour,
      pilluleReminderRepeatCount: normalized.pilluleReminderRepeatCount,
      pilluleReminderRepeatIntervalMinutes: normalized.pilluleReminderRepeatIntervalMinutes,
      gameReminderHour: normalized.gameReminderHour,
      pushEnabled: normalized.pushEnabled,
      webPushTokens: normalized.webPushTokens,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await userRef.set(
      {
        notificationSettings: nextSettings,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json({
      success: true,
      settings: normalized,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    const status = message === "Non autorise." ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
