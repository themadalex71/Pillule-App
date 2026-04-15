import Link from 'next/link';
import { Home } from 'lucide-react';
import type { ReactNode } from 'react';

type AppMiniHeaderProps = {
  title: string;
  homeHref?: string;
  rightSlot?: ReactNode;
};

export default function AppMiniHeader({ title, homeHref = '/hub', rightSlot }: AppMiniHeaderProps) {
  return (
    <div className="sticky top-0 z-20 border-b border-[#ece4f7] bg-[#fcf7f2] px-4 py-4">
      <div className="relative mx-auto flex w-full max-w-md items-center justify-between">
        <Link
          href={homeHref}
          aria-label="Retour a l'accueil"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ece4f7] bg-white text-[#6f628f] transition active:scale-[0.98]"
        >
          <Home size={20} />
        </Link>

        <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-xl font-bold text-[#7f68b7]">
          {title}
        </h1>

        <div className="flex h-10 min-w-10 items-center justify-end">
          {rightSlot || <div className="w-6" />}
        </div>
      </div>
    </div>
  );
}
