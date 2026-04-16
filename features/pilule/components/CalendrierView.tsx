"use client";

import React, { useEffect, useState } from 'react';
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
import { Check, ChevronLeft, ChevronRight, MoonStar, Pill } from 'lucide-react';
import { getFirebaseAuth } from '@/lib/firebase/client';

const WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

type DayStatus = 'taken' | 'todo' | 'pause' | 'unknown';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    const auth = getFirebaseAuth();
    const token = await auth.currentUser?.getIdToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // no-op
  }

  return headers;
}

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
      const headers = await getAuthHeaders();
      await fetch('/api/sync-pill', {
        method: 'POST',
        headers,
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
      const headers = await getAuthHeaders();
      await fetch('/api/pilule/save-cycle', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          cycleStartDate: dateValue,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris',
        }),
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

  const getCellClasses = (status: DayStatus, isToday: boolean) => {
    const base =
      'aspect-square rounded-[1.1rem] border flex flex-col items-center justify-center text-sm transition select-none';
    const todayRing = isToday
      ? status === 'taken'
        ? ' ring-2 ring-[#8d7ac6]/45 border-[#8d7ac6] shadow-[0_0_0_2px_rgba(141,122,198,0.18)]'
        : ' ring-2 ring-[#ef9a79]/45 border-[#ef9a79] shadow-[0_0_0_2px_rgba(239,154,121,0.18)]'
      : '';

    if (status === 'taken') {
      return `${base} bg-[#f3edf9] border-[#d9cdf0] text-[#8d7ac6] shadow-[0_8px_18px_rgba(141,122,198,0.20)] ${todayRing}`;
    }

    if (status === 'todo') {
      return `${base} bg-[#fff7f1] border-[#ef9a79] text-[#cf6f4a] shadow-[0_10px_20px_rgba(239,154,121,0.18)] active:scale-[0.98] cursor-pointer ${todayRing}`;
    }

    if (status === 'pause') {
      return `${base} bg-[#fffaf7] border-[#f5ddd0] text-[#bea89b] opacity-90 ${todayRing}`;
    }

    return `${base} border-[#f6e4db] bg-[#fffdfb] text-[#dac8bd]`;
  };

  return (
    <div className="space-y-4 px-3">
      <section className="w-full overflow-hidden rounded-[1.6rem] border border-[#ef9a79] bg-white shadow-[0_14px_30px_rgba(239,154,121,0.24)]">
        <div className="border-b border-[#ef9a79]/35 bg-[linear-gradient(135deg,#ef9a79_0%,#e88f6d_100%)] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={onPrevMonth}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/45 bg-white/20 text-white shadow-[0_6px_14px_rgba(102,38,14,0.16)] transition active:scale-[0.97]"
              aria-label="Mois precedent"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="text-center">
              <h2 className="text-xl font-semibold capitalize tracking-[-0.03em] text-white">
                {format(currentDate, 'MMMM yyyy', { locale: fr })}
              </h2>
            </div>

            <button
              onClick={onNextMonth}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/45 bg-white/20 text-white shadow-[0_6px_14px_rgba(102,38,14,0.16)] transition active:scale-[0.97]"
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
                className="text-center text-[11px] font-bold uppercase tracking-[0.14em] text-[#ef9a79]"
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

      <section className="rounded-[1.4rem] border border-[#ef9a79] bg-white p-4 shadow-[0_14px_28px_rgba(239,154,121,0.18)] sm:rounded-[1.8rem] sm:px-5 sm:py-5">
        <label htmlFor="pill-cycle-start" className="mb-2 block text-sm font-semibold text-[#ef9a79]">
          Debut de plaquette
        </label>
        <input
          id="pill-cycle-start"
          type="date"
          value={datePickerValue}
          onChange={handleDateChange}
          className="w-full rounded-2xl border border-[#f6d5c2] bg-[#fff9f5] px-4 py-3 text-[#4b3d6d] outline-none transition focus:border-[#ef9a79] focus:ring-2 focus:ring-[#ef9a79]/25"
        />
      </section>
    </div>
  );
}
