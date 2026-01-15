import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type ShopSettings = Database['public']['Tables']['shop_settings']['Row'];
type ShopSettingsUpdate = Database['public']['Tables']['shop_settings']['Update'];

export function useShopSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['shop-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shop_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      return data as ShopSettings;
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: ShopSettingsUpdate) => {
      if (!settings?.id) throw new Error('No settings found');
      
      const { data, error } = await supabase
        .from('shop_settings')
        .update(updates)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-settings'] });
      toast.success('Settings saved successfully');
    },
    onError: (error) => {
      console.error('Error updating settings:', error);
      toast.error('Failed to save settings');
    },
  });

  const updateSetting = <K extends keyof ShopSettingsUpdate>(
    key: K,
    value: ShopSettingsUpdate[K]
  ) => {
    updateSettingsMutation.mutate({ [key]: value } as ShopSettingsUpdate);
  };

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateSettingsMutation.mutate,
    updateSetting,
    isSaving: updateSettingsMutation.isPending,
  };
}
