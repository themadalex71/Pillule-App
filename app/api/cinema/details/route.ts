import { NextResponse } from "next/server";
import type { TmdbMovieDetailsResponse } from "@/modules/cinema/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const apiKey = process.env.TMDB_API_KEY;

  if (!id || !apiKey) {
    return NextResponse.json(
      { error: "ID ou clé TMDB manquante." },
      { status: 400 }
    );
  }

  try {
    const url =
      `https://api.themoviedb.org/3/movie/${id}` +
      `?api_key=${apiKey}` +
      `&language=fr-FR` +
      `&append_to_response=credits`;

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Impossible de récupérer les détails du film." },
        { status: res.status }
      );
    }

    const data = (await res.json()) as TmdbMovieDetailsResponse;

    const director = data.credits?.crew?.find(
      (person) => person.job === "Director"
    );

    const cast =
      data.credits?.cast?.slice(0, 6).map((actor) => ({
        name: actor.name,
        profile_path: actor.profile_path
          ? `https://image.tmdb.org/t/p/w185${actor.profile_path}`
          : null,
        character: actor.character,
      })) ?? [];

    const details = {
      id: data.id,
      title: data.title,
      overview: data.overview,
      poster_path: data.poster_path
        ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
        : null,
      backdrop_path: data.backdrop_path
        ? `https://image.tmdb.org/t/p/original${data.backdrop_path}`
        : null,
      release_date: data.release_date
        ? new Date(data.release_date).toLocaleDateString("fr-FR")
        : "Date inconnue",
      runtime:
        typeof data.runtime === "number"
          ? `${Math.floor(data.runtime / 60)}h${data.runtime % 60}`
          : "Durée inconnue",
      genres: Array.isArray(data.genres)
        ? data.genres.map((g) => g.name).join(", ")
        : "",
      vote:
        typeof data.vote_average === "number"
          ? data.vote_average.toFixed(1)
          : "0.0",
      director: director ? director.name : "Inconnu",
      cast,
      tagline: data.tagline,
    };

    return NextResponse.json(details);
  } catch (error) {
    console.error("Erreur TMDB details:", error);
    return NextResponse.json(
      { error: "Erreur récupération détails." },
      { status: 500 }
    );
  }
}