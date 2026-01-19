import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCreatePayment } from '@/hooks/usePayments';
import { useUpdateOrderStatus } from '@/hooks/useOrders';
import { useShopSettings } from '@/hooks/useShopSettings';
import { useRazorpay } from '@/hooks/useRazorpay';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { Banknote, Smartphone, CreditCard, Printer, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
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

interface QrPaymentState {
  paymentLinkId: string;
  shortUrl: string;
  isPolling: boolean;
  isPaid: boolean;
}

export function PaymentDialog({ 
  open, 
  onOpenChange, 
  orderId, 
  orderNumber, 
  total, 
  paidAmount,
  customerName,
  customerPhone,
}: PaymentDialogProps) {
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [amount, setAmount] = useState((total - paidAmount).toFixed(2));
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrState, setQrState] = useState<QrPaymentState | null>(null);
  const [isCreatingQr, setIsCreatingQr] = useState(false);
  const navigate = useNavigate();

  const createPayment = useCreatePayment();
  const updateOrderStatus = useUpdateOrderStatus();
  const { settings } = useShopSettings();
  const razorpay = useRazorpay();

  const remaining = total - paidAmount;
  const paymentAmount = parseFloat(amount) || 0;
  const shopName = settings?.shop_name || 'FoodShop';

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setAmount((total - paidAmount).toFixed(2));
      setShowQrCode(false);
      setQrState(null);
    }
  }, [open, total, paidAmount]);

  // Poll for payment status when QR is displayed
  useEffect(() => {
    if (!qrState?.isPolling || qrState?.isPaid) return;

    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-razorpay-payment', {
          body: {
            paymentLinkId: qrState.paymentLinkId,
            orderId,
            amount: paymentAmount,
          },
        });

        if (error) {
          console.error('Error checking payment:', error);
          return;
        }

        if (data.isPaid) {
          setQrState(prev => prev ? { ...prev, isPaid: true, isPolling: false } : null);
          toast.success('Payment received successfully!');
          
          // Wait a moment then close
          setTimeout(() => {
            onOpenChange(false);
            navigate('/orders');
          }, 2000);
        }
      } catch (err) {
        console.error('Payment check error:', err);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [qrState, orderId, paymentAmount, onOpenChange, navigate]);

  const handleCreateRazorpayQr = useCallback(async () => {
    setIsCreatingQr(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-razorpay-qr', {
        body: {
          orderId,
          orderNumber,
          amount: paymentAmount,
          customerName,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setQrState({
        paymentLinkId: data.paymentLinkId,
        shortUrl: data.shortUrl,
        isPolling: true,
        isPaid: false,
      });
      setShowQrCode(true);
    } catch (err: any) {
      console.error('Error creating QR:', err);
      toast.error(err.message || 'Failed to generate QR code');
    } finally {
      setIsCreatingQr(false);
    }
  }, [orderId, orderNumber, paymentAmount, customerName]);

  const handleSubmit = async () => {
    if (paymentAmount <= 0) return;

    // For UPI, create Razorpay QR with auto-verification
    if (method === 'upi') {
      await handleCreateRazorpayQr();
      return;
    }

    // For cash/card, process immediately
    await createPayment.mutateAsync({
      order_id: orderId,
      amount: paymentAmount,
      method,
    });

    if (paymentAmount >= remaining) {
      await updateOrderStatus.mutateAsync({ orderId, status: 'completed' });
    }

    toast.success('Payment completed successfully!');
    onOpenChange(false);
    navigate('/orders');
  };

  const handleManualConfirm = async () => {
    if (!qrState) return;
    
    // Manually confirm payment (fallback)
    await createPayment.mutateAsync({
      order_id: orderId,
      amount: paymentAmount,
      method: 'upi',
      transaction_id: qrState.paymentLinkId,
    });

    if (paymentAmount >= remaining) {
      await updateOrderStatus.mutateAsync({ orderId, status: 'completed' });
    }

    toast.success('Payment marked as received!');
    onOpenChange(false);
    navigate('/orders');
  };

  const handlePrintBill = () => {
    const billContent = `
      <html>
        <head>
          <title>Bill - ${orderNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 300px; margin: 0 auto; }
            h2 { text-align: center; margin-bottom: 5px; }
            .shop-name { text-align: center; font-size: 12px; margin-bottom: 20px; }
            .line { border-bottom: 1px dashed #000; margin: 10px 0; }
            .row { display: flex; justify-content: space-between; margin: 5px 0; }
            .total { font-weight: bold; font-size: 16px; }
            .footer { text-align: center; margin-top: 20px; font-size: 11px; }
          </style>
        </head>
        <body>
          <h2>${shopName}</h2>
          <p class="shop-name">Food Shop Management System</p>
          <div class="line"></div>
          <div class="row"><span>Order #</span><span>${orderNumber}</span></div>
          <div class="row"><span>Date</span><span>${new Date().toLocaleString()}</span></div>
          <div class="line"></div>
          <div class="row total"><span>Total</span><span>₹${total.toFixed(2)}</span></div>
          <div class="row"><span>Paid</span><span>₹${(paidAmount + paymentAmount).toFixed(2)}</span></div>
          <div class="row"><span>Method</span><span>${method.toUpperCase()}</span></div>
          <div class="line"></div>
          <p class="footer">Thank you for dining with us!</p>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(billContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // QR Code View with auto-verification
  if (showQrCode && qrState) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-center">
              {qrState.isPaid ? 'Payment Successful!' : `Scan to Pay - ₹${paymentAmount.toFixed(2)}`}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center space-y-6 py-4">
            {qrState.isPaid ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <p className="text-lg font-semibold text-green-600">Payment Received!</p>
                <p className="text-sm text-muted-foreground">Redirecting...</p>
              </div>
            ) : (
              <>
                <div className="bg-white p-4 rounded-xl shadow-inner">
                  <QRCodeSVG 
                    value={qrState.shortUrl} 
                    size={200}
                    level="H"
                    includeMargin
                  />
                </div>

                <div className="text-center space-y-2">
                  <p className="text-2xl font-bold text-primary">₹{paymentAmount.toFixed(2)}</p>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Waiting for payment...</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Scan with any UPI app (GPay, PhonePe, Paytm)
                  </p>
                </div>

                <div className="w-full pt-4 border-t space-y-3">
                  <Button 
                    onClick={handleManualConfirm}
                    variant="outline"
                    className="w-full"
                    disabled={createPayment.isPending}
                  >
                    {createPayment.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Confirm Payment Manually
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setShowQrCode(false);
                      setQrState(null);
                    }} 
                    className="w-full"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Process Payment - {orderNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Amount Summary */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Order Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
            {paidAmount > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Already Paid</span>
                <span>₹{paidAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-lg pt-2 border-t">
              <span>Remaining</span>
              <span className="text-primary">₹{remaining.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-3">
            <Label>Payment Method</Label>
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as PaymentMethod)} className="grid grid-cols-3 gap-4">
              <div>
                <RadioGroupItem value="cash" id="cash" className="peer sr-only" />
                <Label
                  htmlFor="cash"
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                >
                  <Banknote className="mb-2 h-6 w-6" />
                  <span className="text-sm font-medium">Cash</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="upi" id="upi" className="peer sr-only" />
                <Label
                  htmlFor="upi"
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                >
                  <Smartphone className="mb-2 h-6 w-6" />
                  <span className="text-sm font-medium">UPI</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem value="card" id="card" className="peer sr-only" />
                <Label
                  htmlFor="card"
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                >
                  <CreditCard className="mb-2 h-6 w-6" />
                  <span className="text-sm font-medium">Card</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrintBill} className="flex-1">
              <Printer className="mr-2 h-4 w-4" />
              Print Bill
            </Button>
            <Button 
              onClick={handleSubmit} 
              className="flex-1"
              disabled={createPayment.isPending || razorpay.isLoading || isCreatingQr || paymentAmount <= 0}
            >
              {isCreatingQr ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating QR...
                </>
              ) : razorpay.isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : createPayment.isPending ? (
                'Processing...'
              ) : method === 'upi' ? (
                'Generate UPI QR'
              ) : (
                'Complete Payment'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
