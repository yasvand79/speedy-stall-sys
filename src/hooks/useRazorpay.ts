import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayOptions {
  orderId: string;
  orderNumber: string;
  amount: number;
  onSuccess: (paymentId: string, transactionId: string) => void;
  onFailure: (error: string) => void;
}

export function useRazorpay() {
  const [isLoading, setIsLoading] = useState(false);

  const loadRazorpayScript = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  const createOrder = useCallback(async (amount: number, receipt: string) => {
    const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
      body: { 
        amount, 
        receipt,
        notes: { orderNumber: receipt }
      },
    });

    if (error) throw error;
    return data;
  }, []);

  const verifyPayment = useCallback(async (
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    orderId: string,
    amount: number,
    method: 'upi' | 'card'
  ) => {
    const { data, error } = await supabase.functions.invoke('verify-razorpay-payment', {
      body: {
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        order_id: orderId,
        amount,
        method,
      },
    });

    if (error) throw error;
    return data;
  }, []);

  const initiatePayment = useCallback(async ({ orderId, orderNumber, amount, onSuccess, onFailure }: RazorpayOptions) => {
    setIsLoading(true);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay SDK');
      }

      const orderData = await createOrder(amount, orderNumber);

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Food Shop',
        description: `Payment for Order ${orderNumber}`,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
            // Determine payment method from Razorpay response
            const method = response.razorpay_payment_id?.startsWith('pay_') ? 'upi' : 'card';
            
            const result = await verifyPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature,
              orderId,
              amount,
              method
            );

            if (result.success) {
              toast.success('Payment successful!');
              onSuccess(result.payment_id, result.transaction_id);
            } else {
              throw new Error(result.error || 'Payment verification failed');
            }
          } catch (error: any) {
            console.error('Payment verification error:', error);
            toast.error(error.message || 'Payment verification failed');
            onFailure(error.message);
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: '',
        },
        theme: {
          color: '#f97316', // Orange theme matching the app
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', (response: any) => {
        console.error('Payment failed:', response.error);
        toast.error(response.error.description || 'Payment failed');
        onFailure(response.error.description);
      });

      razorpay.open();
    } catch (error: any) {
      console.error('Error initiating payment:', error);
      toast.error(error.message || 'Failed to initiate payment');
      onFailure(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [loadRazorpayScript, createOrder, verifyPayment]);

  return {
    initiatePayment,
    isLoading,
  };
}
