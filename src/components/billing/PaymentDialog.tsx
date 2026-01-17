import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCreatePayment } from '@/hooks/usePayments';
import { useUpdateOrderStatus } from '@/hooks/useOrders';
import { useShopSettings } from '@/hooks/useShopSettings';
import { useDodoPay } from '@/hooks/useDodoPay';
import { Database } from '@/integrations/supabase/types';
import { Banknote, Smartphone, CreditCard, Printer, Loader2, CheckCircle, ExternalLink } from 'lucide-react';
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
  const [showUpiPayment, setShowUpiPayment] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const navigate = useNavigate();

  const createPayment = useCreatePayment();
  const updateOrderStatus = useUpdateOrderStatus();
  const { settings } = useShopSettings();
  const dodoPay = useDodoPay();

  const remaining = total - paidAmount;
  const paymentAmount = parseFloat(amount) || 0;
  const shopName = settings?.shop_name || 'FoodShop';

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setShowUpiPayment(false);
      setPaymentVerified(false);
      dodoPay.reset();
    }
  }, [open]);

  // Start polling when UPI payment view is shown
  useEffect(() => {
    if (showUpiPayment && dodoPay.checkoutUrl) {
      dodoPay.startPolling(orderId, () => {
        setPaymentVerified(true);
        toast.success('Payment verified automatically!');
        setTimeout(() => {
          onOpenChange(false);
          navigate('/orders');
        }, 1500);
      });
    }

    return () => {
      dodoPay.stopPolling();
    };
  }, [showUpiPayment, dodoPay.checkoutUrl, orderId]);

  const handleSubmit = async () => {
    if (paymentAmount <= 0) return;

    // For UPI, create DoDo checkout
    if (method === 'upi') {
      try {
        await dodoPay.createCheckout({
          orderId,
          orderNumber,
          amount: paymentAmount,
          customerName,
          customerPhone,
        });
        setShowUpiPayment(true);
      } catch (error) {
        // Error already handled in hook
      }
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

  const handleManualVerify = async () => {
    // Manual verification fallback
    await createPayment.mutateAsync({
      order_id: orderId,
      amount: paymentAmount,
      method: 'upi',
    });

    if (paymentAmount >= remaining) {
      await updateOrderStatus.mutateAsync({ orderId, status: 'completed' });
    }

    toast.success('Payment verified manually!');
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

  // UPI Payment View with DoDo Pay
  if (showUpiPayment) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-center">UPI Payment - ₹{paymentAmount.toFixed(2)}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center space-y-6 py-4">
            {paymentVerified ? (
              <>
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-green-600">Payment Verified!</p>
                  <p className="text-sm text-muted-foreground">Redirecting to orders...</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Waiting for payment confirmation...
                  </p>
                  <p className="text-lg font-semibold text-primary">₹{paymentAmount.toFixed(2)}</p>
                </div>

                {dodoPay.checkoutUrl && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(dodoPay.checkoutUrl!, '_blank')}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Payment Page
                  </Button>
                )}

                <div className="w-full pt-4 border-t space-y-3">
                  <p className="text-xs text-center text-muted-foreground">
                    Payment will be verified automatically. If not detected, use manual verification.
                  </p>
                  
                  <Button 
                    variant="secondary"
                    onClick={handleManualVerify} 
                    className="w-full"
                    disabled={createPayment.isPending}
                  >
                    {createPayment.isPending ? 'Verifying...' : 'Manual Verification'}
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      dodoPay.stopPolling();
                      setShowUpiPayment(false);
                    }} 
                    className="w-full"
                  >
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
              disabled={createPayment.isPending || dodoPay.isLoading || paymentAmount <= 0}
            >
              {dodoPay.isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : createPayment.isPending ? (
                'Processing...'
              ) : method === 'upi' ? (
                'Pay with UPI'
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
