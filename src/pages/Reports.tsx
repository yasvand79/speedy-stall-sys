import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDailySales, useTopSellingItems, useWeeklyRevenue } from '@/hooks/useReports';
import { useOrders } from '@/hooks/useOrders';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Download, TrendingUp, IndianRupee, ShoppingCart, Clock, Loader2 } from 'lucide-react';
import { useMemo } from 'react';

export default function Reports() {
  const { data: dailySales, isLoading: dailyLoading } = useDailySales();
  const { data: topItems, isLoading: topItemsLoading } = useTopSellingItems(7);
  const { data: weeklyRevenue, isLoading: weeklyLoading } = useWeeklyRevenue();
  const { data: orders, isLoading: ordersLoading } = useOrders();

  const isLoading = dailyLoading || topItemsLoading || weeklyLoading || ordersLoading;

  // Calculate weekly stats
  const weeklyStats = useMemo(() => {
    if (!weeklyRevenue) return { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 };
    
    const totalRevenue = weeklyRevenue.reduce((sum, d) => sum + d.revenue, 0);
    const totalOrders = orders?.filter(o => {
      const orderDate = new Date(o.created_at || '');
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return orderDate >= sevenDaysAgo && o.status === 'completed';
    }).length || 0;
    
    return {
      totalRevenue,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    };
  }, [weeklyRevenue, orders]);

  // Calculate hourly distribution for today
  const hourlyData = useMemo(() => {
    if (!orders) return [];
    
    const today = new Date();
    const todayOrders = orders.filter(o => {
      const orderDate = new Date(o.created_at || '');
      return orderDate.toDateString() === today.toDateString();
    });

    const hours: Record<number, number> = {};
    for (let i = 10; i <= 22; i++) hours[i] = 0;

    todayOrders.forEach(order => {
      const hour = new Date(order.created_at || '').getHours();
      if (hours[hour] !== undefined) {
        hours[hour]++;
      }
    });

    return Object.entries(hours).map(([hour, count]) => ({
      hour: `${hour}:00`,
      orders: count,
    }));
  }, [orders]);

  // Find peak hour
  const peakHour = useMemo(() => {
    if (!hourlyData.length) return 'N/A';
    const peak = hourlyData.reduce((max, curr) => curr.orders > max.orders ? curr : max, hourlyData[0]);
    return peak.orders > 0 ? peak.hour : 'N/A';
  }, [hourlyData]);

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Reports & Analytics</h1>
            <p className="text-muted-foreground">Insights into your business performance</p>
          </div>
          <Button variant="outline" onClick={() => window.print()}>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <IndianRupee className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Weekly Revenue</p>
                  <p className="font-display text-xl font-bold">₹{weeklyStats.totalRevenue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Weekly Orders</p>
                  <p className="font-display text-xl font-bold">{weeklyStats.totalOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Order Value</p>
                  <p className="font-display text-xl font-bold">₹{Math.round(weeklyStats.avgOrderValue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Peak Hour</p>
                  <p className="font-display text-xl font-bold">{peakHour}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="hourly">Hourly Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Weekly Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  {weeklyRevenue && weeklyRevenue.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weeklyRevenue}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(24, 95%, 53%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                        <YAxis className="text-xs fill-muted-foreground" tickFormatter={(value) => `₹${value / 1000}k`} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="hsl(24, 95%, 53%)"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorRevenue)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No revenue data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Weekly Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  {weeklyRevenue && weeklyRevenue.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                        <YAxis className="text-xs fill-muted-foreground" tickFormatter={(value) => `₹${value / 1000}k`} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                        />
                        <Bar dataKey="revenue" fill="hsl(24, 95%, 53%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No order data available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hourly">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Orders by Hour (Today)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  {hourlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="hour" className="text-xs fill-muted-foreground" />
                        <YAxis className="text-xs fill-muted-foreground" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [value, 'Orders']}
                        />
                        <Bar dataKey="orders" fill="hsl(142, 72%, 42%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      No orders today
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Top Selling Items */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Top Selling Items This Week</CardTitle>
          </CardHeader>
          <CardContent>
            {!topItems || topItems.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No sales data available</p>
            ) : (
              <div className="space-y-4">
                {topItems.slice(0, 5).map((item, index) => (
                  <div key={item.id} className="flex items-center gap-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-display font-bold text-primary">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(item.quantity / topItems[0].quantity) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="font-display font-semibold">{item.quantity} sold</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
