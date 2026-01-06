import { TrendingUp } from 'lucide-react';

interface TopSellingItem {
  itemId: string;
  itemName: string;
  quantity: number;
}

interface TopSellingItemsProps {
  items: TopSellingItem[];
}

export function TopSellingItems({ items }: TopSellingItemsProps) {
  const maxQuantity = Math.max(...items.map(item => item.quantity));

  return (
    <div className="stat-card">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <TrendingUp className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground">Top Selling</h3>
          <p className="text-xs text-muted-foreground">Today's best sellers</p>
        </div>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={item.itemId} className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{item.itemName}</p>
              <div className="mt-1 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${(item.quantity / maxQuantity) * 100}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-semibold text-foreground">{item.quantity}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
