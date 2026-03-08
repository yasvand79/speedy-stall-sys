import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';

export type BluetoothStatus = 'disconnected' | 'scanning' | 'connecting' | 'connected' | 'printing' | 'error';

export interface BluetoothDevice {
  name: string;
  address: string;
  rssi?: number;
}

const BT_PRINTER_KEY = 'bt_default_printer';
const BT_PAPER_WIDTH_KEY = 'bt_paper_width';

function getSavedPrinter(): BluetoothDevice | null {
  try {
    const stored = localStorage.getItem(BT_PRINTER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function savePrinter(device: BluetoothDevice) {
  localStorage.setItem(BT_PRINTER_KEY, JSON.stringify(device));
}

export function getSavedPaperWidth(): '58mm' | '80mm' {
  return (localStorage.getItem(BT_PAPER_WIDTH_KEY) as '58mm' | '80mm') || '80mm';
}

export function savePaperWidth(width: '58mm' | '80mm') {
  localStorage.setItem(BT_PAPER_WIDTH_KEY, width);
}

export function useBluetoothPrinter() {
  const [status, setStatus] = useState<BluetoothStatus>('disconnected');
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [discoveredDevices, setDiscoveredDevices] = useState<BluetoothDevice[]>([]);
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>(getSavedPaperWidth);
  const pluginRef = useRef<any>(null);

  const isNative = Capacitor.isNativePlatform();

  // Dynamically import the Capacitor plugin
  const getPlugin = useCallback(async () => {
    if (pluginRef.current) return pluginRef.current;
    try {
      const mod = await import('capacitor-thermal-printer');
      pluginRef.current = mod.ThermalPrinter || mod.default;
      return pluginRef.current;
    } catch (e) {
      console.error('Failed to load thermal printer plugin:', e);
      return null;
    }
  }, []);

  const scanForPrinters = useCallback(async (): Promise<BluetoothDevice[]> => {
    if (!isNative) {
      toast.error('Bluetooth scanning is only available on mobile devices.');
      return [];
    }

    setStatus('scanning');
    setDiscoveredDevices([]);

    try {
      const plugin = await getPlugin();
      if (!plugin) {
        throw new Error('Thermal printer plugin not available');
      }

      // Request Bluetooth permissions
      try {
        await plugin.requestPermissions();
      } catch {
        // Some versions don't have this method
      }

      // List Bluetooth devices
      const result = await plugin.listPrinters({ type: 'bluetooth' });
      const devices: BluetoothDevice[] = (result?.printers || []).map((p: any) => ({
        name: p.name || 'Unknown Device',
        address: p.address || p.id,
        rssi: p.rssi,
      }));

      setDiscoveredDevices(devices);
      setStatus('disconnected');

      if (devices.length === 0) {
        toast.info('No Bluetooth printers found. Ensure your printer is powered on and in range.');
      } else {
        toast.success(`Found ${devices.length} Bluetooth printer${devices.length > 1 ? 's' : ''}`);
      }

      return devices;
    } catch (e: any) {
      console.error('Bluetooth scan error:', e);
      setStatus('error');

      if (e.message?.includes('permission') || e.message?.includes('denied')) {
        toast.error('Bluetooth permission denied. Please enable Bluetooth permissions in device settings.');
      } else if (e.message?.includes('disabled') || e.message?.includes('off')) {
        toast.error('Bluetooth is turned off. Please enable Bluetooth on your device.');
      } else {
        toast.error('Failed to scan for printers: ' + (e.message || 'Unknown error'));
      }
      return [];
    }
  }, [isNative, getPlugin]);

  const connectPrinter = useCallback(async (device: BluetoothDevice): Promise<boolean> => {
    if (!isNative) return false;

    setStatus('connecting');

    try {
      const plugin = await getPlugin();
      if (!plugin) throw new Error('Plugin not available');

      await plugin.requestPermissions?.();

      // Connect to the device
      await plugin.connect({
        type: 'bluetooth',
        id: device.address,
        address: device.address,
      });

      setConnectedDevice(device);
      savePrinter(device);
      setStatus('connected');
      toast.success(`Connected to ${device.name}`);
      return true;
    } catch (e: any) {
      console.error('Bluetooth connect error:', e);
      setStatus('error');
      toast.error('Failed to connect: ' + (e.message || 'Unknown error'));
      return false;
    }
  }, [isNative, getPlugin]);

  const disconnectPrinter = useCallback(async () => {
    try {
      const plugin = await getPlugin();
      if (plugin) {
        await plugin.disconnect?.();
      }
    } catch (e) {
      console.error('Disconnect error:', e);
    }
    setConnectedDevice(null);
    setStatus('disconnected');
  }, [getPlugin]);

  const sendRawData = useCallback(async (data: number[]): Promise<boolean> => {
    if (!isNative) return false;

    setStatus('printing');

    try {
      const plugin = await getPlugin();
      if (!plugin) throw new Error('Plugin not available');

      // If not connected, try to reconnect to saved printer
      if (!connectedDevice) {
        const saved = getSavedPrinter();
        if (saved) {
          const connected = await connectPrinter(saved);
          if (!connected) {
            setStatus('error');
            return false;
          }
        } else {
          toast.error('No printer connected. Go to Settings → Printer Configuration.');
          setStatus('error');
          return false;
        }
      }

      // Convert to base64 for the plugin
      const uint8 = new Uint8Array(data);
      const base64 = btoa(String.fromCharCode(...uint8));

      await plugin.printRawData({
        type: 'bluetooth',
        id: connectedDevice?.address || getSavedPrinter()?.address,
        data: base64,
      });

      setStatus('connected');
      toast.success('Bill printed successfully!');
      return true;
    } catch (e: any) {
      console.error('Print error:', e);
      setStatus('error');

      if (e.message?.includes('not connected') || e.message?.includes('disconnected')) {
        toast.error('Printer disconnected. Reconnecting...');
        // Try reconnect
        const saved = getSavedPrinter();
        if (saved) {
          const reconnected = await connectPrinter(saved);
          if (reconnected) {
            // Retry print once
            try {
              const plugin2 = await getPlugin();
              const uint8 = new Uint8Array(data);
              const base64 = btoa(String.fromCharCode(...uint8));
              await plugin2.printRawData({
                type: 'bluetooth',
                id: saved.address,
                data: base64,
              });
              setStatus('connected');
              toast.success('Bill printed on retry!');
              return true;
            } catch {
              toast.error('Print failed after reconnect.');
            }
          }
        }
      } else {
        toast.error('Print failed: ' + (e.message || 'Unknown error'));
      }
      return false;
    }
  }, [isNative, getPlugin, connectedDevice, connectPrinter]);

  const changePaperWidth = useCallback((width: '58mm' | '80mm') => {
    setPaperWidth(width);
    savePaperWidth(width);
  }, []);

  // Auto-reconnect to saved printer on mount
  useEffect(() => {
    if (!isNative) return;

    const saved = getSavedPrinter();
    if (saved) {
      setConnectedDevice(saved);
      // Attempt silent reconnect after a delay
      const timer = setTimeout(() => {
        connectPrinter(saved).catch(() => {
          // Silent fail on auto-reconnect
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isNative, connectPrinter]);

  return {
    status,
    connectedDevice,
    discoveredDevices,
    paperWidth,
    isNative,
    scanForPrinters,
    connectPrinter,
    disconnectPrinter,
    sendRawData,
    changePaperWidth,
  };
}
