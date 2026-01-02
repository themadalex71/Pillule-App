'use client';

import { useState } from 'react';
import { RefreshCw, Send, Loader2, Check, Star } from 'lucide-react';

const EMOJIS = [
  { label: 'Null', icon: '🤮', score: 0 },
  { label: 'Pas drôle', icon: '😐', score: 1 },
  { label: 'Bof', icon: '🙂', score: 2 },
  { label: 'Drôle', icon: '😂', score: 3 },
  { label: 'Mort de rire', icon: '💀', score: 4 },
];

export default function MemeGame({ session, currentUser, onAction }: any) {
  const { phase, players } = session.sharedData;
  const myData = players[currentUser];
  const opponentName = currentUser === 'Moi' ? 'Chéri(e)' : 'Moi';
  const opponentData = players[opponentName];
  
  // États locaux
  const [localInputs, setLocalInputs] = useState<any[]>([{}, {}]); // Texte pour meme 1 et 2
  const [votes, setVotes] = useState<number[]>([2, 2]); // Votes par défaut (Bof)
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mise à jour des textes
  const handleInputChange = (memeIndex: number, zoneId: number, text: string) => {
    const newInputs = [...localInputs];
    newInputs[memeIndex] = { ...newInputs[memeIndex], [zoneId]: text };
    setLocalInputs(newInputs);
  };

  // --- PHASE 1 : CRÉATION ---
  if (phase === 'CREATION') {
    if (myData.finished) {
      return (
        <div className="flex flex-col items-center justify-center p-10 bg-white rounded-[2.5rem] text-center gap-6 shadow-xl animate-in zoom-in-95">
          <div className="bg-green-100 p-6 rounded-full text-green-600 animate-bounce">
            <Check size={48} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">C'est envoyé !</h3>
            <p className="text-gray-500 font-medium mt-2">En attente de {opponentName}...</p>
          </div>
          <div className="flex gap-2 mt-4">
             <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}/>
             <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}/>
             <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}/>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8 animate-in fade-in">
        <div className="bg-blue-600 p-6 rounded-[2rem] text-white text-center shadow-lg">
            <h3 className="text-xl font-black uppercase tracking-tighter">À toi de jouer !</h3>
            <p className="opacity-90 text-sm">Remplis les cases vides pour faire rire l'autre.</p>
        </div>

        {myData.memes.map((meme: any, index: number) => (
          <div key={meme.id + index} className="bg-white p-4 rounded-[2rem] shadow-xl border border-gray-100">
             {/* HEADER MEME : TITRE + REROLL */}
             <div className="flex justify-between items-center mb-4 px-2">
                <span className="font-black text-gray-400 text-[10px] uppercase tracking-widest">Meme #{index + 1}</span>
                {myData.rerolls[index] > 0 && (
                    <button 
                        onClick={() => onAction({ action: 'meme_reroll', memeIndex: index })}
                        className="flex items-center gap-1 text-[10px] font-bold bg-gray-100 px-3 py-1.5 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"
                    >
                        <RefreshCw size={12}/> Changer ({myData.rerolls[index]})
                    </button>
                )}
             </div>

             {/* IMAGE + ZONES INPUTS */}
             <div className="relative aspect-square bg-gray-900 rounded-2xl overflow-hidden mb-4">
                <img src={meme.url} className="w-full h-full object-contain pointer-events-none" />
                {meme.zones.map((zone: any) => (
                    <textarea
                        key={zone.id}
                        placeholder="..."
                        value={localInputs[index][zone.id] || ''}
                        onChange={(e) => handleInputChange(index, zone.id, e.target.value)}
                        style={{
                            top: `${zone.top}%`, left: `${zone.left}%`, width: `${zone.width}%`, height: `${zone.height}%`,
                            fontSize: `${Math.max(10, zone.fontSize / 2)}px`, // Echelle réduite pour mobile
                            color: zone.color,
                            textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                        }}
                        className="absolute bg-transparent border-2 border-dashed border-white/50 focus:border-blue-400 rounded-lg p-1 resize-none outline-none font-black text-center leading-tight placeholder:text-white/30 overflow-hidden"
                    />
                ))}
             </div>
          </div>
        ))}

        <button 
            onClick={() => { setIsSubmitting(true); onAction({ action: 'meme_submit_creation', inputs: localInputs }); }}
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white font-black py-5 rounded-[2rem] shadow-lg flex items-center justify-center gap-3 uppercase tracking-tighter active:scale-95 transition-all"
        >
            {isSubmitting ? <Loader2 className="animate-spin"/> : <><Send size={20}/> Valider mes mèmes</>}
        </button>
      </div>
    );
  }

  // --- PHASE 2 : VOTE ---
  if (phase === 'VOTE') {
    // Si j'ai déjà voté
    if (opponentData.votesReceived && opponentData.votesReceived.length > 0) {
       return (
        <div className="flex flex-col items-center justify-center p-10 bg-white rounded-[2.5rem] text-center gap-6 shadow-xl animate-in zoom-in-95">
          <div className="bg-yellow-100 p-6 rounded-full text-yellow-600 animate-pulse">
            <Star size={48} fill="currentColor" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Votes enregistrés !</h3>
            <p className="text-gray-500 font-medium mt-2">Calcul des scores en cours...</p>
          </div>
        </div>
       );
    }

    // Je dois voter
    return (
        <div className="space-y-8 animate-in slide-in-from-right-8">
            <div className="bg-yellow-400 p-6 rounded-[2rem] text-black text-center shadow-lg">
                <h3 className="text-xl font-black uppercase tracking-tighter">Phase de Vote !</h3>
                <p className="text-sm font-bold opacity-80">Note les créations de {opponentName}</p>
            </div>

            {opponentData.memes.map((meme: any, index: number) => (
                <div key={meme.id + '_vote'} className="bg-white p-4 rounded-[2rem] shadow-xl border border-gray-100">
                    <div className="relative aspect-square bg-gray-900 rounded-2xl overflow-hidden mb-6">
                        <img src={meme.url} className="w-full h-full object-contain" />
                        {meme.zones.map((zone: any) => (
                            <div key={zone.id}
                                style={{
                                    top: `${zone.top}%`, left: `${zone.left}%`, width: `${zone.width}%`, height: `${zone.height}%`,
                                    fontSize: `${Math.max(10, zone.fontSize / 2)}px`,
                                    color: zone.color,
                                    textShadow: '0 2px 4px rgba(0,0,0,1)'
                                }}
                                className="absolute flex items-center justify-center text-center font-black leading-tight break-words whitespace-pre-wrap"
                            >
                                {opponentData.inputs[index][zone.id] || ''}
                            </div>
                        ))}
                    </div>

                    {/* BARRE DE VOTE EMOJI */}
                    <div className="flex justify-between bg-gray-50 rounded-2xl p-2">
                        {EMOJIS.map((e) => (
                            <button key={e.label} 
                                onClick={() => {
                                    const newVotes = [...votes];
                                    newVotes[index] = e.score;
                                    setVotes(newVotes);
                                }}
                                className={`flex flex-col items-center p-2 rounded-xl transition-all active:scale-90 ${votes[index] === e.score ? 'bg-white shadow-md scale-110' : 'opacity-50 grayscale'}`}
                            >
                                <span className="text-2xl">{e.icon}</span>
                                <span className="text-[8px] font-black uppercase mt-1">{e.score} pts</span>
                            </button>
                        ))}
                    </div>
                </div>
            ))}

            <button 
                onClick={() => { setIsSubmitting(true); onAction({ action: 'meme_submit_vote', votes }); }}
                disabled={isSubmitting}
                className="w-full bg-black text-white font-black py-5 rounded-[2rem] shadow-lg flex items-center justify-center gap-3 uppercase tracking-tighter active:scale-95 transition-all"
            >
                {isSubmitting ? <Loader2 className="animate-spin"/> : <><Star fill="currentColor" size={20}/> Envoyer les notes</>}
            </button>
        </div>
    );
  }

  // Phase RESULTS gérée par le parent (page.tsx)
  return null;
}