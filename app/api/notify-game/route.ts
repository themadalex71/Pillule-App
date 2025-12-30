import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv'; // On passe sur KV comme pour les recettes
import { getGameOfTheDay } from '@/lib/gameUtils';

export const dynamic = 'force-dynamic';

export async function GET() {
  // 1. Date et heure (Heure de Paris)
  const franceTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const dateStr = franceTime.toISOString().split('T')[0];
  
  const keySent = `game_notif_sent_${dateStr}`;   

  try {
    // 2. Vérification si déjà envoyé via KV
    const isSent = await kv.get(keySent);
    
    if (isSent) {
      return NextResponse.json({ message: 'Déjà envoyé aujourd\'hui via KV.' });
    }

    // 3. Préparation du message
    const gameOfTheDay = getGameOfTheDay(dateStr);
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatIdsRaw = process.env.TELEGRAM_GAME_CHAT_IDS;

    const message = `⚠️ ⚠️ C'EST L'HEURE DU DÉFI ! ⚠️ ⚠️\n\n🎰 Jeu : ${gameOfTheDay.title}\nℹ️ Mission : ${gameOfTheDay.description}\n\n👉 Joue ici : https://ton-app.vercel.app/onsamuse`;

    // 4. Envoi Telegram
    if (token && chatIdsRaw) {
      const chatIds = chatIdsRaw.split(',');
      await Promise.all(chatIds.map(async (id) => {
        const cleanId = id.trim();
        if (!cleanId) return;
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: cleanId, text: message }),
        });
      }));
    }

    // 5. Marquage dans Redis via KV (Expire après 24h)
    await kv.set(keySent, 'true', { ex: 86400 });

    return NextResponse.json({ 
      success: true, 
      message: 'Notification envoyée et verrouillée avec KV !' 
    });

  } catch (error) {
    console.error("Erreur Notification:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}