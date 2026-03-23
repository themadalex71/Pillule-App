import type { CinemaListType, MovieListItem, CinemaMatch } from "./types";

type CinemaListResponse = {
  success: boolean;
  list: MovieListItem[];
  isMatch?: boolean;
  error?: string;
};

type CinemaMatchesResponse = {
  success: boolean;
  matches: CinemaMatch[];
  error?: string;
};

type CinemaImportResponse = {
  success: boolean;
  message: string;
  movie?: string;
  updatedList?: MovieListItem[];
  isMatch?: boolean;
  error?: string;
};

function buildCinemaQuery(
  params: Record<string, string | number | undefined | null>
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  return searchParams.toString();
}

export async function fetchCinemaList(params: {
  householdId: string;
  memberId: string;
  listType: CinemaListType;
}): Promise<MovieListItem[]> {
  const query = buildCinemaQuery({
    action: "list",
    householdId: params.householdId,
    memberId: params.memberId,
    listType: params.listType,
  });

  const res = await fetch(`/api/cinema?${query}`, {
    cache: "no-store",
  });

  const data = (await res.json()) as CinemaListResponse;

  if (!res.ok || !data.success) {
    throw new Error(data.error || "Impossible de récupérer la liste.");
  }

  return data.list;
}

export async function fetchCinemaMatches(params: {
  householdId: string;
  memberId: string;
}): Promise<CinemaMatch[]> {
  const query = buildCinemaQuery({
    action: "matches",
    householdId: params.householdId,
    memberId: params.memberId,
  });

  const res = await fetch(`/api/cinema?${query}`, {
    cache: "no-store",
  });

  const data = (await res.json()) as CinemaMatchesResponse;

  if (!res.ok || !data.success) {
    throw new Error(data.error || "Impossible de récupérer les matchs.");
  }

  return data.matches;
}

export async function saveCinemaMovie(params: {
  householdId: string;
  memberId: string;
  listType: CinemaListType;
  movie: MovieListItem;
}): Promise<{ list: MovieListItem[]; isMatch: boolean }> {
  const res = await fetch("/api/cinema", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "save",
      householdId: params.householdId,
      memberId: params.memberId,
      listType: params.listType,
      movie: params.movie,
    }),
  });

  const data = (await res.json()) as CinemaListResponse;

  if (!res.ok || !data.success) {
    throw new Error(data.error || "Impossible de sauvegarder le film.");
  }

  return {
    list: data.list,
    isMatch: Boolean(data.isMatch),
  };
}

export async function deleteCinemaMovie(params: {
  householdId: string;
  memberId: string;
  listType: CinemaListType;
  movieId: number;
}): Promise<MovieListItem[]> {
  const res = await fetch("/api/cinema", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "delete",
      householdId: params.householdId,
      memberId: params.memberId,
      listType: params.listType,
      movieId: params.movieId,
    }),
  });

  const data = (await res.json()) as CinemaListResponse;

  if (!res.ok || !data.success) {
    throw new Error(data.error || "Impossible de supprimer le film.");
  }

  return data.list;
}

export async function importCinemaMovie(params: {
  householdId: string;
  memberId: string;
  listType: CinemaListType;
  title: string;
  year?: string | number | null;
  userRating?: number | null;
  watchedDate?: string | null;
}): Promise<CinemaImportResponse> {
  const res = await fetch("/api/cinema", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "import",
      householdId: params.householdId,
      memberId: params.memberId,
      listType: params.listType,
      title: params.title,
      year: params.year,
      userRating: params.userRating,
      watchedDate: params.watchedDate,
    }),
  });

  const data = (await res.json()) as CinemaImportResponse;

  if (!res.ok || !data.success) {
    throw new Error(data.error || data.message || "Impossible d’importer.");
  }

  return data;
}