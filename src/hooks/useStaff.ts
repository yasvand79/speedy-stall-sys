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
}

export function useStaff() {
  const queryClient = useQueryClient();

  const { data: staff = [], isLoading, error } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      // Fetch profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Get user emails from auth (we'll need to fetch from profiles or use a different approach)
      // Since we can't access auth.users directly, we'll show the user_id as identifier
      // In a real app, you'd store email in profiles table

      // Map profiles with their roles
      const staffMembers: StaffMember[] = profiles.map(profile => {
        const userRole = roles.find(r => r.user_id === profile.user_id);
        return {
          id: profile.id,
          userId: profile.user_id,
          fullName: profile.full_name || 'Unknown',
          email: `${profile.user_id.substring(0, 8)}...`, // Truncated user ID as placeholder
          phone: profile.phone,
          role: userRole?.role || 'billing',
          isActive: profile.is_active ?? true,
          createdAt: profile.created_at || new Date().toISOString(),
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

  return {
    staff,
    isLoading,
    error,
    updateRole: updateRoleMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateRoleMutation.isPending || updateStatusMutation.isPending,
  };
}
