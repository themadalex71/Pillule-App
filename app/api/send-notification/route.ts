import { NextResponse } from 'next/server';
import Redis from 'ioredis';

// 1. Force le mode dynamique
export const dynamic = 'force-dynamic';

export async function GET() {
  // --- SECURITÉ ANTI-CRASH BUILD ---
  if (!process.env.REDIS_URL) {
    return NextResponse.json({ message: 'Build mode: Pas de Redis, on passe.' });
  }

  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    const today = new Date();
    const dateStr = today.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });

    // --- CORRECTION SSL + OPTIONS ---
    let connectionString = process.env.REDIS_URL;
    if (connectionString && connectionString.startsWith("redis://")) {
      connectionString = connectionString.replace("redis://", "rediss://");
    }

    // 👇 LA NOUNOUVEAUTÉ EST ICI : On ajoute des options pour faciliter la connexion
    const redis = new Redis(connectionString, {
        tls: { rejectUnauthorized: false } 
    });
    
    const key = `pill_${dateStr}`;
    const isTaken = await redis.get(key);
    await redis.quit(); 

    // VERDICT
    if (isTaken === 'true') {
      return NextResponse.json({ message: 'Déjà pris aujourd’hui. Silence radio.' });
    }

    // ENVOI TELEGRAM
    const message = `⚠️ Rappel Pilule ! \n\nTu n'as pas encore coché la case d'aujourd'hui (${dateStr}). \n\n✅ Coche-la vite ici : https://rappel-pillule.vercel.app`;

    if (token && chatId) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message }),
      });
    }
    
    return NextResponse.json({ success: true, message: 'Rappel envoyé !' });

  } catch (error: any) {
    console.error(error);
    // 👇 ON AFFICHE LA VRAIE ERREUR MAINTENANT
    return NextResponse.json({ error: error.message || "Erreur inconnue" }, { status: 500 });
  }
}