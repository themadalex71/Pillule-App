'use client';
import { useState, useRef } from 'react';
import { Plus, Trash2, Save, Move, MousePointer2 } from 'lucide-react';

export default function ContentEditor() {
  const [newMeme, setNewMeme] = useState({ 
    name: '', 
    url: '', 
    zones: [] as { id: number, top: number, left: number }[] 
  });
  const imageRef = useRef<HTMLDivElement>(null);

  // 1. Ajouter une zone par défaut au centre
  const addZone = () => {
    const newZone = { id: Date.now(), top: 50, left: 50 };
    setNewMeme({ ...newMeme, zones: [...newMeme.zones, newZone] });
  };

  // 2. Déplacer une zone en cliquant sur l'image
  const handleImageClick = (e: React.MouseEvent) => {
    if (!imageRef.current || newMeme.zones.length === 0) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // On déplace la DERNIÈRE zone ajoutée (ou on pourrait ajouter une logique de sélection)
    const updatedZones = [...newMeme.zones];
    updatedZones[updatedZones.length - 1] = { ...updatedZones[updatedZones.length - 1], top: y, left: x };
    setNewMeme({ ...newMeme, zones: updatedZones });
  };

  const updateZonePos = (id: number, axis: 'top' | 'left', value: number) => {
    setNewMeme({
      ...newMeme,
      zones: newMeme.zones.map(z => z.id === id ? { ...z, [axis]: Math.max(0, Math.min(100, z[axis] + value)) } : z)
    });
  };

  const removeZone = (id: number) => {
    setNewMeme({ ...newMeme, zones: newMeme.zones.filter(z => z.id !== id) });
  };

  const saveToRedis = async () => {
    if (!newMeme.url || !newMeme.name) return alert("Nom et URL requis !");
    await fetch('/api/content', {
      method: 'POST',
      body: JSON.stringify({ gameId: 'meme', item: newMeme })
    });
    alert("Meme enregistré ! ✅");
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto text-gray-800">
      <h2 className="text-2xl font-black mb-4 tracking-tight">Meme Studio 🎨</h2>

      <div className="flex flex-col gap-3 mb-6">
        <input 
          placeholder="Nom du meme..." 
          className="p-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-purple-500 outline-none transition"
          onChange={e => setNewMeme({...newMeme, name: e.target.value})}
        />
        <input 
          placeholder="URL de l'image (direct link)..." 
          className="p-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-purple-500 outline-none transition"
          onChange={e => setNewMeme({...newMeme, url: e.target.value})}
        />
      </div>

      {/* ZONE DE PREVIEW ET PLACEMENT */}
      {newMeme.url && (
        <div className="space-y-4">
          <p className="text-xs font-bold text-purple-500 flex items-center gap-1">
            <MousePointer2 size={14}/> Clique sur l'image pour placer la zone active
          </p>
          <div 
            ref={imageRef}
            onClick={handleImageClick}
            className="relative w-full aspect-square bg-gray-100 rounded-2xl overflow-hidden cursor-crosshair border-4 border-gray-50 shadow-inner"
          >
            <img src={newMeme.url} className="w-full h-full object-contain pointer-events-none" />
            {newMeme.zones.map((zone, index) => (
              <div 
                key={zone.id}
                style={{ top: `${zone.top}%`, left: `${zone.left}%` }}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded border-2 shadow-lg whitespace-nowrap font-bold text-[10px]
                  ${index === newMeme.zones.length - 1 ? 'bg-purple-600 border-white text-white z-10 scale-110' : 'bg-white border-purple-600 text-purple-600 opacity-70'}`}
              >
                TEXTE {index + 1}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GESTION DES ZONES */}
      <div className="mt-6 space-y-3">
        {newMeme.zones.map((zone, index) => (
          <div key={zone.id} className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
            <span className="font-black text-purple-600 w-6">#{index + 1}</span>
            <div className="flex-1 flex justify-center gap-4">
              {/* Petits contrôles de précision */}
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-400">Y:</span>
                <button onClick={() => updateZonePos(zone.id, 'top', -2)} className="p-1 bg-white rounded shadow text-xs">↑</button>
                <button onClick={() => updateZonePos(zone.id, 'top', 2)} className="p-1 bg-white rounded shadow text-xs">↓</button>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-gray-400">X:</span>
                <button onClick={() => updateZonePos(zone.id, 'left', -2)} className="p-1 bg-white rounded shadow text-xs">←</button>
                <button onClick={() => updateZonePos(zone.id, 'left', 2)} className="p-1 bg-white rounded shadow text-xs">→</button>
              </div>
            </div>
            <button onClick={() => removeZone(zone.id)} className="text-red-400 p-1"><Trash2 size={18}/></button>
          </div>
        ))}

        <button 
          onClick={addZone}
          disabled={!newMeme.url}
          className="w-full py-4 border-2 border-dashed border-purple-200 text-purple-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-purple-50 disabled:opacity-30 transition"
        >
          <Plus size={20}/> Ajouter une zone de texte
        </button>

        <button 
          onClick={saveToRedis}
          className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition mt-4"
        >
          <Save size={20}/> ENREGISTRER DANS LE HUB
        </button>
      </div>
    </div>
  );
}