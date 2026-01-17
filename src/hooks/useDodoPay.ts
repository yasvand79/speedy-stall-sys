import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateCheckoutParams {
  orderId: string;
  orderNumber: string;
  amount: number;
  customerName?: string;
  customerPhone?: string;
}

export function useDodoPay() {
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const createCheckout = useCallback(async (params: CreateCheckoutParams) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-dodo-checkout', {
        body: {
          ...params,
          returnUrl: `${window.location.origin}/orders?payment_success=true&order_id=${params.orderId}`,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setCheckoutUrl(data.checkoutUrl);
      setPaymentId(data.paymentId);
      return data;
    } catch (error: any) {
      console.error('DoDo checkout error:', error);
      toast.error(error.message || 'Failed to create payment');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkPaymentStatus = useCallback(async (orderId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('check-dodo-payment', {
        body: { orderId },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Payment status check error:', error);
      return { success: false, paid: false };
    }
  }, []);

  const startPolling = useCallback((orderId: string, onSuccess: () => void, interval = 3000) => {
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    console.log('Starting payment polling for order:', orderId);

    pollingRef.current = setInterval(async () => {
      const result = await checkPaymentStatus(orderId);
      console.log('Poll result:', result);
      
      if (result.paid) {
        console.log('Payment confirmed!');
        setIsPaid(true);
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        onSuccess();
      }
    }, interval);
  }, [checkPaymentStatus]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const reset = useCallback(() => {
    setCheckoutUrl(null);
    setPaymentId(null);
    setIsPaid(false);
    stopPolling();
  }, [stopPolling]);

  return {
    isLoading,
    checkoutUrl,
    paymentId,
    isPaid,
    createCheckout,
    checkPaymentStatus,
    startPolling,
    stopPolling,
    reset,
  };
}
