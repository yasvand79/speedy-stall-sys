import { useState } from 'react';
import { useMenuItems } from '@/hooks/useMenuItems';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Minus } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type MenuItem = Database['public']['Tables']['menu_items']['Row'];
type MenuCategory = Database['public']['Enums']['menu_category'];

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

interface ProductGridProps {
  cart: CartItem[];
  onAddToCart: (item: MenuItem) => void;
  onRemoveFromCart: (itemId: string) => void;
}

const categories: { key: MenuCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'veg', label: 'Veg' },
  { key: 'non-veg', label: 'Non-Veg' },
  { key: 'beverages', label: 'Drinks' },
  { key: 'combos', label: 'Combos' },
];

export function ProductGrid({ cart, onAddToCart, onRemoveFromCart }: ProductGridProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<MenuCategory | 'all'>('all');
  const { data: menuItems, isLoading } = useMenuItems();

  const filtered = (menuItems || []).filter(item => {
    if (!item.is_available) return false;
    if (activeCategory !== 'all' && item.category !== activeCategory) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getCartQty = (itemId: string) => cart.find(c => c.menuItem.id === itemId)?.quantity || 0;

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-11"
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-accent'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Product grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground text-sm">No products found</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map(item => {
            const qty = getCartQty(item.id);
            return (
              <button
                key={item.id}
                onClick={() => onAddToCart(item)}
                className={`relative rounded-xl border-2 overflow-hidden text-left transition-all active:scale-[0.97] ${
                  qty > 0 ? 'border-primary bg-accent/50' : 'border-border bg-card hover:border-primary/40'
                }`}
              >
                {/* Image */}
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-20 object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-20 bg-muted flex items-center justify-center">
                    <span className="text-2xl">
                      {item.category === 'veg' ? '🥬' : item.category === 'non-veg' ? '🍗' : item.category === 'beverages' ? '🥤' : '🍱'}
                    </span>
                  </div>
                )}

                {/* Info */}
                <div className="p-2">
                  <p className="text-xs font-medium text-foreground line-clamp-1">{item.name}</p>
                  <p className="text-sm font-bold text-primary mt-0.5">₹{Number(item.price).toFixed(0)}</p>
                </div>

                {/* Quantity badge */}
                {qty > 0 && (
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                    <button
                      onClick={e => { e.stopPropagation(); onRemoveFromCart(item.id); }}
                      className="h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <Badge className="h-6 min-w-6 flex items-center justify-center text-xs">
                      {qty}
                    </Badge>
                    <button
                      onClick={e => { e.stopPropagation(); onAddToCart(item); }}
                      className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
