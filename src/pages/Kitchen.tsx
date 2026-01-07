import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { ChefHat, Clock, UtensilsCrossed, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Kitchen() {
  const { data: orders, isLoading } = useOrders(['placed', 'preparing']);
  const updateStatus = useUpdateOrderStatus();

  const placedOrders = orders?.filter(o => o.status === 'placed') || [];
  const preparingOrders = orders?.filter(o => o.status === 'preparing') || [];

  const handleStartPreparing = (orderId: string) => {
    updateStatus.mutate({ orderId, status: 'preparing' });
  };

  const handleMarkReady = (orderId: string) => {
    updateStatus.mutate({ orderId, status: 'ready' });
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

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <ChefHat className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Kitchen Display</h1>
            <p className="text-muted-foreground">
              {placedOrders.length + preparingOrders.length} active orders
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* New Orders */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <h2 className="font-semibold text-lg">New Orders ({placedOrders.length})</h2>
            </div>
            
            {placedOrders.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No new orders</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {placedOrders.map((order) => (
                  <Card key={order.id} className="border-l-4 border-l-orange-500">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{order.order_number}</CardTitle>
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          {order.type === 'dine-in' ? `Table ${order.table_number}` : 'Takeaway'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        {order.order_items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-primary">{item.quantity}x</span>
                              <span>{item.menu_items?.name}</span>
                            </div>
                            {item.notes && (
                              <span className="text-xs text-muted-foreground italic">{item.notes}</span>
                            )}
                          </div>
                        ))}
                      </div>
                      {order.notes && (
                        <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                          Note: {order.notes}
                        </p>
                      )}
                      <Button 
                        className="w-full" 
                        onClick={() => handleStartPreparing(order.id)}
                        disabled={updateStatus.isPending}
                      >
                        <UtensilsCrossed className="mr-2 h-4 w-4" />
                        Start Preparing
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Preparing Orders */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-blue-500" />
              <h2 className="font-semibold text-lg">Preparing ({preparingOrders.length})</h2>
            </div>
            
            {preparingOrders.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No orders being prepared</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {preparingOrders.map((order) => (
                  <Card key={order.id} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{order.order_number}</CardTitle>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {order.type === 'dine-in' ? `Table ${order.table_number}` : 'Takeaway'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        {order.order_items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-primary">{item.quantity}x</span>
                              <span>{item.menu_items?.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700" 
                        onClick={() => handleMarkReady(order.id)}
                        disabled={updateStatus.isPending}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Mark Ready
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
