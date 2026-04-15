'use client';

import { useMemo, useState } from 'react';
import { Send, Feather, Star, CheckSquare, Square } from 'lucide-react';

type Props = {
  session: any;
  currentUserId: string;
  participantMap: Record<string, string>;
  onAction: (payload: any) => void;
};

function getName(participantMap: Record<string, string>, id?: string | null) {
  if (!id) return 'Un membre';
  return participantMap[id] || `Membre ${id.slice(0, 6)}`;
}

export default function PoetGame({ session, currentUserId, participantMap, onAction }: Props) {
  const { phase, constraints, poems = {}, votesByPlayer = {}, votes = {}, targetByPlayer = {} } = session.sharedData;
  const [poemText, setPoemText] = useState('');
  const [criteria, setCriteria] = useState({
    theme: false,
    structure: false,
    rhyme: false,
    meter: false,
    quality: false,
  });

  const currentScore = useMemo(() => Object.values(criteria).filter(Boolean).length, [criteria]);

  const targetId = targetByPlayer[currentUserId];
  const targetPoem = targetId ? poems[targetId] : null;
  const targetName = getName(participantMap, targetId);

  if (phase === 'WRITE') {
    if (poems[currentUserId]) {
      return (
        <div className="flex flex-col items-center justify-center p-10 bg-white rounded-[2.5rem] text-center gap-6 shadow-[0_12px_30px_rgba(111,98,143,0.08)] border border-[#eee5dc] animate-in zoom-in-95">
          <div className="bg-[#fff1e8] p-6 rounded-full text-[#ef9a79] animate-bounce">
            <Feather size={48} />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase">Poeme grave !</h3>
            <p className="text-gray-500 mt-2 font-medium">L'encre seche en attendant les autres...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4">
        <div className="bg-[#fff8f3] p-6 rounded-[2rem] border border-[#f2decf] shadow-[0_10px_24px_rgba(239,154,121,0.14)]">
          <div className="flex items-center gap-2 mb-4 text-[#ef9a79]">
            <Feather size={20} />
            <span className="font-black uppercase text-xs tracking-widest">Le Contrat Poetique</span>
          </div>
          <div className="space-y-3">
            <div className="bg-white p-3 rounded-xl flex justify-between items-center shadow-sm">
              <span className="text-xs font-bold text-gray-400 uppercase">Theme</span>
              <span className="font-black text-gray-800 text-right text-sm">{constraints.theme}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white p-3 rounded-xl shadow-sm">
                <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Structure</span>
                <span className="font-bold text-[#ef9a79] text-sm">
                  {constraints.structure.label} ({constraints.structure.lines} vers)
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl shadow-sm">
                <span className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Rimes</span>
                <span className="font-bold text-[#ef9a79] text-[10px]">{String(constraints.rhyme).split('(')[0]}</span>
              </div>
            </div>
            <div className="bg-white p-3 rounded-xl flex justify-between items-center shadow-sm">
              <span className="text-xs font-bold text-gray-400 uppercase">Metre</span>
              <span className="font-bold text-gray-800 text-[10px]">{constraints.syllable}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-[0_12px_30px_rgba(111,98,143,0.08)] border border-[#eee5dc]">
          <textarea
            className="w-full h-48 p-4 text-lg font-serif italic text-gray-700 bg-[#fffdfa] rounded-2xl outline-none focus:ring-2 focus:ring-[#8d7ac6] resize-none placeholder:not-italic placeholder:font-sans placeholder:text-gray-300"
            placeholder={`Ecris ton ${constraints.structure.label} ici...`}
            value={poemText}
            onChange={(event) => setPoemText(event.target.value)}
          />
          <div className="mt-2 text-right">
            <span
              className={`text-xs font-bold ${
                poemText.split('\n').filter((line) => line.trim() !== '').length === constraints.structure.lines
                  ? 'text-green-500'
                  : 'text-gray-400'
              }`}
            >
              {poemText.split('\n').filter((line) => line.trim() !== '').length} / {constraints.structure.lines} vers
            </span>
          </div>
        </div>

        <button
          onClick={() => onAction({ action: 'poet_submit', text: poemText })}
          disabled={!poemText.trim()}
          className="w-full bg-[#ef9a79] text-white font-black py-5 rounded-[2rem] shadow-[0_12px_24px_rgba(239,154,121,0.35)] flex items-center justify-center gap-3 uppercase tracking-tighter active:scale-95 transition-all disabled:opacity-50"
        >
          <Send size={20} /> Signer l'oeuvre
        </button>
      </div>
    );
  }

  if (phase === 'VOTE') {
    const hasVoted = votesByPlayer?.[currentUserId] !== null && votesByPlayer?.[currentUserId] !== undefined;

    if (hasVoted) {
      return (
        <div className="p-10 text-center bg-white rounded-[2.5rem] shadow-[0_12px_30px_rgba(111,98,143,0.08)] border border-[#eee5dc] animate-in zoom-in-95">
          <h3 className="font-black text-xl mb-2 text-gray-800">Correction envoyee !</h3>
          <p className="text-gray-500 text-sm">Le jury delibere...</p>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in pb-10">
        <div className="bg-[#4b3d6d] text-white p-8 rounded-[2rem] text-center shadow-[0_12px_24px_rgba(75,61,109,0.32)] relative overflow-hidden">
          <Feather className="absolute top-4 right-4 text-white/10 w-20 h-20 -rotate-12" />
          <h3 className="uppercase text-[10px] font-bold tracking-[0.2em] text-gray-400 mb-4">Oeuvre de {targetName}</h3>
          <div className="font-serif italic text-xl leading-relaxed whitespace-pre-wrap relative z-10">"{targetPoem}"</div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-[0_12px_30px_rgba(111,98,143,0.08)] border border-[#eee5dc]">
          <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
            <p className="text-xs font-black uppercase text-gray-400">Bareme</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-[#ef9a79]">{currentScore}</span>
              <span className="text-xs font-bold text-gray-400 uppercase">/ 5 pts</span>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <button
              onClick={() => setCriteria((previous) => ({ ...previous, theme: !previous.theme }))}
              className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${
                criteria.theme ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-transparent'
              } border-2`}
            >
              <div className="text-left">
                <span className="block text-[10px] font-bold uppercase opacity-60">Theme</span>
                <span className="font-bold text-sm">"{constraints.theme}" ?</span>
              </div>
              {criteria.theme ? <CheckSquare size={24} /> : <Square size={24} />}
            </button>

            <button
              onClick={() => setCriteria((previous) => ({ ...previous, structure: !previous.structure }))}
              className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${
                criteria.structure
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-gray-50 text-gray-500 border-transparent'
              } border-2`}
            >
              <div className="text-left">
                <span className="block text-[10px] font-bold uppercase opacity-60">Structure</span>
                <span className="font-bold text-sm">
                  {constraints.structure.label} ({constraints.structure.lines} vers) ?
                </span>
              </div>
              {criteria.structure ? <CheckSquare size={24} /> : <Square size={24} />}
            </button>

            <button
              onClick={() => setCriteria((previous) => ({ ...previous, rhyme: !previous.rhyme }))}
              className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${
                criteria.rhyme ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-transparent'
              } border-2`}
            >
              <div className="text-left">
                <span className="block text-[10px] font-bold uppercase opacity-60">Rimes</span>
                <span className="font-bold text-sm">{String(constraints.rhyme).split('(')[0]} ?</span>
              </div>
              {criteria.rhyme ? <CheckSquare size={24} /> : <Square size={24} />}
            </button>

            <button
              onClick={() => setCriteria((previous) => ({ ...previous, meter: !previous.meter }))}
              className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${
                criteria.meter ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-transparent'
              } border-2`}
            >
              <div className="text-left">
                <span className="block text-[10px] font-bold uppercase opacity-60">Metrique</span>
                <span className="font-bold text-sm">{String(constraints.syllable).split('(')[0]} ?</span>
              </div>
              {criteria.meter ? <CheckSquare size={24} /> : <Square size={24} />}
            </button>

            <button
              onClick={() => setCriteria((previous) => ({ ...previous, quality: !previous.quality }))}
              className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${
                criteria.quality
                  ? 'bg-yellow-50 text-yellow-600 border-yellow-200'
                  : 'bg-gray-50 text-gray-500 border-transparent'
              } border-2`}
            >
              <div className="text-left">
                <span className="block text-[10px] font-bold uppercase opacity-60">Bonus Style</span>
                <span className="font-bold text-sm">C'est bien ecrit / drole ?</span>
              </div>
              {criteria.quality ? <Star size={24} fill="currentColor" /> : <Star size={24} />}
            </button>
          </div>

          <button
            onClick={() => onAction({ action: 'poet_vote', score: currentScore })}
            className="w-full bg-[#4b3d6d] text-white font-black py-5 rounded-2xl uppercase text-xs tracking-widest shadow-[0_12px_24px_rgba(75,61,109,0.32)] active:scale-95 transition-all"
          >
            Valider la note ({currentScore}/5)
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'RESULTS') {
    return (
      <div className="space-y-4 animate-in slide-in-from-bottom-8">
        <h2 className="text-center font-black uppercase text-2xl mb-4 text-gray-800">Anthologie du Jour</h2>
        {Object.entries(poems).map(([authorId, text]: any) => (
          <div key={authorId} className="bg-white p-6 rounded-[2rem] shadow-[0_12px_30px_rgba(111,98,143,0.08)] border border-[#eee5dc]">
            <div className="flex justify-between items-center mb-4 border-b border-gray-50 pb-2">
              <span
                className={`text-xs font-black uppercase px-2 py-1 rounded ${
                  authorId === currentUserId ? 'bg-[#f3edf9] text-[#8d7ac6]' : 'bg-[#ece4f7] text-[#6f628f]'
                }`}
              >
                {getName(participantMap, authorId)}
              </span>
              <Feather size={14} className="text-gray-300" />
            </div>
            <p className="font-serif italic text-gray-700 whitespace-pre-wrap leading-relaxed text-center text-lg">{text}</p>
            <p className="mt-4 text-center text-xs font-bold uppercase text-gray-400">
              Note recue : {(votes?.[authorId] || []).reduce((sum: number, value: number) => sum + Number(value || 0), 0)} pts
            </p>
          </div>
        ))}
      </div>
    );
  }

  return null;
}
