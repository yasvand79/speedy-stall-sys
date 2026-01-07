import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type InventoryItem = Database['public']['Tables']['inventory']['Row'];

export function useInventory() {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as InventoryItem[];
    },
  });
}

export function useLowStockItems() {
  return useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('quantity');

      if (error) throw error;
      
      // Filter items where quantity <= min_quantity
      return (data as InventoryItem[]).filter(
        item => Number(item.quantity) <= Number(item.min_quantity)
      );
    },
  });
}

export function useUpdateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InventoryItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('inventory')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Inventory updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update inventory: ${error.message}`);
    },
  });
}

export function useRestockInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      // First get current quantity
      const { data: current, error: fetchError } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const newQuantity = Number(current.quantity) + quantity;

      const { data, error } = await supabase
        .from('inventory')
        .update({ 
          quantity: newQuantity,
          last_restocked: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Inventory restocked');
    },
    onError: (error: Error) => {
      toast.error(`Failed to restock: ${error.message}`);
    },
  });
}
