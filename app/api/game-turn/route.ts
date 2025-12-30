import { NextResponse } from 'next/server';
import Redis from 'ioredis';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!process.env.REDIS_URL) return NextResponse.json({ error: 'No Redis' });
  const redis = new Redis(process.env.REDIS_URL);

  try {
    const currentImage = await redis.get('zoom_current_image');
    const author = await redis.get('zoom_current_author');
    const currentGuess = await redis.get('zoom_current_guess'); // La réponse proposée
    const mission = await redis.get('zoom_current_mission');

    await redis.quit();
    
    return NextResponse.json({ 
      hasPendingGame: !!currentImage,
      image: currentImage,
      author: author,
      currentGuess: currentGuess,
      mission: mission
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
    const { image, author, mission } = body;

    // Création d'un nouveau jeu (Expiration 48h)
    await redis.set('zoom_current_image', image, 'EX', 172800);
    await redis.set('zoom_current_author', author, 'EX', 172800);
    if(mission) await redis.set('zoom_current_mission', mission, 'EX', 172800);
    
    // On s'assure qu'il n'y a pas de vieille réponse qui traîne
    await redis.del('zoom_current_guess');

    await redis.quit();
    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: "Erreur upload" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
    if (!process.env.REDIS_URL) return NextResponse.json({ error: 'No Redis' });
    const redis = new Redis(process.env.REDIS_URL);
  
    try {
      const body = await req.json();
      const { action, guess } = body;
  
      if (action === 'submit_guess') {
          // Le joueur B envoie une proposition
          await redis.set('zoom_current_guess', guess, 'EX', 172800);
      } 
      else if (action === 'reject_guess') {
          // Le joueur A refuse (on efface le guess pour que B rejoue)
          await redis.del('zoom_current_guess');
      }
  
      await redis.quit();
      return NextResponse.json({ success: true });
  
    } catch (error) {
      return NextResponse.json({ error: "Erreur update" }, { status: 500 });
    }
  }

export async function DELETE() {
  if (!process.env.REDIS_URL) return NextResponse.json({ error: 'No Redis' });
  const redis = new Redis(process.env.REDIS_URL);
  
  // Victoire : on nettoie tout
  await redis.del('zoom_current_image');
  await redis.del('zoom_current_author');
  await redis.del('zoom_current_guess');
  await redis.del('zoom_current_mission');
  
  await redis.quit();
  return NextResponse.json({ success: true });
}