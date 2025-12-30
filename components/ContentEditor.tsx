'use client';
import { useState, useRef } from 'react';
import { Plus, Trash2, Save, Type, RotateCcw, MousePointer2 } from 'lucide-react';

interface Zone {
  id: number; top: number; left: number; width: number; height: number; fontSize: number; color: string;
}

export default function ContentEditor() {
  const [newMeme, setNewMeme] = useState({ name: '', url: '', zones: [] as Zone[] });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  const addZone = () => {
    const id = Date.now();
    const zone: Zone = { id, top: 10, left: 10, width: 40, height: 15, fontSize: 24, color: '#ffffff' };
    setNewMeme({ ...newMeme, zones: [...newMeme.zones, zone] });
    setSelectedId(id);
  };

  const updateZone = (id: number | null, fields: Partial<Zone>) => {
    if (id === null) return;
    setNewMeme({ ...newMeme, zones: newMeme.zones.map(z => z.id === id ? { ...z, ...fields } : z) });
  };

  const handleImageClick = (e: React.MouseEvent) => {
    if (selectedId === null || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const left = ((e.clientX - rect.left) / rect.width) * 100;
    const top = ((e.clientY - rect.top) / rect.height) * 100;
    
    const zone = newMeme.zones.find(z => z.id === selectedId);
    if (!zone) return;

    updateZone(selectedId, { 
        left: Math.max(0, Math.min(left, 100 - zone.width)), 
        top: Math.max(0, Math.min(top, 100 - zone.height)) 
    });
  };

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto bg-gray-100 h-[92vh] shadow-2xl overflow-hidden rounded-[2.5rem] border border-gray-200 text-gray-900">
      
      {/* HEADER FIXE */}
      <div className="bg-[#343a4b] p-5 pt-8 pb-8 text-center relative shrink-0">
        <div className="absolute right-6 top-8">
            <button 
                onClick={() => {setNewMeme({ name: '', url: '', zones: [] }); setSelectedId(null);}} 
                className="bg-white/10 p-2 rounded-full text-white hover:bg-white/20 transition-all active:scale-90"
            >
                <RotateCcw size={18} />
            </button>
        </div>
        <p className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.2em] mb-1">Studio de Création</p>
        <h1 className="text-2xl font-black text-white italic tracking-tight">Meme Maker</h1>
      </div>

      {/* SECTION IMAGE FIXE (Toujours visible) */}
      <div className="px-4 -mt-4 shrink-0 z-10">
        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
          <div 
            ref={imageRef} 
            onClick={handleImageClick} 
            className="relative w-full bg-gray-50 flex items-center justify-center border-b cursor-crosshair aspect-square max-h-[300px]"
          >
            {newMeme.url ? (
              <img src={newMeme.url} className="w-full h-full object-contain block pointer-events-none" alt="Preview" />
            ) : (
              <div className="p-10 text-center space-y-2 opacity-40">
                <Type className="mx-auto" size={30} />
                <p className="font-bold uppercase text-[9px] tracking-widest">Colle une URL ci-dessous</p>
              </div>
            )}
            
            {newMeme.zones.map((zone, index) => (
              <div key={zone.id} 
                onClick={(e) => { e.stopPropagation(); setSelectedId(zone.id); }}
                style={{
                    top: `${zone.top}%`, left: `${zone.left}%`, width: `${zone.width}%`, height: `${zone.height}%`,
                    fontSize: `${zone.fontSize / 1.5}px`,
                    color: zone.color,
                    fontFamily: 'Inter, system-ui, sans-serif', fontWeight: '900',
                    lineHeight: '1.1', textShadow: '0px 2px 4px rgba(0,0,0,0.9)',
                    zIndex: selectedId === zone.id ? 50 : 10 + index
                }}
                className={`absolute p-1 flex items-start justify-start overflow-hidden select-none transition-all
                    ${selectedId === zone.id 
                        ? 'ring-2 ring-blue-500 bg-blue-500/10 shadow-lg' 
                        : 'border border-dashed border-white/40 bg-black/5 hover:bg-black/10'
                    }`}
              >
                <span className="uppercase text-[0.6em]">Zone {index + 1}</span>
              </div>
            ))}
          </div>
          <div className="p-3 bg-white">
              <input 
                placeholder="URL de l'image (ex: https://...)" 
                className="w-full p-2 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-bold outline-none focus:bg-white" 
                value={newMeme.url} 
                onChange={e => setNewMeme({...newMeme, url: e.target.value})} 
              />
          </div>
        </div>
      </div>

      {/* SECTION CONFIG SCROLLABLE */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 no-scrollbar">
          
          <div className="flex flex-col gap-3">
              {newMeme.zones.map((zone, idx) => (
                  <div key={zone.id} 
                       onClick={() => setSelectedId(zone.id)}
                       className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer ${selectedId === zone.id ? 'border-blue-500 shadow-md ring-1 ring-blue-500/10 scale-[1.02]' : 'border-gray-200 opacity-80'}`}>
                      
                      <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-white uppercase bg-gray-900 px-2 py-0.5 rounded">Zone {idx + 1}</span>
                            {selectedId === zone.id && <MousePointer2 size={12} className="text-blue-500" />}
                          </div>
                          {selectedId === zone.id && (
                              <button 
                                  onClick={(e) => { 
                                      e.stopPropagation();
                                      setNewMeme({...newMeme, zones: newMeme.zones.filter(z => z.id !== zone.id)});
                                      setSelectedId(null);
                                  }} 
                                  className="text-red-400 p-1 hover:text-red-600 transition-colors"
                              >
                                  <Trash2 size={14}/>
                              </button>
                          )}
                      </div>

                      {selectedId === zone.id && (
                          <div className="space-y-4 pt-4 mt-3 border-t border-gray-50 animate-in fade-in zoom-in-95 duration-200">
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                      <div className="flex justify-between text-[9px] font-black text-gray-400 uppercase">
                                          <span>Police</span>
                                          <span className="text-blue-600">{zone.fontSize}px</span>
                                      </div>
                                      <input type="range" min="10" max="100" className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none accent-blue-600" 
                                          value={zone.fontSize} onChange={e => updateZone(zone.id, { fontSize: parseInt(e.target.value) })} />
                                  </div>
                                  <div className="space-y-1">
                                      <span className="text-[9px] font-black text-gray-400 uppercase">Couleur</span>
                                      <input type="color" value={zone.color} className="w-full h-6 cursor-pointer bg-transparent border-none block"
                                          onChange={e => updateZone(zone.id, { color: e.target.value })} />
                                  </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                      <span className="text-[9px] font-black text-gray-400 uppercase">Largeur {zone.width}%</span>
                                      <input type="range" min="10" max="100" className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none accent-gray-400" 
                                          value={zone.width} onChange={e => updateZone(zone.id, { width: parseInt(e.target.value) })} />
                                  </div>
                                  <div className="space-y-1">
                                      <span className="text-[9px] font-black text-gray-400 uppercase">Hauteur {zone.height}%</span>
                                      <input type="range" min="5" max="100" className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none accent-gray-400" 
                                          value={zone.height} onChange={e => updateZone(zone.id, { height: parseInt(e.target.value) })} />
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              ))}

              {/* BOUTON AJOUTER : Placé après la dernière zone dans le scroll */}
              <button 
                  onClick={addZone} 
                  className="w-full border-2 border-dashed border-gray-300 rounded-2xl py-4 flex flex-col items-center gap-1 text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 transition-all active:scale-95"
              >
                  <Plus size={20}/>
                  <span className="text-[10px] font-black uppercase tracking-widest">Ajouter une zone texte</span>
              </button>
          </div>
      </div>

      {/* FOOTER FIXE */}
      <div className="p-5 bg-white border-t border-gray-100 shrink-0 shadow-lg">
          <input 
            placeholder="Nom du Template (ex: Batman Slapping)" 
            className="w-full mb-3 p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold outline-none focus:border-blue-200" 
            value={newMeme.name} 
            onChange={e => setNewMeme({...newMeme, name: e.target.value})} 
          />
          <button 
              onClick={async () => {
                if(!newMeme.url || newMeme.zones.length === 0) return alert("Image et zones requises !");
                await fetch('/api/content', { method: 'POST', body: JSON.stringify({ gameId: 'meme', item: newMeme }) });
                alert("Template enregistré avec succès ! 🚀");
              }}
              className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase text-[11px] tracking-widest"
          >
              <Save size={18}/> Enregistrer le Meme
          </button>
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}