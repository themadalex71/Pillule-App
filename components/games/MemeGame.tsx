'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Send, RotateCcw, Trophy } from 'lucide-react';
import type { GameResult, PlayerId } from '@/types/GameResult';

type Step =
  | 'editing'
  | 'waiting'
  | 'voting'
  | 'waiting_votes'
  | 'results';

export default function MemeGame({
  onFinish,
  currentUser,
}: {
  onFinish: (result: GameResult) => void;
  currentUser: PlayerId;
}) {
  const opponentName: PlayerId =
    currentUser === 'Joueur A' ? 'Joueur B' : 'Joueur A';

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('editing');

  const [allTemplates, setAllTemplates] = useState<any[]>([]);
  const [myMemes, setMyMemes] = useState<any[]>([]);
  const [othersMemes, setOthersMemes] = useState<any[]>([]);

  const [currentVoteIdx, setCurrentVoteIdx] = useState(0);
  const [accumulatedScore, setAccumulatedScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const finishedRef = useRef(false);

  const voteLabels = [
    { value: 0, label: 'Nul', emoji: '🚮' },
    { value: 1, label: 'Bof', emoji: '😐' },
    { value: 2, label: 'Pas mal', emoji: '🙂' },
    { value: 3, label: 'Drôle', emoji: '😂' },
    { value: 4, label: 'MDR', emoji: '💀' },
  ];

  // ---------------------------
  // INIT
  // ---------------------------
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      finishedRef.current = false;
      setStep('editing');
      setCurrentVoteIdx(0);
      setAccumulatedScore(0);

      const res = await fetch('/api/content?gameId=meme');
      const templates = await res.json();
      setAllTemplates(templates);

      // Chaque joueur tire SES memes
      const selection = [...templates]
        .sort(() => 0.5 - Math.random())
        .slice(0, 2);

      setMyMemes(
        selection.map((t: any, idx: number) => ({
          ...t,
          inputs: {},
          rerollsLeft: 2,
          instanceId: `meme_${currentUser}_${Date.now()}_${idx}`,
        }))
      );

      await checkStatus();
      setLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Poll état serveur
  useEffect(() => {
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ---------------------------
  // CHECK STATUS (LOGIQUE CLEF)
  // ---------------------------
  const checkStatus = async () => {
    try {
      const res = await fetch('/api/game-turn');
      const data = await res.json();

      const turns = data.memes || [];
      const votes = data.votes || {};

      const myTurn = turns.find((t: any) => t.player === currentUser);
      const oppTurn = turns.find((t: any) => t.player === opponentName);

      const myScoreReceived = votes[currentUser];
      const oppScoreReceived = votes[opponentName];

      // ✅ Résultats finaux
      if (
        myScoreReceived !== undefined &&
        oppScoreReceived !== undefined &&
        !finishedRef.current
      ) {
        finishedRef.current = true;

        const result: GameResult = {
          gameId: 'meme',
          label: 'Meme Maker',
          status: 'completed',
          resultsByPlayer: {
            'Joueur A': {
              score: currentUser === 'Joueur A' ? myScoreReceived : oppScoreReceived,
              detail: 'Score reçu',
            },
            'Joueur B': {
              score: currentUser === 'Joueur B' ? myScoreReceived : oppScoreReceived,
              detail: 'Score reçu',
            },
          },
        };

        onFinish(result);
        setStep('results');
        return;
      }

      // J’ai voté, j’attends l’autre
      if (oppScoreReceived !== undefined && myScoreReceived === undefined) {
        setStep('waiting_votes');
        return;
      }

      // Les deux ont soumis → vote
      if (myTurn && oppTurn) {
        setOthersMemes(oppTurn.memes);
        setStep('voting');
        return;
      }

      // J’ai soumis, pas l’autre
      if (myTurn && !oppTurn) {
        setStep('waiting');
        return;
      }

      setStep('editing');
    } catch (e) {
      console.error(e);
    }
  };

  // ---------------------------
  // ACTIONS
  // ---------------------------
  const handleReroll = (idx: number) => {
    if (myMemes[idx].rerollsLeft <= 0) return;

    const available = allTemplates.filter(
      (t) => !myMemes.some((m) => m.id === t.id)
    );
    const source = available.length ? available : allTemplates;
    const newTemplate = source[Math.floor(Math.random() * source.length)];

    const next = [...myMemes];
    next[idx] = {
      ...newTemplate,
      inputs: {},
      rerollsLeft: myMemes[idx].rerollsLeft - 1,
      instanceId: `meme_${currentUser}_${Date.now()}_${idx}`,
    };

    setMyMemes(next);
  };

  const updateInput = (memeIdx: number, zoneId: string, value: string) => {
    const next = [...myMemes];
    next[memeIdx].inputs = {
      ...next[memeIdx].inputs,
      [zoneId]: value,
    };
    setMyMemes(next);
  };

  const submitMemes = async () => {
    setIsSubmitting(true);
    await fetch('/api/game-turn', {
      method: 'POST',
      body: JSON.stringify({
        type: 'meme',
        player: currentUser,
        memes: myMemes.map((m) => ({
          url: m.url,
          zones: m.zones,
          inputs: m.inputs,
          instanceId: m.instanceId,
        })),
      }),
    });
    setIsSubmitting(false);
    setStep('waiting');
  };

  const handleVote = async (score: number) => {
    const total = accumulatedScore + score;

    if (currentVoteIdx < othersMemes.length - 1) {
      setAccumulatedScore(total);
      setCurrentVoteIdx((v) => v + 1);
      return;
    }

    setIsSubmitting(true);
    await fetch('/api/game-turn', {
      method: 'PATCH',
      body: JSON.stringify({ voter: currentUser, score: total }),
    });
    setIsSubmitting(false);
    setStep('waiting_votes');
  };

  // ---------------------------
  // UI
  // ---------------------------
  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin" />
      </div>
    );
  }
  return (
    <div className="w-full max-w-md mx-auto h-full flex flex-col">
      {step === 'editing' && (
        <>
          <div className="flex-1 overflow-y-auto space-y-6 pb-24">
            <h2 className="text-3xl font-black tracking-tight px-4 pt-6">
              Meme Maker
            </h2>

            {myMemes.map((meme: any, idx: number) => (
              <div
                key={meme.instanceId || idx}
                className="mx-4 rounded-3xl overflow-hidden border bg-white shadow-sm"
              >
                <div className="relative w-full aspect-[1/1] bg-black">
                  <img  
                    src={meme.url}
                    alt="meme"
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover opacity-90"
                  />


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
                        fontFamily: 'Inter, system-ui, sans-serif',
                        fontWeight: 900,
                        display: 'flex',
                        textShadow: '0px 2px 4px rgba(0,0,0,0.8)',
                        position: 'absolute',
                      }}
                      className="pointer-events-none p-1"
                    >
                      {meme.inputs?.[zone.id] || ''}
                    </div>
                  ))}
                </div>

                <div className="p-5 bg-white space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-black uppercase tracking-widest text-gray-500">
                      Meme #{idx + 1}
                    </div>

                    <button
                      onClick={() => handleReroll(idx)}
                      disabled={meme.rerollsLeft <= 0}
                      className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest px-3 py-2 rounded-2xl border ${
                        meme.rerollsLeft <= 0
                          ? 'opacity-40'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <RotateCcw size={14} />
                      Reroll ({meme.rerollsLeft})
                    </button>
                  </div>

                  {meme.zones?.map((zone: any) => (
                    <div key={zone.id}>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                        Texte {zone.id}
                      </label>

                      <input
                        value={meme.inputs?.[zone.id] || ''}
                        onChange={(e) =>
                          updateInput(idx, zone.id, e.target.value)
                        }
                        className="w-full mt-2 px-4 py-3 rounded-2xl border font-semibold"
                        placeholder="Tape ton texte..."
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t bg-white">
            <button
              onClick={submitMemes}
              disabled={isSubmitting}
              className="w-full bg-gray-900 text-white font-black py-5 rounded-[2rem] uppercase text-sm tracking-widest flex items-center justify-center gap-3"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
              Envoyer mes memes
            </button>
          </div>
        </>
      )}

      {step === 'waiting' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <Loader2 className="animate-spin mb-4" />
          <h3 className="text-xl font-black">En attente…</h3>
          <p className="text-sm text-gray-500 mt-2">
            Tu as envoyé tes memes. On attend que {opponentName} finisse les
            siens.
          </p>
        </div>
      )}

      {step === 'voting' && (
        <div className="flex-1 flex flex-col">
          <div className="px-4 pt-6">
            <h2 className="text-3xl font-black tracking-tight">Vote</h2>
            <p className="text-sm text-gray-500 mt-2">
              Note les memes de {opponentName} ({currentVoteIdx + 1}/
              {othersMemes.length})
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4">
            {othersMemes[currentVoteIdx] && (
              <div className="rounded-3xl overflow-hidden border bg-white shadow-sm">
                <div className="relative w-full aspect-[1/1] bg-black">
                  <img
                    src={othersMemes[currentVoteIdx].url}
                    alt="meme"
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover opacity-90"
                  />


                  {othersMemes[currentVoteIdx].zones?.map((zone: any) => (
                    <div
                      key={zone.id}
                      style={{
                        top: `${zone.top}%`,
                        left: `${zone.left}%`,
                        width: `${zone.width}%`,
                        height: `${zone.height}%`,
                        fontSize: `${zone.fontSize}px`,
                        color: zone.color || '#ffffff',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        fontWeight: 900,
                        display: 'flex',
                        textShadow: '0px 2px 4px rgba(0,0,0,0.8)',
                        position: 'absolute',
                      }}
                      className="pointer-events-none p-1"
                    >
                      {othersMemes[currentVoteIdx].inputs?.[zone.id] || ''}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-white">
            <div className="grid grid-cols-5 gap-2">
              {voteLabels.map((v) => (
                <button
                  key={v.value}
                  onClick={() => handleVote(v.value)}
                  disabled={isSubmitting}
                  className="rounded-2xl py-3 font-black text-xs uppercase tracking-widest border hover:bg-gray-50"
                >
                  <div className="text-lg">{v.emoji}</div>
                  <div className="mt-1">{v.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 'waiting_votes' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <Loader2 className="animate-spin mb-4" />
          <h3 className="text-xl font-black">En attente du vote…</h3>
          <p className="text-sm text-gray-500 mt-2">
            Tu as voté. On attend le vote de {opponentName}.
          </p>
        </div>
      )}

      {step === 'results' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <Trophy className="mb-4" />
          <h3 className="text-2xl font-black">Résultats</h3>
          <p className="text-sm text-gray-500 mt-2">
            Les scores sont envoyés à la page principale.
          </p>
        </div>
      )}
    </div>
  );
}
