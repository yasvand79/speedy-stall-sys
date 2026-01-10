import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOrders } from '@/hooks/useOrders';
import { useDailySales, useTopSellingItems } from '@/hooks/useReports';
import { IndianRupee, ShoppingCart, TrendingUp, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const { data: dailySales, isLoading: salesLoading } = useDailySales();
  const { data: topItems } = useTopSellingItems(7);

  const activeOrders = orders?.filter(o => !['completed', 'cancelled'].includes(o.status)) || [];
  const recentOrders = orders?.slice(0, 5) || [];

  const statusColors = {
    placed: 'bg-orange-100 text-orange-700 border-orange-200',
    preparing: 'bg-blue-100 text-blue-700 border-blue-200',
    ready: 'bg-green-100 text-green-700 border-green-200',
    completed: 'bg-gray-100 text-gray-700 border-gray-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  };

  if (ordersLoading || salesLoading) {
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
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Today's Revenue"
            value={`₹${(dailySales?.totalRevenue || 0).toLocaleString()}`}
            icon={IndianRupee}
            variant="primary"
          />
          <StatCard
            title="Total Orders"
            value={dailySales?.totalOrders || 0}
            subtitle="Completed today"
            icon={ShoppingCart}
          />
          <StatCard
            title="Average Order"
            value={`₹${(dailySales?.averageOrderValue || 0).toFixed(0)}`}
            subtitle="Per order value"
            icon={TrendingUp}
          />
          <StatCard
            title="Active Orders"
            value={activeOrders.length}
            subtitle="In progress"
            icon={Clock}
          />
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Orders - Takes 2 columns */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {recentOrders.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No orders yet</p>
                ) : (
                  <div className="space-y-4">
                    {recentOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-display font-semibold">{order.order_number}</span>
                              <Badge variant="outline" className={statusColors[order.status]}>
                                {order.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {order.type === 'dine-in' ? `Table ${order.table_number}` : order.customer_name || 'Takeaway'} • {order.order_items.length} items
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-display font-bold">₹{Number(order.total).toFixed(0)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar widgets */}
          <div className="space-y-6">
            {/* Top Selling Items */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-base">Top Selling (7 days)</CardTitle>
              </CardHeader>
              <CardContent>
                {!topItems || topItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data yet</p>
                ) : (
                  <div className="space-y-3">
                    {topItems.slice(0, 5).map((item, index) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity} sold</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-base">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pending Payments</span>
                  <Badge variant="secondary">
                    {orders?.filter(o => o.payment_status === 'pending').length || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ready for Pickup</span>
                  <Badge variant="secondary">
                    {orders?.filter(o => o.status === 'ready').length || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Being Prepared</span>
                  <Badge variant="secondary">
                    {orders?.filter(o => o.status === 'preparing').length || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
