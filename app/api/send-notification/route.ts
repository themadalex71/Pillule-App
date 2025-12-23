import { NextResponse } from 'next/server';
import Redis from 'ioredis';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!process.env.REDIS_URL) return NextResponse.json({ message: 'No Redis' });

  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    // Connexion Redis
    let connectionString = process.env.REDIS_URL;
    if (connectionString.startsWith("redis://")) connectionString = connectionString.replace("redis://", "rediss://");
    
    const redis = new Redis(connectionString, { maxRetriesPerRequest: 1 });

    // 1. On récupère la date du jour
    const today = new Date();
    // On force l'heure à midi pour éviter les problèmes de fuseau horaire
    today.setHours(12, 0, 0, 0); 
    const dateStr = today.toISOString().split('T')[0]; // Format YYYY-MM-DD

    // 2. On récupère le DÉBUT DU CYCLE depuis la mémoire
    const cycleStartRaw = await redis.get('cycle_start');
    
    // 🧠 CALCUL INTELLIGENT DU CYCLE (21/7)
    let isPauseDay = false;
    
    if (cycleStartRaw) {
      const start = new Date(cycleStartRaw);
      start.setHours(12, 0, 0, 0);

      // Calcul du nombre de jours écoulés depuis le début
      const diffTime = today.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // Mathématique du cycle de 28 jours (21 + 7)
      if (diffDays >= 0) {
        const positionInCycle = diffDays % 28; // Donne un chiffre entre 0 et 27
        if (positionInCycle >= 21) {
          isPauseDay = true; // C'est un jour de pause (jours 21 à 27)
        }
      }
    }

    // 3. VERDICT
    if (isPauseDay) {
      await redis.quit();
      return NextResponse.json({ message: 'Jour de pause (semaine sans pilule). Pas de notif.' });
    }

    // Si ce n'est pas une pause, on vérifie si c'est pris
    const key = `pill_${dateStr}`;
    const isTaken = await redis.get(key);
    await redis.quit(); 

    if (isTaken === 'true') {
      return NextResponse.json({ message: 'Déjà pris aujourd’hui. Silence radio.' });
    }

    // 4. Envoi Telegram (Seulement si c'est un jour de prise ET pas fait)
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
    console.error("Erreur:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}