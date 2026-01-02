'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, Send, RotateCcw, Trophy } from 'lucide-react';

export default function MemeGame({ onFinish, currentUser }: any) {
  const [loading, setLoading] = useState(true);
  const [allTemplates, setAllTemplates] = useState<any[]>([]);
  const [step, setStep] = useState<'editing' | 'waiting' | 'voting' | 'waiting_votes' | 'results'>('editing');

  const [myMemes, setMyMemes] = useState<any[]>([]);
  const [othersMemes, setOthersMemes] = useState<any[]>([]);
  const [results, setResults] = useState<any>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentVoteIdx, setCurrentVoteIdx] = useState(0);
  const [accumulatedScore, setAccumulatedScore] = useState(0);

  const opponentName = currentUser === 'Joueur A' ? 'Joueur B' : 'Joueur A';
  const lastUserRef = useRef(currentUser);

  const voteLabels = [
    { value: 0, label: "Nul", emoji: "🚮", color: "hover:bg-red-500" },
    { value: 1, label: "Bof", emoji: "😐", color: "hover:bg-orange-400" },
    { value: 2, label: "Pas mal", emoji: "🙂", color: "hover:bg-yellow-400" },
    { value: 3, label: "Drôle", emoji: "😂", color: "hover:bg-green-400" },
    { value: 4, label: "MDR", emoji: "💀", color: "hover:bg-purple-500" },
  ];

  // Initialisation et Reset quand on change de joueur (Mode Testeur)
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setStep('editing');
      setCurrentVoteIdx(0);
      setAccumulatedScore(0);

      try {
        const res = await fetch('/api/content?gameId=meme');
        const data = await res.json();
        setAllTemplates(data);

        if (data && data.length >= 2) {
          // Chaque joueur tire ses propres templates localement (c’est ton choix ✅)
          const selection = [...data].sort(() => 0.5 - Math.random()).slice(0, 2);

          setMyMemes(selection.map((t: any, idx: number) => ({
            ...t,
            inputs: {},
            rerollsLeft: 2,
            instanceId: `meme_${currentUser}_${Date.now()}_${idx}`
          })));
        }

        // Après l'init, on vérifie si une partie est déjà en cours
        await checkStatus();
      } catch (e) {
        console.error(e);
      }

      setLoading(false);
    };

    init();
    lastUserRef.current = currentUser;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Boucle de surveillance
  useEffect(() => {
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, step]);

  /**
   * ✅ LOGIQUE FIXÉE :
   * - On passe en voting UNIQUEMENT si les 2 ont soumis (myTurn && opponentTurn)
   * - On passe en results UNIQUEMENT si les 2 ont reçu un score
   * - On passe en waiting_votes si j'ai déjà voté (donc l'autre a reçu un score), mais moi pas encore reçu
   */
  const checkStatus = async () => {
    try {
      const res = await fetch('/api/game-turn');
      const data = await res.json();
      const turns = data.memes || [];
      const votes = data.votes || {};

      const myTurn = turns.find((t: any) => t.player === currentUser);
      const opponentTurn = turns.find((t: any) => t.player === opponentName);

      // ✅ votes = scores REÇUS par chaque joueur
      const myScoreReceived = votes[currentUser];
      const opponentScoreReceived = votes[opponentName];

      // 1) Les deux ont reçu une note -> Résultats
      if (myScoreReceived !== undefined && opponentScoreReceived !== undefined) {
        setResults({ myScore: myScoreReceived, opponentScore: opponentScoreReceived });
        setStep('results');
        return;
      }

      // 2) J'ai déjà voté (l'autre a reçu ma note), mais je n'ai pas encore reçu la sienne
      if (opponentScoreReceived !== undefined && myScoreReceived === undefined) {
        setStep('waiting_votes');
        return;
      }

      // 3) Les deux ont soumis -> Vote (uniquement si je n'ai pas déjà voté)
      if (myTurn && opponentTurn) {
        setOthersMemes(opponentTurn.memes || []);
        setStep('voting');
        return;
      }

      // 4) J'ai soumis, pas l'autre -> Attente
      if (myTurn && !opponentTurn) {
        setStep('waiting');
        return;
      }

      // 5) Je n'ai pas encore soumis -> Edition
      setStep('editing');
    } catch (e) {
      console.error(e);
    }
  };

  const handleReroll = (idx: number) => {
    if (myMemes[idx]?.rerollsLeft <= 0 || allTemplates.length === 0) return;

    const currentIds = myMemes.map(m => m.id);
    const availableTemplates = allTemplates.filter(t => !currentIds.includes(t.id));
    const sourceList = availableTemplates.length > 0 ? availableTemplates : allTemplates;
    const newTemplate = sourceList[Math.floor(Math.random() * sourceList.length)];

    const next = [...myMemes];
    next[idx] = {
      ...newTemplate,
      instanceId: `meme_${currentUser}_${Date.now()}_${idx}`,
      inputs: {},
      rerollsLeft: myMemes[idx].rerollsLeft - 1
    };
    setMyMemes(next);
  };

  const updateInput = (memeIdx: number, zoneId: string, value: string) => {
    const next = [...myMemes];
    next[memeIdx] = {
      ...next[memeIdx],
      inputs: { ...next[memeIdx].inputs, [zoneId]: value }
    };
    setMyMemes(next);
  };

  const submitToJudge = async () => {
    setIsSubmitting(true);

    const turnData = {
      type: 'meme',
      player: currentUser,
      memes: myMemes.map(m => ({
        url: m.url,
        zones: m.zones,
        inputs: m.inputs,
        instanceId: m.instanceId
      }))
    };

    try {
      await fetch('/api/game-turn', { method: 'POST', body: JSON.stringify(turnData) });
      setStep('waiting');
    } catch (e) {
      console.error(e);
    }

    setIsSubmitting(false);
  };

  /**
   * ✅ Vote FIXÉ :
   * - On ne passe plus de memeInstanceId (inutilisé ici)
   * - PATCH = { voter: currentUser, score: totalQueJeDonneAAdversaire }
   */
  const handleVoteClick = async (score: number) => {
    const newTotal = accumulatedScore + score;

    if (currentVoteIdx < othersMemes.length - 1) {
      setAccumulatedScore(newTotal);
      setCurrentVoteIdx((prev) => prev + 1);
      return;
    }

    // Dernier vote -> on envoie le score final que l'on DONNE à l'adversaire
    setIsSubmitting(true);
    try {
      await fetch('/api/game-turn', {
        method: 'PATCH',
        body: JSON.stringify({ voter: currentUser, score: newTotal }),
      });
      setStep('waiting_votes');
    } catch (e) {
      console.error(e);
    }
    setIsSubmitting(false);
  };

  // -------------------
  // UI (inchangé)
  // -------------------
  if (loading) return (
    <div className="w-full h-full flex items-center justify-center">
      <Loader2 className="animate-spin" />
    </div>
  );

  return (
    <div className="w-full max-w-md mx-auto h-full flex flex-col">
      {step === 'editing' && (
        <div className="flex-1 overflow-y-auto space-y-6 pb-24">
          <h2 className="text-3xl font-black tracking-tight px-4 pt-6">Meme Maker</h2>

          {myMemes.map((meme: any, idx: number) => (
            <div key={meme.instanceId || idx} className="mx-4 rounded-3xl overflow-hidden border bg-white shadow-sm">
              <div className="relative w-full aspect-[1/1] bg-black">
                <img src={meme.url} alt="meme" className="w-full h-full object-cover opacity-90" />
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
                      fontWeight: '900',
                      display: 'flex',
                      textShadow: '0px 2px 4px rgba(0,0,0,0.8)',
                      position: 'absolute'
                    }}
                    className="pointer-events-none p-1"
                  >
                    {meme.inputs?.[zone.id] || ""}
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
                      meme.rerollsLeft <= 0 ? 'opacity-40' : 'hover:bg-gray-50'
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
                      value={meme.inputs?.[zone.id] || ""}
                      onChange={(e) => updateInput(idx, zone.id, e.target.value)}
                      className="w-full mt-2 px-4 py-3 rounded-2xl border font-semibold"
                      placeholder="Tape ton texte..."
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {step === 'editing' && (
        <div className="p-4 border-t bg-white">
          <button
            onClick={submitToJudge}
            disabled={isSubmitting}
            className="w-full bg-gray-900 text-white font-black py-5 rounded-[2rem] uppercase text-sm tracking-widest flex items-center justify-center gap-3"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Send size={18} />}
            Envoyer mes memes
          </button>
        </div>
      )}

      {step === 'waiting' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <Loader2 className="animate-spin mb-4" />
          <h3 className="text-xl font-black">En attente…</h3>
          <p className="text-sm text-gray-500 mt-2">
            Tu as envoyé tes memes. On attend que {opponentName} finisse les siens.
          </p>
        </div>
      )}

      {step === 'voting' && (
        <div className="flex-1 flex flex-col">
          <div className="px-4 pt-6">
            <h2 className="text-3xl font-black tracking-tight">Vote</h2>
            <p className="text-sm text-gray-500 mt-2">
              Note les memes de {opponentName} ({currentVoteIdx + 1}/{othersMemes.length})
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4">
            {othersMemes[currentVoteIdx] && (
              <div className="rounded-3xl overflow-hidden border bg-white shadow-sm">
                <div className="relative w-full aspect-[1/1] bg-black">
                  <img
                    src={othersMemes[currentVoteIdx].url}
                    alt="meme"
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
                        fontWeight: '900',
                        display: 'flex',
                        textShadow: '0px 2px 4px rgba(0,0,0,0.8)',
                        position: 'absolute'
                      }}
                      className="pointer-events-none p-1"
                    >
                      {othersMemes[currentVoteIdx].inputs?.[zone.id] || ""}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-white">
            <div className="grid grid-cols-5 gap-2">
              {voteLabels.map(v => (
                <button
                  key={v.value}
                  onClick={() => handleVoteClick(v.value)}
                  disabled={isSubmitting}
                  className={`rounded-2xl py-3 font-black text-xs uppercase tracking-widest border ${v.color}`}
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

      {step === 'results' && results && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
          <Trophy className="mb-4" />
          <h3 className="text-2xl font-black">Résultats</h3>

          <div className="mt-8 w-full space-y-4">
            <div className="p-5 rounded-3xl border bg-white">
              <div className="text-xs font-black uppercase tracking-widest text-gray-500">Ton score</div>
              <div className="text-4xl font-black mt-2">{results.myScore}</div>
            </div>
            <div className="p-5 rounded-3xl border bg-white">
              <div className="text-xs font-black uppercase tracking-widest text-gray-500">Score de {opponentName}</div>
              <div className="text-4xl font-black mt-2">{results.opponentScore}</div>
            </div>
          </div>

          <button
            onClick={async () => {
              await fetch('/api/game-turn?game=meme', { method: 'DELETE' });
              onFinish(results.myScore);
            }}
            className="w-full mt-10 bg-gray-900 text-white font-black py-5 rounded-[2rem] uppercase text-sm tracking-widest"
          >
            Clôturer le duel
          </button>
        </div>
      )}
    </div>
  );
}
