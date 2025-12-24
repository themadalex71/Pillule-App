import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const apiKey = process.env.TMDB_API_KEY;

  if (!id || !apiKey) {
    return NextResponse.json({ error: 'ID ou Clé manquante' }, { status: 400 });
  }

  try {
    const url = `https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=fr-FR&append_to_response=credits`;
    
    const res = await fetch(url);
    const data = await res.json();

    const director = data.credits.crew.find((person: any) => person.job === 'Director');
    
    // NOUVEAU : On récupère l'objet complet avec image pour les 6 premiers acteurs
    const cast = data.credits.cast.slice(0, 6).map((actor: any) => ({
      name: actor.name,
      profile_path: actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : null,
      character: actor.character
    }));

    const details = {
      id: data.id,
      title: data.title,
      overview: data.overview,
      poster_path: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
      backdrop_path: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : null,
      release_date: new Date(data.release_date).toLocaleDateString('fr-FR'),
      runtime: `${Math.floor(data.runtime / 60)}h${data.runtime % 60}`,
      genres: data.genres.map((g: any) => g.name).join(', '),
      vote: data.vote_average.toFixed(1),
      director: director ? director.name : 'Inconnu',
      cast: cast, // On envoie la liste enrichie
      tagline: data.tagline
    };

    return NextResponse.json(details);

  } catch (error) {
    console.error("Erreur TMDB Details:", error);
    return NextResponse.json({ error: "Erreur récupération détails" }, { status: 500 });
  }
}