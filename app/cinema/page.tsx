"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Library, Popcorn, Flame, X, Loader2, Info, Calendar, Clock, Clapperboard, Users, Trash2, CheckSquare, Eye, ChevronRight, LayoutGrid, Film, Star, StarHalf } from 'lucide-react';
import TinderCard from 'react-tinder-card';

// --- TYPES ---
interface MovieBasic {
  id: number;
  title: string;
  poster_path: string | null;
  overview: string;
  vote: string;
  // NOUVEAU : Champs pour la note perso
  userRating?: number;
  ratedAt?: string;
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
  const [currentUser, setCurrentUser] = useState('Alex'); 

  const [movies, setMovies] = useState<MovieBasic[]>([]);
  const [savedMovies, setSavedMovies] = useState<MovieBasic[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [movieDetails, setMovieDetails] = useState<MovieFull | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Etat pour la note en cours dans la modale
  const [rating, setRating] = useState<number>(0);

  const cardRefs = useRef<any[]>([]);

  // --- EFFETS ---
  useEffect(() => {
    if (activeTab === 'cinematch' && movies.length === 0) {
      fetchDiscoverMovies();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'list-wishlist') {
      fetchSavedList('wishlist');
    } else if (activeTab === 'list-history') {
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

  // Sauvegarde avec la note (optionnelle)
  const saveMovie = async (movie: MovieBasic, listType: string, userRating?: number) => {
      try {
        await fetch('/api/cinema/save', {
          method: 'POST',
          body: JSON.stringify({
            movie: movie,
            listType: listType,
            userId: currentUser,
            userRating: userRating // On envoie la note si elle existe
          })
        });
      } catch (error) {
        console.error("Erreur sauvegarde", error);
      }
  };

  const deleteMovie = async (movieId: number) => {
    const listType = activeTab === 'list-wishlist' ? 'wishlist' : 'history';
    try {
        await fetch('/api/cinema/delete', {
            method: 'POST',
            body: JSON.stringify({ movieId, listType, userId: currentUser })
        });
        setSavedMovies(prev => prev.filter(m => m.id !== movieId));
        closeModale();
    } catch (error) {
        console.error("Erreur suppression", error);
    }
  };

  // Fonction pour valider la note et déplacer dans l'historique
  const rateAndMoveToHistory = async () => {
      if (!movieDetails) return;
      
      // 1. On sauvegarde dans "history" AVEC LA NOTE
      await saveMovie(movieDetails, 'history', rating);
      
      // 2. On supprime de "wishlist" (si le film y était)
      await fetch('/api/cinema/delete', {
          method: 'POST',
          body: JSON.stringify({ movieId: movieDetails.id, listType: 'wishlist', userId: currentUser })
      });

      // 3. Mise à jour visuelle si on est dans l'historique
      if (activeTab === 'list-history') {
          fetchSavedList('history'); // On recharge pour voir la note affichée
      } else {
         // Sinon on retire juste de la liste actuelle
         setSavedMovies(prev => prev.filter(m => m.id !== movieDetails.id));
      }
      
      closeModale();
  };

  const onSwipe = (direction: string, movie: MovieBasic) => {
    if (direction === 'right') {
      saveMovie(movie, 'wishlist');
    } 
    setTimeout(() => {
        setMovies((prev) => prev.filter(m => m.id !== movie.id));
    }, 200);
  };

  const openMovieDetails = async (id: number) => {
    setSelectedMovieId(id);
    setLoadingDetails(true);
    // On cherche si le film a déjà une note dans la liste actuelle pour l'afficher
    const existingMovie = savedMovies.find(m => m.id === id);
    setRating(existingMovie?.userRating || 0); // On met la note existante ou 0

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
    setRating(0);
  }

  // --- RENDU ---
  return (
    <main className="min-h-screen bg-slate-900 text-white pb-24 relative overflow-hidden">
      
      {/* --- EN-TÊTE --- */}
      <div className="p-6 pb-2 z-10 relative flex justify-between items-start">
        <div>
            {activeTab.startsWith('list-') ? (
                 <button onClick={() => setActiveTab('hub')} className="inline-flex items-center text-slate-400 mb-4 hover:text-white transition text-sm">
                    <ArrowLeft className="mr-1" size={16} /> Retour aux listes
                 </button>
            ) : (
                <Link href="/" className="inline-flex items-center text-slate-400 mb-4 hover:text-white transition text-sm">
                    <ArrowLeft className="mr-1" size={16} /> Menu
                </Link>
            )}

            <h1 className="text-2xl font-bold flex items-center gap-2">
            {activeTab === 'cinematch' && <><Flame className="text-red-500"/> CineMatch</>}
            {activeTab === 'hub' && <><Library className="text-blue-500"/> Mes Listes</>}
            {activeTab === 'catalogue' && <><LayoutGrid className="text-purple-500"/> Catalogue</>}
            {activeTab === 'list-wishlist' && <><Popcorn className="text-yellow-500"/> À voir</>}
            {activeTab === 'list-history' && <><Eye className="text-green-500"/> Déjà vus</>}
            </h1>
        </div>

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
        
        {/* 1. CINEMATCH */}
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
                  </div>
                </div>
              </TinderCard>
            ))}
          </div>
        )}

        {/* 2. HUB */}
        {activeTab === 'hub' && (
            <div className="flex flex-col gap-4 max-w-sm mx-auto w-full">
                <button onClick={() => setActiveTab('list-wishlist')} className="flex items-center justify-between bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:bg-slate-700 transition group">
                    <div className="flex items-center gap-4">
                        <div className="bg-yellow-500/10 p-4 rounded-full text-yellow-500 group-hover:bg-yellow-500 group-hover:text-slate-900 transition"><Popcorn size={32} /></div>
                        <div className="text-left"><h3 className="text-xl font-bold">Films à voir</h3><p className="text-sm text-slate-400">Ta sélection</p></div>
                    </div>
                    <ChevronRight className="text-slate-500 group-hover:text-white transition"/>
                </button>
                <button onClick={() => setActiveTab('list-history')} className="flex items-center justify-between bg-slate-800 p-6 rounded-2xl border border-slate-700 hover:bg-slate-700 transition group">
                    <div className="flex items-center gap-4">
                        <div className="bg-green-500/10 p-4 rounded-full text-green-500 group-hover:bg-green-500 group-hover:text-slate-900 transition"><Eye size={32} /></div>
                        <div className="text-left"><h3 className="text-xl font-bold">Déjà vus</h3><p className="text-sm text-slate-400">Ton historique noté</p></div>
                    </div>
                    <ChevronRight className="text-slate-500 group-hover:text-white transition"/>
                </button>
            </div>
        )}

         {/* 3. LISTES */}
         {(activeTab === 'list-wishlist' || activeTab === 'list-history') && (
          <div className="h-full overflow-y-auto pb-20 scrollbar-hide">
            {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-500"/></div>
            ) : savedMovies.length === 0 ? (
                <div className="text-center py-10 text-slate-500 opacity-50">
                    <Popcorn size={48} className="mx-auto mb-4" />
                    <p>Cette liste est vide pour {currentUser}.</p>
                </div>
            ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 pb-4">
                    {savedMovies.map(movie => (
                        <div key={movie.id} onClick={() => openMovieDetails(movie.id)} className="bg-slate-800 rounded-lg overflow-hidden shadow border border-slate-700 cursor-pointer active:scale-95 transition hover:scale-105">
                             <div className="aspect-[2/3] w-full bg-slate-700 relative">
                                {movie.poster_path ? <img src={movie.poster_path} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500">Pas d&apos;image</div>}
                                
                                {/* Si le film a une note utilisateur, on l'affiche en priorité */}
                                {movie.userRating ? (
                                    <div className="absolute top-1 right-1 bg-green-500 text-slate-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
                                        <Star size={8} fill="currentColor"/> {movie.userRating}
                                    </div>
                                ) : (
                                    <div className="absolute top-1 right-1 bg-black/60 text-yellow-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                                        ★ {movie.vote}
                                    </div>
                                )}
                             </div>
                             <div className="p-2 text-center">
                                <h3 className="font-bold text-[10px] sm:text-xs leading-tight line-clamp-1 truncate text-slate-300">{movie.title}</h3>
                             </div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        )}

        {/* 4. CATALOGUE */}
        {activeTab === 'catalogue' && (
             <div className="flex flex-col items-center justify-center text-center py-20 text-slate-500 opacity-50">
                <Film size={64} className="mb-4" />
                <h3 className="text-xl font-bold mb-2">Catalogue Complet</h3>
                <p className="text-sm">Bientôt disponible...</p>
             </div>
        )}
      </div>

      {/* --- MODALE DÉTAILS AVEC NOTATION --- */}
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
                            {movieDetails.backdrop_path ? <img src={movieDetails.backdrop_path} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-600">Pas d&apos;image</div>}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                            <button onClick={closeModale} className="absolute top-4 right-4 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition backdrop-blur-sm border border-white/10"><X size={24} /></button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1">
                            <h2 className="text-3xl font-black text-white mb-1 leading-tight">{movieDetails.title}</h2>
                            <p className="text-yellow-500 font-medium text-sm mb-4">{movieDetails.genres}</p>

                            {/* --- SYSTEME DE NOTATION --- */}
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mb-6 flex flex-col items-center">
                                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Noter ce film</span>
                                <div className="flex gap-1 mb-3">
                                    {[1, 2, 3, 4, 5].map((starIndex) => (
                                        <div key={starIndex} className="relative w-8 h-8 cursor-pointer group">
                                            {/* Icône Etoile : Vide, Demi ou Pleine */}
                                            <div className="pointer-events-none">
                                                {rating >= starIndex ? (
                                                    <Star className="w-full h-full text-yellow-400 fill-yellow-400" />
                                                ) : rating >= starIndex - 0.5 ? (
                                                    <StarHalf className="w-full h-full text-yellow-400 fill-yellow-400" />
                                                ) : (
                                                    <Star className="w-full h-full text-slate-600" />
                                                )}
                                            </div>

                                            {/* Zones de clic invisibles (Gauche = X.5, Droite = X.0) */}
                                            <div 
                                                className="absolute top-0 left-0 w-1/2 h-full z-10" 
                                                onClick={() => setRating(starIndex - 0.5)}
                                            />
                                            <div 
                                                className="absolute top-0 right-0 w-1/2 h-full z-10" 
                                                onClick={() => setRating(starIndex)}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="text-xl font-bold text-yellow-400 h-6">
                                    {rating > 0 ? rating : "-"} / 5
                                </div>

                                {/* Bouton de validation si une note est mise */}
                                {rating > 0 && (
                                    <button 
                                        onClick={rateAndMoveToHistory}
                                        className="mt-3 w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-3 rounded-lg transition animate-in zoom-in duration-200"
                                    >
                                        Valider & Mettre dans Vus
                                    </button>
                                )}
                            </div>
                            
                            {/* Bouton Supprimer discret en bas si on est déjà dans une liste */}
                            {(activeTab === 'list-wishlist' || activeTab === 'list-history') && (
                                <button 
                                    onClick={() => deleteMovie(movieDetails.id)}
                                    className="w-full mb-6 border border-slate-700 text-slate-500 py-2 rounded-lg text-xs hover:bg-red-900/20 hover:text-red-400 hover:border-red-900/50 transition flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={14}/> Supprimer de la liste
                                </button>
                            )}

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
                                                {actor.profile_path ? <img src={actor.profile_path} alt={actor.name} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center bg-slate-700"><Users size={24} className="text-slate-500"/></div>}
                                            </div>
                                            <span className="text-xs font-bold text-center line-clamp-2">{actor.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-800 bg-slate-900 shrink-0"><button onClick={closeModale} className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition">Fermer</button></div>
                    </>
                )}
            </div>
        </div>
      )}

      {/* --- MENU DU BAS --- */}
      <nav className="fixed bottom-0 left-0 w-full bg-slate-800 border-t border-slate-700 pb-safe z-40">
        <div className="flex justify-around items-center p-2">
          <button onClick={() => setActiveTab('hub')} className={`nav-btn flex flex-col items-center transition ${['hub', 'list-wishlist', 'list-history'].includes(activeTab) ? 'text-blue-500' : 'text-slate-400'}`}>
            <Library size={24} /><span className="text-[10px] mt-1">Mes Listes</span>
          </button>
          <button onClick={() => setActiveTab('cinematch')} className="relative -top-4">
             <div className={`p-4 rounded-full border-4 border-slate-900 transition ${activeTab === 'cinematch' ? 'bg-gradient-to-tr from-red-500 to-yellow-500 text-white shadow-lg shadow-red-500/20' : 'bg-slate-700 text-slate-400'}`}>
                 <Flame size={28} fill={activeTab === 'cinematch' ? "currentColor" : "none"} />
             </div>
          </button>
          <button onClick={() => setActiveTab('catalogue')} className={`nav-btn flex flex-col items-center transition ${activeTab === 'catalogue' ? 'text-purple-500' : 'text-slate-400'}`}>
            <LayoutGrid size={24} /><span className="text-[10px] mt-1">Catalogue</span>
          </button>
        </div>
      </nav>
    </main>
  );
}