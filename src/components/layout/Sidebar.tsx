import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  UtensilsCrossed,
  Receipt,
  Users,
  BarChart3,
  Settings,
  ChefHat,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export function Sidebar() {
  const location = useLocation();
  const { isDeveloper, isAdmin, profile, role } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['developer', 'admin', 'billing'] },
    { name: 'Orders', href: '/orders', icon: ShoppingCart, roles: ['developer', 'admin', 'billing'] },
    { name: 'Billing', href: '/billing', icon: Receipt, roles: ['developer', 'admin', 'billing'] },
    { name: 'Menu', href: '/menu', icon: UtensilsCrossed, roles: ['developer', 'admin'] },
    { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['developer', 'admin'] },
    { name: 'Staff', href: '/staff', icon: Users, roles: ['developer'] },
    { name: 'Settings', href: '/settings', icon: Settings, roles: ['developer'] },
  ];

  const filteredNavigation = navigation.filter(item => 
    role && item.roles.includes(role)
  );

  return (
    <aside className="sidebar-nav fixed left-0 top-0 z-40 h-screen w-64 flex flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <ChefHat className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-lg font-bold text-sidebar-foreground">FoodShop</h1>
          <p className="text-xs text-sidebar-foreground/60">Sales System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <item.icon
                className={cn(
                  'h-5 w-5 shrink-0 transition-colors',
                  isActive ? 'text-sidebar-primary-foreground' : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70'
                )}
              />
              {item.name}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-sm font-medium text-sidebar-foreground">
              {profile?.full_name?.substring(0, 2).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {profile?.full_name || 'User'}
            </p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">{role || 'Staff'}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}