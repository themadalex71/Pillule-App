import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { kv } from "@vercel/kv";
import { getFirebaseAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TelegramMessage = {
  chat?: {
    id?: number | string;
  };
  text?: string;
};

type TelegramUpdate = {
  message?: TelegramMessage;
};

async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });
}

function extractStartToken(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) return null;
  if (!parts[0].startsWith("/start")) return null;
  return parts[1].trim() || null;
}

export async function POST(request: Request) {
  const botToken = String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
  if (!botToken) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN manquant." }, { status: 500 });
  }

  const expectedSecret = String(process.env.TELEGRAM_WEBHOOK_SECRET || "").trim();
  if (expectedSecret) {
    const incomingSecret = String(request.headers.get("x-telegram-bot-api-secret-token") || "");
    if (!incomingSecret || incomingSecret !== expectedSecret) {
      return NextResponse.json({ error: "Webhook Telegram non autorise." }, { status: 401 });
    }
  }

  try {
    const payload = (await request.json().catch(() => null)) as TelegramUpdate | null;
    const message = payload?.message;
    const chatId = message?.chat?.id !== undefined ? String(message?.chat?.id) : "";
    const text = String(message?.text || "");

    if (!chatId || !text) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const startToken = extractStartToken(text);
    if (!startToken) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const key = `telegram:connect:${startToken}`;
    const uid = await kv.get<string>(key);

    if (!uid) {
      await sendTelegramMessage(
        botToken,
        chatId,
        "Ce lien de connexion a expire. Retourne dans HarmoHome et clique a nouveau sur Connecter Telegram.",
      );
      return NextResponse.json({ success: true, linked: false, reason: "token_expired" });
    }

    const db = getFirebaseAdminDb();
    await db
      .collection("users")
      .doc(uid)
      .set(
        {
          notificationSettings: {
            telegramChatId: chatId,
            updatedAt: FieldValue.serverTimestamp(),
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    await kv.del(key);

    await sendTelegramMessage(
      botToken,
      chatId,
      "Telegram est maintenant connecte a ton compte HarmoHome. Tu peux revenir dans l'app.",
    );

    return NextResponse.json({ success: true, linked: true });
  } catch (error) {
    console.error("telegram webhook error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

