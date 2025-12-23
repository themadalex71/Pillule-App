import { NextResponse } from 'next/server';
import Redis from 'ioredis';

// 1. Force le mode dynamique (évite les erreurs de build)
export const dynamic = 'force-dynamic';

export async function GET() {
  // --- SECURITÉ ANTI-CRASH BUILD ---
  if (!process.env.REDIS_URL) {
    return NextResponse.json({ message: 'Build mode: Pas de Redis, on passe.' });
  }
  // ---------------------------------

  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    const today = new Date();
    const dateStr = today.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });

    // --- CORRECTION AUTOMATIQUE SSL (Le fameux "s") ---
    let connectionString = process.env.REDIS_URL;
    if (connectionString && connectionString.startsWith("redis://")) {
      connectionString = connectionString.replace("redis://", "rediss://");
    }
    // --------------------------------------------------

    // Connexion avec la version sécurisée
    const redis = new Redis(connectionString);
    const key = `pill_${dateStr}`;
    
    const isTaken = await redis.get(key);
    await redis.quit(); // On ferme vite la connexion

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

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur Serveur' }, { status: 500 });
  }
}