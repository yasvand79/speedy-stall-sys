import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useOrders } from '@/hooks/useOrders';
import { useBranches } from '@/hooks/useBranches';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { format, subDays, startOfDay, endOfDay, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { Users, TrendingUp, DollarSign, ShoppingBag, Building2, Award, Calendar } from 'lucide-react';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function StaffPerformance() {
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7');
  
  const { data: orders = [], isLoading } = useOrders();
  const { branches } = useBranches();
  const { isDeveloper, isCentralAdmin, isAdmin, profile } = useAuth();

  const canViewAllBranches = isDeveloper || isCentralAdmin;

  // Filter orders by date range and branch
  const filteredOrders = useMemo(() => {
    const days = parseInt(dateRange);
    const startDate = startOfDay(subDays(new Date(), days));
    const endDate = endOfDay(new Date());

    return orders.filter(order => {
      const orderDate = parseISO(order.created_at!);
      const inDateRange = isWithinInterval(orderDate, { start: startDate, end: endDate });
      const matchesBranch = branchFilter === 'all' || order.branch_id === branchFilter;
      
      // Non-developers/central admins can only see their branch
      if (!canViewAllBranches && profile?.branch_id) {
        return inDateRange && order.branch_id === profile.branch_id;
      }
      
      return inDateRange && matchesBranch;
    });
  }, [orders, dateRange, branchFilter, canViewAllBranches, profile]);

  // Calculate staff performance stats
  const staffPerformance = useMemo(() => {
    const statsMap = new Map<string, {
      staffName: string;
      branchName: string;
      branchId: string | null;
      totalOrders: number;
      totalItems: number;
      totalSales: number;
      completedOrders: number;
      averageBillValue: number;
      dailyStats: Record<string, { orders: number; sales: number }>;
    }>();

    filteredOrders.forEach(order => {
      const staffName = order.staff_name || 'Unknown';
      const branchName = (order as any).branches?.name || 'Unknown Branch';
      const branchId = order.branch_id;
      const key = `${staffName}-${branchId}`;
      const dateKey = format(parseISO(order.created_at!), 'yyyy-MM-dd');

      if (!statsMap.has(key)) {
        statsMap.set(key, {
          staffName,
          branchName,
          branchId,
          totalOrders: 0,
          totalItems: 0,
          totalSales: 0,
          completedOrders: 0,
          averageBillValue: 0,
          dailyStats: {},
        });
      }

      const stats = statsMap.get(key)!;
      stats.totalOrders += 1;
      stats.totalItems += order.order_items.reduce((sum, item) => sum + item.quantity, 0);
      stats.totalSales += Number(order.total);
      if (order.status === 'completed') {
        stats.completedOrders += 1;
      }

      if (!stats.dailyStats[dateKey]) {
        stats.dailyStats[dateKey] = { orders: 0, sales: 0 };
      }
      stats.dailyStats[dateKey].orders += 1;
      stats.dailyStats[dateKey].sales += Number(order.total);
    });

    // Calculate averages
    statsMap.forEach(stats => {
      stats.averageBillValue = stats.totalOrders > 0 ? stats.totalSales / stats.totalOrders : 0;
    });

    return Array.from(statsMap.values()).sort((a, b) => b.totalSales - a.totalSales);
  }, [filteredOrders]);

  // Daily performance chart data
  const dailyChartData = useMemo(() => {
    const days = parseInt(dateRange);
    const data: { date: string; orders: number; sales: number }[] = [];

    for (let i = days; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateKey = format(date, 'yyyy-MM-dd');
      const displayDate = format(date, 'MMM dd');

      let dayOrders = 0;
      let daySales = 0;

      filteredOrders.forEach(order => {
        if (format(parseISO(order.created_at!), 'yyyy-MM-dd') === dateKey) {
          dayOrders += 1;
          daySales += Number(order.total);
        }
      });

      data.push({ date: displayDate, orders: dayOrders, sales: daySales });
    }

    return data;
  }, [filteredOrders, dateRange]);

  // Staff comparison chart data
  const staffComparisonData = useMemo(() => {
    return staffPerformance.slice(0, 8).map(staff => ({
      name: staff.staffName.split(' ')[0], // First name only for chart
      orders: staff.totalOrders,
      sales: Math.round(staff.totalSales),
      avgBill: Math.round(staff.averageBillValue),
    }));
  }, [staffPerformance]);

  // Branch-wise distribution
  const branchDistribution = useMemo(() => {
    const branchMap = new Map<string, number>();
    
    filteredOrders.forEach(order => {
      const branchName = (order as any).branches?.name || 'Unknown';
      branchMap.set(branchName, (branchMap.get(branchName) || 0) + Number(order.total));
    });

    return Array.from(branchMap.entries()).map(([name, value]) => ({
      name,
      value: Math.round(value),
    }));
  }, [filteredOrders]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const totalSales = filteredOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalOrders = filteredOrders.length;
    const avgBillValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    const uniqueStaff = new Set(filteredOrders.map(o => o.staff_name)).size;

    return { totalSales, totalOrders, avgBillValue, uniqueStaff };
  }, [filteredOrders]);

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Staff Performance</h1>
            <p className="text-muted-foreground">
              Analytics and performance metrics for staff members
            </p>
          </div>
          <div className="flex gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[150px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            {canViewAllBranches && (
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-[180px]">
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches?.filter(b => b.is_active).map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold">₹{summaryStats.totalSales.toLocaleString()}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{summaryStats.totalOrders}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <ShoppingBag className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Bill Value</p>
                  <p className="text-2xl font-bold">₹{summaryStats.avgBillValue.toFixed(0)}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Staff</p>
                  <p className="text-2xl font-bold">{summaryStats.uniqueStaff}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Daily Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Daily Orders & Sales Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis yAxisId="left" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="orders" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Orders"
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    name="Sales (₹)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Staff Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Staff Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={staffComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="orders" fill="#3b82f6" name="Orders" />
                  <Bar dataKey="avgBill" fill="#f59e0b" name="Avg Bill (₹)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Branch Distribution & Staff Table */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Branch Distribution Pie */}
          {canViewAllBranches && branchDistribution.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sales by Branch</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={branchDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {branchDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${value}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Staff Leaderboard */}
          <Card className={canViewAllBranches && branchDistribution.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Staff Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {staffPerformance.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No data available for the selected period</p>
                ) : (
                  staffPerformance.map((staff, index) => (
                    <div 
                      key={`${staff.staffName}-${staff.branchId}`}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-primary'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{staff.staffName}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {staff.branchName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₹{staff.totalSales.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{staff.totalOrders} orders</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <Badge variant="secondary">{staff.totalItems} items</Badge>
                      </div>
                      <div className="text-right hidden md:block">
                        <p className="text-sm text-muted-foreground">Avg: ₹{staff.averageBillValue.toFixed(0)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}