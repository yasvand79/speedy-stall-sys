import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useStaff, StaffMember } from '@/hooks/useStaff';
import { Search, Mail, Phone, Shield, UserCog, Receipt, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const roleConfig: Record<AppRole, { label: string; icon: React.ElementType; color: string }> = {
  developer: { label: 'Developer', icon: Shield, color: 'bg-primary text-primary-foreground' },
  admin: { label: 'Admin', icon: UserCog, color: 'bg-warning text-warning-foreground' },
  billing: { label: 'Billing', icon: Receipt, color: 'bg-info text-info-foreground' },
};

export default function Staff() {
  const { staff, isLoading, updateRole, updateStatus, isUpdating } = useStaff();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStaff = staff.filter(member =>
    member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.userId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeStaff = staff.filter(s => s.isActive).length;

  const handleRoleChange = (member: StaffMember, newRole: AppRole) => {
    updateRole({ userId: member.userId, newRole });
  };

  const handleStatusToggle = (member: StaffMember) => {
    updateStatus({ userId: member.userId, isActive: !member.isActive });
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Staff Management</h1>
            <p className="text-muted-foreground">
              {activeStaff} active staff members • {staff.length} total
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search staff by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Staff Grid */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredStaff.map((member) => {
            const role = roleConfig[member.role];
            const RoleIcon = role.icon;
            const initials = member.fullName
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .substring(0, 2);

            return (
              <Card key={member.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarFallback className="bg-primary/10 text-primary font-display font-semibold">
                        {initials || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-semibold text-foreground truncate">
                          {member.fullName}
                        </h3>
                        {!member.isActive && (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      <Badge className={`mt-1 ${role.color}`}>
                        <RoleIcon className="mr-1 h-3 w-3" />
                        {role.label}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate font-mono text-xs">{member.userId}</span>
                    </div>
                    {member.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Role Selection */}
                  <div className="mt-4 pt-4 border-t border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Role</span>
                      <Select
                        value={member.role}
                        onValueChange={(value: AppRole) => handleRoleChange(member, value)}
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="developer">Developer</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="billing">Billing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Joined {format(new Date(member.createdAt), 'MMM yyyy')}
                      </p>
                      <Button
                        variant={member.isActive ? "outline" : "default"}
                        size="sm"
                        onClick={() => handleStatusToggle(member)}
                        disabled={isUpdating}
                      >
                        {member.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredStaff.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? 'No staff members found matching your search' : 'No staff members found'}
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
