import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { getFirebaseAdminDb } from '@/lib/firebase/admin';
import { getGameOfTheDay } from '@/features/daily/services/gameUtils';
import { sendPushNotificationToUser } from '@/lib/notifications/push';
import {
  getLocalDateInfo,
  isReminderDue,
  normalizeUserNotificationSettings,
} from '@/lib/notifications/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  try {
    const db = getFirebaseAdminDb();
    const usersSnapshot = await db.collection('users').get();
    const now = new Date();

    let checkedUsers = 0;
    let dueUsers = 0;
    let sentCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      checkedUsers += 1;
      const uid = userDoc.id;
      const userData = userDoc.data() || {};
      const settings = normalizeUserNotificationSettings(userData);

      if (!settings.gameEnabled) {
        continue;
      }

      const localNow = getLocalDateInfo(now, settings.timezone);
      if (!isReminderDue(localNow.hour, localNow.minute, settings.gameReminderHour)) {
        continue;
      }

      dueUsers += 1;

      const sentKey = `notif:game:sent:${uid}:${localNow.dateKey}`;
      const alreadySent = await kv.get(sentKey);
      if (alreadySent) {
        continue;
      }

      const gameOfTheDay = getGameOfTheDay(localNow.dateKey);
      const message = `C'est l'heure du defi !\n\nJeu : ${gameOfTheDay.title}\nMission : ${gameOfTheDay.description}\n\nJoue ici : https://pillule-app.vercel.app/daily`;
      const pushResult = await sendPushNotificationToUser(uid, userData, {
        title: 'HarmoHome - Defi du jour',
        body: `${gameOfTheDay.title} : ${gameOfTheDay.description}`,
        url: '/daily',
      });
      let delivered = pushResult.delivered;

      if (!delivered && token && settings.telegramChatId) {
        const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: settings.telegramChatId, text: message }),
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          console.error(`Telegram error (game) for uid=${uid}:`, errorBody);
        } else {
          delivered = true;
        }
      }

      if (!delivered) {
        continue;
      }

      await kv.set(sentKey, 'true', { ex: 86400 * 3 });
      sentCount += 1;
    }

    return NextResponse.json({
      success: true,
      checkedUsers,
      dueUsers,
      sentCount,
    });
  } catch (error) {
    console.error('Erreur Notification game:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
