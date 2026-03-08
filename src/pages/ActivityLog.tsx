import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuditLogs } from '@/hooks/useAuditLog';
import { useStaff } from '@/hooks/useStaff';
import { format } from 'date-fns';
import {
  Search,
  Loader2,
  UtensilsCrossed,
  Building2,
  Users,
  Receipt,
  ShoppingCart,
  Settings,
  Shield,
  UserPlus,
  Clock,
} from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';

const tableConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  menu_items: { label: 'Menu', icon: UtensilsCrossed, color: 'bg-orange-500/10 text-orange-600' },
  branches: { label: 'Branch', icon: Building2, color: 'bg-blue-500/10 text-blue-600' },
  profiles: { label: 'Staff Profile', icon: Users, color: 'bg-purple-500/10 text-purple-600' },
  user_roles: { label: 'Role', icon: Shield, color: 'bg-red-500/10 text-red-600' },
  staff_invitations: { label: 'Staff Invite', icon: UserPlus, color: 'bg-green-500/10 text-green-600' },
  payments: { label: 'Payment', icon: Receipt, color: 'bg-emerald-500/10 text-emerald-600' },
  orders: { label: 'Order', icon: ShoppingCart, color: 'bg-cyan-500/10 text-cyan-600' },
  shop_settings: { label: 'Settings', icon: Settings, color: 'bg-gray-500/10 text-gray-600' },
};

const actionLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  INSERT: { label: 'Created', variant: 'default' },
  UPDATE: { label: 'Updated', variant: 'secondary' },
  DELETE: { label: 'Deleted', variant: 'destructive' },
};

function getDescription(tableName: string, action: string, newValue: Json | null, oldValue: Json | null): string {
  const nv = newValue as Record<string, unknown> | null;
  const ov = oldValue as Record<string, unknown> | null;

  switch (tableName) {
    case 'menu_items':
      if (action === 'INSERT') return `Added menu item "${nv?.name}"`;
      if (action === 'DELETE') return `Removed menu item "${ov?.name}"`;
      if (nv?.is_available !== ov?.is_available) return `${nv?.is_available ? 'Enabled' : 'Disabled'} menu item "${nv?.name}"`;
      if (nv?.price !== ov?.price) return `Changed price of "${nv?.name}" from ₹${ov?.price} to ₹${nv?.price}`;
      return `Updated menu item "${nv?.name}"`;

    case 'branches':
      if (action === 'INSERT') return `Created branch "${nv?.name}" (${nv?.location})`;
      if (action === 'DELETE') return `Removed branch "${ov?.name}"`;
      if (nv?.is_active !== ov?.is_active) return `${nv?.is_active ? 'Activated' : 'Deactivated'} branch "${nv?.name}"`;
      return `Updated branch "${nv?.name}"`;

    case 'staff_invitations':
      if (action === 'INSERT') return `Invited ${nv?.email} as ${String(nv?.role_assigned || '').replace('_', ' ')}`;
      if (action === 'UPDATE' && nv?.status === 'revoked') return `Revoked invitation for ${nv?.email}`;
      if (action === 'UPDATE' && nv?.status === 'used') return `Invitation used by ${nv?.email}`;
      return `Updated invitation for ${nv?.email || ov?.email}`;

    case 'user_roles':
      if (action === 'UPDATE') return `Changed role from ${String(ov?.role || '').replace('_', ' ')} to ${String(nv?.role || '').replace('_', ' ')}`;
      if (action === 'INSERT') return `Assigned role ${String(nv?.role || '').replace('_', ' ')}`;
      return `${action === 'DELETE' ? 'Removed' : 'Changed'} role assignment`;

    case 'profiles':
      if (nv?.status !== ov?.status) return `Profile status changed to "${nv?.status}" for ${nv?.full_name}`;
      if (nv?.is_active !== ov?.is_active) return `${nv?.is_active ? 'Activated' : 'Deactivated'} staff "${nv?.full_name}"`;
      if (nv?.branch_id !== ov?.branch_id) return `Changed branch assignment for "${nv?.full_name}"`;
      return `Updated profile for "${nv?.full_name}"`;

    case 'payments':
      return `Recorded ₹${nv?.amount} payment via ${String(nv?.method || '').toUpperCase()}`;

    case 'orders':
      if (action === 'INSERT') return `Created order ${nv?.order_number} (₹${nv?.total})`;
      if (nv?.status !== ov?.status) return `Order ${nv?.order_number} status → ${nv?.status}`;
      if (nv?.payment_status !== ov?.payment_status) return `Order ${nv?.order_number} payment → ${nv?.payment_status}`;
      return `Updated order ${nv?.order_number}`;

    case 'shop_settings':
      return 'Updated shop settings';

    default:
      return `${action} on ${tableName}`;
  }
}

export default function ActivityLog() {
  const { data: logs, isLoading } = useAuditLogs();
  const { staff } = useStaff();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTable, setFilterTable] = useState<string>('all');

  const staffMap = new Map(staff.map(s => [s.userId, s.fullName]));

  const filteredLogs = (logs || []).filter(log => {
    const matchesTable = filterTable === 'all' || log.table_name === filterTable;
    const description = getDescription(log.table_name, log.action, log.new_value, log.old_value);
    const userName = staffMap.get(log.user_id || '') || '';
    const matchesSearch = searchQuery === '' ||
      description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.table_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTable && matchesSearch;
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Activity Log</h1>
          <p className="text-muted-foreground">Track all system changes and admin actions</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search activity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterTable} onValueChange={setFilterTable}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              {Object.entries(tableConfig).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Log entries */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredLogs.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No activity logged yet</p>
            ) : (
              <div className="space-y-1">
                {filteredLogs.map((log) => {
                  const config = tableConfig[log.table_name] || { label: log.table_name, icon: Clock, color: 'bg-muted text-muted-foreground' };
                  const actionInfo = actionLabels[log.action] || { label: log.action, variant: 'outline' as const };
                  const Icon = config.icon;
                  const description = getDescription(log.table_name, log.action, log.new_value, log.old_value);
                  const userName = staffMap.get(log.user_id || '') || 'System';

                  return (
                    <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">{description}</p>
                          <Badge variant={actionInfo.variant} className="text-[10px] px-1.5 py-0">
                            {actionInfo.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="font-medium">{userName}</span>
                          <span>•</span>
                          <span>{format(new Date(log.created_at), 'dd MMM yyyy, hh:mm a')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
