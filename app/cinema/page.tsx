"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, List, CheckCircle, Popcorn, Flame, X, Heart, Loader2, Info, Calendar, Clock, Clapperboard, Users } from 'lucide-react';
import TinderCard from 'react-tinder-card';

// --- TYPES ---
interface MovieBasic {
  id: number;
  title: string;
  poster_path: string | null;
  overview: string;
  vote: string;
}

interface Actor {
  name: string;
  profile_path: string | null;
  character: string;
}

interface MovieFull extends MovieBasic {
  backdrop_path: string | null;
  release_date: string;
  runtime: string;
  genres: string;
  director: string;
  cast: Actor[];
  tagline: string;
}

export default function CinemaPage() {
  // --- ETATS ---
  const [activeTab, setActiveTab] = useState('cinematch');
  
  // MODIFICATION 1 : Alex par défaut
  const [currentUser, setCurrentUser] = useState('Alex'); 

  const [movies, setMovies] = useState<MovieBasic[]>([]);
  const [savedMovies, setSavedMovies] = useState<MovieBasic[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [movieDetails, setMovieDetails] = useState<MovieFull | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  const cardRefs = useRef<any[]>([]);

  // --- EFFETS ---

  useEffect(() => {
    if (activeTab === 'cinematch' && movies.length === 0) {
      fetchDiscoverMovies();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'a-voir') {
      fetchSavedList('wishlist');
    } else if (activeTab === 'vus') {
      fetchSavedList('history');
    }
  }, [activeTab, currentUser]); 

  // --- FONCTIONS API ---

  const fetchDiscoverMovies = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cinema/discover');
      const data = await res.json();
      if (Array.isArray(data)) setMovies(data);
    } catch (error) {
      console.error("Erreur fetch:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedList = async (type: string) => {
    setLoading(true);
    setSavedMovies([]); 
    try {
      const res = await fetch(`/api/cinema/get-lists?type=${type}&userId=${currentUser}`);
      const data = await res.json();
      setSavedMovies(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveMovie = async (movie: MovieBasic, listType: string) => {
      try {
        await fetch('/api/cinema/save', {
          method: 'POST',
          body: JSON.stringify({
            movie: movie,
            listType: listType,
            userId: currentUser 
          })
        });
      } catch (error) {
        console.error("Erreur sauvegarde", error);
      }
  };

  // --- GESTION SWIPE ---
  const onSwipe = (direction: string, movie: MovieBasic) => {
    if (direction === 'right') {
      saveMovie(movie, 'wishlist');
    } 

    setTimeout(() => {
        setMovies((prev) => prev.filter(m => m.id !== movie.id));
    }, 200);
  };

  // --- MODALE DETAILS ---
  const openMovieDetails = async (id: number) => {
    setSelectedMovieId(id);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/cinema/details?id=${id}`);
      const data = await res.json();
      setMovieDetails(data);
    } catch (error) {
      console.error("Erreur détails:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeModale = () => {
    setSelectedMovieId(null);
    setMovieDetails(null);
  }

  // --- RENDU ---
  return (
    <main className="min-h-screen bg-slate-900 text-white pb-24 relative overflow-hidden">
      
      {/* --- EN-TÊTE --- */}
      <div className="p-6 pb-2 z-10 relative flex justify-between items-start">
        <div>
            <Link href="/" className="inline-flex items-center text-slate-400 mb-4 hover:text-white transition text-sm">
            <ArrowLeft className="mr-1" size={16} />
            Menu
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
            {activeTab === 'a-voir' && <><List className="text-blue-500"/> Ma Liste</>}
            {activeTab === 'cinematch' && <><Flame className="text-red-500"/> CineMatch</>}
            {activeTab === 'vus' && <><CheckCircle className="text-green-500"/> Historique</>}
            </h1>
        </div>

        {/* --- MODIFICATION 2 : SELECTEUR ALEX / JUJU --- */}
        <button 
            onClick={() => setCurrentUser(currentUser === 'Alex' ? 'Juju' : 'Alex')}
            className="flex flex-col items-center gap-1 bg-slate-800 p-2 rounded-xl border border-slate-700 active:scale-95 transition"
        >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-md transition-colors ${currentUser === 'Alex' ? 'bg-blue-500' : 'bg-orange-500'}`}>
                {currentUser === 'Alex' ? 'A' : 'J'}
            </div>
            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                {currentUser}
            </span>
        </button>
      </div>

      {/* --- ZONE DE CONTENU PRINCIPALE --- */}
      <div className="px-4 h-[70vh] relative flex flex-col justify-center">
        
        {/* ONGLET 1 : SWIPE (CINEMATCH) */}
        {activeTab === 'cinematch' && (
          <div className="relative w-full h-full max-w-sm mx-auto mt-4">
            
            {loading && (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Loader2 size={40} className="animate-spin mb-4 text-yellow-500"/>
                Chargement...
              </div>
            )}

            {!loading && movies.length === 0 && (
               <div className="text-center mt-20 flex flex-col items-center">
                  <Popcorn size={48} className="text-slate-600 mb-4"/>
                  <p className="text-slate-400 mb-4">Plus de films à proposer !</p>
                  <button onClick={fetchDiscoverMovies} className="bg-yellow-500 text-slate-900 px-4 py-2 rounded-full font-bold">Recharger</button>
               </div>
            )}

            {movies.map((movie, index) => (
              <TinderCard
                ref={(el) => cardRefs.current[index] = el}
                key={movie.id}
                onSwipe={(dir) => onSwipe(dir, movie)}
                preventSwipe={['up', 'down']}
                className="absolute top-0 left-0 w-full h-full"
              >
                <div className="relative w-full h-full bg-slate-800 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 select-none">
                  {movie.poster_path && (
                    <img src={movie.poster_path} alt={movie.title} className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                  
                  <div className="absolute bottom-0 left-0 p-6 w-full z-10 pb-20">
                     <div className="flex items-center justify-between mb-2">
                        <span className="bg-yellow-500 text-slate-900 text-xs font-bold px-2 py-1 rounded-full">★ {movie.vote}</span>
                        <button 
                            onTouchStart={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={() => openMovieDetails(movie.id)}
                            className="bg-slate-700/80 hover:bg-slate-600 text-white p-2 rounded-full backdrop-blur-sm transition animate-pulse"
                        >
                            <Info size={20} />
                        </button>
                     </div>
                    <h2 className="text-3xl font-black leading-tight mb-2 drop-shadow-lg">{movie.title}</h2>
                    <p onClick={() => openMovieDetails(movie.id)} className="text-sm text-slate-300 line-clamp-2 drop-shadow cursor-pointer active:opacity-70">
                        {movie.overview || "Pas de synopsis disponible."}
                        <span className="text-yellow-500 text-xs ml-1 font-bold">(détails)</span>
                    </p>
                  </div>
                </div>
              </TinderCard>
            ))}
          </div>
        )}

         {/* ONGLET 2 & 3 : LISTES (A VOIR / VUS) */}
         {activeTab !== 'cinematch' && (
          <div className="h-full overflow-y-auto pb-20">
            {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-500"/></div>
            ) : savedMovies.length === 0 ? (
                <div className="text-center py-10 text-slate-500 opacity-50">
                    <Popcorn size={48} className="mx-auto mb-4" />
                    <p>Aucun film ici pour {currentUser}.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4 pb-4">
                    {savedMovies.map(movie => (
                        <div key={movie.id} onClick={() => openMovieDetails(movie.id)} className="bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700 cursor-pointer active:scale-95 transition">
                             <div className="h-40 bg-slate-700 relative">
                                {movie.poster_path ? (
                                    <img src={movie.poster_path} alt="" className="w-full h-full object-cover"/>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">No Image</div>
                                )}
                             </div>
                             <div className="p-3">
                                <h3 className="font-bold text-sm leading-tight line-clamp-1">{movie.title}</h3>
                                <span className="text-xs text-yellow-500">★ {movie.vote}</span>
                             </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        )}
      </div>

      {/* --- MODALE DÉTAILS --- */}
      {selectedMovieId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 w-full h-[95vh] sm:h-[90vh] sm:w-[600px] sm:rounded-2xl rounded-t-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col relative animate-in slide-in-from-bottom-10 duration-300">
                {loadingDetails || !movieDetails ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <Loader2 size={40} className="animate-spin mb-4 text-yellow-500"/> Chargement...
                    </div>
                ) : (
                    <>
                        <div className="h-64 w-full relative shrink-0">
                            {movieDetails.backdrop_path ? (
                                <img src={movieDetails.backdrop_path} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-600">Pas d&apos;image</div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                            <button onClick={closeModale} className="absolute top-4 right-4 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition backdrop-blur-sm border border-white/10"><X size={24} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <h2 className="text-3xl font-black text-white mb-1 leading-tight">{movieDetails.title}</h2>
                            <p className="text-yellow-500 font-medium text-sm mb-2">{movieDetails.genres}</p>
                            {movieDetails.tagline && <p className="text-slate-400 italic text-sm mb-4">&quot;{movieDetails.tagline}&quot;</p>}
                            <div className="flex flex-wrap gap-3 mb-6 text-xs font-medium text-slate-300">
                                <div className="bg-slate-800 px-3 py-1 rounded-full border border-slate-700 flex gap-1"><Calendar size={14} className="text-yellow-500"/> {movieDetails.release_date}</div>
                                <div className="bg-slate-800 px-3 py-1 rounded-full border border-slate-700 flex gap-1"><Clock size={14} className="text-yellow-500"/> {movieDetails.runtime}</div>
                            </div>
                            <div className="mb-6"><p className="text-slate-300 leading-relaxed text-sm text-justify">{movieDetails.overview}</p></div>
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
                                                {actor.profile_path ? (
                                                    <img src={actor.profile_path} alt={actor.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-slate-700"><Users size={24} className="text-slate-500"/></div>
                                                )}
                                            </div>
                                            <span className="text-xs font-bold text-center line-clamp-2">{actor.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-800 bg-slate-900 shrink-0"><button onClick={closeModale} className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-slate-900 rounded-xl font-bold transition">Retour</button></div>
                    </>
                )}
            </div>
        </div>
      )}

      {/* --- MENU DU BAS --- */}
      <nav className="fixed bottom-0 left-0 w-full bg-slate-800 border-t border-slate-700 pb-safe z-40">
        <div className="flex justify-around items-center p-2">
          <button onClick={() => setActiveTab('a-voir')} className={`nav-btn ${activeTab === 'a-voir' ? 'text-blue-500' : 'text-slate-400'}`}>
            <List size={24} /><span className="text-[10px] mt-1">Ma Liste</span>
          </button>
          <button onClick={() => setActiveTab('cinematch')} className="relative -top-4">
             <div className={`p-4 rounded-full border-4 border-slate-900 transition ${activeTab === 'cinematch' ? 'bg-gradient-to-tr from-red-500 to-yellow-500 text-white shadow-lg shadow-red-500/20' : 'bg-slate-700 text-slate-400'}`}>
                 <Flame size={28} fill={activeTab === 'cinematch' ? "currentColor" : "none"} />
             </div>
          </button>
          <button onClick={() => setActiveTab('vus')} className={`nav-btn ${activeTab === 'vus' ? 'text-green-500' : 'text-slate-400'}`}>
            <CheckCircle size={24} /><span className="text-[10px] mt-1">Vus</span>
          </button>
        </div>
      </nav>
    </main>
  );
}