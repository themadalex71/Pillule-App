import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { getDailySeed } from '@/features/daily/services/dailyGameLogic';

export const dynamic = "force-dynamic";

// Helper pour le Meme Maker
async function getNewRandomMeme(excludeIds: number[]) {
  const allMemes = await kv.get<any[]>('missions:meme') || [];
  const pool = allMemes.filter(m => !excludeIds.includes(m.id));
  if (pool.length === 0) return allMemes[Math.floor(Math.random() * allMemes.length)];
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, player, sharedData, status, ...payload } = body;

    const sessionKey = `daily_session:${getDailySeed()}`;
    let session: any = await kv.get(sessionKey);

    if (!session) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

    // =========================================================
    // 🆕 GESTION GÉNÉRIQUE (POUR TIER LIST ET FUTURS JEUX)
    // =========================================================
    if (sharedData) {
        // 1. Mise à jour des données
        session.sharedData = {
            ...session.sharedData,
            ...sharedData
        };

        // 2. Mise à jour du statut
        if (status) {
            session.status = status;

            // --- CAS SPÉCIAL : SCORE TIER LIST (SÉCURISÉ) ---
            if (session.game.id === 'tierlist' && status === 'finished') {
                const p1 = session.sharedData.players["Moi"];
                const p2 = session.sharedData.players["Chéri(e)"];

                // Score P1 (Moi devine Chérie)
                let scoreP1 = 0;
                if (p1?.guessOrder && p2?.realOrder) {
                    p1.guessOrder.forEach((id: any, i: number) => { 
                        // On vérifie que p2.realOrder[i] existe avant de comparer
                        if (p2.realOrder[i] && String(id) === String(p2.realOrder[i])) scoreP1++; 
                    });
                }

                // Score P2 (Chérie devine Moi)
                let scoreP2 = 0;
                if (p2?.guessOrder && p1?.realOrder) {
                    p2.guessOrder.forEach((id: any, i: number) => { 
                        if (p1.realOrder[i] && String(id) === String(p1.realOrder[i])) scoreP2++; 
                    });
                }

                // Application des scores
                session.players["Moi"].score += scoreP1;
                session.players["Chéri(e)"].score += scoreP2;

                await kv.hincrby(`weekly_scores_current`, "Moi", scoreP1);
                await kv.hincrby(`weekly_scores_current`, "Chéri(e)", scoreP2);
            }
        }

        await kv.set(sessionKey, session);
        return NextResponse.json({ success: true, session });
    }

    // =========================================================
    // 🕰️ ANCIENNE GESTION (ACTIONS SPÉCIFIQUES)
    // =========================================================
    
    if (action === 'start_game') {
      session.status = 'in_progress';
      await kv.set(sessionKey, session);
    }

    // --- ZOOM ---
    if (session.game.id === 'zoom') {
      if (action === 'zoom_submit_photo') {
        session.sharedData.image = payload.image;
        session.sharedData.step = 'GUESS';
        await kv.set(sessionKey, session);
      }
      if (action === 'zoom_submit_guess') {
        session.sharedData.currentGuess = payload.guess;
        session.sharedData.step = 'VALIDATION';
        await kv.set(sessionKey, session);
      }
      if (action === 'zoom_validate') {
        const { isValid } = payload;
        if (isValid) {
          session.players[session.sharedData.guesser].score += 1;
          session.status = 'finished';
          await kv.hincrby(`weekly_scores_current`, session.sharedData.guesser, 1);
        } else {
          session.sharedData.currentGuess = null;
          session.sharedData.step = 'GUESS';
        }
        await kv.set(sessionKey, session);
      }
    }

    // --- MEME ---
    if (session.game.id === 'meme') {
      if (action === 'meme_reroll') {
        const { memeIndex } = payload;
        const playerData = session.sharedData.players[player];
        if (playerData.rerolls[memeIndex] > 0) {
          const usedIds = [
            ...session.sharedData.players["Moi"].memes.map((m: any) => m.id),
            ...session.sharedData.players["Chéri(e)"].memes.map((m: any) => m.id)
          ];
          const newMeme = await getNewRandomMeme(usedIds);
          playerData.memes[memeIndex] = newMeme;
          playerData.rerolls[memeIndex] -= 1;
          playerData.inputs[memeIndex] = {}; 
          await kv.set(sessionKey, session);
        }
      }
      if (action === 'meme_submit_creation') {
        const { inputs } = payload;
        session.sharedData.players[player].inputs = inputs;
        session.sharedData.players[player].finished = true;
        const p1 = session.sharedData.players["Moi"];
        const p2 = session.sharedData.players["Chéri(e)"];
        if (p1.finished && p2.finished) session.sharedData.phase = 'VOTE';
        await kv.set(sessionKey, session);
      }
      if (action === 'meme_submit_vote') {
        const { votes } = payload; 
        const opponent = player === "Moi" ? "Chéri(e)" : "Moi";
        session.sharedData.players[opponent].votesReceived = votes;
        const p1 = session.sharedData.players["Moi"];
        const p2 = session.sharedData.players["Chéri(e)"];
        if (p1.votesReceived.length > 0 && p2.votesReceived.length > 0) {
          session.sharedData.phase = 'RESULTS';
          session.status = 'finished';
          const scoreP1 = p1.votesReceived.reduce((a:number, b:number) => a + b, 0);
          const scoreP2 = p2.votesReceived.reduce((a:number, b:number) => a + b, 0);
          session.players["Moi"].score += scoreP1;
          session.players["Chéri(e)"].score += scoreP2;
          await kv.hincrby(`weekly_scores_current`, "Moi", scoreP1);
          await kv.hincrby(`weekly_scores_current`, "Chéri(e)", scoreP2);
        }
        await kv.set(sessionKey, session);
      }
    }

    // --- CADAVRE ---
    if (session.game.id === 'cadavre') {
      if (action === 'cadavre_submit_step') {
        const { text } = payload;
        const currentStep = session.sharedData.phase;
        const totalSteps = session.sharedData.template.steps.length;
        const storyToEdit = session.sharedData.stories.find((s: any) => s.authors[currentStep] === player);
        if (storyToEdit) storyToEdit.parts[currentStep] = text;
        const stepComplete = session.sharedData.stories.every((s: any) => s.parts[currentStep] !== null);
        if (stepComplete) {
          session.sharedData.phase += 1;
          if (session.sharedData.phase >= totalSteps) session.sharedData.phase = 'VOTE';
        }
        await kv.set(sessionKey, session);
      }
      if (action === 'cadavre_vote') {
        const { score } = payload;
        session.sharedData.votes[player].push(score);
        if (session.sharedData.votes["Moi"].length > 0 && session.sharedData.votes["Chéri(e)"].length > 0) {
            session.sharedData.phase = 'RESULTS';
            session.status = 'finished';
            session.players["Moi"].score += 1;
            session.players["Chéri(e)"].score += 1;
            await kv.hincrby(`weekly_scores_current`, "Moi", 1);
            await kv.hincrby(`weekly_scores_current`, "Chéri(e)", 1);
        }
        await kv.set(sessionKey, session);
      }
    }

    // --- POET ---
    if (session.game.id === 'poet') {
        if (action === 'poet_submit') {
            const { text } = payload;
            session.sharedData.poems[player] = text;
            if (session.sharedData.poems["Moi"] && session.sharedData.poems["Chéri(e)"]) {
                session.sharedData.phase = 'VOTE';
            }
            await kv.set(sessionKey, session);
        }
        if (action === 'poet_vote') {
            const { score } = payload;
            session.sharedData.votes[player].push(score);
            if (session.sharedData.votes["Moi"].length > 0 && session.sharedData.votes["Chéri(e)"].length > 0) {
                session.sharedData.phase = 'RESULTS';
                session.status = 'finished';
                const scoreForMoi = session.sharedData.votes["Chéri(e)"][0] || 0;
                const scoreForCherie = session.sharedData.votes["Moi"][0] || 0;
                session.players["Moi"].score += scoreForMoi;
                session.players["Chéri(e)"].score += scoreForCherie;
                await kv.hincrby(`weekly_scores_current`, "Moi", scoreForMoi);
                await kv.hincrby(`weekly_scores_current`, "Chéri(e)", scoreForCherie);
            }
            await kv.set(sessionKey, session);
        }
    }

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error("Erreur Action:", error);
    return NextResponse.json({ error: "Erreur Action" }, { status: 500 });
  }
}