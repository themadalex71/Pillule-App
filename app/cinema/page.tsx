"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, List, CheckCircle, Popcorn, Flame, X, Heart, Loader2 } from 'lucide-react';
// On importe la librairie de swipe magique
import TinderCard from 'react-tinder-card';

// On définit à quoi ressemble un film
interface Movie {
  id: number;
  title: string;
  poster_path: string | null;
  overview: string;
  vote: string;
}

export default function CinemaPage() {
  const [activeTab, setActiveTab] = useState('cinematch'); // Par défaut sur Cinematch
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const cardRefs = useRef<any[]>([]); // Pour contrôler les cartes si besoin

  // 1. Charger les films au démarrage
  useEffect(() => {
    if (activeTab === 'cinematch' && movies.length === 0) {
      fetchMovies();
    }
  }, [activeTab, movies.length]);

  const fetchMovies = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cinema/discover');
      const data = await res.json();
      if (Array.isArray(data)) {
        setMovies(data);
      }
    } catch (error) {
      console.error("Erreur fetch:", error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Gérer le Swipe
  const onSwipe = (direction: string, movie: Movie) => {
    console.log('You swiped: ' + direction + ' on ' + movie.title);
    
    if (direction === 'right') {
      // TODO: Plus tard, ici on sauvegardera dans Redis (liste "à voir")
      alert(`👍 Ajouté : ${movie.title} ! (Simulation)`);
    } else if (direction === 'left') {
       // Pas intéressé
    }

    // On retire le film de la liste locale pour qu'il ne revienne pas
    setMovies((prev) => prev.filter(m => m.id !== movie.id));
  };


  return (
    <main className="min-h-screen bg-slate-900 text-white pb-24 relative overflow-hidden">
      
      {/* --- EN-TÊTE --- */}
      <div className="p-6 pb-2 z-10 relative">
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

      {/* --- ZONE DE CONTENU --- */}
      <div className="px-4 h-[70vh] relative flex flex-col justify-center">
        
        {activeTab === 'cinematch' && (
          <div className="relative w-full h-full max-w-sm mx-auto mt-4">
            
            {loading && (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Loader2 size={40} className="animate-spin mb-4 text-yellow-500"/>
                Chargement des films...
              </div>
            )}

            {!loading && movies.length === 0 && (
               <div className="text-center mt-20 flex flex-col items-center">
                  <Popcorn size={48} className="text-slate-600 mb-4"/>
                  <p className="text-slate-400 mb-4">Plus de films à proposer !</p>
                  <button onClick={fetchMovies} className="bg-yellow-500 text-slate-900 px-4 py-2 rounded-full font-bold">Recharger</button>
               </div>
            )}

            {/* LA PILE DE CARTES À SWIPER */}
            {movies.map((movie, index) => (
              <TinderCard
                ref={(el) => cardRefs.current[index] = el}
                key={movie.id}
                onSwipe={(dir) => onSwipe(dir, movie)}
                preventSwipe={['up', 'down']} // On bloque le haut/bas
                className="absolute top-0 left-0 w-full h-full"
              >
                <div 
                  className="relative w-full h-full bg-slate-800 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 select-none"
                  style={{ 
                    backgroundImage: movie.poster_path ? `url("${movie.poster_path}")` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  {/* Dégradé pour lire le texte */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                  
                  {/* Infos du film en bas */}
                  <div className="absolute bottom-0 left-0 p-6 w-full">
                     <div className="flex items-center gap-2 mb-2">
                        <span className="bg-yellow-500 text-slate-900 text-xs font-bold px-2 py-1 rounded-full">★ {movie.vote}</span>
                     </div>
                    <h2 className="text-3xl font-black leading-tight mb-2 drop-shadow-lg">{movie.title}</h2>
                    <p className="text-sm text-slate-300 line-clamp-3 drop-shadow">{movie.overview || "Pas de synopsis disponible."}</p>
                  </div>
                </div>
              </TinderCard>
            ))}

            {/* Indications visuelles (Fake boutons) */}
            {!loading && movies.length > 0 && (
                <div className="absolute -bottom-16 left-0 w-full flex justify-center gap-8 pointer-events-none opacity-50">
                    <div className="bg-slate-800 p-3 rounded-full text-red-500 border border-red-900"><X size={24}/></div>
                    <div className="bg-slate-800 p-3 rounded-full text-green-500 border border-green-900"><Heart size={24}/></div>
                </div>
            )}

          </div>
        )}

        {activeTab !== 'cinematch' && (
          <div className="text-center py-10 text-slate-500">
            <Popcorn size={48} className="mx-auto mb-4 opacity-50" />
            <p>Contenu de l&apos;onglet {activeTab} à venir...</p>
          </div>
        )}

      </div>

      {/* --- BARRE DE NAVIGATION --- */}
      <nav className="fixed bottom-0 left-0 w-full bg-slate-800 border-t border-slate-700 pb-safe z-20">
        <div className="flex justify-around items-center p-2">
          <button onClick={() => setActiveTab('a-voir')} className={`nav-btn ${activeTab === 'a-voir' ? 'text-blue-500' : 'text-slate-400'}`}>
            <List size={24} /><span className="text-[10px] mt-1">À voir</span>
          </button>
          {/* Bouton Central CineMatch mis en avant */}
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