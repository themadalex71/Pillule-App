'use client';

import { useState, useEffect } from 'react';
import { Loader2, Send, RotateCcw } from 'lucide-react';

export default function MemeGame({ onFinish, currentUser }: any) {
  const [loading, setLoading] = useState(true);
  const [allTemplates, setAllTemplates] = useState<any[]>([]); // On garde la liste complète
  const [step, setStep] = useState<'editing' | 'waiting'>('editing');
  const [myMemes, setMyMemes] = useState<any[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

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
          rerollsLeft: 2 // 2 relances par meme
        })));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // FONCTION POUR RELANCER UN SEUL MEME
  const handleReroll = (idx: number) => {
    if (myMemes[idx].rerollsLeft <= 0 || allTemplates.length === 0) return;

    const newTemplate = allTemplates[Math.floor(Math.random() * allTemplates.length)];
    const next = [...myMemes];
    
    next[idx] = {
      ...newTemplate,
      instanceId: `meme_${idx}_${Date.now()}`,
      inputs: {}, // On réinitialise le texte car le template change
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
    setStep('waiting');
    try {
      await fetch('/api/meme-turn', {
        method: 'POST',
        body: JSON.stringify({
          player: currentUser,
          memes: myMemes.map(m => ({ url: m.url, zones: m.zones, inputs: m.inputs, name: m.name }))
        })
      });
      if (onFinish) onFinish();
    } catch (e) { console.error(e); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Préparation du studio...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-lg mx-auto pb-10 px-2">
      {step === 'editing' ? (
        <>
          <div className="text-center space-y-1">
             <h3 className="text-xl font-bold text-gray-900">Meme Maker</h3>
             <p className="text-xs text-gray-500 font-medium italic">Complète les zones de texte</p>
          </div>

          {myMemes.map((meme, mIdx) => (
            <div key={mIdx} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
              
              {/* RENDU DU MEME */}
              <div className="relative w-full bg-gray-50 flex items-center justify-center border-b min-h-[250px]">
                <img src={meme.url} className="w-full h-auto block" alt="Template" />
                
                {/* BOUTON REROLL INDIVIDUEL */}
                <button 
                  onClick={() => handleReroll(mIdx)}
                  disabled={meme.rerollsLeft === 0}
                  className={`absolute top-2 right-2 p-2 rounded-full shadow-md transition-all flex items-center gap-1 text-[10px] font-bold
                    ${meme.rerollsLeft > 0 ? 'bg-white text-blue-600 hover:bg-blue-50' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                >
                  <RotateCcw size={14} className={meme.rerollsLeft > 0 ? "" : "opacity-50"} />
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

              {/* CHAMPS DE SAISIE */}
              <div className="p-4 bg-white space-y-3">
                {meme.zones?.map((zone: any, zIdx: number) => (
                  <div key={zone.id}>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Zone {zIdx + 1}</label>
                    <textarea 
                      rows={2} 
                      value={meme.inputs[zone.id] || ''}
                      placeholder="Ton texte ici..." 
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
      ) : (
        <div className="text-center py-20 animate-in fade-in slide-in-from-bottom-4">
           <h3 className="text-lg font-bold text-gray-900">C'est envoyé ! 🛸</h3>
           <p className="text-sm text-gray-500 mt-2">Attendons que l'autre joueur termine.</p>
        </div>
      )}
    </div>
  );
}