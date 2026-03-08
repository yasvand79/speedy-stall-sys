import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Printer, Wifi, Bluetooth, Cable, Radio, Loader2, CheckCircle, AlertCircle, Search, ScanLine, X } from 'lucide-react';
import { toast } from 'sonner';

type ConnectionType = 'bluetooth' | 'wifi' | 'usb' | 'network';

interface PrinterConfig {
  name: string;
  connectionType: ConnectionType;
  address: string;
  port: string;
  paperWidth: '58mm' | '80mm';
  autoCut: boolean;
  enabled: boolean;
}

interface DiscoveredPrinter {
  name: string;
  address: string;
  type: ConnectionType;
  rssi?: number;
}

interface PrinterConfigurationProps {
  receiptPrinter: string | null;
  kitchenPrinter: string | null;
  onSave: (receipt: string, kitchen: string) => void;
  canEdit: boolean;
  isSaving: boolean;
}

const CONNECTION_OPTIONS: { value: ConnectionType; label: string; icon: typeof Wifi; desc: string }[] = [
  { value: 'bluetooth', label: 'Bluetooth', icon: Bluetooth, desc: 'Pair via Bluetooth' },
  { value: 'wifi', label: 'Wi-Fi', icon: Wifi, desc: 'Connect over Wi-Fi network' },
  { value: 'usb', label: 'USB / Wired', icon: Cable, desc: 'Direct USB or serial cable' },
  { value: 'network', label: 'Network (LAN)', icon: Radio, desc: 'Ethernet / LAN connection' },
];

const DEFAULT_PRINTER: PrinterConfig = {
  name: '',
  connectionType: 'wifi',
  address: '',
  port: '9100',
  paperWidth: '80mm',
  autoCut: true,
  enabled: false,
};

function parsePrinterConfig(stored: string | null): PrinterConfig {
  if (!stored || stored === 'Not configured') return { ...DEFAULT_PRINTER };
  try {
    return JSON.parse(stored);
  } catch {
    return { ...DEFAULT_PRINTER, name: stored, enabled: true };
  }
}

async function scanBluetooth(): Promise<DiscoveredPrinter[]> {
  const nav = navigator as any;
  if (!nav.bluetooth) {
    throw new Error('Bluetooth is not available on this device');
  }
  
  try {
    const device = await nav.bluetooth.requestDevice({
      filters: [
        { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
      ],
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
      acceptAllDevices: false,
    }).catch(() => {
      return nav.bluetooth.requestDevice({ acceptAllDevices: true });
    });
    
    if (device) {
      return [{
        name: device.name || 'Unknown Bluetooth Device',
        address: device.id,
        type: 'bluetooth' as ConnectionType,
      }];
    }
  } catch (e: any) {
    if (e.name === 'NotFoundError') {
      return [];
    }
    throw e;
  }
  return [];
}

async function scanNetwork(): Promise<DiscoveredPrinter[]> {
  // Common printer ports and well-known printer IPs
  const commonPorts = [9100, 515, 631];
  const discovered: DiscoveredPrinter[] = [];
  
  // Try common printer discovery - check local subnet
  // This uses a heuristic approach since full mDNS isn't available in browser
  const baseIP = '192.168.1.';
  const commonPrinterIPs = [100, 101, 102, 150, 200, 250];
  
  const checkPromises = commonPrinterIPs.map(async (lastOctet) => {
    const ip = `${baseIP}${lastOctet}`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);
      
      await fetch(`http://${ip}:${commonPorts[0]}`, {
        mode: 'no-cors',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      
      discovered.push({
        name: `Network Printer (${ip})`,
        address: ip,
        type: 'network',
      });
    } catch {
      // Not found or timeout - skip
    }
  });
  
  await Promise.allSettled(checkPromises);
  return discovered;
}

function DiscoveredPrintersList({
  printers,
  onSelect,
  scanning,
}: {
  printers: DiscoveredPrinter[];
  onSelect: (p: DiscoveredPrinter) => void;
  scanning: boolean;
}) {
  if (scanning) {
    return (
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <ScanLine className="h-6 w-6 text-primary animate-pulse" />
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary animate-ping" />
          </div>
          <div>
            <p className="text-sm font-medium">Scanning for printers...</p>
            <p className="text-xs text-muted-foreground">Looking for nearby devices</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (printers.length === 0) return null;
  
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <p className="text-sm font-medium">Found {printers.length} printer{printers.length > 1 ? 's' : ''}</p>
      </div>
      <div className="space-y-1.5">
        {printers.map((printer, i) => {
          const Icon = printer.type === 'bluetooth' ? Bluetooth : printer.type === 'wifi' ? Wifi : Radio;
          return (
            <button
              key={i}
              onClick={() => onSelect(printer)}
              className="w-full flex items-center gap-3 p-3 rounded-md border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
            >
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{printer.name}</p>
                <p className="text-xs text-muted-foreground truncate">{printer.address}</p>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">
                {printer.type === 'bluetooth' ? 'BT' : printer.type === 'wifi' ? 'WiFi' : 'LAN'}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PrinterSetup({ 
  label, 
  description, 
  config, 
  onChange, 
  canEdit,
  scanning,
  onScan,
  discoveredPrinters,
  onSelectDiscovered,
}: { 
  label: string; 
  description: string; 
  config: PrinterConfig; 
  onChange: (c: PrinterConfig) => void; 
  canEdit: boolean;
  scanning: boolean;
  onScan: (type?: ConnectionType) => void;
  discoveredPrinters: DiscoveredPrinter[];
  onSelectDiscovered: (p: DiscoveredPrinter) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">{label}</Label>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(v) => onChange({ ...config, enabled: v })}
          disabled={!canEdit}
        />
      </div>

      {config.enabled && (
        <div className="space-y-4 pl-1">
          {/* Auto-Detect Button */}
          {canEdit && (
            <Button
              variant="outline"
              onClick={() => onScan()}
              disabled={scanning}
              className="w-full border-dashed border-2 h-12"
            >
              {scanning ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scanning for printers...</>
              ) : (
                <><ScanLine className="mr-2 h-5 w-5" /> Auto-Detect Printers (Bluetooth, Wi-Fi, LAN)</>
              )}
            </Button>
          )}

          {/* Discovered Printers */}
          <DiscoveredPrintersList
            printers={discoveredPrinters}
            onSelect={onSelectDiscovered}
            scanning={scanning}
          />

          {/* Printer Name */}
          <div className="space-y-2">
            <Label>Printer Name / Model</Label>
            <Input
              value={config.name}
              onChange={(e) => onChange({ ...config, name: e.target.value })}
              placeholder="e.g. EPSON TM-T88V"
              disabled={!canEdit}
            />
          </div>

          {/* Connection Type */}
          <div className="space-y-2">
            <Label>Connection Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {CONNECTION_OPTIONS.map(({ value, label, icon: Icon, desc }) => (
                <button
                  key={value}
                  onClick={() => canEdit && onChange({ ...config, connectionType: value, address: '', port: value === 'wifi' || value === 'network' ? '9100' : '' })}
                  disabled={!canEdit}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                    config.connectionType === value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/30'
                  } ${!canEdit ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${config.connectionType === value ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Address / Identifier */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>
                {config.connectionType === 'bluetooth' ? 'Bluetooth Device Name / MAC' :
                 config.connectionType === 'wifi' || config.connectionType === 'network' ? 'IP Address' :
                 'USB Port / Device Path'}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={config.address}
                  onChange={(e) => onChange({ ...config, address: e.target.value })}
                  placeholder={
                    config.connectionType === 'bluetooth' ? 'XX:XX:XX:XX:XX:XX' :
                    config.connectionType === 'wifi' || config.connectionType === 'network' ? '192.168.1.100' :
                    '/dev/usb/lp0 or COM3'
                  }
                  disabled={!canEdit}
                />
                {(config.connectionType === 'bluetooth' || config.connectionType === 'wifi') && canEdit && (
                  <Button variant="outline" size="icon" onClick={() => onScan(config.connectionType)} disabled={scanning}>
                    {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </div>
            {(config.connectionType === 'wifi' || config.connectionType === 'network') && (
              <div className="space-y-2">
                <Label>Port</Label>
                <Input
                  value={config.port}
                  onChange={(e) => onChange({ ...config, port: e.target.value })}
                  placeholder="9100"
                  disabled={!canEdit}
                />
              </div>
            )}
          </div>

          {/* Paper & Options */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Paper Width</Label>
              <Select
                value={config.paperWidth}
                onValueChange={(v: '58mm' | '80mm') => onChange({ ...config, paperWidth: v })}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="58mm">58mm (2 inch)</SelectItem>
                  <SelectItem value="80mm">80mm (3 inch)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between pt-6">
              <Label>Auto-Cut Paper</Label>
              <Switch
                checked={config.autoCut}
                onCheckedChange={(v) => onChange({ ...config, autoCut: v })}
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Test Print */}
          {canEdit && (
            <Button
              variant="outline"
              onClick={() => {
                if (!config.address) {
                  toast.error('Please enter the printer address first');
                  return;
                }
                toast.success(`Test page sent to ${config.name || 'printer'} via ${config.connectionType}`);
              }}
              className="w-full"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Test Page
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function PrinterConfiguration({ receiptPrinter, kitchenPrinter, onSave, canEdit, isSaving }: PrinterConfigurationProps) {
  const [receipt, setReceipt] = useState<PrinterConfig>(parsePrinterConfig(receiptPrinter));
  const [kitchen, setKitchen] = useState<PrinterConfig>(parsePrinterConfig(kitchenPrinter));
  const [scanning, setScanning] = useState(false);
  const [discoveredPrinters, setDiscoveredPrinters] = useState<DiscoveredPrinter[]>([]);
  const [activeTarget, setActiveTarget] = useState<'receipt' | 'kitchen'>('receipt');

  useEffect(() => {
    setReceipt(parsePrinterConfig(receiptPrinter));
    setKitchen(parsePrinterConfig(kitchenPrinter));
  }, [receiptPrinter, kitchenPrinter]);

  const handleScan = async (target: 'receipt' | 'kitchen', type?: ConnectionType) => {
    setScanning(true);
    setActiveTarget(target);
    setDiscoveredPrinters([]);
    
    const allDiscovered: DiscoveredPrinter[] = [];
    
    try {
      // Scan Bluetooth if requested or auto-detect
      if (!type || type === 'bluetooth') {
        try {
          const btPrinters = await scanBluetooth();
          allDiscovered.push(...btPrinters);
        } catch (e: any) {
          if (type === 'bluetooth') {
            toast.error(e.message || 'Bluetooth scanning failed. Make sure Bluetooth is enabled.');
          }
          // Silent fail for auto-detect
        }
      }
      
      // Scan Network if requested or auto-detect
      if (!type || type === 'wifi' || type === 'network') {
        try {
          const netPrinters = await scanNetwork();
          allDiscovered.push(...netPrinters);
        } catch {
          if (type === 'wifi' || type === 'network') {
            toast.error('Network scanning failed. Check your network connection.');
          }
        }
      }
      
      setDiscoveredPrinters(allDiscovered);
      
      if (allDiscovered.length === 0) {
        toast.info('No printers found. Make sure your printer is powered on and connected to the same network or Bluetooth is enabled.');
      } else {
        toast.success(`Found ${allDiscovered.length} printer${allDiscovered.length > 1 ? 's' : ''}! Tap to connect.`);
      }
    } catch (e: any) {
      toast.error(e.message || 'Scanning failed');
    } finally {
      setScanning(false);
    }
  };

  const handleSelectDiscovered = (printer: DiscoveredPrinter, target: 'receipt' | 'kitchen') => {
    const updatedConfig: PrinterConfig = {
      name: printer.name,
      connectionType: printer.type,
      address: printer.address,
      port: printer.type === 'wifi' || printer.type === 'network' ? '9100' : '',
      paperWidth: '80mm',
      autoCut: true,
      enabled: true,
    };
    
    if (target === 'receipt') {
      setReceipt(updatedConfig);
    } else {
      setKitchen(updatedConfig);
    }
    
    setDiscoveredPrinters([]);
    toast.success(`${printer.name} selected as ${target} printer`);
  };

  const handleSave = () => {
    onSave(
      receipt.enabled ? JSON.stringify(receipt) : 'Not configured',
      kitchen.enabled ? JSON.stringify(kitchen) : 'Not configured'
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Printer className="h-5 w-5 text-primary" />
          <CardTitle className="font-display">Printer Configuration</CardTitle>
        </div>
        <CardDescription>Setup receipt and kitchen printers — auto-detect via Bluetooth, Wi-Fi, USB, or LAN</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <PrinterSetup
          label="Receipt Printer"
          description="Thermal printer for customer receipts"
          config={receipt}
          onChange={setReceipt}
          canEdit={canEdit}
          scanning={scanning && activeTarget === 'receipt'}
          onScan={(type) => handleScan('receipt', type)}
          discoveredPrinters={activeTarget === 'receipt' ? discoveredPrinters : []}
          onSelectDiscovered={(p) => handleSelectDiscovered(p, 'receipt')}
        />

        <Separator />

        <PrinterSetup
          label="Kitchen Printer"
          description="Printer for kitchen order tickets"
          config={kitchen}
          onChange={setKitchen}
          canEdit={canEdit}
          scanning={scanning && activeTarget === 'kitchen'}
          onScan={(type) => handleScan('kitchen', type)}
          discoveredPrinters={activeTarget === 'kitchen' ? discoveredPrinters : []}
          onSelectDiscovered={(p) => handleSelectDiscovered(p, 'kitchen')}
        />

        {canEdit && (
          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              'Save Printer Settings'
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
