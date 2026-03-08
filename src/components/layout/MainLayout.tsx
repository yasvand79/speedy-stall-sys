import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { BottomNav } from './BottomNav';
import { PrinterAlertDialog } from './PrinterAlertDialog';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import { useThermalPrinter } from '@/hooks/useThermalPrinter';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  useSessionTimeout();
  const { printerError, clearPrinterError } = useThermalPrinter();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 hidden md:flex h-12 items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
            <SidebarTrigger className="-ml-1" />
          </header>
          <main className="flex-1 p-4 md:p-6 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-6">
            {children}
          </main>
        </div>
      </div>
      <BottomNav />
      <PrinterAlertDialog error={printerError} onClose={clearPrinterError} />
    </SidebarProvider>
  );
}
