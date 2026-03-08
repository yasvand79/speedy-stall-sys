import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOrders, OrderWithItems } from '@/hooks/useOrders';
import { usePayments, useCreatePayment } from '@/hooks/usePayments';
import { useDailySales } from '@/hooks/useReports';
import { IndianRupee, Receipt, CreditCard, Smartphone, Banknote, Printer, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { PaymentDialog } from '@/components/billing/PaymentDialog';
import { useState } from 'react';
import { useThermalPrinter } from '@/contexts/ThermalPrinterContext';
import { useAuth } from '@/contexts/AuthContext';

export default function Billing() {
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const { data: payments, isLoading: paymentsLoading } = usePayments();
  const { data: dailySales } = useDailySales();
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const { printBill, isPrinting: isThermalPrinting } = useThermalPrinter();
  const { role } = useAuth();
  const isBillingRole = role === 'billing';

  const handlePrintReceipt = async (order: OrderWithItems) => {
    const orderPayments = (payments || []).filter(p => p.order_id === order.id);
    const latestPayment = orderPayments[0];

    const thermalOrder = {
      orderNumber: order.order_number,
      type: order.type,
      customerName: order.customer_name,
      staffName: order.staff_name,
      items: order.order_items.map(i => ({
        name: i.menu_items?.name || 'Item',
        quantity: i.quantity,
        price: Number(i.price),
      })),
      subtotal: Number(order.subtotal),
      gst: Number(order.gst),
      discount: Number(order.discount),
      total: Number(order.total),
      paymentMethod: latestPayment?.method || undefined,
      paidAmount: Number(order.total),
    };

    await printBill(thermalOrder);
  };

  if (ordersLoading || paymentsLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  // Calculate stats from real data
  const pendingOrders = orders?.filter(o => 
    o.payment_status !== 'completed' && o.status !== 'cancelled'
  ) || [];
  
  const completedPayments = payments || [];
  const todayPayments = completedPayments.filter(p => {
    const paymentDate = new Date(p.created_at || '');
    const today = new Date();
    return paymentDate.toDateString() === today.toDateString();
  });
  
  const totalCollectedToday = todayPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingAmount = pendingOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const gstCollected = dailySales?.totalRevenue ? dailySales.totalRevenue * 0.05 / 1.05 : 0;

  const getPaidAmount = (orderId: string) => {
    return (payments || [])
      .filter(p => p.order_id === orderId)
      .reduce((sum, p) => sum + Number(p.amount), 0);
  };

  const handlePayment = (order: OrderWithItems) => {
    setSelectedOrder(order);
    setPaymentOpen(true);
  };

  // Get recent completed transactions (orders with completed payments)
  const recentTransactions = orders?.filter(o => o.payment_status === 'completed')
    .slice(0, 10) || [];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Billing</h1>
          <p className="text-muted-foreground">
            {isBillingRole ? 'Process pending payments' : 'Manage payments and generate invoices'}
          </p>
        </div>

        {/* Stats - hidden for billing role */}
        {!isBillingRole && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Today's Collection</CardTitle>
                <IndianRupee className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <p className="font-display text-2xl font-bold text-success">₹{totalCollectedToday.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">{todayPayments.length} transactions</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payments</CardTitle>
                <Receipt className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <p className="font-display text-2xl font-bold text-warning">₹{pendingAmount.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">{pendingOrders.length} orders pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">GST Collected (Today)</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="font-display text-2xl font-bold">₹{gstCollected.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">5% GST on all orders</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pending Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingOrders.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No pending payments</p>
            ) : (
              <div className="space-y-4">
                {pendingOrders.map((order) => {
                  const paidAmount = getPaidAmount(order.id);
                  const remaining = Number(order.total) - paidAmount;
                  
                  return (
                    <div key={order.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-semibold">{order.order_number}</span>
                          <Badge variant="secondary">
                            {order.type === 'dine-in' ? 'Dine-in' : 'Takeaway'}
                          </Badge>
                          <Badge variant="outline" className="capitalize">{order.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {order.order_items.map(i => `${i.quantity}x ${i.menu_items?.name}`).join(', ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-display text-lg font-bold">
                            {paidAmount > 0 ? `₹${remaining.toFixed(0)} due` : `₹${Number(order.total).toFixed(0)}`}
                          </p>
                          <p className="text-xs text-muted-foreground">Inc. ₹{Number(order.gst).toFixed(0)} GST</p>
                        </div>
                        <Button onClick={() => handlePayment(order)}>
                          <Banknote className="mr-2 h-4 w-4" />
                          Pay
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No completed transactions</p>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((order) => {
                  const orderPayments = (payments || []).filter(p => p.order_id === order.id);
                  const latestPayment = orderPayments[0];
                  
                  return (
                    <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                          <IndianRupee className="h-5 w-5 text-success" />
                        </div>
                        <div>
                          <p className="font-medium">{order.order_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {latestPayment?.method?.toUpperCase() || 'N/A'} • {formatDistanceToNow(new Date(order.created_at || ''), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-display font-bold text-success">₹{Number(order.total).toFixed(0)}</p>
                        <Button variant="ghost" size="icon" onClick={() => handlePrintReceipt(order)} disabled={isThermalPrinting}>
                          {isThermalPrinting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Dialog */}
      {selectedOrder && (
        <PaymentDialog
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          orderId={selectedOrder.id}
          orderNumber={selectedOrder.order_number}
          total={Number(selectedOrder.total)}
          paidAmount={getPaidAmount(selectedOrder.id)}
        />
      )}
    </MainLayout>
  );
}
