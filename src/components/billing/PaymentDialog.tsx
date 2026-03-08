import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useCreatePayment } from '@/hooks/usePayments';
import { useUpdateOrderStatus } from '@/hooks/useOrders';
import { useShopSettings } from '@/hooks/useShopSettings';
import { Database } from '@/integrations/supabase/types';
import { Banknote, Smartphone, CreditCard, CheckCircle, ArrowLeft, Loader2, Printer, Split } from 'lucide-react';
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

type Step = 'method' | 'amount' | 'qr' | 'split-setup' | 'split-cash' | 'split-upi' | 'success';

interface SplitPayment {
  cashAmount: number;
  upiAmount: number;
}

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
  const [split, setSplit] = useState<SplitPayment>({ cashAmount: 0, upiAmount: 0 });
  const [splitCashDone, setSplitCashDone] = useState(false);
  const navigate = useNavigate();

  const createPayment = useCreatePayment();
  const updateOrderStatus = useUpdateOrderStatus();
  const { settings } = useShopSettings();

  const remaining = total - paidAmount;
  const paymentAmount = parseFloat(amount) || 0;
  const shopName = settings?.shop_name || 'FoodShop';
  const upiId = settings?.upi_id;

  const upiUrl = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName)}&am=${(step === 'split-upi' ? split.upiAmount : paymentAmount).toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Order ${orderNumber}`)}`
    : '';

  useEffect(() => {
    if (open) {
      setStep('method');
      setMethod('cash');
      setAmount(remaining.toFixed(2));
      setSplit({ cashAmount: 0, upiAmount: 0 });
      setSplitCashDone(false);
    }
  }, [open, remaining]);

  const selectMethod = (m: PaymentMethod | 'split') => {
    if (m === 'split') {
      if (!upiId) {
        toast.error('Please configure UPI ID in Settings first');
        return;
      }
      const half = Math.round(remaining / 2);
      setSplit({ cashAmount: half, upiAmount: remaining - half });
      setStep('split-setup');
      return;
    }
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
    setStep('success');
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
    setStep('success');
  };

  // Split payment handlers
  const handleSplitCashConfirm = async () => {
    if (split.cashAmount <= 0) return;
    await createPayment.mutateAsync({
      order_id: orderId,
      amount: split.cashAmount,
      method: 'cash',
    });
    setSplitCashDone(true);
    setStep('split-upi');
  };

  const handleSplitUpiConfirm = async () => {
    if (split.upiAmount <= 0) return;
    await createPayment.mutateAsync({
      order_id: orderId,
      amount: split.upiAmount,
      method: 'upi',
    });
    // Both parts done — complete the order
    if (split.cashAmount + split.upiAmount >= remaining) {
      await updateOrderStatus.mutateAsync({ orderId, status: 'completed' });
    }
    setStep('success');
  };

  const handleCashAmountChange = (val: string) => {
    const cash = Math.max(0, Math.min(remaining, parseFloat(val) || 0));
    setSplit({ cashAmount: cash, upiAmount: Math.max(0, remaining - cash) });
  };

  const handleDone = () => {
    onOpenChange(false);
    navigate('/orders');
  };

  const escapeHtml = (str: string | null | undefined): string => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const handlePrintBill = () => {
    const paidInfo = splitCashDone
      ? `₹${split.cashAmount} (Cash) + ₹${split.upiAmount} (UPI)`
      : `₹${paymentAmount.toFixed(2)} (${method.toUpperCase()})`;
    const safeShopName = escapeHtml(shopName);
    const safeOrderNumber = escapeHtml(orderNumber);
    const billContent = `
      <html><head><title>Bill - ${safeOrderNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 300px; margin: 0 auto; }
        h2 { text-align: center; margin-bottom: 5px; }
        .line { border-bottom: 1px dashed #000; margin: 10px 0; }
        .row { display: flex; justify-content: space-between; margin: 5px 0; }
        .total { font-weight: bold; font-size: 16px; }
        .footer { text-align: center; margin-top: 20px; font-size: 11px; }
      </style></head><body>
        <h2>${safeShopName}</h2>
        <div class="line"></div>
        <div class="row"><span>Order #</span><span>${safeOrderNumber}</span></div>
        <div class="row"><span>Date</span><span>${new Date().toLocaleString()}</span></div>
        <div class="line"></div>
        <div class="row total"><span>Total</span><span>₹${total.toFixed(2)}</span></div>
        <div class="row"><span>Paid</span><span>${escapeHtml(paidInfo)}</span></div>
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
            
            {[
              { key: 'cash' as const, icon: Banknote, label: 'Cash', desc: 'Accept cash payment', color: 'text-green-600 bg-green-100' },
              { key: 'upi' as const, icon: Smartphone, label: 'UPI', desc: 'GPay, PhonePe, Paytm', color: 'text-blue-600 bg-blue-100' },
              { key: 'card' as const, icon: CreditCard, label: 'Card', desc: 'Debit or Credit card', color: 'text-primary bg-primary/10' },
            ].map(({ key, icon: Icon, label, desc, color }) => (
              <button
                key={key}
                onClick={() => selectMethod(key)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-accent transition-all text-left"
              >
                <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </button>
            ))}

            {/* Split Payment Option */}
            <button
              onClick={() => selectMethod('split')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-accent transition-all text-left"
            >
              <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 bg-orange-100 text-orange-600">
                <Split className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Split Payment</p>
                <p className="text-xs text-muted-foreground">Part Cash + Part UPI</p>
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
                <><CheckCircle className="mr-2 h-5 w-5" /> Collect ₹{paymentAmount.toFixed(0)} via {method === 'cash' ? 'Cash' : 'Card'}</>
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
                <QRCodeSVG value={upiUrl} size={180} level="H" includeMargin />
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
                  <><CheckCircle className="mr-2 h-5 w-5" /> Payment Received</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Split Setup - configure amounts */}
        {step === 'split-setup' && (
          <div className="p-6 space-y-5">
            <button onClick={() => setStep('method')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <p className="text-sm font-medium text-muted-foreground text-center">Split ₹{remaining.toFixed(0)} between Cash & UPI</p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-green-600" /> Cash Amount
                </Label>
                <Input
                  type="number"
                  value={split.cashAmount || ''}
                  onChange={(e) => handleCashAmountChange(e.target.value)}
                  className="text-center text-xl font-bold h-12"
                  placeholder="0"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-blue-600" /> UPI Amount
                </Label>
                <div className="text-center text-xl font-bold h-12 flex items-center justify-center rounded-md border bg-muted/50 text-foreground">
                  ₹{split.upiAmount.toFixed(0)}
                </div>
              </div>

              {/* Quick split buttons */}
              <div className="flex gap-2 justify-center">
                {[
                  { label: '50/50', cash: Math.round(remaining / 2) },
                  { label: '70/30', cash: Math.round(remaining * 0.7) },
                  { label: '30/70', cash: Math.round(remaining * 0.3) },
                ].map(({ label, cash }) => (
                  <button
                    key={label}
                    onClick={() => setSplit({ cashAmount: cash, upiAmount: remaining - cash })}
                    className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-accent transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={() => setStep('split-cash')}
              className="w-full h-12 text-base"
              disabled={split.cashAmount <= 0 || split.upiAmount <= 0}
            >
              Continue — Collect Cash First
            </Button>
          </div>
        )}

        {/* Step: Split - Collect Cash */}
        {step === 'split-cash' && (
          <div className="p-6 space-y-5">
            <button onClick={() => setStep('split-setup')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <div className="text-center space-y-2">
              <div className="mx-auto h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
                <Banknote className="h-7 w-7 text-green-600" />
              </div>
              <p className="text-lg font-bold text-foreground">Collect ₹{split.cashAmount.toFixed(0)} Cash</p>
              <p className="text-sm text-muted-foreground">Step 1 of 2</p>
              <Badge variant="secondary" className="text-xs">
                ₹{split.upiAmount.toFixed(0)} via UPI next
              </Badge>
            </div>

            <Button
              onClick={handleSplitCashConfirm}
              className="w-full h-12 text-base"
              disabled={createPayment.isPending}
            >
              {createPayment.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Recording...</>
              ) : (
                <><CheckCircle className="mr-2 h-5 w-5" /> Cash Collected — Next</>
              )}
            </Button>
          </div>
        )}

        {/* Step: Split - UPI QR */}
        {step === 'split-upi' && (
          <div className="p-6 space-y-5">
            <div className="text-center space-y-1">
              <Badge variant="default" className="text-xs mb-2">
                ✓ ₹{split.cashAmount.toFixed(0)} Cash collected
              </Badge>
              <p className="text-sm font-medium text-muted-foreground">Now collect ₹{split.upiAmount.toFixed(0)} via UPI</p>
              <p className="text-xs text-muted-foreground">Step 2 of 2</p>
            </div>

            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-3 rounded-xl shadow-sm border">
                <QRCodeSVG value={upiUrl} size={180} level="H" includeMargin />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Customer scans with <span className="font-semibold text-foreground">GPay</span>, <span className="font-semibold text-foreground">PhonePe</span>, or <span className="font-semibold text-foreground">Paytm</span>
              </p>
              <Button
                onClick={handleSplitUpiConfirm}
                className="w-full h-12 text-base"
                disabled={createPayment.isPending}
              >
                {createPayment.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  <><CheckCircle className="mr-2 h-5 w-5" /> UPI Payment Received</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="p-6 space-y-5 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">Payment Complete!</p>
              <p className="text-sm text-muted-foreground mt-1">
                {splitCashDone
                  ? `₹${split.cashAmount.toFixed(0)} Cash + ₹${split.upiAmount.toFixed(0)} UPI`
                  : `₹${paymentAmount.toFixed(0)} received via ${method.toUpperCase()}`
                }
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
