import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { mockStaff } from '@/data/mockData';
import { StaffMember, UserRole } from '@/types';
import { Plus, Search, Mail, Phone, Shield, ChefHat, Calculator } from 'lucide-react';
import { format } from 'date-fns';

const roleConfig: Record<UserRole, { label: string; icon: React.ElementType; color: string }> = {
  admin: { label: 'Admin', icon: Shield, color: 'bg-primary text-primary-foreground' },
  kitchen: { label: 'Kitchen', icon: ChefHat, color: 'bg-warning text-warning-foreground' },
  cashier: { label: 'Cashier', icon: Calculator, color: 'bg-info text-info-foreground' },
};

export default function Staff() {
  const [staff, setStaff] = useState<StaffMember[]>(mockStaff);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStaff = staff.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeStaff = staff.filter(s => s.isActive).length;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Staff Management</h1>
            <p className="text-muted-foreground">
              {activeStaff} active staff members
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Staff
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search staff..."
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
            const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase();

            return (
              <Card key={member.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarFallback className="bg-primary/10 text-primary font-display font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-semibold text-foreground truncate">
                          {member.name}
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
                      <span className="truncate">{member.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{member.phone}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Joined {format(member.createdAt, 'MMM yyyy')}
                    </p>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredStaff.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No staff members found</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
