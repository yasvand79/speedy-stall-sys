import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface PendingUser {
  id: string;
  user_id: string;
  full_name: string;
  email?: string;
  phone: string | null;
  status: string;
  branch_id: string | null;
  invite_code_used: string | null;
  created_at: string;
  role?: AppRole;
  branch?: {
    name: string;
    code: string;
  } | null;
}

export interface ApprovalLog {
  id: string;
  user_id: string;
  action: 'APPROVED' | 'REJECTED';
  admin_id: string;
  remarks: string | null;
  created_at: string;
  user?: {
    full_name: string;
  };
  admin?: {
    full_name: string;
  };
}

export function useUserApprovals(statusFilter?: string) {
  const queryClient = useQueryClient();

  const { data: pendingUsers = [], isLoading, error } = useQuery({
    queryKey: ['pending-users', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select(`
          *,
          branch:branches(name, code)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data: profiles, error } = await query;
      if (error) throw error;

      // Fetch roles for each user
      const userIds = profiles.map(p => p.user_id);
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      // Fetch emails from auth (we'll use the invite code or full name for display)
      return profiles.map(profile => ({
        ...profile,
        role: roleMap.get(profile.user_id),
      })) as PendingUser[];
    },
  });

  const { data: approvalLogs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ['approval-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approval_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch user and admin names
      const userIds = [...new Set([...data.map(l => l.user_id), ...data.map(l => l.admin_id)])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const nameMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      return data.map(log => ({
        ...log,
        user: { full_name: nameMap.get(log.user_id) || 'Unknown' },
        admin: { full_name: nameMap.get(log.admin_id) || 'Unknown' },
      })) as ApprovalLog[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ userId, remarks }: { userId: string; remarks?: string }) => {
      const { data, error } = await supabase.rpc('approve_user', {
        target_user_id: userId,
        remarks_text: remarks || null,
      });

      if (error) throw error;
      if (!data) throw new Error('User not found or already processed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['approval-logs'] });
      toast.success('User approved successfully');
    },
    onError: (error) => {
      toast.error(`Failed to approve user: ${error.message}`);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ userId, remarks }: { userId: string; remarks?: string }) => {
      const { data, error } = await supabase.rpc('reject_user', {
        target_user_id: userId,
        remarks_text: remarks || null,
      });

      if (error) throw error;
      if (!data) throw new Error('User not found or already processed');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['approval-logs'] });
      toast.success('User rejected');
    },
    onError: (error) => {
      toast.error(`Failed to reject user: ${error.message}`);
    },
  });

  return {
    pendingUsers,
    approvalLogs,
    isLoading,
    isLoadingLogs,
    error,
    approveUser: approveMutation.mutateAsync,
    rejectUser: rejectMutation.mutateAsync,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
}
