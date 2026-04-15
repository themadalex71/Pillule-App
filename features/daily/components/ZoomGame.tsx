'use client';

import { type MouseEvent, useRef, useState } from 'react';
import { Camera, Send, Check, X, Clock, Loader2 } from 'lucide-react';

type Props = {
  session: any;
  currentUserId: string;
  participantMap: Record<string, string>;
  onAction: (payload: any) => void | Promise<void>;
};

type ZoomPoint = {
  x: number;
  y: number;
};

const ZOOM_MIN_PERCENT = 8;
const ZOOM_MAX_PERCENT = 92;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function roundPercent(value: number) {
  return Math.round(value * 10) / 10;
}

function getRandomZoomPoint(): ZoomPoint {
  const range = ZOOM_MAX_PERCENT - ZOOM_MIN_PERCENT;
  return {
    x: roundPercent(ZOOM_MIN_PERCENT + Math.random() * range),
    y: roundPercent(ZOOM_MIN_PERCENT + Math.random() * range),
  };
}

function normalizeZoomPoint(raw: unknown, fallback: ZoomPoint = { x: 50, y: 50 }): ZoomPoint {
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }

  const source = raw as { x?: unknown; y?: unknown };
  const x = typeof source.x === 'number' ? source.x : fallback.x;
  const y = typeof source.y === 'number' ? source.y : fallback.y;

  return {
    x: roundPercent(clamp(x, ZOOM_MIN_PERCENT, ZOOM_MAX_PERCENT)),
    y: roundPercent(clamp(y, ZOOM_MIN_PERCENT, ZOOM_MAX_PERCENT)),
  };
}

function getZoomOrigin(raw: unknown) {
  const point = normalizeZoomPoint(raw);
  return `${point.x}% ${point.y}%`;
}

function getName(participantMap: Record<string, string>, id?: string | null) {
  if (!id) return 'Un membre';
  return participantMap[id] || `Membre ${id.slice(0, 6)}`;
}

export default function ZoomGame({ session, currentUserId, participantMap, onAction }: Props) {
  const { sharedData } = session;
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [guess, setGuess] = useState('');
  const [zoomPoint, setZoomPoint] = useState<ZoomPoint | null>(null);
  const [isPreparingImage, setIsPreparingImage] = useState(false);
  const [isSubmittingPhoto, setIsSubmittingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleZoomPick = (event: MouseEvent<HTMLDivElement>) => {
    if (!imageSrc || isPreparingImage || isSubmittingPhoto) return;

    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setZoomPoint(normalizeZoomPoint({ x, y }));
  };

  const resetZoomRandom = () => {
    setZoomPoint(getRandomZoomPoint());
  };

  const currentZoomPoint = zoomPoint ?? { x: 50, y: 50 };

  const submitPhoto = async () => {
    if (!imageSrc || isSubmittingPhoto || isPreparingImage) return;

    const finalZoom = normalizeZoomPoint(zoomPoint ?? getRandomZoomPoint());
    setIsSubmittingPhoto(true);

    try {
      await Promise.resolve(onAction({ action: 'zoom_submit_photo', image: imageSrc, zoom: finalZoom }));
      setImageSrc(null);
      setZoomPoint(null);
    } finally {
      setIsSubmittingPhoto(false);
    }
  };

  const isMultiPhotoFlow = Boolean(sharedData?.challengesByPlayer);

  if (isMultiPhotoFlow) {
    const participantIds: string[] = Array.isArray(session?.participants)
      ? session.participants
          .map((participant: any) => participant?.id)
          .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
      : Object.keys(sharedData?.challengesByPlayer || {});

    const phase = sharedData.phase || 'PHOTO';
    const targetByPlayer = sharedData.targetByPlayer || {};
    const sourceByPlayer = sharedData.sourceByPlayer || {};
    const challengesByPlayer = sharedData.challengesByPlayer || {};

    const myChallenge = challengesByPlayer[currentUserId];
    const targetId = targetByPlayer[currentUserId];
    const sourceId = sourceByPlayer[currentUserId];
    const incomingChallenge = sourceId ? challengesByPlayer[sourceId] : null;
    const incomingZoomOrigin = getZoomOrigin(incomingChallenge?.zoom);

    const submittedPhotosByPlayer = sharedData.submittedPhotosByPlayer || {};
    const submittedGuessesByPlayer = sharedData.submittedGuessesByPlayer || {};
    const submittedValidationsByPlayer = sharedData.submittedValidationsByPlayer || {};

    const submittedPhotoCount = participantIds.filter((id) => Boolean(submittedPhotosByPlayer[id])).length;
    const submittedGuessCount = participantIds.filter((id) => Boolean(submittedGuessesByPlayer[id])).length;
    const submittedValidationCount = participantIds.filter((id) => Boolean(submittedValidationsByPlayer[id])).length;

    const isPhotoBusy = isPreparingImage || isSubmittingPhoto;

    if (phase === 'PHOTO') {
      if (!myChallenge) {
        return (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] text-center gap-4 shadow-sm border border-gray-100">
            <h3 className="font-black text-xl text-gray-800">Defi photo indisponible</h3>
            <p className="text-gray-500 font-medium tracking-tight">Relance la simulation pour recreer cette manche Zoom.</p>
          </div>
        );
      }

      if (myChallenge.image) {
        return (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] text-center gap-4 shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 animate-pulse">
              <Check />
            </div>
            <h3 className="font-black text-xl text-gray-800">Photo envoyee !</h3>
            <p className="text-gray-500 font-medium tracking-tight">
              En attente des autres membres ({submittedPhotoCount}/{participantIds.length}).
            </p>
          </div>
        );
      }

      return (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-purple-600 p-8 rounded-[2.5rem] text-white text-center shadow-lg shadow-purple-100">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Mission Photo</p>
            <h3 className="text-2xl font-black leading-tight">{myChallenge.mission}</h3>
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-purple-100">
              Photo pour {getName(participantMap, targetId)}
            </p>
          </div>

          <div
            className="relative aspect-square bg-gray-100 rounded-[2.5rem] overflow-hidden border-4 border-dashed border-gray-200 flex items-center justify-center"
            onClick={imageSrc ? handleZoomPick : undefined}
          >
            {imageSrc ? (
              <>
                <img src={imageSrc} className="w-full h-full object-cover" alt="Preview" />
                <div
                  className="absolute w-10 h-10 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.2)] pointer-events-none -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${currentZoomPoint.x}%`, top: `${currentZoomPoint.y}%` }}
                />
                <div className="absolute bottom-3 right-3 w-20 h-20 rounded-xl overflow-hidden border-2 border-white shadow-lg bg-black/30 pointer-events-none">
                  <img
                    src={imageSrc}
                    className="w-full h-full object-cover scale-[4.5]"
                    style={{ transformOrigin: `${currentZoomPoint.x}% ${currentZoomPoint.y}%` }}
                    alt="Apercu du zoom"
                  />
                </div>
              </>
            ) : (
              <button
                onClick={() => {
                  if (isPhotoBusy) return;
                  fileInputRef.current?.click();
                }}
                disabled={isPhotoBusy}
                className="flex flex-col items-center text-gray-400 gap-3 disabled:opacity-60"
              >
                <div className="bg-white p-4 rounded-full shadow-sm text-purple-600">
                  {isPreparingImage ? <Loader2 size={32} className="animate-spin" /> : <Camera size={32} />}
                </div>
                <span className="font-bold">{isPreparingImage ? 'Traitement de la photo...' : 'Prendre la photo'}</span>
              </button>
            )}

            {isSubmittingPhoto && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-purple-600" size={30} />
                <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-700">Envoi en cours...</p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;

              setIsPreparingImage(true);
              const reader = new FileReader();
              reader.onloadend = () => {
                setImageSrc(reader.result as string);
                setZoomPoint(getRandomZoomPoint());
                setIsPreparingImage(false);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              };
              reader.onerror = () => {
                setIsPreparingImage(false);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              };
              reader.readAsDataURL(file);
            }}
          />

          {imageSrc && (
            <div className="space-y-3">
              <button
                onClick={resetZoomRandom}
                disabled={isPhotoBusy}
                className="w-full bg-purple-100 text-purple-700 font-black py-3 rounded-2xl shadow-sm active:scale-95 transition-all uppercase text-xs tracking-wide"
              >
                Regenerer un zoom aleatoire
              </button>
              <p className="text-center text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                Touche l'image pour deplacer le zoom
              </p>
              <button
                onClick={() => {
                  void submitPhoto();
                }}
                disabled={isPhotoBusy}
                className="w-full bg-purple-600 text-white font-black py-5 rounded-2xl shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-60"
              >
                {isSubmittingPhoto ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                {isSubmittingPhoto ? 'ENVOI EN COURS...' : 'ENVOYER LE DEFI'}
              </button>
            </div>
          )}
        </div>
      );
    }

    if (phase === 'GUESS') {
      if (!incomingChallenge?.image) {
        return (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] text-center gap-4 shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 animate-bounce">
              <Clock />
            </div>
            <h3 className="font-black text-xl text-gray-800">En attente de ta photo a deviner</h3>
            <p className="text-gray-500 font-medium tracking-tight">
              {getName(participantMap, sourceId)} n'a pas encore envoye sa photo.
            </p>
          </div>
        );
      }

      if (submittedGuessesByPlayer[currentUserId]) {
        return (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] text-center gap-4 shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 animate-pulse">
              <Check />
            </div>
            <h3 className="font-black text-xl text-gray-800">Reponse envoyee !</h3>
            <p className="text-gray-500 font-medium tracking-tight">
              En attente des autres membres ({submittedGuessCount}/{participantIds.length}).
            </p>
          </div>
        );
      }

      return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          <div className="aspect-square rounded-[2.5rem] overflow-hidden border-8 border-white shadow-2xl bg-black relative">
            <img
              src={incomingChallenge.image}
              className="w-full h-full object-cover scale-[5.0]"
              style={{ transformOrigin: incomingZoomOrigin }}
              alt="Zoomed"
            />
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">
              Zoom 500%
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-center text-xs font-bold uppercase tracking-[0.18em] text-gray-400">
              Defi de {getName(participantMap, sourceId)}
            </p>
            <input
              type="text"
              placeholder="Qu'est-ce que c'est ?"
              value={guess}
              onChange={(event) => setGuess(event.target.value)}
              className="w-full p-5 rounded-2xl border-2 border-gray-100 text-center font-bold text-xl outline-none shadow-inner"
            />
            <button
              onClick={() => {
                onAction({ action: 'zoom_submit_guess', guess });
                setGuess('');
              }}
              disabled={!guess.trim()}
              className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
            >
              SOUMETTRE MA REPONSE
            </button>
          </div>
        </div>
      );
    }

    if (phase === 'VALIDATION') {
      if (!myChallenge?.guess) {
        return (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] text-center gap-4 shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 animate-pulse">
              <Clock />
            </div>
            <h3 className="font-black text-xl text-gray-800">En attente de proposition</h3>
            <p className="text-gray-500 font-medium tracking-tight">
              {getName(participantMap, targetId)} n'a pas encore envoye sa reponse.
            </p>
          </div>
        );
      }

      if (submittedValidationsByPlayer[currentUserId]) {
        return (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] text-center gap-4 shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 animate-pulse">
              <Check />
            </div>
            <h3 className="font-black text-xl text-gray-800">Validation envoyee</h3>
            <p className="text-gray-500 font-medium tracking-tight">
              En attente des autres membres ({submittedValidationCount}/{participantIds.length}).
            </p>
          </div>
        );
      }

      return (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-yellow-50 p-6 rounded-[2rem] text-center border border-yellow-100 shadow-sm">
            <p className="text-[10px] font-black uppercase text-yellow-600 mb-1 tracking-widest">
              Proposition de {getName(participantMap, targetId)}
            </p>
            <h3 className="text-3xl font-black italic text-gray-800">"{myChallenge.guess}"</h3>
          </div>

          <div className="aspect-square rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl bg-gray-100">
            <img src={myChallenge.image} className="w-full h-full object-cover" alt="Original" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => onAction({ action: 'zoom_validate', isValid: false })}
              className="bg-red-50 text-red-600 font-black py-6 rounded-2xl flex flex-col items-center gap-1 border border-red-100 active:scale-95 transition-all uppercase text-xs"
            >
              <X size={28} /> C'est faux
            </button>
            <button
              onClick={() => onAction({ action: 'zoom_validate', isValid: true })}
              className="bg-green-500 text-white font-black py-6 rounded-2xl flex flex-col items-center gap-1 shadow-lg shadow-green-100 active:scale-95 transition-all uppercase text-xs"
            >
              <Check size={28} /> C'est vrai
            </button>
          </div>
        </div>
      );
    }
  }

  const isAuthor = currentUserId === sharedData.authorId;
  const isCurrentGuesser = currentUserId === sharedData.currentGuesserId;
  const legacyZoomOrigin = getZoomOrigin(sharedData?.zoom);
  const isPhotoBusy = isPreparingImage || isSubmittingPhoto;

  if (sharedData.step === 'PHOTO') {
    if (!isAuthor) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] text-center gap-4 shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 animate-pulse">
            <Camera />
          </div>
          <h3 className="font-black text-xl text-gray-800">Attente de la photo...</h3>
          <p className="text-gray-500 font-medium tracking-tight">
            C'est au tour de <span className="text-purple-600 font-bold">{getName(participantMap, sharedData.authorId)}</span> de jouer.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="bg-purple-600 p-8 rounded-[2.5rem] text-white text-center shadow-lg shadow-purple-100">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Mission Photo</p>
          <h3 className="text-2xl font-black leading-tight">{sharedData.mission}</h3>
        </div>

        <div
          className="relative aspect-square bg-gray-100 rounded-[2.5rem] overflow-hidden border-4 border-dashed border-gray-200 flex items-center justify-center"
          onClick={imageSrc ? handleZoomPick : undefined}
        >
          {imageSrc ? (
            <>
              <img src={imageSrc} className="w-full h-full object-cover" alt="Preview" />
              <div
                className="absolute w-10 h-10 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.2)] pointer-events-none -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${currentZoomPoint.x}%`, top: `${currentZoomPoint.y}%` }}
              />
              <div className="absolute bottom-3 right-3 w-20 h-20 rounded-xl overflow-hidden border-2 border-white shadow-lg bg-black/30 pointer-events-none">
                <img
                  src={imageSrc}
                  className="w-full h-full object-cover scale-[4.5]"
                  style={{ transformOrigin: `${currentZoomPoint.x}% ${currentZoomPoint.y}%` }}
                  alt="Apercu du zoom"
                />
              </div>
            </>
          ) : (
            <button
              onClick={() => {
                if (isPhotoBusy) return;
                fileInputRef.current?.click();
              }}
              disabled={isPhotoBusy}
              className="flex flex-col items-center text-gray-400 gap-3 disabled:opacity-60"
            >
              <div className="bg-white p-4 rounded-full shadow-sm text-purple-600">
                {isPreparingImage ? <Loader2 size={32} className="animate-spin" /> : <Camera size={32} />}
              </div>
              <span className="font-bold">{isPreparingImage ? 'Traitement de la photo...' : 'Prendre la photo'}</span>
            </button>
          )}

          {isSubmittingPhoto && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-purple-600" size={30} />
              <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-700">Envoi en cours...</p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;

            setIsPreparingImage(true);
            const reader = new FileReader();
            reader.onloadend = () => {
              setImageSrc(reader.result as string);
              setZoomPoint(getRandomZoomPoint());
              setIsPreparingImage(false);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            };
            reader.onerror = () => {
              setIsPreparingImage(false);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            };
            reader.readAsDataURL(file);
          }}
        />

        {imageSrc && (
          <div className="space-y-3">
            <button
              onClick={resetZoomRandom}
              disabled={isPhotoBusy}
              className="w-full bg-purple-100 text-purple-700 font-black py-3 rounded-2xl shadow-sm active:scale-95 transition-all uppercase text-xs tracking-wide"
            >
              Regenerer un zoom aleatoire
            </button>
            <p className="text-center text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
              Touche l'image pour deplacer le zoom
            </p>
            <button
              onClick={() => {
                void submitPhoto();
              }}
              disabled={isPhotoBusy}
              className="w-full bg-purple-600 text-white font-black py-5 rounded-2xl shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-60"
            >
              {isSubmittingPhoto ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              {isSubmittingPhoto ? 'ENVOI EN COURS...' : 'ENVOYER LE DEFI'}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (sharedData.step === 'GUESS') {
    if (isAuthor || !isCurrentGuesser) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] text-center gap-4 shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 animate-bounce">
            <Clock />
          </div>
          <h3 className="font-black text-xl text-gray-800">Photo envoyee !</h3>
          <p className="text-gray-500 font-medium tracking-tight">
            On attend la reponse de <span className="text-blue-600 font-bold">{getName(participantMap, sharedData.currentGuesserId)}</span>.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4">
        <div className="aspect-square rounded-[2.5rem] overflow-hidden border-8 border-white shadow-2xl bg-black relative">
          <img
            src={sharedData.image}
            className="w-full h-full object-cover scale-[5.0]"
            style={{ transformOrigin: legacyZoomOrigin }}
            alt="Zoomed"
          />
          <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">
            Zoom 500%
          </div>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Qu'est-ce que c'est ?"
            value={guess}
            onChange={(event) => setGuess(event.target.value)}
            className="w-full p-5 rounded-2xl border-2 border-gray-100 text-center font-bold text-xl outline-none shadow-inner"
          />
          <button
            onClick={() => onAction({ action: 'zoom_submit_guess', guess })}
            disabled={!guess}
            className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
          >
            SOUMETTRE MA REPONSE
          </button>
        </div>
      </div>
    );
  }

  if (sharedData.step === 'VALIDATION') {
    if (!isAuthor) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] text-center gap-4 shadow-sm border border-gray-100">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 animate-pulse">
            <Send />
          </div>
          <h3 className="font-black text-xl italic text-gray-800">"{sharedData.currentGuess}"</h3>
          <p className="text-gray-500 font-medium tracking-tight">
            Attente de la validation de {getName(participantMap, sharedData.authorId)}...
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="bg-yellow-50 p-6 rounded-[2rem] text-center border border-yellow-100 shadow-sm">
          <p className="text-[10px] font-black uppercase text-yellow-600 mb-1 tracking-widest">
            Proposition de {getName(participantMap, sharedData.currentGuesserId)}
          </p>
          <h3 className="text-3xl font-black italic text-gray-800">"{sharedData.currentGuess}"</h3>
        </div>

        <div className="aspect-square rounded-[2.5rem] overflow-hidden border-4 border-white shadow-xl bg-gray-100">
          <img src={sharedData.image} className="w-full h-full object-cover" alt="Original" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onAction({ action: 'zoom_validate', isValid: false })}
            className="bg-red-50 text-red-600 font-black py-6 rounded-2xl flex flex-col items-center gap-1 border border-red-100 active:scale-95 transition-all uppercase text-xs"
          >
            <X size={28} /> C'est faux
          </button>
          <button
            onClick={() => onAction({ action: 'zoom_validate', isValid: true })}
            className="bg-green-500 text-white font-black py-6 rounded-2xl flex flex-col items-center gap-1 shadow-lg shadow-green-100 active:scale-95 transition-all uppercase text-xs"
          >
            <Check size={28} /> C'est vrai
          </button>
        </div>
      </div>
    );
  }

  return null;
}
