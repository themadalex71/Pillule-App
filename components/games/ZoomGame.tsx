'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, Check, X, Send, RotateCcw, Shuffle, Loader2, Hourglass } from 'lucide-react';

// 🎯 LISTE DES MISSIONS
const MISSIONS = [
  // --- LES MATIÈRES (Le rendu est dingue en zoom) ---
  "Un truc tout doux",
  "Un truc qui gratte",
  "Quelque chose en bois",
  "Quelque chose en métal",
  "Un tissu avec des motifs",
  "Une matière plastique",
  "Un truc transparent (verre, eau...)",
  "Un truc rugueux ou abîmé",

  // --- LES COULEURS (Piégeux en zoom) ---
  "Un objet tout rouge",
  "Un objet tout bleu",
  "Un objet noir",
  "Un truc multicolore",
  "Quelque chose de jaune",

  // --- LA MAISON (Facile à trouver autour de soi) ---
  "Un truc qui se mange",
  "Un truc qui se boit",
  "Un objet de la salle de bain",
  "Un truc qui traîne sur ton bureau",
  "Un vêtement que tu portes",
  "Un truc qui s'allume",
  "Une plante ou une fleur",
  "Un truc qui sent fort",

  // --- LE CORPS (Simple et efficace) ---
  "Un morceau de ta main",
  "Un morceau de ton visage",
  "Ta peau (de très près)",
  "Tes cheveux ou poils",

  // --- LES DÉFIS ---
  "Un truc rond",
  "Un truc avec des écritures",
  "Un truc sale ou poussiéreux",
  "Ton objet préféré",
  "Le truc le plus moche de la pièce"
];

interface ZoomGameProps {
  onFinish: () => void;
  currentUser?: string;
}

export default function ZoomGame({ onFinish, currentUser }: ZoomGameProps) {
  // ÉTATS POSSIBLES : 
  // 'loading'
  // 'camera' (A prend la photo)
  // 'waiting_opponent' (A attend que B joue)
  // 'guessing' (B doit deviner)
  // 'waiting_validation' (B a joué, attend validation de A + Photo dézoomée)
  // 'validating' (A voit la réponse de B et valide/refuse)
  
  const [mode, setMode] = useState<string>('loading');
  
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [mission, setMission] = useState('');
  const [opponentGuess, setOpponentGuess] = useState<string | null>(null);
  const [myGuess, setMyGuess] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isTester = currentUser === 'Testeur 🛠️';

  // Boucle de vérification (Polling) pour le Ping-Pong
  useEffect(() => {
    checkGameState();
    pickRandomMission();

    const interval = setInterval(checkGameState, 3000); // Vérifie toutes les 3s
    return () => clearInterval(interval);
  }, []);

  const pickRandomMission = () => {
    setMission(MISSIONS[Math.floor(Math.random() * MISSIONS.length)]);
  };

  const checkGameState = async () => {
    try {
      const res = await fetch('/api/game-turn');
      const data = await res.json();

      if (!data.hasPendingGame) {
        setMode('camera');
        return;
      }

      // IL Y A UNE PARTIE EN COURS
      setImageSrc(data.image);
      setOpponentGuess(data.currentGuess);

      const amIAuthor = data.author === currentUser;

      // LOGIQUE DU TESTEUR (Il joue les 2 rôles à la suite)
      if (isTester) {
          if (!data.currentGuess) setMode('guessing'); // Si pas de réponse, je deviens le chercheur
          else setMode('validating'); // Si réponse, je deviens le validateur
          return;
      }

      // LOGIQUE JOUEURS RÉELS
      if (amIAuthor) {
          // JE SUIS LE CRÉATEUR (A)
          if (data.currentGuess) setMode('validating'); // B a répondu !
          else setMode('waiting_opponent'); // J'attends B
      } else {
          // JE SUIS LE CHERCHEUR (B)
          if (data.currentGuess) setMode('waiting_validation'); // J'ai déjà répondu
          else setMode('guessing'); // À moi de jouer
      }

    } catch (e) {
      console.error(e);
    }
  };

  // --- ACTIONS ---

  const handleReset = async () => {
    if (!confirm("Reset complet du jeu ?")) return;
    setIsUploading(true);
    await fetch('/api/game-turn', { method: 'DELETE' });
    window.location.reload();
  };

  const submitPhoto = async () => {
    if (!imageSrc) return;
    setIsUploading(true);
    await fetch('/api/game-turn', {
      method: 'POST',
      body: JSON.stringify({ image: imageSrc, author: currentUser || 'Inconnu', mission })
    });
    setIsUploading(false);
    checkGameState(); // Refresh immédiat
  };

  const submitGuess = async () => {
    if (!myGuess.trim()) return;
    setIsUploading(true);
    await fetch('/api/game-turn', {
      method: 'PUT',
      body: JSON.stringify({ action: 'submit_guess', guess: myGuess })
    });
    setIsUploading(false);
    setMyGuess('');
    checkGameState();
  };

  const handleValidation = async (isValid: boolean) => {
    setIsUploading(true);
    if (isValid) {
        // C'est gagné -> On supprime le jeu
        await fetch('/api/game-turn', { method: 'DELETE' });
        onFinish(); // Déclenche les confettis
    } else {
        // C'est raté -> On rejette le guess (B devra rejouer)
        await fetch('/api/game-turn', {
            method: 'PUT',
            body: JSON.stringify({ action: 'reject_guess' })
        });
        checkGameState();
        alert("Réponse refusée. L'autre joueur devra réessayer !");
    }
    setIsUploading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImageSrc(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // --- RENDU ---
  
  if (mode === 'loading') return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-purple-600"/></div>;

  return (
    <div className="flex flex-col items-center gap-6 w-full animate-in fade-in relative max-w-sm mx-auto">
      
      {isTester && (
          <div className="absolute -top-10 right-0">
             <button onClick={handleReset} className="text-xs bg-red-100 text-red-500 px-2 py-1 rounded">Reset Force</button>
          </div>
      )}

      {/* =========================================================
          ÉTAPE 1 : PRISE DE PHOTO (Joueur A)
         ========================================================= */}
      {mode === 'camera' && (
        <>
            <div className="bg-purple-50 p-6 rounded-2xl text-center border border-purple-100 w-full relative overflow-hidden">
                <div className="absolute top-2 right-2 opacity-10"><Camera size={40}/></div>
                <p className="text-xs font-bold text-purple-600 uppercase mb-1">Ta Mission</p>
                <h3 className="text-2xl font-black text-gray-800 mb-4">{mission}</h3>
                <button onClick={pickRandomMission} className="text-xs flex items-center justify-center gap-1 mx-auto text-gray-400 border px-3 py-1 rounded-full bg-white"><Shuffle size={10}/> Changer</button>
            </div>

            <div className="relative w-64 h-64 bg-gray-100 rounded-2xl overflow-hidden border-4 border-dashed border-gray-300 flex items-center justify-center">
                {imageSrc ? (
                    <img src={imageSrc} className="w-full h-full object-cover" />
                ) : (
                    <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center text-gray-400">
                        <Camera size={48} /><span className="text-xs font-bold mt-2">Photo de TRÈS près</span>
                    </button>
                )}
            </div>

            {imageSrc && (
                <button onClick={submitPhoto} disabled={isUploading} className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700">
                   {isUploading ? 'Envoi...' : 'Envoyer le défi 🚀'}
                </button>
            )}
        </>
      )}

      {/* =========================================================
          ÉTAPE 2 : ATTENTE JOUEUR (Joueur A)
         ========================================================= */}
      {mode === 'waiting_opponent' && (
         <div className="text-center py-10">
             <Loader2 size={48} className="animate-spin text-purple-300 mx-auto mb-4"/>
             <h3 className="text-xl font-bold text-gray-700">Défi envoyé !</h3>
             <p className="text-gray-500">En attente que l'autre joueur devine...</p>
         </div>
      )}

      {/* =========================================================
          ÉTAPE 3 : DEVINETTE (Joueur B)
         ========================================================= */}
      {mode === 'guessing' && (
        <>
             <div className="bg-blue-50 p-4 rounded-xl text-center w-full">
                <p className="font-bold text-blue-700">🕵️‍♂️ C'est quoi ça ?</p>
                <p className="text-xs text-blue-500">Regarde bien les détails...</p>
            </div>

            {/* ZOOM EXTRÊME ICI */}
            <div className="w-64 h-64 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-black">
                <img src={imageSrc!} className="w-full h-full object-cover scale-[4.0] origin-center" />
            </div>

            <div className="w-full flex flex-col gap-2">
                <input 
                    type="text" 
                    placeholder="Ta réponse..." 
                    value={myGuess}
                    onChange={(e) => setMyGuess(e.target.value)}
                    className="w-full p-3 rounded-xl border text-center font-bold"
                />
                <button onClick={submitGuess} disabled={!myGuess || isUploading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700">
                    Valider ma réponse
                </button>
            </div>
        </>
      )}

      {/* =========================================================
          ÉTAPE 4 : ATTENTE VALIDATION (Joueur B)
         ========================================================= */}
      {mode === 'waiting_validation' && (
        <>
            <div className="bg-yellow-50 p-4 rounded-xl text-center w-full">
                <p className="font-bold text-yellow-700">⏳ En attente de validation</p>
                <p className="text-sm">Tu as proposé : <strong>{opponentGuess}</strong></p>
            </div>

            {/* DÉZOOM ICI (scale-100) */}
            <div className="w-64 h-64 rounded-2xl overflow-hidden border-4 border-yellow-200 shadow-xl relative">
                <img src={imageSrc!} className="w-full h-full object-cover scale-100 transition-transform duration-1000" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                    <Hourglass className="text-white animate-pulse" size={48} />
                </div>
            </div>
            
            <p className="text-center text-xs text-gray-400">L'autre joueur doit confirmer si c'est bon.</p>
        </>
      )}

      {/* =========================================================
          ÉTAPE 5 : VALIDATION (Joueur A)
         ========================================================= */}
      {mode === 'validating' && (
        <>
            <div className="bg-green-50 p-6 rounded-2xl text-center w-full animate-bounce-in">
                <p className="text-xs font-bold text-green-600 uppercase">Proposition reçue</p>
                <h3 className="text-2xl font-black text-gray-800">"{opponentGuess}"</h3>
            </div>

            <div className="w-64 h-64 rounded-2xl overflow-hidden border-4 border-green-200 shadow-xl">
                <img src={imageSrc!} className="w-full h-full object-cover" />
            </div>

            <div className="w-full flex gap-3">
                <button 
                    onClick={() => handleValidation(false)}
                    disabled={isUploading}
                    className="flex-1 bg-red-100 text-red-600 font-bold py-4 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-red-200"
                >
                    <X size={24} /> Non, retente !
                </button>
                <button 
                    onClick={() => handleValidation(true)}
                    disabled={isUploading}
                    className="flex-1 bg-green-500 text-white font-bold py-4 rounded-xl flex flex-col items-center justify-center gap-1 hover:bg-green-600 shadow-lg"
                >
                    <Check size={24} /> C'est ça ! ✅
                </button>
            </div>
        </>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
    </div>
  );
}