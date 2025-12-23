import Redis from 'ioredis';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const { date, status } = body; 

  // On se connecte avec TA clé
  const redis = new Redis(process.env.REDIS_URL!);
  const key = `pill_${date}`;

  try {
    if (status === 'taken') {
      await redis.set(key, 'true');
    } else {
      await redis.del(key);
    }
    
    // On ferme la connexion pour ne pas surcharger le serveur
    await redis.quit();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}