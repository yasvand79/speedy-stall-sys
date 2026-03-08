import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMenuItems } from '@/hooks/useMenuItems';
import { useCreateOrder } from '@/hooks/useOrders';
import { useBranches } from '@/hooks/useBranches';
import { useAuth } from '@/contexts/AuthContext';
import { useShopSettings } from '@/hooks/useShopSettings';
import { Database } from '@/integrations/supabase/types';
import { Plus, Minus, ShoppingCart, UtensilsCrossed, Package, Building2, User } from 'lucide-react';
import { toast } from 'sonner';

type MenuItem = Database['public']['Tables']['menu_items']['Row'];
type OrderType = Database['public']['Enums']['order_type'];

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

interface NewOrderDialogProps {
  trigger?: React.ReactNode;
}

export function NewOrderDialog({ trigger }: NewOrderDialogProps) {
  const [open, setOpen] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>('dine-in');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  const { data: menuItems, isLoading } = useMenuItems();
  const { branches, activeBranches } = useBranches();
  const { profile, isAdmin } = useAuth();
  const { settings } = useShopSettings();
  const createOrder = useCreateOrder();

  useEffect(() => {
    if (profile?.branch_id && !isAdmin) {
      setSelectedBranchId(profile.branch_id);
    }
  }, [profile, isAdmin]);

  const canSelectBranch = isAdmin;
  const availableItems = menuItems?.filter(item => item.is_available) || [];

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === item.id);
      if (existing) {
        return prev.map(c =>
          c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(c =>
          c.menuItem.id === itemId ? { ...c, quantity: c.quantity - 1 } : c
        );
      }
      return prev.filter(c => c.menuItem.id !== itemId);
    });
  };

  const clearCart = () => setCart([]);

  const gstRate = (settings?.gst_rate ?? 5) / 100;
  const includeGstInPrice = settings?.include_gst_in_price ?? false;
  const subtotal = cart.reduce((sum, item) => sum + Number(item.menuItem.price) * item.quantity, 0);
  const gst = includeGstInPrice ? 0 : subtotal * gstRate;
  const total = subtotal + gst;

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error('Please add items to the order');
      return;
    }
    if (!selectedBranchId) {
      toast.error('Please select a branch');
      return;
    }

    await createOrder.mutateAsync({
      type: orderType,
      customer_name: customerName || undefined,
      customer_phone: customerPhone || undefined,
      notes: notes || undefined,
      branch_id: selectedBranchId,
      staff_name: profile?.full_name || 'Unknown Staff',
      items: cart.map(item => ({
        menu_item_id: item.menuItem.id,
        quantity: item.quantity,
        price: Number(item.menuItem.price),
        notes: item.notes,
      })),
    });

    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
    if (canSelectBranch) setSelectedBranchId('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Order
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2 flex-shrink-0">
          <DialogTitle className="font-display text-lg">Create New Order</DialogTitle>
        </DialogHeader>

        {/* Single scrollable area on mobile, side-by-side on md+ */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">

          {/* Left column: form + menu */}
          <div className="flex-1 min-h-0 flex flex-col overflow-y-auto md:overflow-hidden">
            <div className="px-4 pb-3 space-y-3 md:flex md:flex-col md:flex-1 md:min-h-0 md:overflow-hidden">

              {/* Branch & Staff - side by side */}
              <div className="p-2.5 bg-muted/50 rounded-lg border">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="flex items-center gap-1 mb-1 text-xs font-medium">
                      <Building2 className="h-3 w-3" /> Branch *
                    </Label>
                    {canSelectBranch ? (
                      <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeBranches.map(branch => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name} - {branch.location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={branches?.find(b => b.id === selectedBranchId)?.name || 'Your Branch'}
                        disabled
                        className="bg-background h-9 text-xs"
                      />
                    )}
                  </div>
                  <div>
                    <Label className="flex items-center gap-1 mb-1 text-xs font-medium">
                      <User className="h-3 w-3" /> Staff
                    </Label>
                    <Input
                      value={profile?.full_name || 'Unknown Staff'}
                      disabled
                      className="bg-background h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Order Type */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={orderType === 'dine-in' ? 'default' : 'outline'}
                  size="sm"
                  className="h-10 text-sm"
                  onClick={() => setOrderType('dine-in')}
                >
                  <UtensilsCrossed className="mr-1.5 h-4 w-4" />
                  Dine-In
                </Button>
                <Button
                  type="button"
                  variant={orderType === 'takeaway' ? 'default' : 'outline'}
                  size="sm"
                  className="h-10 text-sm"
                  onClick={() => setOrderType('takeaway')}
                >
                  <Package className="mr-1.5 h-4 w-4" />
                  Takeaway
                </Button>
              </div>

              {/* Customer Info - side by side */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-medium mb-1 block">Customer Name</Label>
                  <Input
                    placeholder="Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block">Phone</Label>
                  <Input
                    placeholder="Phone number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* Menu Items */}
              <div className="flex-1 min-h-0 flex flex-col">
                <Label className="text-xs font-medium mb-1.5 block">Select Items</Label>
                <ScrollArea className="flex-1 min-h-[180px] max-h-[40vh] md:max-h-none border rounded-lg p-2">
                  {isLoading ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">Loading menu...</div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {availableItems.map((item) => (
                        <Card
                          key={item.id}
                          className="cursor-pointer hover:border-primary transition-colors overflow-hidden"
                          onClick={() => addToCart(item)}
                        >
                          <CardContent className="p-0">
                            {item.image_url && (
                              <div className="h-16 sm:h-20 w-full overflow-hidden">
                                <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                              </div>
                            )}
                            <div className="p-2">
                              <div className="flex items-center gap-1 mb-0.5">
                                <Badge
                                  variant="outline"
                                  className={
                                    item.category === 'veg'
                                      ? 'h-3 w-3 p-0 border-green-500 bg-green-50 flex-shrink-0'
                                      : item.category === 'non-veg'
                                      ? 'h-3 w-3 p-0 border-red-500 bg-red-50 flex-shrink-0'
                                      : 'hidden'
                                  }
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${item.category === 'veg' ? 'bg-green-500' : 'bg-red-500'}`} />
                                </Badge>
                                <span className="font-medium text-xs leading-tight line-clamp-2 break-words">{item.name}</span>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-xs font-semibold text-primary">₹{Number(item.price).toFixed(0)}</p>
                                <Button size="icon" variant="ghost" className="h-5 w-5 flex-shrink-0">
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>

          {/* Right column: Cart - below on mobile, side panel on md+ */}
          <div className="flex-shrink-0 md:w-72 border-t md:border-t-0 md:border-l bg-muted/30 flex flex-col">
            <div className="px-4 py-3 flex items-center justify-between border-b">
              <div className="flex items-center gap-1.5">
                <ShoppingCart className="h-4 w-4" />
                <span className="font-semibold text-sm">Cart ({cart.length})</span>
              </div>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearCart}>
                  Clear
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2">
              {cart.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-xs">
                  Add items to start
                </div>
              ) : (
                <div className="space-y-2.5">
                  {cart.map((item) => (
                    <div key={item.menuItem.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{item.menuItem.name}</p>
                        <p className="text-xs text-muted-foreground">
                          ₹{Number(item.menuItem.price).toFixed(0)} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => removeFromCart(item.menuItem.id)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-7 w-7"
                          onClick={() => addToCart(item.menuItem)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="px-4 py-3 border-t space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{subtotal.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>GST ({settings?.gst_rate ?? 5}%){includeGstInPrice ? ' (incl.)' : ''}</span>
                  <span>{includeGstInPrice ? 'Incl.' : `₹${gst.toFixed(0)}`}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>Total</span>
                  <span>₹{total.toFixed(0)}</span>
                </div>
                <Button
                  className="w-full mt-2 h-10"
                  onClick={handleSubmit}
                  disabled={createOrder.isPending}
                >
                  {createOrder.isPending ? 'Creating...' : 'Place Order'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
