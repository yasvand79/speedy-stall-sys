import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { NewOrderDialog } from '@/components/orders/NewOrderDialog';
import { PaymentDialog } from '@/components/billing/PaymentDialog';
import { useOrders, useUpdateOrderStatus, OrderWithItems } from '@/hooks/useOrders';
import { usePayments } from '@/hooks/usePayments';
import { useBranches } from '@/hooks/useBranches';
import { useAuth } from '@/contexts/AuthContext';
import {
  Search, Clock, ChefHat, CheckCircle2, Banknote, XCircle,
  Building2, User, UtensilsCrossed, Printer, Package,
  ArrowRight, Hash, CreditCard, Loader2, CheckCircle, Eye
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewOrderId, setPreviewOrderId] = useState<string | null>(null);
  const [printStatus, setPrintStatus] = useState<'idle' | 'printing' | 'success' | 'error'>('idle');

  const { data: orders, isLoading } = useOrders();
  const { branches } = useBranches();
  const updateStatus = useUpdateOrderStatus();
  const { data: allPayments } = usePayments();
  const { role } = useAuth();

  const isAdmin = role === 'admin' || role === 'branch_admin';
  const isBilling = role === 'billing';

  const handleStatusChange = (orderId: string, newStatus: string) => {
    updateStatus.mutate({ orderId, status: newStatus as any });
  };

  const handleProcessPayment = (order: OrderWithItems) => {
    setSelectedOrder(order);
    setPaymentOpen(true);
  };

  const handlePrintClick = async (orderId: string) => {
    setPreviewOrderId(orderId);
    setPreviewLoading(true);
    setPreviewHtml('');
    setPreviewOpen(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice', {
        body: { orderId }
      });
      if (error) throw error;
      if (data?.html) {
        setPreviewHtml(data.html);
      }
    } catch {
      toast.error('Failed to generate invoice');
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePrintFromPreview = () => {
    if (!previewHtml) return;
    setPreviewOpen(false);
    setPrintStatus('printing');

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = '80mm';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';

    let printTriggered = false;
    const triggerPrint = () => {
      if (printTriggered) return;
      printTriggered = true;

      const onAfterPrint = () => {
        iframe.contentWindow?.removeEventListener('afterprint', onAfterPrint);
        if (document.body.contains(iframe)) document.body.removeChild(iframe);
        setPrintStatus('success');
        setTimeout(() => setPrintStatus('idle'), 2000);
      };
      iframe.contentWindow?.addEventListener('afterprint', onAfterPrint);

      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
          setPrintStatus('success');
          setTimeout(() => setPrintStatus('idle'), 2000);
        }
      }, 15000);

      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    };

    iframe.srcdoc = previewHtml;
    iframe.onload = () => {
      const iframeDoc = iframe.contentDocument;
      if (iframeDoc && (iframeDoc as any).fonts?.ready) {
        (iframeDoc as any).fonts.ready.then(() => {
          setTimeout(triggerPrint, 500);
        }).catch(() => {
          setTimeout(triggerPrint, 1000);
        });
      } else {
        setTimeout(triggerPrint, 2000);
      }
    };
    iframe.onerror = () => {
      if (document.body.contains(iframe)) document.body.removeChild(iframe);
      setPrintStatus('error');
      toast.error('Failed to load print content');
      setTimeout(() => setPrintStatus('idle'), 2000);
    };
    document.body.appendChild(iframe);
    setTimeout(() => {
      if (document.body.contains(iframe)) triggerPrint();
    }, 5000);
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
            {isAdmin && (
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
                          <><UtensilsCrossed className="h-3 w-3" /> Table {order.table_number}</>
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
                          disabled={printingOrderId === order.id}
                        >
                          <Printer className="h-3.5 w-3.5" />
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

      {/* Print Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Receipt Preview
            </DialogTitle>
            <DialogDescription>Review the receipt before printing</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto border-y border-border bg-white">
            {previewLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Generating receipt...</p>
              </div>
            ) : previewHtml ? (
              <iframe
                srcDoc={previewHtml}
                className="w-full min-h-[400px] h-[60vh] border-0"
                title="Receipt Preview"
              />
            ) : null}
          </div>
          <DialogFooter className="p-4 pt-2 gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Cancel</Button>
            <Button onClick={handlePrintFromPreview} disabled={!previewHtml || previewLoading}>
              <Printer className="mr-2 h-4 w-4" />Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Status Overlay */}
      {printStatus !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-card border border-border shadow-2xl max-w-xs w-full text-center">
            {printStatus === 'printing' && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-semibold text-foreground">Printing...</p>
                <p className="text-sm text-muted-foreground">Sending to printer</p>
              </>
            )}
            {printStatus === 'success' && (
              <>
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </div>
                <p className="text-lg font-semibold text-foreground">Successfully Printed!</p>
                <p className="text-sm text-muted-foreground">Invoice has been sent to printer</p>
              </>
            )}
            {printStatus === 'error' && (
              <>
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <p className="text-lg font-semibold text-foreground">Print Failed</p>
                <p className="text-sm text-muted-foreground">Could not generate the invoice</p>
              </>
            )}
          </div>
        </div>
      )}

    </MainLayout>
  );
}
