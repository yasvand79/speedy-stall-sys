import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface StaffInvitation {
  id: string;
  email: string;
  role_assigned: AppRole;
  branch_id: string | null;
  invited_by: string;
  status: string;
  created_at: string;
  used_at: string | null;
  branch?: {
    name: string;
    code: string;
  } | null;
}

export function useStaffInvitations() {
  const queryClient = useQueryClient();

  const { data: invitations = [], isLoading, error } = useQuery({
    queryKey: ['staff-invitations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_invitations')
        .select(`
          *,
          branch:branches(name, code)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as StaffInvitation[];
    },
  });

  const createInvitationMutation = useMutation({
    mutationFn: async (params: {
      email: string;
      role: AppRole;
      branchId?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase.from('staff_invitations').insert({
        email: params.email.toLowerCase().trim(),
        role_assigned: params.role,
        branch_id: params.branchId || null,
        invited_by: user.user.id,
      });

      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          throw new Error('This email already has a pending invitation');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-invitations'] });
      toast.success('Invitation created! Staff member can now sign up with this email.');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const revokeInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('staff_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-invitations'] });
      toast.success('Invitation revoked');
    },
    onError: (error) => {
      toast.error(`Failed to revoke invitation: ${error.message}`);
    },
  });

  return {
    invitations,
    isLoading,
    error,
    createInvitation: createInvitationMutation.mutateAsync,
    revokeInvitation: revokeInvitationMutation.mutateAsync,
    isCreating: createInvitationMutation.isPending,
  };
}
