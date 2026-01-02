'use client';
import { GAMES_CATALOG } from '@/lib/gameUtils';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Users,
  LogOut,
  RotateCcw,
  LayoutGrid,
  Hammer,
  X,
  Trophy,
} from 'lucide-react';

// Import des composants de jeux
import ZoomGame from '@/components/games/ZoomGame';
import MemeGame from '@/components/games/MemeGame';
import ContentEditor from '@/components/ContentEditor';

// ✅ Nouveau composant générique de fin + type résultat
import GameEndCard from '@/components/GameEndCard';
import type { GameResult, PlayerId } from '@/types/GameResult';

const PROFILES = ['Moi', 'Chéri(e)', 'Invité', 'Testeur 🛠️'];

export default function OnSamusePage() {
  const [loading, setLoading] = useState(true);
  const [gameData, setGameData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [forcedGameId, setForcedGameId] = useState<string | null>(null);

  // mode testeur A/B
  const [testSubUser, setTestSubUser] = useState<PlayerId>('Joueur A');

  const [hasPlayed, setHasPlayed] = useState(false);
  const [showFabrique, setShowFabrique] = useState(false);

  // ✅ Remplace lastWin par un résultat complet (A+B)
  const [lastResult, setLastResult] = useState<GameResult | null>(null);

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [gameKey, setGameKey] = useState(0);

  // -----------------------------
  // Helpers
  // -----------------------------
  const profileToPlayerId = (profile: string | null): PlayerId => {
    // Mapping simple pour garder tes jeux compatibles (2 joueurs)
    // Tu peux adapter plus tard quand tu gèreras de vrais comptes
    if (profile === 'Chéri(e)') return 'Joueur B';
    return 'Joueur A';
  };

  // En mode testeur, switch A/B = nouvelle partie locale (sans localStorage)
  useEffect(() => {
    if (currentUser === 'Testeur 🛠️') {
      setHasPlayed(false);
      setGameKey((prev) => prev + 1);
    }
  }, [testSubUser, currentUser]);

  useEffect(() => {
    const savedUser = localStorage.getItem('onsamuse_current_user');
    if (savedUser) handleUserSelect(savedUser);
    else fetchGame();
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchGame = async (forcedId?: string) => {
    setLoading(true);
    try {
      const res = await fetch(forcedId ? `/api/onsamuse?id=${forcedId}` : '/api/onsamuse');
      const data = await res.json();
      setGameData(data);
      setLoading(false);

      if (currentUser && currentUser !== 'Testeur 🛠️') {
        checkIfPlayed(currentUser, data.date);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/score');
      const data = await res.json();
      setLeaderboard(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUserSelect = async (user: string) => {
    setCurrentUser(user);
    localStorage.setItem('onsamuse_current_user', user);

    // Quand on change de profil, on reset l’écran fin
    setHasPlayed(false);
    setLastResult(null);

    if (!gameData) await fetchGame();
    else if (user !== 'Testeur 🛠️') checkIfPlayed(user, gameData.date);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('onsamuse_current_user');
    setHasPlayed(false);
    setLastResult(null);
    fetchGame();
  };

  const checkIfPlayed = (user: string, date: string) => {
    const lastPlayedDate = localStorage.getItem(`onsamuse_last_played_${user}`);
    setHasPlayed(lastPlayedDate === date);
  };

  // ✅ Nouveau handler : le jeu renvoie un GameResult (A+B)
  const handleGameFinish = async (result: GameResult) => {
    setLastResult(result);

    // En mode testeur : pas de score persisté
    if (!currentUser || currentUser === 'Testeur 🛠️') {
      setHasPlayed(true);
      await fetchLeaderboard();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // En mode normal : on crédite le profil courant avec SON score
    // (c’est volontaire : chaque personne lance le jeu sur son device)
    const myPlayerId = profileToPlayerId(currentUser);
    const myPoints = result?.resultsByPlayer?.[myPlayerId]?.score ?? 0;

    await fetch('/api/score', {
      method: 'POST',
      body: JSON.stringify({ user: currentUser, points: myPoints }),
    });

    localStorage.setItem(`onsamuse_last_played_${currentUser}`, gameData.date);

    setHasPlayed(true);
    await fetchLeaderboard();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderGameComponent = () => {
    if (!gameData || !gameData.game) return null;

    // ✅ L’ID joueur transmis aux jeux doit être Joueur A/B
    const effectivePlayer: PlayerId =
      currentUser === 'Testeur 🛠️'
        ? testSubUser
        : profileToPlayerId(currentUser);

    const commonProps = {
      key: `${gameKey}-${gameData.game.id}`,
      currentUser: effectivePlayer,
      onFinish: handleGameFinish,
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
        return (
          <div className="p-8 text-center">
            Jeu non disponible pour l’instant.
          </div>
        );
    }
  };

  // -----------------------------
  // RENDER
  // -----------------------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  // -----------------------------
  // UI Sélection profil
  // -----------------------------
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <Link href="/" className="p-3 rounded-2xl border bg-white shadow-sm">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="text-xl font-black">On s’amuse</div>
            <div className="text-xs text-gray-500">
              Choisis un profil pour jouer
            </div>
          </div>
        </div>

        <div className="px-6 pb-10 flex-1">
          <div className="grid grid-cols-2 gap-3">
            {PROFILES.map((p) => (
              <button
                key={p}
                onClick={() => handleUserSelect(p)}
                className="bg-white border rounded-3xl p-6 shadow-sm hover:shadow-md transition text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <Users size={18} />
                  </div>
                  <div className="font-black">{p}</div>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {p === 'Testeur 🛠️'
                    ? 'Mode dev A/B'
                    : 'Mode normal'}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <div className="sticky top-0 z-30 bg-gray-50/80 backdrop-blur border-b">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-3 rounded-2xl border bg-white shadow-sm">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="text-lg font-black">On s’amuse</div>
              <div className="text-xs text-gray-500">
                Profil : <span className="font-bold">{currentUser}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-3 rounded-2xl border bg-white shadow-sm"
            title="Changer de profil"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        {/* MODE TESTEUR */}
        {currentUser === 'Testeur 🛠️' && (
          <div className="bg-white border rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-black flex items-center gap-2">
                  <Hammer size={18} />
                  Mode testeur
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Switch A/B + choisis un jeu indépendamment du tirage du jour
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setTestSubUser('Joueur A')}
                  className={`px-4 py-2 rounded-2xl border font-black text-xs uppercase tracking-widest ${
                    testSubUser === 'Joueur A' ? 'bg-gray-900 text-white' : 'bg-white'
                  }`}
                >
                  Joueur A
                </button>
                <button
                  onClick={() => setTestSubUser('Joueur B')}
                  className={`px-4 py-2 rounded-2xl border font-black text-xs uppercase tracking-widest ${
                    testSubUser === 'Joueur B' ? 'bg-gray-900 text-white' : 'bg-white'
                  }`}
                >
                  Joueur B
                </button>
              </div>
            </div>

            {/* ✅ Choix du jeu (test) */}
            <div className="mt-5">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-2">
                Choisir un jeu (test)
              </div>

              <div className="flex flex-wrap gap-2">
                {/* Jeu du jour */}
                <button
                  onClick={async () => {
                    setForcedGameId(null);
                    setLastResult(null);
                    setHasPlayed(false);
                    setGameKey((p) => p + 1);
                    await fetchGame(); // revient au tirage du jour
                  }}
                  className={`px-4 py-2 rounded-2xl border font-black text-xs uppercase tracking-widest ${
                    forcedGameId === null ? 'bg-gray-900 text-white' : 'bg-white'
                  }`}
                >
                  Jeu du jour
                </button>

                {/* Jeux du catalogue */}
                {GAMES_CATALOG.map((g) => (
                <button
                  key={g.id}
                  onClick={async () => {
                    // 1️⃣ Mémorise le jeu forcé
                    setForcedGameId(g.id);

                    // 2️⃣ Reset UI local
                    setLastResult(null);
                    setHasPlayed(false);
                    setGameKey((p) => p + 1);

                    // 3️⃣ Reset ÉTAT SERVEUR du jeu sélectionné (IMPORTANT)
                    // évite d'hériter d'une partie précédente
                    await fetch(`/api/game-turn?game=${g.id}`, {
                      method: 'DELETE',
                    }).catch(() => {});

                    // 4️⃣ Charge le jeu demandé (indépendant du tirage du jour)
                    await fetchGame(g.id);
                  }}
                  className={`px-4 py-2 rounded-2xl border font-black text-xs uppercase tracking-widest ${
                    forcedGameId === g.id ? 'bg-gray-900 text-white' : 'bg-white'
                  }`}
                >
                  {g.id}
                </button>
              ))}

              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={async () => {
                  // Reset des états de jeu (utile quand tu testes)
                  await fetch('/api/game-turn?game=zoom', { method: 'DELETE' });
                  await fetch('/api/game-turn?game=meme', { method: 'DELETE' });
                  setLastResult(null);
                  setHasPlayed(false);
                  setGameKey((p) => p + 1);
                }}
                className="flex-1 px-4 py-3 rounded-2xl border font-black text-xs uppercase tracking-widest hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} /> Reset state
              </button>

              <button
                onClick={() => setShowFabrique((v) => !v)}
                className="flex-1 px-4 py-3 rounded-2xl border font-black text-xs uppercase tracking-widest hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <LayoutGrid size={16} /> Fabrique
              </button>
            </div>

            {showFabrique && (
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <div className="font-black">Fabrique de contenu</div>
                  <button
                    onClick={() => setShowFabrique(false)}
                    className="p-2 rounded-xl border hover:bg-gray-50"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="mt-4">
                  <ContentEditor />
                </div>
              </div>
            )}
          </div>
        )}


        {/* TITRE JEU DU JOUR */}
        <div className="bg-white border rounded-3xl p-6 shadow-sm">
          <div className="text-xs text-gray-500 uppercase tracking-widest font-black">
            Le jeu du jour
          </div>
          <div className="mt-2 text-3xl font-black tracking-tight">
            {gameData?.game?.title ?? '—'}
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {gameData?.game?.description ?? ''}
          </div>
        </div>

        {/* ✅ SI FINI : carte générique */}
        {hasPlayed && lastResult ? (
          <GameEndCard
            result={lastResult}
            onNextDay={async () => {
              // Ici on permet de rejouer (utile en testeur)
              setLastResult(null);
              setHasPlayed(false);

              // Optionnel : reset état serveur de ce jeu
              if (gameData?.game?.id === 'zoom') {
                await fetch('/api/game-turn?game=zoom', { method: 'DELETE' });
              }
              if (gameData?.game?.id === 'meme') {
                await fetch('/api/game-turn?game=meme', { method: 'DELETE' });
              }

              setGameKey((p) => p + 1);
            }}
          />
        ) : (
          <div className="bg-white border rounded-3xl shadow-sm overflow-hidden">
            <div className="p-6">
              {renderGameComponent()}
            </div>
          </div>
        )}

        {/* LEADERBOARD */}
        <div className="bg-white border rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-black flex items-center gap-2">
                <Trophy size={18} />
                Classement
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Scores (cumul)
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {leaderboard.length === 0 && (
              <div className="text-sm text-gray-500">
                Aucun score pour l’instant.
              </div>
            )}

            {leaderboard.map((row: any, idx: number) => (
              <div
                key={row.user}
                className="flex items-center justify-between px-4 py-3 rounded-2xl bg-gray-50 border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white border flex items-center justify-center font-black">
                    {idx + 1}
                  </div>
                  <div className="font-black">{row.user}</div>
                </div>
                <div className="font-black">{row.points}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="pb-10" />
      </div>
    </div>
  );
}

