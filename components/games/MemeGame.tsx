'use client';

import { useState, useEffect } from 'react';
import { Loader2, Send, RefreshCw } from 'lucide-react';

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
        // On mélange et on prend 2 templates au hasard
        const shuffled = [...allTemplates].sort(() => 0.5 - Math.random());
        const selection = shuffled.slice(0, 2);
        
        setMyMemes(selection.map((t: any, idx: number) => ({
          ...t,
          instanceId: `meme_${idx}_${Date.now()}`,
          inputs: {} // Contiendra les textes saisis par le joueur
        })));
      }
    } catch (e) {
      console.error("Erreur de chargement des templates", e);
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
    
    // Sauvegarde dans Redis pour que l'adversaire puisse voter
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
      // On prévient le parent qu'on a fini cette étape
      if (onFinish) onFinish();
    } catch (e) {
      console.error("Erreur d'envoi", e);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center gap-4 py-12">
      <Loader2 className="animate-spin text-purple-600" size={40} />
      <p className="text-sm font-bold text-gray-400">Génération de tes memes...</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-10 w-full max-w-md mx-auto pb-10">
      {step === 'editing' ? (
        <>
          <div className="text-center">
             <h3 className="text-lg font-black text-gray-800 uppercase italic">Écris tes légendes ✍️</h3>
             <p className="text-xs text-gray-500">Tes memes seront ensuite notés par l'autre joueur.</p>
          </div>

          {myMemes.map((meme, mIdx) => (
            <div key={mIdx} className="bg-white rounded-3xl shadow-xl border border-gray-100 p-5 space-y-5">
              {/* APERÇU DU MEME AVEC STYLE PRO */}
              <div className="relative aspect-square bg-gray-900 rounded-2xl overflow-hidden shadow-inner border-4 border-white">
                <img src={meme.url} className="w-full h-full object-contain" alt="Template" />
                
                {meme.zones?.map((zone: any) => (
                  <div 
                    key={zone.id}
                    style={{ 
                      top: `${zone.top}%`, 
                      left: `${zone.left}%`,
                      width: `${zone.width}%`,
                      fontSize: `${zone.fontSize}px`,
                      color: zone.color || '#ffffff',
                      WebkitTextStroke: '1.5px black', // Contour noir pour la lisibilité
                      fontFamily: 'Impact, sans-serif', // Style classique meme
                      lineHeight: '1.1'
                    }}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 text-center font-black uppercase break-words pointer-events-none drop-shadow-lg"
                  >
                    {meme.inputs[zone.id] || ""}
                  </div>
                ))}
              </div>

              {/* INPUTS POUR CHAQUE ZONE DÉFINIE DANS L'ÉDITEUR */}
              <div className="space-y-3">
                {meme.zones?.map((zone: any, zIdx: number) => (
                  <div key={zone.id} className="relative">
                    <input
                      placeholder={`Texte de la zone ${zIdx + 1}...`}
                      className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-purple-500 focus:bg-white outline-none transition-all text-sm font-medium"
                      onChange={(e) => updateInput(mIdx, zone.id, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button 
            onClick={submitToJudge}
            className="w-full bg-gray-900 text-white font-black py-5 rounded-3xl shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-transform"
          >
            <Send size={22}/> ENVOYER MES MEMES
          </button>
        </>
      ) : (
        <div className="text-center py-20 animate-in fade-in zoom-in duration-500">
           <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Send className="text-green-600" size={32} />
           </div>
           <h3 className="text-2xl font-black text-gray-800">C'est envoyé !</h3>
           <p className="text-gray-500 mt-2">Prépare-toi à noter les memes de ton adversaire dès qu'il aura fini.</p>
        </div>
      )}
    </div>
  );
}