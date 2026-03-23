'use client';

import { useState, useEffect } from 'react';
import { Check, X, BarChart3, GripVertical, Loader2 } from 'lucide-react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  TouchSensor,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy, 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- ITEM GLISSABLE (COMPOSANT) ---
function SortableItem({ item, index, isOverlay = false }: { item: any, index?: number, isOverlay?: boolean }) {
  // IMPORTANT : On force l'ID en String pour dnd-kit
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(item.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1, 
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative p-3 rounded-2xl border-2 flex items-center gap-4 select-none touch-none bg-white shadow-sm transition-all
        ${isOverlay ? 'shadow-2xl scale-105 border-orange-500 z-50 cursor-grabbing bg-orange-50' : 'border-white hover:border-orange-200 cursor-grab'}`}
    >
        <div className="text-gray-300"><GripVertical size={20} /></div>
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-black text-gray-400 text-sm">
            {index !== undefined ? index + 1 : '#'}
        </div>
        <img src={item.url} className="w-12 h-12 rounded-xl object-cover shadow-sm pointer-events-none" />
        <span className="font-bold text-gray-700 flex-1 text-sm">{item.label}</span>
    </div>
  );
}

// --- JEU PRINCIPAL ---
export default function TierListGame({ session, currentUser, onAction }: { session: any, currentUser: string, onAction: any }) {
  const { sharedData } = session;
  
  // Sécurité anti-crash chargement
  if (!sharedData || !sharedData.players || !sharedData.mission) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto"/></div>;

  const user = currentUser;
  const opponent = user === 'Moi' ? 'Chéri(e)' : 'Moi';
  const myData = sharedData.players[user];
  const oppData = sharedData.players[opponent];
  
  const [localStep, setLocalStep] = useState(0); 
  const [currentList, setCurrentList] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // État pour le bouton

  // Initialisation
  useEffect(() => {
    // On ne charge la liste que si on est en phase INPUT et qu'elle est vide
    if (sharedData.phase === 'INPUT' && !myData.finished && currentList.length === 0) {
        setCurrentList(sharedData.mission.initialItems || []);
    }
  }, [sharedData.phase]); // Retiré localStep pour éviter reset intempestif

  // --- CONFIG DRAG & DROP ---
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
        activationConstraint: { delay: 150, tolerance: 5 }, // Délai pour différencier du scroll
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
        setActiveId(null);
        return;
    }

    setCurrentList((items) => {
      // Comparaison robuste (String vs String)
      const oldIndex = items.findIndex((i) => String(i.id) === String(active.id));
      const newIndex = items.findIndex((i) => String(i.id) === String(over.id));
      return arrayMove(items, oldIndex, newIndex);
    });
    
    setActiveId(null);
  };

  // --- VALIDATION (CORRIGÉE) ---
  const handleValidate = async () => {
    if (isSubmitting) return; // Anti-double clic
    setIsSubmitting(true);

    try {
        console.log("Validation Step:", localStep);
        
        // Extraction propre des IDs (numériques ou string, on s'adapte)
        const orderedIds = currentList.map(i => i.id);

        if (localStep === 0) {
            // FIN ETAPE 1 : Sauvegarde ordre réel
            const updatedPlayers = { ...sharedData.players, [user]: { ...myData, realOrder: orderedIds } };
            
            // On envoie à l'API
            await onAction({ sharedData: { ...sharedData, players: updatedPlayers } });
            
            // Passage local étape 2
            setLocalStep(1);
            // On remélange ou on reset pour la devinette ? 
            // Pour l'instant on remet la liste initiale pour que le joueur recommence à zéro
            setCurrentList(sharedData.mission.initialItems); 
        } else {
            // FIN ETAPE 2 : Sauvegarde devinette + FINISHED
            const updatedPlayers = { ...sharedData.players, [user]: { ...myData, guessOrder: orderedIds, finished: true } };
            const nextPhase = updatedPlayers[opponent]?.finished ? 'RESULTS' : 'INPUT';
            
            await onAction({ 
                sharedData: { ...sharedData, players: updatedPlayers, phase: nextPhase }, 
                status: nextPhase === 'RESULTS' ? 'finished' : undefined 
            });
        }
    } catch (error) {
        console.error("Erreur validation:", error);
        alert("Erreur lors de la validation. Vérifie la console.");
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- VUE RÉSULTATS ---
  if (sharedData.phase === 'RESULTS') {
    const calculateScore = (guessIds: any[], realIds: any[]) => {
        if (!guessIds || !realIds) return 0;
        let s = 0;
        guessIds.forEach((id, idx) => { if(String(id) === String(realIds[idx])) s++; });
        return s;
    };
    const myScore = calculateScore(myData?.guessOrder, oppData?.realOrder);
    const oppScore = calculateScore(oppData?.guessOrder, myData?.realOrder);

    return (
        <div className="space-y-8 animate-in fade-in pb-20">
            <div className="text-center space-y-2">
                <span className="text-4xl">📊</span>
                <h2 className="text-2xl font-black uppercase text-orange-600">Résultats</h2>
                <div className="flex justify-center gap-8 mt-4">
                    <div className="text-center"><p className="text-xs uppercase font-bold text-gray-400">Ton Score</p><p className="text-3xl font-black text-gray-800">{myScore}/5</p></div>
                    <div className="text-center"><p className="text-xs uppercase font-bold text-gray-400">{opponent}</p><p className="text-3xl font-black text-gray-800">{oppScore}/5</p></div>
                </div>
            </div>
            <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100">
                <h3 className="text-center font-bold text-sm text-orange-600 mb-4 uppercase">Tu as deviné...</h3>
                <div className="space-y-2">
                    {myData.guessOrder.map((id: number, idx: number) => {
                        const guessItem = sharedData.mission.items.find((i:any) => String(i.id) === String(id));
                        const realItem = sharedData.mission.items.find((i:any) => String(i.id) === String(oppData.realOrder[idx]));
                        const isMatch = String(id) === String(oppData.realOrder[idx]);
                        return (
                            <div key={idx} className={`flex items-center rounded-xl overflow-hidden border-2 ${isMatch ? 'border-green-400 bg-green-50' : 'border-red-100 bg-gray-50'}`}>
                                <div className="w-6 h-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 text-xs">{idx+1}</div>
                                <div className="flex-1 p-2 flex justify-between items-center">
                                    <div className="flex items-center gap-2"><img src={guessItem?.url} className="w-6 h-6 rounded-full object-cover"/><span className="text-xs font-bold truncate w-20">{guessItem?.label}</span></div>
                                    {isMatch ? <Check size={14} className="text-green-600"/> : <X size={14} className="text-red-300"/>}
                                    <div className="flex items-center gap-2 justify-end"><span className="text-xs font-bold truncate w-20 text-right">{realItem?.label}</span><img src={realItem?.url} className="w-6 h-6 rounded-full object-cover"/></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <button onClick={() => window.location.reload()} className="w-full py-4 rounded-2xl bg-gray-200 font-black text-gray-500 uppercase text-xs">Retour</button>
        </div>
    );
  }

  // --- VUE ATTENTE ---
  if (myData.finished) {
    return (
        <div className="flex flex-col items-center justify-center h-96 space-y-6 animate-in zoom-in">
            <div className="bg-orange-100 p-6 rounded-full animate-bounce"><BarChart3 size={40} className="text-orange-600"/></div>
            <div className="text-center"><h2 className="text-2xl font-black text-gray-800">C'est validé !</h2><p className="text-gray-500 font-medium">En attente de {opponent}...</p></div>
        </div>
    );
  }

  // --- VUE JEU (INPUT) ---
  const activeItem = activeId ? currentList.find(i => String(i.id) === String(activeId)) : null;

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-8 pb-20">
        <div className="text-center space-y-2">
            <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                Étape {localStep + 1}/2
            </span>
            <h2 className="text-xl font-black text-gray-800 leading-tight">
                {localStep === 0 ? "Quel est TON classement ?" : `Selon toi, que préfère ${opponent} ?`}
            </h2>
            <p className="text-xs text-gray-400 font-bold uppercase">Maintenir appuyé pour déplacer</p>
        </div>

        <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveId(null)}
        >
            <SortableContext 
                items={currentList.map(i => String(i.id))} 
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-3">
                    {currentList.map((item, index) => (
                        <SortableItem key={item.id} item={item} index={index} />
                    ))}
                </div>
            </SortableContext>

            <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
                {activeItem ? <SortableItem item={activeItem} isOverlay /> : null}
            </DragOverlay>
        </DndContext>

        <button 
            onClick={handleValidate} 
            disabled={isSubmitting}
            className={`w-full text-white font-black py-5 rounded-[2rem] shadow-xl uppercase tracking-widest text-sm transition-all
                ${isSubmitting ? 'bg-gray-400 cursor-wait' : 'bg-orange-600 active:scale-95 shadow-orange-200'}`}
        >
            {isSubmitting ? <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={16}/> Envoi...</span> : (localStep === 0 ? "Valider mon classement" : "Valider ma devinette")}
        </button>
    </div>
  );
}