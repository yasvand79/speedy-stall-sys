import { Printer, WifiOff, Loader2, AlertCircle } from 'lucide-react';
import { useThermalPrinter } from '@/hooks/useThermalPrinter';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export function PrinterStatusIndicator() {
  const { qzStatus, printerName, isPrinting } = useThermalPrinter();
  const navigate = useNavigate();

  const statusConfig = {
    connected: {
      icon: Printer,
      color: 'text-success',
      pulse: false,
      label: printerName ? `Connected: ${printerName}` : 'Printer connected',
    },
    connecting: {
      icon: Loader2,
      color: 'text-warning',
      pulse: true,
      label: 'Connecting to printer...',
    },
    disconnected: {
      icon: WifiOff,
      color: 'text-muted-foreground',
      pulse: false,
      label: 'Printer disconnected',
    },
    error: {
      icon: AlertCircle,
      color: 'text-destructive',
      pulse: false,
      label: 'Printer error',
    },
  };

  const config = isPrinting
    ? { icon: Printer, color: 'text-primary', pulse: true, label: 'Printing...' }
    : statusConfig[qzStatus];

  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => navigate('/settings')}
          className="relative flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors"
          aria-label={config.label}
        >
          <Icon
            className={cn(
              'h-4 w-4 transition-colors',
              config.color,
              config.pulse && 'animate-pulse'
            )}
          />
          <span
            className={cn(
              'absolute top-1 right-1 h-2 w-2 rounded-full border border-background',
              qzStatus === 'connected' && 'bg-success',
              qzStatus === 'connecting' && 'bg-warning',
              qzStatus === 'disconnected' && 'bg-muted-foreground',
              qzStatus === 'error' && 'bg-destructive',
            )}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="text-xs">{config.label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
