'use client';

import { useState, useEffect } from 'react';
import { Loader2, Trophy, Play, Users, ArrowLeft, RefreshCw, Trash2, Star, Clock, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import ZoomGame from '@/components/games/ZoomGame';

const PROFILES = ['Moi', 'Chéri(e)', 'Éditeur ✍️', 'Testeur 🛠️'];

export default function DailyGamePage() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch('/api/daily-game/init');
      const data = await res.json();
      setSession(data);
    } catch (e) { console.error(e); }
    if (showLoading) setLoading(false);
  };

  const handleGlobalReset = async () => {
    if (!confirm("Reset la partie pour tout le monde ?")) return;
    setLoading(true);
    try {
      const res = await fetch('/api/daily-game/init?forceReset=true');
      const data = await res.json();
      setSession(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    fetchSession();
    const saved = localStorage.getItem('daily_user');
    if (saved) setCurrentUser(saved);
    const interval = setInterval(() => {
      if (localStorage.getItem('daily_user') && session?.status !== 'finished') {
        fetchSession(false);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [session?.status]);

  const handleAction = async (payload: any) => {
    try {
      const res = await fetch('/api/daily-game/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, player: currentUser })
      });
      const data = await res.json();
      if (data.success) setSession(data.session);
    } catch (e) { console.error(e); }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-xl p-8 text-center animate-in zoom-in-95">
          <h1 className="text-2xl font-black mb-8 uppercase tracking-tighter text-gray-800">Qui joue ?</h1>
          <div className="grid gap-3 mb-8">
            {PROFILES.map(p => (
              <button key={p} onClick={() => {
                if (p === 'Éditeur ✍️') return window.location.href = '/daily/editor';
                setCurrentUser(p); 
                localStorage.setItem('daily_user', p);
              }}
                className={`w-full py-5 rounded-2xl font-black text-lg border-2 transition-all active:scale-95 
                  ${p === 'Éditeur ✍️' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white border-gray-100'}`}>
                {p}
              </button>
            ))}
          </div>
          <button onClick={handleGlobalReset} className="text-red-500 font-bold text-xs uppercase tracking-widest opacity-50"><Trash2 size={14} className="inline mr-2"/>Reset Session</button>
        </div>
      </div>
    );
  }

  const hasWon = session?.players[session?.sharedData?.guesser]?.score > 0;

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      <header className="p-4 flex items-center justify-between bg-white border-b sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/"><ArrowLeft size={24} className="text-gray-400" /></Link>
          <div className="flex flex-col">
            <span className="font-black text-purple-600 uppercase text-xs">On S'aMuSe</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{currentUser}</span>
          </div>
        </div>
        <button onClick={() => setCurrentUser(null)} className="p-3 bg-gray-100 rounded-2xl"><Users size={20} /></button>
      </header>

      <div className="max-w-md mx-auto p-6">
        {session?.status === 'waiting_start' && (
          <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden">
            <div className="bg-purple-600 p-12 text-white text-center">
              <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">{session.game.title}</h2>
            </div>
            <div className="p-8 text-center space-y-8">
              <p className="text-gray-500 italic text-lg leading-relaxed">"{session.game.description}"</p>
              <button onClick={() => handleAction({ action: 'start_game' })} className="w-full bg-purple-600 text-white font-black py-5 rounded-2xl shadow-lg uppercase tracking-tighter">C'est parti !</button>
            </div>
          </div>
        )}

        {/* CORRECTION DE L'AIGUILLAGE ICI */}
        {session?.status === 'in_progress' && (
          <ZoomGame session={session} currentUser={currentUser} onAction={handleAction} />
        )}

        {session?.status === 'finished' && (
          <div className="space-y-6 animate-in zoom-in-95">
            <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden text-center">
              <div className={`${hasWon ? 'bg-green-500' : 'bg-red-500'} p-10 text-white`}>
                <Trophy size={60} className="mx-auto mb-2" />
                <h2 className="text-4xl font-black uppercase">{hasWon ? 'Gagné !' : 'Perdu...'}</h2>
              </div>
              <div className="p-8">
                <div className="mb-6 inline-flex items-center px-6 py-3 rounded-full bg-gray-100 text-gray-800 font-black text-xl shadow-inner">
                   {hasWon ? '+1 POINT' : '+0 POINT'}
                </div>
                <div className="flex justify-center items-center gap-4 mb-4">
                  <div className="bg-gray-50 p-4 rounded-3xl flex-1 border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Auteur</p>
                    <p className="font-bold text-gray-700">{session.sharedData.author}</p>
                  </div>
                  <div className="text-xl opacity-30 italic font-black">VS</div>
                  <div className={`p-4 rounded-3xl flex-1 border ${hasWon ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                    <p className="text-[10px] font-black text-gray-400 uppercase">Joueur</p>
                    <p className={`font-bold ${hasWon ? 'text-green-800' : 'text-red-800'}`}>{session.sharedData.guesser}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-600 rounded-[2rem] p-6 text-white flex items-center gap-4 shadow-lg animate-pulse">
                <div className="bg-white/20 p-3 rounded-2xl"><Clock size={24} /></div>
                <div className="text-left">
                    <p className="font-black uppercase text-xs tracking-widest mb-1">Session terminée</p>
                    <p className="text-sm font-medium opacity-90">Attendez le prochain jeu !</p>
                </div>
            </div>

            <div className="bg-gray-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                <Star className="absolute -top-6 -right-6 text-yellow-400 opacity-10 w-32 h-32 rotate-12" />
                <h3 className="text-xl font-black mb-8 italic flex items-center gap-3">
                  <span className="bg-yellow-400 text-black px-3 py-1 rounded-xl text-sm uppercase">Score</span> 
                  CUMUL SEMAINE
                </h3>
                <div className="space-y-4">
                  {Object.entries(session.weeklyRanking || {})
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .map(([name, score], index) => (
                      <div key={name} className={`flex items-center justify-between p-5 rounded-3xl ${index === 0 ? 'bg-white/10 border border-white/20 shadow-inner' : 'bg-white/5 opacity-60'}`}>
                        <div className="flex items-center gap-4">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${index === 0 ? 'bg-yellow-400 text-black' : 'bg-gray-700 text-gray-500'}`}>{index + 1}</span>
                          <span className="font-bold text-lg">{name}</span>
                        </div>
                        <span className="text-2xl font-black text-yellow-400">{score as number} <span className="text-[10px] text-white/30 uppercase ml-1">Pts</span></span>
                      </div>
                    ))}
                </div>
            </div>
            
            <button onClick={handleGlobalReset} className="w-full py-4 text-gray-400 font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 opacity-40">
              <RefreshCw size={14} /> Recommencer (Reset)
            </button>
          </div>
        )}
      </div>
    </main>
  );
}