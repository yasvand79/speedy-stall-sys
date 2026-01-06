import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { OrderCard } from '@/components/orders/OrderCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockOrders } from '@/data/mockData';
import { Order, OrderStatus } from '@/types';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [searchQuery, setSearchQuery] = useState('');

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === orderId
          ? { ...order, status: newStatus, updatedAt: new Date() }
          : order
      )
    );
    toast.success(`Order status updated to ${newStatus}`);
  };

  const filterOrdersByStatus = (status: OrderStatus | 'all') => {
    let filtered = orders;
    if (status !== 'all') {
      filtered = orders.filter(order => order.status === status);
    }
    if (searchQuery) {
      filtered = filtered.filter(
        order =>
          order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  };

  const activeOrders = orders.filter(o => !['completed', 'cancelled'].includes(o.status));

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
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Order
          </Button>
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
              All ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="placed">
              Placed ({orders.filter(o => o.status === 'placed').length})
            </TabsTrigger>
            <TabsTrigger value="preparing">
              Preparing ({orders.filter(o => o.status === 'preparing').length})
            </TabsTrigger>
            <TabsTrigger value="ready">
              Ready ({orders.filter(o => o.status === 'ready').length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({orders.filter(o => o.status === 'completed').length})
            </TabsTrigger>
          </TabsList>

          {(['all', 'placed', 'preparing', 'ready', 'completed'] as const).map((status) => (
            <TabsContent key={status} value={status} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filterOrdersByStatus(status).map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
              {filterOrdersByStatus(status).length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No orders found</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </MainLayout>
  );
}
