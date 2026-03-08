import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  UtensilsCrossed,
  Receipt,
  Users,
  BarChart3,
  Settings,
  ChefHat,
  LogOut,
  Building2,
  TrendingUp,
  UserPlus,
  UserCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'branch_admin'] },
  { name: 'Orders', href: '/orders', icon: ShoppingCart, roles: ['branch_admin', 'billing'] },
  { name: 'Billing', href: '/billing', icon: Receipt, roles: ['branch_admin', 'billing'] },
  { name: 'Menu', href: '/menu', icon: UtensilsCrossed, roles: ['admin', 'branch_admin'] },
  { name: 'Branches', href: '/branches', icon: Building2, roles: ['admin'] },
  { name: 'Staff', href: '/staff', icon: Users, roles: ['admin', 'branch_admin'] },
  { name: 'Performance', href: '/staff-performance', icon: TrendingUp, roles: ['admin', 'branch_admin'] },
  
  { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['admin'] },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, isBranchAdmin, profile, role, signOut } = useAuth();
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === 'collapsed';

  const filteredNavigation = navigation.filter(item =>
    role && item.roles.includes(role)
  );

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleNavClick = () => {
    setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-14 items-center gap-3 px-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
            <ChefHat className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="font-display text-base font-bold text-sidebar-foreground truncate">FoodShop</h1>
              <p className="text-[10px] text-sidebar-foreground/60">Sales System</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.name}
                    >
                      <NavLink
                        to={item.href}
                        end={item.href === '/'}
                        onClick={handleNavClick}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="space-y-3 px-1">
          {!collapsed && (
            <div className="flex items-center gap-3 px-2">
              <div className="h-8 w-8 shrink-0 rounded-full bg-sidebar-accent flex items-center justify-center">
                <span className="text-xs font-medium text-sidebar-foreground">
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
          )}
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Profile">
                <NavLink to="/profile" onClick={handleNavClick}>
                  <UserCircle className="h-4 w-4" />
                  <span>Profile</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} tooltip="Logout">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
