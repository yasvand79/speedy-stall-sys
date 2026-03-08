import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Monitor, Moon, Sun, Type } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const FONT_SIZE_KEY = 'app-font-size';

type FontSize = 'small' | 'default' | 'large';

const fontSizeClasses: Record<FontSize, string> = {
  small: 'text-sm',
  default: '',
  large: 'text-lg',
};

export default function DisplaySettings() {
  const { theme, setTheme } = useTheme();
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    return (localStorage.getItem(FONT_SIZE_KEY) as FontSize) || 'default';
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('text-sm', 'text-lg');
    const cls = fontSizeClasses[fontSize];
    if (cls) html.classList.add(cls);
    localStorage.setItem(FONT_SIZE_KEY, fontSize);
  }, [fontSize]);

  if (!mounted) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sun className="h-5 w-5" />
          Display Settings
        </CardTitle>
        <CardDescription>Customize the look and feel of the app</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme */}
        <div className="space-y-3">
          <Label>Theme</Label>
          <ToggleGroup
            type="single"
            value={theme}
            onValueChange={(v) => v && setTheme(v)}
            className="justify-start"
          >
            <ToggleGroupItem value="light" aria-label="Light theme" className="gap-1.5 px-3">
              <Sun className="h-4 w-4" />
              Light
            </ToggleGroupItem>
            <ToggleGroupItem value="dark" aria-label="Dark theme" className="gap-1.5 px-3">
              <Moon className="h-4 w-4" />
              Dark
            </ToggleGroupItem>
            <ToggleGroupItem value="system" aria-label="System theme" className="gap-1.5 px-3">
              <Monitor className="h-4 w-4" />
              System
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Font size */}
        <div className="space-y-3">
          <Label>Font Size</Label>
          <ToggleGroup
            type="single"
            value={fontSize}
            onValueChange={(v) => v && setFontSize(v as FontSize)}
            className="justify-start"
          >
            <ToggleGroupItem value="small" aria-label="Small font" className="gap-1.5 px-3">
              <Type className="h-3 w-3" />
              Small
            </ToggleGroupItem>
            <ToggleGroupItem value="default" aria-label="Default font" className="gap-1.5 px-3">
              <Type className="h-4 w-4" />
              Default
            </ToggleGroupItem>
            <ToggleGroupItem value="large" aria-label="Large font" className="gap-1.5 px-3">
              <Type className="h-5 w-5" />
              Large
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardContent>
    </Card>
  );
}
