import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  BarChart3,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const bottomNavItems = [
  { name: 'Home', href: '/', icon: LayoutDashboard },
  { name: 'Orders', href: '/orders', icon: ShoppingCart },
  { name: 'Billing', href: '/billing', icon: Receipt },
  { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin', 'branch_admin'] },
  { name: 'More', href: '/more', icon: MoreHorizontal, isMore: true },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();

  // "More" pages — anything not in the main 4 tabs
  const morePaths = ['/menu', '/branches', '/staff', '/staff-performance', '/invite-codes', '/settings'];
  const isMoreActive = morePaths.some(p => location.pathname === p);

  const filteredItems = bottomNavItems.filter(item => {
    if (item.roles && role && !item.roles.includes(role)) return false;
    return true;
  });

  const handleTap = (item: typeof bottomNavItems[0]) => {
    if (item.isMore) {
      // Navigate to staff or menu depending on role
      if (role === 'admin' || role === 'branch_admin') {
        navigate('/menu');
      } else {
        navigate('/settings');
      }
    } else {
      navigate(item.href);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex items-center justify-around h-14">
        {filteredItems.map(item => {
          const isActive = item.isMore
            ? isMoreActive
            : location.pathname === item.href;
          const Icon = item.icon;

          return (
            <button
              key={item.name}
              onClick={() => handleTap(item)}
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
      </div>
    </nav>
  );
}
