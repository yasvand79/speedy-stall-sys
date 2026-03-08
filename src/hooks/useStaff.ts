import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface StaffMember {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: AppRole;
  isActive: boolean;
  createdAt: string;
  branchId: string | null;
  status: string | null;
}

interface UseStaffOptions {
  branchId?: string | null;
}

export function useStaff(options?: UseStaffOptions) {
  const queryClient = useQueryClient();

  const { data: staff = [], isLoading, error } = useQuery({
    queryKey: ['staff', options?.branchId],
    queryFn: async () => {
      // Fetch profiles with their roles - only approved users
      let profilesQuery = supabase
        .from('profiles')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      // Filter by branch if branchId is provided
      if (options?.branchId) {
        profilesQuery = profilesQuery.eq('branch_id', options.branchId);
      }

      const { data: profiles, error: profilesError } = await profilesQuery;

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Fetch emails via secure function
      const userIds = profiles.map(p => p.user_id);
      const { data: emailData } = await supabase.rpc('get_staff_emails', { user_ids: userIds });
      const emailMap = new Map<string, string>();
      if (emailData) {
        (emailData as { user_id: string; email: string }[]).forEach(e => emailMap.set(e.user_id, e.email));
      }

      // Map profiles with their roles
      const staffMembers: StaffMember[] = profiles.map(profile => {
        const userRole = roles.find(r => r.user_id === profile.user_id);
        return {
          id: profile.id,
          userId: profile.user_id,
          fullName: profile.full_name || 'Unknown',
          email: emailMap.get(profile.user_id) || 'N/A',
          phone: profile.phone,
          role: userRole?.role || 'billing',
          isActive: profile.is_active ?? true,
          createdAt: profile.created_at || new Date().toISOString(),
          branchId: profile.branch_id,
          status: profile.status,
        };
      });

      return staffMembers;
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Role updated successfully');
    },
    onError: (error) => {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Status updated successfully');
    },
    onError: (error) => {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    },
  });

  const updateBranchMutation = useMutation({
    mutationFn: async ({ userId, branchId }: { userId: string; branchId: string | null }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ branch_id: branchId })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Branch assignment updated');
    },
    onError: (error) => {
      console.error('Error updating branch:', error);
      toast.error('Failed to update branch assignment');
    },
  });

  const removeStaffMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      // Soft delete - deactivate the user
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false, status: 'rejected' })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff member removed');
    },
    onError: (error) => {
      console.error('Error removing staff:', error);
      toast.error('Failed to remove staff member');
    },
  });

  return {
    staff,
    isLoading,
    error,
    updateRole: updateRoleMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
    updateBranch: updateBranchMutation.mutate,
    removeStaff: removeStaffMutation.mutate,
    isUpdating: updateRoleMutation.isPending || updateStatusMutation.isPending || updateBranchMutation.isPending || removeStaffMutation.isPending,
  };
}