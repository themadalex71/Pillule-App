'use client';

import { useState, useEffect } from 'react';
import { Loader2, Send } from 'lucide-react';

export default function MemeGame({ onFinish, currentUser }: any) {
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'editing' | 'waiting'>('editing');
  const [myMemes, setMyMemes] = useState<any[]>([]);

  useEffect(() => {
    loadRandomTemplates();
  }, []);

  const loadRandomTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/content?gameId=meme');
      const allTemplates = await res.json();
      
      if (allTemplates && allTemplates.length >= 2) {
        const shuffled = [...allTemplates].sort(() => 0.5 - Math.random());
        const selection = shuffled.slice(0, 2);
        
        setMyMemes(selection.map((t: any, idx: number) => {
          if (!t || typeof t !== 'object') return null;
          return {
            ...t,
            instanceId: `meme_${idx}_${Date.now()}`,
            inputs: {} 
          };
        }).filter(Boolean));
      }
    } catch (e) {
      console.error("Erreur de chargement", e);
    }
    setLoading(false);
  };

  const updateInput = (memeIdx: number, zoneId: number, val: string) => {
    const nextMemes = [...myMemes];
    nextMemes[memeIdx].inputs[zoneId] = val;
    setMyMemes(nextMemes);
  };

  const submitToJudge = async () => {
    setStep('waiting');
    try {
      await fetch('/api/meme-turn', {
        method: 'POST',
        body: JSON.stringify({
          player: currentUser,
          memes: myMemes.map(m => ({
            url: m.url,
            zones: m.zones,
            inputs: m.inputs,
            name: m.name
          }))
        })
      });
      if (onFinish) onFinish();
    } catch (e) {
      console.error("Erreur d'envoi", e);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Préparation du studio...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-lg mx-auto pb-10 px-2">
      {step === 'editing' ? (
        <>
          <div className="text-center space-y-1">
             <h3 className="text-xl font-bold text-gray-900">Meme Maker</h3>
             <p className="text-xs text-gray-500 font-medium">Laisse parler ton génie (ou ta bêtise).</p>
          </div>

          {myMemes.map((meme, mIdx) => (
            <div key={mIdx} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {/* RENDU DU MEME (MAXIMISÉ) */}
              <div className="relative w-full bg-gray-50 flex items-center justify-center border-b">
                <img src={meme.url} className="w-full h-auto block" alt="Template" />
                
                {meme.zones?.map((zone: any) => (
                  <div 
                    key={zone.id}
                    style={{ 
                      top: `${zone.top}%`, 
                      left: `${zone.left}%`,
                      width: `${zone.width}%`,
                      height: `${zone.height}%`,
                      fontSize: `${zone.fontSize}px`,
                      color: zone.color || '#ffffff',
                      fontFamily: 'Inter, system-ui, sans-serif', // Police propre
                      fontWeight: '700',
                      lineHeight: '1.2',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap',
                      textShadow: zone.color === '#ffffff' || zone.color === '#FFFFFF' 
                        ? '0px 1px 3px rgba(0,0,0,0.8)' 
                        : 'none' // Ombre légère pour le blanc, sinon rien
                    }}
                    className="absolute pointer-events-none p-1"
                  >
                    {meme.inputs[zone.id] || ""}
                  </div>
                ))}
              </div>

              {/* CHAMPS DE SAISIE ÉPURÉS */}
              <div className="p-4 bg-white space-y-3">
                {meme.zones?.map((zone: any, zIdx: number) => (
                  <div key={zone.id}>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">
                      Zone de texte {zIdx + 1}
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Tape ton texte ici..."
                      className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-semibold resize-none"
                      onChange={(e) => updateInput(mIdx, zone.id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button 
            onClick={submitToJudge}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-100 flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-[0.98] transition-all"
          >
            Valider mes memes 🚀
          </button>
        </>
      ) : (
        <div className="text-center py-20 animate-in fade-in slide-in-from-bottom-4">
           <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="text-blue-600" size={24} />
           </div>
           <h3 className="text-lg font-bold text-gray-900">C'est dans la boîte !</h3>
           <p className="text-sm text-gray-500">Tes memes sont partis en salle de notation.</p>
        </div>
      )}
    </div>
  );
}