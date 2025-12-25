"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Library, Popcorn, Flame, X, Loader2, Info, Calendar, Clock, Clapperboard, Users, Trash2, Eye, ChevronRight, LayoutGrid, Star, StarHalf, SlidersHorizontal, ArrowDownWideNarrow, ArrowUpNarrowWide, Trophy, EyeOff, Heart, FileUp } from 'lucide-react';
import TinderCard from 'react-tinder-card';
import Papa from 'papaparse'; 

// --- TYPES ---
interface MovieBasic {
  id: number;
  title: string;
  poster_path: string | null;
  overview: string;
  vote: string;
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

// Liste des Genres TMDB
const GENRES = [
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

export default function CinemaPage() {
  // --- ETATS ---
  const [activeTab, setActiveTab] = useState('cinematch');
  const [currentUser, setCurrentUser] = useState('Alex'); 

  const [movies, setMovies] = useState<MovieBasic[]>([]);
  const [catalogueMovies, setCatalogueMovies] = useState<MovieBasic[]>([]);
  const [savedMovies, setSavedMovies] = useState<MovieBasic[]>([]);
  
  const [loading, setLoading] = useState(false);
  
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [movieDetails, setMovieDetails] = useState<MovieFull | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [isInWishlist, setIsInWishlist] = useState(false);

  const [showMatchAnimation, setShowMatchAnimation] = useState(false);
  
  // ETAT POUR LA MODALE DE SUPPRESSION (Nouveau)
  const [deleteModal, setDeleteModal] = useState<{show: boolean, movieId: number | null, title: string}>({ 
      show: false, movieId: null, title: '' 
  });

  // ETATS POUR LES FILTRES & TRI
  const [showFilters, setShowFilters] = useState(false);
  const [cataloguePage, setCataloguePage] = useState(1);
  const [sortOption, setSortOption] = useState('newest'); 

  // ETATS POUR L'IMPORT LETTERBOXD
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filters, setFilters] = useState({
      genre: null as number | null,
      minYear: '',
      maxYear: '',
      minVote: 0
  });

  const currentYear = new Date().getFullYear();
  const cardRefs = useRef<any[]>([]);

  // --- EFFETS ---
  useEffect(() => {
    if (activeTab === 'cinematch' && movies.length === 0) fetchDiscoverMovies();
    if (activeTab === 'catalogue' && catalogueMovies.length === 0) fetchCatalogueMovies(1, true);
    
    if (activeTab === 'list-wishlist') fetchSavedList('wishlist');
    else if (activeTab === 'list-history') fetchSavedList('history');
    else if (activeTab === 'list-matches') fetchMatchesList();
    
    if (activeTab === 'cinematch' || activeTab === 'catalogue') {
        fetchSavedList('wishlist', true);
    }
  }, [activeTab, currentUser]); 

  useEffect(() => {
    if (activeTab === 'catalogue') fetchCatalogueMovies(1, true);
  }, [sortOption]);

  // --- LOGIQUE IMPORTATION CSV ---
  const handleFileClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // On traite chaque fichier envoyé
    Array.from(files).forEach(file => {
        const fileName = file.name.toLowerCase();
        let targetListType = '';

        // DÉTECTION AUTOMATIQUE BASÉE SUR LE NOM DU FICHIER
        if (fileName.includes('ratings') || fileName.includes('diary') || fileName.includes('watched')) {
            targetListType = 'history'; 
        } else if (fileName.includes('watchlist')) {
            targetListType = 'wishlist'; 
        } else {
            console.warn(`Fichier ignoré : ${fileName}`);
            return;
        }

        setIsImporting(true);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            // Utilisation de 'any' pour éviter l'erreur TypeScript
            complete: async (results: any) => {
                await processImport(results.data, targetListType, fileName);
            }
        });
    });
  };

  const processImport = async (rows: any[], listType: string, sourceFileName: string) => {
    // 1. On met à jour le TOTAL une seule fois avant de commencer
    setImportProgress(prev => ({
        current: prev?.current || 0,
        total: (prev?.total || 0) + rows.length
    }));

    let count = 0;
    console.log(`Début import ${sourceFileName} vers ${listType}`);

    for (const row of rows) {
        const title = row.Name || row.Title;
        const year = row.Year;
        const rating = row.Rating ? parseFloat(row.Rating) : null;
        const watchedDate = row.Date || row['Watched Date'];

        if (title && year) {
            try {
                await fetch('/api/cinema/import', {
                    method: 'POST',
                    body: JSON.stringify({
                        title,
                        year,
                        userRating: rating,
                        watchedDate: watchedDate,
                        listType: listType,
                        userId: currentUser
                    })
                });
            } catch (e) {
                console.error("Erreur import", title);
            }
        }
        
        count++;
        // 2. On met à jour SEULEMENT le compteur courant
        setImportProgress(prev => ({ 
            ...prev,
            current: (prev?.current || 0) + 1 
        }));
    }

    alert(`Importation de ${sourceFileName} terminée ! (${count} films traités)`);
    
    if (activeTab === `list-${listType}`) {
        fetchSavedList(listType);
    }
    setIsImporting(false);
  };

  // --- AUTRES FONCTIONS API ---
  const fetchDiscoverMovies = async () => {
    setLoading(true);
    try {
      let url = '/api/cinema/discover?mode=cinematch';
      if (filters.genre) url += `&genre=${filters.genre}`;
      if (filters.minYear) url += `&minYear=${filters.minYear}`;
      if (filters.maxYear) url += `&maxYear=${filters.maxYear}`;
      if (filters.minVote > 0) url += `&minVote=${filters.minVote}`;

      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) setMovies(data);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchCatalogueMovies = async (page: number, reset = false) => {
    setLoading(true);
    try {
      let url = `/api/cinema/discover?mode=catalogue&page=${page}&sortBy=${sortOption}`;
      if (filters.genre) url += `&genre=${filters.genre}`;
      if (filters.minYear) url += `&minYear=${filters.minYear}`;
      if (filters.maxYear) url += `&maxYear=${filters.maxYear}`;
      if (filters.minVote > 0) url += `&minVote=${filters.minVote}`;

      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
          if (reset) { setCatalogueMovies(data); setCataloguePage(1); } 
          else { setCatalogueMovies(prev => [...prev, ...data]); setCataloguePage(page); }
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const applyFilters = () => {
      setShowFilters(false); 
      if (activeTab === 'cinematch') { setMovies([]); fetchDiscoverMovies(); } 
      else if (activeTab === 'catalogue') { fetchCatalogueMovies(1, true); }
  };

  const resetFilters = () => { setFilters({ genre: null, minYear: '', maxYear: '', minVote: 0 }); };

  const fetchSavedList = async (type: string, silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setSavedMovies([]); 
    try {
      const res = await fetch(`/api/cinema/get-lists?type=${type}&userId=${currentUser}`);
      const data = await res.json();
      setSavedMovies(data);
    } catch (e) { console.error(e); } finally { if (!silent) setLoading(false); }
  };

  const fetchMatchesList = async () => {
      setLoading(true); setSavedMovies([]);
      try {
          const res = await fetch('/api/cinema/matches');
          const data = await res.json();
          setSavedMovies(data);
      } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const saveMovie = async (movie: MovieBasic, listType: string, userRating?: number) => {
      try {
        const res = await fetch('/api/cinema/save', {
          method: 'POST',
          body: JSON.stringify({ movie: movie, listType: listType, userId: currentUser, userRating: userRating })
        });
        const data = await res.json();
        if (data.isMatch && listType === 'wishlist') triggerMatchAnimation();
      } catch (error) { console.error(error); }
  };

  const triggerMatchAnimation = () => { setShowMatchAnimation(true); setTimeout(() => setShowMatchAnimation(false), 3500); };

  // --- LOGIQUE SUPPRESSION (Nouvelle Version) ---

  const handleDeleteClick = (e: React.MouseEvent, movieTitle: string, movieId: number) => {
      e.stopPropagation(); 
      e.preventDefault();
      // Au lieu de window.confirm, on ouvre la modale
      setDeleteModal({ show: true, movieId: movieId, title: movieTitle });
  };

  const confirmDelete = async () => {
    if (deleteModal.movieId) {
        await deleteMovie(deleteModal.movieId);
        setDeleteModal({ show: false, movieId: null, title: '' }); // Fermer la modale
    }
  };

  const deleteMovie = async (movieId: number) => {
    const listType = activeTab === 'list-wishlist' ? 'wishlist' : 'history';
    const typeToSend = activeTab === 'list-matches' ? 'wishlist' : listType;
    
    // 1. Optimistic UI
    if (['list-wishlist', 'list-history', 'list-matches'].includes(activeTab)) {
         setSavedMovies(prev => prev.filter(m => m.id !== movieId));
    }

    try {
        // 2. Appel DELETE correct
        await fetch('/api/cinema/save', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                movieId, 
                listType: typeToSend, 
                userId: currentUser 
            })
        });
    } catch (error) { 
        console.error("Erreur suppression", error);
        fetchSavedList(listType); // Rollback en cas d'erreur
    }
  };

  const toggleWishlist = async () => {
    if (!movieDetails) return;
    if (isInWishlist) {
        await deleteMovie(movieDetails.id);
        setIsInWishlist(false);
        setSavedMovies(prev => prev.filter(m => m.id !== movieDetails.id));
    } else {
        await saveMovie(movieDetails, 'wishlist');
        setIsInWishlist(true);
        if (activeTab === 'list-wishlist') setSavedMovies(prev => [...prev, movieDetails]);
    }
  };

  const rateAndMoveToHistory = async () => {
      if (!movieDetails) return;
      await saveMovie(movieDetails, 'history', rating);
      await fetch('/api/cinema/save', { // Changé pour utiliser la bonne route "save" en DELETE
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ movieId: movieDetails.id, listType: 'wishlist', userId: currentUser }) 
      });
      if (activeTab === 'list-history') fetchSavedList('history'); 
      else setSavedMovies(prev => prev.filter(m => m.id !== movieDetails.id));
      closeModale();
  };

  const onSwipe = (direction: string, movie: MovieBasic) => {
    if (direction === 'right') {
      saveMovie(movie, 'wishlist');
      setSavedMovies(prev => [...prev, movie]);
    } 
    setTimeout(() => { setMovies((prev) => prev.filter(m => m.id !== movie.id)); }, 200);
  };

  const openMovieDetails = async (id: number) => {
    setSelectedMovieId(id); setLoadingDetails(true);
    const inList = activeTab === 'list-matches' || savedMovies.some(m => m.id === id);
    setIsInWishlist(inList);
    const existingMovie = savedMovies.find(m => m.id === id);
    setRating(existingMovie?.userRating || 0);
    try {
      const res = await fetch(`/api/cinema/details?id=${id}`);
      const data = await res.json();
      setMovieDetails(data);
    } catch (error) { console.error(error); } finally { setLoadingDetails(false); }
  };

  const closeModale = () => { setSelectedMovieId(null); setMovieDetails(null); setRating(0); setIsInWishlist(false); }

  // --- RENDU ---
  return (
    <main className="min-h-screen bg-slate-900 text-white pb-24 relative overflow-hidden">
      
      {/* ANIMATION MATCH */}
      {showMatchAnimation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
            <style jsx>{`
                @keyframes clap-top { 0% { transform: rotate(-35deg); } 50% { transform: rotate(-35deg); } 60% { transform: rotate(0deg); } 100% { transform: rotate(0deg); } }
                @keyframes explode { 0% { transform: scale(0); opacity: 0; } 59% { transform: scale(0); opacity: 0; } 60% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
                @keyframes text-pop { 0% { transform: scale(0); opacity: 0; } 65% { transform: scale(0); opacity: 0; } 75% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
            `}</style>
            <div className="relative flex flex-col items-center">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-red-500 via-yellow-500 to-purple-500 rounded-full blur-3xl opacity-0" style={{ animation: 'explode 1.5s ease-out forwards' }}></div>
                <div className="relative w-48 h-48">
                    <div className="absolute top-0 left-0 w-full h-12 bg-white border-b-4 border-black origin-bottom-left -rotate-12 z-20" style={{ backgroundImage: 'linear-gradient(135deg, transparent 20%, black 20%, black 50%, transparent 50%, transparent 70%, black 70%)', backgroundSize: '40px 40px', animation: 'clap-top 1.5s ease-in-out forwards' }}></div>
                    <div className="absolute top-12 left-0 w-full h-32 bg-slate-800 border-4 border-white rounded-b-lg flex items-center justify-center shadow-2xl z-10">
                         <div className="text-center">
                             <div className="w-full h-4 bg-white mb-4 absolute top-0 left-0 border-b-4 border-black" style={{ backgroundImage: 'linear-gradient(135deg, transparent 20%, black 20%, black 50%, transparent 50%, transparent 70%, black 70%)', backgroundSize: '40px 40px' }}></div>
                             <span className="text-slate-500 text-xs uppercase tracking-widest font-bold mt-4 block">Production</span>
                             <span className="text-white font-black text-xl tracking-widest">ALEX & JUJU</span>
                         </div>
                    </div>
                </div>
                <h1 className="mt-8 text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-600 drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] opacity-0" style={{ animation: 'text-pop 1s ease-out forwards' }}>CineMatch !</h1>
            </div>
        </div>
      )}

      {/* EN-TÊTE */}
      <div className="p-6 pb-2 z-10 relative flex justify-between items-start">
        <div>
            {activeTab.startsWith('list-') ? (
                 <button onClick={() => setActiveTab('hub')} className="inline-flex items-center text-slate-400 mb-4 hover:text-white transition text-sm"><ArrowLeft className="mr-1" size={16} /> Retour aux listes</button>
            ) : (
                <Link href="/" className="inline-flex items-center text-slate-400 mb-4 hover:text-white transition text-sm"><ArrowLeft className="mr-1" size={16} /> Menu</Link>
            )}
            <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    {activeTab === 'cinematch' && <><Flame className="text-red-500"/> CineMatch</>}
                    {activeTab === 'hub' && <><Library className="text-blue-500"/> Mes Listes</>}
                    {activeTab === 'catalogue' && <><LayoutGrid className="text-purple-500"/> Catalogue</>}
                    {activeTab === 'list-wishlist' && <><Popcorn className="text-yellow-500"/> À voir</>}
                    {activeTab === 'list-history' && <><Eye className="text-green-500"/> Déjà vus</>}
                    {activeTab === 'list-matches' && <><Heart className="text-pink-500 fill-pink-500"/> Nos Matchs</>}
                </h1>
                {(activeTab === 'cinematch' || activeTab === 'catalogue') && (
                    <button onClick={() => setShowFilters(true)} className={`ml-2 p-2 rounded-full border transition ${showFilters || (filters.genre || filters.minYear) ? 'bg-yellow-500 border-yellow-500 text-slate-900' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}><SlidersHorizontal size={18} /></button>
                )}
            </div>
        </div>
        <button onClick={() => setCurrentUser(currentUser === 'Alex' ? 'Juju' : 'Alex')} className="flex flex-col items-center gap-1 bg-slate-800 p-2 rounded-xl border border-slate-700 active:scale-95 transition">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-md transition-colors ${currentUser === 'Alex' ? 'bg-blue-500' : 'bg-orange-500'}`}>{currentUser === 'Alex' ? 'A' : 'J'}</div>
            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">{currentUser}</span>
        </button>
      </div>

      {/* --- IMPORTATION MODALE (Si en cours) --- */}
      {isImporting && (
          <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-6 text-center">
              <Loader2 size={48} className="animate-spin text-yellow-500 mb-4"/>
              <h2 className="text-xl font-bold mb-2">Importation en cours...</h2>
              <p className="text-slate-400 mb-4">Ne quitte pas cette page.</p>
              <div className="w-full max-w-xs bg-slate-800 rounded-full h-4 overflow-hidden border border-slate-700">
                  <div className="bg-yellow-500 h-full transition-all duration-200" style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}></div>
              </div>
              <p className="mt-2 text-xs font-mono">{importProgress.current} / {importProgress.total} films</p>
          </div>
      )}

        {/* MODALE DE CONFIRMATION DE SUPPRESSION (Corrigée) */}
        {deleteModal.show && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
                <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
                    <h3 className="text-xl font-bold text-white mb-2">Supprimer ce film ?</h3>
                    <p className="text-slate-400 mb-6">
                        {/* C'EST ICI QUE C'ÉTAIT CASSÉ : utilisation de &quot; au lieu de " */}
                        Tu es sur le point de retirer <span className="text-yellow-500 font-bold">&quot;{deleteModal.title}&quot;</span> de ta liste.
                        <br/>Cette action est irréversible.
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setDeleteModal({ show: false, movieId: null, title: '' })} 
                            className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-700 transition"
                        >
                            Annuler
                        </button>
                        <button 
                            onClick={confirmDelete} 
                            className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition shadow-lg shadow-red-900/20"
                        >
                            Oui, supprimer
                        </button>
                    </div>
                </div>
            </div>
        )}

      {/* FILTRES MODALE */}
      {showFilters && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
             <div className="bg-slate-900 w-[90%] max-w-md p-6 rounded-2xl border border-slate-700 shadow-2xl relative">
                 <button onClick={() => setShowFilters(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={24}/></button>
                 <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><SlidersHorizontal size={20} className="text-yellow-500"/> Filtres</h2>
                 <div className="mb-6">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Genre</label>
                     <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto scrollbar-hide">
                         {GENRES.map(g => (
                             <button key={g.id} onClick={() => setFilters({...filters, genre: filters.genre === g.id ? null : g.id})} className={`px-3 py-1 rounded-full text-xs font-medium border transition ${filters.genre === g.id ? 'bg-yellow-500 border-yellow-500 text-slate-900' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>{g.name}</button>
                         ))}
                     </div>
                 </div>
                 <div className="mb-6">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Année de sortie</label>
                     <div className="flex items-center gap-2">
                         <input type="number" placeholder="1895" min="1890" max={currentYear} className="bg-slate-800 border border-slate-700 rounded-lg p-2 text-white w-full text-sm focus:border-yellow-500 outline-none" value={filters.minYear} onChange={(e) => setFilters({...filters, minYear: e.target.value})}/>
                         <span className="text-slate-500">-</span>
                         <input type="number" placeholder={currentYear.toString()} min="1890" max={currentYear} className="bg-slate-800 border border-slate-700 rounded-lg p-2 text-white w-full text-sm focus:border-yellow-500 outline-none" value={filters.maxYear} onChange={(e) => setFilters({...filters, maxYear: e.target.value})}/>
                     </div>
                 </div>
                 <div className="mb-8">
                     <div className="flex justify-between mb-2"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Note Minimale</label><span className="text-yellow-500 font-bold text-xs">{filters.minVote} / 10</span></div>
                     <input type="range" min="0" max="9" step="1" value={filters.minVote} onChange={(e) => setFilters({...filters, minVote: parseInt(e.target.value)})} className="w-full accent-yellow-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"/>
                 </div>
                 <div className="flex gap-3">
                     <button onClick={resetFilters} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-700 transition">Réinitialiser</button>
                     <button onClick={applyFilters} className="flex-1 py-3 bg-yellow-500 text-slate-900 rounded-xl font-bold text-sm hover:bg-yellow-400 transition">Appliquer</button>
                 </div>
             </div>
        </div>
      )}

      {/* CONTENU PRINCIPAL */}
      <div className="px-4 h-[70vh] relative flex flex-col justify-center">
        
        {/* CINEMATCH */}
        {activeTab === 'cinematch' && (
          <div className="relative w-full h-full max-w-sm mx-auto mt-4">
            {loading && <div className="flex flex-col items-center justify-center h-full text-slate-500"><Loader2 size={40} className="animate-spin mb-4 text-yellow-500"/>Chargement...</div>}
            {!loading && movies.length === 0 && (
               <div className="text-center mt-20 flex flex-col items-center">
                  <Popcorn size={48} className="text-slate-600 mb-4"/>
                  <p className="text-slate-400 mb-2">Aucun film trouvé !</p>
                  <p className="text-slate-500 text-sm mb-4">Essaie de changer tes filtres.</p>
                  <div className="flex gap-2">
                      <button onClick={() => {resetFilters(); fetchDiscoverMovies();}} className="bg-slate-700 text-white px-4 py-2 rounded-full text-sm font-bold">Reset</button>
                      <button onClick={fetchDiscoverMovies} className="bg-yellow-500 text-slate-900 px-4 py-2 rounded-full font-bold">Recharger</button>
                  </div>
               </div>
            )}
            {movies.map((movie, index) => (
              <TinderCard ref={(el) => cardRefs.current[index] = el} key={movie.id} onSwipe={(dir) => onSwipe(dir, movie)} preventSwipe={['up', 'down']} className="absolute top-0 left-0 w-full h-full">
                <div className="relative w-full h-full bg-slate-800 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 select-none">
                  {movie.poster_path && <img src={movie.poster_path} alt={movie.title} className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                  <div className="absolute bottom-0 left-0 p-6 w-full z-10 pb-20">
                     <div className="flex items-center justify-between mb-2">
                        <span className="bg-yellow-500 text-slate-900 text-xs font-bold px-2 py-1 rounded-full">★ {movie.vote}</span>
                        <button onTouchStart={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={() => openMovieDetails(movie.id)} className="bg-slate-700/80 hover:bg-slate-600 text-white p-2 rounded-full backdrop-blur-sm transition animate-pulse"><Info size={20} /></button>
                     </div>
                    <h2 className="text-3xl font-black leading-tight mb-2 drop-shadow-lg">{movie.title}</h2>
                  </div>
                </div>
              </TinderCard>
            ))}
          </div>
        )}

        {/* HUB */}
        {activeTab === 'hub' && (
            <div className="flex flex-col gap-4 max-w-sm mx-auto w-full pb-20">
                <button onClick={() => setActiveTab('list-matches')} className="flex items-center justify-between bg-gradient-to-r from-pink-900/50 to-slate-800 p-6 rounded-2xl border border-pink-500/30 hover:border-pink-500 hover:from-pink-900 transition group shadow-lg shadow-pink-900/10">
                    <div className="flex items-center gap-4">
                        <div className="bg-pink-500/20 p-4 rounded-full text-pink-500 group-hover:bg-pink-500 group-hover:text-white transition"><Heart size={32} fill="currentColor" /></div>
                        <div className="text-left"><h3 className="text-xl font-bold text-white">Nos Matchs</h3><p className="text-sm text-pink-300">Vos coups de cœur communs</p></div>
                    </div>
                    <ChevronRight className="text-pink-500 group-hover:text-white transition"/>
                </button>

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

                {/* ZONE D'IMPORTATION LETTERBOXD */}
                <div className="mt-4 pt-6 border-t border-slate-800">
                    <input type="file" accept=".csv" multiple ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                    <button onClick={handleFileClick} className="w-full flex items-center justify-center gap-2 bg-slate-800/50 border border-slate-700 border-dashed text-slate-500 p-4 rounded-xl hover:bg-slate-800 hover:text-white transition">
                        <FileUp size={20} />
                        <span className="text-sm font-medium">Importer un CSV Letterboxd</span>
                    </button>
                    <p className="text-[10px] text-center text-slate-600 mt-2">Compatible avec les exports <i>watchlist.csv</i> et <i>watched.csv</i></p>
                </div>
            </div>
        )}

         {/* LISTES (Wishlist, History, Matches) */}
         {['list-wishlist', 'list-history', 'list-matches'].includes(activeTab) && (
          <div className="h-full overflow-y-auto pb-20 scrollbar-hide">
            {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-500"/></div>
            ) : savedMovies.length === 0 ? (
                <div className="text-center py-10 text-slate-500 opacity-50">
                    {activeTab === 'list-matches' ? <Heart size={48} className="mx-auto mb-4"/> : <Popcorn size={48} className="mx-auto mb-4" />}
                    <p>{activeTab === 'list-matches' ? "Aucun match pour l'instant !" : `Cette liste est vide pour ${currentUser}.`}</p>
                </div>
            ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 pb-4">
                    {savedMovies.map(movie => (
                        <div key={movie.id} onClick={() => openMovieDetails(movie.id)} className="bg-slate-800 rounded-lg overflow-hidden shadow border border-slate-700 cursor-pointer active:scale-95 transition hover:scale-105 group relative">
                             <div className="aspect-[2/3] w-full bg-slate-700 relative">
                                {movie.poster_path ? <img src={movie.poster_path} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500">Pas d&apos;image</div>}
                                
                                {/* BOUTON SUPPRIMER CORRIGÉ */}
                                <button 
                                    onClick={(e) => handleDeleteClick(e, movie.title, movie.id)} 
                                    className="absolute top-1 left-1 bg-red-600 text-white p-2 rounded-full shadow-lg z-50 hover:bg-red-700 hover:scale-110 transition cursor-pointer"
                                    title="Supprimer"
                                >
                                    <Trash2 size={14} /> 
                                </button>

                                {movie.userRating ? (
                                    <div className="absolute top-1 right-1 bg-green-500 text-slate-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md flex items-center gap-1 z-10"><Star size={8} fill="currentColor"/> {movie.userRating}</div>
                                ) : (
                                    <div className="absolute top-1 right-1 bg-black/60 text-yellow-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-sm z-10">★ {movie.vote}</div>
                                )}
                             </div>
                             <div className="p-2 text-center"><h3 className="font-bold text-[10px] sm:text-xs leading-tight line-clamp-1 truncate text-slate-300">{movie.title}</h3></div>
                        </div>
                    ))}
                </div>
            )}
          </div>
        )}

        {/* CATALOGUE */}
        {activeTab === 'catalogue' && (
             <div className="h-full overflow-y-auto pb-20 scrollbar-hide">
                 <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
                     <button onClick={() => setSortOption('newest')} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border ${sortOption === 'newest' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}><ArrowDownWideNarrow size={14}/> Récents</button>
                     <button onClick={() => setSortOption('oldest')} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border ${sortOption === 'oldest' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}><ArrowUpNarrowWide size={14}/> Anciens</button>
                     <button onClick={() => setSortOption('rating')} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border ${sortOption === 'rating' ? 'bg-purple-600 border-purple-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}><Trophy size={14}/> Top Notes</button>
                 </div>
                 {loading && catalogueMovies.length === 0 ? (
                     <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-500"/></div>
                 ) : (
                    <>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 pb-4">
                            {catalogueMovies.map(movie => (
                                <div key={movie.id} onClick={() => openMovieDetails(movie.id)} className="bg-slate-800 rounded-lg overflow-hidden shadow border border-slate-700 cursor-pointer active:scale-95 transition hover:scale-105 group relative">
                                    <div className="aspect-[2/3] w-full bg-slate-700 relative">
                                        {movie.poster_path ? <img src={movie.poster_path} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500">Pas d&apos;image</div>}
                                        <div className="absolute top-1 right-1 bg-black/60 text-yellow-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-sm z-10">★ {movie.vote}</div>
                                    </div>
                                    <div className="p-2 text-center"><h3 className="font-bold text-[10px] sm:text-xs leading-tight line-clamp-1 truncate text-slate-300">{movie.title}</h3></div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-center py-4">
                            <button onClick={() => fetchCatalogueMovies(cataloguePage + 1)} className="bg-slate-800 border border-slate-700 text-slate-400 px-6 py-2 rounded-full text-xs font-bold hover:bg-slate-700 hover:text-white transition flex items-center gap-2">{loading ? <Loader2 size={14} className="animate-spin"/> : "Voir la suite"}</button>
                        </div>
                    </>
                 )}
             </div>
        )}
      </div>

      {/* MODALE DÉTAILS */}
      {selectedMovieId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 w-full h-[95vh] sm:h-[90vh] sm:w-[600px] sm:rounded-2xl rounded-t-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col relative animate-in slide-in-from-bottom-10 duration-300">
                {loadingDetails || !movieDetails ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400"><Loader2 size={40} className="animate-spin mb-4 text-yellow-500"/> Chargement...</div>
                ) : (
                    <>
                        <div className="h-64 w-full relative shrink-0">
                            {movieDetails.backdrop_path ? <img src={movieDetails.backdrop_path} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-600">Pas d&apos;image</div>}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                            <button onClick={closeModale} className="absolute top-4 right-4 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition backdrop-blur-sm border border-white/10"><X size={24} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="flex justify-between items-start">
                                <div><h2 className="text-3xl font-black text-white mb-1 leading-tight">{movieDetails.title}</h2><p className="text-yellow-500 font-medium text-sm mb-4">{movieDetails.genres}</p></div>
                                <button onClick={toggleWishlist} className={`p-3 rounded-full transition-all duration-300 shadow-lg ${isInWishlist ? 'bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white' : 'bg-slate-800 text-slate-400 hover:bg-yellow-500 hover:text-slate-900'}`} title={isInWishlist ? "Retirer de ma liste" : "Ajouter à ma liste"}>{isInWishlist ? <EyeOff size={24} /> : <Eye size={24} />}</button>
                            </div>
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mb-6 flex flex-col items-center">
                                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Noter ce film</span>
                                <div className="flex gap-1 mb-3">
                                    {[1, 2, 3, 4, 5].map((starIndex) => (
                                        <div key={starIndex} className="relative w-8 h-8 cursor-pointer group">
                                            <div className="pointer-events-none">{rating >= starIndex ? (<Star className="w-full h-full text-yellow-400 fill-yellow-400" />) : rating >= starIndex - 0.5 ? (<StarHalf className="w-full h-full text-yellow-400 fill-yellow-400" />) : (<Star className="w-full h-full text-slate-600" />)}</div>
                                            <div className="absolute top-0 left-0 w-1/2 h-full z-10" onClick={() => setRating(starIndex - 0.5)}/>
                                            <div className="absolute top-0 right-0 w-1/2 h-full z-10" onClick={() => setRating(starIndex)}/>
                                        </div>
                                    ))}
                                </div>
                                <div className="text-xl font-bold text-yellow-400 h-6">{rating > 0 ? rating : "-"} / 5</div>
                                {rating > 0 && (<button onClick={rateAndMoveToHistory} className="mt-3 w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-3 rounded-lg transition animate-in zoom-in duration-200">Valider & Mettre dans Vus</button>)}
                            </div>
                            {(activeTab === 'list-wishlist' || activeTab === 'list-history' || activeTab === 'list-matches') && (
                                <button onClick={() => setDeleteModal({ show: true, movieId: movieDetails.id, title: movieDetails.title })} className="w-full mb-6 border border-slate-700 text-slate-500 py-2 rounded-lg text-xs hover:bg-red-900/20 hover:text-red-400 hover:border-red-900/50 transition flex items-center justify-center gap-2"><Trash2 size={14}/> Supprimer de la liste</button>
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

      {/* NAVIGATION */}
      <nav className="fixed bottom-0 left-0 w-full bg-slate-800 border-t border-slate-700 pb-safe z-40">
        <div className="flex justify-around items-center p-2">
          <button onClick={() => setActiveTab('hub')} className={`nav-btn flex flex-col items-center transition ${['hub', 'list-wishlist', 'list-history', 'list-matches'].includes(activeTab) ? 'text-blue-500' : 'text-slate-400'}`}><Library size={24} /><span className="text-[10px] mt-1">Mes Listes</span></button>
          <button onClick={() => setActiveTab('cinematch')} className="relative -top-4"><div className={`p-4 rounded-full border-4 border-slate-900 transition ${activeTab === 'cinematch' ? 'bg-gradient-to-tr from-red-500 to-yellow-500 text-white shadow-lg shadow-red-500/20' : 'bg-slate-700 text-slate-400'}`}><Flame size={28} fill={activeTab === 'cinematch' ? "currentColor" : "none"} /></div></button>
          <button onClick={() => setActiveTab('catalogue')} className={`nav-btn flex flex-col items-center transition ${activeTab === 'catalogue' ? 'text-purple-500' : 'text-slate-400'}`}><LayoutGrid size={24} /><span className="text-[10px] mt-1">Catalogue</span></button>
        </div>
      </nav>
    </main>
  );
}