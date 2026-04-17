import React from 'react';
import { Search, ArrowDownWideNarrow, ArrowUpNarrowWide, StarHalf, Trophy } from 'lucide-react';
import { GENRES } from '../types';
import { useI18n } from '@/components/I18nProvider';

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
  const { t } = useI18n();
  if (!showFilters) return null;
  const currentYear = new Date().getFullYear();

  return (
    <div className="fixed inset-0 z-[950] bg-[rgba(76,44,128,0.18)] backdrop-blur-sm p-4 flex items-center justify-center" onClick={() => setShowFilters(false)}>
      <div className="bg-white border border-[#eee5dc] rounded-3xl w-full max-w-lg mx-auto p-5 animate-in zoom-in-95 duration-300 text-[#4b3d6d] shadow-[0_16px_34px_rgba(111,98,143,0.16)]" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-[#e5dbe0] rounded-full mx-auto mb-6"></div>
        <h2 className="font-semibold text-xl mb-5">{t("cinema.filters.title")}</h2>

        <div className="space-y-5">
          <div>
            <label className="text-sm font-semibold text-[#8d82a8] mb-2 block">{t("cinema.filters.searchLabel")}</label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b2a7c9]" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t("cinema.filters.searchPlaceholder")} className="w-full bg-[#fcfbff] border border-[#ece4f7] rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-[#c7b6e8]"/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-[#8d82a8] mb-2 block">{t("cinema.filters.genreLabel")}</label>
              <select value={filters.genre ?? ''} onChange={e => setFilters({...filters, genre: e.target.value ? Number(e.target.value) : null})} className="w-full bg-[#fcfbff] border border-[#ece4f7] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c7b6e8]">
                <option value="">{t("cinema.filters.genreAll")}</option>
                {GENRES.map(g => <option key={g.id} value={g.id}>{t(`cinema.genres.${g.id}`) || g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-[#8d82a8] mb-2 block">{t("cinema.filters.minRatingLabel")}</label>
              <select value={filters.minVote} onChange={e => setFilters({...filters, minVote: Number(e.target.value)})} className="w-full bg-[#fcfbff] border border-[#ece4f7] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c7b6e8]">
                {[0, 5, 6, 7, 8].map(v => <option key={v} value={v}>{v === 0 ? t("cinema.filters.noMinimum") : `${v}/10`}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-[#8d82a8] mb-2 block">{t("cinema.filters.minYearLabel")}</label>
              <input type="number" value={filters.minYear} onChange={e => setFilters({...filters, minYear: e.target.value})} placeholder={t("cinema.filters.minYearPlaceholder")} min="1900" max={currentYear} className="w-full bg-[#fcfbff] border border-[#ece4f7] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c7b6e8]"/>
            </div>
            <div>
              <label className="text-sm font-semibold text-[#8d82a8] mb-2 block">{t("cinema.filters.maxYearLabel")}</label>
              <input type="number" value={filters.maxYear} onChange={e => setFilters({...filters, maxYear: e.target.value})} placeholder={`${t("cinema.filters.examplePrefix")} ${currentYear}`} min="1900" max={currentYear} className="w-full bg-[#fcfbff] border border-[#ece4f7] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#c7b6e8]"/>
            </div>
          </div>

          {activeTab === 'catalogue' && (
            <div>
              <label className="text-sm font-semibold text-[#8d82a8] mb-2 block">{t("cinema.filters.sortByLabel")}</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setSortOption('newest')} className={`p-3 rounded-xl border flex items-center justify-center gap-2 ${sortOption === 'newest' ? 'bg-[#f3edf9] border-[#d7c5ef] text-[#5e4e89]' : 'bg-white border-[#ece4f7] text-[#8d82a8]'}`}><ArrowDownWideNarrow size={16}/> {t("cinema.filters.sortNewest")}</button>
                <button onClick={() => setSortOption('oldest')} className={`p-3 rounded-xl border flex items-center justify-center gap-2 ${sortOption === 'oldest' ? 'bg-[#f3edf9] border-[#d7c5ef] text-[#5e4e89]' : 'bg-white border-[#ece4f7] text-[#8d82a8]'}`}><ArrowUpNarrowWide size={16}/> {t("cinema.filters.sortOldest")}</button>
                <button onClick={() => setSortOption('rating')} className={`p-3 rounded-xl border flex items-center justify-center gap-2 ${sortOption === 'rating' ? 'bg-[#f3edf9] border-[#d7c5ef] text-[#5e4e89]' : 'bg-white border-[#ece4f7] text-[#8d82a8]'}`}><StarHalf size={16}/> {t("cinema.filters.sortRating")}</button>
                <button onClick={() => setSortOption('popularity.desc')} className={`p-3 rounded-xl border flex items-center justify-center gap-2 ${sortOption === 'popularity.desc' ? 'bg-[#f3edf9] border-[#d7c5ef] text-[#5e4e89]' : 'bg-white border-[#ece4f7] text-[#8d82a8]'}`}><Trophy size={16}/> {t("cinema.filters.sortPopularity")}</button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-8">
          <button onClick={resetFilters} className="w-full py-3 bg-[#f6f0eb] hover:bg-[#efe7de] rounded-xl font-semibold text-[#6f628f] transition">{t("cinema.filters.reset")}</button>
          <button onClick={applyFilters} className="w-full py-3 bg-[#ef9a79] hover:bg-[#e48f70] text-white rounded-xl font-semibold transition">{t("cinema.filters.apply")}</button>
        </div>
      </div>
    </div>
  );
}
