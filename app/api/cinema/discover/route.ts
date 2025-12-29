import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const apiKey = process.env.TMDB_API_KEY;
  const { searchParams } = new URL(request.url);
  
  // Paramètres
  const mode = searchParams.get('mode') || 'cinematch'; 
  const genre = searchParams.get('genre');
  const minYear = searchParams.get('minYear');
  const maxYear = searchParams.get('maxYear');
  const minVote = searchParams.get('minVote');
  const sortBy = searchParams.get('sortBy') || 'popularity.desc'; 
  const page = searchParams.get('page') || '1';
  
  // NOUVEAU : Paramètre de recherche
  const query = searchParams.get('query');

  if (!apiKey) {
    return NextResponse.json({ error: 'API Key manquante' }, { status: 500 });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    let url = '';

    // =========================================================
    // CAS 1 : MODE RECHERCHE (Si l'utilisateur a tapé du texte)
    // =========================================================
    if (query && query.trim() !== '') {
        // On utilise l'endpoint SEARCH de TMDB
        url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&language=fr-FR&include_adult=false&page=${page}&query=${encodeURIComponent(query)}`;
        
        // On peut quand même filtrer par année si demandé
        if (minYear) url += `&primary_release_year=${minYear}`;
    } 
    
    // =========================================================
    // CAS 2 : MODE DÉCOUVERTE (Cinematch & Catalogue classique)
    // =========================================================
    else {
        // On utilise l'endpoint DISCOVER de TMDB (Ta logique existante)
        url = `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&language=fr-FR&include_adult=false`;

        // --- FILTRES COMMUNS ---
        if (genre) url += `&with_genres=${genre}`;
        if (minYear) url += `&primary_release_date.gte=${minYear}-01-01`;
        if (minVote) url += `&vote_average.gte=${minVote}`;
        url += `&vote_count.gte=50`; 

        // --- LOGIQUE SPECIFIQUE ---
        if (mode === 'catalogue') {
            // Mode Catalogue : Tri + Pagination normale + Date limite
            const dateLimit = maxYear ? `${maxYear}-12-31` : today;
            url += `&primary_release_date.lte=${dateLimit}`;
            url += `&page=${page}`; // Pagination normale

            if (sortBy === 'newest') url += `&sort_by=primary_release_date.desc`;
            else if (sortBy === 'oldest') url += `&sort_by=primary_release_date.asc`;
            else if (sortBy === 'rating') url += `&sort_by=vote_average.desc`;
            else url += `&sort_by=popularity.desc`;

        } else {
            // Mode CineMatch : Page Aléatoire
            const randomPage = Math.floor(Math.random() * 20) + 1;
            url += `&page=${randomPage}`; // Page aléatoire
            url += `&sort_by=popularity.desc`;
            if (maxYear) url += `&primary_release_date.lte=${maxYear}-12-31`;
        }
    }

    // --- RÉCUPÉRATION ET FORMATAGE ---
    const res = await fetch(url);
    const data = await res.json();

    const formattedMovies = (data.results || []).map((movie: any) => ({
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
      overview: movie.overview,
      vote: movie.vote_average.toFixed(1),
    }));
    
    // Si c'est CineMatch ET qu'on n'est pas en recherche, on mélange les résultats
    const finalResult = (mode === 'cinematch' && !query) ? formattedMovies.sort(() => 0.5 - Math.random()) : formattedMovies;

    return NextResponse.json(finalResult);

  } catch (error) {
    console.error("Erreur TMDB:", error);
    return NextResponse.json({ error: "Impossible de récupérer les films" }, { status: 500 });
  }
}