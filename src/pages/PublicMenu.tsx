import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChefHat, Leaf, Drumstick, Coffee, Package } from 'lucide-react';

interface PublicMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  is_available: boolean;
  image_url: string | null;
  preparation_time: number | null;
}

interface BranchInfo {
  id: string;
  name: string;
  location: string;
  phone: string | null;
}

export default function PublicMenu() {
  const { branchCode } = useParams<{ branchCode: string }>();
  const [menuItems, setMenuItems] = useState<PublicMenuItem[]>([]);
  const [branch, setBranch] = useState<BranchInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    async function fetchMenu() {
      try {
        // Fetch branch by code
        const { data: branchData, error: branchError } = await supabase
          .from('branches')
          .select('id, name, location, phone')
          .eq('code', branchCode || '')
          .eq('is_active', true)
          .single();

        if (branchError || !branchData) {
          setError('Branch not found');
          setLoading(false);
          return;
        }

        setBranch(branchData);

        // Fetch menu items
        const { data: items, error: itemsError } = await supabase
          .from('menu_items')
          .select('id, name, description, price, category, is_available, image_url, preparation_time')
          .eq('is_available', true)
          .order('category')
          .order('name');

        if (itemsError) throw itemsError;

        // Check for branch-specific prices
        const { data: branchPrices } = await supabase
          .from('branch_menu_prices')
          .select('menu_item_id, price')
          .eq('branch_id', branchData.id);

        const priceMap = new Map(branchPrices?.map(p => [p.menu_item_id, Number(p.price)]) || []);

        const itemsWithPrices = (items || []).map(item => ({
          ...item,
          price: priceMap.get(item.id) ?? Number(item.price),
        }));

        setMenuItems(itemsWithPrices);
      } catch (err) {
        setError('Failed to load menu');
      } finally {
        setLoading(false);
      }
    }

    fetchMenu();
  }, [branchCode]);

  const categories = [
    { value: 'all', label: 'All', icon: Package },
    { value: 'veg', label: 'Veg', icon: Leaf },
    { value: 'non-veg', label: 'Non-Veg', icon: Drumstick },
    { value: 'beverages', label: 'Beverages', icon: Coffee },
    { value: 'combos', label: 'Combos', icon: Package },
  ];

  const filteredItems = activeCategory === 'all'
    ? menuItems
    : menuItems.filter(item => item.category === activeCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <ChefHat className="h-16 w-16 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">{error}</h1>
          <p className="text-muted-foreground">Please check the branch code and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
              <ChefHat className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{branch?.name}</h1>
              <p className="text-sm opacity-80">{branch?.location}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Categories */}
      <div className="sticky top-[76px] z-40 bg-background border-b">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-2 py-3 overflow-x-auto">
            {categories.map(cat => {
              const Icon = cat.icon;
              const count = cat.value === 'all' ? menuItems.length : menuItems.filter(i => i.category === cat.value).length;
              return (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeCategory === cat.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredItems.map(item => (
            <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
                        item.category === 'veg' ? 'border-green-500' : item.category === 'non-veg' ? 'border-red-500' : 'border-transparent'
                      }`}>
                        {(item.category === 'veg' || item.category === 'non-veg') && (
                          <span className={`h-2 w-2 rounded-full ${item.category === 'veg' ? 'bg-green-500' : 'bg-red-500'}`} />
                        )}
                      </span>
                      <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-lg font-bold text-primary">₹{item.price.toFixed(0)}</span>
                      {item.preparation_time && (
                        <Badge variant="secondary" className="text-xs">
                          {item.preparation_time} min
                        </Badge>
                      )}
                    </div>
                  </div>
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No items available in this category.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/50 py-6 text-center text-sm text-muted-foreground">
        <p>Powered by FoodShop Sales System</p>
        {branch?.phone && <p className="mt-1">📞 {branch.phone}</p>}
      </footer>
    </div>
  );
}
