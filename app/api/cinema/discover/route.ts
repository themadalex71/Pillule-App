import { NextResponse } from 'next/server';

// Important : Force le serveur à ne pas garder en mémoire (cache) pour avoir du hasard à chaque fois
export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'API Key manquante' }, { status: 500 });
  }

  try {
    // 1. On tire une page au hasard (entre 1 et 50)
    const randomPage = Math.floor(Math.random() * 50) + 1;
    
    // 2. On interroge TMDB
    const url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=fr-FR&sort_by=popularity.desc&include_adult=false&page=${randomPage}`;

    const res = await fetch(url);
    const data = await res.json();

    // 3. On nettoie les données pour ne garder que l'essentiel pour les cartes
    const formattedMovies = data.results.map((movie: any) => ({
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      overview: movie.overview,
      vote: movie.vote_average.toFixed(1),
    }));
    
    // 4. On mélange les 20 résultats pour varier l'ordre
    const shuffled = formattedMovies.sort(() => 0.5 - Math.random());

    return NextResponse.json(shuffled);

  } catch (error) {
    console.error("Erreur TMDB Discover:", error);
    return NextResponse.json({ error: "Impossible de récupérer les films" }, { status: 500 });
  }
}