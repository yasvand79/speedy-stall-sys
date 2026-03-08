import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAuditLogs(tableName?: string) {
  return useQuery({
    queryKey: ['audit_logs', tableName],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (tableName) {
        query = query.eq('table_name', tableName);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useLogAction() {
  return useMutation({
    mutationFn: async (log: {
      action: string;
      table_name: string;
      record_id?: string;
      old_value?: Record<string, unknown>;
      new_value?: Record<string, unknown>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('audit_logs')
        .insert([{
          ...log,
          user_id: user?.id,
        }]);

      if (error) throw error;
    },
  });
}
