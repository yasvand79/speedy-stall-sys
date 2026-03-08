import { Sidebar } from './Sidebar';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  useSessionTimeout();

  return (
    <div className="min-h-screen bg-background pb-[env(safe-area-inset-bottom)]">
      <Sidebar />
      <main className="pl-64">
        <div className="p-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
          {children}
        </div>
      </main>
    </div>
  );
}
