import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Branch = Database['public']['Tables']['branches']['Row'];
type BranchInsert = Database['public']['Tables']['branches']['Insert'];

export function useBranches() {
  const queryClient = useQueryClient();

  const { data: branches = [], isLoading, error } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Branch[];
    },
  });

  const createBranchMutation = useMutation({
    mutationFn: async (branch: BranchInsert) => {
      const { data, error } = await supabase
        .from('branches')
        .insert(branch)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Branch created successfully');
    },
    onError: (error) => {
      console.error('Error creating branch:', error);
      toast.error('Failed to create branch');
    },
  });

  const updateBranchMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Branch> & { id: string }) => {
      const { data, error } = await supabase
        .from('branches')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Branch updated successfully');
    },
    onError: (error) => {
      console.error('Error updating branch:', error);
      toast.error('Failed to update branch');
    },
  });

  const toggleBranchStatusMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('branches')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Branch status updated');
    },
    onError: (error) => {
      console.error('Error toggling branch status:', error);
      toast.error('Failed to update branch status');
    },
  });

  return {
    branches,
    activeBranches: branches.filter(b => b.is_active),
    isLoading,
    error,
    createBranch: createBranchMutation.mutate,
    updateBranch: updateBranchMutation.mutate,
    toggleBranchStatus: toggleBranchStatusMutation.mutate,
    isCreating: createBranchMutation.isPending,
    isUpdating: updateBranchMutation.isPending,
  };
}

export function useBranchMenuPrices(branchId?: string) {
  const queryClient = useQueryClient();

  const { data: prices = [], isLoading, error } = useQuery({
    queryKey: ['branch-menu-prices', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      
      const { data, error } = await supabase
        .from('branch_menu_prices')
        .select(`
          *,
          menu_items (
            id,
            name,
            price,
            category
          )
        `)
        .eq('branch_id', branchId);

      if (error) throw error;
      return data;
    },
    enabled: !!branchId,
  });

  const upsertPriceMutation = useMutation({
    mutationFn: async ({ branch_id, menu_item_id, price }: { branch_id: string; menu_item_id: string; price: number }) => {
      const { data, error } = await supabase
        .from('branch_menu_prices')
        .upsert({ branch_id, menu_item_id, price }, { onConflict: 'branch_id,menu_item_id' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branch-menu-prices'] });
      toast.success('Price updated successfully');
    },
    onError: (error) => {
      console.error('Error updating price:', error);
      toast.error('Failed to update price');
    },
  });

  return {
    prices,
    isLoading,
    error,
    upsertPrice: upsertPriceMutation.mutate,
    isUpdating: upsertPriceMutation.isPending,
  };
}
