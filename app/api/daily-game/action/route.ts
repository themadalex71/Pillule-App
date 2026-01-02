import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { getDailySeed } from '@/lib/dailyGameLogic';

export const dynamic = "force-dynamic";

// Helper pour piocher un meme unique
async function getNewRandomMeme(excludeIds: number[]) {
  const allMemes = await kv.get<any[]>('missions:meme') || [];
  const pool = allMemes.filter(m => !excludeIds.includes(m.id));
  if (pool.length === 0) return allMemes[Math.floor(Math.random() * allMemes.length)]; // Fallback
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function POST(request: Request) {
  try {
    const { action, player, ...payload } = await request.json();
    const sessionKey = `daily_session:${getDailySeed()}`;
    let session: any = await kv.get(sessionKey);

    if (!session) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

    // --- ACTIONS COMMUNES / ZOOM ---
    if (action === 'start_game') { /* ... code existant ... */ }
    if (action === 'zoom_submit_photo') { /* ... code existant ... */ }
    if (action === 'zoom_submit_guess') { /* ... code existant ... */ }
    if (action === 'zoom_validate') { /* ... code existant ... */ }

    // --- ACTIONS MEME MAKER ---

    // 1. REROLL
    if (action === 'meme_reroll') {
      const { memeIndex } = payload; // 0 ou 1
      const playerData = session.sharedData.players[player];
      
      if (playerData.rerolls[memeIndex] > 0) {
        // Collecter tous les IDs actuellement utilisés pour éviter les doublons
        const usedIds = [
          ...session.sharedData.players["Moi"].memes.map((m: any) => m.id),
          ...session.sharedData.players["Chéri(e)"].memes.map((m: any) => m.id)
        ];
        
        const newMeme = await getNewRandomMeme(usedIds);
        
        // Mise à jour
        playerData.memes[memeIndex] = newMeme;
        playerData.rerolls[memeIndex] -= 1;
        playerData.inputs[memeIndex] = {}; // Reset des textes si on change d'image
        
        await kv.set(sessionKey, session);
      }
    }

    // 2. SOUMETTRE LA CRÉATION
    if (action === 'meme_submit_creation') {
      const { inputs } = payload; // [{zoneId: text...}, {zoneId: text...}]
      session.sharedData.players[player].inputs = inputs;
      session.sharedData.players[player].finished = true;

      // Vérifier si les deux ont fini
      const p1 = session.sharedData.players["Moi"];
      const p2 = session.sharedData.players["Chéri(e)"];

      if (p1.finished && p2.finished) {
        session.sharedData.phase = 'VOTE';
      }
      await kv.set(sessionKey, session);
    }

    // 3. SOUMETTRE LE VOTE
    if (action === 'meme_submit_vote') {
      const { votes } = payload; // [scoreMeme1, scoreMeme2] (0 à 4)
      
      // Si je suis "Moi", je note "Chéri(e)"
      const opponent = player === "Moi" ? "Chéri(e)" : "Moi";
      session.sharedData.players[opponent].votesReceived = votes;

      // Vérifier si tout le monde a voté (donc si tout le monde a REÇU des notes)
      const p1 = session.sharedData.players["Moi"];
      const p2 = session.sharedData.players["Chéri(e)"];

      if (p1.votesReceived.length > 0 && p2.votesReceived.length > 0) {
        session.sharedData.phase = 'RESULTS';
        session.status = 'finished';

        // Calcul des scores finaux (Somme des votes reçus)
        const scoreP1 = p1.votesReceived.reduce((a:number, b:number) => a + b, 0);
        const scoreP2 = p2.votesReceived.reduce((a:number, b:number) => a + b, 0);

        // Mise à jour des scores globaux du profil
        session.players["Moi"].score += scoreP1;
        session.players["Chéri(e)"].score += scoreP2;

        // Mise à jour Leaderboard Hebdo
        await kv.hincrby(`weekly_scores_current`, "Moi", scoreP1);
        await kv.hincrby(`weekly_scores_current`, "Chéri(e)", scoreP2);
      }
      
      await kv.set(sessionKey, session);
    }

    return NextResponse.json({ success: true, session });
  } catch (error) {
    return NextResponse.json({ error: "Erreur Action" }, { status: 500 });
  }
}