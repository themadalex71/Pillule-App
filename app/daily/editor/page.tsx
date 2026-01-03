'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Plus, Trash2, Loader2, Sparkles, Save, Type, MousePointer2, Pencil, Feather, List, Hash, Music, AlignLeft, BookOpen, X } from 'lucide-react';
import Link from 'next/link';

const GAMES_CONFIG = [
  { id: 'zoom', title: 'Zoom', emoji: '🔍', color: 'bg-purple-500' },
  { id: 'meme', title: 'Meme', emoji: '🎭', color: 'bg-blue-500' },
  { id: 'cadavre', title: 'Cadavre', emoji: '✍️', color: 'bg-green-500' },
  { id: 'poet', title: 'Poète', emoji: '🪶', color: 'bg-pink-500' },
];

// Catégories d'édition pour le Poète
const POET_CATEGORIES = [
  { id: 'themes', label: 'Thèmes', icon: <AlignLeft size={14}/> },
  { id: 'structures', label: 'Structures (Vers)', icon: <List size={14}/> },
  { id: 'syllables', label: 'Métrique', icon: <Hash size={14}/> },
  { id: 'rhymes', label: 'Rimes', icon: <Music size={14}/> },
];

interface Zone {
  id: number; top: number; left: number; width: number; height: number; fontSize: number; color: string;
}

export default function EditorPage() {
  const [selectedGame, setSelectedGame] = useState<string>('zoom');
  const [poetCategory, setPoetCategory] = useState<string>('themes'); 
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Input générique (Zoom, Poète simple)
  const [inputText, setInputText] = useState('');
  
  // Input spécifique Poète Structure
  const [structInput, setStructInput] = useState({ label: '', lines: 4 });

  // --- ÉTATS POUR CADAVRE EXQUIS ---
  const [cadavreTitle, setCadavreTitle] = useState('');
  const [cadavreSteps, setCadavreSteps] = useState<{label:string, placeholder:string}[]>([]);
  const [newStep, setNewStep] = useState({ label: '', placeholder: '' });
  const [editingCadavreId, setEditingCadavreId] = useState<string | null>(null); // Pour savoir si on édite

  // États Meme Maker
  const [isCreatingMeme, setIsCreatingMeme] = useState(false);
  const [newMeme, setNewMeme] = useState({ name: '', url: '', zones: [] as Zone[] });
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const url = selectedGame === 'poet' 
        ? `/api/editor/missions?gameId=${selectedGame}&category=${poetCategory}`
        : `/api/editor/missions?gameId=${selectedGame}`;
        
      const res = await fetch(url);
      const data = await res.json();
      setItems(data.missions || []);
    } catch (e) {
      console.error("Erreur synchro missions", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    setInputText('');
    resetCadavreForm(); // Reset formulaire cadavre si on change de jeu
  }, [selectedGame, poetCategory]);

  const saveToRedis = async (updatedList: any[]) => {
    await fetch('/api/editor/missions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        gameId: selectedGame, 
        category: selectedGame === 'poet' ? poetCategory : undefined,
        missions: updatedList 
      })
    });
  };

  const handleAddItem = async () => {
    let newItem;
    
    // Cas Spécial : Structure du Poète
    if (selectedGame === 'poet' && poetCategory === 'structures') {
        if (!structInput.label) return;
        newItem = { label: structInput.label, lines: parseInt(structInput.lines.toString()) };
        setStructInput({ label: '', lines: 4 });
    } else {
        // Cas Standard
        if (!inputText.trim()) return;
        newItem = inputText.trim();
        setInputText('');
    }

    const updated = [newItem, ...items];
    setItems(updated);
    await saveToRedis(updated);
  };

  // --- LOGIQUE CADAVRE EXQUIS (UPDATED) ---
  
  // Ajouter une étape au formulaire en cours
  const addCadavreStep = () => {
    if(!newStep.label) return;
    setCadavreSteps([...cadavreSteps, newStep]);
    setNewStep({ label: '', placeholder: '' });
  };

  // Charger un scénario dans le formulaire pour édition
  const handleEditCadavre = (scenario: any) => {
    setCadavreTitle(scenario.title);
    setCadavreSteps(scenario.steps || []);
    setEditingCadavreId(scenario.id);
    // Petit scroll vers le haut pour voir le formulaire
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Réinitialiser le formulaire
  const resetCadavreForm = () => {
    setCadavreTitle('');
    setCadavreSteps([]);
    setNewStep({ label: '', placeholder: '' });
    setEditingCadavreId(null);
  };

  // Sauvegarder (Création ou Mise à jour)
  const saveCadavreTemplate = async () => {
    if(!cadavreTitle || cadavreSteps.length < 2) return alert("Il faut un titre et au moins 2 étapes !");
    
    let updated;

    if (editingCadavreId) {
        // MODE MISE À JOUR
        updated = items.map(item => 
            item.id === editingCadavreId 
            ? { ...item, title: cadavreTitle, steps: cadavreSteps } // On garde l'ID existant
            : item
        );
    } else {
        // MODE CRÉATION
        const newTemplate = { 
            id: Date.now().toString(), 
            title: cadavreTitle, 
            steps: cadavreSteps 
        };
        updated = [newTemplate, ...items];
    }

    setItems(updated);
    await saveToRedis(updated);
    resetCadavreForm();
  };

  const handleDelete = async (index: number) => {
    if(!confirm("Supprimer cet élément ?")) return;
    // Si on supprime l'élément qu'on est en train d'éditer, on reset le form
    const itemToDelete = items[index];
    if (itemToDelete.id && itemToDelete.id === editingCadavreId) {
        resetCadavreForm();
    }
    
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    await saveToRedis(updated);
  };

  // --- LOGIQUE MEME STUDIO (Inchangée) ---
  const handleEditMeme = (meme: any) => { setNewMeme({ name: meme.name, url: meme.url, zones: meme.zones || [] }); setEditingId(meme.id); setIsCreatingMeme(true); };
  const addZone = () => { const id = Date.now(); setNewMeme({ ...newMeme, zones: [...newMeme.zones, { id, top: 10, left: 10, width: 40, height: 15, fontSize: 24, color: '#ffffff' }] }); setSelectedZoneId(id); };
  const updateZone = (id: number | null, fields: Partial<Zone>) => { if (id === null) return; setNewMeme({ ...newMeme, zones: newMeme.zones.map(z => z.id === id ? { ...z, ...fields } : z) }); };
  const handleImageClick = (e: React.MouseEvent) => {
    if (selectedZoneId === null || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const left = ((e.clientX - rect.left) / rect.width) * 100;
    const top = ((e.clientY - rect.top) / rect.height) * 100;
    const zone = newMeme.zones.find(z => z.id === selectedZoneId);
    if (zone) { updateZone(selectedZoneId, { left: Math.max(0, Math.min(left, 100 - zone.width)), top: Math.max(0, Math.min(top, 100 - zone.height)) }); }
  };
  const saveFullMeme = async () => {
    if (!newMeme.url || !newMeme.name || newMeme.zones.length === 0) return alert("Image, nom et zones requis !");
    let updated;
    if (editingId) { updated = items.map(item => item.id === editingId ? { ...newMeme, id: editingId } : item); } else { updated = [{ ...newMeme, id: Date.now() }, ...items]; }
    setItems(updated); await saveToRedis(updated); resetEditor();
  };
  const resetEditor = () => { setIsCreatingMeme(false); setNewMeme({ name: '', url: '', zones: [] }); setEditingId(null); setSelectedZoneId(null); };


  return (
    <main className="min-h-screen bg-gray-50 font-sans pb-10">
      <header className="bg-white border-b px-4 h-16 flex items-center sticky top-0 z-40">
        <Link href="/daily" className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowLeft size={24} className="text-gray-600" /></Link>
        <h1 className="flex-1 text-center font-black uppercase tracking-tighter text-xl text-gray-800 mr-10">Éditeur</h1>
      </header>

      {/* SÉLECTEUR DE JEU */}
      <nav className="bg-white border-b overflow-x-auto py-4 px-6 flex gap-4 sticky top-16 z-30 no-scrollbar shadow-sm">
        {GAMES_CONFIG.map((game) => (
          <button key={game.id} onClick={() => { setSelectedGame(game.id); setIsCreatingMeme(false); }}
            className={`px-6 py-2.5 rounded-full font-black text-sm uppercase tracking-tighter transition-all border-2 whitespace-nowrap
              ${selectedGame === game.id ? `${game.color} text-white border-transparent scale-105 shadow-lg shadow-purple-100` : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}>
            <span>{game.emoji}</span> {game.title}
          </button>
        ))}
      </nav>

      <div className="max-w-md mx-auto p-4 space-y-6">
        
        {/* --- ONGLETS CATÉGORIES (POÈTE) --- */}
        {selectedGame === 'poet' && (
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100 mb-4 overflow-x-auto">
                {POET_CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => setPoetCategory(cat.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap
                        ${poetCategory === cat.id ? 'bg-pink-100 text-pink-600' : 'text-gray-400 hover:bg-gray-50'}`}>
                        {cat.icon} {cat.label}
                    </button>
                ))}
            </div>
        )}

        {/* --- UI SPÉCIFIQUE CADAVRE EXQUIS (CRÉATION & ÉDITION) --- */}
        {selectedGame === 'cadavre' && (
            <div className="space-y-6 animate-in fade-in">
                <section className={`bg-green-50 p-6 rounded-[2.5rem] shadow-xl border ${editingCadavreId ? 'border-green-400 ring-2 ring-green-200' : 'border-green-100'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-green-600">
                            <BookOpen size={16}/>
                            <h2 className="text-[10px] font-black uppercase tracking-widest">
                                {editingCadavreId ? 'Modifier Scénario' : 'Nouveau Scénario'}
                            </h2>
                        </div>
                        {editingCadavreId && (
                            <button onClick={resetCadavreForm} className="text-[10px] font-bold text-green-600 underline flex items-center gap-1">
                                Annuler <X size={12}/>
                            </button>
                        )}
                    </div>
                    
                    <div className="space-y-3">
                        {/* Titre du scénario */}
                        <input className="w-full p-3 rounded-xl font-bold border-none outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
                            placeholder="Titre (ex: Le Polar)" value={cadavreTitle} onChange={e=>setCadavreTitle(e.target.value)}/>
                        
                        {/* Liste des étapes ajoutées */}
                        <div className="space-y-2">
                            {cadavreSteps.map((s, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-white/50 p-2 rounded-lg">
                                    <span className="bg-green-200 text-green-800 text-[10px] font-bold px-2 rounded-full">{idx+1}</span>
                                    <span className="text-xs font-bold flex-1">{s.label}</span>
                                    <span className="text-[10px] italic text-gray-500 max-w-[100px] truncate">{s.placeholder}</span>
                                    <button onClick={()=>setCadavreSteps(cadavreSteps.filter((_,i)=>i!==idx))} className="text-red-400"><Trash2 size={14}/></button>
                                </div>
                            ))}
                        </div>

                        {/* Ajout d'une étape */}
                        <div className="flex gap-2 p-2 bg-white/60 rounded-xl border border-white">
                            <input className="flex-[2] bg-transparent text-xs font-bold outline-none" placeholder="Instruction (ex: Sujet)" value={newStep.label} onChange={e=>setNewStep({...newStep, label:e.target.value})}/>
                            <input className="flex-1 bg-transparent text-xs italic outline-none border-l border-green-100 pl-2" placeholder="Ex: Le chat..." value={newStep.placeholder} onChange={e=>setNewStep({...newStep, placeholder:e.target.value})}/>
                            <button onClick={addCadavreStep} className="bg-green-600 text-white p-1.5 rounded-lg active:scale-90 transition-transform"><Plus size={16}/></button>
                        </div>
                        
                        <button onClick={saveCadavreTemplate} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg mt-2 active:scale-95 transition-all">
                            {editingCadavreId ? 'Mettre à jour le Scénario' : 'Enregistrer le Scénario'}
                        </button>
                    </div>
                </section>
                
                {/* LISTE DES SCÉNARIOS EXISTANTS */}
                <div className="space-y-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">Scénarios existants ({items.length})</p>
                    {items.map((m, i) => (
                        <div 
                            key={i} 
                            onClick={() => handleEditCadavre(m)} // CLIC POUR ÉDITER
                            className={`bg-white p-5 rounded-3xl flex justify-between items-center border shadow-sm animate-in slide-in-from-bottom-2 cursor-pointer active:scale-[0.98] transition-all
                                ${editingCadavreId === m.id ? 'border-green-400 ring-1 ring-green-100 bg-green-50/30' : 'border-gray-50'}`}
                        >
                            <div className="flex flex-col">
                                <span className="font-bold text-gray-800 text-sm">{m.title}</span>
                                <span className="text-[10px] font-bold text-green-500 uppercase mt-1">
                                    {m.steps?.length || 0} étapes
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {editingCadavreId === m.id && <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">Édition</span>}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleDelete(i); }} 
                                    className="text-red-200 hover:text-red-500 p-2"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- UI STANDARD (ZOOM / POÈTE) --- */}
        {(selectedGame === 'zoom' || selectedGame === 'poet') && (
          <div className="space-y-6 animate-in fade-in">
            <section className={`p-6 rounded-[2.5rem] shadow-xl border border-gray-100 ${selectedGame === 'poet' ? 'bg-pink-50' : 'bg-white'}`}>
              <div className={`flex items-center gap-2 mb-4 ${selectedGame === 'poet' ? 'text-pink-600' : 'text-purple-600'}`}>
                {selectedGame === 'poet' ? <Feather size={16} /> : <Sparkles size={16} />}
                <h2 className="text-[10px] font-black uppercase tracking-widest opacity-70">
                    {selectedGame === 'poet' ? `Ajouter : ${POET_CATEGORIES.find(c => c.id === poetCategory)?.label}` : 'Ajouter un élément'}
                </h2>
              </div>
              
              <div className="flex gap-2">
                 {/* Input conditionnel : Structure (Label + Nombre) OU Texte simple */}
                 {selectedGame === 'poet' && poetCategory === 'structures' ? (
                    <div className="flex gap-2 w-full">
                        <input placeholder="Nom (ex: Dizain)" className="flex-1 p-3 rounded-xl outline-none font-bold text-sm shadow-sm"
                            value={structInput.label} onChange={e => setStructInput({...structInput, label: e.target.value})} />
                        <input type="number" placeholder="Lignes" className="w-20 p-3 rounded-xl outline-none font-bold text-sm shadow-sm text-center"
                            value={structInput.lines} onChange={e => setStructInput({...structInput, lines: parseInt(e.target.value)})} />
                    </div>
                 ) : (
                    <input type="text" className="flex-1 bg-white p-4 rounded-2xl outline-none font-bold text-gray-700 shadow-sm focus:ring-2 transition-all"
                        placeholder="Nouveau contenu..." value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddItem()} />
                 )}

                <button onClick={handleAddItem} className={`${selectedGame === 'poet' ? 'bg-pink-600' : 'bg-gray-900'} text-white p-4 rounded-2xl shadow-lg active:scale-90 transition-all`}>
                  <Plus size={24} />
                </button>
              </div>
            </section>
            
            {/* LISTE DES ITEMS */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4">Base de données ({items.length})</p>
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400" /></div>
              ) : (
                items.map((m, i) => (
                  <div key={i} className="bg-white p-5 rounded-3xl flex justify-between items-center border border-gray-50 shadow-sm animate-in slide-in-from-bottom-2">
                    <span className="font-bold text-gray-700 leading-tight">
                        {/* Affichage intelligent : Si objet (Structure) ou String */}
                        {typeof m === 'object' && m.label ? `${m.label} (${m.lines} vers)` : (typeof m === 'string' ? m : JSON.stringify(m))}
                    </span>
                    <button onClick={() => handleDelete(i)} className="text-red-200 hover:text-red-500 transition-colors p-2"><Trash2 size={20} /></button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* --- VUE MEME (VISUELLE) --- */}
        {selectedGame === 'meme' && (
          isCreatingMeme ? (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
              <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-200">
                <div ref={imageRef} onClick={handleImageClick} className="relative aspect-square bg-gray-900 flex items-center justify-center cursor-crosshair overflow-hidden">
                  {newMeme.url ? <img src={newMeme.url} className="w-full h-full object-contain pointer-events-none" /> : <div className="text-white/20 flex flex-col items-center gap-2"><Type size={40} /><p className="text-[10px] font-black uppercase">Colle une URL</p></div>}
                  {newMeme.zones.map((zone, idx) => ( <div key={zone.id} onClick={(e) => { e.stopPropagation(); setSelectedZoneId(zone.id); }} style={{ top: `${zone.top}%`, left: `${zone.left}%`, width: `${zone.width}%`, height: `${zone.height}%`, fontSize: `${zone.fontSize / 2}px`, color: zone.color }} className={`absolute border-2 flex items-center justify-center font-black uppercase transition-all shadow-lg ${selectedZoneId === zone.id ? 'border-blue-500 bg-blue-500/20 z-50' : 'border-white/40 bg-black/20 z-10'}`}><span className="scale-75 text-white">Zone {idx + 1}</span></div> ))}
                </div>
                <div className="p-4 bg-white border-t"><input placeholder="URL Image" className="w-full p-3 bg-gray-50 rounded-xl text-xs outline-none font-bold" value={newMeme.url} onChange={e => setNewMeme({...newMeme, url: e.target.value})} /></div>
              </div>
              <div className="space-y-3">
                {newMeme.zones.map((zone, idx) => ( <div key={zone.id} onClick={() => setSelectedZoneId(zone.id)} className={`bg-white p-4 rounded-2xl border-2 transition-all ${selectedZoneId === zone.id ? 'border-blue-500 shadow-md' : 'border-gray-100 opacity-80'}`}><div className="flex justify-between items-center mb-4"><span className="text-[10px] font-black bg-gray-900 text-white px-2 py-0.5 rounded uppercase">Zone {idx+1}</span>{selectedZoneId === zone.id && <button onClick={(e) => { e.stopPropagation(); setNewMeme({...newMeme, zones: newMeme.zones.filter(z => z.id !== zone.id)}); }} className="text-red-400 p-1"><Trash2 size={16}/></button>}</div>{selectedZoneId === zone.id && (<div className="grid grid-cols-2 gap-4"><input type="range" min="10" max="100" value={zone.fontSize} onChange={e => updateZone(zone.id, { fontSize: parseInt(e.target.value) })} className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer" /><input type="color" value={zone.color} onChange={e => updateZone(zone.id, { color: e.target.value })} className="w-full h-6 cursor-pointer bg-transparent" /></div>)}</div> ))}
                <button onClick={addZone} className="w-full border-2 border-dashed border-gray-300 rounded-2xl py-5 text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em]">Ajouter Zone</button>
              </div>
              <div className="p-6 bg-white rounded-[2rem] shadow-xl space-y-4 border border-gray-100"><input placeholder="Nom du Template" className="w-full p-4 bg-gray-50 rounded-xl font-bold border-none outline-none" value={newMeme.name} onChange={e => setNewMeme({...newMeme, name: e.target.value})} /><div className="flex gap-2"><button onClick={resetEditor} className="flex-1 bg-gray-100 text-gray-500 font-black py-4 rounded-xl uppercase text-xs">Annuler</button><button onClick={saveFullMeme} className="flex-[2] bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 uppercase text-xs tracking-widest">Enregistrer</button></div></div>
            </div>
          ) : (
            <div className="space-y-6"><button onClick={() => { resetEditor(); setIsCreatingMeme(true); }} className="w-full bg-blue-600 text-white font-black py-5 rounded-[2rem] shadow-lg flex items-center justify-center gap-3 uppercase tracking-tighter active:scale-95 transition-all"><Plus size={24} /> Créer un Template Meme</button><div className="grid gap-4 mt-6">{items.map((meme, i) => (<div key={meme.id || i} onClick={() => handleEditMeme(meme)} className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm group relative cursor-pointer"><img src={meme.url} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" /><div className="absolute bottom-0 left-0 right-0 p-5 flex justify-between items-end"><span className="text-white font-black uppercase text-sm">{meme.name}</span><button onClick={(e) => { e.stopPropagation(); handleDelete(i); }} className="bg-red-500 text-white p-2.5 rounded-2xl shadow-lg"><Trash2 size={18} /></button></div></div>))}</div></div>
          )
        )}
      </div>
      <style jsx global>{` .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } `}</style>
    </main>
  );
}