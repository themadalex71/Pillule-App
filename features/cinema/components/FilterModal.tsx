// features/cinema/components/FilterModal.tsx
import React from 'react';
import { Search, ArrowDownWideNarrow, ArrowUpNarrowWide, StarHalf, Trophy } from 'lucide-react';
import { GENRES } from '../types';

interface FilterModalProps {
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  activeTab: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filters: { genre: number | null; minYear: string; maxYear: string; minVote: number };
  setFilters: (filters: any) => void;
  sortOption: string;
  setSortOption: (opt: string) => void;
  applyFilters: () => void;
  resetFilters: () => void;
}

export default function FilterModal({
  showFilters, setShowFilters, activeTab, searchQuery, setSearchQuery,
  filters, setFilters, sortOption, setSortOption, applyFilters, resetFilters
}: FilterModalProps) {
  if (!showFilters) return null;
  const currentYear = new Date().getFullYear();

  return (
    <div className="fixed inset-0 z-[950] bg-black/80 backdrop-blur-sm p-4 flex items-end" onClick={() => setShowFilters(false)}>
      <div className="bg-slate-900 border border-slate-700 rounded-t-3xl w-full max-w-lg mx-auto p-5 animate-in slide-in-from-bottom-10 duration-300" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-6"></div>
        <h2 className="font-bold text-xl mb-5">Filtres & Tri</h2>
        
        <div className="space-y-5">
          <div>
            <label className="text-sm font-bold text-slate-400 mb-2 block">Recherche</label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Titre d'un film..." className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-purple-500"/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-slate-400 mb-2 block">Genre</label>
              <select value={filters.genre ?? ''} onChange={e => setFilters({...filters, genre: e.target.value ? Number(e.target.value) : null})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-500">
                <option value="">Tous</option>
                {GENRES.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-bold text-slate-400 mb-2 block">Note min.</label>
              <select value={filters.minVote} onChange={e => setFilters({...filters, minVote: Number(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-500">
                {[0, 5, 6, 7, 8].map(v => <option key={v} value={v}>{v === 0 ? 'Aucune' : `${v}/10`}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-slate-400 mb-2 block">Année min.</label>
              <input type="number" value={filters.minYear} onChange={e => setFilters({...filters, minYear: e.target.value})} placeholder="Ex: 1990" min="1900" max={currentYear} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-500"/>
            </div>
            <div>
              <label className="text-sm font-bold text-slate-400 mb-2 block">Année max.</label>
              <input type="number" value={filters.maxYear} onChange={e => setFilters({...filters, maxYear: e.target.value})} placeholder={`Ex: ${currentYear}`} min="1900" max={currentYear} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-500"/>
            </div>
          </div>

          {activeTab === 'catalogue' && (
            <div>
              <label className="text-sm font-bold text-slate-400 mb-2 block">Trier par</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setSortOption('newest')} className={`p-3 rounded-xl border flex items-center justify-center gap-2 ${sortOption === 'newest' ? 'bg-purple-500/20 border-purple-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}><ArrowDownWideNarrow size={16}/> Plus récents</button>
                <button onClick={() => setSortOption('oldest')} className={`p-3 rounded-xl border flex items-center justify-center gap-2 ${sortOption === 'oldest' ? 'bg-purple-500/20 border-purple-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}><ArrowUpNarrowWide size={16}/> Plus anciens</button>
                <button onClick={() => setSortOption('rating')} className={`p-3 rounded-xl border flex items-center justify-center gap-2 ${sortOption === 'rating' ? 'bg-purple-500/20 border-purple-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}><StarHalf size={16}/> Mieux notés</button>
                <button onClick={() => setSortOption('popularity.desc')} className={`p-3 rounded-xl border flex items-center justify-center gap-2 ${sortOption === 'popularity.desc' ? 'bg-purple-500/20 border-purple-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}><Trophy size={16}/> Populaires</button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-8">
          <button onClick={resetFilters} className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-300 transition">Réinitialiser</button>
          <button onClick={applyFilters} className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-slate-900 rounded-xl font-black transition">Appliquer</button>
        </div>
      </div>
    </div>
  );
}