'use client';

import { useState, useRef } from 'react';
import { Camera, Send, Check, X, Loader2, Clock } from 'lucide-react';

export default function ZoomGame({ session, currentUser, onAction }: { session: any, currentUser: string, onAction: any }) {
  const { sharedData } = session;
  const isAuthor = currentUser === sharedData.author;
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [guess, setGuess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ÉTAPE 1 : PHOTO
  if (sharedData.step === 'PHOTO') {
    if (!isAuthor) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] text-center gap-4 shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 animate-pulse"><Camera /></div>
          <h3 className="font-black text-xl text-gray-800">Attente de la photo...</h3>
          <p className="text-gray-500 font-medium tracking-tight">C'est au tour de <span className="text-purple-600 font-bold">{sharedData.author}</span> de jouer.</p>
        </div>
      );
    }
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="bg-purple-600 p-8 rounded-[2.5rem] text-white text-center shadow-lg shadow-purple-100">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Mission Photo</p>
          <h3 className="text-2xl font-black leading-tight">{sharedData.mission}</h3>
        </div>
        <div className="relative aspect-square bg-gray-100 rounded-[2.5rem] overflow-hidden border-4 border-dashed border-gray-200 flex items-center justify-center">
          {imageSrc ? <img src={imageSrc} className="w-full h-full object-cover" alt="Preview" /> : (
            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center text-gray-400 gap-3">
              <div className="bg-white p-4 rounded-full shadow-sm text-purple-600"><Camera size={32} /></div>
              <span className="font-bold">Prendre la photo</span>
            </button>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImageSrc(reader.result as string);
            reader.readAsDataURL(file);
          }
        }} />
        {imageSrc && (
          <button onClick={() => onAction({ action: 'zoom_submit_photo', image: imageSrc })}
            className="w-full bg-purple-600 text-white font-black py-5 rounded-2xl shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all">
            <Send size={20} /> ENVOYER LE DÉFI
          </button>
        )}
      </div>
    );
  }

  // ÉTAPE 2 : DEVINETTE
  if (sharedData.step === 'GUESS') {
    if (isAuthor) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] text-center gap-4 shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 animate-bounce"><Clock /></div>
          <h3 className="font-black text-xl text-gray-800">Photo envoyée !</h3>
          <p className="text-gray-500 font-medium tracking-tight">On attend la réponse de <span className="text-blue-600 font-bold">{sharedData.guesser}</span>.</p>
        </div>
      );
    }
    return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4">
        <div className="aspect-square rounded-[2.5rem] overflow-hidden border-8 border-white shadow-2xl bg-black relative">
          <img src={sharedData.image} className="w-full h-full object-cover scale-[5.0] origin-center" alt="Zoomed" />
          <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">Zoom 500%</div>
        </div>
        <div className="space-y-3">
          <input type="text" placeholder="Qu'est-ce que c'est ?" value={guess} onChange={(e) => setGuess(e.target.value)} 
            className="w-full p-5 rounded-2xl border-2 border-gray-100 text-center font-bold text-xl outline-none shadow-inner" />
          <button onClick={() => onAction({ action: 'zoom_submit_guess', guess })} disabled={!guess}
            className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-lg active:scale-95 transition-all">
            SOUMETTRE MA RÉPONSE
          </button>
        </div>
      </div>
    );
  }

  // ÉTAPE 3 : VALIDATION
  if (sharedData.step === 'VALIDATION') {
    if (!isAuthor) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] text-center gap-4 shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 animate-pulse"><Send /></div>
          <h3 className="font-black text-xl italic text-gray-800">"{sharedData.currentGuess}"</h3>
          <p className="text-gray-500 font-medium tracking-tight">Attente de la validation de {sharedData.author}...</p>
        </div>
      );
    }
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="bg-yellow-50 p-6 rounded-[2rem] text-center border border-yellow-100 shadow-sm">
          <p className="text-[10px] font-black uppercase text-yellow-600 mb-1 tracking-widest">Proposition de {sharedData.guesser}</p>
          <h3 className="text-3xl font-black italic text-gray-800">"{sharedData.currentGuess}"</h3>
        </div>
        <div className="aspect-square rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl bg-gray-100">
          <img src={sharedData.image} className="w-full h-full object-cover" alt="Original" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => onAction({ action: 'zoom_validate', isValid: false })} className="bg-red-50 text-red-600 font-black py-6 rounded-2xl flex flex-col items-center gap-1 border border-red-100 active:scale-95 transition-all uppercase text-xs">
            <X size={28} /> C'est faux
          </button>
          <button onClick={() => onAction({ action: 'zoom_validate', isValid: true })} className="bg-green-500 text-white font-black py-6 rounded-2xl flex flex-col items-center gap-1 shadow-lg shadow-green-100 active:scale-95 transition-all uppercase text-xs">
            <Check size={28} /> C'est vrai
          </button>
        </div>
      </div>
    );
  }

  return null;
}