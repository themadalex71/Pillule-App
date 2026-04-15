'use client';

import { useMemo, useState } from 'react';
import { RefreshCw, Send, Loader2, Check, Star } from 'lucide-react';

const EMOJIS = [
  { label: 'Null', icon: '??', score: 0 },
  { label: 'Pas drole', icon: '??', score: 1 },
  { label: 'Bof', icon: '??', score: 2 },
  { label: 'Drole', icon: '??', score: 3 },
  { label: 'Mort de rire', icon: '??', score: 4 },
];

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

export default function MemeGame({ session, currentUserId, participantMap, onAction }: Props) {
  const { phase, players = {}, targetByPlayer = {}, votesByPlayer = {} } = session.sharedData;
  const myData = players[currentUserId];
  const targetId = targetByPlayer[currentUserId];
  const targetData = targetId ? players[targetId] : null;
  const targetName = getName(participantMap, targetId);

  const [localInputs, setLocalInputs] = useState<any[]>([{}, {}]);
  const [votes, setVotes] = useState<number[]>([2, 2]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const finishedCount = useMemo(
    () => Object.values(players).filter((data: any) => data?.finished).length,
    [players],
  );

  if (!myData) {
    return (
      <div className="p-10 text-center bg-white rounded-[2.5rem] shadow-xl text-gray-500">
        Joueur introuvable dans cette session.
      </div>
    );
  }

  if (phase === 'CREATION') {
    if (myData.finished) {
      return (
        <div className="flex flex-col items-center justify-center p-10 bg-white rounded-[2.5rem] text-center gap-6 shadow-xl animate-in zoom-in-95">
          <div className="bg-green-100 p-6 rounded-full text-green-600 animate-bounce">
            <Check size={48} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">C'est envoye !</h3>
            <p className="text-gray-500 font-medium mt-2">
              {finishedCount} / {Object.keys(players).length} membres ont fini.
            </p>
          </div>
          <div className="flex gap-2 mt-4">
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8 animate-in fade-in">
        <div className="bg-blue-600 p-6 rounded-[2rem] text-white text-center shadow-lg">
          <h3 className="text-xl font-black uppercase tracking-tighter">A toi de jouer !</h3>
          <p className="opacity-90 text-sm">Remplis les cases vides pour faire rire {targetName}.</p>
        </div>

        {(myData.memes || []).map((meme: any, index: number) => (
          <div key={meme.id + index} className="bg-white p-4 rounded-[2rem] shadow-xl border border-gray-100">
            <div className="flex justify-between items-center mb-4 px-2">
              <span className="font-black text-gray-400 text-[10px] uppercase tracking-widest">Meme #{index + 1}</span>
              {myData.rerolls?.[index] > 0 && (
                <button
                  onClick={() => onAction({ action: 'meme_reroll', memeIndex: index })}
                  className="flex items-center gap-1 text-[10px] font-bold bg-gray-100 px-3 py-1.5 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"
                >
                  <RefreshCw size={12} /> Changer ({myData.rerolls[index]})
                </button>
              )}
            </div>

            <div className="relative aspect-square bg-gray-900 rounded-2xl overflow-hidden mb-4">
              <img src={meme.url} className="w-full h-full object-contain pointer-events-none" />
              {(meme.zones || []).map((zone: any) => (
                <textarea
                  key={zone.id}
                  placeholder="..."
                  value={localInputs[index]?.[zone.id] || ''}
                  onChange={(event) => {
                    const nextInputs = [...localInputs];
                    nextInputs[index] = { ...nextInputs[index], [zone.id]: event.target.value };
                    setLocalInputs(nextInputs);
                  }}
                  style={{
                    top: `${zone.top}%`,
                    left: `${zone.left}%`,
                    width: `${zone.width}%`,
                    height: `${zone.height}%`,
                    fontSize: `${Math.max(10, zone.fontSize / 2)}px`,
                    color: zone.color,
                    textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                  }}
                  className="absolute bg-transparent border-2 border-dashed border-white/50 focus:border-blue-400 rounded-lg p-1 resize-none outline-none font-black text-center leading-tight placeholder:text-white/30 overflow-hidden"
                />
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={() => {
            setIsSubmitting(true);
            onAction({ action: 'meme_submit_creation', inputs: localInputs });
            setTimeout(() => setIsSubmitting(false), 600);
          }}
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white font-black py-5 rounded-[2rem] shadow-lg flex items-center justify-center gap-3 uppercase tracking-tighter active:scale-95 transition-all"
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : <><Send size={20} /> Valider mes memes</>}
        </button>
      </div>
    );
  }

  if (phase === 'VOTE') {
    const alreadyVoted = Array.isArray(votesByPlayer?.[currentUserId]);

    if (alreadyVoted) {
      return (
        <div className="flex flex-col items-center justify-center p-10 bg-white rounded-[2.5rem] text-center gap-6 shadow-xl animate-in zoom-in-95">
          <div className="bg-yellow-100 p-6 rounded-full text-yellow-600 animate-pulse">
            <Star size={48} fill="currentColor" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Votes enregistres !</h3>
            <p className="text-gray-500 font-medium mt-2">Calcul des scores en cours...</p>
          </div>
        </div>
      );
    }

    if (!targetData) {
      return (
        <div className="p-10 text-center bg-white rounded-[2.5rem] shadow-xl text-gray-500">
          Impossible de trouver les memes a noter.
        </div>
      );
    }

    return (
      <div className="space-y-8 animate-in slide-in-from-right-8">
        <div className="bg-yellow-400 p-6 rounded-[2rem] text-black text-center shadow-lg">
          <h3 className="text-xl font-black uppercase tracking-tighter">Phase de Vote !</h3>
          <p className="text-sm font-bold opacity-80">Note les creations de {targetName}</p>
        </div>

        {(targetData.memes || []).map((meme: any, index: number) => (
          <div key={meme.id + '_vote'} className="bg-white p-4 rounded-[2rem] shadow-xl border border-gray-100">
            <div className="relative aspect-square bg-gray-900 rounded-2xl overflow-hidden mb-6">
              <img src={meme.url} className="w-full h-full object-contain" />
              {(meme.zones || []).map((zone: any) => (
                <div
                  key={zone.id}
                  style={{
                    top: `${zone.top}%`,
                    left: `${zone.left}%`,
                    width: `${zone.width}%`,
                    height: `${zone.height}%`,
                    fontSize: `${Math.max(10, zone.fontSize / 2)}px`,
                    color: zone.color,
                    textShadow: '0 2px 4px rgba(0,0,0,1)',
                  }}
                  className="absolute flex items-center justify-center text-center font-black leading-tight break-words whitespace-pre-wrap"
                >
                  {targetData.inputs?.[index]?.[zone.id] || ''}
                </div>
              ))}
            </div>

            <div className="flex justify-between bg-gray-50 rounded-2xl p-2">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji.label}
                  onClick={() => {
                    const nextVotes = [...votes];
                    nextVotes[index] = emoji.score;
                    setVotes(nextVotes);
                  }}
                  className={`flex flex-col items-center p-2 rounded-xl transition-all active:scale-90 ${
                    votes[index] === emoji.score ? 'bg-white shadow-md scale-110' : 'opacity-50 grayscale'
                  }`}
                >
                  <span className="text-2xl">{emoji.icon}</span>
                  <span className="text-[8px] font-black uppercase mt-1">{emoji.score} pts</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={() => {
            setIsSubmitting(true);
            onAction({ action: 'meme_submit_vote', votes });
            setTimeout(() => setIsSubmitting(false), 600);
          }}
          disabled={isSubmitting}
          className="w-full bg-black text-white font-black py-5 rounded-[2rem] shadow-lg flex items-center justify-center gap-3 uppercase tracking-tighter active:scale-95 transition-all"
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : <><Star fill="currentColor" size={20} /> Envoyer les notes</>}
        </button>
      </div>
    );
  }

  return null;
}
