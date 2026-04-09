import React, { useRef } from 'react';
import TinderCard from 'react-tinder-card';
import { Loader2, Popcorn, Star, Info, EyeOff } from 'lucide-react';
import { MovieBasic } from '../types';

interface CineMatchCardsProps {
  movies: MovieBasic[];
  setMovies: React.Dispatch<React.SetStateAction<MovieBasic[]>>;
  loading: boolean;
  onSwipe: (direction: string, movie: MovieBasic) => void;
  openMovieDetails: (id: number) => void;
  fetchDiscoverMovies: () => void;
  emptySubtitle?: string;
}

export default function CineMatchCards({ movies, setMovies, loading, onSwipe, openMovieDetails, fetchDiscoverMovies, emptySubtitle }: CineMatchCardsProps) {
  const cardRefs = useRef<any[]>([]);

  if (loading && movies.length === 0) {
    return (
      <div className="h-full flex flex-col justify-center items-center text-[#8d82a8]">
        <Loader2 size={40} className="animate-spin mb-4" />
        <p>Chargement des cartes...</p>
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="h-full flex flex-col justify-center items-center text-center text-[#8d82a8] px-8">
        <EyeOff size={48} className="mb-4 text-[#b2a7c9]" />
        <h2 className="font-semibold text-xl text-[#4b3d6d] mb-2">Plus de films a te proposer</h2>
        <p className="text-sm mb-6">{emptySubtitle || 'Relance une recherche ou change les filtres.'}</p>
        <button onClick={fetchDiscoverMovies} className="bg-[#ef9a79] text-white font-semibold px-6 py-3 rounded-2xl">Recharger</button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full max-w-sm mx-auto">
      {movies.map((movie, index) => (
        <TinderCard
          ref={(el) => { if (el) cardRefs.current[index] = el; }}
          key={movie.id}
          onSwipe={(dir) => onSwipe(dir, movie)}
          preventSwipe={['up']}
          className="absolute w-full"
        >
          <div className="relative h-[68vh] w-full rounded-[2rem] overflow-hidden shadow-[0_18px_40px_rgba(111,98,143,0.2)] border-2 border-[#efe4d8] bg-white">
            {movie.poster_path ? (
              <img src={movie.poster_path} alt={movie.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#f6f0eb] flex items-center justify-center"><Popcorn size={64} className="text-[#b2a7c9]"/></div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

            <button
              onClick={(e) => { e.stopPropagation(); openMovieDetails(movie.id); }}
              className="absolute top-4 left-4 bg-white/85 backdrop-blur-md p-3 rounded-full border border-white/60 active:scale-95 transition"
            >
              <Info size={20} className="text-[#6f628f]" />
            </button>

            <div className="absolute top-4 right-4 bg-white/85 backdrop-blur-md px-3 py-1.5 rounded-full text-sm font-semibold text-[#4b3d6d] flex items-center gap-1.5 border border-white/60">
              <Star size={14} className="text-[#d4a642] fill-[#d4a642]" />
              <span>{movie.vote}</span>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
              <h2 className="text-3xl font-black mb-2 drop-shadow-lg line-clamp-2">{movie.title}</h2>
              <p className="text-[#f4eef8] text-sm leading-relaxed line-clamp-3 drop-shadow-md">{movie.overview || 'Pas de resume disponible.'}</p>
            </div>
          </div>
        </TinderCard>
      ))}
    </div>
  );
}
