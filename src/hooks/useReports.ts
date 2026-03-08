import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

// ─── Date range helper ───
export function useDateRange(range: 'today' | '7d' | '30d' | 'custom', customStart?: Date, customEnd?: Date) {
  return useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    let start = new Date();

    if (range === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (range === '7d') {
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    } else if (range === '30d') {
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
    } else if (range === 'custom' && customStart && customEnd) {
      start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      end.setTime(customEnd.getTime());
      end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  }, [range, customStart, customEnd]);
}

// ─── Daily Sales ───
export function useDailySales(date?: Date) {
  const targetDate = date || new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  return useQuery({
    queryKey: ['reports', 'daily-sales', startOfDay.toISOString()],
    refetchInterval: 5000,
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('total, status, created_at')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .eq('status', 'completed');

      if (error) throw error;

      const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
      const totalOrders = orders.length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      return { date: targetDate, totalRevenue, totalOrders, averageOrderValue };
    },
  });
}

// ─── Top Selling Items ───
export function useTopSellingItems(days: number = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return useQuery({
    queryKey: ['reports', 'top-selling', days],
    refetchInterval: 5000,
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'completed');

      if (ordersError) throw ordersError;
      if (!orders || orders.length === 0) return [];

      const orderIds = orders.map(o => o.id);
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('quantity, price, menu_items(id, name, category)')
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      const itemCounts: Record<string, { name: string; category: string; quantity: number; revenue: number }> = {};
      orderItems?.forEach(item => {
        if (item.menu_items) {
          const id = item.menu_items.id;
          if (!itemCounts[id]) {
            itemCounts[id] = { name: item.menu_items.name, category: item.menu_items.category, quantity: 0, revenue: 0 };
          }
          itemCounts[id].quantity += item.quantity;
          itemCounts[id].revenue += Number(item.price);
        }
      });

      return Object.entries(itemCounts)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
    },
  });
}

// ─── Weekly Revenue ───
export function useWeeklyRevenue() {
  return useQuery({
    queryKey: ['reports', 'weekly-revenue'],
    refetchInterval: 5000,
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        days.push(date);
      }

      const results = await Promise.all(
        days.map(async (date) => {
          const startOfDay = new Date(date);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(date);
          endOfDay.setHours(23, 59, 59, 999);

          const { data: orders } = await supabase
            .from('orders')
            .select('total, id')
            .gte('created_at', startOfDay.toISOString())
            .lte('created_at', endOfDay.toISOString())
            .eq('status', 'completed');

          const revenue = orders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
          const orderCount = orders?.length || 0;

          return {
            date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            revenue,
            orders: orderCount,
          };
        })
      );

      return results;
    },
  });
}

// ─── Comprehensive Orders Data (for all analytics) ───
export function useOrdersAnalytics(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['reports', 'orders-analytics', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, total, subtotal, gst, discount, status, type, payment_status, created_at, completed_at, staff_name, branch_id, created_by, order_number, customer_name')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return orders || [];
    },
  });
}

// ─── Payment Analytics ───
export function usePaymentAnalytics(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['reports', 'payment-analytics', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const { data: payments, error } = await supabase
        .from('payments')
        .select('id, amount, method, created_at, order_id, verified')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;
      return payments || [];
    },
  });
}

// ─── Category Sales ───
export function useCategorySales(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['reports', 'category-sales', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('status', 'completed');

      if (!orders?.length) return [];

      const { data: items } = await supabase
        .from('order_items')
        .select('quantity, price, menu_items(category)')
        .in('order_id', orders.map(o => o.id));

      const categories: Record<string, { count: number; revenue: number }> = {};
      items?.forEach(item => {
        const cat = item.menu_items?.category || 'unknown';
        if (!categories[cat]) categories[cat] = { count: 0, revenue: 0 };
        categories[cat].count += item.quantity;
        categories[cat].revenue += Number(item.price);
      });

      return Object.entries(categories).map(([category, data]) => ({
        category,
        ...data,
      })).sort((a, b) => b.revenue - a.revenue);
    },
  });
}

// ─── Staff Sales ───
export function useStaffSales(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['reports', 'staff-sales', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const { data: orders } = await supabase
        .from('orders')
        .select('total, created_by, staff_name')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .eq('status', 'completed');

      const staffMap: Record<string, { name: string; orders: number; revenue: number }> = {};
      orders?.forEach(order => {
        const key = order.created_by || 'unknown';
        if (!staffMap[key]) {
          staffMap[key] = { name: order.staff_name || 'Unknown', orders: 0, revenue: 0 };
        }
        staffMap[key].orders++;
        staffMap[key].revenue += Number(order.total);
      });

      return Object.entries(staffMap)
        .map(([id, data]) => ({ id, ...data, avgOrderValue: data.orders > 0 ? data.revenue / data.orders : 0 }))
        .sort((a, b) => b.revenue - a.revenue);
    },
  });
}

// ─── Inventory Status ───
export function useInventoryStatus() {
  return useQuery({
    queryKey: ['reports', 'inventory-status'],
    refetchInterval: 5000,
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('quantity', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}
