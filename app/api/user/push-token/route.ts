import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebase/admin";

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

function normalizeToken(value: unknown) {
  return String(value || "").trim();
}

export async function POST(request: Request) {
  try {
    const uid = await getCurrentUid(request);
    const body = await request.json().catch(() => ({}));
    const pushToken = normalizeToken(body?.pushToken);

    if (!pushToken) {
      return NextResponse.json({ error: "Token push manquant." }, { status: 400 });
    }

    const db = getFirebaseAdminDb();
    await db
      .collection("users")
      .doc(uid)
      .set(
        {
          notificationSettings: {
            webPushTokens: FieldValue.arrayUnion(pushToken),
            pushEnabled: true,
            updatedAt: FieldValue.serverTimestamp(),
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    const status = message === "Non autorise." ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const uid = await getCurrentUid(request);
    const body = await request.json().catch(() => ({}));
    const pushToken = normalizeToken(body?.pushToken);

    if (!pushToken) {
      return NextResponse.json({ error: "Token push manquant." }, { status: 400 });
    }

    const db = getFirebaseAdminDb();
    await db
      .collection("users")
      .doc(uid)
      .set(
        {
          notificationSettings: {
            webPushTokens: FieldValue.arrayRemove(pushToken),
            updatedAt: FieldValue.serverTimestamp(),
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    const status = message === "Non autorise." ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

