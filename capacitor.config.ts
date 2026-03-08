import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.e4ad4b14b3db4ddea619ae7b332f895f',
  appName: 'FoodShop Manager',
  webDir: 'dist',
  server: {
    url: 'https://e4ad4b14-b3db-4dde-a619-ae7b332f895f.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#FFFAF5',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
