'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, List, Hash, Music, AlignLeft, BookOpen, X, BarChart3, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import MemeTemplatesEditor from '@/features/daily/components/editor/MemeTemplatesEditor';

const GAMES_CONFIG = [
  { id: 'zoom', title: 'Zoom', emoji: '🔍', color: 'bg-purple-500' },
  { id: 'meme', title: 'Meme', emoji: '🎭', color: 'bg-blue-500' },
  { id: 'cadavre', title: 'Cadavre', emoji: '✍️', color: 'bg-green-500' },
  { id: 'poet', title: 'Poète', emoji: '🪶', color: 'bg-pink-500' },
  { id: 'tierlist', title: 'Tier List', emoji: '📊', color: 'bg-orange-500' },
];

const POET_CATEGORIES = [
  { id: 'themes', label: 'Thèmes', icon: <AlignLeft size={14}/> },
  { id: 'structures', label: 'Structures (Vers)', icon: <List size={14}/> },
  { id: 'syllables', label: 'Métrique', icon: <Hash size={14}/> },
  { id: 'rhymes', label: 'Rimes', icon: <Music size={14}/> },
];

export default function EditorPage() {
  const [selectedGame, setSelectedGame] = useState<string>('zoom');
  const [poetCategory, setPoetCategory] = useState<string>('themes'); 
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // États Zoom / Poète simple
  const [inputText, setInputText] = useState('');
  const [structInput, setStructInput] = useState({ label: '', lines: 4 });

  // États Cadavre Exquis
  const [cadavreTitle, setCadavreTitle] = useState('');
  const [cadavreSteps, setCadavreSteps] = useState<{label:string, placeholder:string}[]>([]);
  const [newStep, setNewStep] = useState({ label: '', placeholder: '' });
  const [editingCadavreId, setEditingCadavreId] = useState<string | null>(null);

  // États Tier List
  const [tierTitle, setTierTitle] = useState('');
  const [tierItems, setTierItems] = useState<{url:string, label:string}[]>(Array(5).fill({ url: '', label: '' }));


  const fetchData = async () => {
    setLoading(true);
    try {
      const url = selectedGame === 'poet' 
        ? `/api/editor/missions?gameId=${selectedGame}&category=${poetCategory}`
        : `/api/editor/missions?gameId=${selectedGame}`;
      const res = await fetch(url);
      const data = await res.json();
      setItems(data.missions || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    // Vide la liste pour éviter le crash "Object not valid as React child" pendant la transition
    setItems([]); 
    fetchData();
    
    // Reset forms
    setInputText('');
    setTierTitle('');
    setTierItems(Array(5).fill({ url: '', label: '' }));
    setCadavreTitle('');
    setCadavreSteps([]);
    setEditingCadavreId(null);
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
    if (selectedGame === 'poet' && poetCategory === 'structures') {
        if (!structInput.label) return;
        newItem = { label: structInput.label, lines: parseInt(structInput.lines.toString()) };
        setStructInput({ label: '', lines: 4 });
    } else {
        if (!inputText.trim()) return;
        newItem = inputText.trim();
        setInputText('');
    }
    const updated = [newItem, ...items];
    setItems(updated);
    await saveToRedis(updated);
  };

  const updateTierItem = (index: number, field: 'url'|'label', value: string) => {
    const newItems = [...tierItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setTierItems(newItems);
  };

  const saveTierList = async () => {
    if (!tierTitle || tierItems.some(i => !i.url || !i.label)) return alert("Titre et 5 items complets requis !");
    const newMission = { id: Date.now(), title: tierTitle, items: tierItems.map((item, idx) => ({ ...item, id: idx + 1 })) };
    const updated = [newMission, ...items];
    setItems(updated); await saveToRedis(updated);
    setTierTitle(''); setTierItems(Array(5).fill({ url: '', label: '' }));
  };

  const addCadavreStep = () => { if(!newStep.label) return; setCadavreSteps([...cadavreSteps, newStep]); setNewStep({ label: '', placeholder: '' }); };
  const handleEditCadavre = (scenario: any) => { setCadavreTitle(scenario.title); setCadavreSteps(scenario.steps || []); setEditingCadavreId(scenario.id); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const resetCadavreForm = () => { setCadavreTitle(''); setCadavreSteps([]); setNewStep({ label: '', placeholder: '' }); setEditingCadavreId(null); };
  const saveCadavreTemplate = async () => {
    if(!cadavreTitle || cadavreSteps.length < 2) return alert("Il faut un titre et au moins 2 étapes !");
    let updated;
    if (editingCadavreId) { updated = items.map(item => item.id === editingCadavreId ? { ...item, title: cadavreTitle, steps: cadavreSteps } : item); } 
    else { updated = [{ id: Date.now().toString(), title: cadavreTitle, steps: cadavreSteps }, ...items]; }
    setItems(updated); await saveToRedis(updated); resetCadavreForm();
  };

  const handleDelete = async (index: number) => {
    if(!confirm("Supprimer ?")) return;
    if (selectedGame === 'cadavre' && items[index].id === editingCadavreId) resetCadavreForm();
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    await saveToRedis(updated);
  };

  return (
    <main className="min-h-screen bg-gray-50 font-sans pb-10">
      <header className="bg-white border-b px-4 h-16 flex items-center sticky top-0 z-40">
        <Link href="/daily" className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={24} className="text-gray-600" /></Link>
        <h1 className="flex-1 text-center font-black uppercase tracking-tighter text-xl text-gray-800 mr-10">Éditeur</h1>
      </header>

      <nav className="bg-white border-b overflow-x-auto py-4 px-6 flex gap-4 sticky top-16 z-30 no-scrollbar shadow-sm">
        {GAMES_CONFIG.map((game) => (
          <button key={game.id} onClick={() => { setSelectedGame(game.id); }}
            className={`px-6 py-2.5 rounded-full font-black text-sm uppercase tracking-tighter transition-all border-2 whitespace-nowrap
              ${selectedGame === game.id ? `${game.color} text-white border-transparent scale-105 shadow-lg` : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}>
            <span>{game.emoji}</span> {game.title}
          </button>
        ))}
      </nav>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {selectedGame === 'poet' && (
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100 mb-4 overflow-x-auto">
                {POET_CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => setPoetCategory(cat.id)} className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap ${poetCategory === cat.id ? 'bg-pink-100 text-pink-600' : 'text-gray-400'}`}>
                        {cat.icon} {cat.label}
                    </button>
                ))}
            </div>
        )}

        {/* --- UI TIER LIST --- */}
        {selectedGame === 'tierlist' && (
            <div className="space-y-6 animate-in fade-in">
                <section className="bg-orange-50 p-6 rounded-[2.5rem] shadow-xl border border-orange-100">
                    <div className="flex items-center gap-2 mb-4 text-orange-600"><BarChart3 size={16}/><h2 className="text-[10px] font-black uppercase tracking-widest">Nouvelle Tier List</h2></div>
                    <div className="space-y-4">
                        <input className="w-full p-3 rounded-xl font-bold border-none outline-none focus:ring-2 focus:ring-orange-500 shadow-sm" placeholder="Thème (ex: Les Super-héros)" value={tierTitle} onChange={e=>setTierTitle(e.target.value)}/>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest px-1">Les 5 éléments</p>
                            {tierItems.map((item, idx) => (
                                <div key={idx} className="flex gap-2 bg-white/60 p-2 rounded-xl">
                                    <div className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                                        {item.url ? <img src={item.url} className="w-full h-full object-cover"/> : <ImageIcon size={16} className="text-gray-400"/>}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <input placeholder="Label (ex: Batman)" className="w-full bg-transparent text-xs font-bold outline-none" value={item.label} onChange={e => updateTierItem(idx, 'label', e.target.value)} />
                                        <input placeholder="URL Image" className="w-full bg-transparent text-[10px] text-gray-500 outline-none" value={item.url} onChange={e => updateTierItem(idx, 'url', e.target.value)} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={saveTierList} className="w-full bg-orange-600 text-white font-bold py-3 rounded-xl shadow-lg mt-2 active:scale-95 transition-all">Enregistrer</button>
                    </div>
                </section>
                <div className="space-y-3">{items.map((m, i) => (<div key={i} className="bg-white p-5 rounded-3xl flex justify-between items-center border border-gray-50 shadow-sm"><div className="flex flex-col"><span className="font-bold text-gray-800 text-sm">{m.title}</span><div className="flex -space-x-2 mt-2">{m.items?.map((it:any) => (<img key={it.id} src={it.url} className="w-6 h-6 rounded-full border border-white object-cover" />))}</div></div><button onClick={() => handleDelete(i)} className="text-red-200 hover:text-red-500 p-2"><Trash2 size={20}/></button></div>))}</div>
            </div>
        )}

        {/* --- UI CADAVRE EXQUIS --- */}
        {selectedGame === 'cadavre' && (
            <div className="space-y-6 animate-in fade-in">
                <section className={`bg-green-50 p-6 rounded-[2.5rem] shadow-xl border ${editingCadavreId ? 'border-green-400 ring-2' : 'border-green-100'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-green-600"><BookOpen size={16}/><h2 className="text-[10px] font-black uppercase tracking-widest">{editingCadavreId ? 'Modifier' : 'Nouveau'} Scénario</h2></div>
                        {editingCadavreId && <button onClick={resetCadavreForm}><X size={16} className="text-green-600"/></button>}
                    </div>
                    <div className="space-y-3">
                        <input className="w-full p-3 rounded-xl font-bold border-none outline-none focus:ring-2 focus:ring-green-500" placeholder="Titre" value={cadavreTitle} onChange={e=>setCadavreTitle(e.target.value)}/>
                        <div className="space-y-2">{cadavreSteps.map((s, idx) => (<div key={idx} className="flex items-center gap-2 bg-white/50 p-2 rounded-lg"><span className="bg-green-200 text-green-800 text-[10px] px-2 rounded-full">{idx+1}</span><span className="text-xs font-bold flex-1">{s.label}</span><button onClick={()=>setCadavreSteps(cadavreSteps.filter((_,i)=>i!==idx))} className="text-red-400"><Trash2 size={14}/></button></div>))}</div>
                        <div className="flex gap-2 p-2 bg-white/60 rounded-xl"><input className="flex-[2] bg-transparent text-xs font-bold outline-none" placeholder="Instruction" value={newStep.label} onChange={e=>setNewStep({...newStep, label:e.target.value})}/><input className="flex-1 bg-transparent text-xs italic outline-none" placeholder="Ex..." value={newStep.placeholder} onChange={e=>setNewStep({...newStep, placeholder:e.target.value})}/><button onClick={addCadavreStep} className="bg-green-600 text-white p-1.5 rounded-lg"><Plus size={16}/></button></div>
                        <button onClick={saveCadavreTemplate} className="w-full bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg mt-2">{editingCadavreId ? 'Mettre à jour' : 'Enregistrer'}</button>
                    </div>
                </section>
                <div className="space-y-3">{items.map((m, i) => (<div key={i} onClick={() => handleEditCadavre(m)} className={`bg-white p-5 rounded-3xl flex justify-between items-center border shadow-sm cursor-pointer ${editingCadavreId === m.id ? 'border-green-400 bg-green-50/30' : 'border-gray-50'}`}><div className="flex flex-col"><span className="font-bold text-gray-800 text-sm">{m.title}</span><span className="text-[10px] text-green-500 font-bold uppercase">{m.steps?.length} étapes</span></div><button onClick={(e) => { e.stopPropagation(); handleDelete(i); }} className="text-red-200 hover:text-red-500 p-2"><Trash2 size={20}/></button></div>))}</div>
            </div>
        )}

        {/* --- UI ZOOM & POÈTE (FIXED) --- */}
        {(selectedGame === 'zoom' || selectedGame === 'poet') && (
          <div className="space-y-6 animate-in fade-in">
            <section className={`p-6 rounded-[2.5rem] shadow-xl border border-gray-100 ${selectedGame === 'poet' ? 'bg-pink-50' : 'bg-white'}`}>
                <div className="flex gap-2">
                    {selectedGame === 'poet' && poetCategory === 'structures' ? (<div className="flex gap-2 w-full"><input className="flex-1 p-3 rounded-xl outline-none font-bold text-sm" placeholder="Nom" value={structInput.label} onChange={e=>setStructInput({...structInput, label:e.target.value})}/><input type="number" className="w-20 p-3 rounded-xl outline-none font-bold text-sm text-center" value={structInput.lines} onChange={e=>setStructInput({...structInput, lines:parseInt(e.target.value)})}/></div>) : (<input className="flex-1 bg-white p-4 rounded-2xl outline-none font-bold" placeholder="Nouveau contenu..." value={inputText} onChange={e=>setInputText(e.target.value)}/>)}
                    <button onClick={handleAddItem} className={`${selectedGame === 'poet' ? 'bg-pink-600' : 'bg-gray-900'} text-white p-4 rounded-2xl shadow-lg`}><Plus size={24}/></button>
                </div>
            </section>
            <div className="space-y-3">
            {items.map((m, i) => (
                <div key={i} className="bg-white p-5 rounded-3xl flex justify-between items-center border border-gray-50 shadow-sm">
                    {/* --- C'EST ICI QUE J'AI CORRIGÉ LE CRASH --- */}
                    <span className="font-bold text-gray-700 text-sm">
                        {typeof m === 'object' && m.label 
                            ? `${m.label} (${m.lines} vers)` 
                            : (typeof m === 'string' ? m : null) 
                        }
                    </span>
                    <button onClick={() => handleDelete(i)} className="text-red-200 hover:text-red-500 p-2"><Trash2 size={20}/></button>
                </div>
            ))}
            </div>
          </div>
        )}

        {/* --- UI MEME --- */}
        {selectedGame === 'meme' && (
          <MemeTemplatesEditor
            items={items}
            onDeleteItem={handleDelete}
            onSaveItems={async (nextItems) => {
              setItems(nextItems);
              await saveToRedis(nextItems);
            }}
          />
        )}
      </div>
      <style jsx global>{` .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } `}</style>
    </main>
  );
}
