'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, Check, X, RotateCcw, Shuffle, Loader2, Hourglass } from 'lucide-react';

const MISSIONS = [
  "Un truc tout doux", "Un truc qui gratte", "Quelque chose en bois", "Quelque chose en métal",
  "Un tissu avec des motifs", "Une matière plastique", "Un truc transparent (verre, eau...)",
  "Un truc rugueux ou abîmé", "Un objet tout rouge", "Un objet tout bleu", "Un objet noir",
  "Un truc multicolore", "Quelque chose de jaune", "Un truc qui se mange", "Un truc qui se boit",
  "Un objet de la salle de bain", "Un truc qui traîne sur ton bureau", "Un vêtement que tu portes",
  "Un truc qui s'allume", "Une plante ou une fleur", "Un truc qui sent fort", "Un morceau de ta main",
  "Un morceau de ton visage", "Ta peau (de très près)", "Tes cheveux ou poils", "Un truc rond",
  "Un truc avec des écritures", "Un truc sale ou poussiéreux", "Ton objet préféré", "Le truc le plus moche"
];

interface ZoomGameProps {
  onFinish: () => void;
  currentUser?: string;
}

export default function ZoomGame({ onFinish, currentUser }: ZoomGameProps) {
  const [mode, setMode] = useState<string>('loading');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [mission, setMission] = useState('');
  const [opponentGuess, setOpponentGuess] = useState<string | null>(null);
  const [myGuess, setMyGuess] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isTester = currentUser === 'Testeur 🛠️';

  useEffect(() => {
    checkGameState();
    setMission(MISSIONS[Math.floor(Math.random() * MISSIONS.length)]);
    const interval = setInterval(checkGameState, 3000);
    return () => clearInterval(interval);
  }, []);

  const checkGameState = async () => {
    try {
      const res = await fetch('/api/game-turn');
      const fullData = await res.json();
      const zoomData = fullData.zoom; 
  
      if (!zoomData || !zoomData.hasPendingGame) {
        setMode('camera');
        return;
      }
  
      setImageSrc(zoomData.image);
      setOpponentGuess(zoomData.currentGuess);
  
      if (isTester) {
          // Le testeur peut jouer les deux rôles pour débloquer
          setMode(zoomData.currentGuess ? 'validating' : 'guessing');
          return;
      }
  
      const amIAuthor = zoomData.author === currentUser;
      if (amIAuthor) {
          setMode(zoomData.currentGuess ? 'validating' : 'waiting_opponent');
      } else {
          setMode(zoomData.currentGuess ? 'waiting_validation' : 'guessing');
      }
    } catch (e) {
      console.error("Erreur Sync Zoom:", e);
      if (mode === 'loading') setMode('camera');
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset complet ?")) return;
    setIsUploading(true);
    await fetch('/api/game-turn?game=zoom', { method: 'DELETE' });
    window.location.reload();
  };

  const submitPhoto = async () => {
    if (!imageSrc) return;
    setIsUploading(true);
    await fetch('/api/game-turn', {
      method: 'POST',
      body: JSON.stringify({ 
        type: 'zoom', // Crucial pour l'API
        image: imageSrc, 
        author: currentUser || 'Inconnu', 
        mission 
      })
    });
    setIsUploading(false);
    checkGameState();
  };

  const submitGuess = async () => {
    if (!myGuess.trim()) return;
    setIsUploading(true);
    await fetch('/api/game-turn', {
      method: 'POST', // Changé de PUT à POST
      body: JSON.stringify({ action: 'submit_guess', guess: myGuess })
    });
    setIsUploading(false);
    setMyGuess('');
    checkGameState();
  };

  const handleValidation = async (isValid: boolean) => {
    setIsUploading(true);
    if (isValid) {
        await fetch('/api/game-turn?game=zoom', { method: 'DELETE' });
        onFinish();
    } else {
        await fetch('/api/game-turn', {
            method: 'POST', // Changé de PUT à POST
            body: JSON.stringify({ action: 'reject_guess' })
        });
        checkGameState();
        alert("Réponse refusée !");
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

  if (mode === 'loading') return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-purple-600"/></div>;

  return (
    <div className="flex flex-col items-center gap-6 w-full animate-in fade-in relative max-w-sm mx-auto">
      
      {/* BOUTON RESET */}
      <div className="absolute -top-10 right-0">
          <button onClick={handleReset} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition text-gray-400">
            <RotateCcw size={18} />
          </button>
      </div>

      {mode === 'camera' && (
        <>
            <div className="bg-purple-50 p-6 rounded-2xl text-center border border-purple-100 w-full relative">
                <p className="text-xs font-bold text-purple-600 uppercase mb-1">Mission</p>
                <h3 className="text-2xl font-black text-gray-800 mb-4">{mission}</h3>
                <button onClick={() => setMission(MISSIONS[Math.floor(Math.random() * MISSIONS.length)])} className="text-xs text-gray-400 border px-3 py-1 rounded-full bg-white flex items-center gap-1 mx-auto"><Shuffle size={10}/> Changer</button>
            </div>
            <div className="relative w-64 h-64 bg-gray-100 rounded-2xl overflow-hidden border-4 border-dashed border-gray-300 flex items-center justify-center">
                {imageSrc ? <img src={imageSrc} className="w-full h-full object-cover" /> : (
                    <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center text-gray-400">
                        <Camera size={48} /><span className="text-xs font-bold mt-2">Prendre la photo</span>
                    </button>
                )}
            </div>
            {imageSrc && <button onClick={submitPhoto} disabled={isUploading} className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700">{isUploading ? 'Envoi...' : 'Lancer le défi 🚀'}</button>}
        </>
      )}

      
      {mode === 'waiting_opponent' && (
         <div className="text-center py-10">
             <Loader2 size={48} className="animate-spin text-purple-300 mx-auto mb-4"/>
             <h3 className="text-xl font-bold text-gray-700">Défi envoyé !</h3>
             <p className="text-sm text-gray-500">Attente de la réponse...</p>
         </div>
      )}

      {mode === 'guessing' && (
        <>
            <div className="bg-blue-50 p-4 rounded-xl text-center w-full"><p className="font-bold text-blue-700">🕵️‍♂️ C'est quoi ça ?</p></div>
            <div className="w-64 h-64 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-black">
                <img src={imageSrc!} className="w-full h-full object-cover scale-[4.0]" />
            </div>
            <div className="w-full flex flex-col gap-2">
                <input type="text" placeholder="Ta réponse..." value={myGuess} onChange={(e) => setMyGuess(e.target.value)} className="w-full p-3 rounded-xl border text-center font-bold outline-none focus:border-blue-500" />
                <button onClick={submitGuess} disabled={!myGuess || isUploading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl">Valider</button>
            </div>
        </>
      )}

      {mode === 'waiting_validation' && (
        <>
            <div className="bg-yellow-50 p-4 rounded-xl text-center w-full"><p className="font-bold text-yellow-700">⏳ En attente de validation</p></div>
            <div className="w-64 h-64 rounded-2xl overflow-hidden border-4 border-yellow-200 shadow-xl relative">
                <img src={imageSrc!} className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/10"><Hourglass className="text-white animate-pulse" size={48} /></div>
            </div>
        </>
      )}

      {mode === 'validating' && (
        <>
            <div className="bg-green-50 p-6 rounded-2xl text-center w-full">
                <p className="text-xs font-bold text-green-600 uppercase tracking-widest">Proposition</p>
                <h3 className="text-2xl font-black text-gray-800 italic">"{opponentGuess}"</h3>
            </div>
            <div className="w-64 h-64 rounded-2xl overflow-hidden border-4 border-green-200 shadow-xl">
                <img src={imageSrc!} className="w-full h-full object-cover" />
            </div>
            <div className="w-full flex gap-3">
                <button onClick={() => handleValidation(false)} className="flex-1 bg-red-100 text-red-600 font-bold py-4 rounded-xl flex flex-col items-center"><X size={24} /> Non</button>
                <button onClick={() => handleValidation(true)} className="flex-1 bg-green-500 text-white font-bold py-4 rounded-xl flex flex-col items-center"><Check size={24} /> Oui !</button>
            </div>
        </>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
    </div>
  );
}