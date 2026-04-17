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

function splitDisplayName(displayName: string) {
  const parts = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function sanitizeUsername(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");

  return normalized.slice(0, 30);
}

export async function POST(request: Request) {
  try {
    const idToken = getBearerToken(request);
    const decoded = await getFirebaseAdminAuth().verifyIdToken(idToken);

    if (!decoded.email_verified) {
      return NextResponse.json(
        { error: "Email non verifie." },
        { status: 403 },
      );
    }

    const uid = decoded.uid;
    const email = String(decoded.email || "").trim();
    const fallbackDisplayName = email ? email.split("@")[0] : `user-${uid.slice(0, 8)}`;
    const displayName = String(decoded.name || "").trim() || fallbackDisplayName;
    const { firstName, lastName } = splitDisplayName(displayName);
    const usernameFromEmail = sanitizeUsername((email.split("@")[0] || "").trim());

    const db = getFirebaseAdminDb();
    const userRef = db.collection("users").doc(uid);
    const userSnapshot = await userRef.get();
    const existing = userSnapshot.exists ? (userSnapshot.data() || {}) : {};

    const patch: Record<string, unknown> = {
      email,
      displayName,
      emailVerified: true,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (!existing.createdAt) {
      patch.createdAt = FieldValue.serverTimestamp();
    }

    if (!existing.firstName && firstName) {
      patch.firstName = firstName;
    }

    if (!existing.lastName && lastName) {
      patch.lastName = lastName;
    }

    if (!existing.username && usernameFromEmail) {
      patch.username = usernameFromEmail;
    }

    await userRef.set(patch, { merge: true });

    return NextResponse.json({
      success: true,
      existed: userSnapshot.exists,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    const status = message === "Non autorise." ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
