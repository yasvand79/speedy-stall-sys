import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMenuItems, useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem } from '@/hooks/useMenuItems';
import { useBranchMenuPrices } from '@/hooks/useBranches';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';
import { Plus, Search, Pencil, Trash2, DollarSign, Building2, ImagePlus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type MenuCategory = Database['public']['Enums']['menu_category'];

export default function Menu() {
  const [searchQuery, setSearchQuery] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingPrice, setEditingPrice] = useState<{ itemId: string; itemName: string; currentPrice: number } | null>(null);
  const [newBranchPrice, setNewBranchPrice] = useState('');
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState({ current: 0, total: 0 });

  const { data: menuItems, isLoading } = useMenuItems();
  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();
  const deleteItem = useDeleteMenuItem();
  const { profile, isAdmin, isBranchAdmin } = useAuth();

  // Get branch prices if user is branch admin
  const { prices: branchPrices, upsertPrice, isUpdating: isPriceUpdating } = useBranchMenuPrices(
    isBranchAdmin ? profile?.branch_id || undefined : undefined
  );

  // Admins can add/edit/delete base menu items
  const canManageBaseMenu = isAdmin;
  
  // Branch admins can only edit prices for their branch
  const canEditBranchPrices = isBranchAdmin && profile?.branch_id;

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'veg' as MenuCategory,
    ingredients: '',
    image_url: '',
  });

  // Get branch-specific price for an item
  const getBranchPrice = (itemId: string, basePrice: number): number => {
    if (!isBranchAdmin || !branchPrices) return basePrice;
    const branchPrice = branchPrices.find(p => p.menu_item_id === itemId);
    return branchPrice ? Number(branchPrice.price) : basePrice;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'veg',
      ingredients: '',
      image_url: '',
    });
    setEditingItem(null);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      category: item.category,
      ingredients: (item.ingredients || []).join(', '),
      image_url: item.image_url || '',
    });
    setImagePreview(item.image_url || null);
    setImageFile(null);
    setEditDialogOpen(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const { error } = await supabase.storage.from('menu-images').upload(fileName, file);
    if (error) {
      toast.error('Failed to upload image');
      return null;
    }
    const { data: urlData } = supabase.storage.from('menu-images').getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const handleEditBranchPrice = (item: any) => {
    const currentPrice = getBranchPrice(item.id, Number(item.price));
    setEditingPrice({
      itemId: item.id,
      itemName: item.name,
      currentPrice: currentPrice,
    });
    setNewBranchPrice(String(currentPrice));
    setPriceDialogOpen(true);
  };

  const handleSaveBranchPrice = async () => {
    if (!editingPrice || !profile?.branch_id || !newBranchPrice) {
      toast.error('Invalid price or branch');
      return;
    }

    const priceValue = parseFloat(newBranchPrice);
    if (isNaN(priceValue) || priceValue < 0) {
      toast.error('Please enter a valid price');
      return;
    }

    upsertPrice({
      branch_id: profile.branch_id,
      menu_item_id: editingPrice.itemId,
      price: priceValue,
    });

    setPriceDialogOpen(false);
    setEditingPrice(null);
    setNewBranchPrice('');
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.price) {
      toast.error('Name and price are required');
      return;
    }

    setIsUploading(true);
    let imageUrl = formData.image_url || null;
    
    if (imageFile) {
      const uploaded = await uploadImage(imageFile);
      if (uploaded) imageUrl = uploaded;
    }

    const data = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      category: formData.category,
      ingredients: formData.ingredients.split(',').map(s => s.trim()).filter(Boolean),
      preparation_time: 10,
      is_available: true,
      image_url: imageUrl,
    };
    setIsUploading(false);

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

  const handleGenerateAllImages = async () => {
    const itemsWithoutImages = (menuItems || []).filter(item => !item.image_url);
    if (itemsWithoutImages.length === 0) {
      toast.info('All items already have images');
      return;
    }
    
    setIsGeneratingImages(true);
    setGeneratingProgress({ current: 0, total: itemsWithoutImages.length });
    let successCount = 0;

    for (const item of itemsWithoutImages) {
      try {
        const { data, error } = await supabase.functions.invoke('generate-food-image', {
          body: { itemId: item.id, itemName: item.name, category: item.category },
        });
        if (error) throw error;
        successCount++;
      } catch (err) {
        console.error(`Failed to generate image for ${item.name}:`, err);
      }
      setGeneratingProgress(prev => ({ ...prev, current: prev.current + 1 }));
    }

    setIsGeneratingImages(false);
    toast.success(`Generated images for ${successCount}/${itemsWithoutImages.length} items`);
    // Refresh menu items
    window.location.reload();
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
              {isBranchAdmin && (
                <span className="ml-2 text-primary flex items-center gap-1 inline-flex">
                  <Building2 className="h-3 w-3" />
                  Branch prices enabled
                </span>
              )}
            </p>
          </div>
          {canManageBaseMenu && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleGenerateAllImages}
                disabled={isGeneratingImages}
              >
                {isGeneratingImages ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating {generatingProgress.current}/{generatingProgress.total}
                  </>
                ) : (
                  <>
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Auto Generate Images
                  </>
                )}
              </Button>
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
                    <Label>Ingredients (comma separated)</Label>
                    <Input
                      value={formData.ingredients}
                      onChange={(e) => setFormData(p => ({ ...p, ingredients: e.target.value }))}
                      placeholder="Rice, Chicken, Spices..."
                    />
                  </div>
                  <div>
                    <Label>Food Image</Label>
                    <div className="mt-1.5 flex items-center gap-3">
                      {imagePreview ? (
                        <div className="relative h-20 w-20 rounded-lg overflow-hidden border">
                          <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => { setImageFile(null); setImagePreview(null); setFormData(p => ({ ...p, image_url: '' })); }}
                            className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors">
                          <ImagePlus className="h-6 w-6 text-muted-foreground" />
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                        </label>
                      )}
                      <p className="text-xs text-muted-foreground">Upload image (max 2MB)</p>
                    </div>
                  </div>
                  <Button onClick={handleSubmit} className="w-full" disabled={createItem.isPending || updateItem.isPending || isUploading}>
                    {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</> : editingItem ? 'Update Item' : 'Add Item'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          )}
        </div>

        {/* Branch Price Dialog */}
        <Dialog open={priceDialogOpen} onOpenChange={(open) => { setPriceDialogOpen(open); if (!open) { setEditingPrice(null); setNewBranchPrice(''); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Set Branch Price
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Set a custom price for <strong>{editingPrice?.itemName}</strong> at your branch.
              </p>
              <div>
                <Label>Price (₹)</Label>
                <Input
                  type="number"
                  value={newBranchPrice}
                  onChange={(e) => setNewBranchPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <Button 
                onClick={handleSaveBranchPrice} 
                className="w-full" 
                disabled={isPriceUpdating}
              >
                Save Branch Price
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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
                {filterItems(cat.value).map((item) => {
                  const displayPrice = getBranchPrice(item.id, Number(item.price));
                  const hasBranchPrice = isBranchAdmin && branchPrices?.some(p => p.menu_item_id === item.id);
                  
                  return (
                    <Card key={item.id} className={`overflow-hidden ${!item.is_available ? 'opacity-60' : ''}`}>
                      {item.image_url && (
                        <div className="h-36 w-full overflow-hidden">
                          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                        </div>
                      )}
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
                          <div className="text-right">
                            <p className="font-display text-lg font-bold text-primary">₹{displayPrice.toFixed(0)}</p>
                            {hasBranchPrice && (
                              <p className="text-xs text-muted-foreground line-through">₹{Number(item.price).toFixed(0)}</p>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {item.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {item.category}
                          </Badge>
                          {hasBranchPrice && (
                            <Badge variant="outline" className="text-xs">
                              <Building2 className="h-3 w-3 mr-1" />
                              Branch Price
                            </Badge>
                          )}
                        </div>
                        
                        {/* Admin controls - only for developers/central admins */}
                        {canManageBaseMenu && (
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

                        {/* Branch admin controls - availability toggle + price editing */}
                        {canEditBranchPrices && (
                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={item.is_available ?? true}
                                onCheckedChange={() => handleToggleAvailability(item.id, item.is_available ?? true)}
                              />
                              <span className="text-sm">{item.is_available ? 'Available' : 'Unavailable'}</span>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleEditBranchPrice(item)}
                            >
                              <DollarSign className="h-3 w-3 mr-1" />
                              Set Price
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
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