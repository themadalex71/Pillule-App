import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export async function POST(request: Request) {
  const redis = Redis.fromEnv();
  const apiKey = process.env.TMDB_API_KEY;
  
  try {
    const body = await request.json();
    const { title, year, listType, userId, userRating, watchedDate } = body; 

    if (!title || !userId) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    // 1. Recherche TMDB (Titre + Année pour précision)
    const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(title)}&year=${year}&language=fr-FR`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    let movie = searchData.results?.[0];
    // Retry sans l'année si échec
    if (!movie) {
        const retryUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(title)}&language=fr-FR`;
        const retryRes = await fetch(retryUrl);
        const retryData = await retryRes.json();
        movie = retryData.results?.[0];
    }

    if (!movie) {
        return NextResponse.json({ success: false, message: "Film introuvable" });
    }

    // 2. Gestion de la Date (Format YYYY-MM-DD du CSV Letterboxd)
    let formattedDate = null;
    if (watchedDate) {
        const dateObj = new Date(watchedDate);
        if (!isNaN(dateObj.getTime())) {
            formattedDate = dateObj.toLocaleDateString('fr-FR'); // Deviendra JJ/MM/AAAA
        }
    }

    // 3. Récupération liste existante
    const key = `user_${userId}_${listType}`;
    let currentList = await redis.get<any[]>(key) || [];

    const existingIndex = currentList.findIndex((m: any) => m.id === movie.id);

    // 4. Logique de Fusion (Merge)
    if (existingIndex !== -1) {
        const existingMovie = currentList[existingIndex];
        
        // On met à jour seulement si on a des infos plus précises
        let hasChanges = false;
        if (userRating && existingMovie.userRating !== userRating) {
            existingMovie.userRating = userRating;
            hasChanges = true;
        }
        if (formattedDate && existingMovie.ratedAt !== formattedDate) {
            existingMovie.ratedAt = formattedDate;
            hasChanges = true;
        }

        if (hasChanges) {
            currentList[existingIndex] = existingMovie;
            await redis.set(key, currentList);
            return NextResponse.json({ success: true, message: "Mis à jour", movie: movie.title });
        } else {
            return NextResponse.json({ success: true, message: "Déjà à jour", movie: movie.title });
        }
    }

    // 5. Création Nouveau Film
    const movieToSave = {
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      vote: movie.vote_average.toFixed(1),
      overview: movie.overview,
      userRating: userRating || null,
      ratedAt: formattedDate
    };

    currentList.unshift(movieToSave);
    await redis.set(key, currentList);

    return NextResponse.json({ success: true, movie: movie.title });

  } catch (error) {
    console.error("Erreur import:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}