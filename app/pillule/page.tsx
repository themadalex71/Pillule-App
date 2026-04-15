import CalendrierView from '@/features/pilule/components/CalendrierView';
import AppMiniHeader from '@/components/AppMiniHeader';

export default function PillPage() {
  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[#fcf7f2] text-[#2e1065]">
      <AppMiniHeader title="Pilule" />

      <div className="w-full px-0 py-4">
        <CalendrierView />
      </div>
    </main>
  );
}
