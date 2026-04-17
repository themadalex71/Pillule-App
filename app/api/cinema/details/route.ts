import { NextResponse } from "next/server";
import type { TmdbMovieDetailsResponse } from "@/modules/cinema/types";

export const dynamic = "force-dynamic";

type AppLocale = "fr" | "en";

function normalizeLocale(value: string | null): AppLocale {
  return value === "en" ? "en" : "fr";
}

function toTmdbLanguage(locale: AppLocale) {
  return locale === "en" ? "en-US" : "fr-FR";
}

function toDateLocale(locale: AppLocale) {
  return locale === "en" ? "en-US" : "fr-FR";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const locale = normalizeLocale(searchParams.get("lang"));
  const apiKey = process.env.TMDB_API_KEY;
  const tmdbLanguage = toTmdbLanguage(locale);
  const dateLocale = toDateLocale(locale);
  const messages =
    locale === "en"
      ? {
          missingConfig: "Missing movie ID or TMDB key.",
          fetchFailed: "Unable to fetch movie details.",
          unknownDate: "Unknown date",
          unknownRuntime: "Unknown runtime",
          unknownDirector: "Unknown",
          genericError: "Details fetch error.",
        }
      : {
          missingConfig: "ID ou cle TMDB manquante.",
          fetchFailed: "Impossible de recuperer les details du film.",
          unknownDate: "Date inconnue",
          unknownRuntime: "Duree inconnue",
          unknownDirector: "Inconnu",
          genericError: "Erreur recuperation details.",
        };

  if (!id || !apiKey) {
    return NextResponse.json(
      { error: messages.missingConfig },
      { status: 400 },
    );
  }

  try {
    const url =
      `https://api.themoviedb.org/3/movie/${id}` +
      `?api_key=${apiKey}` +
      `&language=${tmdbLanguage}` +
      `&append_to_response=credits`;

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      return NextResponse.json(
        { error: messages.fetchFailed },
        { status: res.status },
      );
    }

    const data = (await res.json()) as TmdbMovieDetailsResponse;

    const director = data.credits?.crew?.find(
      (person) => person.job === "Director",
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
        ? new Date(data.release_date).toLocaleDateString(dateLocale)
        : messages.unknownDate,
      runtime:
        typeof data.runtime === "number"
          ? `${Math.floor(data.runtime / 60)}h${data.runtime % 60}`
          : messages.unknownRuntime,
      genres: Array.isArray(data.genres)
        ? data.genres.map((g) => g.name).join(", ")
        : "",
      vote:
        typeof data.vote_average === "number"
          ? data.vote_average.toFixed(1)
          : "0.0",
      director: director
        ? director.name
        : messages.unknownDirector,
      cast,
      tagline: data.tagline,
    };

    return NextResponse.json(details);
  } catch (error) {
    console.error("TMDB details error:", error);
    return NextResponse.json(
      { error: messages.genericError },
      { status: 500 },
    );
  }
}
