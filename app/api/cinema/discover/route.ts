import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type AppLocale = "fr" | "en";

function normalizeLocale(value: string | null): AppLocale {
  return value === "en" ? "en" : "fr";
}

function toTmdbLanguage(locale: AppLocale) {
  return locale === "en" ? "en-US" : "fr-FR";
}

type TmdbDiscoverMovie = {
  id: number;
  title: string;
  poster_path: string | null;
  overview: string;
  vote_average: number;
};

type TmdbDiscoverResponse = {
  results?: TmdbDiscoverMovie[];
  total_pages?: number;
};

export async function GET(request: Request) {
  const apiKey = process.env.TMDB_API_KEY;
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("mode") || "cinematch";
  const genre = searchParams.get("genre");
  const minYear = searchParams.get("minYear");
  const maxYear = searchParams.get("maxYear");
  const minVote = searchParams.get("minVote");
  const sortBy = searchParams.get("sortBy") || "popularity.desc";
  const page = searchParams.get("page") || "1";
  const query = searchParams.get("query");
  const locale = normalizeLocale(searchParams.get("lang"));
  const tmdbLanguage = toTmdbLanguage(locale);
  const messages =
    locale === "en"
      ? {
          missingKey: "TMDB_API_KEY is missing.",
          fetchTmdb: "Unable to fetch TMDB movies.",
          fetchGeneric: "Unable to fetch movies.",
        }
      : {
          missingKey: "TMDB_API_KEY manquante.",
          fetchTmdb: "Impossible de recuperer les films TMDB.",
          fetchGeneric: "Impossible de recuperer les films.",
        };

  if (!apiKey) {
    return NextResponse.json(
      { error: messages.missingKey },
      { status: 500 }
    );
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    let url = "";

    if (query && query.trim() !== "") {
      url =
        `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}` +
        `&language=${tmdbLanguage}` +
        `&include_adult=false` +
        `&page=${page}` +
        `&query=${encodeURIComponent(query)}`;

      if (minYear) {
        url += `&primary_release_year=${minYear}`;
      }
    } else {
      const discoverBase =
        `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}` +
        `&language=${tmdbLanguage}` +
        `&include_adult=false` +
        `${genre ? `&with_genres=${genre}` : ""}` +
        `${minYear ? `&primary_release_date.gte=${minYear}-01-01` : ""}` +
        `${minVote ? `&vote_average.gte=${minVote}` : ""}` +
        `&vote_count.gte=50` +
        `${maxYear ? `&primary_release_date.lte=${maxYear}-12-31` : ""}`;

      if (mode === "catalogue") {
        const dateLimit = maxYear ? `${maxYear}-12-31` : today;

        url = `${discoverBase}&primary_release_date.lte=${dateLimit}&page=${page}`;

        if (sortBy === "newest") url += `&sort_by=primary_release_date.desc`;
        else if (sortBy === "oldest")
          url += `&sort_by=primary_release_date.asc`;
        else if (sortBy === "rating") url += `&sort_by=vote_average.desc`;
        else url += `&sort_by=popularity.desc`;
      } else {
        // CineMatch: avoid empty random pages by probing page 1 then sampling valid pages.
        const firstRes = await fetch(
          `${discoverBase}&page=1&sort_by=popularity.desc`,
          { cache: "no-store" }
        );

        if (!firstRes.ok) {
          return NextResponse.json(
            { error: messages.fetchTmdb },
            { status: firstRes.status }
          );
        }

        const firstData = (await firstRes.json()) as TmdbDiscoverResponse;
        const totalPages = Math.max(1, Math.min(firstData.total_pages || 1, 500));
        const collected = [...(firstData.results || [])];
        const testedPages = new Set<number>([1]);

        const tries = Math.min(6, totalPages);
        for (let i = 0; i < tries && collected.length < 30; i += 1) {
          const randomPage = Math.floor(Math.random() * totalPages) + 1;
          if (testedPages.has(randomPage)) continue;
          testedPages.add(randomPage);

          const sampleRes = await fetch(
            `${discoverBase}&page=${randomPage}&sort_by=popularity.desc`,
            { cache: "no-store" }
          );

          if (!sampleRes.ok) continue;
          const sampleData = (await sampleRes.json()) as TmdbDiscoverResponse;
          if (Array.isArray(sampleData.results) && sampleData.results.length > 0) {
            collected.push(...sampleData.results);
          }
        }

        const deduped = Array.from(
          new Map(collected.map((movie) => [movie.id, movie])).values()
        );

        const formattedMovies = deduped.map((movie) => ({
          id: movie.id,
          title: movie.title,
          poster_path: movie.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : null,
          overview: movie.overview,
          vote: movie.vote_average.toFixed(1),
        }));

        return NextResponse.json(
          [...formattedMovies].sort(() => 0.5 - Math.random()).slice(0, 24)
        );
      }
    }

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      return NextResponse.json(
        { error: messages.fetchTmdb },
        { status: res.status }
      );
    }

    const data = (await res.json()) as TmdbDiscoverResponse;

    const formattedMovies = (data.results || []).map((movie) => ({
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : null,
      overview: movie.overview,
      vote: movie.vote_average.toFixed(1),
    }));

    const finalResult =
      mode === "cinematch" && !query
        ? [...formattedMovies].sort(() => 0.5 - Math.random())
        : formattedMovies;

    return NextResponse.json(finalResult);
  } catch (error) {
    console.error("TMDB discover error:", error);
    return NextResponse.json(
      {
        error: messages.fetchGeneric,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
