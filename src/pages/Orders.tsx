import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { PaymentDialog } from '@/components/billing/PaymentDialog';
import { useOrders, useUpdateOrderStatus, OrderWithItems } from '@/hooks/useOrders';
import { usePayments } from '@/hooks/usePayments';
import { useBranches } from '@/hooks/useBranches';
import { useAuth } from '@/contexts/AuthContext';
import { useThermalPrinter } from '@/contexts/ThermalPrinterContext';
import {
  Search, Clock, ChefHat, CheckCircle2, Banknote, XCircle,
  Building2, User, UtensilsCrossed, Printer, Package,
  ArrowRight, Hash, CreditCard, Loader2, CheckCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

type StatusTab = 'active' | 'placed' | 'preparing' | 'ready' | 'completed' | 'cancelled';

const STATUS_CONFIG = {
  placed: { label: 'New', color: 'bg-amber-500', bgLight: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', icon: Clock },
  preparing: { label: 'Cooking', color: 'bg-blue-500', bgLight: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', icon: ChefHat },
  ready: { label: 'Ready', color: 'bg-emerald-500', bgLight: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', icon: CheckCircle2 },
  completed: { label: 'Done', color: 'bg-gray-400', bgLight: 'bg-muted/50', text: 'text-muted-foreground', border: 'border-border', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'bg-red-500', bgLight: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800', icon: XCircle },
};

export default function Orders() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<StatusTab>('active');
  const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);

  const { data: orders, isLoading } = useOrders();
  const { branches } = useBranches();
  const updateStatus = useUpdateOrderStatus();
  const { data: allPayments } = usePayments();
  const { role } = useAuth();
  const { printBill, isPrinting: isThermalPrinting } = useThermalPrinter();

  const isAdmin = role === 'admin' || role === 'branch_admin';
  const isCentralAdmin = role === 'admin';
  const isBilling = role === 'billing';

  const handleStatusChange = (orderId: string, newStatus: string) => {
    updateStatus.mutate({ orderId, status: newStatus as any });
  };

  const handleProcessPayment = (order: OrderWithItems) => {
    setSelectedOrder(order);
    setPaymentOpen(true);
  };

  const handlePrintClick = async (orderId: string) => {
    const order = orders?.find(o => o.id === orderId);
    if (!order) return;

    setPrintingOrderId(orderId);
    const orderPayments = (allPayments || []).filter(p => p.order_id === orderId);
    const latestPayment = orderPayments[0];

    const thermalOrder = {
      orderNumber: order.order_number,
      type: order.type,
      customerName: order.customer_name,
      staffName: order.staff_name,
      items: order.order_items.map((item: any) => ({
        name: item.menu_items?.name || 'Unknown',
        quantity: item.quantity,
        price: Number(item.price),
      })),
      subtotal: Number(order.subtotal),
      gst: Number(order.gst),
      discount: Number(order.discount),
      total: Number(order.total),
      paymentMethod: latestPayment?.method || (order.payment_status === 'completed' ? 'Paid' : undefined),
    };

    await printBill(thermalOrder);
    setPrintingOrderId(null);
  };

  const getPaidAmount = (orderId: string) => {
    return (allPayments?.filter(p => p.order_id === orderId) || []).reduce((sum, p) => sum + Number(p.amount), 0);
  };

  const filteredOrders = useMemo(() => {
    let filtered = orders || [];

    if (activeTab === 'active') {
      filtered = filtered.filter(o => !['completed', 'cancelled'].includes(o.status));
    } else {
      filtered = filtered.filter(o => o.status === activeTab);
    }

    if (branchFilter !== 'all') {
      filtered = filtered.filter(o => o.branch_id === branchFilter);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.staff_name?.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [orders, activeTab, branchFilter, searchQuery]);

  const counts = useMemo(() => {
    const all = orders || [];
    return {
      active: all.filter(o => !['completed', 'cancelled'].includes(o.status)).length,
      placed: all.filter(o => o.status === 'placed').length,
      preparing: all.filter(o => o.status === 'preparing').length,
      ready: all.filter(o => o.status === 'ready').length,
      completed: all.filter(o => o.status === 'completed').length,
      cancelled: all.filter(o => o.status === 'cancelled').length,
    };
  }, [orders]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </MainLayout>
    );
  }

  const tabs: { key: StatusTab; label: string; count: number }[] = [
    { key: 'active', label: 'Active', count: counts.active },
    { key: 'placed', label: 'New', count: counts.placed },
    { key: 'preparing', label: 'Cooking', count: counts.preparing },
    { key: 'ready', label: 'Ready', count: counts.ready },
    { key: 'completed', label: 'Done', count: counts.completed },
    { key: 'cancelled', label: 'Cancelled', count: counts.cancelled },
  ];

  return (
    <MainLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Orders</h1>
            <p className="text-sm text-muted-foreground">
              {counts.active} active • {counts.completed} completed today
            </p>
          </div>
          {(isAdmin || isBilling) && <NewOrderDialog />}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3">
          {/* Status Tabs - horizontal scroll on mobile */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                  activeTab === tab.key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {tab.label}
                <span className={cn(
                  'text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center',
                  activeTab === tab.key
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-background text-foreground'
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search + Branch filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search order #, customer, staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {isCentralAdmin && (
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-[160px]">
                  <Building2 className="h-4 w-4 mr-1.5 shrink-0" />
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches?.filter(b => b.is_active).map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Orders Grid */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium">No orders found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery ? 'Try a different search term' : 'Orders will appear here'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredOrders.map((order) => {
              const config = STATUS_CONFIG[order.status];
              const StatusIcon = config.icon;
              const paidAmount = getPaidAmount(order.id);
              const remaining = Number(order.total) - paidAmount;
              const nextStatus = order.status === 'placed' ? 'preparing' : order.status === 'preparing' ? 'ready' : order.status === 'ready' ? 'completed' : null;

              return (
                <Card key={order.id} className={cn('overflow-hidden transition-all hover:shadow-md', config.border, 'border')}>
                  {/* Status stripe */}
                  <div className={cn('h-1', config.color)} />

                  <CardContent className="p-4 space-y-3">
                    {/* Top row: Order # + Status + Total */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-lg font-bold text-foreground">
                            #{order.order_number}
                          </span>
                          <Badge className={cn('text-[10px] px-1.5 py-0 font-semibold', config.bgLight, config.text, 'border-0')}>
                            <StatusIcon className="h-3 w-3 mr-0.5" />
                            {config.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(order.created_at!), { addSuffix: true })}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-xl font-bold text-foreground">₹{Number(order.total).toFixed(0)}</p>
                        <div className="flex items-center gap-1 justify-end">
                          {order.payment_status === 'completed' ? (
                            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                              <CheckCircle2 className="h-3 w-3" /> Paid
                            </span>
                          ) : remaining > 0 ? (
                            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                              ₹{remaining.toFixed(0)} due
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-muted-foreground">Pending</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Meta badges */}
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0.5">
                        {order.type === 'dine-in' ? (
                          <><UtensilsCrossed className="h-3 w-3" /> Dine-in</>
                        ) : (
                          <><Package className="h-3 w-3" /> Takeaway</>
                        )}
                      </Badge>
                      {order.customer_name && (
                        <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0.5">
                          <User className="h-3 w-3" /> {order.customer_name}
                        </Badge>
                      )}
                      {order.staff_name && (
                        <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0.5 text-muted-foreground">
                          <User className="h-3 w-3" /> {order.staff_name}
                        </Badge>
                      )}
                      {(order as any).branches?.name && (
                        <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0.5 text-muted-foreground">
                          <Building2 className="h-3 w-3" /> {(order as any).branches.name}
                        </Badge>
                      )}
                    </div>

                    {/* Items list */}
                    <div className="bg-muted/40 rounded-lg p-2.5 space-y-1">
                      {order.order_items.slice(0, 4).map((item) => (
                        <div key={item.id} className="flex justify-between text-xs">
                          <span className="text-foreground">
                            <span className="font-semibold">{item.quantity}×</span> {item.menu_items?.name}
                          </span>
                          <span className="text-muted-foreground font-medium">₹{(Number(item.price) * item.quantity).toFixed(0)}</span>
                        </div>
                      ))}
                      {order.order_items.length > 4 && (
                        <p className="text-[10px] text-muted-foreground pt-0.5">+{order.order_items.length - 4} more items</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {/* Next status button */}
                      {nextStatus && order.status !== 'cancelled' && (
                        <>
                          {order.status === 'placed' && isAdmin && (
                            <Button
                              size="sm"
                              className="flex-1 h-8 text-xs gap-1"
                              onClick={() => handleStatusChange(order.id, 'preparing')}
                              disabled={updateStatus.isPending}
                            >
                              <ChefHat className="h-3.5 w-3.5" />
                              Start Cooking
                            </Button>
                          )}
                          {order.status === 'preparing' && isAdmin && (
                            <Button
                              size="sm"
                              className="flex-1 h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleStatusChange(order.id, 'ready')}
                              disabled={updateStatus.isPending}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Mark Ready
                            </Button>
                          )}
                          {order.status === 'ready' && (isAdmin || isBilling) && order.payment_status === 'completed' && (
                            <Button
                              size="sm"
                              className="flex-1 h-8 text-xs gap-1"
                              onClick={() => handleStatusChange(order.id, 'completed')}
                              disabled={updateStatus.isPending}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Complete
                            </Button>
                          )}
                        </>
                      )}

                      {/* Pay button */}
                      {(isAdmin || isBilling) && order.status !== 'cancelled' && order.payment_status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="default"
                          className="h-8 text-xs gap-1"
                          onClick={() => handleProcessPayment(order)}
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          Pay
                        </Button>
                      )}

                      {/* Print */}
                      {order.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handlePrintClick(order.id)}
                          disabled={printingOrderId === order.id || isThermalPrinting}
                        >
                          {printingOrderId === order.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Printer className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}

                      {/* Cancel */}
                      {isAdmin && order.status === 'placed' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleStatusChange(order.id, 'cancelled')}
                          disabled={updateStatus.isPending}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
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
