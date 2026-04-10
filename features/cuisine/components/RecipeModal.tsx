// features/cuisine/components/RecipeModal.tsx
import React, { useState, useRef } from 'react';
import { Camera, X, Clock, Users, Search, Plus, UtensilsCrossed, Save, Loader2, Check, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
import { Recipe, IngredientItem } from '../types';

interface RecipeModalProps {
  recipe: Recipe;
  isPreview?: boolean;
  onClose: () => void;
  onUpdate?: (r: Recipe) => Promise<boolean>;
  onDelete?: (id: string) => void;
  onSmartSave?: (r: Recipe) => void;
  saving?: boolean;
}

const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                resolve(compressedBase64);
            };
        };
        reader.onerror = (error) => reject(error);
    });
};

export default function RecipeModal({ recipe, isPreview = false, onClose, onUpdate, onDelete, onSmartSave, saving = false }: RecipeModalProps) {
    const [isEditing, setIsEditing] = useState(recipe.title === "");
    
    const normalizeIngredients = (ings: any[]) => {
        return ings.map(ing => typeof ing === 'string' ? { quantity: '', name: ing } : ing);
    };

    const [formData, setFormData] = useState<Recipe>({
        ...recipe,
        ingredients: normalizeIngredients(recipe.ingredients || []),
        steps: recipe.steps || []
    });

    const [savingEdit, setSavingEdit] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const toggleEdit = () => {
        if (isEditing) {
            setFormData({
                ...recipe,
                ingredients: normalizeIngredients(recipe.ingredients || []),
                steps: recipe.steps || []
            });
        }
        setIsEditing(!isEditing);
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const compressed = await compressImage(file);
        setFormData({ ...formData, image: compressed });
    };

    const updateIngredient = (index: number, field: 'quantity' | 'name', value: string) => {
        const newIngs = [...(formData.ingredients as IngredientItem[])];
        newIngs[index] = { ...newIngs[index], [field]: value };
        setFormData({ ...formData, ingredients: newIngs });
    };

    const addIngredientLine = () => {
        setFormData({ ...formData, ingredients: [...(formData.ingredients as IngredientItem[]), { quantity: "", name: "" }] });
    };

    const removeIngredientLine = (index: number) => {
        const newIngs = [...(formData.ingredients as IngredientItem[])];
        newIngs.splice(index, 1);
        setFormData({ ...formData, ingredients: newIngs });
    };

    const updateStep = (index: number, value: string) => {
        const newSteps = [...formData.steps];
        newSteps[index] = value;
        setFormData({ ...formData, steps: newSteps });
    };

    const addStepLine = () => {
        setFormData({ ...formData, steps: [...formData.steps, ""] });
    };

    const removeStepLine = (index: number) => {
        const newSteps = [...formData.steps];
        newSteps.splice(index, 1);
        setFormData({ ...formData, steps: newSteps });
    };

    const saveChanges = async () => {
        setSavingEdit(true);
        const cleanIngredients = (formData.ingredients as IngredientItem[]).filter(i => i.name.trim() !== "");
        const cleanSteps = formData.steps.filter(s => s.trim() !== "");
        const updatedRecipe = { ...formData, ingredients: cleanIngredients, steps: cleanSteps };
        
        if (onUpdate) {
            const success = await onUpdate(updatedRecipe);
            if (success) setIsEditing(false);
        }
        setSavingEdit(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[rgba(76,44,128,0.16)] backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white w-full h-[95vh] sm:h-[85vh] sm:w-[600px] sm:rounded-2xl rounded-t-3xl overflow-hidden shadow-2xl border border-[#eee5dc] flex flex-col relative animate-in slide-in-from-bottom-10 duration-300">
                <div className="relative h-48 sm:h-56 w-full shrink-0 bg-[#f6f0eb] group overflow-hidden">
                    {formData.image ? <img src={formData.image} alt="Plat" className="w-full h-full object-cover transition duration-500 hover:scale-105" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500/20 to-slate-800 text-[#ef9a79]/50"><ImageIcon size={48} /></div>}
                    {isEditing && <div className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer" onClick={() => imageInputRef.current?.click()}><div className="flex flex-col items-center text-[#4b3d6d]"><Camera size={32} /><span className="text-xs font-bold mt-2">Changer la photo</span></div><input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageChange} /></div>}
                    <button onClick={onClose} className="absolute top-4 right-4 bg-black/40 text-[#4b3d6d] p-2 rounded-full hover:bg-black/60 transition backdrop-blur-sm border border-white/10 z-10"><X size={20} /></button>
                </div>
                
                <div className="p-4 border-b border-[#eee5dc] flex justify-between items-center bg-white shrink-0">
                    {isEditing ? (
                         <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="bg-[#f6f0eb] border border-[#eee5dc] text-[#4b3d6d] font-bold text-lg rounded px-2 py-1 w-full mr-2 focus:border-orange-500 outline-none" placeholder="Nom de la recette"/>
                    ) : (
                        <h2 className="text-2xl font-black text-[#4b3d6d] truncate pr-4">{formData.title}</h2>
                    )}
                    {!isPreview && !isEditing && (
                        <div className="flex gap-2 shrink-0">
                            <button onClick={() => onDelete?.(recipe.id)} className="p-2 bg-[#f6f0eb] rounded-full hover:bg-red-900/30 text-[#8d82a8] hover:text-red-500 transition border border-transparent hover:border-red-500/30">
                                <Trash2 size={20} />
                            </button>
                            <button onClick={toggleEdit} className="p-2 bg-[#f6f0eb] rounded-full hover:bg-[#f0e7df] text-[#8d82a8] hover:text-[#4b3d6d] shrink-0">
                                <Pencil size={20} />
                            </button>
                        </div>
                    )}
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 pb-24">
                    <div className="flex gap-4 mb-6 text-sm font-medium text-[#6f628f] justify-center">
                        <div className="flex items-center gap-2 bg-[#f6f0eb] border border-[#eee5dc] px-4 py-2 rounded-xl"><Clock size={16} className="text-[#ef9a79]"/> {isEditing ? <input value={formData.prepTime} onChange={e => setFormData({...formData, prepTime: e.target.value})} className="bg-transparent w-20 text-center outline-none border-b border-slate-600 focus:border-orange-500" placeholder="Ex: 10m"/> : (formData.prepTime || "?")}</div>
                        <div className="flex items-center gap-2 bg-[#f6f0eb] border border-[#eee5dc] px-4 py-2 rounded-xl"><Users size={16} className="text-[#ef9a79]"/> {isEditing ? <input value={formData.servings} onChange={e => setFormData({...formData, servings: e.target.value})} className="bg-transparent w-10 text-center outline-none border-b border-slate-600 focus:border-orange-500" placeholder="Ex: 4"/> : (formData.servings || "?")} {!isEditing && " pers."}</div>
                    </div>
                    
                    <div className="mb-8">
                        <h3 className="font-bold text-[#4b3d6d] uppercase tracking-wider text-xs mb-4 flex items-center gap-2"><Search size={14}/> Ingrédients</h3>
                        {isEditing ? (
                            <div className="space-y-2">
                                {(formData.ingredients as IngredientItem[]).map((ing, i) => (
                                    <div key={i} className="flex gap-2 animate-in slide-in-from-left-5">
                                        <input value={ing.quantity} onChange={(e) => updateIngredient(i, 'quantity', e.target.value)} className="w-20 bg-[#f6f0eb] border border-[#eee5dc] rounded px-2 py-2 text-sm text-[#4b3d6d] focus:border-orange-500 outline-none text-right" placeholder="Qté" />
                                        <input value={ing.name} onChange={(e) => updateIngredient(i, 'name', e.target.value)} className="flex-1 bg-[#f6f0eb] border border-[#eee5dc] rounded px-2 py-2 text-sm text-[#4b3d6d] focus:border-orange-500 outline-none" placeholder="Nom de l'ingrédient" />
                                        <button onClick={() => removeIngredientLine(i)} className="p-2 text-[#b9accf] hover:text-red-400 hover:bg-[#f6f0eb] rounded transition"><X size={16}/></button>
                                    </div>
                                ))}
                                <button onClick={addIngredientLine} className="w-full py-2 border border-dashed border-[#eee5dc] text-[#8d82a8] rounded-lg hover:border-orange-500 hover:text-[#ef9a79] transition text-sm font-medium flex items-center justify-center gap-2 mt-2"><Plus size={16}/> Ajouter un ingrédient</button>
                            </div>
                        ) : (
                            <ul className="grid grid-cols-1 gap-2">
                                {(formData.ingredients as IngredientItem[])?.map((ing, i) => (
                                    <li key={i} className="flex items-start gap-3 bg-[#f6f0eb]/50 p-3 rounded-lg border border-[#eee5dc]">
                                        <span className="w-2 h-2 rounded-full bg-[#ef9a79] shrink-0 mt-1.5"></span>
                                        <span className="text-[#6f628f] text-sm leading-relaxed">
                                            {ing.quantity && <span className="font-bold text-[#4b3d6d] mr-1">{ing.quantity}</span>}
                                            {ing.name}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    
                    <div>
                        <h3 className="font-bold text-[#4b3d6d] uppercase tracking-wider text-xs mb-4 flex items-center gap-2"><UtensilsCrossed size={14}/> Préparation</h3>
                        {isEditing ? (
                             <div className="space-y-4">
                                {formData.steps.map((step, i) => (
                                    <div key={i} className="flex gap-3 animate-in slide-in-from-left-5">
                                        <div className="flex flex-col items-center pt-2">
                                            <span className="w-6 h-6 rounded-full bg-[#f0e7df] text-xs flex items-center justify-center font-bold text-[#8d82a8]">{i+1}</span>
                                        </div>
                                        <textarea value={step} onChange={(e) => updateStep(i, e.target.value)} className="flex-1 bg-[#f6f0eb] border border-[#eee5dc] rounded p-3 text-sm text-[#4b3d6d] focus:border-orange-500 outline-none min-h-[80px]" placeholder={`Étape ${i+1}...`} />
                                        <button onClick={() => removeStepLine(i)} className="p-2 h-fit text-[#b9accf] hover:text-red-400 hover:bg-[#f6f0eb] rounded transition mt-2"><X size={16}/></button>
                                    </div>
                                ))}
                                <button onClick={addStepLine} className="w-full py-2 border border-dashed border-[#eee5dc] text-[#8d82a8] rounded-lg hover:border-orange-500 hover:text-[#ef9a79] transition text-sm font-medium flex items-center justify-center gap-2 mt-2"><Plus size={16}/> Ajouter une étape</button>
                             </div>
                        ) : (
                            <div className="space-y-6">
                                {formData.steps?.map((step: string, i: number) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="flex-col flex items-center">
                                            <span className="w-8 h-8 rounded-full bg-[#ef9a79] text-white flex items-center justify-center text-sm font-bold shadow-lg shadow-orange-500/20">{i + 1}</span>
                                            {i !== formData.steps.length - 1 && <div className="w-0.5 h-full bg-[#f6f0eb] mt-2"></div>}
                                        </div>
                                        <p className="text-[#6f628f] text-sm leading-relaxed pt-1 pb-4">{step}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                
                {isPreview && (
                    <div className="absolute bottom-0 w-full p-4 border-t border-[#eee5dc] bg-white flex gap-3">
                        <button onClick={onClose} className="flex-1 py-3 bg-[#f6f0eb] text-[#4b3d6d] rounded-xl font-bold border border-[#eee5dc]">Annuler</button>
                        <button onClick={() => onSmartSave && onSmartSave(formData)} disabled={saving} className="flex-1 py-3 bg-[#ef9a79] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 transition">{saving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} Sauvegarder</button>
                    </div>
                )}
                {isEditing && !isPreview && (
                    <div className="absolute bottom-0 w-full p-4 border-t border-[#eee5dc] bg-white flex gap-3">
                        <button onClick={toggleEdit} className="flex-1 py-3 bg-[#f6f0eb] text-[#4b3d6d] rounded-xl font-bold border border-[#eee5dc]">Annuler</button>
                        <button onClick={saveChanges} disabled={savingEdit} className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-95 transition">{savingEdit ? <Loader2 className="animate-spin"/> : <Check size={18}/>} Valider</button>
                    </div>
                )}
            </div>
        </div>
    );
}
