import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  BarChart3,
  Menu as MenuIcon,
  UtensilsCrossed,
  Building2,
  Users,
  TrendingUp,
  UserPlus,
  Settings,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const bottomNavItems = [
  { name: 'Home', href: '/', icon: LayoutDashboard },
  { name: 'Orders', href: '/orders', icon: ShoppingCart },
  { name: 'Billing', href: '/billing', icon: Receipt },
  { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin', 'branch_admin'] },
];

const moreMenuItems = [
  { name: 'Menu', href: '/menu', icon: UtensilsCrossed, roles: ['admin', 'branch_admin'] },
  { name: 'Branches', href: '/branches', icon: Building2, roles: ['admin'] },
  { name: 'Staff', href: '/staff', icon: Users, roles: ['admin', 'branch_admin'] },
  { name: 'Performance', href: '/staff-performance', icon: TrendingUp, roles: ['admin', 'branch_admin'] },
  { name: 'Staff Access', href: '/invite-codes', icon: UserPlus, roles: ['admin'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['admin'] },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const morePaths = moreMenuItems.map(i => i.href);
  const isMoreActive = morePaths.some(p => location.pathname === p);

  const filteredItems = bottomNavItems.filter(item => {
    if (item.roles && role && !item.roles.includes(role)) return false;
    return true;
  });

  const filteredMoreItems = moreMenuItems.filter(item => {
    if (item.roles && role && !item.roles.includes(role)) return false;
    return true;
  });

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex items-center justify-around h-14">
          {filteredItems.map(item => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                onClick={() => navigate(item.href)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground active:text-foreground'
                )}
              >
                <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </button>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors',
              isMoreActive
                ? 'text-primary'
                : 'text-muted-foreground active:text-foreground'
            )}
          >
            <MenuIcon className={cn('h-5 w-5', isMoreActive && 'stroke-[2.5]')} />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
          <SheetHeader>
            <SheetTitle>More Options</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            {filteredMoreItems.map(item => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;

              return (
                <button
                  key={item.name}
                  onClick={() => {
                    navigate(item.href);
                    setMoreOpen(false);
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 rounded-xl p-4 transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted active:bg-muted/80'
                  )}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-xs font-medium">{item.name}</span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
