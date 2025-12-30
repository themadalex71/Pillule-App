import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { memeInstanceId, score, judgeName } = body;

    // On enregistre la note dans une liste liée à ce meme précis
    // On utilise LPUSH pour empiler les notes des différents joueurs
    await kv.lpush(`meme:votes:${memeInstanceId}`, {
      judge: judgeName,
      score: score, // Le chiffre de 1 à 5
      votedAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur vote:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}