import CalendrierView from '../components/CalendrierView'; // Note les ".." pour remonter d'un étage
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PillPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-pink-50 p-4">
      {/* Bouton retour au menu */}
      <div className="w-full max-w-md mb-4">
        <Link href="/" className="flex items-center text-pink-600 font-semibold hover:text-pink-800 transition">
          <ArrowLeft className="mr-2" size={20} />
          Retour au Menu
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-pink-600 mb-2">Rappel Pilule 🌸</h1>
      <p className="text-gray-600 mb-6 text-center">Ton suivi quotidien simplifié.</p>
      
      <CalendrierView />
    </main>
  );
}