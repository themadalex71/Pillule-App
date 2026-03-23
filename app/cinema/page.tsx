"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Library, Popcorn, Flame, X, Loader2, Info, Calendar, Clock, Clapperboard, Users, Trash2, Eye, ChevronRight, LayoutGrid, Star, StarHalf, SlidersHorizontal, ArrowDownWideNarrow, ArrowUpNarrowWide, Trophy, EyeOff, Heart, FileUp, Search } from 'lucide-react';
import TinderCard from 'react-tinder-card';
import Papa from 'papaparse'; 

// --- TYPES ---
interface MovieBasic {
  id: number;
  title: string;
  poster_path: string | null;
  overview: string;
  vote: string;
  userRating?: number | null;
  ratedAt?: string | null;
  addedByMemberId?: string;
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
  const householdId = 'household_demo';
  const [activeTab, setActiveTab] = useState('cinematch');
  const [currentUser, setCurrentUser] = useState('Alex');
  const memberId = currentUser === 'Alex' ? 'member_alex' : 'member_juju';

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
  
  // ETAT POUR LA MODALE DE SUPPRESSION
  const [deleteModal, setDeleteModal] = useState<{show: boolean, movieId: number | null, title: string}>({ 
      show: false, movieId: null, title: '' 
  });

  // ETATS POUR LES FILTRES & TRI
  const [showFilters, setShowFilters] = useState(false);
  const [cataloguePage, setCataloguePage] = useState(1);
  const [sortOption, setSortOption] = useState('newest'); 
  const [searchQuery, setSearchQuery] = useState('');
  
  // ETATS POUR L'IMPORT LETTERBOXD
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filters, setFilters] = useState({
      genre: null as number | null,
      minYear: '',
      maxYear: '',
      minVote: 0
  });

  const currentYear = new Date().getFullYear();
  const cardRefs = useRef<any[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  useEffect(() => {
    if (activeTab === 'catalogue') {
        if (searchQuery === '') {
            fetchCatalogueMovies(1, true, '');
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            fetchCatalogueMovies(1, true, searchQuery);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // --- LOGIQUE IMPORTATION CSV ---
  const handleFileClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
        const fileName = file.name.toLowerCase();
        let targetListType = '';

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
            complete: async (results: any) => {
                await processImport(results.data, targetListType, fileName);
            }
        });
    });
  };

  const processImport = async (rows: any[], listType: string, sourceFileName: string) => {
    setImportProgress(prev => ({
        current: prev?.current || 0,
        total: (prev?.total || 0) + rows.length
    }));

    let count = 0;

    for (const row of rows) {
        const title = row.Name || row.Title;
        const year = row.Year;
        const importedRating = row.Rating ? parseFloat(row.Rating) : null;
        const watchedDate = row.Date || row['Watched Date'];

        if (title && year) {
            try {
                await fetch('/api/cinema', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'import',
                        householdId,
                        memberId,
                        title,
                        year,
                        userRating: importedRating,
                        watchedDate,
                        listType
                    })
                });
            } catch (e) {
                console.error('Erreur import', title, e);
            }
        }

        count++;
        setImportProgress(prev =>
          prev
            ? { current: prev.current + 1, total: prev.total }
            : { current: 1, total: rows.length }
        );
    }

    alert(`Importation de ${sourceFileName} terminée ! (${count} films traités)`);

    if (activeTab === `list-${listType}`) {
        fetchSavedList(listType);
    }
    setIsImporting(false);
    setImportProgress(null);
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

      const [resTmdb, resWishlist, resHistory] = await Promise.all([
          fetch(url),
          fetch(`/api/cinema?action=list&listType=wishlist&householdId=${householdId}&memberId=${memberId}`),
          fetch(`/api/cinema?action=list&listType=history&householdId=${householdId}&memberId=${memberId}`)
      ]);

      const tmdbData = await resTmdb.json();
      const wishlistResponse = await resWishlist.json();
      const historyResponse = await resHistory.json();
      const wishlistData = wishlistResponse.list || [];
      const historyData = historyResponse.list || [];

      if (Array.isArray(tmdbData)) {
          const excludedIds = new Set([
              ...wishlistData.map((m: any) => m.id),
              ...historyData.map((m: any) => m.id)
          ]);

          const filteredMovies = tmdbData.filter((movie: MovieBasic) => !excludedIds.has(movie.id));
          setMovies(filteredMovies);
      }
    } catch (error) { 
        console.error("Erreur lors du chargement des films :", error); 
    } finally { 
        setLoading(false); 
    }
  };

  const fetchCatalogueMovies = async (page: number, reset = false, queryOverride?: string) => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    
    const newController = new AbortController();
    abortControllerRef.current = newController;

    if (reset) {
        setCatalogueMovies([]);
    }
    
    setLoading(true);
    
    try {
      let url = `/api/cinema/discover?mode=catalogue&page=${page}&sortBy=${sortOption}`;
      
      const queryToUse = queryOverride !== undefined ? queryOverride : searchQuery;

      if (queryToUse.trim() !== '') {
          url += `&query=${encodeURIComponent(queryToUse)}`;
      }

      if (filters.genre) url += `&genre=${filters.genre}`;
      if (filters.minYear) url += `&minYear=${filters.minYear}`;
      if (filters.maxYear) url += `&maxYear=${filters.maxYear}`;
      if (filters.minVote > 0) url += `&minVote=${filters.minVote}`;

      const res = await fetch(url, { signal: newController.signal });
      const data = await res.json();
      
      if (Array.isArray(data)) {
          if (reset) { 
              setCatalogueMovies(data); 
              setCataloguePage(1); 
          } else { 
              setCatalogueMovies(prev => [...prev, ...data]); 
              setCataloguePage(page); 
          }
      }
    } catch (error: any) { 
        if (error.name === 'AbortError') return;
        console.error(error); 
    } finally { 
        if (abortControllerRef.current === newController) {
             setLoading(false); 
             abortControllerRef.current = null;
        }
    }
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
      const res = await fetch(`/api/cinema?action=list&listType=${type}&householdId=${householdId}&memberId=${memberId}`);
      const data = await res.json();
      setSavedMovies(data.list || []);
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchMatchesList = async () => {
      setLoading(true);
      setSavedMovies([]);
      try {
          const res = await fetch(`/api/cinema?action=matches&householdId=${householdId}&memberId=${memberId}`);
          const data = await res.json();
          setSavedMovies(data.matches || []);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const saveMovie = async (movie: MovieBasic, listType: string, userRating?: number) => {
      try {
        const movieToSave = {
          ...movie,
          userRating: userRating ?? movie.userRating ?? null,
          ratedAt: userRating ? new Date().toLocaleDateString('fr-FR') : movie.ratedAt ?? null,
        };

        const res = await fetch('/api/cinema', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save',
            householdId,
            memberId,
            movie: movieToSave,
            listType
          })
        });
        const data = await res.json();
        if (data.isMatch && listType === 'wishlist') triggerMatchAnimation();
      } catch (error) {
        console.error(error);
      }
  };

  const triggerMatchAnimation = () => { setShowMatchAnimation(true); setTimeout(() => setShowMatchAnimation(false), 3500); };

  const handleDeleteClick = (e: React.MouseEvent, movieTitle: string, movieId: number) => {
      e.stopPropagation(); 
      e.preventDefault();
      setDeleteModal({ show: true, movieId: movieId, title: movieTitle });
  };

  const confirmDelete = async () => {
    if (deleteModal.movieId) {
        await deleteMovie(deleteModal.movieId);
        setDeleteModal({ show: false, movieId: null, title: '' }); 
    }
  };

  const deleteMovie = async (movieId: number) => {
    const listType = activeTab === 'list-wishlist' ? 'wishlist' : 'history';
    const typeToSend = activeTab === 'list-matches' ? 'wishlist' : listType;

    if (['list-wishlist', 'list-history', 'list-matches'].includes(activeTab)) {
         setSavedMovies(prev => prev.filter(m => m.id !== movieId));
    }

    try {
        await fetch('/api/cinema', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'delete',
                householdId,
                memberId,
                movieId,
                listType: typeToSend
            })
        });
    } catch (error) {
        console.error('Erreur suppression', error);
        fetchSavedList(listType);
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
      await fetch('/api/cinema', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            householdId,
            memberId,
            movieId: movieDetails.id,
            listType: 'wishlist'
          })
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
    setSelectedMovieId(id); 
    setLoadingDetails(true);
    const inList = activeTab === 'list-matches' || savedMovies.some(m => m.id === id);
    setIsInWishlist(inList);
    const existingMovie = savedMovies.find(m => m.id === id);
    setRating(existingMovie?.userRating || 0);
    try {
      const res = await fetch(`/api/cinema/details?id=${id}`);
      const data = await res.json();
      setMovieDetails(data);
    } catch (error) { 
      console.error(error); 
    } finally { 
      setLoadingDetails(false); 
    }
  };

  const closeModale = () => { 
    setSelectedMovieId(null); 
    setMovieDetails(null); 
    setRating(0); 
    setIsInWishlist(false); 
  };

  // --- RENDU ---
  return (
    <main className="h-[100dvh] bg-slate-900 text-white flex flex-col relative overflow-hidden">
      
      {showMatchAnimation && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
            <style jsx>{`
                @keyframes clap-top { 0% { transform: rotate(-35deg); } 50% { transform: rotate(-35deg); } 60% { transform: rotate(0deg); } 100% { transform: rotate(0deg); } }
                @keyframes explode { 0% { transform: scale(0); opacity: 0; } 59% { transform: scale(0); opacity: 0; } 60% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
                @keyframes text-pop { 0% { transform: scale(0); opacity: 0; } 65% { transform: scale(0); opacity: 0; } 75% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
            `}</style>
            <div className="relative w-48 h-48">
                <div className="absolute top-2 left-8 w-32 h-12 bg-slate-200 rounded-md origin-bottom-left shadow-lg" style={{ animation: 'clap-top 3.5s ease-in-out forwards' }}>
                    <div className="flex h-full">
                        <div className="w-1/4 bg-slate-800 rounded-l-md"></div><div className="w-1/4 bg-slate-200"></div><div className="w-1/4 bg-slate-800"></div><div className="w-1/4 bg-slate-200 rounded-r-md"></div>
                    </div>
                </div>
                <div className="absolute top-14 left-8 w-32 h-20 bg-slate-900 rounded-md border-4 border-slate-200 shadow-lg"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-7xl" style={{ animation: 'explode 3.5s ease-out forwards' }}>🎆</div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center pt-24" style={{ animation: 'text-pop 3.5s ease-out forwards' }}>
                    <div className="text-center">
                        <Heart size={32} className="mx-auto text-pink-500 fill-pink-500 mb-2" />
                        <p className="font-black text-3xl text-white tracking-wider drop-shadow-[0_2px_8px_rgba(255,255,255,0.5)]">MATCH !</p>
                    </div>
                </div>
            </div>
        </div>
      )}

      <div className="px-4 pt-safe shrink-0 bg-slate-900 z-10">
        <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
                <Link href="/" className="p-2 rounded-full bg-slate-800 text-slate-300 active:scale-95 transition"><ArrowLeft size={20}/></Link>
                <div className="flex items-center">
                    <h1 className="text-xl font-black">
                    {activeTab === 'cinematch' && <><Flame className="inline text-red-500 mr-2" fill="currentColor"/>CineMatch</>}
                    {activeTab === 'hub' && <><Library className="text-blue-500 inline mr-2"/>Mes Listes</>}
                    {activeTab === 'catalogue' && <><LayoutGrid className="text-purple-500 inline mr-2"/>Catalogue</>}
                    {activeTab === 'list-wishlist' && <><Popcorn className="text-yellow-500 inline mr-2"/>À voir</>}
                    {activeTab === 'list-history' && <><Eye className="text-green-500 inline mr-2"/>Déjà vus</>}
                    {activeTab === 'list-matches' && <><Heart className="text-pink-500 fill-pink-500 inline mr-2"/>Nos Matchs</>}
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
      </div>

      {isImporting && (
          <div className="fixed inset-0 z-[1000] bg-black/90 flex flex-col items-center justify-center p-6 text-center">
              <Loader2 size={48} className="animate-spin text-yellow-500 mb-4"/>
              <h2 className="text-xl font-bold mb-2">Importation en cours.</h2>
              <p className="text-slate-400 mb-4">Ne quitte pas cette page.</p>
              <div className="w-full max-w-xs bg-slate-800 rounded-full h-4 overflow-hidden border border-slate-700">
                  <div className="bg-yellow-500 h-full transition-all duration-200" style={{ width: `${(((importProgress?.current || 0) / (importProgress?.total || 1)) * 100)}%` }}></div>
              </div>
              <p className="mt-2 text-xs font-mono">{importProgress?.current || 0} / {importProgress?.total || 0} films</p>
          </div>
      )}

      {showFilters && (
          <div className="fixed inset-0 z-[950] bg-black/80 backdrop-blur-sm p-4 flex items-end" onClick={() => setShowFilters(false)}>
              <div className="bg-slate-900 border border-slate-700 rounded-t-3xl w-full max-w-lg mx-auto p-5 animate-in slide-in-from-bottom-10 duration-300" onClick={e => e.stopPropagation()}>
                  <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-6"></div>
                  <h2 className="font-bold text-xl mb-5">Filtres & Tri</h2>
                  
                  <div className="space-y-5">
                      <div>
                          <label className="text-sm font-bold text-slate-400 mb-2 block">Recherche</label>
                          <div className="relative">
                              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Titre d'un film..." className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-purple-500"/>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-sm font-bold text-slate-400 mb-2 block">Genre</label>
                              <select value={filters.genre ?? ''} onChange={e => setFilters({...filters, genre: e.target.value ? Number(e.target.value) : null})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-500">
                                  <option value="">Tous</option>
                                  {GENRES.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="text-sm font-bold text-slate-400 mb-2 block">Note min.</label>
                              <select value={filters.minVote} onChange={e => setFilters({...filters, minVote: Number(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-500">
                                  {[0, 5, 6, 7, 8].map(v => <option key={v} value={v}>{v === 0 ? 'Aucune' : `${v}/10`}</option>)}
                              </select>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-sm font-bold text-slate-400 mb-2 block">Année min.</label>
                              <input type="number" value={filters.minYear} onChange={e => setFilters({...filters, minYear: e.target.value})} placeholder="Ex: 1990" min="1900" max={currentYear} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-500"/>
                          </div>
                          <div>
                              <label className="text-sm font-bold text-slate-400 mb-2 block">Année max.</label>
                              <input type="number" value={filters.maxYear} onChange={e => setFilters({...filters, maxYear: e.target.value})} placeholder={`Ex: ${currentYear}`} min="1900" max={currentYear} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-500"/>
                          </div>
                      </div>

                      {activeTab === 'catalogue' && (
                          <div>
                              <label className="text-sm font-bold text-slate-400 mb-2 block">Trier par</label>
                              <div className="grid grid-cols-2 gap-3">
                                  <button onClick={() => setSortOption('newest')} className={`p-3 rounded-xl border flex items-center justify-center gap-2 ${sortOption === 'newest' ? 'bg-purple-500/20 border-purple-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}><ArrowDownWideNarrow size={16}/> Plus récents</button>
                                  <button onClick={() => setSortOption('oldest')} className={`p-3 rounded-xl border flex items-center justify-center gap-2 ${sortOption === 'oldest' ? 'bg-purple-500/20 border-purple-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}><ArrowUpNarrowWide size={16}/> Plus anciens</button>
                                  <button onClick={() => setSortOption('rating')} className={`p-3 rounded-xl border flex items-center justify-center gap-2 ${sortOption === 'rating' ? 'bg-purple-500/20 border-purple-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}><StarHalf size={16}/> Mieux notés</button>
                                  <button onClick={() => setSortOption('popularity.desc')} className={`p-3 rounded-xl border flex items-center justify-center gap-2 ${sortOption === 'popularity.desc' ? 'bg-purple-500/20 border-purple-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}><Trophy size={16}/> Populaires</button>
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-8">
                      <button onClick={resetFilters} className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-300 transition">Réinitialiser</button>
                      <button onClick={applyFilters} className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-900 rounded-xl font-black transition">Appliquer</button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 relative px-4 pt-4 pb-24">
        {activeTab === 'hub' && (
          <div className="animate-in fade-in duration-300">
            <div className="grid grid-cols-1 gap-4">
              <button onClick={() => setActiveTab('list-wishlist')} className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex items-center gap-4 active:scale-[0.98] transition">
                <div className="w-14 h-14 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0"><Popcorn size={28} className="text-yellow-500"/></div>
                <div className="text-left flex-1">
                  <p className="font-bold text-lg">À voir</p>
                  <p className="text-slate-400 text-sm">Ta watchlist personnelle</p>
                </div>
                <ChevronRight className="text-slate-600"/>
              </button>

              <button onClick={() => setActiveTab('list-history')} className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex items-center gap-4 active:scale-[0.98] transition">
                <div className="w-14 h-14 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0"><Eye size={28} className="text-green-500"/></div>
                <div className="text-left flex-1">
                  <p className="font-bold text-lg">Déjà vus</p>
                  <p className="text-slate-400 text-sm">Ton historique noté</p>
                </div>
                <ChevronRight className="text-slate-600"/>
              </button>

              <button onClick={() => setActiveTab('list-matches')} className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex items-center gap-4 active:scale-[0.98] transition">
                <div className="w-14 h-14 rounded-xl bg-pink-500/10 flex items-center justify-center shrink-0"><Heart size={28} className="text-pink-500 fill-pink-500"/></div>
                <div className="text-left flex-1">
                  <p className="font-bold text-lg">Nos Matchs</p>
                  <p className="text-slate-400 text-sm">Les films présents dans plusieurs wishlists</p>
                </div>
                <ChevronRight className="text-slate-600"/>
              </button>

              <button onClick={handleFileClick} className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex items-center gap-4 active:scale-[0.98] transition">
                <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0"><FileUp size={28} className="text-blue-500"/></div>
                <div className="text-left flex-1">
                  <p className="font-bold text-lg">Importer CSV</p>
                  <p className="text-slate-400 text-sm">Watchlist / Diary / Ratings</p>
                </div>
                <ChevronRight className="text-slate-600"/>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}

        {activeTab === 'cinematch' && (
          <div className="relative h-full animate-in fade-in duration-300">
            {loading && movies.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-slate-500">
                <Loader2 size={40} className="animate-spin mb-4" />
                <p>Chargement des cartes...</p>
              </div>
            ) : movies.length > 0 ? (
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
            ) : (
              <div className="h-full flex flex-col justify-center items-center text-center text-slate-500 px-8">
                <EyeOff size={48} className="mb-4" />
                <h2 className="font-bold text-xl text-slate-300 mb-2">Plus de films à te proposer</h2>
                <p className="text-sm mb-6">Relance une recherche ou change les filtres.</p>
                <button onClick={fetchDiscoverMovies} className="bg-yellow-500 text-slate-900 font-black px-6 py-3 rounded-xl">Recharger</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'catalogue' && (
          <div className="animate-in fade-in duration-300">
            {catalogueMovies.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {catalogueMovies.map(movie => (
                  <button key={movie.id} onClick={() => openMovieDetails(movie.id)} className="text-left active:scale-95 transition">
                    <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 shadow-lg">
                      {movie.poster_path ? <img src={movie.poster_path} alt={movie.title} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><Popcorn size={32} className="text-slate-600"/></div>}
                    </div>
                    <p className="font-bold text-sm mt-2 line-clamp-2 px-1">{movie.title}</p>
                    <p className="text-yellow-500 text-xs font-bold px-1">{movie.vote}/10</p>
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex justify-center py-6">
                <Loader2 className="animate-spin text-slate-400" />
              </div>
            )}

            {!loading && catalogueMovies.length > 0 && (
              <button onClick={() => fetchCatalogueMovies(cataloguePage + 1)} className="w-full mt-6 py-4 rounded-2xl bg-slate-800 border border-slate-700 font-bold active:scale-[0.98] transition">
                Charger plus
              </button>
            )}
          </div>
        )}

        {['list-wishlist', 'list-history', 'list-matches'].includes(activeTab) && (
          <div className="animate-in fade-in duration-300">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 size={32} className="animate-spin text-slate-400"/></div>
            ) : savedMovies.length > 0 ? (
              <div className="space-y-3">
                {savedMovies.map(movie => (
                  <button key={movie.id} onClick={() => openMovieDetails(movie.id)} className="w-full bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden flex text-left active:scale-[0.98] transition">
                    <div className="w-24 h-32 shrink-0 bg-slate-700">
                      {movie.poster_path ? <img src={movie.poster_path} alt={movie.title} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><Popcorn size={24} className="text-slate-500"/></div>}
                    </div>
                    <div className="flex-1 p-3 min-w-0">
                      <div className="flex justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-black line-clamp-2">{movie.title}</h3>
                          <p className="text-xs text-slate-400 mt-1">Note TMDB : {movie.vote}/10</p>
                          {movie.userRating !== undefined && movie.userRating !== null && (
                            <p className="text-xs text-yellow-500 font-bold mt-1">Ma note : {movie.userRating}/5</p>
                          )}
                          {movie.ratedAt && (
                            <p className="text-xs text-slate-500 mt-1">Le {movie.ratedAt}</p>
                          )}
                        </div>
                        {activeTab !== 'list-matches' && (
                          <button
                            onClick={(e) => handleDeleteClick(e, movie.title, movie.id)}
                            className="shrink-0 p-2 rounded-full bg-slate-700 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition self-start"
                          >
                            <Trash2 size={16}/>
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-2 line-clamp-2">{movie.overview || "Pas de résumé disponible."}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-500">
                <Library size={48} className="mx-auto mb-4"/>
                <p className="font-bold text-slate-300 mb-1">Liste vide</p>
                <p className="text-sm">Ajoute quelques films pour remplir cet espace.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {deleteModal.show && (
        <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteModal({ show: false, movieId: null, title: '' })}>
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-sm text-center animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={28} className="text-red-500"/>
            </div>
            <h2 className="text-xl font-black mb-2">Supprimer ce film ?</h2>
            <p className="text-slate-400 text-sm mb-6">"{deleteModal.title}" sera retiré de la liste.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setDeleteModal({ show: false, movieId: null, title: '' })} className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition">Annuler</button>
              <button onClick={confirmDelete} className="w-full py-3 bg-red-500 hover:bg-red-400 text-white rounded-xl font-black transition">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {selectedMovieId && (
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
      )}

      <nav className="p-2 pb-safe bg-slate-800 border-t border-slate-700 z-[900] shrink-0">
        <div className="flex justify-around items-center">
          <button onClick={() => setActiveTab('hub')} className={`nav-btn flex flex-col items-center transition ${['hub', 'list-wishlist', 'list-history', 'list-matches'].includes(activeTab) ? 'text-blue-500' : 'text-slate-400'}`}><Library size={24} /><span className="text-[10px] mt-1">Mes Listes</span></button>
          <button onClick={() => setActiveTab('cinematch')} className="relative -top-6"><div className={`p-4 rounded-full border-4 border-slate-900 transition ${activeTab === 'cinematch' ? 'bg-gradient-to-tr from-red-500 to-yellow-500 text-white shadow-lg shadow-red-500/20' : 'bg-slate-700 text-slate-400'}`}><Flame size={28} fill={activeTab === 'cinematch' ? "currentColor" : "none"} /></div></button>
          <button onClick={() => setActiveTab('catalogue')} className={`nav-btn flex flex-col items-center transition ${activeTab === 'catalogue' ? 'text-purple-500' : 'text-slate-400'}`}><LayoutGrid size={24} /><span className="text-[10px] mt-1">Catalogue</span></button>
        </div>
      </nav>
    </main>
  );
}