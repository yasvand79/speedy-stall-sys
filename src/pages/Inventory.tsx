import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { mockInventory } from '@/data/mockData';
import { InventoryItem } from '@/types';
import { Plus, Search, AlertTriangle, Package, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

export default function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>(mockInventory);
  const [searchQuery, setSearchQuery] = useState('');

  const lowStockItems = inventory.filter(i => i.quantity <= i.minQuantity);
  const totalValue = inventory.reduce((sum, i) => sum + i.quantity * i.costPerUnit, 0);

  const filteredItems = inventory.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStockStatus = (item: InventoryItem) => {
    const percentage = (item.quantity / item.minQuantity) * 100;
    if (percentage <= 100) return { label: 'Low Stock', color: 'destructive' as const, percentage: Math.min(percentage, 100) };
    if (percentage <= 150) return { label: 'Medium', color: 'warning' as const, percentage: 66 };
    return { label: 'Good', color: 'success' as const, percentage: 100 };
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Inventory</h1>
            <p className="text-muted-foreground">Track raw materials and stock levels</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="font-display text-2xl font-bold">{inventory.length}</p>
              <p className="text-xs text-muted-foreground">Raw materials tracked</p>
            </CardContent>
          </Card>
          <Card className={lowStockItems.length > 0 ? 'border-warning/50' : ''}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock Items</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${lowStockItems.length > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <p className={`font-display text-2xl font-bold ${lowStockItems.length > 0 ? 'text-warning' : ''}`}>
                {lowStockItems.length}
              </p>
              <p className="text-xs text-muted-foreground">Need restocking</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Inventory Value</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="font-display text-2xl font-bold">₹{totalValue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total stock value</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search inventory..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Inventory Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Unit Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Last Restocked
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredItems.map((item) => {
                    const status = getStockStatus(item);
                    return (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-foreground">{item.name}</p>
                            <p className="text-sm text-muted-foreground">Min: {item.minQuantity} {item.unit}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium">{item.quantity} {item.unit}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1.5">
                            <Badge variant={status.color === 'success' ? 'secondary' : status.color === 'warning' ? 'outline' : 'destructive'}>
                              {status.label}
                            </Badge>
                            <Progress value={status.percentage} className="h-1.5 w-20" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium">₹{item.costPerUnit}/{item.unit}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-muted-foreground">
                            {format(item.lastRestocked, 'MMM d, yyyy')}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="outline" size="sm">
                            Restock
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
