import { Order, OrderStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, MapPin, Phone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RecentOrdersProps {
  orders: Order[];
}

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  placed: { label: 'Placed', className: 'order-status-placed' },
  preparing: { label: 'Preparing', className: 'order-status-preparing' },
  ready: { label: 'Ready', className: 'order-status-ready' },
  completed: { label: 'Completed', className: 'order-status-completed' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/15 text-destructive border border-destructive/30' },
};

export function RecentOrders({ orders }: RecentOrdersProps) {
  return (
    <div className="table-container">
      <div className="border-b border-border px-6 py-4">
        <h3 className="font-display text-lg font-semibold text-foreground">Recent Orders</h3>
        <p className="text-sm text-muted-foreground">Latest orders from today</p>
      </div>
      <div className="divide-y divide-border">
        {orders.map((order) => (
          <div key={order.id} className="px-6 py-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="font-display font-semibold text-foreground">
                    {order.orderNumber}
                  </span>
                  <Badge variant="outline" className={cn('text-xs font-medium', statusConfig[order.status].className)}>
                    {statusConfig[order.status].label}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {order.type === 'dine-in' ? 'Dine-in' : 'Takeaway'}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                  {order.tableNumber && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      Table {order.tableNumber}
                    </span>
                  )}
                  {order.customerName && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {order.customerName}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDistanceToNow(order.createdAt, { addSuffix: true })}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {order.items.map(item => `${item.quantity}x ${item.menuItem.name}`).join(', ')}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-bold text-foreground">
                  ₹{order.total.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {order.items.reduce((acc, item) => acc + item.quantity, 0)} items
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
