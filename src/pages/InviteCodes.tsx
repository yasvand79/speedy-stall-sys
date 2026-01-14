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
import { Ticket, Plus, Copy, XCircle, Building2, Clock, Users } from 'lucide-react';
import { useInviteCodes } from '@/hooks/useInviteCodes';
import { useBranches } from '@/hooks/useBranches';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';
import { format } from 'date-fns';

type AppRole = Database['public']['Enums']['app_role'];

const roleLabels: Record<AppRole, string> = {
  developer: 'Developer',
  central_admin: 'Central Admin',
  branch_admin: 'Branch Admin',
  billing: 'Billing',
};

const branchRequiredRoles: AppRole[] = ['branch_admin', 'billing'];

export default function InviteCodes() {
  const { isDeveloper, isCentralAdmin } = useAuth();
  const { inviteCodes, isLoading, createCode, deactivateCode, isCreating } = useInviteCodes();
  const { branches } = useBranches();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState<AppRole>('billing');
  const [newBranchId, setNewBranchId] = useState<string>('');
  const [newMaxUses, setNewMaxUses] = useState('1');
  const [newExpiresInDays, setNewExpiresInDays] = useState('7');

  const canManageCodes = isDeveloper || isCentralAdmin;
  const requiresBranch = branchRequiredRoles.includes(newRole);

  // Filter roles based on current user's role
  const availableRoles: AppRole[] = isDeveloper
    ? ['developer', 'central_admin', 'branch_admin', 'billing']
    : ['branch_admin', 'billing']; // Central admin can't create developer codes

  const handleCreateCode = async () => {
    if (requiresBranch && !newBranchId) {
      toast.error('Please select a branch for this role');
      return;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(newExpiresInDays));

    try {
      await createCode({
        role: newRole,
        branchId: requiresBranch ? newBranchId : undefined,
        maxUses: parseInt(newMaxUses),
        expiresAt: expiresAt.toISOString(),
      });
      setIsDialogOpen(false);
      setNewRole('billing');
      setNewBranchId('');
      setNewMaxUses('1');
      setNewExpiresInDays('7');
    } catch (error) {
      // Error handled in hook
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  if (!canManageCodes) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">You don't have permission to manage invite codes.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Invite Codes</h1>
            <p className="text-muted-foreground">Generate and manage staff invite codes</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Generate Code
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Invite Code</DialogTitle>
                <DialogDescription>
                  Create a new invite code for staff registration
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Uses</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newMaxUses}
                      onChange={(e) => setNewMaxUses(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expires In (Days)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={newExpiresInDays}
                      onChange={(e) => setNewExpiresInDays(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCode} disabled={isCreating}>
                  {isCreating ? 'Generating...' : 'Generate'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Active Invite Codes
            </CardTitle>
            <CardDescription>
              Share these codes with new staff members for registration
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : inviteCodes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No invite codes yet. Generate one to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inviteCodes.map((code) => {
                    const isExpired = code.expires_at && new Date(code.expires_at) < new Date();
                    const isExhausted = code.used_count >= code.max_uses;
                    const isValid = code.is_active && !isExpired && !isExhausted;

                    return (
                      <TableRow key={code.id}>
                        <TableCell>
                          <code className="bg-muted px-2 py-1 rounded font-mono text-sm">
                            {code.code}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{roleLabels[code.role_assigned]}</Badge>
                        </TableCell>
                        <TableCell>
                          {code.branch ? (
                            <span className="flex items-center gap-1 text-sm">
                              <Building2 className="h-3 w-3" />
                              {code.branch.name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-sm">
                            <Users className="h-3 w-3" />
                            {code.used_count} / {code.max_uses}
                          </span>
                        </TableCell>
                        <TableCell>
                          {code.expires_at ? (
                            <span className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3" />
                              {format(new Date(code.expires_at), 'MMM d, yyyy')}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isValid ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              Active
                            </Badge>
                          ) : isExpired ? (
                            <Badge variant="secondary">Expired</Badge>
                          ) : isExhausted ? (
                            <Badge variant="secondary">Exhausted</Badge>
                          ) : (
                            <Badge variant="destructive">Disabled</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyCode(code.code)}
                              title="Copy code"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            {code.is_active && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deactivateCode(code.id)}
                                title="Deactivate"
                              >
                                <XCircle className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
