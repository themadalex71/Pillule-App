import { HeartPulse, Sparkles } from 'lucide-react';

import CalendrierView from '@/features/pilule/components/CalendrierView';
import AppMiniHeader from '@/components/AppMiniHeader';

export default function PillPage() {
  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[#fcf7f2] text-[#2e1065]">
      <AppMiniHeader title="Pilule" />

      <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-5 py-5">

        <section className="relative overflow-hidden rounded-[1.8rem] border border-[#eee5dc] bg-white px-5 py-6 shadow-[0_12px_30px_rgba(111,98,143,0.08)]">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#fff1e8]" />
          <div className="absolute right-8 top-12 h-12 w-12 rounded-full bg-[#f7ecff]" />

          <div className="relative">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] border border-[#f2decf] bg-[#fff7f1] text-[#ef9a79]">
                <HeartPulse size={22} />
              </div>
              <div className="rounded-full bg-[#fcfbff] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.28em] text-[#8d82a8]">
                Suivi cycle
              </div>
            </div>

            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#ef9a79]">Mini app</p>
            <h1 className="mt-2 text-[2rem] font-semibold tracking-[-0.03em] text-[#4b3d6d]">
              Rappel pilule
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-[#7d7298]">
              Un suivi simple, doux et lisible pour voir ton rythme de prise, repérer les jours en pause et garder ton cycle bien en main.
            </p>

            <div className="mt-5 flex items-start gap-3 rounded-[1.4rem] border border-[#ece4f7] bg-[#fcfbff] p-4">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#fff1e8] text-[#ef9a79]">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#4b3d6d]">Pensé pour le quotidien</p>
                <p className="mt-1 text-sm leading-6 text-[#7d7298]">
                  La vue mensuelle met en avant le jour du jour, les prises validées et les jours à venir avec le même langage visuel que le reste de l’app.
                </p>
              </div>
            </div>
          </div>
        </section>

        <CalendrierView />
      </div>
    </main>
  );
}
