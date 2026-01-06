import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { RecentOrders } from '@/components/dashboard/RecentOrders';
import { TopSellingItems } from '@/components/dashboard/TopSellingItems';
import { LowStockAlert } from '@/components/dashboard/LowStockAlert';
import { mockOrders, mockDailySummary, mockInventory } from '@/data/mockData';
import { IndianRupee, ShoppingCart, TrendingUp, Clock } from 'lucide-react';

export default function Dashboard() {
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
            value={`₹${mockDailySummary.totalRevenue.toLocaleString()}`}
            icon={IndianRupee}
            trend={{ value: 12, isPositive: true }}
            variant="primary"
          />
          <StatCard
            title="Total Orders"
            value={mockDailySummary.totalOrders}
            subtitle="Orders placed today"
            icon={ShoppingCart}
            trend={{ value: 8, isPositive: true }}
          />
          <StatCard
            title="Average Order"
            value={`₹${mockDailySummary.averageOrderValue}`}
            subtitle="Per order value"
            icon={TrendingUp}
            trend={{ value: 3, isPositive: true }}
          />
          <StatCard
            title="Peak Hour"
            value={`${mockDailySummary.peakHour}:00`}
            subtitle="Most orders at this time"
            icon={Clock}
          />
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Orders - Takes 2 columns */}
          <div className="lg:col-span-2">
            <RecentOrders orders={mockOrders} />
          </div>

          {/* Sidebar widgets */}
          <div className="space-y-6">
            <TopSellingItems items={mockDailySummary.topSellingItems} />
            <LowStockAlert items={mockInventory} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
