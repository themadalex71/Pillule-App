import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

type MovieItem = {
  id: number;
  title: string;
  poster_path: string | null;
  overview: string;
  vote: string;
  userRating?: number | null;
  ratedAt?: string | null;
  addedByMemberId?: string;
};

function getMemberIdFromBodyOrQuery(input: {
  body?: any;
  searchParams?: URLSearchParams;
}) {
  const bodyMemberId = input.body?.memberId;
  const queryMemberId = input.searchParams?.get("memberId");

  if (bodyMemberId) return String(bodyMemberId);
  if (queryMemberId) return String(queryMemberId);

  return "member_alex";
}

function getHouseholdIdFromBodyOrQuery(input: {
  body?: any;
  searchParams?: URLSearchParams;
}) {
  const bodyHouseholdId = input.body?.householdId;
  const queryHouseholdId = input.searchParams?.get("householdId");

  if (bodyHouseholdId) return String(bodyHouseholdId);
  if (queryHouseholdId) return String(queryHouseholdId);

  return "household_demo";
}

function getListKey(
  householdId: string,
  memberId: string,
  listType: string
) {
  const safeType = listType === "history" ? "history" : "wishlist";
  return `household:${householdId}:cinema:${safeType}:${memberId}`;
}

function getMembersKey(householdId: string) {
  return `household:${householdId}:members`;
}

function getMemberProfileKey(householdId: string, memberId: string) {
  return `household:${householdId}:member:${memberId}`;
}

async function ensureDefaultMembers(redis: Redis, householdId: string) {
  const membersKey = getMembersKey(householdId);
  let memberIds = (await redis.get<string[]>(membersKey)) || [];

  if (!memberIds || memberIds.length === 0) {
    memberIds = ["member_alex", "member_juju"];
    await redis.set(membersKey, memberIds);

    await redis.set(getMemberProfileKey(householdId, "member_alex"), {
      id: "member_alex",
      displayName: "Alex",
      householdId,
      role: "admin",
    });

    await redis.set(getMemberProfileKey(householdId, "member_juju"), {
      id: "member_juju",
      displayName: "Juju",
      householdId,
      role: "member",
    });
  }

  return memberIds;
}

async function getCinemaMatches(redis: Redis, householdId: string) {
  const memberIds = await ensureDefaultMembers(redis, householdId);

  const movieMap = new Map<number, any>();

  for (const memberId of memberIds) {
    const wishlistKey = getListKey(householdId, memberId, "wishlist");
    const wishlist = (await redis.get<MovieItem[]>(wishlistKey)) || [];

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

export async function GET(request: Request) {
  const redis = Redis.fromEnv();

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    const householdId = getHouseholdIdFromBodyOrQuery({ searchParams });
    const memberId = getMemberIdFromBodyOrQuery({ searchParams });

    await ensureDefaultMembers(redis, householdId);

    if (action === "list") {
      const listType = searchParams.get("listType") || "wishlist";
      const key = getListKey(householdId, memberId, listType);
      const list = (await redis.get<MovieItem[]>(key)) || [];

      return NextResponse.json({
        success: true,
        list,
      });
    }

    if (action === "matches") {
      const matches = await getCinemaMatches(redis, householdId);

      return NextResponse.json({
        success: true,
        matches,
      });
    }

    return NextResponse.json(
      { success: false, error: "Action inconnue." },
      { status: 400 }
    );
  } catch (error) {
    console.error("GET /api/cinema error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const redis = Redis.fromEnv();

  try {
    const body = await request.json();
    const action = body.action;

    const householdId = getHouseholdIdFromBodyOrQuery({ body });
    const memberId = getMemberIdFromBodyOrQuery({ body });

    const memberIds = await ensureDefaultMembers(redis, householdId);

    if (action === "save") {
      const { movie, listType } = body;

      if (!movie || !listType) {
        return NextResponse.json(
          { success: false, error: "Données manquantes." },
          { status: 400 }
        );
      }

      const key = getListKey(householdId, memberId, listType);
      let currentList = (await redis.get<MovieItem[]>(key)) || [];

      currentList = currentList.filter((m) => m.id !== movie.id);

      const movieToSave: MovieItem = {
        id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path,
        vote: movie.vote,
        overview: movie.overview,
        userRating: movie.userRating ?? null,
        ratedAt: movie.ratedAt ?? null,
        addedByMemberId: memberId,
      };

      currentList.unshift(movieToSave);
      await redis.set(key, currentList);

      let isMatch = false;

      if (listType === "wishlist") {
        for (const otherMemberId of memberIds) {
          if (otherMemberId === memberId) continue;

          const otherKey = getListKey(householdId, otherMemberId, "wishlist");
          const otherList = (await redis.get<MovieItem[]>(otherKey)) || [];

          if (otherList.some((m) => m.id === movie.id)) {
            isMatch = true;
            break;
          }
        }
      }

      return NextResponse.json({
        success: true,
        list: currentList,
        isMatch,
      });
    }

    if (action === "delete") {
      const { movieId, listType } = body;

      if (!movieId || !listType) {
        return NextResponse.json(
          { success: false, error: "Données manquantes." },
          { status: 400 }
        );
      }

      const key = getListKey(householdId, memberId, listType);
      const currentList = (await redis.get<MovieItem[]>(key)) || [];
      const updatedList = currentList.filter(
        (movie) => String(movie.id) !== String(movieId)
      );

      await redis.set(key, updatedList);

      return NextResponse.json({
        success: true,
        list: updatedList,
      });
    }

    if (action === "import") {
      const apiKey = process.env.TMDB_API_KEY;
      const { title, year, listType, userRating, watchedDate } = body;

      if (!title || !listType || !apiKey) {
        return NextResponse.json(
          { success: false, error: "Données manquantes." },
          { status: 400 }
        );
      }

      const searchUrl =
        `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}` +
        `&query=${encodeURIComponent(title)}` +
        `${year ? `&year=${year}` : ""}` +
        `&language=fr-FR`;

      const searchRes = await fetch(searchUrl, { cache: "no-store" });
      const searchData = await searchRes.json();

      let movie = searchData.results?.[0];

      if (!movie) {
        const retryUrl =
          `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}` +
          `&query=${encodeURIComponent(title)}` +
          `&language=fr-FR`;

        const retryRes = await fetch(retryUrl, { cache: "no-store" });
        const retryData = await retryRes.json();
        movie = retryData.results?.[0];
      }

      if (!movie) {
        return NextResponse.json({
          success: false,
          message: "Film introuvable",
        });
      }

      let formattedDate: string | null = null;
      if (watchedDate) {
        const dateObj = new Date(watchedDate);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toLocaleDateString("fr-FR");
        }
      }

      const key = getListKey(householdId, memberId, listType);
      let currentList = (await redis.get<MovieItem[]>(key)) || [];

      const existingIndex = currentList.findIndex((m) => m.id === movie.id);

      if (existingIndex !== -1) {
        const existingMovie = currentList[existingIndex];
        let hasChanges = false;

        if (
          userRating !== undefined &&
          userRating !== null &&
          existingMovie.userRating !== userRating
        ) {
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

          return NextResponse.json({
            success: true,
            message: "Mis à jour",
            movie: movie.title,
            updatedList: currentList,
            isMatch: false,
          });
        }

        return NextResponse.json({
          success: true,
          message: "Déjà à jour",
          movie: movie.title,
          updatedList: currentList,
          isMatch: false,
        });
      }

      const movieToSave: MovieItem = {
        id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path
          ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
          : null,
        vote: movie.vote_average.toFixed(1),
        overview: movie.overview,
        userRating: userRating ?? null,
        ratedAt: formattedDate,
        addedByMemberId: memberId,
      };

      currentList.unshift(movieToSave);
      await redis.set(key, currentList);

      let isMatch = false;

      if (listType === "wishlist") {
        for (const otherMemberId of memberIds) {
          if (otherMemberId === memberId) continue;

          const otherKey = getListKey(householdId, otherMemberId, "wishlist");
          const otherList = (await redis.get<MovieItem[]>(otherKey)) || [];

          if (otherList.some((m) => m.id === movie.id)) {
            isMatch = true;
            break;
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: "Importé",
        movie: movie.title,
        updatedList: currentList,
        isMatch,
      });
    }

    return NextResponse.json(
      { success: false, error: "Action inconnue." },
      { status: 400 }
    );
  } catch (error) {
    console.error("POST /api/cinema error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur." },
      { status: 500 }
    );
  }
}