import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export async function POST(request: Request) {
  const redis = Redis.fromEnv();
  
  try {
    const body = await request.json();
    // On récupère le userId (Alex ou Juju) envoyé par la page
    const { movie, listType, userId } = body; 

    if (!movie || !listType || !userId) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    // On crée une clé unique : ex: "user_Alex_wishlist"
    const key = `user_${userId}_${listType}`;

    // 1. On récupère la liste actuelle de CET utilisateur
    let currentList = await redis.get<any[]>(key) || [];

    // 2. On vérifie si le film est déjà dedans
    const exists = currentList.find((m: any) => m.id === movie.id);

    if (!exists) {
      const movieToSave = {
        id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path,
        vote: movie.vote,
        overview: movie.overview
      };

      // 3. On ajoute au début
      currentList.unshift(movieToSave);
      
      // 4. On sauvegarde
      await redis.set(key, currentList);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erreur sauvegarde:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}