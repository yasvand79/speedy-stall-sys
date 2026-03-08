import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useThermalPrinter } from '@/contexts/ThermalPrinterContext';
import {
  Download,
  Monitor,
  Printer,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Wifi,
  WifiOff,
  Smartphone,
  Bluetooth,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const desktopSteps = [
  {
    number: 1,
    title: 'Download QZ Tray',
    description: 'Download the QZ Tray application for your operating system. QZ Tray acts as a bridge between your browser and your thermal printer.',
    action: {
      label: 'Download QZ Tray',
      url: 'https://qz.io/download/',
    },
  },
  {
    number: 2,
    title: 'Install QZ Tray',
    description: 'Run the installer and follow the on-screen prompts. QZ Tray will install as a system service that starts automatically when your computer boots.',
    tips: [
      'Windows: Run the .exe installer as Administrator',
      'macOS: Open the .pkg file and follow prompts',
      'Linux: Use the .run file or install via package manager',
    ],
  },
  {
    number: 3,
    title: 'Connect your thermal printer',
    description: 'Connect your thermal printer to your computer via USB, Wi-Fi, or LAN cable. Make sure the printer is powered on and drivers are installed.',
    tips: [
      'Most USB thermal printers are plug-and-play',
      'For network printers, ensure they are on the same network',
      'Install manufacturer drivers if the printer is not auto-detected',
    ],
  },
  {
    number: 4,
    title: 'Verify connection',
    description: 'Click the "Test Connection" button below to check if QZ Tray is running and can detect your printer. You can also use the printer icon in the header.',
  },
];

const mobileSteps = [
  {
    number: 1,
    title: 'Enable Bluetooth',
    description: 'Turn on Bluetooth on your mobile device from the system settings.',
  },
  {
    number: 2,
    title: 'Power on your printer',
    description: 'Turn on your Bluetooth thermal printer and make sure it is in pairing mode. Refer to your printer manual for pairing instructions.',
  },
  {
    number: 3,
    title: 'Scan & connect',
    description: 'Go to Settings → Printer Configuration and tap "Scan for Bluetooth Printers". Select your printer from the list to pair.',
  },
  {
    number: 4,
    title: 'Test print',
    description: 'Use the "Print Test Page" button in Printer Configuration to verify everything works.',
  },
];

const troubleshooting = [
  {
    question: 'QZ Tray shows as disconnected',
    answer: 'Make sure QZ Tray is running (check your system tray). If it crashed, restart it from your Applications/Programs menu. Try clicking "Reconnect" in the printer indicator.',
  },
  {
    question: 'No printers detected',
    answer: 'Verify your printer is powered on and connected. Try restarting both the printer and QZ Tray. For network printers, ensure they are on the same network as your computer.',
  },
  {
    question: 'Print comes out blank or garbled',
    answer: 'Check paper width settings (58mm or 80mm) in Printer Configuration. Ensure the correct printer model is selected. Try printing a test page.',
  },
  {
    question: 'Browser blocks QZ Tray connection',
    answer: 'Some browsers block WebSocket connections. Try allowing the connection when prompted, or add an exception in your browser security settings.',
  },
  {
    question: 'Bluetooth printer not found (mobile)',
    answer: 'Ensure Bluetooth is enabled and the printer is in pairing mode. Move closer to the printer. Try restarting Bluetooth on your device.',
  },
];

export default function PrinterSetup() {
  const { qzStatus, printerName, connectQZ, detectPrinters, isNative } = useThermalPrinter();

  const isConnected = qzStatus === 'connected';
  const isConnecting = qzStatus === 'connecting';

  const handleTestConnection = async () => {
    await connectQZ();
    if (qzStatus === 'connected') {
      await detectPrinters();
    }
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Printer Setup Guide</h1>
          <p className="text-muted-foreground mt-1">
            Follow these steps to connect your thermal printer for receipt printing.
          </p>
        </div>

        {/* Current Status */}
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className={cn(
              'flex items-center justify-center h-12 w-12 rounded-xl',
              isConnected ? 'bg-success/10' : 'bg-muted'
            )}>
              {isConnected ? (
                <Printer className="h-6 w-6 text-success" />
              ) : (
                <WifiOff className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground">
                  {isConnected ? 'Printer Connected' : 'No Printer Connected'}
                </p>
                <Badge variant={isConnected ? 'default' : 'secondary'} className="text-[10px]">
                  {isConnected ? 'Online' : 'Offline'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {isConnected && printerName
                  ? `Active printer: ${printerName}`
                  : 'Follow the steps below to set up your printer'}
              </p>
            </div>
            <Button
              variant={isConnected ? 'outline' : 'default'}
              size="sm"
              onClick={handleTestConnection}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {isConnected ? 'Re-check' : 'Test Connection'}
            </Button>
          </CardContent>
        </Card>

        {/* Desktop Setup */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Desktop Setup (QZ Tray)</CardTitle>
            </div>
            <CardDescription>
              For computers and laptops — uses QZ Tray to communicate with USB, Wi-Fi, and LAN printers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {desktopSteps.map((step, index) => (
              <div key={step.number} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'flex items-center justify-center h-8 w-8 rounded-full text-sm font-bold shrink-0',
                    isConnected && step.number <= 4
                      ? 'bg-success text-success-foreground'
                      : 'bg-primary text-primary-foreground'
                  )}>
                    {isConnected && step.number <= 4 ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      step.number
                    )}
                  </div>
                  {index < desktopSteps.length - 1 && (
                    <div className="w-px flex-1 bg-border mt-2" />
                  )}
                </div>
                <div className="flex-1 pb-6">
                  <h3 className="font-medium text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                  {step.tips && (
                    <ul className="mt-2 space-y-1">
                      {step.tips.map((tip, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                          <ArrowRight className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  )}
                  {step.action && (
                    <Button
                      size="sm"
                      className="mt-3"
                      onClick={() => window.open(step.action!.url, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {step.action.label}
                      <ExternalLink className="h-3 w-3 ml-1.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Mobile Setup */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Mobile Setup (Bluetooth)</CardTitle>
            </div>
            <CardDescription>
              For phones and tablets — connect directly to Bluetooth thermal printers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {mobileSteps.map((step, index) => (
              <div key={step.number} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                    {step.number}
                  </div>
                  {index < mobileSteps.length - 1 && (
                    <div className="w-px flex-1 bg-border mt-2" />
                  )}
                </div>
                <div className="flex-1 pb-6">
                  <h3 className="font-medium text-foreground">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Supported Printers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Supported Printers</CardTitle>
            <CardDescription>Works with most ESC/POS compatible thermal printers.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                'Epson TM series',
                'Star TSP series',
                'Bixolon SRP series',
                'Citizen CT series',
                'POS-X EVO',
                'Generic 58mm/80mm',
              ].map((printer) => (
                <div
                  key={printer}
                  className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                  <span className="text-foreground">{printer}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Paper sizes supported: <strong>58mm</strong> and <strong>80mm</strong>. Configure in Settings → Printer Configuration.
            </p>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              <CardTitle className="text-lg">Troubleshooting</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {troubleshooting.map((item, index) => (
              <div key={index}>
                <h4 className="text-sm font-medium text-foreground">{item.question}</h4>
                <p className="text-sm text-muted-foreground mt-0.5">{item.answer}</p>
                {index < troubleshooting.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
