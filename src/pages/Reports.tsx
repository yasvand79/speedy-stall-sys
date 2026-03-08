import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useDailySales, useTopSellingItems, useWeeklyRevenue,
  useOrdersAnalytics, usePaymentAnalytics, useCategorySales,
  useStaffSales, useDateRange,
} from '@/hooks/useReports';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  Download, TrendingUp, IndianRupee, ShoppingCart, Clock, Loader2,
  CreditCard, Users, Package, XCircle, Receipt, Utensils,
  ArrowUpRight, ArrowDownRight, Banknote, Smartphone,
} from 'lucide-react';
import { useMemo, useState } from 'react';

const COLORS = ['hsl(24,95%,53%)', 'hsl(142,72%,42%)', 'hsl(217,91%,60%)', 'hsl(280,65%,60%)', 'hsl(45,93%,47%)'];

type DateRange = 'today' | '7d' | '30d';

export default function Reports() {
  const [range, setRange] = useState<DateRange>('7d');
  const { start, end } = useDateRange(range);

  const { data: dailySales, isLoading: dailyLoading } = useDailySales();
  const { data: topItems } = useTopSellingItems(range === 'today' ? 1 : range === '7d' ? 7 : 30);
  const { data: weeklyRevenue, isLoading: weeklyLoading } = useWeeklyRevenue();
  const { data: orders, isLoading: ordersLoading } = useOrdersAnalytics(start, end);
  const { data: payments } = usePaymentAnalytics(start, end);
  const { data: categorySales } = useCategorySales(start, end);
  const { data: staffSales } = useStaffSales(start, end);
  

  const isLoading = dailyLoading || weeklyLoading || ordersLoading;

  // ─── Computed Metrics ───
  const metrics = useMemo(() => {
    if (!orders) return null;

    const completed = orders.filter(o => o.status === 'completed');
    const cancelled = orders.filter(o => o.status === 'cancelled');
    const dineIn = completed.filter(o => o.type === 'dine-in');
    const takeaway = completed.filter(o => o.type === 'takeaway');

    const totalRevenue = completed.reduce((s, o) => s + Number(o.total), 0);
    const totalSubtotal = completed.reduce((s, o) => s + Number(o.subtotal), 0);
    const totalGST = completed.reduce((s, o) => s + Number(o.gst), 0);
    const totalDiscount = completed.reduce((s, o) => s + Number(o.discount), 0);
    const avgOrderValue = completed.length > 0 ? totalRevenue / completed.length : 0;

    return {
      totalRevenue, totalSubtotal, totalGST, totalDiscount,
      totalOrders: orders.length,
      completedOrders: completed.length,
      cancelledOrders: cancelled.length,
      cancelRate: orders.length > 0 ? (cancelled.length / orders.length) * 100 : 0,
      avgOrderValue,
      dineInOrders: dineIn.length,
      dineInRevenue: dineIn.reduce((s, o) => s + Number(o.total), 0),
      takeawayOrders: takeaway.length,
      takeawayRevenue: takeaway.reduce((s, o) => s + Number(o.total), 0),
    };
  }, [orders]);

  const paymentBreakdown = useMemo(() => {
    if (!payments) return [];
    const methods: Record<string, { count: number; total: number }> = {};
    payments.forEach(p => {
      if (!methods[p.method]) methods[p.method] = { count: 0, total: 0 };
      methods[p.method].count++;
      methods[p.method].total += Number(p.amount);
    });
    return Object.entries(methods).map(([method, data]) => ({ method, ...data }));
  }, [payments]);

  // Hourly distribution
  const hourlyData = useMemo(() => {
    if (!orders) return [];
    const hours: Record<number, { orders: number; revenue: number }> = {};
    for (let i = 6; i <= 23; i++) hours[i] = { orders: 0, revenue: 0 };

    orders.filter(o => o.status === 'completed').forEach(order => {
      const hour = new Date(order.created_at || '').getHours();
      if (hours[hour]) {
        hours[hour].orders++;
        hours[hour].revenue += Number(order.total);
      }
    });

    return Object.entries(hours).map(([hour, data]) => ({
      hour: `${hour}:00`,
      ...data,
    }));
  }, [orders]);

  const peakHour = useMemo(() => {
    if (!hourlyData.length) return 'N/A';
    const peak = hourlyData.reduce((max, curr) => curr.orders > max.orders ? curr : max, hourlyData[0]);
    return peak.orders > 0 ? peak.hour : 'N/A';
  }, [hourlyData]);

  const lowStockItems = inventory?.filter(i => Number(i.quantity) <= Number(i.min_quantity)) || [];

  const orderTypeData = metrics ? [
    { name: 'Dine-in', value: metrics.dineInOrders },
    { name: 'Takeaway', value: metrics.takeawayOrders },
  ] : [];

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Reports & Analytics</h1>
            <p className="text-muted-foreground">Complete business intelligence for your store</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border bg-muted/50 p-1">
              {(['today', '7d', '30d'] as const).map(r => (
                <Button
                  key={r}
                  variant={range === r ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setRange(r)}
                  className="text-xs"
                >
                  {r === 'today' ? 'Today' : r === '7d' ? '7 Days' : '30 Days'}
                </Button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* ─── KPI Summary ─── */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <IndianRupee className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="font-display text-lg font-bold truncate">₹{(metrics?.totalRevenue || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                  <ShoppingCart className="h-5 w-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Total Orders</p>
                  <p className="font-display text-lg font-bold">{metrics?.totalOrders || 0}</p>
                  <p className="text-[10px] text-muted-foreground">{metrics?.completedOrders} completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Avg Order Value</p>
                  <p className="font-display text-lg font-bold">₹{Math.round(metrics?.avgOrderValue || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Cancellations</p>
                  <p className="font-display text-lg font-bold">{metrics?.cancelledOrders || 0}</p>
                  <p className="text-[10px] text-muted-foreground">{(metrics?.cancelRate || 0).toFixed(1)}% rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Financial Summary ─── */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card className="bg-muted/30">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Subtotal</p>
              <p className="font-display font-semibold">₹{(metrics?.totalSubtotal || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">GST Collected</p>
              <p className="font-display font-semibold text-green-600">₹{(metrics?.totalGST || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Discounts Given</p>
              <p className="font-display font-semibold text-red-500">-₹{(metrics?.totalDiscount || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Peak Hour</p>
              <p className="font-display font-semibold flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> {peakHour}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ─── Charts Section ─── */}
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="hourly">Hourly</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          {/* Revenue Chart */}
          <TabsContent value="revenue">
            <Card>
              <CardHeader><CardTitle className="font-display text-base">Revenue Trend (7 Days)</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {weeklyRevenue && weeklyRevenue.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weeklyRevenue}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(24,95%,53%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(24,95%,53%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                        <YAxis className="text-xs fill-muted-foreground" tickFormatter={v => `₹${v / 1000}k`} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                          formatter={(value: number, name: string) => [`₹${value.toLocaleString()}`, name === 'revenue' ? 'Revenue' : 'Orders']} />
                        <Area type="monotone" dataKey="revenue" stroke="hsl(24,95%,53%)" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <div className="flex items-center justify-center h-full text-muted-foreground">No data</div>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Chart */}
          <TabsContent value="orders">
            <Card>
              <CardHeader><CardTitle className="font-display text-base">Daily Orders (7 Days)</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {weeklyRevenue && weeklyRevenue.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                        <YAxis className="text-xs fill-muted-foreground" />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                        <Bar dataKey="orders" fill="hsl(217,91%,60%)" radius={[4, 4, 0, 0]} name="Orders" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="flex items-center justify-center h-full text-muted-foreground">No data</div>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hourly Distribution */}
          <TabsContent value="hourly">
            <Card>
              <CardHeader><CardTitle className="font-display text-base">Hourly Order Distribution</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="hour" className="text-xs fill-muted-foreground" />
                      <YAxis className="text-xs fill-muted-foreground" />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                        formatter={(value: number, name: string) => [name === 'revenue' ? `₹${value.toLocaleString()}` : value, name === 'revenue' ? 'Revenue' : 'Orders']} />
                      <Bar dataKey="orders" fill="hsl(142,72%,42%)" radius={[4, 4, 0, 0]} name="Orders" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Methods */}
          <TabsContent value="payments">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="font-display text-base">Payment Methods</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    {paymentBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={paymentBreakdown} dataKey="total" nameKey="method" cx="50%" cy="50%" outerRadius={80} label={({ method, percent }) => `${method} ${(percent * 100).toFixed(0)}%`}>
                            {paymentBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <div className="flex items-center justify-center h-full text-muted-foreground">No payments</div>}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="font-display text-base">Payment Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {paymentBreakdown.map(p => (
                      <div key={p.method} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          {p.method === 'cash' ? <Banknote className="h-5 w-5 text-green-600" /> :
                           p.method === 'upi' ? <Smartphone className="h-5 w-5 text-blue-600" /> :
                           <CreditCard className="h-5 w-5 text-purple-600" />}
                          <div>
                            <p className="font-medium capitalize">{p.method}</p>
                            <p className="text-xs text-muted-foreground">{p.count} transactions</p>
                          </div>
                        </div>
                        <p className="font-display font-bold">₹{p.total.toLocaleString()}</p>
                      </div>
                    ))}
                    {paymentBreakdown.length === 0 && <p className="text-center text-muted-foreground py-4">No payment data</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Category Sales */}
          <TabsContent value="categories">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="font-display text-base">Sales by Category</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    {categorySales && categorySales.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={categorySales} dataKey="revenue" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}>
                            {categorySales.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <div className="flex items-center justify-center h-full text-muted-foreground">No data</div>}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="font-display text-base">Category Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categorySales?.map((cat, i) => (
                      <div key={cat.category} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <div>
                            <p className="font-medium capitalize">{cat.category}</p>
                            <p className="text-xs text-muted-foreground">{cat.count} items sold</p>
                          </div>
                        </div>
                        <p className="font-display font-bold">₹{cat.revenue.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* ─── Order Type Split ─── */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="font-display text-base">Order Type Split</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                  <p className="text-sm text-muted-foreground">Dine-in</p>
                  <p className="font-display text-xl font-bold">{metrics?.dineInOrders || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">₹{(metrics?.dineInRevenue || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
                  <p className="text-sm text-muted-foreground">Takeaway</p>
                  <p className="font-display text-xl font-bold">{metrics?.takeawayOrders || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">₹{(metrics?.takeawayRevenue || 0).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Selling Items */}
          <Card>
            <CardHeader><CardTitle className="font-display text-base">Top Selling Items</CardTitle></CardHeader>
            <CardContent>
              {!topItems || topItems.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground">No data</p>
              ) : (
                <div className="space-y-3">
                  {topItems.slice(0, 5).map((item, index) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 font-display font-bold text-primary text-sm shrink-0">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <div className="mt-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${(item.quantity / topItems[0].quantity) * 100}%` }} />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-display font-semibold text-sm">{item.quantity}</span>
                        <p className="text-[10px] text-muted-foreground">₹{item.revenue.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── Staff Performance ─── */}
        <Card>
          <CardHeader><CardTitle className="font-display text-base flex items-center gap-2"><Users className="h-4 w-4" /> Staff Sales Performance</CardTitle></CardHeader>
          <CardContent>
            {staffSales && staffSales.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Avg Order</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffSales.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-right">{s.orders}</TableCell>
                        <TableCell className="text-right font-display">₹{s.revenue.toLocaleString()}</TableCell>
                        <TableCell className="text-right">₹{Math.round(s.avgOrderValue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : <p className="text-center py-6 text-muted-foreground">No staff sales data</p>}
          </CardContent>
        </Card>

        {/* ─── Inventory Status ─── */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Package className="h-4 w-4" /> Inventory Status
              {lowStockItems.length > 0 && (
                <Badge variant="destructive" className="text-xs">{lowStockItems.length} low stock</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {inventory && inventory.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Min Qty</TableHead>
                      <TableHead className="text-right">Cost/Unit</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.map(item => {
                      const isLow = Number(item.quantity) <= Number(item.min_quantity);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                          <TableCell className="text-right">{item.min_quantity}</TableCell>
                          <TableCell className="text-right">₹{Number(item.cost_per_unit).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={isLow ? 'destructive' : 'secondary'} className="text-xs">
                              {isLow ? 'Low Stock' : 'OK'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : <p className="text-center py-6 text-muted-foreground">No inventory data</p>}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
