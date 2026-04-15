'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Clock, Loader2, RefreshCw, Trophy, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';

import ZoomGame from '@/features/daily/components/ZoomGame';
import MemeGame from '@/features/daily/components/MemeGame';
import CadavreGame from '@/features/daily/components/CadavreGame';
import PoetGame from '@/features/daily/components/PoetGame';
import TierListGame from '@/features/daily/components/TierListGame';
import { getFirebaseAuth } from '@/lib/firebase/client';

type RankingEntry = {
  id: string;
  name: string;
  score: number;
};

type DailySessionMode = 'daily' | 'simu';
type SimGameFilter = 'random' | 'zoom' | 'meme' | 'cadavre' | 'poet' | 'tierlist';

const SIM_GAME_OPTIONS: Array<{ id: SimGameFilter; label: string }> = [
  { id: 'random', label: 'Aleatoire' },
  { id: 'zoom', label: 'Zoom' },
  { id: 'meme', label: 'Meme' },
  { id: 'cadavre', label: 'Cadavre' },
  { id: 'poet', label: 'Poete' },
  { id: 'tierlist', label: 'Tier List' },
];

export default function DailyGamePage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<DailySessionMode>('daily');
  const [simGameId, setSimGameId] = useState<SimGameFilter>('random');
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const participantMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (!Array.isArray(session?.participants)) return map;

    session.participants.forEach((participant: any) => {
      if (!participant?.id) return;
      map[participant.id] = participant.name || `Membre ${String(participant.id).slice(0, 6)}`;
    });

    return map;
  }, [session?.participants]);

  const currentName =
    (user?.uid && participantMap[user.uid]) || user?.displayName || user?.email || 'Utilisateur';
  const isSimulationMode = mode === 'simu';
  const gameComponentKey = `${mode}:${simGameId}:${session?.sessionId || session?.date || 'none'}:${session?.game?.id || 'none'}`;

  const fetchWithAuth = async (path: string, init?: RequestInit) => {
    if (!user) throw new Error('Utilisateur non connecte.');
    const token = await user.getIdToken();

    return fetch(path, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
  };

  const fetchSession = async (showLoading = true) => {
    if (!user) return;
    if (showLoading) setLoading(true);

    try {
      const query = new URLSearchParams({ mode });
      if (mode === 'simu' && simGameId !== 'random') {
        query.set('gameId', simGameId);
      }

      const res = await fetchWithAuth(`/api/daily-game/init?${query.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error ||
            (isSimulationMode
              ? 'Impossible de charger la session de simulation.'
              : 'Impossible de charger la session du jour.'),
        );
      }

      setSession(data);
      setError('');
    } catch (nextError: any) {
      setError(
        nextError?.message ||
          (isSimulationMode
            ? 'Impossible de charger la session de simulation.'
            : 'Impossible de charger la session du jour.'),
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleGlobalReset = async () => {
    if (!user) return;
    const confirmed = window.confirm(
      isSimulationMode
        ? 'Voulez-vous relancer la simulation pour ce foyer ?'
        : 'Voulez-vous reinitialiser la partie du jour pour ce foyer ?',
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const query = new URLSearchParams({ mode, forceReset: 'true' });
      if (mode === 'simu' && simGameId !== 'random') {
        query.set('gameId', simGameId);
      }

      const res = await fetchWithAuth(`/api/daily-game/init?${query.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error ||
            (isSimulationMode
              ? 'Impossible de relancer la simulation.'
              : 'Impossible de reinitialiser la session.'),
        );
      }

      setSession(data);
      setError('');
    } catch (nextError: any) {
      setError(
        nextError?.message ||
          (isSimulationMode
            ? 'Impossible de relancer la simulation.'
            : 'Impossible de reinitialiser la session.'),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (payload: any) => {
    if (!user) return;

    try {
      const res = await fetchWithAuth('/api/daily-game/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, mode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Action impossible.');
      }

      if (data.success) {
        setSession(data.session);
      }
    } catch (nextError: any) {
      setError(nextError?.message || 'Action impossible.');
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
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    setSession(null);
    void fetchSession();
  }, [user, mode, simGameId]);

  useEffect(() => {
    if (!user || !session || session.status === 'finished' || session.status === 'waiting_players') {
      return;
    }

    const interval = setInterval(() => {
      void fetchSession(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [user, session?.status, mode]);

  const rankingEntries: RankingEntry[] = Array.isArray(session?.weeklyRanking)
    ? session.weeklyRanking
    : [];

  const scoreboard = Object.entries(session?.players || {})
    .map(([id, value]: [string, any]) => ({
      id,
      name: participantMap[id] || `Membre ${id.slice(0, 6)}`,
      score: Number(value?.score || 0),
    }))
    .sort((a, b) => b.score - a.score);

  if (!authReady || !user) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-purple-600" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-10 font-sans">
      <header className="p-4 flex items-center justify-between bg-white border-b sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/hub" className="p-2 rounded-2xl bg-gray-100 text-gray-500">
            <ArrowLeft size={22} />
          </Link>
          <div className="flex flex-col">
            <span className="font-black text-purple-600 uppercase text-xs">
              {isSimulationMode ? 'Mode Simulation' : 'Defi du Jour'}
            </span>
            <span className="text-[11px] text-gray-500 font-bold">{currentName}</span>
          </div>
        </div>
        <Link href="/daily/editor" className="text-xs font-bold uppercase text-purple-600">
          Editeur
        </Link>
      </header>

      <div className="max-w-md mx-auto p-6">
        {loading && !session ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-purple-600" size={48} />
          </div>
        ) : (
          <>
            <div className="mb-5 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('daily')}
                  className={`rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-tight transition ${
                    !isSimulationMode
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-white border border-gray-200 text-gray-500'
                  }`}
                >
                  Quotidien
                </button>
                <button
                  type="button"
                  onClick={() => setMode('simu')}
                  className={`rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-tight transition ${
                    isSimulationMode
                      ? 'bg-orange-500 text-white shadow-lg'
                      : 'bg-white border border-gray-200 text-gray-500'
                  }`}
                >
                  Simulation
                </button>
              </div>

              {isSimulationMode && (
                <div className="space-y-2">
                  <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3">
                    <label className="block text-[10px] font-black uppercase tracking-[0.22em] text-orange-500 mb-2">
                      Jeu a simuler
                    </label>
                    <select
                      value={simGameId}
                      onChange={(event) => setSimGameId(event.target.value as SimGameFilter)}
                      className="w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm font-bold text-orange-600 outline-none"
                    >
                      {SIM_GAME_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleGlobalReset}
                    className="w-full rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-orange-600 flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={14} /> Relancer la simulation
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {session?.status === 'waiting_players' && (
              <div className="bg-white rounded-[2.3rem] border border-gray-100 shadow-xl p-8 text-center space-y-5 animate-in zoom-in-95">
                <div className="mx-auto w-16 h-16 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Users size={30} />
                </div>
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">En attente de joueurs</h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {session?.sharedData?.message || 'Ajoute au moins un autre membre au foyer pour jouer.'}
                </p>
              </div>
            )}

            {session?.status === 'in_progress' && session?.game && (
              <>
                {session.game.id === 'zoom' && (
                  <ZoomGame
                    key={gameComponentKey}
                    session={session}
                    currentUserId={user.uid}
                    participantMap={participantMap}
                    onAction={handleAction}
                  />
                )}
                {session.game.id === 'meme' && (
                  <MemeGame
                    key={gameComponentKey}
                    session={session}
                    currentUserId={user.uid}
                    participantMap={participantMap}
                    onAction={handleAction}
                  />
                )}
                {session.game.id === 'cadavre' && (
                  <CadavreGame
                    key={gameComponentKey}
                    session={session}
                    currentUserId={user.uid}
                    participantMap={participantMap}
                    onAction={handleAction}
                  />
                )}
                {session.game.id === 'poet' && (
                  <PoetGame
                    key={gameComponentKey}
                    session={session}
                    currentUserId={user.uid}
                    participantMap={participantMap}
                    onAction={handleAction}
                  />
                )}
                {session.game.id === 'tierlist' && (
                  <TierListGame
                    key={gameComponentKey}
                    session={session}
                    currentUserId={user.uid}
                    participantMap={participantMap}
                    onAction={handleAction}
                  />
                )}
              </>
            )}

            {session?.status === 'finished' && (
              <div className="space-y-6 animate-in zoom-in-95 duration-700">
                <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
                  <div className="bg-green-500 p-10 text-white text-center">
                    <Trophy size={60} className="mx-auto mb-2" />
                    <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">Termine !</h2>
                    <p className="mt-3 text-sm font-bold uppercase tracking-[0.24em] opacity-80">
                      {session?.game?.title || 'Defi du Jour'}
                    </p>
                  </div>

                  <div className="p-6 space-y-3">
                    {scoreboard.map((entry, index) => (
                      <div
                        key={entry.id}
                        className={`flex items-center justify-between rounded-2xl border p-4 ${
                          index === 0 ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'
                        }`}
                      >
                        <p className="font-black text-gray-700">{entry.name}</p>
                        <p className="text-lg font-black text-gray-900">{entry.score} pts</p>
                      </div>
                    ))}
                  </div>
                </div>

                {rankingEntries.length > 0 && (
                  <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white shadow-2xl">
                    <h3 className="text-lg font-black uppercase tracking-widest mb-5">Cumul Semaine</h3>
                    <div className="space-y-3">
                      {rankingEntries.map((entry, index) => (
                        <div
                          key={entry.id}
                          className={`flex items-center justify-between p-4 rounded-2xl ${
                            index === 0 ? 'bg-white/12 border border-white/25' : 'bg-white/6'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-black">
                              {index + 1}
                            </span>
                            <span className="font-bold">{entry.name}</span>
                          </div>
                          <span className="font-black text-yellow-300">{entry.score} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-blue-600 rounded-[2rem] p-6 text-white flex items-center gap-4 shadow-lg">
                  <div className="bg-white/20 p-3 rounded-2xl">
                    <Clock size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-black uppercase text-xs tracking-widest mb-1">Session terminee</p>
                    <p className="text-sm font-medium opacity-90">
                      {isSimulationMode
                        ? 'Tu peux relancer une nouvelle simulation quand tu veux.'
                        : 'Rendez-vous demain pour le prochain jeu.'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleGlobalReset}
                  className="w-full py-4 text-gray-400 font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 opacity-50 hover:opacity-100 transition-all"
                >
                  <RefreshCw size={14} /> {isSimulationMode ? 'Relancer la simulation' : 'Recommencer (Reset)'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
