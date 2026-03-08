import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOrders } from '@/hooks/useOrders';
import { useDailySales, useTopSellingItems, useWeeklyRevenue, useInventoryStatus } from '@/hooks/useReports';
import { IndianRupee, ShoppingCart, TrendingUp, Clock, Users, CreditCard, Banknote, Smartphone, AlertTriangle, UtensilsCrossed, Package } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

export default function Dashboard() {
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const { data: dailySales, isLoading: salesLoading } = useDailySales();
  const { data: topItems } = useTopSellingItems(7);
  const { data: weeklyRevenue } = useWeeklyRevenue();
  const { data: inventory } = useInventoryStatus();

  const activeOrders = orders?.filter(o => !['completed', 'cancelled'].includes(o.status)) || [];
  const recentOrders = orders?.slice(0, 5) || [];
  const todayOrders = orders?.filter(o => {
    const today = new Date();
    const orderDate = new Date(o.created_at);
    return orderDate.toDateString() === today.toDateString();
  }) || [];

  // Payment method breakdown (today)
  const cashOrders = todayOrders.filter(o => o.payment_status === 'completed');
  const pendingPayments = todayOrders.filter(o => o.payment_status === 'pending');

  // Order type breakdown (today)
  const dineInCount = todayOrders.filter(o => o.type === 'dine-in').length;
  const takeawayCount = todayOrders.filter(o => o.type === 'takeaway').length;
  const orderTypePieData = [
    { name: 'Dine-in', value: dineInCount },
    { name: 'Takeaway', value: takeawayCount },
  ].filter(d => d.value > 0);

  // Cancelled orders today
  const cancelledToday = todayOrders.filter(o => o.status === 'cancelled').length;

  // Low stock items
  const lowStockItems = inventory?.filter(item => item.quantity <= item.min_quantity) || [];

  // Status breakdown
  const statusCounts = {
    placed: orders?.filter(o => o.status === 'placed').length || 0,
    preparing: orders?.filter(o => o.status === 'preparing').length || 0,
    ready: orders?.filter(o => o.status === 'ready').length || 0,
  };

  const statusColors: Record<string, string> = {
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
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Today's Revenue"
            value={`₹${(dailySales?.totalRevenue || 0).toLocaleString()}`}
            icon={IndianRupee}
            variant="primary"
          />
          <StatCard
            title="Total Orders"
            value={todayOrders.length}
            subtitle={`${dailySales?.totalOrders || 0} completed`}
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
            subtitle={`${statusCounts.placed} new • ${statusCounts.preparing} cooking • ${statusCounts.ready} ready`}
            icon={Clock}
          />
        </div>

        {/* Second row stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Dine-in"
            value={dineInCount}
            subtitle="Today"
            icon={UtensilsCrossed}
          />
          <StatCard
            title="Takeaway"
            value={takeawayCount}
            subtitle="Today"
            icon={Package}
          />
          <StatCard
            title="Pending Payments"
            value={pendingPayments.length}
            subtitle={`₹${pendingPayments.reduce((s, o) => s + Number(o.total), 0).toLocaleString()} due`}
            icon={CreditCard}
          />
          <StatCard
            title="Cancelled"
            value={cancelledToday}
            subtitle="Today"
            icon={AlertTriangle}
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Weekly Revenue Chart */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Weekly Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                {weeklyRevenue && weeklyRevenue.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={weeklyRevenue}>
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                      <Tooltip
                        formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                      />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center py-16 text-muted-foreground">No revenue data yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Type Pie */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Order Type Split</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {orderTypePieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={orderTypePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={4}>
                        {orderTypePieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 mt-2">
                    {orderTypePieData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2 text-sm">
                        <div className="h-3 w-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-muted-foreground">{d.name}: <span className="font-semibold text-foreground">{d.value}</span></span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-12">No orders today</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {recentOrders.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No orders yet</p>
                ) : (
                  <div className="space-y-3">
                    {recentOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-display font-semibold">{order.order_number}</span>
                              <Badge variant="outline" className={statusColors[order.status]}>
                                {order.status}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {order.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {order.type === 'dine-in' ? `Table ${order.table_number}` : order.customer_name || 'Takeaway'} • {order.order_items.length} items
                              {order.staff_name && <span> • by {order.staff_name}</span>}
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
                          <p className="text-xs text-muted-foreground">{item.quantity} sold • ₹{item.revenue.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Low Stock Alert */}
            {lowStockItems.length > 0 && (
              <Card className="border-destructive/30">
                <CardHeader>
                  <CardTitle className="font-display text-base flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Low Stock ({lowStockItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {lowStockItems.slice(0, 5).map(item => (
                      <div key={item.id} className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{item.name}</span>
                        <Badge variant="destructive" className="text-xs">
                          {item.quantity} {item.unit}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
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
                    {statusCounts.ready}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Being Prepared</span>
                  <Badge variant="secondary">
                    {statusCounts.preparing}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">New Orders</span>
                  <Badge variant="secondary">
                    {statusCounts.placed}
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
