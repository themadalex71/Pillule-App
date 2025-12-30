import { NextResponse } from 'next/server';
import { getGameOfTheDay, getGameById } from '@/lib/gameUtils'; // Ajoute l'import

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forcedId = searchParams.get('id'); // L'ID envoyé par le menu Testeur

    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];

    let gameData;
    if (forcedId) {
      // Pour le testeur : on va chercher le jeu demandé par son ID
      gameData = getGameById(forcedId); 
    } else {
      // Pour les joueurs : on suit la logique aléatoire du jour
      gameData = getGameOfTheDay(dateKey); 
    }

    return NextResponse.json({
      date: dateKey,
      game: gameData,
      isTestMode: !!forcedId
    });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}