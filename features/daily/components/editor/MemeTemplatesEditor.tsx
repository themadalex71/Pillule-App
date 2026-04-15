'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Image as ImageIcon, Plus, Save, Trash2, Type } from 'lucide-react';

type MemeZone = {
  id: number;
  top: number;
  left: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
  fontFamily?: string;
};

type MemeTemplate = {
  id?: number | string;
  name: string;
  url: string;
  zones: MemeZone[];
};

type Props = {
  items: MemeTemplate[];
  onSaveItems: (items: MemeTemplate[]) => Promise<void>;
  onDeleteItem: (index: number) => void | Promise<void>;
};

type InteractionMode = 'move' | 'resize';

type ActiveInteraction = {
  zoneId: number;
  mode: InteractionMode;
  startClientX: number;
  startClientY: number;
  startZone: MemeZone;
};

const DEFAULT_ZONE_WIDTH = 40;
const DEFAULT_ZONE_HEIGHT = 16;
const DEFAULT_FONT_FAMILY = 'Impact, Arial Black, sans-serif';

const FONT_OPTIONS = [
  { label: 'Impact', value: 'Impact, Arial Black, sans-serif' },
  { label: 'Comic Sans', value: '"Comic Sans MS", "Comic Sans", cursive' },
  { label: 'Anton', value: '"Anton", Impact, sans-serif' },
  { label: 'Bebas Neue', value: '"Bebas Neue", "Arial Narrow", sans-serif' },
  { label: 'System Sans', value: 'system-ui, -apple-system, Segoe UI, sans-serif' },
  { label: 'Serif', value: 'Georgia, "Times New Roman", serif' },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function createZone(partial?: Partial<MemeZone>): MemeZone {
  const width = clamp(Number(partial?.width ?? DEFAULT_ZONE_WIDTH), 12, 95);
  const height = clamp(Number(partial?.height ?? DEFAULT_ZONE_HEIGHT), 8, 70);
  const left = clamp(Number(partial?.left ?? (100 - width) / 2), 0, 100 - width);
  const top = clamp(Number(partial?.top ?? (100 - height) / 2), 0, 100 - height);

  return {
    id: Number(partial?.id ?? Date.now() + Math.floor(Math.random() * 1000)),
    top: round1(top),
    left: round1(left),
    width: round1(width),
    height: round1(height),
    fontSize: clamp(Number(partial?.fontSize ?? 24), 10, 100),
    color: String(partial?.color ?? '#ffffff'),
    fontFamily: String(partial?.fontFamily || DEFAULT_FONT_FAMILY),
  };
}

function normalizeZone(zone: any): MemeZone {
  return createZone({
    id: Number(zone?.id ?? Date.now() + Math.floor(Math.random() * 1000)),
    top: Number(zone?.top ?? 40),
    left: Number(zone?.left ?? 30),
    width: Number(zone?.width ?? DEFAULT_ZONE_WIDTH),
    height: Number(zone?.height ?? DEFAULT_ZONE_HEIGHT),
    fontSize: Number(zone?.fontSize ?? 24),
    color: String(zone?.color ?? '#ffffff'),
    fontFamily: String(zone?.fontFamily || DEFAULT_FONT_FAMILY),
  });
}

function normalizeTemplate(template: any): MemeTemplate {
  const rawZones = Array.isArray(template?.zones) ? template.zones : [];
  const zones = rawZones.length > 0 ? rawZones.map(normalizeZone) : [createZone()];

  return {
    id: template?.id,
    name: String(template?.name || ''),
    url: String(template?.url || ''),
    zones,
  };
}

export default function MemeTemplatesEditor({ items, onSaveItems, onDeleteItem }: Props) {
  const previewRef = useRef<HTMLDivElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [draft, setDraft] = useState<MemeTemplate>({ name: '', url: '', zones: [createZone()] });
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(draft.zones[0]?.id ?? null);
  const [interaction, setInteraction] = useState<ActiveInteraction | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selectedZone = useMemo(
    () => draft.zones.find((zone) => zone.id === selectedZoneId) || null,
    [draft.zones, selectedZoneId],
  );

  useEffect(() => {
    if (!interaction) return;

    const onPointerMove = (event: PointerEvent) => {
      if (!previewRef.current) return;
      const rect = previewRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const dxPercent = ((event.clientX - interaction.startClientX) / rect.width) * 100;
      const dyPercent = ((event.clientY - interaction.startClientY) / rect.height) * 100;

      setDraft((previous) => {
        const zones = previous.zones.map((zone) => {
          if (zone.id !== interaction.zoneId) return zone;

          if (interaction.mode === 'move') {
            const nextLeft = clamp(interaction.startZone.left + dxPercent, 0, 100 - interaction.startZone.width);
            const nextTop = clamp(interaction.startZone.top + dyPercent, 0, 100 - interaction.startZone.height);
            return { ...zone, left: round1(nextLeft), top: round1(nextTop) };
          }

          const nextWidth = clamp(interaction.startZone.width + dxPercent, 12, 100 - interaction.startZone.left);
          const nextHeight = clamp(interaction.startZone.height + dyPercent, 8, 100 - interaction.startZone.top);
          return { ...zone, width: round1(nextWidth), height: round1(nextHeight) };
        });

        return { ...previous, zones };
      });
    };

    const stopInteraction = () => {
      setInteraction(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopInteraction);
    window.addEventListener('pointercancel', stopInteraction);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', stopInteraction);
      window.removeEventListener('pointercancel', stopInteraction);
    };
  }, [interaction]);

  const startCreate = () => {
    const firstZone = createZone();
    setDraft({ name: '', url: '', zones: [firstZone] });
    setSelectedZoneId(firstZone.id);
    setEditingId(null);
    setIsEditing(true);
  };

  const startEdit = (template: MemeTemplate) => {
    const normalized = normalizeTemplate(template);
    setDraft(normalized);
    setEditingId(normalized.id ?? null);
    setSelectedZoneId(normalized.zones[0]?.id ?? null);
    setIsEditing(true);
  };

  const stopEdit = () => {
    setIsEditing(false);
    setEditingId(null);
    setDraft({ name: '', url: '', zones: [createZone()] });
    setSelectedZoneId(null);
    setInteraction(null);
    setIsSaving(false);
  };

  const updateDraft = (fields: Partial<MemeTemplate>) => {
    setDraft((previous) => ({ ...previous, ...fields }));
  };

  const updateZone = (zoneId: number, fields: Partial<MemeZone>) => {
    setDraft((previous) => ({
      ...previous,
      zones: previous.zones.map((zone) => (zone.id === zoneId ? { ...zone, ...fields } : zone)),
    }));
  };

  const addZone = () => {
    const zone = createZone({
      top: 42 + (draft.zones.length % 3) * 4,
      left: 28 + (draft.zones.length % 3) * 3,
    });
    setDraft((previous) => ({ ...previous, zones: [...previous.zones, zone] }));
    setSelectedZoneId(zone.id);
  };

  const duplicateSelectedZone = () => {
    if (!selectedZone) return;
    const zone = createZone({
      ...selectedZone,
      left: clamp(selectedZone.left + 3, 0, 100 - selectedZone.width),
      top: clamp(selectedZone.top + 3, 0, 100 - selectedZone.height),
    });
    setDraft((previous) => ({ ...previous, zones: [...previous.zones, zone] }));
    setSelectedZoneId(zone.id);
  };

  const removeZone = (zoneId: number) => {
    setDraft((previous) => {
      const remaining = previous.zones.filter((zone) => zone.id !== zoneId);
      const zones = remaining.length > 0 ? remaining : [createZone()];
      if (!zones.some((zone) => zone.id === selectedZoneId)) {
        setSelectedZoneId(zones[0].id);
      }
      return { ...previous, zones };
    });
  };

  const beginInteraction = (event: React.PointerEvent<HTMLDivElement>, zone: MemeZone, mode: InteractionMode) => {
    event.preventDefault();
    event.stopPropagation();

    setSelectedZoneId(zone.id);
    setInteraction({
      zoneId: zone.id,
      mode,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startZone: { ...zone },
    });
  };

  const saveTemplate = async () => {
    if (!draft.url.trim() || !draft.name.trim() || draft.zones.length === 0) {
      alert('Image, nom du template et au moins une bulle sont obligatoires.');
      return;
    }

    const normalizedDraft: MemeTemplate = {
      ...draft,
      url: draft.url.trim(),
      name: draft.name.trim(),
      zones: draft.zones.map(normalizeZone),
    };

    const nextItems = editingId
      ? items.map((item) => (item.id === editingId ? { ...normalizedDraft, id: editingId } : item))
      : [{ ...normalizedDraft, id: Date.now() }, ...items];

    setIsSaving(true);
    try {
      await onSaveItems(nextItems);
      stopEdit();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="space-y-6">
        <button
          onClick={startCreate}
          className="w-full bg-blue-600 text-white font-black py-5 rounded-[2rem] shadow-lg flex items-center justify-center gap-3 uppercase"
        >
          <Plus size={22} /> Creer Template
        </button>

        <div className="grid gap-4 mt-6">
          {items.map((template, index) => (
            <div
              key={template.id || index}
              onClick={() => startEdit(template)}
              className="bg-white rounded-[2.5rem] overflow-hidden border shadow-sm group relative cursor-pointer"
            >
              <img src={template.url} className="w-full h-48 object-cover" alt={template.name || 'Template meme'} />
              <div className="absolute bottom-0 left-0 right-0 p-5 flex justify-between items-end">
                <span className="text-white font-black uppercase text-sm">{template.name}</span>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    void onDeleteItem(index);
                  }}
                  className="bg-red-500 text-white p-2.5 rounded-2xl shadow-lg"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-200">
        <div
          ref={previewRef}
          className="relative aspect-square bg-gray-900 flex items-center justify-center overflow-hidden touch-none select-none"
        >
          {draft.url ? (
            <img src={draft.url} className="w-full h-full object-contain pointer-events-none" alt="Meme preview" />
          ) : (
            <Type size={40} className="text-white/20" />
          )}

          {draft.zones.map((zone, index) => (
            <div
              key={zone.id}
              onPointerDown={(event) => beginInteraction(event, zone, 'move')}
              style={{
                top: `${zone.top}%`,
                left: `${zone.left}%`,
                width: `${zone.width}%`,
                height: `${zone.height}%`,
                color: zone.color,
                fontSize: `${Math.max(10, zone.fontSize / 2)}px`,
                fontFamily: zone.fontFamily || DEFAULT_FONT_FAMILY,
              }}
              className={`absolute border-2 rounded-lg flex items-center justify-center font-black uppercase leading-tight transition-colors ${
                selectedZoneId === zone.id ? 'border-blue-500 bg-blue-500/20' : 'border-white/40 bg-black/20'
              }`}
            >
              <span className="px-2 text-center drop-shadow-sm">Zone {index + 1}</span>
              <div
                onPointerDown={(event) => beginInteraction(event, zone, 'resize')}
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-sm bg-blue-500 border border-white shadow-sm"
              />
            </div>
          ))}
        </div>

        <div className="p-4 bg-white border-t space-y-3">
          <input
            placeholder="URL Image"
            className="w-full p-3 bg-gray-50 rounded-xl text-xs outline-none font-bold"
            value={draft.url}
            onChange={(event) => updateDraft({ url: event.target.value })}
          />
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
            V2: Fais glisser une zone pour la deplacer, utilise le carre bleu pour redimensionner.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {draft.zones.map((zone, index) => (
          <div
            key={zone.id}
            onClick={() => setSelectedZoneId(zone.id)}
            className={`bg-white p-4 rounded-2xl border-2 ${selectedZoneId === zone.id ? 'border-blue-500' : 'border-gray-100'}`}
          >
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-black bg-gray-900 text-white px-2 py-0.5 rounded uppercase">Zone {index + 1}</span>
              <div className="flex items-center gap-2">
                {selectedZoneId === zone.id && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      duplicateSelectedZone();
                    }}
                    className="text-blue-500"
                    title="Dupliquer cette bulle"
                  >
                    <Copy size={16} />
                  </button>
                )}
                {selectedZoneId === zone.id && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      removeZone(zone.id);
                    }}
                    className="text-red-400"
                    title="Supprimer cette bulle"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {selectedZoneId === zone.id && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500 space-y-1">
                    Largeur
                    <input
                      type="range"
                      min="12"
                      max="95"
                      value={zone.width}
                      onChange={(event) =>
                        updateZone(zone.id, {
                          width: clamp(Number(event.target.value), 12, 100 - zone.left),
                        })
                      }
                      className="w-full h-1.5 bg-gray-100 rounded-lg cursor-pointer"
                    />
                  </label>
                  <label className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500 space-y-1">
                    Hauteur
                    <input
                      type="range"
                      min="8"
                      max="70"
                      value={zone.height}
                      onChange={(event) =>
                        updateZone(zone.id, {
                          height: clamp(Number(event.target.value), 8, 100 - zone.top),
                        })
                      }
                      className="w-full h-1.5 bg-gray-100 rounded-lg cursor-pointer"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500 space-y-1">
                    Taille Police
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={zone.fontSize}
                      onChange={(event) => updateZone(zone.id, { fontSize: Number(event.target.value) })}
                      className="w-full h-1.5 bg-gray-100 rounded-lg cursor-pointer"
                    />
                  </label>
                  <label className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500 space-y-1">
                    Couleur
                    <input
                      type="color"
                      value={zone.color}
                      onChange={(event) => updateZone(zone.id, { color: event.target.value })}
                      className="w-full h-8 cursor-pointer bg-transparent"
                    />
                  </label>
                </div>

                <label className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500 space-y-1 block">
                  Police
                  <select
                    value={zone.fontFamily || DEFAULT_FONT_FAMILY}
                    onChange={(event) => updateZone(zone.id, { fontFamily: event.target.value })}
                    className="w-full p-2 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-700 outline-none"
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
        ))}

        <button
          onClick={addZone}
          className="w-full border-2 border-dashed border-gray-300 rounded-2xl py-5 text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2"
        >
          <Plus size={14} /> Ajouter Zone
        </button>
      </div>

      <div className="p-6 bg-white rounded-[2rem] shadow-xl space-y-4 border border-gray-100">
        <input
          placeholder="Nom du Template"
          className="w-full p-4 bg-gray-50 rounded-xl font-bold border-none outline-none"
          value={draft.name}
          onChange={(event) => updateDraft({ name: event.target.value })}
        />
        <div className="flex gap-2">
          <button onClick={stopEdit} className="flex-1 bg-gray-100 text-gray-500 font-black py-4 rounded-xl uppercase text-xs">
            Annuler
          </button>
          <button
            onClick={() => {
              void saveTemplate();
            }}
            disabled={isSaving}
            className="flex-[2] bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 uppercase text-xs tracking-widest disabled:opacity-60"
          >
            {isSaving ? <Save size={16} /> : <ImageIcon size={16} />}
            {isSaving ? 'Sauvegarde...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

