import { Sidebar } from './Sidebar';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  useSessionTimeout();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="pl-64">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
