import Redis from 'ioredis';
import { NextResponse } from 'next/server';

// 1. Force le mode dynamique
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // --- SECURITÉ ANTI-CRASH BUILD ---
  if (!process.env.REDIS_URL) {
    return NextResponse.json({ message: 'Build mode: Pas de Redis' });
  }
  // ---------------------------------

  try {
    const body = await request.json();
    const { date, status } = body; 

    // --- CORRECTION AUTOMATIQUE SSL ---
    let connectionString = process.env.REDIS_URL;
    if (connectionString && connectionString.startsWith("redis://")) {
      connectionString = connectionString.replace("redis://", "rediss://");
    }
    // ----------------------------------

    const redis = new Redis(connectionString);
    const key = `pill_${date}`;

    if (status === 'taken') {
      await redis.set(key, 'true');
    } else {
      await redis.del(key);
    }
    
    await redis.quit();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}