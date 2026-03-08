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
import { Plus, Minus, ShoppingCart, Building2, User } from 'lucide-react';
import { toast } from 'sonner';

type MenuItem = Database['public']['Tables']['menu_items']['Row'];

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
      type: 'takeaway' as const,
      table_number: undefined,
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
      <DialogContent className="max-w-4xl w-[95vw] max-h-[85vh] flex flex-col p-3 sm:p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="font-display text-lg sm:text-xl">Create New Order</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-3 sm:gap-4 flex-1 min-h-0 overflow-auto">
          {/* Left: Menu Items */}
          <div className="flex-1 min-h-0 flex flex-col space-y-3">
            {/* Branch & Staff */}
            <div className="p-2.5 sm:p-3 bg-muted/50 rounded-lg border">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <Label htmlFor="branch" className="flex items-center gap-1 mb-1 text-xs sm:text-sm">
                    <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    Branch *
                  </Label>
                  {canSelectBranch ? (
                    <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                      <SelectTrigger className="h-9 text-sm">
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
                      className="bg-background h-9 text-sm"
                    />
                  )}
                </div>
                <div>
                  <Label htmlFor="staff" className="flex items-center gap-1 mb-1 text-xs sm:text-sm">
                    <User className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    Staff
                  </Label>
                  <Input
                    id="staff"
                    value={profile?.full_name || 'Unknown Staff'}
                    disabled
                    className="bg-background h-9 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="name" className="text-xs sm:text-sm">Customer Name</Label>
                <Input
                  id="name"
                  placeholder="Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-xs sm:text-sm">Phone</Label>
                <Input
                  id="phone"
                  placeholder="Phone number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Menu Items */}
            <Label className="text-xs sm:text-sm">Select Items</Label>
            <ScrollArea className="flex-1 min-h-[200px] max-h-[40vh] border rounded-lg p-2 sm:p-3">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Loading menu...</div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  {availableItems.map((item) => (
                    <Card
                      key={item.id}
                      className="cursor-pointer hover:border-primary transition-colors overflow-hidden"
                      onClick={() => addToCart(item)}
                    >
                      <CardContent className="p-0">
                        {item.image_url && (
                          <div className="h-16 sm:h-24 w-full overflow-hidden">
                            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                          </div>
                        )}
                        <div className="p-1.5 sm:p-2.5">
                          <div className="flex items-center gap-1 mb-0.5">
                            <Badge
                              variant="outline"
                              className={
                                item.category === 'veg'
                                  ? 'h-3 w-3 sm:h-3.5 sm:w-3.5 p-0 border-green-500 bg-green-50 flex-shrink-0'
                                  : item.category === 'non-veg'
                                  ? 'h-3 w-3 sm:h-3.5 sm:w-3.5 p-0 border-red-500 bg-red-50 flex-shrink-0'
                                  : 'hidden'
                              }
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${item.category === 'veg' ? 'bg-green-500' : 'bg-red-500'}`} />
                            </Badge>
                            <span className="font-medium text-xs sm:text-sm leading-tight line-clamp-2 break-words">{item.name}</span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-xs sm:text-sm font-semibold text-primary">₹{Number(item.price).toFixed(0)}</p>
                            <Button size="icon" variant="ghost" className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0">
                              <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
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

          {/* Right: Cart */}
          <div className="w-full md:w-64 flex flex-col border rounded-lg p-3 sm:p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-semibold text-sm sm:text-base">Cart ({cart.length})</span>
              </div>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearCart}>
                  Clear
                </Button>
              )}
            </div>

            <ScrollArea className="flex-1 max-h-[30vh] md:max-h-none">
              {cart.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-xs sm:text-sm">
                  Add items to start
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.menuItem.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium truncate">{item.menuItem.name}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          ₹{Number(item.menuItem.price).toFixed(0)} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-5 w-5 sm:h-6 sm:w-6"
                          onClick={() => removeFromCart(item.menuItem.id)}
                        >
                          <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        </Button>
                        <span className="w-5 text-center text-xs sm:text-sm">{item.quantity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-5 w-5 sm:h-6 sm:w-6"
                          onClick={() => addToCart(item.menuItem)}
                        >
                          <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {cart.length > 0 && (
              <div className="mt-3 pt-3 border-t space-y-1.5">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
                  <span>GST ({(settings?.gst_rate ?? 5)}%){includeGstInPrice ? ' (incl.)' : ''}</span>
                  <span>{includeGstInPrice ? 'Incl.' : `₹${gst.toFixed(0)}`}</span>
                </div>
                <div className="flex justify-between font-semibold text-sm sm:text-base">
                  <span>Total</span>
                  <span>₹{total.toFixed(0)}</span>
                </div>

                <Button
                  className="w-full mt-3"
                  size="sm"
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
