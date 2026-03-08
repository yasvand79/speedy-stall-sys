import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NewOrderDialog } from '@/components/orders/NewOrderDialog';
import { PaymentDialog } from '@/components/billing/PaymentDialog';
import { useOrders, useUpdateOrderStatus, OrderWithItems } from '@/hooks/useOrders';
import { usePayments } from '@/hooks/usePayments';
import { useBranches } from '@/hooks/useBranches';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Clock, ChefHat, CheckCircle2, Banknote, XCircle, Building2, User, Users, UtensilsCrossed, Printer } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function Orders() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);

  const { data: orders, isLoading } = useOrders();
  const { data: allPayments } = usePayments();
  const { branches } = useBranches();
  const updateStatus = useUpdateOrderStatus();
  const { isAdmin, isBilling } = useAuth();

  // Calculate staff performance stats
  const staffStats = useMemo(() => {
    if (!orders) return [];
    
    const statsMap = new Map<string, {
      staffName: string;
      branchName: string;
      branchId: string | null;
      totalOrders: number;
      totalItems: number;
      totalSales: number;
    }>();

    orders.forEach(order => {
      const staffName = order.staff_name || 'Unknown';
      const branchName = (order as any).branches?.name || 'Unknown Branch';
      const branchId = order.branch_id;
      const key = `${staffName}-${branchId}`;

      if (!statsMap.has(key)) {
        statsMap.set(key, {
          staffName,
          branchName,
          branchId,
          totalOrders: 0,
          totalItems: 0,
          totalSales: 0,
        });
      }

      const stats = statsMap.get(key)!;
      stats.totalOrders += 1;
      stats.totalItems += order.order_items.reduce((sum, item) => sum + item.quantity, 0);
      stats.totalSales += Number(order.total);
    });

    return Array.from(statsMap.values()).sort((a, b) => b.totalOrders - a.totalOrders);
  }, [orders]);

  const handleStatusChange = (orderId: string, newStatus: 'placed' | 'preparing' | 'ready' | 'completed' | 'cancelled') => {
    updateStatus.mutate({ orderId, status: newStatus });
  };

  const handleProcessPayment = (order: OrderWithItems) => {
    setSelectedOrder(order);
    setPaymentOpen(true);
  };

  const handlePrintInvoice = async (orderId: string) => {
    setPrintingOrderId(orderId);
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice', {
        body: { orderId }
      });

      if (error) throw error;

      if (data?.html) {
        // Open print window with the HTML
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(data.html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
          }, 250);
        }
        toast.success('Invoice generated successfully');
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    } finally {
      setPrintingOrderId(null);
    }
  };

  const getOrderPayments = (orderId: string) => {
    return allPayments?.filter(p => p.order_id === orderId) || [];
  };

  const getPaidAmount = (orderId: string) => {
    return getOrderPayments(orderId).reduce((sum, p) => sum + Number(p.amount), 0);
  };

  const filterOrders = (status: string) => {
    let filtered = orders || [];
    
    if (status !== 'all') {
      filtered = filtered.filter(order => order.status === status);
    }

    // Branch filter
    if (branchFilter !== 'all') {
      filtered = filtered.filter(order => order.branch_id === branchFilter);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(
        order =>
          order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.staff_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };

  const statusColors = {
    placed: 'bg-orange-100 text-orange-700 border-orange-200',
    preparing: 'bg-blue-100 text-blue-700 border-blue-200',
    ready: 'bg-green-100 text-green-700 border-green-200',
    completed: 'bg-gray-100 text-gray-700 border-gray-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  };

  const getNextStatus = (current: string) => {
    const flow: Record<string, 'preparing' | 'ready' | 'completed'> = {
      placed: 'preparing',
      preparing: 'ready',
      ready: 'completed',
    };
    return flow[current];
  };

  const activeOrders = orders?.filter(o => !['completed', 'cancelled'].includes(o.status)) || [];
  const canSeeBranchFilter = isAdmin;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
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
            <h1 className="font-display text-2xl font-bold text-foreground">Orders</h1>
            <p className="text-muted-foreground">
              {activeOrders.length} active orders
            </p>
          </div>
          {(isAdmin || isBilling) && <NewOrderDialog />}
        </div>

        {/* Staff Performance Summary */}
        {isAdmin && staffStats.length > 0 && (
          <Card className="bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Staff Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {staffStats.slice(0, 8).map((stat, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-background rounded-lg border">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{stat.staffName}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {stat.branchName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{stat.totalOrders}</p>
                      <p className="text-xs text-muted-foreground">{stat.totalItems} items</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search orders, staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {canSeeBranchFilter && (
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="w-[200px]">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches?.filter(b => b.is_active).map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">
              All ({orders?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="placed">
              Placed ({orders?.filter(o => o.status === 'placed').length || 0})
            </TabsTrigger>
            <TabsTrigger value="preparing">
              Preparing ({orders?.filter(o => o.status === 'preparing').length || 0})
            </TabsTrigger>
            <TabsTrigger value="ready">
              Ready ({orders?.filter(o => o.status === 'ready').length || 0})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({orders?.filter(o => o.status === 'completed').length || 0})
            </TabsTrigger>
          </TabsList>

          {(['all', 'placed', 'preparing', 'ready', 'completed'] as const).map((status) => (
            <TabsContent key={status} value={status} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filterOrders(status).map((order) => {
                  const paidAmount = getPaidAmount(order.id);
                  const remaining = Number(order.total) - paidAmount;
                  
                  return (
                    <Card key={order.id} className="border-l-4" style={{ borderLeftColor: order.status === 'placed' ? '#f97316' : order.status === 'preparing' ? '#3b82f6' : order.status === 'ready' ? '#22c55e' : '#6b7280' }}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg font-display">{order.order_number}</CardTitle>
                          <Badge variant="outline" className={statusColors[order.status]}>
                            {order.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(order.created_at!), { addSuffix: true })}
                          <span className="mx-1">•</span>
                          <span>{order.type === 'dine-in' ? `Table ${order.table_number}` : 'Takeaway'}</span>
                        </div>
                        {/* Branch & Staff Info */}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {(order as any).branches?.name && (
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {(order as any).branches.name}
                            </Badge>
                          )}
                          {order.staff_name && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {order.staff_name}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Items */}
                        <div className="space-y-1">
                          {order.order_items.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>{item.quantity}x {item.menu_items?.name}</span>
                              <span className="text-muted-foreground">₹{Number(item.price) * item.quantity}</span>
                            </div>
                          ))}
                        </div>

                        {/* Total */}
                        <div className="pt-2 border-t flex justify-between font-semibold">
                          <span>Total</span>
                          <span>₹{Number(order.total).toFixed(0)}</span>
                        </div>

                        {/* Payment Status */}
                        {order.status !== 'cancelled' && (
                          <div className="flex items-center justify-between text-sm">
                            <span>Payment</span>
                            <Badge variant={order.payment_status === 'completed' ? 'default' : 'secondary'}>
                              {order.payment_status === 'completed' ? 'Paid' : remaining > 0 ? `₹${remaining.toFixed(0)} due` : 'Pending'}
                            </Badge>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          {/* Status progression */}
                          {order.status !== 'completed' && order.status !== 'cancelled' && (
                            <>
                              {isAdmin && order.status === 'placed' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleStatusChange(order.id, 'preparing')}
                                  disabled={updateStatus.isPending}
                                >
                                  <ChefHat className="mr-1 h-4 w-4" />
                                  Start
                                </Button>
                              )}
                              {isAdmin && order.status === 'preparing' && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-green-600 border-green-200 hover:bg-green-50"
                                  onClick={() => handleStatusChange(order.id, 'ready')}
                                  disabled={updateStatus.isPending}
                                >
                                  <CheckCircle2 className="mr-1 h-4 w-4" />
                                  Ready
                                </Button>
                              )}
                              {(isAdmin || isBilling) && order.status === 'ready' && order.payment_status === 'completed' && (
                                <Button 
                                  size="sm"
                                  onClick={() => handleStatusChange(order.id, 'completed')}
                                  disabled={updateStatus.isPending}
                                >
                                  <CheckCircle2 className="mr-1 h-4 w-4" />
                                  Complete
                                </Button>
                              )}
                            </>
                          )}

                          {/* Payment button for cashier */}
                          {(isAdmin || isBilling) && order.status !== 'cancelled' && order.payment_status !== 'completed' && (
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => handleProcessPayment(order)}
                            >
                              <Banknote className="mr-1 h-4 w-4" />
                              Pay
                            </Button>
                          )}

                          {/* Cancel button */}
                          {(isDeveloper || isAdmin) && order.status === 'placed' && (
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleStatusChange(order.id, 'cancelled')}
                              disabled={updateStatus.isPending}
                            >
                              <XCircle className="mr-1 h-4 w-4" />
                              Cancel
                            </Button>
                          )}

                          {/* Print Invoice button */}
                          {order.status !== 'cancelled' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handlePrintInvoice(order.id)}
                              disabled={printingOrderId === order.id}
                            >
                              <Printer className="mr-1 h-4 w-4" />
                              {printingOrderId === order.id ? 'Printing...' : 'Invoice'}
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {filterOrders(status).length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No orders found</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Payment Dialog */}
      {selectedOrder && (
        <PaymentDialog
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          orderId={selectedOrder.id}
          orderNumber={selectedOrder.order_number}
          total={Number(selectedOrder.total)}
          paidAmount={getPaidAmount(selectedOrder.id)}
        />
      )}
    </MainLayout>
  );
}
