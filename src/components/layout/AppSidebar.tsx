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
  Languages,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
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
import type { TranslationKey } from '@/i18n/translations';

const navigation: { nameKey: TranslationKey; href: string; icon: any; roles: string[] }[] = [
  { nameKey: 'nav.dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'branch_admin', 'billing'] },
  { nameKey: 'nav.orders', href: '/orders', icon: ShoppingCart, roles: ['branch_admin', 'billing'] },
  { nameKey: 'nav.billing', href: '/billing', icon: Receipt, roles: ['branch_admin', 'billing'] },
  { nameKey: 'nav.menu', href: '/menu', icon: UtensilsCrossed, roles: ['admin', 'branch_admin'] },
  { nameKey: 'nav.branches', href: '/branches', icon: Building2, roles: ['admin'] },
  { nameKey: 'nav.staff', href: '/staff', icon: Users, roles: ['admin', 'branch_admin'] },
  { nameKey: 'nav.performance', href: '/staff-performance', icon: TrendingUp, roles: ['admin', 'branch_admin'] },
  { nameKey: 'nav.staffAccess', href: '/invite-codes', icon: UserPlus, roles: ['admin'] },
  { nameKey: 'nav.reports', href: '/reports', icon: BarChart3, roles: ['admin', 'branch_admin'] },
  { nameKey: 'nav.settings', href: '/settings', icon: Settings, roles: ['admin'] },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, isBranchAdmin, profile, role, signOut } = useAuth();
  const { state, setOpenMobile } = useSidebar();
  const { t, language, setLanguage } = useLanguage();
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

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ta' : 'en');
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
              <p className="text-[10px] text-sidebar-foreground/60">{t('nav.salesSystem')}</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('nav.navigation')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <SidebarMenuItem key={item.nameKey}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={t(item.nameKey)}
                    >
                      <NavLink
                        to={item.href}
                        end={item.href === '/'}
                        onClick={handleNavClick}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{t(item.nameKey)}</span>
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
              <SidebarMenuButton onClick={toggleLanguage} tooltip={language === 'en' ? 'தமிழ்' : 'English'}>
                <Languages className="h-4 w-4" />
                <span>{language === 'en' ? 'தமிழ்' : 'English'}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={t('nav.profile')}>
                <NavLink to="/profile" onClick={handleNavClick}>
                  <UserCircle className="h-4 w-4" />
                  <span>{t('nav.profile')}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} tooltip={t('nav.logout')}>
                <LogOut className="h-4 w-4" />
                <span>{t('nav.logout')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
