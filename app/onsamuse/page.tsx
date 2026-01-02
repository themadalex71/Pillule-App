'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, CheckCircle, Loader2, Users, LogOut, 
  RotateCcw, LayoutGrid, Hammer, X, Trophy 
} from 'lucide-react';

// Import des composants de jeux
import ZoomGame from '@/components/games/ZoomGame';
import MemeGame from '@/components/games/MemeGame';
import ContentEditor from '@/components/ContentEditor';

const PROFILES = ['Moi', 'Chéri(e)', 'Invité', 'Testeur 🛠️'];

export default function OnSamusePage() {
  const [loading, setLoading] = useState(true);
  const [gameData, setGameData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [testSubUser, setTestSubUser] = useState<'Joueur A' | 'Joueur B'>('Joueur A');
  const [hasPlayed, setHasPlayed] = useState(false);
  const [showFabrique, setShowFabrique] = useState(false);
  const [lastWin, setLastWin] = useState<{ user: string; points: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [gameKey, setGameKey] = useState(0);

  useEffect(() => {
    if (currentUser === 'Testeur 🛠️') {
      // En mode testeur, on ignore le localStorage pour permettre le switch A/B
      setHasPlayed(false);
      // On change la clé du jeu pour forcer React à remonter le composant ZoomGame
      setGameKey(prev => prev + 1);
    }
  }, [testSubUser, currentUser]);

  useEffect(() => {
    const savedUser = localStorage.getItem('onsamuse_current_user');
    if (savedUser) handleUserSelect(savedUser);
    else fetchGame();
    fetchLeaderboard();
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
    } catch (error) {
      console.error("Erreur chargement jeu:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/score');
      const data = await res.json();
      setLeaderboard(data);
    } catch (e) {
      console.error("Erreur classement:", e);
    }
  };

  const handleUserSelect = (user: string) => {
    setCurrentUser(user);
    localStorage.setItem('onsamuse_current_user', user);
    if (user !== 'Testeur 🛠️') fetchGame();
    else fetchGame('zoom');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('onsamuse_current_user');
    setHasPlayed(false);
    setLastWin(null);
    fetchGame();
  };

  const checkIfPlayed = (user: string, date: string) => {
    const lastPlayedDate = localStorage.getItem(`onsamuse_last_played_${user}`);
    setHasPlayed(lastPlayedDate === date);
  };

  const handleGameSubmit = async (points: number = 1) => {
    const winner = currentUser === 'Testeur 🛠️' ? testSubUser : (currentUser || 'Anonyme');
    setLastWin({ user: winner, points });
  
    if (currentUser && currentUser !== 'Testeur 🛠️') {
      await fetch('/api/score', {
        method: 'POST',
        body: JSON.stringify({ user: winner, points })
      });
      localStorage.setItem(`onsamuse_last_played_${currentUser}`, gameData.date);
    }
  
    // On affiche l'écran de fin pour tout le monde (Testeur inclus)
    setHasPlayed(true);
    await fetchLeaderboard();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderGameComponent = () => {
    if (!gameData || !gameData.game) return null;
    
    // Utilise bien testSubUser si on est en mode testeur
    const effectiveUser = currentUser === 'Testeur 🛠️' ? testSubUser : (currentUser || 'Anonyme');

    const commonProps = { 
        key: `${gameKey}-${gameData.game.id}`, 
        currentUser: effectiveUser, // C'est ici que Joueur A ou Joueur B est transmis
        onFinish: handleGameSubmit
    };
  
    // VÉRIFICATION STRICTE DE L'ID DU JEU
    switch (gameData.game.id) {
      case 'zoom': 
        return <ZoomGame {...commonProps} />;
      case 'meme': 
        return <MemeGame {...commonProps} />;
      case 'cadavre': 
        return <div className="p-8 text-center">Cadavre Exquis arrive bientôt...</div>;
      default:
        return <div className="p-8 text-center text-gray-400 italic text-sm">Jeu non reconnu ({gameData.game.id})</div>;
    }
  };

  if (!currentUser) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-gray-900">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-lg p-8 text-center border border-gray-100">
          <Users className="text-purple-600 mx-auto mb-4" size={48} />
          <h1 className="text-2xl font-black mb-6 italic">Qui joue ?</h1>
          <div className="grid gap-3">
            {PROFILES.map((profile) => (
              <button
                key={profile}
                onClick={() => handleUserSelect(profile)}
                className={`w-full py-4 rounded-xl font-bold border transition ${profile === 'Testeur 🛠️' ? 'bg-gray-800 text-white border-gray-900' : 'bg-gray-50 text-gray-700 hover:border-purple-300'}`}
              >
                {profile}
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col pb-20 text-gray-900">
      
      {/* HEADER */}
      <header className={`p-4 shadow-sm sticky top-0 z-20 ${currentUser === 'Testeur 🛠️' ? 'bg-gray-900 text-white' : 'bg-white'}`}>
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/"><ArrowLeft size={24} /></Link>
            <div className="flex flex-col">
              <span className="font-black italic text-sm uppercase">On S'aMuSe</span>
              <span className="text-[10px] opacity-70 font-bold uppercase tracking-tighter">
                {currentUser === 'Testeur 🛠️' ? `Studio Debug (${testSubUser})` : currentUser}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {currentUser === 'Testeur 🛠️' && (
              <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700 mr-2">
                {['Joueur A', 'Joueur B'].map((v) => (
                  <button 
                    key={v} 
                    onClick={() => setTestSubUser(v as any)}
                    className={`px-2 py-1 text-[10px] font-bold rounded transition ${testSubUser === v ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    {v.split(' ')[1]}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setShowFabrique(true)} className="p-2 bg-purple-100 text-purple-600 rounded-full hover:bg-purple-200"><Hammer size={18} /></button>
            <button onClick={handleLogout} className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition"><LogOut size={18} /></button>
          </div>
        </div>
      </header>

      {/* MENU JEUX DEBUG */}
      {currentUser === 'Testeur 🛠️' && (
        <div className="w-full bg-gray-800 p-2 flex gap-2 overflow-x-auto border-t border-gray-700 shadow-inner">
          {['zoom', 'meme', 'cadavre'].map(id => (
            <button 
              key={id} 
              onClick={() => fetchGame(id)}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition
                ${gameData?.game.id === id ? 'bg-white text-black' : 'text-gray-400 bg-gray-700 hover:bg-gray-600'}`}
            >
              {id}
            </button>
          ))}
        </div>
      )}

      {/* ZONE DE CONTENU */}
      <div className="flex-1 p-4 max-w-md mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center mt-20 gap-4">
            <Loader2 className="animate-spin text-purple-600" size={48} />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Chargement...</p>
          </div>
        ) : hasPlayed ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* CARTE FIN DE JEU */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl text-center border border-green-50">
              <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="text-green-500" size={40} />
              </div>
              <h2 className="text-3xl font-black text-gray-900">À DEMAIN !</h2>
              
              {lastWin && (
                <div className="mt-4 p-4 bg-yellow-50 rounded-2xl border border-yellow-100 animate-bounce-in">
                  <p className="text-sm font-bold text-yellow-800">
                    🌟 <span className="text-purple-600 font-black">{lastWin.user}</span> a gagné <span className="text-xl font-black">+{lastWin.points}</span> point{lastWin.points > 1 ? 's' : ''} !
                  </p>
                </div>
              )}
              <p className="text-gray-500 text-sm mt-6 italic">Le défi est validé, les points sont dans la poche.</p>
            </div>

            {/* CLASSEMENT HEBDO */}
            <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-purple-50">
              <div className="flex items-center justify-center gap-2 mb-6">
                <Trophy className="text-purple-600" size={20} />
                <h3 className="text-xs font-black text-purple-600 uppercase tracking-widest">Classement Hebdo</h3>
              </div>
              <div className="space-y-3">
                {leaderboard.length > 0 ? leaderboard.map((e, i) => (
                  <div key={i} className={`flex justify-between items-center p-4 rounded-2xl transition-all ${i === 0 ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-50 text-gray-800'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${i === 0 ? 'bg-white text-purple-600' : 'bg-purple-200 text-purple-700'}`}>
                        {i + 1}
                      </span>
                      <span className="font-bold">{e.name}</span>
                    </div>
                    <span className={`font-black ${i === 0 ? 'text-white' : 'text-purple-600'}`}>{e.score} pts</span>
                  </div>
                )) : (
                  <p className="text-center text-xs text-gray-400 py-4">Aucun point cette semaine...</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* AFFICHAGE DU JEU */
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-purple-50 overflow-hidden">
             <div className="bg-purple-600 p-6 text-center text-white">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Défi du moment</span>
                <h2 className="text-2xl font-black italic mt-1 uppercase tracking-tighter">{gameData?.game.title}</h2>
             </div>
             <div className="p-4">{renderGameComponent()}</div>
          </div>
        )}
      </div>

      {/* MODAL FABRIQUE */}
      {showFabrique && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="relative w-full max-w-md">
             <button onClick={() => setShowFabrique(false)} className="absolute -top-12 right-0 text-white bg-white/20 p-2 rounded-full hover:bg-white/40">
               <X size={24}/>
             </button>
             <ContentEditor />
           </div>
        </div>
      )}
    </main>
  );
}