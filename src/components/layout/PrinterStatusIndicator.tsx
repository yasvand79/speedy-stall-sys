import { useState } from 'react';
import { Printer, WifiOff, Loader2, AlertCircle, RefreshCw, Settings, Search, Unplug } from 'lucide-react';
import { useThermalPrinter } from '@/hooks/useThermalPrinter';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export function PrinterStatusIndicator() {
  const { qzStatus, printerName, isPrinting, connectQZ, disconnectQZ, detectPrinters, availablePrinters, selectPrinter, isNative } = useThermalPrinter();
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);

  const statusConfig = {
    connected: {
      icon: Printer,
      color: 'text-success',
      dotColor: 'bg-success',
      pulse: false,
      label: printerName ? `Connected: ${printerName}` : 'Printer connected',
      statusText: 'Connected',
    },
    connecting: {
      icon: Loader2,
      color: 'text-warning',
      dotColor: 'bg-warning',
      pulse: true,
      label: 'Connecting to printer...',
      statusText: 'Connecting...',
    },
    disconnected: {
      icon: WifiOff,
      color: 'text-muted-foreground',
      dotColor: 'bg-muted-foreground',
      pulse: false,
      label: 'Printer disconnected',
      statusText: 'Disconnected',
    },
    error: {
      icon: AlertCircle,
      color: 'text-destructive',
      dotColor: 'bg-destructive',
      pulse: false,
      label: 'Printer error',
      statusText: 'Error',
    },
  };

  const config = isPrinting
    ? { icon: Printer, color: 'text-primary', dotColor: 'bg-primary', pulse: true, label: 'Printing...', statusText: 'Printing...' }
    : statusConfig[qzStatus];

  const Icon = config.icon;

  const handleReconnect = async () => {
    await connectQZ();
  };

  const handleScan = async () => {
    setIsScanning(true);
    try {
      await detectPrinters();
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectPrinter = (name: string) => {
    selectPrinter(name);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
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
              config.dotColor,
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-64 p-0">
        {/* Status header */}
        <div className="flex items-center gap-3 p-3">
          <div className={cn(
            'flex items-center justify-center h-9 w-9 rounded-lg',
            qzStatus === 'connected' ? 'bg-success/10' : qzStatus === 'error' ? 'bg-destructive/10' : 'bg-muted'
          )}>
            <Icon className={cn('h-4 w-4', config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {printerName || 'No printer'}
            </p>
            <p className={cn('text-xs', config.color)}>{config.statusText}</p>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="p-1.5 space-y-0.5">
          {qzStatus === 'disconnected' || qzStatus === 'error' ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 h-8 text-xs"
              onClick={handleReconnect}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {isNative ? 'Reconnect Bluetooth' : 'Connect to QZ Tray'}
            </Button>
          ) : qzStatus === 'connected' ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 h-8 text-xs"
              onClick={disconnectQZ}
            >
              <Unplug className="h-3.5 w-3.5" />
              Disconnect
            </Button>
          ) : null}

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 h-8 text-xs"
            onClick={handleScan}
            disabled={isScanning}
          >
            {isScanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            {isScanning ? 'Scanning...' : 'Scan for printers'}
          </Button>

          {/* Available printers list */}
          {availablePrinters.length > 0 && (
            <>
              <Separator className="my-1" />
              <p className="text-[10px] font-medium text-muted-foreground px-2 py-1 uppercase tracking-wider">
                Available Printers
              </p>
              {availablePrinters.map((name) => (
                <Button
                  key={name}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'w-full justify-start gap-2 h-8 text-xs',
                    name === printerName && 'bg-accent text-accent-foreground'
                  )}
                  onClick={() => handleSelectPrinter(name)}
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span className="truncate">{name}</span>
                  {name === printerName && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-success" />
                  )}
                </Button>
              ))}
            </>
          )}

          <Separator className="my-1" />

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 h-8 text-xs text-muted-foreground"
            onClick={() => navigate('/settings')}
          >
            <Settings className="h-3.5 w-3.5" />
            Printer settings
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
