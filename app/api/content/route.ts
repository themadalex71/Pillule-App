// app/api/content/route.ts
import { NextResponse } from 'next/server';
import Redis from 'ioredis';

export async function POST(req: Request) {
  if (!process.env.REDIS_URL) return NextResponse.json({ error: 'No Redis' });
  const redis = new Redis(process.env.REDIS_URL);

  try {
    const { gameId, item } = await req.json(); 
    // gameId: 'zoom' ou 'meme'
    // item: la mission (string) ou l'objet meme {url, name}

    // On utilise RPUSH pour ajouter à la fin d'une liste Redis
    const key = `custom_content:${gameId}`;
    await redis.rpush(key, JSON.stringify(item));

    await redis.quit();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur d'écriture" }, { status: 500 });
  }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get('gameId');
    
    if (!process.env.REDIS_URL) return NextResponse.json([]);
    const redis = new Redis(process.env.REDIS_URL);
    
    // On récupère tout le contenu ajouté par les utilisateurs
    const data = await redis.lrange(`custom_content:${gameId}`, 0, -1);
    await redis.quit();
    
    return NextResponse.json(data.map(d => JSON.parse(d)));
}