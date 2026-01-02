import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { GAMES_LIST, getDailySeed } from '@/lib/dailyGameLogic';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateKey = getDailySeed();
  const sessionKey = `daily_session:${dateKey}`;
  const forceReset = searchParams.get('forceReset') === 'true';

  try {
    if (forceReset) await kv.del(sessionKey);

    let session: any = await kv.get(sessionKey);

    if (!session || session.game.id !== 'zoom') {
      const zoomGame = GAMES_LIST.find(g => g.id === 'zoom');
      
      // On récupère les missions Zoom (soit de l'éditeur, soit par défaut)
      let missionsPool = await kv.get<string[]>('missions:zoom') || [];
      
      if (missionsPool.length === 0) {
        missionsPool = ["Un objet en bois", "Un truc qui brille", "Quelque chose de bleu"];
      }
      
      const mission = missionsPool[Math.floor(Math.random() * missionsPool.length)];
      const lastAuthor = await kv.get('zoom_last_author');
      const author = lastAuthor === 'Moi' ? 'Chéri(e)' : 'Moi';

      session = {
        date: dateKey,
        game: zoomGame,
        status: 'waiting_start',
        sharedData: {
          step: 'PHOTO',
          mission: mission,
          author: author,
          guesser: author === 'Moi' ? 'Chéri(e)' : 'Moi',
          image: null,
          currentGuess: null
        },
        players: { "Moi": { score: 0 }, "Chéri(e)": { score: 0 } }
      };
      await kv.set(sessionKey, session, { ex: 86400 });
    }

    const weeklyRanking = await kv.hgetall(`weekly_scores_current`) || {};
    return NextResponse.json({ ...session, weeklyRanking });
  } catch (error) {
    return NextResponse.json({ error: "Erreur Init" }, { status: 500 });
  }
}