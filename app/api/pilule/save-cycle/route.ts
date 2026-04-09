import { NextResponse } from 'next/server';
import Redis from 'ioredis';

export async function POST(request: Request) {
  if (!process.env.REDIS_URL) {
    return NextResponse.json({ message: 'No Redis' });
  }

  try {
    const body = await request.json();
    const { cycleStart } = body;

    if (!cycleStart) {
      return NextResponse.json({ error: 'Date manquante' }, { status: 400 });
    }

    const redis = new Redis(process.env.REDIS_URL);
    await redis.set('cycle_start', cycleStart);
    await redis.quit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur sauvegarde cycle:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
