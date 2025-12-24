import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export async function POST(request: Request) {
  const redis = Redis.fromEnv();
  
  try {
    const body = await request.json();
    // NOUVEAU : on récupère userRating
    const { movie, listType, userId, userRating } = body; 

    if (!movie || !listType || !userId) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    const key = `user_${userId}_${listType}`;
    let currentList = await redis.get<any[]>(key) || [];

    // On retire l'ancienne version du film s'il existe déjà (pour mettre à jour la note)
    currentList = currentList.filter((m: any) => m.id !== movie.id);

    const movieToSave = {
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path,
      vote: movie.vote, // Note TMDB
      overview: movie.overview,
      // NOUVEAU : Note de l'utilisateur et Date
      userRating: userRating || null, 
      ratedAt: userRating ? new Date().toLocaleDateString('fr-FR') : null
    };

    // On ajoute au début de la liste
    currentList.unshift(movieToSave);
    
    await redis.set(key, currentList);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erreur sauvegarde:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}