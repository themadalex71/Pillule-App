import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { getDailySeed } from '@/lib/dailyGameLogic';

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { action, player, image, guess, isValid } = await request.json();
    const sessionKey = `daily_session:${getDailySeed()}`;
    let session: any = await kv.get(sessionKey);

    if (!session) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

    // 1. Démarrage et attribution des rôles
    if (action === 'start_game') {
      session.status = 'in_progress';
      session.sharedData.step = 'PHOTO';
    }

    // 2. Envoi de la photo par l'auteur
    if (action === 'zoom_submit_photo') {
      session.sharedData.image = image;
      session.sharedData.step = 'GUESS';
    }

    // 3. Envoi de la devinette par le joueur B
    if (action === 'zoom_submit_guess') {
      session.sharedData.currentGuess = guess;
      session.sharedData.step = 'VALIDATION';
    }

    // 4. Validation finale par l'auteur (Termine la partie dans tous les cas)
    if (action === 'zoom_validate') {
      session.status = 'finished'; // On termine quoi qu'il arrive
      
      if (isValid) {
        const winner = session.sharedData.guesser;
        session.players[winner].score += 1; // +1 point si vrai
        
        // Mise à jour du classement hebdomadaire
        await kv.hincrby(`weekly_scores_current`, winner, 1);
      }
      
      // On enregistre l'auteur actuel pour l'alternance de demain
      await kv.set('zoom_last_author', session.sharedData.author);
    }

    await kv.set(sessionKey, session, { ex: 86400 });
    return NextResponse.json({ success: true, session });
  } catch (error) {
    return NextResponse.json({ error: "Erreur Action" }, { status: 500 });
  }
}