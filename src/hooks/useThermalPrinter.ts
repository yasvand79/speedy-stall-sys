import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { useShopSettings } from './useShopSettings';
import { useBluetoothPrinter, getSavedPaperWidth } from './useBluetoothPrinter';

type QZStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface OrderForPrint {
  orderNumber: string;
  type: string;
  customerName?: string | null;
  staffName?: string | null;
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
  subtotal: number;
  gst: number;
  discount: number;
  total: number;
  paymentMethod?: string;
  paidAmount?: number;
}

declare global {
  interface Window {
    qz: any;
  }
}

// ESC/POS command constants
const ESC = 0x1B;
const GS = 0x1D;

function getLineWidth(paperWidth: '58mm' | '80mm' = '80mm'): number {
  return paperWidth === '58mm' ? 32 : 48;
}

function textEncoder(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str.substring(0, len) : str + ' '.repeat(len - str.length);
}

function padLeft(str: string, len: number): string {
  return str.length >= len ? str.substring(0, len) : ' '.repeat(len - str.length) + str;
}

function dashedLine(width: number): string {
  return '-'.repeat(width);
}

export function buildEscPosData(order: OrderForPrint, shopSettings: any, paperWidth: '58mm' | '80mm' = '80mm'): number[] {
  const LINE_WIDTH = getLineWidth(paperWidth);
  const data: number[] = [];
  const shopName = shopSettings?.shop_name || 'Restaurant';
  const address = shopSettings?.address || '';
  const phone = shopSettings?.phone || '';
  const gstNumber = shopSettings?.gst_number || '';
  const fssaiLicense = shopSettings?.fssai_license || '';
  const footerText = shopSettings?.bill_footer_text || 'Thank You! Visit Again';
  const billTerms = shopSettings?.bill_terms || '';
  const upiId = shopSettings?.upi_id || '';
  const showGstin = shopSettings?.bill_show_gstin !== false;
  const showFssai = shopSettings?.bill_show_fssai !== false;
  const showUpi = shopSettings?.bill_show_upi !== false;

  // Initialize printer
  data.push(ESC, 0x40);

  // Center align
  data.push(ESC, 0x61, 0x01);

  // Double height/width for shop name
  data.push(ESC, 0x21, 0x30);
  data.push(...textEncoder(shopName + '\n'));

  // Reset to normal size
  data.push(ESC, 0x21, 0x00);

  if (address) data.push(...textEncoder(address + '\n'));
  if (phone) data.push(...textEncoder('Tel: ' + phone + '\n'));

  const headerText = shopSettings?.bill_header_text;
  if (headerText) data.push(...textEncoder(headerText + '\n'));

  // Left align
  data.push(ESC, 0x61, 0x00);
  data.push(...textEncoder(dashedLine(LINE_WIDTH) + '\n'));

  // Center: CASH RECEIPT
  data.push(ESC, 0x61, 0x01);
  data.push(ESC, 0x45, 0x01);
  data.push(...textEncoder('CASH RECEIPT\n'));
  data.push(ESC, 0x45, 0x00);
  data.push(ESC, 0x61, 0x00);

  data.push(...textEncoder(dashedLine(LINE_WIDTH) + '\n'));

  // Order info
  const orderDate = new Date();
  data.push(...textEncoder(padRight('Order #', 16) + padLeft(order.orderNumber, LINE_WIDTH - 16) + '\n'));
  data.push(...textEncoder(padRight('Date', 16) + padLeft(orderDate.toLocaleDateString('en-IN'), LINE_WIDTH - 16) + '\n'));
  data.push(...textEncoder(padRight('Time', 16) + padLeft(orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), LINE_WIDTH - 16) + '\n'));

  const orderTypeText = order.type === 'dine-in' && order.tableNumber
    ? `Dine-In / Table ${order.tableNumber}`
    : order.type === 'dine-in' ? 'Dine-In' : 'Takeaway';
  data.push(...textEncoder(padRight('Type', 16) + padLeft(orderTypeText, LINE_WIDTH - 16) + '\n'));

  if (order.customerName) {
    data.push(...textEncoder(padRight('Customer', 16) + padLeft(order.customerName, LINE_WIDTH - 16) + '\n'));
  }
  if (order.staffName) {
    data.push(...textEncoder(padRight('Staff', 16) + padLeft(order.staffName, LINE_WIDTH - 16) + '\n'));
  }

  data.push(...textEncoder('='.repeat(LINE_WIDTH) + '\n'));

  // Column header — adapt to paper width
  if (paperWidth === '58mm') {
    // 32 chars: Item(16) Qty(4) Amt(12)
    data.push(ESC, 0x45, 0x01);
    data.push(...textEncoder(padRight('ITEM', 16) + padLeft('QTY', 4) + padLeft('AMT', 12) + '\n'));
    data.push(ESC, 0x45, 0x00);
    data.push(...textEncoder(dashedLine(LINE_WIDTH) + '\n'));

    for (const item of order.items) {
      const itemTotal = item.quantity * item.price;
      const name = item.name.length > 16 ? item.name.substring(0, 15) + '.' : item.name;
      data.push(...textEncoder(
        padRight(name, 16) +
        padLeft(String(item.quantity), 4) +
        padLeft('₹' + itemTotal.toFixed(0), 12) +
        '\n'
      ));
    }
  } else {
    // 48 chars: Item(24) Qty(5) Rate(9) Amt(10)
    data.push(ESC, 0x45, 0x01);
    data.push(...textEncoder(
      padRight('ITEM', 24) + padLeft('QTY', 5) + padLeft('RATE', 9) + padLeft('AMT', 10) + '\n'
    ));
    data.push(ESC, 0x45, 0x00);
    data.push(...textEncoder(dashedLine(LINE_WIDTH) + '\n'));

    for (const item of order.items) {
      const itemTotal = item.quantity * item.price;
      const name = item.name.length > 24 ? item.name.substring(0, 23) + '.' : item.name;
      data.push(...textEncoder(
        padRight(name, 24) +
        padLeft(String(item.quantity), 5) +
        padLeft('₹' + item.price.toFixed(0), 9) +
        padLeft('₹' + itemTotal.toFixed(0), 10) +
        '\n'
      ));
    }
  }

  data.push(...textEncoder(dashedLine(LINE_WIDTH) + '\n'));

  // Totals
  const totalLabelWidth = paperWidth === '58mm' ? 20 : 32;
  const totalValueWidth = LINE_WIDTH - totalLabelWidth;

  data.push(...textEncoder(padRight('Sub Total', totalLabelWidth) + padLeft('₹' + order.subtotal.toFixed(2), totalValueWidth) + '\n'));

  if (order.gst > 0) {
    const gstRate = shopSettings?.gst_rate || 5;
    data.push(...textEncoder(padRight(`GST (${gstRate}%)`, totalLabelWidth) + padLeft('₹' + order.gst.toFixed(2), totalValueWidth) + '\n'));
  }

  if (order.discount > 0) {
    data.push(...textEncoder(padRight('Discount', totalLabelWidth) + padLeft('-₹' + order.discount.toFixed(2), totalValueWidth) + '\n'));
  }

  // Total - Bold + larger
  data.push(...textEncoder('='.repeat(LINE_WIDTH) + '\n'));
  data.push(ESC, 0x45, 0x01);
  data.push(ESC, 0x21, 0x10);
  const totalHalf = Math.floor(LINE_WIDTH / 2);
  data.push(...textEncoder(padRight('TOTAL', totalHalf) + padLeft('₹' + order.total.toFixed(2), totalHalf) + '\n'));
  data.push(ESC, 0x21, 0x00);
  data.push(ESC, 0x45, 0x00);
  data.push(...textEncoder('='.repeat(LINE_WIDTH) + '\n'));

  // Payment status
  data.push(ESC, 0x61, 0x01);
  if (order.paymentMethod) {
    data.push(ESC, 0x45, 0x01);
    data.push(...textEncoder('PAID - ' + order.paymentMethod.toUpperCase() + '\n'));
    data.push(ESC, 0x45, 0x00);
  }
  data.push(ESC, 0x61, 0x00);

  data.push(...textEncoder(dashedLine(LINE_WIDTH) + '\n'));

  // GSTIN & FSSAI
  if (showGstin && gstNumber) {
    data.push(...textEncoder(padRight('GSTIN', 12) + padLeft(gstNumber, LINE_WIDTH - 12) + '\n'));
  }
  if (showFssai && fssaiLicense) {
    data.push(...textEncoder(padRight('FSSAI', 12) + padLeft(fssaiLicense, LINE_WIDTH - 12) + '\n'));
  }
  if ((showGstin && gstNumber) || (showFssai && fssaiLicense)) {
    data.push(...textEncoder(dashedLine(LINE_WIDTH) + '\n'));
  }

  // Footer
  data.push(ESC, 0x61, 0x01);
  data.push(ESC, 0x45, 0x01);
  data.push(...textEncoder(footerText + '\n'));
  data.push(ESC, 0x45, 0x00);
  data.push(...textEncoder('*'.repeat(Math.min(32, LINE_WIDTH)) + '\n'));

  if (billTerms) data.push(...textEncoder(billTerms + '\n'));
  if (showUpi && upiId) data.push(...textEncoder('UPI: ' + upiId + '\n'));

  data.push(...textEncoder('Computer generated receipt\n'));

  // Feed and cut
  data.push(ESC, 0x64, 0x04);
  data.push(GS, 0x56, 0x00);

  return data;
}

// ─── QZ Tray loader (desktop only) ───

async function loadQZScript(): Promise<void> {
  if (window.qz) return;

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="qz-tray"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load QZ Tray library')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.min.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load QZ Tray library'));
    document.head.appendChild(script);
  });
}

// ─── Main hook ───

export function useThermalPrinter() {
  const isNative = Capacitor.isNativePlatform();
  const { settings } = useShopSettings();

  // Bluetooth printer (mobile)
  const bluetooth = useBluetoothPrinter();

  // QZ Tray state (desktop)
  const [qzStatus, setQzStatus] = useState<QZStatus>('disconnected');
  const [printerName, setPrinterName] = useState<string | null>(null);
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const connectingRef = useRef(false);

  const savedPrinterName = (() => {
    try {
      const receiptConfig = settings?.receipt_printer;
      if (!receiptConfig || receiptConfig === 'Not configured') return null;
      const parsed = JSON.parse(receiptConfig);
      return parsed?.name || null;
    } catch {
      return settings?.receipt_printer || null;
    }
  })();

  // ─── QZ Tray methods (desktop) ───

  const connectQZ = useCallback(async () => {
    if (isNative || connectingRef.current) return;
    connectingRef.current = true;

    try {
      setQzStatus('connecting');
      await loadQZScript();

      const qz = window.qz;
      if (!qz) throw new Error('QZ Tray library not available');

      if (qz.websocket.isActive()) {
        setQzStatus('connected');
        connectingRef.current = false;
        return;
      }

      qz.security.setCertificatePromise(() =>
        Promise.resolve(
          '-----BEGIN CERTIFICATE-----\n' +
          'MIIBszCCARigAwIBAgIJALx0gJtpBZFaMA0GCSqGSIb3DQEBCwUAMBMxETAPBgNV\n' +
          'BAMMCHFyLXRyYXkwHhcNMjMwMTAxMDAwMDAwWhcNMzMwMTAxMDAwMDAwWjATMREw\n' +
          'DwYDVQQDDAhxei10cmF5MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDFxFbM\n' +
          'CwNfaQX3IJCE1Hme2FWjFbJANRcTXOxxIx6T0+1FeT2EbJBFcKfRfoAjT0XQSEB8\n' +
          'GJSKiZ6O5G0Gv5GN9aXH5kT0LDxEv1L5PfhRJQ1jEpOgT0LNDv0qQ3+Y9T0LdWO\n' +
          'gDr5C+Iay6LFBr/P9DR1cDB+nmVMcMv3NthMJwIDAQABoyMwITAfBgNVHREEGDAW\n' +
          'hwR/AAABhwQAAAAAhwTAqAEBMA0GCSqGSIb3DQEBCwUAA4GBAGhGzMkU4+f6Efa0\n' +
          'iKeSU6OO8wdw+7x3l6bGx2QB0bIWqcr5xMw1gpjT7VtFQrwdg5oE3L5Sj0YkPN8\n' +
          'vMeNPCzU0FxO1sPBzPCl8B3Rtx5dhG0HZFQD9rRSq3JC7tJVSCzxSYx7DgXFoLDw\n' +
          'qTf/RN/Z2CyTf9NLZR7bfnLZ5KJ\n' +
          '-----END CERTIFICATE-----'
        )
      );

      qz.security.setSignatureAlgorithm('SHA512');
      qz.security.setSignaturePromise(() =>
        (hash: any) => Promise.resolve('')
      );

      await qz.websocket.connect();
      setQzStatus('connected');

      qz.websocket.setClosedCallbacks(() => {
        setQzStatus('disconnected');
      });
    } catch (e: any) {
      console.error('QZ Tray connection error:', e);
      setQzStatus('error');

      if (e.message?.includes('Unable to connect') || e.message?.includes('ECONNREFUSED')) {
        toast.error('QZ Tray is not running. Please start QZ Tray application.', {
          action: {
            label: 'Download',
            onClick: () => window.open('https://qz.io/download/', '_blank'),
          },
        });
      } else if (e.message?.includes('not available')) {
        toast.error('QZ Tray library could not be loaded. Check your internet connection.');
      }
    } finally {
      connectingRef.current = false;
    }
  }, [isNative]);

  const disconnectQZ = useCallback(async () => {
    try {
      const qz = window.qz;
      if (qz && qz.websocket.isActive()) {
        await qz.websocket.disconnect();
      }
      setQzStatus('disconnected');
    } catch (e) {
      console.error('QZ disconnect error:', e);
    }
  }, []);

  const detectPrinters = useCallback(async (): Promise<string[]> => {
    // On mobile, delegate to Bluetooth
    if (isNative) {
      const devices = await bluetooth.scanForPrinters();
      return devices.map(d => d.name);
    }

    // Check if QZ is connected first
    const qz = window.qz;
    if (!qz) {
      toast.error('Printer software not loaded', {
        description: 'Please wait for QZ Tray to initialize or refresh the page.',
      });
      return [];
    }

    if (!qz.websocket.isActive()) {
      toast.info('Connecting to printer software...', {
        description: 'Make sure QZ Tray is running on your computer.',
        action: {
          label: 'Download QZ Tray',
          onClick: () => window.open('https://qz.io/download/', '_blank'),
        },
        duration: 5000,
      });
      await connectQZ();
    }

    if (!window.qz?.websocket.isActive()) {
      toast.error('Cannot connect to QZ Tray', {
        description: 'QZ Tray must be installed and running to detect printers.',
        action: {
          label: 'Get QZ Tray',
          onClick: () => window.open('https://qz.io/download/', '_blank'),
        },
        duration: 8000,
      });
      return [];
    }

    try {
      const printers = await window.qz.printers.find();
      const printerList = Array.isArray(printers) ? printers : [printers];
      setAvailablePrinters(printerList);

      if (printerList.length === 0) {
        toast.warning('No printers found', {
          description: 'Make sure your thermal printer is connected and powered on.',
        });
      } else {
        toast.success(`Found ${printerList.length} printer(s)`, {
          description: printerList.slice(0, 3).join(', ') + (printerList.length > 3 ? '...' : ''),
        });
      }

      if (savedPrinterName) {
        const match = printerList.find((p: string) =>
          p.toLowerCase().includes(savedPrinterName.toLowerCase())
        );
        if (match) setPrinterName(match);
      }

      return printerList;
    } catch (e: any) {
      console.error('Printer detection error:', e);
      
      // More user-friendly error messages
      if (e.message?.includes('sendData is not a function') || e.message?.includes('websocket')) {
        toast.error('QZ Tray connection lost', {
          description: 'Please restart QZ Tray and try again.',
          action: {
            label: 'Reconnect',
            onClick: () => connectQZ(),
          },
        });
      } else {
        toast.error('Failed to detect printers', {
          description: e.message || 'Check if your printer is connected.',
        });
      }
      return [];
    }
  }, [isNative, bluetooth, connectQZ, savedPrinterName]);

  const selectPrinter = useCallback((name: string) => {
    setPrinterName(name);
  }, []);

  // ─── Unified print method ───

  const printBill = useCallback(async (order: OrderForPrint, targetPrinter?: string): Promise<boolean> => {
    const paperWidth = getSavedPaperWidth();
    const escPosData = buildEscPosData(order, settings, paperWidth);

    // Native mobile → Bluetooth
    if (isNative) {
      return bluetooth.sendRawData(escPosData);
    }

    // Desktop → QZ Tray
    setIsPrinting(true);

    try {
      if (!window.qz?.websocket.isActive()) {
        await connectQZ();
      }

      if (!window.qz?.websocket.isActive()) {
        toast.error('Cannot connect to QZ Tray. Falling back to browser print.');
        setIsPrinting(false);
        return false;
      }

      const printer = targetPrinter || printerName;
      if (!printer) {
        const detected = await detectPrinters();
        if (detected.length === 0) {
          toast.error('No printer found. Please check printer connection.');
          setIsPrinting(false);
          return false;
        }
        setPrinterName(detected[0]);
      }

      const finalPrinter = targetPrinter || printerName || availablePrinters[0];
      if (!finalPrinter) {
        toast.error('No printer selected.');
        setIsPrinting(false);
        return false;
      }

      const uint8 = new Uint8Array(escPosData);
      const base64 = btoa(String.fromCharCode(...uint8));

      const config = window.qz.configs.create(finalPrinter);
      const printData = [{ type: 'raw', format: 'base64', data: base64 }];

      await window.qz.print(config, printData);
      toast.success('Bill printed successfully!');
      setIsPrinting(false);
      return true;
    } catch (e: any) {
      console.error('Print error:', e);
      toast.error('Print failed: ' + (e.message || 'Unknown error'));
      setIsPrinting(false);
      return false;
    }
  }, [isNative, bluetooth, connectQZ, detectPrinters, printerName, availablePrinters, settings]);

  const printTestPage = useCallback(async (targetPrinter?: string): Promise<boolean> => {
    const testOrder: OrderForPrint = {
      orderNumber: 'TEST-001',
      type: 'dine-in',
      tableNumber: 1,
      customerName: 'Test Customer',
      staffName: 'Admin',
      items: [
        { name: 'Test Item 1', quantity: 2, price: 100 },
        { name: 'Test Item 2', quantity: 1, price: 150 },
        { name: 'Long Item Name Here', quantity: 3, price: 80 },
      ],
      subtotal: 590,
      gst: 29.5,
      discount: 0,
      total: 619.5,
      paymentMethod: 'cash',
    };
    return printBill(testOrder, targetPrinter);
  }, [printBill]);

  // Auto-connect on mount (desktop only, silently)
  useEffect(() => {
    if (isNative) return;
    const timer = setTimeout(() => {
      connectQZ().catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [connectQZ, isNative]);

  return {
    // Unified status
    qzStatus: isNative
      ? (bluetooth.status === 'connected' ? 'connected' : bluetooth.status === 'scanning' || bluetooth.status === 'connecting' ? 'connecting' : bluetooth.status === 'error' ? 'error' : 'disconnected') as QZStatus
      : qzStatus,
    printerName: isNative ? (bluetooth.connectedDevice?.name || null) : printerName,
    availablePrinters: isNative ? bluetooth.discoveredDevices.map(d => d.name) : availablePrinters,
    isPrinting: isNative ? bluetooth.status === 'printing' : isPrinting,
    isNative,
    connectQZ,
    disconnectQZ,
    detectPrinters,
    selectPrinter,
    printBill,
    printTestPage,
    // Bluetooth-specific exports
    bluetooth,
  };
}
