import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRefunds, useApproveRefund } from '@/hooks/useRefunds';
import { useAuth } from '@/contexts/AuthContext';
import { RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function Refunds() {
  const { data: refunds, isLoading } = useRefunds();
  const approveRefund = useApproveRefund();
  const { isDeveloper, isCentralAdmin } = useAuth();
  const canApprove = isDeveloper || isCentralAdmin;

  const statusColors: Record<string, string> = {
    requested: 'bg-orange-100 text-orange-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <RotateCcw className="h-7 w-7 text-primary" />
            Refunds
          </h1>
          <p className="text-muted-foreground">{refunds?.length || 0} refund requests</p>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  {canApprove && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : refunds?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No refunds</TableCell>
                  </TableRow>
                ) : (
                  refunds?.map(refund => (
                    <TableRow key={refund.id}>
                      <TableCell className="text-sm">{format(new Date(refund.created_at), 'dd MMM yyyy HH:mm')}</TableCell>
                      <TableCell className="font-mono text-sm">{refund.order_id.slice(0, 8)}...</TableCell>
                      <TableCell className="font-semibold">₹{Number(refund.amount).toFixed(0)}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{refund.reason}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[refund.status] || ''}>{refund.status}</Badge>
                      </TableCell>
                      {canApprove && (
                        <TableCell>
                          {refund.status === 'requested' && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600"
                                onClick={() => approveRefund.mutate({ refundId: refund.id, approved: true })}
                                disabled={approveRefund.isPending}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600"
                                onClick={() => approveRefund.mutate({ refundId: refund.id, approved: false })}
                                disabled={approveRefund.isPending}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
