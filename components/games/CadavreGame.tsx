'use client';

import { useState, useEffect } from 'react';
import { Send, Loader2, BookOpen, PenTool, Eye, Check } from 'lucide-react';

export default function CadavreGame({ session, currentUser, onAction }: any) {
  const { phase, stories, template } = session.sharedData;
  const [inputText, setInputText] = useState('');
  const [hasVoted, setHasVoted] = useState(false);

  // Vider le champ quand on change d'étape
  useEffect(() => {
    setInputText('');
  }, [phase]);

  // --- PHASE D'ÉCRITURE ---
  if (typeof phase === 'number') {
    const totalSteps = template.steps.length;
    const currentStepConfig = template.steps[phase];
    // Trouver l'histoire qui m'est assignée à cette étape
    const myStory = stories.find((s: any) => s.authors[phase] === currentUser);
    
    // Si j'ai déjà envoyé mon texte pour cette étape (écran d'attente)
    if (myStory.parts[phase] !== null) {
      return (
        <div className="flex flex-col items-center justify-center p-10 bg-white rounded-[2.5rem] text-center gap-6 shadow-xl animate-in zoom-in-95">
           <div className="bg-purple-100 p-6 rounded-full text-purple-600 animate-bounce"><Check size={48} /></div>
           <div>
             <h3 className="text-xl font-black uppercase">C'est noté !</h3>
             <p className="text-gray-500 mt-2 font-medium">En attente de l'autre joueur...</p>
           </div>
           <div className="flex gap-2 justify-center mt-4 opacity-50">
             <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"/>
             <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-75"/>
             <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-150"/>
           </div>
        </div>
      );
    }

    // Écran de saisie
    return (
      <div className="space-y-6 animate-in slide-in-from-right-4">
        {/* EN-TÊTE : TITRE ET PROGRESSION */}
        <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{template.title}</span>
            <span className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded text-gray-500">Étape {phase + 1}/{totalSteps}</span>
        </div>

        {/* BARRE DE PROGRESSION */}
        <div className="flex gap-1 mb-2 h-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`flex-1 rounded-full transition-all duration-500 ${i <= phase ? 'bg-purple-600' : 'bg-gray-200'}`} />
          ))}
        </div>

        {/* CONSIGNE */}
        <div className="bg-purple-600 p-8 rounded-[2rem] text-white shadow-lg relative overflow-hidden">
          <BookOpen className="absolute -right-4 -bottom-4 text-purple-500 w-32 h-32 opacity-20 rotate-12" />
          <p className="font-bold uppercase text-[10px] tracking-widest mb-2 opacity-80">Ta mission :</p>
          <h2 className="text-2xl font-black leading-tight">
            {currentStepConfig.label}
          </h2>
        </div>

        {/* CHAMP TEXTE */}
        <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100">
          <textarea
            className="w-full h-32 p-4 text-lg font-medium text-gray-700 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 resize-none placeholder:text-gray-300 placeholder:text-sm placeholder:italic"
            placeholder={currentStepConfig.placeholder}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
        </div>

        <button onClick={() => onAction({ action: 'cadavre_submit_step', text: inputText })} disabled={!inputText.trim()}
          className="w-full bg-purple-600 text-white font-black py-5 rounded-[2rem] shadow-lg flex items-center justify-center gap-3 uppercase tracking-tighter active:scale-95 transition-all disabled:opacity-50 disabled:scale-100">
          <Send size={20}/> Valider l'étape
        </button>
      </div>
    );
  }

  // --- PHASE DE LECTURE & RÉSULTATS ---
  if (phase === 'VOTE') {
      if(hasVoted) return (
        <div className="p-10 text-center bg-white rounded-[2.5rem] shadow-xl animate-in zoom-in-95">
            <div className="inline-block p-4 bg-green-100 rounded-full text-green-600 mb-4"><Check size={32}/></div>
            <h3 className="font-black text-xl mb-2 text-gray-800">Terminé !</h3>
            <p className="text-gray-500 text-sm">Dévoilement imminent...</p>
        </div>
      );

      return (
          <div className="space-y-8 animate-in fade-in pb-10">
              <div className="text-center mb-6">
                  <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 inline-block">Terminé !</span>
                  <h2 className="text-3xl font-black uppercase text-gray-900 tracking-tighter">Lecture 📖</h2>
                  <p className="text-gray-400 text-sm font-bold">Reconstitution de "{template.title}"</p>
              </div>

              {stories.map((story: any, i: number) => (
                  <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 bg-gray-100 px-4 py-2 rounded-bl-2xl text-[10px] font-black uppercase text-gray-400 tracking-widest">
                          Histoire {story.id}
                      </div>
                      
                      <div className="mt-6 space-y-1">
                          <p className="text-xl text-gray-700 leading-relaxed font-medium">
                              {/* On recolle les morceaux */}
                              {story.parts.join(" ")}.
                          </p>
                      </div>

                      {/* Qui a écrit quoi (petit détail sympa) */}
                      <div className="mt-6 pt-4 border-t border-gray-50 flex flex-wrap gap-2">
                         {story.authors.map((author:string, idx:number) => (
                             <span key={idx} className={`text-[9px] px-2 py-1 rounded-full font-bold uppercase ${author === 'Moi' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                {author}
                             </span>
                         ))}
                      </div>
                  </div>
              ))}

            <button onClick={() => { setHasVoted(true); onAction({ action: 'cadavre_vote', score: 5 }); }} 
              className="w-full bg-black text-white font-black py-5 rounded-[2rem] shadow-lg flex items-center justify-center gap-3 uppercase tracking-tighter active:scale-95 transition-all mt-4">
              <Eye size={20}/> J'ai tout lu !
            </button>
          </div>
      );
  }

  return null;
}