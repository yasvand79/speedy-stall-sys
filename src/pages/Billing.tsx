import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockOrders } from '@/data/mockData';
import { IndianRupee, Receipt, CreditCard, Smartphone, Banknote, Printer, Download } from 'lucide-react';

export default function Billing() {
  const completedOrders = mockOrders.filter(o => o.paymentStatus === 'completed');
  const pendingOrders = mockOrders.filter(o => o.paymentStatus === 'pending');
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
  const pendingAmount = pendingOrders.reduce((sum, o) => sum + o.total, 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Billing</h1>
          <p className="text-muted-foreground">Manage payments and generate invoices</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Collected</CardTitle>
              <IndianRupee className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <p className="font-display text-2xl font-bold text-success">₹{totalRevenue.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">{completedOrders.length} transactions</p>
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
              <CardTitle className="text-sm font-medium text-muted-foreground">GST Collected</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="font-display text-2xl font-bold">₹{mockOrders.reduce((sum, o) => sum + o.gst, 0).toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">5% GST on all orders</p>
            </CardContent>
          </Card>
        </div>

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
                {pendingOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-semibold">{order.orderNumber}</span>
                        <Badge variant="secondary">
                          {order.type === 'dine-in' ? `Table ${order.tableNumber}` : 'Takeaway'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {order.items.map(i => `${i.quantity}x ${i.menuItem.name}`).join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-display text-lg font-bold">₹{order.total.toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">Inc. ₹{order.gst} GST</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="icon" title="Pay with Cash">
                          <Banknote className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" title="Pay with UPI">
                          <Smartphone className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" title="Pay with Card">
                          <CreditCard className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display">Recent Transactions</CardTitle>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </CardHeader>
          <CardContent>
            {completedOrders.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No completed transactions</p>
            ) : (
              <div className="space-y-3">
                {completedOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                        <IndianRupee className="h-5 w-5 text-success" />
                      </div>
                      <div>
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.payments[0]?.method.toUpperCase()} • {order.payments[0]?.transactionId}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-display font-bold text-success">₹{order.total.toFixed(0)}</p>
                      <Button variant="ghost" size="icon">
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
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
