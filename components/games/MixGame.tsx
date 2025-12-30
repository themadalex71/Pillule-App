'use client';

import { useState } from 'react';

// Ce composant reçoit une fonction "onFinish" qu'il doit appeler quand le joueur a gagné
export default function MixGame({ onFinish }: { onFinish: () => void }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      
      {/* Simulation d'une question */}
      <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 text-center w-full">
        <span className="text-sm font-bold text-blue-500 uppercase">Question Test</span>
        <h3 className="text-xl font-bold text-gray-800 mt-2">
          "Je suis le jeu de test."
        </h3>
        <p className="text-gray-500 text-sm mt-1">Si tu me vois, c'est que l'appli marche !</p>
      </div>

      {/* Bouton pour révéler la réponse */}
      {!revealed ? (
        <button 
          onClick={() => setRevealed(true)}
          className="px-6 py-2 bg-gray-200 rounded-full text-gray-600 hover:bg-gray-300 transition"
        >
          Voir la réponse 👀
        </button>
      ) : (
        <div className="animate-in fade-in zoom-in duration-300 text-center flex flex-col items-center gap-4">
          <p className="text-2xl font-extrabold text-purple-600">VICTOIRE !</p>
          
          {/* LE BOUTON IMPORTANT : Il appelle onFinish pour dire à la page principale "C'est bon !" */}
          <button 
            onClick={onFinish}
            className="bg-purple-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:bg-purple-700 transition"
          >
            Valider le test
          </button>
        </div>
      )}
    </div>
  );
}