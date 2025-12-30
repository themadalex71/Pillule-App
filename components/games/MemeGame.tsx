'use client';

import { useState, useEffect } from 'react';
import { Loader2, RefreshCw, Send } from 'lucide-react';

export default function MemeGame({ onFinish, currentUser }: any) {
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'editing' | 'waiting'>('editing');
  const [myMemes, setMyMemes] = useState<any[]>([]);
  const [rerolls, setRerolls] = useState([2, 2]);

  useEffect(() => {
    loadInitialMemes();
  }, []);

  const loadInitialMemes = async () => {
    setLoading(true);
    try {
      // On récupère les memes du catalogue (Code + Redis)
      const res = await fetch('/api/content?gameId=meme');
      const allTemplates = await res.json();
      
      if (allTemplates.length >= 2) {
        const t1 = allTemplates[Math.floor(Math.random() * allTemplates.length)];
        const t2 = allTemplates[Math.floor(Math.random() * allTemplates.length)];
        
        // Initialisation avec des inputs vides pour chaque zone
        setMyMemes([
          { ...t1, inputs: {}, instanceId: 'm1' },
          { ...t2, inputs: {}, instanceId: 'm2' }
        ]);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const updateText = (memeIdx: number, zoneId: number, val: string) => {
    const newMemes = [...myMemes];
    newMemes[memeIdx].inputs[zoneId] = val;
    setMyMemes(newMemes);
  };

  const submitMemes = async () => {
    setStep('waiting');
    // Logique de sauvegarde Redis ici...
    // await fetch('/api/meme-turn', { ... })
  };

  if (loading) return <Loader2 className="animate-spin mx-auto text-purple-600" />;

  return (
    <div className="flex flex-col gap-8 w-full max-w-sm mx-auto">
      {step === 'editing' ? (
        <>
          {myMemes.map((meme, mIdx) => (
            <div key={mIdx} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 p-4">
              {/* APERÇU DU MEME AVEC TEXTES EN DIRECT */}
              <div className="relative aspect-square bg-gray-900 rounded-lg overflow-hidden mb-4">
                <img src={meme.url} className="w-full h-full object-contain" />
                {meme.zones?.map((zone: any) => (
                  <div 
                    key={zone.id}
                    style={{ top: `${zone.top}%`, left: `${zone.left}%` }}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 w-[80%] pointer-events-none"
                  >
                    <p className="text-white font-black text-xl uppercase text-center drop-shadow-[0_2px_2px_rgba(0,0,0,1)] leading-tight break-words">
                      {meme.inputs[zone.id] || ""}
                    </p>
                  </div>
                ))}
              </div>

              {/* INPUTS DYNAMIQUE SELON LES ZONES */}
              <div className="space-y-2">
                {meme.zones?.map((zone: any, zIdx: number) => (
                  <input
                    key={zone.id}
                    placeholder={`Texte ${zIdx + 1}...`}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                    onChange={(e) => updateText(mIdx, zone.id, e.target.value)}
                  />
                ))}
              </div>
            </div>
          ))}

          <button 
            onClick={submitMemes}
            className="w-full bg-purple-600 text-white font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2"
          >
            <Send size={20}/> Envoyer mes chefs-d'œuvre
          </button>
        </>
      ) : (
        <div className="text-center py-10 animate-pulse">
           <h3 className="text-xl font-bold">Chef-d'œuvre envoyé !</h3>
           <p className="text-gray-500 text-sm">On attend que l'autre termine d'écrire...</p>
        </div>
      )}
    </div>
  );
}