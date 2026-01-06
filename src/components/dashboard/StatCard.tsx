import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary';
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  return (
    <div className={cn(variant === 'primary' ? 'stat-card-primary' : 'stat-card')}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={cn(
            'text-sm font-medium',
            variant === 'primary' ? 'text-primary-foreground/80' : 'text-muted-foreground'
          )}>
            {title}
          </p>
          <p className={cn(
            'mt-1 text-2xl font-display font-bold tracking-tight',
            variant === 'primary' ? 'text-primary-foreground' : 'text-foreground'
          )}>
            {value}
          </p>
          {subtitle && (
            <p className={cn(
              'mt-1 text-sm',
              variant === 'primary' ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}>
              {subtitle}
            </p>
          )}
          {trend && (
            <div className={cn(
              'mt-2 flex items-center gap-1 text-sm font-medium',
              trend.isPositive 
                ? variant === 'primary' ? 'text-primary-foreground' : 'text-success' 
                : 'text-destructive'
            )}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className={cn(
                'font-normal',
                variant === 'primary' ? 'text-primary-foreground/70' : 'text-muted-foreground'
              )}>
                vs yesterday
              </span>
            </div>
          )}
        </div>
        <div className={cn(
          'flex h-12 w-12 items-center justify-center rounded-xl',
          variant === 'primary' 
            ? 'bg-primary-foreground/20' 
            : 'bg-primary/10'
        )}>
          <Icon className={cn(
            'h-6 w-6',
            variant === 'primary' ? 'text-primary-foreground' : 'text-primary'
          )} />
        </div>
      </div>
    </div>
  );
}
