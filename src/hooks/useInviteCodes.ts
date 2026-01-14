import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface InviteCode {
  id: string;
  code: string;
  role_assigned: AppRole;
  branch_id: string | null;
  created_by: string;
  expires_at: string | null;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  created_at: string;
  branch?: {
    name: string;
    code: string;
  } | null;
}

export function useInviteCodes() {
  const queryClient = useQueryClient();

  const { data: inviteCodes = [], isLoading, error } = useQuery({
    queryKey: ['invite-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invite_codes')
        .select(`
          *,
          branch:branches(name, code)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as InviteCode[];
    },
  });

  const createCodeMutation = useMutation({
    mutationFn: async (params: {
      role: AppRole;
      branchId?: string;
      maxUses?: number;
      expiresAt?: string;
    }) => {
      // Generate a random code
      const { data: codeResult } = await supabase.rpc('generate_invite_code');
      const code = codeResult as string;

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase.from('invite_codes').insert({
        code,
        role_assigned: params.role,
        branch_id: params.branchId || null,
        created_by: user.user.id,
        max_uses: params.maxUses || 1,
        expires_at: params.expiresAt || null,
      });

      if (error) throw error;
      return code;
    },
    onSuccess: (code) => {
      queryClient.invalidateQueries({ queryKey: ['invite-codes'] });
      toast.success(`Invite code created: ${code}`);
    },
    onError: (error) => {
      toast.error(`Failed to create invite code: ${error.message}`);
    },
  });

  const deactivateCodeMutation = useMutation({
    mutationFn: async (codeId: string) => {
      const { error } = await supabase
        .from('invite_codes')
        .update({ is_active: false })
        .eq('id', codeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invite-codes'] });
      toast.success('Invite code deactivated');
    },
    onError: (error) => {
      toast.error(`Failed to deactivate code: ${error.message}`);
    },
  });

  return {
    inviteCodes,
    isLoading,
    error,
    createCode: createCodeMutation.mutateAsync,
    deactivateCode: deactivateCodeMutation.mutateAsync,
    isCreating: createCodeMutation.isPending,
    isDeactivating: deactivateCodeMutation.isPending,
  };
}

export async function validateInviteCode(code: string): Promise<{
  valid: boolean;
  error?: string;
  role?: AppRole;
  branch_id?: string;
}> {
  const { data, error } = await supabase.rpc('validate_invite_code', {
    invite_code: code,
  });

  if (error) {
    return { valid: false, error: error.message };
  }

  return data as { valid: boolean; error?: string; role?: AppRole; branch_id?: string };
}
