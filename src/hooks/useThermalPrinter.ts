import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useShopSettings } from './useShopSettings';

type QZStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface OrderForPrint {
  orderNumber: string;
  type: string;
  tableNumber?: number | null;
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
const LINE_WIDTH = 48; // 80mm = 48 chars at default font

function textEncoder(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str.substring(0, len) : str + ' '.repeat(len - str.length);
}

function padLeft(str: string, len: number): string {
  return str.length >= len ? str.substring(0, len) : ' '.repeat(len - str.length) + str;
}

function centerText(text: string, width: number = LINE_WIDTH): string {
  if (text.length >= width) return text.substring(0, width);
  const pad = Math.floor((width - text.length) / 2);
  return ' '.repeat(pad) + text;
}

function dashedLine(width: number = LINE_WIDTH): string {
  return '-'.repeat(width);
}

export function buildEscPosData(order: OrderForPrint, shopSettings: any): number[] {
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
  data.push(ESC, 0x40); // ESC @ - Initialize

  // Center align
  data.push(ESC, 0x61, 0x01); // ESC a 1 - Center

  // Double height/width for shop name
  data.push(ESC, 0x21, 0x30); // Double width + double height
  data.push(...textEncoder(shopName + '\n'));
  
  // Reset to normal size
  data.push(ESC, 0x21, 0x00);

  // Address & phone
  if (address) {
    data.push(...textEncoder(address + '\n'));
  }
  if (phone) {
    data.push(...textEncoder('Tel: ' + phone + '\n'));
  }

  // Header text
  const headerText = shopSettings?.bill_header_text;
  if (headerText) {
    data.push(...textEncoder(headerText + '\n'));
  }

  // Left align for content
  data.push(ESC, 0x61, 0x00); // ESC a 0 - Left

  // Separator
  data.push(...textEncoder(dashedLine() + '\n'));

  // Center: CASH RECEIPT
  data.push(ESC, 0x61, 0x01);
  data.push(ESC, 0x45, 0x01); // Bold on
  data.push(...textEncoder('CASH RECEIPT\n'));
  data.push(ESC, 0x45, 0x00); // Bold off
  data.push(ESC, 0x61, 0x00); // Left

  data.push(...textEncoder(dashedLine() + '\n'));

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

  // Double line separator
  data.push(...textEncoder('='.repeat(LINE_WIDTH) + '\n'));

  // Column header: ITEM  QTY  RATE  AMT
  // Layout: Item(24) Qty(5) Rate(9) Amt(10) = 48
  data.push(ESC, 0x45, 0x01); // Bold on
  data.push(...textEncoder(
    padRight('ITEM', 24) + padLeft('QTY', 5) + padLeft('RATE', 9) + padLeft('AMT', 10) + '\n'
  ));
  data.push(ESC, 0x45, 0x00); // Bold off
  data.push(...textEncoder(dashedLine() + '\n'));

  // Items
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

  data.push(...textEncoder(dashedLine() + '\n'));

  // Subtotal
  data.push(...textEncoder(padRight('Sub Total', 32) + padLeft('₹' + order.subtotal.toFixed(2), 16) + '\n'));

  // GST
  if (order.gst > 0) {
    const gstRate = shopSettings?.gst_rate || 5;
    data.push(...textEncoder(padRight(`GST (${gstRate}%)`, 32) + padLeft('₹' + order.gst.toFixed(2), 16) + '\n'));
  }

  // Discount
  if (order.discount > 0) {
    data.push(...textEncoder(padRight('Discount', 32) + padLeft('-₹' + order.discount.toFixed(2), 16) + '\n'));
  }

  // Total - Bold + larger
  data.push(...textEncoder('='.repeat(LINE_WIDTH) + '\n'));
  data.push(ESC, 0x45, 0x01); // Bold
  data.push(ESC, 0x21, 0x10); // Double height
  data.push(...textEncoder(padRight('TOTAL', 24) + padLeft('₹' + order.total.toFixed(2), 24) + '\n'));
  data.push(ESC, 0x21, 0x00); // Normal size
  data.push(ESC, 0x45, 0x00); // Bold off
  data.push(...textEncoder('='.repeat(LINE_WIDTH) + '\n'));

  // Payment status
  data.push(ESC, 0x61, 0x01); // Center
  if (order.paymentMethod) {
    data.push(ESC, 0x45, 0x01);
    data.push(...textEncoder('PAID - ' + order.paymentMethod.toUpperCase() + '\n'));
    data.push(ESC, 0x45, 0x00);
  }
  data.push(ESC, 0x61, 0x00); // Left

  data.push(...textEncoder(dashedLine() + '\n'));

  // GSTIN & FSSAI
  if (showGstin && gstNumber) {
    data.push(...textEncoder(padRight('GSTIN', 12) + padLeft(gstNumber, LINE_WIDTH - 12) + '\n'));
  }
  if (showFssai && fssaiLicense) {
    data.push(...textEncoder(padRight('FSSAI', 12) + padLeft(fssaiLicense, LINE_WIDTH - 12) + '\n'));
  }
  if ((showGstin && gstNumber) || (showFssai && fssaiLicense)) {
    data.push(...textEncoder(dashedLine() + '\n'));
  }

  // Footer
  data.push(ESC, 0x61, 0x01); // Center
  data.push(ESC, 0x45, 0x01);
  data.push(...textEncoder(footerText + '\n'));
  data.push(ESC, 0x45, 0x00);
  data.push(...textEncoder('*'.repeat(32) + '\n'));

  if (billTerms) {
    data.push(...textEncoder(billTerms + '\n'));
  }

  if (showUpi && upiId) {
    data.push(...textEncoder('UPI: ' + upiId + '\n'));
  }

  data.push(...textEncoder('Computer generated receipt\n'));

  // Feed and cut
  data.push(ESC, 0x64, 0x04); // Feed 4 lines
  data.push(GS, 0x56, 0x00);  // Full cut

  return data;
}

async function loadQZScript(): Promise<void> {
  if (window.qz) return;

  return new Promise((resolve, reject) => {
    // Check if already loading
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

export function useThermalPrinter() {
  const [qzStatus, setQzStatus] = useState<QZStatus>('disconnected');
  const [printerName, setPrinterName] = useState<string | null>(null);
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const connectingRef = useRef(false);
  const { settings } = useShopSettings();

  // Get saved printer name from shop settings
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

  const connectQZ = useCallback(async () => {
    if (connectingRef.current) return;
    connectingRef.current = true;

    try {
      setQzStatus('connecting');
      await loadQZScript();

      const qz = window.qz;
      if (!qz) {
        throw new Error('QZ Tray library not available');
      }

      // Skip if already connected
      if (qz.websocket.isActive()) {
        setQzStatus('connected');
        connectingRef.current = false;
        return;
      }

      // Configure security (unsigned for local dev — in production, sign certificates)
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

      // Listen for disconnection
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
  }, []);

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
    const qz = window.qz;
    if (!qz || !qz.websocket.isActive()) {
      await connectQZ();
    }

    if (!window.qz?.websocket.isActive()) {
      toast.error('Not connected to QZ Tray');
      return [];
    }

    try {
      const printers = await window.qz.printers.find();
      const printerList = Array.isArray(printers) ? printers : [printers];
      setAvailablePrinters(printerList);

      // Auto-select saved printer if found
      if (savedPrinterName) {
        const match = printerList.find((p: string) =>
          p.toLowerCase().includes(savedPrinterName.toLowerCase())
        );
        if (match) {
          setPrinterName(match);
        }
      }

      return printerList;
    } catch (e: any) {
      console.error('Printer detection error:', e);
      toast.error('Failed to detect printers: ' + (e.message || 'Unknown error'));
      return [];
    }
  }, [connectQZ, savedPrinterName]);

  const selectPrinter = useCallback((name: string) => {
    setPrinterName(name);
  }, []);

  const printBill = useCallback(async (order: OrderForPrint, targetPrinter?: string): Promise<boolean> => {
    setIsPrinting(true);

    try {
      // Ensure connected
      if (!window.qz?.websocket.isActive()) {
        await connectQZ();
      }

      if (!window.qz?.websocket.isActive()) {
        toast.error('Cannot connect to QZ Tray. Falling back to browser print.');
        setIsPrinting(false);
        return false; // Signal caller to use fallback
      }

      // Determine printer
      const printer = targetPrinter || printerName;
      if (!printer) {
        // Try to auto-detect
        const detected = await detectPrinters();
        if (detected.length === 0) {
          toast.error('No printer found. Please check printer connection.');
          setIsPrinting(false);
          return false;
        }
        // Use first detected
        setPrinterName(detected[0]);
      }

      const finalPrinter = targetPrinter || printerName || availablePrinters[0];
      if (!finalPrinter) {
        toast.error('No printer selected.');
        setIsPrinting(false);
        return false;
      }

      // Build ESC/POS data
      const escPosData = buildEscPosData(order, settings);

      // Convert to base64 for QZ Tray
      const uint8 = new Uint8Array(escPosData);
      const base64 = btoa(String.fromCharCode(...uint8));

      // Create print config
      const config = window.qz.configs.create(finalPrinter);
      const printData = [
        { type: 'raw', format: 'base64', data: base64 }
      ];

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
  }, [connectQZ, detectPrinters, printerName, availablePrinters, settings]);

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

  // Auto-connect on mount (silently)
  useEffect(() => {
    const timer = setTimeout(() => {
      connectQZ().catch(() => {
        // Silent fail on auto-connect
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [connectQZ]);

  return {
    qzStatus,
    printerName,
    availablePrinters,
    isPrinting,
    connectQZ,
    disconnectQZ,
    detectPrinters,
    selectPrinter,
    printBill,
    printTestPage,
  };
}
