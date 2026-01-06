import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Store, Bell, Receipt, Printer, Database, Shield } from 'lucide-react';

export default function Settings() {
  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your shop configuration</p>
        </div>

        {/* Shop Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              <CardTitle className="font-display">Shop Details</CardTitle>
            </div>
            <CardDescription>Basic information about your food shop</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="shopName">Shop Name</Label>
                <Input id="shopName" defaultValue="FoodShop Restaurant" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" defaultValue="+91 98765 43210" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" defaultValue="123 Main Street, City, State 400001" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gst">GST Number</Label>
                <Input id="gst" defaultValue="27AABCU9603R1ZM" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fssai">FSSAI License</Label>
                <Input id="fssai" defaultValue="12345678901234" />
              </div>
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        {/* Billing Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              <CardTitle className="font-display">Billing & Tax</CardTitle>
            </div>
            <CardDescription>Configure billing and tax settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gstRate">GST Rate (%)</Label>
                <Input id="gstRate" type="number" defaultValue="5" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" defaultValue="INR (₹)" disabled />
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-generate Invoice Number</Label>
                <p className="text-sm text-muted-foreground">Automatically generate sequential invoice numbers</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Include GST in Item Price</Label>
                <p className="text-sm text-muted-foreground">Show item prices inclusive of GST</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle className="font-display">Notifications</CardTitle>
            </div>
            <CardDescription>Configure alert preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Low Stock Alerts</Label>
                <p className="text-sm text-muted-foreground">Get notified when items are running low</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>New Order Sound</Label>
                <p className="text-sm text-muted-foreground">Play sound when new order is placed</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Daily Summary Email</Label>
                <p className="text-sm text-muted-foreground">Receive daily sales summary via email</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Printer Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" />
              <CardTitle className="font-display">Printer Configuration</CardTitle>
            </div>
            <CardDescription>Setup receipt and kitchen printers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Receipt Printer</Label>
                <Input defaultValue="EPSON TM-T88V" disabled />
                <p className="text-xs text-muted-foreground">Thermal printer for customer receipts</p>
              </div>
              <div className="space-y-2">
                <Label>Kitchen Printer</Label>
                <Input defaultValue="Not configured" disabled />
                <p className="text-xs text-muted-foreground">Printer for kitchen order tickets</p>
              </div>
            </div>
            <Button variant="outline">Configure Printers</Button>
          </CardContent>
        </Card>

        {/* Data & Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="font-display">Data & Security</CardTitle>
            </div>
            <CardDescription>Manage data backup and security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto Backup</Label>
                <p className="text-sm text-muted-foreground">Daily automatic cloud backup at 2 AM</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex gap-3">
              <Button variant="outline">
                <Database className="mr-2 h-4 w-4" />
                Export Data
              </Button>
              <Button variant="outline">
                <Database className="mr-2 h-4 w-4" />
                Import Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
