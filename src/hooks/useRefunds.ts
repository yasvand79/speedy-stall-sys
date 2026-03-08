import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useRefunds(orderId?: string) {
  return useQuery({
    queryKey: ['refunds', orderId],
    queryFn: async () => {
      let query = supabase
        .from('refunds')
        .select('*')
        .order('created_at', { ascending: false });

      if (orderId) {
        query = query.eq('order_id', orderId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useRequestRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (refund: {
      order_id: string;
      payment_id?: string;
      amount: number;
      reason: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('refunds')
        .insert({
          ...refund,
          requested_by: user?.id,
          status: 'requested',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
      toast.success('Refund requested');
    },
    onError: (error: Error) => {
      toast.error(`Failed to request refund: ${error.message}`);
    },
  });
}

export function useApproveRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ refundId, approved }: { refundId: string; approved: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('refunds')
        .update({
          status: approved ? 'approved' : 'rejected',
          approved_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', refundId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(variables.approved ? 'Refund approved' : 'Refund rejected');
    },
    onError: (error: Error) => {
      toast.error(`Failed to process refund: ${error.message}`);
    },
  });
}
