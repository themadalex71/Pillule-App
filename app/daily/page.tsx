'use client';

import { useState, useEffect } from 'react';
import { Loader2, Trophy, Users, ArrowLeft, RefreshCw, Trash2, Star, Clock, Check, X } from 'lucide-react';
import Link from 'next/link';
import ZoomGame from '@/components/games/ZoomGame';
import MemeGame from '@/components/games/MemeGame';
import CadavreGame from '@/components/games/CadavreGame';
import PoetGame from '@/components/games/PoetGame';
import TierListGame from '@/components/games/TierListGame';

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
    } catch (e) {
      console.error("Erreur synchro session", e);
    }
    if (showLoading) setLoading(false);
  };

  const handleGlobalReset = async () => {
    if (!confirm("Voulez-vous réinitialiser la partie pour tout le monde ?")) return;
    setLoading(true);
    try {
      const res = await fetch('/api/daily-game/init?forceReset=true');
      const data = await res.json();
      setSession(data);
    } catch (e) {
      console.error(e);
    }
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
    } catch (e) {
      console.error(e);
    }
  };

  // --- 1. SÉLECTION DU PROFIL ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-xl p-8 animate-in zoom-in-95">
          <div className="bg-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-purple-600">
            <Users size={40} />
          </div>
          <h1 className="text-2xl font-black mb-8 uppercase tracking-tighter text-gray-800">Qui joue ?</h1>
          <div className="grid gap-3 mb-8">
            {PROFILES.map(p => (
              <button key={p} onClick={() => {
                if (p === 'Éditeur ✍️') return window.location.href = '/daily/editor';
                setCurrentUser(p); 
                localStorage.setItem('daily_user', p);
              }}
                className={`w-full py-5 rounded-2xl font-black text-lg border-2 transition-all active:scale-95 
                  ${p === 'Éditeur ✍️' ? 'bg-purple-600 text-white border-purple-600 shadow-purple-100' : 
                    p === 'Testeur 🛠️' ? 'bg-black text-white border-black' : 'bg-white border-gray-100 shadow-sm'}`}>
                {p}
              </button>
            ))}
          </div>
          <button onClick={handleGlobalReset} className="flex items-center justify-center gap-2 mx-auto text-red-500 font-bold text-xs uppercase tracking-widest opacity-50">
            <Trash2 size={14} /> Reset Session du jour
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-10 font-sans">
      <header className="p-4 flex items-center justify-between bg-white border-b sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/"><ArrowLeft size={24} className="text-gray-400" /></Link>
          <div className="flex flex-col">
            <span className="font-black text-purple-600 uppercase text-xs">On S'aMuSe</span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{currentUser}</span>
          </div>
        </div>
        <button onClick={() => setCurrentUser(null)} className="p-3 bg-gray-100 rounded-2xl text-gray-600">
          <Users size={20} />
        </button>
      </header>

      <div className="max-w-md mx-auto p-6">
        {loading && !session ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-purple-600" size={48} /></div>
        ) : (
          <>
            {/* --- 2. ÉCRAN D'ACCUEIL DU JEU --- */}
            {session?.status === 'waiting_start' && (
              <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden animate-in slide-in-from-bottom-6">
                <div className="bg-purple-600 p-12 text-white text-center">
                  <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">{session.game.title}</h2>
                  <p className="mt-4 text-purple-100 font-bold uppercase text-[10px] tracking-[0.3em]">Défi Quotidien</p>
                </div>
                <div className="p-8 text-center space-y-8">
                  <p className="text-gray-500 italic text-lg leading-relaxed">"{session.game.description}"</p>
                  <button onClick={() => handleAction({ action: 'start_game' })} className="w-full bg-purple-600 text-white font-black py-5 rounded-2xl shadow-lg active:scale-95 transition-all text-xl uppercase tracking-tighter">C'est parti !</button>
                </div>
              </div>
            )}

            {/* --- 3. JEU EN COURS (AIGUILLAGE) --- */}
            {session?.status === 'in_progress' && (
              <>
                {session.game.id === 'zoom' && <ZoomGame session={session} currentUser={currentUser} onAction={handleAction} />}
                {session.game.id === 'meme' && <MemeGame session={session} currentUser={currentUser} onAction={handleAction} />}
                {session.game.id === 'cadavre' && <CadavreGame session={session} currentUser={currentUser} onAction={handleAction} />}
                {session.game.id === 'poet' && <PoetGame session={session} currentUser={currentUser} onAction={handleAction} />}
                {session.game.id === 'tierlist' && <TierListGame session={session} currentUser={currentUser} onAction={handleAction} />}
              </>
            )}

            {/* --- 4. RÉSULTATS FINAUX --- */}
            {session?.status === 'finished' && (
              <div className="space-y-6 animate-in zoom-in-95 duration-700">
                
                {/* Score de la partie */}
                <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
                  <div className="bg-green-500 p-10 text-white text-center">
                    <Trophy size={60} className="mx-auto mb-2" />
                    <h2 className="text-4xl font-black uppercase tracking-tighter leading-none">Terminé !</h2>
                  </div>
                  
                  <div className="p-8 text-center">
                    <div className="flex justify-center items-center gap-4 mb-4">
                      <div className="bg-gray-50 p-4 rounded-3xl flex-1 text-center border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Moi</p>
                        <p className="font-bold text-gray-700 text-xl">{session.players["Moi"]?.score || 0} pts</p>
                      </div>
                      <div className="text-xl opacity-30 italic font-black">VS</div>
                      <div className="bg-gray-50 p-4 rounded-3xl flex-1 text-center border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Chéri(e)</p>
                        <p className="font-bold text-gray-700 text-xl">{session.players["Chéri(e)"]?.score || 0} pts</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* --- 🆕 RÉSULTATS DÉTAILLÉS TIER LIST (CORRIGÉ & SÉCURISÉ) --- */}
                {session.game.id === 'tierlist' && session.sharedData?.players && (
                  <div className="space-y-4">
                    {[
                      { guesser: "Moi", target: "Chéri(e)", data: session.sharedData.players["Moi"] },
                      { guesser: "Chéri(e)", target: "Moi", data: session.sharedData.players["Chéri(e)"] }
                    ].map((entry, i) => {
                      // SÉCURITÉ : Récupération depuis sharedData avec fallback
                      const guessOrder = entry.data?.guessOrder || [];
                      const targetRealOrder = session.sharedData.players[entry.target]?.realOrder || [];

                      // Si les données ne sont pas prêtes, on n'affiche rien pour éviter le crash
                      if (guessOrder.length === 0 || targetRealOrder.length === 0) return null;

                      return (
                        <div key={i} className="bg-white p-5 rounded-[2.5rem] shadow-lg border border-gray-100">
                          <div className="flex items-center gap-2 mb-4">
                              <span className="text-2xl">{i === 0 ? '🤔' : '🧐'}</span>
                              <h3 className="font-black text-xs uppercase tracking-widest text-gray-400">
                                  {entry.guesser === currentUser ? 'Tes prédictions' : `Prédictions de ${entry.guesser}`}
                              </h3>
                          </div>

                          <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-4 text-[9px] font-black uppercase text-gray-300 text-center px-2">
                                  <span>Devinette</span>
                                  <span>Réalité ({entry.target})</span>
                              </div>

                              {guessOrder.map((guessId: any, idx: number) => {
                                  const realId = targetRealOrder[idx];
                                  
                                  // SÉCURITÉ : Recherche de l'item avec fallback
                                  const guessItem = session.sharedData.mission.items.find((it: any) => String(it.id) === String(guessId));
                                  const realItem = session.sharedData.mission.items.find((it: any) => String(it.id) === String(realId));
                                  
                                  if (!guessItem || !realItem) return null;

                                  const isMatch = String(guessId) === String(realId);

                                  return (
                                      <div key={idx} className={`relative flex items-center justify-between p-2 rounded-xl border-2 ${isMatch ? 'border-green-100 bg-green-50/50' : 'border-red-50 bg-red-50/30'}`}>
                                          <div className="flex items-center gap-2 w-[45%]">
                                              <img src={guessItem.url} className="w-8 h-8 rounded-lg object-cover shadow-sm" />
                                              <span className="text-[10px] font-bold text-gray-700 truncate">{guessItem.label}</span>
                                          </div>
                                          <div className={`absolute left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center border-2 z-10 ${isMatch ? 'bg-green-500 border-white text-white' : 'bg-white border-red-100 text-red-300'}`}>
                                              {isMatch ? <Check size={12} strokeWidth={4} /> : <X size={12} strokeWidth={3} />}
                                          </div>
                                          <div className="flex items-center justify-end gap-2 w-[45%]">
                                              <span className="text-[10px] font-bold text-gray-700 truncate text-right">{realItem.label}</span>
                                              <img src={realItem.url} className="w-8 h-8 rounded-lg object-cover shadow-sm" />
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Message d'attente */}
                <div className="bg-blue-600 rounded-[2rem] p-6 text-white flex items-center gap-4 shadow-lg animate-pulse">
                  <div className="bg-white/20 p-3 rounded-2xl"><Clock size={24} /></div>
                  <div className="text-left">
                    <p className="font-black uppercase text-xs tracking-widest mb-1">Session terminée</p>
                    <p className="text-sm font-medium opacity-90">Rendez-vous demain pour le prochain jeu !</p>
                  </div>
                </div>

                {/* Classement Semaine */}
                <div className="bg-gray-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                  <Star className="absolute -top-6 -right-6 text-yellow-400 opacity-10 w-32 h-32 rotate-12" />
                  <h3 className="text-xl font-black mb-8 italic flex items-center gap-3">
                    <span className="bg-yellow-400 text-black px-3 py-1 rounded-xl not-italic text-sm uppercase tracking-tighter">Score</span> 
                    CUMUL SEMAINE
                  </h3>
                  <div className="space-y-4">
                    {Object.entries(session.weeklyRanking || {})
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([name, score], index) => (
                        <div key={name} className={`flex items-center justify-between p-5 rounded-3xl ${index === 0 ? 'bg-white/10 border border-white/20' : 'bg-white/5 opacity-60'}`}>
                          <div className="flex items-center gap-4">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${index === 0 ? 'bg-yellow-400 text-black' : 'bg-gray-700 text-gray-500'}`}>{index + 1}</span>
                            <span className="font-bold text-lg">{name}</span>
                          </div>
                          <span className="text-2xl font-black text-yellow-400">{score as number} <span className="text-[10px] text-white/30 uppercase tracking-widest ml-1">Pts</span></span>
                        </div>
                      ))}
                  </div>  
                </div>
                
                <button onClick={handleGlobalReset} className="w-full py-4 text-gray-400 font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3 opacity-40 hover:opacity-100 transition-all">
                  <RefreshCw size={14} /> Recommencer (Reset)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}