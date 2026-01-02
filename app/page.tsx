import Link from 'next/link';
import { Pill, Clapperboard, ChefHat, Plus, PartyPopper } from 'lucide-react'; // Ajout de ChefHat

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center p-6">
      
      {/* En-tête */}
      <header className="w-full max-w-md mt-8 mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-gray-800 mb-2">Les Gogoles</h1>
        <p className="text-gray-500">Bienvenue dans le menu des plus Beaux ✨</p>
      </header>

      {/* Grille des Applications */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        
        {/* CARTE 1 : PILULE (Active) */}
        <Link href="/pillule" className="group">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-pink-100 hover:shadow-md hover:border-pink-300 transition-all flex flex-col items-center gap-3 cursor-pointer h-full">
            <div className="bg-pink-100 p-3 rounded-full group-hover:bg-pink-200 transition">
              <Pill className="text-pink-600" size={32} />
            </div>
            <span className="font-bold text-gray-700">Pilule</span>
          </div>
        </Link>

        {/* CARTE 2 : CINÉMA (Active) */}
        <Link href="/cinema" className="group">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-300 transition-all flex flex-col items-center gap-3 cursor-pointer h-full">
            <div className="bg-slate-100 p-3 rounded-full group-hover:bg-slate-200 transition">
              <Clapperboard className="text-slate-700" size={32} />
            </div>
            <span className="font-bold text-gray-700">Ciné / Séries</span>
          </div>
        </Link>

        {/* CARTE 3 : CUISINE (Active - NOUVEAU) */}
        <Link href="/cuisine" className="group">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 hover:shadow-md hover:border-orange-300 transition-all flex flex-col items-center gap-3 cursor-pointer h-full">
            <div className="bg-orange-100 p-3 rounded-full group-hover:bg-orange-200 transition">
              <ChefHat className="text-orange-600" size={32} />
            </div>
            <span className="font-bold text-gray-700">Cuistot</span>
          </div>
        </Link>

        {/* CARTE 4 : JEU QUOTIDIEN (Mise à jour vers /daily) */}
        <Link href="/daily" className="group">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100 hover:shadow-md hover:border-purple-300 transition-all flex flex-col items-center gap-3 cursor-pointer h-full">
            <div className="bg-purple-100 p-3 rounded-full group-hover:bg-purple-200 transition">
              <PartyPopper className="text-purple-600" size={32} />
            </div>
            <div className="flex flex-col items-center">
              <span className="font-bold text-gray-700 text-center">Défi du Jour</span>
              <span className="text-[10px] text-purple-500 font-bold uppercase tracking-wider">On S'aMuSe</span>
            </div>
          </div>
        </Link>

      </div>
    </main>
  );
}