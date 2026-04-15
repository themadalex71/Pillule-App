'use client';

import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Send, Loader2, Check, Star, Move, Expand, Plus, Minus } from 'lucide-react';

const EMOJIS = [
  { label: 'Nul', icon: ':/', score: 0 },
  { label: 'Pas drole', icon: ':|', score: 1 },
  { label: 'Bof', icon: ':)', score: 2 },
  { label: 'Drole', icon: ':D', score: 3 },
  { label: 'Excellent', icon: 'LOL', score: 4 },
];

const FONT_OPTIONS = [
  { label: 'Impact', value: 'Impact, Arial Black, sans-serif' },
  { label: 'Comic Sans', value: '"Comic Sans MS", "Comic Sans", cursive' },
  { label: 'Anton', value: '"Anton", Impact, sans-serif' },
  { label: 'Bebas Neue', value: '"Bebas Neue", "Arial Narrow", sans-serif' },
  { label: 'Sans', value: 'system-ui, -apple-system, Segoe UI, sans-serif' },
  { label: 'Serif', value: 'Georgia, "Times New Roman", serif' },
];

type ZoneLayout = {
  top: number;
  left: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  fontFamily: string;
};

type ActiveZone = {
  memeIndex: number;
  zoneId: string;
};

type DragMode = 'move' | 'resize';
type ControlMode = 'slider' | 'step';

type StepperRowProps = {
  label: string;
  value: number;
  unit?: string;
  onMinus: () => void;
  onPlus: () => void;
};

type ActiveDrag = {
  memeIndex: number;
  zoneId: string;
  mode: DragMode;
  startClientX: number;
  startClientY: number;
  startLayout: ZoneLayout;
};

type Props = {
  session: any;
  currentUserId: string;
  participantMap: Record<string, string>;
  onAction: (payload: any) => void | Promise<void>;
};

const DEFAULT_LAYOUT: ZoneLayout = {
  top: 10,
  left: 10,
  width: 40,
  height: 20,
  fontSize: 24,
  color: '#ffffff',
  fontFamily: 'Impact, Arial Black, sans-serif',
};

function StepperRow({ label, value, unit, onMinus, onPlus }: StepperRowProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-2 py-2">
      <span className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onMinus} className="w-7 h-7 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center">
          <Minus size={12} />
        </button>
        <span className="text-xs font-black text-gray-800 min-w-[68px] text-center">
          {Number(value.toFixed(1))}
          {unit || ''}
        </span>
        <button type="button" onClick={onPlus} className="w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center">
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}

function getName(participantMap: Record<string, string>, id?: string | null) {
  if (!id) return 'Un membre';
  return participantMap[id] || `Membre ${id.slice(0, 6)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toNumber(raw: unknown, fallback: number) {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : fallback;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function zoneKey(rawId: unknown) {
  return String(rawId);
}

function isCustomZone(zone: any) {
  return zoneKey(zone?.id).startsWith('custom_');
}

function normalizeLayout(raw: any, fallback: ZoneLayout = DEFAULT_LAYOUT): ZoneLayout {
  const width = clamp(toNumber(raw?.width, fallback.width), 12, 95);
  const height = clamp(toNumber(raw?.height, fallback.height), 8, 70);
  const left = clamp(toNumber(raw?.left, fallback.left), 0, 100 - width);
  const top = clamp(toNumber(raw?.top, fallback.top), 0, 100 - height);

  return {
    top: round1(top),
    left: round1(left),
    width: round1(width),
    height: round1(height),
    fontSize: clamp(toNumber(raw?.fontSize, fallback.fontSize), 10, 100),
    color: typeof raw?.color === 'string' ? raw.color : fallback.color,
    fontFamily: typeof raw?.fontFamily === 'string' ? raw.fontFamily : fallback.fontFamily,
  };
}

function mergeLayout(base: any, override: any): ZoneLayout {
  const normalizedBase = normalizeLayout(base);
  return normalizeLayout({ ...normalizedBase, ...(override || {}) }, normalizedBase);
}

function createCustomZone() {
  const uid = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id: `custom_${uid}`,
    top: 38,
    left: 20,
    width: 60,
    height: 20,
    fontSize: 24,
    color: '#ffffff',
    fontFamily: 'Impact, Arial Black, sans-serif',
  };
}

export default function MemeGame({ session, currentUserId, participantMap, onAction }: Props) {
  const { phase, players = {}, targetByPlayer = {}, votesByPlayer = {} } = session.sharedData;
  const myData = players[currentUserId];
  const targetId = targetByPlayer[currentUserId];
  const targetData = targetId ? players[targetId] : null;
  const targetName = getName(participantMap, targetId);

  const [localInputs, setLocalInputs] = useState<any[]>(() =>
    Array.isArray(myData?.inputs) ? myData.inputs : [{}, {}],
  );
  const [localZoneOverrides, setLocalZoneOverrides] = useState<any[]>(() =>
    Array.isArray(myData?.zoneOverrides) ? myData.zoneOverrides : [{}, {}],
  );
  const [localExtraZones, setLocalExtraZones] = useState<any[]>(() =>
    Array.isArray(myData?.extraZones) ? myData.extraZones : [[], []],
  );
  const [activeZone, setActiveZone] = useState<ActiveZone | null>(null);
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const [controlMode, setControlMode] = useState<ControlMode>('slider');
  const [votes, setVotes] = useState<number[]>([2, 2]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canvasRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const finishedCount = useMemo(
    () => Object.values(players).filter((data: any) => data?.finished).length,
    [players],
  );

  useEffect(() => {
    if (!activeDrag) return;

    const onPointerMove = (event: PointerEvent) => {
      const canvas = canvasRefs.current[activeDrag.memeIndex];
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const deltaXPercent = ((event.clientX - activeDrag.startClientX) / rect.width) * 100;
      const deltaYPercent = ((event.clientY - activeDrag.startClientY) / rect.height) * 100;

      let nextLayout = activeDrag.startLayout;

      if (activeDrag.mode === 'move') {
        nextLayout = {
          ...nextLayout,
          left: round1(clamp(activeDrag.startLayout.left + deltaXPercent, 0, 100 - activeDrag.startLayout.width)),
          top: round1(clamp(activeDrag.startLayout.top + deltaYPercent, 0, 100 - activeDrag.startLayout.height)),
        };
      } else {
        nextLayout = {
          ...nextLayout,
          width: round1(clamp(activeDrag.startLayout.width + deltaXPercent, 12, 100 - activeDrag.startLayout.left)),
          height: round1(clamp(activeDrag.startLayout.height + deltaYPercent, 8, 100 - activeDrag.startLayout.top)),
        };
      }

      setLocalZoneOverrides((previous) => {
        const next = [...previous];
        const byZone = { ...(next[activeDrag.memeIndex] || {}) };
        byZone[activeDrag.zoneId] = nextLayout;
        next[activeDrag.memeIndex] = byZone;
        return next;
      });
    };

    const stopDrag = () => {
      setActiveDrag(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopDrag);
    window.addEventListener('pointercancel', stopDrag);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', stopDrag);
      window.removeEventListener('pointercancel', stopDrag);
    };
  }, [activeDrag]);

  useEffect(() => {
    if (!activeZone || typeof document === 'undefined') return;

    const body = document.body;
    const html = document.documentElement;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyTouchAction = body.style.touchAction;
    const previousHtmlOverflow = html.style.overflow;

    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';
    html.style.overflow = 'hidden';

    return () => {
      body.style.overflow = previousBodyOverflow;
      body.style.touchAction = previousBodyTouchAction;
      html.style.overflow = previousHtmlOverflow;
    };
  }, [activeZone]);

  if (!myData) {
    return (
      <div className="p-10 text-center bg-white rounded-[2.5rem] shadow-xl text-gray-500">
        Joueur introuvable dans cette session.
      </div>
    );
  }

  const getCreationZones = (meme: any, memeIndex: number) => {
    const base = Array.isArray(meme?.zones) ? meme.zones : [];
    const extras = Array.isArray(localExtraZones?.[memeIndex]) ? localExtraZones[memeIndex] : [];
    return [...base, ...extras];
  };

  const getResolvedLayout = (memeIndex: number, zone: any) => {
    const override = localZoneOverrides?.[memeIndex]?.[zoneKey(zone?.id)];
    return mergeLayout(zone, override);
  };

  const updateZoneLayout = (
    memeIndex: number,
    zone: any,
    updater: Partial<ZoneLayout> | ((current: ZoneLayout) => Partial<ZoneLayout>),
  ) => {
    const key = zoneKey(zone?.id);

    setLocalZoneOverrides((previous) => {
      const next = [...previous];
      const byZone = { ...(next[memeIndex] || {}) };
      const currentLayout = mergeLayout(zone, byZone[key]);
      const patch = typeof updater === 'function' ? updater(currentLayout) : updater;
      const merged = normalizeLayout({ ...currentLayout, ...patch }, currentLayout);
      byZone[key] = merged;
      next[memeIndex] = byZone;
      return next;
    });
  };

  const adjustZoneValue = (memeIndex: number, zone: any, field: keyof ZoneLayout, delta: number) => {
    updateZoneLayout(memeIndex, zone, (current) => {
      if (field === 'left') {
        return { left: clamp(current.left + delta, 0, 100 - current.width) };
      }
      if (field === 'top') {
        return { top: clamp(current.top + delta, 0, 100 - current.height) };
      }
      if (field === 'width') {
        return { width: clamp(current.width + delta, 12, 100 - current.left) };
      }
      if (field === 'height') {
        return { height: clamp(current.height + delta, 8, 100 - current.top) };
      }
      if (field === 'fontSize') {
        return { fontSize: clamp(current.fontSize + delta, 10, 100) };
      }
      return {};
    });
  };

  const addCustomZone = (memeIndex: number) => {
    const zone = createCustomZone();

    setLocalExtraZones((previous) => {
      const next = [...previous];
      const current = Array.isArray(next[memeIndex]) ? [...next[memeIndex]] : [];
      current.push(zone);
      next[memeIndex] = current;
      return next;
    });

    setLocalInputs((previous) => {
      const next = [...previous];
      const current = { ...(next[memeIndex] || {}) };
      current[zone.id] = '';
      next[memeIndex] = current;
      return next;
    });

    setActiveZone({ memeIndex, zoneId: zoneKey(zone.id) });
  };

  const removeSelectedCustomZone = (memeIndex: number, zone: any) => {
    if (!isCustomZone(zone)) return;
    const key = zoneKey(zone?.id);

    setLocalExtraZones((previous) => {
      const next = [...previous];
      const current = Array.isArray(next[memeIndex]) ? [...next[memeIndex]] : [];
      next[memeIndex] = current.filter((candidate: any) => zoneKey(candidate?.id) !== key);
      return next;
    });

    setLocalZoneOverrides((previous) => {
      const next = [...previous];
      const byZone = { ...(next[memeIndex] || {}) };
      delete byZone[key];
      next[memeIndex] = byZone;
      return next;
    });

    setLocalInputs((previous) => {
      const next = [...previous];
      const current = { ...(next[memeIndex] || {}) };
      delete current[zone?.id];
      next[memeIndex] = current;
      return next;
    });

    setActiveZone(null);
  };

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>, memeIndex: number, zone: any, mode: DragMode) => {
    event.preventDefault();
    event.stopPropagation();

    const resolvedLayout = getResolvedLayout(memeIndex, zone);
    const zoneId = zoneKey(zone?.id);

    setActiveZone({ memeIndex, zoneId });
    setActiveDrag({
      memeIndex,
      zoneId,
      mode,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLayout: resolvedLayout,
    });
  };

  if (phase === 'CREATION') {
    if (myData.finished) {
      return (
        <div className="flex flex-col items-center justify-center p-10 bg-white rounded-[2.5rem] text-center gap-6 shadow-xl animate-in zoom-in-95">
          <div className="bg-green-100 p-6 rounded-full text-green-600 animate-bounce">
            <Check size={48} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">C'est envoye !</h3>
            <p className="text-gray-500 font-medium mt-2">
              {finishedCount} / {Object.keys(players).length} membres ont fini.
            </p>
          </div>
          <div className="flex gap-2 mt-4">
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8 animate-in fade-in">
        <div className="bg-blue-600 p-6 rounded-[2rem] text-white text-center shadow-lg">
          <h3 className="text-xl font-black uppercase tracking-tighter">A toi de jouer !</h3>
          <p className="opacity-90 text-sm">Remplis les cases vides pour faire rire {targetName}.</p>
        </div>

        {(myData.memes || []).map((meme: any, index: number) => {
          const zones = getCreationZones(meme, index);
          const selectedZoneForMeme =
            activeZone?.memeIndex === index
              ? zones.find((zone: any) => zoneKey(zone?.id) === activeZone.zoneId) || null
              : null;
          const selectedLayout = selectedZoneForMeme ? getResolvedLayout(index, selectedZoneForMeme) : null;

          return (
            <div key={meme.id + index} className="bg-white p-4 rounded-[2rem] shadow-xl border border-gray-100 space-y-4">
              <div className="flex justify-between items-center px-2">
                <span className="font-black text-gray-400 text-[10px] uppercase tracking-widest">Meme #{index + 1}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => addCustomZone(index)}
                    className="flex items-center gap-1 text-[10px] font-bold bg-blue-50 px-3 py-1.5 rounded-full text-blue-700 transition-colors"
                  >
                    <Plus size={12} /> Ajouter une case
                  </button>
                  {myData.rerolls?.[index] > 0 && (
                    <button
                      onClick={async () => {
                        const nextInputs = [...localInputs];
                        nextInputs[index] = {};
                        setLocalInputs(nextInputs);

                        const nextOverrides = [...localZoneOverrides];
                        nextOverrides[index] = {};
                        setLocalZoneOverrides(nextOverrides);

                        const nextExtras = [...localExtraZones];
                        nextExtras[index] = [];
                        setLocalExtraZones(nextExtras);

                        if (activeZone?.memeIndex === index) {
                          setActiveZone(null);
                        }

                        await Promise.resolve(onAction({ action: 'meme_reroll', memeIndex: index }));
                      }}
                      className="flex items-center gap-1 text-[10px] font-bold bg-gray-100 px-3 py-1.5 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"
                    >
                      <RefreshCw size={12} /> Changer ({myData.rerolls[index]})
                    </button>
                  )}
                </div>
              </div>

              <div
                ref={(element) => {
                  canvasRefs.current[index] = element;
                }}
                className="relative aspect-square bg-gray-900 rounded-2xl overflow-hidden"
              >
                <img src={meme.url} className="w-full h-full object-contain pointer-events-none" alt="Meme" />

                {zones.map((zone: any) => {
                  const zoneId = zoneKey(zone?.id);
                  const resolved = getResolvedLayout(index, zone);
                  const isActive = activeZone?.memeIndex === index && activeZone.zoneId === zoneId;

                  return (
                    <div
                      key={zoneId}
                      style={{
                        top: `${resolved.top}%`,
                        left: `${resolved.left}%`,
                        width: `${resolved.width}%`,
                        height: `${resolved.height}%`,
                      }}
                      className={`absolute ${isActive ? 'z-10' : 'z-0'}`}
                      onClick={() => setActiveZone({ memeIndex: index, zoneId })}
                    >
                      <textarea
                        placeholder="..."
                        value={localInputs[index]?.[zone.id] || ''}
                        onFocus={() => setActiveZone({ memeIndex: index, zoneId })}
                        onChange={(event) => {
                          const nextInputs = [...localInputs];
                          nextInputs[index] = { ...nextInputs[index], [zone.id]: event.target.value };
                          setLocalInputs(nextInputs);
                        }}
                        style={{
                          fontSize: `${Math.max(10, resolved.fontSize / 2)}px`,
                          color: resolved.color,
                          fontFamily: resolved.fontFamily || 'Impact, Arial Black, sans-serif',
                          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                        }}
                        className={`w-full h-full bg-transparent border-2 rounded-lg p-1 resize-none outline-none font-black text-center leading-tight placeholder:text-white/30 overflow-hidden ${
                          isActive ? 'border-blue-400' : 'border-white/50 border-dashed'
                        }`}
                      />

                      <button
                        type="button"
                        onPointerDown={(event) => startDrag(event, index, zone, 'move')}
                        className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg"
                        title="Deplacer la bulle"
                      >
                        <Move size={12} />
                      </button>

                      <button
                        type="button"
                        onPointerDown={(event) => startDrag(event, index, zone, 'resize')}
                        className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-white text-blue-600 border border-blue-200 flex items-center justify-center shadow-lg"
                        title="Agrandir / reduire"
                      >
                        <Expand size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {selectedZoneForMeme && selectedLayout && (
                <div className="bg-gray-50 rounded-2xl p-4 space-y-3 border border-gray-100">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Reglages Zone</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setControlMode('slider')}
                        className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${
                          controlMode === 'slider' ? 'bg-white text-gray-800 border border-gray-200' : 'text-gray-500'
                        }`}
                      >
                        Barres
                      </button>
                      <button
                        type="button"
                        onClick={() => setControlMode('step')}
                        className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg ${
                          controlMode === 'step' ? 'bg-white text-gray-800 border border-gray-200' : 'text-gray-500'
                        }`}
                      >
                        +/- precis
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveZone(null)}
                        className="text-[10px] font-black uppercase px-2 py-1 rounded-lg text-gray-500 bg-white border border-gray-200"
                      >
                        Desel.
                      </button>
                    </div>
                  </div>

                  {isCustomZone(selectedZoneForMeme) && (
                    <button
                      type="button"
                      onClick={() => removeSelectedCustomZone(index, selectedZoneForMeme)}
                      className="w-full rounded-xl bg-red-50 text-red-600 border border-red-100 py-2 text-[10px] font-black uppercase tracking-[0.16em]"
                    >
                      Supprimer cette case
                    </button>
                  )}

                  {controlMode === 'slider' ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.14em] space-y-1">
                          Gauche
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={selectedLayout.left}
                            onChange={(event) =>
                              updateZoneLayout(index, selectedZoneForMeme, (current) => ({
                                left: clamp(Number(event.target.value), 0, 100 - current.width),
                              }))
                            }
                            className="w-full h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                          />
                        </label>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.14em] space-y-1">
                          Haut
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={selectedLayout.top}
                            onChange={(event) =>
                              updateZoneLayout(index, selectedZoneForMeme, (current) => ({
                                top: clamp(Number(event.target.value), 0, 100 - current.height),
                              }))
                            }
                            className="w-full h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.14em] space-y-1">
                          Largeur
                          <input
                            type="range"
                            min="12"
                            max="95"
                            value={selectedLayout.width}
                            onChange={(event) =>
                              updateZoneLayout(index, selectedZoneForMeme, (current) => ({
                                width: clamp(Number(event.target.value), 12, 100 - current.left),
                              }))
                            }
                            className="w-full h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                          />
                        </label>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.14em] space-y-1">
                          Hauteur
                          <input
                            type="range"
                            min="8"
                            max="70"
                            value={selectedLayout.height}
                            onChange={(event) =>
                              updateZoneLayout(index, selectedZoneForMeme, (current) => ({
                                height: clamp(Number(event.target.value), 8, 100 - current.top),
                              }))
                            }
                            className="w-full h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.14em] space-y-1">
                          Taille Police
                          <input
                            type="range"
                            min="10"
                            max="100"
                            value={selectedLayout.fontSize}
                            onChange={(event) =>
                              updateZoneLayout(index, selectedZoneForMeme, {
                                fontSize: Number(event.target.value),
                              })
                            }
                            className="w-full h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                          />
                        </label>
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.14em] space-y-1">
                          Couleur
                          <input
                            type="color"
                            value={selectedLayout.color}
                            onChange={(event) =>
                              updateZoneLayout(index, selectedZoneForMeme, {
                                color: event.target.value,
                              })
                            }
                            className="w-full h-8 cursor-pointer bg-transparent"
                          />
                        </label>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <StepperRow
                          label="Gauche"
                          value={selectedLayout.left}
                          unit="%"
                          onMinus={() => adjustZoneValue(index, selectedZoneForMeme, 'left', -0.5)}
                          onPlus={() => adjustZoneValue(index, selectedZoneForMeme, 'left', 0.5)}
                        />
                        <StepperRow
                          label="Haut"
                          value={selectedLayout.top}
                          unit="%"
                          onMinus={() => adjustZoneValue(index, selectedZoneForMeme, 'top', -0.5)}
                          onPlus={() => adjustZoneValue(index, selectedZoneForMeme, 'top', 0.5)}
                        />
                        <StepperRow
                          label="Largeur"
                          value={selectedLayout.width}
                          unit="%"
                          onMinus={() => adjustZoneValue(index, selectedZoneForMeme, 'width', -0.5)}
                          onPlus={() => adjustZoneValue(index, selectedZoneForMeme, 'width', 0.5)}
                        />
                        <StepperRow
                          label="Hauteur"
                          value={selectedLayout.height}
                          unit="%"
                          onMinus={() => adjustZoneValue(index, selectedZoneForMeme, 'height', -0.5)}
                          onPlus={() => adjustZoneValue(index, selectedZoneForMeme, 'height', 0.5)}
                        />
                        <StepperRow
                          label="Police"
                          value={selectedLayout.fontSize}
                          unit="px"
                          onMinus={() => adjustZoneValue(index, selectedZoneForMeme, 'fontSize', -1)}
                          onPlus={() => adjustZoneValue(index, selectedZoneForMeme, 'fontSize', 1)}
                        />
                      </div>

                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.14em] space-y-1 block">
                        Couleur
                        <input
                          type="color"
                          value={selectedLayout.color}
                          onChange={(event) =>
                            updateZoneLayout(index, selectedZoneForMeme, {
                              color: event.target.value,
                            })
                          }
                          className="w-full h-8 cursor-pointer bg-transparent"
                        />
                      </label>
                    </>
                  )}

                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.14em] space-y-1 block">
                    Police
                    <select
                      value={selectedLayout.fontFamily}
                      onChange={(event) =>
                        updateZoneLayout(index, selectedZoneForMeme, {
                          fontFamily: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-gray-200 bg-white p-2 text-xs font-bold text-gray-700 outline-none"
                    >
                      {FONT_OPTIONS.map((font) => (
                        <option key={font.label} value={font.value}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>
          );
        })}

        <button
          onClick={async () => {
            setIsSubmitting(true);
            try {
              await Promise.resolve(
                onAction({
                  action: 'meme_submit_creation',
                  inputs: localInputs,
                  zoneOverrides: localZoneOverrides,
                  extraZones: localExtraZones,
                }),
              );
            } finally {
              setIsSubmitting(false);
            }
          }}
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white font-black py-5 rounded-[2rem] shadow-lg flex items-center justify-center gap-3 uppercase tracking-tighter active:scale-95 transition-all disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin" />
          ) : (
            <>
              <Send size={20} /> Valider mes memes
            </>
          )}
        </button>
      </div>
    );
  }

  if (phase === 'VOTE') {
    const alreadyVoted = Array.isArray(votesByPlayer?.[currentUserId]);

    if (alreadyVoted) {
      return (
        <div className="flex flex-col items-center justify-center p-10 bg-white rounded-[2.5rem] text-center gap-6 shadow-xl animate-in zoom-in-95">
          <div className="bg-yellow-100 p-6 rounded-full text-yellow-600 animate-pulse">
            <Star size={48} fill="currentColor" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Votes enregistres !</h3>
            <p className="text-gray-500 font-medium mt-2">Calcul des scores en cours...</p>
          </div>
        </div>
      );
    }

    if (!targetData) {
      return (
        <div className="p-10 text-center bg-white rounded-[2.5rem] shadow-xl text-gray-500">
          Impossible de trouver les memes a noter.
        </div>
      );
    }

    return (
      <div className="space-y-8 animate-in slide-in-from-right-8">
        <div className="bg-yellow-400 p-6 rounded-[2rem] text-black text-center shadow-lg">
          <h3 className="text-xl font-black uppercase tracking-tighter">Phase de Vote !</h3>
          <p className="text-sm font-bold opacity-80">Note les creations de {targetName}</p>
        </div>

        {(targetData.memes || []).map((meme: any, index: number) => {
          const baseZones = Array.isArray(meme?.zones) ? meme.zones : [];
          const extraZones = Array.isArray(targetData.extraZones?.[index]) ? targetData.extraZones[index] : [];
          const zones = [...baseZones, ...extraZones];

          return (
            <div key={meme.id + '_vote'} className="bg-white p-4 rounded-[2rem] shadow-xl border border-gray-100">
              <div className="relative aspect-square bg-gray-900 rounded-2xl overflow-hidden mb-6">
                <img src={meme.url} className="w-full h-full object-contain" alt="Meme a noter" />
                {zones.map((zone: any) => {
                  const zoneOverride = targetData.zoneOverrides?.[index]?.[zoneKey(zone?.id)];
                  const resolved = mergeLayout(zone, zoneOverride);

                  return (
                    <div
                      key={zoneKey(zone?.id)}
                      style={{
                        top: `${resolved.top}%`,
                        left: `${resolved.left}%`,
                        width: `${resolved.width}%`,
                        height: `${resolved.height}%`,
                        fontSize: `${Math.max(10, resolved.fontSize / 2)}px`,
                        color: resolved.color,
                        fontFamily: resolved.fontFamily || 'Impact, Arial Black, sans-serif',
                        textShadow: '0 2px 4px rgba(0,0,0,1)',
                      }}
                      className="absolute flex items-center justify-center text-center font-black leading-tight break-words whitespace-pre-wrap"
                    >
                      {targetData.inputs?.[index]?.[zone.id] || ''}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between bg-gray-50 rounded-2xl p-2">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji.label}
                    onClick={() => {
                      const nextVotes = [...votes];
                      nextVotes[index] = emoji.score;
                      setVotes(nextVotes);
                    }}
                    className={`flex flex-col items-center p-2 rounded-xl transition-all active:scale-90 ${
                      votes[index] === emoji.score ? 'bg-white shadow-md scale-110' : 'opacity-50 grayscale'
                    }`}
                  >
                    <span className="text-2xl">{emoji.icon}</span>
                    <span className="text-[8px] font-black uppercase mt-1">{emoji.score} pts</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        <button
          onClick={async () => {
            setIsSubmitting(true);
            try {
              await Promise.resolve(onAction({ action: 'meme_submit_vote', votes }));
            } finally {
              setIsSubmitting(false);
            }
          }}
          disabled={isSubmitting}
          className="w-full bg-black text-white font-black py-5 rounded-[2rem] shadow-lg flex items-center justify-center gap-3 uppercase tracking-tighter active:scale-95 transition-all disabled:opacity-60"
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin" />
          ) : (
            <>
              <Star fill="currentColor" size={20} /> Envoyer les notes
            </>
          )}
        </button>
      </div>
    );
  }

  return null;
}

