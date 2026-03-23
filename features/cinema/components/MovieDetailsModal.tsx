// features/cinema/components/MovieDetailsModal.tsx
import React from 'react';
import { Loader2, X, Heart, Eye, Star, Calendar, StarHalf, Clock, Users, Clapperboard } from 'lucide-react';
import { MovieFull } from '../types';

interface MovieDetailsModalProps {
  movieDetails: MovieFull | null;
  loadingDetails: boolean;
  closeModale: () => void;
  isInWishlist: boolean;
  toggleWishlist: () => void;
  rating: number;
  setRating: (rating: number) => void;
  rateAndMoveToHistory: () => void;
}

export default function MovieDetailsModal({
  movieDetails, loadingDetails, closeModale, isInWishlist, toggleWishlist, rating, setRating, rateAndMoveToHistory
}: MovieDetailsModalProps) {
  return (
    <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-md flex items-end justify-center" onClick={closeModale}>
      <div className="bg-slate-950 w-full max-w-lg h-[92vh] rounded-t-[2rem] border-t border-x border-slate-800 overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-300" onClick={e => e.stopPropagation()}>
        {loadingDetails || !movieDetails ? (
          <div className="flex-1 flex flex-col items-center justify-center"><Loader2 className="animate-spin text-slate-500 mb-4"/><p className="text-slate-400">Chargement...</p></div>
        ) : (
          <>
            <div className="relative h-[38vh] shrink-0">
              {movieDetails.backdrop_path ? (
                <img src={movieDetails.backdrop_path} alt={movieDetails.title} className="w-full h-full object-cover"/>
              ) : movieDetails.poster_path ? (
                <img src={movieDetails.poster_path} alt={movieDetails.title} className="w-full h-full object-cover"/>
              ) : (
                <div className="w-full h-full bg-slate-800"></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent"/>
              <button onClick={closeModale} className="absolute top-4 right-4 bg-black/50 backdrop-blur-md p-3 rounded-full border border-white/10"><X size={20}/></button>
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h2 className="text-3xl font-black leading-tight mb-1">{movieDetails.title}</h2>
                <p className="text-slate-300 italic text-sm">{movieDetails.tagline}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 pb-32">
              <div className="flex gap-3 mb-6">
                <button onClick={toggleWishlist} className={`flex-1 py-3 rounded-xl font-black transition flex items-center justify-center gap-2 ${isInWishlist ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40' : 'bg-green-500 text-slate-950'}`}>
                  <Heart size={18} className={isInWishlist ? 'fill-current' : ''}/>
                  {isInWishlist ? 'Dans À voir' : 'Ajouter'}
                </button>
                <button onClick={rateAndMoveToHistory} className="flex-1 py-3 rounded-xl font-black bg-blue-500 text-white transition flex items-center justify-center gap-2">
                  <Eye size={18}/>
                  J’ai vu
                </button>
              </div>

              <div className="mb-6">
                <p className="text-sm font-bold text-slate-400 mb-3">Ma note</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} onClick={() => setRating(star)} className="active:scale-110 transition">
                      <Star size={28} className={star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-slate-600'} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6 text-xs font-bold">
                <div className="bg-slate-800 px-3 py-1 rounded-full border border-slate-700 flex gap-1"><Calendar size={14} className="text-blue-500"/> {movieDetails.release_date}</div>
                <div className="bg-slate-800 px-3 py-1 rounded-full border border-slate-700 flex gap-1"><StarHalf size={14} className="text-yellow-500"/> {movieDetails.vote}/10</div>
                <div className="bg-slate-800 px-3 py-1 rounded-full border border-slate-700 flex gap-1"><Clock size={14} className="text-yellow-500"/> {movieDetails.runtime}</div>
              </div>

              <div className="mb-6">
                <p className="text-slate-300 leading-relaxed text-sm text-justify">{movieDetails.overview}</p>
              </div>

              <div>
                <h3 className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-3 flex items-center gap-2"><Users size={16}/> Distribution</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                  <div className="flex flex-col items-center min-w-[80px]">
                    <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-yellow-500/50 flex items-center justify-center mb-2 overflow-hidden"><Clapperboard size={24} className="text-slate-500"/></div>
                    <span className="text-xs font-bold text-center">{movieDetails.director}</span>
                  </div>
                  {movieDetails.cast.map((actor, i) => (
                    <div key={i} className="flex flex-col items-center min-w-[80px]">
                      <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 mb-2 overflow-hidden relative">
                        {actor.profile_path ? <img src={actor.profile_path} alt={actor.name} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center bg-slate-700"><Users size={24} className="text-slate-500"/></div>}
                      </div>
                      <span className="text-xs font-bold text-center line-clamp-2">{actor.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900 shrink-0 absolute bottom-0 w-full">
              <button onClick={closeModale} className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition">Fermer</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}