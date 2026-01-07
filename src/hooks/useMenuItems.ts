import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type MenuItem = Database['public']['Tables']['menu_items']['Row'];
type MenuCategory = Database['public']['Enums']['menu_category'];

export function useMenuItems(category?: MenuCategory) {
  return useQuery({
    queryKey: ['menu_items', category],
    queryFn: async () => {
      let query = supabase
        .from('menu_items')
        .select('*')
        .order('name');

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MenuItem[];
    },
  });
}

export function useCreateMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('menu_items')
        .insert(item)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu_items'] });
      toast.success('Menu item created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create menu item: ${error.message}`);
    },
  });
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MenuItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('menu_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu_items'] });
      toast.success('Menu item updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update menu item: ${error.message}`);
    },
  });
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu_items'] });
      toast.success('Menu item deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete menu item: ${error.message}`);
    },
  });
}
