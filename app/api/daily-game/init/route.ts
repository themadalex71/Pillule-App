import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { GAMES_LIST, getDailySeed } from '@/lib/dailyGameLogic';

export const dynamic = "force-dynamic";

// Helper pour mélanger et distribuer des memes aléatoires
function getRandomMemes(allMemes: any[], count: number, excludeIds: number[] = []) {
  // Filtrer ceux déjà utilisés
  const pool = allMemes.filter(m => !excludeIds.includes(m.id));
  // Si plus assez de memes, on tape dans tout le tas (fallback)
  const source = pool.length < count ? allMemes : pool;
  // Mélange
  const shuffled = [...source].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateKey = getDailySeed();
  const sessionKey = `daily_session:${dateKey}`;
  const forceReset = searchParams.get('forceReset') === 'true';

  try {
    // 1. Reset si demandé
    if (forceReset) {
      await kv.del(sessionKey);
    }

    let session: any = await kv.get(sessionKey);

    // 2. FORCE LE JEU MEME (Si pas de session ou si c'était un autre jeu)
    if (!session || session.game.id !== 'meme') {
      const memeGame = GAMES_LIST.find(g => g.id === 'meme');
      
      if (!memeGame) {
        return NextResponse.json({ error: "Jeu Meme introuvable dans GAMES_LIST" }, { status: 500 });
      }

      // Récupération des templates créés dans l'éditeur
      let allMemes = await kv.get<any[]>('missions:meme') || [];

      // Sécurité : Si l'éditeur est vide, on met des faux templates pour tester sans crash
      if (allMemes.length === 0) {
        allMemes = [
          { id: 1, name: "Test 1", url: "https://i.imgflip.com/1ur9b0.jpg", zones: [{id:1, top:10, left:10, width:40, height:20, fontSize:20, color:'#fff'}] },
          { id: 2, name: "Test 2", url: "https://i.imgflip.com/261o3j.jpg", zones: [{id:1, top:10, left:10, width:40, height:20, fontSize:20, color:'#fff'}] },
          { id: 3, name: "Test 3", url: "https://i.imgflip.com/30b1gx.jpg", zones: [{id:1, top:10, left:10, width:40, height:20, fontSize:20, color:'#fff'}] },
          { id: 4, name: "Test 4", url: "https://i.imgflip.com/1g8my4.jpg", zones: [{id:1, top:10, left:10, width:40, height:20, fontSize:20, color:'#fff'}] }
        ];
      }

      // Distribution : 2 memes pour Moi, 2 memes pour Chéri(e)
      const memesMoi = getRandomMemes(allMemes, 2);
      // On essaie de ne pas donner les mêmes à Chéri(e)
      const excludeIds = memesMoi.map(m => m.id);
      const memesCherie = getRandomMemes(allMemes, 2, excludeIds);

      session = {
        date: dateKey,
        game: memeGame,
        status: 'in_progress', // Démarre direct
        sharedData: {
          phase: 'CREATION', // CREATION -> VOTE -> RESULTS
          players: {
            "Moi": {
              memes: memesMoi,
              rerolls: [2, 2],    // 2 chances de changer d'image par meme
              inputs: [{}, {}],   // Textes vides au début
              finished: false,
              votesReceived: []
            },
            "Chéri(e)": {
              memes: memesCherie,
              rerolls: [2, 2],
              inputs: [{}, {}],
              finished: false,
              votesReceived: []
            }
          }
        },
        // Scores globaux de la session (pas de la semaine)
        players: { 
          "Moi": { score: 0 }, 
          "Chéri(e)": { score: 0 } 
        }
      };

      await kv.set(sessionKey, session, { ex: 86400 });
    }

    const weeklyRanking = await kv.hgetall(`weekly_scores_current`) || {};
    return NextResponse.json({ ...session, weeklyRanking });

  } catch (error) {
    console.error("Erreur Init Meme:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}