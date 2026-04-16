import { NextResponse } from 'next/server';
import Redis from 'ioredis';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdminAuth, getFirebaseAdminDb } from '@/lib/firebase/admin';
import { normalizeTimeZone } from '@/lib/notifications/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getBearerToken(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

async function getOptionalUid(request: Request) {
  const token = getBearerToken(request);
  if (!token) return null;
  const decoded = await getFirebaseAdminAuth().verifyIdToken(token);
  return decoded.uid;
}

function toDateKey(raw: unknown) {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
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

export async function POST(request: Request) {
  if (!process.env.REDIS_URL) {
    return NextResponse.json({ message: 'No Redis' }, { status: 500 });
  }

  const redis = new Redis(process.env.REDIS_URL);

  try {
    const body = await request.json();
    const cycleStartDate = toDateKey(body?.cycleStartDate || body?.cycleStart);

    if (!cycleStartDate) {
      return NextResponse.json({ error: 'Date manquante' }, { status: 400 });
    }

    const uid = await getOptionalUid(request);
    const key = uid ? getCycleStartKey(uid) : 'cycle_start';

    await redis.set(key, cycleStartDate);

    if (uid && typeof body?.timezone === 'string' && body.timezone.trim()) {
      const db = getFirebaseAdminDb();
      await db
        .collection('users')
        .doc(uid)
        .set(
          {
            notificationSettings: {
              timezone: normalizeTimeZone(body.timezone),
              updatedAt: FieldValue.serverTimestamp(),
            },
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
    }

    return NextResponse.json({ success: true, scopedToUser: Boolean(uid), cycleStartDate });
  } catch (error) {
    console.error('Erreur sauvegarde cycle:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  } finally {
    await redis.quit();
  }
}
