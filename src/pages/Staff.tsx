import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { useStaff, StaffMember } from '@/hooks/useStaff';
import { useAuth } from '@/contexts/AuthContext';
import { useBranches } from '@/hooks/useBranches';
import { useStaffInvitations } from '@/hooks/useStaffInvitations';
import { Search, Mail, Phone, Shield, UserCog, Receipt, Loader2, Building2, UserPlus, UserMinus, XCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type AppRole = Database['public']['Enums']['app_role'];

const roleConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  admin: { label: 'Admin', icon: Shield, color: 'bg-primary text-primary-foreground' },
  branch_admin: { label: 'Branch Admin', icon: UserCog, color: 'bg-warning text-warning-foreground' },
  billing: { label: 'Billing', icon: Receipt, color: 'bg-info text-info-foreground' },
};

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  branch_admin: 'Branch Admin',
  billing: 'Billing',
};

export default function Staff() {
  const { profile, role, isAdmin, isBranchAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [staffToRemove, setStaffToRemove] = useState<StaffMember | null>(null);
  
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<AppRole>('billing');
  const [newStaffBranch, setNewStaffBranch] = useState<string>('');

  const branchFilterId = isBranchAdmin ? profile?.branch_id : undefined;
  
  const { staff, isLoading, updateRole, updateStatus, updateBranch, removeStaff, isUpdating } = useStaff({ branchId: branchFilterId });
  const { branches } = useBranches();
  const { invitations, isLoading: invitationsLoading, createInvitation, revokeInvitation, isCreating } = useStaffInvitations();

  const canManageStaff = isAdmin;
  const canInviteStaff = isAdmin || isBranchAdmin;

  const filteredStaff = staff.filter(member =>
    member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.userId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeStaff = staff.filter(s => s.isActive).length;

  const getBranchName = (branchId: string | null) => {
    if (!branchId) return 'No Branch';
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || 'Unknown';
  };

  const handleRoleChange = (member: StaffMember, newRole: AppRole) => {
    updateRole({ userId: member.userId, newRole });
  };

  const handleBranchChange = (member: StaffMember, branchId: string) => {
    updateBranch({ userId: member.userId, branchId: branchId === 'none' ? null : branchId });
  };

  const handleStatusToggle = (member: StaffMember) => {
    updateStatus({ userId: member.userId, isActive: !member.isActive });
  };

  const handleRemoveStaff = () => {
    if (staffToRemove) {
      removeStaff({ userId: staffToRemove.userId });
      setStaffToRemove(null);
    }
  };

  const handleInviteStaff = async () => {
    if (!newStaffEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    const roleToAssign = (isBranchAdmin && !isAdmin) ? 'billing' as AppRole : newStaffRole;
    const branchToAssign = (isBranchAdmin && !isAdmin)
      ? profile?.branch_id || undefined
      : (newStaffBranch && newStaffBranch !== 'none' ? newStaffBranch : undefined);

    try {
      await createInvitation({
        email: newStaffEmail,
        role: roleToAssign,
        branchId: branchToAssign,
      });
      resetAddDialog();
    } catch {
      // Error handled in hook
    }
  };

  const resetAddDialog = () => {
    setNewStaffEmail('');
    setNewStaffRole('billing');
    setNewStaffBranch('');
    setShowAddDialog(false);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Staff Management</h1>
            <p className="text-sm text-muted-foreground">
              {activeStaff} active staff members • {staff.length} total
              {isBranchAdmin && profile?.branch_id && (
                <span className="ml-2 text-primary">
                  • {getBranchName(profile.branch_id)}
                </span>
              )}
            </p>
          </div>
          {canInviteStaff && (
            <Dialog open={showAddDialog} onOpenChange={(open) => {
              if (!open) resetAddDialog();
              else setShowAddDialog(true);
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2 w-full sm:w-auto shrink-0">
                  <UserPlus className="h-4 w-4" />
                  Add Staff
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Staff Member</DialogTitle>
                  <DialogDescription>
                    Enter the staff member's email and assign a role. They'll be auto-approved when they sign up.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="staff@example.com"
                        value={newStaffEmail}
                        onChange={(e) => setNewStaffEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Role</Label>
                    {isBranchAdmin && !isAdmin ? (
                      <Input value="Billing Staff" disabled />
                    ) : (
                      <Select value={newStaffRole} onValueChange={(v: AppRole) => setNewStaffRole(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="billing">Billing Staff</SelectItem>
                          <SelectItem value="branch_admin">Branch Admin</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  
                  {isAdmin && (newStaffRole === 'billing' || newStaffRole === 'branch_admin') && (
                    <div className="space-y-2">
                      <Label>Branch Assignment</Label>
                      <Select value={newStaffBranch} onValueChange={setNewStaffBranch}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select branch (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Branch</SelectItem>
                          {branches.map(branch => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {isBranchAdmin && !isAdmin && profile?.branch_id && (
                    <div className="space-y-2">
                      <Label>Branch</Label>
                      <Input value={branches.find(b => b.id === profile.branch_id)?.name || 'Your Branch'} disabled />
                    </div>
                  )}
                </div>
                
                <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button className="w-full sm:w-auto" onClick={handleInviteStaff} disabled={isCreating}>
                    {isCreating ? 'Inviting...' : 'Send Invitation'}
                  </Button>
                  <Button className="w-full sm:w-auto" variant="outline" onClick={resetAddDialog}>
                    Cancel
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Tabs: Active Staff + Invitations */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="active" className="flex-1 sm:flex-initial">Active Staff</TabsTrigger>
            {canInviteStaff && (
              <TabsTrigger value="invitations" className="flex-1 sm:flex-initial">Invitations</TabsTrigger>
            )}
          </TabsList>

          {/* Active Staff Tab */}
          <TabsContent value="active" className="space-y-4 mt-4">
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search staff by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Staff Grid */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredStaff.map((member) => {
                const roleInfo = roleConfig[member.role];
                const RoleIcon = roleInfo.icon;
                const initials = member.fullName
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .substring(0, 2);

                return (
                  <Card key={member.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-14 w-14">
                          <AvatarFallback className="bg-primary/10 text-primary font-display font-semibold">
                            {initials || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-display font-semibold text-foreground truncate">
                              {member.fullName}
                            </h3>
                            {!member.isActive && (
                              <Badge variant="secondary" className="text-xs">Inactive</Badge>
                            )}
                          </div>
                          <Badge className={`mt-1 ${roleInfo.color}`}>
                            <RoleIcon className="mr-1 h-3 w-3" />
                            {roleInfo.label}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4 shrink-0" />
                          <button
                            type="button"
                            className="truncate hover:text-foreground hover:underline cursor-pointer transition-colors text-xs"
                            onClick={() => {
                              navigator.clipboard.writeText(member.email);
                              toast.success('Email copied!');
                            }}
                            title="Click to copy"
                          >
                            {member.email}
                          </button>
                        </div>
                        {member.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4 shrink-0" />
                            <button
                              type="button"
                              className="hover:text-foreground hover:underline cursor-pointer transition-colors"
                              onClick={() => {
                                navigator.clipboard.writeText(member.phone!);
                                toast.success('Phone number copied!');
                              }}
                              title="Click to copy"
                            >
                              {member.phone}
                            </button>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building2 className="h-4 w-4 shrink-0" />
                          <span>{getBranchName(member.branchId)}</span>
                        </div>
                      </div>

                      {/* Management Controls */}
                      <div className="mt-4 pt-4 border-t border-border space-y-3">
                        {canManageStaff ? (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Role</span>
                              <Select
                                value={member.role}
                                onValueChange={(value: AppRole) => handleRoleChange(member, value)}
                                disabled={isUpdating}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="billing">Billing</SelectItem>
                                  <SelectItem value="branch_admin">Branch Admin</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Branch</span>
                              <Select
                                value={member.branchId || 'none'}
                                onValueChange={(value) => handleBranchChange(member, value)}
                                disabled={isUpdating}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No Branch</SelectItem>
                                  {branches.map(branch => (
                                    <SelectItem key={branch.id} value={branch.id}>
                                      {branch.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Role</span>
                              <span className="text-sm font-medium">{roleConfig[member.role].label}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Branch</span>
                              <span className="text-sm font-medium">{getBranchName(member.branchId)}</span>
                            </div>
                          </>
                        )}

                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            Joined {format(new Date(member.createdAt), 'MMM yyyy')}
                          </p>
                          {canManageStaff && (
                            <div className="flex gap-2">
                              <Button
                                variant={member.isActive ? "outline" : "default"}
                                size="sm"
                                onClick={() => handleStatusToggle(member)}
                                disabled={isUpdating}
                              >
                                {member.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setStaffToRemove(member)}
                                disabled={isUpdating}
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredStaff.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery ? 'No staff members found matching your search' : 'No staff members found'}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Invitations Tab */}
          {canInviteStaff && (
            <TabsContent value="invitations" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Pending & Used Invitations
                  </CardTitle>
                  <CardDescription>
                    Staff emails added here can sign up and login directly without admin approval.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {invitationsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : invitations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No invitations yet. Click "Add Staff" to invite someone.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="hidden sm:table-cell">Branch</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="hidden sm:table-cell">Created</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invitations.map((inv) => (
                            <TableRow key={inv.id}>
                              <TableCell className="font-medium text-xs sm:text-sm max-w-[120px] truncate">{inv.email}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{roleLabels[inv.role_assigned] || inv.role_assigned}</Badge>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                {inv.branch ? (
                                  <span className="flex items-center gap-1 text-sm">
                                    <Building2 className="h-3 w-3" />
                                    {inv.branch.name}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {inv.status === 'pending' ? (
                                  <Badge variant="secondary">Pending</Badge>
                                ) : (
                                  <Badge variant="default">
                                    <CheckCircle className="mr-1 h-3 w-3" />
                                    Used
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                                {format(new Date(inv.created_at), 'MMM d, yyyy')}
                              </TableCell>
                              <TableCell className="text-right">
                                {inv.status === 'pending' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => revokeInvitation(inv.id)}
                                    title="Revoke invitation"
                                  >
                                    <XCircle className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Remove Staff Confirmation */}
        <AlertDialog open={!!staffToRemove} onOpenChange={() => setStaffToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Staff Member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {staffToRemove?.fullName}? This will deactivate their account and they will no longer be able to access the system.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemoveStaff} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
