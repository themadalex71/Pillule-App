import { NextResponse } from 'next/server';
import Redis from 'ioredis';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!process.env.REDIS_URL) {
    return NextResponse.json({ message: 'Build mode: Pas de Redis.' });
  }

  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    // 👇 ON A SIMPLIFIÉ ICI : On prend l'URL telle quelle, sans la toucher
    const connectionString = process.env.REDIS_URL;

    // Connexion simple sans options compliquées
    const redis = new Redis(connectionString, {
      maxRetriesPerRequest: 1, // On essaie une fois, si ça rate, on veut l'erreur tout de suite
    });

    // Test de connexion rapide
    await redis.ping();

    // 1. Vérification de la date
    const today = new Date();
    const dateStr = today.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
    const key = `pill_${dateStr}`;
    
    const isTaken = await redis.get(key);
    await redis.quit(); 

    // 2. Verdict
    if (isTaken === 'true') {
      return NextResponse.json({ message: 'Déjà pris aujourd’hui. Silence radio.' });
    }

    // 3. Envoi Telegram
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
    console.error("Erreur Redis:", error);
    return NextResponse.json({ 
        error: error.message, 
        detail: "La connexion à la base a échoué (URL ou Mot de passe incorrect)" 
    }, { status: 500 });
  }
}