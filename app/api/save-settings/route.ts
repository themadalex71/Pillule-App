import { NextResponse } from 'next/server';
import Redis from 'ioredis';

export async function POST(request: Request) {
  if (!process.env.REDIS_URL) return NextResponse.json({ message: 'No Redis' });

  try {
    const body = await request.json();
    const { cycleStart } = body; 

    // 👇 Connexion simple ici aussi
    const redis = new Redis(process.env.REDIS_URL);
    
    await redis.set('cycle_start', cycleStart);
    await redis.quit();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}