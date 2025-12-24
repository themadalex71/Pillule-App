import Link from 'next/link';
import { Pill, Clapperboard, ShoppingCart, Plus } from 'lucide-react'; // J'ai remplacé Wallet par Clapperboard

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

        {/* CARTE 3 : COURSES (Exemple futur) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 opacity-60 flex flex-col items-center gap-3 h-full grayscale relative">
          <div className="absolute top-2 right-2 bg-gray-200 text-xs px-2 py-1 rounded-full text-gray-500">Bientôt</div>
          <div className="bg-green-100 p-3 rounded-full">
            <ShoppingCart className="text-green-600" size={32} />
          </div>
          <span className="font-bold text-gray-400">Courses</span>
        </div>

        {/* CARTE 4 : AJOUTER */}
        <button className="border-2 border-dashed border-gray-300 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-gray-400 hover:bg-gray-50 transition h-full">
          <Plus size={32} />
          <span className="text-sm font-medium">Ajouter</span>
        </button>

      </div>
    </main>
  );
}