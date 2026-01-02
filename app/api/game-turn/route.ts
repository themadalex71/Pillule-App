import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. RÉCUPÉRATION ZOOM
    const zoomImage = await kv.get<string>('zoom_current_image');
    const zoomAuthor = await kv.get<string>('zoom_current_author');
    const zoomGuess = await kv.get<string>('zoom_current_guess');

    // 2. RÉCUPÉRATION MEME
    const memeTurns = await kv.lrange('meme_current_turns', 0, -1);
    // On récupère les votes sous forme d'objet { "Joueur A_id": score, ... }
    const sessionVotes = await kv.get<Record<string, number>>('meme_votes_session') || {};
    
    const parsedMemes = memeTurns.map(m => typeof m === 'string' ? JSON.parse(m) : m);

    return NextResponse.json({ 
      zoom: {
        hasPendingGame: !!zoomImage,
        image: zoomImage,
        author: zoomAuthor,
        currentGuess: zoomGuess
      },
      memes: parsedMemes,
      votes: sessionVotes
    });
  } catch (error) {
    console.error("Erreur GET:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, action, player, memes, image, author, guess } = body;

    // --- LOGIQUE ZOOM ---
    if (action === 'submit_guess') {
      await kv.set('zoom_current_guess', guess, { ex: 86400 });
      return NextResponse.json({ success: true });
    }

    if (action === 'reject_guess') {
      await kv.del('zoom_current_guess');
      return NextResponse.json({ success: true });
    }

    if (type === 'zoom') {
      // C'est ici qu'on enregistre la photo Zoom
      await kv.set('zoom_current_image', image, { ex: 172800 });
      await kv.set('zoom_current_author', author, { ex: 172800 });
      await kv.del('zoom_current_guess');
      return NextResponse.json({ success: true });
    }

    // --- LOGIQUE MEME ---
    if (type === 'meme') {
      const existingTurns = await kv.lrange('meme_current_turns', 0, -1);
      const parsedTurns = existingTurns.map(t => typeof t === 'string' ? JSON.parse(t) : t);
      
      if (!parsedTurns.some((t: any) => t.player === player)) {
        await kv.lpush('meme_current_turns', JSON.stringify({ player, memes }));
        await kv.expire('meme_current_turns', 86400);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
  } catch (error) {
    console.error("Erreur POST:", error);
    return NextResponse.json({ error: "Erreur POST" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { voter, memeInstanceId, score } = await req.json();
    const voteKey = 'meme_votes_session';
    const existingVotes = await kv.get<Record<string, number>>(voteKey) || {};
    
    // On utilise la clé voter + ID du meme pour éviter que les votes s'écrasent
    existingVotes[`${voter}_${memeInstanceId}`] = score;
    
    await kv.set(voteKey, existingVotes, { ex: 86400 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur PATCH" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const game = searchParams.get('game');

    if (game === 'zoom') {
      await kv.del('zoom_current_image');
      await kv.del('zoom_current_author');
      await kv.del('zoom_current_guess');
    } else if (game === 'meme') {
      await kv.del('meme_current_turns');
      await kv.del('meme_votes_session');
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur DELETE" }, { status: 500 });
  }
}