import { NextResponse } from 'next/server';
import Redis from 'ioredis';

export async function POST(request: Request) {
  if (!process.env.REDIS_URL) return NextResponse.json({ message: 'No Redis' });

  try {
    const body = await request.json();
    const { cycleStart } = body; // On reçoit la date

    // Correction SSL (le fameux 's')
    let connectionString = process.env.REDIS_URL;
    if (connectionString.startsWith("redis://")) {
      connectionString = connectionString.replace("redis://", "rediss://");
    }

    const redis = new Redis(connectionString);
    
    // On sauvegarde la date dans la clé "cycle_start"
    await redis.set('cycle_start', cycleStart);
    await redis.quit();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}