import Redis from 'ioredis';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!process.env.REDIS_URL) return NextResponse.json({ message: 'No Redis' });

  try {
    const body = await request.json();
    const { date, status } = body; 

    // Connexion simple
    const redis = new Redis(process.env.REDIS_URL);

    const key = `pill_${date}`;

    if (status === 'taken') {
      await redis.set(key, 'true');
    } else {
      await redis.del(key);
    }
    
    await redis.quit();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}