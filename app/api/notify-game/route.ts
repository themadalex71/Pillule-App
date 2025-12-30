import { NextResponse } from 'next/server';
import Redis from 'ioredis';
import { getGameOfTheDay } from '@/lib/gameUtils'; // On importe notre logique commune

export const dynamic = 'force-dynamic'; // Important pour ne pas mettre en cache

export async function GET() {
  if (!process.env.REDIS_URL) return NextResponse.json({ message: 'No Redis' });

  try {
    const redis = new Redis(process.env.REDIS_URL);
    const token = process.env.TELEGRAM_BOT_TOKEN;
    
    // On récupère la liste des IDs (Toi, Conjoint)
    const chatIdsRaw = process.env.TELEGRAM_GAME_CHAT_IDS;
    
    // 1. Date du jour
    const now = new Date();
    // On force l'heure de Paris
    const franceTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
    const dateStr = franceTime.toISOString().split('T')[0];
    const currentHour = franceTime.getHours();
    const currentMinute = franceTime.getMinutes();
    const currentTimeValue = currentHour * 60 + currentMinute;
  
    // Clés Redis
    const keySent = `game_notif_sent_${dateStr}`;   
    const keyTarget = `game_target_time_${dateStr}`; 

    // ============================================================
    // 🔴 ZONE DE SÉCURITÉ DÉSACTIVÉE POUR LE TEST
    // ============================================================
    /*
    // 2. Vérifier si DÉJÀ envoyé
    const isSent = await redis.get(keySent);
    if (isSent) {
      await redis.quit();
      return NextResponse.json({ message: 'Déjà envoyé aujourd\'hui. Repos.' });
    }
    
    // 3. Récupérer ou Définir l'heure cible (Le moment BeReal)
    let targetTime = await redis.get(keyTarget);

    if (!targetTime) {
      // Génération heure aléatoire (10h00 - 21h00)
      const minTime = 600; 
      const maxTime = 1260;
      const randomTime = Math.floor(Math.random() * (maxTime - minTime + 1) + minTime);
      
      await redis.set(keyTarget, randomTime.toString());
      targetTime = randomTime.toString();
    }

    // 4. Est-ce que c'est l'heure ?
    if (currentTimeValue < parseInt(targetTime)) {
      await redis.quit();
      const targetH = Math.floor(parseInt(targetTime)/60);
      const targetM = parseInt(targetTime)%60;
      return NextResponse.json({ message: `Chut... C'est pas encore l'heure. Attente de ${targetH}h${targetM}.` });
    }
    */
    // ============================================================
    // 🔴 FIN DE LA ZONE DE SÉCURITÉ
    // ============================================================


    // 5. C'EST L'HEURE ! ON ENVOIE 🚀
    
    // On récupère le jeu du jour pour personnaliser le message
    const gameOfTheDay = getGameOfTheDay(dateStr);

    const message = `⚠️ ⚠️ C'EST L'HEURE DU DÉFI ! ⚠️ ⚠️\n\n🎰 Jeu du jour : ${gameOfTheDay.title}\nℹ️ Mission : ${gameOfTheDay.description}\n\n👉 Viens jouer tout de suite : https://ton-app.vercel.app/onsamuse`;

    if (token && chatIdsRaw) {
      // ✅ CORRECTION IMPORTANTE : On découpe la liste pour envoyer à tout le monde
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

    // 6. On marque comme envoyé dans Redis (pour vérifier que la connexion marche)
    await redis.set(keySent, 'true');
    // await redis.del(keyTarget); // Pas besoin de supprimer pour le test
    
    redis.disconnect();
    return NextResponse.json({ success: true, message: 'Notification envoyée aux 2 personnes (Mode Test) !' });

  } catch (error: any) {
    console.error("Erreur:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}