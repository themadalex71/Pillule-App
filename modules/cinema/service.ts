import { redis } from "@/lib/redis";
import { keys } from "@/lib/keys";
import type {
  CinemaListType,
  MovieListItem,
  CinemaMatch,
  TmdbMovieSearchResult,
} from "./types";

function getCinemaKey(
  householdId: string,
  memberId: string,
  listType: CinemaListType
): string {
  return listType === "wishlist"
    ? keys.cinemaWishlist(householdId, memberId)
    : keys.cinemaHistory(householdId, memberId);
}

function normalizeImportedMovie(params: {
  movie: TmdbMovieSearchResult;
  memberId: string;
  userRating?: number | null;
  watchedDate?: string | null;
}): MovieListItem {
  const { movie, memberId, userRating, watchedDate } = params;

  let formattedDate: string | null = null;

  if (watchedDate) {
    const dateObj = new Date(watchedDate);
    if (!Number.isNaN(dateObj.getTime())) {
      formattedDate = dateObj.toLocaleDateString("fr-FR");
    }
  }

  return {
    id: movie.id,
    title: movie.title,
    poster_path: movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : null,
    overview: movie.overview,
    vote: movie.vote_average.toFixed(1),
    userRating: userRating ?? null,
    ratedAt: formattedDate,
    addedByMemberId: memberId,
  };
}

export async function getCinemaList(
  householdId: string,
  memberId: string,
  listType: CinemaListType
): Promise<MovieListItem[]> {
  const key = getCinemaKey(householdId, memberId, listType);
  return (await redis.get<MovieListItem[]>(key)) ?? [];
}

export async function saveMovieToCinemaList(params: {
  householdId: string;
  memberId: string;
  listType: CinemaListType;
  movie: MovieListItem;
}): Promise<{ updatedList: MovieListItem[]; isMatch: boolean }> {
  const { householdId, memberId, listType, movie } = params;

  const key = getCinemaKey(householdId, memberId, listType);
  const currentList = (await redis.get<MovieListItem[]>(key)) ?? [];

  const movieToSave: MovieListItem = {
    ...movie,
    addedByMemberId: memberId,
    userRating: movie.userRating ?? null,
    ratedAt: movie.ratedAt ?? null,
  };

  const updatedList = [
    movieToSave,
    ...currentList.filter((m) => m.id !== movie.id),
  ];

  await redis.set(key, updatedList);

  let isMatch = false;

  if (listType === "wishlist") {
    const memberIds =
      (await redis.get<string[]>(keys.householdMembers(householdId))) ?? [];

    for (const otherMemberId of memberIds) {
      if (otherMemberId === memberId) continue;

      const otherWishlist =
        (await redis.get<MovieListItem[]>(
          keys.cinemaWishlist(householdId, otherMemberId)
        )) ?? [];

      if (otherWishlist.some((m) => m.id === movie.id)) {
        isMatch = true;
        break;
      }
    }
  }

  return { updatedList, isMatch };
}

export async function deleteMovieFromCinemaList(params: {
  householdId: string;
  memberId: string;
  listType: CinemaListType;
  movieId: number;
}): Promise<MovieListItem[]> {
  const { householdId, memberId, listType, movieId } = params;

  const key = getCinemaKey(householdId, memberId, listType);
  const currentList = (await redis.get<MovieListItem[]>(key)) ?? [];
  const updatedList = currentList.filter((m) => m.id !== movieId);

  await redis.set(key, updatedList);

  return updatedList;
}

export async function getCinemaMatches(
  householdId: string
): Promise<CinemaMatch[]> {
  const memberIds =
    (await redis.get<string[]>(keys.householdMembers(householdId))) ?? [];

  const movieMap = new Map<number, CinemaMatch>();

  for (const memberId of memberIds) {
    const wishlist =
      (await redis.get<MovieListItem[]>(
        keys.cinemaWishlist(householdId, memberId)
      )) ?? [];

    for (const movie of wishlist) {
      const existing = movieMap.get(movie.id);

      if (!existing) {
        movieMap.set(movie.id, {
          ...movie,
          matchedMemberIds: [memberId],
          matchedCount: 1,
        });
      } else if (!existing.matchedMemberIds.includes(memberId)) {
        existing.matchedMemberIds.push(memberId);
        existing.matchedCount = existing.matchedMemberIds.length;
      }
    }
  }

  return Array.from(movieMap.values())
    .filter((movie) => movie.matchedCount >= 2)
    .sort((a, b) => b.matchedCount - a.matchedCount);
}

export async function importMovieToCinemaList(params: {
  householdId: string;
  memberId: string;
  listType: CinemaListType;
  title: string;
  year?: string | number | null;
  userRating?: number | null;
  watchedDate?: string | null;
  apiKey: string;
}): Promise<{
  success: boolean;
  message: string;
  movie?: string;
  updatedList?: MovieListItem[];
  isMatch?: boolean;
}> {
  const {
    householdId,
    memberId,
    listType,
    title,
    year,
    userRating,
    watchedDate,
    apiKey,
  } = params;

  if (!title.trim()) {
    return {
      success: false,
      message: "Titre manquant",
    };
  }

  const searchUrl =
    `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}` +
    `&query=${encodeURIComponent(title)}` +
    `${year ? `&year=${encodeURIComponent(String(year))}` : ""}` +
    `&language=fr-FR`;

  const searchRes = await fetch(searchUrl, { cache: "no-store" });
  const searchData = (await searchRes.json()) as {
    results?: TmdbMovieSearchResult[];
  };

  let movie = searchData.results?.[0];

  if (!movie) {
    const retryUrl =
      `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}` +
      `&query=${encodeURIComponent(title)}` +
      `&language=fr-FR`;

    const retryRes = await fetch(retryUrl, { cache: "no-store" });
    const retryData = (await retryRes.json()) as {
      results?: TmdbMovieSearchResult[];
    };

    movie = retryData.results?.[0];
  }

  if (!movie) {
    return {
      success: false,
      message: "Film introuvable",
    };
  }

  const key = getCinemaKey(householdId, memberId, listType);
  const currentList = (await redis.get<MovieListItem[]>(key)) ?? [];

  const normalizedMovie = normalizeImportedMovie({
    movie,
    memberId,
    userRating,
    watchedDate,
  });

  const existingIndex = currentList.findIndex((m) => m.id === movie.id);

  if (existingIndex !== -1) {
    const existingMovie = currentList[existingIndex];
    let hasChanges = false;

    if (
      normalizedMovie.userRating !== undefined &&
      existingMovie.userRating !== normalizedMovie.userRating
    ) {
      existingMovie.userRating = normalizedMovie.userRating;
      hasChanges = true;
    }

    if (
      normalizedMovie.ratedAt !== undefined &&
      existingMovie.ratedAt !== normalizedMovie.ratedAt
    ) {
      existingMovie.ratedAt = normalizedMovie.ratedAt;
      hasChanges = true;
    }

    if (
      normalizedMovie.poster_path !== existingMovie.poster_path ||
      normalizedMovie.overview !== existingMovie.overview ||
      normalizedMovie.vote !== existingMovie.vote
    ) {
      existingMovie.poster_path = normalizedMovie.poster_path;
      existingMovie.overview = normalizedMovie.overview;
      existingMovie.vote = normalizedMovie.vote;
      hasChanges = true;
    }

    if (hasChanges) {
      currentList[existingIndex] = existingMovie;
      await redis.set(key, currentList);

      return {
        success: true,
        message: "Mis à jour",
        movie: movie.title,
        updatedList: currentList,
        isMatch: false,
      };
    }

    return {
      success: true,
      message: "Déjà à jour",
      movie: movie.title,
      updatedList: currentList,
      isMatch: false,
    };
  }

  const result = await saveMovieToCinemaList({
    householdId,
    memberId,
    listType,
    movie: normalizedMovie,
  });

  return {
    success: true,
    message: "Importé",
    movie: movie.title,
    updatedList: result.updatedList,
    isMatch: result.isMatch,
  };
}