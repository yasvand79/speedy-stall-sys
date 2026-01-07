import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDailySales(date?: Date) {
  const targetDate = date || new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  return useQuery({
    queryKey: ['reports', 'daily-sales', startOfDay.toISOString()],
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

      return {
        date: targetDate,
        totalRevenue,
        totalOrders,
        averageOrderValue,
      };
    },
  });
}

export function useTopSellingItems(days: number = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return useQuery({
    queryKey: ['reports', 'top-selling', days],
    queryFn: async () => {
      // Get all completed orders in the period
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .gte('created_at', startDate.toISOString())
        .eq('status', 'completed');

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        return [];
      }

      const orderIds = orders.map(o => o.id);

      // Get order items for these orders
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          quantity,
          menu_items (
            id,
            name
          )
        `)
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      // Aggregate by menu item
      const itemCounts: Record<string, { name: string; quantity: number }> = {};
      
      orderItems?.forEach(item => {
        if (item.menu_items) {
          const id = item.menu_items.id;
          if (!itemCounts[id]) {
            itemCounts[id] = { name: item.menu_items.name, quantity: 0 };
          }
          itemCounts[id].quantity += item.quantity;
        }
      });

      // Sort and return top 10
      return Object.entries(itemCounts)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
    },
  });
}

export function useWeeklyRevenue() {
  return useQuery({
    queryKey: ['reports', 'weekly-revenue'],
    queryFn: async () => {
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
            .select('total')
            .gte('created_at', startOfDay.toISOString())
            .lte('created_at', endOfDay.toISOString())
            .eq('status', 'completed');

          const revenue = orders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
          
          return {
            date: date.toLocaleDateString('en-US', { weekday: 'short' }),
            revenue,
          };
        })
      );

      return results;
    },
  });
}
