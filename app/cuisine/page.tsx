"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera, ChefHat, Loader2, Clock, Users, Save, BookOpen, Search, X, UtensilsCrossed, Pencil, Check, Image as ImageIcon, Refrigerator, Sparkles, Plus, FolderPlus, Tag, Trash2, Link as LinkIcon, HelpCircle, FileText, Instagram, Edit3 } from 'lucide-react';

// --- TYPES ---
interface IngredientItem {
    quantity: string;
    name: string;
}

interface Recipe {
    id: string;
    title: string;
    prepTime: string;
    cookTime: string;
    servings: string;
    ingredients: (IngredientItem | string)[]; 
    steps: string[];
    addedBy: string;
    image?: string;
}

interface Category {
    name: string;
    items: string[];
}

// --- CONFIGURATION PAR DÉFAUT ---
const INITIAL_CATEGORIES: Category[] = [
    { name: "🥦 Légumes & Fruits", items: ["Tomate", "Oignon", "Ail", "Pomme de terre", "Carotte", "Courgette", "Poivron", "Champignon", "Épinard", "Haricot vert", "Brocoli", "Chou-fleur", "Concombre", "Avocat", "Citron", "Salade"] },
    { name: "🥩 Viandes & Poissons", items: ["Poulet", "Boeuf", "Porc", "Jambon", "Lardon", "Saucisse", "Dinde", "Canard", "Thon", "Saumon", "Crevette", "Cabillaud", "Sardine"] },
    { name: "🧀 Crèmerie & Oeufs", items: ["Oeuf", "Lait", "Beurre", "Crème fraîche", "Yaourt", "Fromage râpé", "Mozzarella", "Parmesan", "Chèvre", "Feta", "Cheddar"] },
    { name: "🍝 Féculents & Base", items: ["Pâtes", "Riz", "Semoule", "Pain", "Farine", "Maïzena", "Lentilles", "Pois chiches", "Haricots rouges", "Pâte feuilletée", "Pâte brisée"] },
    { name: "🥫 Épicerie & Assaisonnement", items: ["Huile d'olive", "Vinaigre", "Sauce soja", "Moutarde", "Mayonnaise", "Ketchup", "Coulis de tomate", "Lait de coco", "Miel", "Sucre", "Chocolat", "Levure", "Noix", "Amandes"] }
];

export default function CuisinePage() {
  // --- ETATS PRINCIPAUX ---
  const [activeTab, setActiveTab] = useState<'scan' | 'book' | 'fridge'>('scan');
  
  // SCANNER & IMPORT
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scannedRecipe, setScannedRecipe] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false); 
  const [importText, setImportText] = useState("");

  // DONNÉES GLOBALES
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [aliases, setAliases] = useState<Record<string, string[]>>({});
  const [loadingData, setLoadingData] = useState(true);

  // FRIGO
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [newIngredientInput, setNewIngredientInput] = useState("");
  const [fridgeResults, setFridgeResults] = useState<{ recipe: Recipe, matchCount: number, missing: number }[]>([]);
  const [hasSearchedFridge, setHasSearchedFridge] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);

  // RÉSOLUTION INCONNUS
  const [unknownQueue, setUnknownQueue] = useState<IngredientItem[]>([]); 
  const [currentUnknown, setCurrentUnknown] = useState<IngredientItem | null>(null);
  const [cleanNameInput, setCleanNameInput] = useState(""); 
  const [pendingRecipeToSave, setPendingRecipeToSave] = useState<any>(null);
  const [resolveType, setResolveType] = useState<'alias' | 'new' | null>(null);

  // CRÉATION DE GROUPE (NOUVEAU ✨)
  const [isCreatingMaster, setIsCreatingMaster] = useState(false);
  const [newMasterName, setNewMasterName] = useState("");

  // MODALES UI
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [pendingIngredient, setPendingIngredient] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // LIVRE RECETTES
  const [myRecipes, setMyRecipes] = useState<Recipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'az'>('newest');

  // --- 1. CHARGEMENT DONNÉES ---
  useEffect(() => {
      fetchRecipes();
      fetchCategoriesAndAliases();
  }, []);

  useEffect(() => {
      if (currentUnknown) {
          setCleanNameInput(currentUnknown.name); 
      }
  }, [currentUnknown]);

  const fetchRecipes = async () => {
      setLoadingRecipes(true);
      try {
          const res = await fetch('/api/cuisine/get-recipes');
          const data = await res.json();
          if (Array.isArray(data)) setMyRecipes(data);
      } catch (e) { console.error(e); } finally { setLoadingRecipes(false); }
  };

  const fetchCategoriesAndAliases = async () => {
      setLoadingData(true);
      try {
          const [catRes, aliasRes] = await Promise.all([
              fetch('/api/cuisine/get-categories'),
              fetch('/api/cuisine/get-aliases')
          ]);
          const catData = await catRes.json();
          const aliasData = await aliasRes.json();
          if (Array.isArray(catData)) setCategories(catData);
          if (aliasData) setAliases(aliasData);
      } catch (e) { console.error(e); } finally { setLoadingData(false); }
  };

  const saveCategoriesToDb = async (newCategories: Category[]) => {
      setCategories(newCategories);
      await fetch('/api/cuisine/save-categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categories: newCategories }),
      });
  };

  const saveAliasesToDb = async (newAliases: Record<string, string[]>) => {
      setAliases(newAliases);
      await fetch('/api/cuisine/save-aliases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aliases: newAliases }),
      });
  };

  // --- 2. LOGIQUE FRIGO & RECHERCHE ---
  const filteredBookRecipes = myRecipes
    .filter(recipe => {
        if (recipe.title.toLowerCase().includes(searchTerm.toLowerCase())) return true;
        return recipe.ingredients.some(ing => {
            if (typeof ing === 'string') return ing.toLowerCase().includes(searchTerm.toLowerCase());
            return ing.name.toLowerCase().includes(searchTerm.toLowerCase());
        });
    })
    .sort((a, b) => {
        if (sortBy === 'newest') return b.id.localeCompare(a.id);
        if (sortBy === 'oldest') return a.id.localeCompare(b.id);
        if (sortBy === 'az') return a.title.localeCompare(b.title);
        return 0;
    });

  const searchFridgeRecipes = () => {
      if (selectedIngredients.length === 0) {
          setFridgeResults([]);
          return;
      }
      const results = myRecipes.map(recipe => {
          let matchCount = 0;
          selectedIngredients.forEach(selIng => {
              const aliasesList = aliases[selIng] || [];
              const termsToCheck = [selIng, ...aliasesList];
              const found = recipe.ingredients.some(recipeIng => {
                  if (typeof recipeIng === 'string') {
                       return termsToCheck.some(term => recipeIng.toLowerCase().includes(term.toLowerCase()));
                  }
                  return termsToCheck.some(term => recipeIng.name.toLowerCase().includes(term.toLowerCase()));
              });
              if (found) matchCount++;
          });
          return { recipe, matchCount, missing: selectedIngredients.length - matchCount };
      });
      const sortedResults = results.filter(r => r.matchCount > 0).sort((a, b) => b.matchCount - a.matchCount);
      setFridgeResults(sortedResults);
      setHasSearchedFridge(true);
  };

  const toggleIngredient = (ing: string) => {
      if (isDeleteMode) return;
      if (selectedIngredients.includes(ing)) {
          setSelectedIngredients(prev => prev.filter(i => i !== ing));
      } else {
          setSelectedIngredients(prev => [...prev, ing]);
      }
  };

  const deleteIngredient = (ingToDelete: string) => {
      if(!window.confirm(`Veux-tu vraiment supprimer "${ingToDelete}" de la liste ?`)) return;
      const newCategories = categories.map(cat => ({
          ...cat,
          items: cat.items.filter(item => item !== ingToDelete)
      }));
      saveCategoriesToDb(newCategories);
      setSelectedIngredients(prev => prev.filter(i => i !== ingToDelete));
  };

  const initiateAddIngredient = () => {
      const ing = newIngredientInput.trim();
      if (!ing) return;
      let exists = false;
      categories.forEach(cat => { if (cat.items.some(i => i.toLowerCase() === ing.toLowerCase())) exists = true; });
      if (exists) {
          if (!selectedIngredients.includes(ing)) setSelectedIngredients(prev => [...prev, ing]);
          setNewIngredientInput("");
          alert(`"${ing}" est déjà dans la liste ! Je l'ai sélectionné.`);
      } else {
          setPendingIngredient(ing);
          setIsCategoryModalOpen(true);
      }
  };

  const resetFridge = () => {
      setSelectedIngredients([]);
      setFridgeResults([]);
      setHasSearchedFridge(false);
  };

  // --- 3. LOGIQUE RÉSOLUTION & SAUVEGARDE INTELLIGENTE ---

  const updateCurrentRecipeIngredientName = (oldName: string, newName: string) => {
      if(!pendingRecipeToSave) return;
      const updatedIngredients = pendingRecipeToSave.ingredients.map((ing: IngredientItem) => {
          if (ing.name === oldName) return { ...ing, name: newName };
          return ing;
      });
      setPendingRecipeToSave({ ...pendingRecipeToSave, ingredients: updatedIngredients });
  };

  const addToCategory = (categoryName: string) => {
      // Cas A: Ajout manuel
      if (pendingIngredient && isCategoryModalOpen) {
          const newCategories = categories.map(cat => {
              if (cat.name === categoryName) return { ...cat, items: [...cat.items, pendingIngredient] };
              return cat;
          });
          saveCategoriesToDb(newCategories);
          setSelectedIngredients(prev => [...prev, pendingIngredient]);
          setPendingIngredient(null);
          setNewIngredientInput("");
          setIsCategoryModalOpen(false);
          return;
      }
      
      // Cas B: Résolution Inconnu + Apprentissage
      if (currentUnknown) {
          const finalName = cleanNameInput.trim(); 
          if (!finalName) return;

          const newCategories = categories.map(cat => {
              if (cat.name === categoryName) return { ...cat, items: [...cat.items, finalName] };
              return cat;
          });
          saveCategoriesToDb(newCategories);
          
          if (finalName.toLowerCase() !== currentUnknown.name.toLowerCase()) {
              const newAliases = { ...aliases };
              if (!newAliases[finalName]) newAliases[finalName] = [];
              if (!newAliases[finalName].includes(currentUnknown.name)) {
                  newAliases[finalName].push(currentUnknown.name);
              }
              saveAliasesToDb(newAliases);
          }

          updateCurrentRecipeIngredientName(currentUnknown.name, finalName);
          processNextUnknown();
      }
  };

  const createCategoryAndAdd = () => {
      const targetIng = pendingIngredient || cleanNameInput.trim();
      if (!targetIng || !newCategoryName.trim()) return;
      
      const newCat = { name: newCategoryName.trim(), items: [targetIng] };
      const newCategories = [...categories, newCat];
      saveCategoriesToDb(newCategories);
      
      if (pendingIngredient) {
          setSelectedIngredients(prev => [...prev, pendingIngredient]);
          setPendingIngredient(null);
          setNewIngredientInput("");
          setIsCategoryModalOpen(false);
      } else {
           if (currentUnknown && targetIng.toLowerCase() !== currentUnknown.name.toLowerCase()) {
              const newAliases = { ...aliases };
              if (!newAliases[targetIng]) newAliases[targetIng] = [];
              if (!newAliases[targetIng].includes(currentUnknown.name)) {
                  newAliases[targetIng].push(currentUnknown.name);
              }
              saveAliasesToDb(newAliases);
           }
           if (currentUnknown) updateCurrentRecipeIngredientName(currentUnknown.name, targetIng);
           processNextUnknown();
      }
  };

  const linkAsAlias = (masterIngredient: string) => {
      if (!currentUnknown) return;
      const finalName = cleanNameInput.trim(); 
      if (!finalName) return;

      const newAliases = { ...aliases };
      if (!newAliases[masterIngredient]) newAliases[masterIngredient] = [];
      if (!newAliases[masterIngredient].includes(finalName)) {
          newAliases[masterIngredient].push(finalName);
      }
      saveAliasesToDb(newAliases);
      
      updateCurrentRecipeIngredientName(currentUnknown.name, finalName);
      processNextUnknown();
  };

  // NOUVEAU : CRÉER UN GROUPE PARENT (Ex: Épices) ✨
  const createMasterAndLink = (categoryName: string) => {
      const masterName = newMasterName.trim();
      const aliasName = currentUnknown?.name;

      if (!masterName || !aliasName || !currentUnknown) return;

      const newCategories = categories.map(cat => {
          if (cat.name === categoryName) return { ...cat, items: [...cat.items, masterName] };
          return cat;
      });
      saveCategoriesToDb(newCategories);

      const newAliases = { ...aliases };
      if (!newAliases[masterName]) newAliases[masterName] = [];
      if (!newAliases[masterName].includes(aliasName)) {
          newAliases[masterName].push(aliasName);
      }
      const cleanedName = cleanNameInput.trim();
      if(cleanedName && cleanedName !== masterName && !newAliases[masterName].includes(cleanedName)) {
           newAliases[masterName].push(cleanedName);
      }
      saveAliasesToDb(newAliases);

      updateCurrentRecipeIngredientName(currentUnknown.name, masterName);
      setIsCreatingMaster(false);
      setNewMasterName("");
      processNextUnknown();
  };

  const handleSmartSave = async (recipe: any) => {
      setPendingRecipeToSave(recipe);
      setSaving(true);
      const unknowns: IngredientItem[] = [];

      if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
          recipe.ingredients.forEach((ing: any) => {
              let ingredientName = "";
              if (typeof ing === 'string') {
                  ingredientName = ing;
              } else if (ing && ing.name) {
                  ingredientName = ing.name;
              }
              if (!ingredientName) return;

              const lowerName = ingredientName.toLowerCase();
              let found = false;
              categories.forEach(cat => { if (cat.items.some(item => lowerName.includes(item.toLowerCase()))) found = true; });
              if (!found) {
                  Object.entries(aliases).forEach(([key, values]) => {
                      if (lowerName.includes(key.toLowerCase())) found = true;
                      if (values.some(v => lowerName.includes(v.toLowerCase()))) found = true;
                  });
              }
              if (!found) {
                  if (typeof ing === 'string') {
                      unknowns.push({ name: ing, quantity: "" });
                  } else {
                      unknowns.push(ing);
                  }
              }
          });
      }

      if (unknowns.length > 0) {
          setUnknownQueue(unknowns);
          setCurrentUnknown(unknowns[0]);
          setScannedRecipe(null); 
          setResolveType(null);
      } else {
          await executeSave(recipe);
      }
  };

  const processNextUnknown = () => {
      setCleanNameInput(""); 
      const remaining = unknownQueue.slice(1);
      if (remaining.length > 0) {
          setUnknownQueue(remaining);
          setCurrentUnknown(remaining[0]);
          setResolveType(null);
      } else {
          setUnknownQueue([]);
          setCurrentUnknown(null);
          executeSave(pendingRecipeToSave);
      }
  };

  const skipUnknown = () => { processNextUnknown(); };

  const executeSave = async (recipe: any) => {
      try {
          await fetch('/api/cuisine/save', {
              method: 'POST',
              body: JSON.stringify({ recipe, userId: 'Alex' })
          });
          alert("Recette sauvegardée !");
          setPendingRecipeToSave(null);
          setScannedRecipe(null);
          setActiveTab('book');
          fetchRecipes();
      } catch (e) { alert("Erreur sauvegarde"); } finally { setSaving(false); }
  };

  // --- 4. SCAN & IMPORT ---
  const handleScanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setAnalyzing(true);
    setScannedRecipe(null);
    try {
      const promises = Array.from(files).map(file => {
          return new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = () => resolve(reader.result as string);
          });
      });
      const imagesBase64 = await Promise.all(promises);
      const res = await fetch('/api/cuisine/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagesBase64 }),
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else setScannedRecipe(data);
    } catch (error) { alert("Erreur analyse"); } finally { setAnalyzing(false); }
  };

  const handleTextImport = async () => {
      if (!importText.trim()) return;
      setAnalyzing(true);
      setScannedRecipe(null);
      setIsImportModalOpen(false);
      try {
          const res = await fetch('/api/cuisine/import-text', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: importText }),
          });
          const data = await res.json();
          if (data.error) alert(data.error);
          else setScannedRecipe(data);
          setImportText("");
      } catch (error) { alert("Erreur importation"); } finally { setAnalyzing(false); }
  };

  const handleUpdateRecipe = async (updatedRecipe: Recipe) => {
    try {
        await fetch('/api/cuisine/update', {
            method: 'POST',
            body: JSON.stringify({ recipe: updatedRecipe })
        });
        setMyRecipes(prev => prev.map(r => r.id === updatedRecipe.id ? updatedRecipe : r));
        setSelectedRecipe(updatedRecipe);
        return true;
    } catch (e) { alert("Erreur modification"); return false; }
  };

  const deleteRecipe = async (id: string) => {
    if(!window.confirm("Tu es sûr de vouloir supprimer cette recette ? C'est définitif ! 🗑️")) return;
    
    try {
        await fetch('/api/cuisine/delete-recipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        
        // Mise à jour immédiate de l'affichage (pas besoin de recharger)
        setMyRecipes(prev => prev.filter(r => r.id !== id));
        // Si on est dans le frigo, on met à jour les résultats aussi
        setFridgeResults(prev => prev.filter(item => item.recipe.id !== id));
        
        setSelectedRecipe(null); // On ferme la fiche recette
    } catch(e) {
        alert("Erreur lors de la suppression");
    }
};

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

  // --- 5. COMPOSANT FICHE RECETTE ---
  const RecipeCardFull = ({ recipe, isPreview = false, onClose, onUpdate, onDelete }: { recipe: any, isPreview?: boolean, onClose: () => void, onUpdate?: (r: Recipe) => Promise<boolean>, onDelete?: (id: string) => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Recipe>(recipe);
    const [savingEdit, setSavingEdit] = useState(false);
    
    const initialIngText = recipe.ingredients?.map((i: any) => typeof i === 'string' ? i : `${i.quantity ? i.quantity + ' ' : ''}${i.name}`).join('\n') || "";
    
    const [ingredientsText, setIngredientsText] = useState(initialIngText);
    const [stepsText, setStepsText] = useState(recipe.steps?.join('\n') || "");
    const imageInputRef = useRef<HTMLInputElement>(null);

    const toggleEdit = () => {
        if (isEditing) {
            setFormData(recipe);
            setIngredientsText(initialIngText);
            setStepsText(recipe.steps?.join('\n') || "");
        }
        setIsEditing(!isEditing);
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const compressed = await compressImage(file);
        setFormData({ ...formData, image: compressed });
    };

    const saveChanges = async () => {
        setSavingEdit(true);
        const newIngredients = ingredientsText.split('\n').filter((line: string) => line.trim() !== "").map((line: string) => {
             return { quantity: "", name: line }; 
        });
        const updatedRecipe = {
            ...formData,
            ingredients: newIngredients,
            steps: stepsText.split('\n').filter((line: string) => line.trim() !== "")
        };
        if (onUpdate) {
            const success = await onUpdate(updatedRecipe);
            if (success) setIsEditing(false);
        }
        setSavingEdit(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 w-full h-[95vh] sm:h-[85vh] sm:w-[600px] sm:rounded-2xl rounded-t-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col relative animate-in slide-in-from-bottom-10 duration-300">
                <div className="relative h-48 sm:h-56 w-full shrink-0 bg-slate-800 group overflow-hidden">
                    {formData.image ? <img src={formData.image} alt="Plat" className="w-full h-full object-cover transition duration-500 hover:scale-105" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500/20 to-slate-800 text-orange-500/50"><ImageIcon size={48} /></div>}
                    {isEditing && <div className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer" onClick={() => imageInputRef.current?.click()}><div className="flex flex-col items-center text-white"><Camera size={32} /><span className="text-xs font-bold mt-2">Changer la photo</span></div><input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageChange} /></div>}
                    <button onClick={onClose} className="absolute top-4 right-4 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition backdrop-blur-sm border border-white/10 z-10"><X size={20} /></button>
                </div>
                
                {/* --- MODIFICATION ICI : Entête avec bouton supprimer --- */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 shrink-0">
                    {isEditing ? (
                         <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="bg-slate-800 border border-slate-700 text-white font-bold text-lg rounded px-2 py-1 w-full mr-2 focus:border-orange-500 outline-none"/>
                    ) : (
                        <h2 className="text-2xl font-black text-white truncate pr-4">{formData.title}</h2>
                    )}
                    {!isPreview && !isEditing && (
                        <div className="flex gap-2 shrink-0">
                            {/* BOUTON POUBELLE AJOUTÉ 👇 */}
                            <button onClick={() => onDelete?.(recipe.id)} className="p-2 bg-slate-800 rounded-full hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition border border-transparent hover:border-red-500/30">
                                <Trash2 size={20} />
                            </button>
                            <button onClick={toggleEdit} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white shrink-0">
                                <Pencil size={20} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="p-6 overflow-y-auto flex-1 pb-24">
                    <div className="flex gap-4 mb-6 text-sm font-medium text-slate-300 justify-center">
                        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl"><Clock size={16} className="text-orange-500"/> {isEditing ? <input value={formData.prepTime} onChange={e => setFormData({...formData, prepTime: e.target.value})} className="bg-transparent w-20 text-center outline-none border-b border-slate-600 focus:border-orange-500"/> : (formData.prepTime || "?")}</div>
                        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl"><Users size={16} className="text-orange-500"/> {isEditing ? <input value={formData.servings} onChange={e => setFormData({...formData, servings: e.target.value})} className="bg-transparent w-10 text-center outline-none border-b border-slate-600 focus:border-orange-500"/> : (formData.servings || "?")} {!isEditing && " pers."}</div>
                    </div>
                    <div className="mb-8">
                        <h3 className="font-bold text-white uppercase tracking-wider text-xs mb-4 flex items-center gap-2"><Search size={14}/> Ingrédients</h3>
                        {isEditing ? (
                            <textarea value={ingredientsText} onChange={e => setIngredientsText(e.target.value)} className="w-full h-40 bg-slate-800 text-slate-300 p-3 rounded-lg border border-slate-700 text-sm focus:border-orange-500 outline-none leading-relaxed" placeholder="Un ingrédient par ligne..."/>
                        ) : (
                            <ul className="grid grid-cols-1 gap-2">
                                {formData.ingredients?.map((ing: any, i: number) => {
                                    const isObj = typeof ing !== 'string';
                                    const quantity = isObj ? ing.quantity : "";
                                    const name = isObj ? ing.name : ing;
                                    return (
                                        <li key={i} className="flex items-start gap-3 bg-slate-800/50 p-3 rounded-lg border border-slate-800">
                                            <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-1.5"></span>
                                            <span className="text-slate-300 text-sm leading-relaxed">
                                                {quantity && <span className="font-bold text-white mr-1">{quantity}</span>}
                                                {name}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-white uppercase tracking-wider text-xs mb-4 flex items-center gap-2"><UtensilsCrossed size={14}/> Préparation</h3>
                        {isEditing ? <textarea value={stepsText} onChange={e => setStepsText(e.target.value)} className="w-full h-60 bg-slate-800 text-slate-300 p-3 rounded-lg border border-slate-700 text-sm focus:border-orange-500 outline-none leading-relaxed" placeholder="Une étape par ligne..."/> : (
                            <div className="space-y-6">{formData.steps?.map((step: string, i: number) => (<div key={i} className="flex gap-4"><div className="flex-col flex items-center"><span className="w-8 h-8 rounded-full bg-orange-500 text-slate-900 flex items-center justify-center text-sm font-bold shadow-lg shadow-orange-500/20">{i + 1}</span>{i !== formData.steps.length - 1 && <div className="w-0.5 h-full bg-slate-800 mt-2"></div>}</div><p className="text-slate-300 text-sm leading-relaxed pt-1 pb-4">{step}</p></div>))}</div>
                        )}
                    </div>
                </div>
                {isPreview && (<div className="absolute bottom-0 w-full p-4 border-t border-slate-800 bg-slate-900 flex gap-3"><button onClick={onClose} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold border border-slate-700">Annuler</button><button onClick={() => handleSmartSave(formData)} disabled={saving} className="flex-1 py-3 bg-orange-500 text-slate-900 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 transition">{saving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} Sauvegarder</button></div>)}
                {isEditing && !isPreview && (<div className="absolute bottom-0 w-full p-4 border-t border-slate-800 bg-slate-900 flex gap-3"><button onClick={toggleEdit} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold border border-slate-700">Annuler</button><button onClick={saveChanges} disabled={savingEdit} className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-95 transition">{savingEdit ? <Loader2 className="animate-spin"/> : <Check size={18}/>} Valider</button></div>)}
            </div>
        </div>
    );
  };

  // --- RENDU UI PRINCIPAL ---
  return (
    <main className="min-h-screen bg-slate-900 text-white pb-20">
      <div className="p-4 flex items-center justify-between bg-slate-900 sticky top-0 z-10 border-b border-slate-800">
        <Link href="/" className="text-slate-400 hover:text-white transition"><ArrowLeft /></Link>
        <h1 className="text-xl font-bold flex items-center gap-2 text-orange-500"><ChefHat /> Cuistot</h1>
        <div className="w-6"></div> 
      </div>

      <div className="p-4">
          <div className="flex bg-slate-800 p-1 rounded-xl">
              <button onClick={() => setActiveTab('scan')} className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition flex items-center justify-center gap-2 ${activeTab === 'scan' ? 'bg-orange-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}><Camera size={16} /> Scan</button>
              <button onClick={() => setActiveTab('fridge')} className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition flex items-center justify-center gap-2 ${activeTab === 'fridge' ? 'bg-orange-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}><Refrigerator size={16} /> Frigo</button>
              <button onClick={() => setActiveTab('book')} className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition flex items-center justify-center gap-2 ${activeTab === 'book' ? 'bg-orange-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}><BookOpen size={16} /> Livre</button>
          </div>
      </div>

      {activeTab === 'scan' && (
        <div className="p-4 flex flex-col items-center justify-center min-h-[50vh] gap-6 animate-in fade-in">
            <div className="bg-slate-800 p-8 rounded-full border-4 border-slate-700 shadow-xl relative">
                <ChefHat size={64} className="text-orange-500" />
                <div className="absolute -bottom-2 -right-2 bg-slate-700 p-2 rounded-full border border-slate-600"><Camera size={20} className="text-white"/></div>
            </div>
            <div className="text-center w-full max-w-sm">
                <h2 className="text-xl font-bold mb-2">Ajouter une recette</h2>
                <p className="text-slate-400 text-sm mb-6">Scan une photo OU colle un texte d&apos;Insta/TikTok.</p>
                <div className="flex flex-col gap-3">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleScanUpload} />
                    <button onClick={() => fileInputRef.current?.click()} disabled={analyzing} className="bg-orange-500 text-white w-full py-4 rounded-xl font-bold shadow-lg shadow-orange-500/20 active:scale-95 transition flex items-center justify-center gap-2">{analyzing ? <Loader2 className="animate-spin" /> : <Camera />} Scanner Photos</button>
                    <button onClick={() => setIsImportModalOpen(true)} disabled={analyzing} className="bg-slate-700 text-white w-full py-4 rounded-xl font-bold hover:bg-slate-600 active:scale-95 transition flex items-center justify-center gap-2"><Instagram size={20} className="text-pink-400"/> Importer Texte / Insta</button>
                </div>
            </div>
        </div>
      )}

      {/* FRIGO */}
      {activeTab === 'fridge' && (
        <div className="px-4 pb-20 animate-in slide-in-from-right-10 duration-300">
            {!hasSearchedFridge ? (
                <>
                    <div className="text-center py-6">
                         <h2 className="text-xl font-bold mb-2">Qu&apos;est-ce que tu as ?</h2>
                         <p className="text-slate-400 text-xs">Sélectionne tes ingrédients ou ajoutes-en un.</p>
                    </div>
                    <div className="flex gap-2 mb-8 max-w-md mx-auto relative z-0 items-center">
                        <input type="text" placeholder="Ajouter un ingrédient..." value={newIngredientInput} onChange={(e) => setNewIngredientInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && initiateAddIngredient()} disabled={isDeleteMode} className={`flex-1 bg-slate-800 border ${isDeleteMode ? 'border-red-900 opacity-50' : 'border-slate-700'} rounded-lg px-4 py-2 text-sm text-white focus:border-orange-500 outline-none transition`}/>
                        <button onClick={initiateAddIngredient} disabled={isDeleteMode} className={`px-3 py-2 rounded-lg text-white transition ${isDeleteMode ? 'bg-slate-800 opacity-50' : 'bg-slate-700 hover:bg-slate-600'}`}><Plus size={20}/></button>
                        <div className="w-[1px] h-8 bg-slate-700 mx-1"></div>
                        <button onClick={() => setIsDeleteMode(!isDeleteMode)} className={`p-2 rounded-lg transition border ${isDeleteMode ? 'bg-red-500 text-white border-red-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}><Trash2 size={20}/></button>
                    </div>
                    {loadingData ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-orange-500" /></div> : (
                        <div className="space-y-6 mb-24">
                            {categories.map((category, idx) => (
                                <div key={idx}>
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">{category.name.startsWith("✨") ? <Sparkles size={14}/> : <Tag size={14}/>} {category.name}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {/* AJOUT DU TRI ICI : .slice().sort(...) */}
                                        {category.items
                                            .slice()
                                            .sort((a, b) => a.localeCompare(b))
                                            .map(ing => (
                                            <button key={ing} onClick={() => isDeleteMode ? deleteIngredient(ing) : toggleIngredient(ing)} className={`px-3 py-1.5 rounded-full text-sm font-medium border transition active:scale-95 flex items-center gap-1 ${isDeleteMode ? 'bg-slate-900 border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 animate-pulse' : selectedIngredients.includes(ing) ? 'bg-orange-500 border-orange-500 text-slate-900 shadow-lg shadow-orange-500/20' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'}`}>
                                                {isDeleteMode && <X size={12}/>} {ing}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {!isDeleteMode && (<div className="fixed bottom-20 left-0 w-full px-4 flex justify-center bg-gradient-to-t from-slate-900 via-slate-900/90 to-transparent pb-4 pt-10 pointer-events-none"><button onClick={searchFridgeRecipes} disabled={selectedIngredients.length === 0} className="pointer-events-auto w-full max-w-md bg-orange-500 text-white px-8 py-4 rounded-xl font-bold shadow-xl shadow-orange-500/20 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100"><Sparkles size={20}/> Trouver une recette ({selectedIngredients.length})</button></div>)}
                </>
            ) : (
                <>
                    <div className="flex items-center justify-between mb-6 pt-4"><button onClick={resetFridge} className="text-slate-400 hover:text-white flex items-center gap-1 text-sm"><ArrowLeft size={16}/> Changer les ingrédients</button><span className="text-orange-500 font-bold text-sm">{fridgeResults.length} recettes trouvées</span></div>
                    {fridgeResults.length === 0 ? <div className="text-center py-10 opacity-50"><UtensilsCrossed size={48} className="mx-auto mb-4 text-slate-600"/><p>Aucune recette ne correspond.</p><p className="text-xs mt-2">Essaie avec moins d&apos;ingrédients.</p></div> : (
                        <div className="grid grid-cols-1 gap-4">
                            {fridgeResults.map(({ recipe, matchCount }, index) => (
                                <div key={index} onClick={() => setSelectedRecipe(recipe)} className="bg-slate-800 rounded-xl border border-slate-700 cursor-pointer hover:border-orange-500/50 transition active:scale-95 flex overflow-hidden h-24">
                                    <div className="w-24 bg-slate-700 relative shrink-0">{recipe.image ? <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center opacity-20"><ChefHat size={24}/></div>}</div>
                                    <div className="p-3 flex flex-col justify-center w-full"><h3 className="font-bold text-sm mb-1 line-clamp-1">{recipe.title}</h3><div className="flex items-center gap-2 mb-2"><span className="bg-green-500/20 text-green-500 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Check size={10}/> {matchCount} ingrédients</span></div><div className="flex items-center gap-3 text-[10px] text-slate-400"><span className="flex items-center gap-1"><Clock size={10}/> {recipe.prepTime}</span></div></div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
      )}

      {/* LIVRE RECETTES (Le bloc manquant est là) */}
      {activeTab === 'book' && (
        <div className="px-4 pb-24 animate-in slide-in-from-right-10 duration-300">
           <div className="sticky top-0 bg-slate-900 z-10 py-4 -mx-4 px-4 border-b border-slate-800 mb-6 shadow-xl">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20}/>
                    <input 
                        type="text" 
                        placeholder="Chercher une recette, un ingrédient..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-orange-500 outline-none transition placeholder:text-slate-600"
                    />
                </div>
           </div>
           {loadingRecipes ? (
               <div className="flex flex-col items-center justify-center py-20 text-slate-500"><Loader2 className="animate-spin mb-4 text-orange-500" size={32}/><p>Ouverture du livre...</p></div>
           ) : filteredBookRecipes.length === 0 ? (
               <div className="text-center py-20 opacity-50"><BookOpen size={48} className="mx-auto mb-4 text-slate-600"/><p>Aucune recette trouvée.</p>{searchTerm && <p className="text-sm mt-2">Essaie une autre recherche ?</p>}</div>
           ) : (
               <div className="grid grid-cols-1 gap-4">
                   {filteredBookRecipes.map((recipe) => (
                       <div key={recipe.id} onClick={() => setSelectedRecipe(recipe)} className="bg-slate-800 rounded-xl border border-slate-700 cursor-pointer hover:border-orange-500/50 transition active:scale-95 flex overflow-hidden h-28 group">
                           <div className="w-28 bg-slate-700 relative shrink-0 overflow-hidden">{recipe.image ? <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-500"/> : <div className="w-full h-full flex items-center justify-center opacity-20"><ChefHat size={32}/></div>}</div>
                           <div className="p-3 flex flex-col justify-between w-full overflow-hidden">
                               <div><h3 className="font-bold text-base mb-1 line-clamp-1 group-hover:text-orange-500 transition">{recipe.title}</h3><div className="flex items-center gap-3 text-xs text-slate-400 mb-2"><span className="flex items-center gap-1"><Clock size={12}/> {recipe.prepTime}</span><span className="flex items-center gap-1"><Users size={12}/> {recipe.servings} p.</span></div></div>
                               <div className="flex flex-wrap gap-1">
                                   {recipe.ingredients.slice(0, 3).map((ing, i) => {
                                       const name = typeof ing === 'string' ? ing : ing.name;
                                       return (<span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-700/50 rounded text-slate-300 truncate max-w-[80px]">{name}</span>);
                                   })}
                                   {recipe.ingredients.length > 3 && <span className="text-[10px] text-slate-500 px-1">+{recipe.ingredients.length - 3}</span>}
                               </div>
                           </div>
                       </div>
                   ))}
               </div>
           )}
        </div>
      )}

      {scannedRecipe && <RecipeCardFull recipe={scannedRecipe} isPreview={true} onClose={() => setScannedRecipe(null)} />}
      {selectedRecipe && (
    <RecipeCardFull 
        recipe={selectedRecipe} 
        isPreview={false} 
        onClose={() => setSelectedRecipe(null)} 
        onUpdate={handleUpdateRecipe} 
        onDelete={deleteRecipe}   // <--- Vérifie que cette ligne est bien là !
    />
)}

      {/* --- MODALES --- */}

      {isImportModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
              <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-[90%] max-w-sm shadow-2xl relative">
                  <button onClick={() => setIsImportModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20}/></button>
                  <h3 className="text-xl font-bold mb-2 flex items-center gap-2"><Instagram className="text-pink-500"/> Import Rapide</h3>
                  <p className="text-slate-400 text-sm mb-4">Copie la description de la vidéo (Insta/TikTok) et colle-la ici :</p>
                  <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="Ingrédients: 200g de pâtes..." className="w-full h-40 bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-orange-500 outline-none mb-4 resize-none text-sm"/>
                  <button onClick={handleTextImport} disabled={!importText.trim()} className="w-full bg-orange-500 text-slate-900 font-bold py-3 rounded-lg flex justify-center gap-2 items-center disabled:opacity-50"><Sparkles size={18}/> Analyser le texte</button>
              </div>
          </div>
      )}

      {(isCategoryModalOpen || currentUnknown) && !isImportModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-[90%] max-w-sm shadow-2xl relative">
                {isCategoryModalOpen && <button onClick={() => setIsCategoryModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20}/></button>}
                
                {currentUnknown ? (
                    <div className="text-center mb-4">
                         <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500"><HelpCircle size={32}/></div>
                         <h3 className="text-xl font-bold mb-1">Nouvel ingrédient !</h3>
                         <p className="text-slate-400 text-sm">Je ne connais pas encore :</p>
                         <div className="relative mt-3">
                            <input type="text" value={cleanNameInput} onChange={(e) => setCleanNameInput(e.target.value)} className="w-full bg-slate-800 border border-slate-600 text-white font-bold text-center py-3 px-4 rounded-xl focus:border-orange-500 outline-none shadow-inner"/>
                            <Edit3 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                         </div>
                         <p className="text-xs text-slate-500 mt-2 mb-4">Modifie le nom pour enlever les quantités (ex: &quot;200g de Farine&quot; → &quot;Farine&quot;)</p>
                    </div>
                ) : (
                    <>
                        <h3 className="text-xl font-bold mb-2">Où ranger &quot;{pendingIngredient}&quot; ?</h3>
                        <p className="text-slate-400 text-sm mb-6">Choisis une catégorie.</p>
                    </>
                )}

                {currentUnknown && !resolveType ? (
                     <div className="grid grid-cols-1 gap-3 mt-4">
                          <button onClick={() => setResolveType('alias')} className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-left border border-slate-700 flex items-center gap-3 transition group">
                              <LinkIcon size={24} className="text-blue-400 group-hover:scale-110 transition"/>
                              <div><div className="font-bold">C&apos;est une variante</div><div className="text-xs text-slate-400">Ex: &quot;{cleanNameInput}&quot; → Champignon</div></div>
                          </button>
                          <button onClick={() => setResolveType('new')} className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-left border border-slate-700 flex items-center gap-3 transition group">
                              <Plus size={24} className="text-green-400 group-hover:scale-110 transition"/>
                              <div><div className="font-bold">C&apos;est nouveau</div><div className="text-xs text-slate-400">Ajouter &quot;{cleanNameInput}&quot; aux catégories</div></div>
                          </button>
                          <button onClick={skipUnknown} className="p-3 text-slate-500 hover:text-white text-sm font-medium">Ignorer</button>
                     </div>
                ) : resolveType === 'alias' ? (
                     <div className="space-y-3 mt-2 animate-in slide-in-from-right-10">
                          {!isCreatingMaster ? (
                              <>
                                <p className="text-sm text-slate-400">C&apos;est une variante de quoi ?</p>
                                <button onClick={() => { setIsCreatingMaster(true); setNewMasterName(""); }} className="w-full text-left p-3 rounded-xl border-2 border-dashed border-slate-600 text-orange-400 hover:border-orange-500 hover:text-orange-500 transition flex items-center gap-2 mb-2 font-bold"><Plus size={18} /> Créer un nouveau groupe (ex: Épices)</button>
                                <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-2 border-t border-slate-800 pt-2">
                                   {categories.flatMap(c => c.items).sort().map(ing => (
                                       <button key={ing} onClick={() => linkAsAlias(ing)} className="w-full text-left p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition font-medium">{ing}</button>
                                   ))}
                                </div>
                                <button onClick={() => setResolveType(null)} className="w-full py-3 text-slate-400 font-bold">Retour</button>
                              </>
                          ) : (
                              <div className="animate-in slide-in-from-right-10">
                                  <h4 className="font-bold text-lg mb-1">Créer un nouveau groupe</h4>
                                  <p className="text-xs text-slate-400 mb-4">&quot;{currentUnknown?.name}&quot; sera rangé dedans.</p>
                                  <div className="space-y-2 mb-4"><label className="text-xs font-bold uppercase text-slate-500">Nom du groupe</label><input autoFocus type="text" placeholder="Ex: Épices, Agrumes..." value={newMasterName} onChange={(e) => setNewMasterName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-orange-500 outline-none"/></div>
                                  <p className="text-xs font-bold uppercase text-slate-500 mb-2">Dans quelle catégorie ?</p>
                                  <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-2">
                                      {categories.map((cat, idx) => (
                                          <button key={idx} onClick={() => createMasterAndLink(cat.name)} className="w-full text-left p-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition flex items-center justify-between group border border-slate-700/50"><span className="font-medium">{cat.name}</span></button>
                                      ))}
                                  </div>
                                  <button onClick={() => setIsCreatingMaster(false)} className="w-full py-3 text-slate-400 font-bold mt-2">Annuler</button>
                              </div>
                          )}
                      </div>
                ) : (
                     !isCreatingCategory ? (
                        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                            {categories.map((cat, idx) => (
                                <button key={idx} onClick={() => addToCategory(cat.name)} className="w-full text-left p-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition flex items-center justify-between group"><span className="font-medium">{cat.name}</span></button>
                            ))}
                            <button onClick={() => setIsCreatingCategory(true)} className="w-full text-left p-3 rounded-xl border-2 border-dashed border-slate-700 text-slate-400 hover:border-orange-500 hover:text-orange-500 transition flex items-center gap-2 mt-4"><FolderPlus size={18} /> Créer une nouvelle catégorie...</button>
                            {currentUnknown && <button onClick={() => setResolveType(null)} className="w-full py-3 text-slate-400 font-bold mt-2">Retour</button>}
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in slide-in-from-right-10">
                            <div className="space-y-2"><label className="text-xs font-bold uppercase text-slate-500">Nom de la catégorie</label><input autoFocus type="text" placeholder="Ex: 🍿 Snacks..." value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:border-orange-500 outline-none"/></div>
                            <div className="flex gap-2"><button onClick={() => setIsCreatingCategory(false)} className="flex-1 py-3 rounded-lg bg-slate-800 text-white font-bold">Retour</button><button onClick={createCategoryAndAdd} disabled={!newCategoryName.trim()} className="flex-1 py-3 rounded-lg bg-orange-500 text-slate-900 font-bold disabled:opacity-50">Créer</button></div>
                        </div>
                    )
                )}
            </div>
        </div>
      )}
    </main>
  );
}