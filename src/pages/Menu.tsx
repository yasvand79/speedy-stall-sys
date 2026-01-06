import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MenuItemCard } from '@/components/menu/MenuItemCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockMenuItems } from '@/data/mockData';
import { MenuItem, MenuCategory } from '@/types';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

export default function Menu() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(mockMenuItems);
  const [searchQuery, setSearchQuery] = useState('');

  const handleToggleAvailability = (id: string) => {
    setMenuItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, isAvailable: !item.isAvailable, updatedAt: new Date() }
          : item
      )
    );
    const item = menuItems.find(i => i.id === id);
    toast.success(`${item?.name} is now ${item?.isAvailable ? 'unavailable' : 'available'}`);
  };

  const handleEdit = (item: MenuItem) => {
    toast.info(`Editing ${item.name} - Feature coming soon!`);
  };

  const handleDelete = (id: string) => {
    const item = menuItems.find(i => i.id === id);
    setMenuItems(prev => prev.filter(item => item.id !== id));
    toast.success(`${item?.name} deleted from menu`);
  };

  const filterItemsByCategory = (category: MenuCategory | 'all') => {
    let filtered = menuItems;
    if (category !== 'all') {
      filtered = menuItems.filter(item => item.category === category);
    }
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  };

  const categories: { value: MenuCategory | 'all'; label: string; icon: string }[] = [
    { value: 'all', label: 'All Items', icon: '📋' },
    { value: 'veg', label: 'Vegetarian', icon: '🥬' },
    { value: 'non-veg', label: 'Non-Veg', icon: '🍗' },
    { value: 'beverages', label: 'Beverages', icon: '🥤' },
    { value: 'combos', label: 'Combos', icon: '🍱' },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Menu Management</h1>
            <p className="text-muted-foreground">
              {menuItems.length} items • {menuItems.filter(i => i.isAvailable).length} available
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            {categories.map((category) => (
              <TabsTrigger key={category.value} value={category.value} className="gap-1.5">
                <span>{category.icon}</span>
                {category.label}
                <span className="ml-1 text-xs text-muted-foreground">
                  ({filterItemsByCategory(category.value).length})
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((category) => (
            <TabsContent key={category.value} value={category.value} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filterItemsByCategory(category.value).map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    onToggleAvailability={handleToggleAvailability}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
              {filterItemsByCategory(category.value).length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No items found</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </MainLayout>
  );
}
