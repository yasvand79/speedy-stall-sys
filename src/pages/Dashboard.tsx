import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOrders } from '@/hooks/useOrders';
import { usePayments } from '@/hooks/usePayments';
import { useDailySales, useTopSellingItems, useWeeklyRevenue, useInventoryStatus } from '@/hooks/useReports';
import { IndianRupee, ShoppingCart, TrendingUp, Clock, CreditCard, AlertTriangle, UtensilsCrossed, Package, Banknote, Smartphone, CheckCircle2, ChefHat, XCircle, Radio, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useState } from 'react';

const REFETCH_INTERVAL = 5000;
const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  placed: { label: 'New', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  preparing: { label: 'Cooking', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  ready: { label: 'Ready', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  completed: { label: 'Done', color: 'bg-muted text-muted-foreground border-border' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-200' },
};

const ORDER_STEPS = ['placed', 'preparing', 'ready', 'completed'] as const;
const STEP_ICONS: Record<string, React.ElementType> = {
  placed: ShoppingCart, preparing: ChefHat, ready: CheckCircle2, completed: CheckCircle2,
};

function OrderProgressBar({ status }: { status: string }) {
  const currentIdx = ORDER_STEPS.indexOf(status as any);
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-1 mt-2">
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10">
          <XCircle className="h-3 w-3 text-destructive" />
          <span className="text-[10px] font-medium text-destructive">Cancelled</span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 mt-2">
      {ORDER_STEPS.map((step, i) => {
        const Icon = STEP_ICONS[step];
        const isActive = i <= currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={step} className="flex items-center gap-1">
            <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium transition-all ${
              isCurrent ? 'bg-primary text-primary-foreground scale-105' :
              isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              <Icon className="h-2.5 w-2.5" />
              <span className="hidden sm:inline">{STATUS_CONFIG[step]?.label}</span>
            </div>
            {i < ORDER_STEPS.length - 1 && (
              <ArrowRight className={`h-2.5 w-2.5 ${i < currentIdx ? 'text-primary' : 'text-muted-foreground/30'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

type FilterTab = 'all' | 'active' | 'placed' | 'preparing' | 'ready' | 'completed' | 'cancelled';

function LiveOrderTabs({ orders, recentOrders }: { orders: any[]; recentOrders: any[] }) {
  const [tab, setTab] = useState<FilterTab>('all');

  const filteredOrders = tab === 'all' ? recentOrders :
    tab === 'active' ? orders.filter(o => ['placed', 'preparing', 'ready'].includes(o.status)).slice(0, 15) :
    orders.filter(o => o.status === tab).slice(0, 15);

  const counts = {
    all: recentOrders.length,
    active: orders.filter(o => ['placed', 'preparing', 'ready'].includes(o.status)).length,
    placed: orders.filter(o => o.status === 'placed').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'placed', label: 'New' },
    { key: 'preparing', label: 'Cooking' },
    { key: 'ready', label: 'Ready' },
    { key: 'completed', label: 'Done' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <>
      <div className="flex gap-1 flex-wrap mt-2">
        {tabs.map(t => (
          <Button
            key={t.key}
            variant={tab === t.key ? 'default' : 'ghost'}
            size="sm"
            className="h-6 text-[10px] px-2 gap-1"
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span className={`min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                tab === t.key ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {counts[t.key]}
              </span>
            )}
          </Button>
        ))}
      </div>
      <CardContent className="px-0 pb-0 pt-2">
        {filteredOrders.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground text-sm">No orders in this category</p>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredOrders.map((order) => (
              <div key={order.id} className="flex items-start justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-semibold text-sm">{order.order_number}</span>
                    <Badge variant="outline" className={`text-[10px] ${STATUS_CONFIG[order.status]?.color}`}>
                      {STATUS_CONFIG[order.status]?.label || order.status}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{order.type}</Badge>
                    {order.payment_status === 'completed' ? (
                      <Badge className="text-[9px] bg-success/15 text-success border-success/30 border">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Paid
                      </Badge>
                    ) : order.payment_status === 'partial' ? (
                      <Badge className="text-[9px] bg-warning/15 text-warning border-warning/30 border">Partial</Badge>
                    ) : (
                      <Badge className="text-[9px] bg-destructive/15 text-destructive border-destructive/30 border">Unpaid</Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {order.type === 'dine-in' ? `Table ${order.table_number}` : order.customer_name || 'Takeaway'} • {order.order_items?.length || 0} items
                    {order.staff_name && <span> • by {order.staff_name}</span>}
                  </p>
                  <OrderProgressBar status={order.status} />
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="font-display font-bold text-sm">₹{Number(order.total).toFixed(0)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(order.created_at!), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </>
  );
}

export default function Dashboard() {
  const { data: orders, isLoading: ordersLoading } = useOrders(undefined);
  const { data: allPayments } = usePayments();
  const { data: dailySales, isLoading: salesLoading } = useDailySales();
  const { data: topItems } = useTopSellingItems(7);
  const { data: weeklyRevenue } = useWeeklyRevenue();
  const { data: inventory } = useInventoryStatus();

  // Enable 5-second polling via refetchInterval on all queries above
  // We'll use a wrapper approach — set it at the query level below

  const activeOrders = orders?.filter(o => !['completed', 'cancelled'].includes(o.status)) || [];
  const recentOrders = orders?.slice(0, 8) || [];
  const todayOrders = orders?.filter(o => {
    const today = new Date();
    const orderDate = new Date(o.created_at!);
    return orderDate.toDateString() === today.toDateString();
  }) || [];

  // Payment data
  const todayPayments = allPayments?.filter(p => {
    const today = new Date();
    return new Date(p.created_at!).toDateString() === today.toDateString();
  }) || [];

  const totalCollectedToday = todayPayments.reduce((s, p) => s + Number(p.amount), 0);
  const cashPayments = todayPayments.filter(p => p.method === 'cash');
  const upiPayments = todayPayments.filter(p => p.method === 'upi');
  const cardPayments = todayPayments.filter(p => p.method === 'card');
  const cashTotal = cashPayments.reduce((s, p) => s + Number(p.amount), 0);
  const upiTotal = upiPayments.reduce((s, p) => s + Number(p.amount), 0);
  const cardTotal = cardPayments.reduce((s, p) => s + Number(p.amount), 0);

  const pendingPaymentOrders = todayOrders.filter(o => o.payment_status === 'pending');
  const partialPaymentOrders = todayOrders.filter(o => o.payment_status === 'partial');
  const pendingAmount = pendingPaymentOrders.reduce((s, o) => s + Number(o.total), 0);

  // Order type breakdown
  const dineInCount = todayOrders.filter(o => o.type === 'dine-in').length;
  const takeawayCount = todayOrders.filter(o => o.type === 'takeaway').length;
  const cancelledToday = todayOrders.filter(o => o.status === 'cancelled').length;

  const orderTypePieData = [
    { name: 'Dine-in', value: dineInCount },
    { name: 'Takeaway', value: takeawayCount },
  ].filter(d => d.value > 0);

  // Payment method pie
  const paymentPieData = [
    { name: 'Cash', value: cashTotal },
    { name: 'UPI', value: upiTotal },
    { name: 'Card', value: cardTotal },
  ].filter(d => d.value > 0);

  const lowStockItems = inventory?.filter(item => item.quantity <= item.min_quantity) || [];

  const statusCounts = {
    placed: orders?.filter(o => o.status === 'placed').length || 0,
    preparing: orders?.filter(o => o.status === 'preparing').length || 0,
    ready: orders?.filter(o => o.status === 'ready').length || 0,
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
          <p className="text-muted-foreground">Live overview • updates every 5s</p>
        </div>

        {/* Revenue & Orders Stats */}
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

        {/* Billing & Payment Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Collected Today"
            value={`₹${totalCollectedToday.toLocaleString()}`}
            subtitle={`${todayPayments.length} payments`}
            icon={Banknote}
          />
          <StatCard
            title="Cash"
            value={`₹${cashTotal.toLocaleString()}`}
            subtitle={`${cashPayments.length} txns`}
            icon={Banknote}
          />
          <StatCard
            title="UPI"
            value={`₹${upiTotal.toLocaleString()}`}
            subtitle={`${upiPayments.length} txns`}
            icon={Smartphone}
          />
          <StatCard
            title="Card"
            value={`₹${cardTotal.toLocaleString()}`}
            subtitle={`${cardPayments.length} txns`}
            icon={CreditCard}
          />
        </div>

        {/* Order type + pending */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard title="Dine-in" value={dineInCount} subtitle="Today" icon={UtensilsCrossed} />
          <StatCard title="Takeaway" value={takeawayCount} subtitle="Today" icon={Package} />
          <StatCard
            title="Pending Payments"
            value={pendingPaymentOrders.length + partialPaymentOrders.length}
            subtitle={`₹${pendingAmount.toLocaleString()} due`}
            icon={CreditCard}
          />
          <StatCard title="Cancelled" value={cancelledToday} subtitle="Today" icon={AlertTriangle} />
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

          {/* Payment Method Pie */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Payment Methods</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {paymentPieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={paymentPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40} paddingAngle={4}>
                        {paymentPieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 mt-2">
                    {paymentPieData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2 text-sm">
                        <div className="h-3 w-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-muted-foreground">{d.name}: <span className="font-semibold text-foreground">₹{d.value.toLocaleString()}</span></span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-12">No payments today</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Live Order Tracking */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="font-display">Live Orders</CardTitle>
                    <span className="flex items-center gap-1 text-[10px] font-medium text-success">
                      <Radio className="h-3 w-3 animate-pulse" /> Auto-updating
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{recentOrders.length} orders</Badge>
                </div>
                {/* Status Filter Tabs */}
                <LiveOrderTabs orders={orders || []} recentOrders={recentOrders} />
              </CardHeader>
            </Card>
          </div>

          {/* Sidebar widgets */}
          <div className="space-y-6">
            {/* Order Type Split */}
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-base">Order Type Split</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                {orderTypePieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={orderTypePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={35} paddingAngle={4}>
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
                  <p className="text-sm text-muted-foreground py-8">No orders today</p>
                )}
              </CardContent>
            </Card>

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
                  <Badge variant="secondary">{statusCounts.ready}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Being Prepared</span>
                  <Badge variant="secondary">{statusCounts.preparing}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">New Orders</span>
                  <Badge variant="secondary">{statusCounts.placed}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
