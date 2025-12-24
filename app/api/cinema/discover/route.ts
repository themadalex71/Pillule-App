import { NextResponse } from 'next/server';

// Force le serveur à ne pas mettre en cache, pour avoir du hasard à chaque fois
export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API Key manquante dans .env.local' }, { status: 500 });
  }

  try {
    // On prend une page au hasard entre 1 et 50 pour varier les plaisirs
    const randomPage = Math.floor(Math.random() * 50) + 1;
    
    // URL de TMDB pour découvrir des films populaires en FR
    const url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=fr-FR&sort_by=popularity.desc&include_adult=false&page=${randomPage}`;

    const res = await fetch(url);
    const data = await res.json();

    // On nettoie les données pour ne garder que l'essentiel
    const formattedMovies = data.results.map((movie: any) => ({
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      overview: movie.overview,
      vote: movie.vote_average.toFixed(1),
    }));
    
    // On mélange les résultats de la page pour plus d'aléatoire
    const shuffled = formattedMovies.sort(() => 0.5 - Math.random());

    return NextResponse.json(shuffled);

  } catch (error) {
    console.error("Erreur TMDB:", error);
    return NextResponse.json({ error: "Impossible de récupérer les films" }, { status: 500 });
  }
}