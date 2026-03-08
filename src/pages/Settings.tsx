import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Store, Bell, Receipt, Loader2, Smartphone, FileText, Upload, ImageIcon } from 'lucide-react';
import { useShopSettings } from '@/hooks/useShopSettings';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PrinterConfiguration } from '@/components/settings/PrinterConfiguration';
import { DataExportImport } from '@/components/settings/DataExportImport';

export default function Settings() {
  const { settings, isLoading, updateSettings, updateSetting, isSaving } = useShopSettings();
  const { role } = useAuth();
  
  const canEdit = role === 'admin';

  const [shopDetails, setShopDetails] = useState({
    shop_name: '',
    phone: '',
    address: '',
    gst_number: '',
    fssai_license: '',
    upi_id: '',
  });

  const [billingSettings, setBillingSettings] = useState({
    gst_rate: 5,
  });

  const [billTemplate, setBillTemplate] = useState({
    bill_header_text: '',
    bill_footer_text: 'Thank You! Visit us again',
    bill_terms: '',
    bill_show_gstin: true,
    bill_show_fssai: true,
    bill_show_upi: true,
  });

  useEffect(() => {
    if (settings) {
      setShopDetails({
        shop_name: settings.shop_name || '',
        phone: settings.phone || '',
        address: settings.address || '',
        gst_number: settings.gst_number || '',
        fssai_license: settings.fssai_license || '',
        upi_id: settings.upi_id || '',
      });
      setBillingSettings({
        gst_rate: settings.gst_rate || 5,
      });
      const s = settings as any;
      setBillTemplate({
        bill_header_text: s.bill_header_text || '',
        bill_footer_text: s.bill_footer_text || 'Thank You! Visit us again',
        bill_terms: s.bill_terms || '',
        bill_show_gstin: s.bill_show_gstin ?? true,
        bill_show_fssai: s.bill_show_fssai ?? true,
        bill_show_upi: s.bill_show_upi ?? true,
      });
    }
  }, [settings]);

  const handleSaveShopDetails = () => {
    if (!canEdit) { toast.error('You do not have permission to edit settings'); return; }
    updateSettings(shopDetails);
  };

  const handleSaveBillingSettings = () => {
    if (!canEdit) { toast.error('You do not have permission to edit settings'); return; }
    updateSettings({ gst_rate: billingSettings.gst_rate });
  };

  const handleToggle = (key: 'auto_generate_invoice' | 'include_gst_in_price' | 'low_stock_alerts' | 'new_order_sound' | 'daily_summary_email' | 'auto_backup', value: boolean) => {
    if (!canEdit) { toast.error('You do not have permission to edit settings'); return; }
    updateSetting(key, value);
  };

  const handleSavePrinters = (receipt: string, kitchen: string) => {
    if (!canEdit) { toast.error('You do not have permission to edit settings'); return; }
    updateSettings({ receipt_printer: receipt, kitchen_printer: kitchen });
  };

  const handleSaveBillTemplate = () => {
    if (!canEdit) { toast.error('You do not have permission to edit settings'); return; }
    updateSettings(billTemplate as any);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6 max-w-4xl">
          <div><Skeleton className="h-8 w-32 mb-2" /><Skeleton className="h-4 w-64" /></div>
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}><CardHeader><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-64" /></CardHeader>
              <CardContent className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card>
          ))}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your shop configuration</p>
          {!canEdit && (
            <p className="text-sm text-amber-600 mt-1">You have read-only access. Only Admins can modify settings.</p>
          )}
        </div>

        {/* Shop Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Store className="h-5 w-5 text-primary" /><CardTitle className="font-display">Shop Details</CardTitle></div>
            <CardDescription>Basic information about your food shop</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="shopName">Shop Name</Label><Input id="shopName" value={shopDetails.shop_name} onChange={(e) => setShopDetails(prev => ({ ...prev, shop_name: e.target.value }))} disabled={!canEdit} /></div>
              <div className="space-y-2"><Label htmlFor="phone">Phone Number</Label><Input id="phone" value={shopDetails.phone} onChange={(e) => setShopDetails(prev => ({ ...prev, phone: e.target.value }))} disabled={!canEdit} placeholder="+91 98765 43210" /></div>
              <div className="space-y-2 md:col-span-2"><Label htmlFor="address">Address</Label><Input id="address" value={shopDetails.address} onChange={(e) => setShopDetails(prev => ({ ...prev, address: e.target.value }))} disabled={!canEdit} placeholder="123 Main Street, City, State 400001" /></div>
              <div className="space-y-2"><Label htmlFor="gst">GST Number</Label><Input id="gst" value={shopDetails.gst_number} onChange={(e) => setShopDetails(prev => ({ ...prev, gst_number: e.target.value }))} disabled={!canEdit} placeholder="27AABCU9603R1ZM" /></div>
              <div className="space-y-2"><Label htmlFor="fssai">FSSAI License</Label><Input id="fssai" value={shopDetails.fssai_license} onChange={(e) => setShopDetails(prev => ({ ...prev, fssai_license: e.target.value }))} disabled={!canEdit} placeholder="12345678901234" /></div>
            </div>
            {canEdit && (
              <Button onClick={handleSaveShopDetails} disabled={isSaving}>
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Changes'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* UPI Payment Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-primary" /><CardTitle className="font-display">UPI Payment</CardTitle></div>
            <CardDescription>Configure UPI payment settings for QR code generation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="upiId">UPI ID</Label>
              <Input id="upiId" value={shopDetails.upi_id} onChange={(e) => setShopDetails(prev => ({ ...prev, upi_id: e.target.value }))} disabled={!canEdit} placeholder="shopname@upi or 9876543210@ybl" />
              <p className="text-xs text-muted-foreground">This UPI ID will be used to generate QR codes for customer payments</p>
            </div>
            {canEdit && (
              <Button onClick={handleSaveShopDetails} disabled={isSaving}>
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save UPI ID'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Billing & GST Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" /><CardTitle className="font-display">Billing & Tax</CardTitle></div>
            <CardDescription>Configure billing and tax settings — GST rate applies to all new orders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gstRate">GST Rate (%)</Label>
                <Input id="gstRate" type="number" value={billingSettings.gst_rate} onChange={(e) => setBillingSettings(prev => ({ ...prev, gst_rate: parseFloat(e.target.value) || 0 }))} disabled={!canEdit} min={0} max={100} />
                <p className="text-xs text-muted-foreground">This rate is applied when creating new orders</p>
              </div>
              <div className="space-y-2"><Label htmlFor="currency">Currency</Label><Input id="currency" defaultValue="INR (₹)" disabled /></div>
            </div>
            {canEdit && (
              <Button onClick={handleSaveBillingSettings} disabled={isSaving}>
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save GST Rate'}
              </Button>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <div><Label>Auto-generate Invoice Number</Label><p className="text-sm text-muted-foreground">Automatically generate sequential invoice numbers</p></div>
              <Switch checked={settings?.auto_generate_invoice ?? true} onCheckedChange={(checked) => handleToggle('auto_generate_invoice', checked)} disabled={!canEdit || isSaving} />
            </div>
            <div className="flex items-center justify-between">
              <div><Label>Include GST in Item Price</Label><p className="text-sm text-muted-foreground">Show item prices inclusive of GST</p></div>
              <Switch checked={settings?.include_gst_in_price ?? false} onCheckedChange={(checked) => handleToggle('include_gst_in_price', checked)} disabled={!canEdit || isSaving} />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /><CardTitle className="font-display">Notifications</CardTitle></div>
            <CardDescription>Configure alert preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between"><div><Label>Low Stock Alerts</Label><p className="text-sm text-muted-foreground">Get notified when items are running low</p></div><Switch checked={settings?.low_stock_alerts ?? true} onCheckedChange={(checked) => handleToggle('low_stock_alerts', checked)} disabled={!canEdit || isSaving} /></div>
            <div className="flex items-center justify-between"><div><Label>New Order Sound</Label><p className="text-sm text-muted-foreground">Play sound when new order is placed</p></div><Switch checked={settings?.new_order_sound ?? true} onCheckedChange={(checked) => handleToggle('new_order_sound', checked)} disabled={!canEdit || isSaving} /></div>
            <div className="flex items-center justify-between"><div><Label>Daily Summary Email</Label><p className="text-sm text-muted-foreground">Receive daily sales summary via email</p></div><Switch checked={settings?.daily_summary_email ?? false} onCheckedChange={(checked) => handleToggle('daily_summary_email', checked)} disabled={!canEdit || isSaving} /></div>
          </CardContent>
        </Card>

        {/* Bill Template */}
        {canEdit && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /><CardTitle className="font-display">Bill / Receipt Template</CardTitle></div>
              <CardDescription>Customize what appears on your printed receipts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="billHeader">Header Text</Label>
                <Input
                  id="billHeader"
                  value={billTemplate.bill_header_text}
                  onChange={(e) => setBillTemplate(prev => ({ ...prev, bill_header_text: e.target.value }))}
                  placeholder="e.g. Pure Veg | Since 2010 | Multi-Cuisine"
                />
                <p className="text-xs text-muted-foreground">Appears below shop name on the receipt</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="billFooter">Footer Message</Label>
                <Input
                  id="billFooter"
                  value={billTemplate.bill_footer_text}
                  onChange={(e) => setBillTemplate(prev => ({ ...prev, bill_footer_text: e.target.value }))}
                  placeholder="Thank You! Visit us again"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billTerms">Terms / Notes</Label>
                <Textarea
                  id="billTerms"
                  value={billTemplate.bill_terms}
                  onChange={(e) => setBillTemplate(prev => ({ ...prev, bill_terms: e.target.value }))}
                  placeholder="e.g. No refund after payment. Prices inclusive of all taxes."
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">Printed at the bottom of the receipt</p>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Show on Receipt</Label>
                <div className="flex items-center justify-between">
                  <div><Label>GSTIN Number</Label><p className="text-xs text-muted-foreground">Display GST registration number</p></div>
                  <Switch checked={billTemplate.bill_show_gstin} onCheckedChange={(v) => setBillTemplate(prev => ({ ...prev, bill_show_gstin: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <div><Label>FSSAI License</Label><p className="text-xs text-muted-foreground">Display food safety license number</p></div>
                  <Switch checked={billTemplate.bill_show_fssai} onCheckedChange={(v) => setBillTemplate(prev => ({ ...prev, bill_show_fssai: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <div><Label>UPI ID</Label><p className="text-xs text-muted-foreground">Display UPI payment ID for customers</p></div>
                  <Switch checked={billTemplate.bill_show_upi} onCheckedChange={(v) => setBillTemplate(prev => ({ ...prev, bill_show_upi: v }))} />
                </div>
              </div>

              <Separator />

              {/* Live Preview */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">Receipt Preview</Label>
                <div className="bg-white border border-border rounded-lg p-4 max-w-[320px] mx-auto font-mono text-[10px] leading-relaxed text-black shadow-sm">
                  <div className="text-center font-bold text-sm uppercase tracking-wide">{shopDetails.shop_name || 'Shop Name'}</div>
                  {shopDetails.address && <div className="text-center text-[9px] text-gray-500">{shopDetails.address}</div>}
                  {shopDetails.phone && <div className="text-center text-[9px] text-gray-500">Tel: {shopDetails.phone}</div>}
                  {billTemplate.bill_header_text && <div className="text-center text-[9px] text-gray-600 mt-0.5">{billTemplate.bill_header_text}</div>}
                  <div className="border-t border-dashed border-gray-400 my-2" />
                  <div className="text-center font-bold text-xs tracking-widest">CASH RECEIPT</div>
                  <div className="border-t border-dashed border-gray-400 my-2" />
                  <div className="flex justify-between"><span className="text-gray-500">Receipt #</span><span className="font-semibold">20260308-0001</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Date</span><span>08/03/2026</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Time</span><span>02:30 PM</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Type</span><span>Dine-In / Table 3</span></div>
                  <div className="border-t-2 border-black my-2" />
                  <div className="flex justify-between font-bold text-[9px] uppercase tracking-wide border-b border-black pb-1 mb-1">
                    <span>Item</span><span>Qty</span><span>Rate</span><span>Amt</span>
                  </div>
                  <div className="flex justify-between"><span>Paneer Tikka</span><span>2</span><span>₹180</span><span className="font-semibold">₹360</span></div>
                  <div className="flex justify-between"><span>Butter Naan</span><span>4</span><span>₹40</span><span className="font-semibold">₹160</span></div>
                  <div className="flex justify-between"><span>Lassi</span><span>2</span><span>₹60</span><span className="font-semibold">₹120</span></div>
                  <div className="border-t border-dashed border-gray-400 my-2" />
                  <div className="flex justify-between"><span>Sub Total</span><span>₹640.00</span></div>
                  <div className="flex justify-between"><span>GST ({billingSettings.gst_rate}%)</span><span>₹32.00</span></div>
                  <div className="border-t-2 border-black my-2" />
                  <div className="flex justify-between font-bold text-sm"><span>TOTAL</span><span>₹672.00</span></div>
                  <div className="border-t-2 border-black my-2" />
                  <div className="text-center font-bold text-emerald-600 tracking-widest text-xs">✓ PAID</div>
                  <div className="border-t border-dashed border-gray-400 my-2" />
                  {billTemplate.bill_show_gstin && shopDetails.gst_number && (
                    <div className="flex justify-between text-[9px]"><span className="text-gray-500">GSTIN</span><span>{shopDetails.gst_number}</span></div>
                  )}
                  {billTemplate.bill_show_fssai && shopDetails.fssai_license && (
                    <div className="flex justify-between text-[9px]"><span className="text-gray-500">FSSAI</span><span>{shopDetails.fssai_license}</span></div>
                  )}
                  {(billTemplate.bill_show_gstin && shopDetails.gst_number) || (billTemplate.bill_show_fssai && shopDetails.fssai_license) ? <div className="border-t border-dashed border-gray-400 my-2" /> : null}
                  <div className="text-center font-bold text-xs mt-1">{billTemplate.bill_footer_text || 'Thank You!'}</div>
                  <div className="text-center text-[8px] text-gray-400 tracking-[3px] my-1">********************************</div>
                  {billTemplate.bill_terms && <div className="text-center text-[8px] text-gray-500">{billTemplate.bill_terms}</div>}
                  {billTemplate.bill_show_upi && shopDetails.upi_id && (
                    <>
                      <div className="border-t border-dashed border-gray-400 my-2" />
                      <div className="text-center text-[9px] text-gray-600">UPI: {shopDetails.upi_id}</div>
                    </>
                  )}
                  <div className="text-center text-[7px] text-gray-400 mt-2">Computer generated receipt</div>
                </div>
              </div>

              <Button onClick={handleSaveBillTemplate} disabled={isSaving}>
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : 'Save Bill Template'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Printer Configuration */}
        <PrinterConfiguration
          receiptPrinter={settings?.receipt_printer || null}
          kitchenPrinter={settings?.kitchen_printer || null}
          onSave={handleSavePrinters}
          canEdit={canEdit}
          isSaving={isSaving}
        />

        {/* Data & Security */}
        <DataExportImport
          autoBackup={settings?.auto_backup ?? true}
          onToggleAutoBackup={(v) => handleToggle('auto_backup', v)}
          canEdit={canEdit}
          isSaving={isSaving}
        />
      </div>
    </MainLayout>
  );
}
