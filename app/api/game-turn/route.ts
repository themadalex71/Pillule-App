import { NextResponse } from 'next/server';
import Redis from 'ioredis';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!process.env.REDIS_URL) return NextResponse.json({ error: 'No Redis' });
  const redis = new Redis(process.env.REDIS_URL);

  try {
    // On cherche s'il y a une image de jeu active
    const currentImage = await redis.get('zoom_current_image');
    const author = await redis.get('zoom_current_author');

    await redis.quit();
    
    // Si on a une image, on la renvoie, sinon on renvoie null
    return NextResponse.json({ 
      hasPendingGame: !!currentImage,
      image: currentImage,
      author: author
    });

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!process.env.REDIS_URL) return NextResponse.json({ error: 'No Redis' });
  const redis = new Redis(process.env.REDIS_URL);

  try {
    const body = await req.json();
    const { image, author } = body; // image est une longue chaine de texte (base64)

    // On sauvegarde l'image (expire dans 24h pour pas saturer la mémoire)
    await redis.set('zoom_current_image', image, 'EX', 86400); 
    await redis.set('zoom_current_author', author, 'EX', 86400);

    await redis.quit();
    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: "Erreur upload" }, { status: 500 });
  }
}

// Fonction BONUS : Pour réinitialiser le tour (quand l'autre a trouvé)
export async function DELETE() {
  if (!process.env.REDIS_URL) return NextResponse.json({ error: 'No Redis' });
  const redis = new Redis(process.env.REDIS_URL);
  
  await redis.del('zoom_current_image');
  await redis.del('zoom_current_author');
  
  await redis.quit();
  return NextResponse.json({ success: true });
}