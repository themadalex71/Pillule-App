// features/cuisine/components/VariantModal.tsx
import React from 'react';
import { X, Link as LinkIcon, Pencil, ArrowLeft, Trash2, Search, Plus } from 'lucide-react';
import { Category } from '../types';

interface VariantModalProps {
    editingMasterIngredient: string;
    setEditingMasterIngredient: (val: string | null) => void;
    aliases: Record<string, string[]>;
    categories: Category[];
    aliasToMove: string | null;
    setAliasToMove: (val: string | null) => void;
    moveSearchTerm: string;
    setMoveSearchTerm: (val: string) => void;
    newAliasInput: string;
    setNewAliasInput: (val: string) => void;
    renameMasterIngredient: () => void;
    removeAliasFromMaster: (alias: string) => void;
    addAliasToMaster: () => void;
    moveAliasToNewMaster: (newMaster: string) => void;
}

export default function VariantModal({
    editingMasterIngredient, setEditingMasterIngredient, aliases, categories,
    aliasToMove, setAliasToMove, moveSearchTerm, setMoveSearchTerm,
    newAliasInput, setNewAliasInput, renameMasterIngredient, removeAliasFromMaster,
    addAliasToMaster, moveAliasToNewMaster
}: VariantModalProps) {
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 w-[95%] max-w-sm rounded-2xl shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden">
                <button onClick={() => { setEditingMasterIngredient(null); setAliasToMove(null); setMoveSearchTerm(""); }} className="absolute top-4 right-4 text-slate-500 hover:text-white z-20 p-2 bg-slate-900/50 rounded-full" >
                    <X size={20}/>
                </button>
                {!aliasToMove ? (
                    <div className="flex flex-col h-full p-6">
                    <div className="flex items-center gap-3 mb-6 shrink-0 pr-8">
                        <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                            <LinkIcon size={24}/>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-xl text-white leading-tight">{editingMasterIngredient}</h3>
                                <button onClick={renameMasterIngredient} className="p-1.5 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition" title="Renommer l'ingrédient" >
                                    <Pencil size={12}/>
                                </button>
                            </div>
                            <p className="text-sm text-slate-400">Gérer les variantes</p>
                        </div>
                    </div>
                    <div className="bg-slate-950 rounded-xl border border-slate-800 flex-1 overflow-y-auto min-h-0 mb-4 p-2">
                        {(aliases[editingMasterIngredient] || []).length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-60">
                                <LinkIcon size={32} className="mb-2"/>
                                <p className="text-sm italic">Aucune variante associée.</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-500 uppercase px-2 py-1 sticky top-0 bg-slate-950 z-10">Liés à {editingMasterIngredient}</p>
                                {(aliases[editingMasterIngredient] || []).map(alias => (
                                    <div key={alias} className="flex items-center justify-between bg-slate-900 text-slate-200 text-sm px-3 py-3 rounded-lg border border-slate-800 group hover:border-slate-600 transition">
                                        <span className="font-medium truncate">{alias}</span>
                                        <div className="flex gap-1 shrink-0">
                                            <button onClick={() => setAliasToMove(alias)} className="p-2 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition" title="Déplacer">
                                                <ArrowLeft size={16} className="rotate-180"/>
                                            </button>
                                            <button onClick={() => removeAliasFromMaster(alias)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition" title="Détacher">
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <input type="text" placeholder="Ajouter une variante..." value={newAliasInput} onChange={(e) => setNewAliasInput(e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none shadow-inner" />
                        <button onClick={addAliasToMaster} disabled={!newAliasInput.trim()} className="bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-500 disabled:opacity-50 font-bold"><Plus size={20}/></button>
                    </div>
                    </div>
                ) : (
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="p-6 pb-2 shrink-0 bg-slate-900 z-10 shadow-xl border-b border-slate-800">
                            <button onClick={() => { setAliasToMove(null); setMoveSearchTerm(""); }} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-bold mb-4 transition">
                                <ArrowLeft size={16}/> Retour
                            </button>
                            <h3 className="font-bold text-lg text-white mb-1">Où déplacer &quot;{aliasToMove}&quot; ?</h3>
                            <p className="text-xs text-slate-400 mb-4">Choisis le nouvel ingrédient principal.</p>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16}/>
                                <input type="text" autoFocus placeholder="Chercher un ingrédient..." value={moveSearchTerm} onChange={(e) => setMoveSearchTerm(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-9 pr-4 text-sm text-white focus:border-blue-500 outline-none" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900">
                            {categories.map((cat, idx) => {
                                const filteredItems = cat.items
                                .filter(i => i !== editingMasterIngredient) 
                                .filter(i => i.toLowerCase().includes(moveSearchTerm.toLowerCase()))
                                .sort();
                                if (filteredItems.length === 0) return null;
                                return (
                                    <div key={idx} className="animate-in slide-in-from-bottom-2">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 ml-1">{cat.name}</h4>
                                        <div className="grid grid-cols-1 gap-1">
                                            {filteredItems.map(item => (
                                                <button key={item} onClick={() => { moveAliasToNewMaster(item); setMoveSearchTerm(""); }} className="w-full text-left px-4 py-3 rounded-xl bg-slate-800 hover:bg-blue-600 hover:text-white border border-slate-700/50 hover:border-blue-500 transition text-sm flex items-center justify-between group" >
                                                    <span className="font-medium">{item}</span>
                                                    <div className="bg-slate-900/50 group-hover:bg-white/20 p-1 rounded-full transition">
                                                    <ArrowLeft size={14} className="rotate-180 text-slate-500 group-hover:text-white"/>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                            {categories.every(cat => cat.items.filter(i => i.toLowerCase().includes(moveSearchTerm.toLowerCase()) && i !== editingMasterIngredient).length === 0) && (
                                <div className="text-center py-10 opacity-50">
                                    <p>Aucun ingrédient trouvé.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}