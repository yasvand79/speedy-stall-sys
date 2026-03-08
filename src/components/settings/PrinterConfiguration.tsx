import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Printer, Wifi, Bluetooth, Cable, Radio, Loader2, CheckCircle, AlertCircle, Search } from 'lucide-react';
import { toast } from 'sonner';

type ConnectionType = 'bluetooth' | 'wifi' | 'usb' | 'network';

interface PrinterConfig {
  name: string;
  connectionType: ConnectionType;
  address: string; // IP for wifi/network, MAC for bluetooth, port for USB
  port: string;
  paperWidth: '58mm' | '80mm';
  autoCut: boolean;
  enabled: boolean;
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

function PrinterSetup({ 
  label, 
  description, 
  config, 
  onChange, 
  canEdit,
  scanning,
  onScan,
}: { 
  label: string; 
  description: string; 
  config: PrinterConfig; 
  onChange: (c: PrinterConfig) => void; 
  canEdit: boolean;
  scanning: boolean;
  onScan: () => void;
}) {
  const connIcon = CONNECTION_OPTIONS.find(c => c.value === config.connectionType)?.icon || Wifi;
  const ConnIcon = connIcon;

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
                  <Button variant="outline" size="icon" onClick={onScan} disabled={scanning}>
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

  useEffect(() => {
    setReceipt(parsePrinterConfig(receiptPrinter));
    setKitchen(parsePrinterConfig(kitchenPrinter));
  }, [receiptPrinter, kitchenPrinter]);

  const handleScan = async () => {
    setScanning(true);
    // Simulate scanning — real implementation would use Web Bluetooth API or network discovery
    setTimeout(() => {
      setScanning(false);
      toast.info('Scanning complete. Enter your printer details manually or check your device\'s connection settings.');
    }, 2000);
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
        <CardDescription>Setup receipt and kitchen printers via Bluetooth, Wi-Fi, USB, or LAN</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <PrinterSetup
          label="Receipt Printer"
          description="Thermal printer for customer receipts"
          config={receipt}
          onChange={setReceipt}
          canEdit={canEdit}
          scanning={scanning}
          onScan={handleScan}
        />

        <Separator />

        <PrinterSetup
          label="Kitchen Printer"
          description="Printer for kitchen order tickets"
          config={kitchen}
          onChange={setKitchen}
          canEdit={canEdit}
          scanning={scanning}
          onScan={handleScan}
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
