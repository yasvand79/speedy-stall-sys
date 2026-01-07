import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMenuItems, useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem } from '@/hooks/useMenuItems';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';
import { Plus, Search, Pencil, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';

type MenuCategory = Database['public']['Enums']['menu_category'];

export default function Menu() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const { data: menuItems, isLoading } = useMenuItems();
  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();
  const deleteItem = useDeleteMenuItem();
  const { isAdmin } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'veg' as MenuCategory,
    preparation_time: '15',
    ingredients: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'veg',
      preparation_time: '15',
      ingredients: '',
    });
    setEditingItem(null);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      category: item.category,
      preparation_time: String(item.preparation_time || 15),
      ingredients: (item.ingredients || []).join(', '),
    });
    setEditDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.price) {
      toast.error('Name and price are required');
      return;
    }

    const data = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      category: formData.category,
      preparation_time: parseInt(formData.preparation_time) || 15,
      ingredients: formData.ingredients.split(',').map(s => s.trim()).filter(Boolean),
      is_available: true,
      image_url: null,
    };

    if (editingItem) {
      await updateItem.mutateAsync({ id: editingItem.id, ...data });
    } else {
      await createItem.mutateAsync(data);
    }

    setEditDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Delete "${name}"?`)) {
      await deleteItem.mutateAsync(id);
    }
  };

  const handleToggleAvailability = async (id: string, currentlyAvailable: boolean) => {
    await updateItem.mutateAsync({ id, is_available: !currentlyAvailable });
  };

  const filterItems = (category: string) => {
    let filtered = menuItems || [];
    
    if (category !== 'all') {
      filtered = filtered.filter(item => item.category === category);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };

  const categories: { value: MenuCategory | 'all'; label: string; icon: string }[] = [
    { value: 'all', label: 'All', icon: '📋' },
    { value: 'veg', label: 'Veg', icon: '🥬' },
    { value: 'non-veg', label: 'Non-Veg', icon: '🍗' },
    { value: 'beverages', label: 'Beverages', icon: '🥤' },
    { value: 'combos', label: 'Combos', icon: '🍱' },
  ];

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Menu Management</h1>
            <p className="text-muted-foreground">
              {menuItems?.length || 0} items • {menuItems?.filter(i => i.is_available).length || 0} available
            </p>
          </div>
          {isAdmin && (
            <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                      placeholder="Item name"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                      placeholder="Brief description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Price (₹) *</Label>
                      <Input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData(p => ({ ...p, price: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select value={formData.category} onValueChange={(v) => setFormData(p => ({ ...p, category: v as MenuCategory }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="veg">Vegetarian</SelectItem>
                          <SelectItem value="non-veg">Non-Veg</SelectItem>
                          <SelectItem value="beverages">Beverages</SelectItem>
                          <SelectItem value="combos">Combos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Prep Time (minutes)</Label>
                    <Input
                      type="number"
                      value={formData.preparation_time}
                      onChange={(e) => setFormData(p => ({ ...p, preparation_time: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Ingredients (comma separated)</Label>
                    <Input
                      value={formData.ingredients}
                      onChange={(e) => setFormData(p => ({ ...p, ingredients: e.target.value }))}
                      placeholder="Rice, Chicken, Spices..."
                    />
                  </div>
                  <Button onClick={handleSubmit} className="w-full" disabled={createItem.isPending || updateItem.isPending}>
                    {editingItem ? 'Update Item' : 'Add Item'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            {categories.map((cat) => (
              <TabsTrigger key={cat.value} value={cat.value} className="gap-1">
                <span>{cat.icon}</span>
                {cat.label}
                <span className="text-xs text-muted-foreground">({filterItems(cat.value).length})</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((cat) => (
            <TabsContent key={cat.value} value={cat.value}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filterItems(cat.value).map((item) => (
                  <Card key={item.id} className={!item.is_available ? 'opacity-60' : ''}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={
                              item.category === 'veg'
                                ? 'h-5 w-5 p-0 border-green-500 bg-green-50'
                                : item.category === 'non-veg'
                                ? 'h-5 w-5 p-0 border-red-500 bg-red-50'
                                : 'hidden'
                            }
                          >
                            <span className={`h-2 w-2 rounded-full ${item.category === 'veg' ? 'bg-green-500' : 'bg-red-500'}`} />
                          </Badge>
                          <CardTitle className="text-base">{item.name}</CardTitle>
                        </div>
                        <p className="font-display text-lg font-bold text-primary">₹{Number(item.price).toFixed(0)}</p>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.preparation_time} min
                        </div>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {item.category}
                        </Badge>
                      </div>
                      
                      {isAdmin && (
                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={item.is_available ?? true}
                              onCheckedChange={() => handleToggleAvailability(item.id, item.is_available ?? true)}
                            />
                            <span className="text-sm">{item.is_available ? 'Available' : 'Unavailable'}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(item.id, item.name)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              {filterItems(cat.value).length === 0 && (
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
