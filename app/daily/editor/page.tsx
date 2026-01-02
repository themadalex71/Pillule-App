'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Trash2, Loader2, Sparkles, Save, Type, MousePointer2 } from 'lucide-react';
import Link from 'next/link';

const GAMES_CONFIG = [
  { id: 'zoom', title: 'Zoom', emoji: '🔍', color: 'bg-purple-500' },
  { id: 'meme', title: 'Meme', emoji: '🎭', color: 'bg-blue-500' },
  { id: 'cadavre', title: 'Cadavre', emoji: '✍️', color: 'bg-green-500' },
];

interface Zone {
  id: number; top: number; left: number; width: number; height: number; fontSize: number; color: string;
}

export default function EditorPage() {
  const [selectedGame, setSelectedGame] = useState<string>('zoom');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // États spécifiques Zoom
  const [newZoomMission, setNewZoomMission] = useState('');

  // États spécifiques Meme Maker
  const [isCreatingMeme, setIsCreatingMeme] = useState(false);
  const [newMeme, setNewMeme] = useState({ name: '', url: '', zones: [] as Zone[] });
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  // Charger les données
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/editor/missions?gameId=${selectedGame}`);
      const data = await res.json();
      setItems(data.missions || []);
    } catch (e) {
      console.error("Erreur synchro missions", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [selectedGame]);

  const saveToRedis = async (updatedList: any[]) => {
    await fetch('/api/editor/missions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: selectedGame, missions: updatedList })
    });
  };

  // --- LOGIQUE ZOOM ---
  const handleAddZoom = async () => {
    if (!newZoomMission.trim()) return;
    const updated = [newZoomMission.trim(), ...items];
    setItems(updated);
    setNewZoomMission('');
    await saveToRedis(updated);
  };

  // --- LOGIQUE MEME STUDIO (Adaptée de ton code) ---
  const addZone = () => {
    const id = Date.now();
    // Valeurs par défaut
    const zone: Zone = { id, top: 10, left: 10, width: 40, height: 15, fontSize: 24, color: '#ffffff' };
    setNewMeme({ ...newMeme, zones: [...newMeme.zones, zone] });
    setSelectedZoneId(id);
  };

  const updateZone = (id: number | null, fields: Partial<Zone>) => {
    if (id === null) return;
    setNewMeme({ ...newMeme, zones: newMeme.zones.map(z => z.id === id ? { ...z, ...fields } : z) });
  };

  const handleImageClick = (e: React.MouseEvent) => {
    if (selectedZoneId === null || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    
    // Calcul en pourcentage comme dans ta version précédente
    const left = ((e.clientX - rect.left) / rect.width) * 100;
    const top = ((e.clientY - rect.top) / rect.height) * 100;
    
    const zone = newMeme.zones.find(z => z.id === selectedZoneId);
    if (zone) {
      // On empêche la zone de sortir de l'image
      updateZone(selectedZoneId, { 
        left: Math.max(0, Math.min(left, 100 - zone.width)), 
        top: Math.max(0, Math.min(top, 100 - zone.height)) 
      });
    }
  };

  const saveFullMeme = async () => {
    if (!newMeme.url || !newMeme.name || newMeme.zones.length === 0) return alert("Image, nom et zones requis !");
    const updated = [{ ...newMeme, id: Date.now() }, ...items];
    setItems(updated);
    await saveToRedis(updated);
    setIsCreatingMeme(false);
    setNewMeme({ name: '', url: '', zones: [] });
  };

  const handleDelete = async (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    await saveToRedis(updated);
  };

  return (
    <main className="min-h-screen bg-gray-50 font-sans pb-10">
      
      {/* HEADER CENTRÉ */}
      <header className="bg-white border-b px-4 h-16 flex items-center sticky top-0 z-40">
        <Link href="/daily" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-gray-600" />
        </Link>
        <h1 className="flex-1 text-center font-black uppercase tracking-tighter text-xl text-gray-800 mr-10">
          Éditeur
        </h1>
      </header>

      {/* NAVIGATION BARRE HORIZONTALE */}
      <nav className="bg-white border-b overflow-x-auto py-4 px-6 flex gap-4 sticky top-16 z-30 no-scrollbar shadow-sm">
        {GAMES_CONFIG.map((game) => (
          <button
            key={game.id}
            onClick={() => { setSelectedGame(game.id); setIsCreatingMeme(false); }}
            className={`px-6 py-2.5 rounded-full font-black text-sm uppercase tracking-tighter transition-all border-2 whitespace-nowrap
              ${selectedGame === game.id 
                ? `${game.color} text-white border-transparent scale-105 shadow-lg shadow-purple-100` 
                : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}
          >
            <span>{game.emoji}</span> {game.title}
          </button>
        ))}
      </nav>

      <div className="max-w-md mx-auto p-4 space-y-8">
        
        {/* --- VUE ZOOM --- */}
        {selectedGame === 'zoom' && (
          <div className="space-y-6 animate-in fade-in">
            <section className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100">
              <div className="flex items-center gap-2 mb-4 text-purple-600">
                <Sparkles size={16} />
                <h2 className="text-[10px] font-black uppercase tracking-widest opacity-70">Nouveau thème Zoom</h2>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newZoomMission}
                  onChange={(e) => setNewZoomMission(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddZoom()}
                  className="flex-1 bg-gray-50 p-4 rounded-2xl outline-none font-bold text-gray-700 focus:ring-2 focus:ring-purple-500 transition-all"
                  placeholder="Ex: Un objet rond..."
                />
                <button onClick={handleAddZoom} className="bg-gray-900 text-white p-4 rounded-2xl shadow-lg active:scale-90 transition-all">
                  <Plus size={24} />
                </button>
              </div>
            </section>
            
            <div className="space-y-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">Missions en base ({items.length})</p>
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-purple-600" /></div>
              ) : (
                items.map((m, i) => (
                  <div key={i} className="bg-white p-5 rounded-3xl flex justify-between items-center border border-gray-50 shadow-sm animate-in slide-in-from-bottom-2">
                    <span className="font-bold text-gray-700 leading-tight">{m}</span>
                    <button onClick={() => handleDelete(i)} className="text-red-200 hover:text-red-500 transition-colors p-2"><Trash2 size={20} /></button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* --- VUE MEME --- */}
        {selectedGame === 'meme' && (
          isCreatingMeme ? (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
              
              {/* STUDIO DE VISUALISATION */}
              <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-200">
                <div 
                  ref={imageRef} 
                  onClick={handleImageClick} 
                  className="relative aspect-square bg-gray-900 flex items-center justify-center cursor-crosshair overflow-hidden"
                >
                  {newMeme.url ? (
                    <img src={newMeme.url} className="w-full h-full object-contain pointer-events-none" alt="Meme Template" />
                  ) : (
                    <div className="text-white/20 flex flex-col items-center gap-2">
                      <Type size={40} />
                      <p className="text-[10px] font-black uppercase">Colle une URL ci-dessous</p>
                    </div>
                  )}
                  {newMeme.zones.map((zone, idx) => (
                    <div 
                      key={zone.id} 
                      onClick={(e) => { e.stopPropagation(); setSelectedZoneId(zone.id); }}
                      style={{ 
                        top: `${zone.top}%`, 
                        left: `${zone.left}%`, 
                        width: `${zone.width}%`, 
                        height: `${zone.height}%`, 
                        fontSize: `${zone.fontSize / 2}px`, 
                        color: zone.color,
                        textShadow: '0 2px 4px rgba(0,0,0,0.8)'
                      }}
                      className={`absolute border-2 flex items-center justify-center font-black uppercase transition-all shadow-lg
                        ${selectedZoneId === zone.id ? 'border-blue-500 bg-blue-500/20 z-50' : 'border-white/40 bg-black/20 z-10'}`}
                    >
                      <span className="scale-75 text-white">Zone {idx + 1}</span>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-white border-t">
                  <input 
                    placeholder="URL de l'image (JPG, PNG...)" 
                    className="w-full p-3 bg-gray-50 rounded-xl text-xs outline-none font-bold"
                    value={newMeme.url} 
                    onChange={e => setNewMeme({...newMeme, url: e.target.value})} 
                  />
                </div>
              </div>

              {/* LISTE DES ZONES ET CONFIGURATION */}
              <div className="space-y-3">
                {newMeme.zones.map((zone, idx) => (
                  <div 
                    key={zone.id} 
                    onClick={() => setSelectedZoneId(zone.id)}
                    className={`bg-white p-4 rounded-2xl border-2 transition-all ${selectedZoneId === zone.id ? 'border-blue-500 shadow-md ring-1 ring-blue-500/10' : 'border-gray-100 opacity-80'}`}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black bg-gray-900 text-white px-2 py-0.5 rounded uppercase">Zone {idx+1}</span>
                        {selectedZoneId === zone.id && <MousePointer2 size={12} className="text-blue-500 animate-pulse" />}
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setNewMeme({...newMeme, zones: newMeme.zones.filter(z => z.id !== zone.id)}); }}
                        className="text-red-400 p-1 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={16}/>
                      </button>
                    </div>

                    {/* --- C'EST ICI QUE J'AI REMIS TES CURSEURS --- */}
                    {selectedZoneId === zone.id && (
                      <div className="space-y-4 pt-2 border-t border-gray-50 animate-in fade-in">
                        {/* LIGNE 1 : POLICE & COULEUR */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-black text-gray-400 uppercase">
                                <span>Police</span> <span>{zone.fontSize}px</span>
                            </div>
                            <input type="range" min="10" max="100" value={zone.fontSize} onChange={e => updateZone(zone.id, { fontSize: parseInt(e.target.value) })} className="w-full accent-blue-600 h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer" />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] font-black text-gray-400 uppercase">Couleur</span>
                            <input type="color" value={zone.color} onChange={e => updateZone(zone.id, { color: e.target.value })} className="w-full h-6 cursor-pointer bg-transparent" />
                          </div>
                        </div>

                        {/* LIGNE 2 : LARGEUR & HAUTEUR (RESTAURÉES) */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-black text-gray-400 uppercase">
                                <span>Largeur</span> <span>{zone.width}%</span>
                            </div>
                            <input type="range" min="10" max="100" value={zone.width} onChange={e => updateZone(zone.id, { width: parseInt(e.target.value) })} className="w-full accent-gray-400 h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[9px] font-black text-gray-400 uppercase">
                                <span>Hauteur</span> <span>{zone.height}%</span>
                            </div>
                            <input type="range" min="5" max="100" value={zone.height} onChange={e => updateZone(zone.id, { height: parseInt(e.target.value) })} className="w-full accent-gray-400 h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <button 
                  onClick={addZone}
                  className="w-full border-2 border-dashed border-gray-300 rounded-2xl py-5 text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em] hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all active:scale-95"
                >
                  <Plus size={20} className="mx-auto mb-1" />
                  Ajouter une zone texte
                </button>
              </div>

              {/* FOOTER ENREGISTREMENT */}
              <div className="p-6 bg-white rounded-[2rem] shadow-xl space-y-4 border border-gray-100">
                <input 
                  placeholder="Nom du Template (ex: Distracted Boyfriend)" 
                  className="w-full p-4 bg-gray-50 rounded-xl font-bold border-none outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                  value={newMeme.name} 
                  onChange={e => setNewMeme({...newMeme, name: e.target.value})} 
                />
                <div className="flex gap-2">
                  <button onClick={() => setIsCreatingMeme(false)} className="flex-1 bg-gray-100 text-gray-500 font-black py-4 rounded-xl uppercase text-xs">Annuler</button>
                  <button onClick={saveFullMeme} className="flex-[2] bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 uppercase text-xs tracking-widest active:scale-95 transition-all">
                    <Save size={18}/> Enregistrer
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <button 
                onClick={() => setIsCreatingMeme(true)} 
                className="w-full bg-blue-600 text-white font-black py-5 rounded-[2rem] shadow-lg flex items-center justify-center gap-3 uppercase tracking-tighter active:scale-95 transition-all"
              >
                <Plus size={24} /> Créer un Template Meme
              </button>
              
              <div className="grid gap-4 mt-6">
                {items.length > 0 ? items.map((meme, i) => (
                  <div key={meme.id || i} className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm animate-in fade-in group relative">
                    <img src={meme.url} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" alt={meme.name} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-0 left-0 right-0 p-5 flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Template</span>
                        <span className="text-white font-black uppercase text-sm">{meme.name}</span>
                      </div>
                      <button 
                        onClick={() => handleDelete(i)} 
                        className="bg-red-500 text-white p-2.5 rounded-2xl shadow-lg shadow-red-500/30 active:scale-90 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-20 bg-gray-100/50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                    <p className="text-gray-400 font-bold italic">Aucun template de meme pour l'instant.</p>
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </main>
  );
}