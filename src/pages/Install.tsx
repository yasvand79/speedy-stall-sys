import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Smartphone,
  Monitor,
  CheckCircle2,
  Share,
  MoreVertical,
  Plus,
  ArrowDown,
  ChefHat,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        {/* App branding */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <ChefHat className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">FoodShop Manager</h1>
          <p className="text-muted-foreground text-sm">
            Install the app on your device for the best experience
          </p>
        </div>

        {isInstalled ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-success" />
              <h2 className="text-lg font-semibold text-foreground">Already Installed!</h2>
              <p className="text-sm text-muted-foreground">
                FoodShop Manager is installed on your device. Open it from your home screen.
              </p>
              <Button onClick={() => window.location.href = '/'} className="mt-2">
                Open App
              </Button>
            </CardContent>
          </Card>
        ) : deferredPrompt ? (
          /* Android / Chrome install prompt available */
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
              <Download className="h-10 w-10 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Install App</h2>
              <p className="text-sm text-muted-foreground">
                Add FoodShop to your home screen for quick access, offline support, and a native app experience.
              </p>
              <Button size="lg" onClick={handleInstall} className="w-full mt-2">
                <Download className="h-4 w-4 mr-2" />
                Install FoodShop
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Manual instructions */
          <div className="space-y-4">
            {isIOS ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Install on iPhone / iPad</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { icon: Share, text: 'Tap the Share button in Safari' },
                    { icon: Plus, text: 'Scroll down and tap "Add to Home Screen"' },
                    { icon: CheckCircle2, text: 'Tap "Add" to confirm' },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex items-center gap-2">
                        <step.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-foreground">{step.text}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Install on your device</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { icon: MoreVertical, text: 'Tap the browser menu (⋮)' },
                    { icon: ArrowDown, text: 'Select "Install app" or "Add to Home Screen"' },
                    { icon: CheckCircle2, text: 'Confirm to install' },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex items-center gap-2">
                        <step.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-foreground">{step.text}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Features */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Offline', desc: 'Works without internet' },
            { label: 'Fast', desc: 'Instant loading' },
            { label: 'Secure', desc: 'HTTPS encrypted' },
          ].map((f) => (
            <div key={f.label} className="text-center p-3 rounded-xl bg-muted/50">
              <p className="text-sm font-medium text-foreground">{f.label}</p>
              <p className="text-[10px] text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Already have the app? <a href="/" className="text-primary underline">Go to dashboard →</a>
        </p>
      </div>
    </div>
  );
}
