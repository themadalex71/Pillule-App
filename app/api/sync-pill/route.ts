import Redis from 'ioredis';
import { NextResponse } from 'next/server';
import { getFirebaseAdminAuth } from '@/lib/firebase/admin';

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

function getTakenKey(uid: string, date: string) {
  return `pill_taken:${uid}:${date}`;
}

export async function POST(request: Request) {
  if (!process.env.REDIS_URL) {
    return NextResponse.json({ message: 'No Redis' }, { status: 500 });
  }

  const redis = new Redis(process.env.REDIS_URL);

  try {
    const body = await request.json();
    const date = String(body?.date || '').trim();
    const status = String(body?.status || '').trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Date invalide.' }, { status: 400 });
    }

    if (status !== 'taken' && status !== 'todo') {
      return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 });
    }

    const uid = await getOptionalUid(request);
    const key = uid ? getTakenKey(uid, date) : `pill_${date}`;

    if (status === 'taken') {
      await redis.set(key, 'true');
    } else {
      await redis.del(key);
    }

    return NextResponse.json({ success: true, scopedToUser: Boolean(uid) });
  } catch (error) {
    console.error('sync-pill error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  } finally {
    await redis.quit();
  }
}
