import { NextResponse } from 'next/server';
import Redis from 'ioredis';

export const dynamic = 'force-dynamic';

const getRedis = () => new Redis(process.env.REDIS_URL || '');

export async function GET() {
  const redis = getRedis();
  try {
    // --- PARTIE ZOOM ---
    const zoomImage = await redis.get('zoom_current_image');
    const zoomAuthor = await redis.get('zoom_current_author');
    const zoomGuess = await redis.get('zoom_current_guess');

    // --- PARTIE MEME ---
    // On utilise lrange car il y a plusieurs memes par partie
    const memeTurns = await redis.lrange('meme_current_turns', 0, -1);
    const parsedMemes = memeTurns.map(m => JSON.parse(m));

    await redis.quit();
    
    return NextResponse.json({ 
      // Zoom Data
      zoom: {
        hasPendingGame: !!zoomImage,
        image: zoomImage,
        author: zoomAuthor,
        currentGuess: zoomGuess
      },
      // Meme Data
      memes: parsedMemes
    });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const redis = getRedis();
  try {
    const body = await req.json();
    const { type, ...data } = body;

    if (type === 'meme') {
      // Sauvegarde du tour de meme (Expiration 24h)
      // data contient : { player, memes: [...] }
      await redis.lpush('meme_current_turns', JSON.stringify(data));
      await redis.expire('meme_current_turns', 86400);
    } else {
      // Logique Zoom classique
      await redis.set('zoom_current_image', data.image, 'EX', 172800);
      await redis.set('zoom_current_author', data.author, 'EX', 172800);
      await redis.del('zoom_current_guess');
    }

    await redis.quit();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur POST" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const redis = getRedis();
  const { searchParams } = new URL(req.url);
  const game = searchParams.get('game');

  if (game === 'meme') {
    await redis.del('meme_current_turns');
  } else {
    await redis.del('zoom_current_image');
    await redis.del('zoom_current_author');
    await redis.del('zoom_current_guess');
  }
  
  await redis.quit();
  return NextResponse.json({ success: true });
}