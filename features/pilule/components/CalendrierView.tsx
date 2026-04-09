"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  addMonths,
  differenceInDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  parse,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  MoonStar,
  Pill,
  Sparkles,
} from 'lucide-react';

const WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

type DayStatus = 'taken' | 'todo' | 'pause' | 'unknown';

export default function CalendrierView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [cycleStartDate, setCycleStartDate] = useState<Date | null>(null);
  const [takenDates, setTakenDates] = useState<string[]>([]);

  useEffect(() => {
    const savedDate = localStorage.getItem('cycleStart');
    if (savedDate) {
      setCycleStartDate(new Date(savedDate));
    }

    const savedTaken = localStorage.getItem('takenDates');
    if (savedTaken) {
      setTakenDates(JSON.parse(savedTaken));
    }
  }, []);

  const getDayStatus = (day: Date): DayStatus => {
    if (!cycleStartDate) return 'unknown';

    const start = new Date(cycleStartDate);
    start.setHours(0, 0, 0, 0);

    const current = new Date(day);
    current.setHours(0, 0, 0, 0);

    const diffTime = differenceInDays(current, start);
    if (diffTime < 0) return 'unknown';

    const positionInCycle = diffTime % 28;

    if (positionInCycle < 21) {
      const dateStr = format(day, 'yyyy-MM-dd');
      return takenDates.includes(dateStr) ? 'taken' : 'todo';
    }

    return 'pause';
  };

  const togglePill = async (day: Date, status: DayStatus) => {
    if (status === 'pause' || status === 'unknown') return;

    const dateStr = format(day, 'yyyy-MM-dd');
    let newTakenDates: string[];
    let newStatus: 'taken' | 'todo';

    if (takenDates.includes(dateStr)) {
      newTakenDates = takenDates.filter((d) => d !== dateStr);
      newStatus = 'todo';
    } else {
      newTakenDates = [...takenDates, dateStr];
      newStatus = 'taken';
    }

    setTakenDates(newTakenDates);
    localStorage.setItem('takenDates', JSON.stringify(newTakenDates));

    try {
      await fetch('/api/sync-pill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, status: newStatus }),
      });
    } catch (e) {
      console.error('Erreur de sauvegarde', e);
    }
  };

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (!dateValue) return;

    const newDate = parse(dateValue, 'yyyy-MM-dd', new Date());
    newDate.setHours(12, 0, 0, 0);

    setCycleStartDate(newDate);
    setCurrentDate(newDate);
    localStorage.setItem('cycleStart', newDate.toISOString());

    try {
      await fetch('/api/pilule/save-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleStart: newDate.toISOString() }),
      });
    } catch (err) {
      console.error('Erreur de sauvegarde', err);
    }
  };

  const onNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const onPrevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);
  const emptyDays = Array(startDayOfWeek === 0 ? 6 : startDayOfWeek - 1).fill(null);
  const totalCells = emptyDays.length + daysInMonth.length;
  const trailingEmptyDays = Array((7 - (totalCells % 7)) % 7).fill(null);
  const datePickerValue = cycleStartDate ? format(cycleStartDate, 'yyyy-MM-dd') : '';

  const todayStatus = getDayStatus(new Date());

  const stats = useMemo(() => {
    const currentMonthDays = daysInMonth.map((day) => ({
      day,
      status: getDayStatus(day),
    }));

    return {
      taken: currentMonthDays.filter(({ status }) => status === 'taken').length,
      todo: currentMonthDays.filter(({ status }) => status === 'todo').length,
      pause: currentMonthDays.filter(({ status }) => status === 'pause').length,
    };
  }, [daysInMonth, cycleStartDate, takenDates]);

  const todayLabel =
    todayStatus === 'taken'
      ? 'Prise validée'
      : todayStatus === 'todo'
        ? 'Prise prévue aujourd’hui'
        : todayStatus === 'pause'
          ? 'Jour de pause'
          : 'Cycle non configuré';

  const todayHelper =
    todayStatus === 'taken'
      ? 'Tout est à jour pour aujourd’hui.'
      : todayStatus === 'todo'
        ? 'Tu peux cocher la case du jour après la prise.'
        : todayStatus === 'pause'
          ? 'Aucune prise attendue pour ce jour.'
          : 'Choisis la date de début de ta dernière plaquette.';

  const getCellClasses = (status: DayStatus, isToday: boolean) => {
    const base =
      'aspect-square rounded-[1.1rem] border flex flex-col items-center justify-center text-sm transition select-none';
    const todayRing = isToday ? ' ring-2 ring-[#ef9a79]/25 border-[#ef9a79]' : '';

    if (status === 'taken') {
      return `${base} bg-[#eef8f1] border-[#d8ecdf] text-[#3f8b5f] shadow-[0_8px_18px_rgba(79,160,112,0.10)] ${todayRing}`;
    }

    if (status === 'todo') {
      return `${base} bg-[#fff7f1] border-[#f2decf] text-[#d07e5d] shadow-[0_8px_18px_rgba(239,154,121,0.12)] active:scale-[0.98] cursor-pointer ${todayRing}`;
    }

    if (status === 'pause') {
      return `${base} bg-[#f5f1fb] border-[#ece4f7] text-[#9c90b8] opacity-80 ${todayRing}`;
    }

    return `${base} border-transparent text-[#d3cbdf]`;
  };

  return (
    <div className="space-y-4">
      <section className="rounded-[1.8rem] border border-[#eee5dc] bg-white px-5 py-5 shadow-[0_12px_30px_rgba(111,98,143,0.08)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#ef9a79]">Aujourd’hui</p>
            <h2 className="mt-2 text-[1.6rem] font-semibold tracking-[-0.03em] text-[#4b3d6d]">
              {todayLabel}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#7d7298]">{todayHelper}</p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] border border-[#ece4f7] bg-[#fcfbff] text-[#7f68b7]">
            <CalendarDays size={22} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-[1.2rem] border border-[#f2decf] bg-[#fff7f1] p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#c98768]">À faire</p>
            <p className="mt-2 text-2xl font-semibold text-[#4b3d6d]">{stats.todo}</p>
          </div>
          <div className="rounded-[1.2rem] border border-[#d8ecdf] bg-[#eef8f1] p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#4fa070]">Validées</p>
            <p className="mt-2 text-2xl font-semibold text-[#4b3d6d]">{stats.taken}</p>
          </div>
          <div className="rounded-[1.2rem] border border-[#ece4f7] bg-[#f5f1fb] p-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8d82a8]">Pause</p>
            <p className="mt-2 text-2xl font-semibold text-[#4b3d6d]">{stats.pause}</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.8rem] border border-[#eee5dc] bg-white shadow-[0_12px_30px_rgba(111,98,143,0.08)]">
        <div className="border-b border-[#f3ece4] bg-[linear-gradient(135deg,#fff8f2_0%,#fcfbff_100%)] px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={onPrevMonth}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ece4f7] bg-white text-[#6f628f] transition active:scale-[0.97]"
              aria-label="Mois précédent"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#ef9a79]">Calendrier</p>
              <h3 className="mt-1 text-xl font-semibold capitalize tracking-[-0.03em] text-[#4b3d6d]">
                {format(currentDate, 'MMMM yyyy', { locale: fr })}
              </h3>
            </div>

            <button
              onClick={onNextMonth}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#ece4f7] bg-white text-[#6f628f] transition active:scale-[0.97]"
              aria-label="Mois suivant"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="px-4 pb-4 pt-3">
          <div className="mb-3 grid grid-cols-7 gap-2">
            {WEEK_DAYS.map((day, index) => (
              <div
                key={`${day}-${index}`}
                className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-[#a296ba]"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {emptyDays.map((_, i) => (
              <div key={`empty-start-${i}`} className="aspect-square" />
            ))}

            {daysInMonth.map((day) => {
              const status = getDayStatus(day);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => togglePill(day, status)}
                  disabled={status === 'pause' || status === 'unknown'}
                  className={getCellClasses(status, isToday)}
                >
                  <span className="font-semibold">{format(day, 'd')}</span>
                  {status === 'taken' && <Check size={15} className="mt-1 stroke-[3]" />}
                  {status === 'todo' && <Pill size={15} className="mt-1" />}
                  {status === 'pause' && <MoonStar size={15} className="mt-1" />}
                </button>
              );
            })}

            {trailingEmptyDays.map((_, i) => (
              <div key={`empty-end-${i}`} className="aspect-square" />
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[1.8rem] border border-[#eee5dc] bg-white px-5 py-5 shadow-[0_12px_30px_rgba(111,98,143,0.08)]">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border border-[#f2decf] bg-[#fff7f1] text-[#ef9a79]">
            <Sparkles size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#ef9a79]">Configuration</p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#4b3d6d]">
              Début de plaquette
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#7d7298]">
              Choisis le premier jour de ta dernière plaquette pour générer automatiquement le rythme prise / pause.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
          <label htmlFor="pill-cycle-start" className="mb-2 block text-sm font-semibold text-[#4b3d6d]">
            Date de départ
          </label>
          <input
            id="pill-cycle-start"
            type="date"
            value={datePickerValue}
            onChange={handleDateChange}
            className="w-full rounded-2xl border border-[#e7dff4] bg-white px-4 py-3 text-[#4b3d6d] outline-none transition focus:border-[#ef9a79] focus:ring-2 focus:ring-[#ef9a79]/20"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-[#6f628f]">
          <div className="flex items-center gap-3 rounded-[1.2rem] border border-[#f2decf] bg-[#fff7f1] px-4 py-3">
            <div className="h-3 w-3 rounded-full bg-[#ef9a79]" />
            Jour prévu de prise
          </div>
          <div className="flex items-center gap-3 rounded-[1.2rem] border border-[#d8ecdf] bg-[#eef8f1] px-4 py-3">
            <div className="h-3 w-3 rounded-full bg-[#4fa070]" />
            Prise déjà validée
          </div>
          <div className="flex items-center gap-3 rounded-[1.2rem] border border-[#ece4f7] bg-[#f5f1fb] px-4 py-3">
            <div className="h-3 w-3 rounded-full bg-[#9c90b8]" />
            Semaine de pause
          </div>
        </div>
      </section>
    </div>
  );
}
