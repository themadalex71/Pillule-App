import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

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

function createConnectToken() {
  return randomBytes(24).toString("hex");
}

export async function POST(request: Request) {
  try {
    const botUsername = String(process.env.TELEGRAM_BOT_USERNAME || "").trim();
    if (!botUsername) {
      return NextResponse.json(
        { error: "TELEGRAM_BOT_USERNAME manquant." },
        { status: 500 },
      );
    }

    const uid = await getCurrentUid(request);
    const token = createConnectToken();
    const key = `telegram:connect:${token}`;

    await kv.set(key, uid, { ex: 900 });

    const connectUrl = `https://t.me/${botUsername}?start=${token}`;

    return NextResponse.json({
      success: true,
      connectUrl,
      expiresInSeconds: 900,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    const status = message === "Non autorise." ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

