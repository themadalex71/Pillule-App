export type CinemaListType = "wishlist" | "history";

export type MovieListItem = {
  id: number;
  title: string;
  poster_path: string | null;
  overview: string;
  vote: string;
  userRating?: number | null;
  ratedAt?: string | null;
  addedByMemberId?: string;
};

export type CinemaMatch = MovieListItem & {
  matchedMemberIds: string[];
  matchedCount: number;
};