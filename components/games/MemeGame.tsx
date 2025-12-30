'use client';

import { useState, useEffect } from 'react';
import { Loader2, Send, RotateCcw } from 'lucide-react';

export default function MemeGame({ onFinish, currentUser }: any) {
  const [loading, setLoading] = useState(true);
  const [allTemplates, setAllTemplates] = useState<any[]>([]);
  const [step, setStep] = useState<'editing' | 'waiting' | 'voting'>('editing'); // Ajout de voting
  const [myMemes, setMyMemes] = useState<any[]>([]);
  const [othersMemes, setOthersMemes] = useState<any[]>([]);

  const voteLabels = [
    { value: 1, label: "Nul", emoji: "🚮", color: "hover:bg-red-500" },
    { value: 2, label: "Pas très drôle", emoji: "😐", color: "hover:bg-orange-400" },
    { value: 3, label: "Bof", emoji: "🫤", color: "hover:bg-yellow-400" },
    { value: 4, label: "Drôle", emoji: "😂", color: "hover:bg-green-400" },
    { value: 5, label: "MDR", emoji: "💀", color: "hover:bg-purple-500" },
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'waiting') {
      interval = setInterval(async () => {
        try {
          const res = await fetch('/api/game-turn');
          const data = await res.json();
          
          // On cherche dans data.memes (le nouveau format centralisé)
          const others = data.memes?.filter((m: any) => m.player !== currentUser);
          
          if (others && others.length > 0) {
            // On aplatit la liste car chaque joueur envoie un tableau de 2 memes
            const memesToVote = others.flatMap((o: any) => o.memes);
            setOthersMemes(memesToVote);
            setStep('voting');
            clearInterval(interval);
          }
        } catch (e) { console.error(e); }
      }, 3000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [step, currentUser]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/content?gameId=meme');
      const data = await res.json();
      setAllTemplates(data);
      
      if (data && data.length >= 2) {
        const selection = [...data].sort(() => 0.5 - Math.random()).slice(0, 2);
        setMyMemes(selection.map((t: any, idx: number) => ({
          ...t, 
          instanceId: `meme_${idx}_${Date.now()}`, 
          inputs: {},
          rerollsLeft: 2 
        })));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const submitVote = async (memeInstanceId: string, score: number) => {
    try {
      await fetch('/api/meme-vote', {
        method: 'POST',
        body: JSON.stringify({
          memeInstanceId,
          score,
          judgeName: currentUser
        })
      });
  
      setOthersMemes(prev => prev.filter(m => m.instanceId !== memeInstanceId));
  
      if (othersMemes.length <= 1) {
         setStep('waiting'); 
      }
    } catch (e) {
      console.error("Erreur lors du vote", e);
    }
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
      instanceId: `meme_${idx}_${Date.now()}`,
      inputs: {}, 
      rerollsLeft: myMemes[idx].rerollsLeft - 1
    };
    setMyMemes(next);
  };

  const updateInput = (memeIdx: number, zoneId: number, val: string) => {
    const next = [...myMemes];
    next[memeIdx].inputs[zoneId] = val;
    setMyMemes(next);
  };

  const submitToJudge = async () => {
    // 1. On prépare les données du tour
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
      // 2. On sauvegarde normalement dans Redis
      await fetch('/api/game-turn', {
        method: 'POST',
        body: JSON.stringify(turnData)
      });
  
      // 3. LOGIQUE SPÉCIALE TESTEUR
      if (currentUser === 'Testeur 🛠️') {
        // Au lieu d'attendre, on simule la réception des memes pour voter
        // On met ses propres memes dans 'othersMemes' pour pouvoir tester l'interface
        setOthersMemes(turnData.memes); 
        setStep('voting');
      } else {
        // Joueur normal : on passe en attente
        setStep('waiting');
      }
    } catch (e) { 
      console.error("Erreur lors de la validation:", e); 
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Préparation du studio...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-lg mx-auto pb-10 px-2">
      
      {/* 1. ÉTAPE ÉDITION */}
      {step === 'editing' && (
        <>
          <div className="text-center space-y-1">
             <h3 className="text-xl font-bold text-gray-900">Meme Maker</h3>
             <p className="text-xs text-gray-500 font-medium italic">Complète les zones de texte</p>
          </div>

          {myMemes.map((meme, mIdx) => (
            <div key={mIdx} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative mb-4">
              <div className="relative w-full bg-gray-50 flex items-center justify-center border-b min-h-[250px]">
                <img src={meme.url} className="w-full h-auto block" alt="Template" />
                <button 
                  onClick={() => handleReroll(mIdx)}
                  disabled={meme.rerollsLeft === 0}
                  className={`absolute top-2 right-2 p-2 rounded-full shadow-md transition-all flex items-center gap-1 text-[10px] font-bold
                    ${meme.rerollsLeft > 0 ? 'bg-white text-blue-600 hover:bg-blue-50' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                >
                  <RotateCcw size={14} />
                  {meme.rerollsLeft}
                </button>

                {meme.zones?.map((zone: any) => (
                  <div key={zone.id}
                    style={{ 
                      top: `${zone.top}%`, left: `${zone.left}%`, width: `${zone.width}%`, height: `${zone.height}%`,
                      fontSize: `${zone.fontSize}px`, color: zone.color || '#ffffff',
                      fontFamily: 'Inter, system-ui, sans-serif', fontWeight: '700', lineHeight: '1.2',
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start',
                      textAlign: 'left', overflow: 'hidden', wordBreak: 'break-word', whiteSpace: 'pre-wrap',
                      textShadow: '0px 1px 3px rgba(0,0,0,0.8)'
                    }}
                    className="absolute pointer-events-none p-1"
                  >
                    {meme.inputs[zone.id] || ""}
                  </div>
                ))}
              </div>

              <div className="p-4 bg-white space-y-3">
                {meme.zones?.map((zone: any, zIdx: number) => (
                  <div key={zone.id}>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Zone {zIdx + 1}</label>
                    <textarea 
                      rows={2} 
                      value={meme.inputs[zone.id] || ''}
                      className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-semibold resize-none"
                      onChange={(e) => updateInput(mIdx, zone.id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button onClick={submitToJudge} className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-blue-700 transition-all active:scale-95">
            Valider mes memes 🚀
          </button>
        </>
      )}

      {/* 2. ÉTAPE ATTENTE */}
      {step === 'waiting' && (
        <div className="text-center py-20 animate-in fade-in slide-in-from-bottom-4">
           <h3 className="text-lg font-bold text-gray-900">C'est envoyé ! 🛸</h3>
           <p className="text-sm text-gray-500 mt-2">Attendons que l'autre joueur termine.</p>
           {/* Bouton temporaire pour tester le vote manuellement */}
           <button onClick={() => setStep('voting')} className="mt-8 text-xs text-blue-500 underline">Simuler le début du vote</button>
        </div>
      )}

      {/* 3. ÉTAPE VOTE */}
      {step === 'voting' && (
        <div className="flex flex-col gap-6 animate-in fade-in">
          <h3 className="text-center font-bold text-xl italic uppercase">Le Jury délibère ⚖️</h3>
          {othersMemes.slice(0, 1).map((meme) => (
            <div key={meme.instanceId} className="bg-white rounded-3xl shadow-xl overflow-hidden border">
              <div className="relative w-full aspect-square bg-gray-900">
                <img src={meme.url} className="w-full h-full object-contain" alt="Meme à noter" />
                {meme.zones.map((zone: any) => (
                  <div key={zone.id} style={{
                    position: 'absolute', top: `${zone.top}%`, left: `${zone.left}%`,
                    width: `${zone.width}%`, height: `${zone.height}%`,
                    fontSize: `${zone.fontSize}px`, color: zone.color,
                    fontFamily: 'Inter, sans-serif', fontWeight: '900',
                    textShadow: '0px 2px 4px rgba(0,0,0,0.9)'
                  }}>
                    {meme.inputs[zone.id]}
                  </div>
                ))}
              </div>

              <div className="p-6 bg-gray-50 space-y-2">
                {voteLabels.map((v) => (
                  <button
                    key={v.value}
                    onClick={() => submitVote(meme.instanceId, v.value)}
                    className={`w-full py-3 rounded-xl bg-white border border-gray-100 font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-3 ${v.color} hover:text-white group`}
                  >
                    <span className="text-xl">{v.emoji}</span>
                    <span>{v.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}