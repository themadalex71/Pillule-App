import { NextResponse } from 'next/server';
import Redis from 'ioredis';

// 1. On force le mode dynamique pour éviter le pré-calcul
export const dynamic = 'force-dynamic';

export async function GET() {
  // --- SECURITÉ ANTI-CRASH BUILD ---
  // Si l'URL n'existe pas (pendant le build), on arrête tout de suite sans erreur.
  if (!process.env.REDIS_URL) {
    return NextResponse.json({ message: 'Build mode: Pas de Redis, on passe.' });
  }
  // ---------------------------------

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const today = new Date();
  const dateStr = today.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
  
  // Maintenant qu'on est sûr d'avoir l'URL, on se connecte
  const redis = new Redis(process.env.REDIS_URL);
  const key = `pill_${dateStr}`;
  
  try {
    const isTaken = await redis.get(key);
    await redis.quit(); // On coupe tout de suite après

    if (isTaken === 'true') {
      return NextResponse.json({ message: 'Déjà pris aujourd’hui. Silence radio.' });
    }

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
    // Au cas où Redis a été ouvert mais a planté, on essaie de le fermer
    try { await redis.quit(); } catch(e) {} 
    return NextResponse.json({ error: 'Erreur Serveur' }, { status: 500 });
  }
}