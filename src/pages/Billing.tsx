import { useState, useCallback, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProductGrid, CartItem } from '@/components/billing/ProductGrid';
import { CartPanel } from '@/components/billing/CartPanel';
import { QuickPaymentSheet } from '@/components/billing/QuickPaymentSheet';
import { useCreateOrder } from '@/hooks/useOrders';
import { useCreatePayment } from '@/hooks/usePayments';
import { useUpdateOrderStatus } from '@/hooks/useOrders';
import { useDailySales } from '@/hooks/useReports';
import { useAuth } from '@/contexts/AuthContext';
import { useShopSettings } from '@/hooks/useShopSettings';
import { IndianRupee, Receipt } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type MenuItem = Database['public']['Tables']['menu_items']['Row'];

export default function Billing() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState('');
  const [currentOrderNumber, setCurrentOrderNumber] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  const { role, profile } = useAuth();
  const { settings } = useShopSettings();
  const { data: dailySales } = useDailySales();
  const createOrder = useCreateOrder();
  const createPayment = useCreatePayment();
  const updateOrderStatus = useUpdateOrderStatus();

  const isBillingRole = role === 'billing';
  const gstRate = (settings?.gst_rate ?? 5) / 100;
  const includeGst = settings?.include_gst_in_price ?? false;

  // Cart calculations
  const subtotal = useMemo(() => cart.reduce((sum, c) => sum + Number(c.menuItem.price) * c.quantity, 0), [cart]);
  const gst = includeGst ? 0 : subtotal * gstRate;
  const total = subtotal + gst;
  const totalItems = useMemo(() => cart.reduce((sum, c) => sum + c.quantity, 0), [cart]);

  const addToCart = useCallback((item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === item.id);
      if (existing) {
        return prev.map(c => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === itemId);
      if (!existing) return prev;
      if (existing.quantity <= 1) return prev.filter(c => c.menuItem.id !== itemId);
      return prev.map(c => c.menuItem.id === itemId ? { ...c, quantity: c.quantity - 1 } : c);
    });
  }, []);

  const addById = useCallback((itemId: string) => {
    setCart(prev => prev.map(c => c.menuItem.id === itemId ? { ...c, quantity: c.quantity + 1 } : c));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  // Create order and open payment
  const handlePay = async () => {
    if (cart.length === 0) return;
    setIsPaying(true);
    try {
      const order = await createOrder.mutateAsync({
        type: 'dine-in',
        branch_id: profile?.branch_id || '',
        staff_name: profile?.full_name || '',
        items: cart.map(c => ({
          menu_item_id: c.menuItem.id,
          quantity: c.quantity,
          price: Number(c.menuItem.price),
        })),
      });
      setCurrentOrderId(order.id);
      setCurrentOrderNumber(order.order_number);
      setPaymentDone(false);
      setPaymentOpen(true);
    } finally {
      setIsPaying(false);
    }
  };

  const handlePaymentComplete = async (method: 'cash' | 'upi') => {
    setIsPaying(true);
    try {
      await createPayment.mutateAsync({
        order_id: currentOrderId,
        amount: total,
        method,
      });
      await updateOrderStatus.mutateAsync({ orderId: currentOrderId, status: 'completed' });
      setPaymentDone(true);
    } finally {
      setIsPaying(false);
    }
  };

  const handleDone = () => {
    setPaymentOpen(false);
    setPaymentDone(false);
    setCurrentOrderId('');
    setCurrentOrderNumber('');
    clearCart();
  };

  const todayOrders = dailySales?.totalOrders ?? 0;
  const todayRevenue = dailySales?.totalRevenue ?? 0;

  return (
    <MainLayout>
      <div className="space-y-4">
        {/* Header with today's stats */}
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl font-bold text-foreground">Billing</h1>
          {!isBillingRole && (
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5 text-sm">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{todayOrders}</span>
                <span className="text-muted-foreground hidden sm:inline">orders</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <IndianRupee className="h-4 w-4 text-success" />
                <span className="font-medium text-success">₹{todayRevenue.toFixed(0)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Product Grid */}
        <ProductGrid
          cart={cart}
          onAddToCart={addToCart}
          onRemoveFromCart={removeFromCart}
        />

        {/* Cart (sticky bottom on mobile) */}
        {cart.length > 0 && (
          <Card className="sticky bottom-16 sm:bottom-0 z-10 border-primary/30 shadow-lg">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Cart
                <Badge variant="secondary" className="text-xs">{totalItems} items</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <CartPanel
                cart={cart}
                subtotal={subtotal}
                gst={gst}
                total={total}
                onAdd={addById}
                onRemove={removeFromCart}
                onClear={clearCart}
                onPay={handlePay}
                isPaying={isPaying}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Payment Dialog */}
      <QuickPaymentSheet
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        total={total}
        orderNumber={currentOrderNumber}
        orderId={currentOrderId}
        cart={cart}
        subtotal={subtotal}
        gst={gst}
        onCashReceived={() => handlePaymentComplete('cash')}
        onUpiConfirmed={() => handlePaymentComplete('upi')}
        isPaying={isPaying}
        paymentDone={paymentDone}
        onDone={handleDone}
      />
    </MainLayout>
  );
}
