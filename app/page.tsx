import CalendarView from './components/CalendrierView';

export default function Home() {
  return (
    <main className="min-h-screen p-4 flex flex-col items-center bg-pink-50 pt-10">
      <h1 className="text-3xl font-bold text-pink-600 mb-6">
        Bonjour ❤️
      </h1>
      
      {/* On affiche le calendrier ici */}
      <CalendarView />

    </main>
  );
}