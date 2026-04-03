import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type Payment = Database['public']['Tables']['payments']['Row'];
type PaymentMethod = Database['public']['Enums']['payment_method'];

export function usePayments(orderId?: string) {
  return useQuery({
    queryKey: ['payments', orderId],
    refetchInterval: 5000,
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (orderId) {
        query = query.eq('order_id', orderId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Payment[];
    },
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: {
      order_id: string;
      amount: number;
      method: PaymentMethod;
      transaction_id?: string;
    }) => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error('You must be signed in to record a payment');

      const { error } = await supabase
        .from('payments')
        .insert({
          ...payment,
          created_by: user.id,
        });

      if (error) throw error;

      // Get order total and all payments for this order
      const { data: order } = await supabase
        .from('orders')
        .select('total')
        .eq('id', payment.order_id)
        .single();

      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('order_id', payment.order_id);

      if (order && payments) {
        const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const orderTotal = Number(order.total);

        let paymentStatus: 'pending' | 'partial' | 'completed' = 'pending';
        if (totalPaid >= orderTotal) {
          paymentStatus = 'completed';
        } else if (totalPaid > 0) {
          paymentStatus = 'partial';
        }

        await supabase
          .from('orders')
          .update({ payment_status: paymentStatus })
          .eq('id', payment.order_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Payment recorded');
    },
    onError: (error: Error) => {
      toast.error(`Failed to record payment: ${error.message}`);
    },
  });
}
