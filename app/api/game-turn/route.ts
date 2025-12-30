import { NextResponse } from 'next/server';
import Redis from 'ioredis';

export const dynamic = 'force-dynamic';

const getRedis = () => new Redis(process.env.REDIS_URL || '');

export async function GET() {
  const redis = getRedis();
  try {
    // Récupération des clés Zoom
    const zoomImage = await redis.get('zoom_current_image');
    const zoomAuthor = await redis.get('zoom_current_author');
    const zoomGuess = await redis.get('zoom_current_guess');

    // Récupération des clés Meme
    const memeTurns = await redis.lrange('meme_current_turns', 0, -1);
    const parsedMemes = memeTurns.map(m => JSON.parse(m));

    await redis.quit();
    
    return NextResponse.json({ 
      zoom: { // Cette structure est CRUCIALE pour ZoomGame
        hasPendingGame: !!zoomImage,
        image: zoomImage,
        author: zoomAuthor,
        currentGuess: zoomGuess
      },
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
    const { type, action, ...data } = body;

    // --- 1. GESTION DES ACTIONS SPÉCIFIQUES (ZOOM) ---
    
    // Action : Soumettre une réponse (Guess)
    if (action === 'submit_guess') {
      await redis.set('zoom_current_guess', data.guess, 'EX', 86400);
      await redis.quit();
      return NextResponse.json({ success: true });
    }

    // Action : Rejeter une réponse (Correction de l'auteur)
    if (action === 'reject_guess') {
      await redis.del('zoom_current_guess');
      await redis.quit();
      return NextResponse.json({ success: true });
    }

    // --- 2. GESTION DE LA CRÉATION DES TOURS (INITIALISATION) ---

    if (type === 'meme') {
      // Sauvegarde du tour de meme (Expiration 24h)
      // data contient : { player, memes: [...] }
      await redis.lpush('meme_current_turns', JSON.stringify(data));
      await redis.expire('meme_current_turns', 86400);
    } 
    
    else if (type === 'zoom') {
      // Initialisation d'une nouvelle partie Zoom
      // data contient : { image, author }
      await redis.set('zoom_current_image', data.image, 'EX', 172800);
      await redis.set('zoom_current_author', data.author, 'EX', 172800);
      // On s'assure qu'aucun ancien guess ne traîne
      await redis.del('zoom_current_guess');
    }

    await redis.quit();
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erreur API POST:", error);
    // En cas d'erreur, on essaie quand même de fermer la connexion Redis
    try { await redis.quit(); } catch { }
    return NextResponse.json({ error: "Erreur serveur lors de l'enregistrement" }, { status: 500 });
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