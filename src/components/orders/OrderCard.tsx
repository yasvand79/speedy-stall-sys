import { Order, OrderStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Clock, MapPin, Phone, ArrowRight, Printer } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface OrderCardProps {
  order: Order;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
}

const statusConfig: Record<OrderStatus, { label: string; className: string; nextStatus?: OrderStatus; nextLabel?: string }> = {
  placed: { label: 'Placed', className: 'order-status-placed', nextStatus: 'preparing', nextLabel: 'Start Preparing' },
  preparing: { label: 'Preparing', className: 'order-status-preparing', nextStatus: 'ready', nextLabel: 'Mark Ready' },
  ready: { label: 'Ready', className: 'order-status-ready', nextStatus: 'completed', nextLabel: 'Complete Order' },
  completed: { label: 'Completed', className: 'order-status-completed' },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/15 text-destructive border border-destructive/30' },
};

export function OrderCard({ order, onStatusChange }: OrderCardProps) {
  const config = statusConfig[order.status];

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-bold">{order.orderNumber}</h3>
              <Badge variant="outline" className={cn('text-xs font-medium', config.className)}>
                {config.label}
              </Badge>
            </div>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <Badge variant="secondary" className="text-xs">
                {order.type === 'dine-in' ? 'Dine-in' : 'Takeaway'}
              </Badge>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDistanceToNow(order.createdAt, { addSuffix: true })}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-xl font-bold">₹{order.total.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">
              {order.paymentStatus === 'completed' ? (
                <span className="text-success">Paid</span>
              ) : (
                <span className="text-warning">Pending</span>
              )}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Customer Info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {order.tableNumber && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              Table {order.tableNumber}
            </span>
          )}
          {order.customerName && (
            <span className="flex items-center gap-1">
              <Phone className="h-4 w-4" />
              {order.customerName}
            </span>
          )}
        </div>

        {/* Order Items */}
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Items</p>
          <div className="space-y-1.5">
            {order.items.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span>
                  <span className="font-medium">{item.quantity}x</span> {item.menuItem.name}
                </span>
                <span className="font-medium">₹{item.price}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-border flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>₹{order.subtotal}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">GST (5%)</span>
            <span>₹{order.gst}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-sm text-success">
              <span>Discount</span>
              <span>-₹{order.discount}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {config.nextStatus && (
            <Button
              className="flex-1"
              onClick={() => onStatusChange(order.id, config.nextStatus!)}
            >
              {config.nextLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" size="icon">
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
