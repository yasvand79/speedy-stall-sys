import { useState, useEffect, useCallback, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMenuItems } from '@/hooks/useMenuItems';
import { useCreateOrder, useUpdateOrderStatus } from '@/hooks/useOrders';
import { useCreatePayment } from '@/hooks/usePayments';
import { useBranches } from '@/hooks/useBranches';
import { useAuth } from '@/contexts/AuthContext';
import { useShopSettings } from '@/hooks/useShopSettings';
import { useDailySales } from '@/hooks/useReports';
import { useThermalPrinter } from '@/contexts/ThermalPrinterContext';
import { useRazorpay } from '@/hooks/useRazorpay';
import { Database } from '@/integrations/supabase/types';
import { QRCodeSVG } from 'qrcode.react';
import {
  Plus, Minus, Search, ShoppingCart, UtensilsCrossed, Package,
  Building2, User, ArrowRight, ArrowLeft, Banknote, CheckCircle,
  Loader2, Printer, IndianRupee, Receipt, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

type MenuItem = Database['public']['Tables']['menu_items']['Row'];
type OrderType = Database['public']['Enums']['order_type'];

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

type BillingStep = 'menu' | 'details' | 'payment' | 'success';

export default function Billing() {
  // Step state
  const [step, setStep] = useState<BillingStep>('menu');

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Customer details
  const [orderType, setOrderType] = useState<OrderType>('dine-in');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');

  // Order / Payment
  const [currentOrderId, setCurrentOrderId] = useState('');
  const [currentOrderNumber, setCurrentOrderNumber] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  // Hooks
  const { data: menuItems, isLoading: menuLoading } = useMenuItems();
  const { activeBranches, branches } = useBranches();
  const { profile, isAdmin, role } = useAuth();
  const { settings } = useShopSettings();
  const { data: dailySales } = useDailySales();
  const createOrder = useCreateOrder();
  const createPayment = useCreatePayment();
  const updateOrderStatus = useUpdateOrderStatus();
  const { printBill, qzStatus, isPrinting } = useThermalPrinter();
  const { initiatePayment: initiateRazorpay, isLoading: razorpayLoading } = useRazorpay();

  const isBillingRole = role === 'billing';
  const canSelectBranch = isAdmin;

  useEffect(() => {
    if (profile?.branch_id && !isAdmin) {
      setSelectedBranchId(profile.branch_id);
    }
  }, [profile, isAdmin]);

  // Calculations
  const gstRate = (settings?.gst_rate ?? 5) / 100;
  const includeGst = settings?.include_gst_in_price ?? false;
  const subtotal = useMemo(() => cart.reduce((sum, c) => sum + Number(c.menuItem.price) * c.quantity, 0), [cart]);
  const gst = includeGst ? 0 : subtotal * gstRate;
  const total = subtotal + gst;
  const totalItems = useMemo(() => cart.reduce((sum, c) => sum + c.quantity, 0), [cart]);

  const upiId = settings?.upi_id;
  const shopName = settings?.shop_name || 'FoodShop';
  const upiUrl = upiId
    ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(shopName)}&am=${total.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Order ${currentOrderNumber}`)}`
    : '';

  // Filtered menu
  const filtered = useMemo(() => (menuItems || []).filter(item => {
    if (!item.is_available) return false;
    if (activeCategory !== 'all' && item.category !== activeCategory) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [menuItems, activeCategory, search]);

  // Cart actions
  const addToCart = useCallback((item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === item.id);
      if (existing) return prev.map(c => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItem.id === itemId);
      if (!existing) return prev;
      if (existing.quantity <= 1) return prev.filter(c => c.menuItem.id !== itemId);
      return prev.map(c => c.menuItem.id === itemId ? { ...c, quantity: c.quantity - 1 } : c);
    });
  }, []);

  const getCartQty = (itemId: string) => cart.find(c => c.menuItem.id === itemId)?.quantity || 0;

  // Place order
  const handlePlaceOrder = async () => {
    if (cart.length === 0) { toast.error('Add items first'); return; }
    if (!selectedBranchId) { toast.error('Please select a branch'); return; }
    setIsPaying(true);
    try {
      const order = await createOrder.mutateAsync({
        type: orderType,
        customer_name: customerName || undefined,
        customer_phone: customerPhone || undefined,
        branch_id: selectedBranchId,
        staff_name: profile?.full_name || 'Staff',
        items: cart.map(c => ({
          menu_item_id: c.menuItem.id,
          quantity: c.quantity,
          price: Number(c.menuItem.price),
        })),
      });
      setCurrentOrderId(order.id);
      setCurrentOrderNumber(order.order_number);
      setStep('payment');
    } finally {
      setIsPaying(false);
    }
  };

  // Pay
  const handlePayment = async (method: 'cash' | 'upi') => {
    setIsPaying(true);
    try {
      await createPayment.mutateAsync({ order_id: currentOrderId, amount: total, method });
      await updateOrderStatus.mutateAsync({ orderId: currentOrderId, status: 'completed' });
      setStep('success');
    } finally {
      setIsPaying(false);
    }
  };

  // Print
  const handlePrint = async (method: string) => {
    await printBill({
      orderNumber: currentOrderNumber,
      type: orderType,
      customerName: customerName || null,
      staffName: profile?.full_name || null,
      items: cart.map(c => ({ name: c.menuItem.name, quantity: c.quantity, price: Number(c.menuItem.price) })),
      subtotal, gst, discount: 0, total,
      paymentMethod: method,
      paidAmount: total,
    });
  };

  // Auto-print on success
  useEffect(() => {
    if (step === 'success' && qzStatus === 'connected') {
      handlePrint('auto');
    }
  }, [step]);

  // Reset
  const handleNextOrder = () => {
    setStep('menu');
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCurrentOrderId('');
    setCurrentOrderNumber('');
  };

  const todayOrders = dailySales?.totalOrders ?? 0;
  const todayRevenue = dailySales?.totalRevenue ?? 0;

  const categories = [
    { key: 'all', label: 'All' },
    { key: 'veg', label: 'Veg' },
    { key: 'non-veg', label: 'Non-Veg' },
    { key: 'beverages', label: 'Drinks' },
    { key: 'combos', label: 'Combos' },
  ];

  return (
    <MainLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Billing</h1>
            {/* Step indicator */}
            <div className="flex items-center gap-1 mt-1">
              {(['menu', 'details', 'payment'] as BillingStep[]).map((s, i) => (
                <div key={s} className="flex items-center gap-1">
                  <div className={`h-2 w-2 rounded-full ${step === s || (['details', 'payment', 'success'].indexOf(step) >= i) ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                  {i < 2 && <div className={`h-px w-4 ${(['details', 'payment', 'success'].indexOf(step) > i) ? 'bg-primary' : 'bg-muted-foreground/30'}`} />}
                </div>
              ))}
              <span className="text-[10px] text-muted-foreground ml-1.5">
                {step === 'menu' ? 'Select Items' : step === 'details' ? 'Customer Info' : step === 'payment' ? 'Payment' : 'Done'}
              </span>
            </div>
          </div>
          {!isBillingRole && (
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5 text-sm">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{todayOrders}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <IndianRupee className="h-4 w-4 text-success" />
                <span className="font-medium text-success">₹{todayRevenue.toFixed(0)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ─── STEP 1: Menu / Product Selection ─── */}
        {step === 'menu' && (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-11" />
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    activeCategory === cat.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Product grid */}
            {menuLoading ? (
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
                    <Card
                      key={item.id}
                      className={`cursor-pointer overflow-hidden transition-all active:scale-[0.97] ${
                        qty > 0 ? 'border-primary border-2 bg-accent/50' : 'hover:border-primary/40'
                      }`}
                      onClick={() => addToCart(item)}
                    >
                      <CardContent className="p-0">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-20 object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-20 bg-muted flex items-center justify-center">
                            <span className="text-2xl">{item.category === 'veg' ? '🥬' : item.category === 'non-veg' ? '🍗' : item.category === 'beverages' ? '🥤' : '🍱'}</span>
                          </div>
                        )}
                        <div className="p-2">
                          <div className="flex items-center gap-1 mb-0.5">
                            <Badge
                              variant="outline"
                              className={
                                item.category === 'veg' ? 'h-3 w-3 p-0 border-green-500 bg-green-50 flex-shrink-0'
                                : item.category === 'non-veg' ? 'h-3 w-3 p-0 border-red-500 bg-red-50 flex-shrink-0'
                                : 'hidden'
                              }
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${item.category === 'veg' ? 'bg-green-500' : 'bg-red-500'}`} />
                            </Badge>
                            <span className="font-medium text-xs leading-tight line-clamp-2">{item.name}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs font-semibold text-primary">₹{Number(item.price).toFixed(0)}</p>
                            {qty > 0 ? (
                              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                <button onClick={() => removeFromCart(item.id)} className="h-6 w-6 rounded-full border border-border flex items-center justify-center hover:bg-destructive/10">
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="text-xs font-bold w-4 text-center">{qty}</span>
                                <button onClick={() => addToCart(item)} className="h-6 w-6 rounded-full border border-border flex items-center justify-center hover:bg-primary/10">
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <Button size="icon" variant="ghost" className="h-5 w-5 flex-shrink-0">
                                <Plus className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Sticky cart summary + Next */}
            {cart.length > 0 && (
              <div className="sticky bottom-16 sm:bottom-0 z-10">
                <Card className="border-primary/30 shadow-lg">
                  <CardContent className="p-3 space-y-2">
                    {/* Mini cart */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">{totalItems} items</span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm font-bold text-foreground">₹{total.toFixed(0)}</span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setCart([])}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button className="w-full h-11 text-base font-bold" onClick={() => setStep('details')}>
                      Next — Customer Details <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}

        {/* ─── STEP 2: Customer Details ─── */}
        {step === 'details' && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setStep('menu')}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back to Items
            </Button>

            {/* Branch & Staff */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="flex items-center gap-1 mb-1.5 text-xs font-medium">
                      <Building2 className="h-3 w-3" /> Branch *
                    </Label>
                    {canSelectBranch ? (
                      <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeBranches.map((branch: any) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name} - {branch.location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={branches?.find((b: any) => b.id === selectedBranchId)?.name || 'Your Branch'} disabled className="bg-muted h-9 text-xs" />
                    )}
                  </div>
                  <div>
                    <Label className="flex items-center gap-1 mb-1.5 text-xs font-medium">
                      <User className="h-3 w-3" /> Staff
                    </Label>
                    <Input value={profile?.full_name || 'Staff'} disabled className="bg-muted h-9 text-xs" />
                  </div>
                </div>

                {/* Order Type */}
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Order Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={orderType === 'dine-in' ? 'default' : 'outline'}
                      size="sm"
                      className="h-10"
                      onClick={() => setOrderType('dine-in')}
                    >
                      <UtensilsCrossed className="mr-1.5 h-4 w-4" /> Dine-In
                    </Button>
                    <Button
                      type="button"
                      variant={orderType === 'takeaway' ? 'default' : 'outline'}
                      size="sm"
                      className="h-10"
                      onClick={() => setOrderType('takeaway')}
                    >
                      <Package className="mr-1.5 h-4 w-4" /> Takeaway
                    </Button>
                  </div>
                </div>

                {/* Customer */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Customer Name</Label>
                    <Input placeholder="Name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="h-9 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1.5 block">Phone</Label>
                    <Input placeholder="Phone number" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="h-9 text-sm" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order summary */}
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" /> Order Summary
                  <Badge variant="secondary" className="text-xs">{totalItems} items</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {cart.map(({ menuItem, quantity }) => (
                  <div key={menuItem.id} className="flex items-center justify-between py-1 border-b border-border last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{menuItem.name}</p>
                      <p className="text-xs text-muted-foreground">₹{Number(menuItem.price).toFixed(0)} × {quantity}</p>
                    </div>
                    <p className="text-sm font-bold">₹{(Number(menuItem.price) * quantity).toFixed(0)}</p>
                  </div>
                ))}
                <div className="pt-2 border-t border-border space-y-1">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span>
                  </div>
                  {gst > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>GST ({settings?.gst_rate ?? 5}%)</span><span>₹{gst.toFixed(0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-1">
                    <span>Total</span><span>₹{total.toFixed(0)}</span>
                  </div>
                </div>

                <Button
                  className="w-full h-12 text-base font-bold mt-2"
                  onClick={handlePlaceOrder}
                  disabled={isPaying}
                >
                  {isPaying ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Placing Order...</>
                  ) : (
                    <>Place Order & Pay <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── STEP 3: Payment ─── */}
        {step === 'payment' && (
          <div className="space-y-4">
            {/* Amount header */}
            <Card className="bg-primary text-primary-foreground border-0">
              <CardContent className="p-5 text-center">
                <p className="text-sm opacity-80">Order {currentOrderNumber}</p>
                <p className="text-3xl font-bold font-display mt-1">₹{total.toFixed(0)}</p>
              </CardContent>
            </Card>

            {/* UPI QR */}
            {upiId ? (
              <Card>
                <CardContent className="p-5 flex flex-col items-center space-y-4">
                  <div className="bg-white p-3 rounded-xl shadow-sm border">
                    <QRCodeSVG value={upiUrl} size={180} level="H" includeMargin />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Scan with <span className="font-semibold text-foreground">GPay</span>, <span className="font-semibold text-foreground">PhonePe</span>, or <span className="font-semibold text-foreground">Paytm</span>
                  </p>
                  <Button onClick={() => handlePayment('upi')} className="w-full h-11" disabled={isPaying}>
                    {isPaying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : <><CheckCircle className="mr-2 h-5 w-5" /> UPI Payment Received</>}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-5 text-center text-sm text-muted-foreground">
                  Configure UPI ID in Settings to show QR code
                </CardContent>
              </Card>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Cash */}
            <Button
              variant="outline"
              onClick={() => handlePayment('cash')}
              className="w-full h-12 text-base border-2"
              disabled={isPaying}
            >
              {isPaying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : <><Banknote className="mr-2 h-5 w-5 text-success" /> Cash Received ₹{total.toFixed(0)}</>}
            </Button>
          </div>
        )}

        {/* ─── STEP 4: Success ─── */}
        {step === 'success' && (
          <div className="space-y-4">
            <Card className="bg-success text-success-foreground border-0">
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-16 w-16 mx-auto mb-3" />
                <p className="text-2xl font-bold font-display">Payment Done!</p>
                <p className="text-sm opacity-80 mt-1">Order {currentOrderNumber} • ₹{total.toFixed(0)}</p>
              </CardContent>
            </Card>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => handlePrint('receipt')}
              disabled={isPrinting}
            >
              <Printer className="mr-2 h-4 w-4" />
              {isPrinting ? 'Printing...' : 'Print Receipt'}
            </Button>

            <Button className="w-full h-12 text-base font-bold" onClick={handleNextOrder}>
              Next Order →
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
