import { NextResponse } from 'next/server';
import Redis from 'ioredis';

export const dynamic = 'force-dynamic';

export async function GET() {
  // 1. Sécurité anti-crash
  if (!process.env.REDIS_URL) {
    return NextResponse.json({ message: 'Build mode: Pas de Redis.' });
  }

  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    // 2. Correction de l'URL (SSL)
    let connectionString = process.env.REDIS_URL;
    if (connectionString.startsWith("redis://")) {
      connectionString = connectionString.replace("redis://", "rediss://");
    }

    // 3. Connexion BLINDÉE (C'est ici qu'on change tout)
    const redis = new Redis(connectionString, {
        tls: { rejectUnauthorized: false },
        family: 0,           // <--- TRES IMPORTANT: Permet de trouver la DB via IPv6
        connectTimeout: 10000, // On lui laisse 10 secondes pour se connecter
        maxRetriesPerRequest: 3 // On arrête d'insister après 3 essais pour avoir l'erreur vite
    });

    // 4. On vérifie la date
    const today = new Date();
    const dateStr = today.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
    const key = `pill_${dateStr}`;
    
    // On récupère l'info
    const isTaken = await redis.get(key);
    
    // On ferme proprement
    await redis.quit(); 

    // 5. Verdict
    if (isTaken === 'true') {
      return NextResponse.json({ message: 'Déjà pris aujourd’hui. Silence radio.' });
    }

    // 6. Envoi Telegram
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
    console.error("Erreur Redis détaillée:", error);
    return NextResponse.json({ 
        error: error.message, 
        detail: "Problème de connexion à la base de données" 
    }, { status: 500 });
  }
}