import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { getDailySeed } from '@/lib/dailyGameLogic';

export const dynamic = "force-dynamic";

// Helper pour le Meme Maker : Piocher une image unique
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

    // --- 1. ACTION COMMUNE : DÉMARRAGE ---
    if (action === 'start_game') {
      session.status = 'in_progress';
      await kv.set(sessionKey, session);
    }

    // =========================================================
    // JEU 1 : ZOOM EXTRÊME
    // =========================================================
    if (session.game.id === 'zoom') {
      // Le joueur envoie la photo
      if (action === 'zoom_submit_photo') {
        session.sharedData.image = payload.image;
        session.sharedData.step = 'GUESS';
        await kv.set(sessionKey, session);
      }

      // L'autre joueur envoie sa devinette
      if (action === 'zoom_submit_guess') {
        session.sharedData.currentGuess = payload.guess;
        session.sharedData.step = 'VALIDATION';
        await kv.set(sessionKey, session);
      }

      // L'auteur valide si c'est gagné ou perdu
      if (action === 'zoom_validate') {
        const { isValid } = payload;
        if (isValid) {
          // Victoire : +1 point et fin
          session.players[session.sharedData.guesser].score += 1;
          session.status = 'finished';
          // Mise à jour du classement hebdo
          await kv.hincrby(`weekly_scores_current`, session.sharedData.guesser, 1);
        } else {
          // Raté : on recommence à deviner (ou on finit selon ta règle, ici on boucle)
          session.sharedData.currentGuess = null;
          session.sharedData.step = 'GUESS';
        }
        await kv.set(sessionKey, session);
      }
    }

    // =========================================================
    // JEU 2 : MEME MAKER
    // =========================================================
    if (session.game.id === 'meme') {
      
      // REROLL : Changer une image qui ne plait pas
      if (action === 'meme_reroll') {
        const { memeIndex } = payload; // 0 ou 1
        const playerData = session.sharedData.players[player];
        
        if (playerData.rerolls[memeIndex] > 0) {
          // On collecte les IDs déjà utilisés pour éviter les doublons
          const usedIds = [
            ...session.sharedData.players["Moi"].memes.map((m: any) => m.id),
            ...session.sharedData.players["Chéri(e)"].memes.map((m: any) => m.id)
          ];
          
          const newMeme = await getNewRandomMeme(usedIds);
          
          // Mise à jour
          playerData.memes[memeIndex] = newMeme;
          playerData.rerolls[memeIndex] -= 1;
          playerData.inputs[memeIndex] = {}; // Reset des textes
          
          await kv.set(sessionKey, session);
        }
      }

      // SOUMETTRE LA CRÉATION (Textes remplis)
      if (action === 'meme_submit_creation') {
        const { inputs } = payload;
        session.sharedData.players[player].inputs = inputs;
        session.sharedData.players[player].finished = true;

        const p1 = session.sharedData.players["Moi"];
        const p2 = session.sharedData.players["Chéri(e)"];

        // Si les deux ont fini, on passe au vote
        if (p1.finished && p2.finished) {
          session.sharedData.phase = 'VOTE';
        }
        await kv.set(sessionKey, session);
      }

      // SOUMETTRE LE VOTE
      if (action === 'meme_submit_vote') {
        const { votes } = payload; // [note1, note2]
        
        // J'enregistre les votes que je donne à mon adversaire
        const opponent = player === "Moi" ? "Chéri(e)" : "Moi";
        session.sharedData.players[opponent].votesReceived = votes;

        const p1 = session.sharedData.players["Moi"];
        const p2 = session.sharedData.players["Chéri(e)"];

        // Si tout le monde a voté (donc a reçu des votes)
        if (p1.votesReceived.length > 0 && p2.votesReceived.length > 0) {
          session.sharedData.phase = 'RESULTS';
          session.status = 'finished';

          // Calcul des scores finaux
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

    // =========================================================
    // JEU 3 : CADAVRE EXQUIS
    // =========================================================
    if (session.game.id === 'cadavre') {
      
      // SOUMETTRE UNE ÉTAPE (Un mot/bout de phrase)
      if (action === 'cadavre_submit_step') {
        const { text } = payload;
        const currentStep = session.sharedData.phase;
        const totalSteps = session.sharedData.template.steps.length;

        // Trouver l'histoire assignée à ce joueur pour cette étape
        const storyToEdit = session.sharedData.stories.find((s: any) => s.authors[currentStep] === player);

        if (storyToEdit) {
          storyToEdit.parts[currentStep] = text;
        }

        // Vérifier si ON PASSE À L'ÉTAPE SUIVANTE (Les deux doivent avoir répondu)
        const stepComplete = session.sharedData.stories.every((s: any) => s.parts[currentStep] !== null);

        if (stepComplete) {
          session.sharedData.phase += 1;
          
          // Si on a dépassé le nombre d'étapes du template, c'est la fin
          if (session.sharedData.phase >= totalSteps) {
              session.sharedData.phase = 'VOTE'; // Phase de lecture
          }
        }
        await kv.set(sessionKey, session);
      }

      // CONFIRMER LA LECTURE (Vote symbolique)
      if (action === 'cadavre_vote') {
        const { score } = payload;
        session.sharedData.votes[player].push(score);

        // Si les deux ont confirmé
        if (session.sharedData.votes["Moi"].length > 0 && session.sharedData.votes["Chéri(e)"].length > 0) {
            session.sharedData.phase = 'RESULTS';
            session.status = 'finished';
            
            // Bonus de participation (+1 pt chacun)
            session.players["Moi"].score += 1;
            session.players["Chéri(e)"].score += 1;
            
            await kv.hincrby(`weekly_scores_current`, "Moi", 1);
            await kv.hincrby(`weekly_scores_current`, "Chéri(e)", 1);
        }
        await kv.set(sessionKey, session);
      }
    }

    // =========================================================
    // JEU 4 : POÈTE DU DIMANCHE
    // =========================================================
    if (session.game.id === 'poet') {
        
        // SOUMISSION DU POÈME
        if (action === 'poet_submit') {
            const { text } = payload;
            session.sharedData.poems[player] = text;
            
            // Vérifier si les deux ont fini
            if (session.sharedData.poems["Moi"] && session.sharedData.poems["Chéri(e)"]) {
                session.sharedData.phase = 'VOTE';
            }
            await kv.set(sessionKey, session);
        }

        // VOTE (Note sur 5)
        if (action === 'poet_vote') {
            const { score } = payload;
            session.sharedData.votes[player].push(score);

            // Si tout le monde a voté
            if (session.sharedData.votes["Moi"].length > 0 && session.sharedData.votes["Chéri(e)"].length > 0) {
                session.sharedData.phase = 'RESULTS';
                session.status = 'finished';

                // Points gagnés = Note donnée par l'adversaire
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