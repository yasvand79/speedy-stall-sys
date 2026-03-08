import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Plus, Minus, ShoppingCart, X, UtensilsCrossed, Package, Building2, User } from 'lucide-react';
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
  const [tableNumber, setTableNumber] = useState('');
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

  // Auto-select branch for non-developer/central-admin users
  useEffect(() => {
    if (profile?.branch_id && !isDeveloper && !isCentralAdmin) {
      setSelectedBranchId(profile.branch_id);
    }
  }, [profile, isDeveloper, isCentralAdmin]);

  const canSelectBranch = isDeveloper || isCentralAdmin;

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

    if (orderType === 'dine-in' && !tableNumber) {
      toast.error('Please enter table number for dine-in orders');
      return;
    }

    const selectedBranch = branches?.find(b => b.id === selectedBranchId);

    await createOrder.mutateAsync({
      type: orderType,
      table_number: orderType === 'dine-in' ? parseInt(tableNumber) : undefined,
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

    // Reset form
    setCart([]);
    setTableNumber('');
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
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Create New Order</DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 flex-1 min-h-0">
          {/* Left: Menu Items */}
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Branch Selection */}
            <div className="mb-4 p-3 bg-muted/50 rounded-lg border">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="branch" className="flex items-center gap-1 mb-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    Branch *
                  </Label>
                  {canSelectBranch ? (
                    <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                      <SelectTrigger>
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
                      className="bg-background"
                    />
                  )}
                </div>
                <div>
                  <Label htmlFor="staff" className="flex items-center gap-1 mb-1.5">
                    <User className="h-3.5 w-3.5" />
                    Staff Name
                  </Label>
                  <Input
                    id="staff"
                    value={profile?.full_name || 'Unknown Staff'}
                    disabled
                    className="bg-background"
                  />
                </div>
              </div>
            </div>

            <Tabs value={orderType} onValueChange={(v) => setOrderType(v as OrderType)}>
              <TabsList className="w-full mb-4">
                <TabsTrigger value="dine-in" className="flex-1">
                  <UtensilsCrossed className="mr-2 h-4 w-4" />
                  Dine-In
                </TabsTrigger>
                <TabsTrigger value="takeaway" className="flex-1">
                  <Package className="mr-2 h-4 w-4" />
                  Takeaway
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {orderType === 'dine-in' && (
              <div className="mb-4">
                <Label htmlFor="table">Table Number *</Label>
                <Input
                  id="table"
                  type="number"
                  placeholder="Enter table number"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                />
              </div>
            )}

            {orderType === 'takeaway' && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div>
                  <Label htmlFor="name">Customer Name</Label>
                  <Input
                    id="name"
                    placeholder="Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="Phone number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>
            )}

            <Label className="mb-2">Select Items</Label>
            <ScrollArea className="flex-1 border rounded-lg p-3">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading menu...</div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {availableItems.map((item) => (
                    <Card
                      key={item.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => addToCart(item)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <Badge
                                variant="outline"
                                className={
                                  item.category === 'veg'
                                    ? 'h-4 w-4 p-0 border-green-500 bg-green-50'
                                    : item.category === 'non-veg'
                                    ? 'h-4 w-4 p-0 border-red-500 bg-red-50'
                                    : 'hidden'
                                }
                              >
                                <span className={`h-2 w-2 rounded-full ${item.category === 'veg' ? 'bg-green-500' : 'bg-red-500'}`} />
                              </Badge>
                              <span className="font-medium text-sm truncate">{item.name}</span>
                            </div>
                            <p className="text-sm font-semibold text-primary mt-1">₹{Number(item.price).toFixed(0)}</p>
                          </div>
                          <Button size="icon" variant="ghost" className="h-6 w-6">
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right: Cart */}
          <div className="w-72 flex flex-col border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <span className="font-semibold">Cart</span>
              </div>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart}>
                  Clear
                </Button>
              )}
            </div>

            <ScrollArea className="flex-1">
              {cart.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Add items to start
                </div>
              ) : (
                <div className="space-y-3">
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
                          className="h-6 w-6"
                          onClick={() => removeFromCart(item.menuItem.id)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-6 w-6"
                          onClick={() => addToCart(item.menuItem)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {cart.length > 0 && (
              <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>GST ({(settings?.gst_rate ?? 5)}%){includeGstInPrice ? ' (included)' : ''}</span>
                  <span>{includeGstInPrice ? 'Incl.' : `₹${gst.toFixed(0)}`}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>₹{total.toFixed(0)}</span>
                </div>

                <Button
                  className="w-full mt-4"
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
