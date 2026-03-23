// features/cinema/components/CineMatchCards.tsx
import React, { useRef } from 'react';
import TinderCard from 'react-tinder-card';
import { Loader2, Popcorn, Star, X, Info, Heart, EyeOff } from 'lucide-react';
import { MovieBasic } from '../types';

interface CineMatchCardsProps {
  movies: MovieBasic[];
  setMovies: React.Dispatch<React.SetStateAction<MovieBasic[]>>;
  loading: boolean;
  onSwipe: (direction: string, movie: MovieBasic) => void;
  openMovieDetails: (id: number) => void;
  fetchDiscoverMovies: () => void;
}

export default function CineMatchCards({ movies, setMovies, loading, onSwipe, openMovieDetails, fetchDiscoverMovies }: CineMatchCardsProps) {
  const cardRefs = useRef<any[]>([]);

  if (loading && movies.length === 0) {
    return (
      <div className="h-full flex flex-col justify-center items-center text-slate-500">
        <Loader2 size={40} className="animate-spin mb-4" />
        <p>Chargement des cartes...</p>
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="h-full flex flex-col justify-center items-center text-center text-slate-500 px-8">
        <EyeOff size={48} className="mb-4" />
        <h2 className="font-bold text-xl text-slate-300 mb-2">Plus de films à te proposer</h2>
        <p className="text-sm mb-6">Relance une recherche ou change les filtres.</p>
        <button onClick={fetchDiscoverMovies} className="bg-yellow-500 text-slate-900 font-black px-6 py-3 rounded-xl">Recharger</button>
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
          <div className="relative h-[68vh] w-full rounded-[2rem] overflow-hidden shadow-2xl border-2 border-slate-700 bg-slate-800">
            {movie.poster_path ? (
              <img src={movie.poster_path} alt={movie.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center"><Popcorn size={64} className="text-slate-600"/></div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent" />

            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 border border-white/10">
              <Star size={14} className="text-yellow-400 fill-yellow-400" />
              <span>{movie.vote}</span>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-5">
              <h2 className="text-3xl font-black mb-2 drop-shadow-lg line-clamp-2">{movie.title}</h2>
              <p className="text-slate-200 text-sm leading-relaxed line-clamp-3 mb-4 drop-shadow-md">{movie.overview || "Pas de résumé disponible."}</p>
              <div className="grid grid-cols-3 gap-3">
                <button onClick={(e) => { e.stopPropagation(); cardRefs.current[index]?.swipe('left'); }} className="bg-black/50 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center justify-center active:scale-95 transition">
                  <X size={28} className="text-red-500" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); openMovieDetails(movie.id); }} className="bg-black/50 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center justify-center active:scale-95 transition">
                  <Info size={24} className="text-white" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); cardRefs.current[index]?.swipe('right'); }} className="bg-black/50 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center justify-center active:scale-95 transition">
                  <Heart size={24} className="text-green-400" />
                </button>
              </div>
            </div>
          </div>
        </TinderCard>
      ))}
    </div>
  );
}