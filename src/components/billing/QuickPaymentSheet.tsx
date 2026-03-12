import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useShopSettings } from '@/hooks/useShopSettings';
import { Banknote, CheckCircle, Loader2, Printer } from 'lucide-react';
import { useThermalPrinter } from '@/contexts/ThermalPrinterContext';
import { CartItem } from './ProductGrid';

interface QuickPaymentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  orderNumber: string;
  orderId: string;
  cart: CartItem[];
  subtotal: number;
  gst: number;
  onCashReceived: () => void;
  onUpiConfirmed: () => void;
  isPaying: boolean;
  paymentDone: boolean;
  onDone: () => void;
}

export function QuickPaymentSheet({
  open, onOpenChange, total, orderNumber, orderId, cart,
  subtotal, gst, onCashReceived, onUpiConfirmed, isPaying, paymentDone, onDone,
}: QuickPaymentSheetProps) {
  const { settings } = useShopSettings();
  const { printBill, qzStatus, isPrinting } = useThermalPrinter();

  const upiId = settings?.upi_id;
  const shopName = settings?.shop_name || 'FoodShop';

  const upiUrl = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName)}&am=${total.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Order ${orderNumber}`)}`
    : '';

  const handlePrint = async (method: string) => {
    const thermalOrder = {
      orderNumber,
      type: 'dine-in',
      customerName: null as string | null,
      staffName: null as string | null,
      items: cart.map(c => ({
        name: c.menuItem.name,
        quantity: c.quantity,
        price: Number(c.menuItem.price),
      })),
      subtotal,
      gst,
      discount: 0,
      total,
      paymentMethod: method,
      paidAmount: total,
    };
    await printBill(thermalOrder);
  };

  // Auto-print when done and printer connected
  useEffect(() => {
    if (paymentDone && qzStatus === 'connected') {
      // small delay for UX
      const t = setTimeout(() => handlePrint('upi'), 500);
      return () => clearTimeout(t);
    }
  }, [paymentDone]);

  if (paymentDone) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm p-0 overflow-hidden gap-0" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Payment Complete</DialogTitle>
          <div className="bg-success text-success-foreground px-6 py-8 text-center">
            <CheckCircle className="h-16 w-16 mx-auto mb-3" />
            <p className="text-2xl font-bold font-display">Payment Done!</p>
            <p className="text-sm opacity-80 mt-1">Order {orderNumber} • ₹{total.toFixed(0)}</p>
          </div>
          <div className="p-6 space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handlePrint('upi')}
              disabled={isPrinting}
            >
              <Printer className="mr-2 h-4 w-4" />
              {isPrinting ? 'Printing...' : 'Print Receipt'}
            </Button>
            <Button className="w-full h-12 text-base" onClick={onDone}>
              Next Order →
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden gap-0" aria-describedby={undefined}>
        <DialogTitle className="sr-only">Pay ₹{total.toFixed(0)}</DialogTitle>

        {/* Amount header */}
        <div className="bg-primary text-primary-foreground px-6 py-5 text-center">
          <p className="text-sm opacity-80">Order {orderNumber}</p>
          <p className="text-3xl font-bold font-display mt-1">₹{total.toFixed(0)}</p>
        </div>

        <div className="p-6 space-y-5">
          {/* QR Code - default UPI */}
          {upiId ? (
            <div className="flex flex-col items-center space-y-3">
              <div className="bg-white p-3 rounded-xl shadow-sm border">
                <QRCodeSVG value={upiUrl} size={180} level="H" includeMargin />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Scan with <span className="font-semibold text-foreground">GPay</span>, <span className="font-semibold text-foreground">PhonePe</span>, or <span className="font-semibold text-foreground">Paytm</span>
              </p>
              <Button
                onClick={onUpiConfirmed}
                className="w-full h-11"
                disabled={isPaying}
              >
                {isPaying ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  <><CheckCircle className="mr-2 h-5 w-5" /> UPI Payment Received</>
                )}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-center text-muted-foreground">
              Configure UPI ID in Settings to show QR code
            </p>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Cash button */}
          <Button
            variant="outline"
            onClick={onCashReceived}
            className="w-full h-12 text-base border-2"
            disabled={isPaying}
          >
            {isPaying ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
            ) : (
              <><Banknote className="mr-2 h-5 w-5 text-success" /> Cash Received ₹{total.toFixed(0)}</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
