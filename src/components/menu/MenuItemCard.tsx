import { MenuItem, MenuCategory } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Clock, Edit, Trash2 } from 'lucide-react';

interface MenuItemCardProps {
  item: MenuItem;
  onToggleAvailability: (id: string) => void;
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
}

const categoryConfig: Record<MenuCategory, { label: string; className: string; icon: string }> = {
  veg: { label: 'Veg', className: 'category-veg', icon: '🥬' },
  'non-veg': { label: 'Non-Veg', className: 'category-non-veg', icon: '🍗' },
  beverages: { label: 'Beverage', className: 'category-beverage', icon: '🥤' },
  combos: { label: 'Combo', className: 'category-combo', icon: '🍱' },
};

export function MenuItemCard({ item, onToggleAvailability, onEdit, onDelete }: MenuItemCardProps) {
  const category = categoryConfig[item.category];

  return (
    <div className={cn(
      'menu-item-card',
      !item.isAvailable && 'opacity-60'
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{category.icon}</span>
            <h3 className="font-display font-semibold text-foreground truncate">{item.name}</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{item.description}</p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className={cn('text-xs', category.className)}>
              {category.label}
            </Badge>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {item.preparationTime} min
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-xl font-bold text-foreground">₹{item.price}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <Switch
            checked={item.isAvailable}
            onCheckedChange={() => onToggleAvailability(item.id)}
            className="data-[state=checked]:bg-success"
          />
          <span className="text-sm text-muted-foreground">
            {item.isAvailable ? 'Available' : 'Unavailable'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(item)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(item.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
