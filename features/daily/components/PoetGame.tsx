'use client';

import { useState } from 'react';
import { Send, Feather, Check, Star, CheckSquare, Square } from 'lucide-react';

export default function PoetGame({ session, currentUser, onAction }: any) {
  const { phase, constraints, poems } = session.sharedData;
  const [poemText, setPoemText] = useState('');
  
  // État pour les critères de vote (tout à false au début)
  const [criteria, setCriteria] = useState({
    theme: false,
    structure: false,
    rhyme: false,
    meter: false,
    quality: false
  });
  
  const [hasVoted, setHasVoted] = useState(false);

  // Calcul du score en temps réel (0 à 5)
  const currentScore = Object.values(criteria).filter(Boolean).length;

  const toggleCriterion = (key: keyof typeof criteria) => {
    setCriteria(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // --- PHASE D'ÉCRITURE ---
  if (phase === 'WRITE') {
    if (poems[currentUser]) {
        return (
            <div className="flex flex-col items-center justify-center p-10 bg-white rounded-[2.5rem] text-center gap-6 shadow-xl animate-in zoom-in-95">
               <div className="bg-pink-100 p-6 rounded-full text-pink-600 animate-bounce"><Feather size={48} /></div>
               <div>
                 <h3 className="text-xl font-black uppercase">Poème gravé !</h3>
                 <p className="text-gray-500 mt-2 font-medium">L'encre sèche en attendant l'autre...</p>
               </div>
            </div>
        );
    }

    return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4">
        {/* CARTE DES CONTRAINTES */}
        <div className="bg-pink-50 p-6 rounded-[2rem] border border-pink-100 shadow-md">
            <div className="flex items-center gap-2 mb-4 text-pink-600">
                <Feather size={20} />
                <span className="font-black uppercase text-xs tracking-widest">Le Contrat Poétique</span>
            </div>
            <div className="space-y-3">
                <div className="bg-white p-3 rounded-xl flex justify-between items-center shadow-sm">
                    <span className="text-xs font-bold text-gray-400 uppercase">Thème</span>
                    <span className="font-black text-gray-800 text-right text-sm">{constraints.theme}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white p-3 rounded-xl shadow-sm">
                        <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Structure</span>
                        <span className="font-bold text-pink-600 text-sm">{constraints.structure.label} ({constraints.structure.lines} vers)</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl shadow-sm">
                        <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Rimes</span>
                        <span className="font-bold text-pink-600 text-[10px]">{constraints.rhyme.split('(')[0]}</span>
                    </div>
                </div>
                <div className="bg-white p-3 rounded-xl flex justify-between items-center shadow-sm">
                    <span className="text-xs font-bold text-gray-400 uppercase">Mètre</span>
                    <span className="font-bold text-gray-800 text-[10px]">{constraints.syllable}</span>
                </div>
            </div>
        </div>

        {/* ZONE D'ÉCRITURE */}
        <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100">
            <textarea
                className="w-full h-48 p-4 text-lg font-serif italic text-gray-700 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-pink-500 resize-none placeholder:not-italic placeholder:font-sans placeholder:text-gray-300"
                placeholder={`Écris ton ${constraints.structure.label} ici...`}
                value={poemText}
                onChange={(e) => setPoemText(e.target.value)}
            />
            <div className="mt-2 text-right">
                <span className={`text-xs font-bold ${poemText.split('\n').filter(l => l.trim() !== '').length === constraints.structure.lines ? 'text-green-500' : 'text-gray-400'}`}>
                    {poemText.split('\n').filter(l => l.trim() !== '').length} / {constraints.structure.lines} vers
                </span>
            </div>
        </div>

        <button onClick={() => onAction({ action: 'poet_submit', text: poemText })} disabled={!poemText.trim()}
          className="w-full bg-pink-600 text-white font-black py-5 rounded-[2rem] shadow-lg flex items-center justify-center gap-3 uppercase tracking-tighter active:scale-95 transition-all disabled:opacity-50">
          <Send size={20}/> Signer l'œuvre
        </button>
      </div>
    );
  }

  // --- PHASE DE VOTE (INTERFACE MODIFIÉE) ---
  if (phase === 'VOTE') {
    const opponent = currentUser === 'Moi' ? 'Chéri(e)' : 'Moi';
    const opponentPoem = poems[opponent];

    if (hasVoted) return (
        <div className="p-10 text-center bg-white rounded-[2.5rem] shadow-xl animate-in zoom-in-95">
            <h3 className="font-black text-xl mb-2 text-gray-800">Correction envoyée !</h3>
            <p className="text-gray-500 text-sm">Le jury délibère...</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in pb-10">
             {/* POÈME ADVERSE */}
             <div className="bg-gray-900 text-white p-8 rounded-[2rem] text-center shadow-lg relative overflow-hidden">
                <Feather className="absolute top-4 right-4 text-white/10 w-20 h-20 -rotate-12" />
                <h3 className="uppercase text-[10px] font-bold tracking-[0.2em] text-gray-400 mb-4">Œuvre de {opponent}</h3>
                <div className="font-serif italic text-xl leading-relaxed whitespace-pre-wrap relative z-10">
                    "{opponentPoem}"
                </div>
            </div>

            {/* FORMULAIRE DE NOTATION */}
            <div className="bg-white p-6 rounded-[2rem] shadow-xl">
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                    <p className="text-xs font-black uppercase text-gray-400">Barème</p>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-pink-600">{currentScore}</span>
                        <span className="text-xs font-bold text-gray-400 uppercase">/ 5 pts</span>
                    </div>
                </div>

                <div className="space-y-3 mb-6">
                    {/* CRITÈRE 1 : THÈME */}
                    <button onClick={() => toggleCriterion('theme')} className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${criteria.theme ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-transparent'} border-2`}>
                        <div className="text-left">
                            <span className="block text-[10px] font-bold uppercase opacity-60">Thème</span>
                            <span className="font-bold text-sm">"{constraints.theme}" ?</span>
                        </div>
                        {criteria.theme ? <CheckSquare size={24} /> : <Square size={24} />}
                    </button>

                    {/* CRITÈRE 2 : STRUCTURE */}
                    <button onClick={() => toggleCriterion('structure')} className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${criteria.structure ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-transparent'} border-2`}>
                        <div className="text-left">
                            <span className="block text-[10px] font-bold uppercase opacity-60">Structure</span>
                            <span className="font-bold text-sm">{constraints.structure.label} ({constraints.structure.lines} vers) ?</span>
                        </div>
                        {criteria.structure ? <CheckSquare size={24} /> : <Square size={24} />}
                    </button>

                    {/* CRITÈRE 3 : RIMES */}
                    <button onClick={() => toggleCriterion('rhyme')} className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${criteria.rhyme ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-transparent'} border-2`}>
                        <div className="text-left">
                            <span className="block text-[10px] font-bold uppercase opacity-60">Rimes</span>
                            <span className="font-bold text-sm">{constraints.rhyme.split('(')[0]} ?</span>
                        </div>
                        {criteria.rhyme ? <CheckSquare size={24} /> : <Square size={24} />}
                    </button>

                    {/* CRITÈRE 4 : MÉTRIQUE */}
                    <button onClick={() => toggleCriterion('meter')} className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${criteria.meter ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-transparent'} border-2`}>
                        <div className="text-left">
                            <span className="block text-[10px] font-bold uppercase opacity-60">Métrique</span>
                            <span className="font-bold text-sm">{constraints.syllable.split('(')[0]} ?</span>
                        </div>
                        {criteria.meter ? <CheckSquare size={24} /> : <Square size={24} />}
                    </button>

                    {/* CRITÈRE 5 : APPRÉCIATION */}
                    <button onClick={() => toggleCriterion('quality')} className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${criteria.quality ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 'bg-gray-50 text-gray-500 border-transparent'} border-2`}>
                        <div className="text-left">
                            <span className="block text-[10px] font-bold uppercase opacity-60">Bonus Style</span>
                            <span className="font-bold text-sm">C'est bien écrit / drôle ?</span>
                        </div>
                        {criteria.quality ? <Star size={24} fill="currentColor" /> : <Star size={24} />}
                    </button>
                </div>

                <button onClick={() => { setHasVoted(true); onAction({ action: 'poet_vote', score: currentScore }); }}
                    className="w-full bg-black text-white font-black py-5 rounded-2xl uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all">
                    Valider la note ({currentScore}/5)
                </button>
            </div>
        </div>
    );
  }

  // --- RÉSULTATS ---
  if (phase === 'RESULTS') {
      return (
        <div className="space-y-4 animate-in slide-in-from-bottom-8">
            <h2 className="text-center font-black uppercase text-2xl mb-4 text-gray-800">Anthologie du Jour</h2>
            {Object.entries(poems).map(([author, text]: any) => (
                <div key={author} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-50 pb-2">
                        <span className={`text-xs font-black uppercase px-2 py-1 rounded ${author === 'Moi' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>{author}</span>
                        <Feather size={14} className="text-gray-300"/>
                    </div>
                    <p className="font-serif italic text-gray-700 whitespace-pre-wrap leading-relaxed text-center text-lg">
                        {text}
                    </p>
                </div>
            ))}
        </div>
      );
  }

  return null;
}