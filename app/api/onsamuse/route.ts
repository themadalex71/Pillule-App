import { NextResponse } from 'next/server';
import { getGameOfTheDay, getGameById } from '@/lib/gameUtils'; // Ajoute l'import

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 1. On regarde si l'URL contient un ID forcé (ex: /api/onsamuse?id=zoom)
    const { searchParams } = new URL(request.url);
    const forcedId = searchParams.get('id');

    let gameData;
    const now = new Date();
    // Utiliser l'heure locale ou force Europe/Paris
    const dateKey = now.toISOString().split('T')[0];

    if (forcedId) {
      // MODE TRICHE : On récupère le jeu demandé
      gameData = getGameById(forcedId);
    } else {
      // MODE NORMAL : On récupère le jeu du jour
      gameData = getGameOfTheDay(dateKey);
    }

    return NextResponse.json({
      date: dateKey,
      game: gameData,
      isTestMode: !!forcedId // Petit flag pour dire au front qu'on triche
    });

  } catch (error) {
    console.error("Erreur API:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}