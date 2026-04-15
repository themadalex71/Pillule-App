'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock, Loader2, RefreshCw, Trophy, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';

import ZoomGame from '@/features/daily/components/ZoomGame';
import MemeGame from '@/features/daily/components/MemeGame';
import CadavreGame from '@/features/daily/components/CadavreGame';
import PoetGame from '@/features/daily/components/PoetGame';
import TierListGame from '@/features/daily/components/TierListGame';
import { getFirebaseAuth } from '@/lib/firebase/client';
import AppMiniHeader from '@/components/AppMiniHeader';

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
      <main className="min-h-[100dvh] bg-[#fcf7f2] flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-[#8d7ac6]" />
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#fcf7f2] pb-10 text-[#2e1065]">
      <AppMiniHeader title="Jeux" />

      <div className="mx-auto w-full max-w-md px-5 pt-5">
      <div className="space-y-5">
        {loading && !session ? (
          <div className="flex justify-center py-20 rounded-[1.8rem] border border-[#eee5dc] bg-white shadow-[0_12px_30px_rgba(111,98,143,0.08)]">
            <Loader2 className="animate-spin text-[#8d7ac6]" size={48} />
          </div>
        ) : (
          <>
            <div className="space-y-3 rounded-[1.8rem] border border-[#eee5dc] bg-white p-4 shadow-[0_12px_30px_rgba(111,98,143,0.08)]">
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8d82a8]">
                  {isSimulationMode ? 'Mode Simulation' : 'Defi du Jour'} · {currentName}
                </p>
                <Link href="/daily/editor" className="text-[10px] font-black uppercase tracking-[0.18em] text-[#6f628f]">
                  Editeur
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMode('daily')}
                  className={`rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-tight transition ${
                    !isSimulationMode
                      ? 'bg-[#8d7ac6] text-white shadow-[0_10px_18px_rgba(141,122,198,0.35)]'
                      : 'bg-[#fcfbff] border border-[#ece4f7] text-[#8d82a8]'
                  }`}
                >
                  Quotidien
                </button>
                <button
                  type="button"
                  onClick={() => setMode('simu')}
                  className={`rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-tight transition ${
                    isSimulationMode
                      ? 'bg-[#ef9a79] text-white shadow-[0_10px_18px_rgba(239,154,121,0.32)]'
                      : 'bg-[#fcfbff] border border-[#ece4f7] text-[#8d82a8]'
                  }`}
                >
                  Simulation
                </button>
              </div>

              {isSimulationMode && (
                <div className="space-y-2">
                  <div className="rounded-2xl border border-[#f2decf] bg-[#fff8f3] px-4 py-3">
                    <label className="block text-[10px] font-black uppercase tracking-[0.22em] text-[#ef9a79] mb-2">
                      Jeu a simuler
                    </label>
                    <select
                      value={simGameId}
                      onChange={(event) => setSimGameId(event.target.value as SimGameFilter)}
                      className="w-full rounded-xl border border-[#f2decf] bg-white px-3 py-2 text-sm font-bold text-[#6f628f] outline-none"
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
                    className="w-full rounded-2xl border border-[#f2decf] bg-[#fff8f3] px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-[#ef9a79] flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={14} /> Relancer la simulation
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-2xl border border-[#f8d7cf] bg-[#fff5f2] px-4 py-3 text-sm text-[#b4533d]">
                {error}
              </div>
            )}

            {session?.status === 'waiting_players' && (
              <div className="bg-white rounded-[2.3rem] border border-[#eee5dc] shadow-[0_12px_30px_rgba(111,98,143,0.08)] p-8 text-center space-y-5 animate-in zoom-in-95">
                <div className="mx-auto w-16 h-16 rounded-full bg-[#f3edf9] text-[#8d7ac6] flex items-center justify-center">
                  <Users size={30} />
                </div>
                <h2 className="text-2xl font-black text-[#4b3d6d] uppercase tracking-tighter">En attente de joueurs</h2>
                <p className="text-[#8d82a8] text-sm leading-relaxed">
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
                <div className="bg-white rounded-[2.5rem] shadow-[0_12px_30px_rgba(111,98,143,0.08)] border border-[#eee5dc] overflow-hidden">
                  <div className="bg-[linear-gradient(135deg,#8d7ac6,#ef9a79)] p-10 text-white text-center">
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
                          index === 0 ? 'border-[#ece4f7] bg-[#fcfbff]' : 'border-[#f0ebe4] bg-[#fffdfa]'
                        }`}
                      >
                        <p className="font-black text-[#4b3d6d]">{entry.name}</p>
                        <p className="text-lg font-black text-[#4b3d6d]">{entry.score} pts</p>
                      </div>
                    ))}
                  </div>
                </div>

                {rankingEntries.length > 0 && (
                  <div className="rounded-[2.5rem] border border-[#eee5dc] bg-white p-8 text-[#4b3d6d] shadow-[0_12px_30px_rgba(111,98,143,0.08)]">
                    <h3 className="text-lg font-black uppercase tracking-widest mb-5 text-[#6f628f]">Cumul Semaine</h3>
                    <div className="space-y-3">
                      {rankingEntries.map((entry, index) => (
                        <div
                          key={entry.id}
                          className={`flex items-center justify-between p-4 rounded-2xl ${
                            index === 0 ? 'bg-[#fcfbff] border border-[#ece4f7]' : 'bg-[#fffdfa] border border-[#f0ebe4]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-full bg-[#f3edf9] text-[#8d7ac6] flex items-center justify-center text-xs font-black">
                              {index + 1}
                            </span>
                            <span className="font-bold text-[#4b3d6d]">{entry.name}</span>
                          </div>
                          <span className="font-black text-[#6f628f]">{entry.score} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-[2rem] border border-[#f2decf] bg-[#fff8f3] p-6 text-[#6f628f] flex items-center gap-4 shadow-[0_12px_24px_rgba(239,154,121,0.15)]">
                  <div className="bg-[#ffeedd] p-3 rounded-2xl text-[#ef9a79]">
                    <Clock size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-black uppercase text-xs tracking-widest mb-1 text-[#ef9a79]">Session terminee</p>
                    <p className="text-sm font-medium text-[#6f628f]">
                      {isSimulationMode
                        ? 'Tu peux relancer une nouvelle simulation quand tu veux.'
                        : 'Rendez-vous demain pour le prochain jeu.'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleGlobalReset}
                  className="w-full py-4 text-[#8d82a8] font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 opacity-70 hover:opacity-100 transition-all"
                >
                  <RefreshCw size={14} /> {isSimulationMode ? 'Relancer la simulation' : 'Recommencer (Reset)'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </main>
  );
}
