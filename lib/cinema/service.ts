import { redis } from "@/lib/redis";
import { keys } from "@/lib/keys";
import type { CinemaListType, MovieListItem, CinemaMatch } from "@/types/cinema";

export async function getCinemaList(
  householdId: string,
  memberId: string,
  listType: CinemaListType
): Promise<MovieListItem[]> {
  const key =
    listType === "wishlist"
      ? keys.cinemaWishlist(householdId, memberId)
      : keys.cinemaHistory(householdId, memberId);

  const list = await redis.get<MovieListItem[]>(key);
  return list ?? [];
}

export async function saveMovieToCinemaList(params: {
  householdId: string;
  memberId: string;
  listType: CinemaListType;
  movie: MovieListItem;
}): Promise<{ isMatch: boolean; savedMovie: MovieListItem }> {
  const { householdId, memberId, listType, movie } = params;

  const key =
    listType === "wishlist"
      ? keys.cinemaWishlist(householdId, memberId)
      : keys.cinemaHistory(householdId, memberId);

  let currentList = (await redis.get<MovieListItem[]>(key)) ?? [];

  currentList = currentList.filter((m) => m.id !== movie.id);

  const movieToSave: MovieListItem = {
    ...movie,
    addedByMemberId: memberId,
    userRating: movie.userRating ?? null,
    ratedAt: movie.ratedAt ?? null,
  };

  currentList.unshift(movieToSave);
  await redis.set(key, currentList);

  let isMatch = false;

  if (listType === "wishlist") {
    const membersKey = keys.householdMembers(householdId);
    const memberIds = (await redis.get<string[]>(membersKey)) ?? [];

    for (const otherMemberId of memberIds) {
      if (otherMemberId === memberId) continue;

      const otherKey = keys.cinemaWishlist(householdId, otherMemberId);
      const otherList = (await redis.get<MovieListItem[]>(otherKey)) ?? [];

      if (otherList.some((m) => m.id === movie.id)) {
        isMatch = true;
        break;
      }
    }
  }

  return { isMatch, savedMovie: movieToSave };
}

export async function deleteMovieFromCinemaList(params: {
  householdId: string;
  memberId: string;
  listType: CinemaListType;
  movieId: number;
}): Promise<void> {
  const { householdId, memberId, listType, movieId } = params;

  const key =
    listType === "wishlist"
      ? keys.cinemaWishlist(householdId, memberId)
      : keys.cinemaHistory(householdId, memberId);

  const currentList = (await redis.get<MovieListItem[]>(key)) ?? [];
  const updatedList = currentList.filter((m) => m.id !== movieId);

  await redis.set(key, updatedList);
}

export async function getCinemaMatches(
  householdId: string
): Promise<CinemaMatch[]> {
  const membersKey = keys.householdMembers(householdId);
  const memberIds = (await redis.get<string[]>(membersKey)) ?? [];

  const movieMap = new Map<number, CinemaMatch>();

  for (const memberId of memberIds) {
    const wishlistKey = keys.cinemaWishlist(householdId, memberId);
    const wishlist = (await redis.get<MovieListItem[]>(wishlistKey)) ?? [];

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