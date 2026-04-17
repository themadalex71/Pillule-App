import { NextResponse } from 'next/server';
import Redis from 'ioredis';
import { getFirebaseAdminDb } from '@/lib/firebase/admin';
import { ensureCronAuthorized } from '@/lib/cron/auth';
import { sendPushNotificationToUser } from '@/lib/notifications/push';
import {
  diffDaysFromDateKeys,
  getLocalDateInfo,
  isDateKey,
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

type DueReminderSlot = {
  sourceDateKey: string;
  reminderIndex: number;
};

function addDaysToDateKey(dateKey: string, days: number) {
  if (!isDateKey(dateKey)) {
    return null;
  }

  const [year, month, day] = dateKey.split('-').map((value) => Number(value));
  if (!year || !month || !day) {
    return null;
  }

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);
  return utcDate.toISOString().slice(0, 10);
}

function getDueReminderSlot(input: {
  localDateKey: string;
  localHour: number;
  localMinute: number;
  reminderHour: number;
  reminderRepeatCount: number;
  reminderIntervalMinutes: number;
  minuteWindow?: number;
}): DueReminderSlot | null {
  const minuteWindow = input.minuteWindow ?? 20;
  const localMinuteOfDay = input.localHour * 60 + input.localMinute;

  const previousDateKey = addDaysToDateKey(input.localDateKey, -1);
  const sourceDateKeys = previousDateKey
    ? [previousDateKey, input.localDateKey]
    : [input.localDateKey];

  for (const sourceDateKey of sourceDateKeys) {
    for (let reminderIndex = 0; reminderIndex < input.reminderRepeatCount; reminderIndex += 1) {
      const slotOffsetMinutes =
        input.reminderHour * 60 + reminderIndex * input.reminderIntervalMinutes;
      const dayOffset = Math.floor(slotOffsetMinutes / 1440);
      const minuteOfDay = slotOffsetMinutes % 1440;
      const targetDateKey = addDaysToDateKey(sourceDateKey, dayOffset);

      if (!targetDateKey || targetDateKey !== input.localDateKey) {
        continue;
      }

      const deltaMinutes = localMinuteOfDay - minuteOfDay;
      if (deltaMinutes < 0 || deltaMinutes >= minuteWindow) {
        continue;
      }

      return {
        sourceDateKey,
        reminderIndex,
      };
    }
  }

  return null;
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
      const dueReminderSlot = getDueReminderSlot({
        localDateKey: localNow.dateKey,
        localHour: localNow.hour,
        localMinute: localNow.minute,
        reminderHour: settings.pilluleReminderHour,
        reminderRepeatCount: settings.pilluleReminderRepeatCount,
        reminderIntervalMinutes: settings.pilluleReminderRepeatIntervalMinutes,
      });
      if (!dueReminderSlot) {
        continue;
      }

      dueUsers += 1;

      const targetDateKey = dueReminderSlot.sourceDateKey;
      const sentKey = `notif:pillule:sent:${uid}:${targetDateKey}:${dueReminderSlot.reminderIndex}`;
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

      const diffDays = diffDaysFromDateKeys(targetDateKey, cycleStartDateKey);
      if (diffDays === null || diffDays < 0) {
        continue;
      }

      const positionInCycle = diffDays % 28;
      if (positionInCycle >= 21) {
        continue;
      }

      const isTaken =
        (await redis.get(getTakenKey(uid, targetDateKey))) ||
        (await redis.get(`pill_${targetDateKey}`));

      if (isTaken === 'true') {
        continue;
      }

      const reminderMeta =
        settings.pilluleReminderRepeatCount > 1
          ? `\nRappel ${dueReminderSlot.reminderIndex + 1}/${settings.pilluleReminderRepeatCount}`
          : '';
      const message = `Rappel Pilule\n\nTu n'as pas encore coche la case d'aujourd'hui (${targetDateKey}).${reminderMeta}\n\nCoche-la ici : https://www.bardbaronproject.com/pillule`;
      const pushResult = await sendPushNotificationToUser(uid, userData, {
        title: 'HarmoHome - Rappel Pilule',
        body: `Tu n'as pas encore coche la case du ${targetDateKey}.`,
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

      await redis.set(sentKey, 'true', 'EX', 86400 * 5);
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
