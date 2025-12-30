"use client";

import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Pill, CalendarDays, Check } from 'lucide-react';

export default function CalendrierView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [cycleStartDate, setCycleStartDate] = useState<Date | null>(null);
  const [takenDates, setTakenDates] = useState<string[]>([]); // Liste des jours validés

  // 1. Au chargement, on récupère DEUX infos : le début du cycle ET les jours cochés
  useEffect(() => {
    const savedDate = localStorage.getItem('cycleStart');
    if (savedDate) setCycleStartDate(new Date(savedDate));

    const savedTaken = localStorage.getItem('takenDates');
    if (savedTaken) setTakenDates(JSON.parse(savedTaken));
  }, []);

  // 2. Gestion du clic sur une case
  const togglePill = async (day: Date, status: string) => {
    // On ne clique que sur les cases valides
    if (status === 'pause' || status === 'unknown') return;

    const dateStr = format(day, 'yyyy-MM-dd');
    let newTakenDates;
    let newStatus;

    // Logique visuelle (immédiat pour l'utilisateur)
    if (takenDates.includes(dateStr)) {
      newTakenDates = takenDates.filter(d => d !== dateStr);
      newStatus = 'todo'; // Elle décoche
    } else {
      newTakenDates = [...takenDates, dateStr];
      newStatus = 'taken'; // Elle coche
    }

    setTakenDates(newTakenDates);
    localStorage.setItem('takenDates', JSON.stringify(newTakenDates));

    // --- SAUVEGARDE DANS LE CLOUD (Invisible) ---
    try {
      await fetch('/api/sync-pill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, status: newStatus }),
      });
      console.log("Sauvegardé dans le cloud !");
    } catch (e) {
      console.error("Erreur de sauvegarde", e);
    }
  };

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (!dateValue) return;
    
    const newDate = new Date(dateValue);
    setCycleStartDate(newDate);
    localStorage.setItem('cycleStart', newDate.toISOString());

    // 👇 AJOUT : On prévient le serveur tout de suite !
    try {
      await fetch('/api/pilule/save-cycle', { // <--- Nouvelle adresse
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleStart: newDate.toISOString() }),
      });
      console.log("Date envoyée au serveur !");
    } catch (err) {
      console.error("Erreur de sauvegarde", err);
    }
  };

  const onNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const onPrevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  // --- LOGIQUE INTELLIGENTE ---
  const getDayStatus = (day: Date) => {
    if (!cycleStartDate) return 'unknown';
    
    const start = new Date(cycleStartDate);
    start.setHours(0,0,0,0);
    const current = new Date(day);
    current.setHours(0,0,0,0);

    const diffTime = differenceInDays(current, start);
    if (diffTime < 0) return 'unknown'; 

    const positionInCycle = diffTime % 28;

    // Si c'est un jour de prise (Jours 0 à 20)
    if (positionInCycle < 21) {
      // On regarde si la date est dans notre liste des "Pris"
      const dateStr = format(day, 'yyyy-MM-dd');
      if (takenDates.includes(dateStr)) return 'taken'; // VERT (Fait)
      return 'todo'; // BLEU (A faire)
    }
    
    return 'pause'; // GRIS
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);
  const emptyDays = Array(startDayOfWeek === 0 ? 6 : startDayOfWeek - 1).fill(null);
  const datePickerValue = cycleStartDate ? format(cycleStartDate, 'yyyy-MM-dd') : '';

  return (
    <div className="w-full max-w-md space-y-6">
      
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden select-none">
        <div className="bg-pink-500 p-4 flex justify-between items-center text-white">
          <button onClick={onPrevMonth} className="p-1 hover:bg-pink-600 rounded-full"><ChevronLeft /></button>
          <h2 className="text-lg font-bold capitalize">{format(currentDate, 'MMMM yyyy', { locale: fr })}</h2>
          <button onClick={onNextMonth} className="p-1 hover:bg-pink-600 rounded-full"><ChevronRight /></button>
        </div>

        <div className="grid grid-cols-7 bg-pink-50 p-2">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => (
            <div key={d} className="text-center text-xs font-bold text-pink-400">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 p-2 gap-2">
          {emptyDays.map((_, i) => <div key={`empty-${i}`} />)}
          
          {daysInMonth.map((day) => {
            const status = getDayStatus(day);
            const isToday = isSameDay(day, new Date());
            
            return (
              <div 
                key={day.toISOString()} 
                onClick={() => togglePill(day, status)}
                className={`
                  aspect-square flex flex-col items-center justify-center rounded-xl text-sm border-2 transition-all cursor-pointer relative
                  ${isToday ? 'border-pink-500 ring-2 ring-pink-200' : 'border-transparent'}
                  
                  ${status === 'taken' ? 'bg-green-100 text-green-700' : ''}
                  ${status === 'todo' ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' : ''}
                  ${status === 'pause' ? 'bg-gray-100 text-gray-400 opacity-50 cursor-default' : ''}
                  ${status === 'unknown' ? 'text-gray-300 cursor-default' : ''}
                `}
              >
                <span className="font-semibold">{format(day, 'd')}</span>
                
                {/* Icônes dynamiques */}
                {status === 'taken' && <Check size={16} className="mt-1 stroke-[3]" />}
                {status === 'todo' && <Pill size={16} className="mt-1 animate-pulse" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-md border border-pink-100">
        <div className="flex items-center gap-2 mb-2 text-pink-600 font-semibold">
          <CalendarDays size={20} />
          <span>Configuration</span>
        </div>
        <label className="block text-sm text-gray-600 mb-2">Début de la dernière plaquette :</label>
        <input 
          type="date" 
          value={datePickerValue}
          onChange={handleDateChange}
          className="w-full p-3 bg-pink-50 border border-pink-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
      </div>

    </div>
  );
}