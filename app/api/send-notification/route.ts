import { NextResponse } from 'next/server';
import Redis from 'ioredis';

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  // 1. Date du jour (Paris)
  const today = new Date();
  const dateStr = today.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
  
  // 2. Connexion à TA base Redis
  const redis = new Redis(process.env.REDIS_URL!);
  const key = `pill_${dateStr}`;
  const isTaken = await redis.get(key);
  
  // On ferme la connexion tout de suite
  await redis.quit();

  // 3. VERDICT
  if (isTaken === 'true') {
    return NextResponse.json({ message: 'Déjà pris aujourd’hui. Silence radio.' });
  }

  // 4. Envoi du message
  const message = `⚠️ Rappel Pilule ! \n\nTu n'as pas encore coché la case d'aujourd'hui (${dateStr}). \n\n✅ Coche-la vite ici : https://rappel-pillule.vercel.app`;

  try {
    if (token && chatId) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message }),
      });
    }
    return NextResponse.json({ success: true, message: 'Rappel envoyé !' });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur Telegram' }, { status: 500 });
  }
}