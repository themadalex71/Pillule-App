import { NextResponse } from 'next/server';
import Redis from 'ioredis';
import { getFirebaseAdminDb } from '@/lib/firebase/admin';
import { ensureCronAuthorized } from '@/lib/cron/auth';
import { sendPushNotificationToUser } from '@/lib/notifications/push';
import {
  diffDaysFromDateKeys,
  getLocalDateInfo,
  isDateKey,
  isReminderDue,
  normalizeUserNotificationSettings,
} from '@/lib/notifications/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getCycleStartDateKey(raw: unknown) {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) return null;

  if (isDateKey(value)) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function getCycleStartKey(uid: string) {
  return `pill_cycle_start:${uid}`;
}

function getTakenKey(uid: string, dateKey: string) {
  return `pill_taken:${uid}:${dateKey}`;
}

export async function GET(request: Request) {
  const unauthorized = ensureCronAuthorized(request);
  if (unauthorized) {
    return unauthorized;
  }

  if (!process.env.REDIS_URL) {
    return NextResponse.json({ message: 'No Redis URL' }, { status: 500 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;

  const redis = new Redis(process.env.REDIS_URL);

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

      if (!settings.pilluleEnabled) {
        continue;
      }

      const localNow = getLocalDateInfo(now, settings.timezone);
      if (!isReminderDue(localNow.hour, localNow.minute, settings.pilluleReminderHour)) {
        continue;
      }

      dueUsers += 1;

      const sentKey = `notif:pillule:sent:${uid}:${localNow.dateKey}`;
      const alreadySent = await redis.get(sentKey);
      if (alreadySent) {
        continue;
      }

      const cycleStartRaw =
        (await redis.get(getCycleStartKey(uid))) ||
        (await redis.get('cycle_start'));
      const cycleStartDateKey = getCycleStartDateKey(cycleStartRaw);

      if (!cycleStartDateKey) {
        continue;
      }

      const diffDays = diffDaysFromDateKeys(localNow.dateKey, cycleStartDateKey);
      if (diffDays === null || diffDays < 0) {
        continue;
      }

      const positionInCycle = diffDays % 28;
      if (positionInCycle >= 21) {
        continue;
      }

      const isTaken =
        (await redis.get(getTakenKey(uid, localNow.dateKey))) ||
        (await redis.get(`pill_${localNow.dateKey}`));

      if (isTaken === 'true') {
        continue;
      }

      const message = `Rappel Pilule\n\nTu n'as pas encore coche la case d'aujourd'hui (${localNow.dateKey}).\n\nCoche-la ici : https://pillule-app.vercel.app/pillule`;
      const pushResult = await sendPushNotificationToUser(uid, userData, {
        title: 'HarmoHome - Rappel Pilule',
        body: `Tu n'as pas encore coche la case du ${localNow.dateKey}.`,
        url: '/pillule',
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
          console.error(`Telegram error (pillule) for uid=${uid}:`, errorBody);
        } else {
          delivered = true;
        }
      }

      if (!delivered) {
        continue;
      }

      await redis.set(sentKey, 'true', 'EX', 86400 * 3);
      sentCount += 1;
    }

    return NextResponse.json({
      success: true,
      checkedUsers,
      dueUsers,
      sentCount,
    });
  } catch (error: any) {
    console.error('Erreur send-notification:', error);
    return NextResponse.json({ error: error?.message || 'Erreur serveur' }, { status: 500 });
  } finally {
    await redis.quit();
  }
}
