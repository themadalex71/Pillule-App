'use client';

import { useEffect, useMemo, useState } from 'react';
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
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Props = {
  session: any;
  currentUserId: string;
  participantMap: Record<string, string>;
  onAction: (payload: any) => void;
};

function getName(participantMap: Record<string, string>, id?: string | null) {
  if (!id) return 'Un membre';
  return participantMap[id] || `Membre ${id.slice(0, 6)}`;
}

function getRingTarget(participantIds: string[], playerId: string) {
  if (participantIds.length === 0) return null;
  const index = participantIds.indexOf(playerId);
  if (index === -1) return participantIds[0];
  return participantIds[(index + 1) % participantIds.length];
}

function SortableItem({ item, index, isOverlay = false }: { item: any; index?: number; isOverlay?: boolean }) {
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
      className={`relative p-3 rounded-2xl border-2 flex items-center gap-4 select-none touch-none bg-white shadow-sm transition-all ${
        isOverlay
          ? 'shadow-2xl scale-105 border-orange-500 z-50 cursor-grabbing bg-orange-50'
          : 'border-white hover:border-orange-200 cursor-grab'
      }`}
    >
      <div className="text-gray-300">
        <GripVertical size={20} />
      </div>
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-black text-gray-400 text-sm">
        {index !== undefined ? index + 1 : '#'}
      </div>
      <img src={item.url} className="w-12 h-12 rounded-xl object-cover shadow-sm pointer-events-none" />
      <span className="font-bold text-gray-700 flex-1 text-sm">{item.label}</span>
    </div>
  );
}

export default function TierListGame({ session, currentUserId, participantMap, onAction }: Props) {
  const { sharedData } = session;

  if (!sharedData || !sharedData.players || !sharedData.mission) {
    return (
      <div className="p-10 text-center">
        <Loader2 className="animate-spin mx-auto" />
      </div>
    );
  }

  const participantIds: string[] = Array.isArray(session?.participants)
    ? session.participants
        .map((participant: any) => participant?.id)
        .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
    : Object.keys(sharedData.players || {});

  const myData = sharedData.players[currentUserId];
  if (!myData) {
    return (
      <div className="p-10 text-center bg-white rounded-[2.5rem] shadow-xl text-gray-500">
        Joueur introuvable dans cette session.
      </div>
    );
  }

  const opponentId = myData.targetId || getRingTarget(participantIds, currentUserId);
  const opponentData = opponentId ? sharedData.players[opponentId] : null;

  const [localStep, setLocalStep] = useState(0);
  const [currentList, setCurrentList] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (myData.guessOrder) {
      setLocalStep(1);
      return;
    }

    if (myData.realOrder) {
      setLocalStep(1);
      return;
    }

    setLocalStep(0);
  }, [myData.realOrder, myData.guessOrder]);

  useEffect(() => {
    if (sharedData.phase !== 'INPUT') return;
    if (currentList.length > 0) return;

    setCurrentList(sharedData.mission.initialItems || []);
  }, [sharedData.phase, sharedData.mission.initialItems, currentList.length]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
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
      const oldIndex = items.findIndex((item) => String(item.id) === String(active.id));
      const newIndex = items.findIndex((item) => String(item.id) === String(over.id));
      return arrayMove(items, oldIndex, newIndex);
    });

    setActiveId(null);
  };

  const handleValidate = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const orderedIds = currentList.map((item) => item.id);

      if (localStep === 0) {
        const updatedPlayers = {
          ...sharedData.players,
          [currentUserId]: { ...myData, realOrder: orderedIds },
        };

        await onAction({ sharedData: { ...sharedData, players: updatedPlayers } });

        setLocalStep(1);
        setCurrentList(sharedData.mission.initialItems || []);
      } else {
        const updatedPlayers = {
          ...sharedData.players,
          [currentUserId]: {
            ...sharedData.players[currentUserId],
            guessOrder: orderedIds,
            finished: true,
          },
        };

        const everyoneFinished = participantIds.every((id: string) => updatedPlayers[id]?.finished);
        const nextPhase = everyoneFinished ? 'RESULTS' : 'INPUT';

        await onAction({
          sharedData: {
            ...sharedData,
            players: updatedPlayers,
            phase: nextPhase,
          },
          status: everyoneFinished ? 'finished' : undefined,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeItem = activeId ? currentList.find((item) => String(item.id) === String(activeId)) : null;

  const everyoneFinishedCount = useMemo(
    () => Object.values(sharedData.players || {}).filter((value: any) => value?.finished).length,
    [sharedData.players],
  );

  if (sharedData.phase === 'RESULTS') {
    const guessOrder = myData.guessOrder || [];
    const realOrder = opponentData?.realOrder || [];
    const myScore = guessOrder.reduce(
      (sum: number, id: any, index: number) => (String(id) === String(realOrder[index]) ? sum + 1 : sum),
      0,
    );

    return (
      <div className="space-y-8 animate-in fade-in pb-20">
        <div className="text-center space-y-2">
          <BarChart3 size={44} className="mx-auto text-orange-500" />
          <h2 className="text-2xl font-black uppercase text-orange-600">Resultats</h2>
          <div className="text-center mt-4">
            <p className="text-xs uppercase font-bold text-gray-400">Ton Score</p>
            <p className="text-3xl font-black text-gray-800">{myScore}/5</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100">
          <h3 className="text-center font-bold text-sm text-orange-600 mb-4 uppercase">
            Ta prediction de {getName(participantMap, opponentId)}
          </h3>
          <div className="space-y-2">
            {guessOrder.map((id: number, index: number) => {
              const guessItem = sharedData.mission.items.find((item: any) => String(item.id) === String(id));
              const realItem = sharedData.mission.items.find((item: any) => String(item.id) === String(realOrder[index]));
              const isMatch = String(id) === String(realOrder[index]);

              return (
                <div
                  key={index}
                  className={`flex items-center rounded-xl overflow-hidden border-2 ${
                    isMatch ? 'border-green-400 bg-green-50' : 'border-red-100 bg-gray-50'
                  }`}
                >
                  <div className="w-6 h-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 text-xs">
                    {index + 1}
                  </div>
                  <div className="flex-1 p-2 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <img src={guessItem?.url} className="w-6 h-6 rounded-full object-cover" />
                      <span className="text-xs font-bold truncate w-20">{guessItem?.label}</span>
                    </div>
                    {isMatch ? <Check size={14} className="text-green-600" /> : <X size={14} className="text-red-300" />}
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-xs font-bold truncate w-20 text-right">{realItem?.label}</span>
                      <img src={realItem?.url} className="w-6 h-6 rounded-full object-cover" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (myData.finished) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-6 animate-in zoom-in">
        <div className="bg-orange-100 p-6 rounded-full animate-bounce">
          <BarChart3 size={40} className="text-orange-600" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-black text-gray-800">C'est valide !</h2>
          <p className="text-gray-500 font-medium">
            En attente des autres membres ({everyoneFinishedCount}/{participantIds.length})...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-8 pb-20">
      <div className="text-center space-y-2">
        <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
          Etape {localStep + 1}/2
        </span>
        <h2 className="text-xl font-black text-gray-800 leading-tight">
          {localStep === 0
            ? 'Quel est TON classement ?'
            : `Selon toi, que prefere ${getName(participantMap, opponentId)} ?`}
        </h2>
        <p className="text-xs text-gray-400 font-bold uppercase">Maintenir appuye pour deplacer</p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <SortableContext items={currentList.map((item) => String(item.id))} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {currentList.map((item, index) => (
              <SortableItem key={item.id} item={item} index={index} />
            ))}
          </div>
        </SortableContext>

        <DragOverlay
          dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: { active: { opacity: '0.5' } },
            }),
          }}
        >
          {activeItem ? <SortableItem item={activeItem} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      <button
        onClick={handleValidate}
        disabled={isSubmitting}
        className={`w-full text-white font-black py-5 rounded-[2rem] shadow-xl uppercase tracking-widest text-sm transition-all ${
          isSubmitting ? 'bg-gray-400 cursor-wait' : 'bg-orange-600 active:scale-95 shadow-orange-200'
        }`}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" size={16} /> Envoi...
          </span>
        ) : localStep === 0 ? (
          'Valider mon classement'
        ) : (
          'Valider ma devinette'
        )}
      </button>
    </div>
  );
}
