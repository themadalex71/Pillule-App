import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Récupération des clés Zoom via Vercel KV
    const zoomImage = await kv.get<string>('zoom_current_image');
    const zoomAuthor = await kv.get<string>('zoom_current_author');
    const zoomGuess = await kv.get<string>('zoom_current_guess');

    // 2. Récupération des données Meme (Tours et Votes de session)
    const memeTurns = await kv.lrange('meme_current_turns', 0, -1);
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
    const { type, action, ...data } = body;

    // --- ACTIONS ZOOM ---
    if (action === 'submit_guess') {
      await kv.set('zoom_current_guess', data.guess, { ex: 86400 });
      return NextResponse.json({ success: true });
    }

    if (action === 'reject_guess') {
      await kv.del('zoom_current_guess');
      return NextResponse.json({ success: true });
    }

    // --- CRÉATION DE TOURS (POST) ---
    if (type === 'zoom') {
      await kv.set('zoom_current_image', data.image, { ex: 172800 });
      await kv.set('zoom_current_author', data.author, { ex: 172800 });
      await kv.del('zoom_current_guess');
      return NextResponse.json({ success: true });
    }

    if (type === 'meme') {
      const existingTurns = await kv.lrange('meme_current_turns', 0, -1);
      const parsedTurns = existingTurns.map(t => typeof t === 'string' ? JSON.parse(t) : t);
      
      const alreadySubmitted = parsedTurns.some((t: any) => t.player === data.player);
      
      if (!alreadySubmitted) {
        await kv.lpush('meme_current_turns', JSON.stringify(data));
        await kv.expire('meme_current_turns', 86400);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Erreur POST" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { voter, memeInstanceId, score } = await req.json();
    const voteKey = 'meme_votes_session';
    
    // On récupère le dictionnaire de votes de session
    const existingVotes = await kv.get<Record<string, number>>(voteKey) || {};
    
    // On enregistre le vote identifié par le votant et l'ID du meme
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