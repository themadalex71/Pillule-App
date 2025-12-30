'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Send, Star, Loader2 } from 'lucide-react';
import { MEME_TEMPLATES } from '@/lib/gameUtils';

const RATINGS = [
  { label: "Nul 😶", value: 0 },
  { label: "Pas drôle 😐", value: 1 },
  { label: "Bof 🤨", value: 2 },
  { label: "Drôle 😂", value: 3 },
  { label: "MDR 💀", value: 5 }
];

export default function MemeGame({ onFinish, currentUser }: any) {
  const [step, setStep] = useState<'editing' | 'waiting' | 'voting' | 'results'>('editing');
  const [myMemes, setMyMemes] = useState<any[]>([]);
  const [rerolls, setRerolls] = useState([2, 2]); // 2 rerolls par meme
  const [opponentMemes, setOpponentMemes] = useState<any[]>([]);

  // Initialisation : Tirage de 2 memes au hasard
  useEffect(() => {
    const t1 = MEME_TEMPLATES[Math.floor(Math.random() * MEME_TEMPLATES.length)];
    const t2 = MEME_TEMPLATES[Math.floor(Math.random() * MEME_TEMPLATES.length)];
    setMyMemes([
      { ...t1, text: '', id: 'm1' },
      { ...t2, text: '', id: 'm2' }
    ]);
  }, []);

  const handleReroll = (index: number) => {
    if (rerolls[index] > 0) {
      const newTemplate = MEME_TEMPLATES[Math.floor(Math.random() * MEME_TEMPLATES.length)];
      const newMemes = [...myMemes];
      newMemes[index] = { ...newTemplate, text: '', id: `m${index+1}` };
      setMyMemes(newMemes);
      
      const newRerolls = [...rerolls];
      newRerolls[index]--;
      setRerolls(newRerolls);
    }
  };

  const submitMyMemes = async () => {
    // On envoie à Redis via une nouvelle API /api/meme-turn
    // On stocke sous : meme_player_[NomUser]
    await fetch('/api/meme-turn', {
      method: 'POST',
      body: JSON.stringify({ 
        player: currentUser, 
        memes: myMemes 
      })
    });
    setStep('waiting');
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {step === 'editing' && (
        <>
          <p className="text-center text-sm font-medium text-purple-600">Complète tes 2 memes :</p>
          {myMemes.map((meme, idx) => (
            <div key={idx} className="bg-gray-100 p-4 rounded-2xl border-2 border-white shadow-inner">
              <div className="relative aspect-square bg-black rounded-lg overflow-hidden mb-3">
                <img src={meme.url} className="w-full h-full object-contain opacity-80" />
                <div className="absolute inset-0 flex items-center justify-center p-4">
                   <p className="text-white font-black text-xl uppercase text-center drop-shadow-[0_2px_2px_rgba(0,0,0,1)] break-words w-full">
                     {meme.text || "TA LÉGENDE ICI"}
                   </p>
                </div>
              </div>
              
              <input 
                type="text"
                placeholder="Écris un truc drôle..."
                className="w-full p-3 rounded-xl border-none shadow-sm focus:ring-2 focus:ring-purple-500 mb-2"
                value={meme.text}
                onChange={(e) => {
                  const newMemes = [...myMemes];
                  newMemes[idx].text = e.target.value;
                  setMyMemes(newMemes);
                }}
              />
              
              <button 
                onClick={() => handleReroll(idx)}
                disabled={rerolls[idx] === 0}
                className="text-xs flex items-center gap-1 text-gray-500 hover:text-purple-600 disabled:opacity-30"
              >
                <RefreshCw size={14} /> Changer d'image ({rerolls[idx]})
              </button>
            </div>
          ))}

          <button 
            onClick={submitMyMemes}
            disabled={myMemes.some(m => !m.text)}
            className="w-full bg-purple-600 text-white font-bold py-4 rounded-2xl shadow-lg disabled:bg-gray-300"
          >
            Envoyer mes Memes 🚀
          </button>
        </>
      )}

      {step === 'waiting' && (
        <div className="text-center py-10">
          <Loader2 className="animate-spin mx-auto text-purple-600 mb-4" size={40} />
          <h3 className="font-bold text-lg">En attente de l'autre poète...</h3>
        </div>
      )}
    </div>
  );
}