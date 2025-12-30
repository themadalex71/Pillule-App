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

  const [isEditMode, setIsEditMode] = useState(false); // Mode édition activé ?
  const [editingMasterIngredient, setEditingMasterIngredient] = useState<string | null>(null); // Quel ingrédient on modifie ?
  const [newAliasInput, setNewAliasInput] = useState(""); // Champ texte pour ajouter une variante
  const [aliasToMove, setAliasToMove] = useState<string | null>(null); // La variante qu'on veut déplacer
  const [moveSearchTerm, setMoveSearchTerm] = useState("");    

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

  const startManualCreation = () => {
    // On prépare une recette vide
    const newRecipe: Recipe = {
        id: "", // L'ID vide signale au Backend de créer un vrai ID
        title: "",
        prepTime: "",
        cookTime: "",
        servings: "",
        ingredients: [{ quantity: "", name: "" }], // Une ligne vide prête à remplir
        steps: [""], // Une étape vide prête à remplir
        addedBy: "Moi"
    };
    
    // On l'ouvre directement
    setSelectedRecipe(newRecipe);
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

  // --- COMPOSANT FICHE RECETTE AMÉLIORÉ (Édition Ligne par Ligne) ---
  const RecipeCardFull = ({ recipe, isPreview = false, onClose, onUpdate, onDelete }: { recipe: any, isPreview?: boolean, onClose: () => void, onUpdate?: (r: Recipe) => Promise<boolean>, onDelete?: (id: string) => void }) => {
    // MODIF ICI : Si la recette n'a pas de titre (création), on active l'édition direct !
    const [isEditing, setIsEditing] = useState(recipe.title === "");
    
    // On prépare les données. Si les ingrédients sont des strings, on les convertit en objets pour l'édition propre
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

    // Reset des données quand on annule/ouvre
    const toggleEdit = () => {
        if (isEditing) {
            // Annulation : on remet les données d'origine
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

    // --- GESTION DES INGRÉDIENTS (Ligne par ligne) ---
    const updateIngredient = (index: number, field: 'quantity' | 'name', value: string) => {
        const newIngs = [...(formData.ingredients as IngredientItem[])];
        newIngs[index] = { ...newIngs[index], [field]: value };
        setFormData({ ...formData, ingredients: newIngs });
    };

    const addIngredientLine = () => {
        setFormData({
            ...formData,
            ingredients: [...(formData.ingredients as IngredientItem[]), { quantity: "", name: "" }]
        });
    };

    const removeIngredientLine = (index: number) => {
        const newIngs = [...(formData.ingredients as IngredientItem[])];
        newIngs.splice(index, 1);
        setFormData({ ...formData, ingredients: newIngs });
    };

    // --- GESTION DES ÉTAPES (Ligne par ligne) ---
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
        // Nettoyage : on enlève les lignes vides
        const cleanIngredients = (formData.ingredients as IngredientItem[]).filter(i => i.name.trim() !== "");
        const cleanSteps = formData.steps.filter(s => s.trim() !== "");

        const updatedRecipe = {
            ...formData,
            ingredients: cleanIngredients,
            steps: cleanSteps
        };

        if (onUpdate) {
            const success = await onUpdate(updatedRecipe);
            if (success) setIsEditing(false);
        }
        setSavingEdit(false);
    };

    const moveAliasToNewMaster = (newMaster: string) => {
        if (!editingMasterIngredient || !aliasToMove) return;
  
        const oldMaster = editingMasterIngredient;
        const newAliases = { ...aliases };
  
        // 1. On retire de l'ancien
        if (newAliases[oldMaster]) {
            newAliases[oldMaster] = newAliases[oldMaster].filter(a => a !== aliasToMove);
            // Si vide, on nettoie (optionnel)
            if (newAliases[oldMaster].length === 0) delete newAliases[oldMaster];
        }
  
        // 2. On ajoute au nouveau
        if (!newAliases[newMaster]) newAliases[newMaster] = [];
        if (!newAliases[newMaster].includes(aliasToMove)) {
            newAliases[newMaster].push(aliasToMove);
        }
  
        // 3. Sauvegarde et Reset
        saveAliasesToDb(newAliases);
        setAliasToMove(null);
        setEditingMasterIngredient(null); // On ferme tout
        alert(`Déplacé : "${aliasToMove}" est maintenant dans "${newMaster}" !`);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-slate-900 w-full h-[95vh] sm:h-[85vh] sm:w-[600px] sm:rounded-2xl rounded-t-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col relative animate-in slide-in-from-bottom-10 duration-300">
                
                {/* IMAGE */}
                <div className="relative h-48 sm:h-56 w-full shrink-0 bg-slate-800 group overflow-hidden">
                    {formData.image ? <img src={formData.image} alt="Plat" className="w-full h-full object-cover transition duration-500 hover:scale-105" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500/20 to-slate-800 text-orange-500/50"><ImageIcon size={48} /></div>}
                    {isEditing && <div className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer" onClick={() => imageInputRef.current?.click()}><div className="flex flex-col items-center text-white"><Camera size={32} /><span className="text-xs font-bold mt-2">Changer la photo</span></div><input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageChange} /></div>}
                    <button onClick={onClose} className="absolute top-4 right-4 bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition backdrop-blur-sm border border-white/10 z-10"><X size={20} /></button>
                </div>

                {/* ENTÊTE (TITRE + ACTIONS) */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 shrink-0">
                    {isEditing ? (
                         <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="bg-slate-800 border border-slate-700 text-white font-bold text-lg rounded px-2 py-1 w-full mr-2 focus:border-orange-500 outline-none" placeholder="Nom de la recette"/>
                    ) : (
                        <h2 className="text-2xl font-black text-white truncate pr-4">{formData.title}</h2>
                    )}
                    
                    {!isPreview && !isEditing && (
                        <div className="flex gap-2 shrink-0">
                            <button onClick={() => onDelete?.(recipe.id)} className="p-2 bg-slate-800 rounded-full hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition border border-transparent hover:border-red-500/30">
                                <Trash2 size={20} />
                            </button>
                            <button onClick={toggleEdit} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white shrink-0">
                                <Pencil size={20} />
                            </button>
                        </div>
                    )}
                </div>

                {/* CONTENU SCROLLABLE */}
                <div className="p-6 overflow-y-auto flex-1 pb-24">
                    {/* INFO TEMPS / PERS */}
                    <div className="flex gap-4 mb-6 text-sm font-medium text-slate-300 justify-center">
                        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl"><Clock size={16} className="text-orange-500"/> {isEditing ? <input value={formData.prepTime} onChange={e => setFormData({...formData, prepTime: e.target.value})} className="bg-transparent w-20 text-center outline-none border-b border-slate-600 focus:border-orange-500" placeholder="Ex: 10m"/> : (formData.prepTime || "?")}</div>
                        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl"><Users size={16} className="text-orange-500"/> {isEditing ? <input value={formData.servings} onChange={e => setFormData({...formData, servings: e.target.value})} className="bg-transparent w-10 text-center outline-none border-b border-slate-600 focus:border-orange-500" placeholder="Ex: 4"/> : (formData.servings || "?")} {!isEditing && " pers."}</div>
                    </div>

                    {/* SECTION INGRÉDIENTS */}
                    <div className="mb-8">
                        <h3 className="font-bold text-white uppercase tracking-wider text-xs mb-4 flex items-center gap-2"><Search size={14}/> Ingrédients</h3>
                        
                        {isEditing ? (
                            <div className="space-y-2">
                                {(formData.ingredients as IngredientItem[]).map((ing, i) => (
                                    <div key={i} className="flex gap-2 animate-in slide-in-from-left-5">
                                        <input 
                                            value={ing.quantity} 
                                            onChange={(e) => updateIngredient(i, 'quantity', e.target.value)} 
                                            className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-2 text-sm text-white focus:border-orange-500 outline-none text-right" 
                                            placeholder="Qté"
                                        />
                                        <input 
                                            value={ing.name} 
                                            onChange={(e) => updateIngredient(i, 'name', e.target.value)} 
                                            className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-2 text-sm text-white focus:border-orange-500 outline-none" 
                                            placeholder="Nom de l'ingrédient"
                                        />
                                        <button onClick={() => removeIngredientLine(i)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition"><X size={16}/></button>
                                    </div>
                                ))}
                                <button onClick={addIngredientLine} className="w-full py-2 border border-dashed border-slate-700 text-slate-400 rounded-lg hover:border-orange-500 hover:text-orange-500 transition text-sm font-medium flex items-center justify-center gap-2 mt-2"><Plus size={16}/> Ajouter un ingrédient</button>
                            </div>
                        ) : (
                            <ul className="grid grid-cols-1 gap-2">
                                {(formData.ingredients as IngredientItem[])?.map((ing, i) => {
                                    const quantity = ing.quantity || "";
                                    const name = ing.name || ""; // Au cas où
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

                    {/* SECTION PRÉPARATION */}
                    <div>
                        <h3 className="font-bold text-white uppercase tracking-wider text-xs mb-4 flex items-center gap-2"><UtensilsCrossed size={14}/> Préparation</h3>
                        {isEditing ? (
                             <div className="space-y-4">
                                {formData.steps.map((step, i) => (
                                    <div key={i} className="flex gap-3 animate-in slide-in-from-left-5">
                                        <div className="flex flex-col items-center pt-2">
                                            <span className="w-6 h-6 rounded-full bg-slate-700 text-xs flex items-center justify-center font-bold text-slate-400">{i+1}</span>
                                        </div>
                                        <textarea 
                                            value={step} 
                                            onChange={(e) => updateStep(i, e.target.value)} 
                                            className="flex-1 bg-slate-800 border border-slate-700 rounded p-3 text-sm text-white focus:border-orange-500 outline-none min-h-[80px]" 
                                            placeholder={`Étape ${i+1}...`}
                                        />
                                        <button onClick={() => removeStepLine(i)} className="p-2 h-fit text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition mt-2"><X size={16}/></button>
                                    </div>
                                ))}
                                <button onClick={addStepLine} className="w-full py-2 border border-dashed border-slate-700 text-slate-400 rounded-lg hover:border-orange-500 hover:text-orange-500 transition text-sm font-medium flex items-center justify-center gap-2 mt-2"><Plus size={16}/> Ajouter une étape</button>
                             </div>
                        ) : (
                            <div className="space-y-6">
                                {formData.steps?.map((step: string, i: number) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="flex-col flex items-center">
                                            <span className="w-8 h-8 rounded-full bg-orange-500 text-slate-900 flex items-center justify-center text-sm font-bold shadow-lg shadow-orange-500/20">{i + 1}</span>
                                            {i !== formData.steps.length - 1 && <div className="w-0.5 h-full bg-slate-800 mt-2"></div>}
                                        </div>
                                        <p className="text-slate-300 text-sm leading-relaxed pt-1 pb-4">{step}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* FOOTER ACTIONS */}
                {isPreview && (<div className="absolute bottom-0 w-full p-4 border-t border-slate-800 bg-slate-900 flex gap-3"><button onClick={onClose} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold border border-slate-700">Annuler</button><button onClick={() => handleSmartSave(formData)} disabled={saving} className="flex-1 py-3 bg-orange-500 text-slate-900 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 transition">{saving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} Sauvegarder</button></div>)}
                {isEditing && !isPreview && (<div className="absolute bottom-0 w-full p-4 border-t border-slate-800 bg-slate-900 flex gap-3"><button onClick={toggleEdit} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold border border-slate-700">Annuler</button><button onClick={saveChanges} disabled={savingEdit} className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 active:scale-95 transition">{savingEdit ? <Loader2 className="animate-spin"/> : <Check size={18}/>} Valider</button></div>)}
            </div>
        </div>
    );
  };
  
  // Ouvre la modale des variantes
  const openVariantModal = (ing: string) => {
      setEditingMasterIngredient(ing);
      setNewAliasInput("");
  };

  // Ajoute une variante manuellement
  const addAliasToMaster = () => {
      if (!editingMasterIngredient || !newAliasInput.trim()) return;
      const master = editingMasterIngredient;
      const aliasToAdd = newAliasInput.trim();

      const newAliases = { ...aliases };
      if (!newAliases[master]) newAliases[master] = [];
      
      if (!newAliases[master].includes(aliasToAdd)) {
          newAliases[master].push(aliasToAdd);
          saveAliasesToDb(newAliases);
      }
      setNewAliasInput("");
  };

  // Supprime une variante
  const removeAliasFromMaster = (aliasToRemove: string) => {
      if (!editingMasterIngredient) return;
      const master = editingMasterIngredient;

      const newAliases = { ...aliases };
      if (newAliases[master]) {
          newAliases[master] = newAliases[master].filter(a => a !== aliasToRemove);
          // Si la liste est vide, on peut nettoyer la clé (optionnel)
          if (newAliases[master].length === 0) delete newAliases[master];
          saveAliasesToDb(newAliases);
      }
  };

  const moveAliasToNewMaster = (newMaster: string) => {
    if (!editingMasterIngredient || !aliasToMove) return;

    const oldMaster = editingMasterIngredient;
    const newAliases = { ...aliases };

    // 1. On retire de l'ancien
    if (newAliases[oldMaster]) {
        newAliases[oldMaster] = newAliases[oldMaster].filter(a => a !== aliasToMove);
        // Si vide, on nettoie (optionnel)
        if (newAliases[oldMaster].length === 0) delete newAliases[oldMaster];
    }

    // 2. On ajoute au nouveau
    if (!newAliases[newMaster]) newAliases[newMaster] = [];
    if (!newAliases[newMaster].includes(aliasToMove)) {
        newAliases[newMaster].push(aliasToMove);
    }

    // 3. Sauvegarde et Reset
    saveAliasesToDb(newAliases);
    setAliasToMove(null);
    setEditingMasterIngredient(null); // On ferme tout
    alert(`Déplacé : "${aliasToMove}" est maintenant dans "${newMaster}" !`);
};

    // 1. RENOMMER UNE CATÉGORIE
  const renameCategory = (oldName: string) => {
      // On utilise un simple prompt pour aller vite
      const newName = window.prompt(`Nouveau nom pour "${oldName}" ?`, oldName);
      if (!newName || newName === oldName) return;

      const newCategories = categories.map(cat => {
          if (cat.name === oldName) return { ...cat, name: newName.trim() };
          return cat;
      });
      saveCategoriesToDb(newCategories);
  };

  // 2. RENOMMER UN INGRÉDIENT PRINCIPAL
  const renameMasterIngredient = () => {
      if (!editingMasterIngredient) return;
      // On utilise un prompt ici aussi ou on pourrait faire un champ dans la modale
      // Pour l'instant, on va l'intégrer dans la modale via un nouvel état local, 
      // mais voici la logique brute :
      
      const oldName = editingMasterIngredient;
      const newName = window.prompt(`Renommer "${oldName}" en :`, oldName);
      
      if (!newName || newName === oldName) return;
      const finalName = newName.trim();

      // A. On met à jour dans les Catégories
      const newCategories = categories.map(cat => ({
          ...cat,
          items: cat.items.map(item => item === oldName ? finalName : item)
      }));

      // B. On met à jour les Alias (On déplace les enfants vers le nouveau nom)
      const newAliases = { ...aliases };
      if (newAliases[oldName]) {
          newAliases[finalName] = newAliases[oldName]; // On copie les variantes
          delete newAliases[oldName]; // On supprime l'ancienne clé
      }

      // C. Sauvegarde tout
      saveCategoriesToDb(newCategories);
      saveAliasesToDb(newAliases);
      
      // D. On met à jour l'interface
      setEditingMasterIngredient(finalName); // On garde la modale ouverte sur le nouveau nom
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
                    <button onClick={startManualCreation} disabled={analyzing} className="bg-slate-800 border border-slate-700 text-slate-300 w-full py-4 rounded-xl font-bold hover:bg-slate-700 hover:text-white active:scale-95 transition flex items-center justify-center gap-2">
                        <Edit3 size={20} /> Créer manuellement
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* FRIGO */}
      {activeTab === 'fridge' && (
        <div className="px-4 pb-20 animate-in slide-in-from-right-10 duration-300">
            {!hasSearchedFridge ? (
                <>
                    {/* EN-TÊTE */}
                    <div className="text-center py-6">
                         <h2 className="text-xl font-bold mb-2">Qu&apos;est-ce que tu as ?</h2>
                         <p className="text-slate-400 text-xs">Sélectionne tes ingrédients ou ajoutes-en un.</p>
                    </div>

                    {/* BARRE D'OUTILS (Ajout / Édition / Suppression) */}
                    <div className="flex gap-2 mb-8 max-w-md mx-auto relative z-0 items-center">
                        <input 
                            type="text" 
                            placeholder="Ajouter un ingrédient..." 
                            value={newIngredientInput} 
                            onChange={(e) => setNewIngredientInput(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && initiateAddIngredient()} 
                            disabled={isDeleteMode || isEditMode} 
                            className={`flex-1 bg-slate-800 border ${isDeleteMode ? 'border-red-900 opacity-50' : isEditMode ? 'border-blue-900 opacity-50' : 'border-slate-700'} rounded-lg px-4 py-2 text-sm text-white focus:border-orange-500 outline-none transition`}
                        />
                        
                        {/* Bouton AJOUTER */}
                        <button onClick={initiateAddIngredient} disabled={isDeleteMode || isEditMode} className={`px-3 py-2 rounded-lg text-white transition ${isDeleteMode || isEditMode ? 'bg-slate-800 opacity-50' : 'bg-slate-700 hover:bg-slate-600'}`}>
                            <Plus size={20}/>
                        </button>
                        
                        <div className="w-[1px] h-8 bg-slate-700 mx-1"></div>
                        
                        {/* Bouton ÉDITION (Variantes) - Bleu */}
                        <button 
                            onClick={() => { setIsEditMode(!isEditMode); setIsDeleteMode(false); }} 
                            className={`p-2 rounded-lg transition border ${isEditMode ? 'bg-blue-600 text-white border-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}
                        >
                            <Edit3 size={20}/>
                        </button>

                        {/* Bouton SUPPRESSION - Rouge */}
                        <button 
                            onClick={() => { setIsDeleteMode(!isDeleteMode); setIsEditMode(false); }} 
                            className={`p-2 rounded-lg transition border ${isDeleteMode ? 'bg-red-500 text-white border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}
                        >
                            <Trash2 size={20}/>
                        </button>
                    </div>

                    {/* LISTE DES INGRÉDIENTS */}
                    {loadingData ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-orange-500" /></div> : (
                        <div className="space-y-6 mb-24">
                            {categories.map((category, idx) => (
                                <div key={idx}>
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 ml-1 flex items-center gap-2">
                                    {/* Icône de catégorie */}
                                    {category.name.startsWith("✨") ? <Sparkles size={14}/> : <Tag size={14}/>} 
                                    
                                    {/* Nom de la catégorie */}
                                    {category.name}

                                    {/* BOUTON RENOMMER (Apparaît seulement en mode Édition) */}
                                    {isEditMode && (
                                        <button 
                                            onClick={() => renameCategory(category.name)} 
                                            className="p-1 hover:bg-blue-500/20 text-blue-500 rounded transition"
                                            title="Renommer la catégorie"
                                        >
                                            <Pencil size={12}/>
                                        </button>
                                    )}
                                </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {category.items
                                            .slice()
                                            .sort((a, b) => a.localeCompare(b))
                                            .map(ing => (
                                            <button 
                                                key={ing} 
                                                onClick={() => {
                                                    if (isDeleteMode) deleteIngredient(ing);
                                                    else if (isEditMode) openVariantModal(ing);
                                                    else toggleIngredient(ing);
                                                }}
                                                className={`
                                                    px-3 py-1.5 rounded-full text-sm font-medium border transition active:scale-95 flex items-center gap-1
                                                    ${isDeleteMode 
                                                        ? 'bg-slate-900 border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 animate-pulse' 
                                                        : isEditMode
                                                            ? 'bg-slate-900 border-blue-500/50 text-blue-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 animate-pulse'
                                                            : selectedIngredients.includes(ing) 
                                                                ? 'bg-orange-500 border-orange-500 text-slate-900 shadow-lg shadow-orange-500/20' 
                                                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                                                    }
                                                `}
                                            >
                                                {isDeleteMode && <X size={12}/>} 
                                                {isEditMode && <LinkIcon size={12}/>} 
                                                {ing}
                                                {/* Petit point gris si l'ingrédient a des variantes (alias) */}
                                                {!isDeleteMode && !isEditMode && aliases[ing]?.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-slate-500 ml-1"></span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* BOUTON RECHERCHER (Fixe en bas) */}
                    {!isDeleteMode && !isEditMode && (
                        <div className="fixed bottom-20 left-0 w-full px-4 flex justify-center bg-gradient-to-t from-slate-900 via-slate-900/90 to-transparent pb-4 pt-10 pointer-events-none">
                            <button 
                                onClick={searchFridgeRecipes} 
                                disabled={selectedIngredients.length === 0} 
                                className="pointer-events-auto w-full max-w-md bg-orange-500 text-white px-8 py-4 rounded-xl font-bold shadow-xl shadow-orange-500/20 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100"
                            >
                                <Sparkles size={20}/> Trouver une recette ({selectedIngredients.length})
                            </button>
                        </div>
                    )}
                </>
            ) : (
                /* --- AFFICHAGE DES RÉSULTATS --- */
                <>
                    <div className="flex items-center justify-between mb-6 pt-4">
                        <button onClick={resetFridge} className="text-slate-400 hover:text-white flex items-center gap-1 text-sm"><ArrowLeft size={16}/> Changer les ingrédients</button>
                        <span className="text-orange-500 font-bold text-sm">{fridgeResults.length} recettes trouvées</span>
                    </div>
                    
                    {fridgeResults.length === 0 ? (
                        <div className="text-center py-10 opacity-50">
                            <UtensilsCrossed size={48} className="mx-auto mb-4 text-slate-600"/>
                            <p>Aucune recette ne correspond.</p>
                            <p className="text-xs mt-2">Essaie avec moins d&apos;ingrédients.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {fridgeResults.map(({ recipe, matchCount }, index) => (
                                <div key={index} onClick={() => setSelectedRecipe(recipe)} className="bg-slate-800 rounded-xl border border-slate-700 cursor-pointer hover:border-orange-500/50 transition active:scale-95 flex overflow-hidden h-24">
                                    <div className="w-24 bg-slate-700 relative shrink-0">
                                        {recipe.image ? <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center opacity-20"><ChefHat size={24}/></div>}
                                    </div>
                                    <div className="p-3 flex flex-col justify-center w-full">
                                        <h3 className="font-bold text-sm mb-1 line-clamp-1">{recipe.title}</h3>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-green-500/20 text-green-500 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Check size={10}/> {matchCount} ingrédients</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                            <span className="flex items-center gap-1"><Clock size={10}/> {recipe.prepTime}</span>
                                        </div>
                                    </div>
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

      {/* MODALE GESTION VARIANTES (CORRIGÉE & AMÉLIORÉE) */}
      {editingMasterIngredient && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
              {/* Conteneur principal : Hauteur Max fixée et Flex Column pour gérer le scroll */}
              <div className="bg-slate-900 border border-slate-700 w-[95%] max-w-sm rounded-2xl shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden">
                  
                  {/* BOUTON FERMER (Absolu pour être toujours là) */}
                  <button 
                      onClick={() => { setEditingMasterIngredient(null); setAliasToMove(null); setMoveSearchTerm(""); }} 
                      className="absolute top-4 right-4 text-slate-500 hover:text-white z-20 p-2 bg-slate-900/50 rounded-full"
                  >
                      <X size={20}/>
                  </button>
                  
                  {/* --- ÉCRAN 1 : LISTE DES VARIANTES --- */}
                  {!aliasToMove ? (
                      <div className="flex flex-col h-full p-6">
                        {/* Header fixe avec Renommage */}
                        <div className="flex items-center gap-3 mb-6 shrink-0 pr-8">
                            <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                                <LinkIcon size={24}/>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-xl text-white leading-tight">{editingMasterIngredient}</h3>
                                    
                                    {/* BOUTON RENOMMER L'INGRÉDIENT 👇 */}
                                    <button 
                                        onClick={renameMasterIngredient} 
                                        className="p-1.5 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition"
                                        title="Renommer l'ingrédient"
                                    >
                                        <Pencil size={12}/>
                                    </button>
                                </div>
                                <p className="text-sm text-slate-400">Gérer les variantes</p>
                            </div>
                        </div>

                        {/* Zone Scrollable des variantes */}
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
                                                {/* DÉPLACER */}
                                                <button onClick={() => setAliasToMove(alias)} className="p-2 text-slate-500 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition" title="Déplacer">
                                                    <ArrowLeft size={16} className="rotate-180"/>
                                                </button>
                                                {/* SUPPRIMER */}
                                                <button onClick={() => removeAliasFromMaster(alias)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition" title="Détacher">
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer fixe : Ajouter */}
                        <div className="flex gap-2 shrink-0">
                            <input 
                                type="text" 
                                placeholder="Ajouter une variante..." 
                                value={newAliasInput} 
                                onChange={(e) => setNewAliasInput(e.target.value)} 
                                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none shadow-inner"
                            />
                            <button onClick={addAliasToMaster} disabled={!newAliasInput.trim()} className="bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-500 disabled:opacity-50 font-bold"><Plus size={20}/></button>
                        </div>
                      </div>
                  ) : (
                      /* --- ÉCRAN 2 : DÉPLACEMENT AVEC RECHERCHE --- */
                      <div className="flex flex-col h-full overflow-hidden">
                          {/* Header Fixe */}
                          <div className="p-6 pb-2 shrink-0 bg-slate-900 z-10 shadow-xl border-b border-slate-800">
                              <button onClick={() => { setAliasToMove(null); setMoveSearchTerm(""); }} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-bold mb-4 transition">
                                  <ArrowLeft size={16}/> Retour
                              </button>
                              <h3 className="font-bold text-lg text-white mb-1">Où déplacer &quot;{aliasToMove}&quot; ?</h3>
                              <p className="text-xs text-slate-400 mb-4">Choisis le nouvel ingrédient principal.</p>
                              
                              {/* Barre de recherche intégrée */}
                              <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16}/>
                                  <input 
                                    type="text" 
                                    autoFocus
                                    placeholder="Chercher un ingrédient..." 
                                    value={moveSearchTerm}
                                    onChange={(e) => setMoveSearchTerm(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-9 pr-4 text-sm text-white focus:border-blue-500 outline-none"
                                  />
                              </div>
                          </div>
                          
                          {/* Liste Scrollable */}
                          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900">
                              {categories.map((cat, idx) => {
                                  // Filtrage des items selon la recherche
                                  const filteredItems = cat.items
                                    .filter(i => i !== editingMasterIngredient) // Ne pas montrer le parent actuel
                                    .filter(i => i.toLowerCase().includes(moveSearchTerm.toLowerCase()))
                                    .sort();

                                  if (filteredItems.length === 0) return null;

                                  return (
                                      <div key={idx} className="animate-in slide-in-from-bottom-2">
                                          <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 ml-1">{cat.name}</h4>
                                          <div className="grid grid-cols-1 gap-1">
                                              {filteredItems.map(item => (
                                                  <button 
                                                      key={item} 
                                                      onClick={() => { moveAliasToNewMaster(item); setMoveSearchTerm(""); }}
                                                      className="w-full text-left px-4 py-3 rounded-xl bg-slate-800 hover:bg-blue-600 hover:text-white border border-slate-700/50 hover:border-blue-500 transition text-sm flex items-center justify-between group"
                                                  >
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
                              
                              {/* Message si aucun résultat */}
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
      )}
    </main>
  );
}