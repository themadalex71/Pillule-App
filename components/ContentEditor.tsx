'use client';
import { useState, useRef } from 'react';
import { Plus, Trash2, Save, Type, X } from 'lucide-react';

interface Zone {
  id: number;
  top: number;
  left: number;
  width: number;
  height: number;
  fontSize: number;
  color: string;
}

export default function ContentEditor() {
  const [newMeme, setNewMeme] = useState({ name: '', url: '', zones: [] as Zone[] });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  const addZone = () => {
    const id = Date.now();
    const zone: Zone = { id, top: 10, left: 10, width: 40, height: 15, fontSize: 20, color: '#ffffff' };
    setNewMeme({ ...newMeme, zones: [...newMeme.zones, zone] });
    setSelectedId(id);
  };

  const updateZone = (id: number | null, fields: Partial<Zone>) => {
    if (id === null) return;
    setNewMeme({
      ...newMeme,
      zones: newMeme.zones.map(z => z.id === id ? { ...z, ...fields } : z)
    });
  };

  const handleImageClick = (e: React.MouseEvent) => {
    if (selectedId === null || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const left = ((e.clientX - rect.left) / rect.width) * 100;
    const top = ((e.clientY - rect.top) / rect.height) * 100;
    updateZone(selectedId, { left: Math.min(left, 95), top: Math.min(top, 95) });
  };

  const currentZone = newMeme.zones.find(z => z.id === selectedId);

  return (
    <div className="bg-white rounded-2xl flex flex-col h-[90vh] w-full max-w-5xl overflow-hidden text-gray-900 shadow-2xl">
      {/* HEADER MINI */}
      <div className="p-4 border-b flex justify-between items-center bg-gray-50">
        <h2 className="font-bold flex items-center gap-2"><Type size={18}/> Studio</h2>
        <div className="flex gap-2">
            <button onClick={addZone} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm">
                <Plus size={16}/> Zone
            </button>
            <button 
                onClick={async () => {
                    if(!newMeme.url) return alert("URL image ?");
                    await fetch('/api/content', { method: 'POST', body: JSON.stringify({ gameId: 'meme', item: newMeme }) });
                    alert("Enregistré ! ✅");
                }}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm"
            >
                <Save size={16}/> Sauvegarder
            </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* COLONNE GAUCHE : L'IMAGE (MAXIMISÉE) */}
        <div className="flex-[2] bg-gray-200 p-4 flex items-center justify-center relative overflow-hidden">
            <div 
                ref={imageRef}
                onClick={handleImageClick}
                className="relative max-w-full max-h-full aspect-square shadow-2xl bg-white cursor-crosshair group"
            >
                {newMeme.url ? (
                    <img src={newMeme.url} className="w-full h-full object-contain pointer-events-none" />
                ) : (
                    <div className="w-[400px] h-[400px] flex items-center justify-center text-gray-400 italic text-sm">
                        Colle une URL à droite pour commencer...
                    </div>
                )}
                
                {newMeme.zones.map((zone) => (
                <div
                    key={zone.id}
                    onClick={(e) => { e.stopPropagation(); setSelectedId(zone.id); }}
                    style={{
                        top: `${zone.top}%`,
                        left: `${zone.left}%`,
                        width: `${zone.width}%`,
                        height: `${zone.height}%`,
                        fontSize: `${zone.fontSize}px`,
                        color: zone.color,
                        display: 'flex',
                        fontFamily: 'Inter, sans-serif'
                    }}
                    className={`absolute border transition-all overflow-hidden font-semibold leading-tight p-1
                        ${selectedId === zone.id ? 'border-blue-500 bg-blue-500/10 z-20 ring-2 ring-blue-500/20' : 'border-gray-400 bg-white/40 z-10'}`}
                >
                    Texte...
                </div>
                ))}
            </div>
        </div>

        {/* COLONNE DROITE : RÉGLAGES (PLUS FINE) */}
        <div className="w-72 border-l bg-white p-5 flex flex-col gap-6 overflow-y-auto">
          <div>
            <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wider">Source Image</label>
            <input 
                placeholder="Lien URL..." 
                className="w-full p-2 bg-gray-50 border rounded-lg text-xs outline-none focus:border-blue-500"
                onChange={e => setNewMeme({...newMeme, url: e.target.value})}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase tracking-wider">Nom</label>
            <input 
                placeholder="Drake, Batman..." 
                className="w-full p-2 bg-gray-50 border rounded-lg text-xs outline-none focus:border-blue-500"
                onChange={e => setNewMeme({...newMeme, name: e.target.value})}
            />
          </div>

          <div className="h-px bg-gray-100" />

          {currentZone ? (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-blue-600 uppercase">Réglages Zone</span>
                <button onClick={() => {
                  setNewMeme({...newMeme, zones: newMeme.zones.filter(z => z.id !== selectedId)});
                  setSelectedId(null);
                }} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={16}/></button>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-2">TAILLE POLICE : {currentZone.fontSize}px</label>
                <input type="range" min="8" max="60" className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" value={currentZone.fontSize}
                  onChange={e => updateZone(selectedId, { fontSize: parseInt(e.target.value) })} />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-2">LARGEUR : {currentZone.width}%</label>
                <input type="range" min="5" max="100" className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" value={currentZone.width}
                  onChange={e => updateZone(selectedId, { width: parseInt(e.target.value) })} />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 block mb-2">HAUTEUR : {currentZone.height}%</label>
                <input type="range" min="2" max="100" className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" value={currentZone.height}
                  onChange={e => updateZone(selectedId, { height: parseInt(e.target.value) })} />
              </div>

              <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-xs font-medium">Couleur</span>
                <input type="color" value={currentZone.color} className="w-6 h-6 cursor-pointer bg-transparent border-none"
                  onChange={e => updateZone(selectedId, { color: e.target.value })} />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
               <Plus className="mb-2 text-gray-400" />
               <p className="text-[10px] font-bold uppercase tracking-widest">Sélectionne une zone ou clique sur l'image</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}