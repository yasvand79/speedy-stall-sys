import { useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function CustomerDisplay() {
  const [searchParams] = useSearchParams();
  const amount = searchParams.get('amount') || '0';
  const upiUrl = searchParams.get('upiUrl') || '';
  const shopName = searchParams.get('shop') || 'Shop';
  const orderNumber = searchParams.get('order') || '';
  const [paid, setPaid] = useState(false);

  // Listen for payment confirmation from main window
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'PAYMENT_CONFIRMED') {
        setPaid(true);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  if (paid) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center justify-center p-8">
        <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center gap-6">
          <div className="h-24 w-24 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle className="h-14 w-14 text-success" />
          </div>
          <h1 className="text-4xl font-bold text-foreground font-display">Payment Received!</h1>
          <p className="text-xl text-muted-foreground">Thank you for dining at <span className="font-semibold text-foreground">{shopName}</span></p>
          <p className="text-lg text-success font-bold">₹{parseFloat(amount).toFixed(0)} paid</p>
        </div>
      </div>
    );
  }

  if (!upiUrl) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-foreground font-display">{shopName}</h1>
          <p className="text-xl text-muted-foreground">Waiting for payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent to-background flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full flex flex-col items-center gap-8">
        {/* Shop name */}
        <h1 className="text-2xl font-bold text-foreground font-display">{shopName}</h1>

        {/* Amount */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground uppercase tracking-wide">Amount to Pay</p>
          <p className="text-5xl font-bold text-primary font-display mt-2">₹{parseFloat(amount).toFixed(0)}</p>
          {orderNumber && (
            <p className="text-sm text-muted-foreground mt-2">Order #{orderNumber}</p>
          )}
        </div>

        {/* QR Code */}
        <div className="bg-white p-5 rounded-2xl shadow-lg border">
          <QRCodeSVG 
            value={upiUrl} 
            size={240}
            level="H"
            includeMargin
          />
        </div>

        {/* Instructions */}
        <div className="text-center space-y-2">
          <p className="text-lg text-foreground font-medium">Scan to pay</p>
          <p className="text-sm text-muted-foreground">
            Use <span className="font-semibold text-foreground">GPay</span>, <span className="font-semibold text-foreground">PhonePe</span>, or <span className="font-semibold text-foreground">Paytm</span>
          </p>
        </div>
      </div>
    </div>
  );
}
