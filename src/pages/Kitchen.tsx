import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { Clock, ChefHat, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Kitchen() {
  const { data: orders, isLoading, refetch } = useOrders(['placed', 'preparing', 'ready']);
  const updateStatus = useUpdateOrderStatus();

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => refetch(), 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  const placedOrders = orders?.filter(o => o.status === 'placed') || [];
  const preparingOrders = orders?.filter(o => o.status === 'preparing') || [];
  const readyOrders = orders?.filter(o => o.status === 'ready') || [];

  const handleStatusChange = (orderId: string, newStatus: 'preparing' | 'ready' | 'completed') => {
    updateStatus.mutate({ orderId, status: newStatus });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </MainLayout>
    );
  }

  const columns = [
    { title: 'New Orders', icon: AlertCircle, orders: placedOrders, color: 'text-orange-500', bgColor: 'bg-orange-50 border-orange-200', nextStatus: 'preparing' as const, nextLabel: 'Start Preparing' },
    { title: 'Preparing', icon: ChefHat, orders: preparingOrders, color: 'text-blue-500', bgColor: 'bg-blue-50 border-blue-200', nextStatus: 'ready' as const, nextLabel: 'Mark Ready' },
    { title: 'Ready', icon: CheckCircle2, orders: readyOrders, color: 'text-green-500', bgColor: 'bg-green-50 border-green-200', nextStatus: undefined, nextLabel: undefined },
  ];

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <ChefHat className="h-7 w-7 text-primary" />
              Kitchen Display
            </h1>
            <p className="text-muted-foreground">Auto-refreshes every 5 seconds</p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {(orders?.length || 0)} active orders
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[70vh]">
          {columns.map(col => {
            const Icon = col.icon;
            return (
              <div key={col.title} className="flex flex-col">
                <div className={`flex items-center gap-2 p-3 rounded-t-lg border ${col.bgColor}`}>
                  <Icon className={`h-5 w-5 ${col.color}`} />
                  <h2 className="font-semibold text-foreground">{col.title}</h2>
                  <Badge variant="outline" className="ml-auto">{col.orders.length}</Badge>
                </div>
                <div className="flex-1 border border-t-0 rounded-b-lg p-3 space-y-3 bg-muted/20 overflow-y-auto max-h-[65vh]">
                  {col.orders.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground text-sm">No orders</p>
                  ) : (
                    col.orders.map(order => (
                      <Card key={order.id} className="border-l-4" style={{ borderLeftColor: col.color.includes('orange') ? '#f97316' : col.color.includes('blue') ? '#3b82f6' : '#22c55e' }}>
                        <CardHeader className="pb-2 pt-3 px-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-display">{order.order_number}</CardTitle>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(order.created_at!), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {order.type === 'dine-in' ? `Table ${order.table_number}` : 'Takeaway'}
                            {order.customer_name && ` • ${order.customer_name}`}
                          </p>
                        </CardHeader>
                        <CardContent className="px-3 pb-3 space-y-2">
                          <div className="space-y-1">
                            {order.order_items.map(item => (
                              <div key={item.id} className="flex justify-between text-sm">
                                <span className="font-medium">{item.quantity}x {item.menu_items?.name}</span>
                              </div>
                            ))}
                          </div>
                          {order.notes && (
                            <p className="text-xs text-muted-foreground bg-muted rounded p-2">📝 {order.notes}</p>
                          )}
                          {col.nextStatus && (
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => handleStatusChange(order.id, col.nextStatus!)}
                              disabled={updateStatus.isPending}
                            >
                              {col.nextLabel}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
