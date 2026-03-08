import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Mail, Plus, XCircle, Building2, UserPlus, CheckCircle } from 'lucide-react';
import { useStaffInvitations } from '@/hooks/useStaffInvitations';
import { useBranches } from '@/hooks/useBranches';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';
import { format } from 'date-fns';

type AppRole = Database['public']['Enums']['app_role'];

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  branch_admin: 'Branch Admin',
  billing: 'Billing',
};

const branchRequiredRoles: AppRole[] = ['branch_admin', 'billing'];

export default function InviteCodes() {
  const { isAdmin } = useAuth();
  const { invitations, isLoading, createInvitation, revokeInvitation, isCreating } = useStaffInvitations();
  const { branches } = useBranches();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('billing');
  const [newBranchId, setNewBranchId] = useState<string>('');

  const canManage = isAdmin;
  const requiresBranch = branchRequiredRoles.includes(newRole);

  const availableRoles: AppRole[] = ['admin', 'branch_admin', 'billing'];

  const handleCreate = async () => {
    if (!newEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    if (requiresBranch && !newBranchId) {
      toast.error('Please select a branch for this role');
      return;
    }

    try {
      await createInvitation({
        email: newEmail,
        role: newRole,
        branchId: requiresBranch ? newBranchId : undefined,
      });
      setIsDialogOpen(false);
      setNewEmail('');
      setNewRole('billing');
      setNewBranchId('');
    } catch {
      // Error handled in hook
    }
  };

  if (!canManage) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">You don't have permission to manage staff invitations.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Staff Access</h1>
            <p className="text-muted-foreground">Add staff emails — they can sign up and login directly</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Staff Member</DialogTitle>
                <DialogDescription>
                  Enter their email and assign a role. They can sign up and login directly — no approval needed.
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
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {roleLabels[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {requiresBranch && (
                  <div className="space-y-2">
                    <Label>Branch</Label>
                    <Select value={newBranchId} onValueChange={setNewBranchId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name} ({branch.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Authorized Staff
            </CardTitle>
            <CardDescription>
              Staff emails added here can sign up and login directly without admin approval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : invitations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No staff added yet. Add a staff email to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{roleLabels[inv.role_assigned]}</Badge>
                      </TableCell>
                      <TableCell>
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
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                            Pending
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Used
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
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
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
