import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreatePayment } from '@/hooks/usePayments';
import { useUpdateOrderStatus } from '@/hooks/useOrders';
import { useShopSettings } from '@/hooks/useShopSettings';
import { Database } from '@/integrations/supabase/types';
import { Banknote, Smartphone, CreditCard, CheckCircle, ArrowLeft, Loader2, Printer, Monitor } from 'lucide-react';
import { toast } from 'sonner';

type PaymentMethod = Database['public']['Enums']['payment_method'];

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  total: number;
  paidAmount: number;
  customerName?: string;
  customerPhone?: string;
}

type Step = 'method' | 'amount' | 'qr' | 'success';

export function PaymentDialog({ 
  open, 
  onOpenChange, 
  orderId, 
  orderNumber, 
  total, 
  paidAmount,
}: PaymentDialogProps) {
  const [step, setStep] = useState<Step>('method');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [amount, setAmount] = useState('');
  const customerWindowRef = useRef<Window | null>(null);
  const navigate = useNavigate();

  const createPayment = useCreatePayment();
  const updateOrderStatus = useUpdateOrderStatus();
  const { settings } = useShopSettings();

  const remaining = total - paidAmount;
  const paymentAmount = parseFloat(amount) || 0;
  const shopName = settings?.shop_name || 'FoodShop';
  const upiId = settings?.upi_id;

  const upiUrl = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName)}&am=${paymentAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Order ${orderNumber}`)}`
    : '';

  useEffect(() => {
    if (open) {
      setStep('method');
      setMethod('cash');
      setAmount(remaining.toFixed(2));
    }
  }, [open, remaining]);

  const selectMethod = (m: PaymentMethod) => {
    setMethod(m);
    if (m === 'upi') {
      if (!upiId) {
        toast.error('Please configure UPI ID in Settings first');
        return;
      }
      setStep('qr');
    } else {
      setStep('amount');
    }
  };

  const handleConfirmPayment = async () => {
    if (paymentAmount <= 0) return;

    await createPayment.mutateAsync({
      order_id: orderId,
      amount: paymentAmount,
      method,
    });

    if (paymentAmount >= remaining) {
      await updateOrderStatus.mutateAsync({ orderId, status: 'completed' });
    }

    notifyCustomerDisplay();
    setStep('success');
  };

  const notifyCustomerDisplay = () => {
    if (customerWindowRef.current && !customerWindowRef.current.closed) {
      customerWindowRef.current.postMessage({ type: 'PAYMENT_CONFIRMED' }, '*');
    }
  };

  const openCustomerDisplay = () => {
    const params = new URLSearchParams({
      amount: paymentAmount.toFixed(2),
      upiUrl,
      shop: shopName,
      order: orderNumber,
    });
    const url = `/customer-display?${params.toString()}`;
    customerWindowRef.current = window.open(url, 'customer-display', 'width=600,height=800');
  };

  const handleMarkUpiPaid = async () => {
    if (paymentAmount <= 0) return;

    await createPayment.mutateAsync({
      order_id: orderId,
      amount: paymentAmount,
      method: 'upi',
    });

    if (paymentAmount >= remaining) {
      await updateOrderStatus.mutateAsync({ orderId, status: 'completed' });
    }

    notifyCustomerDisplay();
    setStep('success');
  };

  const handleDone = () => {
    onOpenChange(false);
    navigate('/orders');
  };

  const handlePrintBill = () => {
    const billContent = `
      <html><head><title>Bill - ${orderNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 300px; margin: 0 auto; }
        h2 { text-align: center; margin-bottom: 5px; }
        .sub { text-align: center; font-size: 12px; margin-bottom: 20px; }
        .line { border-bottom: 1px dashed #000; margin: 10px 0; }
        .row { display: flex; justify-content: space-between; margin: 5px 0; }
        .total { font-weight: bold; font-size: 16px; }
        .footer { text-align: center; margin-top: 20px; font-size: 11px; }
      </style></head><body>
        <h2>${shopName}</h2>
        <div class="line"></div>
        <div class="row"><span>Order #</span><span>${orderNumber}</span></div>
        <div class="row"><span>Date</span><span>${new Date().toLocaleString()}</span></div>
        <div class="line"></div>
        <div class="row total"><span>Total</span><span>₹${total.toFixed(2)}</span></div>
        <div class="row"><span>Paid</span><span>₹${paymentAmount.toFixed(2)}</span></div>
        <div class="row"><span>Method</span><span>${method.toUpperCase()}</span></div>
        <div class="line"></div>
        <p class="footer">Thank you!</p>
      </body></html>
    `;
    const w = window.open('', '_blank');
    if (w) { w.document.write(billContent); w.document.close(); w.print(); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
        {/* Top bar with amount */}
        <div className="bg-primary text-primary-foreground px-6 py-5 text-center">
          <p className="text-sm opacity-80">Order {orderNumber}</p>
          <p className="text-3xl font-bold font-display mt-1">₹{remaining.toFixed(0)}</p>
          <p className="text-xs opacity-70 mt-1">
            {paidAmount > 0 ? `₹${paidAmount.toFixed(0)} already paid` : 'Amount due'}
          </p>
        </div>

        {/* Step: Choose Payment Method */}
        {step === 'method' && (
          <div className="p-6 space-y-3">
            <p className="text-sm font-medium text-muted-foreground text-center mb-4">How is the customer paying?</p>
            
            <button
              onClick={() => selectMethod('cash')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-accent transition-all text-left group"
            >
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                <Banknote className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Cash</p>
                <p className="text-xs text-muted-foreground">Accept cash payment</p>
              </div>
            </button>

            <button
              onClick={() => selectMethod('upi')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-accent transition-all text-left group"
            >
              <div className="h-12 w-12 rounded-full bg-info/10 flex items-center justify-center shrink-0">
                <Smartphone className="h-6 w-6 text-info" />
              </div>
              <div>
                <p className="font-semibold text-foreground">UPI</p>
                <p className="text-xs text-muted-foreground">GPay, PhonePe, Paytm</p>
              </div>
            </button>

            <button
              onClick={() => selectMethod('card')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-accent transition-all text-left group"
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Card</p>
                <p className="text-xs text-muted-foreground">Debit or Credit card</p>
              </div>
            </button>
          </div>
        )}

        {/* Step: Enter Amount (Cash/Card) */}
        {step === 'amount' && (
          <div className="p-6 space-y-5">
            <button onClick={() => setStep('method')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <div className="space-y-2">
              <Label htmlFor="pay-amount" className="text-sm text-muted-foreground">Payment Amount</Label>
              <Input
                id="pay-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-center text-2xl font-bold h-14"
                step="0.01"
                autoFocus
              />
              <div className="flex gap-2 justify-center">
                {[remaining, Math.ceil(remaining / 100) * 100, 500].filter((v, i, a) => a.indexOf(v) === i && v >= remaining).slice(0, 3).map(v => (
                  <button
                    key={v}
                    onClick={() => setAmount(v.toFixed(2))}
                    className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-accent transition-colors"
                  >
                    ₹{v}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleConfirmPayment}
              className="w-full h-12 text-base"
              disabled={createPayment.isPending || paymentAmount <= 0}
            >
              {createPayment.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Collect ₹{paymentAmount.toFixed(0)} via {method === 'cash' ? 'Cash' : 'Card'}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step: UPI QR Code */}
        {step === 'qr' && (
          <div className="p-6 space-y-5">
            <button onClick={() => setStep('method')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-3 rounded-xl shadow-sm border">
                <QRCodeSVG 
                  value={upiUrl} 
                  size={180}
                  level="H"
                  includeMargin
                />
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Customer scans with <span className="font-semibold text-foreground">GPay</span>, <span className="font-semibold text-foreground">PhonePe</span>, or <span className="font-semibold text-foreground">Paytm</span>
              </p>

              <Button
                onClick={handleMarkUpiPaid}
                className="w-full h-12 text-base"
                disabled={createPayment.isPending}
              >
                {createPayment.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Payment Received
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={openCustomerDisplay}
                className="w-full"
              >
                <Monitor className="mr-2 h-4 w-4" />
                Show to Customer
              </Button>
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="p-6 space-y-5 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">Payment Complete!</p>
              <p className="text-sm text-muted-foreground mt-1">
                ₹{paymentAmount.toFixed(0)} received via {method.toUpperCase()}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrintBill} className="flex-1">
                <Printer className="mr-2 h-4 w-4" />
                Print Bill
              </Button>
              <Button onClick={handleDone} className="flex-1">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
