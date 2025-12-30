'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, CheckCircle, Loader2, Users, LogOut, 
  RotateCcw, LayoutGrid, Hammer, X 
} from 'lucide-react';

// Import des jeux
import ZoomGame from '@/components/games/ZoomGame';
import MixGame from '@/components/games/MixGame';
import MemeGame from '@/components/games/MemeGame'; // Nouveau
import ContentEditor from '@/components/ContentEditor'; // Le nouveau composant Fabrique

// Liste des profils
const PROFILES = ['Moi', 'Chéri(e)', 'Invité', 'Testeur 🛠️'];

export default function OnSamusePage() {
  const [loading, setLoading] = useState(true);
  const [gameData, setGameData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [showFabrique, setShowFabrique] = useState(false); // État pour la modal
  
  const [gameKey, setGameKey] = useState(0);

  useEffect(() => {
    const savedUser = localStorage.getItem('onsamuse_current_user');
    if (savedUser) handleUserSelect(savedUser);
    else fetchGame();
  }, []);

  const fetchGame = async (forcedId?: string) => {
    setLoading(true);
    try {
      const url = forcedId ? `/api/onsamuse?id=${forcedId}` : '/api/onsamuse';
      const res = await fetch(url);
      const data = await res.json();
      
      setGameData(data);
      
      if (currentUser && currentUser !== 'Testeur 🛠️') {
        checkIfPlayed(currentUser, data.date);
      } else {
        setHasPlayed(false);
      }
      
      setGameKey(prev => prev + 1);
      setLoading(false);
    } catch (error) {
      console.error("Erreur", error);
      setLoading(false);
    }
  };

  const handleUserSelect = (user: string) => {
    setCurrentUser(user);
    localStorage.setItem('onsamuse_current_user', user);
    if (user !== 'Testeur 🛠️') fetchGame();
    else setLoading(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('onsamuse_current_user');
    setHasPlayed(false);
    setGameData(null);
    fetchGame();
  };

  const checkIfPlayed = (user: string, date: string) => {
    const key = `onsamuse_last_played_${user}`;
    const lastPlayedDate = localStorage.getItem(key);
    setHasPlayed(lastPlayedDate === date);
  };

  const handleGameSubmit = () => {
    if (currentUser === 'Testeur 🛠️') {
      alert("✅ Victoire simulée (Mode Testeur)");
      return;
    }

    if (gameData && currentUser) {
      const key = `onsamuse_last_played_${currentUser}`;
      localStorage.setItem(key, gameData.date);
      setHasPlayed(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // --- L'AIGUILLEUR ---
  const renderGameComponent = () => {
    if (!gameData) return null;
    const { id, data } = gameData.game;

    const commonProps = { 
        key: gameKey, 
        data, 
        onFinish: handleGameSubmit,
        currentUser: currentUser || 'Anonyme'
    };

    switch (id) {
      case 'zoom': return <ZoomGame {...commonProps} />;
      case 'mix': return <MixGame {...commonProps} />;
      case 'meme': return <MemeGame {...commonProps} />; // Prêt pour Meme Maker
      default:
        return (
          <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 w-full">
             <p className="mb-4">Le jeu <span className="font-bold text-purple-600">{gameData.game.title}</span> est en cours de développement 🚧</p>
          </div>
        );
    }
  };

  // --- RENDU SÉLECTION UTILISATEUR ---
  if (!currentUser) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-lg p-8 text-center">
          <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="text-purple-600" size={32} />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-800 mb-2">Qui joue ?</h1>
          <div className="grid gap-3 mt-6">
            {PROFILES.map((profile) => (
              <button
                key={profile}
                onClick={() => handleUserSelect(profile)}
                className={`w-full py-4 px-6 rounded-xl font-bold transition flex items-center justify-between group border
                  ${profile === 'Testeur 🛠️' 
                    ? 'bg-gray-800 text-white border-gray-900 hover:bg-gray-700' 
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-purple-200 hover:text-purple-700'}`}
              >
                <span>{profile}</span>
                <span className={profile === 'Testeur 🛠️' ? '' : 'opacity-0 group-hover:opacity-100'}>👉</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col relative pb-20">
      
      {/* MODAL LA FABRIQUE */}
      {showFabrique && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-md">
                <button 
                    onClick={() => setShowFabrique(false)}
                    className="absolute -top-12 right-0 text-white bg-white/20 p-2 rounded-full hover:bg-white/40"
                >
                    <X size={24} />
                </button>
                <ContentEditor />
            </div>
        </div>
      )}

      {/* HEADER */}
      <header className={`p-4 shadow-sm flex items-center justify-between sticky top-0 z-20 
        ${currentUser === 'Testeur 🛠️' ? 'bg-gray-800 text-white' : 'bg-white'}`}>
        <div className="flex items-center gap-2">
            <Link href="/" className="opacity-70 hover:opacity-100 mr-2">
              <ArrowLeft size={24} />
            </Link>
            <div className="flex flex-col">
                <span className="font-bold text-lg leading-none">On S'aMuSe</span>
                <span className="text-xs opacity-70">{currentUser}</span>
            </div>
        </div>
        
        <div className="flex gap-2">
            {/* BOUTON FABRIQUE */}
            <button 
              onClick={() => setShowFabrique(true)}
              className={`p-2 rounded-full transition ${currentUser === 'Testeur 🛠️' ? 'bg-white/10 hover:bg-white/20' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'}`}
              title="La Fabrique"
            >
                <Hammer size={20} />
            </button>
            
            <button onClick={handleLogout} className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition">
                <LogOut size={20} />
            </button>
        </div>
      </header>

      {/* --- MENU SPÉCIAL TESTEUR --- */}
      {currentUser === 'Testeur 🛠️' && (
        <div className="w-full bg-gray-900 text-white p-4 overflow-x-auto whitespace-nowrap shadow-inner flex gap-2 items-center">
          <span className="text-xs font-bold uppercase text-gray-500 mr-2 flex items-center gap-1">
            <LayoutGrid size={14}/> Jeux :
          </span>
          {['zoom', 'mix', 'meme', 'cadavre'].map(id => (
            <button 
              key={id}
              onClick={() => fetchGame(id)}
              className={`px-3 py-1 rounded-full text-sm font-bold transition
                ${gameData?.game.id === id ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              {id.charAt(0).toUpperCase() + id.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* CONTENU DU JEU */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center max-w-md mx-auto w-full">
        
        {loading ? (
           <Loader2 className="animate-spin text-purple-600" size={48} />
        ) : hasPlayed ? (
          <div className="text-center animate-in fade-in zoom-in duration-500">
            <CheckCircle className="text-green-500 w-24 h-24 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Bravo {currentUser} !</h2>
            <p className="text-gray-500 mb-6">Reviens demain.</p>
            <button onClick={handleLogout} className="text-purple-600 font-bold hover:underline">Changer de joueur</button>
          </div>
        ) : (
          <div className="w-full bg-white rounded-3xl shadow-lg border border-purple-100 overflow-hidden flex flex-col">
            <div className={`p-6 text-white text-center relative ${currentUser === 'Testeur 🛠️' ? 'bg-gray-700' : 'bg-purple-600'}`}>
               {currentUser === 'Testeur 🛠️' && (
                 <button 
                   onClick={() => fetchGame(gameData.game.id)}
                   className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 rounded-full transition"
                 >
                   <RotateCcw size={20} />
                 </button>
               )}
              <span className="text-xs font-bold uppercase tracking-widest opacity-80">
                {currentUser === 'Testeur 🛠️' ? 'Mode Debug' : 'Défi du jour'}
              </span>
              <h2 className="text-3xl font-extrabold mt-1">{gameData?.game.title}</h2>
            </div>

            <div className="p-6 flex flex-col items-center gap-6">
              <p className="text-center text-gray-600 text-sm italic">
                {gameData?.game.description}
              </p>
              <div className="w-full flex justify-center">
                {renderGameComponent()}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}