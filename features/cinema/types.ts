// features/cinema/types.ts
export interface MovieBasic {
    id: number;
    title: string;
    poster_path: string | null;
    overview: string;
    vote: string;
    userRating?: number | null;
    ratedAt?: string | null;
    addedByMemberId?: string;
    matchedMemberIds?: string[];
    matchedCount?: number;
  }
  
  export interface Actor {
    name: string;
    profile_path: string | null;
    character: string;
  }
  
  export interface MovieFull extends MovieBasic {
    backdrop_path: string | null;
    release_date: string;
    runtime: string;
    genres: string;
    director: string;
    cast: Actor[];
    tagline: string;
  }
  
  export const GENRES = [
      { id: 28, name: "Action" },
      { id: 12, name: "Aventure" },
      { id: 16, name: "Animation" },
      { id: 35, name: "Comédie" },
      { id: 80, name: "Crime" },
      { id: 99, name: "Documentaire" },
      { id: 18, name: "Drame" },
      { id: 10751, name: "Famille" },
      { id: 14, name: "Fantastique" },
      { id: 36, name: "Histoire" },
      { id: 27, name: "Horreur" },
      { id: 10402, name: "Musique" },
      { id: 9648, name: "Mystère" },
      { id: 10749, name: "Romance" },
      { id: 878, name: "Science-Fiction" },
      { id: 53, name: "Thriller" },
      { id: 10752, name: "Guerre" },
      { id: 37, name: "Western" },
  ];
