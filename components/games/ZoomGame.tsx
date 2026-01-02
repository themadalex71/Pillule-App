'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, Check, X, RotateCcw, Shuffle, Loader2, Hourglass } from 'lucide-react';

export default function ZoomGame({ onFinish, currentUser }: any) {
  const [mode, setMode] = useState<string>('loading');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [opponentGuess, setOpponentGuess] = useState<string | null>(null);
  const [myGuess, setMyGuess] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const opponentName = currentUser === 'Joueur A' ? 'Joueur B' : 'Joueur A';

  useEffect(() => {
    checkGameState();
    const interval = setInterval(checkGameState, 3000);
    return () => clearInterval(interval);
  }, []);

  const checkGameState = async () => {
    try {
      const res = await fetch('/api/game-turn');
      const data = await res.json();
      const zoom = data.zoom;
      
      if (!zoom || !zoom.hasPendingGame) {
        if (mode === 'waiting_validation') { onFinish(1); return; }
        setMode('camera'); return;
      }
      setImageSrc(zoom.image);
      setOpponentGuess(zoom.currentGuess);
      const amIAuthor = zoom.author === currentUser;
      setMode(amIAuthor ? (zoom.currentGuess ? 'validating' : 'waiting_opponent') : (zoom.currentGuess ? 'waiting_validation' : 'guessing'));
    } catch (e) { if (mode === 'loading') setMode('camera'); }
  };

  const submitPhoto = async () => {
    if (!imageSrc) return;
    setIsUploading(true);
    await fetch('/api/game-turn', { method: 'POST', body: JSON.stringify({ type: 'zoom', image: imageSrc, author: currentUser }) });
    setIsUploading(false);
  };

  const submitGuess = async () => {
    if (!myGuess.trim()) return;
    setIsUploading(true);
    await fetch('/api/game-turn', { method: 'POST', body: JSON.stringify({ action: 'submit_guess', guess: myGuess }) });
    setIsUploading(false); setMyGuess('');
  };

  const handleValidation = async (isValid: boolean) => {
    setIsUploading(true);
    
    if (isValid) {
        // SCÉNARIO : C'EST LA BONNE RÉPONSE
        // On supprime la partie pour tout le monde
        await fetch('/api/game-turn?game=zoom', { method: 'DELETE' });
        // On termine le jeu avec 1 point pour celui qui a deviné
        onFinish(1); 
    } else {
        // SCÉNARIO : C'EST FAUX
        // On supprime aussi la partie car le tour est fini (on ne laisse pas de seconde chance)
        await fetch('/api/game-turn?game=zoom', { method: 'DELETE' });
        // On termine le jeu avec 0 point
        onFinish(0);
    }
    
    setIsUploading(false);
  };

  if (mode === 'loading') return <div className="p-10 text-center text-purple-600"><Loader2 className="animate-spin mx-auto"/></div>;

  return (
    <div className="flex flex-col items-center gap-6 w-full animate-in fade-in">
      {mode === 'camera' && (
        <>
            <div className="bg-purple-50 p-6 rounded-2xl text-center w-full border border-purple-100">
                <h3 className="text-xl font-black text-gray-800">C'est ton tour ! 📸</h3>
                <p className="text-[10px] text-gray-500 uppercase mt-2">Prends un objet de très près</p>
            </div>
            <div onClick={() => fileInputRef.current?.click()} className="relative w-64 h-64 bg-gray-100 rounded-3xl overflow-hidden border-4 border-dashed border-gray-200 flex items-center justify-center cursor-pointer">
                {imageSrc ? <img src={imageSrc} className="w-full h-full object-cover" /> : <Camera className="text-gray-300" size={48} />}
            </div>
            {imageSrc && <button onClick={submitPhoto} disabled={isUploading} className="w-full bg-purple-600 text-white font-black py-4 rounded-2xl shadow-lg">{isUploading ? 'ENVOI...' : 'LANCER LE DÉFI 🚀'}</button>}
        </>
      )}

      {mode === 'waiting_opponent' && (
         <div className="text-center py-10 bg-gray-50 rounded-3xl w-full border border-dashed">
             <Loader2 size={40} className="animate-spin text-purple-300 mx-auto mb-4"/>
             <p className="font-bold text-gray-600">Photo envoyée !</p>
             <p className="text-xs text-gray-400 mt-2">En attente que <span className="text-purple-600 font-bold">{opponentName}</span> réponde...</p>
         </div>
      )}

      {mode === 'guessing' && (
        <>
            <div className="bg-blue-50 p-4 rounded-xl text-center w-full font-bold text-blue-700">🕵️‍♂️ C'est quoi ça ? (Zoom x4)</div>
            <div className="w-64 h-64 rounded-3xl overflow-hidden border-4 border-white shadow-2xl bg-black">
                <img src={imageSrc!} className="w-full h-full object-cover scale-[4.0]" />
            </div>
            <input type="text" placeholder="Ta réponse..." value={myGuess} onChange={(e) => setMyGuess(e.target.value)} className="w-full p-4 rounded-xl border-2 text-center font-bold outline-none focus:border-blue-500" />
            <button onClick={submitGuess} disabled={!myGuess || isUploading} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl">ENVOYER</button>
        </>
      )}

      {mode === 'waiting_validation' && (
        <div className="text-center py-10 bg-yellow-50 rounded-3xl w-full border border-yellow-100">
            <Hourglass className="text-yellow-500 animate-bounce mx-auto mb-4" size={40} />
            <p className="font-bold text-yellow-700">Réponse transmise !</p>
            <p className="text-xs text-yellow-600 mt-2">Attente de validation par <span className="font-black">{opponentName}</span></p>
        </div>
      )}

      {mode === 'validating' && (
        <>
            <div className="bg-green-50 p-6 rounded-2xl text-center w-full">
                <p className="text-[10px] font-black text-green-600 uppercase">Proposition de {opponentName}</p>
                <h3 className="text-2xl font-black text-gray-800 italic">"{opponentGuess}"</h3>
            </div>
            <div className="w-64 h-64 rounded-3xl overflow-hidden border-4 border-green-200 shadow-xl">
                <img src={imageSrc!} className="w-full h-full object-cover" />
            </div>
            <div className="flex gap-3 w-full">
                <button onClick={() => handleValidation(false)} className="flex-1 bg-red-100 text-red-600 font-bold py-4 rounded-xl flex items-center justify-center gap-2"><X size={20}/> Non</button>
                <button onClick={() => handleValidation(true)} className="flex-1 bg-green-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"><Check size={20}/> Oui !</button>
            </div>
        </>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => setImageSrc(reader.result as string);
          reader.readAsDataURL(file);
        }
      }} />
    </div>
  );
}