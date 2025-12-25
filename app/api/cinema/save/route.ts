import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export async function POST(request: Request) {
  const redis = Redis.fromEnv();
  
  try {
    const body = await request.json();
    const { movie, listType, userId, userRating } = body; 

    if (!movie || !listType || !userId) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    // 1. Définir qui est l'utilisateur et qui est "l'autre"
    const otherUser = userId === 'Alex' ? 'Juju' : 'Alex';

    // 2. Vérifier si c'est un MATCH (Seulement si on ajoute à la wishlist)
    let isMatch = false;
    if (listType === 'wishlist') {
        const otherKey = `user_${otherUser}_wishlist`;
        const otherList = await redis.get<any[]>(otherKey) || [];
        // On regarde si le film est dans la liste de l'autre
        isMatch = otherList.some((m: any) => m.id === movie.id);
    }

    // 3. Sauvegarder le film pour l'utilisateur actuel
    const key = `user_${userId}_${listType}`;
    let currentList = await redis.get<any[]>(key) || [];

    // Nettoyage (si déjà présent)
    currentList = currentList.filter((m: any) => m.id !== movie.id);

    const movieToSave = {
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path,
      vote: movie.vote,
      overview: movie.overview,
      userRating: userRating || null, 
      ratedAt: userRating ? new Date().toLocaleDateString('fr-FR') : null
    };

    currentList.unshift(movieToSave);
    await redis.set(key, currentList);

    // 4. On renvoie l'info du Match au téléphone !
    return NextResponse.json({ success: true, isMatch: isMatch });

  } catch (error) {
    console.error("Erreur sauvegarde:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const redis = Redis.fromEnv();

  try {
    const body = await request.json();
    const { movieId, listType, userId } = body;

    if (!movieId || !userId || !listType) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    const key = `user_${userId}_${listType}`;
    
    // 1. Récupérer la liste actuelle
    const currentList = await redis.get<any[]>(key) || [];

    // 2. Filtrer pour enlever le film ciblé
    // On convertit en String pour éviter les bugs "123" (string) vs 123 (number)
    const newList = currentList.filter((movie: any) => String(movie.id) !== String(movieId));

    // 3. Sauvegarder la nouvelle liste nettoyée
    await redis.set(key, newList);

    return NextResponse.json({ success: true, message: "Film supprimé" });

  } catch (error) {
    console.error("Erreur suppression:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}