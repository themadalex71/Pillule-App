import React from 'react';
import { Loader2, X, Heart, Eye, Star, Calendar, StarHalf, Clock, Users, Clapperboard } from 'lucide-react';
import { MovieFull } from '../types';
import { useI18n } from '@/components/I18nProvider';

interface MovieDetailsModalProps {
  movieDetails: MovieFull | null;
  loadingDetails: boolean;
  closeModale: () => void;
  isInWishlist: boolean;
  isInHistory: boolean;
  needsRatingPrompt: boolean;
  isSavingRating: boolean;
  toggleWishlist: () => void;
  rating: number;
  onRatingSelect: (rating: number) => void;
  promptWatchedRating: () => void;
}

export default function MovieDetailsModal({
  movieDetails,
  loadingDetails,
  closeModale,
  isInWishlist,
  isInHistory,
  needsRatingPrompt,
  isSavingRating,
  toggleWishlist,
  rating,
  onRatingSelect,
  promptWatchedRating
}: MovieDetailsModalProps) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-[1000] bg-[rgba(76,44,128,0.2)] backdrop-blur-md flex items-end justify-center" onClick={closeModale}>
      <div className="relative bg-[#fffdfb] w-full max-w-lg h-[92vh] rounded-t-[2rem] border-t border-x border-[#eee5dc] overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-300 text-[#4b3d6d]" onClick={e => e.stopPropagation()}>
        {loadingDetails || !movieDetails ? (
          <div className="flex-1 flex flex-col items-center justify-center"><Loader2 className="animate-spin text-[#8d82a8] mb-4"/><p className="text-[#8d82a8]">{t("cinema.details.loading")}</p></div>
        ) : (
          <>
            <div className="relative h-[38vh] shrink-0">
              {movieDetails.backdrop_path ? (
                <img src={movieDetails.backdrop_path} alt={movieDetails.title} className="w-full h-full object-cover"/>
              ) : movieDetails.poster_path ? (
                <img src={movieDetails.poster_path} alt={movieDetails.title} className="w-full h-full object-cover"/>
              ) : (
                <div className="w-full h-full bg-[#f6f0eb]"></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#fffdfb] via-[#fffdfb]/35 to-transparent"/>
              <button onClick={closeModale} className="absolute top-4 right-4 bg-white/85 backdrop-blur-md p-3 rounded-full border border-white/70"><X size={20} className="text-[#6f628f]"/></button>
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <h2 className="text-3xl font-black leading-tight mb-1 text-[#3f315f]">{movieDetails.title}</h2>
                <p className="text-[#7f68b7] italic text-sm">{movieDetails.tagline}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 pb-32">
              <div className="flex gap-3 mb-6">
                <button onClick={toggleWishlist} className={`flex-1 py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${isInWishlist ? 'bg-[#fdeef7] text-[#c0698d] border border-[#f6d4e3]' : 'bg-[#ef9a79] text-white'}`}>
                  <Heart size={18} className={isInWishlist ? 'fill-current' : ''}/>
                  {isInWishlist ? t("cinema.details.inWishlist") : t("cinema.details.addToWishlist")}
                </button>
                <button onClick={promptWatchedRating} className={`flex-1 py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${isInHistory ? 'bg-[#e9f8ef] text-[#3f8b5f] border border-[#cdecd8]' : 'bg-[#7f68b7] text-white'}`}>
                  <Eye size={18} className={isInHistory ? 'fill-current' : ''}/>
                  {isInHistory ? t("cinema.details.seen") : t("cinema.details.iHaveSeen")}
                </button>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-sm font-semibold text-[#8d82a8]">{t("cinema.details.myRating")}</p>
                  {isSavingRating && <Loader2 size={16} className="animate-spin text-[#d4a642]" />}
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} onClick={() => onRatingSelect(star)} className="active:scale-110 transition">
                      <Star size={28} className={star <= rating ? 'text-[#d4a642] fill-[#d4a642]' : 'text-[#d7ccd3]'} />
                    </button>
                  ))}
                </div>
                {needsRatingPrompt && (
                  <p className="text-xs text-[#7f68b7] mt-3">
                    {t("cinema.details.ratingPrompt")}
                  </p>
                )}
                {isInHistory && !needsRatingPrompt && (
                  <p className="text-xs text-[#4fa070] mt-3">
                    {t("cinema.details.savedInHistory")}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-6 text-xs font-semibold text-[#5e4e89]">
                <div className="bg-[#f6f0eb] px-3 py-1 rounded-full border border-[#eee5dc] flex gap-1"><Calendar size={14} className="text-[#7298de]"/> {movieDetails.release_date}</div>
                <div className="bg-[#f6f0eb] px-3 py-1 rounded-full border border-[#eee5dc] flex gap-1"><StarHalf size={14} className="text-[#d4a642]"/> {movieDetails.vote}/10</div>
                <div className="bg-[#f6f0eb] px-3 py-1 rounded-full border border-[#eee5dc] flex gap-1"><Clock size={14} className="text-[#ef9a79]"/> {movieDetails.runtime}</div>
              </div>

              <div className="mb-6">
                <p className="text-[#6f628f] leading-relaxed text-sm text-justify">{movieDetails.overview}</p>
              </div>

              <div>
                <h3 className="text-[#8d82a8] text-xs uppercase tracking-wider font-semibold mb-3 flex items-center gap-2"><Users size={16}/>{t("cinema.details.cast")}</h3>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                  <div className="flex flex-col items-center min-w-[80px]">
                    <div className="w-16 h-16 rounded-full bg-[#f6f0eb] border-2 border-[#f0ddac] flex items-center justify-center mb-2 overflow-hidden"><Clapperboard size={24} className="text-[#8d82a8]"/></div>
                    <span className="text-xs font-semibold text-center">{movieDetails.director}</span>
                  </div>
                  {movieDetails.cast.map((actor, i) => (
                    <div key={i} className="flex flex-col items-center min-w-[80px]">
                      <div className="w-16 h-16 rounded-full bg-[#f6f0eb] border border-[#eee5dc] mb-2 overflow-hidden relative">
                        {actor.profile_path ? <img src={actor.profile_path} alt={actor.name} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center bg-[#efe7de]"><Users size={24} className="text-[#b9accf]"/></div>}
                      </div>
                      <span className="text-xs font-semibold text-center line-clamp-2">{actor.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#eee5dc] bg-white shrink-0 absolute bottom-0 w-full">
              <button onClick={closeModale} className="w-full py-4 bg-[#f6f0eb] hover:bg-[#efe7de] text-[#5e4e89] rounded-xl font-semibold transition">{t("cinema.details.close")}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
