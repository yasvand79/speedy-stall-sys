import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NewOrderDialog } from '@/components/orders/NewOrderDialog';
import { PaymentDialog } from '@/components/billing/PaymentDialog';
import { useOrders, useUpdateOrderStatus, OrderWithItems } from '@/hooks/useOrders';
import { usePayments } from '@/hooks/usePayments';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Clock, ChefHat, CheckCircle2, Banknote, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function Orders() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const { data: orders, isLoading } = useOrders();
  const { data: allPayments } = usePayments();
  const updateStatus = useUpdateOrderStatus();
  const { isDeveloper, isAdmin, isBilling } = useAuth();

  const handleStatusChange = (orderId: string, newStatus: 'placed' | 'preparing' | 'ready' | 'completed' | 'cancelled') => {
    updateStatus.mutate({ orderId, status: newStatus });
  };

  const handleProcessPayment = (order: OrderWithItems) => {
    setSelectedOrder(order);
    setPaymentOpen(true);
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
    
    if (searchQuery) {
      filtered = filtered.filter(
        order =>
          order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
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
          {(isDeveloper || isAdmin || isBilling) && <NewOrderDialog />}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
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
                    <Card key={order.id} className={`border-l-4 border-l-${order.status === 'placed' ? 'orange' : order.status === 'preparing' ? 'blue' : order.status === 'ready' ? 'green' : 'gray'}-500`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg font-display">{order.order_number}</CardTitle>
                          <Badge variant="outline" className={statusColors[order.status]}>
                            {order.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                          <span className="mx-1">•</span>
                          <span>{order.type === 'dine-in' ? `Table ${order.table_number}` : 'Takeaway'}</span>
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
                              {(isDeveloper || isAdmin) && order.status === 'placed' && (
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
                              {(isDeveloper || isAdmin) && order.status === 'preparing' && (
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
                              {(isDeveloper || isAdmin || isBilling) && order.status === 'ready' && order.payment_status === 'completed' && (
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
                          {(isDeveloper || isAdmin || isBilling) && order.status !== 'cancelled' && order.payment_status !== 'completed' && (
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
