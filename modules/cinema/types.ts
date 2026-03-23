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

export type TmdbMovieSearchResult = {
  id: number;
  title: string;
  poster_path: string | null;
  overview: string;
  vote_average: number;
};

export type TmdbMovieCreditsCrewPerson = {
  job: string;
  name: string;
};

export type TmdbMovieCreditsCastPerson = {
  name: string;
  profile_path: string | null;
  character: string;
};

export type TmdbMovieDetailsResponse = {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number;
  genres: Array<{ id: number; name: string }>;
  vote_average: number;
  tagline: string;
  credits: {
    crew: TmdbMovieCreditsCrewPerson[];
    cast: TmdbMovieCreditsCastPerson[];
  };
};