import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { BottomNav } from './BottomNav';
import { PrinterStatusIndicator } from './PrinterStatusIndicator';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  useSessionTimeout();

  return (
    <ThermalPrinterProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="sticky top-0 z-30 hidden md:flex h-12 items-center justify-between border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
              <SidebarTrigger className="-ml-1" />
              <PrinterStatusIndicator />
            </header>
            <main className="flex-1 p-4 md:p-6 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-6">
              {children}
            </main>
            {/* Mobile floating printer indicator */}
            <div className="fixed top-3 right-3 z-40 md:hidden rounded-full bg-background/90 backdrop-blur shadow-md border">
              <PrinterStatusIndicator />
            </div>
          </div>
        </div>
        <BottomNav />
      </SidebarProvider>
    </ThermalPrinterProvider>
  );
}
