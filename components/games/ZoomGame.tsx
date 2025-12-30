'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, Check, Trash2, Send, Eye, Loader2, RotateCcw } from 'lucide-react';

interface ZoomGameProps {
  onFinish: () => void;
  currentUser?: string;
}

export default function ZoomGame({ onFinish, currentUser }: ZoomGameProps) {
  const [mode, setMode] = useState<'loading' | 'camera' | 'guess'>('loading');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [author, setAuthor] = useState<string>('');
  const [guess, setGuess] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isTester = currentUser === 'Testeur 🛠️';

  useEffect(() => {
    checkGameState();
  }, []);

  const checkGameState = async () => {
    try {
      const res = await fetch('/api/game-turn');
      const data = await res.json();

      if (data.hasPendingGame) {
        // Il y a une partie en cours !
        setImageSrc(data.image);
        setAuthor(data.author);
        setMode('guess'); 
      } else {
        // Pas de partie, mode création
        setMode('camera');
      }
    } catch (e) {
      console.error(e);
      setMode('camera'); // En cas d'erreur, on laisse jouer
    }
  };

  // --- ACTIONS ---

  const handleReset = async () => {
    if (!confirm("Veux-tu vraiment supprimer la photo en cours et recommencer ?")) return;
    
    setIsUploading(true);
    try {
        // 1. On vide Redis
        await fetch('/api/game-turn', { method: 'DELETE' });
        // 2. On reset l'état local
        setImageSrc(null);
        setGuess('');
        setIsRevealed(false);
        setMode('camera');
    } catch (e) {
        console.error(e);
    }
    setIsUploading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitChallenge = async () => {
    if (!imageSrc) return;
    setIsUploading(true);

    await fetch('/api/game-turn', {
      method: 'POST',
      body: JSON.stringify({ 
        image: imageSrc, 
        author: currentUser || 'Inconnu' 
      })
    });

    setIsUploading(false);

    // ✨ LOGIQUE SPÉCIALE TESTEUR : On joue tout seul !
    if (isTester) {
        setAuthor(currentUser || 'Moi');
        setMode('guess'); // On passe direct à la suite sans quitter
        setGuess('');     // On vide le champ réponse
        alert("📸 Photo envoyée ! À toi de deviner maintenant (Mode Testeur)");
    } else {
        // Logique normale pour les vrais joueurs
        onFinish(); 
        alert("Défi envoyé ! L'autre joueur recevra la notif.");
    }
  };

  const handleWin = async () => {
    // Si c'est le testeur, il peut décider de reset ou juste finir
    if (isTester) {
        // Pour le testeur, on ne supprime PAS l'image automatiquement à la fin
        // comme ça il peut re-tester. Il devra utiliser le bouton Reset.
        onFinish(); 
    } else {
        // Pour les vrais joueurs, gagner supprime la photo pour le tour suivant
        await fetch('/api/game-turn', { method: 'DELETE' });
        onFinish();
    }
  };

  // --- RENDU ---

  if (mode === 'loading') return <div className="p-10"><Loader2 className="animate-spin mx-auto text-purple-600"/></div>;

  return (
    <div className="flex flex-col items-center gap-6 w-full animate-in fade-in relative">

      {/* 🔴 BOUTON RESET (Uniquement pour le Testeur) */}
      {isTester && imageSrc && (
        <button 
            onClick={handleReset}
            className="absolute -top-12 right-0 bg-red-100 text-red-600 p-2 rounded-full hover:bg-red-200 transition text-xs flex items-center gap-1 font-bold"
            title="Supprimer la photo et recommencer"
        >
            <RotateCcw size={14}/> Reset DB
        </button>
      )}

      {/* ------------------------------------------------------------------
          MODE 1 : CRÉATEUR (Prendre la photo)
         ------------------------------------------------------------------ */}
      {mode === 'camera' && (
        <>
            <div className="bg-blue-50 p-4 rounded-xl text-center border border-blue-100 w-full">
            <p className="font-bold text-blue-700">📸 À toi de jouer !</p>
            <p className="text-sm text-blue-500">Prends un objet en photo de très près.</p>
            </div>

            {/* Zone de prévisualisation */}
            <div className="relative w-64 h-64 bg-gray-100 rounded-2xl overflow-hidden border-4 border-dashed border-gray-300 flex items-center justify-center group">
            {imageSrc ? (
                <img src={imageSrc} alt="Preview" className="w-full h-full object-cover" />
            ) : (
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer flex flex-col items-center text-gray-400 hover:text-purple-500 transition"
                >
                    <Camera size={48} />
                    <span className="text-xs font-bold mt-2">Toucher ici</span>
                </div>
            )}
            </div>

            {/* Boutons */}
            {!imageSrc ? (
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-purple-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-purple-700 transition"
            >
                Prendre une photo
            </button>
            ) : (
            <div className="flex gap-4 w-full">
                <button 
                onClick={() => setImageSrc(null)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                <Trash2 size={18}/> Refaire
                </button>
                <button 
                onClick={submitChallenge}
                disabled={isUploading}
                className="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-600"
                >
                {isUploading ? <Loader2 className="animate-spin"/> : <Send size={18}/>}
                {isTester ? "Envoyer & Jouer" : "Envoyer"}
                </button>
            </div>
            )}
        </>
      )}

      {/* ------------------------------------------------------------------
          MODE 2 : CHERCHEUR (Deviner)
         ------------------------------------------------------------------ */}
      {mode === 'guess' && (
        <>
            <div className="bg-purple-50 p-4 rounded-xl text-center border border-purple-100 w-full">
                <p className="font-bold text-purple-700">
                    🕵️‍♂️ Défi de {author === currentUser ? 'toi-même (Test)' : author}
                </p>
                <p className="text-sm text-purple-500">C'est quoi cet objet ?</p>
            </div>

            {/* Image Zoomée */}
            <div className="relative w-64 h-64 rounded-2xl overflow-hidden shadow-lg border-4 border-white bg-black">
                <img 
                src={imageSrc!} 
                alt="Jeu Zoom"
                className={`w-full h-full object-cover transition-transform duration-700 ${isRevealed ? 'scale-100' : 'scale-[4.0] origin-center blur-sm'}`} 
                />
                {!isRevealed && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-white/50 text-4xl font-bold">?</span>
                </div>
                )}
            </div>

            {!isRevealed ? (
                <div className="w-full flex flex-col gap-3">
                    <input 
                    type="text" 
                    placeholder="Ta réponse..." 
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    className="w-full p-4 rounded-xl border border-gray-300 text-center focus:border-purple-500 focus:outline-none"
                    />
                    <button 
                    onClick={() => setIsRevealed(true)}
                    className="w-full bg-yellow-400 text-yellow-900 font-bold py-3 rounded-xl hover:bg-yellow-500 transition flex items-center justify-center gap-2"
                    >
                    <Eye size={20}/> Révéler la réponse
                    </button>
                </div>
            ) : (
                <div className="text-center w-full animate-in slide-in-from-bottom">
                <p className="text-gray-500 mb-4 text-sm">Alors, tu avais trouvé ?</p>
                <div className="flex gap-2">
                     {/* Si testeur, on affiche aussi le bouton reset en bas pour aller vite */}
                    {isTester && (
                        <button 
                             onClick={handleReset}
                             className="flex-1 bg-red-100 text-red-600 font-bold py-3 rounded-xl hover:bg-red-200 transition"
                        >
                            Reset
                        </button>
                    )}
                    <button 
                        onClick={handleWin}
                        className="flex-1 bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-green-600 transition flex items-center justify-center gap-2"
                    >
                        <Check size={20}/> Valider
                    </button>
                </div>
                </div>
            )}
        </>
      )}

      {/* Input caché pour la caméra */}
      <input 
        ref={fileInputRef}
        type="file" 
        accept="image/*" 
        capture="environment"
        className="hidden" 
        onChange={handleFileChange}
      />
    </div>
  );
}