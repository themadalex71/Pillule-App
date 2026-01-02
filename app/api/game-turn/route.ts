import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const memeTurns = await kv.lrange('meme_current_turns', 0, -1);
    const sessionVotes = await kv.get<Record<string, number>>('meme_votes_session') || {};
    const parsedMemes = memeTurns.map(m => typeof m === 'string' ? JSON.parse(m) : m);

    return NextResponse.json({ 
      memes: parsedMemes,
      votes: sessionVotes // Structure: { "Joueur A": scoreRecuParB, "Joueur B": scoreRecuParA }
    });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, player, memes } = body;

    if (type === 'meme') {
      const existingTurns = await kv.lrange('meme_current_turns', 0, -1);
      const parsedTurns = existingTurns.map(t => typeof t === 'string' ? JSON.parse(t) : t);
      
      // On ne rajoute que si le joueur n'a pas déjà soumis
      if (!parsedTurns.some((t: any) => t.player === player)) {
        await kv.lpush('meme_current_turns', JSON.stringify({ player, memes }));
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
    const { voter, score } = await req.json();
    const voteKey = 'meme_votes_session';
    const existingVotes = await kv.get<Record<string, number>>(voteKey) || {};
    
    // Crucial : le score donné par le "voter" est attribué à l'autre joueur
    const receiver = voter === 'Joueur A' ? 'Joueur B' : 'Joueur A';
    existingVotes[receiver] = score;
    
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

    if (game === 'meme') {
      await kv.del('meme_current_turns');
      await kv.del('meme_votes_session');
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur DELETE" }, { status: 500 });
  }
}