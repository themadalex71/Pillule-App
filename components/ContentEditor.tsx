'use client';
import { useState, useRef } from 'react';
import { Plus, Trash2, Save, MousePointer2, Type } from 'lucide-react';

export default function ContentEditor() {
  const [newMeme, setNewMeme] = useState({ 
    name: '', 
    url: '', 
    zones: [] as { id: number, top: number, left: number, fontSize: number, color: string, width: number }[] 
  });
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  const addZone = () => {
    const id = Date.now();
    const newZone = { id, top: 50, left: 50, fontSize: 30, color: '#ffffff', width: 80 };
    setNewMeme({ ...newMeme, zones: [...newMeme.zones, newZone] });
    setSelectedZone(id);
  };

  const updateZone = (id: number, field: string, value: any) => {
    setNewMeme({
      ...newMeme,
      zones: newMeme.zones.map(z => z.id === id ? { ...z, [field]: value } : z)
    });
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto text-gray-800 w-full max-w-2xl">
      <h2 className="text-2xl font-black mb-4 tracking-tight flex items-center gap-2">
        <Type className="text-purple-600" /> Meme Studio Pro
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <input 
          placeholder="Nom du meme..." 
          className="p-3 bg-gray-50 border-2 rounded-xl focus:border-purple-500 outline-none"
          onChange={e => setNewMeme({...newMeme, name: e.target.value})}
        />
        <input 
          placeholder="URL de l'image..." 
          className="p-3 bg-gray-50 border-2 rounded-xl focus:border-purple-500 outline-none"
          onChange={e => setNewMeme({...newMeme, url: e.target.value})}
        />
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* PREVIEW + PLACEMENT */}
        <div className="flex-1">
          {newMeme.url && (
            <div 
              ref={imageRef}
              onClick={(e) => {
                if(!selectedZone || !imageRef.current) return;
                const rect = imageRef.current.getBoundingClientRect();
                updateZone(selectedZone, 'left', ((e.clientX - rect.left) / rect.width) * 100);
                updateZone(selectedZone, 'top', ((e.clientY - rect.top) / rect.height) * 100);
              }}
              className="relative w-full aspect-square bg-gray-100 rounded-2xl overflow-hidden cursor-crosshair border-4 border-gray-100 shadow-inner"
            >
              <img src={newMeme.url} className="w-full h-full object-contain pointer-events-none" />
              {newMeme.zones.map((zone) => (
                <div 
                  key={zone.id}
                  onClick={(e) => { e.stopPropagation(); setSelectedZone(zone.id); }}
                  style={{ 
                    top: `${zone.top}%`, 
                    left: `${zone.left}%`, 
                    width: `${zone.width}%`,
                    fontSize: `${zone.fontSize}px`,
                    color: zone.color,
                    WebkitTextStroke: '1px black',
                    fontFamily: 'Impact, sans-serif'
                  }}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 text-center font-black uppercase leading-tight break-words p-1
                    ${selectedZone === zone.id ? 'border-2 border-dashed border-blue-400' : ''}`}
                >
                  TEXTE
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CONTRÔLES DE PERSONNALISATION */}
        <div className="w-full md:w-64 space-y-4">
          <button onClick={addZone} className="w-full py-3 bg-purple-100 text-purple-700 rounded-xl font-bold flex items-center justify-center gap-2">
            <Plus size={18}/> Nouvelle Zone
          </button>

          {selectedZone && (
            <div className="p-4 bg-gray-50 rounded-2xl border-2 border-purple-100 animate-in slide-in-from-right-5">
              <p className="text-xs font-black text-purple-600 mb-3 uppercase tracking-wider">Réglages Zone</p>
              
              <div className="space-y-4">
                <label className="block">
                  <span className="text-[10px] font-bold text-gray-400">TAILLE POLICE</span>
                  <input type="range" min="10" max="80" className="w-full" 
                    onChange={e => updateZone(selectedZone, 'fontSize', parseInt(e.target.value))} />
                </label>

                <label className="block">
                  <span className="text-[10px] font-bold text-gray-400">LARGEUR CADRE</span>
                  <input type="range" min="20" max="100" className="w-full" 
                    onChange={e => updateZone(selectedZone, 'width', parseInt(e.target.value))} />
                </label>

                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400">COULEUR</span>
                  <input type="color" className="w-8 h-8 rounded cursor-pointer" 
                    onChange={e => updateZone(selectedZone, 'color', e.target.value)} />
                </div>

                <button onClick={() => {
                  setNewMeme({...newMeme, zones: newMeme.zones.filter(z => z.id !== selectedZone)});
                  setSelectedZone(null);
                }} className="w-full py-2 bg-red-50 text-red-500 rounded-lg text-xs font-bold">
                  Supprimer la zone
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <button onClick={async () => {
          await fetch('/api/content', { method: 'POST', body: JSON.stringify({ gameId: 'meme', item: newMeme }) });
          alert("Meme Sauvegardé ! 🚀");
        }} 
        className="w-full mt-6 bg-gray-900 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-95 transition"
      >
        <Save size={20}/> ENREGISTRER LE TEMPLATE
      </button>
    </div>
  );
}