import { CartItem } from './ProductGrid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Minus, ShoppingCart } from 'lucide-react';

interface CartPanelProps {
  cart: CartItem[];
  subtotal: number;
  gst: number;
  total: number;
  onAdd: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onClear: () => void;
  onPay: () => void;
  isPaying?: boolean;
}

export function CartPanel({ cart, subtotal, gst, total, onAdd, onRemove, onClear, onPay, isPaying }: CartPanelProps) {
  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <ShoppingCart className="h-10 w-10 mb-2 opacity-40" />
        <p className="text-sm">Tap products to add</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Cart items */}
      <div className="space-y-2 max-h-[240px] overflow-y-auto">
        {cart.map(({ menuItem, quantity }) => (
          <div key={menuItem.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-border last:border-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{menuItem.name}</p>
              <p className="text-xs text-muted-foreground">₹{Number(menuItem.price).toFixed(0)} × {quantity}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onRemove(menuItem.id)}
                className="h-7 w-7 rounded-full border border-border flex items-center justify-center hover:bg-destructive/10 transition-colors"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="text-sm font-bold w-5 text-center">{quantity}</span>
              <button
                onClick={() => onAdd(menuItem.id)}
                className="h-7 w-7 rounded-full border border-border flex items-center justify-center hover:bg-primary/10 transition-colors"
              >
                <Plus className="h-3 w-3" />
              </button>
              <p className="text-sm font-bold w-14 text-right text-foreground">₹{(Number(menuItem.price) * quantity).toFixed(0)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="space-y-1 pt-2 border-t border-border">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Subtotal</span>
          <span>₹{subtotal.toFixed(0)}</span>
        </div>
        {gst > 0 && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>GST</span>
            <span>₹{gst.toFixed(0)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold text-foreground pt-1">
          <span>Total</span>
          <span>₹{total.toFixed(0)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onClear} className="flex-shrink-0">
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button className="flex-1 h-12 text-base font-bold" onClick={onPay} disabled={isPaying}>
          PAY ₹{total.toFixed(0)}
        </Button>
      </div>
    </div>
  );
}
