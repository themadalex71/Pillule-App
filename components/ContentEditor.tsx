'use client';
import { useState, useRef } from 'react';
import { Plus, Trash2, Save, Type } from 'lucide-react';

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
    const zone: Zone = { id, top: 10, left: 10, width: 40, height: 20, fontSize: 30, color: '#ffffff' };
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
    updateZone(selectedId, { left: Math.min(left, 90), top: Math.min(top, 90) });
  };

  const currentZone = newMeme.zones.find(z => z.id === selectedId);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto text-gray-800 w-full max-w-4xl border border-purple-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black flex items-center gap-2 tracking-tighter italic">
          <Type className="text-purple-600" /> MEME STUDIO PRO
        </h2>
        <button onClick={addZone} className="bg-purple-600 text-white px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 hover:bg-purple-700 transition-all shadow-lg">
          <Plus size={20}/> Nouvelle Zone
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <input 
            placeholder="URL de l'image..." 
            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-purple-500"
            onChange={e => setNewMeme({...newMeme, url: e.target.value})}
          />
          
          <div 
            ref={imageRef}
            onClick={handleImageClick}
            className="relative w-full aspect-square bg-gray-100 rounded-3xl border-4 border-dashed border-gray-200 overflow-hidden cursor-crosshair shadow-inner"
          >
            {newMeme.url && <img src={newMeme.url} className="w-full h-full object-contain pointer-events-none" alt="Preview" />}
            
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
                  WebkitTextStroke: '1px black',
                  fontFamily: 'Impact, sans-serif',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start',
                  overflow: 'hidden',        // BLOQUE LE TEXTE ICI AUSSI
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap'
                }}
                className={`absolute border-2 transition-all uppercase font-black p-1 leading-none
                  ${selectedId === zone.id ? 'border-purple-500 bg-purple-500/20 z-20' : 'border-white/50 bg-black/10 z-10'}`}
              >
                TEXTE PREVIEW
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-[2rem] space-y-6 border border-gray-100">
          <input 
            placeholder="Nom du meme..." 
            className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold"
            onChange={e => setNewMeme({...newMeme, name: e.target.value})}
          />

          {currentZone ? (
            <div className="space-y-5">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-xs font-black text-purple-600 uppercase">Réglages</span>
                <button onClick={() => {
                  setNewMeme({...newMeme, zones: newMeme.zones.filter(z => z.id !== selectedId)});
                  setSelectedId(null);
                }} className="text-red-500"><Trash2 size={18}/></button>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 block mb-2 uppercase">Police : {currentZone.fontSize}px</label>
                <input type="range" min="10" max="100" className="w-full" value={currentZone.fontSize}
                  onChange={e => { if(selectedId !== null) updateZone(selectedId, { fontSize: parseInt(e.target.value) }) }} />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 block mb-2 uppercase">Largeur : {currentZone.width}%</label>
                <input type="range" min="5" max="100" className="w-full" value={currentZone.width}
                  onChange={e => { if(selectedId !== null) updateZone(selectedId, { width: parseInt(e.target.value) }) }} />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 block mb-2 uppercase">Hauteur : {currentZone.height}%</label>
                <input type="range" min="5" max="100" className="w-full" value={currentZone.height}
                  onChange={e => { if(selectedId !== null) updateZone(selectedId, { height: parseInt(e.target.value) }) }} />
              </div>

              <div className="flex items-center justify-between p-3 bg-white rounded-2xl border">
                <span className="text-xs font-bold">Couleur</span>
                <input type="color" value={currentZone.color} className="w-10 h-10 cursor-pointer"
                  onChange={e => { if(selectedId !== null) updateZone(selectedId, { color: e.target.value }) }} />
              </div>
            </div>
          ) : (
            <p className="text-center text-xs text-gray-400 italic py-10">Sélectionne une zone</p>
          )}

          <button 
            onClick={async () => {
              if(!newMeme.name || !newMeme.url) return alert("Nom et URL requis !");
              await fetch('/api/content', { method: 'POST', body: JSON.stringify({ gameId: 'meme', item: newMeme }) });
              alert("Meme enregistré ! 🚀");
            }}
            className="w-full bg-gray-900 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-black transition-all"
          >
            <Save size={20}/> ENREGISTRER
          </button>
        </div>
      </div>
    </div>
  );
}