import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface CreateOrderParams {
  orderId: string;
  orderNumber: string;
  amount: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
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

  const initiatePayment = useCallback(async (
    params: CreateOrderParams,
    onSuccess: () => void,
    onFailure?: (error: string) => void
  ) => {
    setIsLoading(true);

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay');
      }

      // Create order
      const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          orderId: params.orderId,
          orderNumber: params.orderNumber,
          amount: params.amount,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      console.log('Razorpay order created:', data);

      // Open Razorpay checkout
      const options = {
        key: data.razorpayKeyId,
        amount: data.amount,
        currency: data.currency,
        name: 'Food Shop',
        description: `Order ${params.orderNumber}`,
        order_id: data.razorpayOrderId,
        prefill: {
          name: params.customerName || '',
          contact: params.customerPhone || '',
          email: params.customerEmail || '',
        },
        handler: async (response: RazorpayResponse) => {
          console.log('Razorpay payment response:', response);
          
          try {
            // Verify payment on server
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                orderId: params.orderId,
                amount: params.amount,
              },
            });

            if (verifyError) throw verifyError;
            if (!verifyData.success) throw new Error(verifyData.error);

            toast.success('Payment successful!');
            onSuccess();
          } catch (verifyErr: any) {
            console.error('Payment verification error:', verifyErr);
            toast.error(verifyErr.message || 'Payment verification failed');
            onFailure?.(verifyErr.message || 'Verification failed');
          }
        },
        modal: {
          ondismiss: () => {
            console.log('Razorpay checkout closed');
            setIsLoading(false);
          },
        },
        theme: {
          color: '#6366f1',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', (response: any) => {
        console.error('Razorpay payment failed:', response.error);
        toast.error(response.error.description || 'Payment failed');
        onFailure?.(response.error.description || 'Payment failed');
      });
      
      razorpay.open();

    } catch (error: any) {
      console.error('Razorpay error:', error);
      toast.error(error.message || 'Failed to initiate payment');
      onFailure?.(error.message || 'Failed to initiate payment');
    } finally {
      setIsLoading(false);
    }
  }, [loadRazorpayScript]);

  return {
    isLoading,
    initiatePayment,
  };
}
