'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, Send, RotateCcw, Trophy } from 'lucide-react';

export default function MemeGame({ onFinish, currentUser }: any) {
  const [loading, setLoading] = useState(true);
  const [allTemplates, setAllTemplates] = useState<any[]>([]);
  const [step, setStep] = useState<'editing' | 'waiting' | 'voting' | 'waiting_votes' | 'results'>('editing');
  
  const [myMemes, setMyMemes] = useState<any[]>([]);
  const [othersMemes, setOthersMemes] = useState<any[]>([]);
  const [results, setResults] = useState<any>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentVoteIdx, setCurrentVoteIdx] = useState(0);
  const [accumulatedScore, setAccumulatedScore] = useState(0);
  
  const opponentName = currentUser === 'Joueur A' ? 'Joueur B' : 'Joueur A';
  const lastUserRef = useRef(currentUser);

  const voteLabels = [
    { value: 0, label: "Nul", emoji: "🚮", color: "hover:bg-red-500" },
    { value: 1, label: "Bof", emoji: "😐", color: "hover:bg-orange-400" },
    { value: 2, label: "Pas mal", emoji: "🙂", color: "hover:bg-yellow-400" },
    { value: 3, label: "Drôle", emoji: "😂", color: "hover:bg-green-400" },
    { value: 4, label: "MDR", emoji: "💀", color: "hover:bg-purple-500" },
  ];

  // Initialisation et Reset quand on change de joueur (Mode Testeur)
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setStep('editing');
      setCurrentVoteIdx(0);
      setAccumulatedScore(0);
      
      try {
        const res = await fetch('/api/content?gameId=meme');
        const data = await res.json();
        setAllTemplates(data);
        
        if (data && data.length >= 2) {
          // Mélange et sélection de 2 memes uniques pour ce joueur
          const selection = [...data].sort(() => 0.5 - Math.random()).slice(0, 2);
          setMyMemes(selection.map((t: any, idx: number) => ({
            ...t, 
            instanceId: `meme_${currentUser}_${Date.now()}_${idx}`, 
            inputs: {},
            rerollsLeft: 2 
          })));
        }
        // Après l'init, on vérifie si une partie est déjà en cours
        await checkStatus();
      } catch (e) { console.error(e); }
      setLoading(false);
    };

    init();
    lastUserRef.current = currentUser;
  }, [currentUser]);

  // Boucle de surveillance
  useEffect(() => {
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [currentUser, step]);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/game-turn');
      const data = await res.json();
      const turns = data.memes || [];
      const votes = data.votes || {};
      
      const myTurn = turns.find((t: any) => t.player === currentUser);
      const opponentTurn = turns.find((t: any) => t.player === opponentName);
      
      // Points REÇUS par les joueurs
      const myScoreReceived = votes[currentUser]; 
      const opponentScoreReceived = votes[opponentName];

      // 1. Si les deux ont reçu des notes -> Résultats
      if (myScoreReceived !== undefined && opponentScoreReceived !== undefined) {
        setResults({ myScore: myScoreReceived, opponentScore: opponentScoreReceived });
        setStep('results');
        return;
      }

      // 2. Si j'ai déjà fini de noter l'autre -> Attente de son vote
      if (opponentScoreReceived !== undefined) {
        setStep('waiting_votes');
        return;
      }

      // 3. Si les deux ont soumis leurs memes -> Phase de Vote
      if (myTurn && opponentTurn) {
        setOthersMemes(opponentTurn.memes);
        setStep('voting');
        return;
      } 
      
      // 4. Si j'ai soumis mais pas l'autre -> Attente
      if (myTurn) {
        setStep('waiting');
      } else {
        setStep('editing');
      }
    } catch (e) { console.error(e); }
  };

  const handleReroll = (idx: number) => {
    if (myMemes[idx].rerollsLeft <= 0 || allTemplates.length === 0) return;
    const currentIds = myMemes.map(m => m.id);
    const availableTemplates = allTemplates.filter(t => !currentIds.includes(t.id));
    const sourceList = availableTemplates.length > 0 ? availableTemplates : allTemplates;
    const newTemplate = sourceList[Math.floor(Math.random() * sourceList.length)];
    
    const next = [...myMemes];
    next[idx] = {
      ...newTemplate,
      instanceId: `meme_${currentUser}_${Date.now()}_reroll_${idx}`,
      inputs: {}, 
      rerollsLeft: myMemes[idx].rerollsLeft - 1
    };
    setMyMemes(next);
  };

  const submitToJudge = async () => {
    setIsSubmitting(true);
    const turnData = {
      type: 'meme',
      player: currentUser,
      memes: myMemes.map(m => ({ 
        url: m.url, 
        zones: m.zones, 
        inputs: m.inputs, 
        instanceId: m.instanceId 
      }))
    };
    try {
      await fetch('/api/game-turn', { method: 'POST', body: JSON.stringify(turnData) });
      setStep('waiting');
    } catch (e) { console.error(e); }
    setIsSubmitting(false);
  };

  const handleVoteClick = async (score: number) => {
    const newTotal = accumulatedScore + score;
    
    if (currentVoteIdx < othersMemes.length - 1) {
      setAccumulatedScore(newTotal);
      setCurrentVoteIdx(prev => prev + 1);
    } else {
      setIsSubmitting(true);
      // On envoie le score final que l'on donne à l'adversaire
      await fetch('/api/game-turn', {
        method: 'PATCH',
        body: JSON.stringify({ voter: currentUser, score: newTotal })
      });
      setIsSubmitting(false);
      setStep('waiting_votes');
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Initialisation...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-lg mx-auto pb-6 text-gray-900">
      
      {step === 'editing' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center mb-6">
             <h3 className="text-2xl font-black italic tracking-tighter uppercase">Meme Maker</h3>
             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Crée tes légendes</p>
          </div>
          {myMemes.map((meme, mIdx) => (
            <div key={mIdx} className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden mb-6">
              <div className="relative w-full bg-gray-50 flex items-center justify-center border-b min-h-[250px]">
                <img src={meme.url} className="w-full h-auto block" alt="Template" />
                <button 
                  onClick={() => handleReroll(mIdx)}
                  disabled={meme.rerollsLeft === 0}
                  className={`absolute top-3 right-3 p-2.5 rounded-2xl shadow-lg transition-all flex items-center gap-2 text-[10px] font-black uppercase
                    ${meme.rerollsLeft > 0 ? 'bg-white text-blue-600 hover:scale-110' : 'bg-gray-100 text-gray-300'}`}
                >
                  <RotateCcw size={14} /> {meme.rerollsLeft}
                </button>
                {meme.zones?.map((zone: any) => (
                  <div key={zone.id}
                    style={{ 
                      top: `${zone.top}%`, left: `${zone.left}%`, width: `${zone.width}%`, height: `${zone.height}%`,
                      fontSize: `${zone.fontSize}px`, color: zone.color || '#ffffff',
                      fontFamily: 'Inter, system-ui, sans-serif', fontWeight: '900',
                      display: 'flex', textShadow: '0px 2px 4px rgba(0,0,0,0.8)', position: 'absolute'
                    }}
                    className="pointer-events-none p-1"
                  >
                    {meme.inputs[zone.id] || ""}
                  </div>
                ))}
              </div>
              <div className="p-5 bg-white space-y-4">
                {meme.zones?.map((zone: any, zIdx: number) => (
                  <div key={zone.id}>
                    <label className="text-[9px] font-black text-gray-400 uppercase mb-1">Zone {zIdx + 1}</label>
                    <textarea 
                      rows={2} 
                      value={meme.inputs[zone.id] || ''}
                      className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm resize-none"
                      onChange={(e) => {
                        const next = [...myMemes];
                        next[mIdx].inputs[zone.id] = e.target.value;
                        setMyMemes(next);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button onClick={submitToJudge} disabled={isSubmitting} className="w-full bg-gray-900 text-white font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 uppercase text-sm tracking-widest">
            {isSubmitting ? <Loader2 className="animate-spin" /> : <><Send size={18} /> Valider mes memes</>}
          </button>
        </div>
      )}

      {(step === 'waiting' || step === 'waiting_votes') && (
        <div className="text-center py-20 flex flex-col items-center">
           <div className="bg-blue-50 p-8 rounded-full mb-6">
              <Loader2 className="animate-spin text-blue-500" size={48} />
           </div>
           <h3 className="text-2xl font-black italic uppercase">
             {step === 'waiting' ? "Attente de l'adversaire..." : "Attente de son vote..."}
           </h3>
           <p className="text-sm text-gray-500 mt-2 font-medium tracking-tight">Laisse {opponentName} finir sa partie.</p>
        </div>
      )}

      {/* 3. ÉTAPE VOTE (Modifiée pour éviter les coupures) */}
      {step === 'voting' && othersMemes[currentVoteIdx] && (
        <div className="flex flex-col gap-6 animate-in slide-in-from-right-8 duration-500">
          <div className="text-center">
            <h3 className="text-2xl font-black text-gray-900 italic uppercase">Notation ({currentVoteIdx + 1}/{othersMemes.length})</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Note la création de {opponentName}</p>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100">
            {/* Changement ici : On enlève aspect-square et on utilise min-h comme dans l'édition */}
            <div className="relative w-full bg-gray-50 flex items-center justify-center border-b min-h-[250px]">
              <img 
                src={othersMemes[currentVoteIdx].url} 
                className="w-full h-auto block" // h-auto pour garder les proportions réelles
                alt="Meme à noter" 
              />
              
              {othersMemes[currentVoteIdx].zones.map((zone: any) => (
                <div key={zone.id} style={{
                  position: 'absolute', 
                  top: `${zone.top}%`, 
                  left: `${zone.left}%`,
                  width: `${zone.width}%`, 
                  height: `${zone.height}%`,
                  fontSize: `${zone.fontSize}px`, 
                  color: zone.color || '#ffffff',
                  fontFamily: 'Inter, sans-serif', 
                  fontWeight: '900',
                  textShadow: '0px 2px 8px rgba(0,0,0,0.9)', 
                  lineHeight: '1.1',
                  display: 'flex', // Pour aligner le texte si besoin
                  pointerEvents: 'none'
                }}>
                  {othersMemes[currentVoteIdx].inputs[zone.id]}
                </div>
              ))}
            </div>

            {/* Boutons de vote */}
            <div className="p-6 bg-white grid grid-cols-1 gap-2.5">
              {voteLabels.map((v) => (
                <button
                  key={v.value}
                  onClick={() => handleVoteClick(v.value)}
                  className={`w-full py-4 rounded-2xl bg-gray-50 border border-transparent font-black text-xs transition-all active:scale-95 flex items-center justify-between px-6 ${v.color} hover:text-white group`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{v.emoji}</span>
                    <span className="uppercase tracking-widest">{v.label}</span>
                  </div>
                  <span className="font-bold">+{v.value} PTS</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 'results' && results && (
        <div className="flex flex-col items-center">
          <div className="text-center mb-8">
            <Trophy className="mx-auto text-yellow-500 mb-2" size={60} />
            <h3 className="text-3xl font-black italic uppercase">Bilan des Votes</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-purple-100 text-center">
               <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Tes Points</p>
               <p className="text-5xl font-black text-purple-600">{results.myScore}</p>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-gray-100 text-center">
               <p className="text-[10px] font-black uppercase text-gray-400 mb-1">{opponentName}</p>
               <p className="text-5xl font-black text-gray-900">{results.opponentScore}</p>
            </div>
          </div>
          <button 
            onClick={async () => {
                await fetch('/api/game-turn?game=meme', { method: 'DELETE' });
                onFinish(results.myScore);
            }} 
            className="w-full mt-10 bg-gray-900 text-white font-black py-5 rounded-[2rem] uppercase text-sm tracking-widest"
          >
            Clôturer le duel
          </button>
        </div>
      )}
    </div>
  );
}