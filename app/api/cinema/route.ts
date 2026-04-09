import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
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

type HouseholdDocument = {
  ownerId: string;
  memberIds: string[];
};

type UserHouseholdRecord = {
  householdId?: string | null;
};

function normalizeCinemaListType(listType: string) {
  if (listType === "history") return "history";
  if (listType === "dismissed") return "dismissed";
  return "wishlist";
}

function getListKey(householdId: string, memberId: string, listType: string) {
  const safeType = normalizeCinemaListType(listType);
  return `household:${householdId}:cinema:${safeType}:${memberId}`;
}

function getAuthTokenFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new Error("Non autorise.");
  }

  return token;
}

async function getCinemaContext(request: Request) {
  const idToken = getAuthTokenFromRequest(request);
  const decoded = await getFirebaseAdminAuth().verifyIdToken(idToken);
  const uid = decoded.uid;

  const db = getFirebaseAdminDb();
  const userSnapshot = await db.collection("users").doc(uid).get();

  if (!userSnapshot.exists) {
    return {
      uid,
      householdId: `solo:${uid}`,
      memberIds: [uid],
      hasHousehold: false,
    };
  }

  const userRecord = userSnapshot.data() as UserHouseholdRecord;

  if (!userRecord.householdId) {
    return {
      uid,
      householdId: `solo:${uid}`,
      memberIds: [uid],
      hasHousehold: false,
    };
  }

  const householdSnapshot = await db.collection("households").doc(userRecord.householdId).get();

  if (!householdSnapshot.exists) {
    return {
      uid,
      householdId: `solo:${uid}`,
      memberIds: [uid],
      hasHousehold: false,
    };
  }

  const household = householdSnapshot.data() as HouseholdDocument;
  const memberIds = Array.isArray(household.memberIds) ? household.memberIds : [];

  if (!memberIds.includes(uid)) {
    throw new Error("Acces refuse a ce foyer.");
  }

  return {
    uid,
    householdId: householdSnapshot.id,
    memberIds,
    hasHousehold: true,
  };
}

async function getCinemaMatches(redis: Redis, householdId: string, memberIds: string[]) {
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
    const context = await getCinemaContext(request);

    if (action === "list") {
      const listType = searchParams.get("listType") || "wishlist";
      const key = getListKey(context.householdId, context.uid, listType);
      const list = (await redis.get<MovieItem[]>(key)) || [];

      return NextResponse.json({
        success: true,
        list,
      });
    }

    if (action === "matches") {
      if (!context.hasHousehold) {
        return NextResponse.json({
          success: true,
          matches: [],
          matchesDisabled: true,
        });
      }

      const matches = await getCinemaMatches(redis, context.householdId, context.memberIds);

      return NextResponse.json({
        success: true,
        matches,
      });
    }

    return NextResponse.json(
      { success: false, error: "Action inconnue." },
      { status: 400 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    const status = message === "Non autorise." ? 401 : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status },
    );
  }
}

export async function POST(request: Request) {
  const redis = Redis.fromEnv();

  try {
    const body = await request.json();
    const action = body.action;
    const context = await getCinemaContext(request);

    if (action === "save") {
      const { movie, listType } = body;

      if (!movie || !listType) {
        return NextResponse.json(
          { success: false, error: "Donnees manquantes." },
          { status: 400 },
        );
      }

      const key = getListKey(context.householdId, context.uid, listType);
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
        addedByMemberId: context.uid,
      };

      currentList.unshift(movieToSave);
      await redis.set(key, currentList);

      let isMatch = false;
      const matchedMemberIds: string[] = [];

      if (listType === "wishlist" && context.hasHousehold) {
        for (const otherMemberId of context.memberIds) {
          if (otherMemberId === context.uid) continue;

          const otherKey = getListKey(context.householdId, otherMemberId, "wishlist");
          const otherList = (await redis.get<MovieItem[]>(otherKey)) || [];

          if (otherList.some((m) => m.id === movie.id)) {
            isMatch = true;
            matchedMemberIds.push(otherMemberId);
          }
        }
      }

      return NextResponse.json({
        success: true,
        list: currentList,
        isMatch,
        matchedMemberIds,
      });
    }

    if (action === "delete") {
      const { movieId, listType } = body;

      if (!movieId || !listType) {
        return NextResponse.json(
          { success: false, error: "Donnees manquantes." },
          { status: 400 },
        );
      }

      const key = getListKey(context.householdId, context.uid, listType);
      const currentList = (await redis.get<MovieItem[]>(key)) || [];
      const updatedList = currentList.filter((movie) => String(movie.id) !== String(movieId));

      await redis.set(key, updatedList);

      return NextResponse.json({
        success: true,
        list: updatedList,
      });
    }

    if (action === "reset") {
      const wishlistKey = getListKey(context.householdId, context.uid, "wishlist");
      const historyKey = getListKey(context.householdId, context.uid, "history");
      const dismissedKey = getListKey(context.householdId, context.uid, "dismissed");

      await Promise.all([redis.del(wishlistKey), redis.del(historyKey), redis.del(dismissedKey)]);

      return NextResponse.json({
        success: true,
        wishlist: [],
        history: [],
        dismissed: [],
      });
    }

    if (action === "import") {
      const apiKey = process.env.TMDB_API_KEY;
      const { title, year, listType, userRating, watchedDate } = body;

      if (!title || !listType || !apiKey) {
        return NextResponse.json(
          { success: false, error: "Donnees manquantes." },
          { status: 400 },
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
        if (!Number.isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toLocaleDateString("fr-FR");
        }
      }

      const key = getListKey(context.householdId, context.uid, listType);
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
            message: "Mis a jour",
            movie: movie.title,
            updatedList: currentList,
            isMatch: false,
          });
        }

        return NextResponse.json({
          success: true,
          message: "Deja a jour",
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
        addedByMemberId: context.uid,
      };

      currentList.unshift(movieToSave);
      await redis.set(key, currentList);

      let isMatch = false;
      const matchedMemberIds: string[] = [];

      if (listType === "wishlist" && context.hasHousehold) {
        for (const otherMemberId of context.memberIds) {
          if (otherMemberId === context.uid) continue;

          const otherKey = getListKey(context.householdId, otherMemberId, "wishlist");
          const otherList = (await redis.get<MovieItem[]>(otherKey)) || [];

          if (otherList.some((m) => m.id === movie.id)) {
            isMatch = true;
            matchedMemberIds.push(otherMemberId);
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: "Importe",
        movie: movie.title,
        updatedList: currentList,
        isMatch,
        matchedMemberIds,
      });
    }

    return NextResponse.json(
      { success: false, error: "Action inconnue." },
      { status: 400 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur serveur.";
    const status = message === "Non autorise." ? 401 : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status },
    );
  }
}
