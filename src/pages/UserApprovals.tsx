import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCheck, UserX, Clock, CheckCircle, XCircle, Building2, Shield, History } from 'lucide-react';
import { useUserApprovals, PendingUser } from '@/hooks/useUserApprovals';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';
import { format } from 'date-fns';

type AppRole = Database['public']['Enums']['app_role'];

const roleLabels: Record<AppRole, string> = {
  developer: 'Developer',
  central_admin: 'Central Admin',
  branch_admin: 'Branch Admin',
  billing: 'Billing',
};

const statusConfig = {
  pending: { label: 'Pending', icon: Clock, className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  approved: { label: 'Approved', icon: CheckCircle, className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  rejected: { label: 'Rejected', icon: XCircle, className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
};

export default function UserApprovals() {
  const { isDeveloper, isCentralAdmin, isBranchAdmin, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  const { pendingUsers, approvalLogs, isLoading, approveUser, rejectUser, isApproving, isRejecting } = useUserApprovals(
    activeTab === 'all' ? undefined : activeTab
  );

  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [remarks, setRemarks] = useState('');

  const canApprove = isDeveloper || isCentralAdmin;

  // Filter users for branch admin view
  const filteredUsers = isBranchAdmin && profile?.branch_id
    ? pendingUsers.filter(u => u.branch_id === profile.branch_id)
    : pendingUsers;

  const handleAction = async () => {
    if (!selectedUser || !actionType) return;

    try {
      if (actionType === 'approve') {
        await approveUser({ userId: selectedUser.user_id, remarks });
      } else {
        await rejectUser({ userId: selectedUser.user_id, remarks });
      }
      setSelectedUser(null);
      setActionType(null);
      setRemarks('');
    } catch (error) {
      // Error handled in hook
    }
  };

  const openActionDialog = (user: PendingUser, action: 'approve' | 'reject') => {
    setSelectedUser(user);
    setActionType(action);
    setRemarks('');
  };

  if (!canApprove && !isBranchAdmin) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">You don't have permission to view user approvals.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">User Approvals</h1>
          <p className="text-muted-foreground">
            {canApprove ? 'Review and approve pending staff registrations' : 'View staff registration status'}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Approved
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              <XCircle className="h-4 w-4" />
              Rejected
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              All
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Staff Registrations</CardTitle>
                <CardDescription>
                  {activeTab === 'pending' && 'Users waiting for approval'}
                  {activeTab === 'approved' && 'Approved staff members'}
                  {activeTab === 'rejected' && 'Rejected registrations'}
                  {activeTab === 'all' && 'All staff registrations'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No {activeTab !== 'all' ? activeTab : ''} registrations found.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Invite Code</TableHead>
                        <TableHead>Registered</TableHead>
                        <TableHead>Status</TableHead>
                        {canApprove && activeTab === 'pending' && (
                          <TableHead className="text-right">Actions</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => {
                        const status = statusConfig[user.status as keyof typeof statusConfig] || statusConfig.pending;
                        const StatusIcon = status.icon;

                        return (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.full_name}</TableCell>
                            <TableCell>
                              {user.role && (
                                <Badge variant="outline" className="gap-1">
                                  <Shield className="h-3 w-3" />
                                  {roleLabels[user.role]}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.branch ? (
                                <span className="flex items-center gap-1 text-sm">
                                  <Building2 className="h-3 w-3" />
                                  {user.branch.name}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.invite_code_used ? (
                                <code className="bg-muted px-2 py-0.5 rounded text-xs">
                                  {user.invite_code_used}
                                </code>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(user.created_at), 'MMM d, yyyy HH:mm')}
                            </TableCell>
                            <TableCell>
                              <Badge className={status.className}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {status.label}
                              </Badge>
                            </TableCell>
                            {canApprove && activeTab === 'pending' && (
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => openActionDialog(user, 'approve')}
                                    className="gap-1"
                                  >
                                    <UserCheck className="h-4 w-4" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => openActionDialog(user, 'reject')}
                                    className="gap-1"
                                  >
                                    <UserX className="h-4 w-4" />
                                    Reject
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Approval Logs */}
        {canApprove && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Approval History
              </CardTitle>
              <CardDescription>Recent approval and rejection actions</CardDescription>
            </CardHeader>
            <CardContent>
              {approvalLogs.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No approval history yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>By</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvalLogs.slice(0, 10).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.user?.full_name}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              log.action === 'APPROVED'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }
                          >
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.admin?.full_name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.remarks || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Dialog */}
        <Dialog open={!!selectedUser && !!actionType} onOpenChange={() => { setSelectedUser(null); setActionType(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === 'approve' ? 'Approve User' : 'Reject User'}
              </DialogTitle>
              <DialogDescription>
                {actionType === 'approve'
                  ? `Approve ${selectedUser?.full_name} as ${selectedUser?.role ? roleLabels[selectedUser.role] : 'staff'}?`
                  : `Reject ${selectedUser?.full_name}'s registration?`}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="remarks">Remarks (optional)</Label>
              <Textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add any notes about this decision..."
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setSelectedUser(null); setActionType(null); }}>
                Cancel
              </Button>
              <Button
                onClick={handleAction}
                disabled={isApproving || isRejecting}
                variant={actionType === 'reject' ? 'destructive' : 'default'}
              >
                {isApproving || isRejecting ? 'Processing...' : actionType === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
