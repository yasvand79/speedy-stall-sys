import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import { useStaff, StaffMember } from '@/hooks/useStaff';
import { useAuth } from '@/contexts/AuthContext';
import { useBranches } from '@/hooks/useBranches';
import { useStaffInvitations } from '@/hooks/useStaffInvitations';
import { Search, Mail, Phone, Shield, UserCog, Receipt, Loader2, Building2, UserPlus, UserMinus } from 'lucide-react';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type AppRole = Database['public']['Enums']['app_role'];

const roleConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  admin: { label: 'Admin', icon: Shield, color: 'bg-primary text-primary-foreground' },
  branch_admin: { label: 'Branch Admin', icon: UserCog, color: 'bg-warning text-warning-foreground' },
  billing: { label: 'Billing', icon: Receipt, color: 'bg-info text-info-foreground' },
};

export default function Staff() {
  const { profile, role, isAdmin, isBranchAdmin } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [staffToRemove, setStaffToRemove] = useState<StaffMember | null>(null);
  
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<AppRole>('billing');
  const [newStaffBranch, setNewStaffBranch] = useState<string>('');

  // Branch admins only see their branch's staff
  const branchFilterId = isBranchAdmin ? profile?.branch_id : undefined;
  
  const { staff, isLoading, updateRole, updateStatus, updateBranch, removeStaff, isUpdating } = useStaff({ branchId: branchFilterId });
  const { branches } = useBranches();
  const { createInvitation, isCreating } = useStaffInvitations();

  // Only developers and central admins can manage staff
  const canManageStaff = isDeveloper || isCentralAdmin;

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
    try {
      await createInvitation({
        email: newStaffEmail,
        role: newStaffRole,
        branchId: newStaffBranch && newStaffBranch !== 'none' ? newStaffBranch : undefined,
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Staff Management</h1>
            <p className="text-muted-foreground">
              {activeStaff} active staff members • {staff.length} total
              {isBranchAdmin && profile?.branch_id && (
                <span className="ml-2 text-primary">
                  • {getBranchName(profile.branch_id)}
                </span>
              )}
            </p>
          </div>
          {canManageStaff && (
            <Dialog open={showAddDialog} onOpenChange={(open) => {
              if (!open) resetAddDialog();
              else setShowAddDialog(true);
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
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
                    <Select value={newStaffRole} onValueChange={(v: AppRole) => setNewStaffRole(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="billing">Billing Staff</SelectItem>
                        <SelectItem value="branch_admin">Branch Admin</SelectItem>
                        <SelectItem value="central_admin">Central Admin</SelectItem>
                        {isDeveloper && <SelectItem value="developer">Developer</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {(newStaffRole === 'billing' || newStaffRole === 'branch_admin') && (
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
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={resetAddDialog}>Cancel</Button>
                  <Button onClick={handleInviteStaff} disabled={isCreating}>
                    {isCreating ? 'Inviting...' : 'Send Invitation'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

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
                      <Mail className="h-4 w-4" />
                      <span className="truncate font-mono text-xs">{member.userId}</span>
                    </div>
                    {member.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
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
                              <SelectItem value="central_admin">Central Admin</SelectItem>
                              {isDeveloper && <SelectItem value="developer">Developer</SelectItem>}
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