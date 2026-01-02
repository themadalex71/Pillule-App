import type { GameResult, PlayerId } from "@/types/GameResult";

function getWinner(result: GameResult): PlayerId | "égalité" {
  const a = result.resultsByPlayer["Joueur A"]?.score ?? 0;
  const b = result.resultsByPlayer["Joueur B"]?.score ?? 0;
  if (a === b) return "égalité";
  return a > b ? "Joueur A" : "Joueur B";
}

export default function GameEndCard({
  result,
  onNextDay,
}: {
  result: GameResult;
  onNextDay?: () => void;
}) {
  const a = result.resultsByPlayer["Joueur A"];
  const b = result.resultsByPlayer["Joueur B"];
  const winner = getWinner(result);

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-xl text-center border border-green-50">
      <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
        <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center">
          <span className="text-green-600 text-2xl font-black">✓</span>
        </div>
      </div>

      <h2 className="text-3xl font-black text-gray-900">À DEMAIN !</h2>
      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black mt-2">
        {result.label ?? result.gameId}
      </p>

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between px-6 py-5 rounded-2xl bg-gray-50 border">
          <div className="font-black">Joueur A</div>
          <div className="text-right">
            <div className="text-2xl font-black">{a.score}</div>
            {a.detail && <div className="text-xs text-gray-500 mt-1">{a.detail}</div>}
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-5 rounded-2xl bg-gray-50 border">
          <div className="font-black">Joueur B</div>
          <div className="text-right">
            <div className="text-2xl font-black">{b.score}</div>
            {b.detail && <div className="text-xs text-gray-500 mt-1">{b.detail}</div>}
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 rounded-2xl border border-yellow-100">
        <p className="text-sm font-bold text-yellow-800">
          {winner === "égalité" ? "🤝 Égalité !" : `✨ ${winner} gagne !`}
        </p>
      </div>

      <p className="text-gray-500 text-sm mt-6 italic">
        Le défi est validé, les points sont dans la poche.
      </p>

      {onNextDay && (
        <button
          onClick={onNextDay}
          className="mt-6 w-full bg-gray-900 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-sm"
        >
          Rejouer / Retour
        </button>
      )}
    </div>
  );
}
