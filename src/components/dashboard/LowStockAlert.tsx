import { AlertTriangle } from 'lucide-react';
import { InventoryItem } from '@/types';
import { Button } from '@/components/ui/button';

interface LowStockAlertProps {
  items: InventoryItem[];
}

export function LowStockAlert({ items }: LowStockAlertProps) {
  const lowStockItems = items.filter(item => item.quantity <= item.minQuantity);

  if (lowStockItems.length === 0) {
    return (
      <div className="stat-card">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
            <span className="text-success text-lg">✓</span>
          </div>
          <h3 className="font-display font-semibold text-foreground">Inventory Status</h3>
        </div>
        <p className="text-sm text-muted-foreground">All items are well stocked!</p>
      </div>
    );
  }

  return (
    <div className="stat-card border-warning/30">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground">Low Stock Alert</h3>
          <p className="text-xs text-muted-foreground">{lowStockItems.length} items need attention</p>
        </div>
      </div>
      <div className="space-y-2">
        {lowStockItems.slice(0, 4).map((item) => (
          <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
            <div>
              <p className="text-sm font-medium text-foreground">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {item.quantity} {item.unit} remaining
              </p>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              Restock
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
