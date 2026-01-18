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
import { useRazorpay } from '@/hooks/useRazorpay';
import { Database } from '@/integrations/supabase/types';
import { Banknote, Smartphone, CreditCard, Printer, Loader2 } from 'lucide-react';
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
  const navigate = useNavigate();

  const createPayment = useCreatePayment();
  const updateOrderStatus = useUpdateOrderStatus();
  const { settings } = useShopSettings();
  const razorpay = useRazorpay();

  const remaining = total - paidAmount;
  const paymentAmount = parseFloat(amount) || 0;
  const shopName = settings?.shop_name || 'FoodShop';

  // Reset amount when dialog opens
  useEffect(() => {
    if (open) {
      setAmount((total - paidAmount).toFixed(2));
    }
  }, [open, total, paidAmount]);

  const handleSubmit = async () => {
    if (paymentAmount <= 0) return;

    // For UPI, use Razorpay
    if (method === 'upi') {
      razorpay.initiatePayment(
        {
          orderId,
          orderNumber,
          amount: paymentAmount,
          customerName,
          customerPhone,
        },
        () => {
          // On success
          onOpenChange(false);
          navigate('/orders');
        },
        (error) => {
          // On failure - error already shown via toast
          console.error('Payment failed:', error);
        }
      );
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
              disabled={createPayment.isPending || razorpay.isLoading || paymentAmount <= 0}
            >
              {razorpay.isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
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
