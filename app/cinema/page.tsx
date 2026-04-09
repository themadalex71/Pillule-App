// app/cinema/page.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home, Library, Popcorn, Flame, Loader2, LayoutGrid, SlidersHorizontal, Trash2, ChevronRight, Eye, Heart, FileUp, CircleOff } from 'lucide-react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import Papa from 'papaparse'; 

import { MovieBasic, MovieFull } from '@/features/cinema/types';
import FilterModal from '@/features/cinema/components/FilterModal';
import CineMatchCards from '@/features/cinema/components/CineMatchCards';
import MovieDetailsModal from '@/features/cinema/components/MovieDetailsModal';
import { getFirebaseAuth } from '@/lib/firebase/client';
import { getUserHousehold, type Household } from '@/lib/firebase/households';

export default function CinemaPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('cinematch');
  const [user, setUser] = useState<User | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isLoadingHousehold, setIsLoadingHousehold] = useState(true);
  const [authError, setAuthError] = useState('');
  const memberId = user?.uid || null;
  const hasHousehold = Boolean(household?.id);
  const isInsideListView = ['list-wishlist', 'list-history', 'list-dismissed', 'list-matches'].includes(activeTab);

  const [movies, setMovies] = useState<MovieBasic[]>([]);
  const [catalogueMovies, setCatalogueMovies] = useState<MovieBasic[]>([]);
  const [savedMovies, setSavedMovies] = useState<MovieBasic[]>([]);
  const [wishlistMovies, setWishlistMovies] = useState<MovieBasic[]>([]);
  const [historyMovies, setHistoryMovies] = useState<MovieBasic[]>([]);
  const [dismissedMovies, setDismissedMovies] = useState<MovieBasic[]>([]);
  const [discoverEmptyMessage, setDiscoverEmptyMessage] = useState<string>('');
  const [matchesEmptyMessage, setMatchesEmptyMessage] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [movieDetails, setMovieDetails] = useState<MovieFull | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isInHistory, setIsInHistory] = useState(false);
  const [needsRatingPrompt, setNeedsRatingPrompt] = useState(false);
  const [isSavingRating, setIsSavingRating] = useState(false);

  const [showMatchAnimation, setShowMatchAnimation] = useState(false);
  const [matchMemberNames, setMatchMemberNames] = useState<string[]>([]);
  
  const [deleteModal, setDeleteModal] = useState<{show: boolean, movieId: number | null, title: string}>({ 
      show: false, movieId: null, title: '' 
  });

  const [showFilters, setShowFilters] = useState(false);
  const [cataloguePage, setCataloguePage] = useState(1);
  const [sortOption, setSortOption] = useState('newest'); 
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isImporting, setIsImporting] = useState(false);
  const [isResettingLists, setIsResettingLists] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filters, setFilters] = useState({ genre: null as number | null, minYear: '', maxYear: '', minVote: 0 });

  const abortControllerRef = useRef<AbortController | null>(null);
  const matchAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const heartPetals = [
    { x: -150, y: -120, delay: 0 },
    { x: -120, y: -170, delay: 0.03 },
    { x: -70, y: -200, delay: 0.06 },
    { x: -20, y: -210, delay: 0.09 },
    { x: 40, y: -205, delay: 0.12 },
    { x: 95, y: -175, delay: 0.15 },
    { x: 145, y: -130, delay: 0.18 },
    { x: 165, y: -70, delay: 0.21 },
    { x: 150, y: -10, delay: 0.24 },
    { x: 105, y: 35, delay: 0.27 },
    { x: 45, y: 55, delay: 0.3 },
    { x: -10, y: 60, delay: 0.33 },
    { x: -70, y: 45, delay: 0.36 },
    { x: -120, y: 10, delay: 0.39 },
    { x: -155, y: -45, delay: 0.42 },
  ];
  const fireworkRockets = [
    { launchX: '14%', rise: 340, drift: 26, d: 0, c: '#f472b6' },
    { launchX: '86%', rise: 360, drift: -28, d: 0.08, c: '#22d3ee' },
    { launchX: '48%', rise: 380, drift: 10, d: 0.16, c: '#f59e0b' },
    { launchX: '28%', rise: 300, drift: 18, d: 0.24, c: '#a78bfa' },
    { launchX: '72%', rise: 320, drift: -16, d: 0.3, c: '#34d399' },
    { launchX: '58%', rise: 300, drift: -10, d: 0.36, c: '#fb7185' },
  ];
  const clapExplosionBaseDelay = 1.55;

  const getMemberDisplayName = (uid: string) =>
    household?.members.find((member) => member.uid === uid)?.displayName || 'Membre';

  const triggerMatchVibration = () => {
    if (typeof navigator === 'undefined') return;
    if (!('vibrate' in navigator)) return;
    navigator.vibrate([70, 40, 110]);
  };

  const playMatchClapSound = () => {
    if (typeof window === 'undefined') return;

    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;

      const ctx = audioContextRef.current || new Ctx();
      audioContextRef.current = ctx;
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }

      const now = ctx.currentTime + 0.01;

      const noiseDuration = 0.11;
      const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * noiseDuration), ctx.sampleRate);
      const channelData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < channelData.length; i += 1) {
        channelData[i] = (Math.random() * 2 - 1) * (1 - i / channelData.length);
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.001, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.8, now + 0.008);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDuration);
      noiseSource.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseSource.start(now);
      noiseSource.stop(now + noiseDuration);

      const body = ctx.createOscillator();
      body.type = 'triangle';
      body.frequency.setValueAtTime(185, now);
      body.frequency.exponentialRampToValueAtTime(95, now + 0.12);
      const bodyGain = ctx.createGain();
      bodyGain.gain.setValueAtTime(0.001, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      body.connect(bodyGain);
      bodyGain.connect(ctx.destination);
      body.start(now);
      body.stop(now + 0.14);
    } catch (error) {
      console.error('Impossible de jouer le son de match:', error);
    }
  };

  const fetchWithAuth = async (input: RequestInfo | URL, init?: RequestInit) => {
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('Utilisateur non connecte.');
    }

    const token = await currentUser.getIdToken();
    return fetch(input, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
  };

  const loadHousehold = async (uid: string) => {
    setIsLoadingHousehold(true);
    setAuthError('');
    try {
      const householdData = await getUserHousehold(uid);
      setHousehold(householdData);
    } catch (error) {
      console.error(error);
      setAuthError("Impossible de charger ton foyer.");
      setHousehold(null);
    } finally {
      setIsLoadingHousehold(false);
    }
  };

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (!nextUser || !nextUser.emailVerified) {
        router.replace('/');
        return;
      }

      setUser(nextUser);
      setAuthReady(true);
      void loadHousehold(nextUser.uid);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    return () => {
      if (matchAnimationTimeoutRef.current) {
        clearTimeout(matchAnimationTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!authReady || isLoadingHousehold || !memberId) {
      return;
    }

    if (activeTab === 'cinematch' && movies.length === 0) fetchDiscoverMovies();
    if (activeTab === 'catalogue' && catalogueMovies.length === 0) fetchCatalogueMovies(1, true);

    if (activeTab === 'list-wishlist') fetchSavedList('wishlist');
    else if (activeTab === 'list-history') fetchSavedList('history');
    else if (activeTab === 'list-dismissed') fetchSavedList('dismissed');
    else if (activeTab === 'list-matches') fetchMatchesList();

    if (activeTab === 'cinematch' || activeTab === 'catalogue') {
      fetchSavedList('wishlist', true);
      fetchSavedList('history', true);
      fetchSavedList('dismissed', true);
    }
  }, [activeTab, authReady, isLoadingHousehold, memberId]);

  useEffect(() => {
    if (activeTab === 'catalogue') fetchCatalogueMovies(1, true);
  }, [sortOption]);

  useEffect(() => {
    if (activeTab === 'catalogue') {
        if (searchQuery === '') {
            fetchCatalogueMovies(1, true, '');
            return;
        }
        const delayDebounceFn = setTimeout(() => { fetchCatalogueMovies(1, true, searchQuery); }, 500);
        return () => clearTimeout(delayDebounceFn);
    }
  }, [searchQuery]);

  const handleFileClick = () => fileInputRef.current?.click();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
        const fileName = file.name.toLowerCase();
        let targetListType: 'wishlist' | 'history' | null = null;

        if (fileName.includes('ratings') || fileName.includes('diary') || fileName.includes('watched')) targetListType = 'history'; 
        else if (fileName.includes('watchlist')) targetListType = 'wishlist'; 
        else return;

        const resolvedListType = targetListType;

        setIsImporting(true);

        Papa.parse(file, {
            header: true, skipEmptyLines: true,
            complete: async (results: any) => await processImport(results.data, resolvedListType, fileName)
        });
    });
  };

  const processImport = async (rows: any[], listType: 'wishlist' | 'history', sourceFileName: string) => {
    if (!memberId) return;
    setImportProgress(prev => ({ current: prev?.current || 0, total: (prev?.total || 0) + rows.length }));
    let count = 0;

    for (const row of rows) {
        const title = row.Name || row.Title;
        const year = row.Year;
        const importedRating = row.Rating ? parseFloat(row.Rating) : null;
        const watchedDate = row.Date || row['Watched Date'];

        if (title && year) {
            try {
                await fetchWithAuth('/api/cinema', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'import', title, year, userRating: importedRating, watchedDate, listType })
                });
            } catch (e) { console.error('Erreur import', title, e); }
        }

        count++;
        setImportProgress(prev => prev ? { current: prev.current + 1, total: prev.total } : { current: 1, total: rows.length });
    }

    alert(`Importation de ${sourceFileName} terminée ! (${count} films traités)`);
    if (activeTab === `list-${listType}`) fetchSavedList(listType);
    setIsImporting(false);
    setImportProgress(null);
  };

  const fetchDiscoverMovies = async () => {
    if (!memberId) return;
    setLoading(true);
    setDiscoverEmptyMessage('');
    try {
      let url = '/api/cinema/discover?mode=cinematch';
      if (filters.genre) url += `&genre=${filters.genre}`;
      if (filters.minYear) url += `&minYear=${filters.minYear}`;
      if (filters.maxYear) url += `&maxYear=${filters.maxYear}`;
      if (filters.minVote > 0) url += `&minVote=${filters.minVote}`;

      const [resTmdb, resWishlist, resHistory, resDismissed] = await Promise.all([
          fetch(url),
          fetchWithAuth(`/api/cinema?action=list&listType=wishlist`),
          fetchWithAuth(`/api/cinema?action=list&listType=history`),
          fetchWithAuth(`/api/cinema?action=list&listType=dismissed`)
      ]);

      const tmdbData = await resTmdb.json();
      const wishlistData = (await resWishlist.json()).list || [];
      const historyData = (await resHistory.json()).list || [];
      const dismissedData = (await resDismissed.json()).list || [];

      setWishlistMovies(wishlistData);
      setHistoryMovies(historyData);
      setDismissedMovies(dismissedData);

      if (Array.isArray(tmdbData)) {
          const excludedIds = new Set([
            ...wishlistData.map((m: any) => m.id),
            ...historyData.map((m: any) => m.id),
            ...dismissedData.map((m: any) => m.id),
          ]);
          const filteredMovies = tmdbData.filter((movie: MovieBasic) => !excludedIds.has(movie.id));
          setMovies(filteredMovies);

          if (tmdbData.length === 0) {
            setDiscoverEmptyMessage("Aucun film ne correspond a ces filtres.");
          } else if (filteredMovies.length === 0) {
            setDiscoverEmptyMessage("Tous les films trouves sont deja dans tes listes ou dans 'Pas envie'.");
          }
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchCatalogueMovies = async (page: number, reset = false, queryOverride?: string) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const newController = new AbortController();
    abortControllerRef.current = newController;

    if (reset) setCatalogueMovies([]);
    setLoading(true);
    
    try {
      let url = `/api/cinema/discover?mode=catalogue&page=${page}&sortBy=${sortOption}`;
      const queryToUse = queryOverride !== undefined ? queryOverride : searchQuery;

      if (queryToUse.trim() !== '') url += `&query=${encodeURIComponent(queryToUse)}`;
      if (filters.genre) url += `&genre=${filters.genre}`;
      if (filters.minYear) url += `&minYear=${filters.minYear}`;
      if (filters.maxYear) url += `&maxYear=${filters.maxYear}`;
      if (filters.minVote > 0) url += `&minVote=${filters.minVote}`;

      const res = await fetch(url, { signal: newController.signal });
      const data = await res.json();
      
      if (Array.isArray(data)) {
          if (reset) { setCatalogueMovies(data); setCataloguePage(1); } 
          else { setCatalogueMovies(prev => [...prev, ...data]); setCataloguePage(page); }
      }
    } catch (error: any) { 
        if (error.name !== 'AbortError') console.error(error); 
    } finally { 
        if (abortControllerRef.current === newController) { setLoading(false); abortControllerRef.current = null; }
    }
  };

  const applyFilters = () => {
      setShowFilters(false); 
      setDiscoverEmptyMessage('');
      if (activeTab === 'cinematch') { setMovies([]); fetchDiscoverMovies(); } 
      else if (activeTab === 'catalogue') { fetchCatalogueMovies(1, true); }
  };

  const resetFilters = () => setFilters({ genre: null, minYear: '', maxYear: '', minVote: 0 });

  const syncCachedList = (type: 'wishlist' | 'history' | 'dismissed', list: MovieBasic[]) => {
    if (type === 'wishlist') setWishlistMovies(list);
    else if (type === 'history') setHistoryMovies(list);
    else setDismissedMovies(list);
  };

  const fetchSavedList = async (type: 'wishlist' | 'history' | 'dismissed', silent = false) => {
    if (!memberId) return;
    if (!silent) setLoading(true);
    if (!silent) setSavedMovies([]);
    try {
      const res = await fetchWithAuth(`/api/cinema?action=list&listType=${type}`);
      if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`);
      const data = await res.json();
      console.log(`[DEBUG] Films récupérés pour ${type}:`, data);
      const list = data.list || [];
      syncCachedList(type, list);
      if (!silent) setSavedMovies(list);
    } catch (e) { 
      console.error("[DEBUG] Erreur fetchSavedList:", e);
      alert(`Erreur de connexion à l'API Cinéma (${type}) ! Regarde la console (F12).`);
    } finally { if (!silent) setLoading(false); }
  };

  const fetchMatchesList = async () => {
      if (!memberId) return;
      setLoading(true); setSavedMovies([]);
      try {
          const res = await fetchWithAuth(`/api/cinema?action=matches`);
          if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`);
          const data = await res.json();
          console.log('[DEBUG] Matchs recuperes:', data);
          setSavedMovies(data.matches || []);
          if (data.matchesDisabled) {
            setMatchesEmptyMessage('Le mode Match est disponible apres avoir rejoint un foyer.');
          } else {
            setMatchesEmptyMessage('');
          }
      } catch (e) {
          console.error('[DEBUG] Erreur fetchMatchesList:', e);
          alert('Erreur de connexion a l\'API Matchs ! Regarde la console (F12).');
          setMatchesEmptyMessage('');
      } finally { setLoading(false); }
  };

  const saveMovie = async (movie: MovieBasic, listType: 'wishlist' | 'history' | 'dismissed', userRating?: number) => {
      if (!memberId) return null;
      try {
        const movieToSave = {
          ...movie, userRating: userRating ?? movie.userRating ?? null, ratedAt: userRating ? new Date().toLocaleDateString('fr-FR') : movie.ratedAt ?? null,
        };
        const res = await fetchWithAuth('/api/cinema', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save', movie: movieToSave, listType })
        });
        const data = await res.json();
        if (Array.isArray(data.list)) syncCachedList(listType, data.list);
        if (data.isMatch && listType === 'wishlist') {
          const names = Array.isArray(data.matchedMemberIds)
            ? data.matchedMemberIds
                .filter((uid: string) => uid !== memberId)
                .map((uid: string) => getMemberDisplayName(uid))
            : [];
          setMatchMemberNames(names);
          playMatchClapSound();
          triggerMatchVibration();
          setShowMatchAnimation(true);
          if (matchAnimationTimeoutRef.current) {
            clearTimeout(matchAnimationTimeoutRef.current);
          }
          matchAnimationTimeoutRef.current = setTimeout(() => {
            setShowMatchAnimation(false);
            setMatchMemberNames([]);
          }, 3200);
        }
        return data.list || [];
      } catch (error) { console.error(error); }
      return null;
  };

  const handleDeleteClick = (e: React.MouseEvent, movieTitle: string, movieId: number) => {
      e.stopPropagation(); e.preventDefault(); setDeleteModal({ show: true, movieId: movieId, title: movieTitle });
  };

  const confirmDelete = async () => {
    if (!deleteModal.movieId) return;

    const listType =
      activeTab === 'list-history'
        ? 'history'
        : activeTab === 'list-dismissed'
          ? 'dismissed'
        : 'wishlist';

    await deleteMovie(deleteModal.movieId, listType);
    setDeleteModal({ show: false, movieId: null, title: '' });
  };

  const deleteMovie = async (movieId: number, listType: 'wishlist' | 'history' | 'dismissed' = 'wishlist') => {
    if (!memberId) return;
    const typeToSend = activeTab === 'list-matches' ? 'wishlist' : listType;

    if (['list-wishlist', 'list-history', 'list-dismissed', 'list-matches'].includes(activeTab)) setSavedMovies(prev => prev.filter(m => m.id !== movieId));
    const sourceList =
      listType === 'wishlist' ? wishlistMovies :
      listType === 'history' ? historyMovies :
      dismissedMovies;
    syncCachedList(listType, sourceList.filter(m => m.id !== movieId));
    try {
        const res = await fetchWithAuth('/api/cinema', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', movieId, listType: typeToSend })
        });
        const data = await res.json();
        if (Array.isArray(data.list)) syncCachedList(listType, data.list);
    } catch (error) { fetchSavedList(listType); }
  };

  const handleResetLists = async () => {
    if (!memberId || isResettingLists) return;

    const confirmed = window.confirm("Tu veux vraiment supprimer toutes tes listes cinema (A voir + Deja vus + Pas envie) ?");
    if (!confirmed) return;

    setIsResettingLists(true);
    try {
      const res = await fetchWithAuth('/api/cinema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Reset impossible');
      }

      setWishlistMovies([]);
      setHistoryMovies([]);
      setDismissedMovies([]);
      if (['list-wishlist', 'list-history', 'list-dismissed', 'list-matches'].includes(activeTab)) {
        setSavedMovies([]);
      }
      if (activeTab === 'list-matches') {
        await fetchMatchesList();
      }
    } catch (error) {
      console.error(error);
      alert("Impossible de reset les listes cinema.");
    } finally {
      setIsResettingLists(false);
    }
  };

  const toggleWishlist = async () => {
    if (!movieDetails) return;
    if (isInWishlist) {
        await deleteMovie(movieDetails.id, 'wishlist'); setIsInWishlist(false); setSavedMovies(prev => prev.filter(m => m.id !== movieDetails.id));
    } else {
        await saveMovie(movieDetails, 'wishlist'); setIsInWishlist(true); if (activeTab === 'list-wishlist') setSavedMovies(prev => [movieDetails, ...prev.filter(m => m.id !== movieDetails.id)]);
    }
  };

  const promptWatchedRating = async () => {
    if (!movieDetails) return;

    if (isInHistory) {
      setNeedsRatingPrompt(false);
      setIsSavingRating(true);

      await deleteMovie(movieDetails.id, 'history');

      setMovieDetails({
        ...movieDetails,
        userRating: null,
        ratedAt: null,
      });
      setRating(0);
      setIsInHistory(false);

      if (activeTab === 'list-history') {
        setSavedMovies(prev => prev.filter(m => m.id !== movieDetails.id));
      }

      setIsSavingRating(false);
      return;
    }

    setNeedsRatingPrompt(true);
  };

  const saveRatingAndMoveToHistory = async (selectedRating: number) => {
      if (!movieDetails) return;

      setRating(selectedRating);
      setNeedsRatingPrompt(false);
      setIsSavingRating(true);

      const historyList = await saveMovie(
        {
          ...movieDetails,
          userRating: selectedRating,
          ratedAt: new Date().toLocaleDateString('fr-FR'),
        },
        'history',
        selectedRating
      );

      await deleteMovie(movieDetails.id, 'wishlist');

      const updatedMovie = {
        ...movieDetails,
        userRating: selectedRating,
        ratedAt: new Date().toLocaleDateString('fr-FR'),
      };

      setMovieDetails(updatedMovie);
      setIsInHistory(true);
      setIsInWishlist(false);

      if (activeTab === 'list-history' && Array.isArray(historyList)) {
        setSavedMovies(historyList);
      } else if (activeTab === 'list-wishlist') {
        setSavedMovies(prev => prev.filter(m => m.id !== movieDetails.id));
      }

      setIsSavingRating(false);
  };

  const handleRatingSelect = async (selectedRating: number) => {
      await saveRatingAndMoveToHistory(selectedRating);
  };

  const onSwipe = (direction: string, movie: MovieBasic) => {
    if (direction === 'right') { saveMovie(movie, 'wishlist'); setSavedMovies(prev => [...prev, movie]); }
    if (direction === 'left') { saveMovie(movie, 'dismissed'); }
    setTimeout(() => { setMovies((prev) => prev.filter(m => m.id !== movie.id)); }, 200);
  };

  const openMovieDetails = async (id: number) => {
    setSelectedMovieId(id); setLoadingDetails(true);
    const wishlistMovie = wishlistMovies.find(m => m.id === id);
    const historyMovie = historyMovies.find(m => m.id === id);

    setIsInWishlist(Boolean(wishlistMovie) || activeTab === 'list-matches');
    setIsInHistory(Boolean(historyMovie));
    setNeedsRatingPrompt(false);
    setRating(historyMovie?.userRating || wishlistMovie?.userRating || 0);
    try {
      const res = await fetch(`/api/cinema/details?id=${id}`);
      const details = await res.json();
      setMovieDetails({
        ...details,
        userRating: historyMovie?.userRating || wishlistMovie?.userRating || null,
        ratedAt: historyMovie?.ratedAt || wishlistMovie?.ratedAt || null,
      });
    } catch (error) { console.error(error); } finally { setLoadingDetails(false); }
  };

  const closeModale = () => {
    setSelectedMovieId(null);
    setMovieDetails(null);
    setRating(0);
    setIsInWishlist(false);
    setIsInHistory(false);
    setNeedsRatingPrompt(false);
    setIsSavingRating(false);
  };

  if (!authReady || isLoadingHousehold) {
    return (
      <main className="h-[100dvh] bg-[#fcf7f2] text-[#4b3d6d] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={36} className="animate-spin mx-auto mb-3 text-[#8d82a8]" />
          <p className="text-sm text-[#8d82a8]">Chargement de ta session...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="h-[100dvh] bg-[#fcf7f2] text-[#4b3d6d] flex items-center justify-center p-6">
        <div className="max-w-sm w-full rounded-[1.8rem] border border-[#eee5dc] bg-white p-6 text-center shadow-[0_12px_30px_rgba(111,98,143,0.08)]">
          <p className="font-bold text-lg mb-2">Connexion requise</p>
          <p className="text-sm text-[#8d82a8] mb-5">{authError || "Reconnecte-toi pour continuer."}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 rounded-2xl bg-[#ef9a79] text-white font-semibold"
          >
            Retour a l'accueil
          </button>
        </div>
      </main>
    );
  }

  const matchLabel = matchMemberNames.length > 0 ? matchMemberNames.join(', ') : 'un membre de ton foyer';
  const animatedMatchText = `Avec ${matchLabel}`;

  return (
    <main className="h-[100dvh] bg-[#fcf7f2] text-[#4b3d6d] flex flex-col relative overflow-hidden">
      
      {showMatchAnimation && (
        <div className="fixed inset-0 z-[1000] bg-black/92 backdrop-blur-sm animate-in fade-in duration-300">
            <style jsx>{`
                @keyframes clap-board-top {
                  0% { transform: rotate(-24deg) translate(-10px, -8px); }
                  42% { transform: rotate(-24deg) translate(-10px, -8px); }
                  56% { transform: rotate(3deg) translate(0, 0); }
                  63% { transform: rotate(0deg) translate(0, 0); }
                  100% { transform: rotate(0deg) translate(0, 0); }
                }
                @keyframes clap-flash {
                  0%, 55% { opacity: 0; transform: scale(0.55); }
                  60% { opacity: 0.9; transform: scale(1.08); }
                  100% { opacity: 0; transform: scale(1.8); }
                }
                @keyframes burst-heart {
                  0%, 48% { transform: translate(0, 0) scale(0); opacity: 0; }
                  60% { transform: translate(0, 0) scale(1.65); opacity: 1; }
                  100% { transform: translate(var(--tx), var(--ty)) scale(0.18); opacity: 0; }
                }
                @keyframes rocket-rise {
                  0% { opacity: 0; transform: translate(0, 0) scale(0.45); }
                  10% { opacity: 1; }
                  100% { opacity: 0; transform: translate(var(--drift), var(--rise)) scale(0.95); }
                }
                @keyframes rocket-trail {
                  0% { opacity: 0; transform: translate(0, 0) scaleY(0.2); }
                  20% { opacity: 0.9; }
                  100% { opacity: 0; transform: translate(var(--drift), var(--rise)) scaleY(1.2); }
                }
                @keyframes shell-ring {
                  0%, 58% { opacity: 0; transform: scale(0.3); }
                  68% { opacity: 0.95; transform: scale(0.55); }
                  100% { opacity: 0; transform: scale(2.1); }
                }
                @keyframes shell-spark {
                  0%, 60% { opacity: 0; transform: translate(0, 0) scale(0.2); }
                  70% { opacity: 1; transform: translate(0, 0) scale(1); }
                  100% { opacity: 0; transform: translate(var(--sx), var(--sy)) scale(0.65); }
                }
                @keyframes match-copy {
                  0%, 58% { opacity: 0; transform: translateY(18px) scale(0.92); }
                  74% { opacity: 1; transform: translateY(0) scale(1.03); }
                  100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes letter-gold-reveal {
                  0% { opacity: 0; transform: translateY(7px) scale(0.92); filter: blur(1px); }
                  75% { opacity: 1; transform: translateY(0) scale(1.04); filter: blur(0); }
                  100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
                }
            `}</style>
            <div className="relative h-[100dvh] w-full overflow-hidden">
              <div className="absolute left-1/2 top-[52%] h-[82dvh] w-[92vw] max-w-[28rem] -translate-x-1/2 -translate-y-1/2">
                <div
                  className="pointer-events-none absolute left-1/2 top-[40.5%] z-[55] h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full mix-blend-screen"
                  style={{
                    background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,222,134,0.62) 28%, rgba(255,119,198,0.24) 52%, rgba(0,0,0,0) 78%)',
                    animation: 'clap-flash 0.95s ease-out forwards',
                    animationDelay: `${clapExplosionBaseDelay}s`,
                  }}
                />

                <div className="pointer-events-none absolute inset-0 z-[60] mix-blend-screen">
                  {fireworkRockets.map((rocket, rocketIndex) => (
                    <div key={`rocket-${rocket.launchX}-${rocketIndex}`} className="absolute bottom-[8%]" style={{ left: rocket.launchX }}>
                      <span
                        className="absolute left-0 top-0 h-14 w-[2px] -translate-x-1/2 bg-white/80"
                        style={{
                          boxShadow: `0 0 16px ${rocket.c}`,
                          animation: 'rocket-trail 0.92s ease-in forwards',
                          animationDelay: `${clapExplosionBaseDelay + rocket.d}s`,
                          ['--drift' as any]: `${rocket.drift}px`,
                          ['--rise' as any]: `${-rocket.rise}px`,
                        }}
                      />
                      <span
                        className="absolute left-0 top-0 h-3 w-3 -translate-x-1/2 rounded-full"
                        style={{
                          backgroundColor: rocket.c,
                          boxShadow: `0 0 16px ${rocket.c}`,
                          animation: 'rocket-rise 0.92s ease-in forwards',
                          animationDelay: `${clapExplosionBaseDelay + rocket.d}s`,
                          ['--drift' as any]: `${rocket.drift}px`,
                          ['--rise' as any]: `${-rocket.rise}px`,
                        }}
                      />
                      <div
                        className="absolute left-0 top-0 -translate-x-1/2"
                        style={{
                          transform: `translate(${rocket.drift}px, ${-rocket.rise}px)`,
                        }}
                      >
                        <span
                          className="absolute left-0 top-0 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                          style={{
                            borderColor: `${rocket.c}99`,
                            animation: 'shell-ring 1.15s ease-out forwards',
                            animationDelay: `${clapExplosionBaseDelay + rocket.d}s`,
                          }}
                        />
                        {Array.from({ length: 20 }).map((_, rayIndex) => {
                          const angle = (Math.PI * 2 * rayIndex) / 20;
                          const radius = 72 + (rayIndex % 5) * 16;
                          const sx = Math.cos(angle) * radius;
                          const sy = Math.sin(angle) * radius;
                          return (
                            <span
                              key={`shell-${rocketIndex}-${rayIndex}`}
                              className="absolute left-0 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                              style={{
                                backgroundColor: rocket.c,
                                boxShadow: `0 0 14px ${rocket.c}`,
                                animation: 'shell-spark 1.05s ease-out forwards',
                                animationDelay: `${clapExplosionBaseDelay + rocket.d + rayIndex * 0.005}s`,
                                ['--sx' as any]: `${sx}px`,
                                ['--sy' as any]: `${sy}px`,
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="absolute left-1/2 top-[40.5%] z-[58] -translate-x-1/2 -translate-y-1/2">
                  {heartPetals.map((petal, index) => (
                    <span
                      key={`${petal.x}-${petal.y}-${index}`}
                      className="absolute left-0 top-0 text-[2.2rem] text-pink-400"
                      style={{
                        animation: `burst-heart 1.7s ease-out forwards`,
                        animationDelay: `${clapExplosionBaseDelay + petal.delay}s`,
                        ['--tx' as any]: `${petal.x * 1.1}px`,
                        ['--ty' as any]: `${petal.y * 1.15}px`,
                      }}
                    >
                      &hearts;
                    </span>
                  ))}
                </div>

                <div className="absolute left-1/2 top-[53%] z-20 h-[34dvh] min-h-[16rem] w-[88vw] max-w-[25rem] -translate-x-1/2 -translate-y-1/2 rounded-[1.9rem] border-[5px] border-slate-100 bg-gradient-to-br from-[#0a1432] to-[#111827] shadow-[0_28px_70px_rgba(0,0,0,0.6)]">
                  <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                    <Heart size={42} className="mt-3 text-pink-500 fill-pink-500" />
                    <p className="mt-2 text-[2.3rem] font-black leading-none text-white">MATCH !</p>
                    <p className="mt-4 text-[1.03rem] font-semibold">
                      {Array.from(animatedMatchText).map((char, index) => (
                        <span
                          key={`match-letter-${index}-${char}`}
                          className="inline-block text-[#f6d37a]"
                          style={{
                            opacity: 0,
                            textShadow: '0 0 8px rgba(246,211,122,0.45), 0 0 18px rgba(231,175,62,0.28)',
                            animation: 'letter-gold-reveal 0.48s ease-out forwards',
                            animationDelay: `${clapExplosionBaseDelay + 0.18 + index * 0.035 + (index % 4) * 0.012}s`,
                          }}
                        >
                          {char === ' ' ? '\u00A0' : char}
                        </span>
                      ))}
                    </p>
                  </div>
                </div>

                <div className="absolute left-1/2 top-[30.8%] z-30 h-[10.5dvh] min-h-[4.4rem] w-[88vw] max-w-[25rem] -translate-x-1/2">
                  <div
                    className="relative h-full w-full origin-[12%_100%] rounded-2xl border-[5px] border-slate-100 bg-slate-200 shadow-2xl"
                    style={{ animation: 'clap-board-top 3.2s ease-in-out forwards' }}
                  >
                    <div className="grid h-full grid-cols-8 overflow-hidden rounded-[0.72rem]">
                      <div className="bg-slate-900"></div>
                      <div className="bg-slate-200"></div>
                      <div className="bg-slate-900"></div>
                      <div className="bg-slate-200"></div>
                      <div className="bg-slate-900"></div>
                      <div className="bg-slate-200"></div>
                      <div className="bg-slate-900"></div>
                      <div className="bg-slate-200"></div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="rounded-full bg-slate-900/85 px-5 py-1 text-[0.8rem] font-bold uppercase tracking-[0.32em] text-white">CineMatch</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
        </div>
      )}

      <div className="px-4 pt-safe shrink-0 z-10 bg-[#fcf7f2]">
        <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
                {isInsideListView ? (
                  <button onClick={() => setActiveTab('hub')} className="p-2 rounded-full border border-[#ece4f7] bg-white text-[#6f628f] active:scale-95 transition">
                    <ArrowLeft size={20}/>
                  </button>
                ) : (
                  <Link href="/" className="p-2 rounded-full border border-[#ece4f7] bg-white text-[#6f628f] active:scale-95 transition" aria-label="Menu HarmoHome">
                    <Home size={20}/>
                  </Link>
                )}
                <div className="flex items-center">
                    <h1 className="text-xl font-semibold text-[#4b3d6d] tracking-[-0.02em]">
                    {activeTab === 'cinematch' && <><Flame className="inline text-[#ef9a79] mr-2" fill="currentColor"/>CineMatch</>}
                    {activeTab === 'hub' && <><Library className="text-[#7f68b7] inline mr-2"/>Mes Listes</>}
                    {activeTab === 'catalogue' && <><LayoutGrid className="text-[#7f68b7] inline mr-2"/>Catalogue</>}
                    {activeTab === 'list-wishlist' && <><Popcorn className="text-[#d4a642] inline mr-2"/>A voir</>}
                    {activeTab === 'list-history' && <><Eye className="text-[#4fa070] inline mr-2"/>Deja vus</>}
                    {activeTab === 'list-dismissed' && <><CircleOff className="text-[#d2778b] inline mr-2"/>Pas envie</>}
                    {activeTab === 'list-matches' && <><Heart className="text-[#d27295] fill-[#d27295] inline mr-2"/>Nos Matchs</>}
                    </h1>
                    {(activeTab === 'cinematch' || activeTab === 'catalogue') && (
                        <button onClick={() => setShowFilters(true)} className={`ml-2 p-2 rounded-full border transition ${showFilters || (filters.genre || filters.minYear) ? 'bg-[#ef9a79] border-[#ef9a79] text-white' : 'bg-white border-[#ece4f7] text-[#8d82a8] hover:text-[#6f628f]'}`}><SlidersHorizontal size={18} /></button>
                    )}
                </div>
            </div>
            <div />
        </div>
      </div>

      {isImporting && (
          <div className="fixed inset-0 z-[1000] bg-[rgba(252,247,242,0.96)] backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center text-[#4b3d6d]">
              <Loader2 size={48} className="animate-spin text-[#ef9a79] mb-4"/>
              <h2 className="text-xl font-semibold mb-2">Importation en cours.</h2>
              <p className="text-[#8d82a8] mb-4">Ne quitte pas cette page.</p>
              <div className="w-full max-w-xs bg-white rounded-full h-4 overflow-hidden border border-[#ece4f7]">
                  <div className="bg-[#ef9a79] h-full transition-all duration-200" style={{ width: `${(((importProgress?.current || 0) / (importProgress?.total || 1)) * 100)}%` }}></div>
              </div>
              <p className="mt-2 text-xs font-mono">{importProgress?.current || 0} / {importProgress?.total || 0} films</p>
          </div>
      )}

      {/* COMPOSANT FILTRES */}
      <FilterModal showFilters={showFilters} setShowFilters={setShowFilters} activeTab={activeTab} searchQuery={searchQuery} setSearchQuery={setSearchQuery} filters={filters} setFilters={setFilters} sortOption={sortOption} setSortOption={setSortOption} applyFilters={applyFilters} resetFilters={resetFilters} />

      <div className="flex-1 overflow-y-auto min-h-0 relative px-4 pt-4 pb-24">
        {activeTab === 'hub' && (
          <div className="animate-in fade-in duration-300">
            <div className="grid grid-cols-1 gap-4">
              <button onClick={() => setActiveTab('list-wishlist')} className="bg-white p-4 rounded-[1.6rem] border border-[#eee5dc] shadow-[0_10px_22px_rgba(111,98,143,0.08)] flex items-center gap-4 active:scale-[0.98] transition"><div className="w-14 h-14 rounded-xl bg-[#fff6de] flex items-center justify-center shrink-0"><Popcorn size={28} className="text-[#d4a642]"/></div><div className="text-left flex-1"><p className="font-semibold text-lg text-[#4b3d6d]">A voir</p><p className="text-[#8d82a8] text-sm">Ta watchlist personnelle</p></div><ChevronRight className="text-[#b9accf]"/></button>
              <button onClick={() => setActiveTab('list-history')} className="bg-white p-4 rounded-[1.6rem] border border-[#eee5dc] shadow-[0_10px_22px_rgba(111,98,143,0.08)] flex items-center gap-4 active:scale-[0.98] transition"><div className="w-14 h-14 rounded-xl bg-[#e9f8ef] flex items-center justify-center shrink-0"><Eye size={28} className="text-[#4fa070]"/></div><div className="text-left flex-1"><p className="font-semibold text-lg text-[#4b3d6d]">Deja vus</p><p className="text-[#8d82a8] text-sm">Ton historique note</p></div><ChevronRight className="text-[#b9accf]"/></button>
              <button onClick={() => setActiveTab('list-dismissed')} className="bg-white p-4 rounded-[1.6rem] border border-[#eee5dc] shadow-[0_10px_22px_rgba(111,98,143,0.08)] flex items-center gap-4 active:scale-[0.98] transition"><div className="w-14 h-14 rounded-xl bg-[#fdeef2] flex items-center justify-center shrink-0"><CircleOff size={28} className="text-[#d2778b]"/></div><div className="text-left flex-1"><p className="font-semibold text-lg text-[#4b3d6d]">Pas envie</p><p className="text-[#8d82a8] text-sm">Les films ignores en CineMatch</p></div><ChevronRight className="text-[#b9accf]"/></button>
              <button
                onClick={() => hasHousehold && setActiveTab('list-matches')}
                disabled={!hasHousehold}
                className={`p-4 rounded-[1.6rem] border flex items-center gap-4 transition ${
                  hasHousehold
                    ? 'bg-white border-[#eee5dc] shadow-[0_10px_22px_rgba(111,98,143,0.08)] active:scale-[0.98]'
                    : 'bg-[#f7f2ec] border-[#eee5dc] opacity-70 cursor-not-allowed'
                }`}
              >
                <div className="w-14 h-14 rounded-xl bg-[#fdeef7] flex items-center justify-center shrink-0"><Heart size={28} className="text-[#d27295] fill-[#d27295]"/></div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-lg text-[#4b3d6d]">Nos Matchs</p>
                  <p className="text-[#8d82a8] text-sm">
                    {hasHousehold ? 'Les films presents dans plusieurs wishlists' : 'Rejoins un foyer pour activer cette fonctionnalite'}
                  </p>
                </div>
                <ChevronRight className="text-[#b9accf]"/>
              </button>
              <button onClick={handleFileClick} className="bg-white p-4 rounded-[1.6rem] border border-[#eee5dc] shadow-[0_10px_22px_rgba(111,98,143,0.08)] flex items-center gap-4 active:scale-[0.98] transition"><div className="w-14 h-14 rounded-xl bg-[#eaf2ff] flex items-center justify-center shrink-0"><FileUp size={28} className="text-[#7298de]"/></div><div className="text-left flex-1"><p className="font-semibold text-lg text-[#4b3d6d]">Importer CSV</p><p className="text-[#8d82a8] text-sm">Watchlist / Diary / Ratings</p></div><ChevronRight className="text-[#b9accf]"/></button>
              <button onClick={handleResetLists} disabled={isResettingLists} className="bg-white p-4 rounded-[1.6rem] border border-[#f3d9d8] shadow-[0_10px_22px_rgba(111,98,143,0.08)] flex items-center gap-4 active:scale-[0.98] transition disabled:opacity-70"><div className="w-14 h-14 rounded-xl bg-[#ffeef0] flex items-center justify-center shrink-0">{isResettingLists ? <Loader2 size={28} className="text-[#d56f7a] animate-spin"/> : <Trash2 size={28} className="text-[#d56f7a]"/>}</div><div className="text-left flex-1"><p className="font-semibold text-lg text-[#4b3d6d]">Reset mes listes</p><p className="text-[#8d82a8] text-sm">Supprime A voir + Deja vus + Pas envie</p></div><ChevronRight className="text-[#b9accf]"/></button>
            </div>
            <input ref={fileInputRef} type="file" accept=".csv" multiple className="hidden" onChange={handleFileUpload} />
          </div>
        )}

        {/* COMPOSANT CINEMATCH CARDS */}
        {activeTab === 'cinematch' && (
          <div className="relative h-full animate-in fade-in duration-300">
            <CineMatchCards movies={movies} setMovies={setMovies} loading={loading} onSwipe={onSwipe} openMovieDetails={openMovieDetails} fetchDiscoverMovies={fetchDiscoverMovies} emptySubtitle={discoverEmptyMessage || 'Relance une recherche ou change les filtres.'} />
          </div>
        )}

        {activeTab === 'catalogue' && (
          <div className="animate-in fade-in duration-300">
            {catalogueMovies.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {catalogueMovies.map(movie => (
                  <button key={movie.id} onClick={() => openMovieDetails(movie.id)} className="text-left active:scale-95 transition">
                    <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-white border border-[#eee5dc] shadow-[0_8px_18px_rgba(111,98,143,0.12)]">
                      {movie.poster_path ? <img src={movie.poster_path} alt={movie.title} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><Popcorn size={32} className="text-[#b9accf]"/></div>}
                    </div>
                    <p className="font-semibold text-sm mt-2 line-clamp-2 px-1 text-[#4b3d6d]">{movie.title}</p>
                    <p className="text-[#d4a642] text-xs font-semibold px-1">{movie.vote}/10</p>
                  </button>
                ))}
              </div>
            )}
            {loading && <div className="flex justify-center py-6"><Loader2 className="animate-spin text-[#8d82a8]" /></div>}
            {!loading && catalogueMovies.length > 0 && <button onClick={() => fetchCatalogueMovies(cataloguePage + 1)} className="w-full mt-6 py-4 rounded-2xl bg-white border border-[#eee5dc] text-[#4b3d6d] font-semibold active:scale-[0.98] transition shadow-[0_8px_18px_rgba(111,98,143,0.08)]">Charger plus</button>}
          </div>
        )}

        {['list-wishlist', 'list-history', 'list-dismissed', 'list-matches'].includes(activeTab) && (
          <div className="animate-in fade-in duration-300">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 size={32} className="animate-spin text-[#8d82a8]"/></div>
            ) : savedMovies.length > 0 ? (
              <div className="space-y-3">
                {savedMovies.map(movie => (
                  <button key={movie.id} onClick={() => openMovieDetails(movie.id)} className="w-full bg-white rounded-2xl border border-[#eee5dc] overflow-hidden flex text-left active:scale-[0.98] transition shadow-[0_8px_18px_rgba(111,98,143,0.08)]">
                    <div className="w-24 h-32 shrink-0 bg-[#f4efea]">
                      {movie.poster_path ? <img src={movie.poster_path} alt={movie.title} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center"><Popcorn size={24} className="text-[#b9accf]"/></div>}
                    </div>
                    <div className="flex-1 p-3 min-w-0">
                      <div className="flex justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold line-clamp-2 text-[#4b3d6d]">{movie.title}</h3>
                          <p className="text-xs text-[#8d82a8] mt-1">Note TMDB : {movie.vote}/10</p>
                          {movie.userRating !== undefined && movie.userRating !== null && <p className="text-xs text-[#d4a642] font-semibold mt-1">Ma note : {movie.userRating}/5</p>}
                          {movie.ratedAt && <p className="text-xs text-[#b9accf] mt-1">Le {movie.ratedAt}</p>}
                          {activeTab === 'list-matches' && Array.isArray(movie.matchedMemberIds) && (
                            <p className="text-xs text-[#d27295] mt-1">
                              Match avec {movie.matchedMemberIds
                                .filter((uid) => uid !== memberId)
                                .map((uid) => getMemberDisplayName(uid))
                                .join(', ') || `${movie.matchedCount || 2} membres`}
                            </p>
                          )}
                        </div>
                        {activeTab !== 'list-matches' && (
                          <button onClick={(e) => handleDeleteClick(e, movie.title, movie.id)} className="shrink-0 p-2 rounded-full bg-[#f6f0eb] hover:bg-[#ffeef0] text-[#b9accf] hover:text-[#d56f7a] transition self-start"><Trash2 size={16}/></button>
                        )}
                      </div>
                      <p className="text-xs text-[#8d82a8] mt-2 line-clamp-2">{movie.overview || "Pas de résumé disponible."}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-[#b9accf]">
                <Library size={48} className="mx-auto mb-4"/>
                <p className="font-semibold text-[#4b3d6d] mb-1">Liste vide</p>
                <p className="text-sm">
                  {activeTab === 'list-matches' && matchesEmptyMessage
                    ? matchesEmptyMessage
                    : "Ajoute quelques films pour remplir cet espace."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {deleteModal.show && (
        <div className="fixed inset-0 z-[999] bg-[rgba(76,44,128,0.16)] backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteModal({ show: false, movieId: null, title: '' })}>
          <div className="bg-white border border-[#eee5dc] rounded-3xl p-6 w-full max-w-sm text-center animate-in zoom-in-95 duration-200 shadow-[0_14px_30px_rgba(111,98,143,0.14)]" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-[#ffeef0] flex items-center justify-center mx-auto mb-4"><Trash2 size={28} className="text-red-500"/></div>
            <h2 className="text-xl font-semibold text-[#4b3d6d] mb-2">Supprimer ce film ?</h2>
            <p className="text-[#8d82a8] text-sm mb-6">"{deleteModal.title}" sera retire de la liste.</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setDeleteModal({ show: false, movieId: null, title: '' })} className="w-full py-3 bg-[#f6f0eb] hover:bg-[#efe7de] text-[#6f628f] rounded-xl font-semibold transition">Annuler</button>
              <button onClick={confirmDelete} className="w-full py-3 bg-[#d56f7a] hover:bg-[#c85f6d] text-white rounded-xl font-semibold transition">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* COMPOSANT MOVIE DETAILS MODAL */}
      {selectedMovieId && (
        <MovieDetailsModal
          movieDetails={movieDetails}
          loadingDetails={loadingDetails}
          closeModale={closeModale}
          isInWishlist={isInWishlist}
          isInHistory={isInHistory}
          needsRatingPrompt={needsRatingPrompt}
          isSavingRating={isSavingRating}
          toggleWishlist={toggleWishlist}
          rating={rating}
          onRatingSelect={handleRatingSelect}
          promptWatchedRating={promptWatchedRating}
        />
      )}

      <nav className="p-2 pb-safe bg-[rgba(252,247,242,0.96)] border-t border-[#eee5dc] z-[900] shrink-0 backdrop-blur">
        <div className="flex justify-around items-center">
          <button onClick={() => setActiveTab('hub')} className={`nav-btn flex flex-col items-center transition ${['hub', 'list-wishlist', 'list-history', 'list-dismissed', 'list-matches'].includes(activeTab) ? 'text-[#7f68b7]' : 'text-[#b2a7c9]'}`}><Library size={24} /><span className="text-[10px] mt-1">Mes Listes</span></button>
          <button onClick={() => setActiveTab('cinematch')} className="relative -top-6"><div className={`p-4 rounded-full border-4 border-[#fcf7f2] transition ${activeTab === 'cinematch' ? 'bg-[#ef9a79] text-white shadow-[0_10px_24px_rgba(239,154,121,0.4)]' : 'bg-white border border-[#ece4f7] text-[#b2a7c9]'}`}><Flame size={28} fill={activeTab === 'cinematch' ? "currentColor" : "none"} /></div></button>
          <button onClick={() => setActiveTab('catalogue')} className={`nav-btn flex flex-col items-center transition ${activeTab === 'catalogue' ? 'text-[#7f68b7]' : 'text-[#b2a7c9]'}`}><LayoutGrid size={24} /><span className="text-[10px] mt-1">Catalogue</span></button>
        </div>
      </nav>
    </main>
  );
}










