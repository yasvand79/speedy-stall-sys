import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  useDailySales, useTopSellingItems, useWeeklyRevenue,
  useOrdersAnalytics, usePaymentAnalytics, useCategorySales,
  useStaffSales, useDateRange,
} from '@/hooks/useReports';
import { useBranches } from '@/hooks/useBranches';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, ComposedChart,
} from 'recharts';
import {
  Download, TrendingUp, TrendingDown, IndianRupee, ShoppingCart, Clock, Loader2,
  CreditCard, Users, XCircle, Utensils, Package,
  Banknote, Smartphone, Receipt, UserPlus, Repeat, Star, Award, Activity,
  ArrowUpRight, ArrowDownRight, BarChart3, PieChart as PieChartIcon, Filter,
  GitBranch, CalendarDays, Hash, ArrowRight, CheckCircle, ChefHat, Bell, Ban,
  Lightbulb, Zap, Target, RefreshCw, TrendingDown as TrendDown,
  Megaphone, UtensilsCrossed, UserCheck, CalendarIcon, X, Building2,
} from 'lucide-react';
import { useMemo, useState, useCallback } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useShopSettings } from '@/hooks/useShopSettings';

const COLORS = ['hsl(24,95%,53%)', 'hsl(142,72%,42%)', 'hsl(217,91%,60%)', 'hsl(280,65%,60%)', 'hsl(45,93%,47%)', 'hsl(340,75%,55%)'];
const HEATMAP_COLORS = ['hsl(var(--muted))', 'hsl(24,95%,90%)', 'hsl(24,95%,75%)', 'hsl(24,95%,60%)', 'hsl(24,95%,45%)'];

type DateRange = 'today' | '7d' | '30d' | '6m' | 'all' | 'custom';

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
        avgSpendPerCustomer: 0, topCustomers: [] as { name: string; phone: string; orders: number; revenue: number }[],
        repeatRate: 0,
      };

      const customerMap: Record<string, { name: string; phone: string; orders: number; revenue: number }> = {};
      orders.forEach(o => {
        const key = o.customer_phone || o.customer_name || 'Walk-in';
        if (!customerMap[key]) customerMap[key] = { name: o.customer_name || 'Walk-in', phone: o.customer_phone || '', orders: 0, revenue: 0 };
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

// ─── Mini KPI Card ───
function KpiCard({ title, value, subtitle, icon: Icon, trend, color = 'primary' }: {
  title: string; value: string; subtitle?: string;
  icon: React.ElementType; trend?: { value: number; isPositive: boolean }; color?: string;
}) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    info: 'bg-info/10 text-info',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  };
  return (
    <Card className="overflow-hidden relative group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="font-display text-xl font-bold text-foreground leading-none">{value}</p>
            {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
            {trend && (
              <div className={`flex items-center gap-0.5 text-[11px] font-semibold ${trend.isPositive ? 'text-success' : 'text-destructive'}`}>
                {trend.isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(trend.value).toFixed(1)}%
              </div>
            )}
          </div>
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${colorMap[color] || colorMap.primary}`}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>
      </CardContent>
      <div className={`absolute bottom-0 left-0 right-0 h-[2px] ${color === 'success' ? 'bg-success' : color === 'info' ? 'bg-info' : color === 'warning' ? 'bg-warning' : color === 'destructive' ? 'bg-destructive' : 'bg-primary'} opacity-60`} />
    </Card>
  );
}

// ─── Section Header ───
function SectionTitle({ icon: Icon, title, badge }: { icon: React.ElementType; title: string; badge?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
      {badge && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{badge}</Badge>}
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
};
// ─── AI Insights Section ───
const SECTION_CONFIG: Record<string, { icon: React.ElementType; color: string; bgClass: string }> = {
  sales: { icon: IndianRupee, color: 'primary', bgClass: 'bg-primary/10 text-primary' },
  customers: { icon: Users, color: 'info', bgClass: 'bg-info/10 text-info' },
  staff: { icon: Award, color: 'warning', bgClass: 'bg-warning/10 text-warning' },
  growth: { icon: TrendingUp, color: 'success', bgClass: 'bg-success/10 text-success' },
};

const STATUS_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  excellent: { label: 'Excellent', color: 'text-success', emoji: '🟢' },
  good: { label: 'Good', color: 'text-info', emoji: '🔵' },
  average: { label: 'Average', color: 'text-warning', emoji: '🟡' },
  needs_work: { label: 'Needs Work', color: 'text-destructive', emoji: '🔴' },
};

function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? 'hsl(142,72%,42%)' : score >= 50 ? 'hsl(45,93%,47%)' : 'hsl(0,84%,60%)';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={3} stroke="hsl(var(--muted))" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={3} stroke={color} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-xs font-bold">{score}</span>
    </div>
  );
}

interface InsightsSectionProps {
  metrics: ReturnType<typeof Object> | null;
  peakHour: string; busiestDay: string; repeatRate: number;
  totalCustomers: number; staffCount: number; topCategory: string;
  topItem: string; activeTables: number;
}

function InsightsSection({ metrics, peakHour, busiestDay, repeatRate, totalCustomers, staffCount, topCategory, topItem, activeTables }: InsightsSectionProps) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generateInsights = useCallback(async () => {
    if (!metrics) return;
    setLoading(true);
    try {
      const m = metrics as any;
      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: {
          metrics: {
            totalRevenue: Math.round(m.totalRevenue || 0),
            completedOrders: m.completedOrders || 0,
            avgOrderValue: Math.round(m.avgOrderValue || 0),
            cancelRate: (m.cancelRate || 0).toFixed(1),
            dineInOrders: m.dineInOrders || 0,
            dineInRevenue: Math.round(m.dineInRevenue || 0),
            takeawayOrders: m.takeawayOrders || 0,
            takeawayRevenue: Math.round(m.takeawayRevenue || 0),
            totalGST: Math.round(m.totalGST || 0),
            totalDiscount: Math.round(m.totalDiscount || 0),
            peakHour, busiestDay, topCategory, topItem,
            repeatRate: repeatRate.toFixed(1),
            totalCustomers, staffCount, activeTables,
          },
        },
      });
      if (error) {
        console.error('Insights error:', error);
        return;
      }
      if (data?.analysis) {
        setAnalysis(data.analysis);
        setGenerated(true);
      }
    } catch (e) {
      console.error('Insights error:', e);
    } finally {
      setLoading(false);
    }
  }, [metrics, peakHour, busiestDay, repeatRate, totalCustomers, staffCount, topCategory, topItem, activeTables]);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.02] to-transparent">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-sm flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-warning" /> AI Business Report
          </CardTitle>
          <Button
            size="sm"
            variant={generated ? 'outline' : 'default'}
            className="h-7 text-[11px]"
            onClick={generateInsights}
            disabled={loading || !metrics}
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
            {loading ? 'Analyzing...' : generated ? 'Refresh Report' : 'Generate Report'}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">Complete analysis of your business — Sales, Customers, Staff & Growth Tips</p>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {!generated ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-14 w-14 rounded-full bg-warning/10 flex items-center justify-center mb-3">
              <Lightbulb className="h-7 w-7 text-warning" />
            </div>
            <p className="text-sm font-medium text-foreground">Get Your Business Health Report</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Our AI will analyze your sales, customers, staff performance and give you easy-to-follow tips to grow your business
            </p>
            <div className="flex gap-2 mt-4 flex-wrap justify-center">
              {['📊 Sales Analysis', '👥 Customer Insights', '👨‍🍳 Staff Review', '📈 Growth Tips'].map(tag => (
                <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
              ))}
            </div>
          </div>
        ) : analysis ? (
          <div className="space-y-4">
            {/* Overall Health Score */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/5 via-transparent to-success/5 border border-border/50">
              <ScoreRing score={analysis.healthScore || 0} size={64} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-display text-sm font-bold text-foreground">Overall Business Health</h4>
                  <Badge variant="outline" className="text-[10px]">
                    {analysis.healthScore >= 75 ? '🟢 Healthy' : analysis.healthScore >= 50 ? '🟡 Okay' : '🔴 Needs Attention'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{analysis.summary}</p>
              </div>
            </div>

            {/* Section Cards */}
            <div className="grid gap-3 md:grid-cols-2">
              {(analysis.sections || []).map((section: any) => {
                const config = SECTION_CONFIG[section.id] || SECTION_CONFIG.sales;
                const status = STATUS_LABELS[section.status] || STATUS_LABELS.average;
                const Icon = config.icon;
                return (
                  <div key={section.id} className="p-4 rounded-xl border border-border/50 bg-card hover:shadow-md transition-all space-y-3">
                    {/* Section Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${config.bgClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-foreground">{section.title}</h4>
                          <span className={`text-[10px] font-medium ${status.color}`}>{status.emoji} {status.label}</span>
                        </div>
                      </div>
                      <ScoreRing score={section.score || 0} size={40} />
                    </div>

                    {/* Summary */}
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{section.summary}</p>

                    {/* Key Findings */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold text-foreground uppercase tracking-wider">Key Findings</p>
                      {(section.insights || []).map((insight: any, j: number) => (
                        <div key={j} className="flex items-start gap-2">
                          <span className="mt-0.5 shrink-0">
                            {insight.type === 'positive' ? '✅' : insight.type === 'negative' ? '⚠️' : 'ℹ️'}
                          </span>
                          <span className="text-[11px] text-foreground leading-relaxed">{insight.point}</span>
                        </div>
                      ))}
                    </div>

                    {/* Tips */}
                    {section.tips && section.tips.length > 0 && (
                      <div className="pt-2 border-t border-border/50 space-y-1.5">
                        <p className="text-[10px] font-semibold text-success uppercase tracking-wider flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" /> What To Do
                        </p>
                        {section.tips.map((tip: string, j: number) => (
                          <div key={j} className="flex items-start gap-2 p-1.5 rounded-md bg-success/5">
                            <span className="text-[10px] font-bold text-success shrink-0 mt-px">{j + 1}.</span>
                            <span className="text-[11px] text-foreground leading-relaxed">{tip}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-xs">Could not generate report. Please try again.</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const [range, setRange] = useState<DateRange>('7d');
  const { start, end } = useDateRange(range);

  // Calculate previous period for comparison
  const prevPeriod = useMemo(() => {
    const diff = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    prevEnd.setHours(23, 59, 59, 999);
    const prevStart = new Date(prevEnd.getTime() - diff);
    prevStart.setHours(0, 0, 0, 0);
    return { start: prevStart, end: prevEnd };
  }, [start, end]);

  const { data: dailySales } = useDailySales();
  const { data: topItems } = useTopSellingItems(range === 'today' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : range === '6m' ? 180 : 3650);
  const { data: weeklyRevenue, isLoading: weeklyLoading } = useWeeklyRevenue();
  const { data: orders, isLoading: ordersLoading } = useOrdersAnalytics(start, end);
  const { data: prevOrders } = useOrdersAnalytics(prevPeriod.start, prevPeriod.end);
  const { data: payments } = usePaymentAnalytics(start, end);
  const { data: categorySales } = useCategorySales(start, end);
  const { data: staffSales } = useStaffSales(start, end);
  const { data: customerData } = useCustomerAnalytics(start, end);
  const { settings: shopSettings } = useShopSettings();

  const isLoading = weeklyLoading || ordersLoading;

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
      totalOrders: orders.length, completedOrders: completed.length,
      cancelledOrders: cancelled.length,
      cancelRate: orders.length > 0 ? (cancelled.length / orders.length) * 100 : 0,
      avgOrderValue,
      dineInOrders: dineIn.length, dineInRevenue: dineIn.reduce((s, o) => s + Number(o.total), 0),
      takeawayOrders: takeaway.length, takeawayRevenue: takeaway.reduce((s, o) => s + Number(o.total), 0),
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
    return { data, maxOrders: Math.max(...data.map(d => d.orders), 1) };
  }, [orders]);

  const peakHour = useMemo(() => {
    const { data } = hourlyHeatmap;
    if (!data.length) return 'N/A';
    const peak = data.reduce((max, curr) => curr.orders > max.orders ? curr : max, data[0]);
    return peak.orders > 0 ? peak.label : 'N/A';
  }, [hourlyHeatmap]);

  const gstBreakdown = useMemo(() => {
    if (!orders) return null;
    const completed = orders.filter(o => o.status === 'completed');
    const gstRate = shopSettings?.gst_rate || 5;
    const totalGST = completed.reduce((s, o) => s + Number(o.gst), 0);
    const taxableAmount = completed.reduce((s, o) => s + Number(o.subtotal), 0);
    return {
      gstRate, totalGST, cgst: totalGST / 2, sgst: totalGST / 2,
      taxableAmount, totalWithTax: taxableAmount + totalGST,
      effectiveRate: taxableAmount > 0 ? (totalGST / taxableAmount) * 100 : 0,
      dineInGST: completed.filter(o => o.type === 'dine-in').reduce((s, o) => s + Number(o.gst), 0),
      takeawayGST: completed.filter(o => o.type === 'takeaway').reduce((s, o) => s + Number(o.gst), 0),
    };
  }, [orders, shopSettings]);

  const orderTypeData = metrics ? [
    { name: 'Dine-in', value: metrics.dineInOrders, revenue: metrics.dineInRevenue },
    { name: 'Takeaway', value: metrics.takeawayOrders, revenue: metrics.takeawayRevenue },
  ] : [];

  // Daily trend for sparkline
  const dailyTrend = useMemo(() => {
    if (!orders) return [];
    const dayMap: Record<string, { date: string; orders: number; revenue: number }> = {};
    orders.filter(o => o.status === 'completed').forEach(o => {
      const d = new Date(o.created_at || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!dayMap[d]) dayMap[d] = { date: d, orders: 0, revenue: 0 };
      dayMap[d].orders++;
      dayMap[d].revenue += Number(o.total);
    });
    return Object.values(dayMap).slice(-14);
  }, [orders]);

  // ─── Order Status Funnel ───
  const orderFunnel = useMemo(() => {
    if (!orders) return [];
    const statusCounts: Record<string, number> = { placed: 0, preparing: 0, ready: 0, completed: 0, cancelled: 0 };
    orders.forEach(o => { if (statusCounts[o.status] !== undefined) statusCounts[o.status]++; });
    const total = orders.length || 1;
    return [
      { stage: 'Placed', count: statusCounts.placed, pct: (statusCounts.placed / total) * 100, color: 'hsl(217,91%,60%)', icon: Bell },
      { stage: 'Preparing', count: statusCounts.preparing, pct: (statusCounts.preparing / total) * 100, color: 'hsl(45,93%,47%)', icon: ChefHat },
      { stage: 'Ready', count: statusCounts.ready, pct: (statusCounts.ready / total) * 100, color: 'hsl(142,72%,42%)', icon: CheckCircle },
      { stage: 'Completed', count: statusCounts.completed, pct: (statusCounts.completed / total) * 100, color: 'hsl(24,95%,53%)', icon: CheckCircle },
      { stage: 'Cancelled', count: statusCounts.cancelled, pct: (statusCounts.cancelled / total) * 100, color: 'hsl(0,84%,60%)', icon: Ban },
    ];
  }, [orders]);

  // ─── Period Comparison ───
  const periodComparison = useMemo(() => {
    if (!orders || !prevOrders) return null;
    const curr = orders.filter(o => o.status === 'completed');
    const prev = prevOrders.filter(o => o.status === 'completed');
    const currRevenue = curr.reduce((s, o) => s + Number(o.total), 0);
    const prevRevenue = prev.reduce((s, o) => s + Number(o.total), 0);
    const currOrders = curr.length;
    const prevOrdersCount = prev.length;
    const currAvg = currOrders > 0 ? currRevenue / currOrders : 0;
    const prevAvg = prevOrdersCount > 0 ? prevRevenue / prevOrdersCount : 0;

    const pctChange = (curr: number, prev: number) => prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;

    return {
      current: { revenue: currRevenue, orders: currOrders, avg: currAvg },
      previous: { revenue: prevRevenue, orders: prevOrdersCount, avg: prevAvg },
      changes: {
        revenue: pctChange(currRevenue, prevRevenue),
        orders: pctChange(currOrders, prevOrdersCount),
        avg: pctChange(currAvg, prevAvg),
      },
    };
  }, [orders, prevOrders]);

  // ─── Busiest Days of Week ───
  const weekdayAnalytics = useMemo(() => {
    if (!orders) return [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayData: Record<number, { orders: number; revenue: number }> = {};
    for (let i = 0; i < 7; i++) dayData[i] = { orders: 0, revenue: 0 };
    orders.filter(o => o.status === 'completed').forEach(o => {
      const day = new Date(o.created_at || '').getDay();
      dayData[day].orders++;
      dayData[day].revenue += Number(o.total);
    });
    const result = Object.entries(dayData).map(([day, d]) => ({
      day: days[Number(day)],
      dayNum: Number(day),
      ...d,
      avgOrder: d.orders > 0 ? d.revenue / d.orders : 0,
    }));
    return result;
  }, [orders]);

  const busiestDay = useMemo(() => {
    if (!weekdayAnalytics.length) return 'N/A';
    return weekdayAnalytics.reduce((max, d) => d.orders > max.orders ? d : max, weekdayAnalytics[0]).day;
  }, [weekdayAnalytics]);

  // ─── Table-wise Analytics ───
  const tableAnalytics = useMemo(() => {
    if (!orders) return [];
    const completed = orders.filter(o => o.status === 'completed' && o.type === 'dine-in' && o.table_number);
    const tableMap: Record<number, { orders: number; revenue: number }> = {};
    completed.forEach(o => {
      const t = o.table_number!;
      if (!tableMap[t]) tableMap[t] = { orders: 0, revenue: 0 };
      tableMap[t].orders++;
      tableMap[t].revenue += Number(o.total);
    });
    return Object.entries(tableMap)
      .map(([table, d]) => ({ table: Number(table), ...d, avg: d.orders > 0 ? d.revenue / d.orders : 0 }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [orders]);

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
      <div className="space-y-4">
        {/* ═══════ HEADER BAR ═══════ */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground leading-tight">Business Intelligence</h1>
              <p className="text-xs text-muted-foreground">Real-time analytics dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-lg border bg-card p-0.5 shadow-sm">
              {(['today', '7d', '30d', '6m', 'all'] as const).map(r => (
                <Button
                  key={r}
                  variant={range === r ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setRange(r)}
                  className={`text-[11px] h-7 px-2.5 ${range === r ? '' : 'text-muted-foreground'}`}
                >
                  {r === 'today' ? 'Today' : r === '7d' ? '7D' : r === '30d' ? '30D' : r === '6m' ? '6M' : 'All'}
                </Button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => window.print()}>
              <Download className="mr-1 h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </div>

        {/* ═══════ ROW 1: KPI CARDS ═══════ */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <KpiCard title="Revenue" value={`₹${(metrics?.totalRevenue || 0).toLocaleString()}`} icon={IndianRupee} color="primary" subtitle={`${metrics?.completedOrders || 0} completed`} />
          <KpiCard title="Orders" value={`${metrics?.totalOrders || 0}`} icon={ShoppingCart} color="success" subtitle={`${metrics?.cancelledOrders || 0} cancelled`} />
          <KpiCard title="Avg Order" value={`₹${Math.round(metrics?.avgOrderValue || 0)}`} icon={TrendingUp} color="info" />
          <KpiCard title="GST Collected" value={`₹${(metrics?.totalGST || 0).toLocaleString()}`} icon={Receipt} color="warning" subtitle={`${gstBreakdown?.gstRate || 0}% rate`} />
          <KpiCard title="Customers" value={`${customerData?.totalCustomers || 0}`} icon={Users} color="primary" subtitle={`${(customerData?.repeatRate || 0).toFixed(0)}% repeat`} />
          <KpiCard title="Peak Hour" value={peakHour} icon={Clock} color="info" />
        </div>

        {/* ═══════ ROW 2: REVENUE TREND + ORDER TYPE + PAYMENT PIE ═══════ */}
        <div className="grid gap-3 lg:grid-cols-12">
          {/* Revenue Trend - Large */}
          <Card className="lg:col-span-7">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="font-display text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Revenue & Orders Trend
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">{range === 'today' ? 'Hourly' : 'Daily'}</Badge>
              </div>
            </CardHeader>
            <CardContent className="px-2 pb-3">
              <div className="h-[220px]">
                {dailyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dailyTrend}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(24,95%,53%)" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="hsl(24,95%,53%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
                      <XAxis dataKey="date" className="text-[10px] fill-muted-foreground" tickLine={false} axisLine={false} />
                      <YAxis yAxisId="left" className="text-[10px] fill-muted-foreground" tickLine={false} axisLine={false} tickFormatter={v => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                      <YAxis yAxisId="right" orientation="right" className="text-[10px] fill-muted-foreground" tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [name === 'revenue' ? `₹${value.toLocaleString()}` : value, name === 'revenue' ? 'Revenue' : 'Orders']} />
                      <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="hsl(24,95%,53%)" strokeWidth={2} fill="url(#revGrad)" />
                      <Line yAxisId="right" type="monotone" dataKey="orders" stroke="hsl(142,72%,42%)" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data for this period</div>}
              </div>
            </CardContent>
          </Card>

          {/* Right Column: Order Type + Payment */}
          <div className="lg:col-span-5 grid gap-3 grid-rows-2">
            {/* Order Type Donut */}
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="font-display text-sm flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-info" /> Order Type Split
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="flex items-center gap-4">
                  <div className="h-[100px] w-[100px] shrink-0">
                    {orderTypeData.some(d => d.value > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={orderTypeData} dataKey="value" innerRadius={28} outerRadius={45} paddingAngle={4} strokeWidth={0}>
                            <Cell fill="hsl(217,91%,60%)" />
                            <Cell fill="hsl(24,95%,53%)" />
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <div className="flex items-center justify-center h-full text-muted-foreground text-xs">No data</div>}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-info" />
                        <span className="text-xs">Dine-in</span>
                      </div>
                      <div className="text-right">
                        <span className="font-display text-sm font-bold">{metrics?.dineInOrders || 0}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">₹{(metrics?.dineInRevenue || 0).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                        <span className="text-xs">Takeaway</span>
                      </div>
                      <div className="text-right">
                        <span className="font-display text-sm font-bold">{metrics?.takeawayOrders || 0}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">₹{(metrics?.takeawayRevenue || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="font-display text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-success" /> Payments
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="flex items-center gap-4">
                  <div className="h-[100px] w-[100px] shrink-0">
                    {paymentBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={paymentBreakdown} dataKey="total" nameKey="method" innerRadius={28} outerRadius={45} paddingAngle={4} strokeWidth={0}>
                            {paymentBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => `₹${value.toLocaleString()}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : <div className="flex items-center justify-center h-full text-muted-foreground text-xs">No data</div>}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {paymentBreakdown.map((p, i) => (
                      <div key={p.method} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-xs capitalize">{p.method}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-display text-xs font-bold">₹{p.total.toLocaleString()}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">({p.count})</span>
                        </div>
                      </div>
                    ))}
                    {paymentBreakdown.length === 0 && <p className="text-xs text-muted-foreground">No payments</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ═══════ ROW 3: HOURLY HEATMAP + CATEGORY SALES + GST ═══════ */}
        <div className="grid gap-3 lg:grid-cols-12">
          {/* Hourly Heatmap */}
          <Card className="lg:col-span-5">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="font-display text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" /> Hourly Sales Heatmap
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="grid grid-cols-6 gap-1.5 mb-3">
                {hourlyHeatmap.data.filter(h => h.hour >= 6 && h.hour <= 23).map(h => {
                  const intensity = hourlyHeatmap.maxOrders > 0 ? h.orders / hourlyHeatmap.maxOrders : 0;
                  const colorIndex = Math.min(Math.floor(intensity * (HEATMAP_COLORS.length - 1)), HEATMAP_COLORS.length - 1);
                  return (
                    <div
                      key={h.hour}
                      className="flex flex-col items-center gap-0.5 p-1.5 rounded-md border border-border/50 transition-all hover:scale-105 cursor-default"
                      style={{ backgroundColor: HEATMAP_COLORS[colorIndex] }}
                      title={`${h.label}: ${h.orders} orders, ₹${h.revenue.toLocaleString()}`}
                    >
                      <span className="text-[9px] font-medium text-foreground">{h.label}</span>
                      <span className="text-xs font-bold font-display text-foreground">{h.orders}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-1 justify-center">
                <span className="text-[9px] text-muted-foreground">Low</span>
                {HEATMAP_COLORS.map((color, i) => <div key={i} className="h-2.5 w-5 rounded-sm" style={{ backgroundColor: color }} />)}
                <span className="text-[9px] text-muted-foreground">High</span>
              </div>
            </CardContent>
          </Card>

          {/* Category Sales */}
          <Card className="lg:col-span-4">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="font-display text-sm flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-primary" /> Category Sales
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="h-[160px]">
                {categorySales && categorySales.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categorySales} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
                      <XAxis type="number" className="text-[10px] fill-muted-foreground" tickLine={false} axisLine={false} tickFormatter={v => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                      <YAxis type="category" dataKey="category" className="text-[10px] fill-muted-foreground capitalize" width={70} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => `₹${value.toLocaleString()}`} />
                      <Bar dataKey="revenue" radius={[0, 4, 4, 0]} name="Revenue">
                        {categorySales.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-full text-muted-foreground text-xs">No data</div>}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {categorySales?.map((cat, i) => (
                  <Badge key={cat.category} variant="outline" className="text-[10px] gap-1 capitalize">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    {cat.category}: {cat.count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* GST Summary */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="font-display text-sm flex items-center gap-2">
                <Receipt className="h-4 w-4 text-success" /> GST Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-muted-foreground">Taxable Amount</span>
                  <span className="font-display text-xs font-bold">₹{(gstBreakdown?.taxableAmount || 0).toLocaleString()}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-muted-foreground">CGST ({(gstBreakdown?.gstRate || 0) / 2}%)</span>
                  <span className="font-display text-xs font-semibold text-success">₹{(gstBreakdown?.cgst || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-muted-foreground">SGST ({(gstBreakdown?.gstRate || 0) / 2}%)</span>
                  <span className="font-display text-xs font-semibold text-success">₹{(gstBreakdown?.sgst || 0).toLocaleString()}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-medium">Total GST</span>
                  <span className="font-display text-sm font-bold text-success">₹{(gstBreakdown?.totalGST || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-medium">Effective Rate</span>
                  <Badge variant="secondary" className="text-[10px]">{(gstBreakdown?.effectiveRate || 0).toFixed(2)}%</Badge>
                </div>
                <div className="h-px bg-border" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-md bg-info/5 border border-info/20 text-center">
                    <p className="text-[9px] text-muted-foreground">Dine-in</p>
                    <p className="font-display text-xs font-bold text-info">₹{(gstBreakdown?.dineInGST || 0).toLocaleString()}</p>
                  </div>
                  <div className="p-2 rounded-md bg-primary/5 border border-primary/20 text-center">
                    <p className="text-[9px] text-muted-foreground">Takeaway</p>
                    <p className="font-display text-xs font-bold text-primary">₹{(gstBreakdown?.takeawayGST || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ═══════ ROW 4: TOP ITEMS + STAFF + CUSTOMERS ═══════ */}
        <div className="grid gap-3 lg:grid-cols-12">
          {/* Top Selling Items */}
          <Card className="lg:col-span-4">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="font-display text-sm flex items-center gap-2">
                <Star className="h-4 w-4 text-warning" /> Top Selling Items
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <ScrollArea className="h-[260px]">
                {topItems && topItems.length > 0 ? (
                  <div className="space-y-2.5 pr-2">
                    {topItems.slice(0, 10).map((item, index) => (
                      <div key={item.id} className="flex items-center gap-2.5">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full font-display font-bold text-[10px] shrink-0 ${
                          index < 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs truncate">{item.name}</p>
                          <div className="mt-1 h-1 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(item.quantity / topItems[0].quantity) * 100}%` }} />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-display font-bold text-xs">{item.quantity}</span>
                          <p className="text-[9px] text-muted-foreground">₹{item.revenue.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <div className="flex items-center justify-center h-full text-muted-foreground text-xs">No data</div>}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Staff Performance */}
          <Card className="lg:col-span-4">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="font-display text-sm flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" /> Staff Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="h-[260px]">
                {staffSales && staffSales.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={staffSales.slice(0, 6)} layout="vertical" margin={{ left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
                      <XAxis type="number" className="text-[10px] fill-muted-foreground" tickLine={false} axisLine={false} tickFormatter={v => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                      <YAxis type="category" dataKey="name" className="text-[10px] fill-muted-foreground" width={65} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [name === 'revenue' ? `₹${value.toLocaleString()}` : value, name === 'revenue' ? 'Revenue' : 'Orders']} />
                      <Bar dataKey="revenue" fill="hsl(24,95%,53%)" radius={[0, 4, 4, 0]} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-full text-muted-foreground text-xs">No staff data</div>}
              </div>
            </CardContent>
          </Card>

          {/* Top Customers */}
          <Card className="lg:col-span-4">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="font-display text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-info" /> Top Customers
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <ScrollArea className="h-[260px]">
                {customerData?.topCustomers && customerData.topCustomers.length > 0 ? (
                  <div className="space-y-2 pr-2">
                    {customerData.topCustomers.map((c, i) => (
                      <div key={i} className="flex items-center gap-2.5 p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full font-display font-bold text-[10px] shrink-0 ${
                          i < 3 ? 'bg-info text-info-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs truncate">{c.name}</p>
                          <p className="text-[9px] text-muted-foreground">{c.phone || 'No phone'} · {c.orders} orders</p>
                        </div>
                        <span className="font-display text-xs font-bold shrink-0">₹{c.revenue.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : <div className="flex items-center justify-center h-full text-muted-foreground text-xs">No customer data</div>}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* ═══════ ROW 5: ORDER FUNNEL + PERIOD COMPARISON ═══════ */}
        <div className="grid gap-3 lg:grid-cols-12">
          {/* Order Status Funnel */}
          <Card className="lg:col-span-5">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="font-display text-sm flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-info" /> Order Status Funnel
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="space-y-2">
                {orderFunnel.map((step, i) => {
                  const Icon = step.icon;
                  const maxCount = Math.max(...orderFunnel.map(s => s.count), 1);
                  const barWidth = (step.count / maxCount) * 100;
                  return (
                    <div key={step.stage} className="flex items-center gap-3">
                      <div className="w-20 flex items-center gap-1.5 shrink-0">
                        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: step.color }} />
                        <span className="text-[11px] font-medium text-foreground">{step.stage}</span>
                      </div>
                      <div className="flex-1 h-6 bg-muted/50 rounded-md overflow-hidden relative">
                        <div
                          className="h-full rounded-md transition-all duration-500 flex items-center justify-end pr-2"
                          style={{ width: `${Math.max(barWidth, 2)}%`, backgroundColor: step.color }}
                        >
                          {step.count > 0 && <span className="text-[10px] font-bold text-white">{step.count}</span>}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground w-10 text-right shrink-0">{step.pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
              {/* Conversion rate */}
              {metrics && metrics.totalOrders > 0 && (
                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Completion Rate</span>
                  <Badge variant="secondary" className="text-[10px] font-display font-bold">
                    {((metrics.completedOrders / metrics.totalOrders) * 100).toFixed(1)}%
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Period Comparison */}
          <Card className="lg:col-span-4">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="font-display text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" /> Period Comparison
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">Current vs Previous {range === 'today' ? 'day' : range === '7d' ? 'week' : range === '30d' ? 'month' : range === '6m' ? '6 months' : 'period'}</p>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {periodComparison ? (
                <div className="space-y-3">
                  {[
                    { label: 'Revenue', current: `₹${periodComparison.current.revenue.toLocaleString()}`, previous: `₹${periodComparison.previous.revenue.toLocaleString()}`, change: periodComparison.changes.revenue },
                    { label: 'Orders', current: `${periodComparison.current.orders}`, previous: `${periodComparison.previous.orders}`, change: periodComparison.changes.orders },
                    { label: 'Avg Order', current: `₹${Math.round(periodComparison.current.avg)}`, previous: `₹${Math.round(periodComparison.previous.avg)}`, change: periodComparison.changes.avg },
                  ].map(metric => (
                    <div key={metric.label} className="p-2.5 rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-medium text-foreground">{metric.label}</span>
                        <div className={`flex items-center gap-0.5 text-[11px] font-bold ${metric.change >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {metric.change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {Math.abs(metric.change).toFixed(1)}%
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Current</p>
                          <p className="font-display text-sm font-bold">{metric.current}</p>
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        <div className="flex-1 text-right">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Previous</p>
                          <p className="font-display text-sm font-semibold text-muted-foreground">{metric.previous}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="flex items-center justify-center h-[180px] text-muted-foreground text-xs">Loading comparison...</div>}
            </CardContent>
          </Card>

          {/* Busiest Day */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="font-display text-sm flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-warning" /> Busiest Days
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">Peak: <span className="font-semibold text-foreground">{busiestDay}</span></p>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="space-y-1.5">
                {weekdayAnalytics.map(d => {
                  const max = Math.max(...weekdayAnalytics.map(w => w.orders), 1);
                  const barWidth = (d.orders / max) * 100;
                  const isBusiest = d.day === busiestDay && d.orders > 0;
                  return (
                    <div key={d.day} className="flex items-center gap-2">
                      <span className={`text-[11px] w-7 shrink-0 font-medium ${isBusiest ? 'text-warning font-bold' : 'text-muted-foreground'}`}>{d.day}</span>
                      <div className="flex-1 h-5 bg-muted/50 rounded overflow-hidden relative">
                        <div
                          className="h-full rounded transition-all"
                          style={{
                            width: `${Math.max(barWidth, 2)}%`,
                            backgroundColor: isBusiest ? 'hsl(45,93%,47%)' : 'hsl(var(--primary))',
                            opacity: isBusiest ? 1 : 0.6,
                          }}
                        />
                        {d.orders > 0 && (
                          <span className="absolute inset-y-0 left-2 flex items-center text-[9px] font-bold text-white">{d.orders}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground w-14 text-right shrink-0">₹{d.revenue >= 1000 ? `${(d.revenue / 1000).toFixed(1)}k` : d.revenue}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>



        {/* ═══════ ROW 7: AI BUSINESS INSIGHTS ═══════ */}
        <InsightsSection
          metrics={metrics}
          peakHour={peakHour}
          busiestDay={busiestDay}
          repeatRate={customerData?.repeatRate || 0}
          totalCustomers={customerData?.totalCustomers || 0}
          staffCount={staffSales?.length || 0}
          topCategory={categorySales?.[0]?.category || ''}
          topItem={topItems?.[0]?.name || ''}
          activeTables={tableAnalytics.length}
        />

        {/* ═══════ FINANCIAL SUMMARY STRIP ═══════ */}
        <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
            <Banknote className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Subtotal</p>
              <p className="font-display text-sm font-semibold">₹{(metrics?.totalSubtotal || 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/20">
            <Receipt className="h-4 w-4 text-success shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Total Tax</p>
              <p className="font-display text-sm font-semibold text-success">₹{(metrics?.totalGST || 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
            <XCircle className="h-4 w-4 text-destructive shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Discounts</p>
              <p className="font-display text-sm font-semibold text-destructive">-₹{(metrics?.totalDiscount || 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <IndianRupee className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground">Net Revenue</p>
              <p className="font-display text-sm font-semibold text-primary">₹{(metrics?.totalRevenue || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
