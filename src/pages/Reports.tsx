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
  BarChart, Bar, PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import {
  Download, TrendingUp, IndianRupee, ShoppingCart, Clock, Loader2,
  CreditCard, Users, XCircle,
  Banknote, Smartphone, Receipt, UserCheck, UserPlus, Repeat, Star, Award,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useShopSettings } from '@/hooks/useShopSettings';

const COLORS = ['hsl(24,95%,53%)', 'hsl(142,72%,42%)', 'hsl(217,91%,60%)', 'hsl(280,65%,60%)', 'hsl(45,93%,47%)'];
const HEATMAP_COLORS = ['hsl(var(--muted))', 'hsl(24,95%,90%)', 'hsl(24,95%,75%)', 'hsl(24,95%,60%)', 'hsl(24,95%,45%)'];

type DateRange = 'today' | '7d' | '30d';

function useCustomerAnalytics(start: Date, end: Date) {
  return useQuery({
    queryKey: ['reports', 'customer-analytics', start.toISOString(), end.toISOString()],
    refetchInterval: 5000,
    queryFn: async () => {
      const { data: orders } = await supabase
        .from('orders')
        .select('id, total, customer_name, customer_phone, created_at, status')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .eq('status', 'completed');

      if (!orders || orders.length === 0) return {
        totalCustomers: 0, newCustomers: 0, returningCustomers: 0,
        avgSpendPerCustomer: 0, topCustomers: [] as { name: string; orders: number; revenue: number }[],
        repeatRate: 0,
      };

      // Group by phone or name
      const customerMap: Record<string, { name: string; orders: number; revenue: number }> = {};
      orders.forEach(o => {
        const key = o.customer_phone || o.customer_name || 'Walk-in';
        if (!customerMap[key]) customerMap[key] = { name: o.customer_name || 'Walk-in', orders: 0, revenue: 0 };
        customerMap[key].orders++;
        customerMap[key].revenue += Number(o.total);
      });

      const customers = Object.values(customerMap);
      const returning = customers.filter(c => c.orders > 1);
      const totalRevenue = customers.reduce((s, c) => s + c.revenue, 0);

      return {
        totalCustomers: customers.length,
        newCustomers: customers.filter(c => c.orders === 1).length,
        returningCustomers: returning.length,
        avgSpendPerCustomer: customers.length > 0 ? totalRevenue / customers.length : 0,
        topCustomers: customers.sort((a, b) => b.revenue - a.revenue).slice(0, 10),
        repeatRate: customers.length > 0 ? (returning.length / customers.length) * 100 : 0,
      };
    },
  });
}

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
  const { data: customerData } = useCustomerAnalytics(start, end);
  const { data: shopSettings } = useShopSettings();

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

  // Hourly heatmap data
  const hourlyHeatmap = useMemo(() => {
    if (!orders) return { data: [], maxOrders: 0 };
    const hours: Record<number, { orders: number; revenue: number }> = {};
    for (let i = 0; i <= 23; i++) hours[i] = { orders: 0, revenue: 0 };

    orders.filter(o => o.status === 'completed').forEach(order => {
      const hour = new Date(order.created_at || '').getHours();
      hours[hour].orders++;
      hours[hour].revenue += Number(order.total);
    });

    const data = Object.entries(hours).map(([hour, d]) => ({
      hour: Number(hour),
      label: `${Number(hour) % 12 || 12}${Number(hour) < 12 ? 'am' : 'pm'}`,
      ...d,
    }));

    const maxOrders = Math.max(...data.map(d => d.orders), 1);
    return { data, maxOrders };
  }, [orders]);

  const peakHour = useMemo(() => {
    const { data } = hourlyHeatmap;
    if (!data.length) return 'N/A';
    const peak = data.reduce((max, curr) => curr.orders > max.orders ? curr : max, data[0]);
    return peak.orders > 0 ? peak.label : 'N/A';
  }, [hourlyHeatmap]);

  // GST breakdown
  const gstBreakdown = useMemo(() => {
    if (!orders) return null;
    const completed = orders.filter(o => o.status === 'completed');
    const gstRate = shopSettings?.gst_rate || 5;
    const totalGST = completed.reduce((s, o) => s + Number(o.gst), 0);
    const cgst = totalGST / 2;
    const sgst = totalGST / 2;
    const taxableAmount = completed.reduce((s, o) => s + Number(o.subtotal), 0);
    const totalWithTax = taxableAmount + totalGST;
    const effectiveRate = taxableAmount > 0 ? (totalGST / taxableAmount) * 100 : 0;

    // By order type
    const dineInGST = completed.filter(o => o.type === 'dine-in').reduce((s, o) => s + Number(o.gst), 0);
    const takeawayGST = completed.filter(o => o.type === 'takeaway').reduce((s, o) => s + Number(o.gst), 0);

    return {
      gstRate, totalGST, cgst, sgst, taxableAmount, totalWithTax, effectiveRate,
      dineInGST, takeawayGST,
      invoiceCount: completed.length,
    };
  }, [orders, shopSettings]);

  // Staff radar data
  const staffRadar = useMemo(() => {
    if (!staffSales || staffSales.length === 0) return [];
    const maxOrders = Math.max(...staffSales.map(s => s.orders));
    const maxRevenue = Math.max(...staffSales.map(s => s.revenue));
    const maxAvg = Math.max(...staffSales.map(s => s.avgOrderValue));

    return staffSales.slice(0, 5).map(s => ({
      name: s.name,
      orders: maxOrders > 0 ? (s.orders / maxOrders) * 100 : 0,
      revenue: maxRevenue > 0 ? (s.revenue / maxRevenue) * 100 : 0,
      avgValue: maxAvg > 0 ? (s.avgOrderValue / maxAvg) * 100 : 0,
    }));
  }, [staffSales]);

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
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                  <ShoppingCart className="h-5 w-5 text-success" />
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
                <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-5 w-5 text-info" />
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
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                  <XCircle className="h-5 w-5 text-destructive" />
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
              <p className="font-display font-semibold text-success">₹{(metrics?.totalGST || 0).toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Discounts Given</p>
              <p className="font-display font-semibold text-destructive">-₹{(metrics?.totalDiscount || 0).toLocaleString()}</p>
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
            <TabsTrigger value="hourly">Hourly Heatmap</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="gst">GST & Tax</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
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
                        <Bar dataKey="orders" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} name="Orders" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="flex items-center justify-center h-full text-muted-foreground">No data</div>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hourly Heatmap */}
          <TabsContent value="hourly">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-base">Hourly Sales Heatmap</CardTitle>
                <p className="text-xs text-muted-foreground">Darker = more orders. Peak: {peakHour}</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-12 gap-2 mb-6">
                  {hourlyHeatmap.data.map(h => {
                    const intensity = hourlyHeatmap.maxOrders > 0 ? h.orders / hourlyHeatmap.maxOrders : 0;
                    const colorIndex = Math.min(Math.floor(intensity * (HEATMAP_COLORS.length - 1)), HEATMAP_COLORS.length - 1);
                    return (
                      <div
                        key={h.hour}
                        className="flex flex-col items-center gap-1 p-2 rounded-lg border border-border transition-all hover:scale-105"
                        style={{ backgroundColor: HEATMAP_COLORS[colorIndex] }}
                        title={`${h.label}: ${h.orders} orders, ₹${h.revenue.toLocaleString()}`}
                      >
                        <span className="text-[10px] font-medium text-foreground">{h.label}</span>
                        <span className="text-sm font-bold font-display text-foreground">{h.orders}</span>
                        <span className="text-[9px] text-muted-foreground">₹{h.revenue >= 1000 ? `${(h.revenue / 1000).toFixed(1)}k` : h.revenue}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Heatmap legend */}
                <div className="flex items-center gap-2 justify-center">
                  <span className="text-xs text-muted-foreground">Less</span>
                  {HEATMAP_COLORS.map((color, i) => (
                    <div key={i} className="h-4 w-8 rounded" style={{ backgroundColor: color }} />
                  ))}
                  <span className="text-xs text-muted-foreground">More</span>
                </div>

                {/* Hourly bar chart below */}
                <div className="h-[250px] mt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyHeatmap.data.filter(h => h.hour >= 6 && h.hour <= 23)}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" className="text-xs fill-muted-foreground" />
                      <YAxis className="text-xs fill-muted-foreground" />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                        formatter={(value: number, name: string) => [name === 'revenue' ? `₹${value.toLocaleString()}` : value, name === 'revenue' ? 'Revenue' : 'Orders']}
                      />
                      <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Orders" />
                      <Bar dataKey="revenue" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Revenue" />
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
                          {p.method === 'cash' ? <Banknote className="h-5 w-5 text-success" /> :
                           p.method === 'upi' ? <Smartphone className="h-5 w-5 text-info" /> :
                           <CreditCard className="h-5 w-5 text-primary" />}
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

          {/* GST & Tax Breakdown */}
          <TabsContent value="gst">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-base flex items-center gap-2">
                    <Receipt className="h-4 w-4" /> GST Tax Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">GST Rate</span>
                        <span className="font-display font-semibold">{gstBreakdown?.gstRate || 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Effective Tax Rate</span>
                        <span className="font-display font-semibold">{(gstBreakdown?.effectiveRate || 0).toFixed(2)}%</span>
                      </div>
                      <div className="border-t border-border my-2" />
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Taxable Amount</span>
                        <span className="font-display font-semibold">₹{(gstBreakdown?.taxableAmount || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">CGST ({(gstBreakdown?.gstRate || 0) / 2}%)</span>
                        <span className="font-display font-semibold text-success">₹{(gstBreakdown?.cgst || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">SGST ({(gstBreakdown?.gstRate || 0) / 2}%)</span>
                        <span className="font-display font-semibold text-success">₹{(gstBreakdown?.sgst || 0).toLocaleString()}</span>
                      </div>
                      <div className="border-t border-border my-2" />
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Total GST</span>
                        <span className="font-display font-bold text-success">₹{(gstBreakdown?.totalGST || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Total (incl. tax)</span>
                        <span className="font-display font-bold">₹{(gstBreakdown?.totalWithTax || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-base">GST by Order Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 rounded-lg bg-info/5 border border-info/20 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Dine-in GST</p>
                        <p className="font-display text-xl font-bold text-info">₹{(gstBreakdown?.dineInGST || 0).toLocaleString()}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Takeaway GST</p>
                        <p className="font-display text-xl font-bold text-primary">₹{(gstBreakdown?.takeawayGST || 0).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Invoices Generated</span>
                        <span className="font-display font-semibold">{gstBreakdown?.invoiceCount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Discounts Given</span>
                        <span className="font-display font-semibold text-destructive">-₹{(metrics?.totalDiscount || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Net Revenue (post-discount)</span>
                        <span className="font-display font-bold">₹{((metrics?.totalRevenue || 0)).toLocaleString()}</span>
                      </div>
                    </div>
                    {/* Visual breakdown */}
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Taxable', value: gstBreakdown?.taxableAmount || 0 },
                              { name: 'CGST', value: gstBreakdown?.cgst || 0 },
                              { name: 'SGST', value: gstBreakdown?.sgst || 0 },
                            ].filter(d => d.value > 0)}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={70}
                            innerRadius={45}
                            paddingAngle={3}
                          >
                            <Cell fill="hsl(var(--primary))" />
                            <Cell fill="hsl(var(--success))" />
                            <Cell fill="hsl(var(--info))" />
                          </Pie>
                          <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Customer Analytics */}
          <TabsContent value="customers">
            <div className="space-y-4">
              {/* Customer KPIs */}
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Customers</p>
                        <p className="font-display text-lg font-bold">{customerData?.totalCustomers || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                        <UserPlus className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">New Customers</p>
                        <p className="font-display text-lg font-bold">{customerData?.newCustomers || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                        <Repeat className="h-5 w-5 text-info" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Repeat Rate</p>
                        <p className="font-display text-lg font-bold">{(customerData?.repeatRate || 0).toFixed(1)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                        <IndianRupee className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Avg Spend/Customer</p>
                        <p className="font-display text-lg font-bold">₹{Math.round(customerData?.avgSpendPerCustomer || 0)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Customers */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-base flex items-center gap-2">
                    <Star className="h-4 w-4 text-warning" /> Top Customers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {customerData?.topCustomers && customerData.topCustomers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead className="text-right">Orders</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                            <TableHead className="text-right">Avg Order</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customerData.topCustomers.map((c, i) => (
                            <TableRow key={i}>
                              <TableCell>
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 font-display font-bold text-primary text-xs">
                                  {i + 1}
                                </span>
                              </TableCell>
                              <TableCell className="font-medium">{c.name}</TableCell>
                              <TableCell className="text-right">{c.orders}</TableCell>
                              <TableCell className="text-right font-display">₹{c.revenue.toLocaleString()}</TableCell>
                              <TableCell className="text-right">₹{c.orders > 0 ? Math.round(c.revenue / c.orders) : 0}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-center py-6 text-muted-foreground">No customer data available</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Staff Performance Comparison */}
          <TabsContent value="staff">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Radar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-base flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" /> Staff Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[320px]">
                    {staffRadar.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={[
                          { metric: 'Orders', ...Object.fromEntries(staffRadar.map(s => [s.name, s.orders])) },
                          { metric: 'Revenue', ...Object.fromEntries(staffRadar.map(s => [s.name, s.revenue])) },
                          { metric: 'Avg Value', ...Object.fromEntries(staffRadar.map(s => [s.name, s.avgValue])) },
                        ]}>
                          <PolarGrid className="stroke-border" />
                          <PolarAngleAxis dataKey="metric" className="text-xs fill-muted-foreground" />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                          {staffRadar.map((s, i) => (
                            <Radar key={s.name} name={s.name} dataKey={s.name} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.15} strokeWidth={2} />
                          ))}
                          <Legend />
                          <Tooltip />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : <div className="flex items-center justify-center h-full text-muted-foreground">No staff data</div>}
                  </div>
                </CardContent>
              </Card>

              {/* Staff Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-display text-base">Revenue by Staff</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[320px]">
                    {staffSales && staffSales.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={staffSales.slice(0, 8)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis type="number" className="text-xs fill-muted-foreground" tickFormatter={v => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                          <YAxis type="category" dataKey="name" className="text-xs fill-muted-foreground" width={80} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                            formatter={(value: number) => `₹${value.toLocaleString()}`}
                          />
                          <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Revenue" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div className="flex items-center justify-center h-full text-muted-foreground">No data</div>}
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Table */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader><CardTitle className="font-display text-base flex items-center gap-2"><Users className="h-4 w-4" /> Staff Detailed Performance</CardTitle></CardHeader>
                  <CardContent>
                    {staffSales && staffSales.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>#</TableHead>
                              <TableHead>Staff</TableHead>
                              <TableHead className="text-right">Orders</TableHead>
                              <TableHead className="text-right">Revenue</TableHead>
                              <TableHead className="text-right">Avg Order</TableHead>
                              <TableHead className="text-right">Share</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {staffSales.map((s, i) => {
                              const totalRev = staffSales.reduce((sum, st) => sum + st.revenue, 0);
                              const share = totalRev > 0 ? (s.revenue / totalRev) * 100 : 0;
                              return (
                                <TableRow key={s.id}>
                                  <TableCell>
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 font-display font-bold text-primary text-xs">
                                      {i + 1}
                                    </span>
                                  </TableCell>
                                  <TableCell className="font-medium">{s.name}</TableCell>
                                  <TableCell className="text-right">{s.orders}</TableCell>
                                  <TableCell className="text-right font-display">₹{s.revenue.toLocaleString()}</TableCell>
                                  <TableCell className="text-right">₹{Math.round(s.avgOrderValue)}</TableCell>
                                  <TableCell className="text-right">
                                    <Badge variant="secondary" className="text-xs">{share.toFixed(1)}%</Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : <p className="text-center py-6 text-muted-foreground">No staff sales data</p>}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* ─── Order Type Split ─── */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="font-display text-base">Order Type Split</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-info/5 border border-info/20">
                  <p className="text-sm text-muted-foreground">Dine-in</p>
                  <p className="font-display text-xl font-bold">{metrics?.dineInOrders || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">₹{(metrics?.dineInRevenue || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
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
      </div>
    </MainLayout>
  );
}
